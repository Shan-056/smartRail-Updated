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
import { requireAuth, AuthError } from "@/middleware/auth";
import { Train } from "@/models/Train";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await requireAuth(req);

    const line = req.nextUrl.searchParams.get("line");
    const status = req.nextUrl.searchParams.get("status");

    const filter: Record<string, string> = {};
    if (line) filter.line = line;
    if (status) filter.status = status;

    const trains = await Train.find(filter)
      .populate("currentStation", "name code")
      .populate("nextStation", "name code")
      .sort({ trainNumber: 1 });

    return NextResponse.json({ count: trains.length, trains });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to fetch trains.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
