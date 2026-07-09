// Simple in-memory fixed-window rate limiter. Deliberately not backed by
// Redis/shared storage: each host in the two-host deployment enforces its
// own limit independently, which is an acceptable tradeoff for a personal
// site (worst case, a determined attacker gets ~2x the stated limit by
// hitting both hosts) in exchange for zero extra infrastructure.

const buckets = new Map<string, { count: number; resetAt: number }>();

// Bound memory use: if this ever fills up (would need ~1M distinct keys
// concurrently), start evicting the oldest entries rather than growing
// unbounded.
const MAX_BUCKETS = 50_000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    if (buckets.size >= MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;

  existing.count += 1;
  return true;
}
