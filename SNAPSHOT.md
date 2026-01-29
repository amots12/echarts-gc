Absolutely — pausing here is a good call. You’ve reached a stable, meaningful checkpoint.

Below is a snapshot + README, written so another engineer (or future you) can pick this up without re-living the chaos.

⸻


# Tour de France GC Bar Chart Race (ECharts + React)

## 📌 Project Snapshot (Current State)

This project visualises the evolution of the **General Classification (GC)** during the **2022 Tour de France** using an animated horizontal bar chart race.

The visualisation shows:
- Top 10 riders per stage
- Time gaps relative to the GC leader
- Smooth transitions between stages
- Gradual elimination (fade + drop) of riders leaving the top 10
- Team-based colour encoding
- Intro animation before Stage 1

The project is currently **stable**, **readable**, and suitable for further incremental refinement.

---

## 🎯 Goals

- Animate GC standings stage by stage
- Clearly communicate:
  - rank changes
  - time gaps
  - eliminations
- Avoid over-engineering (no custom renderers, no canvas hacks)
- Keep logic explicit and debuggable

---

## 🧱 Tech Stack

- **React** (functional components, hooks)
- **Apache ECharts** via `echarts-for-react`
- Plain JSON data (scraped from Wikipedia)
- No backend required

---

## 📂 Key Files

src/
└── components/
└── GcBarChartRace.jsx   # Main visualization component

public/
└── data/
└── tour-2022-wikipedia.json

---

## 📊 Data Format

The JSON file must follow this structure:

```json
{
  "stages": [
    {
      "stage": 1,
      "riders": [
        {
          "rank": 1,
          "name": "Yves Lampaert",
          "team": "Quick-Step Alpha Vinyl Team",
          "time": "15' 17\""
        }
      ]
    }
  ]
}

Important assumptions:
	•	rank === 1 is always the GC leader
	•	time for non-leaders represents gap to leader
	•	Only the top 10 riders per stage are used

⸻

▶️ How the Animation Works

Time Model
	•	The animation is driven by a tick counter
	•	Each stage transition is split into multiple frames (FRAMES)
	•	A short intro phase (INTRO_FRAMES) builds the first stage from zero

Interpolation
	•	Gaps are interpolated linearly between stages
	•	Riders missing in the next stage are treated as eliminated:
	•	their gap increases slowly
	•	their opacity fades to 0
	•	they drop naturally down the ranking

Sorting
	•	Riders are sorted explicitly by gap (ascending)
	•	ECharts is not allowed to auto-sort (realtimeSort is intentionally avoided)
	•	Category order is fully controlled by React

⸻

🎨 Visual Encoding
	•	Bar length → time gap to GC leader (seconds)
	•	Bar colour → team
	•	Opacity → elimination state
	•	Labels:
	•	Bars show rider name + formatted gap
	•	Y-axis shows team names
	•	Shadows:
	•	Soft shadow for depth
	•	Reduced blur and opacity for calm appearance

⸻

🧩 Controls
	•	▶ Play — start animation
	•	⏸ Pause — pause animation
	•	⟲ Restart — replay from intro

⸻

🚧 Known Limitations / Future Work
	•	Rank-based easing (leaders move faster than dropped riders)
	•	Numeric tweening for gap labels (currently frame-based)
	•	Background banding or grid for readability
	•	Mobile responsiveness
	•	Additional races / years

These are intentionally postponed to keep the current version stable.

⸻

🚀 Running Locally

npm install
npm start

Ensure the JSON file is available at:

public/data/tour-2022-wikipedia.json


⸻

🧠 Design Philosophy

This code favors:
	•	clarity over cleverness
	•	explicit state over magic
	•	incremental visual refinement

The project previously suffered from overusing ECharts “bar race” features.
The current version intentionally avoids those in favor of predictable behavior.

⸻

✅ Status

🟢 Stable
🟡 Visually good (polish possible)
🟢 Ready for handoff or extension

⸻

Last updated: pause point after implementing elimination fading and palette softening.

---

If/when you come back:
- you have a **solid baseline**
- nothing urgent is broken
- future changes can be made calmly and incrementally

Good call stopping here 👏