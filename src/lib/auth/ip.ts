/**
 * Client IP as nginx saw it. nginx sets X-Real-IP to $remote_addr; the first
 * X-Forwarded-For entry is whatever the client sent, so it can't be trusted.
 */
export function getTrustedIp(headers: Headers): string | null {
  // null (not "unknown"): callers skip per-IP limits rather than lumping every
  // visitor into one bucket if the header ever goes missing.
  return headers.get("x-real-ip");
}
