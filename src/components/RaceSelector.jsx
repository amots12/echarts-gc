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
            color: "#1A1A1A",
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
            color: "#666666",
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
            variant="outlined"
            value={race}
            onChange={(e) => onRaceChange(e.target.value)}
            sx={{
              minWidth: 170,
              color: "#1A1A1A",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#D0D0D0",
                borderWidth: "1.5px"
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#1A1A1A"
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#1A1A1A"
              },
              ".MuiSelect-icon": { color: "#455A64" }
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
            variant="outlined"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            sx={{
              minWidth: 110,
              color: "#1A1A1A",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#D0D0D0",
                borderWidth: "1.5px"
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#1A1A1A"
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#1A1A1A"
              },
              ".MuiSelect-icon": { color: "#455A64" }
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
