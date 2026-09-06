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

4. **Operations Control Room (OCC) & Edge Camera Feeds**:
   - Multi-camera CCTV feeds across critical suburban vestibules and FOBs.
   - **CCTV Demo: Phone as Station Camera (Showcase)**: Stream live video from any mobile device or webcam into station feeds.
   - Role-Based Access Control (Admin, Operator, and Passenger).
   - AI-powered executive operational advisory (natural language operational directives).
   - Real-time station alarm management and manual operator crowd-level overrides.

5. **Instant Role Switching & Authentication**:
   - Role-aware JWT tokens (`role`, `username`, `email`) and persistent session management.
   - Fast demo role switcher in both the main navigation bar and OCC modal header for testing Admin, Operator, and Passenger views.
   - Instant 1-click demo login buttons in the Sign In modal.

6. **Theme Support**:
   - Seamless dark mode and high-contrast light mode with zero layout shift.

---

## 📱 Connecting a Phone Camera as Station CCTV (Localhost & Demo Setup)

The system includes a **Phone as CCTV Camera** edge demo designed for hackathons and live evaluations. It turns any smartphone or secondary device into an edge CCTV station camera streaming directly into the OCC dashboard.

### Architecture & Privacy First
- **Zero App Installation**: Uses standard browser `navigator.mediaDevices.getUserMedia()` on mobile or desktop browsers.
- **Lightweight Transport**: Captures frames from a `<video>` element to an offscreen `<canvas>` every 1.5–2 seconds, compresses to JPEG, and sends via `POST /api/cctv/stream`.
- **Ephemeral In-Memory Buffer**: Raw frames are held strictly in server volatile memory with an automatic **45-second Time-To-Live (TTL)**. **Zero raw frames, face data, or video recordings are written to disk or database.**
- **Role-Based Protection**: Raw camera feeds and edge stream monitors are restricted to **Operator** and **Admin** roles. Passenger accounts cannot access edge video streams.
- **Digital Twin Signal Fusion**: Frame-derived passenger counts merge directly into the station crowd calculation pipeline alongside ticketing and sensor telemetry.

---

### Step-by-Step: How to Run the Phone CCTV Demo Locally

#### Method A: Dual-Tab / Web Camera (Fastest on Localhost)
1. Launch the app locally (`npm run dev`) and open [http://localhost:3000](http://localhost:3000).
2. Ensure you are signed in or switch your role to **Operator** or **Admin** via the role badge in the top navbar.
3. Click **"Control Room"** in the top navigation to open the OCC modal.
4. Go to the **📹 Camera Feeds** tab. At the top, locate the **CCTV Demo: Phone as Station Camera** section.
5. Select any target station (e.g., *Dadar (DDR)* or *Andheri (AND)*).
6. Click **"💻 Test Local Cam"** or open a new browser tab to:
   ```
   http://localhost:3000/cctv-stream?station=DDR
   ```
7. Click **"▶ Start CCTV Broadcast"** and allow camera permissions in your browser.
8. Switch back to the OCC tab: you will immediately see your live camera feed displaying in real time with station HUD, FPS counters, and simulated passenger detection bounding boxes!

---

#### Method B: 1-Click Virtual Camera Simulation (Zero Setup)
If you don't have a webcam or want an instant demo:
1. Open the OCC modal and click the **📹 Camera Feeds** tab.
2. Under the CCTV Demo monitor, click **"▶ Run Virtual Camera Simulation"**.
3. A real-time simulated Mumbai Suburban platform CCTV stream will render instantly with moving commuters, railway cars, platform safety lines, and edge AI detection boxes.

---

#### Method C: Connecting a Physical Mobile Phone on Localhost / LAN

> [!IMPORTANT]
> **Mobile Browser HTTPS Requirement**:
> Mobile browsers (Google Chrome on Android, Apple Safari on iOS) **strictly require HTTPS** for `navigator.mediaDevices.getUserMedia()`. If you open `http://<your-lan-ip>:3000` on a phone over plain HTTP, the browser will block the camera.

To connect a physical phone to your local dev machine, choose one of these standard methods:

##### 1. Using ngrok (Recommended & Easiest)
```bash
# In a new terminal window:
npx ngrok http 3000
```
- Copy the provided HTTPS tunnel URL (e.g. `https://xxxx-xx-xx.ngrok-free.app`).
- Open `https://xxxx-xx-xx.ngrok-free.app/cctv-stream?station=DDR` in your phone's mobile browser, or scan the QR code displayed in the OCC modal!
- Grant camera permission and tap **Start Broadcast**.
- The phone camera will instantly appear on your desktop OCC monitor.

##### 2. Using Next.js Experimental HTTPS
```bash
npm run dev -- --experimental-https
```
- Open `https://<YOUR-LAPTOP-LOCAL-IP>:3000/cctv-stream?station=DDR` on your phone on the same Wi-Fi network.

##### 3. Android Chrome Flag (Bypass for Plain HTTP LAN Testing)
If testing without HTTPS on Android:
1. On your Android phone, open Chrome and navigate to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
2. Enter your laptop's LAN address (e.g. `http://192.168.1.100:3000`).
3. Set the flag to **Enabled** and restart Chrome.
4. Open `http://192.168.1.100:3000/cctv-stream?station=DDR` and start camera streaming.

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
