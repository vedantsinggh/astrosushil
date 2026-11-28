#!/usr/bin/env bash
# =============================================================================
# install-testing.sh - install (or re-run / repair) the Astro Sushil TESTING
# stack under $TESTING_ROOT on a VPS that also runs PRODUCTION.
#
# Usage (on the VPS, normally with sudo):
#   sudo ./install-testing.sh --bundle /root/astro-sushil-testing-<sha>-<ts>.tar.gz
#   sudo ./install-testing.sh --source-dir /path/to/extracted-bundle-or-git-checkout
#   sudo ./install-testing.sh                      # re-run with the installed repo
#
# Options:
#   --source-dir DIR        install source from an extracted bundle (MANIFEST.txt)
#                           or a git checkout (tracked files of HEAD only)
#   --bundle FILE.tar.gz    install source from a bundle; FILE.tar.gz.sha256 must
#                           sit next to it and match
#   --restore-backup FILE   restore this pg_dump into the testing DB (calls
#                           restore-testing-db.sh, which asks for confirmation)
#   --apply-migrations      run `prisma migrate deploy` against the testing DB
#   --skip-build            do not build images (use the existing astro-testing-*)
#   --accept-low-resources  continue when RAM/disk are below the minimum
#                           (nothing is ever stopped or killed to make room)
#   --detect-ip             look up this VPS's public IP (https://api.ipify.org)
#                           to print reachable URLs
#   --yes                   answer yes to NON-destructive prompts only
#   -h, --help              show this help
#
# Environment: TESTING_ROOT (default /opt/astro-sushil/testing).
#
# Steps: 1 prerequisites, 2 options, 3 destination, 4 ports, 5 resources,
# 6 directories, 7 source, 8 env files (generated only when missing; existing
# files are never overwritten), 9 basic-auth htpasswd, 10 env validation (stops
# until every __SET_ME__ is filled), 11 proxy access files, 12 build,
# 13 postgres, 14 optional restore, 15 DB verification, 16 migrations,
# 17 redis, 18 api + worker, 19 admin + website, 20 proxy, 21 verify + summary.
#
# Safety: touches only $TESTING_ROOT and Docker resources of the compose
# project astro_testing. Never stops/kills other processes, never edits the
# firewall, host Caddy/Nginx, /opt/astro-sushil/{app,shared}, or production
# env files, never prunes Docker resources, never removes volumes.
# Re-runs are idempotent: existing env files, htpasswd and data are kept.
#
# Exit codes: 0 installed and verified, 1 error, 3 stopped: fill env values
# and re-run, 4 installed but verification reported failures.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

SOURCE_DIR=""; BUNDLE=""; RESTORE_BACKUP=""; APPLY_MIGRATIONS=0; SKIP_BUILD=0
ACCEPT_LOW=0; DETECT_IP=0; ASSUME_YES=0
MIN_RAM_GIB=3; MIN_DISK_GIB=12
HEALTH_TIMEOUT="${TESTING_HEALTH_TIMEOUT:-300}"

while (($#)); do
  case "$1" in
    --source-dir) SOURCE_DIR="${2:?--source-dir needs a path}"; shift 2 ;;
    --bundle) BUNDLE="${2:?--bundle needs a file}"; shift 2 ;;
    --restore-backup) RESTORE_BACKUP="${2:?--restore-backup needs a file}"; shift 2 ;;
    --apply-migrations) APPLY_MIGRATIONS=1; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --accept-low-resources) ACCEPT_LOW=1; shift ;;
    --detect-ip) DETECT_IP=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    -h|--help) print_script_help "$0"; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done
export ASSUME_YES

on_err() { log_error "install-testing.sh failed at line $1. Nothing outside $TESTING_ROOT and project $TESTING_PROJECT was changed. Fix the cause and re-run."; }
trap 'on_err $LINENO' ERR

