import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const station = req.nextUrl.searchParams.get("station") || "Dadar";
  return NextResponse.json({
    station,
    recommendations: [
      {
        type: "alternate_route",
        message: "Consider Fast local via Platform 4 to avoid Dadar central vestibule congestion.",
      },
      {
        type: "coach_guidance",
        message: "Middle coaches (C6-C8) currently reporting 30% lower density than end rakes.",
      },
    ],
  });
}
