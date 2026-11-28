#!/usr/bin/env bash
# =============================================================================
# teardown-testing.sh - PERMANENTLY remove the Astro Sushil TESTING stack:
# containers, networks and volumes of compose project astro_testing (the
# testing database included), the astro-testing-* images, and $TESTING_ROOT.
#
# Usage:
#   sudo infrastructure/testing/scripts/teardown-testing.sh [--keep-backups] [--backups-to DIR]
#
# Options:
#   --keep-backups      move $TESTING_ROOT/data/postgres-backup out first, to
#                       <parent of TESTING_ROOT>/testing-backups-<timestamp>
#                       (or --backups-to DIR)
#   --backups-to DIR    destination for --keep-backups (must not exist yet)
#   --keep-images       do not remove the astro-testing-* images
#   -h, --help          show this help
#
# You must type:  DELETE astro_testing <TESTING_ROOT>
#
# Safety: only resources labelled com.docker.compose.project=astro_testing and
# images named astro-testing-* are removed. Shared base images (postgres,
# redis, nginx, cloudflared) are kept. Never runs docker system/volume/network/
# image prune. $TESTING_ROOT is removed only when it ends with /testing, is not
# / or /opt/astro-sushil, is not inside /opt/astro-sushil/{app,shared}, and has
# no app/ or shared/ subdirectory. A before/after list of all Docker resources
# proves nothing else was removed. Production (pm2, Caddy, native Postgres/
# Redis, /opt/astro-sushil/{app,shared}) is never touched.
# Exit codes: 0 removed, 1 error or not confirmed.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Run from a copy: this script may live inside $TESTING_ROOT/repo, which it deletes.
if [[ -z "${_TEARDOWN_COPY:-}" ]]; then
  tmpdir="$(mktemp -d)"
  cp -a "$SCRIPT_DIR/teardown-testing.sh" "$tmpdir/"
  mkdir -p "$tmpdir/lib" && cp -a "$SCRIPT_DIR/lib/common.sh" "$tmpdir/lib/"
  _TEARDOWN_COPY="$tmpdir" exec bash "$tmpdir/teardown-testing.sh" "$@"
fi
trap 'rm -rf "${_TEARDOWN_COPY:?}"' EXIT
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

KEEP_BACKUPS=0; BACKUPS_TO=""; KEEP_IMAGES=0
while (($#)); do
  case "$1" in
    --keep-backups) KEEP_BACKUPS=1; shift ;;
    --backups-to) BACKUPS_TO="${2:?}"; KEEP_BACKUPS=1; shift 2 ;;
    --keep-images) KEEP_IMAGES=1; shift ;;
    -h|--help) print_script_help "$0"; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

require_docker
assert_safe_testing_root

# second_path_check: the strict checks right before deleting files.
second_path_check() {
  local r real
  r="$TESTING_ROOT"
  [[ "$r" == */testing ]] || die "refusing: $r does not end with /testing"
  [[ "$r" != "/" && "$r" != "/opt/astro-sushil" && "$r" != "/opt/astro-sushil/" ]] || die "refusing: $r"
  [[ -d "$r" ]] || return 0
  real="$(cd "$r" && pwd -P)"
  [[ "$real" == */testing && "$real" != "/opt/astro-sushil" ]] || die "refusing: $r resolves to $real"
  [[ "$real" != /opt/astro-sushil/app* && "$real" != /opt/astro-sushil/shared* ]] || die "refusing: $real is a production path"
  [[ ! -e "$real/app" && ! -e "$real/shared" ]] || die "refusing: $real contains app/ or shared/ (looks like a production base dir)"
  [[ ! -L "$r" ]] || die "refusing: $r is a symlink"
}
second_path_check

