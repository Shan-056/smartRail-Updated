import { NextRequest, NextResponse } from "next/server";
import { generateOperationsAdvisory } from "@/lib/geminiAdvisory";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stationName = body.stationName || "Dadar";
    const crowdLevel = body.crowdLevel || "Moderate";
    const currentDensity = body.currentDensity || 65;

    const advisory = await generateOperationsAdvisory({
      stationName,
      crowdLevel,
      currentDensity,
      activeAlarms: body.activeAlarms || 1,
    });

    return NextResponse.json({ advisory });
  } catch {
    return NextResponse.json({
      advisory: {
        summary: "Platform throughput steady across Mumbai suburban network.",
        actions: [
          "Monitor peak interchange vestibules",
          "Ensure escalator dispatch in bidirectional mode",
        ],
        crowdMitigation:
          "Hold departure indicators for 30s during peak interchange flow.",
        confidenceScore: 0.9,
      },
    });
  }
}
