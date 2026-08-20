#!/usr/bin/env bash
#
# deploy.sh — deploy one J&J CMS tenant to its Lightsail box.
#
#   ./deploy/deploy.sh cedarville check      # what would change, and is the box well?
#   ./deploy/deploy.sh cedarville deploy     # ship it
#   ./deploy/deploy.sh cedarville health     # prove the running site works
#   ./deploy/deploy.sh cedarville status     # what is deployed, what can be rolled back to
#   ./deploy/deploy.sh cedarville rollback   # put the previous release back
#
# Nothing about this script is Cedarville-specific. The property lives in
# deploy/targets/<name>.env; tenants #2..6 get a copy of these three scripts and
# their own target file. See deploy/README.md.
#
# Design notes are in deploy/README.md rather than here. The two that change how
# you read the code:
#
#   * The build runs ON the box. Not because that is easy, but because these
#     pages are prerendered from the production database at build time — see
#     "Why the build is not built elsewhere".
#   * remote.sh and healthcheck.sh are streamed over stdin rather than being
#     installed on the box, so there is one copy of each and it is the one in
#     git.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$REPO_ROOT/deploy"

# ------------------------------------------------------------------- output --
if [ -t 1 ]; then
  B=$'\033[1m'; R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; D=$'\033[2m'; Z=$'\033[0m'
else
  B=""; R=""; G=""; Y=""; D=""; Z=""
fi
step() { printf '\n%s==> %s%s\n' "$B" "$*" "$Z"; }
info() { printf '    %s\n' "$*"; }
note() { printf '    %s%s%s\n' "$D" "$*" "$Z"; }
ok()   { printf '    %s%s%s\n' "$G" "$*" "$Z"; }
warn() { printf '    %s%s%s\n' "$Y" "$*" "$Z"; }
die()  { printf '\n%sdeploy: %s%s\n' "$R" "$*" "$Z" >&2; exit 1; }

usage() {
  cat <<'USAGE'
deploy.sh — deploy one J&J CMS tenant to its Lightsail box.

  ./deploy/deploy.sh <target> <command> [options]

Commands:
  check        what would change, and is the box well enough to take it?
               (rsync --dry-run --itemize-changes; read-only, ~5s)
  deploy       snapshot, sync, npm ci if needed, build, restart, health check
  health       prove the RUNNING site works (read-only, ~40s)
  status       what is deployed, and what can be rolled back to
  rollback     restore a release snapshot and restart
  releases     list the snapshots on the box
  adopt-deps   one-time: record the box's existing node_modules as current

Options:
  --yes, -y            do not prompt for confirmation
  --auto-rollback      roll back automatically if the post-deploy health check fails
  --skip-deps          do not run npm ci even if it is required (dangerous)
  --release <id>       rollback: which snapshot to restore (default: the newest)
  --no-server-actions  skip the Server Actions probe in the health check

Targets live in deploy/targets/<name>.env. Full documentation, and the
reasoning behind the design, is in deploy/README.md.
USAGE
  exit "${1:-0}"
}

# ------------------------------------------------------------------ arguments --
[ $# -ge 1 ] || usage 1
TARGET="$1"; shift
case "$TARGET" in -h|--help|help) usage 0 ;; esac
COMMAND="${1:-check}"; [ $# -ge 1 ] && shift || true

ASSUME_YES=0
AUTO_ROLLBACK=0
SKIP_DEPS=0
RELEASE_ARG=""
CHECK_SERVER_ACTIONS=1

while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) ASSUME_YES=1 ;;
    --auto-rollback) AUTO_ROLLBACK=1 ;;
    --skip-deps) SKIP_DEPS=1 ;;
    --no-server-actions) CHECK_SERVER_ACTIONS=0 ;;
    --release) RELEASE_ARG="${2:?--release needs a value}"; shift ;;
    -h|--help) usage 0 ;;
    *) die "unknown option '$1'" ;;
  esac
  shift
done

# --------------------------------------------------------------- target file --
TARGET_FILE="$SCRIPT_DIR/targets/$TARGET.env"
[ -f "$TARGET_FILE" ] || die "no target file at $TARGET_FILE
    available: $(ls -1 "$SCRIPT_DIR/targets" 2>/dev/null | sed 's/\.env$//' | grep -v TEMPLATE | tr '\n' ' ')"

