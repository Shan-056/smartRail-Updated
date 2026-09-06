# SmartRail Twin — Frontend Workspace

Frontend application for the **AI-powered Passenger Digital Twin and Dynamic Transit Advisory System** — Mumbai Suburban Network (Western, Central, Harbour, and Trans-Harbour corridors).

---

## Highlights

- **100% Zero-Dependency Standalone Execution**: Run immediately without MongoDB, without running any external backend server, and without configuring any `.env` secrets.
- **Interactive Mumbai Network Map**: 102-station Leaflet cartography across all 4 corridors with zoom-aware decluttering, line filters, and junction badges.
- **Suburban Journey Planner**: End-to-end multi-corridor route solver supporting transfers (e.g., Dadar, Kurla, Wadala Road), departure countdowns, and 12-car coach occupancy diagrams.
- **Station Panel & PredictionsView**:
  - **Crowd Prediction**: Real-time crowd percentage with **15-Minute AI Digital Twin Forecast**.
  - **Live Train ETA**: Real-time approaching services with platform countdowns.
  - **Congestion Card**: Surge prediction and dynamic advisory.
  - Interactive toggle-to-close accordions.
- **Operations Control Room**: Simulated CCTV feeds, AI-powered transit advisory, platform alerts, and manual operator overrides.
- **Light & Dark Mode**: Persistent theme switching with zero layout shift.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> All simulated trains, live platform crowds, 15-minute predictive digital twin forecasts, station alerts, and journey planner work out of the box with zero external configuration!

---

## Connecting to an External Backend Server (Optional)

If you wish to proxy `/api/*` requests to an external backend server:

1. Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   ```
2. Restart `npm run dev`. Requests to `/api/*` will now proxy to your running backend server.
