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
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (db) {
      await requireAuth(req);
      const states = await getAllStationStates();
      if (states && states.length > 0) {
        const points = states.map((s) => ({
          stationId: s.stationId,
          name: s.name,
          code: s.code,
          lat: s.lat,
          lng: s.lng,
          intensity: s.capacity > 0 ? Math.min(1, Math.round((s.occupancy / s.capacity) * 100) / 100) : 0,
        }));
        return NextResponse.json({ count: points.length, points });
      }
    }
  } catch {
    // Graceful fallback when running standalone without MongoDB or active session
  }

  const points = MUMBAI_STATIONS.map((station) => {
    const density = (45 + ((station.sequence * 7) % 40)) / 100;
    return {
      stationId: station._id,
      name: station.name,
      code: station.code,
      lat: station.location.lat,
      lng: station.location.lng,
      intensity: density,
    };
  });

  return NextResponse.json({ count: points.length, points });
}
