import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: true, message: "Ingestion accepted (Simulation Mode)" });
}

export async function GET() {
  return NextResponse.json({ count: 0, items: [] });
}
