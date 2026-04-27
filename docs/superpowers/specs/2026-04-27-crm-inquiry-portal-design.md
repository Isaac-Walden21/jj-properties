# JJ Properties CRM — Inquiry Portal (Design)

**Date:** 2026-04-27
**Status:** Approved (pending spec review)
**Repo:** `~/Desktop/jj-properties`

## Goal

Persist every contact-form inquiry to a database and give JJ Properties staff a logged-in `/admin` portal to view, triage, and track inquiries through to close.

## Constraints

- Zero recurring cost to Twenty1 Media — all third-party accounts owned by client at handoff.
- Free-tier services only (Supabase, Resend, Vercel).
- Keep the existing email notification path untouched; CRM is additive.

## User Model

- **Single shared workspace.** Every authenticated staff user sees every inquiry. No per-property tenancy in v1.
- **Allowlist gate.** Only emails present in the `allowed_users` table can request a magic link or sign in.

## Architecture

- **Frontend:** New `/admin` route group inside the existing Next.js 16 app. Same repo, same Vercel deploy. Protected by Next.js middleware that checks Supabase session + allowlist membership.
- **Auth:** Supabase Auth, **magic link only**. No passwords.
- **Database:** Supabase Postgres with Row-Level Security.
- **Email:** Existing Resend integration unchanged for inquiry notifications. Magic-link delivery uses Supabase's built-in SMTP for v1; can be routed through Resend later if deliverability needs it.
- **Hosting:** Existing Vercel project for `jj-properties` — no new deploy target.

## Data Model

```sql
-- Inquiries from the public contact form
inquiries (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  first_name        text   not null,
  last_name         text   not null,
  email             text   not null,
  phone             text,
  inquiry_type      text   not null check (inquiry_type in ('buy','sell','invest','general')),
  property_interest text,   -- property slug or null
  message           text   not null,
  status            text   not null default 'new'
                            check (status in ('new','contacted','closed')),
  is_read           boolean not null default false,
  request_id        uuid   not null
);

-- Notes attached to an inquiry by staff
inquiry_notes (
  id          uuid primary key default gen_random_uuid(),
  inquiry_id  uuid not null references inquiries(id) on delete cascade,
  author_id   uuid not null references auth.users(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- Email allowlist controlling who can sign in
allowed_users (
  email     text primary key,
  added_at  timestamptz not null default now(),
  added_by  uuid references auth.users(id)
);
```

### RLS Policies

- **`inquiries`**
  - `select`: allowed if `auth.email()` is in `allowed_users`.
  - `update`: same. Only `status` and `is_read` are updatable from the client.
  - `insert`: handled server-side from the public API route using the service-role key. No client insert.
  - `delete`: blocked.
- **`inquiry_notes`**
  - `select` / `insert`: allowed if `auth.email()` is in `allowed_users`. `author_id` defaults to `auth.uid()`.
  - `update` / `delete`: only by author.
- **`allowed_users`**
  - `select`: any allowlisted user.
  - `insert` / `delete`: any allowlisted user (no admin tier in v1; team is small and trusted).

## Data Flow

### Inquiry submission (existing form, extended)

1. Visitor posts `/api/contact` (existing route).
2. Route validates with Zod, runs honeypot check, rate-limits (existing logic, unchanged).
3. **New step:** insert row into `inquiries` using Supabase service-role key. Failure does not block step 4.
4. Send notification email via Resend (existing logic, unchanged).
5. Return success to client.

Order matters: DB write before email send. If DB fails we still email (no lost leads). If email fails after DB write succeeds, the inquiry is recoverable from the portal.

### Staff sign-in

1. Staff visits `/admin/login`, enters email.
2. Server route checks `allowed_users` — if not present, returns the same generic success response (no email enumeration).
3. If allowed, calls `supabase.auth.signInWithOtp({ email })`. Supabase emails the magic link.
4. Click → `/admin/auth/callback` exchanges the code for a session → redirect to `/admin`.

### Dashboard usage

1. Middleware on `/admin/**` checks Supabase session and allowlist; otherwise redirects to `/admin/login`.
2. List page reads inquiries via Supabase client (RLS scopes the query). Filters and search are URL-state.
3. Detail page allows: change status (`new` / `contacted` / `closed`), toggle `is_read`, add notes.

## Pages

| Route                          | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `/admin/login`                 | Magic-link request form                                     |
| `/admin/auth/callback`         | Supabase OAuth/OTP callback handler                         |
| `/admin`                       | Inquiries list, default filter `status=new`, unread badges  |
| `/admin/inquiries/[id]`        | Inquiry detail + status dropdown + notes thread             |
| `/admin/users`                 | Manage allowlisted emails (add/remove)                      |

## UI Notes

- Reuse existing Tailwind 4 design tokens and components from the marketing site.
- List view: table on desktop, stacked cards on mobile. Columns: name, email, type, property, status, received.
- Detail view: two columns on desktop (inquiry on left, notes on right), stacked on mobile.
- All admin pages use a shared `<AdminShell>` layout with a top bar: logo, nav (Inquiries / Users), sign-out.

## Environment Variables (added)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     # server-only, used in /api/contact for inserts
```

`.env.example` updated with the new keys. Existing `RESEND_*` keys stay.

## Account Ownership & Handoff

- Build phase: Supabase project, Vercel project, GitHub repo, and Resend account live under Twenty1 Media accounts.
- At handoff: project ownership transferred to client-owned organizations. Twenty1 Media remains added as a member on each so future maintenance does not require client involvement.

## Testing

- Unit: Zod schemas (existing), allowlist check helper, RLS policy unit tests against a Supabase test branch.
- Integration: contact submission writes a row and sends email; sign-in flow with allowlisted vs non-allowlisted emails; status update and note creation through the UI.
- Manual smoke before handoff: end-to-end form → DB → portal triage → status close.

## Out of Scope (v1)

- Reply-from-portal (replies happen in email)
- Activity log / audit trail
- Assigned-to or multi-tenant per-property views
- Slack notifications
- Inquiry export (CSV)
- Admin role tier (everyone allowlisted is equal)

## Success Criteria

- Every inquiry submitted to `/api/contact` appears in the `/admin` dashboard within seconds.
- An allowlisted user can sign in via magic link without a password ever existing.
- Staff can move an inquiry through `new → contacted → closed` and attach notes.
- Adding a new staff member requires only adding their email at `/admin/users`.
- All third-party accounts can be transferred to the client without a code change.
