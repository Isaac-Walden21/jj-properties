import type Database from "better-sqlite3";

export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES = 10;

export function isLocked(db: Database.Database, keys: string[], now = Date.now()): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM login_attempts
        WHERE key IN (${keys.map(() => "?").join(",")})
          AND window_start > ? AND count >= ?`
    )
    .get(...keys, now - WINDOW_MS, MAX_FAILURES);
  return row !== undefined;
}

export function recordFailure(db: Database.Database, keys: string[], now = Date.now()): void {
  const stmt = db.prepare(
    `INSERT INTO login_attempts (key, count, window_start) VALUES (@key, 1, @now)
     ON CONFLICT(key) DO UPDATE SET
       count        = CASE WHEN window_start <= @cutoff THEN 1    ELSE count + 1 END,
       window_start = CASE WHEN window_start <= @cutoff THEN @now ELSE window_start END`
  );
  for (const key of keys) stmt.run({ key, now, cutoff: now - WINDOW_MS });
}

export function clearFailures(db: Database.Database, keys: string[]): void {
  const stmt = db.prepare("DELETE FROM login_attempts WHERE key = ?");
  for (const key of keys) stmt.run(key);
}
