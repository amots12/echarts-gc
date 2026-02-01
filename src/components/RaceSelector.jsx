// src/components/RaceSelector.jsx
import React from "react";

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
    <div style={{ textAlign: "center", marginBottom: 16 }}>
      <label style={{ marginRight: 8 }}>Race:</label>
      <select
        value={race}
        onChange={e => onRaceChange(e.target.value)}
        style={{ marginRight: 16 }}
      >
        {AVAILABLE_RACES.map(r => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>

      <label style={{ marginRight: 8 }}>Year:</label>
      <select
        value={year}
        onChange={e => onYearChange(Number(e.target.value))}
      >
        {AVAILABLE_YEARS.map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}