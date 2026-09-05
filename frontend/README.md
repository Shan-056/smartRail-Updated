# SmartRail Twin — Frontend (Next.js + TypeScript + Tailwind CSS)

Frontend application for the **AI-powered Passenger Digital Twin and Dynamic Transit Advisory System** — Mumbai Suburban Network (Western, Central, Harbour, and Trans-Harbour corridors).

---

## Highlights

- **100% Zero-Dependency Standalone Mode**: Can be handed to any developer and run immediately without installing MongoDB, without running any backend server, and without configuring any `.env` secrets.
- **Interactive Mumbai Network Map**: Complete 102-station Leaflet cartography across all 4 corridors with zoom-aware label decluttering and junction badges.
- **Intelligent Transit Journey Planner**: End-to-end route solver supporting cross-line corridor transfers (e.g., Dadar, Kurla, Wadala Road), departure countdowns, and 12-car coach occupancy diagrams.
- **Live Station Panel & Digital Twin**: Platform arrivals, CCTV crowd breakdown, and 2D/3D platform congestion heatmap.
- **Operations Control Room**: Simulated CCTV feeds, AI-powered transit advisory, crowd risk telemetry, and platform alerts.
- **Light & Dark Mode**: Persistent theme switching with zero layout shift.

---

## Quick Start (Standalone Execution)

```bash
# 1. Navigate into the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Even with zero environment variables configured, the entire Mumbai network map, search, journey planner, station heatmaps, and simulated control room work out of the box!

---

## Connecting to the Separate Backend Server

If you want the frontend to communicate with the standalone backend API server (`/backend` running on port 5000):

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Set the backend URL in `.env.local`:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   ```
3. Restart `npm run dev`. All `/api/*` requests will now automatically proxy to your running backend server!

---

## Project Structure

```
frontend/
├── package.json              # Frontend scripts & dependencies
├── next.config.js            # Next.js config with optional backend proxy
├── tsconfig.json             # TypeScript configuration with @/* aliases
├── tailwind.config.js        # Suburban railway brand color palette
├── postcss.config.js         # PostCSS configuration
├── .env.example              # Environment variables template
├── app/
│   ├── layout.tsx            # Root layout with ThemeProvider & AuthProvider
│   ├── page.tsx              # Main dashboard view
│   ├── globals.css           # Tailwind base styles, Leaflet CSS, scrollbars
│   └── api/                  # Built-in zero-dependency fallback API routes
├── components/
│   ├── MapView.tsx           # Interactive Leaflet Mumbai network map
│   ├── JourneyPlanner.tsx    # Route solver with interchange logic
│   ├── StationPanel.tsx      # Platform arrivals & crowd diagnostics
│   ├── CorridorFilter.tsx    # Line & branch selector pills
│   ├── StationMapModal.tsx   # 2D/3D station platform heatmap visualizer
│   ├── ControlRoomModal.tsx  # CCTV feeds, AI advisory & alarm telemetry
│   ├── LoginModal.tsx        # Authentication modal with demo bypass
│   ├── ThemeToggle.tsx       # Dark / Light mode toggle button
│   └── predictions/          # Prediction cards (Crowd, ETA, Congestion)
└── lib/
    ├── network.ts            # Network types, corridors, and color tokens
    ├── networkFallback.ts    # 102 Mumbai suburban stations dataset & route engine
    ├── ThemeProvider.tsx     # Theme provider
    └── AuthProvider.tsx      # Authentication state management
```

---

## Production Build

```bash
npm run build
npm run start
```
