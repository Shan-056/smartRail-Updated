import { NextResponse } from "next/server";

export async function GET() {
  const trains = [
    { trainNumber: "90214", direction: "Down", line: "Western", speedKmph: 62, status: "running" },
    { trainNumber: "90302", direction: "Up", line: "Western", speedKmph: 58, status: "running" },
    { trainNumber: "95104", direction: "Down", line: "Central", speedKmph: 65, status: "running" },
    { trainNumber: "98006", direction: "Up", line: "Harbour", speedKmph: 54, status: "running" },
  ];
  return NextResponse.json({ count: trains.length, trains });
}
