// ============================================================
// app/api/auth/google/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/google. The frontend's "Continue with
// Google" button gets a signed ID token from Google Identity
// Services and sends it here. We ask Google to confirm the token
// is genuine and read the person's Google email out of it, then
// either log them into their existing Master account or create
// a brand-new one (first-time Google sign-up) — this is the
// "Google signup" side of Master Login.
//
// Only accounts with role "admin" are treated as Master accounts.
// The very first person to sign up with Google automatically
// becomes an admin (so there's at least one Master account to
// start with); anyone after that signs up as a regular "operator"
// unless an existing admin promotes them in the database.
//
// We verify the token by asking Google's own tokeninfo endpoint
// rather than pulling in an extra library — keeps this change
// small. For a high-traffic production deployment, swap this for
// the "google-auth-library" package's OAuth2Client.verifyIdToken,
// which verifies the signature locally instead of calling Google
// on every login.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { generateAuthCookie } from "@/lib/generateToken";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

interface GoogleTokenInfo {
  aud: string;
  sub: string;
  email: string;
  email_verified: string; // Google returns this as the string "true"/"false"
  name?: string;
  picture?: string;
  error_description?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { message: "Google Sign-In is not configured on this server (missing GOOGLE_CLIENT_ID)." },
        { status: 500 }
      );
    }

    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ message: "Missing Google ID token." }, { status: 400 });
    }

    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    const info = (await verifyRes.json()) as GoogleTokenInfo;

    if (!verifyRes.ok || info.error_description) {
      return NextResponse.json({ message: "Google Sign-In verification failed." }, { status: 401 });
    }
    if (info.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.json({ message: "Google token was not issued for this app." }, { status: 401 });
    }
    if (info.email_verified !== "true") {
      return NextResponse.json({ message: "Google account email is not verified." }, { status: 401 });
    }

    await connectToDatabase();

    let user = await User.findOne({ $or: [{ googleId: info.sub }, { email: info.email }] });

    if (!user) {
      // First-ever Google sign-up becomes the initial Master (admin) account.
      const isFirstUser = (await User.countDocuments({})) === 0;
      user = await User.create({
        username: info.email,
        email: info.email,
        name: info.name,
        googleId: info.sub,
        role: isFirstUser ? "admin" : "operator",
      });
    } else if (!user.googleId) {
      // An existing account with a matching email — link the Google identity.
      user.googleId = info.sub;
      if (!user.name && info.name) user.name = info.name;
      await user.save();
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { message: "This Google account isn't linked to a Master (admin) account yet." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      message: "Logged in with Google successfully.",
      user: { id: user._id, username: user.username, role: user.role, name: user.name, email: user.email },
    });

    const cookie = generateAuthCookie(user._id.toString());
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Server error during Google Sign-In.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
