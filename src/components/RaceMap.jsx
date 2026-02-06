import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

export default function RaceMap({ race, year, stageIndex }) {
  const [stages, setStages] = useState([]);
  const [mapReady, setMapReady] = useState(false);

  /* ---------- LOAD STAGE METADATA ---------- */
  useEffect(() => {
    setStages([]);

    fetch(
      `${process.env.PUBLIC_URL}/data/stages/${race}-${year}-stages.json`
    )
      .then(r => r.json())
      .then(d => setStages(d.stages))
      .catch(() => setStages([]));
  }, [race, year]);

  /* ---------- LOAD + REGISTER MAP ---------- */
  useEffect(() => {
    setMapReady(false);

    fetch(`${process.env.PUBLIC_URL}/maps/france.geojson`)
      .then(r => r.json())
      .then(geoJson => {
        echarts.registerMap("france", geoJson);
        setMapReady(true);
      })
      .catch(err => {
        console.error("Failed to load France map", err);
        setMapReady(false);
      });
  }, []);

  const stage = stages[stageIndex];

  const trailPoints = stages
  .slice(0, stageIndex)
  .filter(s => s?.finish)
  .map(s => ({
    name: s.finish.town,
    value: [s.finish.lon, s.finish.lat]
  }));

  /* ---------- GUARDS ---------- */
  if (!mapReady || !stage) {
    return <div style={{ height: 360 }} />;
  }

  /* ---------- ECHART OPTION ---------- */
  const option = {
    geo: {
      map: "france",
      roam: false,
      zoom: 1.1,
      itemStyle: {
        areaColor: "#f3f4f6",
        borderColor: "#9ca3af"
      },
      emphasis: {
        itemStyle: {
          areaColor: "#e5e7eb"
        }
      }
    },
    series: [
        // Fading trail (previous stages)
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: trailPoints,
          symbolSize: 6,
          itemStyle: {
            color: "rgba(239,68,68,0.35)"
          },
          silent: true
        },
      
        // Pulsing current stage
        {
          type: "effectScatter",
          coordinateSystem: "geo",
          data: [
            {
              name: stage.finish.town,
              value: [stage.finish.lon, stage.finish.lat]
            }
          ],
          symbolSize: 14,
          rippleEffect: {
            period: 3,
            scale: 3,
            brushType: "stroke"
          },
          itemStyle: {
            color: "#ef4444"
          }
        }
      ]
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 360, width: "100%" }}
      notMerge
      lazyUpdate
    />
  );
}