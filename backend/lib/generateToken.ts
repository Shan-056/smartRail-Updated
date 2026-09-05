// ============================================================
// lib/generateToken.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Creates a signed "login token" (JWT) for a user right after
// they log in successfully, packaged up as a secure cookie
// ready to attach to the response. The browser/app then
// automatically sends this cookie back on every future request,
// so the user doesn't have to log in again on every API call.
// ============================================================

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

/**
 * generateAuthCookie
 * Human explanation: Takes a user's database ID, creates a
 * signed token proving "this really is user X, verified by our
 * server", and returns cookie settings ready to hand to
 * NextResponse.cookies.set(). HttpOnly means frontend JavaScript
 * can never read or tamper with it, which protects against
 * certain attacks.
 */
export function generateAuthCookie(userId: string) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  return {
    name: "token",
    value: token,
    options: {
      httpOnly: true, // JavaScript in the browser cannot access this cookie
      secure: process.env.NODE_ENV === "production", // HTTPS-only in production
      sameSite: "strict" as const, // Cookie only sent for same-site requests (CSRF protection)
      maxAge: 24 * 60 * 60, // 1 day, in seconds
      path: "/",
    },
  };
}
