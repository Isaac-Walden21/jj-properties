import "server-only";
import { getDb } from "./index";

export function createReset(tokenHash: string, userId: number, expiresAt: string): void {
  getDb()
    .prepare("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(tokenHash, userId, expiresAt);
}

/** Returns the user_id for a valid, unused, unexpired token and marks it used (single-use). */
export function consumeReset(tokenHash: string): number | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT user_id, used_at, expires_at FROM password_resets WHERE token_hash = ?"
    )
    .get(tokenHash) as { user_id: number; used_at: string | null; expires_at: string } | undefined;
  if (!row || row.used_at) return null;
  if (new Date(row.expires_at + "Z").getTime() < Date.now()) return null;
  db.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE token_hash = ?").run(tokenHash);
  return row.user_id;
}
