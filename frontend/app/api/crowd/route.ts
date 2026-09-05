import { NextRequest, NextResponse } from "next/server";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";
import { riskFromDensity } from "@/lib/network";

export async function GET(req: NextRequest) {
  const stationId = req.nextUrl.searchParams.get("stationId") || "";
  const station =
    MUMBAI_STATIONS.find(
      (s) => s._id === stationId || s.code.toLowerCase() === stationId.toLowerCase()
    ) || MUMBAI_STATIONS[0];

  const densityPercent = Math.min(95, Math.max(30, 52 + ((station.sequence * 7) % 35)));
  const estimatedCount = Math.round((station.capacity * densityPercent) / 100);

  return NextResponse.json({
    crowd: {
      station: station._id,
      stationName: station.name,
      densityPercent,
      estimatedCount,
      level: riskFromDensity(densityPercent),
      calculatedAt: new Date().toISOString(),
    },
  });
}