# shellcheck disable=SC1090
. "$TARGET_FILE"

: "${TARGET_NAME:?target file must set TARGET_NAME}"
: "${EXPECT_PACKAGE_NAME:?target file must set EXPECT_PACKAGE_NAME}"
: "${SSH_HOST:?}" "${SSH_KEY:?}" "${REMOTE_DIR:?}" "${SERVICE:?}" "${PORT:?}"
SSH_KEY="${SSH_KEY/#\~/$HOME}"
REMOTE_DIR="${REMOTE_DIR%/}"

SIBLING_SERVICES="${SIBLING_SERVICES:-}"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
MIN_AVAILABLE_MB="${MIN_AVAILABLE_MB:-600}"
MIN_FREE_DISK_MB="${MIN_FREE_DISK_MB:-3000}"

# ==============================================================================
#  GUARD: the repo must be the one this target expects.
#
#  Six properties will eventually share these scripts and they all sit on the
#  same box under sibling directories. A target file copied into the wrong repo
#  would rsync one property's source over another's app directory and rebuild
#  it, and every individual step of that would succeed. This is the only thing
#  standing between that mistake and production.
# ==============================================================================
LOCAL_PKG_NAME="$(node -p "require('$REPO_ROOT/package.json').name" 2>/dev/null || echo "")"
[ -n "$LOCAL_PKG_NAME" ] || die "could not read package.json name from $REPO_ROOT"
[ "$LOCAL_PKG_NAME" = "$EXPECT_PACKAGE_NAME" ] || die \
"target '$TARGET' expects the repo whose package.json name is '$EXPECT_PACKAGE_NAME',
    but this repo is '$LOCAL_PKG_NAME' ($REPO_ROOT).
    Refusing: this is how one tenant's source ends up deployed over another's."

# ---------------------------------------------------------------------- ssh --
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=15)

ssh_stream() {
  # Run one of our scripts on the box by streaming it over stdin. Arguments are
  # passed as KEY=VALUE and quoted with %q, which is valid bash quoting on both
  # ends — so no value is ever interpolated into a command string.
  #
  # (This is the same class of bug as the nginx heredoc that put a literal
  # backslash in front of every proxied header value and silently broke every
  # Server Action for five days. Values go through argv, not through text.)
  local script="$1"; shift
  local quoted=""
  local a
  for a in "$@"; do quoted+=" $(printf '%q' "$a")"; done
  ssh "${SSH_OPTS[@]}" "$SSH_HOST" "bash -s --$quoted" < "$script"
}

remote() { ssh_stream "$SCRIPT_DIR/remote.sh" "REMOTE_DIR=$REMOTE_DIR" "TARGET_NAME=$TARGET_NAME" "REQUIRE_MODULES=${REQUIRE_MODULES:-sharp next}" "$@"; }

# ============================================================================
#  GUARD: rsync --delete may only ever point at a SUBDIRECTORY of REMOTE_DIR.
#
#  Aimed at ~/app itself it deletes .env.local (the only copy of the database
#  URI, the Payload secret and the S3 keys) and node_modules. The manual deploy
#  this replaces carried that risk as a comment; here it is three assertions and
#  a set of belt-and-braces excludes, and it is unreachable from the target file
#  because SYNC_DIRS entries are validated against the same rules.
# ============================================================================
validate_subdir() {
  # Runs in the caller's shell, NOT in a command substitution, so `die` here
  # actually stops the deploy rather than just ending a subshell.
  case "$1" in
    ""|"."|".."|/*|*..*|*/) die "invalid SYNC_DIRS entry '$1': must be a plain relative subdirectory, with no leading or trailing slash and no '..'" ;;
  esac
}

sync_dir() {
  local sub="$1"; shift
  validate_subdir "$sub"
  local dest="$REMOTE_DIR/$sub"

  # Belt and braces. validate_subdir above already makes these unreachable;
  # they stay because the cost of being wrong here is .env.local and
  # node_modules, and the cost of keeping them is three lines.
  [ "$dest" != "$REMOTE_DIR" ]  || die "refusing --delete against the app root ($dest)"
  [ "$dest" != "$REMOTE_DIR/" ] || die "refusing --delete against the app root ($dest)"
  case "$dest" in
    "$REMOTE_DIR"/?*) : ;;
    *) die "refusing --delete: '$dest' is not strictly inside $REMOTE_DIR" ;;
  esac
  [ -d "$REPO_ROOT/$sub" ] || die "local directory '$sub' does not exist — refusing to mirror a missing tree with --delete"

  rsync -az --delete --itemize-changes \
    --exclude='.env' --exclude='.env.*' \
    --exclude='node_modules/' --exclude='.next/' --exclude='.DS_Store' \
    -e "ssh ${SSH_OPTS[*]}" \
    "$@" "$REPO_ROOT/$sub/" "$SSH_HOST:$dest/"
}

