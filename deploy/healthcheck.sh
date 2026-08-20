#!/usr/bin/env bash
#
# healthcheck.sh — runs ON the box, against localhost and (for the one check
# that needs to traverse nginx) the public origin.
#
# The premise of this file is the first line of HANDOFF.md's Gotchas:
#
#     "curl 200 does not mean a page works"
#
# It has cost this project twice — the gallery 403, where every image was an
# alt-text box behind a clean 200, and the nested-root-layout admin crash, where
# the browser renderer died on a response that curl was perfectly happy with. So
# nothing below is satisfied by a status code alone. Every check asserts
# something about the bytes.
#
# It still cannot replace a browser. What it cannot see is listed at the end of
# the run, as a short manual checklist, rather than being quietly omitted.
#
# Streamed over stdin by deploy.sh; never installed on the box.

set -uo pipefail

for arg in "$@"; do
  case "$arg" in
    *=*) export "${arg%%=*}=${arg#*=}" ;;
    *) echo "healthcheck.sh: bad argument '$arg'" >&2; exit 2 ;;
  esac
done

: "${PORT:?PORT is required}"
: "${SERVICE:?SERVICE is required}"
ROUTES="${ROUTES:-/}"
ASSETS="${ASSETS:-}"
MIN_HTML_BYTES="${MIN_HTML_BYTES:-2000}"
HTML_REQUIRE="${HTML_REQUIRE:-main h1 footer}"
IMAGE_PAGE="${IMAGE_PAGE:-}"
IMAGE_SAMPLES="${IMAGE_SAMPLES:-5}"
SIBLING_SERVICES="${SIBLING_SERVICES:-}"
BASELINE_RESTARTS="${BASELINE_RESTARTS:-}"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-}"
WAIT_SECONDS="${WAIT_SECONDS:-90}"
CHECK_SERVER_ACTIONS="${CHECK_SERVER_ACTIONS:-1}"
# Tenants with a CMS admin panel set ADMIN_PATH (Cedarville: /admin) and
# ADMIN_MARKER, the string its shell must contain. The brand site has no CMS,
# so both are empty here and the admin section is skipped rather than deleted —
# keeping this file identical in shape to the other tenants' copies.
ADMIN_PATH="${ADMIN_PATH:-}"
ADMIN_MARKER="${ADMIN_MARKER:-}"

BASE="http://127.0.0.1:$PORT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

FAILS=0
WARNS=0

pass() { printf '  \033[32mPASS\033[0m  %s\n' "$*"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$*"; FAILS=$((FAILS + 1)); }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$*"; WARNS=$((WARNS + 1)); }
head2() { printf '\n\033[1m%s\033[0m\n' "$*"; }
# Neither a pass nor a failure: a section that does not apply to this tenant.
# Printed rather than omitted so the output shape stays comparable between
# tenants and a skipped section can never be mistaken for one that passed.
skip() { printf '  \033[2mSKIP\033[0m  %s\n' "$*"; }

svc() { systemctl show "$1" -p "$2" --value 2>/dev/null || echo "?"; }

baseline_for() {
  for kv in $BASELINE_RESTARTS; do
    [ "${kv%%=*}" = "$1" ] && { echo "${kv#*=}"; return; }
  done
  echo ""
}

# Count OCCURRENCES, not matching lines.
#
# `grep -c` counts lines and Next serves its HTML as a single line — measured:
# `wc -l` on this app's / and /admin responses both return 0. So the check
# HANDOFF documents, `curl -s .../admin | grep -c '<html'` must print 1, returns
# 1 whether the response contains one <html> tag or two, which is precisely the
# bug it was written to catch. `grep -o | wc -l` counts them properly.
count_occurrences() { grep -o "$1" "$2" 2>/dev/null | wc -l | tr -d ' '; }

# ---------------------------------------------------------------- 1. service --
head2 "Service: $SERVICE"

active="$(svc "$SERVICE" ActiveState)"
substate="$(svc "$SERVICE" SubState)"
nrestarts="$(svc "$SERVICE" NRestarts)"

# NOTE — deliberately NOT grepping the journal for "Failed with result
# 'exit-code'". A `systemctl restart` always logs that for the OUTGOING process,
# which is just the old server taking SIGTERM. ActiveState/SubState describe the
# process that is actually running now; NRestarts counts only the automatic
# (Restart=always) restarts, so it moves if and only if the new process is
# crash-looping.
if [ "$active" = "active" ] && [ "$substate" = "running" ]; then
  pass "ActiveState=active SubState=running"
