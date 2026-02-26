import React, { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";

import { Stack, IconButton 
    /*Accordion,*/
    /*AccordionSummary,*/
    /*AccordionDetails,*/
    /*Typography*/} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
/*import ExpandMoreIcon from "@mui/icons-material/ExpandMore";*/

const DEFAULT_JERSEY_PRIMARY = "#E5E7EB";
const DEFAULT_JERSEY_SECONDARY = "#9CA3AF";
const TEAM_NAME_ALIASES = {
  "UAE Team Emirates": "UAE Team Emirates XRG",
  "Alpecin–Deceuninck": "Alpecin–Deceuninck"
};

/* ================= TIME ================= */

function parseGap(timeStr, isLeader) {
  if (isLeader) return 0;
  if (!timeStr) return 0;

  const s = timeStr.replace("+", "").trim();
  const m = s.match(/(\d+)'\s*(\d+)"/);
  if (m) return +m[1] * 60 + +m[2];

  const sec = s.match(/(\d+)"/);
  if (sec) return +sec[1];

  return 0;
}

function formatGap(seconds) {
  if (seconds === 0) return "Leader";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function makeJerseyDataUrl(primaryHex, secondaryHex) {
  const primary = primaryHex || DEFAULT_JERSEY_PRIMARY;
  const secondary = secondaryHex || DEFAULT_JERSEY_SECONDARY;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1152 896">
      <path d="M 285 309 L 116 415 L 44 225 L 45 221 L 277 60 L 408 61 L 439 81 L 295 306 Z" fill="${secondary}" />
      <path d="M 740 60 L 871 61 L 1093 216 L 1101 222 L 1101 226 L 1029 415 L 850 305 L 699 85 Z" fill="${secondary}" />
      <path d="M 569 866 L 338 865 L 295 306 L 439 81 L 485 101 L 533 112 L 569 115 L 583 115 L 625 110 L 666 99 L 699 85 L 806 864 L 773 866 Z" fill="${primary}" />
      <path d="M 285 309 L 116 415 L 44 225 L 45 221 L 277 60 L 408 61 L 439 81 L 485 101 L 533 112 L 569 115 L 583 115 L 625 110 L 666 99 L 699 85 L 740 60 L 871 61 L 1093 216 L 1101 222 L 1101 226 L 1029 415 L 850 305 L 806 864 L 773 866 L 569 866 L 338 865 Z" fill="none" stroke="#111827" stroke-width="18" stroke-opacity="0.14" />
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/* ================= INTERPOLATION ================= */

function interpolate(stageA, stageB, t) {
  const mapB = new Map(stageB.riders.map(r => [r.name, r]));

  const base = stageA.riders
    .slice(0, 10)
    .sort((a, b) => a.rank - b.rank)
    .map(rA => {
      const rB = mapB.get(rA.name);
      const gapA = parseGap(rA.time, rA.rank === 1);

      if (rB) {
        const gapB = parseGap(rB.time, rB.rank === 1);
        return { ...rA, gap: gapA + (gapB - gapA) * t };
      }

      // eliminated rider → drift down
      return { ...rA, gap: gapA + 30 * t };
    });

  return base.sort((a, b) => a.gap - b.gap);
}

/* ================= COMPONENT ================= */

export default function GcBarChartRace({ race, year, onStageChange }) {
  const [stages, setStages] = useState([]);
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);
  const [stageMeta, setStageMeta] = useState([]);
  const [teamPaletteByName, setTeamPaletteByName] = useState({});
  const jerseyCacheRef = useRef(new Map());

  const FRAMES = 30;
  const FRAME_MS = 120;
  const INTRO_FRAMES = 20;

  /* ---------- LOAD DATA ---------- */

  useEffect(() => {
    setStages([]);
    setTick(0);

    fetch(`${process.env.PUBLIC_URL}/data/${race}-${year}-wikipedia.json`)
      .then(r => r.json())
      .then(d => setStages(d.stages))
      .catch(console.error);
  }, [race, year]);

  useEffect(() => {
    fetch(
      `${process.env.PUBLIC_URL}/data/stages/${race}-${year}-stages.json`
    )
      .then(r => r.json())
      .then(d => {
        setStageMeta(d?.stages || []);

        const palettes = {};
        (d?.teams || []).forEach(team => {
          if (!team?.name) return;
          const colours = Array.isArray(team.colours) ? team.colours : [];
          palettes[team.name] = {
            primary: colours[0] || DEFAULT_JERSEY_PRIMARY,
            secondary: colours[1] || DEFAULT_JERSEY_SECONDARY,
            accent: colours[2] || null
          };
        });
        setTeamPaletteByName(palettes);
      })
      .catch(err => {
        console.warn("No stage metadata found", err);
        setStageMeta([]);
        setTeamPaletteByName({});
      });
  }, [race, year]);

  useEffect(() => {
    jerseyCacheRef.current.clear();
  }, [race, year, teamPaletteByName]);

  const isIntro = tick < INTRO_FRAMES;

  const stageIndex = !stages.length
    ? 0
    : isIntro
      ? 0
      : Math.min(
          Math.floor((tick - INTRO_FRAMES) / FRAMES),
          stages.length - 1
        );

  const t = isIntro
    ? tick / INTRO_FRAMES
    : ((tick - INTRO_FRAMES) % FRAMES) / FRAMES;

  // 🔁 Sync current stage with parent (RaceMap)
  useEffect(() => {
    if (typeof onStageChange === "function") {
      onStageChange(stageIndex);
    }
  }, [stageIndex, onStageChange]);

  if (!stages.length) return <div>Loading…</div>;

    const currentStageNumber = stages[stageIndex]?.stage;

    const currentStageMeta =
        stageMeta.find(m => m.stage === currentStageNumber) || null;
    
    // --- Smooth accumulated km (including Stage 1 from 0) ---

    let smoothKm = null;

    if (stageMeta.length && currentStageMeta) {
    const prevMeta =
        stageIndex === 0
        ? { accumulated_km: 0 }
        : stageMeta[stageIndex - 1];

    const prevKm =
        typeof prevMeta?.accumulated_km === "number"
        ? prevMeta.accumulated_km
        : 0;

    const currKm =
        typeof currentStageMeta.accumulated_km === "number"
        ? currentStageMeta.accumulated_km
        : prevKm;

    smoothKm = prevKm + (currKm - prevKm) * t;
        }
  const weekday = currentStageMeta?.date
  ? new Date(currentStageMeta.date).toLocaleDateString("en-US", {
      weekday: "long"
    })
  : null;

  const formattedDate = currentStageMeta?.date
  ? new Date(currentStageMeta.date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })
  : null;

  const riders =
    isIntro
      ? interpolate(
          {
            riders: stages[0].riders.slice(0, 10).map(r => ({
              ...r,
              time: "0\""
            }))
          },
          stages[0],
          t
        )
      : stageIndex < stages.length - 1
        ? interpolate(stages[stageIndex], stages[stageIndex + 1], t)
        : stages[stageIndex].riders
            .slice(0, 10)
            .map(r => ({
              ...r,
              gap: parseGap(r.time, r.rank === 1)
            }))
            .sort((a, b) => a.gap - b.gap);

  /* ---------- CHART ---------- */

  const showLabels = tick > 0;

  const resolveTeamPalette = (teamName) => {
    const resolvedTeamName = TEAM_NAME_ALIASES[teamName] || teamName;
    return teamPaletteByName[resolvedTeamName] || {
      primary: DEFAULT_JERSEY_PRIMARY,
      secondary: DEFAULT_JERSEY_SECONDARY
    };
  };

  const getJerseyForTeam = (teamName) => {
    const resolvedTeamName = TEAM_NAME_ALIASES[teamName] || teamName;
    const palette = resolveTeamPalette(teamName);
    const key = `${resolvedTeamName || "__fallback__"}|${palette.primary}|${palette.secondary}`;
    if (jerseyCacheRef.current.has(key)) {
      return jerseyCacheRef.current.get(key);
    }

    const dataUrl = makeJerseyDataUrl(palette.primary, palette.secondary);
    jerseyCacheRef.current.set(key, dataUrl);
    return dataUrl;
  };

  const labelRich = riders.reduce(
    (acc, rider, i) => {
      acc[`icon_${i}`] = {
        width: 16,
        height: 16,
        align: "center",
        borderRadius: 2,
        backgroundColor: { image: getJerseyForTeam(rider.team) }
      };
      return acc;
    },
    {
      name: { fontWeight: "bold", color: "#111827", fontSize: 13 },
      gap: { fontWeight: "bold", color: "#111827", fontSize: 13 }
    }
  );

  const option = {
    tooltip: {
      show: false
    },
    title: {
      left: "center",
      top: 12,
      text: `Stage ${stages[stageIndex].stage}`,
      subtext: currentStageMeta
        ? `${formattedDate} · ${weekday}
    ${currentStageMeta.start.town} → ${currentStageMeta.finish.town}
    ${smoothKm !== null ? smoothKm.toFixed(0) : ""} km covered`
        : "",
      textStyle: {
        fontSize: 22,
        fontWeight: 700,
        color: "#111827"
      },
      subtextStyle: {
        fontSize: 14,
        lineHeight: 20,
        color: "#4b5563"
      }
    },
    grid: { left: 40, right: 220, top: 92, bottom: 10 },
    xAxis: {
      type: "value",
      show: false,
      min: 0,
      splitLine: { show: false }
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: riders.map((_, i) => i + 1),
        axisLabel: {
            fontWeight: "bold",
            fontSize: 13,
            color: "#111827"
        },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    series: [
      {
        type: "bar",
        silent: true,
        barWidth: 36,
        data: riders.map(r => ({
          value: r.gap,
          itemStyle: {
            color: resolveTeamPalette(r.team).primary,
            opacity: 0.85,
            borderRadius: 6
          }
        })),
        label: {
          show: showLabels,
          position: "right",
          rich: labelRich,
          formatter: ({ dataIndex }) => {
            const r = riders[dataIndex];
            if (!r) return "";

            const iconKey = `icon_${dataIndex}`;
            if (r.rank === 1) {
              return `{${iconKey}|} {name|${r.name}} {gap|— Leader}`;
            }

            return `{${iconKey}|} {name|${r.name}} {gap|+${formatGap(r.gap)}}`;
          },
          fontSize: 13,
          fontWeight: "bold"
        },
        animationDurationUpdate: FRAME_MS * 1.6,
        animationEasingUpdate: "cubicInOut"
      }
    ]
  };

  /* ---------- CONTROLS ---------- */

  const maxTick = INTRO_FRAMES + (stages.length - 1) * FRAMES;
  const progressPct = maxTick > 0
  ? Math.min((tick / maxTick) * 100, 100)
  : 0;

  const play = () => {
    if (timerRef.current) return;
  
    timerRef.current = setInterval(() => {
      setTick(prev => {
        if (prev >= maxTick) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return prev;
        }
        return prev + 1;
      });
    }, FRAME_MS);
  };

  const pause = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const restart = () => {
    pause();
    setTick(0);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        padding: 16
      }}
    >
  
      {/* Controls */}
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
        <IconButton onClick={play}><PlayArrowIcon /></IconButton>
        <IconButton onClick={pause}><PauseIcon /></IconButton>
        <IconButton onClick={restart}><ReplayIcon /></IconButton>
      </Stack>
  
      {/* Chart fills remaining space */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          notMerge
          lazyUpdate
        />
      </div>
  
      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "#e5e7eb",
          borderRadius: 4,
          overflow: "hidden",
          marginTop: 8
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "#111827",
            transition: "width 120ms linear"
          }}
        />
      </div>
    </div>
  );
}
