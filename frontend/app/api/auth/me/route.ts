import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      _id: "demo-commuter-1",
      name: "Suburban Commuter",
      email: "passenger@smartrail.local",
      role: "passenger",
    },
  });
}
