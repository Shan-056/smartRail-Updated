// ============================================================
// app/api/gps/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/gps. Called by the onboard GPS unit of a
// train, usually every few seconds, reporting its current
// location and speed. We validate and log the ping, then
// immediately recalculate that train's ETA to its next station
// so the prediction stays fresh.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { GpsLog } from "@/models/GpsLog";
import { recalculateEtaForTrain } from "@/services/analyticsEngine";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await requireAuth(req);
    requireRole(user, ["device", "admin"]);

    const { train, location, speedKmph, distanceToNextStationM, recordedAt } = await req.json();

    if (!train || !location || location.lat === undefined || location.lng === undefined) {
      return NextResponse.json(
        { message: "train and location {lat, lng} are required." },
        { status: 400 }
      );
    }

    const log = await GpsLog.create({ train, location, speedKmph, distanceToNextStationM, recordedAt });

    const etaLog = await recalculateEtaForTrain(train);

    return NextResponse.json({ message: "GPS ping recorded.", log, etaLog }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to record GPS ping.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
