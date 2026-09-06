# SmartRail Twin — Mumbai Suburban Railway Passenger Digital Twin

An AI-powered Passenger Digital Twin, Dynamic Transit Advisory, and Predictive Crowd Congestion Management System for the Mumbai Suburban Railway Network (Western, Central, Harbour, and Trans-Harbour corridors).

---

## 🚀 Quick Start (Run Locally in 2 Steps)

The project is **100% standalone and zero-config out of the box**. It includes an integrated **Digital Twin simulation engine** with 102 Mumbai suburban stations, live simulated train GPS movements, dynamic platform arrivals, and predictive ML/AI crowd analytics. You do **not** need MongoDB, external databases, or API keys to run and explore the complete application.

### Option 1: Run from the Root Directory (Recommended)

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Run from the `frontend/` Directory

If you prefer running inside the `frontend/` subdirectory:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌟 Key Features & Architectural Highlights

1. **Interactive Mumbai Network Cartography**:
   - High-fidelity Leaflet map visualizing 102 stations across all 4 corridors (Western, Central, Harbour, Trans-Harbour).
   - Dynamic zoom-aware decluttering, junction interchanges (Dadar, Kurla, Wadala Road), and corridor filters.
   - Live simulated train markers with real-time speed, direction, and GPS interpolation.

2. **Suburban Journey Planner**:
   - End-to-end multi-line route calculation with intelligent interchange detection.
   - Clean floating panel aligned with station views, high-contrast inputs, fast reset, and quick station picker.
   - Departure countdowns and 12-car coach layout occupancy diagnostics.

3. **Station Detail Panel & Digital Twin Predictions**:
   - **Live Influx & Capacity**: Real-time sensor-simulated passenger density, platform capacity breakdown, and active station alert banners.
   - **Dedicated Predictions System**:
     - **Crowd Prediction**: Current platform density + **15-Minute AI Digital Twin Forecast** (simulating future rake arrivals, FOB stair pressure, and crowd influx).
     - **Live Train ETA**: Real-time approaching services with destination, platform number, and countdown.
     - **Congestion & Surge Risk**: Predictive surge assessment and actionable crowd-mitigation advisory.
   - Interactive accordion cards with smooth toggle-to-close behavior.

4. **Operations Control Room**:
   - Multi-camera simulated CCTV feeds across critical vestibules and FOBs.
   - AI-powered executive operational advisory (natural language operational directives).
   - Real-time station alarm management and manual operator crowd-level overrides.

5. **Theme Support**:
   - Seamless dark mode and high-contrast light mode with zero layout shift.

---

## 🛠️ Optional Configuration (Production / Live Backend)

If you wish to connect a live MongoDB instance or Google OAuth:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Configure your environment variables:
   ```env
   # Database (Optional - defaults to memory simulation if omitted)
   MONGO_URI=mongodb://localhost:27017/smartrail

   # Gemini API Key (Optional - deterministic rule-based fallback active by default)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Authentication Secrets
   JWT_SECRET=your_jwt_secret_key
   ```

3. To seed initial station and schedule data into MongoDB (optional):
   ```bash
   npm run seed
   ```

---

## 📁 Repository Structure

```
.
├── app/                      # Next.js App Router (pages, layout, API routes)
│   ├── api/                  # Full-stack API routes with auto-fallback
│   │   ├── alerts/           # Incident & maintenance alerts API
│   │   ├── crowd/            # Real-time crowd sensor endpoints
│   │   ├── predict/          # AI predictions (crowd, ETA, congestion)
│   │   ├── stations/         # Station metadata & search
│   │   └── trains/           # Train GPS & schedule tracking
│   ├── page.tsx              # Main dashboard view
│   └── layout.tsx            # Root layout
├── components/               # React UI Components
│   ├── JourneyPlanner.tsx    # Suburban Journey Planner
│   ├── StationPanel.tsx      # Station Detail & Prediction view
│   ├── MapView.tsx           # Leaflet Mumbai network map
│   ├── CorridorFilter.tsx    # Line filter pills
│   ├── ControlRoomModal.tsx  # OCC Control Room & CCTV
│   └── predictions/          # Prediction cards (Crowd, ETA, Congestion)
├── lib/                      # Core simulation & helper utilities
│   ├── simulatedDigitalTwin.ts # Standalone Digital Twin simulation engine
│   ├── network.ts            # Line models, types & color definitions
│   └── networkFallback.ts    # 102 Mumbai suburban station dataset
├── models/                   # Mongoose data schemas (Station, Train, CrowdLog)
├── services/                 # Analytics, digital twin & override services
└── frontend/                 # Self-contained frontend workspace
```

---

## 🧪 Build & Verification

```bash
# Verify typecheck & production build
npm run build

# Run linter
npm run lint
```
