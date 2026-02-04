# Animate the Race — Grand Tour GC Animation

🔗 **Live Demo:** https://amots12.github.io/echarts-gc

An interactive, animated visualization of **General Classification (GC)** dynamics  
across cycling **Grand Tours** (Tour de France, Giro d’Italia, Vuelta a España).

Users select the race and year edition before playback to explore different editions and races.

---

## 🚴 What You’re Seeing

- The **top 10 riders** in the General Classification  
- **Bar length** = time gap to the race leader  
- **Colors** = teams  
- **Order** = current GC ranking  
- A **clean initial view** before animation begins  

Each frame represents a moment in the race as it unfolds from Stage 1 to the final stage.

---

## 🕹 How to Use

1. Select a **race** (Tour, Giro, Vuelta)  
2. Select a **year edition**  
3. Press ▶ **Play** to start the animation  

Controls:  
- ▶ Play — start the animation  
- ⏸ Pause — stop at any moment  
- ⟲ Restart — replay from the beginning  

A progress bar shows how far along the race you are.

---

## 🎯 Why This Visualization

Cycling GC standings are usually shown as static tables.  
This project explores a different approach:

- Make **race dynamics** easier to understand  
- Show **how gaps change**, not just final results  
- Use animation to support insight, not distract from it  

The focus is clarity, calm motion, and data storytelling.

---

## 🧠 Design Notes

- Motion is intentional and restrained  
- Eliminated riders fade and drop naturally  
- The chart is the main focus — UI stays minimal  
- Inspired by data journalism and sports analytics  
- Clean initial state with no labels until playback  
- Selector-first flow to set context before animation  

---

## 🧪 Data Source

Data is scraped from publicly available **Wikipedia** pages  
and stored as static JSON files per race and year.

---

## 🛠 Built With

- React  
- Apache ECharts  
- Static JSON data  
- No backend — runs entirely in the browser  

---

## 📌 Project Status

- ✔ Core visualization complete  
- ✔ Multi-race / multi-year support  
- ✔ Desktop-focused, responsive-ready  
- 🔜 Planned improvements:  
  - Mobile-first refinements  
  - Additional races and editions  
  - Map-based stage context  

---

## 👀 Explore

Press **Play** and let the race tell its story.
