import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({
    user: {
      _id: "google-commuter-2",
      name: "Google Suburban Commuter",
      email: "commuter@gmail.com",
      role: "passenger",
    },
  });

  res.cookies.set("auth_token", "standalone_google_token", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });

  return res;
}
