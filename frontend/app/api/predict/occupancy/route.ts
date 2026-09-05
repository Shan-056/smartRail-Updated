// ============================================================
// app/api/predict/occupancy/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/predict/occupancy?stationId=.... This is what
// the frontend's "Occupancy" card calls: for every train
// currently heading towards this station, it asks the AI-first
// occupancy engine "how full will this train be when it gets
// here, and how likely is it to be overcrowded?" Requires login.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, AuthError } from "@/middleware/auth";
import { Train } from "@/models/Train";
import { predictOccupancyForTrain } from "@/services/analyticsEngine";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await requireAuth(req);

    const stationId = req.nextUrl.searchParams.get("stationId");
    if (!stationId) {
      return NextResponse.json({ message: "stationId query parameter is required." }, { status: 400 });
    }

    const approachingTrains = await Train.find({ nextStation: stationId, status: "running" })
      .select("_id")
      .lean();

    const predictions = await Promise.all(
      approachingTrains.map((t) => predictOccupancyForTrain(t._id.toString()))
    );

    return NextResponse.json({ stationId, count: predictions.length, predictions: predictions.filter(Boolean) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to compute occupancy predictions.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
