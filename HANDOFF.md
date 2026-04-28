# JJ Properties — HANDOFF

**Last updated:** 2026-04-27
**Branch state:** `main` is live on Vercel. CRM scaffolding lives on `feat/crm-portal`.
**Live site:** https://jj-properties.vercel.app
**Repo:** https://github.com/Isaac-Walden21/jj-properties

---

## Stack

- Next.js 16.1.6 (App Router, Turbopack) · React 19 · Tailwind 4 · TypeScript
- Framer Motion · lucide-react · react-hook-form + Zod
- Resend (contact form email) — keys live in Vercel env
- Supabase (planned, not wired) — `@supabase/supabase-js` + `@supabase/ssr` already installed

## Local dev

```bash
cd ~/Desktop/jj-properties
PORT=3004 npm run dev
```

Other ports already in use locally: 3000, 3002, 3003 (other projects).

---

## Last Session (2026-04-27)

### Done

1. **Cloned repo** to `~/Desktop/jj-properties`, installed deps (28 npm advisories — non-blocking).
2. **CRM design spec** approved and committed: `docs/superpowers/specs/2026-04-27-crm-inquiry-portal-design.md`.
3. **CRM implementation plan** committed: `docs/superpowers/plans/2026-04-27-crm-inquiry-portal.md` (14 tasks).
4. **Plan execution started** via subagent-driven-development:
   - Task 1 ✅ — installed `@supabase/supabase-js` + `@supabase/ssr`, created `.env.example`, updated `.gitignore`.
   - Task 2 ⛔ **paused** (see Blockers below).
5. **Pivoted to image work** — filled 4 missing `<ValuePropSection>` placeholders with real UP photos:
   - Homepage Sell card → `cedarville-bay.jpg`
   - Homepage Partner card → `year-round-adventure.jpg`
   - `/sell` page hero → `relax-and-recharge.jpg`
   - `/invest` page hero → `les-cheneaux-islands.jpeg`
   - Photos sourced from `~/Downloads`, copied into `public/images/`.
6. **Pushed to main** and triggered Vercel auto-deploy. Branch `feat/crm-portal` also pushed for CRM continuation.

### Live commits (on main)

```
15b6f2a feat(site): wire UP photos into ValuePropSection placeholders
ec12968 feat(crm): add Supabase deps and env scaffolding
abb5a9b docs: add CRM inquiry portal implementation plan
29f0f22 docs: add CRM inquiry portal design spec
```

---

## Blockers

### B1 — Supabase project creation cost

The Twenty-One Media Supabase org has 8 active projects. A new project under that org costs **$10/month** (per Supabase MCP `get_cost`).

This contradicts Isaac's explicit constraint: zero recurring out-of-pocket cost for this client (no recurring revenue, agency-style build-and-handoff model).

**Resolution path (recommended):**

1. Go to Supabase dashboard → click profile menu → **Create a new organization**.
2. Name it `JJ Properties` (or similar). Pick the **Free** plan tier — no card required.
3. Tell next-session Claude the new org slug, then resume Plan Task 2.
4. At handoff to client, transfer the project to a client-owned org and stay on as a member.

**Alternative paths:** have the client create the Supabase project themselves and share creds (see spec § Account Ownership & Handoff for the standard transfer flow).

---

## Resume Plan — CRM Inquiry Portal

**Where to pick up:** `feat/crm-portal` branch, Task 2 in
`docs/superpowers/plans/2026-04-27-crm-inquiry-portal.md`.

```bash
git checkout feat/crm-portal
```

**Remaining tasks (12):**

| # | Task | Notes |
| --- | --- | --- |
| 2 | Provision Supabase project + apply migration | **Blocked** — see B1. Once unblocked, the migration SQL is in the plan file |
| 3 | Supabase client modules (`browser`/`server`/`admin`/`middleware`) | |
| 4 | CRM domain types | |
| 5 | Allowlist helper (TDD with Vitest) | Vitest not installed yet |
| 6 | Persist inquiries from `/api/contact` | Modify existing route — DB write before email |
| 7 | Auth middleware | `/admin/**` redirect to login |
| 8 | Magic-link login + callback + sign-out | |
| 9 | AdminShell layout | |
| 10 | Inquiries list + filters | |
| 11+12 | Inquiry detail + status + notes thread | Committed together |
| 13 | Allowlisted users management | |
| 14 | Final smoke + README handoff notes | |

**Execution mode:** subagent-driven-development (already chosen). Resume by reading the plan file and dispatching the implementer for Task 2.

---

## Project Structure (key paths)

```
src/
  app/
    page.tsx              ← homepage, 3 ValuePropSections
    sell/page.tsx
    invest/page.tsx
    about/page.tsx
    properties/page.tsx
    contact/page.tsx
    api/contact/route.ts  ← contact form handler (Resend send, no DB yet)
  components/
    sections/
      HeroSection.tsx     ← rotating montage (hero-1..4.jpg)
      ValuePropSection.tsx ← image-or-gradient card system
      PortfolioStrip.tsx
      PropertyCard.tsx
      TeamBio.tsx         ← currently rendered with showImage={false}
      CTABanner.tsx
      PageIntro.tsx
    forms/ContactForm.tsx
    motion/, ui/
  content/
    site.ts, properties.ts, team.ts, navigation.ts, seo.ts
  lib/
    email.ts, rate-limit.ts, validation/, seo.ts, utils.ts
  types/
public/
  hero/hero-{1..4}.jpg    ← homepage hero rotation
  images/                 ← UP value-prop photos (added this session)
  *.jpg, *.png, *.webp    ← property + team images
docs/superpowers/
  specs/2026-04-27-crm-inquiry-portal-design.md
  plans/2026-04-27-crm-inquiry-portal.md
```

---

## Known UI gaps (not blocking)

- `/about` team headshots are intentionally hidden (`showImage={false}` in `about/page.tsx:43`). If real headshots arrive for Jack/Jeff, place at `public/images/team/jack.jpg` (matching `src/content/team.ts:8`) and flip `showImage` to `true` in `about/page.tsx`.
- No OG share image generated yet — currently uses default Next.js metadata.
- `properties/page.tsx` "Our Next Property" card uses an intentional question-mark placeholder — that's the design, not a bug.

---

## Account Ownership Plan (per design spec)

All third-party accounts created under Twenty1 Media during build, transferred to JJ Properties at handoff:

- Supabase (project, once created)
- Vercel (already exists — `jj-properties.vercel.app`)
- GitHub repo (currently `Isaac-Walden21/jj-properties`)
- Resend (already in use)

After transfer, stay added as a member on each so future maintenance does not need client involvement.
