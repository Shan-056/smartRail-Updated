// ============================================================
// frontend/demoServer.ts
// ------------------------------------------------------------
// Standalone Mock/Demo Express Server for SmartRail Twin.
// Simulates the complete Mumbai Suburban Railway digital twin
// (trains, stations, ETAs, 15-minute AI crowd predictions,
// OCC alerts, cameras, overrides, and demo auth) so the
// frontend can run demo-quality without the real backend at all.
// ============================================================

import express, { type Request, type Response, type NextFunction } from "express";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";
import {
  getSimulatedTrains,
  getSimulatedCrowd,
  getSimulatedEtas,
  getSimulatedCongestion,
  getSimulatedOccupancies,
  getSimulatedHeatmap,
  getSimulatedAlerts,
  createSimulatedAlert,
  resolveSimulatedAlert,
  deleteSimulatedAlert,
  getSimulatedCameras,
  registerSimulatedCamera,
  removeSimulatedCamera,
  getSimulatedOverride,
  getAllSimulatedOverrides,
  setSimulatedOverride,
  clearSimulatedOverride,
} from "@/lib/simulatedDigitalTwin";

export function createDemoServer() {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // CORS headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "SmartRail Digital Twin Demo Engine",
      mode: "standalone-simulation",
      activeTrains: 20,
      networkStations: MUMBAI_STATIONS.length,
      timestamp: new Date().toISOString(),
    });
  });

  // Stations
  app.get("/api/stations", (req: Request, res: Response) => {
    const line = req.query.line as string | undefined;
    const corridor = req.query.corridor as string | undefined;

    let stations = MUMBAI_STATIONS;
    if (line) {
      stations = stations.filter((s) => s.line.toLowerCase() === line.toLowerCase());
    }
    if (corridor) {
      stations = stations.filter((s) => s.corridor.toLowerCase() === corridor.toLowerCase());
    }

    res.json({ count: stations.length, stations });
  });

  // Active simulated trains
  app.get("/api/trains", (req: Request, res: Response) => {
    const line = req.query.line as string | undefined;
    const status = req.query.status as string | undefined;
    const trains = getSimulatedTrains(line, status);
    res.json({ count: trains.length, trains });
  });

  // 15-Minute Digital Twin & Crowd Prediction
  app.get("/api/predict/crowd", (req: Request, res: Response) => {
    const stationId = (req.query.stationId as string) || "CCG";
    const prediction = getSimulatedCrowd(stationId);
    res.json({ prediction });
  });

  // Train ETAs
  app.get("/api/predict/eta", (req: Request, res: Response) => {
    const stationId = (req.query.stationId as string) || "CCG";
    const predictions = getSimulatedEtas(stationId);
    res.json({ stationId, count: predictions.length, predictions });
  });

  // Congestion bottlenecks
  app.get("/api/predict/congestion", (req: Request, res: Response) => {
    const stationId = (req.query.stationId as string) || "CCG";
    const prediction = getSimulatedCongestion(stationId);
    res.json({ prediction });
  });

  // Train occupancy
  app.get("/api/predict/occupancy", (req: Request, res: Response) => {
    const stationId = (req.query.stationId as string) || "CCG";
    const predictions = getSimulatedOccupancies(stationId);
    res.json({ stationId, count: predictions.length, predictions });
  });

  // 2D/3D platform heatmap
  app.get("/api/heatmap", (_req: Request, res: Response) => {
    const stations = getSimulatedHeatmap();
    res.json({ count: stations.length, stations });
  });

  // Operational alerts
  app.get("/api/alerts", (req: Request, res: Response) => {
    const stationId = req.query.stationId as string | undefined;
    const alerts = getSimulatedAlerts(stationId);
    res.json({ count: alerts.length, alerts });
  });

  app.post("/api/alerts", (req: Request, res: Response) => {
    const { stationId, message, severity } = req.body;
    if (!stationId || !message) {
      return res.status(400).json({ message: "stationId and message are required." });
    }
    const alert = createSimulatedAlert({
      stationId,
      message,
      severity: severity || "info",
    });
    res.status(201).json({ alert });
  });

  app.patch("/api/alerts/:id", (req: Request, res: Response) => {
    const alertId = String(req.params.id);
    const updated = resolveSimulatedAlert(alertId);
    if (!updated) return res.status(404).json({ message: "Alert not found." });
    res.json({ alert: updated });
  });

  app.delete("/api/alerts/:id", (req: Request, res: Response) => {
    const alertId = String(req.params.id);
    const deleted = deleteSimulatedAlert(alertId);
    res.json({ success: deleted });
  });

  // Edge cameras
  app.get("/api/control-room/cameras", (_req: Request, res: Response) => {
    const cameras = getSimulatedCameras();
    res.json({ count: cameras.length, cameras });
  });

  app.post("/api/control-room/cameras", (req: Request, res: Response) => {
    const { stationId, streamUrl, resolution } = req.body;
    if (!stationId) return res.status(400).json({ message: "stationId is required." });
    const cam = registerSimulatedCamera({ stationId, streamUrl, resolution });
    res.status(201).json({ camera: cam });
  });

  app.delete("/api/control-room/cameras/:stationId", (req: Request, res: Response) => {
    const stationId = String(req.params.stationId);
    const ok = removeSimulatedCamera(stationId);
    res.json({ success: ok });
  });

  // Manual crowd overrides
  app.get("/api/control-room/crowd-override", (req: Request, res: Response) => {
    const stationCode = req.query.stationCode as string | undefined;
    if (stationCode) {
      const override = getSimulatedOverride(stationCode);
      return res.json({ override });
    }
    const overrides = getAllSimulatedOverrides();
    res.json({ count: overrides.length, overrides });
  });

  app.post("/api/control-room/crowd-override", (req: Request, res: Response) => {
    const { stationCode, level, densityPercent, reason } = req.body;
    if (!stationCode || !level || densityPercent === undefined) {
      return res.status(400).json({ message: "stationCode, level, and densityPercent are required." });
    }
    const override = setSimulatedOverride({ stationCode, level, densityPercent, reason });
    res.json({ override });
  });

  app.delete("/api/control-room/crowd-override", (req: Request, res: Response) => {
    const stationCode = req.query.stationCode as string | undefined;
    if (!stationCode) return res.status(400).json({ message: "stationCode is required." });
    const cleared = clearSimulatedOverride(stationCode);
    res.json({ success: cleared });
  });

  // Demo Auth
  app.post("/api/auth/login", (req: Request, res: Response) => {
    const { email } = req.body;
    const role =
      email?.includes("admin")
        ? "admin"
        : email?.includes("operator")
        ? "operator"
        : "passenger";

    const user = {
      _id: `usr-demo-${role}`,
      name: role === "admin" ? "Demo OCC Director" : role === "operator" ? "Demo Traffic Controller" : "Demo Commuter",
      email: email || `${role}@smartrail.internal`,
      role,
    };

    res.json({
      user,
      token: `demo-jwt-token-${role}`,
      message: `Signed in successfully as ${role}`,
    });
  });

  app.get("/api/auth/me", (_req: Request, res: Response) => {
    res.json({
      user: {
        _id: "usr-demo-passenger",
        name: "Demo Commuter",
        email: "passenger@smartrail.internal",
        role: "passenger",
      },
    });
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.json({ message: "Signed out successfully." });
  });

  return app;
}

export const demoApp = createDemoServer();
export default demoApp;