else
  fail "ActiveState=$active SubState=$substate (expected active/running)"
fi

base_n="$(baseline_for "$SERVICE")"
if [ -n "$base_n" ]; then
  if [ "$nrestarts" -le "$base_n" ] 2>/dev/null; then
    pass "NRestarts=$nrestarts, unchanged from the pre-deploy baseline ($base_n) — not crash-looping"
  else
    fail "NRestarts rose $base_n -> $nrestarts: the new process has restarted itself, i.e. it is crashing"
  fi
else
  echo "        NRestarts=$nrestarts (no baseline supplied)"
fi

# ------------------------------------------------------------- 2. readiness --
head2 "Readiness"
ready=0
for i in $(seq 1 "$WAIT_SECONDS"); do
  if curl -sf -o /dev/null --max-time 5 "$BASE/"; then ready=1; break; fi
  sleep 1
done
if [ "$ready" = 1 ]; then
  pass "answering on $BASE after ${i}s"
else
  fail "no response on $BASE after ${WAIT_SECONDS}s — stopping, later checks would only be noise"
  exit 1
fi

# ----------------------------------------------------------------- 3. admin --
# The admin is checked first and hardest because its failure mode is invisible
# from the outside: two nested root layouts served a complete HTML document
# inside another complete HTML document. Chrome killed the renderer; every
# server-side signal, including the status code and the byte count, looked fine.
if [ -z "$ADMIN_PATH" ]; then
  head2 "Admin panel"
  skip "no ADMIN_PATH configured — this tenant has no CMS"
else
head2 "Admin panel"
code="$(curl -s -o "$TMP/admin.html" -w '%{http_code}' --max-time 20 "$BASE$ADMIN_PATH")"
if [ "$code" = "200" ]; then
  pass "$ADMIN_PATH -> 200"
else
  fail "$ADMIN_PATH -> $code"
fi
h="$(count_occurrences '<html' "$TMP/admin.html")"
b="$(count_occurrences '<body' "$TMP/admin.html")"
[ "$h" = "1" ] && pass "$ADMIN_PATH contains exactly one <html> ($h)" \
  || fail "$ADMIN_PATH contains $h <html> tags — expected exactly 1 (two means a root layout nested inside another; the browser renderer will die on it)"
[ "$b" = "1" ] && pass "$ADMIN_PATH contains exactly one <body> ($b)" \
  || fail "$ADMIN_PATH contains $b <body> tags — expected exactly 1"
if grep -qi "$ADMIN_MARKER" "$TMP/admin.html"; then
  pass "$ADMIN_PATH body is the $ADMIN_MARKER shell"
else
  fail "$ADMIN_PATH returned HTML with no trace of $ADMIN_MARKER in it"
fi
fi

# ---------------------------------------------------------------- 4. public --
head2 "Public routes"
for route in $ROUTES; do
  f="$TMP/page.html"
  code="$(curl -s -o "$f" -w '%{http_code}' --max-time 30 "$BASE$route")"
  size="$(wc -c < "$f" | tr -d ' ')"
  h="$(count_occurrences '<html' "$f")"
  b="$(count_occurrences '<body' "$f")"

  if [ "$code" != "200" ]; then
    fail "$route -> $code"
    continue
  fi
  if [ "$h" != "1" ] || [ "$b" != "1" ]; then
    fail "$route -> 200 but $h <html> / $b <body> (expected 1 / 1)"
    continue
  fi
  if [ "$size" -lt "$MIN_HTML_BYTES" ]; then
    fail "$route -> 200 but only ${size}B (< ${MIN_HTML_BYTES}B — a 200-with-an-error-page looks like this)"
    continue
  fi

  # Next renders these INSIDE a 200, so the status code genuinely does not tell
  # you. Measured against every route in this app: both are 0 on a healthy page.
  #
  # "This page could not be found" is NOT in this list, though it is the
  # obvious candidate — Next inlines that string into the not-found boundary of
  # every page, four times on this app's home page. As an error marker it fails
  # 100% of healthy routes. A real 404 is caught by the status code above.
  if grep -qE 'Application error|Internal Server Error' "$f"; then
    fail "$route -> 200 but the body contains a Next error page"
    continue
  fi

  # Positive assertions beat negative ones: rather than guessing at every string
  # a broken page might contain, require the things a working page must have.
  # A page that rendered its layout, reached its content and produced a heading
  # cannot be an error page wearing a 200.
  missing=""
  for tag in $HTML_REQUIRE; do
    [ "$(count_occurrences "<$tag" "$f")" -ge 1 ] || missing="$missing <$tag>"
  done
  if [ -n "$missing" ]; then
    fail "$route -> 200, ${size}B, but the body has no$missing — it did not render the site layout"
    continue
  fi

  pass "$route -> 200, ${size}B, 1x<html>, 1x<body>, has $(echo "$HTML_REQUIRE" | sed 's/[^ ]*/<&>/g')"
