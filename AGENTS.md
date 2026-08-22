# AGENTS.md — Smart Road Safety

## Project Overview

**Smart Road Safety** is a React-based web application that provides intelligent driver safety monitoring. It detects road environments (schools, hospitals, construction zones, accidents), monitors driver behaviour, provides real-time voice warnings, and calculates safety scores. The project also includes a small Express reporting API for submitting public road-safety reports.

- **Name:** smart-road-safety
- **Type:** Full-stack web application (React frontend + Node.js API)
- **Status:** Prototype

---

## Tech Stack

### Frontend
- **Framework:** React 19.2 (with StrictMode)
- **Build Tool:** Vite 8.2 with `@vitejs/plugin-react` and Babel (React Compiler enabled via `babel-plugin-react-compiler`)
- **Linting:** Oxlint 1.75 (config at `.oxlintrc.json`, plugins: `react`, `oxc`)
- **Styling:** Plain CSS (no utility framework — see `src/App.css` and `src/index.css`)
- **Mapping:** Leaflet 1.9 + React-Leaflet 5 (OpenStreetMap tiles)
- **Authentication:** Firebase 12.18 (Email/Password + Google Sign-In via `firebase/auth`)
- **Map Data Source:** Overpass API (OpenStreetMap) for real-world places
- **Voice:** Web Speech API (`window.speechSynthesis`) for safety warnings
- **Language:** JavaScript (JSX) — no TypeScript

### Backend (Reporting API)
- **Runtime:** Node.js (ES modules)
- **Framework:** Express 5.1
- **Database:** SQLite via `better-sqlite3` (WAL mode)
- **File Uploads:** Multer 2 (JPG, PNG, WebP; 10 MB limit)
- **Security:** Helmet 8, CORS, express-rate-limit (10 requests / 15 min)
- **Config:** dotenv

---

## Directory Structure

```
.
├── src/
│   ├── main.jsx              # Entry point, renders <App /> into #root
│   ├── App.jsx               # Main application (all UI + logic in one file)
│   ├── App.css               # Primary stylesheet (navbar, hero, dashboard, road, responsive)
│   ├── index.css             # Global/reset styles (CSS variables, dark mode)
│   ├── firebase.js           # Firebase initialization (config from VITE_ env vars)
│   └── assets/
│       ├── hero.png
│       ├── vite.svg
│       └── react.svg
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── reporting-api/
│   ├── server.js             # Express server (reports endpoint, SQLite, uploads)
│   ├── package.json
│   ├── README.md
│   ├── .env.example
│   └── .gitignore
├── package.json
├── vite.config.js
├── index.html
├── .oxlintrc.json
├── .gitignore
└── .env                      # Vite env vars (gitignored)
```

---

## Commands

### Frontend
```bash
npm run dev        # Start Vite dev server (HMR)
npm run build      # Production build
npm run lint       # Run Oxlint
npm run preview    # Preview production build
```

### Reporting API
```bash
cd reporting-api
npm install
npm run dev        # Start Express with --watch (auto-reload on changes)
npm start          # Production start
```

---

## Environment Variables

### Frontend (`.env` at project root)
Required Vite-prefixed Firebase config:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

> The app gracefully degrades if Firebase env vars are missing (`firebaseIsConfigured` flag in `src/firebase.js`).

### Reporting API (`reporting-api/.env`)
- `CLIENT_ORIGIN` — Comma-separated allowed CORS origins (default: `http://localhost:5173`)
- `PUBLIC_BASE_URL` — Public URL of the API (used in photo URLs)
- `PORT` — Server port (default: `4000`)

---

## Architecture & Key Concepts

### Single-File Application
All application logic lives in **`src/App.jsx`** (~4,667 lines). There are no component files, hooks, or utilities split into separate modules. Key systems are organized into clearly labeled comment blocks:

