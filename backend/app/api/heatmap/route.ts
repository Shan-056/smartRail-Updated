// ============================================================
// app/api/heatmap/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/heatmap. Returns a lightweight list — one
// entry per station — with just enough info for the frontend's
// Leaflet map to plot a crowd heatmap: coordinates, and a 0-1
// "intensity" score (0 = empty, 1 = at/over capacity). This is
// deliberately a smaller, simpler shape than /api/crowd, which
// returns full CrowdLog objects with source breakdowns etc. —
// the heatmap just needs pins, not the full detail.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, AuthError } from "@/middleware/auth";
import { getAllStationStates } from "@/services/digitalTwin";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await requireAuth(req);

    const states = await getAllStationStates();

    // Convert each station's raw occupancy into a 0–1 "intensity"
    // score, which is the format most map heatmap libraries (like
    // Leaflet.heat) expect. Capped at 1 even if a station is over
    // capacity, since intensity is meant to be a relative visual
    // scale, not a raw headcount.
    const points = states.map((s) => ({
      stationId: s.stationId,
      name: s.name,
      code: s.code,
      lat: s.lat,
      lng: s.lng,
      intensity: s.capacity > 0 ? Math.min(1, Math.round((s.occupancy / s.capacity) * 100) / 100) : 0,
    }));

    return NextResponse.json({ count: points.length, points });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to build heatmap data.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
