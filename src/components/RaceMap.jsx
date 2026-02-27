import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const RACE_MAPS = {
  tour: "france",
  giro: "italy",
  vuelta: "spain"
};

export default function RaceMap({ race, year, stageIndex, mobileBackground = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
  return <div style={{ height: "100%", minHeight: 0 }} />;
}

  /* ---------- ECHART OPTION ---------- */
  const option = {
    geo: {
      map: mapKey,
      roam: false,
      zoom: 1.1,
      itemStyle: {
        areaColor: mobileBackground ? "#FFFFFF" : "#F5F5F5",
        borderColor: mobileBackground ? "#D1D1D1" : "#E0E0E0",
        borderWidth: mobileBackground ? 1.1 : 1
      },
      emphasis: {
        itemStyle: {
          areaColor: mobileBackground ? "#FFFFFF" : "#F5F5F5"
        }
      }
    },
    series: [
        // Fading trail (previous stages)
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: trailPoints,
          symbolSize: mobileBackground ? 8 : 6,
          itemStyle: {
            color: mobileBackground ? "rgba(255,0,0,0.45)" : "rgba(239,68,68,0.35)"
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
          symbolSize: mobileBackground ? 18 : 14,
          rippleEffect: {
            period: 3,
            scale: mobileBackground ? 3.8 : 3,
            brushType: "stroke"
          },
          itemStyle: {
            color: mobileBackground ? "#FF0000" : "#ef4444"
          },
          silent: isMobile
        }
      ]
  };

  return (
    <div style={{ height: "100%", minHeight: 0, pointerEvents: isMobile ? "none" : "auto" }}>
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
