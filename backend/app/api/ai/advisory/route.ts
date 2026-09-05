// ============================================================
// app/api/ai/advisory/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/ai/advisory — the natural-language executive
// summary feature for the control room (see lib/geminiAdvisory.ts
// for why the Gemini key backing this is kept). Ported over from
// the frontend's own mock server so it runs against real crowd
// data instead of simulated numbers, and so a real UI can finally
// call it (see lib/aiStationMap.ts + README for the previous state:
// this endpoint existed but nothing in the frontend ever called it).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, AuthError } from "@/middleware/auth";
import { CrowdLog } from "@/models/CrowdLog";
import { Station } from "@/models/Station";
import {
  generateOperationalAdvisory,
  type AdvisoryStationSnapshot,
  type AdvisoryRecommendation,
} from "@/lib/geminiAdvisory";
import { getAiRecommendations } from "@/services/aiEngine";

const LEVEL_TO_RISK: Record<string, string> = {
  low: "low",
  moderate: "moderate",
  high: "high",
  critical: "critical",
};

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    await requireAuth(req);

    const { stationId, query } = (await req.json().catch(() => ({}))) as {
      stationId?: string;
      query?: string;
    };

    // Latest crowd reading per station (same aggregation approach as
    // /api/crowd) joined with each station's name/line for the prompt.
    const latestPerStation = await CrowdLog.aggregate([
      { $sort: { calculatedAt: -1 } },
      { $group: { _id: "$station", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);
    const stationDocs = await Station.find().select("name line");
    const stationById = new Map(stationDocs.map((s) => [s._id.toString(), s]));

    const snapshots: AdvisoryStationSnapshot[] = latestPerStation
      .map((log) => {
        const station = stationById.get(log.station.toString());
        if (!station) return null;
        return {
          name: station.name,
          line: station.line,
          currentOccupancyPercent: log.densityPercent,
          predicted15MinOccupancyPercent: null,
          risk: LEVEL_TO_RISK[log.level] ?? "unknown",
        } satisfies AdvisoryStationSnapshot;
      })
      .filter((s): s is AdvisoryStationSnapshot => s !== null);

    // Build a small set of recommendations to feed the advisory —
    // prefer the AI engine's own rule-based recommender where a
    // station falls within its trained coverage, otherwise fall back
    // to a plain threshold rule so every high/critical station still
    // gets at least one line of guidance.
    const recommendations: AdvisoryRecommendation[] = [];
    const attentionNeeded = snapshots.filter((s) => s.risk === "high" || s.risk === "critical");
    for (const s of attentionNeeded.slice(0, 5)) {
      const aiRecs = await getAiRecommendations(s.name);
      const aiRec = aiRecs?.[0];
      recommendations.push(
        aiRec
          ? { station: s.name, action: aiRec.action, reason: aiRec.reason }
          : {
              station: s.name,
              action: s.risk === "critical" ? "ISSUE_CONGESTION_WARNING" : "MONITOR_STATION",
              reason: `${s.name} is at ${s.currentOccupancyPercent}% occupancy (${s.risk}).`,
            }
      );
    }

    const targetStationName = stationId
      ? stationDocs.find((s) => s._id.toString() === stationId || s.code === stationId.toUpperCase())?.name
      : undefined;

    const advisory = await generateOperationalAdvisory(
      snapshots,
      recommendations,
      typeof query === "string" ? query : undefined,
      targetStationName
    );

    return NextResponse.json({ success: true, data: advisory });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("Error generating AI advisory:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate operational advisory" },
      { status: 500 }
    );
  }
}
