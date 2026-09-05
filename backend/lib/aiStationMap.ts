// ============================================================
// lib/aiStationMap.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// The trained AI engine (the separate Python/FastAPI service in
// ../ai-engine) only has models for a fixed set of 10 Western-line
// stations — the set it was trained on (see ai-engine/config.py:
// STATION_IDS). Our MongoDB `Station` collection is open-ended:
// operators can add ANY station on ANY line (Western, Central,
// Harbour, Trans-Harbour) via the seed script or a GTFS import.
//
// That means we can't just forward our Mongo station's `code`
// straight to the AI engine — the codes don't even use the same
// scheme (e.g. our seed data calls Andheri "AS", the AI engine
// calls it "AND"), and most of our stations have no trained model
// at all.
//
// This file is the single place that bridges the two naming
// schemes, by matching on station NAME (case-insensitive) rather
// than code, since name is the one thing guaranteed to line up.
// Every caller should go through `resolveAiStationId()` and treat
// a `null` result as "this station has no AI model — use the
// built-in fallback math," not as an error.
// ============================================================

// Exactly the 10 station_ids the AI engine has trained models for.
// Keep this in sync with ai-engine/config.py -> STATIONS.
export const AI_ENGINE_STATIONS: Record<string, string> = {
  churchgate: "CCG",
  "marine lines": "MEL",
  "charni road": "CRD",
  "grant road": "GRT",
  "mumbai central": "MBC",
  dadar: "DDR",
  bandra: "BND",
  andheri: "AND",
  borivali: "BVI",
  virar: "VR",
};

/**
 * resolveAiStationId
 * Human explanation: Given a station's human-readable name (as
 * stored in our Station collection), returns the matching AI
 * engine station_id, or null if this station falls outside the
 * AI engine's trained coverage. Callers should skip the AI engine
 * call entirely when this returns null, instead of firing a
 * request that the engine will just reject with a 422.
 */
export function resolveAiStationId(stationName: string): string | null {
  const key = stationName.trim().toLowerCase();
  return AI_ENGINE_STATIONS[key] ?? null;
}

export function isAiEngineSupported(stationName: string): boolean {
  return resolveAiStationId(stationName) !== null;
}

// The AI engine reports risk as "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
// (see ai-engine/digital_twin/twin.py -> risk_level). Our CrowdLog
// schema's `level` enum is "low" | "moderate" | "high" | "critical"
// (see models/CrowdLog.ts). These do not line up 1:1 — mapping the
// raw string in unchanged would violate the Mongoose enum and throw
// on save. This table is the single source of truth for that
// translation.
export function mapAiRiskToCrowdLevel(
  risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN" | string
): "low" | "moderate" | "high" | "critical" {
  switch (risk) {
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "moderate";
    case "LOW":
      return "low";
    default:
      // "UNKNOWN" (no probability available) — treat as low rather
      // than silently defaulting to a scarier label.
      return "low";
  }
}
