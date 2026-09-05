// ============================================================
// app/api/auth/forgot-password/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/forgot-password. The "Forgot password?"
// button on the login screen calls this with just an email
// address. We generate a random, one-time reset code, save only
// a HASH of it against the user (never the real code), and send
// the real code to the user's email.
//
// We always return the same generic success message whether or
// not that email exists in our system — otherwise an attacker
// could use this endpoint to check which emails are registered.
//
// EMAIL SENDING: no SMTP provider is configured yet. In
// development (NODE_ENV !== "production"), the reset link is
// returned directly in the JSON response AND printed to the
// server console, so the flow is fully testable end-to-end
// without any email setup. To send real emails in production,
// plug an SMTP/API-based provider (e.g. nodemailer + SMTP,
// Resend, SendGrid) into the sendResetEmail() function below —
// that is the ONLY place that needs to change.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { enforceRateLimit, RateLimitError } from "@/middleware/rateLimit";

const RESET_TOKEN_TTL_MINUTES = 30;

async function sendResetEmail(email: string, resetLink: string) {
  // TODO: replace with a real email provider before production use.
  console.log(`\n📧 [dev-mode] Password reset link for ${email}:\n   ${resetLink}\n`);
}

export async function POST(req: NextRequest) {
  try {
    // Only 5 reset requests per IP per 10 minutes — this endpoint
    // sends emails, so it needs its own, stricter limit.
    enforceRateLimit(req, "forgot-password", { maxAttempts: 5, windowMs: 10 * 60 * 1000 });

    await connectToDatabase();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const genericResponse = NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });

    const user = await User.findOne({ email: email.toLowerCase(), authProvider: "local" });
    if (!user) {
      // Same response either way — don't reveal whether the email exists.
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await user.save();

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email!)}`;
    await sendResetEmail(user.email!, resetLink);

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        message: "If an account with that email exists, a password reset link has been sent.",
        devResetLink: resetLink,
      });
    }

    return genericResponse;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status, headers: { "Retry-After": String(error.retryAfterSeconds) } }
      );
    }
    return NextResponse.json(
      { message: "Failed to process request.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
