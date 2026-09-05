// ============================================================
// app/api/cctv/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/cctv. Called by the CCTV/vision analysis
// system whenever it finishes counting people in a camera
// frame. Only logged-in "device" or "admin" accounts may call
// this. We validate the data, store it, then immediately
// refresh that station's live crowd estimate so the change
// shows up in near real time.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { CctvEvent } from "@/models/CctvEvent";
import { recalculateCrowdForStation } from "@/services/analyticsEngine";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await requireAuth(req);
    requireRole(user, ["device", "admin"]);

    const { station, cameraId, zone, peopleCount, confidence, capturedAt } = await req.json();

    // Basic validation — reject the request early if required fields
    // are missing or clearly wrong, before touching the database.
    if (!station || !cameraId || peopleCount === undefined) {
      return NextResponse.json(
        { message: "station, cameraId and peopleCount are required." },
        { status: 400 }
      );
    }
    if (typeof peopleCount !== "number" || peopleCount < 0) {
      return NextResponse.json({ message: "peopleCount must be a non-negative number." }, { status: 400 });
    }

    const event = await CctvEvent.create({ station, cameraId, zone, peopleCount, confidence, capturedAt });

    // Refresh the crowd picture for this station right away
    const crowdLog = await recalculateCrowdForStation(station);

    return NextResponse.json({ message: "CCTV event recorded.", event, crowdLog }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to record CCTV event.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
