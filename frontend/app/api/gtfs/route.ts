import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    stationsCreated: 0,
    routesCreated: 0,
    tripsCreated: 0,
    stopTimesCreated: 0,
    message: "GTFS ingestion simulated in frontend standalone mode.",
  });
}
