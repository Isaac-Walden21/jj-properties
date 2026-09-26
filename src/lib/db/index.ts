import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

// Same rule as scripts/db-path.mjs: production must name an absolute path outside
// the release dir, because each deploy mirrors the release dir with --delete.
export function getDb(): Database.Database {
  if (!db) {
    const path = process.env.SQLITE_DB_PATH || "./data/crm.db";
    if (process.env.NODE_ENV === "production" && !isAbsolute(path)) {
      throw new Error(`SQLITE_DB_PATH must be absolute in production (got "${path}")`);
    }
    mkdirSync(dirname(resolve(path)), { recursive: true });
    db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
  }
  return db;
}
