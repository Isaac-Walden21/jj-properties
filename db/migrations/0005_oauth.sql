-- Claude connector: OAuth clients (registered by Claude via DCR), single-use
-- authorization codes, and access/refresh tokens. Codes and tokens are stored
-- as SHA-256 hashes, never raw. All times are epoch ms.
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id     TEXT    PRIMARY KEY,
  client_name   TEXT,
  redirect_uris TEXT    NOT NULL, -- JSON array
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_codes (
  code_hash      TEXT    PRIMARY KEY,
  client_id      TEXT    NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri   TEXT    NOT NULL,
  code_challenge TEXT    NOT NULL,
  expires_at     INTEGER NOT NULL
);

-- family groups one sign-in: every rotated refresh token and the access tokens
-- issued alongside it. Revoking the family disconnects that Claude session.
CREATE TABLE IF NOT EXISTS oauth_tokens (
  token_hash TEXT    PRIMARY KEY,
  kind       TEXT    NOT NULL CHECK (kind IN ('access','refresh')),
  family     TEXT    NOT NULL,
  client_id  TEXT    NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_family ON oauth_tokens(family);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user   ON oauth_tokens(user_id);

-- Fixed-window request counter for the public OAuth/MCP endpoints.
CREATE TABLE IF NOT EXISTS rate_hits (
  key          TEXT    PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);
