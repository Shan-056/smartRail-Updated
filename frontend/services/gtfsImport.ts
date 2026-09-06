// ============================================================
// services/gtfsImport.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// GTFS ("General Transit Feed Specification") is the standard
// worldwide format transit agencies use to publish their
// timetables — it's just a handful of CSV files bundled together
// (stops.txt, routes.txt, trips.txt, stop_times.txt, etc). This
// file knows how to read that CSV text and turn it into our own
// Station and Route database records, so instead of hand-typing
// every station and route (like scripts/seed.ts does for test
// data), we can import a real, official timetable in one go.
//
// WHAT THIS FILE DOES NOT DO YET:
// A full GTFS feed has many more files (calendar.txt, agency.txt,
// fare rules, etc.) that we don't need for this project. This
// import intentionally only reads the four files that map onto
// our own Station/Route/Train collections: stops.txt, routes.txt,
// trips.txt, and stop_times.txt. If the team later needs richer
// schedule data (exact clock times, days of operation), this is
// the file to extend.
// ============================================================

import { Station, type Line } from "@/models/Station";
import { Route } from "@/models/Route";

// --- Minimal shapes of the GTFS CSV rows we actually use ---
// (Real GTFS files have many more columns than this — we only
// read the ones relevant to our project.)

interface GtfsStopRow {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
}

interface GtfsRouteRow {
  route_id: string;
  route_long_name: string;
}

interface GtfsTripRow {
  trip_id: string;
  route_id: string;
}

interface GtfsStopTimeRow {
  trip_id: string;
  stop_id: string;
  stop_sequence: string;
  arrival_time: string;
  departure_time: string;
}

export interface GtfsImportPayload {
  stops: GtfsStopRow[];
  routes: GtfsRouteRow[];
  trips: GtfsTripRow[];
  stopTimes: GtfsStopTimeRow[];
  // Which of our own four suburban lines this whole feed belongs to,
  // since GTFS itself doesn't know about Mumbai's line naming.
  line: Line;
}

export interface GtfsImportResult {
  stationsCreated: number;
  stationsUpdated: number;
  routesCreated: number;
  routesUpdated: number;
  warnings: string[];
}

/**
 * parseGtfsCsv
 * Human explanation: Takes the raw text of one GTFS CSV file
 * (e.g. the contents of stops.txt) and turns it into an array of
 * plain objects, one per row, using the first line as column
 * headers. This is a small, dependency-free CSV reader — good
 * enough for well-formed GTFS files, which don't normally contain
 * tricky edge cases like commas inside quoted fields for the
 * columns we care about.
 */
export function parseGtfsCsv<T>(csvText: string): T[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    rows.push(row as T);
  }

  return rows;
}

/**
 * importGtfsFeed
 * Human explanation: The main import function. Given already-
 * parsed GTFS stops/routes/trips/stop_times, it:
 *   1. Creates or updates a Station record for every GTFS stop
 *   2. Creates or updates a Route record for every GTFS route,
 *      using stop_times to work out the ordered sequence of
 *      stations and rough travel time between them
 * Returns a summary of what was created/updated, plus any rows
 * that had to be skipped (e.g. a stop_time referencing a stop
 * that wasn't in stops.txt) so the caller can see what happened.
 */
export async function importGtfsFeed(payload: GtfsImportPayload): Promise<GtfsImportResult> {
  const { stops, routes, trips, stopTimes, line } = payload;
  const warnings: string[] = [];

  let stationsCreated = 0;
  let stationsUpdated = 0;

  // Step 1: import stops → stations. We key on a short "code"
  // derived from the GTFS stop_id, since our Station model expects
  // a unique code the same way real station boards use one.
  const stationIdByGtfsStopId = new Map<string, string>();

  for (const stop of stops) {
    if (!stop.stop_id || !stop.stop_name || !stop.stop_lat || !stop.stop_lon) {
      warnings.push(`Skipped an incomplete stop row: ${JSON.stringify(stop)}`);
      continue;
    }

    const code = stop.stop_id.toUpperCase().slice(0, 10);
    const existing = await Station.findOne({ code });

    const stationDoc = await Station.findOneAndUpdate(
      { code },
      {
        code,
        name: stop.stop_name,
        line,
        location: { lat: parseFloat(stop.stop_lat), lng: parseFloat(stop.stop_lon) },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (existing) stationsUpdated++;
    else stationsCreated++;

    stationIdByGtfsStopId.set(stop.stop_id, stationDoc._id.toString());
  }

  // Step 2: import routes, using stop_times to build the ordered
  // stop sequence for each route (via trips linking routes to trip_ids,
  // and stop_times linking trip_ids to an ordered list of stops).
  let routesCreated = 0;
  let routesUpdated = 0;

  for (const gtfsRoute of routes) {
    // Find one representative trip for this route to read its stop order from.
    // (A real GTFS route can have many trips with slightly different
    // patterns — for this project we just need ONE representative
    // pattern per route, not a full schedule.)
    const trip = trips.find((t) => t.route_id === gtfsRoute.route_id);
    if (!trip) {
      warnings.push(`Route ${gtfsRoute.route_id} has no matching trip — skipped.`);
      continue;
    }

    const tripStopTimes = stopTimes
      .filter((st) => st.trip_id === trip.trip_id)
      .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));

    if (tripStopTimes.length < 2) {
      warnings.push(`Route ${gtfsRoute.route_id} has fewer than 2 stops — skipped.`);
      continue;
    }

    const stopsForRoute = [];
    for (let i = 0; i < tripStopTimes.length; i++) {
      const st = tripStopTimes[i];
      const stationId = stationIdByGtfsStopId.get(st.stop_id);
      if (!stationId) {
        warnings.push(`Stop ${st.stop_id} in route ${gtfsRoute.route_id} was never defined in stops.txt — skipped.`);
        continue;
      }

      // Estimate travel time from the previous stop using the
      // difference between GTFS arrival times (HH:MM:SS format).
      let avgTravelTimeMin = 3;
      if (i > 0) {
        const prevMinutes = gtfsTimeToMinutes(tripStopTimes[i - 1].departure_time);
        const thisMinutes = gtfsTimeToMinutes(st.arrival_time);
        if (prevMinutes !== null && thisMinutes !== null && thisMinutes >= prevMinutes) {
          avgTravelTimeMin = thisMinutes - prevMinutes;
        }
      }

      stopsForRoute.push({ station: stationId, sequence: i + 1, avgTravelTimeMin });
    }

    const existingRoute = await Route.findOne({ name: gtfsRoute.route_long_name, line });

    await Route.findOneAndUpdate(
      { name: gtfsRoute.route_long_name, line },
      { name: gtfsRoute.route_long_name, line, category: "Slow", stops: stopsForRoute },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (existingRoute) routesUpdated++;
    else routesCreated++;
  }

  return { stationsCreated, stationsUpdated, routesCreated, routesUpdated, warnings };
}

/**
 * gtfsTimeToMinutes
 * Human explanation: GTFS times look like "14:05:00" (and can even
 * go past "24:00:00" for trips that run past midnight). This turns
 * that into a plain number of minutes since midnight, so we can
 * subtract two times to get a travel duration. Returns null if the
 * text isn't a valid GTFS time.
 */
function gtfsTimeToMinutes(gtfsTime: string): number | null {
  const parts = gtfsTime.split(":").map(Number);
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
  const [hours, minutes] = parts;
  return hours * 60 + minutes;
}
