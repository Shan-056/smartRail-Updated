# SmartRail Twin — Backend (TypeScript / Next.js)

Backend for the **AI-powered Passenger Digital Twin and Dynamic ETA Engine**
— Mumbai Suburban Network. Rebuilt on **TypeScript + Next.js API Routes +
MongoDB (Mongoose) + JWT + Socket.IO**, per the team's updated tech stack.

> Note: per team instructions, this README is **not** replacing the one in
> the GitHub repo yet — this file documents the `backend/` folder for now.

## What changed vs. the earlier plain-Express version

The previous version (plain Node.js + Express + JavaScript) is fully
superseded by this one. Everything is rebuilt to match the leader's spec:

| Area | What's new |
|---|---|
| Language | JavaScript → **TypeScript** everywhere, with typed Mongoose models |
| Routing | Express `routes/` files → **Next.js App Router** (`app/api/*/route.ts`, one file per endpoint) |
| DB connection | Plain `mongoose.connect()` → **`lib/mongodb.ts`**, a connection-caching pattern required by Next.js so hot-reloads don't open duplicate connections |
| Auth | Express middleware chain → **`middleware/auth.ts`** helper functions (`requireAuth`, `requireRole`) called at the top of each route, matching how Next.js API routes work |
| AI integration | **New** — `services/aiEngine.ts` talks to a separate FastAPI AI/ML engine for smarter crowd/ETA predictions |
| Analytics | `services/analyticsEngine.ts` now **tries the AI engine first**, and automatically falls back to the original built-in math (CCTV+ticket blending, distance÷speed) if the AI engine isn't reachable yet |
| Real-time | Socket.IO logic itself is unchanged in spirit, but now lives in `websocket/socketServer.ts` and is wired up via a custom `server.ts`, since Next.js API routes can't hold a WebSocket connection open on their own |
| Validation | Ingestion routes now do explicit type/range checks (e.g. `peopleCount` must be a non-negative number) before writing to the database |

### Latest additions (GTFS, Digital Twin, Heatmap)

| Area | What's new |
|---|---|
| GTFS import | **New** — `POST /api/gtfs` + `services/gtfsImport.ts`: bulk-imports a standard GTFS timetable feed (stops/routes/trips/stop_times CSV text) into Station and Route records, so timetables don't need to be hand-typed |
| Digital Twin | **New** — `services/digitalTwin.ts`: a dedicated live "current state" per station (occupancy, inflow, outflow), backed by a new `StationState` collection (one row per station, always overwritten — not a history log like `CrowdLog`). Every crowd recalculation now also updates this twin |
| Heatmap | **New** — `GET /api/heatmap`: returns `{ stationId, name, code, lat, lng, intensity }` per station for the frontend's Leaflet map, reading from the digital twin rather than the full `CrowdLog` detail |

All 9 MongoDB collections, all endpoint paths, and all response shapes are
unchanged — so nothing about how the frontend calls this API is any
different, only how the backend is internally built.

## Project structure

```
backend/
├── server.ts                 # Custom entry point (Next.js + Socket.IO together)
├── next.config.js
├── tsconfig.json
├── .env.example               # Copy to .env and fill in real values
├── app/
│   ├── layout.tsx / page.tsx  # Minimal required Next.js shell (not a real UI)
│   └── api/
│       ├── auth/{login,logout,me}/route.ts
│       ├── cctv/route.ts
│       ├── atvm/route.ts
│       ├── uts/route.ts
│       ├── gps/route.ts
│       ├── stations/route.ts
│       ├── trains/route.ts
│       ├── crowd/route.ts
│       ├── eta/route.ts
│       ├── recommendations/route.ts
│       ├── heatmap/route.ts
│       ├── gtfs/route.ts
│       └── health/route.ts
├── models/                    # One typed Mongoose schema per collection
│   └── StationState.ts         # Backs the digital twin's live per-station state
├── lib/
│   ├── mongodb.ts              # Connection-caching DB helper
│   └── generateToken.ts        # JWT cookie helper
├── middleware/auth.ts          # requireAuth / requireRole helpers
├── services/
│   ├── aiEngine.ts              # Talks to the FastAPI AI engine (placeholder URL for now)
│   ├── analyticsEngine.ts       # Crowd/ETA calculation — AI-first, math fallback
│   ├── digitalTwin.ts           # Live per-station state (occupancy/inflow/outflow)
│   └── gtfsImport.ts            # Parses GTFS CSV feeds into Station/Route records
├── websocket/socketServer.ts   # Socket.IO broadcast loop
└── scripts/seed.ts             # Test data generator (npm run seed)
```

