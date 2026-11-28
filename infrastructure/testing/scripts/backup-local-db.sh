#!/usr/bin/env bash
# =============================================================================
# backup-local-db.sh - dump YOUR LOCAL migrated Astro Sushil database for the
# testing deployment. Runs on your own machine, never on the VPS, never against
# production. Read-only on the source database.
#
# Usage:
#   backup-local-db.sh [connection] [options]
#
# Connection (libpq; any of):
#   --host <h> --port <p> --user <u> --dbname <db>
#   --service <name>        libpq service from ~/.pg_service.conf
#   --pgpass <file>         password file (must be mode 600); default: $PGPASSFILE
#                           or ~/.pgpass when present, else an interactive prompt.
#                           The password is never put on a command line or in
#                           an environment variable.
# Client tools:
#   --use-docker <container>  run pg_dump/psql INSIDE that running local postgres
#                           container (connects to the server inside it).
#   --docker-image <image>  run pg_dump/psql from a throwaway container of that
#                           image (e.g. postgres:16-alpine) on the host network.
#   --target-major <n>      PostgreSQL major of the testing server (default 16 =
#                           postgres:16-alpine in docker-compose.testing.yml).
#   --allow-newer-pg-dump   continue although pg_dump is newer than the target
#                           (its archive may be unreadable by the target's pg_restore).
# Output:
#   --output-dir <dir>      default ./db-backups (created mode 700)
#   --force                 replace an existing file of the same name (asks first)
#   -h, --help
#
# Writes <dir>/astro_sushil_<db>_<UTC>.dump (pg_dump custom format) plus
# .dump.sha256 (sha256sum format) and .dump.meta (no secrets).
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/lib/common.sh" ]]; then
  # shellcheck source=lib/common.sh
  source "$SCRIPT_DIR/lib/common.sh"
fi
type -t log_info >/dev/null || log_info() { printf '[info]  %s\n' "$*" >&2; }
type -t log_ok >/dev/null || log_ok() { printf '[ok]    %s\n' "$*" >&2; }
type -t log_warn >/dev/null || log_warn() { printf '[warn]  %s\n' "$*" >&2; }
type -t log_error >/dev/null || log_error() { printf '[error] %s\n' "$*" >&2; }
type -t die >/dev/null || die() { log_error "$*"; exit 1; }
type -t confirm_phrase >/dev/null || confirm_phrase() {
  local reply=""
  { : </dev/tty; } 2>/dev/null || { log_error "No terminal available to confirm."; return 1; }
  printf '\nType exactly the following to continue:\n  %s\n> ' "$1" >/dev/tty
  IFS= read -r reply </dev/tty || return 1
  [[ "$reply" == "$1" ]]
}

usage() { awk 'NR == 1 { next } /^# =====/ { n++; if (n == 2) exit; next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; }

PG_HOST="" PG_PORT="" PG_USER="" PG_DB="" PG_SERVICE="" PGPASS_ARG=""
USE_DOCKER="" DOCKER_IMAGE="" TARGET_MAJOR=16 ALLOW_NEWER=0
OUTPUT_DIR="./db-backups" FORCE=0

while (($#)); do
  case "$1" in
    --host) PG_HOST="${2:?--host needs a value}"; shift 2 ;;
    --port) PG_PORT="${2:?--port needs a value}"; shift 2 ;;
    --user) PG_USER="${2:?--user needs a value}"; shift 2 ;;
    --dbname) PG_DB="${2:?--dbname needs a value}"; shift 2 ;;
    --service) PG_SERVICE="${2:?--service needs a value}"; shift 2 ;;
    --pgpass) PGPASS_ARG="${2:?--pgpass needs a value}"; shift 2 ;;
    --use-docker) USE_DOCKER="${2:?--use-docker needs a container}"; shift 2 ;;
    --docker-image) DOCKER_IMAGE="${2:?--docker-image needs an image}"; shift 2 ;;
    --target-major) TARGET_MAJOR="${2:?--target-major needs a number}"; shift 2 ;;
    --allow-newer-pg-dump) ALLOW_NEWER=1; shift ;;
    --output-dir) OUTPUT_DIR="${2:?--output-dir needs a value}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --password|--password=*|-W) die "Passwords are never accepted on the command line. Use --pgpass <file> or the prompt." ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

