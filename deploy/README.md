# Deploying the J&J Resort Properties brand site

This site moved off Vercel on 2026-08-14 and now runs as **tenant #3** on the
same Lightsail box as Cedarville Hotel and Tahquamenon Suites.

```
./deploy/deploy.sh jjproperties check      # what would change, and is the box well?
./deploy/deploy.sh jjproperties deploy     # ship it
./deploy/deploy.sh jjproperties health     # prove the running site works
./deploy/deploy.sh jjproperties status     # what is deployed, what can roll back
./deploy/deploy.sh jjproperties rollback   # put the previous release back
```

Everything property-specific lives in `targets/jjproperties.env`. The three
scripts are copies of the ones in `cedarville-payload/deploy` — see *Drift from
Cedarville* below.

## What this tenant is

| | |
|---|---|
| Service | `jjproperties.service`, port **3002** |
| App dir | `/home/ubuntu/app-jjproperties` (**not** `~/app` — that is Cedarville's) |
| Origin | `https://jj.3-133-239-181.nip.io` until the real domain is bought |
| CMS | none — no Payload, no database, no S3 bucket |
| Server-side surface | `/api/contact` only |

It is the only tenant with no CMS, which is why `HEALTH_ADMIN_PATH` is empty and
the health check skips its admin section instead of failing it.

## The box is shared with a live hotel

`cedarville.service` serves real guests and has no memory cap of its own. A
1.9GB box now runs three Next servers. Two things follow, and neither is
optional:

- This service is capped (`MemoryHigh=350M`, `MemoryMax=512M`) so that anything
  leaking here gets reclaimed and OOM-killed *here*, rather than the kernel
  picking the largest process on the box — which is Cedarville.
- The build is capped tighter than Cedarville's (`BUILD_MEMORY_MAX=900M`) and
  refuses to start below 700MB available. The health check asserts Cedarville's
  and Tahquamenon's restart counts are unchanged afterwards; a build that
  OOM-killed a sibling fails the deploy even though this site came up fine.

Post-deploy resting state, for comparison on a future deploy: cedarville ~223MB,
jjproperties ~157MB, tahquamenon ~27MB, ~1.1GB available.

**Every nginx change must pass `nginx -t` before reload.** A bad config does not
degrade this site — it stops nginx, and that takes Cedarville down with it.

## The site is deliberately not indexable yet

`src/lib/site-url.ts` holds `INDEXABLE_HOSTS`. Any origin not on that list gets a
blanket `Disallow: /` from `robots.ts`, and the nip.io vhost adds an
`X-Robots-Tag: noindex, nofollow` header on top.

This is keyed off the canonical origin rather than a separate flag so there is
one thing to change at cutover, not two that can drift. It fails closed: an
unrecognised host is treated as not-production. The cost of forgetting is an
unindexed site, not the whole site indexed under a throwaway hostname — which is
the mistake TWE-211 caught on the old `*.vercel.app` host.

## Domain cutover

The client is buying **jjresortproperties.com** (not jjproperties.com, which is
parked on Afternic and is not theirs — TWE-114). The full ordered runbook is in
the header comment of `nginx/jjproperties-domain.conf`. The step people skip is
the last one: add the domain to `INDEXABLE_HOSTS` and drop the `X-Robots-Tag`
line, or the site launches correctly noindexed and silently never ranks.

## Contact form

Leads go to `JJResortProperties@gmail.com` — the address the site's own /contact
page publishes — sent via Resend from a `@twenty1-media.com` sender, which is the
verified domain shared with Cedarville.

This was unset until 2026-08-17. Worth knowing why: the Vercel project it moved
from had **no environment variables at all**, so the contact form was already
broken before the migration. It did not regress here, and there was no prior
config to copy — the value was recovered from the page copy.

## Drift from Cedarville

`deploy.sh`, `healthcheck.sh` and `remote.sh` are per-tenant copies by design
(each tenant lives in its own repo). Four changes were made here that Cedarville
has not received:

1. `healthcheck.sh` — the admin-panel section is driven by `ADMIN_PATH` /
   `ADMIN_MARKER` instead of hardcoding `/admin` and the string `payload`.
2. `remote.sh` — the post-install module check is driven by `REQUIRE_MODULES`
   instead of hardcoding `sharp`/`next`/`payload`.
3. `healthcheck.sh` — the image sampler now tests the **widest** `w=` variant of
   each source image rather than the first one in the markup. Next emits its
   srcset ladder smallest-first, so the old behaviour tested `w=32` thumbnails
   against a 1000-byte floor and reported four perfectly healthy images as the
   gallery-403 regression.
4. `deploy.sh` — the missing-`.env.local` message names this app's secrets
   rather than Payload's database URI.

(1), (2) and (4) are only relevant to a CMS-less tenant. **(3) is a real bug and
Cedarville still has it** — its `/gallery` page has not tripped it only because
of which widths that markup happens to emit first. Worth backporting.

Note that `cedarville-payload` is not a git repository, so that backport has no
history to land on. Worth fixing first.
