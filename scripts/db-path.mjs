// Shared by every CLI script so they open the same DB file the app does.
// Loads .env.local the way Next does; production requires an absolute path
// (the release dir is mirrored with --delete on each deploy).
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export function dbPath() {
  const p = process.env.SQLITE_DB_PATH || "./data/crm.db";
  if (process.env.NODE_ENV === "production" && !isAbsolute(p)) {
    throw new Error(`SQLITE_DB_PATH must be absolute in production (got "${p}")`);
  }
  mkdirSync(dirname(resolve(p)), { recursive: true });
  return p;
}
