#!/usr/bin/env bash
#
# remote.sh — the half of the deploy that runs ON the box.
#
# It is never installed on the box. deploy.sh streams it over stdin
# (`ssh host 'bash -s -- ACTION=... KEY=VAL' < deploy/remote.sh`) so there is
# exactly one copy of it, in git, and nothing to drift. That is also why every
# value arrives as a KEY=VALUE argument rather than being interpolated into a
# command string — see deploy/README.md, "Why nothing is heredoc'd".
#
# Every action is idempotent and every destructive step is preceded by a
# snapshot. Nothing here touches ~/app/.env.local or any other tenant.

set -euo pipefail

# ---------------------------------------------------------------- arguments --
for arg in "$@"; do
  case "$arg" in
    *=*) export "${arg%%=*}=${arg#*=}" ;;
    *) echo "remote.sh: bad argument '$arg' (expected KEY=VALUE)" >&2; exit 2 ;;
  esac
done

: "${ACTION:?ACTION is required}"
: "${REMOTE_DIR:?REMOTE_DIR is required}"
: "${TARGET_NAME:?TARGET_NAME is required}"

SERVICE="${SERVICE:-}"
RELEASE="${RELEASE:-}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
BUILD_ARGS="${BUILD_ARGS:---webpack}"
BUILD_MEMORY_MAX="${BUILD_MEMORY_MAX:-1200M}"
BUILD_MEMORY_SWAP_MAX="${BUILD_MEMORY_SWAP_MAX:-2G}"
NODE_MAX_OLD_SPACE="${NODE_MAX_OLD_SPACE:-1024}"
SIBLING_SERVICES="${SIBLING_SERVICES:-}"
SYNC_FILES="${SYNC_FILES:-}"
GIT_DESCRIBE="${GIT_DESCRIBE:-unknown}"
# Modules that must load from the real app dir before we build against them.
# Cedarville adds `payload`; the brand site has no CMS, so the default is the
# two every tenant has. Space-separated bare package names.
REQUIRE_MODULES="${REQUIRE_MODULES:-sharp next}"

# State lives OUTSIDE the app directory on purpose. tsconfig.json includes
# "**/*.ts" and excludes only the top-level node_modules, so a release snapshot
# or a staged npm install kept inside ~/app would be pulled into the build's
# type-check as a second copy of every module. Sibling directory, same
# filesystem, so every mv below is a rename rather than a copy.
STATE_DIR="${REMOTE_DIR%/*}/.deploy-${TARGET_NAME}"
RELEASES_DIR="$STATE_DIR/releases"
LOCK_MARKER="$STATE_DIR/lock.sha"
# One line recording the last thing this script did to the box, so `status` can
# answer "what happened here last?" without guessing from timestamps.
LAST_MARKER="$STATE_DIR/last"

