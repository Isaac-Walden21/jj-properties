// In-memory database harness for tests.
//
// The migrations applied here are the REAL files in db/migrations, discovered
// and ordered exactly as scripts/migrate.mjs does. That is deliberate: a
// migration that is valid Postgres but invalid SQLite, or one that is misnamed
// and so sorts wrong, fails a test rather than a deploy.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "migrations",
);

let migrated = false;

/**
 * Returns the shared in-memory database, applying every migration once per
 * process. getDb() is a module singleton and `:memory:` is per-connection, so
 * the schema has to be built on that same connection rather than a fresh one.
 */
export function testDb(): Database.Database {
  const db = getDb();
  if (migrated) return db;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  migrated = true;
  return db;
}

/**
 * Wipes marketing data between tests without rebuilding the schema.
 *
 * Child-first so ON DELETE CASCADE never has to fire, and sqlite_sequence is
 * reset so autoincrement ids restart at 1 -- a test asserting on contact id 1
 * should not depend on how many tests ran before it.
 */
export function resetMarketingTables(): void {
  const db = testDb();
  const tables = [
    "campaign_sends",
    "send_attempts",
    "messages",
    "marketing_events",
    "contact_tags",
    "campaigns",
    "contacts",
    "marketing_settings",
    "job_leases",
    "inquiry_notes",
    "password_resets",
    "inquiries",
    "users",
  ];
  const existing = new Set(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => (r as { name: string }).name),
  );
  db.transaction(() => {
    for (const t of tables) {
      if (existing.has(t)) db.exec(`DELETE FROM ${t}`);
    }
    if (existing.has("sqlite_sequence")) db.exec("DELETE FROM sqlite_sequence");
  })();
}
