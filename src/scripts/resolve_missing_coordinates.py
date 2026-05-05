#!/usr/bin/env python3

import json
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


WIKI_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "echarts-gc-coordinate-resolver/1.0"}

ROOT = Path(__file__).resolve().parents[2]
STAGES_DIR = ROOT / "public" / "data" / "stages"
MISSING_PATH = STAGES_DIR / "missing-coordinates.json"

LAST_REQUEST_TS = 0.0


ALIASES = {
    "Alpago (Farra)": ["Farra d'Alpago"],
    "Alta Badia": ["Corvara", "Alta Badia"],
    "Altopiano del Montasio": ["Montasio"],
    "Autodromo Enzo e Dino Ferrari": ["Autodromo Internazionale Enzo e Dino Ferrari"],
    "Bardonecchia (Monte Jafferau)": ["Jafferau", "Bardonecchia"],
    "Belfast (Northern Ireland)": ["Belfast"],
    "Bologna (San Luca)": ["San Luca, Bologna", "Sanctuary of the Madonna di San Luca", "Bologna"],
    "Campitello Matese": ["Campitello Matese"],
    "Castelrotto/Kastelruth": ["Kastelruth", "Castelrotto"],
    "Cervinia": ["Breuil-Cervinia", "Cervinia"],
    "Courmayeur (Skyway Monte Bianco)": ["Skyway Monte Bianco", "Courmayeur"],
    "Gardeccia-Val di Fassa": ["Gardeccia", "Val di Fassa"],
    "Herning (Denmark)": ["Herning"],
    "Mestre": ["Mestre"],
    "Monte Terminillo": ["Monte Terminillo"],
    "Oropa": ["Sanctuary of Oropa", "Oropa"],
    "Passo del Tonale": ["Tonale Pass", "Passo del Tonale"],
    "Pian dei Resinelli": ["Piani Resinelli", "Pian dei Resinelli"],
    "Plan de Corones": ["Kronplatz", "Plan de Corones"],
    "Quarto dei Mille": ["Quarto dei Mille"],
    "Rocca di Cambio": ["Rocca di Cambio"],
    "San Giovanni Rotondo": ["San Giovanni Rotondo"],
    "Santuario di Oropa": ["Sanctuary of Oropa", "Oropa"],
    "Santa Maria di Sala": ["Santa Maria di Sala"],
}


def fetch_json(url: str):
    global LAST_REQUEST_TS
    delay = 0.2 - (time.time() - LAST_REQUEST_TS)
    if delay > 0:
        time.sleep(delay)

    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=30) as response:
        LAST_REQUEST_TS = time.time()
        return json.loads(response.read().decode("utf-8"))


def wiki_coords(title: str):
    url = (
        f"{WIKI_API}?action=query&format=json&formatversion=2"
        f"&prop=coordinates&redirects=1&titles={quote(title)}"
    )
    try:
        payload = fetch_json(url)
    except Exception:
        return None, None

    for page in payload.get("query", {}).get("pages", []):
        coords = page.get("coordinates")
        if coords:
            return coords[0]["lat"], coords[0]["lon"]
    return None, None


def build_local_coord_map():
    coords = {}
    for path in STAGES_DIR.glob("*-stages.json"):
        if path.name == "missing-coordinates.json":
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        for stage in payload.get("stages", []):
            for side in ("start", "finish"):
                point = stage.get(side) or {}
                town = point.get("town")
                lat = point.get("lat")
                lon = point.get("lon")
                if town and lat is not None and lon is not None and town not in coords:
                    coords[town] = (lat, lon)
    return coords


def candidate_names(name: str):
    candidates = [name]

    if name in ALIASES:
        candidates.extend(ALIASES[name])

    if " (" in name and name.endswith(")"):
        base = name.split(" (", 1)[0].strip()
        if base:
            candidates.append(base)
        inner = name.rsplit("(", 1)[1].rstrip(")").strip()
        if inner:
            candidates.append(inner)

    if "/" in name:
        candidates.extend(part.strip() for part in name.split("/") if part.strip())

    deduped = []
    seen = set()
    for candidate in candidates:
        if candidate and candidate not in seen:
            seen.add(candidate)
            deduped.append(candidate)
    return deduped


def resolve_name(name: str, local_coords):
    for candidate in candidate_names(name):
        if candidate in local_coords:
            return local_coords[candidate]

    for candidate in candidate_names(name):
        lat, lon = wiki_coords(candidate)
        if lat is not None and lon is not None:
            return lat, lon

    return None, None


def update_stage_files(missing_payload, resolved):
    grouped = {}
    for year, items in missing_payload["missing_coordinates"].items():
        grouped[int(year)] = items

    for year, items in grouped.items():
        path = STAGES_DIR / f"giro-{year}-stages.json"
        stage_payload = json.loads(path.read_text(encoding="utf-8"))
        for item in items:
            key = (year, item["stage"], item["side"], item["town"])
            coords = resolved.get(key)
            if not coords:
                continue
            for stage in stage_payload.get("stages", []):
                if stage.get("stage") == item["stage"]:
                    point = stage[item["side"]]
                    if point.get("town") == item["town"]:
                        point["lat"], point["lon"] = coords
                        break
        path.write_text(json.dumps(stage_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def rebuild_missing_payload(missing_payload, resolved):
    next_missing = {}
    for year, items in missing_payload["missing_coordinates"].items():
        remaining = []
        for item in items:
            key = (int(year), item["stage"], item["side"], item["town"])
            if key not in resolved:
                remaining.append(item)
        next_missing[year] = remaining
    missing_payload["missing_coordinates"] = next_missing
    return missing_payload


def main():
    local_coords = build_local_coord_map()
    missing_payload = json.loads(MISSING_PATH.read_text(encoding="utf-8"))

    resolved = {}
    unresolved = []

    for year, items in missing_payload.get("missing_coordinates", {}).items():
        year_num = int(year)
        for item in items:
            key = (year_num, item["stage"], item["side"], item["town"])
            coords = resolve_name(item["town"], local_coords)
            if coords[0] is not None and coords[1] is not None:
                resolved[key] = coords
                local_coords[item["town"]] = coords
            else:
                unresolved.append(key)

    update_stage_files(missing_payload, resolved)
    missing_payload = rebuild_missing_payload(missing_payload, resolved)
    MISSING_PATH.write_text(
        json.dumps(missing_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"resolved={len(resolved)} unresolved={len(unresolved)}")


if __name__ == "__main__":
    main()
