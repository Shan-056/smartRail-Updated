// ============================================================
// app/api/auth/login/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/login (the "Master Login" form). The
// user submits a username + password. We find the matching
// user, check the password is correct, and if so, hand back a
// login cookie (token) plus basic profile info. If the username
// doesn't exist or the password is wrong, we send back the exact
// same generic error either way — this stops attackers from
// figuring out which usernames are real just by trying to log in.
//
// Two layers of brute-force protection:
//   1. IP rate limit (middleware/rateLimit.ts) — caps how many
//      login attempts any single IP can make per minute.
//   2. Per-account lockout — after too many wrong passwords for
//      THIS username specifically, it's temporarily locked, even
//      from a different IP.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { generateAuthCookie } from "@/lib/generateToken";
import { enforceRateLimit, resetRateLimit, RateLimitError } from "@/middleware/rateLimit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    // Max 10 login attempts per IP per minute, across all accounts.
    enforceRateLimit(req, "login", { maxAttempts: 10, windowMs: 60 * 1000 });

    await connectToDatabase();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
    }

    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { message: `This account is temporarily locked from too many failed attempts. Try again in ${minutesLeft} min.` },
        { status: 429 }
      );
    }

    const passwordOk = await user.matchPassword(password);

    if (!passwordOk) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    // Success — clear both the account lock counter and this IP's
    // rate-limit bucket for the login scope.
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();
    resetRateLimit(req, "login");

    const response = NextResponse.json({
      message: "Logged in successfully.",
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });

    const cookie = generateAuthCookie(user._id.toString());
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status, headers: { "Retry-After": String(error.retryAfterSeconds) } }
      );
    }
    return NextResponse.json(
      { message: "Server error during login.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
