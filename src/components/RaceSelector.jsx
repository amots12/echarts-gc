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
        px: 3,
        py: 2,
        mb: 3,
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        maxWidth: 1200,
        mx: "auto"
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={3}
      >
        {/* Title */}
        <Box>
          <Typography variant="h6" fontWeight={700} color="#111827">
            Cycling GC Bar Chart Race
          </Typography>
          <Typography variant="body2" color="text.secondary">
            How the race evolves, stage by stage
          </Typography>
        </Box>

        {/* Selectors */}
        <Stack direction="row" spacing={2}>
          <FormControl size="small">
            <Select
              value={race}
              onChange={e => onRaceChange(e.target.value)}
              sx={{
                borderRadius: 2,
                minWidth: 140,
                backgroundColor: "#f9fafb",
                "& fieldset": { border: "none" }
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
              onChange={e => onYearChange(Number(e.target.value))}
              sx={{
                borderRadius: 2,
                minWidth: 90,
                backgroundColor: "#f9fafb",
                "& fieldset": { border: "none" }
              }}
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