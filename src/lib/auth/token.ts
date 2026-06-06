import { randomBytes, createHash } from "node:crypto";

/** Random URL-safe token returned to the user (emailed). */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hash stored in the DB; raw token is never persisted. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** ISO-8601 UTC timestamp `minutes` in the future, matching SQLite `datetime('now')` format. */
export function expiryFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString().replace("T", " ").slice(0, 19);
}
