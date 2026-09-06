// ============================================================
// lib/simulatedDigitalTwin.ts
// ------------------------------------------------------------
// Embedded Digital Twin Simulator for Mumbai Suburban Railway.
// Provides realistic simulated trains, live GPS telemetry,
// crowd densities, 15-minute AI predictions, alerts, and camera
// telemetry so the frontend can run demo-quality with zero
// external dependencies (no MongoDB or FastAPI required).
// ============================================================

import { MUMBAI_STATIONS, getStationDepartures } from "./networkFallback";
import { Station, riskFromDensity } from "./network";

export interface SimulatedTrain {
  _id: string;
  trainNumber: string;
  line: string;
  trainType: "Fast" | "Slow" | "AC Fast";
  source: string;
  destination: string;
  currentStation: { _id: string; name: string; code: string };
  nextStation: { _id: string; name: string; code: string };
  status: "running" | "delayed" | "stopped";
  speedKmph: number;
  delayMin: number;
  occupancyPercent: number;
  direction: "UP" | "DOWN";
  updatedAt: string;
}

export interface SimulatedAlert {
  id: string;
  stationId: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  status: "active" | "acknowledged" | "resolved";
  source?: string;
}

export interface SimulatedCamera {
  stationId: string;
  stationName: string;
  status: "connected" | "disconnected" | "error";
  streamUrl?: string;
  fps?: number;
  resolution?: string;
  lastPing?: string;
  detectedPassengers?: number;
}

export interface SimulatedCrowdOverride {
  stationCode: string;
  level: "low" | "moderate" | "high" | "critical";
  densityPercent: number;
  reason?: string;
  setAt: string;
  active: boolean;
}

// In-memory state storage for demo server
const simulatedOverrides = new Map<string, SimulatedCrowdOverride>();
const simulatedCameras = new Map<string, SimulatedCamera>();
let simulatedAlerts: SimulatedAlert[] = [
  {
    id: "alt-demo-1",
    stationId: "DDR",
    message: "Platform 3 & 4 Foot Overbridge congestion due to incoming fast services. Take South concourse.",
    severity: "warning",
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    status: "active",
    source: "OCC Control Room",
  },
  {
    id: "alt-demo-2",
    stationId: "KYN",
    message: "Minor signal interlocking calibration between Thakurli & Kalyan. Services running with 3-4 min spacing delay.",
    severity: "info",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: "active",
    source: "Signal & Telecom Dept",
  },
];

// Initialize default connected cameras
[
  { stationId: "CCG", stationName: "Churchgate", status: "connected" as const, fps: 30, resolution: "1080p", detectedPassengers: 410 },
  { stationId: "DDR", stationName: "Dadar", status: "connected" as const, fps: 28, resolution: "1080p", detectedPassengers: 840 },
  { stationId: "AND", stationName: "Andheri", status: "connected" as const, fps: 30, resolution: "1080p", detectedPassengers: 650 },
  { stationId: "BVI", stationName: "Borivali", status: "connected" as const, fps: 29, resolution: "1080p", detectedPassengers: 520 },
  { stationId: "CSMT", stationName: "CSMT", status: "connected" as const, fps: 30, resolution: "1080p", detectedPassengers: 730 },
  { stationId: "TNA", stationName: "Thane", status: "connected" as const, fps: 27, resolution: "1080p", detectedPassengers: 920 },
].forEach((cam) => {
  simulatedCameras.set(cam.stationId, {
    ...cam,
    streamUrl: `rtsp://edge-gateway.rail.internal:8554/live/${cam.stationId.toLowerCase()}-cam1`,
    lastPing: new Date().toISOString(),
  });
});

/**
 * Generate a dynamic fleet of active trains traversing Mumbai suburban network
 */
