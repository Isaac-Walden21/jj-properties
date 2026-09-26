# JJ Properties — HANDOFF

## CRM back office (release 1) — built, NOT deployed — 2026-09-26

**Branch `feat/crm-connector`** (worktree `~/Desktop/_Projects/jj-crm`). Built on Asher's `feat/crm-aws` (taken over; Asher is off it) and merged with production `cutover/jjresortproperties`. Plan + Codex rounds: `.review-loop/plan-2026-09-26-135553/`; code review: `.review-loop/2026-09-26-141937/` (git-ignored, local only).

**What Jack and Jeff get:** `/admin` login → lead list (filters, unread), lead page (status, notes), Logins page (admins add/remove), Account (change password). Leads save to SQLite before the staff email. Inquirer auto-ack email is ON (Isaac approved 9/26), plain text.

**Isaac decisions 9/26:** auto-ack on; Jack + Jeff are admins; both on paid Claude plans (connector = release 2). No self-serve forgot-password: Isaac runs `node scripts/create-user.mjs --reset <username>` on the box (prints temp password, clears lockout, signs out old sessions).

**Verified locally (prod build, `next start`):** tsc, vitest 6/6, build; scripted browser pass of every flow desktop + 390px mobile; sign-out-everywhere on password change; lockout after 10 fails; migrate idempotent + refuses relative path in prod; backup + restore rehearsal on a scratch DB. Console: only the known `/_vercel/insights` 404.

**NOT verified:** anything on the box (deploy is Isaac-only); real email sends; `npm ci` of better-sqlite3 on the box under the build memory cap.

### First deploy — Isaac runs (order matters)
1. On the box: `mkdir -p /home/ubuntu/jj-data` and add to `~/app-jjproperties/.env.local`:
   `SQLITE_DB_PATH=/home/ubuntu/jj-data/crm.db` and `SESSION_SECRET=<openssl rand -hex 32>`. Without these the new migrate step stops the deploy (by design).
2. Stop `jjproperties` first (memory gotcha below), then from the worktree: `./deploy/deploy.sh jjproperties deploy --yes --auto-rollback`. New step 3b backs up the DB, then migrates, before the build.
3. On the box, in `~/app-jjproperties`: `NODE_ENV=production node scripts/create-user.mjs isaac <email> admin`, then `jack jack.schiefelbein@yahoo.com admin`, `jeff jeff.lipple@gmail.com admin`. Each prints a temp password once — send to Jack/Jeff yourself.
4. Nightly backup: `crontab -e` → `15 3 * * * cd /home/ubuntu/app-jjproperties && NODE_ENV=production node scripts/backup.mjs >> /home/ubuntu/jj-data/backup.log 2>&1`
5. Smoke: submit the contact form once (emails the real inboxes + an ack to the address you type) → it shows in `/admin`.

### Known, accepted
- A login that has written notes can't be removed (notes keep their author) — the page says so.
- If staff email fails after the lead saved, the visitor retries → duplicate lead. Rare; harmless.
- Leads that fail to save still email staff, with `[NOT IN CRM]` in the subject.