# Scripts of the INSTALLED source (fall back to this script's directory).
repo_script() {
  local name="$1"
  if [[ -x "$REPO_DIR/infrastructure/testing/scripts/$name" || -f "$REPO_DIR/infrastructure/testing/scripts/$name" ]]; then
    printf '%s' "$REPO_DIR/infrastructure/testing/scripts/$name"
  else
    printf '%s' "$SCRIPT_DIR/$name"
  fi
}

# ------------------------------------------------------------ 1 prereqs ---
log_step "[01/21] Prerequisites"
require_cmd openssl curl tar sha256sum awk sed grep stat mktemp
require_docker
log_ok "docker $(docker version --format '{{.Server.Version}}' 2>/dev/null), compose $(compose_version), openssl, curl, tar present"

# ------------------------------------------------------------ 2 options ---
log_step "[02/21] Options"
[[ -z "$SOURCE_DIR" || -z "$BUNDLE" ]] || die "Use either --source-dir or --bundle, not both."
if [[ -n "$BUNDLE" ]]; then
  [[ -f "$BUNDLE" ]] || die "Bundle not found: $BUNDLE"
  [[ -f "$BUNDLE.sha256" ]] || die "Checksum file not found: $BUNDLE.sha256"
  BUNDLE="$(cd "$(dirname "$BUNDLE")" && pwd -P)/$(basename "$BUNDLE")"
fi
if [[ -n "$RESTORE_BACKUP" ]]; then
  [[ -f "$RESTORE_BACKUP" ]] || die "Backup not found: $RESTORE_BACKUP"
  [[ -f "$RESTORE_BACKUP.sha256" ]] || die "Backup checksum not found: $RESTORE_BACKUP.sha256"
  RESTORE_BACKUP="$(cd "$(dirname "$RESTORE_BACKUP")" && pwd -P)/$(basename "$RESTORE_BACKUP")"
fi
if [[ -z "$SOURCE_DIR" && -z "$BUNDLE" && ! -f "$TESTING_COMPOSE_FILE" ]]; then
  # Running from an extracted bundle or a checkout: offer that as the source.
  self_root="$(cd "$SCRIPT_DIR/../../.." && pwd -P)"
  if [[ -f "$self_root/docker-compose.testing.yml" && "$self_root" != "$(cd "$REPO_DIR" 2>/dev/null && pwd -P || true)" ]]; then
    confirm_yes "No source installed yet. Install from $self_root?" || die "Pass --bundle or --source-dir."
    SOURCE_DIR="$self_root"
  else
    die "No source installed at $REPO_DIR. Pass --bundle <file> or --source-dir <dir>."
  fi
fi
log_ok "options valid"

# -------------------------------------------------------- 3 destination ---
log_step "[03/21] Destination $TESTING_ROOT"
assert_safe_testing_root
if [[ -d "$TESTING_ROOT" ]]; then
  if [[ -f "$TESTING_DEPLOY_DIR/install-state.env" || -d "$TESTING_ENV_DIR" ]]; then
    log_info "Existing testing install found: re-run (env files and data are kept)."
  elif [[ -n "$(ls -A "$TESTING_ROOT" 2>/dev/null)" ]]; then
    log_warn "$TESTING_ROOT exists, is not empty and has no install state."
    confirm_yes "Use $TESTING_ROOT anyway (nothing in it is deleted)?" || die "Choose another TESTING_ROOT."
  fi
else
  parent="$(dirname "$TESTING_ROOT")"
  while [[ ! -e "$parent" ]]; do parent="$(dirname "$parent")"; done
  [[ -w "$parent" ]] || die "Cannot create $TESTING_ROOT ($parent not writable). Run with sudo."
fi
log_ok "destination ok"

