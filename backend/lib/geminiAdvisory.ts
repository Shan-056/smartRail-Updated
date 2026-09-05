// ============================================================
// lib/geminiAdvisory.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Generates a short, natural-language "executive summary" of
// current network conditions for the control room — what Gemini
// is actually used for in this project. This is NOT a chatbot:
// there is no open-ended conversation anywhere in this codebase.
// It's a single, structured report ("here's what's going on
// network-wide, here's what to watch, here's what to do about
// it") built from the same live occupancy/risk numbers already
// on the control room dashboard, phrased in plain English instead
// of a table of numbers.
//
// WHY THE GEMINI KEY IS KEPT (see project README for the full
// writeup): this endpoint already has a complete, fully-functional
// DETERMINISTIC fallback below that runs the exact same summary
// logic with plain string templates instead of an LLM call. If
// GEMINI_API_KEY is unset, or the Gemini call fails for any reason,
// this silently and immediately falls back — the feature keeps
// working either way. Removing the key would only remove the
// natural-language polish, not any underlying capability; keeping
// it is a pure upgrade with zero downside, so it's kept.
//
// This is a straight port of the frontend's original
// src/server/geminiService.ts, adapted to run against real
// MongoDB/digital-twin/AI-engine data instead of the frontend's
// simulated mock stations, so it's no longer dead code that no
// view could ever reach.
// ============================================================

import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export interface AdvisoryStationSnapshot {
  name: string;
  line: string;
  currentOccupancyPercent: number;
  predicted15MinOccupancyPercent: number | null;
  risk: string; // "low" | "moderate" | "high" | "critical" | "unknown"
}

export interface AdvisoryRecommendation {
  station: string;
  action: string;
  reason: string;
}

export interface AiAdvisoryResponse {
  summary: string;
  keyInsights: string[];
  recommendedActions: string[];
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  source: "GEMINI_AI" | "DETERMINISTIC_ENGINE";
  timestamp: string;
}

export async function generateOperationalAdvisory(
  stations: AdvisoryStationSnapshot[],
  recommendations: AdvisoryRecommendation[],
  query?: string,
  targetStationName?: string
): Promise<AiAdvisoryResponse> {
  const targetStation = targetStationName
    ? stations.find((s) => s.name.toLowerCase() === targetStationName.toLowerCase())
    : null;

  const criticalCount = stations.filter((s) => s.currentOccupancyPercent >= 85).length;
  const highCount = stations.filter(
    (s) => s.currentOccupancyPercent >= 70 && s.currentOccupancyPercent < 85
  ).length;
  const avgOccupancy = stations.length
    ? Math.round(
        stations.reduce((acc, s) => acc + s.currentOccupancyPercent, 0) / stations.length
      )
    : 0;

  const topCongested = [...stations]
    .sort((a, b) => b.currentOccupancyPercent - a.currentOccupancyPercent)
    .slice(0, 5)
    .map(
      (s) =>
        `${s.name} (${s.line}): ${s.currentOccupancyPercent}% occupancy, risk ${s.risk}${
          s.predicted15MinOccupancyPercent !== null
            ? `, 15m forecast ${s.predicted15MinOccupancyPercent}%`
            : ""
        }`
    );

  const client = getGeminiClient();

  if (client) {
    try {
      const prompt = `You are RailFlow AI, the real-time operational decision support assistant for Mumbai Suburban Railway Operation Control Centre (OCC).
Based on the following live deterministic ground-truth telemetry facts:
- Network Average Occupancy: ${avgOccupancy}%
- Critical Stations (>=85%): ${criticalCount}
- High Congestion Stations (70-84%): ${highCount}
- Top 5 Congested Stations:
${topCongested.map((s) => `  * ${s}`).join("\n")}
${
  targetStation
    ? `- Target Focus Station: ${targetStation.name} (${targetStation.line}) - Current Occupancy: ${targetStation.currentOccupancyPercent}%, Risk: ${targetStation.risk}`
    : ""
}
- Active Recommendations:
${recommendations.map((r) => `  * [${r.station}] ${r.action}: ${r.reason}`).join("\n")}

${query ? `User specific inquiry: "${query}"` : "Provide an executive crowd mitigation synopsis for the OCC controller."}

Respond in strict JSON format matching this schema:
{
  "summary": "Concise 2-sentence executive summary of network crowd dynamics and operational risks",
  "keyInsights": ["3 specific data-driven observations citing actual station numbers"],
  "recommendedActions": ["2-3 concrete operational directives for station masters and motormen"],
  "riskLevel": "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
}`;

      const response = await client.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        return {
          summary: parsed.summary || "Network operational telemetry processed.",
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
          recommendedActions: Array.isArray(parsed.recommendedActions)
            ? parsed.recommendedActions
            : [],
          riskLevel:
            parsed.riskLevel || (criticalCount > 0 ? "CRITICAL" : highCount > 2 ? "HIGH" : "MODERATE"),
          source: "GEMINI_AI",
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn("Gemini AI advisory generation failed, falling back to deterministic engine:", error);
    }
  }

  // ---- Deterministic fallback engine (always available, no key needed) ----
  const riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" =
    criticalCount >= 3 ? "CRITICAL" : criticalCount > 0 || highCount >= 3 ? "HIGH" : avgOccupancy > 60 ? "MODERATE" : "LOW";

  let summary = `Network operating at ${avgOccupancy}% average capacity with ${criticalCount} critical station(s) and ${highCount} high-density station(s) under active monitoring.`;
  if (targetStation) {
    summary = `${targetStation.name} (${targetStation.line}) is at ${targetStation.currentOccupancyPercent}% occupancy (risk: ${targetStation.risk}).`;
  }

  const keyInsights = [
    topCongested.length
      ? `Most congested stations right now: ${topCongested.slice(0, 2).map((s) => s.split(":")[0]).join(", ")}.`
      : "No station-level crowd data available yet.",
    `Network-wide average occupancy is ${avgOccupancy}% across ${stations.length} monitored station(s).`,
    criticalCount > 0
      ? `${criticalCount} station(s) are at or above critical (85%+) occupancy.`
      : "No stations are currently at critical occupancy.",
  ];

  const recommendedActions = recommendations.slice(0, 3).map((r) => `${r.station}: ${r.action} — ${r.reason}`);
  if (recommendedActions.length === 0) {
    recommendedActions.push("Maintain regular dispatch headway and continue monitoring ticketing velocity.");
  }

  return {
    summary,
    keyInsights,
    recommendedActions,
    riskLevel,
    source: "DETERMINISTIC_ENGINE",
    timestamp: new Date().toISOString(),
  };
}
