import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    environment: "frontend-standalone",
    timestamp: new Date().toISOString(),
  });
}