log() { printf '    %s\n' "$*"; }
die() { printf 'remote: %s\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------------- caging --
# Can we put the build in a memory-capped transient cgroup? Requires the user
# manager to have the memory controller delegated. If not, we still raise the
# build's oom_score_adj, which is the part that actually protects the other
# tenant: it makes the kernel choose the build as the OOM victim instead of
# picking the largest process on the box, which would be a live server.
cage_available() {
  systemd-run --user --scope -q --collect \
    -p MemoryMax="$BUILD_MEMORY_MAX" -p MemorySwapMax="$BUILD_MEMORY_SWAP_MAX" \
    -- /bin/true >/dev/null 2>&1
}

run_caged() {
  if cage_available; then
    log "cgroup: MemoryMax=$BUILD_MEMORY_MAX MemorySwapMax=$BUILD_MEMORY_SWAP_MAX, oom_score_adj=800, nice 10"
    systemd-run --user --scope -q --collect \
      --unit="deploy-${TARGET_NAME}-$$" \
      -p MemoryMax="$BUILD_MEMORY_MAX" \
      -p MemorySwapMax="$BUILD_MEMORY_SWAP_MAX" \
      -p CPUWeight=20 -p IOWeight=20 \
      -- choom -n 800 -- nice -n 10 "$@"
  else
    log "cgroup unavailable — falling back to oom_score_adj=800 + nice 10 only"
    choom -n 800 -- nice -n 10 "$@"
  fi
}

# --------------------------------------------------------------- primitives --
service_field() { systemctl show "$1" -p "$2" --value 2>/dev/null || echo "?"; }

latest_release() { ls -1 "$RELEASES_DIR" 2>/dev/null | sort | tail -1; }

# Restore a .next from a release snapshot WITHOUT losing the caches.
# The snapshot deliberately excludes .next/cache (505MB, of which 488MB is the
# webpack build cache and 16MB is the image optimizer's). Both are derived data
# and both are expensive to rebuild, so they stay with the live directory and
# are carried across the restore.
restore_next_from() {
  local src="$1"
  [ -d "$src" ] || die "no .next snapshot at $src"
  cd "$REMOTE_DIR"
  rm -rf .next.restoring
  mkdir -p .next.restoring
  rsync -a "$src/" .next.restoring/
  if [ -d .next/cache ]; then
    mv .next/cache .next.restoring/cache
  fi
  rm -rf .next.discarded
  [ -d .next ] && mv .next .next.discarded
  mv .next.restoring .next
  rm -rf .next.discarded
}

# =============================================================== actions =====
case "$ACTION" in

# ---------------------------------------------------------------------- info --
# Read-only. Everything `check` and `status` need, in one round trip.
info)
  echo "host=$(hostname)"
  echo "remote_dir=$REMOTE_DIR"
  echo "app_dir_exists=$([ -d "$REMOTE_DIR" ] && echo yes || echo no)"
  echo "env_local_exists=$([ -f "$REMOTE_DIR/.env.local" ] && echo yes || echo no)"
  echo "node_modules_exists=$([ -d "$REMOTE_DIR/node_modules" ] && echo yes || echo no)"
  echo "node_version=$(node -v 2>/dev/null || echo none)"
  echo "npm_version=$(npm -v 2>/dev/null || echo none)"
  echo "build_id=$(cat "$REMOTE_DIR/.next/BUILD_ID" 2>/dev/null || echo none)"
  echo "next_mtime=$(date -r "$REMOTE_DIR/.next/BUILD_ID" '+%Y-%m-%d %H:%M:%S %Z' 2>/dev/null || echo none)"
  echo "remote_lock_sha=$(cat "$LOCK_MARKER" 2>/dev/null || echo none)"
  echo "remote_lock_file_sha=$(sha256sum "$REMOTE_DIR/package-lock.json" 2>/dev/null | cut -d' ' -f1 || echo none)"
  echo "mem_available_mb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)"
  echo "mem_total_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
  echo "swap_free_mb=$(awk '/SwapFree/ {print int($2/1024)}' /proc/meminfo)"
  echo "disk_free_mb=$(df -Pm "$REMOTE_DIR" | awk 'NR==2 {print $4}')"
  echo "cage_available=$(cage_available && echo yes || echo no)"
  if [ -n "$SERVICE" ]; then
    echo "service=$SERVICE"
    echo "service_active=$(service_field "$SERVICE" ActiveState)"
    echo "service_substate=$(service_field "$SERVICE" SubState)"
    echo "service_nrestarts=$(service_field "$SERVICE" NRestarts)"
    echo "service_memory=$(service_field "$SERVICE" MemoryCurrent)"
  fi
  for pair in $SIBLING_SERVICES; do
    s="${pair%%:*}"
    echo "sibling_${s}_active=$(service_field "$s" ActiveState)"
    echo "sibling_${s}_substate=$(service_field "$s" SubState)"
    echo "sibling_${s}_nrestarts=$(service_field "$s" NRestarts)"
  done
  echo "releases=$(ls -1 "$RELEASES_DIR" 2>/dev/null | sort | tr '\n' ',' | sed 's/,$//')"
  echo "last=$(cat "$LAST_MARKER" 2>/dev/null || echo none)"
  ;;

