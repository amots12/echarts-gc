#!/usr/bin/env python3

import json
import re
import sys
import time
from datetime import datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urlparse
from urllib.request import Request, urlopen


WIKI_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "echarts-gc-giro-extractor/1.0"}

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "public" / "data"
STAGES_DIR = DATA_DIR / "stages"
LAST_REQUEST_TS = 0.0


TEAM_ALIAS_TO_COLOURS = {
    "Astana": ["#00A3E0", "#111827", "#EF4444"],
    "Bahrain–Merida": ["#FFFFFF", "#0072CE", "#111827"],
    "BMC Racing Team": ["#111827", "#E10600", "#FFFFFF"],
    "EF Education First": ["#FF2D87", "#111827", "#FFFFFF"],
    "EF Education First–Drapac": ["#FF2D87", "#111827", "#FFFFFF"],
    "EF Education First–Drapac p/b Cannondale": ["#FF2D87", "#111827", "#FFFFFF"],
    "Israel Cycling Academy": ["#0070B8", "#FFFFFF", "#111827"],
    "Lotto Fix ALL": ["#E10600", "#111827", "#FFFFFF"],
    "Lotto–FixAll": ["#E10600", "#111827", "#FFFFFF"],
    "LottoNL–Jumbo": ["#FACC15", "#111827", "#FFFFFF"],
    "Nippo–Vini Fantini–Faizanè": ["#F97316", "#1E3A8A", "#FFFFFF"],
    "Quick-Step Floors": ["#1D4ED8", "#FFFFFF", "#EF4444"],
    "Team Dimension Data": ["#111827", "#00A3E0", "#FFFFFF"],
    "Team INEOS": ["#111827", "#E10600", "#FFFFFF"],
    "Team Katusha–Alpecin": ["#E10600", "#111827", "#FFFFFF"],
    "Team Sky": ["#111827", "#00A3E0", "#FFFFFF"],
    "Wilier Triestina–Selle Italia": ["#E10600", "#1E3A8A", "#FFFFFF"],
}

TEAM_PAGE_TITLES = {
    2014: "List of teams and cyclists in the 2014 Giro d'Italia",
}


def fetch_json(url: str):
    global LAST_REQUEST_TS
    delay = 0.25 - (time.time() - LAST_REQUEST_TS)
    if delay > 0:
        time.sleep(delay)

    req = Request(url, headers=HEADERS)
    last_error = None
    for attempt in range(5):
        try:
            with urlopen(req, timeout=30) as response:
                LAST_REQUEST_TS = time.time()
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise last_error


def wiki_parse_html(title: str) -> str:
    url = (
        f"{WIKI_API}?action=parse&format=json&formatversion=2"
        f"&prop=text&page={quote(title)}"
    )
    payload = fetch_json(url)
    return payload["parse"]["text"]


def wiki_coords(title: str):
    url = (
        f"{WIKI_API}?action=query&format=json&formatversion=2"
        f"&prop=coordinates&redirects=1&titles={quote(title)}"
    )
    try:
        payload = fetch_json(url)
    except Exception:
        return None, None
    pages = payload.get("query", {}).get("pages", [])
    for page in pages:
        coords = page.get("coordinates")
        if coords:
            return coords[0]["lat"], coords[0]["lon"]
    return None, None


def wiki_coords_many(titles):
    if not titles:
        return {}
    joined = "|".join(titles)
    url = (
        f"{WIKI_API}?action=query&format=json&formatversion=2"
        f"&prop=coordinates&redirects=1&titles={quote(joined)}"
    )
    try:
        payload = fetch_json(url)
    except Exception:
        return {}
    resolved = {}
    for page in payload.get("query", {}).get("pages", []):
        coords = page.get("coordinates")
        title = page.get("title")
        if title and coords:
            resolved[title] = (coords[0]["lat"], coords[0]["lon"])
    return resolved


