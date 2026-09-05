// ============================================================
// app/api/stations/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/stations. Returns the full list of stations
// so the frontend can draw the network map / station picker.
// Supports an optional ?line=Western filter. Requires the
// caller to be logged in (any role).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, AuthError } from "@/middleware/auth";
import { Station } from "@/models/Station";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await requireAuth(req);

    const line = req.nextUrl.searchParams.get("line");
    const filter = line ? { line } : {};

    const stations = await Station.find(filter).sort({ name: 1 });
    return NextResponse.json({ count: stations.length, stations });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to fetch stations.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
