// ============================================================
// app/api/auth/logout/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/logout. Clears the login cookie from
// the user's browser so future requests are no longer
// authenticated. Nothing needs to change in the database — JWT
// logins are "stateless", so logging out just means "forget
// the token".
// ============================================================

import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully." });

  // Overwrite the cookie with an already-expired one, which
  // instructs the browser to delete it immediately.
  response.cookies.set("token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
