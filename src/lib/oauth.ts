// Minimal OAuth 2.1 authorization server for the Claude connector (release 2).
// Public clients only (Claude registers itself via DCR), PKCE S256 required,
// rotating refresh tokens with reuse detection. Every function takes the DB so
// tests can run against :memory:.
//
// Registration is stateless: a client_id is the list of allowed redirect URIs it
// may use, signed with SESSION_SECRET. Nothing is stored, so the public /register
// endpoint can't fill a table or lock anyone out.
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type Database from "better-sqlite3";

export const ACCESS_TTL_MS = 60 * 60 * 1000; // 1 hour
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const CODE_TTL_MS = 5 * 60 * 1000;
// A rotated-out refresh token presented again within this window is treated as a
// retry (Claude refreshing twice at once), not theft.
export const REFRESH_RETRY_GRACE_MS = 30 * 1000;

// Claude's hosted apps (claude.ai, Desktop, mobile, Cowork) all return here.
// Claude Code's loopback redirect is deliberately not supported.
const REDIRECTS = ["https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"];

type Db = Database.Database;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const newSecret = () => randomBytes(32).toString("base64url");

// ---------------------------------------------------------------- rate limit --
/** Fixed window. Returns false once `max` hits land in the current window. */
export function hit(db: Db, key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const row = db
    .prepare(
      `INSERT INTO rate_hits (key, window_start, count) VALUES (@key, @now, 1)
       ON CONFLICT(key) DO UPDATE SET
         count        = CASE WHEN window_start <= @cutoff THEN 1    ELSE count + 1 END,
         window_start = CASE WHEN window_start <= @cutoff THEN @now ELSE window_start END
       RETURNING count`
    )
    .get({ key, now, cutoff: now - windowMs }) as { count: number };
  return row.count <= max;
}

// ------------------------------------------------------------- registration --
function sign(payload: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(`oauth-client:${payload}`).digest("base64url").slice(0, 32);
}

export type RegisterResult =
  | { ok: true; client: { client_id: string; client_name: string; redirect_uris: string[] } }
  | { ok: false; status: number; error: string; description: string };

export function registerClient(body: unknown): RegisterResult {
  const uris = (body as { redirect_uris?: unknown } | null)?.redirect_uris;
  const idx = Array.isArray(uris) ? uris.map((u) => REDIRECTS.indexOf(u as string)) : [];
  if (!idx.length || idx.includes(-1) || new Set(idx).size !== idx.length) {
    return { ok: false, status: 400, error: "invalid_redirect_uri", description: "Only Claude's hosted callback is accepted." };
  }
  const payload = [...idx].sort().join("");
  return {
    ok: true,
    client: { client_id: `claude-${payload}-${sign(payload)}`, client_name: "Claude", redirect_uris: uris as string[] },
  };
}

