import React from "react";
import { Box, Stack, Typography, Select, MenuItem, FormControl } from "@mui/material";

export default function RaceSelector({ race, year, races, onRaceChange, onYearChange }) {
  const raceOptions = Object.entries(races || {});
  const yearOptions = races?.[race]?.years || [];

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={3}
      sx={{ gap: 2, flexWrap: "wrap" }}
    >
      {/* Title / Subtitle */}
      <Box sx={{ minWidth: 280 }}>
        <Typography
          sx={{
            fontSize: 22,
            fontWeight: 700,
            color: "#111827",
            letterSpacing: 0.2,
            lineHeight: 1.2
          }}
        >
          Animate the Race — Replay The GC race
        </Typography>

        <Typography
          sx={{
            mt: 0.6,
            fontSize: 13.5,
            color: "#6b7280",
            lineHeight: 1.55,
            maxWidth: 720
          }}
        >
          Across mountains, time trials, and sprint finishes, the GC battle evolves.
          Bar length reflects time behind the leader; the map marks where each chapter concludes.
        </Typography>
      </Box>

      {/* Controls */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <FormControl size="small">
          <Select
            value={race}
            onChange={(e) => onRaceChange(e.target.value)}
            sx={{
              borderRadius: 2,
              minWidth: 170,
              backgroundColor: "#f9fafb",
              "& fieldset": { border: "1px solid #e5e7eb" }
            }}
          >
            {raceOptions.map(([id, cfg]) => (
              <MenuItem key={id} value={id}>
                {cfg.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <Select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            sx={{
              borderRadius: 2,
              minWidth: 110,
              backgroundColor: "#f9fafb",
              "& fieldset": { border: "1px solid #e5e7eb" }
            }}
          >
            {yearOptions.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  );
}