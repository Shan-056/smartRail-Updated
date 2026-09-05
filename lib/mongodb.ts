// ============================================================
// lib/mongodb.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Connects to MongoDB. This looks more complicated than a
// normal database connection because of how Next.js works: in
// development mode, Next.js "hot reloads" your code every time
// you save a file, which would normally open a brand new
// database connection each time — quickly using up all
// available connections. This file fixes that by "caching" the
// connection on the global object, so we reuse the same one
// instead of opening a new one on every reload.
// ============================================================

import mongoose from "mongoose";

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGO_URI);
}

// TypeScript doesn't know about our custom global cache property by
// default, so we describe its shape here. This is only a type-level
// declaration — it doesn't run any code.
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

// Reuse the cache across hot-reloads in development, or create it
// fresh the first time in production.
const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

/**
 * connectToDatabase
 * Human explanation: The function every API route calls at the
 * very start, before touching the database. If we're already
 * connected, it instantly hands back the existing connection
 * (fast, no wasted work). If we're not connected yet, it opens
 * one connection and remembers it for next time.
 */
export async function connectToDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