export function getSimulatedTrains(line?: string | null, status?: string | null): SimulatedTrain[] {
  const westernStations = MUMBAI_STATIONS.filter((s) => s.line === "Western");
  const centralStations = MUMBAI_STATIONS.filter((s) => s.line === "Central");
  const harbourStations = MUMBAI_STATIONS.filter((s) => s.line === "Harbour");
  const transHarbourStations = MUMBAI_STATIONS.filter((s) => s.line === "Trans-Harbour");

  const trains: SimulatedTrain[] = [];
  const now = new Date().toISOString();

  // Helper to generate simulated train
  function addTrain(
    id: string,
    num: string,
    lineName: string,
    type: "Fast" | "Slow" | "AC Fast",
    stationList: Station[],
    stepIdx: number,
    direction: "UP" | "DOWN",
    delay: number
  ) {
    const total = stationList.length;
    const currIdx = direction === "DOWN" ? stepIdx % total : total - 1 - (stepIdx % total);
    const nextIdx =
      direction === "DOWN"
        ? Math.min(total - 1, currIdx + 1)
        : Math.max(0, currIdx - 1);

    const curr = stationList[currIdx];
    const next = stationList[nextIdx];
    const src = direction === "DOWN" ? stationList[0].name : stationList[total - 1].name;
    const dst = direction === "DOWN" ? stationList[total - 1].name : stationList[0].name;

    const baseOccupancy = 45 + ((stepIdx * 11) % 50);

    trains.push({
      _id: id,
      trainNumber: num,
      line: lineName,
      trainType: type,
      source: src,
      destination: dst,
      currentStation: { _id: curr._id, name: curr.name, code: curr.code },
      nextStation: { _id: next._id, name: next.name, code: next.code },
      status: delay > 3 ? "delayed" : "running",
      speedKmph: Math.round(48 + ((stepIdx * 7) % 32)),
      delayMin: delay,
      occupancyPercent: baseOccupancy,
      direction,
      updatedAt: now,
    });
  }

  // Western line trains
  addTrain("t-wr-1", "90124", "Western", "Fast", westernStations, 4, "DOWN", 0);
  addTrain("t-wr-2", "90188", "Western", "Fast", westernStations, 7, "DOWN", 2);
  addTrain("t-wr-3", "90215", "Western", "Slow", westernStations, 2, "DOWN", 0);
  addTrain("t-wr-4", "90302", "Western", "AC Fast", westernStations, 9, "DOWN", 1);
  addTrain("t-wr-5", "90412", "Western", "Slow", westernStations, 3, "UP", 0);
  addTrain("t-wr-6", "90550", "Western", "Fast", westernStations, 6, "UP", 4);
  addTrain("t-wr-7", "90620", "Western", "AC Fast", westernStations, 8, "UP", 0);

  // Central line trains
  addTrain("t-cr-1", "96102", "Central", "Fast", centralStations, 3, "DOWN", 0);
  addTrain("t-cr-2", "96214", "Central", "Fast", centralStations, 6, "DOWN", 1);
  addTrain("t-cr-3", "96308", "Central", "Slow", centralStations, 2, "DOWN", 0);
  addTrain("t-cr-4", "96420", "Central", "Fast", centralStations, 8, "DOWN", 3);
  addTrain("t-cr-5", "96512", "Central", "Slow", centralStations, 4, "UP", 0);
  addTrain("t-cr-6", "96602", "Central", "Fast", centralStations, 7, "UP", 0);

  // Harbour line trains
  addTrain("t-hr-1", "98101", "Harbour", "Slow", harbourStations, 2, "DOWN", 0);
  addTrain("t-hr-2", "98205", "Harbour", "Slow", harbourStations, 5, "DOWN", 2);
  addTrain("t-hr-3", "98310", "Harbour", "Slow", harbourStations, 3, "UP", 0);
  addTrain("t-hr-4", "98415", "Harbour", "Slow", harbourStations, 6, "UP", 0);

  // Trans-Harbour line trains
  addTrain("t-th-1", "99102", "Trans-Harbour", "Slow", transHarbourStations, 1, "DOWN", 0);
  addTrain("t-th-2", "99204", "Trans-Harbour", "Slow", transHarbourStations, 3, "DOWN", 1);
  addTrain("t-th-3", "99308", "Trans-Harbour", "Slow", transHarbourStations, 2, "UP", 0);

  return trains.filter((t) => {
    if (line && t.line.toLowerCase() !== line.toLowerCase()) return false;
    if (status && t.status.toLowerCase() !== status.toLowerCase()) return false;
    return true;
  });
}

/**
 * Compute real-time crowd metrics and 15-minute Digital Twin AI forecast for a station
 */
