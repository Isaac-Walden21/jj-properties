# CRM Inquiry Portal — Implementation Plan (AWS stack)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Revised 2026-06-06 — AWS rewrite.** This plan supersedes the original Supabase/Vercel version. The CRM now runs on an AWS Lightsail box with **SQLite** for storage, **custom username/password auth** (bcrypt + `iron-session`), and **Amazon SES** for email. The public marketing site stays live on Vercel until DNS cutover; the CRM is built and hosted on the Lightsail copy. See the spec's Revision History for the rationale.

**Goal:** Persist every contact-form inquiry to SQLite and ship a password-protected `/admin` portal where JJ Properties staff can triage inquiries (view, status, mark-read, notes, manage staff accounts).

**Architecture:** New `/admin` route group inside the existing Next.js 16 app. SQLite (`better-sqlite3`) accessed **server-side only** — all reads happen in Server Components and all writes happen through **Server Actions** (no client DB client, no RLS). Auth is username + password: bcrypt hashes in a `users` table, verified server-side, with a signed httpOnly session cookie via `iron-session`. Next.js middleware guards `/admin/**`. The existing `/api/contact` route is extended to `INSERT` an inquiry before sending email; email goes through Amazon SES on the box (Resend stays on the Vercel copy until cutover, selected by an `EMAIL_PROVIDER` env var).

**Tech Stack:** Next.js 16 (App Router) · React 19 · Tailwind 4 · TypeScript · `better-sqlite3` · `bcryptjs` · `iron-session` · `@aws-sdk/client-ses` · Zod (existing) · Vitest.

**Spec:** `docs/superpowers/specs/2026-04-27-crm-inquiry-portal-design.md`

**Repo root (all commands assume this cwd):** `/Users/asherwalden/Desktop/JJ-Properties`

---

## File Structure

**Created:**
- `db/migrations/0001_init.sql` — SQLite schema + indexes
- `scripts/migrate.mjs` — idempotent migration runner
- `scripts/create-user.mjs` — bootstrap/admin user creator (bcrypt)
- `src/lib/db/index.ts` — `better-sqlite3` connection singleton (server-only)
- `src/lib/db/inquiries.ts` — inquiry queries (create/list/get/update)
- `src/lib/db/notes.ts` — note queries (list/create)
- `src/lib/db/users.ts` — user queries (getByUsername/list/create/remove)
- `src/lib/auth/password.ts` — `hashPassword` / `verifyPassword`
- `src/lib/auth/password.test.ts` — unit tests
- `src/lib/auth/session.ts` — `iron-session` config + `getSession` / `requireSession`
- `src/lib/email-ses.ts` — SES transport
- `src/middleware.ts` — protect `/admin/**`
- `src/app/admin/layout.tsx` — AdminShell layout
- `src/app/admin/page.tsx` — inquiries list
- `src/app/admin/actions.ts` — server actions (status/read, notes, users)
- `src/app/admin/login/page.tsx` — login form shell
- `src/app/admin/login/LoginForm.tsx` — client form (useActionState)
- `src/app/admin/login/actions.ts` — `loginAction` / `signOutAction`
- `src/app/admin/inquiries/[id]/page.tsx` — inquiry detail
- `src/app/admin/inquiries/[id]/StatusControl.tsx` — client component
- `src/app/admin/inquiries/[id]/NotesThread.tsx` — client component
- `src/app/admin/users/page.tsx` — staff accounts
- `src/app/admin/users/UsersTable.tsx` — client component
- `src/components/admin/AdminShell.tsx`
- `src/components/admin/InquiryFilters.tsx`
- `src/types/crm.ts` — `Inquiry`, `InquiryNote`, `StaffUser` types
- `deploy/` — Lightsail setup notes, nginx + systemd/pm2 config (Task 14)

**Modified:**
- `next.config.*` — add `serverExternalPackages: ["better-sqlite3"]`
- `src/app/api/contact/route.ts` — SQLite insert before email send
- `src/lib/email.ts` — provider switch (Resend | SES)
- `.env.example` — SQLite path, session secret, SES vars (remove Supabase vars)
- `.gitignore` — ignore `data/` (local SQLite) and `*.db`
- `package.json` — add deps + `migrate` / `test` scripts; remove `@supabase/*`
- `README.md` — admin portal setup notes (Task 14)

---

## Task 1: Install dependencies and scaffold env

**Files:** Modify `package.json`, `.gitignore`, `.env.example`; create `data/` (gitignored).

- [ ] **Step 1: Remove Supabase deps, add the AWS-stack deps**

```bash
cd /Users/asherwalden/Desktop/JJ-Properties
npm remove @supabase/supabase-js @supabase/ssr
npm install better-sqlite3 bcryptjs iron-session @aws-sdk/client-ses
npm install -D @types/better-sqlite3 @types/bcryptjs vitest
```
Expected: `dependencies` gains the four runtime packages; Supabase packages gone; lockfile updated.

- [ ] **Step 2: Add scripts to `package.json`**

```json
"scripts": {
  "migrate": "node scripts/migrate.mjs",
  "test": "vitest run",
  "test:watch": "vitest"
}
```
(Keep existing `dev` / `build` / `start` / `lint`.)

- [ ] **Step 3: Rewrite `.env.example`**