def clean_text(value: str) -> str:
    value = unescape(value)
    value = value.replace("\xa0", " ")
    value = re.sub(r"\[[^\]]*\]", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self.current_table = None
        self.current_row = None
        self.current_cell = None
        self.cell_links = None
        self.cell_link = None
        self.in_table = False
        self.in_row = False
        self.in_cell = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "table":
            self.in_table = True
            self.current_table = []
            return
        if not self.in_table:
            return
        if tag == "tr":
            self.in_row = True
            self.current_row = []
        elif tag in ("th", "td"):
            self.in_cell = True
            self.current_cell = []
            self.cell_links = []
        elif tag == "a" and self.in_cell:
            self.cell_link = {"href": attrs.get("href", ""), "text": []}

    def handle_endtag(self, tag):
        if tag == "table" and self.in_table:
            if self.current_table:
                self.tables.append(self.current_table)
            self.current_table = None
            self.in_table = False
            return
        if not self.in_table:
            return
        if tag == "a" and self.cell_link is not None:
            text = clean_text("".join(self.cell_link["text"]))
            if text:
                self.cell_links.append({"href": self.cell_link["href"], "text": text})
            self.cell_link = None
        elif tag in ("th", "td") and self.in_cell:
            cell_text = clean_text("".join(self.current_cell))
            self.current_row.append({"text": cell_text, "links": list(self.cell_links)})
            self.current_cell = None
            self.cell_links = None
            self.in_cell = False
        elif tag == "tr" and self.in_row:
            if self.current_row:
                self.current_table.append(self.current_row)
            self.current_row = None
            self.in_row = False

    def handle_data(self, data):
        if self.cell_link is not None:
            self.cell_link["text"].append(data)
        if self.in_cell and self.current_cell is not None:
            self.current_cell.append(data)


class TeamsListParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.capture = False
        self.depth = 0
        self.items = []
        self.current = None
        self.skip_sections = {
            "The on-stage presentation of the teams took place in Bologna on 9 May, two days before the opening stage.",
            "The teams entering the race were:",
            "UCI WorldTeams",
            "UCI Professional Continental teams",
            "UCI Professional Continental team",
        }

    def handle_starttag(self, tag, attrs):
        if tag == "li":
            self.capture = True
            self.depth += 1
            self.current = []

    def handle_endtag(self, tag):
        if tag == "li" and self.capture:
            text = clean_text("".join(self.current or []))
            if text and text not in self.skip_sections:
                self.items.append(text)
            self.current = None
            self.depth -= 1
            if self.depth <= 0:
                self.capture = False
                self.depth = 0

    def handle_data(self, data):
        if self.capture and self.current is not None:
            self.current.append(data)


class SectionTextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {"h2", "h3", "h4", "p", "tr", "li", "caption", "br"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"th", "td"}:
            self.parts.append("\n")
        if tag in {"tr", "p", "li", "caption"}:
            self.parts.append("\n")

    def handle_data(self, data):
        self.parts.append(data)

    def text(self):
        return "\n".join(clean_text(part) for part in self.parts if clean_text(part))


def split_section(html: str, section_name: str) -> str:
    pattern = re.compile(
        rf'<h2[^>]*>.*?{re.escape(section_name)}.*?</h2>(.*?)(?=<h2[^>]*>|$)',
        re.I | re.S,
    )
    match = pattern.search(html)
    if not match:
        raise ValueError(f"Missing section: {section_name}")
    return match.group(1)


def split_stage_sections(html: str):
    matches = list(
        re.finditer(
            r'<h2[^>]*>.*?(Stage \d+).*?</h2>(.*?)(?=<h2[^>]*>|$)',
            html,
            re.I | re.S,
        )
    )
    sections = {}
    for match in matches:
        stage_label = clean_text(match.group(1))
        sections[stage_label] = match.group(2)
    return sections


def parse_table_rows(html_fragment: str):
    parser = TableParser()
    parser.feed(html_fragment)
    return parser.tables


def section_text(html_fragment: str):
    parser = SectionTextParser()
    parser.feed(html_fragment)
    return parser.text()


def extract_route_table(main_html: str):
    tables = []
    for section_name in ("Route and stages", "Route"):
        try:
            section_html = split_section(main_html, section_name)
            tables.extend(parse_table_rows(section_html))
        except ValueError:
            continue
    if not tables:
        tables = parse_table_rows(main_html)
    for table in tables:
        if not table:
            continue
        headers = [cell["text"] for cell in table[0]]
        if headers[:4] == ["Stage", "Date", "Course", "Distance"]:
            return table
    raise ValueError("Route table not found")


def parse_distance(value: str):
    matches = re.findall(r"(\d+(?:\.\d+)?)\s*km", value.replace(",", ""), re.I)
    return float(matches[-1]) if matches else None


def parse_date(value: str, year: int):
    value = clean_text(value)
    for fmt in ("%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(f"{value} {year}", fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"Could not parse date: {value}")


def href_title(href: str):
    if not href or "/wiki/" not in href:
        return None
    title = href.split("/wiki/", 1)[1]
    title = title.split("#", 1)[0]
    return unquote(title.replace("_", " "))


def parse_course_cell(course_cell):
    links = course_cell.get("links", [])
    text = course_cell.get("text", "")

    if len(links) >= 2:
        start_name = links[0]["text"]
        finish_name = links[-1]["text"]
        start_title = href_title(links[0]["href"]) or start_name
        finish_title = href_title(links[-1]["href"]) or finish_name
        return start_name, finish_name, start_title, finish_title

    if len(links) == 1:
        start_name = links[0]["text"]
        start_title = href_title(links[0]["href"]) or start_name
        return start_name, start_name, start_title, start_title

    for separator in (" to ", " – ", " - "):
        if separator in text:
            start_name, finish_name = [part.strip() for part in text.split(separator, 1)]
            return start_name, finish_name, start_name, finish_name

    text = text.strip()
    return text, text, text, text


def build_colour_map():
    colours = {}
    for path in STAGES_DIR.glob("*-stages.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for team in payload.get("teams", []):
            name = team.get("name")
            team_colours = team.get("colours")
            if name and isinstance(team_colours, list) and name not in colours:
                colours[name] = team_colours
    colours.update(TEAM_ALIAS_TO_COLOURS)
    return colours


def build_local_coord_map():
    coords = {}
    for path in STAGES_DIR.glob("*-stages.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for stage in payload.get("stages", []):
            for side in ("start", "finish"):
                entry = stage.get(side) or {}
                town = entry.get("town")
                lat = entry.get("lat")
                lon = entry.get("lon")
                if town and lat is not None and lon is not None and town not in coords:
                    coords[town] = (lat, lon)
    return coords


def extract_teams(main_html: str, colour_map):
    teams_html = split_section(main_html, "Teams")
    parser = TeamsListParser()
    parser.feed(teams_html)

    seen = set()
    teams = []
    for name in parser.items:
        if name in seen:
            continue
        seen.add(name)
        colours = colour_map.get(name, ["#E5E7EB", "#9CA3AF", None])
        teams.append(
            {
                "name": name,
                "uci_code": None,
                "country": None,
                "colours": [colours[0], colours[1], colours[2] if len(colours) > 2 else None],
            }
        )
    return teams


def extract_stages(main_html: str, year: int, local_coords):
    route_table = extract_route_table(main_html)
    coord_cache = dict(local_coords)
    provisional = []

    for row in route_table[1:]:
        if not row:
            continue
        stage_text = row[0]["text"]
        if not re.fullmatch(r"\d+", stage_text):
            continue
        stage_no = int(stage_text)
        date = parse_date(row[1]["text"], year)
        course_cell = row[2]
        distance = parse_distance(row[3]["text"])
        start_name, finish_name, start_title, finish_title = parse_course_cell(course_cell)

        provisional.append(
            {
                "stage": stage_no,
                "date": date,
                "distance_km": distance,
                "start_name": start_name,
                "finish_name": finish_name,
                "start_title": start_title,
                "finish_title": finish_title,
            }
        )

    missing_titles = []
    for item in provisional:
        for title in (item["start_title"], item["finish_title"]):
            if title not in coord_cache and title not in missing_titles:
                missing_titles.append(title)

    for idx in range(0, len(missing_titles), 20):
        chunk = missing_titles[idx : idx + 20]
        coord_cache.update(wiki_coords_many(chunk))

    stages = []
    accumulated = 0.0
    for item in provisional:
        accumulated += item["distance_km"]
        start_coords = coord_cache.get(item["start_title"], (None, None))
        finish_coords = coord_cache.get(item["finish_title"], (None, None))

        stages.append(
            {
                "stage": item["stage"],
                "date": item["date"],
                "distance_km": item["distance_km"],
                "accumulated_km": round(accumulated, 1),
                "elevation_gain_m": None,
                "start": {
                    "town": item["start_name"],
                    "lat": start_coords[0],
                    "lon": start_coords[1],
                },
                "finish": {
                    "town": item["finish_name"],
                    "lat": finish_coords[0],
                    "lon": finish_coords[1],
                },
            }
        )
    return stages


def table_to_top10(table):
    rows = table[1:]
    riders = []
    for row in rows:
        if len(row) < 4:
            continue
        rank_text = row[0]["text"]
        if not re.fullmatch(r"\d+", rank_text):
            continue
        riders.append(
            {
                "rank": int(rank_text),
                "name": row[1]["text"],
                "team": row[2]["text"],
                "time": row[3]["text"],
            }
        )
    return riders[:10]


def gc_top10_from_lines(lines, stage_no: int):
    start_idx = None
    for idx, line in enumerate(lines):
        if line == f"Stage {stage_no}":
            start_idx = idx
            break
    if start_idx is None:
        return []

    end_idx = len(lines)
    for idx in range(start_idx + 1, len(lines)):
        if re.fullmatch(r"Stage \d+", lines[idx]) or lines[idx].startswith("Rest day"):
            end_idx = idx
            break

    segment = lines[start_idx:end_idx]
    marker_idx = None
    for idx, line in enumerate(segment):
        lowered = line.lower()
        if lowered.startswith(f"general classification after stage {stage_no}".lower()):
            marker_idx = idx
            break
        if lowered.startswith(
            f"stage {stage_no} result and general classification after stage {stage_no}".lower()
        ):
            marker_idx = idx
            break
    if marker_idx is None:
        return []

    cleaned = segment[marker_idx + 1 :]
    riders = []
    idx = 0
    while idx + 3 < len(cleaned) and len(riders) < 10:
        rank = cleaned[idx]
        if not rank.isdigit():
            idx += 1
            continue
        riders.append(
            {
                "rank": int(rank),
                "name": cleaned[idx + 1],
                "team": cleaned[idx + 2],
                "time": cleaned[idx + 3],
            }
        )
        idx += 4
    return riders


def extract_gc_stages(stage_page_html: str):
    stage_sections = split_stage_sections(stage_page_html)
    page_lines = [line for line in section_text(stage_page_html).splitlines() if clean_text(line)]
    extracted = {}
    for label, section_html in stage_sections.items():
        stage_no = int(re.search(r"\d+", label).group())
        tables = parse_table_rows(section_html)
        candidate_tables = []
        for table in tables:
            if not table:
                continue
            headers = [cell["text"] for cell in table[0]]
            if headers[:4] == ["Rank", "Rider", "Team", "Time"]:
                candidate_tables.append(table)
        if not candidate_tables:
            for table in tables:
                riders = table_to_top10(table)
                if len(riders) == 10:
                    candidate_tables.append(table)
            if not candidate_tables:
                riders = gc_top10_from_lines(page_lines, stage_no)
                if len(riders) != 10:
                    raise ValueError(f"No GC table found for {label}")
                extracted[stage_no] = {"stage": stage_no, "riders": riders}
                continue
        gc_table = candidate_tables[-1]
        riders = table_to_top10(gc_table)
        if len(riders) != 10:
            raise ValueError(f"Unexpected rider count for {label}: {len(riders)}")
        extracted[stage_no] = {"stage": stage_no, "riders": riders}
    return extracted


def extract_wikipedia_payload(year: int):
    parts = [
        wiki_parse_html(f"{year} Giro d'Italia, Stage 1 to Stage 11"),
        wiki_parse_html(f"{year} Giro d'Italia, Stage 12 to Stage 21"),
    ]
    stages = {}
    for html in parts:
        stages.update(extract_gc_stages(html))
    return {
        "race": "Giro d%27Italia",
        "year": year,
        "stages": [stages[idx] for idx in sorted(stages)],
    }


def extract_stage_metadata(year: int, colour_map):
    main_html = wiki_parse_html(f"{year} Giro d'Italia")
    team_html = main_html
    team_title = TEAM_PAGE_TITLES.get(year)
    if team_title:
        try:
            team_html = wiki_parse_html(team_title)
        except Exception:
            team_html = main_html
    local_coords = build_local_coord_map()
    return {
        "race": "giro",
        "year": year,
        "teams": extract_teams(team_html, colour_map),
        "stages": extract_stages(main_html, year, local_coords),
    }


def main(args):
    years = [int(arg) for arg in args] if args else [2018, 2019]
    colour_map = build_colour_map()

    for year in years:
        wiki_payload = extract_wikipedia_payload(year)
        stage_payload = extract_stage_metadata(year, colour_map)

        wiki_path = DATA_DIR / f"giro-{year}-wikipedia.json"
        stage_path = STAGES_DIR / f"giro-{year}-stages.json"

        wiki_path.write_text(
            json.dumps(wiki_payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        stage_path.write_text(
            json.dumps(stage_payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"wrote {wiki_path}")
        print(f"wrote {stage_path}")


if __name__ == "__main__":
    main(sys.argv[1:])
