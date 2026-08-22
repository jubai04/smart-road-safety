# Smart Road Safety

A driver safety monitoring web application that detects road environments, monitors driver behaviour in real time, provides voice-based warnings, and calculates safety scores.

## Features

- Real-time driver monitoring dashboard with speed, distance, and safety metrics
- Live map powered by Leaflet and OpenStreetMap
- Detection of schools, hospitals, construction zones, and accidents via the Overpass API
- Voice warnings for nearby hazards using the Web Speech API
- Collision intelligence with time-to-collision calculations
- Driver safety scoring system
- Firebase authentication (email/password and Google sign-in)
- Public road-safety issue reporting with photo uploads
- Session-based monthly safety reports

## Tech Stack

| Layer | Tools |
|-------|-------|
| Frontend | React 19, Vite 8, React Router 7, Leaflet, Firebase |
| Backend | Node.js, Express 5, SQLite (better-sqlite3), Multer |
| Linting | Oxlint |
| Deployment | Vercel (frontend), Node server (reporting API) |

## Project Structure

```
.
├── src/
│   ├── App.jsx              # Main application
│   ├── components/           # Navbar, AuthModal, Footer
│   ├── pages/               # Home, Dashboard, Reports, ReportIssue, Help
│   ├── context/             # AppContext (global state)
│   └── firebase.js          # Firebase configuration
├── reporting-api/
│   ├── server.js            # Express API server
│   ├── data/                # SQLite database
│   └── uploads/             # Uploaded report images
├── public/                  # Static assets
└── index.html
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Frontend

```bash
npm install
cp .env.example .env       # fill in Firebase credentials
npm run dev
```

The development server runs at `http://localhost:5173`.

### Reporting API

```bash
cd reporting-api
npm install
cp .env.example .env       # configure origins and port
npm run dev
```

The API server runs at `http://localhost:4000`.

## Environment Variables

### Frontend (`.env`)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_REPORTS_API_URL` | Reporting API URL (default: `http://localhost:4000/api/reports`) |

### Reporting API (`reporting-api/.env`)

| Variable | Description |
|----------|-------------|
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated) |
| `PUBLIC_BASE_URL` | Public URL of the API |
| `PORT` | Server port (default: `4000`) |

## Scripts

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview production build |

### Reporting API

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with auto-reload |
| `npm start` | Production start |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/reports` | List all reports |
| `POST` | `/api/reports` | Submit a report (multipart form) |

Report submissions are rate-limited to 10 requests per 15 minutes per IP.

## License

This project is private and not currently licensed for public use.
