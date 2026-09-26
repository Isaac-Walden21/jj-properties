import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  hit, registerClient, validateAuthorize, createCode, exchangeCode, refreshTokens,
  verifyAccessToken, revokeFamily, listConnections, prune, MAX_CLIENTS, CODE_TTL_MS, ACCESS_TTL_MS,
} from "./oauth";

const CB = "https://claude.ai/api/mcp/auth_callback";
const verifier = "a".repeat(50);
const challenge = createHash("sha256").update(verifier).digest("base64url");

function setup() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  for (const f of readdirSync("db/migrations").sort()) db.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  db.prepare("INSERT INTO users (id, username, email, password_hash) VALUES (1, 'jack', 'j@x.com', 'h')").run();
  const reg = registerClient(db, { redirect_uris: [CB], client_name: "Claude" });
  if (!reg.ok) throw new Error("register failed");
  return { db, clientId: reg.client.client_id };
}

function signIn(db: Database.Database, clientId: string, now = 1000) {
  const code = createCode(db, { client_id: clientId, redirect_uri: CB, code_challenge: challenge }, 1, now);
  const r = exchangeCode(db, { code, redirect_uri: CB, client_id: clientId, code_verifier: verifier }, now);
  if (!r.ok) throw new Error(r.error);
  return r.body;
}

describe("registration", () => {
  it("accepts only Claude's hosted callback", () => {
    const { db } = setup();
    expect(registerClient(db, { redirect_uris: ["https://evil.example/cb"] }).ok).toBe(false);
    expect(registerClient(db, { redirect_uris: [CB, "http://localhost:1234/callback"] }).ok).toBe(false);
    expect(registerClient(db, {}).ok).toBe(false);
  });

  it("caps the number of clients", () => {
    const { db } = setup();
    for (let i = 1; i < MAX_CLIENTS; i++) registerClient(db, { redirect_uris: [CB] });
    const r = registerClient(db, { redirect_uris: [CB] });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.status).toBe(503);
  });
});

describe("authorize request", () => {
  it("never redirects on a bad client or redirect_uri, requires S256", () => {
    const { db, clientId } = setup();
    const base = { client_id: clientId, redirect_uri: CB, response_type: "code", code_challenge: challenge, code_challenge_method: "S256" };
    expect(validateAuthorize(db, base).ok).toBe(true);
    expect(validateAuthorize(db, { ...base, client_id: "nope" })).toMatchObject({ ok: false, redirectable: false });
    expect(validateAuthorize(db, { ...base, redirect_uri: "https://claude.com/api/mcp/auth_callback" })).toMatchObject({ ok: false, redirectable: false });
    expect(validateAuthorize(db, { ...base, code_challenge_method: "plain" })).toMatchObject({ ok: false, redirectable: true });
  });
});

describe("code exchange", () => {
  it("issues tokens for the right verifier, once", () => {
    const { db, clientId } = setup();
    const code = createCode(db, { client_id: clientId, redirect_uri: CB, code_challenge: challenge }, 1, 1000);
    const bad = exchangeCode(db, { code, redirect_uri: CB, client_id: clientId, code_verifier: "wrong".repeat(10) }, 1000);
    expect(bad).toMatchObject({ ok: false, error: "invalid_grant" });
    // The failed attempt burned the code.
    expect(exchangeCode(db, { code, redirect_uri: CB, client_id: clientId, code_verifier: verifier }, 1000).ok).toBe(false);

    const t = signIn(db, clientId);
    expect(verifyAccessToken(db, t.access_token, 1000)?.userId).toBe(1);
  });

  it("rejects an expired code and a mismatched redirect_uri", () => {
    const { db, clientId } = setup();
    const p = { client_id: clientId, redirect_uri: CB, code_challenge: challenge };
    const c1 = createCode(db, p, 1, 1000);
    expect(exchangeCode(db, { code: c1, redirect_uri: CB, client_id: clientId, code_verifier: verifier }, 1000 + CODE_TTL_MS + 1).ok).toBe(false);
    const c2 = createCode(db, p, 1, 1000);
    expect(exchangeCode(db, { code: c2, redirect_uri: "https://claude.com/api/mcp/auth_callback", client_id: clientId, code_verifier: verifier }, 1000).ok).toBe(false);
  });
});

describe("refresh", () => {
  it("rotates, and a reused old refresh token kills the whole sign-in", () => {
    const { db, clientId } = setup();
    const first = signIn(db, clientId);
    const second = refreshTokens(db, { refresh_token: first.refresh_token, client_id: clientId }, 2000);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(verifyAccessToken(db, first.access_token, 2000)).toBeNull(); // old access revoked
    expect(verifyAccessToken(db, second.body.access_token, 2000)?.userId).toBe(1);

    const replay = refreshTokens(db, { refresh_token: first.refresh_token }, 3000);
    expect(replay).toMatchObject({ ok: false, error: "invalid_grant" });
    expect(verifyAccessToken(db, second.body.access_token, 3000)).toBeNull();
    expect(refreshTokens(db, { refresh_token: second.body.refresh_token }, 3000).ok).toBe(false);
  });

  it("access tokens expire; revoke and user removal cut access", () => {
    const { db, clientId } = setup();
    const t = signIn(db, clientId);
    expect(verifyAccessToken(db, t.access_token, 1000 + ACCESS_TTL_MS + 1)).toBeNull();

    const [conn] = listConnections(db, 1, 1000);
    expect(conn.client_name).toBe("Claude");
    revokeFamily(db, conn.family);
    expect(verifyAccessToken(db, t.access_token, 1000)).toBeNull();
    expect(listConnections(db, 1, 1000)).toHaveLength(0);

    const t2 = signIn(db, clientId);
    db.prepare("DELETE FROM users WHERE id = 1").run();
    expect(verifyAccessToken(db, t2.access_token, 1000)).toBeNull();
  });
});

describe("housekeeping", () => {
  it("rate limit window and pruning of unused clients", () => {
    const { db } = setup();
    expect(hit(db, "k", 2, 60_000, 0)).toBe(true);
    expect(hit(db, "k", 2, 60_000, 1)).toBe(true);
    expect(hit(db, "k", 2, 60_000, 2)).toBe(false);
    expect(hit(db, "k", 2, 60_000, 60_001)).toBe(true);

    const day = 24 * 60 * 60 * 1000;
    prune(db, Date.now() + 2 * day);
    expect((db.prepare("SELECT COUNT(*) AS n FROM oauth_clients").get() as { n: number }).n).toBe(0);
  });
});
