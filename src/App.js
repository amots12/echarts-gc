// src/App.js
import React, { useState } from "react";
import RaceSelector from "./components/RaceSelector";
import GcBarChartRace from "./components/GcBarChartRace";
import RaceMap from "./components/RaceMap";

/**
 * Must mirror /public/data files
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
    years: []
  }
};

const styles = {
  page: {
    height: "100vh",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    background: "#FDFDFB",
    overflow: "hidden"
  },

  mastheadWrap: {
    padding: "18px 24px 8px 24px"
  },

  mastheadCard: {
    padding: "4px 0"
  },

  dashboard: {
    display: "grid",
    gridTemplateColumns: "3.5fr 8.5fr",
    gap: 28,
    padding: "8px 24px 20px 24px",
    overflow: "hidden",
    minHeight: 0
  },

  card: {
    background: "transparent",
    overflow: "hidden",
    minHeight: 0,
    display: "flex",
    flexDirection: "column"
  }
};

export default function App() {
  const [race, setRace] = useState("tour");
  const [year, setYear] = useState(2022);
  const [stageIndex, setStageIndex] = useState(0);

  const handleRaceChange = (newRace) => {
    setRace(newRace);

    const years = AVAILABLE_RACES[newRace]?.years || [];
    if (years.length) setYear(years[years.length - 1]);
  };

  return (
    <div style={styles.page}>
      {/* Masthead */}
      <div style={styles.mastheadWrap}>
        <div style={styles.mastheadCard}>
          <RaceSelector
            race={race}
            year={year}
            races={AVAILABLE_RACES}
            onRaceChange={handleRaceChange}
            onYearChange={setYear}
          />
        </div>
      </div>

      {/* Dashboard */}
      <div style={styles.dashboard}>
        <div style={styles.card}>
          <RaceMap race={race} year={year} stageIndex={stageIndex} />
        </div>

        <div style={styles.card}>
          <GcBarChartRace race={race} year={year} onStageChange={setStageIndex} />
        </div>
      </div>
    </div>
  );
}
