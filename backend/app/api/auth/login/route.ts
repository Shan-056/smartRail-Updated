// ============================================================
// app/api/auth/login/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/login. The user submits a username +
// password. We find the matching user, check the password is
// correct, and if so, hand back a login cookie (token) plus
// basic profile info. If the username doesn't exist or the
// password is wrong, we send back the exact same generic error
// either way — this stops attackers from figuring out which
// usernames are real just by trying to log in.
//
// ADDED: brute-force protection. After 5 failed attempts for the
// same username+IP combination, further attempts are blocked for
// 1 minute (used by the Master Login screen on the frontend).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { generateAuthCookie } from "@/lib/generateToken";
import { checkRateLimit, registerFailure, resetLimit, getClientIp } from "@/lib/rateLimiter";

const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 60 * 1000, // a run of failures older than 1 min doesn't count
  lockoutMs: 60 * 1000, // once locked, wait 1 min before trying again
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(totalSeconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
    }

    const rateLimitKey = `login:${getClientIp(req)}:${String(username).toLowerCase()}`;
    const status = checkRateLimit(rateLimitKey, LOGIN_RATE_LIMIT);
    if (status.blocked) {
      return NextResponse.json(
        {
          message: `Too many failed attempts. Try again in ${formatDuration((status.retryAfterSeconds || 0) * 1000)}.`,
          lockedOut: true,
          retryAfterSeconds: status.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const user = await User.findOne({ username });

    if (!user || !(await user.matchPassword(password))) {
      const failure = registerFailure(rateLimitKey, LOGIN_RATE_LIMIT);
      return NextResponse.json(
        {
          message: failure.blocked
            ? `Too many failed attempts. Try again in ${formatDuration((failure.retryAfterSeconds || 0) * 1000)}.`
            : "Invalid username or password.",
          lockedOut: failure.blocked,
          attemptsRemaining: failure.attemptsRemaining,
          retryAfterSeconds: failure.retryAfterSeconds,
        },
        { status: failure.blocked ? 429 : 401 }
      );
    }

    // Correct credentials — clear this key's failed-attempt history.
    resetLimit(rateLimitKey);

    const response = NextResponse.json({
      message: "Logged in successfully.",
      user: { id: user._id, username: user.username, role: user.role, name: user.name, email: user.email },
    });

    const cookie = generateAuthCookie(user._id.toString());
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Server error during login.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
