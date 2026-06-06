-- 0001_init: CRM schema for JJ Properties inquiry portal (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  added_by      INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash  TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT    NOT NULL,
  used_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inquiries (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  first_name        TEXT    NOT NULL,
  last_name         TEXT    NOT NULL,
  email             TEXT    NOT NULL,
  phone             TEXT,
  inquiry_type      TEXT    NOT NULL CHECK (inquiry_type IN ('buy','sell','invest','general')),
  property_interest TEXT,
  source_page       TEXT,
  source_property   TEXT,
  message           TEXT    NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new','contacted','closed')),
  is_read           INTEGER NOT NULL DEFAULT 0,
  request_id        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_property   ON inquiries(property_interest);
CREATE INDEX IF NOT EXISTS idx_inquiries_source     ON inquiries(source_property);

CREATE TABLE IF NOT EXISTS inquiry_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id  INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id),
  body        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_inquiry  ON inquiry_notes(inquiry_id, created_at);
CREATE INDEX IF NOT EXISTS idx_resets_user    ON password_resets(user_id);