sync_files() {
  # Individual files, listed explicitly, NEVER with --delete.
  local f missing=""
  for f in $SYNC_FILES; do [ -f "$REPO_ROOT/$f" ] || missing="$missing $f"; done
  [ -z "$missing" ] || die "SYNC_FILES references files that do not exist:$missing"
  # shellcheck disable=SC2086
  ( cd "$REPO_ROOT" && rsync -az --itemize-changes \
      -e "ssh ${SSH_OPTS[*]}" "$@" $SYNC_FILES "$SSH_HOST:$REMOTE_DIR/" )
}

# ------------------------------------------------------------------ helpers --
sha256_local() { shasum -a 256 "$1" | cut -d' ' -f1; }

git_describe() {
  ( cd "$REPO_ROOT"
    local sha branch dirty
    sha="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
    branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
    dirty=""
    git diff --quiet 2>/dev/null || dirty="+dirty"
    printf '%s@%s%s' "$branch" "$sha" "$dirty" )
}

# The box's `info` output is a flat KEY=VALUE block. Kept as text and looked up
# with a function rather than an associative array, because macOS still ships
# bash 3.2 and `declare -A` is a bash 4 feature — this script has to run from
# the laptop it is run from.
INFO_RAW=""
load_info() {
  INFO_RAW="$(remote "ACTION=info" "SERVICE=$SERVICE" "SIBLING_SERVICES=$SIBLING_SERVICES")"
}
inf() {
  local v
  v="$(printf '%s\n' "$INFO_RAW" | sed -n "s/^$1=//p" | head -1)"
  if [ -n "$v" ]; then printf '%s' "$v"; else printf '%s' "${2-?}"; fi
}

baseline_restarts() {
  local out pair s
  out="$SERVICE=$(inf service_nrestarts 0)"
  for pair in $SIBLING_SERVICES; do
    s="${pair%%:*}"
    out="$out $s=$(inf "sibling_${s}_nrestarts" 0)"
  done
  printf '%s' "$out"
}

run_health() {
  local baseline="$1"
  ssh_stream "$SCRIPT_DIR/healthcheck.sh" \
    "PORT=$PORT" \
    "SERVICE=$SERVICE" \
    "ROUTES=${HEALTH_ROUTES:-/}" \
    "ASSETS=${HEALTH_ASSETS:-}" \
    "MIN_HTML_BYTES=${HEALTH_MIN_HTML_BYTES:-2000}" \
    "HTML_REQUIRE=${HEALTH_HTML_REQUIRE:-main h1 footer}" \
    "IMAGE_PAGE=${HEALTH_IMAGE_PAGE:-}" \
    "IMAGE_SAMPLES=${HEALTH_IMAGE_SAMPLES:-5}" \
    "SIBLING_SERVICES=$SIBLING_SERVICES" \
    "BASELINE_RESTARTS=$baseline" \
    "PUBLIC_ORIGIN=$PUBLIC_ORIGIN" \
    "CHECK_SERVER_ACTIONS=$CHECK_SERVER_ACTIONS" \
    "ADMIN_PATH=${HEALTH_ADMIN_PATH:-}" \
    "ADMIN_MARKER=${HEALTH_ADMIN_MARKER:-}"
}

