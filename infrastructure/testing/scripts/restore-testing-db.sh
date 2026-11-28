#!/usr/bin/env bash
# =============================================================================
# restore-testing-db.sh - replace the TESTING database with a pg_dump archive.
# Runs on the VPS. Only touches compose project astro_testing.
#
# Usage:
#   restore-testing-db.sh --backup <file.dump> [options]
#
#   --backup <file>      archive under $TESTING_ROOT/data/postgres-backup
#                        (mounted read-only at /backups in testing-postgres),
#                        with <file>.sha256 next to it.
#   --yes-i-understand-this-replaces-the-testing-database
#                        skip the typed confirmation (non-interactive use).
#   --apply-migrations   after the restore run `prisma migrate deploy`
#                        (default: only `prisma migrate status` is shown).
#   --restart-services   start testing-api and testing-worker again at the end
#                        (testing-redis is restarted first to drop stale cache).
#   --skip-verify        do not run verify-database.sh at the end.
#   --keep-active-work   do NOT park in-flight work (see below). Default: park it.
#   -h, --help
#
# Steps: checksum -> destination identity -> archive check (version,
# extensions) -> confirmation -> stop testing-api/testing-worker -> drop and
# recreate the testing database -> pg_restore (single transaction) -> ANALYZE ->
# park in-flight work (sql/park-active-work.sql: PENDING/SENDING outbound
# messages -> FAILED TESTING_RESTORE_SUPPRESSED; unfinished reports -> FAILED
# TESTING_RESTORE_PARKED, claims cleared; one transaction, api/worker still
# stopped; invoices and invoice_counters untouched) -> prisma migrate status ->
# verify-database.sh. Never seeds.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/lib/common.sh" ]]; then
  # shellcheck source=lib/common.sh
  source "$SCRIPT_DIR/lib/common.sh"
fi
# Fallbacks so the script still works if the shared library changes.
TESTING_ROOT="${TESTING_ROOT:-/opt/astro-sushil/testing}"
TESTING_PROJECT="${TESTING_PROJECT:-astro_testing}"
TESTING_BACKUP_DIR="${TESTING_BACKUP_DIR:-$TESTING_ROOT/data/postgres-backup}"
type -t log_info >/dev/null || log_info() { printf '[info]  %s\n' "$*" >&2; }
type -t log_ok >/dev/null || log_ok() { printf '[ok]    %s\n' "$*" >&2; }
type -t log_warn >/dev/null || log_warn() { printf '[warn]  %s\n' "$*" >&2; }
type -t log_error >/dev/null || log_error() { printf '[error] %s\n' "$*" >&2; }
type -t log_step >/dev/null || log_step() { printf '\n==> %s\n' "$*" >&2; }
type -t die >/dev/null || die() { log_error "$*"; exit 1; }
type -t testing_compose >/dev/null || testing_compose() {
  TESTING_ROOT="$TESTING_ROOT" docker compose --project-name "$TESTING_PROJECT" \
    --env-file "$TESTING_ROOT/env/build.env" --env-file "$TESTING_ROOT/env/proxy.env" \
    -f "$TESTING_ROOT/repo/docker-compose.testing.yml" "$@"
}
type -t confirm_phrase >/dev/null || confirm_phrase() {
  local reply=""
  { : </dev/tty; } 2>/dev/null || { log_error "No terminal available to confirm."; return 1; }
  printf '\nType exactly the following to continue:\n  %s\n> ' "$1" >/dev/tty
  IFS= read -r reply </dev/tty || return 1
  [[ "$reply" == "$1" ]]
}
type -t env_file_get >/dev/null || env_file_get() {
  [[ -f "$1" ]] || return 1
  sed -n -E "s/^[[:space:]]*(export[[:space:]]+)?$2=[\"']?([^\"']*)[\"']?[[:space:]]*$/\\2/p" "$1" | tail -n 1
}
type -t sha256_verify >/dev/null || sha256_verify() {
  local expected actual
  [[ -f "$1" && -f "$1.sha256" ]] || return 1
  expected="$(awk 'NF { print $1; exit }' "$1.sha256")"; actual="$(sha256sum "$1" | awk '{print $1}')"
  [[ "$expected" =~ ^[0-9a-f]{64}$ && "$expected" == "$actual" ]]
}
type -t testing_container_id >/dev/null || testing_container_id() {
  docker ps -q --filter "label=com.docker.compose.project=$TESTING_PROJECT" \
    --filter "label=com.docker.compose.service=$1" | head -n 1
}
# The same command as testing_compose, for messages the operator copies into a shell.
TC_HINT="TESTING_ROOT=$TESTING_ROOT docker compose --project-name $TESTING_PROJECT --env-file $TESTING_ROOT/env/build.env --env-file $TESTING_ROOT/env/proxy.env -f $TESTING_ROOT/repo/docker-compose.testing.yml"
usage() { awk 'NR == 1 { next } /^# =====/ { n++; if (n == 2) exit; next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; }

BACKUP="" ASSUME=0 APPLY_MIGRATIONS=0 RESTART=0 SKIP_VERIFY=0 KEEP_ACTIVE=0
while (($#)); do
  case "$1" in
    --backup) BACKUP="${2:?--backup needs a file}"; shift 2 ;;
    --yes-i-understand-this-replaces-the-testing-database) ASSUME=1; shift ;;
    --apply-migrations) APPLY_MIGRATIONS=1; shift ;;
    --restart-services) RESTART=1; shift ;;
    --skip-verify) SKIP_VERIFY=1; shift ;;
    --keep-active-work) KEEP_ACTIVE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done
