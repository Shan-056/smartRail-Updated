// ============================================================
// app/api/auth/reset-password/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/reset-password. This is step 2 of the
// "Forgot password?" flow — the user clicked the link from their
// email (or, in dev mode, the devResetLink in the previous
// response) and is now submitting a brand-new password.
//
// We hash the token they gave us and compare it to the stored
// hash (never comparing raw tokens), check it hasn't expired,
// and if everything matches, set the new password and burn the
// token immediately so it can't be reused.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { enforceRateLimit, RateLimitError } from "@/middleware/rateLimit";

export async function POST(req: NextRequest) {
  try {
    enforceRateLimit(req, "reset-password", { maxAttempts: 10, windowMs: 10 * 60 * 1000 });

    await connectToDatabase();
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ message: "email, token and newPassword are required." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordTokenHash +resetPasswordExpires");

    if (!user) {
      return NextResponse.json({ message: "This reset link is invalid or has expired." }, { status: 400 });
    }

    user.password = newPassword; // pre-save hook hashes this automatically
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    return NextResponse.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status, headers: { "Retry-After": String(error.retryAfterSeconds) } }
      );
    }
    return NextResponse.json(
      { message: "Failed to reset password.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
