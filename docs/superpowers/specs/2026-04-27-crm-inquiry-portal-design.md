# JJ Properties CRM — Inquiry Portal (Design)

**Date:** 2026-04-27
**Revised:** 2026-06-06 — architecture pivoted from Supabase/Vercel to AWS (Lightsail + SQLite + SES, custom username/password auth). See Revision History.
**Status:** Approved (architecture revised — implementation plan needs re-derivation)
**Repo:** `~/Desktop/JJ-Properties`

## Revision History

- **2026-06-06** — Replaced the Supabase-centric backend with an AWS stack to match how Twenty1 Media now runs its projects (Homefront, Waterway on Lightsail):
  - **Hosting:** Marketing site stays live on **Vercel** during the build. A **copy of the app runs on an AWS Lightsail box** where the CRM is developed and hosted, then we cut over (DNS) like the Homefront migration. Until cutover, Vercel = public production.
  - **Database:** Supabase Postgres + RLS → **SQLite file on the Lightsail box** (same pattern as Homefront).
  - **Auth:** Supabase magic-link → **custom username + password** auth (bcrypt hashes, signed session cookie).
  - **Email:** Resend → **Amazon SES** (Vercel copy keeps Resend until cutover; see Data Flow).
  - This also resolves the original Supabase $10/mo blocker — the new stack adds ~$5/mo flat for the Lightsail box and ~$0 for SES at this volume.
- **2026-04-27** — Original design (Supabase + Vercel + Resend).

## Goal

Persist every contact-form inquiry to a database and give JJ Properties staff a logged-in `/admin` portal to view, triage, and track inquiries through to close.

## Constraints

- Minimal, flat, predictable recurring cost — all AWS/third-party accounts owned by client at handoff. Target ~$5/mo (one Lightsail box); SES is effectively free at this volume.
- AWS-first stack to match Twenty1 Media's other projects (Lightsail + SQLite, per Homefront/Waterway).
- The live marketing site on Vercel must keep working unchanged during the build; CRM is additive and developed on the AWS copy.

## User Model

- **Single shared workspace.** Every authenticated staff user sees every inquiry. No per-property tenancy in v1.
- **Account gate.** Only users with a row in the `users` table (username + bcrypt password hash) can sign in. New staff are provisioned from `/admin/users`. There is no public sign-up.

## Architecture

- **Frontend:** New `/admin` route group inside the existing Next.js 16 app, same repo. Protected by Next.js middleware that validates a signed session cookie.
- **Auth:** Custom **username + password**. Passwords stored as bcrypt hashes in the `users` table. On login the server verifies the hash and issues an httpOnly, signed session cookie (e.g. `iron-session` or a `jose`-signed JWT). No third-party auth service.
- **Database:** **SQLite** file on the Lightsail box (e.g. `/var/lib/jj-crm/crm.db`), accessed server-side via `better-sqlite3`. `PRAGMA foreign_keys = ON`. No RLS — access is enforced at the app layer (see Access Control). Nightly file-copy backup.
- **Email:** **Amazon SES** for inquiry notifications and (later) any transactional email. Sent server-side via the AWS SDK v3 (`@aws-sdk/client-ses`). Requires a verified sending domain/identity and leaving the SES sandbox before production sends.
- **Hosting & deploy:** During the build, the public site stays on the **existing Vercel project** (`jj-properties.vercel.app`) unchanged. A **copy of the app runs on an AWS Lightsail instance** (Ubuntu, 1 GB / $5-mo bundle recommended; 512 MB / $3.50 is a fallback if the app is built in CI and only run on the box). The Lightsail box runs the Next.js app in production mode under a process manager (PM2 or systemd) behind nginx, with the SQLite file on the instance's local disk. Deploy by pushing a `prod` branch and pulling on the box — same flow as Homefront. At cutover, DNS moves to the Lightsail static IP and the box becomes production.

### Vercel vs AWS during the transition

| Concern | Vercel copy (live now) | AWS Lightsail copy (CRM build) |
| --- | --- | --- |
| Public marketing site | Yes (production) | Yes (staging until cutover) |
| `/admin` CRM portal | Not deployed | Yes |
| Inquiry persistence | None (email only, via Resend) | SQLite |
| Contact email | Resend (unchanged) | Amazon SES |

After cutover the Vercel project is retired (or kept as a fallback), and Resend can be dropped in favor of SES.

## Data Model

SQLite dialect (`better-sqlite3`). Integer surrogate PKs; timestamps stored as ISO-8601 text via `datetime('now')`. `request_id` stays a generated UUID string for tracing a submission across logs/email. Enable `PRAGMA foreign_keys = ON` at connection open.

```sql
-- Staff accounts that can sign in to /admin
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,                 -- bcrypt
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  added_by      INTEGER REFERENCES users(id)
);

-- Inquiries from the public contact form
CREATE TABLE inquiries (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  first_name        TEXT    NOT NULL,
  last_name         TEXT    NOT NULL,
  email             TEXT    NOT NULL,
  phone             TEXT,
  inquiry_type      TEXT    NOT NULL CHECK (inquiry_type IN ('buy','sell','invest','general')),
  property_interest TEXT,                          -- property slug or null
  message           TEXT    NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new','contacted','closed')),
  is_read           INTEGER NOT NULL DEFAULT 0,    -- 0/1 boolean
  request_id        TEXT    NOT NULL               -- UUID generated in /api/contact
);

-- Notes attached to an inquiry by staff
CREATE TABLE inquiry_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id  INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id),
  body        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_inquiries_status     ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at);
CREATE INDEX idx_notes_inquiry        ON inquiry_notes(inquiry_id);
```

