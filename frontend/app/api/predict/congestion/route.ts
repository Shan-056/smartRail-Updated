import { NextRequest, NextResponse } from "next/server";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";
import { riskFromDensity } from "@/lib/network";

export async function GET(req: NextRequest) {
  const stationId = req.nextUrl.searchParams.get("stationId") || "";
  const fallbackStation =
    MUMBAI_STATIONS.find(
      (s) => s._id === stationId || s.code.toLowerCase() === stationId.toLowerCase()
    ) || MUMBAI_STATIONS[0];

  const seq = fallbackStation.sequence;
  const currentDensity = Math.min(95, Math.max(30, 48 + ((seq * 9) % 40)));
  const surgeRisk15Min = Math.min(90, Math.max(20, currentDensity + 10));

  return NextResponse.json({
    prediction: {
      stationId,
      stationName: fallbackStation.name,
      currentDensity,
      currentRisk: riskFromDensity(currentDensity),
      surgeRisk15Min,
      forecastRisk: riskFromDensity(surgeRisk15Min),
      advisory:
        surgeRisk15Min > 75
          ? "High platform influx anticipated in next 15 minutes. Consider alternate coach positions or delayed entry."
          : "Station platform flow is operating within normal throughput parameters.",
      calculatedAt: new Date().toISOString(),
    },
  });
}
