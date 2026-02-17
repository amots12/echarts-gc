import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

const RACE_MAPS = {
  tour: "france",
  giro: "italy",
  vuelta: "spain"
};

export default function RaceMap({ race, year, stageIndex }) {
  const [stages, setStages] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const mapKey = RACE_MAPS[race];

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

  useEffect(() => {
    if (!mapKey) {
      setMapReady(false);
      return;
    }

    setMapReady(false);

    fetch(`${process.env.PUBLIC_URL}/maps/${mapKey}.geojson`)
      .then(r => {
        if (!r.ok) {
          throw new Error(`Failed to fetch ${mapKey}: ${r.status}`);
        }
        return r.json();
      })
      .then(geoJson => {
        if (!geoJson || geoJson.type !== "FeatureCollection") {
          throw new Error("Invalid GeoJSON structure");
        }

        echarts.registerMap(mapKey, geoJson);
        setMapReady(true);
      })
      .catch(err => {
        console.error("Map load error:", err);
        setMapReady(false);
      });
  }, [mapKey]);

  const stage = stages[stageIndex];

  const trailPoints = stages
  .slice(0, stageIndex)
  .filter(s => s?.finish)
  .map(s => ({
    name: s.finish.town,
    value: [s.finish.lon, s.finish.lat]
  }));

  /* ---------- GUARDS ---------- */
if (
  !mapReady ||
  !stage ||
  !stage.finish ||
  !echarts.getMap(mapKey)
) {
  return <div style={{ height: 360 }} />;
}

  /* ---------- ECHART OPTION ---------- */
  const option = {
    geo: {
      map: mapKey,
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