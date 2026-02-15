/** Sliding-window in-memory rate limiter for the contact form endpoint. */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 5;

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

/**
 * Removes timestamps older than the current window and deletes entries
 * that have no remaining timestamps.
 */
function cleanup() {
  const now = Date.now();
  for (const [ip, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      store.delete(ip);
    }
  }
}

/**
 * Returns `true` if the request is allowed, `false` if the rate limit has
 * been exceeded for the given IP address.
 */
export function checkContactRateLimit(ip: string): boolean {
  cleanup();

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    store.set(ip, { timestamps: [now] });
    return true;
  }

  // Filter to only timestamps within the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}

/** Clears the rate-limit store. Intended for testing only. */
export function resetContactRateLimit() {
  store.clear();
}
