# CRM Inquiry Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every contact-form inquiry to Supabase and ship a magic-link `/admin` portal where allowlisted JJ Properties staff can triage inquiries (view, status, mark-read, notes, manage allowlist).

**Architecture:** New `/admin` route group inside the existing Next.js 16 app. Supabase Postgres + Auth (magic link only). Existing `/api/contact` is extended to `INSERT` before sending the existing Resend email. RLS gates all client reads/writes by membership in `allowed_users`; the contact route uses a service-role key for the public insert.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Tailwind 4 · TypeScript · Supabase (`@supabase/supabase-js` + `@supabase/ssr`) · Zod (existing) · Resend (existing).

**Spec:** `docs/superpowers/specs/2026-04-27-crm-inquiry-portal-design.md`

---

## File Structure

**Created:**
- `supabase/migrations/0001_init.sql` — schema, indexes, RLS
- `src/lib/supabase/server.ts` — server-component Supabase client (uses cookies)
- `src/lib/supabase/browser.ts` — browser client (singleton)
- `src/lib/supabase/admin.ts` — service-role client (server-only)
- `src/lib/supabase/middleware.ts` — middleware session helper
- `src/lib/auth/allowlist.ts` — `isEmailAllowed(email)` helper
- `src/lib/auth/__tests__/allowlist.test.ts`
- `src/middleware.ts` — protect `/admin/**`
- `src/app/admin/layout.tsx` — AdminShell layout
- `src/app/admin/page.tsx` — inquiries list
- `src/app/admin/login/page.tsx` — magic-link form
- `src/app/admin/login/LoginForm.tsx` — client component
- `src/app/admin/auth/callback/route.ts` — OTP callback handler
- `src/app/admin/auth/sign-out/route.ts` — sign-out POST
- `src/app/admin/inquiries/[id]/page.tsx` — inquiry detail
- `src/app/admin/inquiries/[id]/StatusControl.tsx` — client component
- `src/app/admin/inquiries/[id]/NotesThread.tsx` — client component
- `src/app/admin/users/page.tsx` — allowlist UI
- `src/app/admin/users/AllowedUsersTable.tsx` — client component
- `src/components/admin/AdminShell.tsx`
- `src/components/admin/InquiryFilters.tsx`
- `src/types/crm.ts` — `Inquiry`, `InquiryNote`, `AllowedUser` types
- `.env.example`

**Modified:**
- `src/app/api/contact/route.ts` — DB insert before email send
- `package.json` — add `@supabase/supabase-js`, `@supabase/ssr`
- `src/app/layout.tsx` — no changes needed (admin has its own layout)

---

## Task 1: Install dependencies and scaffold env

**Files:**
- Modify: `package.json`
- Create: `.env.example`

- [ ] **Step 1: Install Supabase packages**

Run:
```bash
cd /Users/isaacwalden/Desktop/jj-properties
npm install @supabase/supabase-js @supabase/ssr
```
Expected: packages added to `dependencies`, lockfile updated.

- [ ] **Step 2: Create `.env.example`**

Create `.env.example`:
```bash
# Resend (existing)
RESEND_API_KEY=
LEAD_TO_EMAIL=
LEAD_FROM_EMAIL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3004
```

- [ ] **Step 3: Add `.env.local` to `.gitignore` (verify)**

Run: `grep -E "^\\.env" .gitignore`
Expected output contains `.env*` or `.env.local`. If missing, append `.env.local` to `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat(crm): add Supabase deps and env scaffolding"
```

---

## Task 2: Provision Supabase project and apply schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Create Supabase project (operator action)**

The operator (or Claude via the Supabase MCP) must:
1. Create a new Supabase project named `jj-properties` in the Twenty1 Media organization.
2. Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`.
3. Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only).

If using the Supabase MCP: `mcp__supabase__create_project` with name `jj-properties`, then `mcp__supabase__get_publishable_keys` and `mcp__supabase__get_project_url`. Service role key must be retrieved from the Supabase dashboard (MCP does not expose it).

- [ ] **Step 2: Write migration SQL**

Create `supabase/migrations/0001_init.sql`:
```sql
-- 0001_init: CRM schema for JJ Properties inquiry portal

create table if not exists public.allowed_users (
  email      text primary key,
  added_at   timestamptz not null default now(),
  added_by   uuid references auth.users(id)
);

