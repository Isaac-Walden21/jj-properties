// Nightly: consistent copy of the live DB (safe while the app is writing), keep the newest 14,
// then open the copy and query it so a broken backup fails loudly.
//   restore: stop the service, copy a backup over SQLITE_DB_PATH, delete any -wal/-shm beside it, start.
import Database from "better-sqlite3";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { dbPath } from "./db-path.mjs";

const KEEP = 14;
const src = dbPath();
const dir = process.env.CRM_BACKUP_DIR || join(dirname(src), "backups");
const dest = join(dir, `crm-${new Date().toISOString().slice(0, 10)}.db`);

mkdirSync(dir, { recursive: true });
const db = new Database(src, { readonly: true, fileMustExist: true });
await db.backup(dest);
db.close();

const copy = new Database(dest, { readonly: true });
const { leads } = copy.prepare("SELECT COUNT(*) AS leads FROM inquiries").get();
const { people } = copy.prepare("SELECT COUNT(*) AS people FROM users").get();
copy.close();

const old = readdirSync(dir).filter((f) => /^crm-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().slice(0, -KEEP);
for (const f of old) rmSync(join(dir, f));
console.log(`backup ok: ${dest} (${leads} leads, ${people} logins; pruned ${old.length})`);