done

# ---------------------------------------------------------------- 5. assets --
head2 "Non-HTML routes"
for asset in $ASSETS; do
  f="$TMP/asset"
  read -r code ctype <<< "$(curl -s -o "$f" -w '%{http_code} %{content_type}' --max-time 20 "$BASE$asset")"
  size="$(wc -c < "$f" | tr -d ' ')"
  case "$asset" in
    /robots.txt)
      # robots.ts and favicon.ico are silently not emitted if they get moved
      # into a route group — no build error, just a 404 later.
      if [ "$code" = "200" ] && grep -q 'User-Agent' "$f"; then
        pass "$asset -> 200, ${size}B, has a User-Agent directive"
      else
        fail "$asset -> $code, ${size}B, not a robots file"
      fi
      ;;
    /sitemap.xml)
      if [ "$code" = "200" ] && grep -q '<urlset' "$f"; then
        pass "$asset -> 200, ${size}B, parses as a urlset"
      else
        fail "$asset -> $code, ${size}B, not a sitemap"
      fi
      ;;
    *)
      if [ "$code" = "200" ] && [ "$size" -gt 100 ]; then
        pass "$asset -> 200, ${size}B, $ctype"
      else
        fail "$asset -> $code, ${size}B, $ctype"
      fi
      ;;
  esac
done

# ---------------------------------------------------------------- 6. images --
# The gallery regression test. When Media.access.read stopped being public,
# every /_next/image request 403'd; the page still returned 200 with the right
# byte count and the right number of <img> tags, and the site rendered as a wall
# of alt text. So: take the real optimizer URLs out of the real HTML, one per
# distinct source image, and require image bytes back.
if [ -n "$IMAGE_PAGE" ]; then
  head2 "Optimized images on $IMAGE_PAGE"
  curl -s -o "$TMP/imgpage.html" --max-time 30 "$BASE$IMAGE_PAGE"
  # One URL per distinct source image, and specifically the WIDEST `w=` variant
  # of it. Taking the first occurrence instead — which is what this did until
  # 2026-08-14 — picks whichever srcset entry the markup happens to emit first,
  # and Next emits the ladder smallest-first. A w=32 thumbnail is a few hundred
  # bytes when everything is working perfectly, so the size floor below flagged
  # four healthy images as the gallery 403. The floor is only meaningful against
  # a full-size render.
  grep -o '/_next/image?url=[^"'"'"' >]*' "$TMP/imgpage.html" \
    | sed 's/&amp;/\&/g' \
    | awk -F'url=' '
        {
          split($2, a, "&"); src = a[1]
          w = 0
          if (match($0, /[?&]w=[0-9]+/)) w = substr($0, RSTART + 3, RLENGTH - 3) + 0
          if (!(src in best) ) { order[++n] = src }
          if (!(src in best) || w > bestw[src]) { best[src] = $0; bestw[src] = w }
        }
        END { for (i = 1; i <= n; i++) print best[order[i]] }' \
    | head -n "$IMAGE_SAMPLES" > "$TMP/imgurls"

  n="$(wc -l < "$TMP/imgurls" | tr -d ' ')"
  if [ "$n" = "0" ]; then
    warn "no /_next/image URLs found on $IMAGE_PAGE — either the page changed or it rendered no images"
  else
    while read -r u; do
      [ -n "$u" ] || continue
      read -r code ctype <<< "$(curl -s -o "$TMP/img" -w '%{http_code} %{content_type}' \
        -H 'Accept: image/webp,image/*,*/*' --max-time 30 "$BASE$u")"
      size="$(wc -c < "$TMP/img" | tr -d ' ')"
      short="$(echo "$u" | sed 's/.*url=//; s/&.*//' | sed 's/%2F/\//g')"
      # Width is reported alongside the byte count so that if this ever does
      # fail, the first question — "was it a thumbnail?" — is already answered.
      wid="$(echo "$u" | sed -n 's/.*[?&]w=\([0-9]*\).*/\1/p')"
      if [ "$code" = "200" ] && [ "${ctype#image/}" != "$ctype" ] && [ "$size" -gt 1000 ]; then
        pass "image $short @w=${wid:-?} -> 200 $ctype ${size}B"
      else
        fail "image $short @w=${wid:-?} -> $code $ctype ${size}B (this is what the gallery 403 looked like)"
      fi
    done < "$TMP/imgurls"
  fi
