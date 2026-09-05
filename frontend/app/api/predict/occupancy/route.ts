import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const trainId = req.nextUrl.searchParams.get("trainId") || "90214";
  return NextResponse.json({
    prediction: {
      trainId,
      predictedOccupancy: 0.78,
      direction: "Down",
      status: "running",
    },
  });
}
