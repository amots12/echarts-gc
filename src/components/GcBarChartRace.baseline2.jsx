import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";

import { Stack, IconButton } from "@mui/material";
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
  const key = (team || "Unknown").trim();
  const h = key.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

/* ================= TIME ================= */

function parseGapSeconds(timeStr, isLeader) {
  if (isLeader) return 0;
  if (!timeStr) return 0;

  const s = String(timeStr).replace("+", "").trim();

  // Matches: 1' 23" or 1'23"
  const mmss = s.match(/(\d+)'\s*(\d+)"/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);

  // Matches: 23"
  const sec = s.match(/(\d+)"/);
  if (sec) return Number(sec[1]);

  // Sometimes: 0:23 or 1:23 (best-effort)
  const colon = s.match(/(\d+):(\d+)/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);

  return 0;
}

function formatGap(seconds) {
  if (!seconds || seconds === 0) return "Leader";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/* ================= DATA PREP ================= */

function buildRiderUniverse(stages) {
  const seen = new Set();
  const universe = [];
  const teamByName = new Map();

  stages.forEach(stage => {
    (stage?.riders || []).slice(0, 10).forEach(r => {
      if (!r?.name) return;
      if (!seen.has(r.name)) {
        seen.add(r.name);
        universe.push({ name: r.name, team: r.team || "" });
      }
      if (r.team && !teamByName.has(r.name)) {
        teamByName.set(r.name, r.team);
      }
    });
  });

  // Fill missing teams from first seen mapping
  universe.forEach(u => {
    if (!u.team && teamByName.get(u.name)) u.team = teamByName.get(u.name);
  });

  return universe;
}

/**
 * Builds one dataset frame per stage (universe rows are kept stable).
 * Row schema: [name, value, gap, team, rank]
 * - value = -gapSeconds (so higher is better, leader stays on top with realtimeSort)
 * - gap = original gapSeconds (for labels/tooltips)
 * - rank = stage rank if in top10 else null
 */
function buildStageFrames(stages, universe) {
  const indexByName = new Map(universe.map((u, i) => [u.name, i]));
  const latestTeamByName = new Map(universe.map(u => [u.name, u.team || ""]));

  return stages.map(stage => {
    const top10 = (stage?.riders || []).slice(0, 10);

    const gapByName = new Map();
    const rankByName = new Map();

    let maxGap = 0;
    top10.forEach(r => {
      const gap = parseGapSeconds(r.time, r.rank === 1);
      gapByName.set(r.name, gap);
      rankByName.set(r.name, r.rank ?? null);
      if (r.team) latestTeamByName.set(r.name, r.team);
      if (gap > maxGap) maxGap = gap;
    });

    // Penalty: push absent riders below visible ranks, but keep rows to preserve identity.
    const penaltyMargin = 5 * 60; // 5 minutes
    const penaltyStep = 3; // small stable separation

    const rows = universe.map((u, stableIdx) => {
      const name = u.name;
      const team = latestTeamByName.get(name) || u.team || "";

      if (gapByName.has(name)) {
        const gap = gapByName.get(name);
        const rank = rankByName.get(name) ?? null;
        return [name, -gap, gap, team, rank];
      }

      const penaltyGap = maxGap + penaltyMargin + penaltyStep * (stableIdx + 1);
      return [name, -penaltyGap, penaltyGap, team, null];
    });

    return rows;
  });
}

/* ================= COMPONENT ================= */

export default function GcBarChartRace({ race, year, onStageChange }) {
  const [stages, setStages] = useState([]);
  const [stageMeta, setStageMeta] = useState([]);

  const [stageIndex, setStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const timerRef = useRef(null);
  const stageStartMsRef = useRef(Date.now());
  const rafRef = useRef(null);
  const [, forceRerender] = useState(0); // for smooth km label only (no chart interpolation)

  const STAGE_MS = 1200; // stage-to-stage update frequency

  /* ---------- LOAD DATA ---------- */

  useEffect(() => {
    let cancelled = false;
    setStages([]);
    setStageIndex(0);
    setIsPlaying(false);

    fetch(`${process.env.PUBLIC_URL}/data/${race}-${year}-wikipedia.json`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) setStages(d?.stages || []);
      })
      .catch(err => {
        console.error(err);
        if (!cancelled) setStages([]);
      });

    return () => {
      cancelled = true;
    };
  }, [race, year]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${process.env.PUBLIC_URL}/data/stages/${race}-${year}-stages.json`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) setStageMeta(d?.stages || []);
      })
      .catch(err => {
        console.warn("No stage metadata found", err);
        if (!cancelled) setStageMeta([]);
      });

    return () => {
      cancelled = true;
    };
  }, [race, year]);

  /* ---------- UNIVERSE + FRAMES ---------- */

  const riderUniverse = useMemo(() => buildRiderUniverse(stages), [stages]);

  const stageFrames = useMemo(() => {
    if (!stages.length || !riderUniverse.length) return [];
    return buildStageFrames(stages, riderUniverse);
  }, [stages, riderUniverse]);

  /* ---------- STAGE SYNC ---------- */

  useEffect(() => {
    if (typeof onStageChange === "function") {
      onStageChange(stageIndex);
    }
  }, [stageIndex, onStageChange]);

  /* ---------- PLAYBACK ---------- */

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      stopTimer();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stopTimer]);

  useEffect(() => {
    if (!isPlaying) {
      stopTimer();
      return undefined;
    }

    if (!stages.length) return undefined;

    stageStartMsRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setStageIndex(prev => {
        const next = prev + 1;
        if (next >= stages.length) {
          stopTimer();
          setIsPlaying(false);
          return prev;
        }
        stageStartMsRef.current = Date.now();
        return next;
      });
    }, STAGE_MS);

    return () => stopTimer();
  }, [isPlaying, stages.length, stopTimer]);

  // Smoothly update the "km covered" label (chart data updates remain stage-based).
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return undefined;
    }

    const tick = () => {
      forceRerender(n => (n + 1) % 1000000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying]);

  /* ---------- METADATA (TITLE/SUBTITLE) ---------- */

  const currentStageNumber = stages?.[stageIndex]?.stage;

  const currentStageMeta = useMemo(() => {
    if (!currentStageNumber) return null;
    return stageMeta.find(m => m.stage === currentStageNumber) || null;
  }, [stageMeta, currentStageNumber]);

  const weekday = currentStageMeta?.date
    ? new Date(currentStageMeta.date).toLocaleDateString("en-US", { weekday: "long" })
    : null;

  const formattedDate = currentStageMeta?.date
    ? new Date(currentStageMeta.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })
    : null;

  const smoothKm = useMemo(() => {
    if (!currentStageMeta || !stageMeta.length) return null;

    const now = Date.now();
    const t = Math.max(0, Math.min(1, (now - stageStartMsRef.current) / STAGE_MS));

    const prevMeta =
      stageIndex === 0 ? { accumulated_km: 0 } : stageMeta[stageIndex - 1] || { accumulated_km: 0 };

    const prevKm =
      typeof prevMeta?.accumulated_km === "number" ? prevMeta.accumulated_km : 0;

    const currKm =
      typeof currentStageMeta?.accumulated_km === "number" ? currentStageMeta.accumulated_km : prevKm;

    return prevKm + (currKm - prevKm) * t;
  }, [currentStageMeta, stageMeta, stageIndex]);

  /* ---------- CHART OPTION (ECharts-native bar race) ---------- */

  const frame = stageFrames[stageIndex] || [];

  const option = useMemo(() => {
    if (!stages.length) return {};

    const titleText = `Stage ${currentStageNumber ?? ""}`;
    const subText = currentStageMeta
      ? `${formattedDate} · ${weekday}
${currentStageMeta.start.town} → ${currentStageMeta.finish.town}
${smoothKm !== null ? smoothKm.toFixed(0) : ""} km covered`
      : "";

    return {
      animationDuration: 0,
      tooltip: { show: false },
      title: {
        left: "center",
        top: 12,
        text: titleText,
        subtext: subText,
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
        min: "dataMin",
        max: 0,
        splitLine: { show: false }
      },
      yAxis: {
        type: "category",
        inverse: true,
        max: 9,
        axisLabel: {
          fontWeight: "bold",
          fontSize: 13,
          color: "#111827"
        },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      dataset: [
        {
          id: "gc_ds",
          dimensions: ["name", "value", "gap", "team", "rank"],
          source: frame
        }
      ],
      series: [
        {
          id: "gc_series",
          type: "bar",
          datasetId: "gc_ds",
          realtimeSort: true,
          silent: true,
          barWidth: 36,
          encode: { x: "value", y: "name" },
          label: {
            show: true,
            position: "right",
            valueAnimation: true,
            formatter: params => {
              // params.value = [name, value, gap, team, rank]
              const v = Array.isArray(params.value) ? params.value : [];
              const name = v[0] ?? "";
              const gap = Number(v[2] ?? 0);
              const team = v[3] ?? "";
              const rank = v[4];

              if (rank === 1 || gap === 0) return `${name} — Leader (${team})`;
              return `${name}, +${formatGap(gap)}, ${team}`;
            },
            fontSize: 13,
            fontWeight: "bold"
          },
          // Smooth overtake transitions
          animationDurationUpdate: STAGE_MS * 0.9,
          animationEasingUpdate: "cubicInOut",
          // Color per row (kept stable because rows never disappear)
          universalTransition: true,
          itemStyle: {
            opacity: 0.85,
            borderRadius: 6,
            color: params => {
              const v = Array.isArray(params.value) ? params.value : [];
              const team = v[3] || "";
              return getTeamColor(team);
            }
          }
        }
      ]
    };
  }, [
    stages.length,
    currentStageNumber,
    currentStageMeta,
    formattedDate,
    weekday,
    smoothKm,
    frame
  ]);

  /* ---------- CONTROLS ---------- */

  const play = () => {
    if (!stages.length) return;
    if (stageIndex >= stages.length - 1) {
      setStageIndex(0);
      stageStartMsRef.current = Date.now();
    }
    setIsPlaying(true);
  };

  const pause = () => setIsPlaying(false);

  const restart = () => {
    setIsPlaying(false);
    setStageIndex(0);
    stageStartMsRef.current = Date.now();
  };

  const progressPct =
    stages.length > 1 ? Math.min((stageIndex / (stages.length - 1)) * 100, 100) : 0;

  if (!stages.length) return <div>Loading…</div>;

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
        <IconButton onClick={play} aria-label="play">
          <PlayArrowIcon />
        </IconButton>
        <IconButton onClick={pause} aria-label="pause">
          <PauseIcon />
        </IconButton>
        <IconButton onClick={restart} aria-label="restart">
          <ReplayIcon />
        </IconButton>
      </Stack>

      {/* Chart fills remaining space */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          notMerge={false}
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
