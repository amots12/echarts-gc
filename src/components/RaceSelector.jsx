// src/components/RaceSelector.jsx
import React from "react";
import {
  Box,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl
} from "@mui/material";

export default function RaceSelector({
  race,
  year,
  races,
  onRaceChange,
  onYearChange
}) {
  const raceOptions = Object.entries(races);
  const yearOptions = races[race]?.years || [];

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: "1px solid #e5e7eb",
        px: 3,
        py: 2,
        mb: 3,
        backgroundColor: "#fff"
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
      >
        {/* Title */}
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Cycling GC Bar Chart Race
          </Typography>
          <Typography variant="body2" color="text.secondary">
            General Classification standings across stages
          </Typography>
        </Box>

        {/* Selectors */}
        <Stack direction="row" spacing={2}>
          <FormControl size="small">
            <Select
              value={race}
              onChange={e => onRaceChange(e.target.value)}
              sx={{ borderRadius: 2, minWidth: 180 }}
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
              onChange={e => onYearChange(Number(e.target.value))}
              sx={{ borderRadius: 2, minWidth: 110 }}
            >
              {yearOptions.map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    </Box>
  );
}