[[ "$TARGET_MAJOR" =~ ^[0-9]+$ ]] || die "--target-major must be a number"
[[ -n "$USE_DOCKER" && -n "$DOCKER_IMAGE" ]] && die "Use either --use-docker or --docker-image, not both."
if [[ -n "${PGPASSWORD:-}" ]]; then
  die "PGPASSWORD is set in your environment. Unset it and use a protected --pgpass file or the prompt."
fi
[[ -n "$PG_DB" || -n "$PG_SERVICE" ]] || die "Give --dbname <db> (or --service <name>)."

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/astro-backup.XXXXXX")"
chmod 700 "$WORK_DIR"
CONTAINER_TMP=""
cleanup() {
  if [[ -n "$CONTAINER_TMP" && -n "$USE_DOCKER" ]]; then
    docker exec "$USE_DOCKER" rm -rf "$CONTAINER_TMP" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

# ---------------------------------------------------------------- password ---
PGPASS_FILE=""
if [[ -n "$PGPASS_ARG" ]]; then
  PGPASS_FILE="$PGPASS_ARG"
elif [[ -n "${PGPASSFILE:-}" ]]; then
  PGPASS_FILE="$PGPASSFILE"
elif [[ -f "$HOME/.pgpass" ]]; then
  PGPASS_FILE="$HOME/.pgpass"
fi
if [[ -n "$PGPASS_FILE" ]]; then
  [[ -f "$PGPASS_FILE" && -r "$PGPASS_FILE" ]] || die "Password file not readable: $PGPASS_FILE"
  mode="$(stat -c '%a' "$PGPASS_FILE" 2>/dev/null || stat -f '%Lp' "$PGPASS_FILE")"
  [[ "$mode" == "600" || "$mode" == "400" ]] || die "Password file $PGPASS_FILE has mode $mode; run: chmod 600 '$PGPASS_FILE'"
  PGPASS_FILE="$(cd "$(dirname "$PGPASS_FILE")" && pwd -P)/$(basename "$PGPASS_FILE")"
else
  # One prompt; the password goes into a private temporary pgpass file (mode 600)
  # that is deleted on exit. With trust/peer authentication just press Enter.
  { : </dev/tty; } 2>/dev/null || die "No terminal for the password prompt; use --pgpass <file>."
  printf 'Password for the source database (empty for trust/peer auth): ' >/dev/tty
  IFS= read -rs pw </dev/tty || true
  printf '\n' >/dev/tty
  if [[ -n "$pw" ]]; then
    esc="${pw//\\/\\\\}"; esc="${esc//:/\\:}"
    PGPASS_FILE="$WORK_DIR/pgpass"
    (umask 077; printf '*:*:*:*:%s\n' "$esc" >"$PGPASS_FILE")
  fi
  unset pw esc
fi

# ------------------------------------------------------------ client runner ---
# Connection options shared by psql and pg_dump (no password ever).
CONN=()
[[ -n "$PG_HOST" ]] && CONN+=(--host "$PG_HOST")
[[ -n "$PG_PORT" ]] && CONN+=(--port "$PG_PORT")
[[ -n "$PG_USER" ]] && CONN+=(--username "$PG_USER")
CONN+=(--no-password)
DB_ARG="${PG_DB}"
[[ -n "$PG_SERVICE" ]] && DB_ARG="service=$PG_SERVICE${PG_DB:+ dbname=$PG_DB}"

if [[ -n "$USE_DOCKER" ]]; then
  command -v docker >/dev/null || die "docker not found"
  [[ "$(docker inspect -f '{{.State.Running}}' "$USE_DOCKER" 2>/dev/null)" == "true" ]] || die "Container '$USE_DOCKER' is not running."
  CONTAINER_TMP="$(docker exec "$USE_DOCKER" mktemp -d /tmp/astro-backup.XXXXXX)"
  if [[ -n "$PGPASS_FILE" ]]; then
    docker cp "$PGPASS_FILE" "$USE_DOCKER:$CONTAINER_TMP/pgpass" >/dev/null
    docker exec "$USE_DOCKER" chmod 600 "$CONTAINER_TMP/pgpass"
  fi
  [[ -n "$PG_SERVICE" ]] && die "--service is not supported with --use-docker (the container has no service file)."
elif [[ -n "$DOCKER_IMAGE" ]]; then
  command -v docker >/dev/null || die "docker not found"
  [[ -n "$PG_SERVICE" ]] && die "--service is not supported with --docker-image."
else
  command -v psql >/dev/null || die "psql not found (install the PostgreSQL client, or use --docker-image postgres:<major>-alpine)."
  command -v pg_dump >/dev/null || die "pg_dump not found (or use --docker-image postgres:<major>-alpine)."
fi

# run_tool <tool> <args...>: stdout of the tool; never a password in argv/env.
run_tool() {
  local tool="$1"; shift
  if [[ -n "$USE_DOCKER" ]]; then
    local envs=()
    [[ -n "$PGPASS_FILE" ]] && envs=(-e "PGPASSFILE=$CONTAINER_TMP/pgpass")
    docker exec -i "${envs[@]}" "$USE_DOCKER" "$tool" "$@"
  elif [[ -n "$DOCKER_IMAGE" ]]; then
    local mounts=(-v "$WORK_DIR:/work")
    [[ -n "$PGPASS_FILE" ]] && mounts+=(-v "$PGPASS_FILE:/work-pgpass:ro" -e "PGPASSFILE=/work-pgpass")
    docker run --rm -i --network host --user "$(id -u):$(id -g)" "${mounts[@]}" "$DOCKER_IMAGE" "$tool" "$@"
  else
    if [[ -n "$PGPASS_FILE" ]]; then PGPASSFILE="$PGPASS_FILE" "$tool" "$@"; else "$tool" "$@"; fi
  fi
}

psql_q() { run_tool psql -X -q -v ON_ERROR_STOP=1 -At "${CONN[@]}" --dbname "$DB_ARG" -c "$1"; }

# ------------------------------------------------------------ version check ---
log_info "Connecting to the source database (read-only queries)"
SERVER_NUM="$(psql_q 'SHOW server_version_num')" || die "Could not connect. Check host/port/user/dbname and the password file."
SERVER_VERSION="$(psql_q 'SHOW server_version')"
SRC_DB="$(psql_q 'SELECT current_database()')"
SRC_USER="$(psql_q 'SELECT current_user')"
SERVER_MAJOR=$((SERVER_NUM / 10000))
DUMP_VERSION_STR="$(run_tool pg_dump --version)"
DUMP_MAJOR="$(awk 'NR == 1 { split($3, v, "."); print v[1] }' <<<"$DUMP_VERSION_STR")"
[[ "$DUMP_MAJOR" =~ ^[0-9]+$ ]] || die "Cannot parse pg_dump version: $DUMP_VERSION_STR"

log_info "Source server: PostgreSQL $SERVER_VERSION (major $SERVER_MAJOR), database '$SRC_DB' as '$SRC_USER'"
log_info "pg_dump: $DUMP_VERSION_STR; testing target major: $TARGET_MAJOR"

if (( DUMP_MAJOR < SERVER_MAJOR )); then
  die "pg_dump $DUMP_MAJOR is older than the server ($SERVER_MAJOR); pg_dump refuses newer servers. Use --docker-image postgres:${SERVER_MAJOR}-alpine or --use-docker <container>."
fi
if (( SERVER_MAJOR > TARGET_MAJOR )); then
  die "The source server ($SERVER_MAJOR) is newer than the testing server ($TARGET_MAJOR). A dump from it cannot be restored reliably into PostgreSQL $TARGET_MAJOR. Run the testing stack on postgres:${SERVER_MAJOR}-alpine (docker-compose.testing.yml) and pass --target-major $SERVER_MAJOR, or migrate the data into a PostgreSQL $TARGET_MAJOR database first. See docs/database.md (version mismatch)."
fi
if (( DUMP_MAJOR > TARGET_MAJOR )); then
  if (( ALLOW_NEWER )); then
    log_warn "pg_dump $DUMP_MAJOR is newer than the testing server's pg_restore ($TARGET_MAJOR); the archive may be rejected ('unsupported version in file header')."
  else
    die "pg_dump $DUMP_MAJOR writes an archive that pg_restore $TARGET_MAJOR may not read. Use a pg_dump of major $TARGET_MAJOR: --docker-image postgres:${TARGET_MAJOR}-alpine (host network) or --use-docker <your local postgres:$TARGET_MAJOR container>. Override with --allow-newer-pg-dump."
  fi
fi

# -------------------------------------------------------------- output path ---
SAFE_DB="$(printf '%s' "$SRC_DB" | tr -c 'A-Za-z0-9_-' '_')"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUTPUT_DIR"
chmod 700 "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd -P)"
BASENAME="astro_sushil_${SAFE_DB}_${TS}.dump"
OUT="$OUTPUT_DIR/$BASENAME"
if [[ -e "$OUT" || -e "$OUT.sha256" || -e "$OUT.meta" ]]; then
  (( FORCE )) || die "$OUT already exists. Refusing to overwrite (use --force)."
  confirm_phrase "OVERWRITE $BASENAME" || die "Not confirmed."
  rm -f "$OUT" "$OUT.sha256" "$OUT.meta"
fi

# ------------------------------------------------------------------- dump ---
# --format=custom: compressed archive restorable selectively with pg_restore.
# --no-owner --no-privileges: no ALTER OWNER / GRANT statements, so the restore
#   runs cleanly as the testing role (pg_restore also gets both flags).
# Schema, data, indexes, constraints, triggers, functions, sequences and the
# _prisma_migrations table are all included (whole database, no exclusions).
# pg_dump reads everything from ONE consistent snapshot (a single repeatable-read
# transaction), so concurrent writes on the source cannot tear the dump.
DUMP_ARGS=(--format=custom --compress=6 --no-owner --no-privileges --verbose "${CONN[@]}" --dbname "$DB_ARG")
log_info "Dumping '$SRC_DB' to $OUT"
umask 077
if [[ -n "$USE_DOCKER" ]]; then
  run_tool pg_dump "${DUMP_ARGS[@]}" --file "$CONTAINER_TMP/out.dump" 2>"$WORK_DIR/pg_dump.log" \
    || { tail -n 20 "$WORK_DIR/pg_dump.log" >&2; die "pg_dump failed"; }
  docker cp "$USE_DOCKER:$CONTAINER_TMP/out.dump" "$OUT.partial" >/dev/null
elif [[ -n "$DOCKER_IMAGE" ]]; then
  run_tool pg_dump "${DUMP_ARGS[@]}" --file "/work/out.dump" 2>"$WORK_DIR/pg_dump.log" \
    || { tail -n 20 "$WORK_DIR/pg_dump.log" >&2; die "pg_dump failed"; }
  mv "$WORK_DIR/out.dump" "$OUT.partial"
else
  run_tool pg_dump "${DUMP_ARGS[@]}" --file "$OUT.partial" 2>"$WORK_DIR/pg_dump.log" \
    || { rm -f "$OUT.partial"; tail -n 20 "$WORK_DIR/pg_dump.log" >&2; die "pg_dump failed"; }
fi
chmod 600 "$OUT.partial"
mv "$OUT.partial" "$OUT"
TOC_ENTRIES="$(grep -c 'dumping contents of table' "$WORK_DIR/pg_dump.log" || true)"

# --------------------------------------------------------------- metadata ---
(cd "$OUTPUT_DIR" && sha256sum "$BASENAME" >"$BASENAME.sha256")
chmod 600 "$OUT.sha256"

KEY_TABLES="users staff_profiles admin_roles birth_profiles orders order_items shop_orders reports consultation_bookings payment_transactions invoices invoice_counters digital_product_entitlements products courses _prisma_migrations"
TABLE_LIST="'$(sed "s/ /','/g" <<<"$KEY_TABLES")'"
# Row counts; a table missing from the source shows as MISSING (CASE keeps the count lazy).
COUNTS="$(psql_q "SELECT t.name || '=' || CASE WHEN i.table_name IS NULL THEN 'MISSING' ELSE (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', t.name), false, true, '')))[1]::text END FROM unnest(ARRAY[$TABLE_LIST]) AS t(name) LEFT JOIN information_schema.tables i ON i.table_schema = 'public' AND i.table_name = t.name ORDER BY t.name")" \
  || die "Could not read row counts from the source database."
HIGHEST_INVOICE="$(psql_q "SELECT coalesce(max((substring(\"number\" FROM '^INV-AS/([0-9]+)\$'))::numeric), 0) FROM public.\"invoices\"" 2>/dev/null || echo unknown)"
COUNTER_STATE="$(psql_q "SELECT coalesce((SELECT \"lastValue\"::text FROM public.\"invoice_counters\" WHERE \"key\" = 'INV-AS'), 'not initialised')" 2>/dev/null || echo unknown)"
LATEST_MIGRATION="$(psql_q "SELECT coalesce(max(migration_name), '-') FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL" 2>/dev/null || echo unknown)"
FAILED_MIGRATIONS="$(psql_q "SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL" 2>/dev/null || echo unknown)"
EXTENSIONS="$(psql_q "SELECT string_agg(extname || ' ' || extversion, ', ' ORDER BY extname) FROM pg_extension" 2>/dev/null || echo unknown)"
DB_SIZE="$(psql_q "SELECT pg_size_pretty(pg_database_size(current_database()))" 2>/dev/null || echo unknown)"
ENCODING="$(psql_q "SHOW server_encoding" 2>/dev/null || echo unknown)"

{
  printf '# Astro Sushil database backup metadata (no secrets)\n'
  printf 'file=%s\n' "$BASENAME"
  printf 'created_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'source_host=%s\n' "${PG_HOST:-default}"
  printf 'source_service=%s\n' "${PG_SERVICE:--}"
  printf 'source_port=%s\n' "${PG_PORT:-default}"
  printf 'source_db=%s\n' "$SRC_DB"
  printf 'source_user=%s\n' "$SRC_USER"
  printf 'client_mode=%s\n' "${USE_DOCKER:+container:$USE_DOCKER}${DOCKER_IMAGE:+image:$DOCKER_IMAGE}"
  printf 'server_version=%s\n' "$SERVER_VERSION"
  printf 'server_major=%s\n' "$SERVER_MAJOR"
  printf 'server_encoding=%s\n' "$ENCODING"
  printf 'pg_dump_version=%s\n' "$DUMP_VERSION_STR"
  printf 'pg_dump_major=%s\n' "$DUMP_MAJOR"
  printf 'target_major=%s\n' "$TARGET_MAJOR"
  printf 'format=custom no_owner=1 no_privileges=1 consistent_snapshot=1\n'
  printf 'database_size=%s\n' "$DB_SIZE"
  printf 'tables_dumped=%s\n' "$TOC_ENTRIES"
  printf 'extensions=%s\n' "$EXTENSIONS"
  printf 'latest_migration=%s\n' "$LATEST_MIGRATION"
  printf 'failed_migrations=%s\n' "$FAILED_MIGRATIONS"
  printf 'highest_invoice_number=%s\n' "$HIGHEST_INVOICE"
  printf 'invoice_counter_INV-AS=%s\n' "$COUNTER_STATE"
  printf 'sha256=%s\n' "$(awk '{print $1}' "$OUT.sha256")"
  printf 'size_bytes=%s\n' "$(stat -c '%s' "$OUT" 2>/dev/null || wc -c <"$OUT" | tr -d ' ')"
  printf '%s\n' "$COUNTS" | sed -e '/^$/d' -e 's/^/rows./'
} >"$OUT.meta"
chmod 600 "$OUT.meta"

# Sanity: the archive's table of contents must be readable by this pg_restore.
if command -v pg_restore >/dev/null 2>&1 && [[ -z "$USE_DOCKER$DOCKER_IMAGE" ]]; then
  pg_restore --list "$OUT" >/dev/null || die "pg_restore cannot read the archive just written: $OUT"
fi

log_ok "Backup written"
cat >&2 <<EOF

  dump      $OUT
  checksum  $OUT.sha256
  metadata  $OUT.meta
  server    PostgreSQL $SERVER_VERSION  (pg_dump major $DUMP_MAJOR, testing target $TARGET_MAJOR)
  invoices  highest stored INV-AS number: $HIGHEST_INVOICE  (counter: $COUNTER_STATE)

$(sed -n 's/^rows\./  rows  /p' "$OUT.meta")

Verify locally:   (cd '$OUTPUT_DIR' && sha256sum -c '$BASENAME.sha256')
Transfer (database separately from the source bundle; the file holds customer data):
  ssh <vps> 'sudo install -d -m 700 /opt/astro-sushil/testing/data/postgres-backup'
  scp -p '$OUT' '$OUT.sha256' '$OUT.meta' <vps>:/tmp/
  ssh <vps> 'sudo install -m 600 /tmp/$BASENAME /tmp/$BASENAME.sha256 /tmp/$BASENAME.meta /opt/astro-sushil/testing/data/postgres-backup/ && rm -f /tmp/$BASENAME*'
Then on the VPS:
  infrastructure/testing/scripts/restore-testing-db.sh --backup /opt/astro-sushil/testing/data/postgres-backup/$BASENAME
EOF