[[ -n "$BACKUP" ]] || die "--backup <file.dump> is required (see --help)."
PARK_SQL="$SCRIPT_DIR/../sql/park-active-work.sql"
(( KEEP_ACTIVE )) || [[ -f "$PARK_SQL" ]] || die "Missing $PARK_SQL"

command -v docker >/dev/null || die "docker not found"
if type -t require_docker >/dev/null; then require_docker; fi
if type -t assert_safe_testing_root >/dev/null; then assert_safe_testing_root; fi

# ---------------------------------------------------------------- backup ---
log_step "Checking the backup file"
[[ -f "$BACKUP" ]] || die "Backup not found: $BACKUP"
[[ "$BACKUP" == *.dump ]] || die "Backup must be a pg_dump custom archive ending in .dump"
[[ -d "$TESTING_BACKUP_DIR" ]] || die "Backup directory missing: $TESTING_BACKUP_DIR"
BACKUP_REAL="$(cd "$(dirname "$BACKUP")" && pwd -P)/$(basename "$BACKUP")"
BACKUP_DIR_REAL="$(cd "$TESTING_BACKUP_DIR" && pwd -P)"
[[ "$BACKUP_REAL" == "$BACKUP_DIR_REAL"/* ]] || die "Backup must be inside $TESTING_BACKUP_DIR (it is mounted at /backups in testing-postgres). Move it there with: install -m 600 '$BACKUP' '$TESTING_BACKUP_DIR/'"
REL="${BACKUP_REAL#"$BACKUP_DIR_REAL"/}"
[[ "$REL" != *..* && "$REL" =~ ^[A-Za-z0-9._/-]+$ ]] || die "Unsupported characters in backup path: $REL"
IN_CONTAINER="/backups/$REL"
[[ -f "$BACKUP_REAL.sha256" ]] || die "Checksum file missing: $BACKUP_REAL.sha256"
sha256_verify "$BACKUP_REAL" || die "SHA-256 verification FAILED for $BACKUP_REAL. Transfer it again."
log_ok "SHA-256 verified ($(awk '{print $1}' "$BACKUP_REAL.sha256"))"
if [[ -f "$BACKUP_REAL.meta" ]]; then
  log_info "Backup metadata:"
  grep -E '^(created_utc|source_db|server_version|pg_dump_version|latest_migration|highest_invoice_number|rows\.(users|orders|invoices))=' "$BACKUP_REAL.meta" | sed 's/^/    /' >&2 || true
fi

# ----------------------------------------------------------- destination ---
log_step "Checking the destination"
PG_ENV="$TESTING_ROOT/env/postgres.env"
[[ -r "$PG_ENV" ]] || die "Cannot read $PG_ENV"
T_USER="$(env_file_get "$PG_ENV" POSTGRES_USER || true)"
T_DB="$(env_file_get "$PG_ENV" POSTGRES_DB || true)"
[[ "$T_USER" =~ ^[a-z_][a-z0-9_]{0,62}$ ]] || die "POSTGRES_USER in $PG_ENV is missing or not a simple identifier."
[[ "$T_DB" =~ ^[a-z_][a-z0-9_]{0,62}$ ]] || die "POSTGRES_DB in $PG_ENV is missing or not a simple identifier."
case "$T_DB" in
  postgres|template0|template1|astro_sushil|astro_sushil_prod|astro_sushil_production|production)
    die "Refusing: '$T_DB' is a system or production-looking database name." ;;
esac
[[ "$T_DB" == *test* ]] || die "Refusing: testing database name '$T_DB' does not contain 'test' (expected e.g. astro_sushil_testing)."

PG_ID="$(testing_container_id testing-postgres)"
[[ -n "$PG_ID" ]] || die "testing-postgres is not running in project $TESTING_PROJECT. Start it: $TC_HINT up -d testing-postgres"
if type -t assert_testing_container >/dev/null; then assert_testing_container testing-postgres; fi
LABEL_PROJECT="$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.project" }}' "$PG_ID")"
LABEL_SERVICE="$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.service" }}' "$PG_ID")"
[[ "$LABEL_PROJECT" == "$TESTING_PROJECT" && "$LABEL_SERVICE" == "testing-postgres" ]] \
  || die "Container $PG_ID is $LABEL_PROJECT/$LABEL_SERVICE, not $TESTING_PROJECT/testing-postgres."
# The container's own configured database must be the one we are about to replace.
C_DB="$(docker exec "$PG_ID" printenv POSTGRES_DB 2>/dev/null || true)"
C_USER="$(docker exec "$PG_ID" printenv POSTGRES_USER 2>/dev/null || true)"
[[ "$C_DB" == "$T_DB" && "$C_USER" == "$T_USER" ]] \
  || die "Container database/user ($C_DB/$C_USER) differ from $PG_ENV ($T_DB/$T_USER). Recreate the container after changing postgres.env."
pg_exec() { testing_compose exec -T testing-postgres "$@"; }
psql_admin() { pg_exec psql -X -q -v ON_ERROR_STOP=1 -At -U "$T_USER" -d postgres "$@"; }
TARGET_VERSION="$(psql_admin -c 'SHOW server_version')" || die "Cannot connect to testing-postgres as $T_USER."
IS_SUPER="$(psql_admin -c "SELECT rolsuper FROM pg_roles WHERE rolname = current_user")"
log_ok "Destination: container $(docker inspect --format '{{.Name}}' "$PG_ID" | sed 's#^/##') (project $LABEL_PROJECT), database '$T_DB', role '$T_USER' (superuser: $IS_SUPER), PostgreSQL $TARGET_VERSION"

# --------------------------------------------------------------- archive ---
log_step "Reading the archive table of contents inside testing-postgres"
pg_exec test -r "$IN_CONTAINER" || die "$IN_CONTAINER is not visible inside testing-postgres (check the /backups mount)."
TOC="$(mktemp)"
trap 'rm -f "$TOC"' EXIT
if ! pg_exec pg_restore --list "$IN_CONTAINER" >"$TOC" 2>"$TOC.err"; then
  sed 's/^/    /' "$TOC.err" >&2; rm -f "$TOC.err"
  die "pg_restore $(pg_exec pg_restore --version | awk '{print $3}') cannot read this archive. If it says 'unsupported version', the dump was made with a newer pg_dump: re-create it with backup-local-db.sh (pg_dump of the testing major)."
fi
rm -f "$TOC.err"
grep -E '^;[[:space:]]+(Dumped from database version|Dumped by pg_dump version|Format|Dbname):' "$TOC" | sed 's/^;[[:space:]]*/    /' >&2 || true
EXTS="$(awk '$4 == "EXTENSION" { print $6 }' "$TOC" | sort -u)"
for ext in $EXTS; do
  avail="$(psql_admin -c "SELECT count(*) FROM pg_available_extensions WHERE name = '$ext'")"
  [[ "$avail" == 1 ]] || die "The archive needs extension '$ext', which is not available in testing-postgres (TESTING_POSTGRES_IMAGE). Install it in the image or drop it from the source."
  log_info "Extension in archive: $ext (available)"
done
[[ "$IS_SUPER" == t || -z "$EXTS" ]] || log_warn "Role $T_USER is not a superuser; CREATE EXTENSION may fail."
log_ok "Archive readable: $(grep -cvE '^;|^$' "$TOC") entries"

# ---------------------------------------------------------- confirmation ---
PHRASE="RESTORE $TESTING_PROJECT $T_DB"
log_warn "This DROPS the testing database '$T_DB' and replaces it with $(basename "$BACKUP_REAL")."
if (( ASSUME )); then
  log_info "Confirmed by --yes-i-understand-this-replaces-the-testing-database"
else
  confirm_phrase "$PHRASE" || die "Not confirmed. Nothing was changed."
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="$TESTING_ROOT/logs"
mkdir -p "$LOG_DIR"
RESTORE_LOG="$LOG_DIR/db-restore-$TS.log"
on_error() {
  log_error "Restore did not complete. testing-api and testing-worker are left STOPPED."
  log_error "Log: $RESTORE_LOG. Re-run this script with a good backup; do not start the API on a partial database."
}
trap on_error ERR

# -------------------------------------------------------------- restore ---
log_step "Stopping testing-api and testing-worker"
testing_compose stop testing-api testing-worker

log_step "Recreating database '$T_DB'"
psql_admin -c "DROP DATABASE IF EXISTS \"$T_DB\" WITH (FORCE)"
psql_admin -c "CREATE DATABASE \"$T_DB\" OWNER \"$T_USER\" TEMPLATE template0 ENCODING 'UTF8'"

log_step "Restoring (pg_restore --single-transaction --exit-on-error --no-owner --no-privileges)"
# --single-transaction: all or nothing, so a failure leaves an empty database
# rather than a half-restored one (it rules out --jobs; the data set is small).
pg_exec pg_restore --verbose --no-owner --no-privileges --role="$T_USER" --exit-on-error \
  --single-transaction -U "$T_USER" -d "$T_DB" "$IN_CONTAINER" >"$RESTORE_LOG" 2>&1 \
  || { tail -n 30 "$RESTORE_LOG" >&2; false; }
chmod 600 "$RESTORE_LOG"
log_ok "pg_restore finished (log: $RESTORE_LOG)"
pg_exec psql -X -q -v ON_ERROR_STOP=1 -U "$T_USER" -d "$T_DB" -c 'ANALYZE' >/dev/null

# ----------------------------------------------------- park active work ---
# Still with testing-api and testing-worker stopped: nothing can pick these rows up first.
if (( KEEP_ACTIVE )); then
  log_warn "--keep-active-work: pending messages and unfinished reports are left as restored."
  log_warn "Starting testing-worker will then SEND those messages (to real recipients if channels are configured) and GENERATE those reports (Gemini cost)."
else
  log_step "Parking in-flight work (outbound messages, unfinished reports) in one transaction"
  pg_exec psql -X -q -v ON_ERROR_STOP=1 -At -F $'\t' -U "$T_USER" -d "$T_DB" -f - <"$PARK_SQL" \
    | awk -F'\t' '{ printf "    %-8s %-58s %s\n", $1, $2, $3 }' >&2
  log_ok "In-flight work parked (invoices and invoice_counters untouched)."
fi
trap - ERR

# ----------------------------------------------------------- migrations ---
log_step "Prisma migration state (read-only: prisma migrate status)"
MIGRATE=(--profile tools run --rm --no-deps -T testing-migrate npx prisma migrate)
set +e
testing_compose "${MIGRATE[@]}" status --schema prisma/schema.prisma
STATUS_RC=$?
set -e
if (( STATUS_RC != 0 )); then
  if (( APPLY_MIGRATIONS )); then
    log_step "Applying pending migrations (prisma migrate deploy)"
    testing_compose "${MIGRATE[@]}" deploy --schema prisma/schema.prisma || die "prisma migrate deploy failed; see docs/database.md (P3009 / P3005)."
    testing_compose "${MIGRATE[@]}" status --schema prisma/schema.prisma || log_warn "migrate status still reports a problem."
  else
    log_warn "Migrations are not in sync (or the status command failed). Nothing was applied."
    log_warn "Review the output above; to apply pending migrations run:"
    log_warn "  $TC_HINT --profile tools run --rm testing-migrate   (= prisma migrate deploy)"
    log_warn "or re-run this script with --apply-migrations."
  fi
fi

# --------------------------------------------------------------- verify ---
VERIFY_RC=0
if (( ! SKIP_VERIFY )); then
  log_step "Verifying the restored database"
  set +e
  "$SCRIPT_DIR/verify-database.sh"
  VERIFY_RC=$?
  set -e
fi

if (( RESTART )); then
  if (( VERIFY_RC == 1 )); then
    log_warn "Integrity failures found; NOT starting testing-api/testing-worker."
  else
    log_step "Restarting testing-redis (drops cache of the old database), starting testing-api and testing-worker"
    testing_compose restart testing-redis
    testing_compose start testing-api testing-worker
  fi
else
  log_info "testing-api and testing-worker are stopped. Start them when ready:"
  log_info "  $TC_HINT restart testing-redis"
  log_info "  $TC_HINT start testing-api testing-worker"
fi

log_ok "Testing database '$T_DB' restored from $(basename "$BACKUP_REAL")."
log_info "Invoice counter: see infrastructure/testing/docs/invoice-counter.md (never insert it by hand)."
exit "$VERIFY_RC"
