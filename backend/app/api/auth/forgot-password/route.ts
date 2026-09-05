// ============================================================
// app/api/auth/forgot-password/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/forgot-password. The person types their
// Master username and asks for a reset link. We generate a
// random one-time code, save only a hashed version of it (so
// even someone with database access can't reuse it directly),
// and give it a 15-minute expiry.
//
// NOTE — no email service is wired up yet: this project has no
// SMTP/SendGrid/Resend configured, so instead of silently doing
// nothing, this route hands the reset token straight back in the
// response outside of production (NODE_ENV !== "production") so
// the Master Login screen can show it directly for this demo/dev
// setup. In production it deliberately withholds the token and
// just logs it server-side — plug in a real mail provider and
// email it instead of returning/logging it.
//
// Always responds with the same generic message whether or not
// the username exists, so this can't be used to check which
// usernames are real.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { checkRateLimit, registerFailure, getClientIp } from "@/lib/rateLimiter";

const FORGOT_PASSWORD_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockoutMs: 15 * 60 * 1000,
};

const GENERIC_MESSAGE = "If a Master account with that username exists, a reset code has been generated.";

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ message: "Username is required." }, { status: 400 });
    }

    const rateLimitKey = `forgot:${getClientIp(req)}:${String(username).toLowerCase()}`;
    const status = checkRateLimit(rateLimitKey, FORGOT_PASSWORD_RATE_LIMIT);
    if (status.blocked) {
      return NextResponse.json(
        {
          message: `Too many reset requests. Try again in ${Math.ceil((status.retryAfterSeconds || 0) / 60)} minute(s).`,
          lockedOut: true,
          retryAfterSeconds: status.retryAfterSeconds,
        },
        { status: 429 }
      );
    }
    registerFailure(rateLimitKey, FORGOT_PASSWORD_RATE_LIMIT);

    await connectToDatabase();
    const user = await User.findOne({ username, role: "admin" });

    if (!user) {
      // Same response as the success path — don't reveal whether the username exists.
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      // No email provider configured — log it so an operator can retrieve it
      // from the server logs, instead of silently discarding it.
      console.log(`[forgot-password] Reset token for "${username}": ${rawToken} (expires in 15 min)`);
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    // Dev/demo convenience: hand the token straight back so the UI can
    // show a working "reset link" without a real mail server.
    return NextResponse.json({ message: GENERIC_MESSAGE, resetToken: rawToken });
  } catch (error) {
    return NextResponse.json(
      { message: "Server error while requesting password reset.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
