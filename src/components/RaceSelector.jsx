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

const AVAILABLE_RACES = [
  { id: "tour", label: "Tour de France" }
];

const AVAILABLE_YEARS = [2025, 2024, 2023, 2022];

export default function RaceSelector({
  race,
  year,
  onRaceChange,
  onYearChange
}) {
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
              sx={{ borderRadius: 2, minWidth: 160 }}
            >
              {AVAILABLE_RACES.map(r => (
                <MenuItem key={r.id} value={r.id}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small">
            <Select
              value={year}
              onChange={e => onYearChange(Number(e.target.value))}
              sx={{ borderRadius: 2, minWidth: 100 }}
            >
              {AVAILABLE_YEARS.map(y => (
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