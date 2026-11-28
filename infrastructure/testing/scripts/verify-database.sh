#!/usr/bin/env bash
# =============================================================================
# verify-database.sh - read-only integrity report of an Astro Sushil database.
#
# Usage:
#   verify-database.sh [--json]
#       Checks the TESTING database (service testing-postgres of compose
#       project astro_testing) through `docker compose exec psql`.
#   verify-database.sh --local [--host h] [--port p] [--user u] --dbname db
#                      [--service name] [--pgpass file] [--use-docker container] [--json]
#       Checks a LOCAL database before you back it up (libpq parameters; the
#       password comes from a mode-600 pgpass file or a prompt, never argv).
#
# Everything runs in one READ ONLY transaction (sql/verify-database.sql).
# Status: FAIL = real integrity failure (orphan on a declared foreign key,
# duplicate on a declared unique column, failed migration, missing native
# constraint/trigger, invoice counter behind history). WARN = worth a look
# (reference counts of the historical data set, soft links). Exit code 1 only
# when at least one FAIL is reported, 2 on usage/connection errors.
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
TESTING_ROOT="${TESTING_ROOT:-/opt/astro-sushil/testing}"
TESTING_PROJECT="${TESTING_PROJECT:-astro_testing}"
type -t testing_compose >/dev/null || testing_compose() {
  TESTING_ROOT="$TESTING_ROOT" docker compose --project-name "$TESTING_PROJECT" \
    --env-file "$TESTING_ROOT/env/build.env" --env-file "$TESTING_ROOT/env/proxy.env" \
    -f "$TESTING_ROOT/repo/docker-compose.testing.yml" "$@"
}
type -t env_file_get >/dev/null || env_file_get() {
  [[ -f "$1" ]] || return 1
  sed -n -E "s/^[[:space:]]*(export[[:space:]]+)?$2=[\"']?([^\"']*)[\"']?[[:space:]]*$/\\2/p" "$1" | tail -n 1
}
fail_usage() { log_error "$*"; exit 2; }
usage() { awk 'NR == 1 { next } /^# =====/ { n++; if (n == 2) exit; next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; }

MODE=testing JSON=0
PG_HOST="" PG_PORT="" PG_USER="" PG_DB="" PG_SERVICE="" PGPASS_ARG="" USE_DOCKER=""
while (($#)); do
  case "$1" in
    --json) JSON=1; shift ;;
    --local) MODE=local; shift ;;
    --host) PG_HOST="${2:?}"; shift 2 ;;
    --port) PG_PORT="${2:?}"; shift 2 ;;
    --user) PG_USER="${2:?}"; shift 2 ;;
    --dbname) PG_DB="${2:?}"; shift 2 ;;
    --service) PG_SERVICE="${2:?}"; shift 2 ;;
    --pgpass) PGPASS_ARG="${2:?}"; shift 2 ;;
    --use-docker) USE_DOCKER="${2:?}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) fail_usage "Unknown option: $1 (see --help)" ;;
  esac
done

SQL_FILE="$SCRIPT_DIR/../sql/verify-database.sql"
[[ -f "$SQL_FILE" ]] || fail_usage "Missing $SQL_FILE"

# Expected values from the repository this script belongs to.
PRISMA_DIR="$SCRIPT_DIR/../../../apps/api/prisma"
EXPECTED_MIGRATIONS=-1 EXPECTED_FKS=-1
if [[ -d "$PRISMA_DIR/migrations" ]]; then
  EXPECTED_MIGRATIONS="$(find "$PRISMA_DIR/migrations" -mindepth 2 -maxdepth 2 -name migration.sql | wc -l | tr -d ' ')"
fi
if [[ -f "$PRISMA_DIR/schema.prisma" ]]; then
  EXPECTED_FKS="$(grep -c '@relation([^)]*fields:' "$PRISMA_DIR/schema.prisma" || true)"
