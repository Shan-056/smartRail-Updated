// ============================================================
// services/aiEngine.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is the ONE place in the whole backend that talks to the
// separate AI/ML engine (the FastAPI service in ai-engine/, see
// ai-engine/api/main.py for the source of truth). Every other
// file that wants an AI-powered prediction calls the functions
// in here — they never call the AI engine directly.
//
// These request/response shapes are copied EXACTLY from
// ai-engine/api/main.py's pydantic models, field for field —
// this file is the integration point, so it must match that
// contract precisely (snake_case field names, since that's what
// FastAPI/pydantic expects on the wire).
//
// The AI engine was only trained on the Western line stations
// (CCG, MEL, CRD, GRT, MBC, DDR, BND, AND, BVI, VR — see
// ai-engine/config.py's STATION_IDS). Calling it with any other
// station_id returns a 422 from FastAPI's own validation, which
// every function below treats the same as "engine unreachable" —
// it returns null so the caller (services/analyticsEngine.ts)
// falls back to its own built-in math. This is what lets Central
// line / other stations work in the app today even though no
// model has been trained for them yet.
// ============================================================

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 4000;

async function callAiEngine<TResponse>(path: string, payload: unknown): Promise<TResponse | null> {
  try {
    const res = await fetch(`${AI_ENGINE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Don't let a slow/unreachable AI engine hang the whole request
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) return null; // includes 422 "unknown station_id" — caller falls back
    return (await res.json()) as TResponse;
  } catch {
    // AI engine not running, network error, or timeout — caller falls back
    return null;
  }
}

// ---------------- /predict/crowd ----------------

export interface CrowdPredictionRequest {
  station_id: string;
  timestamp?: string;
  recent_crowd_density: number[]; // 0-1 scale, most-recent-last
  recent_entry_counts: number[];
  recent_exit_counts: number[];
  recent_ticket_activity: number[];
}

export interface CrowdPredictionResponse {
  station: string;
  currentCrowdPercentage: number;
  predicted15MinCrowdPercentage: number | null;
  predicted30MinCrowdPercentage: number | null;
  capacityExceedanceProbability: number | null;
  risk: "low" | "moderate" | "high" | "critical";
  timestamp: string;
}

export function getAiCrowdPrediction(payload: CrowdPredictionRequest) {
  return callAiEngine<CrowdPredictionResponse>("/predict/crowd", payload);
}

// ---------------- /predict/eta ----------------

export interface EtaPredictionRequest {
  train_id: string;
  station_id: string;
  next_station_id: string;
  timestamp?: string;
  speed_kmh: number;
  distance_to_next_station_km: number;
  delay_min?: number;
  stop_sequence?: number;
  train_type_fast?: boolean;
  station_crowd_density?: number;
  scheduled_minutes?: number;
}

export interface EtaPredictionResponse {
  trainId: string;
  station: string;
  scheduledMinutes: number;
  predictedMinutes: number;
  delayMinutes: number;
  modelMetadata: { model: string };
  timestamp: string;
}

export function getAiEtaPrediction(payload: EtaPredictionRequest) {
  return callAiEngine<EtaPredictionResponse>("/predict/eta", payload);
}

// ---------------- /predict/occupancy ----------------

export interface OccupancyPredictionRequest {
  train_id: string;
  station_id: string;
  next_station_id?: string;
  timestamp?: string;
  occupancy_fraction: number; // 0-1.3
  delay_min?: number;
  speed_kmh: number;
  distance_to_next_station_km: number;
  stop_sequence?: number;
  train_type_fast?: boolean;
  boarded?: number;
  alighted?: number;
  station_crowd_density?: number;
}

export interface OccupancyPredictionResponse {
  trainId: string;
  currentOccupancy: number;
  predictedOccupancy: number;
  overcrowdingProbability: number | null;
  timestamp: string;
}

export function getAiOccupancyPrediction(payload: OccupancyPredictionRequest) {
  return callAiEngine<OccupancyPredictionResponse>("/predict/occupancy", payload);
}

// ---------------- /predict/congestion ----------------

export interface CongestionPredictionRequest {
  station_id: string;
  timestamp?: string;
  recent_crowd_density: number[];
  recent_entry_counts: number[];
  recent_ticket_activity: number[];
  trains_recent_count?: number;
  avg_delay_recent?: number;
  avg_occupancy_recent?: number;
}

export interface CongestionPredictionResponse {
  risk: "low" | "moderate" | "high" | "critical";
  riskProbability: number;
  timestamp: string;
}

export function getAiCongestionPrediction(payload: CongestionPredictionRequest) {
  return callAiEngine<CongestionPredictionResponse>("/predict/congestion", payload);
}

// ---------------- GET /health (used for a quick "is the AI engine up?" check) ----------------

export async function getAiEngineHealth() {
  try {
    const res = await fetch(`${AI_ENGINE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
