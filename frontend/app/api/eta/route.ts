// ============================================================
// app/api/eta/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/eta. Returns the latest ETA predictions.
// Can be narrowed down with ?trainId=... or ?stationId=...
// query params to answer "when is train X arriving?" or "what's
// arriving at station Y soon?".
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, AuthError } from "@/middleware/auth";
import { EtaLog } from "@/models/EtaLog";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await requireAuth(req);

    const trainId = req.nextUrl.searchParams.get("trainId");
    const stationId = req.nextUrl.searchParams.get("stationId");

    const filter: Record<string, string> = {};
    if (trainId) filter.train = trainId;
    if (stationId) filter.targetStation = stationId;

    const etas = await EtaLog.find(filter)
      .sort({ calculatedAt: -1 })
      .limit(50)
      .populate("train", "trainNumber line direction")
      .populate("targetStation", "name code");

    return NextResponse.json({ count: etas.length, etas });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to fetch ETA data.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
