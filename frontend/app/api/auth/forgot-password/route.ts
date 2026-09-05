import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({
    message: "Password reset OTP has been dispatched to your registered email/mobile.",
  });
}
