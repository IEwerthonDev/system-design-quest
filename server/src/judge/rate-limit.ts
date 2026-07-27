const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

interface RateLimitBucket {
  count: number;
  windowStartMs: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

/** In-memory rate limit: 20 requests per IP per hour in production only. */
export function checkRateLimit(
  ip: string,
  env: NodeJS.ProcessEnv = process.env,
  nowMs = Date.now(),
): RateLimitResult {
  if (env.NODE_ENV !== 'production') {
    return { allowed: true };
  }

  let bucket = buckets.get(ip);
  if (!bucket || nowMs - bucket.windowStartMs >= WINDOW_MS) {
    bucket = { count: 0, windowStartMs: nowMs };
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((bucket.windowStartMs + WINDOW_MS - nowMs) / 1000),
    );
    buckets.set(ip, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.count += 1;
  buckets.set(ip, bucket);
  return { allowed: true };
}

/** Clear in-memory buckets — test helper only. */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}
