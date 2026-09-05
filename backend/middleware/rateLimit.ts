import { NextRequest } from "next/server";

export class RateLimitError extends Error {
  status: number;
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds = 60, status = 429) {
    super(message);
    this.name = "RateLimitError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export function enforceRateLimit(
  req: NextRequest,
  endpoint: string,
  options: { maxAttempts: number; windowMs: number }
): void {
  const ip = getClientIp(req);
  const key = `${endpoint}:${ip}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);
  if (record) {
    if (now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      return;
    }

    record.count += 1;
    if (record.count > options.maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      throw new RateLimitError(
        `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
        retryAfterSeconds,
        429
      );
    }
  } else {
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
  }
}

export function resetRateLimit(req: NextRequest, endpoint: string): void {
  const ip = getClientIp(req);
  const key = `${endpoint}:${ip}`;
  rateLimitStore.delete(key);
}
