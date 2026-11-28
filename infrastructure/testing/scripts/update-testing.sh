#!/usr/bin/env bash
# =============================================================================
# update-testing.sh - deploy a new version of the source to the Astro Sushil
# TESTING stack, or apply changed env files.
#
# Usage:
#   sudo ./update-testing.sh --bundle /root/astro-sushil-testing-<sha>-<ts>.tar.gz [--backup-db]
#   sudo ./update-testing.sh --git-ref <commit>     # when $TESTING_ROOT/repo is a git checkout
#   sudo ./update-testing.sh --restart-only         # after editing env/api.env or proxy.env
#
# Options:
#   --bundle FILE.tar.gz   new source from a bundle (FILE.tar.gz.sha256 must match);
#                          the previous source is kept in deployment/repo-<timestamp>
#   --source-dir DIR       new source from an extracted bundle or git checkout
#   --git-ref REF          git fetch + checkout --detach REF in the repo checkout;
#                          refuses a dirty tree; previous commit is recorded in
#                          deployment/history.log
#   --restart-only         no new source, no build: re-render proxy access files,
#                          recreate api/worker/admin/website/proxy with current env
#   --backup-db            pg_dump the testing DB first (data/postgres-backup,
#                          with .sha256 and .meta)
#   --apply-migrations     run `prisma migrate deploy` when migrations are pending
#                          (without it the update stops before recreating services)
#   --skip-build           do not rebuild images
#   --no-verify            skip verify-testing.sh at the end
#   --yes                  answer yes to NON-destructive prompts only
#   -h, --help             show this help
#
# Env files under $TESTING_ROOT/env are never modified. Volumes are never
# removed. Only compose project astro_testing is touched.
# Exit codes: 0 ok, 1 error, 4 updated but verification reported failures.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

BUNDLE=""; SOURCE_DIR=""; GIT_REF=""; RESTART_ONLY=0; BACKUP_DB=0; APPLY_MIGRATIONS=0
SKIP_BUILD=0; NO_VERIFY=0; ASSUME_YES=0
HEALTH_TIMEOUT="${TESTING_HEALTH_TIMEOUT:-300}"
while (($#)); do
  case "$1" in
    --bundle) BUNDLE="${2:?}"; shift 2 ;;
    --source-dir) SOURCE_DIR="${2:?}"; shift 2 ;;
    --git-ref) GIT_REF="${2:?}"; shift 2 ;;
    --restart-only) RESTART_ONLY=1; shift ;;
    --backup-db) BACKUP_DB=1; shift ;;
    --apply-migrations) APPLY_MIGRATIONS=1; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --no-verify) NO_VERIFY=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    -h|--help) print_script_help "$0"; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done
export ASSUME_YES

n=0; [[ -n "$BUNDLE" ]] && n=$((n + 1)); [[ -n "$SOURCE_DIR" ]] && n=$((n + 1))
[[ -n "$GIT_REF" ]] && n=$((n + 1)); (( RESTART_ONLY == 1 )) && n=$((n + 1))
(( n == 1 )) || die "Choose exactly one of --bundle, --source-dir, --git-ref, --restart-only."

trap 'log_error "update-testing.sh failed at line $LINENO. Running containers keep their previous image unless they were already recreated. Env files and volumes are untouched."' ERR

repo_script() { printf '%s' "$REPO_DIR/infrastructure/testing/scripts/$1"; }

log_step "Checks"
assert_safe_testing_root
require_cmd sha256sum tar awk
require_docker
env_files_present || die "Env files missing in $TESTING_ENV_DIR (run install-testing.sh first)."
[[ -f "$TESTING_COMPOSE_FILE" ]] || die "No installed source at $REPO_DIR (run install-testing.sh first)."
validate_testing_env || die "Configuration invalid (see above). Nothing was changed."
PREV_VERSION="$(repo_version_string)"
log_info "current source: $PREV_VERSION"

