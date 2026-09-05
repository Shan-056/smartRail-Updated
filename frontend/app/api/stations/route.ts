import { NextRequest, NextResponse } from "next/server";
import { MUMBAI_STATIONS } from "@/lib/networkFallback";

export async function GET(req: NextRequest) {
  const line = req.nextUrl.searchParams.get("line");
  const corridor = req.nextUrl.searchParams.get("corridor");

  let stations = MUMBAI_STATIONS;
  if (line) stations = stations.filter((s) => s.line === line);
  if (corridor) stations = stations.filter((s) => s.corridor === corridor);

  return NextResponse.json({ count: stations.length, stations });
}