create table if not exists public.inquiries (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  first_name        text   not null,
  last_name         text   not null,
  email             text   not null,
  phone             text,
  inquiry_type      text   not null check (inquiry_type in ('buy','sell','invest','general')),
  property_interest text,
  message           text   not null,
  status            text   not null default 'new'
                          check (status in ('new','contacted','closed')),
  is_read           boolean not null default false,
  request_id        uuid   not null
);

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
create index if not exists inquiries_status_idx     on public.inquiries (status);
create index if not exists inquiries_property_idx   on public.inquiries (property_interest);

create table if not exists public.inquiry_notes (
  id          uuid primary key default gen_random_uuid(),
  inquiry_id  uuid not null references public.inquiries(id) on delete cascade,
  author_id   uuid not null references auth.users(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists inquiry_notes_inquiry_idx on public.inquiry_notes (inquiry_id, created_at);

-- Helper: is the current authenticated user allowlisted?
create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.inquiries      enable row level security;
alter table public.inquiry_notes  enable row level security;
alter table public.allowed_users  enable row level security;

-- inquiries: select/update for allowlisted users; no client insert/delete
drop policy if exists inquiries_select on public.inquiries;
create policy inquiries_select on public.inquiries
  for select using (public.is_allowed_user());

drop policy if exists inquiries_update on public.inquiries;
create policy inquiries_update on public.inquiries
  for update using (public.is_allowed_user())
  with check (public.is_allowed_user());

-- inquiry_notes: select/insert for allowlisted; update/delete only by author
drop policy if exists inquiry_notes_select on public.inquiry_notes;
create policy inquiry_notes_select on public.inquiry_notes
  for select using (public.is_allowed_user());

drop policy if exists inquiry_notes_insert on public.inquiry_notes;
create policy inquiry_notes_insert on public.inquiry_notes
  for insert with check (public.is_allowed_user() and author_id = auth.uid());

drop policy if exists inquiry_notes_modify on public.inquiry_notes;
create policy inquiry_notes_modify on public.inquiry_notes
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists inquiry_notes_delete on public.inquiry_notes;
create policy inquiry_notes_delete on public.inquiry_notes
  for delete using (author_id = auth.uid());

-- allowed_users: any allowlisted user can read and modify (no admin tier in v1)
drop policy if exists allowed_users_select on public.allowed_users;
create policy allowed_users_select on public.allowed_users
  for select using (public.is_allowed_user());

drop policy if exists allowed_users_insert on public.allowed_users;
create policy allowed_users_insert on public.allowed_users
  for insert with check (public.is_allowed_user());

drop policy if exists allowed_users_delete on public.allowed_users;
create policy allowed_users_delete on public.allowed_users
  for delete using (public.is_allowed_user());

-- Bootstrap: seed the first allowlisted user manually after deploy:
-- insert into public.allowed_users (email) values ('isaac@twenty1-media.com');
```

- [ ] **Step 3: Apply the migration**

Via Supabase MCP: `mcp__supabase__apply_migration` with `name=0001_init` and `query=<contents of file>`.

Or via Supabase SQL editor: paste and run.

- [ ] **Step 4: Seed first allowlisted user**

In Supabase SQL editor, run:
```sql
insert into public.allowed_users (email) values ('isaac@twenty1-media.com');
```
Expected: 1 row inserted. (Replace email with the operator's email.)

- [ ] **Step 5: Verify schema**

Run via MCP `mcp__supabase__list_tables` (schemas: `public`). Expected: `inquiries`, `inquiry_notes`, `allowed_users`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(crm): add inquiries/notes/allowlist schema with RLS"
```

---

## Task 3: Supabase client modules

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Browser client**

Create `src/lib/supabase/browser.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Server (RSC / route handler) client**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // RSC contexts cannot set cookies; safe to ignore here.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Service-role admin client (server-only)**

Create `src/lib/supabase/admin.ts`:
```ts
import { createClient } from "@supabase/supabase-js";

let cached: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin env vars are not set");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
```

- [ ] **Step 4: Middleware client**

Create `src/lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  return { response, supabase, user: data.user };
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase
git commit -m "feat(crm): add Supabase browser/server/admin/middleware clients"
```

---

## Task 4: CRM domain types

**Files:**
- Create: `src/types/crm.ts`

- [ ] **Step 1: Write types**

Create `src/types/crm.ts`:
```ts
export type InquiryStatus = "new" | "contacted" | "closed";
export type InquiryType = "buy" | "sell" | "invest" | "general";

export interface Inquiry {
  id: string;
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
  id: string;
  inquiry_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface AllowedUser {
  email: string;
  added_at: string;
  added_by: string | null;
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/types/crm.ts
git commit -m "feat(crm): add Inquiry/InquiryNote/AllowedUser types"
```

---

## Task 5: Allowlist helper (TDD)

**Files:**
- Create: `src/lib/auth/allowlist.ts`
- Create: `src/lib/auth/__tests__/allowlist.test.ts`

- [ ] **Step 1: Add Vitest if not present**

Check: `grep -q '"vitest"' package.json && echo "have it" || echo "missing"`

If missing, run:
```bash
npm install -D vitest @vitest/ui
```

Then add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/auth/__tests__/allowlist.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { isEmailAllowed } from "../allowlist";

function mockClient(rows: Array<{ email: string }>) {
  return {
    from() {
      return {
        select() {
          return {
            ilike: () =>
              Promise.resolve({
                data: rows,
                error: null,
              }),
          };
        },
      };
    },
  } as unknown as Parameters<typeof isEmailAllowed>[0];
}

describe("isEmailAllowed", () => {
  it("returns true when email exists (case-insensitive)", async () => {
    const client = mockClient([{ email: "Isaac@Twenty1-Media.com" }]);
    expect(await isEmailAllowed(client, "isaac@twenty1-media.com")).toBe(true);
  });

  it("returns false when email is not in the table", async () => {
    const client = mockClient([]);
    expect(await isEmailAllowed(client, "nope@example.com")).toBe(false);
  });

  it("returns false for blank email", async () => {
    const client = mockClient([{ email: "x@y.com" }]);
    expect(await isEmailAllowed(client, "")).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/__tests__/allowlist.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

Create `src/lib/auth/allowlist.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function isEmailAllowed(
  client: SupabaseClient,
  email: string
): Promise<boolean> {
  const trimmed = email.trim();
  if (!trimmed) return false;

  const { data, error } = await client
    .from("allowed_users")
    .select("email")
    .ilike("email", trimmed);

  if (error) {
    console.error("[allowlist] lookup failed:", error);
    return false;
  }

  return (data ?? []).length > 0;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/__tests__/allowlist.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/auth
git commit -m "feat(crm): add allowlist helper with tests"
```

---

## Task 6: Persist inquiries from `/api/contact`

**Files:**
- Modify: `src/app/api/contact/route.ts`

- [ ] **Step 1: Read the existing route**

Read `src/app/api/contact/route.ts` end-to-end so the insert is added at the right point (after validation/honeypot, before email send).

- [ ] **Step 2: Add DB insert before email send**

Replace the body of the `try` block in `POST` so that immediately before `await sendContactEmail(data, requestId);` we insert the row. The full updated file:
```ts
import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation/contact";
import { formatContactFieldErrors } from "@/lib/validation/errors";
import { checkContactRateLimit } from "@/lib/rate-limit";
import { sendContactEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContactResponse } from "@/types";

function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkContactRateLimit(ip)) {
      return NextResponse.json<ContactResponse>(
        { ok: false, message: "Too many requests. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ContactResponse>(
        { ok: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json<ContactResponse>(
        {
          ok: false,
          message: "Please fix the errors below and try again.",
          fieldErrors: formatContactFieldErrors(result.error),
        },
        { status: 400 }
      );
    }

    const data = result.data;

    if (data.honeypot) {
      return NextResponse.json<ContactResponse>({
        ok: true,
        message: "Thank you! We will be in touch shortly.",
      });
    }

    const requestId = crypto.randomUUID();

    // --- Persist to Supabase (best-effort: never blocks email send) ---
    try {
      const supabase = createAdminClient();
      const { error: insertError } = await supabase.from("inquiries").insert({
        request_id: requestId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone || null,
        inquiry_type: data.inquiryType,
        property_interest: data.propertyInterest || null,
        message: data.message,
      });
      if (insertError) {
        console.error("[contact] DB insert failed:", insertError);
      }
    } catch (dbErr) {
      console.error("[contact] DB insert threw:", dbErr);
    }

    // --- Send email (existing behavior) ---
    try {
      await sendContactEmail(data, requestId);
    } catch (emailError) {
      console.error("[contact] Email send failed:", emailError);
      return NextResponse.json<ContactResponse>(
        {
          ok: false,
          message: "We could not send your message at this time. Please try again later.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ContactResponse>({
      ok: true,
      message: "Thank you! We will be in touch shortly.",
      requestId,
    });
  } catch (error) {
    console.error("[contact] Unexpected error:", error);
    return NextResponse.json<ContactResponse>(
      { ok: false, message: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Manual smoke**

Start dev server: `PORT=3004 npm run dev` (if not already running on 3004).
Submit `/contact` form once.
Check `inquiries` table:
```sql
select created_at, first_name, last_name, email, status from public.inquiries order by created_at desc limit 5;
```
Expected: the new row appears with `status='new'`, `is_read=false`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "feat(crm): persist inquiries to Supabase before email send"
```

---

## Task 7: Auth middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Implement middleware**

Create `src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/auth/callback",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 2: Verify dev server still compiles**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke**

Visit `http://localhost:3004/admin` while logged out → should redirect to `/admin/login?next=/admin`.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(crm): protect /admin routes with Supabase session middleware"
```

---

## Task 8: Login page and callback

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/LoginForm.tsx`
- Create: `src/app/admin/auth/callback/route.ts`
- Create: `src/app/admin/auth/sign-out/route.ts`

- [ ] **Step 1: Login page (server component shell)**

Create `src/app/admin/login/page.tsx`:
```tsx
import LoginForm from "./LoginForm";

export const metadata = { title: "Admin Sign In · JJ Properties" };

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-sm border border-stone-200 p-8">
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">
          JJ Properties Admin
        </h1>
        <p className="text-stone-600 mb-6 text-sm">
          Enter your email to receive a sign-in link.
        </p>
        <LoginForm searchParamsPromise={searchParams} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Login form (client)**

Create `src/app/admin/login/LoginForm.tsx`:
```tsx
"use client";
import { use, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const params = use(searchParamsPromise);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(params.sent === "1");
  const [error, setError] = useState<string | null>(params.error ?? null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const next = params.next ?? "/admin";
    const redirectTo = `${window.location.origin}/admin/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });

    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Always show success — do not leak whether the address is allowlisted.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-stone-700 text-sm">
        If that email is on the allowlist, a sign-in link is on the way. Check your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-stone-700">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-900 focus:outline-none"
          placeholder="you@example.com"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-stone-900 text-white py-2 font-medium hover:bg-stone-800 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Callback route**

Create `src/app/admin/auth/callback/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email ?? "";
  const allowed = await isEmailAllowed(supabase, email);

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/admin/login?error=not_allowed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
```

- [ ] **Step 4: Sign-out route**

Create `src/app/admin/auth/sign-out/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/admin/login`, { status: 303 });
}
```

- [ ] **Step 5: Configure Supabase redirect URLs**

In Supabase dashboard → Authentication → URL Configuration, add:
- Site URL: `http://localhost:3004`
- Redirect URLs: `http://localhost:3004/admin/auth/callback`, plus the production URL once known.

- [ ] **Step 6: Manual smoke**

1. Visit `/admin/login`, submit allowlisted email.
2. Click magic link in email.
3. Land on `/admin` (page may 404 until Task 9 — that is fine; auth flow is what we are testing).
4. Submit a non-allowlisted email → magic link arrives → callback signs the session out → redirects to `/admin/login?error=not_allowed`.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/login src/app/admin/auth
git commit -m "feat(crm): magic-link login, callback with allowlist check, sign-out"
```

---

## Task 9: Admin shell layout

**Files:**
- Create: `src/components/admin/AdminShell.tsx`
- Create: `src/app/admin/layout.tsx`

- [ ] **Step 1: AdminShell**

Create `src/components/admin/AdminShell.tsx`:
```tsx
import Link from "next/link";

export default function AdminShell({
  email,
  children,
}: {
  email: string;
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
            <span className="text-stone-500">{email}</span>
            <form action="/admin/auth/sign-out" method="post">
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
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // The login and callback pages are children too — render bare for them.
  if (!user) return <>{children}</>;
  return <AdminShell email={user.email ?? ""}>{children}</AdminShell>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin src/app/admin/layout.tsx
git commit -m "feat(crm): add AdminShell layout with sign-out"
```

---

## Task 10: Inquiries list page

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/InquiryFilters.tsx`

- [ ] **Step 1: Filter component**

Create `src/components/admin/InquiryFilters.tsx`:
```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = ["all", "new", "contacted", "closed"] as const;
const TYPES = ["all", "buy", "sell", "invest", "general"] as const;

const PROPERTIES = [
  { slug: "all", label: "All properties" },
  { slug: "papins-resort", label: "Papin's Resort" },
  { slug: "island-view-resort", label: "Island View Resort" },
  { slug: "waterway-inn", label: "Waterway Inn" },
  { slug: "tahquamenon-suites", label: "Tahquamenon Suites" },
];

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
  const property = params.get("property") ?? "all";
  const q = params.get("q") ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <Select label="Status" value={status} options={STATUSES.map((s) => ({ value: s, label: s }))} onChange={(v) => update("status", v)} />
      <Select label="Type" value={type} options={TYPES.map((t) => ({ value: t, label: t }))} onChange={(v) => update("type", v)} />
      <Select label="Property" value={property} options={PROPERTIES.map((p) => ({ value: p.slug, label: p.label }))} onChange={(v) => update("property", v)} />
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
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col text-xs text-stone-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-md border border-stone-300 px-2 py-1 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: List page**

Create `src/app/admin/page.tsx`:
```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InquiryFilters from "@/components/admin/InquiryFilters";
import type { Inquiry } from "@/types/crm";

export const metadata = { title: "Inquiries · JJ Properties Admin" };

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "new";
  const type = sp.type;
  const property = sp.property;
  const q = sp.q?.trim();

  const supabase = await createClient();
  let query = supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") query = query.eq("status", status);
  if (type && type !== "all") query = query.eq("inquiry_type", type);
  if (property && property !== "all") query = query.eq("property_interest", property);
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data, error } = await query;
  const inquiries = (data ?? []) as Inquiry[];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Inquiries</h1>
        <span className="text-sm text-stone-500">{inquiries.length} shown</span>
      </div>

      <InquiryFilters />

      {error && (
        <p className="text-sm text-red-600 mb-4">Could not load inquiries: {error.message}</p>
      )}

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
                  {new Date(i.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/inquiries/${i.id}`}
                    className="font-medium text-stone-900 hover:underline"
                  >
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

- [ ] **Step 3: Manual smoke**

1. Sign in.
2. Visit `/admin` — see at least the inquiry submitted in Task 6 step 3.
3. Change Status filter to `all` → all rows visible.
4. Set Type or Property filter → list narrows.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/InquiryFilters.tsx
git commit -m "feat(crm): inquiries list with filters and unread badges"
```

---

## Task 11: Inquiry detail page (status + read toggle)

**Files:**
- Create: `src/app/admin/inquiries/[id]/page.tsx`
- Create: `src/app/admin/inquiries/[id]/StatusControl.tsx`

- [ ] **Step 1: Status control client component**

Create `src/app/admin/inquiries/[id]/StatusControl.tsx`:
```tsx
"use client";
import { useTransition, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { InquiryStatus } from "@/types/crm";

const STATUSES: InquiryStatus[] = ["new", "contacted", "closed"];

export default function StatusControl({
  id,
  initialStatus,
  initialIsRead,
}: {
  id: string;
  initialStatus: InquiryStatus;
  initialIsRead: boolean;
}) {
  const [status, setStatus] = useState<InquiryStatus>(initialStatus);
  const [isRead, setIsRead] = useState<boolean>(initialIsRead);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function update(patch: Partial<{ status: InquiryStatus; is_read: boolean }>) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("inquiries").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

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
            startTransition(() => {
              update({ status: next });
            });
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
            startTransition(() => {
              update({ is_read: next });
            });
          }}
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Detail page (without notes yet — added in Task 12)**

Create `src/app/admin/inquiries/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatusControl from "./StatusControl";
import NotesThread from "./NotesThread";
import type { Inquiry, InquiryNote } from "@/types/crm";

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: inquiry, error: ie }, { data: notes, error: ne }] = await Promise.all([
    supabase.from("inquiries").select("*").eq("id", id).single(),
    supabase
      .from("inquiry_notes")
      .select("*")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (ie || !inquiry) notFound();
  const i = inquiry as Inquiry;
  const noteRows = (notes ?? []) as InquiryNote[];

  // Auto-mark-read on first open.
  if (!i.is_read) {
    await supabase.from("inquiries").update({ is_read: true }).eq("id", id);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <article className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">
            {i.first_name} {i.last_name}
          </h1>
          <p className="text-sm text-stone-600">{i.email} · {i.phone || "no phone"}</p>
          <p className="text-xs text-stone-500">
            Received {new Date(i.created_at).toLocaleString()} · request {i.request_id}
          </p>
        </header>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-stone-500 text-xs uppercase tracking-wide">Type</dt>
            <dd className="capitalize">{i.inquiry_type}</dd>
          </div>
          <div>
            <dt className="text-stone-500 text-xs uppercase tracking-wide">Property</dt>
            <dd>{i.property_interest ?? "—"}</dd>
          </div>
        </dl>
        <div>
          <h2 className="text-stone-500 text-xs uppercase tracking-wide mb-1">Message</h2>
          <p className="whitespace-pre-wrap text-stone-800">{i.message}</p>
        </div>
        {ne && <p className="text-sm text-red-600">Notes failed to load: {ne.message}</p>}
      </article>

      <aside className="space-y-4">
        <StatusControl id={i.id} initialStatus={i.status} initialIsRead={true} />
        <NotesThread inquiryId={i.id} initialNotes={noteRows} />
      </aside>
    </div>
  );
}
```

(Note: imports `NotesThread` — that file is created in Task 12.)

- [ ] **Step 3: Commit (with placeholder for NotesThread)**

We will commit Task 11 + Task 12 together at the end of Task 12, since the page imports `NotesThread`. Move on.

---

## Task 12: Notes thread

**Files:**
- Create: `src/app/admin/inquiries/[id]/NotesThread.tsx`

- [ ] **Step 1: Implement NotesThread**

Create `src/app/admin/inquiries/[id]/NotesThread.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { InquiryNote } from "@/types/crm";

export default function NotesThread({
  inquiryId,
  initialNotes,
}: {
  inquiryId: string;
  initialNotes: InquiryNote[];
}) {
  const [notes, setNotes] = useState<InquiryNote[]>(initialNotes);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function addNote() {
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const author_id = userData.user?.id;
    if (!author_id) {
      setError("Not signed in.");
      return;
    }
    const { data, error } = await supabase
      .from("inquiry_notes")
      .insert({ inquiry_id: inquiryId, body: trimmed, author_id })
      .select("*")
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setNotes((prev) => [...prev, data as InquiryNote]);
    setBody("");
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-stone-700">Notes</h3>

      <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {notes.length === 0 && (
          <li className="text-xs text-stone-500">No notes yet.</li>
        )}
        {notes.map((n) => (
          <li key={n.id} className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-sm">
            <p className="whitespace-pre-wrap text-stone-800">{n.body}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-stone-500">
              {new Date(n.created_at).toLocaleString()}
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
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          disabled={pending || body.trim().length === 0}
          onClick={() => startTransition(() => { addNote(); })}
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

1. Open an inquiry detail page → page renders, status defaults shown.
2. Change status → page round-trips with the new status (refresh confirms).
3. Add a note → it appears immediately and persists after refresh.
4. Verify in SQL: `select count(*) from inquiry_notes;` → matches.

- [ ] **Step 3: Commit detail page + notes**

```bash
git add src/app/admin/inquiries
git commit -m "feat(crm): inquiry detail with status, read toggle, and notes"
```

---

## Task 13: Allowlisted users management

**Files:**
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/users/AllowedUsersTable.tsx`

- [ ] **Step 1: AllowedUsersTable client component**

Create `src/app/admin/users/AllowedUsersTable.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { AllowedUser } from "@/types/crm";

export default function AllowedUsersTable({
  initialUsers,
}: {
  initialUsers: AllowedUser[];
}) {
  const [users, setUsers] = useState<AllowedUser[]>(initialUsers);
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("allowed_users")
      .insert({ email: trimmed })
      .select("*")
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setUsers((prev) => [...prev, data as AllowedUser]);
    setEmail("");
  }

  async function remove(target: string) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("allowed_users").delete().eq("email", target);
    if (error) {
      setError(error.message);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.email !== target));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <label className="flex flex-col text-xs text-stone-600 grow">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@example.com"
            className="mt-1 rounded-md border border-stone-300 px-2 py-1 text-sm"
          />
        </label>
        <button
          disabled={pending || !email.trim()}
          onClick={() => startTransition(() => { add(); })}
          className="rounded-md bg-stone-900 text-white px-3 py-1 text-sm font-medium disabled:opacity-60"
        >
          Add
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="divide-y divide-stone-100 rounded-md border border-stone-200 bg-white">
        {users.map((u) => (
          <li key={u.email} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>{u.email}</span>
            <button
              onClick={() => startTransition(() => { remove(u.email); })}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
        {users.length === 0 && (
          <li className="px-3 py-4 text-center text-stone-500 text-sm">No allowlisted users.</li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Users page**

Create `src/app/admin/users/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import AllowedUsersTable from "./AllowedUsersTable";
import type { AllowedUser } from "@/types/crm";

export const metadata = { title: "Users · JJ Properties Admin" };

export default async function AllowedUsersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("allowed_users")
    .select("*")
    .order("added_at", { ascending: true });

  const users = (data ?? []) as AllowedUser[];

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Allowed users</h1>
        <p className="text-sm text-stone-600">
          Only emails listed here can sign in to the admin portal.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <AllowedUsersTable initialUsers={users} />
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke**

1. Visit `/admin/users`.
2. Add a second email → row appears.
3. Open private window → request a magic link with that second email → sign in succeeds.
4. Remove the second email → its session can stay active until logout, but a new login attempt will be denied at the callback.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users
git commit -m "feat(crm): allowlisted users management page"
```

---

## Task 14: Final smoke + handoff notes

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Type-check + tests + build**

Run:
```bash
npx tsc --noEmit
npx vitest run
npm run build
```
Expected: all pass.

- [ ] **Step 2: End-to-end smoke**

1. From a private browser, submit `/contact` with a real-looking inquiry.
2. Confirm: email arrives at `LEAD_TO_EMAIL` AND row appears in `inquiries` table.
3. Sign in to `/admin` → see the new inquiry with `new` status and unread badge.
4. Click → detail page → unread badge clears (auto-mark-read). Add note. Change status to `contacted`.
5. Refresh `/admin` with default filter (`status=new`) → the inquiry no longer appears. Switch to `status=all` → it shows as `contacted`.
6. Sign out → `/admin/login`.
7. Submit a non-allowlisted email → land back on login with `error=not_allowed`.

- [ ] **Step 3: Append to `README.md`**

Append the section below to `README.md`:
```md

## Admin Portal

The CRM lives at `/admin`. It is gated by Supabase magic-link auth and an `allowed_users` allowlist.

### Local setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Apply `supabase/migrations/0001_init.sql` to the Supabase project.
3. Seed the first user: `insert into public.allowed_users (email) values ('you@example.com');`
4. In Supabase → Authentication → URL Configuration, add `http://localhost:3004/admin/auth/callback` to redirect URLs (and the production URL once deployed).

### Design + plan

- Spec: `docs/superpowers/specs/2026-04-27-crm-inquiry-portal-design.md`
- Plan: `docs/superpowers/plans/2026-04-27-crm-inquiry-portal.md`
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(crm): admin portal setup notes in README"
```

---

## Spec Coverage Self-Review

- **Single shared workspace + allowlist** → Task 2 (RLS + `allowed_users`), Task 5 (helper), Task 8 (callback enforcement), Task 13 (UI).
- **Magic-link auth, no passwords** → Task 8.
- **Existing email path untouched** → Task 6 keeps `sendContactEmail` and only inserts before it.
- **DB write before email; failure of either is non-blocking the other** → Task 6 step 2 explicit.
- **Inquiries table with status + is_read + notes** → Tasks 2, 11, 12.
- **Pages**: `/admin/login`, `/admin/auth/callback`, `/admin`, `/admin/inquiries/[id]`, `/admin/users` → Tasks 8, 10, 11, 13.
- **Filters: status, type, property, search** → Task 10.
- **Account ownership / handoff** → Task 14 README + spec ownership section (out-of-band action).
- **Out-of-scope items** (reply-from-portal, audit log, assigned-to, Slack, CSV export, admin tier) → not implemented, matches spec.

No placeholders, no contradictions, no undefined types or methods between tasks.
