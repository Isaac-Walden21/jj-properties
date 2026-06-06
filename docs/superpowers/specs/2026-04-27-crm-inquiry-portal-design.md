# JJ Properties CRM — Inquiry Portal (Design)

**Date:** 2026-04-27
**Revised:** 2026-06-06 — architecture pivoted from Supabase/Vercel to AWS (Lightsail + SQLite + SES, custom username/password auth). See Revision History.
**Status:** Approved (architecture + v1 scope revised — implementation plan needs updating to match)
**Repo:** `~/Desktop/JJ-Properties`

## Revision History

- **2026-06-06 (scope)** — Added four gap-fixers to v1 and promoted three deferred items to a planned backlog (see User Stories, Backlog):
  - **v1 additions:** staff self password-change + forgot/reset (via SES link); **admin vs staff role tier** (only admins manage accounts); **auto-acknowledgement email** to the inquirer; **lead-source capture** (which page/property the inquiry came from).
  - **Promoted to backlog (post-v1):** reply-to-inquirer from the portal; reporting dashboard (counts by week/type/property, date filter, CSV); audit log + soft-delete.
  - **Considered, deferred (not scheduled):** assignment + follow-up reminder dates.
- **2026-06-06 (architecture)** — Replaced the Supabase-centric backend with an AWS stack to match how Twenty1 Media now runs its projects (Homefront, Waterway on Lightsail):
  - **Hosting:** Marketing site stays live on **Vercel** during the build. A **copy of the app runs on an AWS Lightsail box** where the CRM is developed and hosted, then we cut over (DNS) like the Homefront migration. Until cutover, Vercel = public production.
  - **Database:** Supabase Postgres + RLS → **SQLite file on the Lightsail box** (same pattern as Homefront).
  - **Auth:** Supabase magic-link → **custom username + password** auth (bcrypt hashes, signed session cookie).
  - **Email:** Resend → **Amazon SES** (Vercel copy keeps Resend until cutover; see Data Flow).
  - This also resolves the original Supabase $10/mo blocker — the new stack adds ~$5/mo flat for the Lightsail box and ~$0 for SES at this volume.
- **2026-04-27** — Original design (Supabase + Vercel + Resend).

## Goal

Persist every contact-form inquiry to a database and give JJ Properties staff a logged-in `/admin` portal to view, triage, and track inquiries through to close.

## User Stories

**Personas:** *Inquirer* (public visitor using the contact form), *Staff* (office staff handling inquiries), *Admin* (owner who also manages accounts).

### v1 (in scope)

**Capture & notify**
- As an **inquirer**, when I submit the contact form, my inquiry is saved so it is never lost — even if the notification email fails.
- As an **inquirer**, I receive an automatic acknowledgement email so I know my message was received. *(added 2026-06-06)*
- As **staff**, I receive an email notification of every new inquiry so I am alerted in real time.

**Triage**
- As **staff**, I see all inquiries in one list, newest first, with unread highlighted, so I know what needs attention.
- As **staff**, I filter by status/type and search by name/email so I can find the right inquiry.
- As **staff**, I open an inquiry to read full context (contact info, type, property interest, message, **lead source**).
- As **staff**, opening an inquiry marks it read so the team sees it has been handled.
- As **staff**, I move an inquiry through `new → contacted → closed` so I can track progress.
- As **staff**, I add notes to an inquiry so the team shares context.
- As an **owner**, I can see which page/property an inquiry came from so I know what drives leads. *(added 2026-06-06)*

**Access & accounts**
- As **staff**, I sign in with a username and password so only authorized people see inquiries.
- As **staff**, I can change my own password, and reset a forgotten one via an email link, without needing an admin. *(added 2026-06-06)*
- As an **admin**, I add/remove staff accounts and only admins can do so. *(role tier added 2026-06-06)*

### Backlog (planned, post-v1)

- As **staff**, I can reply to an inquirer from the portal (sent via SES, logged on the inquiry) so the whole conversation lives in one place.
- As an **owner**, I see a reporting dashboard (new this week, counts by type and by property, date-range filter) and can export inquiries to CSV.
- As an **owner**, I have an audit log (who changed status, who viewed) and deletes are soft/archive rather than permanent, so nothing is truly lost and actions are accountable.