/** Allowed redirect URIs for a client_id, or null if it wasn't issued by us. */
export function getClient(clientId: string): { client_id: string; redirect_uris: string[] } | null {
  const m = /^claude-([01]{1,2})-([A-Za-z0-9_-]{32})$/.exec(clientId);
  if (!m) return null;
  const expected = Buffer.from(sign(m[1]));
  const given = Buffer.from(m[2]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { client_id: clientId, redirect_uris: [...m[1]].map((i) => REDIRECTS[Number(i)]) };
}

// ---------------------------------------------------------------- authorize --
export interface AuthorizeParams {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state?: string;
}

/**
 * Checks an authorization request. `redirectable` says whether errors may be sent
 * back to redirect_uri: never when the client or redirect_uri itself is bad.
 */
export function validateAuthorize(
  q: Record<string, string | undefined>
): { ok: true; params: AuthorizeParams } | { ok: false; redirectable: boolean; error: string } {
  const client = q.client_id ? getClient(q.client_id) : null;
  if (!client) return { ok: false, redirectable: false, error: "Unknown client. Remove the connector in Claude and add it again." };
  if (!q.redirect_uri || !client.redirect_uris.includes(q.redirect_uri)) {
    return { ok: false, redirectable: false, error: "This sign-in link has an unexpected return address." };
  }
  if (q.response_type !== "code") return { ok: false, redirectable: true, error: "unsupported_response_type" };
  if (!q.code_challenge || q.code_challenge_method !== "S256") return { ok: false, redirectable: true, error: "invalid_request" };
  return {
    ok: true,
    params: { client_id: client.client_id, redirect_uri: q.redirect_uri, code_challenge: q.code_challenge, state: q.state },
  };
}

export function createCode(db: Db, p: AuthorizeParams, userId: number, now = Date.now()): string {
  const code = newSecret();
  db.prepare(
    "INSERT INTO oauth_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(hash(code), p.client_id, userId, p.redirect_uri, p.code_challenge, now + CODE_TTL_MS);
  return code;
}

// -------------------------------------------------------------------- token --
export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}
export type TokenResult = { ok: true; body: TokenResponse } | { ok: false; error: string; description?: string };

function issue(db: Db, clientId: string, userId: number, family: string, now: number): TokenResponse {
  const access = newSecret();
  const refresh = newSecret();
  const insert = db.prepare(
    "INSERT INTO oauth_tokens (token_hash, kind, family, client_id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  insert.run(hash(access), "access", family, clientId, userId, now + ACCESS_TTL_MS, now);
  insert.run(hash(refresh), "refresh", family, clientId, userId, now + REFRESH_TTL_MS, now);
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_MS / 1000, refresh_token: refresh, scope: "leads" };
}

const pkceMatches = (verifier: string, challenge: string) =>
  createHash("sha256").update(verifier).digest("base64url") === challenge;

export function exchangeCode(
  db: Db,
  f: { code?: string; redirect_uri?: string; client_id?: string; code_verifier?: string },
  now = Date.now()
): TokenResult {
  if (!f.code || !f.code_verifier || !f.client_id || !f.redirect_uri) return { ok: false, error: "invalid_request" };
  return db.transaction((): TokenResult => {
    const row = db.prepare("SELECT * FROM oauth_codes WHERE code_hash = ?").get(hash(f.code!)) as
      | { client_id: string; user_id: number; redirect_uri: string; code_challenge: string; expires_at: number }
      | undefined;
    // Single use: gone the moment anyone presents it, valid or not.
    if (row) db.prepare("DELETE FROM oauth_codes WHERE code_hash = ?").run(hash(f.code!));
    if (!row || row.expires_at < now) return { ok: false, error: "invalid_grant", description: "Code is invalid or expired." };
    if (row.client_id !== f.client_id || row.redirect_uri !== f.redirect_uri) return { ok: false, error: "invalid_grant" };
    if (!pkceMatches(f.code_verifier!, row.code_challenge)) return { ok: false, error: "invalid_grant", description: "PKCE check failed." };
    return { ok: true, body: issue(db, row.client_id, row.user_id, randomUUID(), now) };
  })();
}

export function refreshTokens(db: Db, f: { refresh_token?: string; client_id?: string }, now = Date.now()): TokenResult {
  if (!f.refresh_token) return { ok: false, error: "invalid_request" };
  return db.transaction((): TokenResult => {
    const row = db.prepare("SELECT * FROM oauth_tokens WHERE token_hash = ? AND kind = 'refresh'").get(hash(f.refresh_token!)) as
      | { family: string; client_id: string; user_id: number; expires_at: number; revoked: number; rotated_at: number | null }
      | undefined;
    if (!row) return { ok: false, error: "invalid_grant" };
    if (row.expires_at < now || (f.client_id && f.client_id !== row.client_id)) return { ok: false, error: "invalid_grant" };
    if (row.revoked) {
      const isRetry = row.rotated_at !== null && now - row.rotated_at < REFRESH_RETRY_GRACE_MS;
      if (!isRetry) {
        // A rotated-out refresh token came back late: assume it leaked, cut off the whole sign-in.
        revokeFamily(db, row.family);
        return { ok: false, error: "invalid_grant", description: "Refresh token reuse detected." };
      }
    } else {
      db.prepare("UPDATE oauth_tokens SET revoked = 1, rotated_at = ? WHERE token_hash = ?").run(now, hash(f.refresh_token!));
    }
    // Earlier access tokens are left to expire on their own (≤ 1 hour) so a
    // concurrent refresh doesn't invalidate the token the other request just got.
    return { ok: true, body: issue(db, row.client_id, row.user_id, row.family, now) };
  })();
}

/** The signed-in staff user behind a bearer token, or null. */
export function verifyAccessToken(db: Db, token: string, now = Date.now()): { userId: number; clientId: string; expiresAt: number } | null {
  const row = db
    .prepare(
      `SELECT t.user_id, t.client_id, t.expires_at FROM oauth_tokens t JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = ? AND t.kind = 'access' AND t.revoked = 0 AND t.expires_at > ?`
    )
    .get(hash(token), now) as { user_id: number; client_id: string; expires_at: number } | undefined;
  return row ? { userId: row.user_id, clientId: row.client_id, expiresAt: row.expires_at } : null;
}

// ------------------------------------------------------------ housekeeping --
export function revokeFamily(db: Db, family: string): void {
  // rotated_at cleared so no grace-window retry can revive a revoked sign-in.
  db.prepare("UPDATE oauth_tokens SET revoked = 1, rotated_at = NULL WHERE family = ?").run(family);
}

/** Connected Claude sign-ins for the Account page: one row per live refresh token. */
export function listConnections(db: Db, userId: number, now = Date.now()) {
  return db
    .prepare(
      `SELECT t.family, MIN(f.created_at) AS connected_at
         FROM oauth_tokens t
         JOIN oauth_tokens f ON f.family = t.family
        WHERE t.user_id = ? AND t.kind = 'refresh' AND t.revoked = 0 AND t.expires_at > ?
        GROUP BY t.family ORDER BY connected_at DESC`
    )
    .all(userId, now) as { family: string; connected_at: number }[];
}

/** Drop dead rows so public endpoints can't grow the DB without bound. */
export function prune(db: Db, now = Date.now()): void {
  db.prepare("DELETE FROM oauth_codes WHERE expires_at < ?").run(now);
  db.prepare("DELETE FROM oauth_tokens WHERE expires_at < ? OR (revoked = 1 AND created_at < ?)").run(now, now - REFRESH_TTL_MS);
  db.prepare("DELETE FROM rate_hits WHERE window_start < ?").run(now - 24 * 60 * 60 * 1000);
}