```bash
# Email provider: "resend" (Vercel copy) or "ses" (AWS copy)
EMAIL_PROVIDER=resend

# Resend (existing — used when EMAIL_PROVIDER=resend)
RESEND_API_KEY=
LEAD_TO_EMAIL=
LEAD_FROM_EMAIL=

# Amazon SES (used when EMAIL_PROVIDER=ses)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=

# Database (local default; on the box use /var/lib/jj-crm/crm.db)
SQLITE_DB_PATH=./data/crm.db

# Auth
SESSION_SECRET=            # 32+ random bytes; signs the admin session cookie
BCRYPT_COST=12

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3004
```

- [ ] **Step 4: Gitignore local DB**

Ensure `.gitignore` contains:
```
data/
*.db
*.db-shm
*.db-wal
```
Also confirm `.env*` (except `.env.example`) is ignored: `grep -E "^\.env" .gitignore`.

- [ ] **Step 5: Create local data dir**

```bash
mkdir -p data
```

- [ ] **Step 6: Externalize `better-sqlite3` from the bundler**

In `next.config.ts` (or `.mjs`), add to the config object:
```ts
serverExternalPackages: ["better-sqlite3"],
```
(Prevents Turbopack/webpack from trying to bundle the native module.)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore next.config.*
git commit -m "feat(crm): swap Supabase deps for SQLite/bcrypt/iron-session/SES stack"
```

---

## Task 2: SQLite schema, migration runner, and connection module

**Files:** Create `db/migrations/0001_init.sql`, `scripts/migrate.mjs`, `src/lib/db/index.ts`.

- [ ] **Step 1: Write the migration SQL**

Create `db/migrations/0001_init.sql`:
```sql
-- 0001_init: CRM schema for JJ Properties inquiry portal (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  added_by      INTEGER REFERENCES users(id)
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
  message           TEXT    NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new','contacted','closed')),
  is_read           INTEGER NOT NULL DEFAULT 0,
  request_id        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_property   ON inquiries(property_interest);

CREATE TABLE IF NOT EXISTS inquiry_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id  INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id),
  body        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_inquiry ON inquiry_notes(inquiry_id, created_at);
```

- [ ] **Step 2: Write the migration runner**

Create `scripts/migrate.mjs`:
```js
import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.SQLITE_DB_PATH || "./data/crm.db";
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);