# ------------------------------------------------------------------ snapshot --
# Called BEFORE anything is transferred. Captures enough to put the box back
# exactly as it was: the source tree, the build output, and the root config
# files. node_modules is added later, and only if the deps step runs.
snapshot)
  : "${RELEASE:?RELEASE is required}"
  rel="$RELEASES_DIR/$RELEASE"
  mkdir -p "$rel"
  cd "$REMOTE_DIR"

  [ -d src ] && rsync -a --delete src/ "$rel/src/"

  mkdir -p "$rel/files"
  for f in $SYNC_FILES; do
    [ -f "$f" ] && cp -a "$f" "$rel/files/$f"
  done

  # .next minus the caches — 19MB instead of 523MB. See restore_next_from().
  if [ -d .next ]; then
    rsync -a --exclude 'cache/' .next/ "$rel/next/"
  fi

  # NOTE on the wording. A snapshot is taken BEFORE anything is transferred, so
  # what it contains is the state being REPLACED, not the state being deployed.
  # Labelling it `git=<the incoming version>` would be actively misleading at
  # the moment you most need to read it — picking something to roll back to.
  {
    echo "release=$RELEASE"
    echo "created=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo "contains=the box as it was immediately before deploying $GIT_DESCRIBE"
    echo "replaced_by=$GIT_DESCRIBE"
    echo "build_id=$(cat .next/BUILD_ID 2>/dev/null || echo none)"
    echo "lock_sha=$(sha256sum package-lock.json 2>/dev/null | cut -d' ' -f1 || echo none)"
    echo "node_modules_snapshot=no"
  } > "$rel/manifest"

  du -sh "$rel" | awk '{print "    snapshot " $1 " at " $2}'
  ;;

# ---------------------------------------------------------------- deps-check --
# Is an `npm ci` required? Two independent signals, because each one alone has
# a hole:
#   - the lock file on the box differs from the one we are about to ship
#   - the marker written by the LAST SUCCESSFUL npm ci differs from the lock
#     (catches "package-lock.json was rsynced, then npm ci failed or was
#     skipped" — the state where the box looks up to date and the build dies on
#     a missing module)
deps-check)
  : "${LOCAL_LOCK_SHA:?LOCAL_LOCK_SHA is required}"
  cd "$REMOTE_DIR"
  remote_lock="$(sha256sum package-lock.json 2>/dev/null | cut -d' ' -f1 || echo none)"
  marker="$(cat "$LOCK_MARKER" 2>/dev/null || echo none)"
  reasons=""
  add() { reasons="${reasons:+$reasons,}$1"; }
  [ -d node_modules ] || add "node_modules-missing"
  [ "$remote_lock" = "$LOCAL_LOCK_SHA" ] || add "lock-file-differs"
  if [ "$marker" = "none" ]; then
    add "install-marker-missing"
  elif [ "$marker" != "$LOCAL_LOCK_SHA" ]; then
    add "install-marker-stale"
  fi
  if [ -n "$reasons" ]; then
    echo "deps_needed=yes"
    echo "deps_reasons=$reasons"
  else
    echo "deps_needed=no"
    echo "deps_reasons=none"
  fi
  ;;

# ---------------------------------------------------------------- adopt-deps --
# One-time bridge out of the manual era. The box's node_modules was installed by
# hand and there is no marker recording which lock file produced it, so the very
# first run of this script would otherwise insist on a full `npm ci` it does not
# need. This records the box's CURRENT lock file as installed — and refuses if
# that lock file is not the one you are about to deploy, because then the
# install really is out of date and npm ci really is required.
adopt-deps)
  : "${LOCAL_LOCK_SHA:?LOCAL_LOCK_SHA is required}"
  cd "$REMOTE_DIR"
  [ -d node_modules ] || die "no node_modules on the box — nothing to adopt, run a deploy"
  remote_lock="$(sha256sum package-lock.json | cut -d' ' -f1)"
  [ "$remote_lock" = "$LOCAL_LOCK_SHA" ] || die \
