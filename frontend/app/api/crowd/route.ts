// ============================================================
// app/api/crowd/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/crowd. Returns the latest crowd-density
// reading for every station (or just one, via ?stationId=...).
// This is what powers the "how busy is each station right now"
// view.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, AuthError } from "@/middleware/auth";
import { CrowdLog } from "@/models/CrowdLog";
import { Station } from "@/models/Station";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await requireAuth(req);

    const stationId = req.nextUrl.searchParams.get("stationId");

    if (stationId) {
      const latest = await CrowdLog.findOne({ station: stationId })
        .sort({ calculatedAt: -1 })
        .populate("station", "name code line");
      return NextResponse.json({ crowd: latest || null });
    }

    // No specific station requested — get the latest reading PER
    // station, by grouping on station and taking the newest entry.
    const latestPerStation = await CrowdLog.aggregate([
      { $sort: { calculatedAt: -1 } },
      { $group: { _id: "$station", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);

    await Station.populate(latestPerStation, { path: "station", select: "name code line" });

    return NextResponse.json({ count: latestPerStation.length, crowd: latestPerStation });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to fetch crowd data.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
