#!/usr/bin/env bash
# =============================================================================
# reset-testing-db.sh - put the TESTING database back to a known backup.
# Lists the archives in $TESTING_ROOT/data/postgres-backup, lets you pick one
# (or take --backup), asks you to type "RESET astro_testing <dbname>", then
# runs restore-testing-db.sh. Only compose project astro_testing is touched.
#
# Usage:
#   reset-testing-db.sh [--backup <file.dump>] [--apply-migrations] [--restart-services]
#                       [--keep-active-work]   (passed to restore-testing-db.sh)
#   reset-testing-db.sh --list
#   -h, --help
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/lib/common.sh" ]]; then
  # shellcheck source=lib/common.sh
  source "$SCRIPT_DIR/lib/common.sh"
fi
TESTING_ROOT="${TESTING_ROOT:-/opt/astro-sushil/testing}"
TESTING_PROJECT="${TESTING_PROJECT:-astro_testing}"
TESTING_BACKUP_DIR="${TESTING_BACKUP_DIR:-$TESTING_ROOT/data/postgres-backup}"
type -t log_info >/dev/null || log_info() { printf '[info]  %s\n' "$*" >&2; }
type -t log_error >/dev/null || log_error() { printf '[error] %s\n' "$*" >&2; }
type -t die >/dev/null || die() { log_error "$*"; exit 1; }
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
usage() { awk 'NR == 1 { next } /^# =====/ { n++; if (n == 2) exit; next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; }

BACKUP="" LIST_ONLY=0 PASS=()
while (($#)); do
  case "$1" in
    --backup) BACKUP="${2:?--backup needs a file}"; shift 2 ;;
    --list) LIST_ONLY=1; shift ;;
    --apply-migrations|--restart-services|--keep-active-work) PASS+=("$1"); shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

[[ -d "$TESTING_BACKUP_DIR" ]] || die "Backup directory missing: $TESTING_BACKUP_DIR"
mapfile -t DUMPS < <(find "$TESTING_BACKUP_DIR" -maxdepth 1 -type f -name '*.dump' -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2-)

describe() {
  local f="$1" meta="$1.meta" sum="missing"
  [[ -f "$f.sha256" ]] && sum="present"
  printf '%s  (%s, sha256 %s' "$(basename "$f")" "$(du -h "$f" | cut -f1)" "$sum"
  if [[ -f "$meta" ]]; then
    printf ', from %s, users %s, orders %s' \
      "$(sed -n 's/^source_db=//p' "$meta")" "$(sed -n 's/^rows\.users=//p' "$meta")" "$(sed -n 's/^rows\.orders=//p' "$meta")"
  fi
  printf ')'
}

if (( LIST_ONLY )) || [[ -z "$BACKUP" ]]; then
  (( ${#DUMPS[@]} > 0 )) || die "No *.dump files in $TESTING_BACKUP_DIR. Copy one there first (docs/database.md)."
  printf 'Backups in %s (newest first):\n' "$TESTING_BACKUP_DIR"
  for i in "${!DUMPS[@]}"; do printf '  %2d) %s\n' "$((i + 1))" "$(describe "${DUMPS[$i]}")"; done
  (( LIST_ONLY )) && exit 0
  { : </dev/tty; } 2>/dev/null || die "No terminal to pick a backup; pass --backup <file>."
  printf 'Pick a backup number: ' >/dev/tty
  IFS= read -r pick </dev/tty || die "No selection."
  [[ "$pick" =~ ^[0-9]+$ ]] && (( pick >= 1 && pick <= ${#DUMPS[@]} )) || die "Invalid selection: $pick"
  BACKUP="${DUMPS[$((pick - 1))]}"
fi

T_DB="$(env_file_get "$TESTING_ROOT/env/postgres.env" POSTGRES_DB || true)"
[[ -n "$T_DB" ]] || die "POSTGRES_DB not found in $TESTING_ROOT/env/postgres.env"

printf '\nThis resets the TESTING database %s (project %s) to:\n  %s\n' "$T_DB" "$TESTING_PROJECT" "$(describe "$BACKUP")"
printf 'Every change made in testing since that backup is lost.\n'
confirm_phrase "RESET $TESTING_PROJECT $T_DB" || die "Not confirmed. Nothing was changed."

exec "$SCRIPT_DIR/restore-testing-db.sh" --backup "$BACKUP" \
  --yes-i-understand-this-replaces-the-testing-database "${PASS[@]}"