"the box's package-lock.json is NOT the one in your working tree.
    box:   $remote_lock
    local: $LOCAL_LOCK_SHA
    Adopting would assert an install that never happened. Run a normal deploy."
  mkdir -p "$STATE_DIR"
  echo "$LOCAL_LOCK_SHA" > "$LOCK_MARKER"
  log "recorded $LOCAL_LOCK_SHA as the installed lock file"
  log "the next deploy will skip npm ci until package-lock.json changes"
  ;;

# ---------------------------------------------------------------------- deps --
# `npm ci` deletes node_modules before repopulating it. Doing that in place,
# under a running `next start`, means several minutes during which any lazily
# required module is gone — the server is up and answering with 500s.
#
# So it installs into a staging directory outside the app dir and swaps, which
# narrows the window to two renames. The displaced tree goes into the release
# snapshot, so a rollback restores the dependencies too.
deps)
  : "${RELEASE:?RELEASE is required}"
  : "${LOCAL_LOCK_SHA:?LOCAL_LOCK_SHA is required}"
  rel="$RELEASES_DIR/$RELEASE"
  stage="$STATE_DIR/deps-staging"
  cd "$REMOTE_DIR"

  mkdir -p "$STATE_DIR"
  rm -rf "$stage"
  mkdir -p "$stage"
  cp package.json package-lock.json "$stage/"

  log "npm ci in $stage (the running server keeps its node_modules until the swap)"
  ( cd "$stage" && run_caged npm ci --no-audit --no-fund --loglevel=error )
  [ -d "$stage/node_modules" ] || die "npm ci produced no node_modules"

  mkdir -p "$rel"
  if [ -d node_modules ]; then
    mv node_modules "$rel/node_modules"
    sed -i 's/^node_modules_snapshot=.*/node_modules_snapshot=yes/' "$rel/manifest" 2>/dev/null || true
  fi
  mv "$stage/node_modules" node_modules
  rm -rf "$stage"

  # Native modules are the thing most likely to object to having been installed
  # somewhere else. Prove they load from the real app directory before we build
  # against them; if they do not, put the old tree straight back.
  require_js=""
  for m in $REQUIRE_MODULES; do
    # sharp is loaded for real (it is the native one that actually breaks);
    # everything else only has to resolve, which is what package.json proves.
    if [ "$m" = "sharp" ]; then
      require_js="${require_js}require('sharp');"
    else
      require_js="${require_js}require('$m/package.json');"
    fi
  done
  if ! node -e "$require_js" 2>/dev/null; then
    log "FAILED: the swapped node_modules cannot load $REQUIRE_MODULES — restoring the previous tree"
    rm -rf node_modules
    [ -d "$rel/node_modules" ] && mv "$rel/node_modules" node_modules
    die "dependency install rejected (see above); nothing was built, service untouched"
  fi

  echo "$LOCAL_LOCK_SHA" > "$LOCK_MARKER"
  log "dependencies installed and verified"
  ;;

# --------------------------------------------------------------------- build --
# In place, into .next, exactly as the manual deploy has always done — the dist
# directory name is baked into ~28 files of the build output, so building into
# .next-staging and renaming produces a server that looks for files that are no
# longer there. See deploy/README.md, "Why the build is not built elsewhere".
#
# What is new: the build is memory-caged, it is marked as the OOM killer's
# preferred victim, and if it fails the previous .next is put straight back.
build)
  : "${RELEASE:?RELEASE is required}"
  rel="$RELEASES_DIR/$RELEASE"
  cd "$REMOTE_DIR"

  avail=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
  log "memory available before build: ${avail}MB"

  export NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE}"
  export NODE_ENV=production

  set +e
  run_caged node node_modules/next/dist/bin/next build $BUILD_ARGS
  rc=$?
  set -e

  if [ "$rc" -ne 0 ]; then
    log "build FAILED (exit $rc) — restoring the previous .next from $RELEASE"
    if [ -d "$rel/next" ]; then
      restore_next_from "$rel/next"
      log "previous build output restored; the service was never restarted"
    else
      log "WARNING: no .next snapshot in $RELEASE — .next may be half-written"
    fi
    exit "$rc"
  fi

  echo "build_id=$(cat .next/BUILD_ID)"
  log "build OK"
  ;;