### Considered, not scheduled

- Assignment of an inquiry to a specific teammate + follow-up reminder dates. *(useful once the team/volume grows; revisit then.)*

## Constraints

- Minimal, flat, predictable recurring cost — all AWS/third-party accounts owned by client at handoff. Target ~$5/mo (one Lightsail box); SES is effectively free at this volume.
- AWS-first stack to match Twenty1 Media's other projects (Lightsail + SQLite, per Homefront/Waterway).
- The live marketing site on Vercel must keep working unchanged during the build; CRM is additive and developed on the AWS copy.

## User Model

- **Single shared workspace.** Every authenticated user (staff or admin) sees every inquiry. No per-property tenancy in v1.
- **Two roles.** `admin` and `staff`. Both can triage inquiries and add notes equally. Only `admin` can manage accounts at `/admin/users`. The bootstrap user created at deploy is an `admin`.
- **Account gate.** Only users with a row in the `users` table (username + bcrypt password hash) can sign in. Staff are provisioned by an admin from `/admin/users`. There is no public sign-up.
- **Self-service credentials.** Any signed-in user can change their own password at `/admin/account`. A user who has forgotten their password can request a reset link (emailed via SES) from `/admin/forgot-password`.

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
-- Staff/admin accounts that can sign in to /admin
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,                 -- bcrypt
  role          TEXT    NOT NULL DEFAULT 'staff'
                        CHECK (role IN ('admin','staff')),   -- only admins manage accounts
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  added_by      INTEGER REFERENCES users(id)
);

