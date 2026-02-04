import React, { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";

import { Stack, IconButton, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";

/* ================= TEAM COLORS ================= */

const TEAM_COLORS = {
  "Quick-Step Alpha Vinyl Team": "#1e3a8a",
  "Team Jumbo–Visma": "#facc15",
  "UAE Team Emirates": "#e11d48",
  "Ineos Grenadiers": "#111827",
  "Alpecin–Deceuninck": "#2563eb",
  "Trek–Segafredo": "#dc2626",
  "Team Bahrain Victorious": "#b91c1c",
  "EF Education–EasyPost": "#ec4899",
  "Groupama–FDJ": "#2563eb",
  "Movistar Team": "#0ea5e9",
  "Arkéa–Samsic": "#111827",
  "Team DSM": "#f97316",
  "Astana Qazaqstan Team": "#38bdf8",
  "Bora–Hansgrohe": "#22c55e",
  "Intermarché–Wanty–Gobert Matériaux": "#16a34a"
};

const FALLBACK_COLORS = ["#64748b", "#8b5cf6", "#06b6d4", "#84cc16"];

function getTeamColor(team) {
  if (TEAM_COLORS[team]) return TEAM_COLORS[team];
  const h = team.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

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

export default function GcBarChartRace({ race, year }) {
  const [stages, setStages] = useState([]);
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);

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

  if (!stages.length) return <div>Loading…</div>;

  const isIntro = tick < INTRO_FRAMES;
  const stageIndex = isIntro
    ? 0
    : Math.min(
        Math.floor((tick - INTRO_FRAMES) / FRAMES),
        stages.length - 1
      );

  const t = isIntro
    ? tick / INTRO_FRAMES
    : ((tick - INTRO_FRAMES) % FRAMES) / FRAMES;

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

  const option = {
    title: {
      text: `Stage ${stages[stageIndex].stage} — GC`,
      left: "center"
    },
    grid: { left: 240, right: 220, top: 60, bottom: 20 },
    xAxis: {
      type: "value",
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
        barWidth: 32,
        data: riders.map(r => ({
          value: r.gap,
          itemStyle: {
            color: getTeamColor(r.team),
            opacity: 0.85,
            borderRadius: 6
          }
        })),
        label: {
          show: true,
          position: "right",
          formatter: ({ dataIndex }) => {
            const r = riders[dataIndex];
            if (!r) return "";
          
            if (r.rank === 1) {
              return `${r.name} — Leader (${r.team})`;
            }
          
            return `${r.name}, +${formatGap(r.gap)}, ${r.team}`;
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

  const play = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTick(t => (t >= maxTick ? t : t + 1));
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
    <div style={{ maxWidth: 1300, margin: "0 auto" }}>
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
        <Tooltip title="Play"><IconButton onClick={play}><PlayArrowIcon /></IconButton></Tooltip>
        <Tooltip title="Pause"><IconButton onClick={pause}><PauseIcon /></IconButton></Tooltip>
        <Tooltip title="Restart"><IconButton onClick={restart}><ReplayIcon /></IconButton></Tooltip>
      </Stack>

      <ReactECharts option={option} style={{ height: 620 }} />
    </div>
  );
}