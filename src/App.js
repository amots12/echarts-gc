// src/App.js
import React, { useState , useEffect } from "react";
import RaceSelector from "./components/RaceSelector";
import GcBarChartRace from "./components/GcBarChartRace";
import RaceMap from "./components/RaceMap";
import * as echarts from "echarts";



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

const styles = {
  page: {
    height: "100vh",
    display: "grid",
    gridTemplateRows: "auto auto 1fr",
    overflow: "hidden",
    background: "#f9fafb"
  },

  selector: {
    padding: "12px 24px",
    borderBottom: "1px solid #e5e7eb"
  },

  explanation: {
    padding: "12px 24px",
    borderBottom: "1px solid #e5e7eb"
  },

  explanationBox: {
    fontSize: "14px",
    color: "#374151"
  },

  dashboard: {
    display: "grid",
    gridTemplateColumns: "1.05fr 1.3fr",
    gap: "16px",
    padding: "16px",
    overflow: "hidden",
    minHeight: 0
  },

  mapContainer: {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  },

  chartContainer: {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  }
};

export default function App() {
  const [race, setRace] = useState("tour");
  const [year, setYear] = useState(2021);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/maps/france.geojson`)
      .then(r => r.json())
      .then(geoJson => {
        echarts.registerMap("france", geoJson);
      })
      .catch(err => {
        console.error("Failed to load France map", err);
      });
  }, []);

  const handleRaceChange = newRace => {
    setRace(newRace);

    // When race changes, default to latest available year
    const years = AVAILABLE_RACES[newRace].years;
    if (years.length) {
      setYear(years[years.length - 1]);
    }
  };

  return (
  <div style={styles.page}>
    <div style={styles.selector}>
      <RaceSelector
        race={race}
        year={year}
        races={AVAILABLE_RACES}
        onRaceChange={handleRaceChange}
        onYearChange={setYear}
      />
    </div>

    <div style={styles.explanation}>
  <div style={{
    ...styles.explanationBox,
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.5
  }}>
    <div style={{
      fontSize: "20px",
      fontWeight: 600,
      marginBottom: "6px"
    }}>
      Animate the Race — Replay the GC battle
    </div>

    <div style={{
      fontSize: "14px",
      color: "#4b5563"
    }}>
      Across mountains, time trials, and sprint finishes, the GC battle evolves.
    Bar length reflects time behind the leader; the map marks where each chapter concludes.
    </div>
    </div>
  </div>

    <div style={styles.dashboard}>
      <div style={styles.mapContainer}>
        <RaceMap
          race={race}
          year={year}
          stageIndex={stageIndex}
        />
      </div>

      <div style={styles.chartContainer}>
        <GcBarChartRace
          race={race}
          year={year}
          onStageChange={setStageIndex}
        />
      </div>
    </div>
  </div>
);
}