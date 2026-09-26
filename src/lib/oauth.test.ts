import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  hit, registerClient, validateAuthorize, createCode, exchangeCode, refreshTokens,
  verifyAccessToken, revokeFamily, listConnections, prune, getClient, CODE_TTL_MS, ACCESS_TTL_MS, REFRESH_RETRY_GRACE_MS,
} from "./oauth";

const CB = "https://claude.ai/api/mcp/auth_callback";
const verifier = "a".repeat(50);
const challenge = createHash("sha256").update(verifier).digest("base64url");
process.env.SESSION_SECRET ??= "test-secret-0123456789abcdef0123456789";

function setup() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  for (const f of readdirSync("db/migrations").sort()) db.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  db.prepare("INSERT INTO users (id, username, email, password_hash) VALUES (1, 'jack', 'j@x.com', 'h')").run();
  const reg = registerClient({ redirect_uris: [CB], client_name: "Claude" });
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
  it("accepts only Claude's hosted callback, no duplicates", () => {
    expect(registerClient({ redirect_uris: ["https://evil.example/cb"] }).ok).toBe(false);
    expect(registerClient({ redirect_uris: [CB, "http://localhost:1234/callback"] }).ok).toBe(false);
    expect(registerClient({ redirect_uris: [CB, CB] }).ok).toBe(false);
    expect(registerClient({}).ok).toBe(false);
  });

  it("issues signed client_ids that can't be forged or widened", () => {
    const r = registerClient({ redirect_uris: [CB] });
    if (!r.ok) throw new Error();
    expect(getClient(r.client.client_id)?.redirect_uris).toEqual([CB]);
    const [, idx, sig] = r.client.client_id.split("-");
    expect(getClient(`claude-01-${sig}`)).toBeNull(); // widen to both callbacks
    expect(getClient(`claude-${idx}-${"A".repeat(32)}`)).toBeNull(); // bad signature
    expect(getClient("anything")).toBeNull();
  });
});

describe("authorize request", () => {
  it("never redirects on a bad client or redirect_uri, requires S256", () => {
    const { clientId } = setup();
    const base = { client_id: clientId, redirect_uri: CB, response_type: "code", code_challenge: challenge, code_challenge_method: "S256" };
    expect(validateAuthorize(base).ok).toBe(true);
    expect(validateAuthorize({ ...base, client_id: "nope" })).toMatchObject({ ok: false, redirectable: false });
    expect(validateAuthorize({ ...base, redirect_uri: "https://claude.com/api/mcp/auth_callback" })).toMatchObject({ ok: false, redirectable: false });
    expect(validateAuthorize({ ...base, code_challenge_method: "plain" })).toMatchObject({ ok: false, redirectable: true });
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
  it("rotates; a simultaneous retry is tolerated; a late replay kills the whole sign-in", () => {
    const { db, clientId } = setup();
    const first = signIn(db, clientId);
    const second = refreshTokens(db, { refresh_token: first.refresh_token, client_id: clientId }, 2000);
    if (!second.ok) throw new Error();
    expect(verifyAccessToken(db, second.body.access_token, 2000)?.userId).toBe(1);

    // Same old token again one second later: a retry, both results keep working.
    const retry = refreshTokens(db, { refresh_token: first.refresh_token }, 3000);
    if (!retry.ok) throw new Error("retry within grace should succeed");
    expect(verifyAccessToken(db, second.body.access_token, 3000)).not.toBeNull();
    expect(verifyAccessToken(db, retry.body.access_token, 3000)).not.toBeNull();

    // Same old token after the grace window: theft, everything in the family dies.
    const late = 2000 + REFRESH_RETRY_GRACE_MS + 1;
    expect(refreshTokens(db, { refresh_token: first.refresh_token }, late)).toMatchObject({ ok: false, error: "invalid_grant" });
    expect(verifyAccessToken(db, second.body.access_token, late)).toBeNull();
    expect(verifyAccessToken(db, retry.body.access_token, late)).toBeNull();
    expect(refreshTokens(db, { refresh_token: second.body.refresh_token }, late).ok).toBe(false);
  });

  it("a revoked sign-in can't be revived inside the grace window", () => {
    const { db, clientId } = setup();
    const first = signIn(db, clientId);
    const second = refreshTokens(db, { refresh_token: first.refresh_token }, 2000);
    if (!second.ok) throw new Error();
    revokeFamily(db, listConnections(db, 1, 2000)[0].family); // Disconnect clicked
    expect(refreshTokens(db, { refresh_token: first.refresh_token }, 2500).ok).toBe(false);
  });

  it("access tokens expire; revoke and user removal cut access", () => {
    const { db, clientId } = setup();
    const t = signIn(db, clientId);
    expect(verifyAccessToken(db, t.access_token, 1000 + ACCESS_TTL_MS + 1)).toBeNull();

    const [conn] = listConnections(db, 1, 1000);
    expect(conn.family).toBeTruthy();
    revokeFamily(db, conn.family);
    expect(verifyAccessToken(db, t.access_token, 1000)).toBeNull();
    expect(listConnections(db, 1, 1000)).toHaveLength(0);

    const t2 = signIn(db, clientId);
    db.prepare("DELETE FROM users WHERE id = 1").run();
    expect(verifyAccessToken(db, t2.access_token, 1000)).toBeNull();
  });
});

describe("housekeeping", () => {
  it("rate limit window and pruning of expired tokens", () => {
    const { db } = setup();
    expect(hit(db, "k", 2, 60_000, 0)).toBe(true);
    expect(hit(db, "k", 2, 60_000, 1)).toBe(true);
    expect(hit(db, "k", 2, 60_000, 2)).toBe(false);
    expect(hit(db, "k", 2, 60_000, 60_001)).toBe(true);

    const { clientId } = setup();
    const db2 = setup().db;
    signIn(db2, clientId);
    prune(db2, Date.now() + 60 * 24 * 60 * 60 * 1000);
    expect((db2.prepare("SELECT COUNT(*) AS n FROM oauth_tokens").get() as { n: number }).n).toBe(0);
  });
});
