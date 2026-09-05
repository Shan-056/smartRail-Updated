// ============================================================
// lib/rateLimiter.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// A tiny in-memory "attempt counter" used to stop someone from
// guessing a Master Login password (or spamming the forgot-
// password form) by trying over and over. Every failed attempt
// for a key (e.g. "login:<ip>:<username>") is counted; once a
// key hits the limit, further attempts are blocked for a cool-
// down window and the caller is told how long to wait.
//
// NOTE: this lives in the server's memory, so it resets if the
// server restarts, and (if you ever run more than one backend
// instance behind a load balancer) each instance would count
// separately. That's fine for a single-instance deployment; for
// multi-instance production use, swap this for a shared store
// like Redis, keeping the same checkRateLimit/registerFailure/
// resetLimit function signatures.
// ============================================================

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const attempts = new Map<string, AttemptRecord>();

export interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number; // how long a run of failures is remembered
  lockoutMs: number; // how long to block once maxAttempts is hit
}

export interface RateLimitStatus {
  blocked: boolean;
  attemptsRemaining: number;
  retryAfterSeconds?: number;
}

function pruneIfExpired(key: string, record: AttemptRecord, opts: RateLimitOptions): AttemptRecord | undefined {
  const now = Date.now();
  if (record.lockedUntil && now >= record.lockedUntil) {
    attempts.delete(key);
    return undefined;
  }
  if (!record.lockedUntil && now - record.firstAttemptAt > opts.windowMs) {
    attempts.delete(key);
    return undefined;
  }
  return record;
}

/** Call before processing an attempt — tells you if this key is currently locked out. */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitStatus {
  const existing = attempts.get(key);
  const record = existing ? pruneIfExpired(key, existing, opts) : undefined;

  if (record?.lockedUntil) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.lockedUntil - Date.now()) / 1000));
    return { blocked: true, attemptsRemaining: 0, retryAfterSeconds };
  }

  const attemptsRemaining = opts.maxAttempts - (record?.count || 0);
  return { blocked: false, attemptsRemaining: Math.max(0, attemptsRemaining) };
}

/** Call after a failed attempt — increments the counter and locks the key out once the limit is hit. */
export function registerFailure(key: string, opts: RateLimitOptions): RateLimitStatus {
  const now = Date.now();
  const existing = attempts.get(key);
  const record = existing ? pruneIfExpired(key, existing, opts) : undefined;

  const nextCount = (record?.count || 0) + 1;
  const firstAttemptAt = record?.firstAttemptAt || now;

  if (nextCount >= opts.maxAttempts) {
    const lockedUntil = now + opts.lockoutMs;
    attempts.set(key, { count: nextCount, firstAttemptAt, lockedUntil });
    return {
      blocked: true,
      attemptsRemaining: 0,
      retryAfterSeconds: Math.ceil(opts.lockoutMs / 1000)
    };
  }

  attempts.set(key, { count: nextCount, firstAttemptAt });
  return { blocked: false, attemptsRemaining: opts.maxAttempts - nextCount };
}

/** Call after a successful attempt to clear the counter for that key. */
export function resetLimit(key: string): void {
  attempts.delete(key);
}

/** Best-effort client identifier for keying attempts (works behind most proxies/load balancers). */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
