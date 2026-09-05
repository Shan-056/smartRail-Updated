// ============================================================
// app/api/auth/reset-password/route.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Handles POST /api/auth/reset-password. Takes the username, the
// one-time code from /api/auth/forgot-password, and a new
// password. If the code matches, hasn't expired, and belongs to
// that username, the password is updated (the User model's
// pre-save hook re-hashes it automatically) and the code is
// cleared so it can't be reused.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const { username, token, newPassword } = await req.json();

    if (!username || !token || !newPassword) {
      return NextResponse.json(
        { message: "Username, token, and new password are all required." },
        { status: 400 }
      );
    }
    if (String(newPassword).length < 8) {
      return NextResponse.json({ message: "New password must be at least 8 characters." }, { status: 400 });
    }

    await connectToDatabase();

    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    const user = await User.findOne({ username }).select("+resetPasswordTokenHash +resetPasswordExpires");

    const isValid =
      user &&
      user.resetPasswordTokenHash === tokenHash &&
      user.resetPasswordExpires &&
      user.resetPasswordExpires.getTime() > Date.now();

    if (!isValid || !user) {
      return NextResponse.json({ message: "Reset code is invalid or has expired." }, { status: 400 });
    }

    user.password = newPassword;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return NextResponse.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    return NextResponse.json(
      { message: "Server error while resetting password.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