export function getSimulatedCrowd(stationIdentifier: string) {
  const station = MUMBAI_STATIONS.find(
    (s) => s._id === stationIdentifier || s.code.toLowerCase() === stationIdentifier.toLowerCase()
  ) || MUMBAI_STATIONS[0];

  const override = simulatedOverrides.get(station.code) || simulatedOverrides.get(station._id);

  let densityPercent = Math.min(95, Math.max(25, 50 + ((station.sequence * 7) % 36)));
  let level = riskFromDensity(densityPercent);
  let estimatedCount = Math.round((station.capacity * densityPercent) / 100);

  if (override && override.active) {
    densityPercent = override.densityPercent;
    level = override.level;
    estimatedCount = Math.round((station.capacity * override.densityPercent) / 100);
  }

  // 15-Minute Digital Twin prediction logic
  const delta = (station.sequence % 3 === 0) ? 9 : (station.sequence % 2 === 0) ? -6 : 7;
  const predicted15MinDensity = Math.min(98, Math.max(15, Math.round(densityPercent + delta)));
  const predicted15MinCount = Math.round((station.capacity * predicted15MinDensity) / 100);
  const predictedRisk = riskFromDensity(predicted15MinDensity);
  const trend = delta > 2 ? "increasing" : delta < -2 ? "decreasing" : "stable";
  const capacityExceedanceProbability = Math.min(96, Math.max(8, Math.round(predicted15MinDensity * 0.94)));
  const confidenceScore = Math.min(98, Math.max(86, 92 + (station.sequence % 5)));

  const advisory =
    trend === "increasing"
      ? `Platform influx projected due to 2 approaching rakes within 12 mins. Expect +${delta}% surge on main FOB stairs.`
      : trend === "decreasing"
      ? `Crowd clearance expected following departure of terminating service. Net density declining by ${Math.abs(delta)}%.`
      : `Stable platform flow maintained. Ingress matches egress across North & South subways.`;

  return {
    stationId: station._id,
    stationName: station.name,
    densityPercent,
    estimatedCount,
    level,
    aiAssisted: true,
    calculatedAt: (override && override.active && override.setAt) || new Date().toISOString(),
    aiPrediction: {
      predicted15MinCrowdPercentage: predicted15MinDensity,
      predicted15MinCount,
      predictedRisk,
      deltaPercent: delta,
      trend,
      capacityExceedanceProbability,
      confidenceScore,
      advisory,
      forecastTime: "15 minutes ahead (Digital Twin Simulation)",
    },
  };
}

/**
 * Get approaching train ETAs for a station
 */
export function getSimulatedEtas(stationIdentifier: string) {
  const station = MUMBAI_STATIONS.find(
    (s) => s._id === stationIdentifier || s.code.toLowerCase() === stationIdentifier.toLowerCase()
  ) || MUMBAI_STATIONS[0];

  const departures = getStationDepartures(station);
  return departures.map((d) => ({
    train: d.trainNumber,
    direction: d.destination,
    etaMinutes: d.minutesAway,
    platform: d.platform,
    type: d.type,
    crowdLevel: d.crowdLevel,
    status: d.status,
  }));
}

/**
 * Get simulated congestion risk and bottleneck forecast
 */
