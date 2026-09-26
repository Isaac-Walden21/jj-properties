// Minimal OAuth 2.1 authorization server for the Claude connector (release 2).
// Public clients only (Claude registers itself via DCR), PKCE S256 required,
// rotating refresh tokens with reuse detection. Every function takes the DB so
// tests can run against :memory:.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export const ACCESS_TTL_MS = 60 * 60 * 1000; // 1 hour
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const CODE_TTL_MS = 5 * 60 * 1000;
export const MAX_CLIENTS = 200;

// Claude's hosted apps (claude.ai, Desktop, mobile, Cowork) all return here.
// Claude Code's loopback redirect is deliberately not supported.
export const ALLOWED_REDIRECTS = new Set([
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
]);

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
export type RegisterResult =
  | { ok: true; client: { client_id: string; client_name: string | null; redirect_uris: string[] } }
  | { ok: false; status: number; error: string; description: string };

export function registerClient(db: Db, body: unknown, now = Date.now()): RegisterResult {
  const b = (body ?? {}) as { redirect_uris?: unknown; client_name?: unknown };
  const uris = b.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || !uris.every((u) => typeof u === "string" && ALLOWED_REDIRECTS.has(u))) {
    return { ok: false, status: 400, error: "invalid_redirect_uri", description: "Only Claude's hosted callback is accepted." };
  }
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM oauth_clients").get() as { n: number };
  if (n >= MAX_CLIENTS) {
    return { ok: false, status: 503, error: "temporarily_unavailable", description: "Registration is full." };
  }
  const client_name = typeof b.client_name === "string" ? b.client_name.slice(0, 100) : null;
  const client_id = randomUUID();
  db.prepare("INSERT INTO oauth_clients (client_id, client_name, redirect_uris, created_at) VALUES (?, ?, ?, ?)").run(
    client_id,
    client_name,
    JSON.stringify(uris),
    now
  );
  return { ok: true, client: { client_id, client_name, redirect_uris: uris as string[] } };
}

export function getClient(db: Db, clientId: string) {
  const row = db.prepare("SELECT * FROM oauth_clients WHERE client_id = ?").get(clientId) as
    | { client_id: string; client_name: string | null; redirect_uris: string }
    | undefined;
  return row ? { ...row, redirect_uris: JSON.parse(row.redirect_uris) as string[] } : null;
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
  db: Db,
  q: Record<string, string | undefined>
): { ok: true; params: AuthorizeParams; clientName: string | null } | { ok: false; redirectable: boolean; error: string } {
  const client = q.client_id ? getClient(db, q.client_id) : null;
  if (!client) return { ok: false, redirectable: false, error: "Unknown client. Remove the connector in Claude and add it again." };
  if (!q.redirect_uri || !client.redirect_uris.includes(q.redirect_uri)) {
    return { ok: false, redirectable: false, error: "This sign-in link has an unexpected return address." };
  }
  if (q.response_type !== "code") return { ok: false, redirectable: true, error: "unsupported_response_type" };
  if (!q.code_challenge || q.code_challenge_method !== "S256") return { ok: false, redirectable: true, error: "invalid_request" };
  return {
    ok: true,
    clientName: client.client_name,
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
      | { family: string; client_id: string; user_id: number; expires_at: number; revoked: number }
      | undefined;
    if (!row) return { ok: false, error: "invalid_grant" };
    if (row.revoked) {
      // A rotated-out refresh token came back: assume it leaked, cut off the whole sign-in.
      revokeFamily(db, row.family);
      return { ok: false, error: "invalid_grant", description: "Refresh token reuse detected." };
    }
    if (row.expires_at < now || (f.client_id && f.client_id !== row.client_id)) return { ok: false, error: "invalid_grant" };
    db.prepare("UPDATE oauth_tokens SET revoked = 1 WHERE family = ?").run(row.family);
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
  db.prepare("UPDATE oauth_tokens SET revoked = 1 WHERE family = ?").run(family);
}

/** Connected Claude sign-ins for the Account page: one row per live refresh token. */
export function listConnections(db: Db, userId: number, now = Date.now()) {
  return db
    .prepare(
      `SELECT t.family, c.client_name, MIN(f.created_at) AS connected_at
         FROM oauth_tokens t
         JOIN oauth_clients c ON c.client_id = t.client_id
         JOIN oauth_tokens f ON f.family = t.family
        WHERE t.user_id = ? AND t.kind = 'refresh' AND t.revoked = 0 AND t.expires_at > ?
        GROUP BY t.family ORDER BY connected_at DESC`
    )
    .all(userId, now) as { family: string; client_name: string | null; connected_at: number }[];
}

/** Drop dead rows so public endpoints can't grow the DB without bound. */
export function prune(db: Db, now = Date.now()): void {
  db.prepare("DELETE FROM oauth_codes WHERE expires_at < ?").run(now);
  db.prepare("DELETE FROM oauth_tokens WHERE expires_at < ? OR (revoked = 1 AND created_at < ?)").run(now, now - REFRESH_TTL_MS);
  db.prepare(
    "DELETE FROM oauth_clients WHERE created_at < ? AND client_id NOT IN (SELECT DISTINCT client_id FROM oauth_tokens)"
  ).run(now - 24 * 60 * 60 * 1000);
  db.prepare("DELETE FROM rate_hits WHERE window_start < ?").run(now - 24 * 60 * 60 * 1000);
}
