import { NextRequest, NextResponse } from "next/server";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export async function GET(req: NextRequest) {
  const stationId = req.nextUrl.searchParams.get("stationId") || "";
  const station =
    MUMBAI_STATIONS.find(
      (s) => s._id === stationId || s.code.toLowerCase() === stationId.toLowerCase()
    ) || MUMBAI_STATIONS[0];

  const etaMinutes = 2 + (station.sequence % 6);

  return NextResponse.json({
    prediction: {
      trainId: `TR-${1000 + station.sequence * 12}`,
      trainNumber: `90${200 + station.sequence}`,
      etaMinutes,
      confidence: 0.92,
      aiAssisted: true,
      calculatedAt: new Date().toISOString(),
    },
  });
}