fi

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/astro-verify.XXXXXX")"
chmod 700 "$WORK_DIR"
CONTAINER_TMP=""
cleanup() {
  if [[ -n "$CONTAINER_TMP" ]]; then docker exec "$USE_DOCKER" rm -rf "$CONTAINER_TMP" >/dev/null 2>&1 || true; fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

PSQL_OPTS=(-X -q -v ON_ERROR_STOP=1 -At -F $'\t')

if [[ "$MODE" == testing ]]; then
  [[ -z "$PG_HOST$PG_PORT$PG_USER$PG_DB$PG_SERVICE$PGPASS_ARG$USE_DOCKER" ]] || fail_usage "Connection options need --local."
  PG_ENV="$TESTING_ROOT/env/postgres.env"
  [[ -r "$PG_ENV" ]] || fail_usage "Cannot read $PG_ENV (run as the deployment user / with sudo)."
  T_USER="$(env_file_get "$PG_ENV" POSTGRES_USER || true)"
  T_DB="$(env_file_get "$PG_ENV" POSTGRES_DB || true)"
  [[ -n "$T_USER" && -n "$T_DB" ]] || fail_usage "POSTGRES_USER / POSTGRES_DB missing in $PG_ENV"
  [[ -n "$(testing_compose ps -q testing-postgres 2>/dev/null)" ]] || fail_usage "testing-postgres is not running (project $TESTING_PROJECT)."
  TARGET_DESC="testing database '$T_DB' (project $TESTING_PROJECT)"
  run_psql() { testing_compose exec -T testing-postgres psql "${PSQL_OPTS[@]}" -U "$T_USER" -d "$T_DB" "$@"; }
else
  [[ -n "$PG_DB" || -n "$PG_SERVICE" ]] || fail_usage "--local needs --dbname (or --service)."
  [[ -z "${PGPASSWORD:-}" ]] || fail_usage "PGPASSWORD is set; unset it and use --pgpass <file> or the prompt."
  PGPASS_FILE="${PGPASS_ARG:-${PGPASSFILE:-}}"
  [[ -z "$PGPASS_FILE" && -f "$HOME/.pgpass" ]] && PGPASS_FILE="$HOME/.pgpass"
  if [[ -n "$PGPASS_FILE" ]]; then
    [[ -r "$PGPASS_FILE" ]] || fail_usage "Password file not readable: $PGPASS_FILE"
    mode="$(stat -c '%a' "$PGPASS_FILE" 2>/dev/null || stat -f '%Lp' "$PGPASS_FILE")"
    [[ "$mode" == 600 || "$mode" == 400 ]] || fail_usage "Password file $PGPASS_FILE has mode $mode; chmod 600 it."
  else
    if { : </dev/tty; } 2>/dev/null; then
      printf 'Password for the local database (empty for trust/peer auth): ' >/dev/tty
      IFS= read -rs pw </dev/tty || true
      printf '\n' >/dev/tty
      if [[ -n "$pw" ]]; then
        esc="${pw//\\/\\\\}"; esc="${esc//:/\\:}"
        PGPASS_FILE="$WORK_DIR/pgpass"
        (umask 077; printf '*:*:*:*:%s\n' "$esc" >"$PGPASS_FILE")
      fi
      unset pw esc
    fi
  fi
  CONN=()
  [[ -n "$PG_HOST" ]] && CONN+=(--host "$PG_HOST")
  [[ -n "$PG_PORT" ]] && CONN+=(--port "$PG_PORT")
  [[ -n "$PG_USER" ]] && CONN+=(--username "$PG_USER")
  CONN+=(--no-password)
  DB_ARG="$PG_DB"
  [[ -n "$PG_SERVICE" ]] && DB_ARG="service=$PG_SERVICE${PG_DB:+ dbname=$PG_DB}"
  TARGET_DESC="local database '${PG_DB:-service $PG_SERVICE}'${PG_HOST:+ on $PG_HOST}${PG_PORT:+:$PG_PORT}"
  if [[ -n "$USE_DOCKER" ]]; then
    [[ "$(docker inspect -f '{{.State.Running}}' "$USE_DOCKER" 2>/dev/null)" == true ]] || fail_usage "Container '$USE_DOCKER' is not running."
    CONTAINER_TMP="$(docker exec "$USE_DOCKER" mktemp -d /tmp/astro-verify.XXXXXX)"
    DENV=()
    if [[ -n "$PGPASS_FILE" ]]; then
      docker cp "$PGPASS_FILE" "$USE_DOCKER:$CONTAINER_TMP/pgpass" >/dev/null
      docker exec "$USE_DOCKER" chmod 600 "$CONTAINER_TMP/pgpass"
      DENV=(-e "PGPASSFILE=$CONTAINER_TMP/pgpass")
    fi
    run_psql() { docker exec -i "${DENV[@]}" "$USE_DOCKER" psql "${PSQL_OPTS[@]}" "${CONN[@]}" --dbname "$DB_ARG" "$@"; }
  else
    command -v psql >/dev/null || fail_usage "psql not found (or use --use-docker <container>)."
    run_psql() {
      if [[ -n "$PGPASS_FILE" ]]; then PGPASSFILE="$PGPASS_FILE" psql "${PSQL_OPTS[@]}" "${CONN[@]}" --dbname "$DB_ARG" "$@"
      else psql "${PSQL_OPTS[@]}" "${CONN[@]}" --dbname "$DB_ARG" "$@"; fi
    }
  fi
fi

# ------------------------------------------------------------- precheck ---
REQUIRED_TABLES=(users staff_profiles admin_roles birth_profiles orders order_items shop_orders reports
  consultation_bookings payment_transactions invoices invoice_counters digital_product_entitlements
  products courses _prisma_migrations refund_item_allocations shipment_items outbound_messages)
list="'$(IFS=,; sed "s/,/','/g" <<<"${REQUIRED_TABLES[*]}")'"
MISSING="$(run_psql -c "SELECT coalesce(string_agg(t, ', '), '') FROM unnest(ARRAY[$list]) AS t WHERE to_regclass('public.' || quote_ident(t)) IS NULL")" \
  || { log_error "Could not connect to the $TARGET_DESC."; exit 2; }
if [[ -n "$MISSING" ]]; then
  log_error "Tables missing from the $TARGET_DESC: $MISSING"
  log_error "The schema is incomplete (migrations not applied or wrong database). No further checks run."
  exit 1
fi

# ---------------------------------------------------------------- checks ---
run_psql -v expected_migrations="$EXPECTED_MIGRATIONS" -v expected_fks="$EXPECTED_FKS" -f - <"$SQL_FILE" >"$WORK_DIR/out.tsv" \
  || { log_error "Verification query failed on the $TARGET_DESC."; exit 2; }

FAILS="$(awk -F'\t' '$3 == "FAIL"' "$WORK_DIR/out.tsv" | wc -l | tr -d ' ')"
WARNS="$(awk -F'\t' '$3 == "WARN"' "$WORK_DIR/out.tsv" | wc -l | tr -d ' ')"

if (( JSON )); then
  awk -F'\t' -v target="$TARGET_DESC" -v fails="$FAILS" -v warns="$WARNS" '
    function esc(s) { gsub(/\\/, "\\\\", s); gsub(/"/, "\\\"", s); gsub(/\t/, "\\t", s); gsub(/\r/, "", s); return s }
    BEGIN { printf "{\"target\":\"%s\",\"fail\":%d,\"warn\":%d,\"checks\":[", esc(target), fails, warns }
    { printf "%s{\"section\":\"%s\",\"check\":\"%s\",\"status\":\"%s\",\"value\":\"%s\",\"detail\":\"%s\"}", (NR > 1 ? "," : ""), esc($1), esc($2), esc($3), esc($4), esc($5) }
    END { print "]}" }' "$WORK_DIR/out.tsv"
else
  printf 'Database verification: %s\n' "$TARGET_DESC"
  printf 'Reference counts are the historical migrated data set: a mismatch is WARN, never FAIL.\n'
  awk -F'\t' '
    $1 != last { printf "\n[%s]\n", $1; last = $1 }
    { printf "  %-5s %-58s %14s  %s\n", $3, $2, $4, $5 }' "$WORK_DIR/out.tsv"
  printf '\nSummary: %s FAIL, %s WARN\n' "$FAILS" "$WARNS"
fi

if (( FAILS > 0 )); then
  log_error "$FAILS integrity check(s) FAILED on the $TARGET_DESC."
  exit 1
fi
log_ok "No integrity failures on the $TARGET_DESC ($WARNS warning(s))."
