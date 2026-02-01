// src/App.js
import React, { useState } from "react";
import RaceSelector from "./components/RaceSelector";
import GcBarChartRace from "./components/GcBarChartRace";

export default function App() {
  const [race, setRace] = useState("tour");
  const [year, setYear] = useState(2023);

  return (
    <div style={{ padding: 16 }}>
      <RaceSelector
        race={race}
        year={year}
        onRaceChange={setRace}
        onYearChange={setYear}
      />

      <GcBarChartRace race={race} year={year} />
    </div>
  );
}