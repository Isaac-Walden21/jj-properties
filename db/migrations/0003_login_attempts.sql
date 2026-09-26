-- Failed sign-in counter, keyed by "user:<name>" and "ip:<addr>". Lives in SQLite
-- so a service restart doesn't reset a lockout.
CREATE TABLE IF NOT EXISTS login_attempts (
  key          TEXT    PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL -- epoch ms
);
