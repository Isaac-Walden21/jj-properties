-- 0004_marketing_campaigns: campaigns, the per-recipient send ledger, the
-- durable at-most-once guard, and the tick lease.
--
-- Port of dumpstars db/migrations/002-campaigns.sql and 003-send-attempts.sql.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS campaigns (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  channel      TEXT    NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  segment      TEXT    NOT NULL DEFAULT '{}',   -- JSON SegmentDef, validated by parseSegment
  subject      TEXT    NOT NULL,
  body         TEXT    NOT NULL,
  status       TEXT    NOT NULL CHECK (status IN ('draft','scheduled','sending','done','paused')),
  scheduled_at TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- The materialised recipient list: who this campaign is for, and what happened
-- to each of them. Written once when a campaign starts sending, then updated
-- per recipient.
--
-- `reason` is why a recipient was skipped, copied verbatim from canSend. It is
-- what the "Suppressed, why" panel groups on, which is the whole reason
-- SuppressionReason is a closed union of strings rather than free text.
CREATE TABLE IF NOT EXISTS campaign_sends (
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','suppressed')),
  reason      TEXT,
  sent_at     TEXT,
  -- Composite PK, so materialising the same campaign twice is a no-op rather
  -- than a doubled send list.
  PRIMARY KEY (campaign_id, contact_id)
);
-- Partial: the engine only ever asks for the pending rows, and this stays tiny
-- as a campaign completes.
CREATE INDEX IF NOT EXISTS idx_sends_pending ON campaign_sends(campaign_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sends_sent_at ON campaign_sends(sent_at) WHERE status = 'sent';

-- SQLite rule: ALTER TABLE ... ADD COLUMN carrying a REFERENCES clause is only
-- legal when the new column defaults to NULL (with foreign_keys ON). Both of
-- these do. Do not add NOT NULL here.
ALTER TABLE messages         ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id) DEFAULT NULL;
ALTER TABLE marketing_events ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id) WHERE campaign_id IS NOT NULL;
-- Serves the per-campaign open/click/unsub counts.
CREATE INDEX IF NOT EXISTS idx_mevents_campaign  ON marketing_events(campaign_id, kind)
  WHERE campaign_id IS NOT NULL;

-- The durable at-most-once guard: one row per logical send, claimed BEFORE the
-- provider is called and resolved after.
--
-- The source needed a second Postgres connection pool for this, because its
-- begin() ran inside the caller's transaction and would have been rolled back
-- with it. In SQLite a bare INSERT is its own committed transaction, so the row
-- is durable the moment begin() returns -- which is the entire property this
-- table exists to provide. That is also why begin() must never be called inside
-- db.transaction(); see src/lib/db/sendAttempts.ts.
CREATE TABLE IF NOT EXISTS send_attempts (
  logical_key TEXT    PRIMARY KEY,
  contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  resolved    INTEGER NOT NULL DEFAULT 0,
  -- Set once when a human has been told about a stuck attempt, so one wedged
  -- send produces one alert rather than one per tick, forever.
  notified    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_unresolved ON send_attempts(created_at) WHERE resolved = 0;

-- Replaces Postgres `FOR UPDATE SKIP LOCKED`, which SQLite has no equivalent
-- for. The tick claims this row with
--   UPDATE ... WHERE locked_until IS NULL OR locked_until <= now
-- and proceeds only when changes = 1, so two overlapping ticks cannot both run
-- the send loop. The TTL means a tick that dies mid-run self-heals rather than
-- wedging the queue forever.
CREATE TABLE IF NOT EXISTS job_leases (
  name         TEXT PRIMARY KEY,
  locked_until TEXT,
  last_run_at  TEXT,
  last_result  TEXT
);
INSERT OR IGNORE INTO job_leases (name) VALUES ('marketing_tick');
