import { NextRequest, NextResponse } from "next/server";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const station =
    MUMBAI_STATIONS.find(
      (s) => s._id === params.id || s.code.toLowerCase() === params.id.toLowerCase()
    ) || MUMBAI_STATIONS[0];

  const platformCount = station.platformCount || 4;
  const zoneNames = [
    ...Array.from({ length: platformCount }, (_, i) => `platform-${i + 1}`),
    "concourse",
    "entry-gate",
  ];

  const baseDensity = Math.min(92, Math.max(30, 50 + ((station.sequence * 7) % 35)));
  const zones = zoneNames.map((zoneName, index) => ({
    zone: zoneName,
    intensity: Math.min(98, Math.max(20, baseDensity + ((index * 13) % 25) - 10)),
    source: "simulation" as const,
  }));

  return NextResponse.json({
    stationId: station._id,
    stationName: station.name,
    overallDensity: baseDensity,
    zones,
  });
}
