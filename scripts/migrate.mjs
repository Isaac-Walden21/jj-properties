import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { dbPath } from "./db-path.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = dbPath();
const db = new Database(path);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);

const dir = join(__dirname, "..", "db", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const applied = new Set(db.prepare("SELECT name FROM _migrations").all().map((r) => r.name));

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip   ${file}`);
    continue;
  }
  const sql = readFileSync(join(dir, file), "utf8");
  const tx = db.transaction(() => {
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
  });
  tx();
  console.log(`applied ${file}`);
}

// Verify: every migration recorded and the tables the app reads exist.
const recorded = new Set(db.prepare("SELECT name FROM _migrations").all().map((r) => r.name));
const missing = files.filter((f) => !recorded.has(f));
const tables = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name)
);
const needTables = ["users", "inquiries", "inquiry_notes", "login_attempts", "oauth_clients", "oauth_codes", "oauth_tokens", "rate_hits"].filter((t) => !tables.has(t));
if (missing.length || needTables.length) {
  console.error(`FAILED: unrecorded migrations [${missing}] missing tables [${needTables}]`);
  process.exit(1);
}
console.log(`Done. DB at ${path}`);
