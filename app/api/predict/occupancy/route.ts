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
import { Train } from "@/models/Train";
import { predictOccupancyForTrain } from "@/services/analyticsEngine";
import { getSimulatedOccupancies } from "@/lib/simulatedDigitalTwin";

export async function GET(req: NextRequest) {
  const stationId = req.nextUrl.searchParams.get("stationId");
  if (!stationId) {
    return NextResponse.json({ message: "stationId query parameter is required." }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    if (db) {
      const approachingTrains = await Train.find({ nextStation: stationId, status: "running" })
        .select("_id")
        .lean();

      if (approachingTrains && approachingTrains.length > 0) {
        const predictions = await Promise.all(
          approachingTrains.map((t) => predictOccupancyForTrain(t._id.toString()))
        );
        const filtered = predictions.filter(Boolean);
        if (filtered.length > 0) {
          return NextResponse.json({ stationId, count: filtered.length, predictions: filtered });
        }
      }
    }
  } catch {
    // Fall through to digital twin fallback
  }

  const simulated = getSimulatedOccupancies(stationId);
  return NextResponse.json({ stationId, count: simulated.length, predictions: simulated });
}