-- One-time password-reset tokens (forgot-password flow)
CREATE TABLE password_resets (
  token_hash  TEXT    PRIMARY KEY,                -- SHA-256 of the emailed token; raw token never stored
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT    NOT NULL,                   -- short TTL, e.g. 30 minutes
  used_at     TEXT,                               -- set when consumed; single-use
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
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
  property_interest TEXT,                          -- property slug the inquirer is interested in, or null
  source_page       TEXT,                          -- path the form was submitted from, e.g. /sell  (lead source)
  source_property   TEXT,                          -- property slug in context at submit time, if any (lead source)
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
CREATE INDEX idx_inquiries_source     ON inquiries(source_property);
CREATE INDEX idx_notes_inquiry        ON inquiry_notes(inquiry_id);
CREATE INDEX idx_resets_user          ON password_resets(user_id);
```

> `source_page` / `source_property` are populated from the public form (hidden fields or the request `Referer`), captured server-side in `/api/contact`. They are distinct from `property_interest`, which is what the inquirer explicitly selected. Lead-source attribution rolls up from `source_property` in the backlog reporting dashboard.

### Access Control (app layer, replaces RLS)

SQLite has no row-level security, so all authorization is enforced in the application:

- **Every `/admin/**` page and `/api/admin/**` route** requires a valid signed session cookie (checked in middleware). Unauthenticated requests redirect to `/admin/login` (pages) or return 401 (API).
- **`inquiries`** — any authenticated user may read all rows and update only `status` / `is_read`. Inserts happen only server-side from `/api/contact`. No delete path is exposed.
- **`inquiry_notes`** — any authenticated user may read and create notes; `author_id` is set from the session, never the client. Edit/delete restricted to the authoring user (enforced by comparing `author_id` to the session user id).
- **`users`** — **admin-only** for add/remove and role changes (the session's `role` must be `admin`; staff requests are rejected). Any authenticated user may change *their own* password at `/admin/account` (verifying the current password first). Passwords are hashed with bcrypt before insert/update; raw passwords are never stored or logged.
- **`password_resets`** — written/read only server-side. The emailed token is random and single-use; only its SHA-256 hash is stored. A reset is accepted only if the matching unused row exists and `expires_at` is in the future, after which it is marked `used_at`. The forgot-password endpoint always returns a generic success response (no account enumeration) and is rate-limited.

## Data Flow

### Inquiry submission (existing form, extended)

1. Visitor posts `/api/contact` (existing route). The form also submits the current `source_page` (and `source_property` when on a property page) as hidden fields; the server falls back to the `Referer` header.
2. Route validates with Zod, runs honeypot check, rate-limits (existing logic, unchanged).
3. **New step:** generate a `request_id` and insert a row into `inquiries` including `source_page` / `source_property` (SQLite, server-side). Failure does not block the email steps.
4. Send the **staff notification** email — **Amazon SES** on the AWS copy (Resend on the Vercel copy until cutover). Existing template/recipient logic preserved.
5. **New step:** send an **auto-acknowledgement** email to the inquirer ("we received your message, we'll be in touch"). Best-effort — failure is logged, not surfaced, and never blocks the success response.
6. Return success to client.

Order matters: DB write before email sends. If the DB write fails we still email (no lost leads). If an email fails after the DB write succeeds, the inquiry is recoverable from the portal.

### Password reset (forgot-password)

1. User submits their email at `/admin/forgot-password`.
2. Server looks up the account. **Regardless of whether it exists**, it returns the same generic "if that account exists, a reset link is on the way" response (no enumeration) and is rate-limited.
3. If the account exists: generate a random token, store its SHA-256 hash in `password_resets` with a short TTL, and email the raw token as a link (`/admin/reset-password?token=…`) via SES.
4. User opens the link and sets a new password. The server validates the token (exists, unused, unexpired), hashes the new password, updates `users.password_hash`, marks the reset `used_at`, and signs the user in (or redirects to login).

### Change password (signed-in)

1. At `/admin/account`, a signed-in user submits current + new password.
2. Server verifies the current password against the stored hash, then updates to the new bcrypt hash. Other sessions are unaffected in v1.

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
| `/admin/forgot-password`       | Request a reset link (generic response; no enumeration)     |
| `/admin/reset-password`        | Set a new password from a valid emailed token               |
| `/admin/account`               | Change own password (any signed-in user)                    |
| `/admin`                       | Inquiries list, default filter `status=new`, unread badges  |
| `/admin/inquiries/[id]`        | Inquiry detail (incl. lead source) + status + notes thread  |
| `/admin/users`                 | **Admin-only** — manage staff accounts and roles            |

## UI Notes

- Reuse existing Tailwind 4 design tokens and components from the marketing site.
- List view: table on desktop, stacked cards on mobile. Columns: name, email, type, property, status, received.
- Detail view: two columns on desktop (inquiry on left, notes on right), stacked on mobile.
- All admin pages use a shared `<AdminShell>` layout with a top bar: logo, nav (Inquiries / Users — Users shown to admins only), an account menu (Change password), and sign-out.

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
SES_FROM_EMAIL=                          # verified SES identity (also From for auto-ack + reset emails)
LEAD_TO_EMAIL=                           # inquiry-notification recipient

# Site
NEXT_PUBLIC_SITE_URL=                    # base URL used to build password-reset links
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

## Backlog (planned, post-v1)

Designed for but intentionally not built in v1; see User Stories for the narrative form.

- **Reply-to-inquirer from the portal** — compose/send via SES from the inquiry page, logged on the inquiry as outbound activity.
- **Reporting dashboard** — counts by week, by inquiry type, and by `source_property`; date-range filter; CSV export.
- **Audit log + soft delete** — record status changes and views; archive rather than hard-delete inquiries/accounts.

## Out of Scope (not planned)

- Assignment of inquiries to a specific teammate + follow-up reminder dates (considered; revisit as the team/volume grows).
- Multi-tenant per-property logins / tenancy (single shared workspace only).
- Slack/SMS notifications.
- Two-factor authentication.

## Success Criteria

- Every inquiry submitted to `/api/contact` is persisted to SQLite (with lead source) and appears in the `/admin` dashboard within seconds.
- The inquirer receives an auto-acknowledgement email; staff receive the notification email.
- A user can sign in with username + password; sessions expire and sign-out works; unauthenticated access to `/admin/**` is blocked.
- A user can change their own password, and recover a forgotten one via a single-use, time-limited email link.
- Only admins can reach `/admin/users` and add/remove accounts; staff attempting account management are rejected.
- Staff can move an inquiry through `new → contacted → closed` and attach notes.
- The AWS resources (Lightsail box + SES identity) and repo can be transferred to the client without a code change.
