import React, { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";

import { Stack, IconButton, Slider, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
/*import ExpandMoreIcon from "@mui/icons-material/ExpandMore";*/

const DEFAULT_JERSEY_PRIMARY = "#E5E7EB";
const DEFAULT_JERSEY_SECONDARY = "#9CA3AF";
const VIBRANT_GOLD = "#FFD700";
const GIRO_PINK = "#EF94B4";
const DEEP_SLATE = "#37474F";
const LINE_CHARCOAL = "#1A1A1A";
const SLATE_GRAY = "#666666";
const STEEL_GRAY = "#455A64";
const TABULAR_FONT = "\"Roboto Mono\", ui-monospace, SFMono-Regular, Menlo, monospace";
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="#F2F2F2" />
      <path d="M9 5.4L6.2 7L5.2 10l2 1.2.9-2 1.2 8.4h5.5l1.2-8.4.9 2 2-1.2-1-3-2.8-1.6-1.8.8-1.8.5-1.8-.5z" fill="${primary}" />
      <path d="M9 5.4L6.2 7L5.2 10l2 1.2.9-2L9 5.4zm6 0L17.8 7l1 3-2 1.2-.9-2L15 5.4z" fill="${secondary}" />
      <path d="M9 5.4L6.2 7L5.2 10l2 1.2.9-2 1.2 8.4h5.5l1.2-8.4.9 2 2-1.2-1-3-2.8-1.6-1.8.8-1.8.5-1.8-.5z" fill="none" stroke="#111827" stroke-width=".45" stroke-opacity=".18" />
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [stages, setStages] = useState([]);
  const [tick, setTick] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
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
    setHasStarted(false);

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
      month: "short"
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
        width: 24,
        height: 24,
        align: "center",
        borderRadius: 12,
        backgroundColor: { image: getJerseyForTeam(rider.team) }
      };
      acc[`name_${i}`] = {
        fontWeight: 700,
        color: rider.rank === 1 ? LINE_CHARCOAL : "#FFFFFF",
        fontSize: 13,
        padding: [0, 0, 0, 8]
      };
      return acc;
    },
    {
      gap: {
        fontWeight: "bold",
        color: SLATE_GRAY,
        fontSize: 13,
        fontFamily: TABULAR_FONT,
        fontVariant: "tabular-nums"
      },
      outside: {
        fontWeight: 700,
        color: LINE_CHARCOAL,
        fontSize: 12.5,
        fontFamily: TABULAR_FONT,
        fontVariant: "tabular-nums",
        textBorderColor: "#FFFFFF",
        textBorderWidth: 4
      }
    }
  );

  const maxGap = riders.reduce((max, rider) => Math.max(max, rider.gap || 0), 0);
  const leaderAnchorValue = Math.max(maxGap + 10, 10);
  const leaderColor = race === "giro" ? GIRO_PINK : VIBRANT_GOLD;

  const barRows = riders.map(rider => {
    const isLeader = rider.rank === 1;
    const value = isLeader ? leaderAnchorValue : rider.gap;
    const ratio = leaderAnchorValue > 0 ? value / leaderAnchorValue : 0;
    const isShort = ratio < 0.4 && rider.gap !== 0;
    return { rider, value, isShort, isLeader };
  });
  const visibleRows = (isMobile ? barRows.slice(0, 12) : barRows.slice(0, 10));
  const activeRows = hasStarted ? visibleRows : [];

  const option = {
    tooltip: {
      show: false
    },
    grid: {
      left: 40,
      right: isMobile ? 165 : 220,
      top: 8,
      bottom: 10,
      height: isMobile ? "70%" : undefined
    },
    xAxis: {
      type: "value",
      show: false,
      min: 0,
      splitLine: { show: false }
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: activeRows.map((_, i) => i + 1),
        axisLabel: {
            fontWeight: "bold",
            fontSize: 13,
            color: LINE_CHARCOAL,
            fontFamily: TABULAR_FONT,
            fontVariant: "tabular-nums"
        },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    series: [
      {
        type: "bar",
        silent: true,
        barWidth: isMobile ? "74%" : "65%",
        data: activeRows.map(({ rider, value, isShort, isLeader }) => ({
          value,
          isShort,
          itemStyle: {
            color: isLeader ? leaderColor : DEEP_SLATE,
            opacity: isShort ? 0.6 : 1,
            borderRadius: 6,
            shadowBlur: isLeader ? 10 : 8,
            shadowColor: isLeader ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.15)",
            shadowOffsetY: isLeader ? 5 : 4
          }
        })),
        label: {
          show: true,
          opacity: 1,
          position: "insideLeft",
          distance: 10,
          rich: labelRich,
          formatter: ({ dataIndex }) => {
            const row = activeRows[dataIndex];
            const r = row?.rider;
            if (!r) return "";
            if (row?.isShort) return "";

            const iconKey = `icon_${dataIndex}`;
            const nameKey = `name_${dataIndex}`;
            return `{${iconKey}|} {${nameKey}|${r.name}}`;
          },
          fontSize: 13,
          fontWeight: "bold"
        },
        animationDurationUpdate: FRAME_MS * 1.6,
        animationEasingUpdate: "cubicInOut"
      },
      {
        type: "bar",
        silent: true,
        barWidth: isMobile ? "74%" : "65%",
        barGap: "-100%",
        data: activeRows.map(({ value, isShort }) => ({
          value,
          isShort,
          itemStyle: {
            color: "transparent"
          }
        })),
        label: {
          show: true,
          opacity: 1,
          position: "right",
          distance: 10,
          color: LINE_CHARCOAL,
          textBorderColor: "#FFFFFF",
          textBorderWidth: 4,
          fontWeight: "bold",
          rich: labelRich,
          formatter: ({ dataIndex }) => {
            const row = activeRows[dataIndex];
            const rider = row?.rider;
            if (!rider) return "";
            if (row?.isLeader && rider.gap === 0) return "{gap|Leader}";
            if (!row?.isLeader && rider.gap === 0) {
              if (row?.isShort) {
                const iconKey = `icon_${dataIndex}`;
                return `{${iconKey}|} {outside|${rider.name}}`;
              }
              return "{gap|}";
            }
            if (row?.isShort) {
              const iconKey = `icon_${dataIndex}`;
              return `{${iconKey}|} {outside|${rider.name} +${formatGap(rider.gap)}}`;
            }
            return `{gap|+${formatGap(rider.gap)}}`;
          }
        },
        animationDurationUpdate: FRAME_MS * 1.6,
        animationEasingUpdate: "cubicInOut"
      }
    ]
  };

  /* ---------- CONTROLS ---------- */

  const maxTick = INTRO_FRAMES + (stages.length - 1) * FRAMES;

  const play = () => {
    setHasStarted(true);
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
    setHasStarted(false);
  };

  const marks = Array.from({ length: stages.length }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}`
  }));

  const handleSliderChange = (_, value) => {
    const nextStage = Array.isArray(value) ? value[0] : value;
    if (typeof nextStage !== "number") return;
    pause();
    setHasStarted(true);
    const bounded = Math.max(1, Math.min(stages.length, Math.round(nextStage)));
    setTick(INTRO_FRAMES + (bounded - 1) * FRAMES);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        padding: isMobile ? 24 : 16,
        position: "relative",
        zIndex: 10
      }}
    >
      <div
        style={{
          marginBottom: isMobile ? 22 : 14,
          paddingBottom: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: isMobile ? "center" : "flex-start",
          textAlign: isMobile ? "center" : "left",
          background: isMobile ? "rgba(255, 255, 255, 0.7)" : "transparent",
          backdropFilter: isMobile ? "blur(12px) brightness(1.05)" : "none",
          WebkitBackdropFilter: isMobile ? "blur(12px) brightness(1.05)" : "none",
          borderBottom: isMobile ? "1px solid rgba(0, 0, 0, 0.05)" : "none",
          borderRadius: isMobile ? 12 : 0,
          padding: isMobile ? 16 : 0
        }}
      >
        <div
          style={{
            fontFamily: "\"Source Serif 4\", \"Lora\", serif",
            fontSize: "1.8rem",
            fontWeight: 600,
            color: LINE_CHARCOAL,
            lineHeight: 1.15
          }}
        >
          {`Stage ${stages[stageIndex].stage}`}
        </div>
        <div
          style={{
            fontFamily: TABULAR_FONT,
            fontVariantNumeric: "tabular-nums",
            fontSize: "0.9rem",
            color: SLATE_GRAY,
            marginTop: 2
          }}
        >
          {smoothKm !== null ? `${smoothKm.toFixed(0)} km covered` : ""}
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: SLATE_GRAY,
            marginTop: 6
          }}
        >
          {currentStageMeta ? `${formattedDate} · ${weekday}` : ""}
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: SLATE_GRAY,
            marginBottom: isMobile ? 24 : 0
          }}
        >
          {currentStageMeta ? `${currentStageMeta.start.town} → ${currentStageMeta.finish.town}` : ""}
        </div>
      </div>

  
      {/* Controls */}
      <div
        style={{
          background: isMobile ? "rgba(255, 255, 255, 0.6)" : "transparent",
          backdropFilter: isMobile ? "blur(12px) brightness(1.1)" : "none",
          WebkitBackdropFilter: isMobile ? "blur(12px) brightness(1.1)" : "none",
          borderBottom: isMobile ? "1px solid rgba(0, 0, 0, 0.05)" : "none",
          borderRadius: isMobile ? 10 : 0
        }}
      >
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
          <IconButton onClick={play} sx={{ color: STEEL_GRAY }}><PlayArrowIcon /></IconButton>
          <IconButton onClick={pause} sx={{ color: STEEL_GRAY }}><PauseIcon /></IconButton>
          <IconButton onClick={restart} sx={{ color: STEEL_GRAY }}><ReplayIcon /></IconButton>
        </Stack>
      </div>
  
      {/* Chart fills remaining space */}
      <div style={{ flex: isMobile ? "0 0 65vh" : 1, minHeight: 0 }}>
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          notMerge
          lazyUpdate
        />
      </div>
  
      <div style={{ padding: "15px 0" }}>
        <Slider
          min={1}
          max={stages.length}
          step={1}
          value={stageIndex + 1}
          onChange={handleSliderChange}
          marks={marks}
          sx={{
            mt: 1.5,
            color: "#1A1A1A",
            "& .MuiSlider-rail": { backgroundColor: "#E0E0E0", opacity: 1 },
            "& .MuiSlider-track": { backgroundColor: "#1A1A1A", border: "none" },
            "& .MuiSlider-mark": { display: "none" },
            "& .MuiSlider-markLabel": {
              fontFamily: TABULAR_FONT,
              fontSize: 10,
              color: SLATE_GRAY
            },
            "& .MuiSlider-thumb": {
              width: 12,
              height: 12,
              backgroundColor: "#1A1A1A"
            }
          }}
        />
      </div>
    </div>
  );
}
