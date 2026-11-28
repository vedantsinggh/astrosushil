#!/usr/bin/env bash
# =============================================================================
# stop-testing.sh - stop the Astro Sushil TESTING stack (project astro_testing).
#
# Usage:
#   sudo infrastructure/testing/scripts/stop-testing.sh [--down] [SERVICE...]
#
# Options:
#   --down      remove the containers and the project networks after stopping
#               (`compose down` WITHOUT --volumes: database and storage
#               volumes, images and $TESTING_ROOT stay)
#   SERVICE...  stop only these services (e.g. testing-worker testing-admin)
#   -h, --help  show this help
#
# Default: `testing_compose stop` (containers kept; start again with
# `testing_compose start` or install-testing.sh / update-testing.sh).
# Never removes volumes, never touches containers of other projects or
# production (pm2, Caddy, native Postgres/Redis).
# Exit codes: 0 ok, 1 error.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

DOWN=0; SERVICES=()
while (($#)); do
  case "$1" in
    --down) DOWN=1; shift ;;
    -h|--help) print_script_help "$0"; exit 0 ;;
    -*) die "Unknown option: $1 (see --help)" ;;
    *) [[ "$1" =~ ^testing-[a-z-]+$ ]] || die "Not a testing service name: $1"; SERVICES+=("$1"); shift ;;
  esac
done

require_docker
[[ -f "$TESTING_COMPOSE_FILE" ]] || die "No installed source at $REPO_DIR"
env_files_present || die "Env files missing in $TESTING_ENV_DIR"

if (( DOWN == 1 )); then
  (( ${#SERVICES[@]} == 0 )) || die "--down applies to the whole project; do not list services."
  log_info "Removing astro_testing containers and networks (volumes and images are kept)."
  testing_compose --profile tools --profile tunnel down --remove-orphans
else
  log_info "Stopping ${SERVICES[*]:-all astro_testing services} (containers and volumes are kept)."
  testing_compose --profile tools --profile tunnel stop "${SERVICES[@]}"
fi
testing_compose --profile tools --profile tunnel ps -a
log_ok "done"
