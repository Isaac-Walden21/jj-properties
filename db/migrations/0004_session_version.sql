-- Bumped on every password change/reset. Sessions carry the value they were
-- issued with; a mismatch signs that session out.
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
