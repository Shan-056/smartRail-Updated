// ============================================================
// middleware.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// FIX (integration bug): this backend didn't have any CORS
// handling at all. That was invisible while the frontend was its
// own separate mock server, but now that the real RailFlow AI
// frontend (a different origin — its own Vite/Express server)
// needs to call this backend directly, two things were missing:
//
//   1. A browser will only send/receive the login cookie used by
//      middleware/auth.ts on a cross-origin request if the server
//      responds with an explicit `Access-Control-Allow-Origin`
//      (never "*") AND `Access-Control-Allow-Credentials: true`.
//   2. Every non-GET request from a browser is preceded by an
//      OPTIONS "preflight" request, which needs its own 2xx
//      response with the same headers — there was nothing here to
//      answer that at all, so every POST from a different origin
//      (login, GPS/CCTV/ATVM/UTS ingestion, alert ack, GTFS
//      import) would have failed before even reaching its route.
//
// CORS_ORIGIN in .env can be a single URL or a comma-separated
// list (e.g. the frontend's local dev URL AND its deployed URL).
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };

  // Reflect the requesting origin back ONLY if it's on the allow-list.
  // Access-Control-Allow-Origin can never be "*" alongside
  // Allow-Credentials: true — browsers reject that combination.
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  // Answer preflight requests directly — they should never reach
  // an actual route handler.
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const response = NextResponse.next();
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
