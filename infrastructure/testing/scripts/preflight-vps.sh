#!/usr/bin/env bash
# =============================================================================
# preflight-vps.sh - READ-ONLY readiness check for the Astro Sushil TESTING
# stack on a VPS that already runs PRODUCTION (pm2 + Caddy, native Postgres
# and Redis under /opt/astro-sushil/{app,shared}).
#
# Usage:
#   sudo infrastructure/testing/scripts/preflight-vps.sh [options]
#
# Options:
#   --min-ram-gib N       minimum available RAM in GiB (default 3)
#   --rec-ram-gib N       recommended available RAM in GiB (default 4)
#   --min-disk-gib N      minimum free disk on the Docker data-root in GiB (default 12)
#   --rec-disk-gib N      recommended free disk on the Docker data-root (default 15)
#   -h, --help            show this help
#
# Environment: TESTING_ROOT (default /opt/astro-sushil/testing).
#
# Thresholds follow infrastructure/testing/docs/compose-architecture.md:
# steady state ~0.8-1.3 GiB, one PDF build adds ~0.6-1.2 GiB, so at least
# 3 GiB of RAM must be AVAILABLE beyond what production already uses
# (4 GiB recommended); 12 GiB free disk before the first build.
#
# What it does: prints OS, CPU, memory, disk, Docker/Compose versions, existing
# Docker resources, port usage, owners of 80/443, production indicators,
# firewall state and directory permissions as PASS/WARN/FAIL/INFO lines.
# It changes nothing: no packages, no files, no containers, no firewall rules.
# It never reads production env files (only checks that they exist) and never
# starts a pm2 daemon. Running as root shows more detail (process names,
# firewall rules); as a normal user those parts are reported as unknown.
#
# Exit codes: 0 = all PASS, 1 = at least one FAIL, 2 = warnings only.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MIN_RAM_GIB=3
REC_RAM_GIB=4
MIN_DISK_GIB=12
REC_DISK_GIB=15

while (($#)); do
  case "$1" in
    --min-ram-gib) MIN_RAM_GIB="${2:?}"; shift 2 ;;
    --rec-ram-gib) REC_RAM_GIB="${2:?}"; shift 2 ;;
    --min-disk-gib) MIN_DISK_GIB="${2:?}"; shift 2 ;;
    --rec-disk-gib) REC_DISK_GIB="${2:?}"; shift 2 ;;
    -h|--help) print_script_help "$0"; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

PASS=0; WARN=0; FAIL=0
pass() { PASS=$((PASS + 1)); printf 'PASS  %s\n' "$*"; }
warn() { WARN=$((WARN + 1)); printf 'WARN  %s\n' "$*"; }
fail() { FAIL=$((FAIL + 1)); printf 'FAIL  %s\n' "$*"; }
info() { printf 'INFO  %s\n' "$*"; }
section() { printf '\n## %s\n' "$*"; }

IS_ROOT=0; [[ "$(id -u)" -eq 0 ]] && IS_ROOT=1
gib() { awk -v k="$1" 'BEGIN { printf "%.1f", k / 1048576 }'; }   # KiB -> GiB

# --------------------------------------------------------------------- OS ---
section "System"
if [[ -r /etc/os-release ]]; then
  info "OS: $(. /etc/os-release && printf '%s' "${PRETTY_NAME:-unknown}")"
fi
info "Kernel: $(uname -r) ($(uname -m))"
CPUS="$(nproc 2>/dev/null || echo 1)"
if (( CPUS >= 2 )); then pass "CPU count: $CPUS"; else warn "CPU count: $CPUS (builds and PDF rendering will be slow; 2+ recommended)"; fi
info "Running as: $(id -un) (root: $([[ $IS_ROOT -eq 1 ]] && echo yes || echo no))"

