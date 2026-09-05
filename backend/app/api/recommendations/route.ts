// ============================================================
// app/api/recommendations/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/recommendations. The simplest possible
// "smart suggestion" layer, built on top of the crowd + ETA
// data we already have. For a given station (?stationId=...),
// it looks at upcoming trains and recommends the least crowded
// one to board, plus a plain-English tip. This is a baseline
// the AI engine can later enhance or replace.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, AuthError } from "@/middleware/auth";
import { Train } from "@/models/Train";
import { CrowdLog } from "@/models/CrowdLog";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await requireAuth(req);

    const stationId = req.nextUrl.searchParams.get("stationId");
    if (!stationId) {
      return NextResponse.json({ message: "stationId query parameter is required." }, { status: 400 });
    }

    // Find trains currently heading towards this station
    const upcomingTrains = await Train.find({ nextStation: stationId, status: "running" })
      .select("trainNumber occupancyPercent direction")
      .lean();

    if (upcomingTrains.length === 0) {
      return NextResponse.json({
        stationId,
        recommendation: "No live trains currently approaching this station.",
        options: [],
      });
    }

    // Sort so the least-crowded train comes first
    const sorted = [...upcomingTrains].sort((a, b) => a.occupancyPercent - b.occupancyPercent);
    const best = sorted[0];

    // Also check the station's own current crowd level, to advise
    // the passenger about the platform itself, not just the train
    const stationCrowd = await CrowdLog.findOne({ station: stationId }).sort({ calculatedAt: -1 });

    let advice = `Train ${best.trainNumber} looks least crowded (${best.occupancyPercent}% full) — consider boarding it.`;
    if (stationCrowd && stationCrowd.level === "critical") {
      advice += " Note: the platform itself is very crowded right now, so move carefully.";
    }

    return NextResponse.json({
      stationId,
      recommendation: advice,
      options: sorted,
      platformCrowdLevel: stationCrowd ? stationCrowd.level : "unknown",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to build recommendations.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
