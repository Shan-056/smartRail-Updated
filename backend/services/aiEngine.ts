// ============================================================
// services/aiEngine.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is the ONE place in the whole backend that talks to the
// separate AI/ML engine (the FastAPI service in ../ai-engine).
// Every other file that wants an AI-powered prediction calls the
// functions in here — they never call the AI engine directly.
//
// FIX (integration bug): this file previously called a made-up
// contract (`/predict/crowd` with `{stationId, cctvCount,
// ticketCount, capacity}` in, `{estimatedCount, densityPercent,
// level}` out) that was a placeholder guess written before the
// real AI engine existed. Now that the real engine is available
// (see ../ai-engine/api/main.py), this file has been rewritten to
// match its ACTUAL request/response shapes exactly. Every request
// field below is required by a pydantic model in that file, and
// every response field is read from what that endpoint actually
// returns — nothing here is guessed.
//
// Every function still returns null (never throws) when the AI
// engine is unreachable, unsupported for a given station, or
// returns an error, so callers keep working with their own
// deterministic fallback the whole time the AI engine is down —
// that graceful-degradation behavior is unchanged.
// ============================================================

import { resolveAiStationId } from "@/lib/aiStationMap";

const AI_ENGINE_URL = (process.env.AI_ENGINE_URL || "http://localhost:8000").replace(/\/+$/, "");
const AI_ENGINE_TIMEOUT_MS = 3000;

async function postToAiEngine<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${AI_ENGINE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Don't let a slow/unreachable AI engine hang the whole request
      signal: AbortSignal.timeout(AI_ENGINE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // AI engine not running, network error, or timed out — caller falls back
    return null;
  }
}

async function getFromAiEngine<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${AI_ENGINE_URL}${path}`, {
      method: "GET",
      signal: AbortSignal.timeout(AI_ENGINE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// /predict/crowd
// ---------------------------------------------------------------

export interface CrowdPredictionRequest {
  stationName: string; // resolved internally to the AI engine's station_id
  timestamp: string; // ISO string
  recentCrowdDensity: number[]; // 0-1 scale, most-recent-last
  recentEntryCounts: number[];
  recentExitCounts: number[];
  recentTicketActivity: number[];
}

export interface CrowdPredictionResponse {
  currentCrowdPercentage: number;
  predicted15MinCrowdPercentage: number | null;
  predicted30MinCrowdPercentage: number | null;
  capacityExceedanceProbability: number | null;
  risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
}

export async function getAiCrowdPrediction(
  payload: CrowdPredictionRequest
): Promise<CrowdPredictionResponse | null> {
  const stationId = resolveAiStationId(payload.stationName);
  if (!stationId) return null; // outside the AI engine's trained coverage

  return postToAiEngine<CrowdPredictionResponse>("/predict/crowd", {
    station_id: stationId,
    timestamp: payload.timestamp,
    recent_crowd_density: payload.recentCrowdDensity,
    recent_entry_counts: payload.recentEntryCounts,
    recent_exit_counts: payload.recentExitCounts,
    recent_ticket_activity: payload.recentTicketActivity,
  });
}

// ---------------------------------------------------------------
// /predict/eta
// ---------------------------------------------------------------

export interface EtaPredictionRequest {
  trainId: string;
  currentStationName: string;
  nextStationName: string;
  timestamp: string;
  speedKmph: number;
  distanceToNextStationKm: number;
  delayMinutes?: number;
  stopSequence?: number;
  isFastTrain?: boolean;
  stationCrowdDensity?: number; // 0-1 scale
  scheduledMinutes?: number;
}

export interface EtaPredictionResponse {
  predictedMinutes: number;
  delayMinutes: number;
  scheduledMinutes: number;
  modelUsed: string | null;
}

export async function getAiEtaPrediction(
  payload: EtaPredictionRequest
): Promise<EtaPredictionResponse | null> {
  const stationId = resolveAiStationId(payload.currentStationName);
  const nextStationId = resolveAiStationId(payload.nextStationName);
  if (!stationId || !nextStationId) return null;

  const result = await postToAiEngine<{
    predictedMinutes: number;
    delayMinutes: number;
    scheduledMinutes: number;
    modelMetadata?: { model?: string | null };
  }>("/predict/eta", {
    train_id: payload.trainId,
    station_id: stationId,
    next_station_id: nextStationId,
    timestamp: payload.timestamp,
    speed_kmh: payload.speedKmph,
    distance_to_next_station_km: payload.distanceToNextStationKm,
    delay_min: payload.delayMinutes ?? 0,
    stop_sequence: payload.stopSequence ?? 0,
    train_type_fast: payload.isFastTrain ?? false,
    station_crowd_density: payload.stationCrowdDensity ?? 0,
    scheduled_minutes: payload.scheduledMinutes,
  });

  if (!result) return null;

  return {
    predictedMinutes: result.predictedMinutes,
    delayMinutes: result.delayMinutes,
    scheduledMinutes: result.scheduledMinutes,
    modelUsed: result.modelMetadata?.model ?? null,
  };
}

// ---------------------------------------------------------------
// /predict/congestion — not previously wired up anywhere in the
// backend even though the AI engine has always exposed it. Added
// so the recommendation/advisory layer can use a real congestion
// probability instead of only crowd-density thresholds.
// ---------------------------------------------------------------

export interface CongestionPredictionRequest {
  stationName: string;
  timestamp: string;
  recentCrowdDensity: number[];
  recentEntryCounts: number[];
  recentTicketActivity: number[];
  trainsRecentCount?: number;
  avgDelayRecent?: number;
  avgOccupancyRecent?: number;
}

export interface CongestionPredictionResponse {
  risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  riskProbability: number;
}

export async function getAiCongestionPrediction(
  payload: CongestionPredictionRequest
): Promise<CongestionPredictionResponse | null> {
  const stationId = resolveAiStationId(payload.stationName);
  if (!stationId) return null;

  return postToAiEngine<CongestionPredictionResponse>("/predict/congestion", {
    station_id: stationId,
    timestamp: payload.timestamp,
    recent_crowd_density: payload.recentCrowdDensity,
    recent_entry_counts: payload.recentEntryCounts,
    recent_ticket_activity: payload.recentTicketActivity,
    trains_recent_count: payload.trainsRecentCount ?? 0,
    avg_delay_recent: payload.avgDelayRecent ?? 0,
    avg_occupancy_recent: payload.avgOccupancyRecent ?? 0,
  });
}

// ---------------------------------------------------------------
// GET /recommendations — the AI engine's own rule-based decision
// layer, built on top of whatever it currently has in its digital
// twin memory. Exposed here as a thin passthrough for the backend
// to optionally blend with (or defer to) its own recommendations
// route.
// ---------------------------------------------------------------

export interface AiRecommendation {
  station: string;
  action: string;
  targetPlatform: number | null;
  reason: string;
  riskProbability: number | null;
}

export async function getAiRecommendations(
  stationName?: string
): Promise<AiRecommendation[] | null> {
  const stationId = stationName ? resolveAiStationId(stationName) : null;
  if (stationName && !stationId) return null;

  const query = stationId ? `?station_id=${encodeURIComponent(stationId)}` : "";
  const result = await getFromAiEngine<{ recommendations: AiRecommendation[] }>(
    `/recommendations${query}`
  );
  return result?.recommendations ?? null;
}

export { AI_ENGINE_URL };