# ----------------------------------------------------------------- memory ---
section "Memory"
mem_kib() { awk -v k="$1" '$1 == k":" { print $2 }' /proc/meminfo; }
MEM_TOTAL="$(mem_kib MemTotal)"; MEM_AVAIL="$(mem_kib MemAvailable)"
SWAP_TOTAL="$(mem_kib SwapTotal)"; SWAP_FREE="$(mem_kib SwapFree)"
info "RAM total $(gib "$MEM_TOTAL") GiB, available $(gib "$MEM_AVAIL") GiB; swap total $(gib "$SWAP_TOTAL") GiB, free $(gib "$SWAP_FREE") GiB"
TESTING_RUNNING=0
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  [[ -n "$(docker ps -q --filter "label=com.docker.compose.project=$TESTING_PROJECT" 2>/dev/null)" ]] && TESTING_RUNNING=1
fi
if (( TESTING_RUNNING == 1 )); then
  info "The testing stack is already running, so available RAM already excludes it."
fi
if (( MEM_AVAIL >= REC_RAM_GIB * 1048576 )); then
  pass "Available RAM $(gib "$MEM_AVAIL") GiB >= recommended ${REC_RAM_GIB} GiB (beyond what production uses now)"
elif (( MEM_AVAIL >= MIN_RAM_GIB * 1048576 )); then
  warn "Available RAM $(gib "$MEM_AVAIL") GiB: above the ${MIN_RAM_GIB} GiB minimum, below the ${REC_RAM_GIB} GiB recommendation (PDF rendering peaks may hit swap)"
else
  if (( TESTING_RUNNING == 1 )); then
    warn "Available RAM $(gib "$MEM_AVAIL") GiB < ${MIN_RAM_GIB} GiB with the testing stack running"
  else
    fail "Available RAM $(gib "$MEM_AVAIL") GiB < minimum ${MIN_RAM_GIB} GiB (includes the PDF rendering peak). Testing could starve production."
  fi
fi
if (( SWAP_TOTAL == 0 )); then warn "No swap configured (a memory spike could trigger the OOM killer on production processes)"; else pass "Swap present"; fi

# ------------------------------------------------------------------- disk ---
section "Disk"
disk_free_kib() { df -Pk "$1" 2>/dev/null | awk 'NR == 2 { print $4 }'; }
disk_dev() { df -P "$1" 2>/dev/null | awk 'NR == 2 { print $1 }'; }
nearest_existing() { local p="$1"; while [[ ! -e "$p" && "$p" != "/" ]]; do p="$(dirname "$p")"; done; printf '%s' "$p"; }
# check_disk <label> <path> <min GiB> <recommended GiB>
check_disk() {
  local label="$1" path="$2" min="$3" rec="$4" free
  path="$(nearest_existing "$path")"
  free="$(disk_free_kib "$path")"
  [[ -n "$free" ]] || { warn "$label ($path): cannot read free space"; return; }
  if (( free >= rec * 1048576 )); then pass "$label ($path): $(gib "$free") GiB free (>= ${rec} GiB)"
  elif (( free >= min * 1048576 )); then warn "$label ($path): $(gib "$free") GiB free, above the ${min} GiB minimum but below ${rec} GiB recommended"
  else fail "$label ($path): $(gib "$free") GiB free < ${min} GiB minimum"; fi
}
DOCKER_ROOT=""
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  DOCKER_ROOT="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)"
fi
TR_PARENT="$(nearest_existing "$(dirname "$TESTING_ROOT")")"
info "Root filesystem: $(gib "$(disk_free_kib /)") GiB free"
if [[ -n "$DOCKER_ROOT" ]]; then
  # Images (~4-5 GiB), build cache (2-4 GiB) and volumes live here.
  check_disk "Docker data-root (images, build cache, volumes)" "$DOCKER_ROOT" "$MIN_DISK_GIB" "$REC_DISK_GIB"
fi
if [[ -z "$DOCKER_ROOT" || "$(disk_dev "$TR_PARENT")" != "$(disk_dev "$DOCKER_ROOT")" ]]; then
  # Only source, env files, DB backups and logs live under TESTING_ROOT.
  check_disk "TESTING_ROOT parent (source, DB backups)" "$TR_PARENT" 3 5
else
  info "TESTING_ROOT parent ($TR_PARENT) is on the same filesystem as the Docker data-root"
fi

# ----------------------------------------------------------------- docker ---
section "Docker"
DOCKER_OK=0
if ! command -v docker >/dev/null 2>&1; then
  fail "docker is not installed (install Docker Engine + docker-compose-plugin; production is not affected by installing it)"
