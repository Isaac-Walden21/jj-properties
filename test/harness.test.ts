// Guards the test harness itself.
//
// Two things here are load-bearing for every later test, and both fail in ways
// that are confusing to diagnose from a downstream test:
//   1. `server-only` is aliased to a stub, so data-access modules import at all.
//   2. The real migration files apply cleanly to SQLite, in filename order.
import { describe, it, expect } from "vitest";
import { testDb, resetMarketingTables } from "./db";

describe("test harness", () => {
  it("can import a server-only data-access module", async () => {
    // Without the alias in vitest.config.ts this import throws.
    const mod = await import("@/lib/db/inquiries");
    expect(typeof mod.createInquiry).toBe("function");
  });

  it("applies the real migrations to an in-memory database", () => {
    const db = testDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => (r as { name: string }).name);

    expect(tables).toEqual(
      expect.arrayContaining(["users", "inquiries", "inquiry_notes", "password_resets"]),
    );
  });

  it("uses an in-memory database, never the real file", () => {
    expect(process.env.SQLITE_DB_PATH).toBe(":memory:");
  });

  it("resetMarketingTables clears rows without dropping the schema", () => {
    const db = testDb();
    db.prepare(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)",
    ).run("harness", "harness@example.test", "x", "staff");
    expect(db.prepare("SELECT COUNT(*) n FROM users").get()).toEqual({ n: 1 });

    resetMarketingTables();

    expect(db.prepare("SELECT COUNT(*) n FROM users").get()).toEqual({ n: 0 });
    // schema survives
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get(),
    ).toBeTruthy();
  });
});