const dir = join(__dirname, "..", "db", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const applied = new Set(db.prepare("SELECT name FROM _migrations").all().map((r) => r.name));

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip   ${file}`);
    continue;
  }
  const sql = readFileSync(join(dir, file), "utf8");
  const tx = db.transaction(() => {
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
  });
  tx();
  console.log(`applied ${file}`);
}
console.log(`Done. DB at ${dbPath}`);
```

- [ ] **Step 3: Connection module**

Create `src/lib/db/index.ts`:
```ts
import "server-only";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const path = process.env.SQLITE_DB_PATH || "./data/crm.db";
    db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}
```

- [ ] **Step 4: Run the migration locally**

```bash
npm run migrate
sqlite3 ./data/crm.db ".tables"
```
Expected: lists `_migrations`, `inquiries`, `inquiry_notes`, `users`.

- [ ] **Step 5: Commit**

```bash
git add db/migrations scripts/migrate.mjs src/lib/db/index.ts
git commit -m "feat(crm): SQLite schema, migration runner, and connection module"
```

---

## Task 3: Domain types and data-access layer

**Files:** Create `src/types/crm.ts`, `src/lib/db/inquiries.ts`, `src/lib/db/notes.ts`, `src/lib/db/users.ts`.

- [ ] **Step 1: Types**

Create `src/types/crm.ts`:
```ts
export type InquiryStatus = "new" | "contacted" | "closed";
export type InquiryType = "buy" | "sell" | "invest" | "general";

export interface Inquiry {
  id: number;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  inquiry_type: InquiryType;
  property_interest: string | null;
  message: string;
  status: InquiryStatus;
  is_read: boolean;
  request_id: string;
}

export interface InquiryNote {
  id: number;
  inquiry_id: number;
  author_id: number;
  author_username: string; // joined from users
  body: string;
  created_at: string;
}

export interface StaffUser {
  id: number;
  username: string;
  email: string;
  created_at: string;
  added_by: number | null;
}

export interface InquiryFilters {
  status?: string;
  type?: string;
  property?: string;
  q?: string;
}
```

- [ ] **Step 2: Inquiry queries**

Create `src/lib/db/inquiries.ts`:
```ts
import "server-only";
import { getDb } from "./index";
import type { Inquiry, InquiryFilters, InquiryStatus } from "@/types/crm";

interface InquiryRow extends Omit<Inquiry, "is_read"> {
  is_read: number;
}

function toInquiry(row: InquiryRow): Inquiry {
  return { ...row, is_read: row.is_read === 1 };
}

export function createInquiry(input: {
  request_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  inquiry_type: string;
  property_interest: string | null;
  message: string;
}): number {
  const stmt = getDb().prepare(
    `INSERT INTO inquiries
       (request_id, first_name, last_name, email, phone, inquiry_type, property_interest, message)
     VALUES
       (@request_id, @first_name, @last_name, @email, @phone, @inquiry_type, @property_interest, @message)`
  );
  return Number(stmt.run(input).lastInsertRowid);
}

export function listInquiries(filters: InquiryFilters): Inquiry[] {
  const where: string[] = [];
  const params: Record<string, string> = {};

  if (filters.status && filters.status !== "all") {
    where.push("status = @status");
    params.status = filters.status;
  }
  if (filters.type && filters.type !== "all") {
    where.push("inquiry_type = @type");
    params.type = filters.type;
  }
  if (filters.property && filters.property !== "all") {
    where.push("property_interest = @property");
    params.property = filters.property;
  }
  if (filters.q) {
    where.push(
      "(first_name LIKE @q COLLATE NOCASE OR last_name LIKE @q COLLATE NOCASE OR email LIKE @q COLLATE NOCASE)"
    );
    params.q = `%${filters.q}%`;
  }

  const sql =
    `SELECT * FROM inquiries` +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    ` ORDER BY created_at DESC LIMIT 200`;

  return (getDb().prepare(sql).all(params) as InquiryRow[]).map(toInquiry);
}

export function getInquiry(id: number): Inquiry | null {
  const row = getDb().prepare("SELECT * FROM inquiries WHERE id = ?").get(id) as
    | InquiryRow
    | undefined;
  return row ? toInquiry(row) : null;
}

export function updateInquiry(
  id: number,
  patch: { status?: InquiryStatus; is_read?: boolean }
): void {
  const sets: string[] = [];
  const params: Record<string, string | number> = { id };
  if (patch.status !== undefined) {
    sets.push("status = @status");
    params.status = patch.status;
  }
  if (patch.is_read !== undefined) {
    sets.push("is_read = @is_read");
    params.is_read = patch.is_read ? 1 : 0;
  }
  if (!sets.length) return;
  getDb().prepare(`UPDATE inquiries SET ${sets.join(", ")} WHERE id = @id`).run(params);
}
```

- [ ] **Step 3: Note queries**

Create `src/lib/db/notes.ts`:
```ts
import "server-only";
import { getDb } from "./index";
import type { InquiryNote } from "@/types/crm";

export function listNotes(inquiryId: number): InquiryNote[] {
  return getDb()
    .prepare(
      `SELECT n.*, u.username AS author_username
         FROM inquiry_notes n
         JOIN users u ON u.id = n.author_id
        WHERE n.inquiry_id = ?
        ORDER BY n.created_at ASC`
    )
    .all(inquiryId) as InquiryNote[];
}

export function createNote(inquiryId: number, authorId: number, body: string): InquiryNote {
  const id = Number(
    getDb()
      .prepare("INSERT INTO inquiry_notes (inquiry_id, author_id, body) VALUES (?, ?, ?)")
      .run(inquiryId, authorId, body).lastInsertRowid
  );
  return getDb()
    .prepare(
      `SELECT n.*, u.username AS author_username
         FROM inquiry_notes n JOIN users u ON u.id = n.author_id
        WHERE n.id = ?`
    )
    .get(id) as InquiryNote;
}
```

- [ ] **Step 4: User queries**

Create `src/lib/db/users.ts`:
```ts
import "server-only";
import { getDb } from "./index";
import type { StaffUser } from "@/types/crm";

export interface UserWithHash extends StaffUser {
  password_hash: string;
}

export function getUserByUsername(username: string): UserWithHash | null {
  return (
    (getDb()
      .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
      .get(username.trim()) as UserWithHash | undefined) ?? null
  );
}

export function listUsers(): StaffUser[] {
  return getDb()
    .prepare("SELECT id, username, email, created_at, added_by FROM users ORDER BY created_at ASC")
    .all() as StaffUser[];
}

export function createUser(input: {
  username: string;
  email: string;
  password_hash: string;
  added_by: number | null;
}): number {
  return Number(
    getDb()
      .prepare(
        "INSERT INTO users (username, email, password_hash, added_by) VALUES (@username, @email, @password_hash, @added_by)"
      )
      .run(input).lastInsertRowid
  );
}

export function removeUser(id: number): void {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function countUsers(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
}
```

- [ ] **Step 5: Type-check and commit**

```bash
npx tsc --noEmit
git add src/types/crm.ts src/lib/db
git commit -m "feat(crm): domain types and SQLite data-access layer"
```

---

## Task 4: Password + session helpers (TDD), and the user-creation script

**Files:** Create `src/lib/auth/password.ts`, `src/lib/auth/password.test.ts`, `src/lib/auth/session.ts`, `scripts/create-user.mjs`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth/password.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("s3cret-pass");
    expect(await verifyPassword("s3cret-pass", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("s3cret-pass");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces distinct hashes for the same input (salted)", async () => {
    expect(await hashPassword("abc")).not.toBe(await hashPassword("abc"));
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run src/lib/auth/password.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement password helper**

Create `src/lib/auth/password.ts`:
```ts
import bcrypt from "bcryptjs";

const COST = Number(process.env.BCRYPT_COST ?? 12);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}
```
(No `server-only` import here so the test can import it directly; it has no DB/Next dependency.)

- [ ] **Step 4: Run to confirm it passes**

```bash
npx vitest run src/lib/auth/password.test.ts
```
Expected: 3 passed.

- [ ] **Step 5: Session helper**

Create `src/lib/auth/session.ts` (NO `server-only` import — middleware imports `sessionOptions`):
```ts
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface SessionData {
  userId?: number;
  username?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "jj_admin_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session.userId) redirect("/admin/login");
  return session;
}
```

- [ ] **Step 6: User-creation script (bootstrap + handoff)**

Create `scripts/create-user.mjs`:
```js
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const [, , username, email, password] = process.argv;
if (!username || !email || !password) {
  console.error("Usage: node scripts/create-user.mjs <username> <email> <password>");
  process.exit(1);
}

const dbPath = process.env.SQLITE_DB_PATH || "./data/crm.db";
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const hash = bcrypt.hashSync(password, Number(process.env.BCRYPT_COST ?? 12));
db.prepare(
  "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
).run(username, email, hash);

console.log(`Created user '${username}' (${email}) in ${dbPath}`);
```

- [ ] **Step 7: Seed a local test user and commit**

```bash
SQLITE_DB_PATH=./data/crm.db node scripts/create-user.mjs admin isaac@twenty1-media.com "ChangeMe-2026!"
git add src/lib/auth scripts/create-user.mjs package.json
git commit -m "feat(crm): bcrypt password helper (TDD), iron-session, user-create script"
```

---

## Task 5: Amazon SES email transport + provider switch

**Files:** Create `src/lib/email-ses.ts`; modify `src/lib/email.ts`.

- [ ] **Step 1: Read the existing email module**

Read `src/lib/email.ts` end-to-end. Identify how `sendContactEmail(data, requestId)` builds the subject/recipient/HTML/text so the same content can be reused for SES.

- [ ] **Step 2: SES transport**

Create `src/lib/email-ses.ts`:
```ts
import "server-only";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

let client: SESClient | null = null;
function getClient() {
  if (!client) client = new SESClient({ region: process.env.AWS_REGION });
  return client;
}

export async function sendEmailViaSes(args: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  await getClient().send(
    new SendEmailCommand({
      Source: args.from,
      Destination: { ToAddresses: [args.to] },
      Message: {
        Subject: { Data: args.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: args.html, Charset: "UTF-8" },
          Text: { Data: args.text, Charset: "UTF-8" },
        },
      },
    })
  );
}
```

- [ ] **Step 3: Provider switch in `email.ts`**

Refactor `sendContactEmail` so the message content is built once, then dispatched by `EMAIL_PROVIDER`. Preserve the existing Resend code path verbatim for `EMAIL_PROVIDER !== "ses"`. Sketch:
```ts
// inside sendContactEmail(data, requestId), after building { subject, html, text }:
if (process.env.EMAIL_PROVIDER === "ses") {
  const { sendEmailViaSes } = await import("./email-ses");
  await sendEmailViaSes({
    to: process.env.LEAD_TO_EMAIL!,
    from: process.env.SES_FROM_EMAIL!,
    subject,
    html,
    text,
  });
  return;
}
// ...existing Resend send stays here unchanged...
```
Keep the function signature and all existing exports identical so `/api/contact` and the Vercel copy are unaffected when `EMAIL_PROVIDER=resend`.

- [ ] **Step 4: Type-check and commit**

```bash
npx tsc --noEmit
git add src/lib/email.ts src/lib/email-ses.ts
git commit -m "feat(crm): add SES transport and EMAIL_PROVIDER switch (Resend default)"
```

---

## Task 6: Persist inquiries from `/api/contact`

**Files:** Modify `src/app/api/contact/route.ts`.

- [ ] **Step 1: Read the existing route** so the insert lands after validation/honeypot and before the email send.

- [ ] **Step 2: Insert into SQLite before email send**

Add the import and the best-effort insert (the DB write must never block the email). The relevant change:
```ts
import { createInquiry } from "@/lib/db/inquiries";
// ...
const requestId = crypto.randomUUID();

// --- Persist to SQLite (best-effort: never blocks email send) ---
try {
  createInquiry({
    request_id: requestId,
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone || null,
    inquiry_type: data.inquiryType,
    property_interest: data.propertyInterest || null,
    message: data.message,
  });
} catch (dbErr) {
  console.error("[contact] DB insert failed:", dbErr);
}

// --- Send email (existing behavior, now provider-aware) ---
await sendContactEmail(data, requestId);
```
Keep all existing rate-limit / Zod / honeypot / error-handling logic intact. Map field names to match the existing `contactSchema` output (adjust `data.firstName` etc. if the schema uses different keys).

- [ ] **Step 3: Manual smoke (local)**

```bash
PORT=3004 npm run dev
```
Submit the `/contact` form once, then:
```bash
sqlite3 ./data/crm.db "SELECT created_at, first_name, email, status, is_read FROM inquiries ORDER BY created_at DESC LIMIT 5;"
```
Expected: new row with `status='new'`, `is_read=0`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "feat(crm): persist inquiries to SQLite before email send"
```

---

## Task 7: Auth middleware

**Files:** Create `src/middleware.ts`.

- [ ] **Step 1: Implement middleware**

Create `src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(request, res, sessionOptions);

  // Login page is the only public admin route.
  if (pathname === "/admin/login") {
    if (session.userId) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return res;
  }

  if (!session.userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = { matcher: ["/admin/:path*"] };
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Manual smoke**

Visit `http://localhost:3004/admin` while logged out → redirects to `/admin/login?next=/admin`.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(crm): protect /admin routes with session middleware"
```

---

## Task 8: Login page + login/sign-out actions

**Files:** Create `src/app/admin/login/page.tsx`, `src/app/admin/login/LoginForm.tsx`, `src/app/admin/login/actions.ts`.

- [ ] **Step 1: Login + sign-out server actions**

Create `src/app/admin/login/actions.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserByUsername } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin") || "/admin";

  const user = getUserByUsername(username);
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !ok) {
    return { error: "Invalid username or password." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  await session.save();
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/admin/login");
}
```

- [ ] **Step 2: Login form (client, `useActionState`)**

Create `src/app/admin/login/LoginForm.tsx`:
```tsx
"use client";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-sm font-medium text-stone-700">Username</span>
        <input
          name="username"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-900 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-stone-700">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-900 focus:outline-none"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-stone-900 text-white py-2 font-medium hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Login page shell**

Create `src/app/admin/login/page.tsx`:
```tsx
import LoginForm from "./LoginForm";

export const metadata = { title: "Admin Sign In · JJ Properties" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-sm border border-stone-200 p-8">
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">JJ Properties Admin</h1>
        <p className="text-stone-600 mb-6 text-sm">Sign in with your staff credentials.</p>
        <LoginForm next={next ?? "/admin"} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Manual smoke**

1. Visit `/admin/login`, enter the seeded `admin` / `ChangeMe-2026!` → redirects to `/admin` (may 404 until Task 9 — auth is what we are testing).
2. Wrong password → "Invalid username or password." and no redirect.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/login
git commit -m "feat(crm): username/password login + sign-out server actions"
```

---

## Task 9: Admin shell layout

**Files:** Create `src/components/admin/AdminShell.tsx`, `src/app/admin/layout.tsx`.

- [ ] **Step 1: AdminShell**

Create `src/components/admin/AdminShell.tsx`:
```tsx
import Link from "next/link";
import { signOutAction } from "@/app/admin/login/actions";

export default function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-semibold tracking-tight">
            JJ Properties · Admin
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="hover:text-stone-600">Inquiries</Link>
            <Link href="/admin/users" className="hover:text-stone-600">Users</Link>
            <span className="text-stone-500">{username}</span>
            <form action={signOutAction}>
              <button className="rounded-md border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Admin layout**

Create `src/app/admin/layout.tsx`:
```tsx
import { getSession } from "@/lib/auth/session";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // Login page renders bare (middleware lets it through when logged out).
  if (!session.userId) return <>{children}</>;
  return <AdminShell username={session.username ?? ""}>{children}</AdminShell>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminShell.tsx src/app/admin/layout.tsx
git commit -m "feat(crm): AdminShell layout with sign-out"
```

---

## Task 10: Inquiries list page + filters

**Files:** Create `src/app/admin/page.tsx`, `src/components/admin/InquiryFilters.tsx`.

- [ ] **Step 1: Filter component** (URL-state; client)

Create `src/components/admin/InquiryFilters.tsx`:
```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = ["all", "new", "contacted", "closed"] as const;
const TYPES = ["all", "buy", "sell", "invest", "general"] as const;

export default function InquiryFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (!value || value === "all") sp.delete(key);
    else sp.set(key, value);
    router.push(`/admin?${sp.toString()}`);
  }

  const status = params.get("status") ?? "new";
  const type = params.get("type") ?? "all";
  const q = params.get("q") ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <Select label="Status" value={status} options={[...STATUSES]} onChange={(v) => update("status", v)} />
      <Select label="Type" value={type} options={[...TYPES]} onChange={(v) => update("type", v)} />
      <label className="flex flex-col text-xs text-stone-600">
        Search
        <input
          defaultValue={q}
          onBlur={(e) => update("q", e.target.value.trim())}
          placeholder="name or email"
          className="mt-1 rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
      </label>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col text-xs text-stone-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-md border border-stone-300 px-2 py-1 text-sm capitalize"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
```
(Property filter omitted from v1 UI — `property_interest` values depend on how the public form populates it; add a Property `<Select>` here once those slugs are confirmed. `listInquiries` already supports a `property` filter.)

- [ ] **Step 2: List page (server-side query)**

Create `src/app/admin/page.tsx`:
```tsx
import Link from "next/link";
import { listInquiries } from "@/lib/db/inquiries";
import InquiryFilters from "@/components/admin/InquiryFilters";

export const metadata = { title: "Inquiries · JJ Properties Admin" };

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const inquiries = listInquiries({
    status: sp.status ?? "new",
    type: sp.type,
    property: sp.property,
    q: sp.q?.trim(),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Inquiries</h1>
        <span className="text-sm text-stone-500">{inquiries.length} shown</span>
      </div>

      <InquiryFilters />

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {inquiries.map((i) => (
              <tr key={i.id} className={i.is_read ? "bg-white" : "bg-amber-50/40"}>
                <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                  {new Date(i.created_at + "Z").toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/inquiries/${i.id}`} className="font-medium text-stone-900 hover:underline">
                    {i.first_name} {i.last_name}
                  </Link>
                  {!i.is_read && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">new</span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-700">{i.email}</td>
                <td className="px-4 py-3 capitalize">{i.inquiry_type}</td>
                <td className="px-4 py-3 text-stone-600">{i.property_interest ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{i.status}</td>
              </tr>
            ))}
            {inquiries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                  No inquiries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```
(`created_at` is stored as UTC text from `datetime('now')`; the `+ "Z"` makes `Date` parse it as UTC before local display.)

- [ ] **Step 3: Manual smoke**

Sign in → `/admin` shows the inquiry from Task 6. Switch Status filter to `all`; set Type → list narrows.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/InquiryFilters.tsx
git commit -m "feat(crm): inquiries list with filters and unread badges"
```

---

## Task 11: Inquiry detail page (status + read toggle)

**Files:** Create `src/app/admin/actions.ts`, `src/app/admin/inquiries/[id]/page.tsx`, `src/app/admin/inquiries/[id]/StatusControl.tsx`.

- [ ] **Step 1: Admin server actions (status/read + notes + users live here)**

Create `src/app/admin/actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { updateInquiry } from "@/lib/db/inquiries";
import { createNote } from "@/lib/db/notes";
import { createUser, removeUser } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/password";
import type { InquiryStatus } from "@/types/crm";

export async function setInquiryStatus(id: number, status: InquiryStatus) {
  await requireSession();
  updateInquiry(id, { status });
  revalidatePath(`/admin/inquiries/${id}`);
  revalidatePath("/admin");
}

export async function setInquiryRead(id: number, isRead: boolean) {
  await requireSession();
  updateInquiry(id, { is_read: isRead });
  revalidatePath(`/admin/inquiries/${id}`);
  revalidatePath("/admin");
}

export async function addNote(inquiryId: number, body: string) {
  const session = await requireSession();
  const trimmed = body.trim();
  if (!trimmed) return;
  createNote(inquiryId, session.userId!, trimmed);
  revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export async function addStaffUser(username: string, email: string, password: string) {
  const session = await requireSession();
  const hash = await hashPassword(password);
  createUser({
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password_hash: hash,
    added_by: session.userId!,
  });
  revalidatePath("/admin/users");
}

export async function removeStaffUser(id: number) {
  const session = await requireSession();
  if (session.userId === id) throw new Error("You cannot remove your own account.");
  removeUser(id);
  revalidatePath("/admin/users");
}
```

- [ ] **Step 2: Status control (client)**

Create `src/app/admin/inquiries/[id]/StatusControl.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { setInquiryStatus, setInquiryRead } from "@/app/admin/actions";
import type { InquiryStatus } from "@/types/crm";

const STATUSES: InquiryStatus[] = ["new", "contacted", "closed"];

export default function StatusControl({
  id,
  initialStatus,
  initialIsRead,
}: {
  id: number;
  initialStatus: InquiryStatus;
  initialIsRead: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isRead, setIsRead] = useState(initialIsRead);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
      <label className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-700">Status</span>
        <select
          value={status}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as InquiryStatus;
            setStatus(next);
            startTransition(() => setInquiryStatus(id, next));
          }}
          className="rounded-md border border-stone-300 px-2 py-1 capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-700">Read</span>
        <input
          type="checkbox"
          checked={isRead}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setIsRead(next);
            startTransition(() => setInquiryRead(id, next));
          }}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 3: Detail page**

Create `src/app/admin/inquiries/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getInquiry, updateInquiry } from "@/lib/db/inquiries";
import { listNotes } from "@/lib/db/notes";
import StatusControl from "./StatusControl";
import NotesThread from "./NotesThread";

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const inquiry = getInquiry(id);
  if (!inquiry) notFound();
  const notes = listNotes(id);

  // Auto-mark-read on first open.
  if (!inquiry.is_read) updateInquiry(id, { is_read: true });

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <article className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">{inquiry.first_name} {inquiry.last_name}</h1>
          <p className="text-sm text-stone-600">{inquiry.email} · {inquiry.phone || "no phone"}</p>
          <p className="text-xs text-stone-500">
            Received {new Date(inquiry.created_at + "Z").toLocaleString()} · request {inquiry.request_id}
          </p>
        </header>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-stone-500 text-xs uppercase tracking-wide">Type</dt>
            <dd className="capitalize">{inquiry.inquiry_type}</dd>
          </div>
          <div>
            <dt className="text-stone-500 text-xs uppercase tracking-wide">Property</dt>
            <dd>{inquiry.property_interest ?? "—"}</dd>
          </div>
        </dl>
        <div>
          <h2 className="text-stone-500 text-xs uppercase tracking-wide mb-1">Message</h2>
          <p className="whitespace-pre-wrap text-stone-800">{inquiry.message}</p>
        </div>
      </article>

      <aside className="space-y-4">
        <StatusControl id={inquiry.id} initialStatus={inquiry.status} initialIsRead={true} />
        <NotesThread inquiryId={inquiry.id} initialNotes={notes} />
      </aside>
    </div>
  );
}
```
(Imports `NotesThread`, created in Task 12 — commit both together at the end of Task 12.)

- [ ] **Step 4: Move on to Task 12** (page won't compile until `NotesThread` exists).

---

## Task 12: Notes thread

**Files:** Create `src/app/admin/inquiries/[id]/NotesThread.tsx`.

- [ ] **Step 1: Implement NotesThread (client → server action)**

Create `src/app/admin/inquiries/[id]/NotesThread.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNote } from "@/app/admin/actions";
import type { InquiryNote } from "@/types/crm";

export default function NotesThread({
  inquiryId,
  initialNotes,
}: {
  inquiryId: number;
  initialNotes: InquiryNote[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addNote(inquiryId, trimmed);
      setBody("");
      router.refresh(); // re-fetch server-rendered notes
    });
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-stone-700">Notes</h3>

      <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {initialNotes.length === 0 && <li className="text-xs text-stone-500">No notes yet.</li>}
        {initialNotes.map((n) => (
          <li key={n.id} className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-sm">
            <p className="whitespace-pre-wrap text-stone-800">{n.body}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-stone-500">
              {n.author_username} · {new Date(n.created_at + "Z").toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a note…"
          className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
        <button
          disabled={pending || body.trim().length === 0}
          onClick={submit}
          className="rounded-md bg-stone-900 text-white px-3 py-1 text-sm font-medium disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Manual smoke**

1. Open an inquiry detail page → renders; unread badge clears after open (refresh `/admin` to confirm).
2. Change status → persists across refresh.
3. Add a note → appears after the action (author = signed-in username) and persists.
4. `sqlite3 ./data/crm.db "SELECT count(*) FROM inquiry_notes;"` → matches.

- [ ] **Step 3: Type-check + commit detail page + actions + notes**

```bash
npx tsc --noEmit
git add src/app/admin/actions.ts src/app/admin/inquiries
git commit -m "feat(crm): inquiry detail with status, read toggle, and notes (server actions)"
```

---

## Task 13: Staff users management

**Files:** Create `src/app/admin/users/page.tsx`, `src/app/admin/users/UsersTable.tsx`. (Server actions already added in Task 11.)

- [ ] **Step 1: UsersTable (client → server actions)**

Create `src/app/admin/users/UsersTable.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStaffUser, removeStaffUser } from "@/app/admin/actions";
import type { StaffUser } from "@/types/crm";

export default function UsersTable({ users }: { users: StaffUser[] }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    if (!username.trim() || !email.trim() || password.length < 10) {
      setError("Username, email, and a 10+ character password are required.");
      return;
    }
    startTransition(async () => {
      try {
        await addStaffUser(username, email, password);
        setUsername(""); setEmail(""); setPassword("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add user.");
      }
    });
  }

  function remove(id: number) {
    setError(null);
    startTransition(async () => {
      try {
        await removeStaffUser(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not remove user.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr,1fr,1fr,auto] sm:items-end">
        <Field label="Username" value={username} onChange={setUsername} />
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />
        <button
          disabled={pending}
          onClick={add}
          className="rounded-md bg-stone-900 text-white px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          Add user
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="divide-y divide-stone-100 rounded-md border border-stone-200 bg-white">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>{u.username} <span className="text-stone-500">· {u.email}</span></span>
            <button onClick={() => remove(u.id)} className="text-xs text-red-600 hover:underline">
              Remove
            </button>
          </li>
        ))}
        {users.length === 0 && (
          <li className="px-3 py-4 text-center text-stone-500 text-sm">No staff accounts.</li>
        )}
      </ul>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="flex flex-col text-xs text-stone-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-md border border-stone-300 px-2 py-1 text-sm"
      />
    </label>
  );
}
```

- [ ] **Step 2: Users page**

Create `src/app/admin/users/page.tsx`:
```tsx
import { listUsers } from "@/lib/db/users";
import UsersTable from "./UsersTable";

export const metadata = { title: "Users · JJ Properties Admin" };

export default async function UsersPage() {
  const users = listUsers();
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Staff accounts</h1>
        <p className="text-sm text-stone-600">Anyone listed here can sign in to the admin portal.</p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke**

1. `/admin/users` lists the seeded `admin`.
2. Add a second user → row appears; sign out; sign in as the new user → succeeds.
3. Remove the second user; attempt to remove your own account → blocked with the guard error.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users
git commit -m "feat(crm): staff account management (add/remove via server actions)"
```

---

## Task 14: Lightsail deploy, SES, migration, seed, backups + final smoke

**Files:** Create `deploy/README.md` (+ nginx/systemd snippets); modify `README.md`.

> This is the ops capstone. The marketing site stays live on Vercel throughout; this stands up the AWS copy with the CRM. Operator/AWS actions are called out.

- [ ] **Step 1: Full local gate**

```bash
npx tsc --noEmit && npx vitest run && npm run build
```
Expected: all pass. Fix before deploying.

- [ ] **Step 2: Provision the Lightsail instance (operator)**

1. Lightsail → create instance: Ubuntu 22.04 LTS, **1 GB plan ($5/mo)** (512 MB / $3.50 only if building in CI, not on the box).
2. Attach a static IP.
3. Open firewall ports 22, 80, 443.
4. `sudo apt update && sudo apt install -y nginx`; install Node 22 (nvm or NodeSource); `sudo npm i -g pm2`.
5. Create the DB dir: `sudo mkdir -p /var/lib/jj-crm && sudo chown $USER /var/lib/jj-crm`.

- [ ] **Step 3: Configure the AWS / SES side (operator)**

1. SES → verify the sending domain (or at least `SES_FROM_EMAIL`); add the DKIM/SPF DNS records.
2. Request production access (leave the SES sandbox) so mail can go to arbitrary recipients.
3. Create an IAM user (or attach an instance role) with `ses:SendEmail`; capture `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (skip if using an instance role).

- [ ] **Step 4: Deploy the app to the box**

1. Add a `prod` branch tracking `main` (deploy flow mirrors Homefront: push `prod`, pull on the box).
2. On the box: clone the repo, `npm ci`, create `.env.local` with production values:
   ```
   EMAIL_PROVIDER=ses
   AWS_REGION=us-east-1
   SES_FROM_EMAIL=inquiries@<domain>
   LEAD_TO_EMAIL=<staff inbox>
   SQLITE_DB_PATH=/var/lib/jj-crm/crm.db
   SESSION_SECRET=<32+ random bytes>
   NEXT_PUBLIC_SITE_URL=https://<staging-or-final-domain>
   ```
   (Plus AWS keys if not using an instance role.)
3. `npm run migrate` → creates the schema at `/var/lib/jj-crm/crm.db`.
4. Seed the first admin: `node scripts/create-user.mjs admin <email> "<strong-password>"`.
5. `npm run build` then `pm2 start npm --name jj-crm -- start` (Next listens on 3000); `pm2 save`.
6. Configure nginx as a reverse proxy to `127.0.0.1:3000`; add TLS via `certbot` for the staging hostname.

Capture the box setup + nginx server block + pm2 commands in `deploy/README.md` for repeatability and handoff.

- [ ] **Step 5: End-to-end smoke on the box**

1. Submit the public `/contact` form on the AWS copy.
2. Confirm: SES email arrives at `LEAD_TO_EMAIL` **and** the row lands in `/var/lib/jj-crm/crm.db` (`sqlite3 ... "SELECT * FROM inquiries ORDER BY id DESC LIMIT 1;"`).
3. Sign in at `/admin` → inquiry shows `new` + unread badge.
4. Open it → badge clears; add a note; set status `contacted`.
5. `/admin` default filter (`status=new`) no longer shows it; `status=all` shows `contacted`.
6. Sign out → `/admin/login`; bad credentials are rejected.

- [ ] **Step 6: Backups**

Add a nightly cron on the box to copy the DB off-instance (the WAL-safe way is the SQLite backup API or `sqlite3 .backup`):
```bash
# /etc/cron.daily/jj-crm-backup
sqlite3 /var/lib/jj-crm/crm.db ".backup '/var/lib/jj-crm/backups/crm-$(date +\%F).db'"
# then sync /var/lib/jj-crm/backups off-box (e.g. to S3) and prune > 30 days
```
Document restore: stop pm2, drop the backup file at `SQLITE_DB_PATH`, restart.

- [ ] **Step 7: README + commit**

Append to `README.md`:
```md
## Admin Portal (CRM)

The CRM lives at `/admin`, gated by username/password (bcrypt + iron-session). Inquiries persist to SQLite; email goes through Amazon SES on AWS (Resend on the Vercel copy).

### Local setup
1. `cp .env.example .env.local` and fill `SESSION_SECRET` (32+ bytes). Leave `EMAIL_PROVIDER=resend` locally.
2. `npm run migrate` — creates `./data/crm.db`.
3. `node scripts/create-user.mjs <username> <email> <password>` — seed a login.
4. `PORT=3004 npm run dev`, then visit `/admin`.

### Production (AWS Lightsail)
See `deploy/README.md`. SQLite at `/var/lib/jj-crm/crm.db`, `EMAIL_PROVIDER=ses`, app under pm2 behind nginx. Nightly DB backup via cron.

### Design + plan
- Spec: `docs/superpowers/specs/2026-04-27-crm-inquiry-portal-design.md`
- Plan: `docs/superpowers/plans/2026-04-27-crm-inquiry-portal.md`
```

```bash
git add README.md deploy/
git commit -m "docs(crm): deploy notes (Lightsail/SES/SQLite) and admin portal README"
```

---

## Spec Coverage Self-Review

- **Single shared workspace + account gate** → `users` table (Task 2/3), session middleware (Task 7), every `/admin` query/action requires a session (Tasks 9–13).
- **Username/password auth (no magic link)** → password helper + session (Task 4), login/sign-out actions (Task 8), middleware (Task 7).
- **App-layer access control (no RLS)** → middleware guards `/admin/**`; all mutations go through `requireSession()`-gated server actions (Tasks 11–13); SQLite is server-only (`import "server-only"`).
- **Existing email path preserved; CRM additive** → Task 5 keeps Resend as default and switches to SES only when `EMAIL_PROVIDER=ses`; Task 6 inserts before the (unchanged-signature) `sendContactEmail`.
- **DB write before email; either failing is non-blocking the other** → Task 6 (best-effort insert in try/catch, then send).
- **Inquiries with status + is_read + notes** → Tasks 2, 3, 11, 12.
- **Pages**: `/admin/login`, `/admin`, `/admin/inquiries/[id]`, `/admin/users` → Tasks 8, 10, 11/12, 13. (No `/admin/auth/callback` — removed with magic link.)
- **Filters: status, type, search** (property filter supported in data layer, UI deferred until slugs confirmed — flagged in Task 10) → Task 10.
- **AWS hosting on Lightsail + SQLite + SES; Vercel stays live until cutover** → Task 14; `EMAIL_PROVIDER` switch (Task 5).
- **Account ownership / handoff** → Task 14 (`deploy/README.md`, backups) + spec ownership section.
- **Out-of-scope items** (reply-from-portal, audit log, assigned-to, Slack, CSV export, admin tier) → not implemented, matches spec.

**Open items to confirm during implementation:**
- Exact field names from `contactSchema` (Task 6 maps `firstName`/`inquiryType`/`propertyInterest` — verify against `@/lib/validation/contact`).
- The current `sendContactEmail` signature/content (Task 5 reuses its message builder).
- Property-interest slug values, to enable the Property filter UI (Task 10).

No placeholders, no contradictions, no undefined types or methods between tasks.