elif ! docker info >/dev/null 2>&1; then
  fail "docker is installed but the daemon is not reachable for $(id -un) (start it, use sudo, or join the docker group)"
else
  DOCKER_OK=1
  pass "Docker Engine $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo '?') reachable"
  if compose_version_ok; then pass "Docker Compose $(compose_version) (multiple --env-file supported)"
  else fail "Docker Compose v2.17+ required (found: '$(compose_version || true)')"; fi
  info "Docker data-root: ${DOCKER_ROOT:-unknown}"
fi

if (( DOCKER_OK == 1 )); then
  section "Existing Docker resources"
  info "Containers (all projects, names only):"
  docker ps -a --format '  {{.Names}}  [{{.Status}}]  project={{.Label "com.docker.compose.project"}}' 2>/dev/null | sed 's/project=$/project=-/' || true
  T_CONT="$(docker ps -a --format '{{.Names}}' --filter "label=com.docker.compose.project=$TESTING_PROJECT" 2>/dev/null | wc -l)"
  T_NET="$(docker network ls --format '{{.Name}}' 2>/dev/null | grep -c '^astro_testing' || true)"
  T_VOL="$(docker volume ls --format '{{.Name}}' 2>/dev/null | grep -c '^astro_testing' || true)"
  if (( T_CONT + T_NET + T_VOL > 0 )); then
    warn "Existing astro_testing resources: $T_CONT containers, $T_NET networks, $T_VOL volumes (a re-install reuses them; data volumes are kept)"
    docker volume ls --format '  volume {{.Name}}' 2>/dev/null | grep ' astro_testing' || true
  else
    pass "No astro_testing containers, networks or volumes yet"
  fi
fi

# ------------------------------------------------------------------ ports ---
section "Ports"
PROXY_ENV="$TESTING_ENV_DIR/proxy.env"
P_WEB=18080; P_ADM=18081; P_API=18082
if [[ -f "$PROXY_ENV" ]]; then
  P_WEB="$(env_file_get "$PROXY_ENV" TESTING_WEBSITE_PORT || true)"; P_WEB="${P_WEB:-18080}"
  P_ADM="$(env_file_get "$PROXY_ENV" TESTING_ADMIN_PORT || true)"; P_ADM="${P_ADM:-18081}"
  P_API="$(env_file_get "$PROXY_ENV" TESTING_API_PORT || true)"; P_API="${P_API:-18082}"
  info "Ports taken from $PROXY_ENV"
fi
for p in $(printf '%s\n' 18080 18081 18082 "$P_WEB" "$P_ADM" "$P_API" | sort -un); do
  if port_in_use "$p"; then
    if (( DOCKER_OK == 1 )) && port_used_by_testing "$p"; then pass "Port $p used by the astro_testing proxy (re-install)"
    else fail "Port $p already in use by: $(port_owner "$p")"; fi
  else
    pass "Port $p free"
  fi
done
for p in 80 443; do
  if port_in_use "$p"; then
    info "Port $p owner: $(port_owner "$p") (production host proxy; testing never binds it)"
  else
    info "Port $p is free (no host proxy listening)"
  fi
done

# ------------------------------------------------------- production signals ---
section "Production indicators (read-only)"
[[ -d /opt/astro-sushil/app ]] && info "Found /opt/astro-sushil/app (production code; testing never touches it)" || info "No /opt/astro-sushil/app"
if [[ -e /opt/astro-sushil/shared/api.env ]]; then
  info "Found /opt/astro-sushil/shared/api.env (production env; contents NOT read)"
else
  info "No /opt/astro-sushil/shared/api.env"
fi
if [[ "$TESTING_ROOT" == /opt/astro-sushil/app* || "$TESTING_ROOT" == /opt/astro-sushil/shared* ]]; then
  fail "TESTING_ROOT=$TESTING_ROOT is inside a production directory"
else
  pass "TESTING_ROOT=$TESTING_ROOT is separate from production directories"