print_box_state() {
  local pair s
  info "host          $(inf host)   node $(inf node_version) / npm $(inf npm_version)"
  info "app dir       $REMOTE_DIR  (.env.local: $(inf env_local_exists), node_modules: $(inf node_modules_exists))"
  info "build         BUILD_ID $(inf build_id), built $(inf next_mtime)"
  info "service       $SERVICE $(inf service_active)/$(inf service_substate)  NRestarts=$(inf service_nrestarts)"
  for pair in $SIBLING_SERVICES; do
    s="${pair%%:*}"
    info "other tenant  $s $(inf "sibling_${s}_active")/$(inf "sibling_${s}_substate")  NRestarts=$(inf "sibling_${s}_nrestarts")"
  done
  info "memory        $(inf mem_available_mb)MB available of $(inf mem_total_mb)MB, $(inf swap_free_mb)MB swap free"
  info "disk          $(inf disk_free_mb)MB free"
  info "build cage    $(inf cage_available) (memory-capped cgroup for the build)"
  info "releases      $(inf releases none)"
}

# ============================================================== the drift report
#
#  rsync --itemize-changes --dry-run is the only honest answer to "how far
#  behind is the box?". It takes a second and it cannot rot, which a
#  hand-maintained commit marker demonstrably can — one lived in HANDOFF.md,
#  went stale twice, and understated the gap both times.
#
count_lines() { printf '%s\n' "$1" | awk 'NF' | wc -l | tr -d ' '; }
show_lines() { printf '%s\n' "$1" | awk 'NF {print "      " $0}' | head -40; }

plan_changes() {
  local total=0 d out n
  for d in $SYNC_DIRS; do
    out="$(sync_dir "$d" --dry-run --out-format='%i %n')"
    n="$(count_lines "$out")"
    if [ "$n" = "0" ]; then
      note "$d/ — in step"
    else
      warn "$d/ — $n change(s):"
      show_lines "$out"
      [ "$n" -gt 40 ] && note "      ... and $((n - 40)) more" || true
    fi
    total=$((total + n))
  done

  out="$(sync_files --dry-run --out-format='%i %n')"
  n="$(count_lines "$out")"
  if [ "$n" = "0" ]; then
    note "root config files — in step"
  else
    warn "root config files — $n change(s):"
    show_lines "$out"
  fi
  total=$((total + n))
  PLAN_TOTAL="$total"
}

check_deps() {
  local out
  out="$(remote "ACTION=deps-check" "LOCAL_LOCK_SHA=$LOCAL_LOCK_SHA")"
  DEPS_NEEDED="$(echo "$out" | sed -n 's/^deps_needed=//p')"
  DEPS_REASONS="$(echo "$out" | sed -n 's/^deps_reasons=//p')"
}

preflight_resources() {
  local avail disk pair s
  avail="$(inf mem_available_mb 0)"; disk="$(inf disk_free_mb 0)"
  [ "$(inf app_dir_exists no)" = "yes" ] || die "$REMOTE_DIR does not exist on the box"
  [ "$(inf env_local_exists no)" = "yes" ] || die "$REMOTE_DIR/.env.local is missing — the app would build and start without its secrets (here: RESEND_API_KEY and the lead addresses), and the contact form would fail closed at runtime"
  [ "$avail" -ge "$MIN_AVAILABLE_MB" ] || die "only ${avail}MB memory available (need ${MIN_AVAILABLE_MB}MB). Another tenant is serving traffic on this box; retry when it is quieter."
  [ "$disk" -ge "$MIN_FREE_DISK_MB" ] || die "only ${disk}MB disk free (need ${MIN_FREE_DISK_MB}MB)"
  [ "$(inf cage_available no)" = "yes" ] || warn "the build cannot be put in a memory-capped cgroup on this box; it will still be marked as the OOM killer's preferred victim, but the cap is the stronger protection"

  # A tenant that is already down is not this deploy's fault, but finding out
  # afterwards makes it look like it was.
  for pair in $SIBLING_SERVICES; do
    s="${pair%%:*}"
    [ "$(inf "sibling_${s}_substate" '?')" = "running" ] \
      || warn "$s is not running BEFORE this deploy starts — note that, so the post-deploy check does not get blamed for it"
  done
}

confirm() {
  [ "$ASSUME_YES" = 1 ] && return 0
  printf '\n    %s%s%s ' "$B" "$1 [y/N]" "$Z"
  read -r reply
  case "$reply" in y|Y|yes|YES) return 0 ;; *) die "aborted" ;; esac
}

LOCAL_LOCK_SHA="$(sha256_local "$REPO_ROOT/package-lock.json")"
GIT_DESCRIBE="$(git_describe)"

# ================================================================= commands ===
case "$COMMAND" in

