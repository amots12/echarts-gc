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
    <div style={{ padding: 16 }}>
      <RaceSelector
        race={race}
        year={year}
        races={AVAILABLE_RACES}
        onRaceChange={handleRaceChange}
        onYearChange={setYear}
      />
      <RaceMap
        race={race}
        year={year}
        stageIndex={stageIndex}
      />

      <GcBarChartRace race={race} year={year} onStageChange={setStageIndex}/>

    </div>
  );
}