fi
# pm2: inspect processes with ps only. Calling `pm2 list` could spawn a new
# pm2 daemon for this user, which is a side effect we avoid.
if ps -eo args= 2>/dev/null | grep -E '^PM2 v' >/dev/null; then
  info "pm2 daemon(s) running (user: $(ps -eo user=,args= | awk '$2 ~ /^PM2/ { print $1 }' | sort -u | tr '\n' ' '))"
fi
if ps -eo args= 2>/dev/null | grep -E 'node .*(dist/server\.js|dist/worker\.js)' | grep -v grep >/dev/null; then
  info "Production-style node processes found (dist/server.js / dist/worker.js): likely pm2 apps astro-api / astro-worker"
fi
if command -v systemctl >/dev/null 2>&1 && [[ -d /run/systemd/system ]]; then
  for unit in caddy nginx postgresql redis-server redis; do
    st="$(systemctl is-active "$unit" 2>/dev/null || true)"
    [[ "$st" == "inactive" || "$st" == "unknown" || -z "$st" ]] && continue
    info "systemd $unit: $st"
  done
fi
for p in 5432 6379 3000; do
  port_in_use "$p" && info "Port $p in use (production service; testing containers do not publish it)"
done

# --------------------------------------------------------------- firewall ---
section "Firewall (printed only, never changed)"
if (( IS_ROOT == 1 )); then
  if command -v ufw >/dev/null 2>&1; then
    info "ufw:"; ufw status 2>/dev/null | sed 's/^/    /' || true
  fi
  if command -v iptables >/dev/null 2>&1; then
    info "iptables INPUT policy/rules: $(iptables -S INPUT 2>/dev/null | wc -l) lines; first lines:"
    iptables -S INPUT 2>/dev/null | head -n 15 | sed 's/^/    /' || true
  fi
  if command -v nft >/dev/null 2>&1; then
    info "nftables tables:"; nft list tables 2>/dev/null | sed 's/^/    /' || true
  fi
  info "Note: Docker-published ports bypass ufw INPUT rules (DOCKER chain). Restrict exposure with TESTING_BIND_ADDRESS / allowlists or the cloud provider firewall."
else
  info "Run as root to show ufw / iptables / nft state."
fi

# ------------------------------------------------------------ directories ---
section "Directories"
if [[ -e "$TESTING_ROOT" ]]; then
  info "$TESTING_ROOT exists: $(stat -c '%A %U:%G' "$TESTING_ROOT")"
  for d in env data data/postgres-backup; do
    [[ -e "$TESTING_ROOT/$d" ]] || continue
    m="$(stat -c '%a' "$TESTING_ROOT/$d")"
    if [[ "$m" == "700" ]]; then pass "$TESTING_ROOT/$d mode 700"; else warn "$TESTING_ROOT/$d mode $m (expected 700)"; fi
  done
  if [[ -d "$TESTING_ENV_DIR" ]]; then
    while IFS= read -r f; do
      m="$(stat -c '%a' "$f")"
      [[ "$m" == "600" ]] || warn "$f mode $m (expected 600)"
    done < <(find "$TESTING_ENV_DIR" -maxdepth 1 -type f 2>/dev/null)
  fi
else
  parent="$(nearest_existing "$(dirname "$TESTING_ROOT")")"
  if [[ -w "$parent" ]]; then pass "$TESTING_ROOT does not exist yet; $parent is writable"
  else warn "$TESTING_ROOT does not exist yet and $parent is not writable by $(id -un) (run install with sudo)"; fi
fi
for c in openssl curl tar sha256sum; do
  command -v "$c" >/dev/null 2>&1 && pass "command $c present" || fail "command $c missing"
done
command -v git >/dev/null 2>&1 && info "git present (needed only for --git-ref updates)" || info "git not installed (bundle installs do not need it)"

# ----------------------------------------------------------------- verdict ---
section "Verdict"
printf 'PASS=%d WARN=%d FAIL=%d\n' "$PASS" "$WARN" "$FAIL"
if (( FAIL > 0 )); then
  printf 'RESULT: FAIL - resolve the FAIL lines before installing (or pass --accept-low-resources to install for RAM/disk only).\n'
  exit 1
elif (( WARN > 0 )); then
  printf 'RESULT: WARN - installable; review the warnings.\n'
  exit 2
fi
printf 'RESULT: PASS\n'
exit 0