check)
  step "Target: $TARGET  ->  $SSH_HOST:$REMOTE_DIR  (service $SERVICE, port $PORT)"
  info "local repo    $REPO_ROOT  ($GIT_DESCRIBE)"

  step "Box"
  load_info
  print_box_state

  step "Drift — what a deploy would change (rsync --dry-run --itemize-changes)"
  plan_changes

  step "Dependencies"
  check_deps
  if [ "$DEPS_NEEDED" = "yes" ]; then
    warn "npm ci REQUIRED — $DEPS_REASONS"
    if [ "$DEPS_REASONS" = "install-marker-missing" ]; then
      note "the box's package-lock.json already matches yours; the only thing missing is"
      note "the record of which lock file produced its node_modules. If you are certain"
      note "the last manual 'npm ci' on the box used this lock file, skip the reinstall:"
      note "    ./deploy/deploy.sh $TARGET adopt-deps"
    fi
  else
    note "npm ci not required (lock file and install marker both match)"
  fi

  step "Verdict"
  if [ "$PLAN_TOTAL" = "0" ] && [ "$DEPS_NEEDED" = "no" ]; then
    ok "the box is in step with this working tree."
    note "note that this compares FILES, not the running build: a change that has"
    note "been rsynced but not built is invisible here. 'deploy' is idempotent and"
    note "cheap to re-run if you are unsure."
  else
    warn "$PLAN_TOTAL file(s) would change; npm ci needed: $DEPS_NEEDED"
    info "run: ./deploy/deploy.sh $TARGET deploy"
  fi
  ;;

status)
  step "Target: $TARGET"
  load_info
  print_box_state
  info "last action   $(inf last none)"
  step "Releases available to roll back to"
  remote "ACTION=releases" "KEEP_RELEASES=$KEEP_RELEASES" | sed 's/^/    /'
  ;;

health)
  step "Health check: $TARGET ($SERVICE on port $PORT)"
  load_info
  run_health "$(baseline_restarts)"
  ;;

