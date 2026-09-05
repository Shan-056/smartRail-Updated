import { NextRequest, NextResponse } from "next/server";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export async function GET(req: NextRequest) {
  const trainId = req.nextUrl.searchParams.get("trainId") || "TR-1048";
  return NextResponse.json({
    eta: {
      train: trainId,
      station: MUMBAI_STATIONS[0]._id,
      etaMinutes: 4,
      confidence: 0.94,
      calculatedAt: new Date().toISOString(),
    },
  });
}
