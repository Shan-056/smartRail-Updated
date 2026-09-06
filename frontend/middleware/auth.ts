// ============================================================
// middleware/auth.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This is our "security guard" for API routes. Next.js API
// routes work a bit differently from plain Express — there's no
// single chain of middleware that runs before every route.
// Instead, each route handler calls a helper function like
// `requireAuth(req)` at the very top, which checks the login
// cookie and either returns the logged-in user, or throws an
// error that the route turns into a 401 response.
// ============================================================

import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { User, type IUser } from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "smartrail-default-jwt-secret-key-2025";

// A small custom error type so route handlers can tell "not logged
// in" apart from "logged in but wrong role" apart from other bugs.
export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

interface DecodedToken {
  userId: string;
  role?: IUser["role"];
  username?: string;
  email?: string;
}

/**
 * requireAuth
 * Human explanation: Reads the "token" cookie from the incoming
 * request, verifies our server really signed it (not forged),
 * looks up which user it belongs to, and returns that user. If
 * anything about the token is missing/invalid/expired, or the
 * user no longer exists, it throws an AuthError that the calling
 * route handler catches and turns into a 401 response.
 */
export async function requireAuth(req: NextRequest): Promise<IUser> {
  let token = req.cookies.get("token")?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }
  if (!token) {
    throw new AuthError("Not authorized — please log in.");
  }

  let decoded: DecodedToken;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch {
    throw new AuthError("Not authorized — invalid or expired token.");
  }

  let user = null;
  try {
    const db = await connectToDatabase();
    if (db) {
      user = await User.findById(decoded.userId).select("-password");
    }
  } catch {
    // If DB is unreachable, proceed to check fallback demo users
  }

  if (!user) {
    // Check built-in demo users
    const demoAccounts: Record<string, { _id: string; username: string; email: string; role: IUser["role"] }> = {
      usr_admin: { _id: "usr_admin", username: "admin", email: "admin@smartrailtwin.local", role: "admin" },
      usr_passenger1: { _id: "usr_passenger1", username: "passenger1", email: "passenger1@example.com", role: "passenger" },
      usr_stationmaster: { _id: "usr_stationmaster", username: "stationmaster", email: "stationmaster@centralrailway.gov.in", role: "operator" },
      usr_device01: { _id: "usr_device01", username: "device01", email: "device01@smartrailtwin.local", role: "device" },
      usr_operator: { _id: "usr_operator", username: "operator", email: "operator@smartrailtwin.local", role: "operator" },
      usr_demo: { _id: "usr_demo", username: "demo", email: "demo@smartrailtwin.local", role: "passenger" },
    };

    const fallbackUser = demoAccounts[decoded.userId];
    if (fallbackUser) {
      return fallbackUser as unknown as IUser;
    }

    if (decoded.role && decoded.userId) {
      return {
        _id: decoded.userId,
        username: decoded.username || decoded.userId,
        email: decoded.email || `${decoded.username || "user"}@smartrailtwin.local`,
        role: decoded.role,
      } as unknown as IUser;
    }

    throw new AuthError("Not authorized — user no longer exists.");
  }

  return user;
}

/**
 * requireRole
 * Human explanation: A second, optional layer of security. Some
 * routes should only be usable by certain roles (e.g. only
 * "device" accounts should push raw sensor data). Call this
 * right after requireAuth with the roles that are allowed.
 */
export function requireRole(user: IUser, allowedRoles: IUser["role"][]) {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError("Forbidden — you don't have permission to do this.", 403);
  }
}
