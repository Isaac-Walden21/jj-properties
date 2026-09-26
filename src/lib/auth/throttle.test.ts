import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { isLocked, recordFailure, clearFailures, MAX_FAILURES, WINDOW_MS } from "./throttle";

function freshDb() {
  const db = new Database(":memory:");
  db.exec(readFileSync("db/migrations/0003_login_attempts.sql", "utf8"));
  return db;
}

describe("login throttle", () => {
  const keys = ["user:jack", "ip:1.2.3.4"];

  it("locks after MAX_FAILURES within the window", () => {
    const db = freshDb();
    for (let i = 0; i < MAX_FAILURES - 1; i++) recordFailure(db, keys, 1000);
    expect(isLocked(db, keys, 1000)).toBe(false);
    recordFailure(db, keys, 1000);
    expect(isLocked(db, keys, 1000)).toBe(true);
    // Locking one key (the IP) locks any username tried from it.
    expect(isLocked(db, ["user:jeff", "ip:1.2.3.4"], 1000)).toBe(true);
  });

  it("unlocks after the window and restarts the count", () => {
    const db = freshDb();
    for (let i = 0; i < MAX_FAILURES; i++) recordFailure(db, keys, 1000);
    const later = 1000 + WINDOW_MS + 1;
    expect(isLocked(db, keys, later)).toBe(false);
    recordFailure(db, keys, later);
    expect(isLocked(db, keys, later)).toBe(false);
  });

  it("clears on success", () => {
    const db = freshDb();
    for (let i = 0; i < MAX_FAILURES; i++) recordFailure(db, keys, 1000);
    clearFailures(db, keys);
    expect(isLocked(db, keys, 1000)).toBe(false);
  });
});