log_warn "This permanently deletes the TESTING database, containers, volumes, astro-testing-* images and $TESTING_ROOT."
log_info "Project resources that will be removed:"
docker ps -a --filter "label=com.docker.compose.project=$TESTING_PROJECT" --format '  container {{.Names}}' >&2 || true
docker volume ls --filter "label=com.docker.compose.project=$TESTING_PROJECT" --format '  volume {{.Name}}' >&2 || true
docker network ls --filter "label=com.docker.compose.project=$TESTING_PROJECT" --format '  network {{.Name}}' >&2 || true
(( KEEP_IMAGES == 1 )) || docker image ls --format '  image {{.Repository}}:{{.Tag}}' | grep ' image astro-testing-' >&2 || true
confirm_phrase "DELETE astro_testing $TESTING_ROOT" || exit 1

BEFORE="$(docker_resource_snapshot)"

# ------------------------------------------------------- keep backups ---
if (( KEEP_BACKUPS == 1 )) && [[ -d "$TESTING_BACKUP_DIR" ]]; then
  [[ -n "$BACKUPS_TO" ]] || BACKUPS_TO="$(dirname "$TESTING_ROOT")/testing-backups-$(date -u +%Y%m%dT%H%M%SZ)"
  [[ ! -e "$BACKUPS_TO" ]] || die "$BACKUPS_TO already exists"
  [[ "$BACKUPS_TO" != "$TESTING_ROOT"* ]] || die "--backups-to must be outside $TESTING_ROOT"
  mkdir -p "$(dirname "$BACKUPS_TO")"
  mv "$TESTING_BACKUP_DIR" "$BACKUPS_TO"
  chmod 700 "$BACKUPS_TO"
  log_ok "backups moved to $BACKUPS_TO"
fi

# ------------------------------------------------------ docker resources ---
if [[ -f "$TESTING_COMPOSE_FILE" ]] && env_files_present; then
  testing_compose --profile tools --profile tunnel down --volumes --remove-orphans || log_warn "compose down failed; falling back to label-based removal"
fi
# Label-based cleanup of anything left (e.g. compose file already gone).
mapfile -t ids < <(docker ps -aq --filter "label=com.docker.compose.project=$TESTING_PROJECT")
(( ${#ids[@]} == 0 )) || docker rm -f "${ids[@]}" >/dev/null
mapfile -t vols < <(docker volume ls -q --filter "label=com.docker.compose.project=$TESTING_PROJECT")
(( ${#vols[@]} == 0 )) || docker volume rm "${vols[@]}" >/dev/null
mapfile -t nets < <(docker network ls -q --filter "label=com.docker.compose.project=$TESTING_PROJECT")
(( ${#nets[@]} == 0 )) || docker network rm "${nets[@]}" >/dev/null
if (( KEEP_IMAGES == 0 )); then
  mapfile -t imgs < <(docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E '^astro-testing-(api|admin|website):' || true)
  for img in "${imgs[@]}"; do
    docker image rm "$img" >/dev/null && log_ok "removed image $img" || log_warn "could not remove image $img (in use?)"
  done
fi

# ------------------------------------------------------------ files ---
second_path_check
if [[ -d "$TESTING_ROOT" ]]; then
  rm -rf --one-file-system -- "$TESTING_ROOT"
  log_ok "removed $TESTING_ROOT"
fi

# --------------------------------------------------------- proof ---
AFTER="$(docker_resource_snapshot)"
removed="$(comm -23 <(printf '%s\n' "$BEFORE") <(printf '%s\n' "$AFTER"))"
unexpected="$(grep -vE "^(container|volume|network) ${TESTING_PROJECT}[-_]|^image astro-testing-" <<<"$removed" || true)"
log_info "Removed Docker resources:"
printf '%s\n' "${removed:-  (none)}" | sed 's/^/  /' >&2
if [[ -n "$unexpected" ]]; then
  log_error "Unexpected resources disappeared during teardown (investigate; possibly removed by something else):"
  printf '%s\n' "$unexpected" | sed 's/^/  /' >&2
  exit 1
fi
left="$(docker ps -aq --filter "label=com.docker.compose.project=$TESTING_PROJECT"; docker volume ls -q --filter "label=com.docker.compose.project=$TESTING_PROJECT")"
[[ -z "$left" ]] || die "astro_testing resources still present: $left"
log_ok "teardown complete; no resources of other projects were removed"
