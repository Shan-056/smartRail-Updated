// ============================================================
// models/User.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Defines what a "User" looks like in our database — username,
// password, and role — and adds two helper functions attached
// to every user document:
//   1. Automatically scrambling (hashing) the password before
//      it's saved, so we never store real passwords.
//   2. Checking whether a typed-in password matches the stored,
//      scrambled one, without ever un-scrambling it.
// ============================================================

import mongoose, { Schema, model, models, type Document, type Model } from "mongoose";
import bcrypt from "bcryptjs";

// Describes the shape of a User document for TypeScript, so
// anywhere we use a User, autocomplete and type-checking work.
export interface IUser extends Document {
  username: string;
  password?: string;
  role: "admin" | "operator" | "device";
  // Added for Master Login (Google Sign-In) support — a user created via
  // Google never sets a password, so `password` above is now optional.
  email?: string;
  name?: string;
  googleId?: string;
  // Added for the "Forgot password" flow — a short-lived hashed token
  // proving the person requesting the reset also controls the account.
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    // Not `required` anymore: Google Sign-In accounts authenticate via
    // googleId instead of a password.
    password: { type: String },
    // "admin" = full access, "operator" = station staff,
    // "device" = an ingestion device (CCTV box, ATVM machine, GPS unit)
    // Master Login only accepts role "admin" (see /api/auth/login).
    role: { type: String, enum: ["admin", "operator", "device"], default: "operator" },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    name: { type: String, trim: true },
    googleId: { type: String, sparse: true, unique: true },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

/**
 * Pre-save hook: runs automatically right before a user is saved.
 * Human explanation: "If the password field was just typed/changed,
 * scramble it (hash it) before writing it to the database. If the
 * password wasn't touched, skip this step to avoid double-scrambling."
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * matchPassword
 * Human explanation: Compares a plain-text password (what the user
 * just typed on the login form) against the scrambled version saved
 * in the database. Returns true/false — never reveals the original.
 * A Google-only account (no password set) never matches anything here.
 */
userSchema.methods.matchPassword = async function (enteredPassword: string) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

// Next.js hot-reloads code during development, which can try to
// re-register the same Mongoose model twice and crash. "models.User"
// reuses an already-registered model if one exists, instead of
// redefining it every time.
export const User: Model<IUser> = models.User || model<IUser>("User", userSchema);
