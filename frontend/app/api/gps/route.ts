import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: true, message: "GPS ping recorded (Simulation Mode)" });
}

export async function GET() {
  return NextResponse.json({ count: 0, pings: [] });
}