# ------------------------------------------------------------------- restart --
# `systemctl restart` logs the OUTGOING process as
#   cedarville.service: Failed with result 'exit-code'
# That is the old server taking SIGTERM and it is not a fault. Nothing here or
# in healthcheck.sh greps the journal for it; the service's own state fields are
# the truth. NRestarts counts AUTOMATIC (Restart=always) restarts only, so it
# does not move when we restart deliberately — which is exactly what makes it a
# usable crash-loop detector across a deploy.
restart)
  : "${SERVICE:?SERVICE is required}"
  before="$(service_field "$SERVICE" NRestarts)"
  log "NRestarts before restart: $before"
  sudo systemctl restart "$SERVICE"
  echo "nrestarts_before=$before"
  ;;

# ------------------------------------------------------------------- restore --
# Rollback. Puts back source, config, build output and — when the deploy that
# created this release also reinstalled dependencies — node_modules.
restore)
  rel_id="${RELEASE:-$(latest_release)}"
  [ -n "$rel_id" ] || die "no releases to restore from"
  rel="$RELEASES_DIR/$rel_id"
  [ -d "$rel" ] || die "no such release: $rel_id"
  cd "$REMOTE_DIR"

  log "restoring release $rel_id"
  sed 's/^/      /' "$rel/manifest"

  [ -d "$rel/src" ] && rsync -a --delete "$rel/src/" src/

  if [ -d "$rel/files" ]; then
    for f in $SYNC_FILES; do
      [ -f "$rel/files/$f" ] && cp -a "$rel/files/$f" "$f"
    done
  fi

  if [ -d "$rel/node_modules" ]; then
    log "restoring node_modules from the snapshot"
    rm -rf "$STATE_DIR/node_modules.discarded"
    [ -d node_modules ] && mv node_modules "$STATE_DIR/node_modules.discarded"
    cp -a "$rel/node_modules" node_modules
    rm -rf "$STATE_DIR/node_modules.discarded"
    sha256sum package-lock.json | cut -d' ' -f1 > "$LOCK_MARKER"
  fi

  restore_next_from "$rel/next"
  echo "rollback to $rel_id at $(date -u '+%Y-%m-%dT%H:%M:%SZ')" > "$LAST_MARKER"
  log "restored; restart the service to serve it"
  ;;

# ------------------------------------------------------------------ finalise --
finalise)
  : "${RELEASE:?RELEASE is required}"
  echo "deploy $GIT_DESCRIBE at $(date -u '+%Y-%m-%dT%H:%M:%SZ') (rollback point $RELEASE)" > "$LAST_MARKER"
  # Keep the newest KEEP_RELEASES snapshots. Each is ~19MB unless it carries a
  # node_modules (~1.2GB), so this matters.
  if [ -d "$RELEASES_DIR" ]; then
    ls -1 "$RELEASES_DIR" | sort | head -n -"$KEEP_RELEASES" | while read -r old; do
      [ -n "$old" ] || continue
      log "pruning old release $old"
      rm -rf "${RELEASES_DIR:?}/$old"
    done
  fi
  ;;

# ------------------------------------------------------------------ releases --
releases)
  [ -d "$RELEASES_DIR" ] || { echo "(none)"; exit 0; }
  echo "newest first — each snapshot is the box as it was BEFORE that deploy"
  for r in $(ls -1 "$RELEASES_DIR" | sort -r); do
    size=$(du -sh "$RELEASES_DIR/$r" 2>/dev/null | cut -f1)
    nm=$(sed -n 's/^node_modules_snapshot=//p' "$RELEASES_DIR/$r/manifest" 2>/dev/null)
    printf '%s  %6s  %s  (rolling back to this undoes: %s)\n' \
      "$r" "$size" \
      "$([ "$nm" = "yes" ] && echo "+node_modules" || echo "            ")" \
      "$(sed -n 's/^replaced_by=//p' "$RELEASES_DIR/$r/manifest" 2>/dev/null)"
  done
  ;;

*)
  die "unknown ACTION '$ACTION'"
  ;;
esac
