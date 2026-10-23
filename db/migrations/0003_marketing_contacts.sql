-- 0003_marketing_contacts: contacts, tags, append-only event log, message log.
--
-- Port of dumpstars db/migrations/001-marketing-schema.sql, minus org_id and
-- RLS (single tenant), minus SMS, minus automations.
--
-- The load-bearing idea, carried over unchanged: suppression state is DERIVED
-- from rows in marketing_events, not stored in a mutable consents table. There
-- is nothing to keep in sync, so nothing can drift out of sync -- a contact is
-- suppressed exactly when the event log says they asked to be, or a provider
-- told us so.

PRAGMA foreign_keys = ON;

-- Identity is EMAIL ONLY, and that is the one real inversion from the source.
-- DumpStars keyed contacts on phone (normalised to the last 10 digits) because
-- its business arrived by phone call. J&J's channel is email: every inquiry has
-- one, there is no SMS in scope, and a contact with no email address cannot be
-- mailed and so is not a marketing contact at all.
--
-- Phone is still stored, normalised, because staff ring these people back. It
-- is display data. It is never a join key and never decides identity.
CREATE TABLE IF NOT EXISTS contacts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT    NOT NULL,               -- trimmed + lowercased before it gets here
  phone        TEXT,                           -- last 10 digits, display only
  first_name   TEXT,
  last_name    TEXT,
  -- Where this contact came from. Never rewritten after the first insert: a
  -- guest imported from a 2019 list who later fills in the contact form is
  -- still, provably, someone we imported. That matters for CASL.
  source       TEXT    NOT NULL CHECK (source IN ('inquiry','import','manual')),
  consent_note TEXT,                           -- free text provenance, required on import
  consent_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  -- Test contacts receive test-sends only. Real campaigns exclude them at the
  -- audience level, so a staff address cannot end up in a client's send stats.
  is_test      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- A real UNIQUE index, which is what lets upsertContact be a plain
-- INSERT ... ON CONFLICT. The source needed pg_advisory_xact_lock here only
-- because its email column had no unique constraint; SQLite serialises writers
-- and this index settles the rest.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email   ON contacts(email);
CREATE INDEX        IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC);
CREATE INDEX        IF NOT EXISTS idx_contacts_source  ON contacts(source);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag        TEXT    NOT NULL,
  -- 'manual'   a person typed it
  -- 'import'   applied to a whole CSV batch, so a bad batch can be segmented
  --            out or removed as a unit
  -- 'computed' derived from data (e.g. property:cedarville-hotel)
  kind       TEXT    NOT NULL CHECK (kind IN ('manual','import','computed')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (contact_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags(tag);

-- Append-only. Never updated, never deleted.
--
-- UNIQUE (kind, dedup_key) is what makes ingest idempotent: SNS redelivers
-- aggressively, and a redelivered bounce must not become two suppression
-- signals or two ticks on a campaign's analytics.
CREATE TABLE IF NOT EXISTS marketing_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  -- ON DELETE SET NULL, not CASCADE: if a contact is ever removed we still want
  -- the record that an address complained, so we do not mail it again after
  -- someone re-imports it.
  contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  -- Real column, added in 0004 once campaigns exists. The webhook resolves it
  -- from messages.provider_id at ingest, which is what makes per-campaign open
  -- and click counts exact rather than windowed guesses.
  kind        TEXT    NOT NULL,
  -- inquiry, imported, email_sent, email_delivered, email_opened,
  -- email_clicked, email_bounced, email_bounced_transient, email_complaint,
  -- email_unsub, opt_out
  dedup_key   TEXT    NOT NULL,
  payload     TEXT    NOT NULL DEFAULT '{}',   -- JSON as TEXT; SQLite has no jsonb
  occurred_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (kind, dedup_key)
);
CREATE INDEX IF NOT EXISTS idx_mevents_contact ON marketing_events(contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_mevents_kind    ON marketing_events(kind, occurred_at DESC);
-- Serves the three suppression probes in getContactView, which run on every
-- single send. Partial so it stays small: suppression events are a tiny
-- fraction of the log once opens and clicks start arriving.
CREATE INDEX IF NOT EXISTS idx_mevents_suppress ON marketing_events(contact_id)
  WHERE kind IN ('opt_out','email_unsub','email_bounced','email_complaint');

-- Every outbound message, including the ones that were suppressed and never
-- sent. A suppressed row is the audit trail for "we decided not to email this
-- person, and here is why" -- see campaign_sends.reason in 0004.
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel     TEXT    NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  direction   TEXT    NOT NULL DEFAULT 'out'   CHECK (direction = 'out'),
  kind        TEXT    NOT NULL CHECK (kind IN ('marketing','transactional')),
  subject     TEXT,
  body        TEXT    NOT NULL,
  -- The SES MessageId. Every inbound open/click/bounce event joins back on
  -- this, so dropping it silently costs all per-campaign attribution.
  provider_id TEXT,
  status      TEXT    NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','suppressed','failed')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_contact  ON messages(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_provider ON messages(provider_id) WHERE provider_id IS NOT NULL;
-- The frequency-cap probe: the hottest read on the send path, once per
-- recipient per campaign. Partial, because only sent marketing mail counts.
CREATE INDEX IF NOT EXISTS idx_messages_mkt_sent ON messages(contact_id, created_at DESC)
  WHERE kind = 'marketing' AND status = 'sent';

-- Replaces the source's org_meta. Holds the daily send cap override and the
-- housekeeping cursors.
CREATE TABLE IF NOT EXISTS marketing_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
