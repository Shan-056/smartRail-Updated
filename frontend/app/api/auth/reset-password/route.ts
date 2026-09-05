import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({
    message: "Password updated successfully. You may now log in.",
  });
}