1. **Map Icons** — Custom Leaflet `divIcon` markers (driver, school, hospital, construction)
2. **Map Auto-Center** — React-Leaflet `useMap` hook to recenter on driver position
3. **Distance & Bearing** — Haversine distance and bearing calculations
4. **Voice System** — Queued speech synthesis with priority (critical > normal), deduplication, and rate limiting
5. **Road Event Generation** — Simulated road zones (school, hospital, construction, accident) spawned at random intervals (18–30s)
6. **Vehicle Generation** — Simulated traffic vehicles (SUV, Taxi, Van, Car, Sports Car) with random speeds
7. **Vehicle/Zone Movement** — `requestAnimationFrame` loops that move vehicles and zones toward the driver based on relative speed
8. **Real Map Integration** — Overpass API queries for schools, hospitals, construction within 3 km of driver
9. **Map Voice Warnings** — Spoken alerts for real-world places within 300 m, filtered by a 120° forward cone (bearing check)
10. **Safety Score** — Starts at 100; safe responses +2, violations −8
11. **Collision Intelligence** — Time-to-collision (TTC) calculation from closing speed
12. **Auth System** — Firebase Email/Password + Google Sign-In modal
13. **Report Submission** — Public road-safety report form (POSTs multipart/form-data to reporting API)
14. **Monthly Report** — Session summary with score, violations, safe responses, and fine assessment

### Reporting API
- `POST /api/reports` — Submit a report (issue type, location, description, optional photo, optional GPS coordinates)
- `GET /health` — Health check endpoint
- Data stored in SQLite at `reporting-api/data/reports.db`
- Uploaded images stored in `reporting-api/uploads/`
- Rate limited: 10 reports per 15 minutes per IP
- Issue types: Pothole, Broken traffic light, Accident, Road damage, Other safety concern

### UI Sections (page anchors)
- `#home` — Hero
- `#problem` — The Problem
- `#solution` — Our Solution (3 feature cards)
- `#dashboard` — Driver Safety Dashboard (stats, control panel, live map, road view)
- `#map` — Live Road Intelligence Map (Leaflet + Overpass)
- `#history` — Event History
- `#report` — Monthly Safety Report
- `#help` — Help Centre (FAQ accordion)
- `#complaints` — Public Road Reporting form

### Default Map Position
When user location is unavailable, the map defaults to **Kolkata, India** (`22.5726, 88.3639`).

---

## Design Conventions

- **Dark theme** with radial gradient background (`#090b12`)
- **Purple accent** (`#7c5cff` / `#8b6cff`) for primary buttons and highlights
- **Color coding:** safe = green (`#43d89b`), warning = yellow (`#ffd65c`), danger = red (`#ff5368`)
- **Responsive:** Grid layouts collapse at 900px and 600px breakpoints
- **Sticky navbar** with backdrop blur
- All inline styles for the auth modal and report form (no CSS classes for those)
- No component library — all custom CSS

---

## Code Style & Conventions

- ES modules (`"type": "module"` in both package.json files)
- No TypeScript (plain JSX)
- Functional components only (single `App` function component)
- Hooks: `useState`, `useEffect`, `useRef` from React
- No state management library (local state only)
- Refs used for: animation frame IDs, speech queue, debounce timers, deduplication sets
- `useRef` + manual sync pattern for values needed in animation loops (e.g., `speedRef`)
- Event history capped at 20 entries
- Leaflet markers use `L.divIcon` with emoji-based icons (no image files)
- Oxlint rules: `react/rules-of-hooks` (error), `react/only-export-components` (warn)

---

## Known Limitations

- All logic in a single ~4,600-line file; no component decomposition
- No TypeScript, no unit tests, no integration tests
- Reporting API uses local SQLite and filesystem uploads (not production-ready)
- The `REPORTS_API_URL` in `App.jsx` is hardcoded to `http://localhost:4000/api/reports`
- Firebase is optional; app works without it (auth features silently unavailable)
- Voice warnings use browser Web Speech API (not supported in all browsers)
- Simulated road events are random — no real traffic data integration yet
