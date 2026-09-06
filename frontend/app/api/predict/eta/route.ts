// ============================================================
// app/api/predict/eta/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/predict/eta?stationId=.... This is what the
// frontend's "ETA / Live Trains" card calls for a station: it
// finds every train currently heading there, forces a fresh
// AI-first ETA recalculation for each one, and returns the list
// sorted soonest-first. Requires login (any role).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Train } from "@/models/Train";
import { recalculateEtaForTrain } from "@/services/analyticsEngine";
import { MUMBAI_STATIONS, getStationDepartures } from "@/lib/networkFallback";

export async function GET(req: NextRequest) {
  try {
    const stationId = req.nextUrl.searchParams.get("stationId");
    if (!stationId) {
      return NextResponse.json({ message: "stationId query parameter is required." }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (db) {
      try {
        const approachingTrains = await Train.find({ nextStation: stationId, status: "running" })
          .select("_id trainNumber direction")
          .lean();

        if (approachingTrains && approachingTrains.length > 0) {
          const predictions = await Promise.all(
            approachingTrains.map(async (t) => {
              const etaLog = await recalculateEtaForTrain(t._id.toString());
              return etaLog ? { train: t.trainNumber, direction: t.direction, ...etaLog.toObject() } : null;
            })
          );

          const sorted = predictions.filter(Boolean).sort((a: any, b: any) => a.etaMinutes - b.etaMinutes);
          if (sorted.length > 0) {
            return NextResponse.json({ stationId, count: sorted.length, predictions: sorted });
          }
        }
      } catch (err) {
        // Fall through to fallback
      }
    }

    // Fallback predictions
    const station = MUMBAI_STATIONS.find(
      (s) => s._id === stationId || s.code.toLowerCase() === stationId.toLowerCase()
    ) || MUMBAI_STATIONS[0];

    const departures = getStationDepartures(station);
    const predictions = departures.map((d) => ({
      train: d.trainNumber,
      direction: d.destination,
      etaMinutes: d.minutesAway,
      platform: d.platform,
      crowdPercent: d.crowdPercent,
      crowdLevel: d.crowdLevel,
      type: d.type,
      status: d.status,
    }));

    return NextResponse.json({ stationId, count: predictions.length, predictions });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to compute ETA predictions.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
