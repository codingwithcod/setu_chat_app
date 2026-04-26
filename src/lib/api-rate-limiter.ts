/**
 * In-memory sliding-window rate limiter for API keys.
 *
 * Works identically to the TOTP rate limiter already in the codebase.
 * For multi-instance deployment, swap this for Redis (Upstash) later.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const WINDOW_MS = 60_000; // 1-minute sliding window

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't prevent Node from exiting
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // seconds until window resets
}

/**
 * Check whether a request from the given key ID is within the rate limit.
 * If allowed, the request is counted automatically.
 */
export function checkRateLimit(
  keyId: string,
  maxRpm: number
): RateLimitResult {
  ensureCleanupTimer();

  const now = Date.now();
  const entry = store.get(keyId) || { timestamps: [] };

  // Prune timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= maxRpm) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + WINDOW_MS - now;
    return {
      allowed: false,
      limit: maxRpm,
      remaining: 0,
      reset: Math.ceil(resetMs / 1000),
    };
  }

  // Count this request
  entry.timestamps.push(now);
  store.set(keyId, entry);

  return {
    allowed: true,
    limit: maxRpm,
    remaining: maxRpm - entry.timestamps.length,
    reset: 60,
  };
}

/**
 * Add standard rate-limit headers to a Response (or NextResponse).
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}
