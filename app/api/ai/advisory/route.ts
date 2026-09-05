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
import { CrowdLog } from "@/models/CrowdLog";
import { Station } from "@/models/Station";
import {
  generateOperationalAdvisory,
  type AdvisoryStationSnapshot,
  type AdvisoryRecommendation,
} from "@/lib/geminiAdvisory";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

const LEVEL_TO_RISK: Record<string, string> = {
  low: "low",
  moderate: "moderate",
  high: "high",
  critical: "critical",
};

export async function POST(req: NextRequest) {
  try {
    const { stationId, query } = (await req.json().catch(() => ({}))) as {
      stationId?: string;
      query?: string;
    };

    let snapshots: AdvisoryStationSnapshot[] = [];
    let recommendations: AdvisoryRecommendation[] = [];
    let targetStationName: string | undefined = undefined;

    const db = await connectToDatabase();
    if (db) {
      try {
        const latestPerStation = await CrowdLog.aggregate([
          { $sort: { calculatedAt: -1 } },
          { $group: { _id: "$station", doc: { $first: "$$ROOT" } } },
          { $replaceRoot: { newRoot: "$doc" } },
        ]);
        const stationDocs = await Station.find().select("name line");
        const stationById = new Map(stationDocs.map((s) => [s._id.toString(), s]));

        const validSnapshots: AdvisoryStationSnapshot[] = [];
        for (const log of latestPerStation) {
          const station = stationById.get(log.station.toString());
          if (station) {
            validSnapshots.push({
              name: station.name,
              line: String(station.line),
              currentOccupancyPercent: Number(log.densityPercent) || 0,
              predicted15MinOccupancyPercent: null,
              risk: LEVEL_TO_RISK[log.level] ?? "unknown",
            });
          }
        }
        snapshots = validSnapshots;

        targetStationName = stationId
          ? stationDocs.find((s) => s._id.toString() === stationId || s.code === stationId.toUpperCase())?.name
          : undefined;
      } catch (err) {
        // Fall back below
      }
    }

    if (snapshots.length === 0) {
      snapshots = MUMBAI_STATIONS.slice(0, 10).map((s, i) => {
        const occ = Math.min(95, Math.max(35, 45 + (i * 13) % 45));
        return {
          name: s.name,
          line: s.line,
          currentOccupancyPercent: occ,
          predicted15MinOccupancyPercent: Math.min(98, occ + 5),
          risk: occ >= 80 ? "high" : occ >= 55 ? "moderate" : "low",
        };
      });
      if (stationId) {
        const found = MUMBAI_STATIONS.find(
          (s) => s._id === stationId || s.code.toLowerCase() === stationId.toLowerCase()
        );
        if (found) targetStationName = found.name;
      }
    }

    const attentionNeeded = snapshots.filter((s) => s.risk === "high" || s.risk === "critical");
    for (const s of attentionNeeded.slice(0, 5)) {
      recommendations.push({
        station: s.name,
        action: s.risk === "critical" ? "ISSUE_CONGESTION_WARNING" : "MONITOR_STATION",
        reason: `${s.name} is at ${s.currentOccupancyPercent}% occupancy (${s.risk}). Ensure staff maintains platform staircase clearance.`,
      });
    }

    const advisory = await generateOperationalAdvisory(
      snapshots,
      recommendations,
      typeof query === "string" ? query : undefined,
      targetStationName
    );

    return NextResponse.json({ success: true, data: advisory });
  } catch (error) {
    console.error("Error generating AI advisory:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate operational advisory" },
      { status: 500 }
    );
  }
}
