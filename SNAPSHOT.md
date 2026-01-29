📸 PROJECT SNAPSHOT — echarts-gc
Date: current state after GitHub Actions deployment fix

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 PROJECT PURPOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A public, data-driven web visualization that animates the General Classification
(GC) standings of cycling Grand Tours (starting with Tour de France 2022),
using a bar chart race metaphor.

The visualization shows:
- Top 10 GC riders per stage
- Time gaps to the leader
- Smooth transitions across stages
- Rider elimination (dropping out of top 10)
- Team-based color encoding

Tech focus: clarity, animation quality, and data storytelling.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧱 TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- React (Create React App baseline)
- Apache ECharts via `echarts-for-react`
- Static JSON data (scraped from Wikipedia)
- GitHub Pages for hosting
- GitHub Actions for CI/CD (build + deploy)

No backend, no server-side logic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 KEY FILES (SOURCE OF TRUTH)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- src/components/GcBarChartRace.jsx
  → Core visualization logic (sorting, interpolation, animation, elimination)

- public/data/tour-2022-wikipedia.json
  → Stage-by-stage GC standings data

- src/App.js
  → Minimal app shell rendering the visualization

- package.json
  → Contains correct `homepage` field for GitHub Pages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 DEPLOYMENT STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- GitHub Actions is the official deployment mechanism
- Laptop deployment (`npm run deploy`) is deprecated
- GitHub Pages URL is live and working
- Laptop repo is now synced with GitHub main branch

GitHub is the source of truth.
Local machine is a disposable working copy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CURRENTLY WORKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Visualization renders correctly online
- Sorting: leader at top, gaps ascending downward
- Interpolation between stages is smooth
- Intro animation before Stage 1 works
- Restart / Play / Pause controls work
- Eliminated riders fade/drop out naturally
- Team color mapping works reliably

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ KNOWN LIMITATIONS (ACCEPTED FOR NOW)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Animation polish can be further refined (rank easing, subtle fades)
- UI is functional but not yet design-led
- Only one race/year supported
- No progress bar yet (planned)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧭 AGREED WORKING PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Small, incremental changes
- One concern per commit
- Never mix structural cleanup with logic changes
- Always pull before starting work
- Never force-push
- Trust GitHub Actions for deployment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 NEXT PLANNED STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Add progress indicator (stage timeline / progress bar)
2. Improve UI/UX (handoff to UX designer, Figma-based)
3. Support multiple races and year selection
4. Polish animation easing and visual hierarchy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 STATE OF MIND CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The project is now stable.
The hard infrastructure problems are solved.
Remaining work is incremental, visual, and controllable.

This snapshot marks the end of the “infrastructure pain” phase
and the beginning of focused product refinement.