### Next: release 2 — Claude connector
Plan is agreed (`r3/plan.md` Release 2): spike first (discovery + sign-in + tool list through a tunnel, tested in Isaac's Claude), then full tools (list/get/status/note/mark read), OAuth abuse caps, revoke on Account page.

---

## LIVE on jjresortproperties.com — 2026-09-24

- Domain bought by Isaac in Cloudflare (zone `8ec693019b2779b7fdf59b7ab93864d4`). Apex + www A records -> 3.133.239.181, DNS-only, TTL 300.
- Lightsail `jj-cms-app`: port-80 block (ACME + redirect) appended to `sites-available/jjproperties` (backup `.bak-20260924-*`); `deploy/nginx/jjproperties-domain.conf` installed as `sites-available/jjproperties-domain` and symlinked. Cert `/etc/letsencrypt/live/jjresortproperties.com`, auto-renews, expires 2026-12-23.
- `~/app-jjproperties/.env.local`: `NEXT_PUBLIC_SITE_URL=https://jjresortproperties.com` (backup alongside). Release `20260924-143426` deployed, all health checks passed, Cedarville/Tahquamenon NRestarts unchanged.
- Verified: robots.txt `Allow: /` + sitemap on real origin, canonical + og:url on real origin, no X-Robots-Tag. The nip.io vhost keeps its noindex header on purpose.
- **Memory gotcha:** box sits ~530-580MB available; deploy floor is 700MB. Stop `jjproperties` first (frees ~250MB), then `deploy.sh jjproperties deploy --yes --auto-rollback`, then make sure it is active again.
- Not done: live contact-form test (emails the client inbox — Isaac's call). Stray 404 for `/_vercel/insights/script.js` in console (Vercel Analytics leftover, harmless).
- 2026-09-24 later: contact-form leads now go to Jack (jack.schiefelbein@yahoo.com), Jeff (jeff.lipple@gmail.com) AND
  JJResortProperties@gmail.com — `LEAD_TO_EMAIL` is comma-separated (code in `src/lib/email.ts`). Release 20260924-155104.
  Not yet proven by a real submission.
- Branch `cutover/jjresortproperties` holds this + the PUBLIC_ORIGIN change; not yet merged to main.


**Last updated:** 2026-09-04 (Island View tracking section added; CRM section below is unchanged since 2026-04-27)
**Branch state:** `main` is live on Vercel. CRM scaffolding lives on `feat/crm-portal`.
**Live site:** https://jj-properties.vercel.app
**Repo:** https://github.com/Isaac-Walden21/jj-properties

---

## Island View conversion tracking — state as of 2026-09-04

**Bottom line:** Purchase tracking works end to end. Nothing to build. Waiting on the first real full-price booking to prove the value.

### What is true (verified against the Meta API and OwnerRez docs, 2026-09-03)
- Pixel `1802506640938703` ("Island View Hotel Dataset", created 7/30, first fired 8/21). `ivr906.com` fires PageView only; the pixel lives in Sanity `TrackingScripts` in Asher's `~/island-view` repo, not in code.
- Every booking event (AddToCart, InitiateCheckout, Purchase) fires from OwnerRez's own pages: `secure.ownerreservations.com` widget iframe, then `booking.ownerrez.com` checkout. The pixel ID is entered in OwnerRez Settings > Advanced Tools > Analytics Tracking. OwnerRez sends Purchase with value = booking total (their doc: "Tracking guest interactions through Google Analytics and Facebook Pixel").
- Meta's own Conversions API mirror (OpenBridge, event IDs `ob3_plugin-…`) has been on since ~8/28. Every browser event gets a server twin. Raw `/stats` double-counts; reporting dedupes. Query `WEB_ONLY` for real counts.
- Only Purchase ever received: Jessie's (DDS) test booking 8/31 8:10 PM ET. She books with a discount code that charges tax only, then Jeff refunds her. So the value on that event should be the tax amount (small, nonzero), and Meta does not see the refund.
- Meta alert 9/1 ("Purchase events all sending the same price, need 5 distinct prices") is a sample of one. It clears on its own after 5+ real bookings at different totals. Not a bug.
- Jack and Jeff confirmed through Jessie (9/3 7:19 PM): no website bookings in September. Meta shows zero checkout starts on 9/2 and 9/3. No missed booking.

### Thread
Gmail thread "Island View Working!" (`1a05a55b00a454e5`): Isaac to Jessie, Cc Asher. Isaac's 9/3 reply asked for the value on the 8/31 event and offered two things to watch (see Open 4 and 5). Jessie's plan: wait for a real booking, check again 9/4. She has NOT yet read the value (Events Manager > Datasets > click Purchase > View details > Sampled Activities).

### Open, in priority order
1. **First full-price booking** → confirm Purchase arrives with a real value. If a real booking shows value 0 → OwnerRez support ticket. There is no OwnerRez setting for the value; Asher's OwnerRez login can only read the booking total and list bookings.
2. **Ads optimization event (Jessie's call).** Purchase has one event. Optimizing on InitiateCheckout until volume is an option (7 starts on 9/1). Isaac's sent reply dropped this suggestion.
3. **Attribution gap, ours to decide.** The iframe in `src/components/booking/OwnerRezWidget.tsx` (island-view repo) carries no `fbclid`/`gclid`. Adding them is only half a fix: checkout hops to a different registrable domain and OwnerRez's widget bundle forwards nothing. Real fix is OwnerRez support, or landing ads on OwnerRez hosted pages. Facebook's in-app browser attributes fine regardless, so this mostly costs Safari traffic.
4. **Asher "fixing" a 0 value** (Isaac offered this): not possible from OwnerRez settings. Route to OwnerRez support if it happens.
5. **GTM fallback "like Cedarville"** (Isaac offered this): OwnerRez has a GTM container field in the same settings screen, but nothing in their doc says the booking total reaches a dataLayer trigger the way innRoad's does. Verify on a test booking before promising a date. If used, remove the native pixel ID from OwnerRez or Purchase fires twice.
6. **Staging host** `islandview.3-133-239-181.nip.io` fires the production pixel and inflates PageViews. Fix is a host guard in Sanity TrackingScripts, not the repo.
7. Tax-only test bookings that get refunded still count as revenue in Meta. Note it when reading ROAS.

### Cedarville (sibling property, innRoad, same client and agency)
Click-ID passthrough live (`asherwalden/cedarville-hotel-next`, commit `90b6cdee`). GTM `GTM-TKGRPQNW` and pixel `634910952026445` live on innRoad's engine; Purchase tag verified on a live checkout with a numeric value. Waiting on a real booking for `transaction_id`. innRoad still owes cross-domain on GA4 and a real client GA4 ID. Detail in the vault inbox, 8/30 and 8/31 entries.

---

## Stack

- Next.js 16.1.6 (App Router, Turbopack) · React 19 · Tailwind 4 · TypeScript
- Framer Motion · lucide-react · react-hook-form + Zod
- Resend (contact form email) — keys live in Vercel env
- Supabase (planned, not wired) — `@supabase/supabase-js` + `@supabase/ssr` already installed

## Local dev

```bash
cd ~/Desktop/_Projects/jj-properties
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