# -------------------------------------------------------------- 4 ports ---
check_ports() {
  local web=18080 adm=18081 api=18082 p bad=0
  if [[ -f "$TESTING_ENV_DIR/proxy.env" ]]; then
    web="$(env_file_get "$TESTING_ENV_DIR/proxy.env" TESTING_WEBSITE_PORT || true)"; web="${web:-18080}"
    adm="$(env_file_get "$TESTING_ENV_DIR/proxy.env" TESTING_ADMIN_PORT || true)"; adm="${adm:-18081}"
    api="$(env_file_get "$TESTING_ENV_DIR/proxy.env" TESTING_API_PORT || true)"; api="${api:-18082}"
  fi
  for p in "$web" "$adm" "$api"; do
    if port_in_use "$p" && ! port_used_by_testing "$p"; then
      log_error "Port $p is used by another process: $(port_owner "$p")"
      bad=1
    fi
  done
  (( bad == 0 )) || die "Pick free ports in $TESTING_ENV_DIR/proxy.env (TESTING_*_PORT). Nothing is stopped to free a port."
  log_ok "ports $web/$adm/$api available (or already used by astro_testing)"
}
log_step "[04/21] Ports"
check_ports

# ---------------------------------------------------------- 5 resources ---
log_step "[05/21] Resources"
mem_avail_kib="$(awk '$1 == "MemAvailable:" { print $2 }' /proc/meminfo)"
docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /var/lib/docker)"
disk_free_kib="$(df -Pk "$docker_root" 2>/dev/null | awk 'NR == 2 { print $4 }')"
testing_running=0
[[ -n "$(docker ps -q --filter "label=com.docker.compose.project=$TESTING_PROJECT")" ]] && testing_running=1
low=0
if (( mem_avail_kib < MIN_RAM_GIB * 1048576 )); then
  if (( testing_running == 1 )); then
    log_warn "Available RAM $((mem_avail_kib / 1024)) MiB with the testing stack already running."
  else
    log_warn "Available RAM $((mem_avail_kib / 1024)) MiB < ${MIN_RAM_GIB} GiB needed beyond production (steady state + one PDF build)."
    low=1
  fi
fi
if (( ${disk_free_kib:-0} < MIN_DISK_GIB * 1048576 )); then
  log_warn "Free disk on $docker_root: $(( ${disk_free_kib:-0} / 1048576 )) GiB < ${MIN_DISK_GIB} GiB (images + build cache)."
  low=1
fi
if (( low == 1 )); then
  if (( ACCEPT_LOW == 1 )); then
    log_warn "--accept-low-resources given: continuing. Production could be slowed or hit by the OOM killer."
  else
    die "Insufficient resources for testing next to production. Free resources yourself or re-run with --accept-low-resources. Nothing was changed."
  fi
else
  log_ok "RAM available $((mem_avail_kib / 1024)) MiB, disk free $(( ${disk_free_kib:-0} / 1048576 )) GiB"
fi

# -------------------------------------------------------- 6 directories ---
log_step "[06/21] Directories"
umask 027
mkdir -p "$TESTING_ROOT"; chmod 755 "$TESTING_ROOT"
ensure_dir "$TESTING_ENV_DIR" 700
ensure_dir "$TESTING_DATA_DIR" 700
ensure_dir "$TESTING_BACKUP_DIR" 700
ensure_dir "$TESTING_DATA_DIR/storage" 700
ensure_dir "$TESTING_NGINX_DIR" 755
ensure_dir "$TESTING_LOG_DIR" 750
ensure_dir "$TESTING_DEPLOY_DIR" 700
log_ok "env/ data/ data/postgres-backup/ (700), nginx/ logs/ deployment/ ready"

# ------------------------------------------------------------- 7 source ---
log_step "[07/21] Source"
if [[ -n "$BUNDLE" ]]; then
  install_repo_from_source --bundle "$BUNDLE"
elif [[ -n "$SOURCE_DIR" ]]; then
  if [[ -d "$REPO_DIR" && "$(cd "$SOURCE_DIR" && pwd -P)" == "$(cd "$REPO_DIR" && pwd -P)" ]]; then
    log_info "Source dir is the installed repo; nothing to copy."
  else
    install_repo_from_source --source-dir "$SOURCE_DIR"
  fi
