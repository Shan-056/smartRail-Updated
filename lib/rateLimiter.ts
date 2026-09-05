interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const attempts = new Map<string, AttemptRecord>();

export interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
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
      retryAfterSeconds: Math.ceil(opts.lockoutMs / 1000),
    };
  }

  attempts.set(key, { count: nextCount, firstAttemptAt });
  return { blocked: false, attemptsRemaining: opts.maxAttempts - nextCount };
}

export function resetLimit(key: string): void {
  attempts.delete(key);
}

export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