Every file has a plain-English comment block at the top explaining its
purpose, and every function has a comment above it — written so teammates
who aren't backend specialists can follow along.

## Setup

```bash
cd backend
npm install
cp .env.example .env      # then edit .env with real values
npm run seed                # optional: creates test stations/train/accounts
npm run dev                  # starts the server (custom server.ts, not "next dev")
```

Requires a running MongoDB instance (local `mongod`, or MongoDB Atlas free tier).

Seeded test accounts (after `npm run seed`):
| username | password | role |
|---|---|---|
| admin | admin123 | admin |
| device01 | device123 | device |

## Why `npm run dev` doesn't run plain `next dev`

Because this project needs a long-lived WebSocket connection for live
updates, and Next.js's built-in dev/start commands don't expose a way to
attach Socket.IO to the same server. `server.ts` manually creates one HTTP
server that hands normal requests to Next.js and WebSocket connections to
Socket.IO — this is the standard documented pattern for combining the two.

## AI engine integration status

`services/aiEngine.ts` is the **only** file that talks to the FastAPI AI
engine. It currently points at a placeholder `AI_ENGINE_URL`
(`http://localhost:8000`) and is built to **fail safely**: if the AI engine
isn't running or doesn't respond within 3 seconds, `analyticsEngine.ts`
automatically falls back to the original built-in calculations, so the
whole backend keeps working end-to-end even before the ML teammate's engine
exists. Every `CrowdLog`/`EtaLog` record has an `aiAssisted: boolean` field
so you can always tell which prediction source was actually used.

**Once the ML teammate shares real details** (the FastAPI URL and its
request/response format), only `services/aiEngine.ts` needs updating — the
request/response interfaces (`CrowdPredictionRequest`, `EtaPredictionResponse`,
etc.) at the top of that file are the place to adjust field names.

## API reference

Same core endpoints as before — see the project structure above. Auth uses
an HTTP-only JWT cookie (`credentials: "include"` on frontend fetch calls).
WebSocket clients connect to the same host/port with `path: "/api/socket"`
and listen for the `network:update` event, broadcast every
`BROADCAST_INTERVAL_MS` (default 5s).

### New: GET /api/heatmap
Requires login (any role). Returns one entry per station:
```json
{ "count": 4, "points": [
  { "stationId": "...", "name": "Bandra", "code": "BA", "lat": 19.0596, "lng": 72.8295, "intensity": 0.42 }
] }
```
`intensity` is a 0–1 value (occupancy ÷ capacity, capped at 1) — feed this
straight into a Leaflet heatmap layer.

### New: POST /api/gtfs
Requires an **admin** login. Body:
```json
{
  "line": "Western",
  "stopsCsv": "stop_id,stop_name,stop_lat,stop_lon\n...",
  "routesCsv": "route_id,route_long_name\n...",
  "tripsCsv": "trip_id,route_id\n...",
  "stopTimesCsv": "trip_id,stop_id,stop_sequence,arrival_time,departure_time\n..."
}
```
Each `*Csv` field is the raw text content of the matching standard GTFS
file. Creates/updates Station and Route records in bulk. Returns a summary
(`stationsCreated`, `routesUpdated`, etc.) plus any `warnings` for rows that
had to be skipped (e.g. a stop referenced before it was defined).

## Digital Twin (live station state)

`services/digitalTwin.ts` keeps one **current** state per station —
occupancy, inflow (people arrived since the last update), and outflow
(people left since the last update) — separate from `CrowdLog`, which keeps
a full history of every past calculation. The twin is updated automatically
every time `analyticsEngine.ts` recalculates a station's crowd level, is
kept in a fast in-memory cache for quick reads, and is also mirrored to the
new `StationState` collection so it survives a server restart (the server
"warm-starts" the cache from there on boot). `/api/heatmap` reads from this
twin rather than scanning raw logs each time.

## MongoDB collections

`stations`, `trains`, `routes`, `cctv_events`, `atvm_logs`, `uts_logs`,
`gps_logs`, `crowd_logs`, `eta_logs`, `stationstates` (digital twin live
state), plus `users` for authentication.