else
  log_info "Using installed source: $(repo_version_string)"
fi
[[ -f "$TESTING_COMPOSE_FILE" ]] || die "Missing $TESTING_COMPOSE_FILE"
ENV_EXAMPLES="$REPO_DIR/infrastructure/testing/env"
for f in api postgres build proxy; do
  [[ -f "$ENV_EXAMPLES/$f.env.example" ]] || die "Missing $ENV_EXAMPLES/$f.env.example in the installed source."
done

# ---------------------------------------------------------- 8 env files ---
log_step "[08/21] Env files"
gen_hex() { openssl rand -hex "$1"; }

# generate_env_file <example> <dest>: copy example, fill __GENERATE__ values.
generate_env_file() {
  local example="$1" dest="$2" line key val out generated=()
  if [[ -f "$dest" ]]; then
    log_info "kept existing $(basename "$dest")"
    chmod 600 "$dest"
    return 0
  fi
  out="$(mktemp "$TESTING_ENV_DIR/.$(basename "$dest").XXXXXX")"
  chmod 600 "$out"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if _env_parse_line "$line" && [[ "$_ENV_VAL" == "__GENERATE__" ]]; then
      key="$_ENV_KEY"
      case "$key" in
        POSTGRES_PASSWORD) val="$(gen_hex 24)" ;;
        JWT_SECRET) val="$(gen_hex 48)" ;;
        STORAGE_SECRET) val="$(gen_hex 32)" ;;
        DATABASE_URL)
          local pg="$TESTING_ENV_DIR/postgres.env" u d p
          u="$(env_file_get "$pg" POSTGRES_USER || true)"; u="${u:-astro_testing}"
          d="$(env_file_get "$pg" POSTGRES_DB || true)"; d="${d:-astro_sushil_testing}"
          p="$(env_file_get "$pg" POSTGRES_PASSWORD || true)"
          [[ -n "$p" && "$p" != "__GENERATE__" ]] || { rm -f "$out"; die "postgres.env has no POSTGRES_PASSWORD; cannot compose DATABASE_URL."; }
          [[ "$p" =~ ^[A-Za-z0-9._~-]+$ ]] || { rm -f "$out"; die "POSTGRES_PASSWORD has URL-unsafe characters; set DATABASE_URL in api.env by hand."; }
          val="postgresql://$u:$p@testing-postgres:5432/$d?schema=public" ;;
        *) val="$(gen_hex 32)" ;;
      esac
      printf '%s=%s\n' "$key" "$val" >>"$out"
      generated+=("$key")
    else
      printf '%s\n' "$line" >>"$out"
    fi
  done <"$example"
  mv -f "$out" "$dest"
  chmod 600 "$dest"
  if (( ${#generated[@]} > 0 )); then
    log_ok "created $(basename "$dest") (generated: ${generated[*]})"
  else
    log_ok "created $(basename "$dest")"
  fi
}

pgdata_volume="$(docker volume ls -q --filter "label=com.docker.compose.project=$TESTING_PROJECT" --filter "label=com.docker.compose.volume=testing_pgdata" | head -n 1)"
if [[ ! -f "$TESTING_ENV_DIR/postgres.env" && -n "$pgdata_volume" ]]; then
  die "postgres.env is missing but volume $pgdata_volume already holds a database initialised with the old password. Restore postgres.env from your notes, or remove the testing DB deliberately (reset-testing-db.sh / teardown-testing.sh)."
fi
if [[ ! -f "$TESTING_ENV_DIR/postgres.env" && -f "$TESTING_ENV_DIR/api.env" ]]; then
  die "api.env exists but postgres.env is missing: a new password would not match DATABASE_URL. Restore postgres.env or move api.env away first."
fi
generate_env_file "$ENV_EXAMPLES/postgres.env.example" "$TESTING_ENV_DIR/postgres.env"
generate_env_file "$ENV_EXAMPLES/build.env.example" "$TESTING_ENV_DIR/build.env"
generate_env_file "$ENV_EXAMPLES/proxy.env.example" "$TESTING_ENV_DIR/proxy.env"
generate_env_file "$ENV_EXAMPLES/api.env.example" "$TESTING_ENV_DIR/api.env"
chmod 600 "$TESTING_ENV_DIR"/*.env

# ----------------------------------------------------------- 9 htpasswd ---
log_step "[09/21] Basic auth"
PROXY_ENV="$TESTING_ENV_DIR/proxy.env"
basic_enabled="$(env_file_get "$PROXY_ENV" TESTING_BASIC_AUTH_ENABLED || true)"; basic_enabled="${basic_enabled:-true}"
basic_user="$(env_file_get "$PROXY_ENV" TESTING_BASIC_AUTH_USER || true)"; basic_user="${basic_user:-client}"
[[ "$basic_user" =~ ^[A-Za-z0-9._-]{1,64}$ ]] || die "TESTING_BASIC_AUTH_USER must match [A-Za-z0-9._-]{1,64}."
HTPASSWD="$TESTING_NGINX_DIR/htpasswd"
CRED_FILE="$TESTING_ENV_DIR/basic-auth.txt"
if [[ "${basic_enabled,,}" == "true" ]]; then
  if [[ -s "$HTPASSWD" ]]; then
    log_info "kept existing htpasswd"
    [[ -f "$CRED_FILE" ]] || log_warn "$CRED_FILE is missing; the password is unknown. Delete $HTPASSWD and re-run to generate a new one."
  else
    pw="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)"
    hash="$(printf '%s\n' "$pw" | openssl passwd -apr1 -stdin)"
    ( umask 077; printf 'user=%s\npassword=%s\n' "$basic_user" "$pw" >"$CRED_FILE" )
    chmod 600 "$CRED_FILE"
    printf '%s:%s\n' "$basic_user" "$hash" | write_file_atomic "$HTPASSWD" 640
    unset pw hash
    log_ok "generated htpasswd for user '$basic_user'; password stored in $CRED_FILE (mode 600)"
  fi
  # nginx workers (uid 101 in nginx:alpine) read htpasswd per request.
  if [[ "$(id -u)" -eq 0 ]]; then
    chgrp 101 "$HTPASSWD" && chmod 640 "$HTPASSWD"
  else
    chmod 644 "$HTPASSWD"
    log_warn "not root: htpasswd made world-readable (hash only) so the nginx worker can read it"
  fi
else
  log_warn "TESTING_BASIC_AUTH_ENABLED=false: website and admin are open to anyone who can reach the ports."
fi

# -------------------------------------------------------- 10 validation ---
log_step "[10/21] Validate configuration"
if ! validate_testing_env; then
  if [[ -n "$VALIDATE_PLACEHOLDER_KEYS" ]]; then
    cat >&2 <<EOT

ACTION REQUIRED: fill the values marked __SET_ME__ (and fix the errors above), then re-run:
  sudo editor $TESTING_ENV_DIR/api.env      # Gemini key, testing bucket, Razorpay TEST keys,
                                            # public URLs, CORS_ORIGIN, TESTING_FORBIDDEN_BUCKETS
  sudo editor $TESTING_ENV_DIR/proxy.env    # ports, bind address, public URLs, allowlist
  sudo $0
Nothing was built or started. Existing env files are never overwritten by a re-run.
EOT
    trap - ERR
    exit 3
  fi
  die "Configuration invalid (see errors above). Nothing was built or started."
fi
log_ok "configuration valid ($VALIDATE_WARNS warning(s))"
check_ports   # proxy.env may define other ports than the defaults

# ------------------------------------------------- 11 proxy access files ---
log_step "[11/21] Proxy access files"
bash "$(repo_script render-proxy-access.sh)"

# -------------------------------------------------------------- 12 build ---
log_step "[12/21] Build images"
if (( SKIP_BUILD == 1 )); then
  log_info "--skip-build: using existing images"
else
  log_info "Building astro-testing-api / -admin / -website (several minutes; build cache stays in Docker)."
  testing_compose build
fi

# ----------------------------------------------------------- 13 postgres ---
log_step "[13/21] Postgres"
testing_compose up -d --no-build testing-postgres
wait_service_healthy testing-postgres "$HEALTH_TIMEOUT" || die "testing-postgres is not healthy: testing_compose logs testing-postgres"

# ------------------------------------------------------------ 14 restore ---
log_step "[14/21] Database restore"
RESTORED=0
if [[ -n "$RESTORE_BACKUP" ]]; then
  # restore-testing-db.sh reads dumps from data/postgres-backup (mounted at /backups).
  backup_real_dir="$(cd "$TESTING_BACKUP_DIR" && pwd -P)"
  if [[ "$(dirname "$RESTORE_BACKUP")" != "$backup_real_dir" ]]; then
    dest="$TESTING_BACKUP_DIR/$(basename "$RESTORE_BACKUP")"
    [[ ! -e "$dest" ]] || sha256_verify "$dest" "$RESTORE_BACKUP.sha256" || die "$dest exists with different content; refusing to overwrite."
    if [[ ! -e "$dest" ]]; then
      for ext in "" .sha256 .meta; do
        [[ -f "$RESTORE_BACKUP$ext" ]] && install -m 600 "$RESTORE_BACKUP$ext" "$dest$ext"
      done
      log_info "copied backup into $TESTING_BACKUP_DIR"
    fi
    RESTORE_BACKUP="$dest"
  fi
  bash "$(repo_script restore-testing-db.sh)" --backup "$RESTORE_BACKUP"
  RESTORED=1
else
  log_info "no --restore-backup given: database left as it is"
fi

# ------------------------------------------------------- 15 verify DB ---
log_step "[15/21] Database verification"
table_count="$(testing_compose exec -T testing-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select count(*) from information_schema.tables where table_schema = current_schema()"' 2>/dev/null | tr -dc '0-9' || true)"
table_count="${table_count:-0}"
if (( RESTORED == 1 || table_count > 0 )); then
  if [[ -f "$(repo_script verify-database.sh)" ]]; then
    bash "$(repo_script verify-database.sh)" || log_warn "verify-database.sh reported problems (see above)."
  else
    log_warn "verify-database.sh not found in the installed source; skipped."
  fi
else
  log_info "database is empty (0 public tables); nothing to verify yet"
fi

# --------------------------------------------------------- 16 migrations ---
log_step "[16/21] Migrations"
migrate_status() {
  testing_compose --profile tools run --rm -T testing-migrate npx prisma migrate status --schema prisma/schema.prisma
}
if migrate_status; then
  log_ok "database schema is up to date"
else
  if (( APPLY_MIGRATIONS == 1 )); then
    log_info "--apply-migrations: running prisma migrate deploy on the TESTING database"
    testing_compose --profile tools run --rm -T testing-migrate
    migrate_status || die "migrations still pending or failing after deploy"
    log_ok "migrations applied"
  else
    log_warn "migrations are pending (or status failed). The API will report not-ready until you re-run with --apply-migrations."
  fi
fi

# --------------------------------------------------------------- 17 redis ---
log_step "[17/21] Redis"
testing_compose up -d --no-build testing-redis
wait_service_healthy testing-redis "$HEALTH_TIMEOUT" || die "testing-redis is not healthy"

# ------------------------------------------------------- 18 api + worker ---
log_step "[18/21] API and worker"
testing_compose up -d --no-build testing-api testing-worker
wait_service_healthy testing-api "$HEALTH_TIMEOUT" || die "testing-api is not healthy: testing_compose logs --tail 100 testing-api"
wait_service_healthy testing-worker "$HEALTH_TIMEOUT" || die "testing-worker is not healthy: testing_compose logs --tail 100 testing-worker"

# ---------------------------------------------------- 19 admin + website ---
log_step "[19/21] Admin and website"
testing_compose up -d --no-build testing-admin testing-website
wait_service_healthy testing-admin "$HEALTH_TIMEOUT" || die "testing-admin is not healthy"
wait_service_healthy testing-website "$HEALTH_TIMEOUT" || die "testing-website is not healthy"

# --------------------------------------------------------------- 20 proxy ---
log_step "[20/21] Proxy"
testing_compose up -d --no-build testing-proxy
wait_service_healthy testing-proxy "$HEALTH_TIMEOUT" || die "testing-proxy is not healthy: testing_compose logs testing-proxy"

write_install_state install

# -------------------------------------------------------------- 21 verify ---
log_step "[21/21] Verify"
VERIFY_RC=0
bash "$(repo_script verify-testing.sh)" --no-public || VERIFY_RC=$?

web_port="$(env_file_get "$PROXY_ENV" TESTING_WEBSITE_PORT || true)"; web_port="${web_port:-18080}"
adm_port="$(env_file_get "$PROXY_ENV" TESTING_ADMIN_PORT || true)"; adm_port="${adm_port:-18081}"
api_port="$(env_file_get "$PROXY_ENV" TESTING_API_PORT || true)"; api_port="${api_port:-18082}"
pub_web="$(env_file_get "$PROXY_ENV" TESTING_PUBLIC_WEBSITE_URL || true)"
pub_adm="$(env_file_get "$PROXY_ENV" TESTING_PUBLIC_ADMIN_URL || true)"
pub_api="$(env_file_get "$PROXY_ENV" TESTING_PUBLIC_API_URL || true)"
host_label="<VPS-IP>"
if (( DETECT_IP == 1 )); then
  ip="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
  [[ "$ip" =~ ^[0-9a-fA-F.:]+$ ]] && host_label="$ip" || log_warn "public IP lookup failed"
fi

cat <<EOT

============================================================================
Astro Sushil TESTING stack installed: $(repo_version_string)

Direct (raw IP, plain HTTP: reachability and public pages only; login needs HTTPS):
  website  http://$host_label:$web_port/
  admin    http://$host_label:$adm_port/
  api      http://127.0.0.1:$api_port/  (host-local only; for the host proxy)
Public URLs (proxy.env):
  website  ${pub_web:-(TESTING_PUBLIC_WEBSITE_URL not set)}
  admin    ${pub_adm:-(TESTING_PUBLIC_ADMIN_URL not set)}
  api      ${pub_api:-(TESTING_PUBLIC_API_URL not set)}

Basic auth (website + admin): credentials in $CRED_FILE (mode 600)
  sudo cat $CRED_FILE

Next steps (NOT executed by this script):
  1. Firewall - open the testing ports only if you use raw-IP access, e.g.
       sudo ufw allow $web_port/tcp && sudo ufw allow $adm_port/tcp
     Note: Docker-published ports bypass ufw INPUT rules. Prefer the cloud
     provider's firewall, TESTING_ALLOWED_CIDRS, or TESTING_BIND_ADDRESS=127.0.0.1
     behind the host proxy.
  2. HTTPS - route test hostnames through the existing host proxy
     (infrastructure/testing/host-proxy/, docs/public-access.md) or use the
     'tunnel' compose profile.
     Then set CORS_ORIGIN / PUBLIC_API_URL / FRONTEND_URL / ADMIN_URL in
     $TESTING_ENV_DIR/api.env and run: update-testing.sh --restart-only
  3. Invoice numbering - read infrastructure/testing/docs/invoice-counter.md
     before taking test payments.
  4. Re-check any time: $(repo_script verify-testing.sh)
============================================================================
EOT
trap - ERR
if (( VERIFY_RC == 2 )); then
  log_warn "verification passed with warnings; review the WARN lines above."
elif (( VERIFY_RC != 0 )); then
  log_warn "verification reported failures (exit $VERIFY_RC); see the summary above."
  exit 4
fi
exit 0
