// ============================================================
// app/api/stations/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/stations. Returns the full list of stations
// so the frontend can draw the network map on the public landing
// page — this route is intentionally PUBLIC (no login required),
// since browsing the map is the very first thing a visitor does,
// before they ever sign in. Login is only required once someone
// wants a live prediction (see /api/predict/*).
//
// Supports optional ?line=Western and ?corridor=Kalyan-Kasara
// filters, used by the "CSMT side / Thane-Kalyan / Kasara side /
// Karjat side" corridor picker after a station is clicked.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Station } from "@/models/Station";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export async function GET(req: NextRequest) {
  try {
    const line = req.nextUrl.searchParams.get("line");
    const corridor = req.nextUrl.searchParams.get("corridor");

    let stations: any[] = [];
    const db = await connectToDatabase();

    if (db) {
      const filter: Record<string, string> = {};
      if (line) filter.line = line;
      if (corridor) filter.corridor = corridor;

      stations = await Station.find(filter).sort({ line: 1, sequence: 1 });
    }

    if (!stations || stations.length === 0) {
      stations = MUMBAI_STATIONS.filter((s) => {
        if (line && s.line !== line) return false;
        if (corridor && s.corridor !== corridor) return false;
        return true;
      });
    }

    return NextResponse.json({ count: stations.length, stations });
  } catch (error) {
    // If anything fails, return the fallback stations reliably
    const line = req.nextUrl.searchParams.get("line");
    const corridor = req.nextUrl.searchParams.get("corridor");
    const stations = MUMBAI_STATIONS.filter((s) => {
      if (line && s.line !== line) return false;
      if (corridor && s.corridor !== corridor) return false;
      return true;
    });
    return NextResponse.json({ count: stations.length, stations });
  }
}
