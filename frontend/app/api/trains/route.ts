// ============================================================
// app/api/trains/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/trains. Returns currently known trains,
// along with which station they're at/near right now. Supports
// optional ?line= and ?status= filters.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Train } from "@/models/Train";
import { getSimulatedTrains } from "@/lib/simulatedDigitalTwin";

export async function GET(req: NextRequest) {
  const line = req.nextUrl.searchParams.get("line");
  const status = req.nextUrl.searchParams.get("status");

  try {
    const db = await connectToDatabase();
    if (db) {
      const filter: Record<string, string> = {};
      if (line) filter.line = line;
      if (status) filter.status = status;

      const trains = await Train.find(filter)
        .populate("currentStation", "name code")
        .populate("nextStation", "name code")
        .sort({ trainNumber: 1 });

      if (trains && trains.length > 0) {
        return NextResponse.json({ count: trains.length, trains });
      }
    }
  } catch {
    // Silently fall through to simulated digital twin trains
  }

  const fallbackTrains = getSimulatedTrains(line, status);
  return NextResponse.json({ count: fallbackTrains.length, trains: fallbackTrains });
}
