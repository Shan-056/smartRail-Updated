// ============================================================
// app/api/auth/google/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/google — the "Sign up / Continue with
// Google" button. The frontend uses Google's own Identity
// Services script to pop up Google's login screen; Google then
// hands the frontend a signed "ID token" proving who the person
// is. The frontend sends THAT token here.
//
// We ask Google's servers to verify the token is genuine and not
// tampered with, pull the person's email/name out of it, and
// then either:
//   - find an existing account with that Google ID and log them
//     straight in, or
//   - create a brand-new "passenger" account for them (this is
//     the "signup" half — no separate signup form needed).
// Either way we finish by issuing our own normal JWT cookie, so
// from here on the rest of the app treats Google users exactly
// like any other logged-in user.
//
// SETUP: create an OAuth 2.0 Client ID in Google Cloud Console
// (APIs & Services → Credentials → OAuth client ID → "Web
// application"), then set GOOGLE_CLIENT_ID in .env to it (the
// same value is also used by the frontend to render the button).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { generateAuthCookie } from "@/lib/generateToken";
import { enforceRateLimit, RateLimitError } from "@/middleware/rateLimit";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    enforceRateLimit(req, "google-auth", { maxAttempts: 15, windowMs: 60 * 1000 });

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { message: "Google sign-in isn't configured on the server yet (GOOGLE_CLIENT_ID missing)." },
        { status: 501 }
      );
    }

    const { credential } = await req.json();
    if (!credential) {
      return NextResponse.json({ message: "Missing Google credential token." }, { status: 400 });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return NextResponse.json({ message: "Invalid or expired Google credential." }, { status: 401 });
    }

    if (!payload?.sub || !payload.email) {
      return NextResponse.json({ message: "Google account did not return the expected profile info." }, { status: 400 });
    }

    await connectToDatabase();

    let user = await User.findOne({ googleId: payload.sub });

    if (!user) {
      // No account tied to this Google ID yet — check if the email is
      // already used by a local-password account first, to avoid
      // silently creating a duplicate identity for the same person.
      user = await User.findOne({ email: payload.email.toLowerCase() });

      if (user && user.authProvider === "local") {
        // Link the Google identity to their existing local account.
        user.googleId = payload.sub;
        await user.save();
      } else if (!user) {
        // Brand new person — this is the "signup" path.
        const baseUsername = payload.email.split("@")[0];
        let username = baseUsername;
        let suffix = 0;
        // Usernames must be unique — nudge with a numeric suffix on collision.
        while (await User.findOne({ username })) {
          suffix += 1;
          username = `${baseUsername}${suffix}`;
        }

        user = await User.create({
          username,
          email: payload.email.toLowerCase(),
          googleId: payload.sub,
          authProvider: "google",
          role: "passenger",
        });
      }
    }

    const response = NextResponse.json({
      message: "Logged in with Google successfully.",
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
      { message: "Google sign-in failed.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
