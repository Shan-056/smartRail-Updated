// ============================================================
// app/api/auth/me/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles GET /api/auth/me. Lets the frontend ask "who is
// currently logged in?" — handy for restoring a logged-in
// session after a page refresh. Reads the login cookie, checks
// it's valid, and returns that user's basic info.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return NextResponse.json({
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Unexpected server error." }, { status: 500 });
  }
}