fi

# -------------------------------------------------------- 7. Server Actions --
# Through nginx on purpose — this is the only check here that exercises the
# proxy headers. A config written with an unquoted heredoc put a literal
# backslash on the front of every proxied header value, so Next's Origin/Host
# comparison could never match and it rejected EVERY Server Action. The admin
# panel logged in, browsed, previewed, and silently saved nothing, for five
# days. Nothing about it was visible in a status code.
if [ "$CHECK_SERVER_ACTIONS" = "1" ] && [ -n "$PUBLIC_ORIGIN" ]; then
  head2 "Server Actions (through nginx — the admin's write path)"
  curl -sk -o /dev/null -X POST "$PUBLIC_ORIGIN/" \
    -H "Origin: $PUBLIC_ORIGIN" \
    -H "Next-Action: 00000000000000000000000000000000000000000a" \
    -H "Content-Type: text/plain;charset=UTF-8" \
    --max-time 20 --data '[]' || true
  sleep 3
  if journalctl -u "$SERVICE" --since "1 min ago" --no-pager 2>/dev/null \
      | grep -q 'Invalid Server Actions request'; then
    fail "'Invalid Server Actions request' — the proxy header mismatch is back; the admin panel cannot save"
  elif journalctl -u "$SERVICE" --since "1 min ago" --no-pager 2>/dev/null \
      | grep -q 'Failed to find Server Action'; then
    pass "the origin check passed (reached 'Failed to find Server Action', which is the expected reply to a fake action id)"
  else
    warn "neither expected log line appeared — could not prove the Server Action path either way"
  fi
fi

# ------------------------------------------------------------- 8. neighbours --
# The other tenants on this box. A deploy that took one of them down — by
# exhausting memory, most plausibly — has not succeeded, whatever this tenant's
# own pages say.
if [ -n "$SIBLING_SERVICES" ]; then
  head2 "Other tenants on this box"
  for pair in $SIBLING_SERVICES; do
    s="${pair%%:*}"; p="${pair##*:}"
    a="$(svc "$s" ActiveState)"; ss="$(svc "$s" SubState)"; nr="$(svc "$s" NRestarts)"
    bn="$(baseline_for "$s")"
    if [ "$a" = "active" ] && [ "$ss" = "running" ]; then
      pass "$s: active/running"
    else
      fail "$s: $a/$ss — this deploy disturbed another tenant"
    fi
    if [ -n "$bn" ]; then
      if [ "$nr" -le "$bn" ] 2>/dev/null; then
        pass "$s: NRestarts unchanged at $nr — it was not OOM-killed during the build"
      else
        fail "$s: NRestarts rose $bn -> $nr — it died and was restarted while this deploy ran"
      fi
    fi
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "http://127.0.0.1:$p/")"
    [ "$code" = "200" ] && pass "$s: serving 200 on port $p" || fail "$s: port $p -> $code"
  done
fi

# ------------------------------------------------------------------ summary --
head2 "Summary"
if [ "$FAILS" -eq 0 ] && [ "$WARNS" -eq 0 ]; then
  printf '  \033[32m%s\033[0m\n' "all checks passed"
elif [ "$FAILS" -eq 0 ]; then
  printf '  \033[32m%s\033[0m\n' "all checks passed ($WARNS warning(s))"
else
  printf '  \033[31m%s\033[0m\n' "$FAILS check(s) FAILED, $WARNS warning(s)"
fi

cat <<'MANUAL'

  What this script still cannot see (do these in a browser, logged in):
    - /admin renders and you can log in. A stale importMap only fails AFTER
      authentication, so an anonymous fetch of /admin proves nothing about it.
    - open a document with a Lexical rich-text field and SAVE it. The admin
      writes through Server Actions, not REST; a passing REST PATCH proves
      nothing about whether the panel can save.
    - scroll the gallery. Grey squares that fill in on scroll are loading="lazy"
      and are fine; check naturalWidth > 0 before chasing them.
MANUAL

[ "$FAILS" -eq 0 ]