# ---------------------------------------------------------------- backup ---
if (( BACKUP_DB == 1 )); then
  log_step "Database backup (testing DB only)"
  assert_testing_container testing-postgres
  ensure_dir "$TESTING_BACKUP_DIR" 700
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  dump="$TESTING_BACKUP_DIR/testing-pre-update-$ts.dump"
  ( umask 077
    testing_compose exec -T testing-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' >"$dump.partial" )
  [[ -s "$dump.partial" ]] || { rm -f "$dump.partial"; die "pg_dump produced no data"; }
  mv "$dump.partial" "$dump"
  ( cd "$TESTING_BACKUP_DIR" && sha256sum "$(basename "$dump")" >"$(basename "$dump").sha256" )
  printf 'created_at=%s\nsource=testing-postgres (project %s)\nreason=pre-update\nsource_version=%s\nsize_bytes=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TESTING_PROJECT" "$PREV_VERSION" "$(stat -c %s "$dump")" >"$dump.meta"
  chmod 600 "$dump" "$dump.sha256" "$dump.meta"
  log_ok "backup written: $dump"
fi

# ---------------------------------------------------------------- source ---
if (( RESTART_ONLY == 0 )); then
  log_step "Source"
  if [[ -n "$BUNDLE" ]]; then
    install_repo_from_source --bundle "$BUNDLE"
  elif [[ -n "$SOURCE_DIR" ]]; then
    install_repo_from_source --source-dir "$SOURCE_DIR"
  else
    require_cmd git
    git -C "$REPO_DIR" rev-parse --git-dir >/dev/null 2>&1 || die "$REPO_DIR is not a git checkout; use --bundle."
    dirty="$(git -C "$REPO_DIR" status --porcelain)"
    [[ -z "$dirty" ]] || { printf '%s\n' "$dirty" >&2; die "Repo checkout has local changes; refusing --git-ref (clean it by hand)."; }
    prev_commit="$(git -C "$REPO_DIR" rev-parse HEAD)"
    git -C "$REPO_DIR" fetch --tags --prune origin
    target="$(git -C "$REPO_DIR" rev-parse --verify "$GIT_REF^{commit}" 2>/dev/null || git -C "$REPO_DIR" rev-parse --verify "origin/$GIT_REF^{commit}")"
    git -C "$REPO_DIR" checkout --detach "$target"
    printf '%s git-ref previous=%s new=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$prev_commit" "$target" >>"$TESTING_DEPLOY_DIR/history.log"
    log_ok "checked out $target (previous $prev_commit; roll back with --git-ref $prev_commit)"
  fi
  [[ -f "$TESTING_COMPOSE_FILE" ]] || die "New source has no docker-compose.testing.yml"
  validate_testing_env || die "Configuration invalid for the new source."
fi

log_step "Proxy access files"
bash "$(repo_script render-proxy-access.sh)"

if (( RESTART_ONLY == 0 && SKIP_BUILD == 0 )); then
  log_step "Build images"
  testing_compose build
fi

# ------------------------------------------------------------ migrations ---
log_step "Migrations"
testing_compose up -d --no-build testing-postgres testing-redis
wait_service_healthy testing-postgres "$HEALTH_TIMEOUT" || die "testing-postgres not healthy"
migrate_status() { testing_compose --profile tools run --rm -T testing-migrate npx prisma migrate status --schema prisma/schema.prisma; }
if migrate_status; then
  log_ok "schema up to date"
elif (( APPLY_MIGRATIONS == 1 )); then
  (( BACKUP_DB == 1 )) || log_warn "applying migrations without --backup-db"
  testing_compose --profile tools run --rm -T testing-migrate
  migrate_status || die "migrations still pending after deploy"
  log_ok "migrations applied"
else
  die "Migrations are pending. Services were NOT recreated. Re-run with --apply-migrations (and --backup-db)."
fi

# -------------------------------------------------------------- recreate ---
log_step "Recreate services"
recreate=()
(( RESTART_ONLY == 1 )) && recreate=(--force-recreate)
testing_compose up -d --no-build "${recreate[@]}" testing-api testing-worker
wait_service_healthy testing-api "$HEALTH_TIMEOUT" || die "testing-api not healthy: testing_compose logs --tail 100 testing-api"
wait_service_healthy testing-worker "$HEALTH_TIMEOUT" || die "testing-worker not healthy"
testing_compose up -d --no-build "${recreate[@]}" testing-admin testing-website
wait_service_healthy testing-admin "$HEALTH_TIMEOUT" || die "testing-admin not healthy"
wait_service_healthy testing-website "$HEALTH_TIMEOUT" || die "testing-website not healthy"
# The proxy config is a bind mount: always recreate so testing.conf changes apply.
testing_compose up -d --no-build --force-recreate testing-proxy
wait_service_healthy testing-proxy "$HEALTH_TIMEOUT" || die "testing-proxy not healthy"

write_install_state "$( (( RESTART_ONLY == 1 )) && echo restart || echo update )"
trap - ERR

if (( NO_VERIFY == 0 )); then
  log_step "Verify"
  rc=0; bash "$(repo_script verify-testing.sh)" --no-public || rc=$?
  if (( rc == 1 )); then log_warn "verification reported failures"; exit 4; fi
fi
log_ok "update complete: $(repo_version_string) (previous: $PREV_VERSION)"