export function getSimulatedCongestion(stationIdentifier: string) {
  const station = MUMBAI_STATIONS.find(
    (s) => s._id === stationIdentifier || s.code.toLowerCase() === stationIdentifier.toLowerCase()
  ) || MUMBAI_STATIONS[0];

  const currentDensity = Math.min(95, Math.max(30, 48 + ((station.sequence * 9) % 40)));
  const surgeRisk15Min = Math.min(90, Math.max(20, currentDensity + 10));

  return {
    stationId: station._id,
    stationName: station.name,
    currentDensity,
    currentRisk: riskFromDensity(currentDensity),
    surgeRisk15Min,
    forecastRisk: riskFromDensity(surgeRisk15Min),
    risk: riskFromDensity(currentDensity),
    riskProbability: Math.min(0.95, Math.max(0.2, (currentDensity / 100) * 0.95)),
    advisory:
      surgeRisk15Min > 75
        ? "High platform influx anticipated in next 15 minutes. Consider alternate coach positions or delayed entry."
        : "Station platform flow is operating within normal throughput parameters.",
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get train coach occupancies approaching station
 */
export function getSimulatedOccupancies(stationIdentifier: string) {
  const station = MUMBAI_STATIONS.find(
    (s) => s._id === stationIdentifier || s.code.toLowerCase() === stationIdentifier.toLowerCase()
  ) || MUMBAI_STATIONS[0];

  const departures = getStationDepartures(station);
  return departures.slice(0, 3).map((d) => ({
    trainId: d.trainNumber,
    trainNumber: d.trainNumber,
    direction: d.destination,
    predictedOccupancy: d.crowdPercent / 100,
    coaches: d.coaches,
    recommendation: d.coaches[0] < d.coaches[11] ? "Board front coaches (C1-C3)" : "Board rear coaches (C10-C12)",
  }));
}

/**
 * Get platform heatmap across all stations
 */
export function getSimulatedHeatmap() {
  return MUMBAI_STATIONS.map((s) => {
    const crowd = getSimulatedCrowd(s._id);
    return {
      stationId: s._id,
      stationName: s.name,
      code: s.code,
      line: s.line,
      location: s.location,
      densityPercent: crowd.densityPercent,
      estimatedCount: crowd.estimatedCount,
      level: crowd.level,
      predicted15MinPercent: crowd.aiPrediction.predicted15MinCrowdPercentage,
      predictedRisk: crowd.aiPrediction.predictedRisk,
    };
  });
}

// Alert operations
export function getSimulatedAlerts(stationId?: string | null) {
  if (!stationId) return simulatedAlerts;
  return simulatedAlerts.filter((a) => a.stationId.toLowerCase() === stationId.toLowerCase());
}

export function createSimulatedAlert(alert: Omit<SimulatedAlert, "id" | "createdAt" | "status">) {
  const newAlert: SimulatedAlert = {
    ...alert,
    id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    status: "active",
  };
  simulatedAlerts.unshift(newAlert);
  return newAlert;
}

export function resolveSimulatedAlert(id: string) {
  const target = simulatedAlerts.find((a) => a.id === id);
  if (target) target.status = "resolved";
  return target;
}

export function deleteSimulatedAlert(id: string) {
  const beforeCount = simulatedAlerts.length;
  simulatedAlerts = simulatedAlerts.filter((a) => a.id !== id);
  return simulatedAlerts.length < beforeCount;
}

// Camera operations
export function getSimulatedCameras() {
  return Array.from(simulatedCameras.values());
}

export function registerSimulatedCamera(cam: { stationId: string; streamUrl?: string; resolution?: string }) {
  const station = MUMBAI_STATIONS.find(
    (s) => s.code.toLowerCase() === cam.stationId.toLowerCase() || s._id === cam.stationId
  );
  const stationName = station ? station.name : cam.stationId;
  const newCam: SimulatedCamera = {
    stationId: cam.stationId.toUpperCase(),
    stationName,
    status: "connected",
    streamUrl: cam.streamUrl || `rtsp://edge-gateway.rail.internal:8554/live/${cam.stationId.toLowerCase()}-cam1`,
    resolution: cam.resolution || "1080p",
    fps: 30,
    detectedPassengers: Math.floor(Math.random() * 600) + 200,
    lastPing: new Date().toISOString(),
  };
  simulatedCameras.set(cam.stationId.toUpperCase(), newCam);
  return newCam;
}

export function removeSimulatedCamera(stationId: string) {
  return simulatedCameras.delete(stationId.toUpperCase());
}

// Crowd Override operations
export function getSimulatedOverride(stationCode: string) {
  return simulatedOverrides.get(stationCode.toUpperCase()) || null;
}

export function getAllSimulatedOverrides() {
  return Array.from(simulatedOverrides.values());
}

export function setSimulatedOverride(override: {
  stationCode: string;
  level: "low" | "moderate" | "high" | "critical";
  densityPercent: number;
  reason?: string;
}) {
  const record: SimulatedCrowdOverride = {
    stationCode: override.stationCode.toUpperCase(),
    level: override.level,
    densityPercent: override.densityPercent,
    reason: override.reason || "Manual OCC Controller Adjustment",
    setAt: new Date().toISOString(),
    active: true,
  };
  simulatedOverrides.set(record.stationCode, record);
  return record;
}

export function clearSimulatedOverride(stationCode: string) {
  return simulatedOverrides.delete(stationCode.toUpperCase());
}