deploy)
  RELEASE="$(date -u '+%Y%m%d-%H%M%S')"

  step "Target: $TARGET  ->  $SSH_HOST:$REMOTE_DIR  (service $SERVICE, port $PORT)"
  info "local repo    $REPO_ROOT  ($GIT_DESCRIBE)"
  info "release id    $RELEASE"
  case "$GIT_DESCRIBE" in
    *+dirty) warn "working tree has uncommitted changes — they WILL be deployed" ;;
  esac

  step "Preflight"
  load_info
  print_box_state
  preflight_resources
  ok "preflight passed"

  step "Drift — what will change"
  plan_changes
  check_deps
  if [ "$DEPS_NEEDED" = "yes" ] && [ "$SKIP_DEPS" = "1" ]; then
    warn "npm ci is required ($DEPS_REASONS) but --skip-deps was passed."
    warn "The build will very likely die on a missing module. Continuing only because you asked."
    DEPS_NEEDED=no
  elif [ "$DEPS_NEEDED" = "yes" ]; then
    warn "npm ci WILL run — $DEPS_REASONS"
  else
    note "npm ci not required"
  fi

  if [ "$PLAN_TOTAL" = "0" ] && [ "$DEPS_NEEDED" = "no" ]; then
    note "no file changes and no dependency changes — this will be a rebuild and restart only"
  fi

  BASELINE="$(baseline_restarts)"
  confirm "Deploy $GIT_DESCRIBE to $TARGET?"

  step "1/6  Snapshot (rollback point $RELEASE)"
  remote "ACTION=snapshot" "RELEASE=$RELEASE" "SYNC_FILES=$SYNC_FILES" "GIT_DESCRIBE=$GIT_DESCRIBE"

  step "2/6  Sync source"
  for d in $SYNC_DIRS; do
    info "$d/"
    sync_dir "$d" --out-format='      %i %n'
  done
  info "root config files"
  sync_files --out-format='      %i %n'

  if [ "$DEPS_NEEDED" = "yes" ]; then
    step "3/6  Dependencies (npm ci, staged then swapped)"
    remote "ACTION=deps" "RELEASE=$RELEASE" "LOCAL_LOCK_SHA=$LOCAL_LOCK_SHA" \
      "BUILD_MEMORY_MAX=${BUILD_MEMORY_MAX:-1200M}" \
      "BUILD_MEMORY_SWAP_MAX=${BUILD_MEMORY_SWAP_MAX:-2G}"
  else
    step "3/6  Dependencies — skipped (already current)"
  fi

  step "4/6  Build on the box (~3 min, memory-capped)"
  if ! remote "ACTION=build" "RELEASE=$RELEASE" \
        "BUILD_ARGS=${BUILD_ARGS:---webpack}" \
        "BUILD_MEMORY_MAX=${BUILD_MEMORY_MAX:-1200M}" \
        "BUILD_MEMORY_SWAP_MAX=${BUILD_MEMORY_SWAP_MAX:-2G}" \
        "NODE_MAX_OLD_SPACE=${NODE_MAX_OLD_SPACE:-1024}"; then
    die "the build failed. The previous .next has been restored and the service was NOT restarted,
    so the site is still serving what it served before. Fix the build and re-run."
  fi

  step "5/6  Restart $SERVICE"
  remote "ACTION=restart" "SERVICE=$SERVICE"

  step "6/6  Health check"
  if run_health "$BASELINE"; then
    remote "ACTION=finalise" "RELEASE=$RELEASE" "KEEP_RELEASES=$KEEP_RELEASES" "GIT_DESCRIBE=$GIT_DESCRIBE"
    step "Done"
    ok "$GIT_DESCRIBE is live on $TARGET (release $RELEASE)"
    # `|| true` matters: this is the last command of the branch, and under
    # `set -e` a false test here would exit 1 after a completely successful
    # deploy.
    [ -n "$PUBLIC_ORIGIN" ] && info "$PUBLIC_ORIGIN" || true
  else
    remote "ACTION=finalise" "RELEASE=$RELEASE" "KEEP_RELEASES=$KEEP_RELEASES" "GIT_DESCRIBE=$GIT_DESCRIBE" >/dev/null
    if [ "$AUTO_ROLLBACK" = 1 ]; then
      warn "health check failed — rolling back automatically"
      exec "$0" "$TARGET" rollback --release "$RELEASE" --yes
    fi
    die "the health check FAILED. The new build is live and serving.
    Roll back with:
        ./deploy/deploy.sh $TARGET rollback --release $RELEASE
    Or investigate first:
        ssh -i $SSH_KEY $SSH_HOST 'journalctl -u $SERVICE -n 100 --no-pager'"
  fi
  ;;

rollback)
  step "Rollback: $TARGET"
  load_info
  info "releases      $(inf releases none)"
  [ "$(inf releases '')" != "" ] || die "there are no release snapshots on the box to roll back to.
    Snapshots are created by 'deploy'; the first deploy through this script is
    therefore the one that creates the first rollback point."

  remote "ACTION=releases" | sed 's/^/    /'
  BASELINE="$(baseline_restarts)"

  if [ -n "$RELEASE_ARG" ]; then
    confirm "Restore release $RELEASE_ARG and restart $SERVICE?"
  else
    confirm "Restore the NEWEST release snapshot and restart $SERVICE?"
  fi

  step "1/3  Restore"
  remote "ACTION=restore" ${RELEASE_ARG:+"RELEASE=$RELEASE_ARG"} "SYNC_FILES=$SYNC_FILES"

  step "2/3  Restart $SERVICE"
  remote "ACTION=restart" "SERVICE=$SERVICE"

  step "3/3  Health check"
  if run_health "$BASELINE"; then
    step "Done"
    ok "rolled back."
    warn "the box is now BEHIND your working tree. Run 'check' to see by how much."
  else
    die "the rollback restored, but the health check still fails. This is not a bad
    deploy — look at the box itself:
        ssh -i $SSH_KEY $SSH_HOST 'journalctl -u $SERVICE -n 100 --no-pager'"
  fi
  ;;

releases)
  remote "ACTION=releases" | sed 's/^/    /'
  ;;

adopt-deps)
  step "Adopt the box's existing node_modules as current"
  note "one-time bridge out of the manual deploy era; see deploy/README.md"
  remote "ACTION=adopt-deps" "LOCAL_LOCK_SHA=$LOCAL_LOCK_SHA"
  ;;

*)
  die "unknown command '$COMMAND' (expected: check, deploy, health, status, rollback, releases, adopt-deps)"
  ;;
esac
