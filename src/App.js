// src/App.js
import React, { useState } from "react";
import RaceSelector from "./components/RaceSelector";
import GcBarChartRace from "./components/GcBarChartRace";

/**
 * Available races and years.
 * This should mirror the files available in /public/data
 */
const AVAILABLE_RACES = {
  tour: {
    label: "Tour de France",
    years: [2020, 2021, 2022, 2023, 2024, 2025]
  },
  giro: {
    label: "Giro d’Italia",
    years: [2020, 2021, 2022, 2023, 2024, 2025]
  },
  vuelta: {
    label: "Vuelta a España",
    years: [] // ready for future data
  }
};

export default function App() {
  const [race, setRace] = useState("tour");
  const [year, setYear] = useState(2023);

  const handleRaceChange = newRace => {
    setRace(newRace);

    // When race changes, default to latest available year
    const years = AVAILABLE_RACES[newRace].years;
    if (years.length) {
      setYear(years[years.length - 1]);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <RaceSelector
        race={race}
        year={year}
        races={AVAILABLE_RACES}
        onRaceChange={handleRaceChange}
        onYearChange={setYear}
      />

      <GcBarChartRace race={race} year={year} />
    </div>
  );
}