### Access Control (app layer, replaces RLS)

SQLite has no row-level security, so all authorization is enforced in the application:

- **Every `/admin/**` page and `/api/admin/**` route** requires a valid signed session cookie (checked in middleware). Unauthenticated requests redirect to `/admin/login` (pages) or return 401 (API).
- **`inquiries`** — any authenticated user may read all rows and update only `status` / `is_read`. Inserts happen only server-side from `/api/contact`. No delete path is exposed.
- **`inquiry_notes`** — any authenticated user may read and create notes; `author_id` is set from the session, never the client. Edit/delete restricted to the authoring user (enforced by comparing `author_id` to the session user id).
- **`users`** — any authenticated user may add or remove staff accounts (no admin tier in v1; team is small and trusted). Passwords are hashed with bcrypt before insert; raw passwords are never stored or logged.

## Data Flow

### Inquiry submission (existing form, extended)

1. Visitor posts `/api/contact` (existing route).
2. Route validates with Zod, runs honeypot check, rate-limits (existing logic, unchanged).
3. **New step:** generate a `request_id` and insert a row into `inquiries` (SQLite, server-side). Failure does not block step 4.
4. Send notification email — **Amazon SES** on the AWS copy (Resend on the Vercel copy until cutover). Existing template/recipient logic preserved.
5. Return success to client.

Order matters: DB write before email send. If the DB write fails we still email (no lost leads). If email fails after the DB write succeeds, the inquiry is recoverable from the portal.

### Staff sign-in

1. Staff visits `/admin/login`, enters **username + password**.
2. Server route looks up the user by username and verifies the password against the stored bcrypt hash. On failure it returns a generic "invalid credentials" message (no user enumeration) and is rate-limited.
3. On success it creates a signed, httpOnly session cookie (short idle lifetime, sliding renewal) and redirects to `/admin`. Sign-out clears the cookie.

There is no magic-link or callback route — auth is fully self-contained.

### Dashboard usage

1. Middleware on `/admin/**` validates the session cookie; otherwise redirects to `/admin/login`.
2. List page reads inquiries from SQLite server-side. Filters and search are URL-state.
3. Detail page allows: change status (`new` / `contacted` / `closed`), toggle `is_read`, add notes.

## Pages

| Route                          | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `/admin/login`                 | Username + password sign-in form                            |
| `/admin`                       | Inquiries list, default filter `status=new`, unread badges  |
| `/admin/inquiries/[id]`        | Inquiry detail + status dropdown + notes thread             |
| `/admin/users`                 | Manage staff accounts (add/remove, set/reset password)      |

## UI Notes

- Reuse existing Tailwind 4 design tokens and components from the marketing site.
- List view: table on desktop, stacked cards on mobile. Columns: name, email, type, property, status, received.
- Detail view: two columns on desktop (inquiry on left, notes on right), stacked on mobile.
- All admin pages use a shared `<AdminShell>` layout with a top bar: logo, nav (Inquiries / Users), sign-out.

## Environment Variables (added)

```
# Database
SQLITE_DB_PATH=/var/lib/jj-crm/crm.db   # local path on the Lightsail box

# Session / auth
SESSION_SECRET=                          # 32+ byte random, signs the session cookie
BCRYPT_COST=12                           # optional, defaults to 12

# Amazon SES (AWS copy)
AWS_REGION=
AWS_ACCESS_KEY_ID=                       # or an instance IAM role on Lightsail
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=                          # verified SES identity
LEAD_TO_EMAIL=                           # inquiry-notification recipient
```

`.env.example` updated with the new keys; the now-unused `SUPABASE_*` placeholders are removed. The Vercel copy keeps its existing `RESEND_*` keys until cutover; the AWS copy uses the SES keys above.

## Account Ownership & Handoff

- Build phase: AWS account (Lightsail + SES), GitHub repo, and the existing Vercel project live under Twenty1 Media accounts. Resend stays under Twenty1 Media until the Vercel copy is retired.
- At handoff: the Lightsail instance (or a snapshot) and the SES domain identity move to a client-owned AWS account; GitHub repo ownership transfers to the client. Twenty1 Media remains added with access on each so future maintenance does not require client involvement.
- The SQLite database is a single file on the box — handoff includes its backup/restore procedure (nightly copy off-box; restore = drop the file in place).

## Testing

- Unit: Zod schemas (existing), password hash/verify helper, session sign/verify helper, SQLite query functions against an in-memory/temp DB.
- Integration: contact submission writes a row and sends email; sign-in flow with valid vs invalid credentials (and rate-limit behavior); status update and note creation through the UI; middleware blocks unauthenticated `/admin/**`.
- Manual smoke before cutover: end-to-end form → SQLite → portal triage → status close, on the Lightsail box with SES sending live.

## Out of Scope (v1)

- Reply-from-portal (replies happen in email)
- Activity log / audit trail
- Assigned-to or multi-tenant per-property views
- Slack notifications
- Inquiry export (CSV)
- Admin role tier (every staff account is equal)

## Success Criteria

- Every inquiry submitted to `/api/contact` is persisted to SQLite and appears in the `/admin` dashboard within seconds.
- A staff user can sign in with username + password; sessions expire and sign-out works; unauthenticated access to `/admin/**` is blocked.
- Staff can move an inquiry through `new → contacted → closed` and attach notes.
- Adding a new staff member requires only creating their account at `/admin/users`.
- The AWS resources (Lightsail box + SES identity) and repo can be transferred to the client without a code change.
