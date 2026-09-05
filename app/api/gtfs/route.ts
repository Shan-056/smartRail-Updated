// ============================================================
// app/api/gtfs/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/gtfs — the "timetable import" endpoint. An
// admin uploads GTFS data (the standard transit timetable
// format — see services/gtfsImport.ts for details) and this
// route parses it and creates/updates Station and Route records
// from it in bulk, instead of hand-entering every station.
//
// Only "admin" accounts may call this — importing a timetable
// can create or overwrite a lot of data at once, so it's
// deliberately more locked-down than the sensor ingestion routes.
//
// EXPECTED REQUEST BODY (JSON):
// {
//   "line": "Western",              // which of our 4 lines this feed is for
//   "stopsCsv": "stop_id,stop_name,stop_lat,stop_lon\n...",
//   "routesCsv": "route_id,route_long_name\n...",
//   "tripsCsv": "trip_id,route_id\n...",
//   "stopTimesCsv": "trip_id,stop_id,stop_sequence,arrival_time,departure_time\n..."
// }
// Each *Csv field is the raw text content of the matching GTFS
// file (stops.txt, routes.txt, trips.txt, stop_times.txt).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole, AuthError } from "@/middleware/auth";
import { parseGtfsCsv, importGtfsFeed } from "@/services/gtfsImport";
import type { Line } from "@/models/Station";

const VALID_LINES: Line[] = ["Western", "Central", "Harbour", "Trans-Harbour"];

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await requireAuth(req);
    requireRole(user, ["admin"]);

    const { line, stopsCsv, routesCsv, tripsCsv, stopTimesCsv } = await req.json();

    if (!line || !VALID_LINES.includes(line)) {
      return NextResponse.json(
        { message: `line is required and must be one of: ${VALID_LINES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!stopsCsv || !routesCsv || !tripsCsv || !stopTimesCsv) {
      return NextResponse.json(
        { message: "stopsCsv, routesCsv, tripsCsv and stopTimesCsv are all required." },
        { status: 400 }
      );
    }

    // Turn the raw CSV text of each GTFS file into arrays of row objects
    const stops = parseGtfsCsv<{ stop_id: string; stop_name: string; stop_lat: string; stop_lon: string }>(
      stopsCsv
    );
    const routes = parseGtfsCsv<{ route_id: string; route_long_name: string }>(routesCsv);
    const trips = parseGtfsCsv<{ trip_id: string; route_id: string }>(tripsCsv);
    const stopTimes = parseGtfsCsv<{
      trip_id: string;
      stop_id: string;
      stop_sequence: string;
      arrival_time: string;
      departure_time: string;
    }>(stopTimesCsv);

    const result = await importGtfsFeed({ stops, routes, trips, stopTimes, line });

    return NextResponse.json({ message: "GTFS import complete.", result }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { message: "Failed to import GTFS feed.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
