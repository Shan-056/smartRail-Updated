import { NextResponse } from "next/server";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export async function GET() {
  const points = MUMBAI_STATIONS.map((station) => {
    const density = (45 + ((station.sequence * 7) % 40)) / 100;
    return {
      stationId: station._id,
      name: station.name,
      code: station.code,
      lat: station.location.lat,
      lng: station.location.lng,
      intensity: density,
    };
  });

  return NextResponse.json({ count: points.length, points });
}
