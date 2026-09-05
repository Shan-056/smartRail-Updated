// ============================================================
// app/api/health/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// A simple "is the server alive?" check — no login required.
// Useful for uptime monitors and for quickly confirming the
// server started correctly.
// ============================================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
