#!/usr/bin/env bash
# =============================================================================
# verify-testing.sh - health and safety checks of the running Astro Sushil
# TESTING stack (compose project astro_testing only).
#
# Usage:
#   sudo infrastructure/testing/scripts/verify-testing.sh [options]
#
# Options:
#   --no-public             skip checks that go out to public URLs / HTTPS
#   --public-url URL        also fetch URL from this VPS (repeatable); 200 or
#                           401 (basic auth) counts as reachable
#   --storage-write-test    upload, read back and delete one tiny object under
#                           healthchecks/ in the TESTING bucket (opt-in)
#   --skip-db-verify        do not run verify-database.sh
#   -h, --help              show this help
#
# Checks: env validation; container state/health (astro_testing only);
# postgres SELECT 1; redis PING; API /health + /ready (inside the API
# container and through the proxy); worker health + recent log errors;
# website/admin through the proxy ports (401 without credentials = protected,
# 200 with the credentials from env/basic-auth.txt); proxy /healthz;
# X-Robots-Tag header; no api./backend.astrosushil.com in the website build
# or admin client bundle; GET /api/v1/auth/csrf (no login); storage provider and
# bucket name (no secrets); PDF toolchain + Noto fonts in the worker; HTTPS
# certificate expiry for https TESTING_PUBLIC_*_URL values; verify-database.sh.
#
# It never logs in, sends messages, creates orders or triggers reports. The
# only write is the opt-in --storage-write-test object (deleted again).
#
# Exit codes: 0 all PASS, 1 at least one FAIL, 2 warnings only.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

NO_PUBLIC=0; STORAGE_WRITE=0; SKIP_DB=0; PUBLIC_URLS=()
while (($#)); do
  case "$1" in
    --no-public) NO_PUBLIC=1; shift ;;
    --public-url) PUBLIC_URLS+=("${2:?--public-url needs a URL}"); shift 2 ;;
    --storage-write-test) STORAGE_WRITE=1; shift ;;
    --skip-db-verify) SKIP_DB=1; shift ;;
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

require_cmd curl openssl
require_docker
[[ -f "$TESTING_COMPOSE_FILE" ]] || die "No installed source at $REPO_DIR"
env_files_present || die "Env files missing in $TESTING_ENV_DIR (run install-testing.sh)"

PROXY_ENV="$TESTING_ENV_DIR/proxy.env"
pget() { env_file_get "$PROXY_ENV" "$1" || true; }
WEB_PORT="$(pget TESTING_WEBSITE_PORT)"; WEB_PORT="${WEB_PORT:-18080}"
ADM_PORT="$(pget TESTING_ADMIN_PORT)"; ADM_PORT="${ADM_PORT:-18081}"
API_PORT="$(pget TESTING_API_PORT)"; API_PORT="${API_PORT:-18082}"
BIND="$(pget TESTING_BIND_ADDRESS)"; BIND="${BIND:-0.0.0.0}"
LOCAL_HOST="127.0.0.1"; [[ "$BIND" == "0.0.0.0" || "$BIND" == "127.0.0.1" || -z "$BIND" ]] || LOCAL_HOST="$BIND"
BASIC="$(pget TESTING_BASIC_AUTH_ENABLED)"; BASIC="${BASIC:-true}"; BASIC="${BASIC,,}"
ALLOWLIST="$(pget TESTING_ALLOWED_CIDRS)"
CRED_FILE="$TESTING_ENV_DIR/basic-auth.txt"
BA_USER=""; BA_PASS=""
if [[ -r "$CRED_FILE" ]]; then
  BA_USER="$(env_file_get "$CRED_FILE" user || true)"
  BA_PASS="$(env_file_get "$CRED_FILE" password || true)"
fi

# http_code <url> [auth]: status code; credentials go through stdin (-K), never argv.
http_code() {
  local url="$1" auth="${2:-}"
  if [[ "$auth" == "auth" && -n "$BA_USER" ]]; then
    printf 'user = "%s:%s"\n' "$BA_USER" "$BA_PASS" | curl -K - -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" || printf '000'
  else
    curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" || printf '000'
  fi
}
http_headers() {
  local url="$1"
  if [[ -n "$BA_USER" ]]; then
    printf 'user = "%s:%s"\n' "$BA_USER" "$BA_PASS" | curl -K - -s -D - -o /dev/null --max-time 15 "$url" || true
  else
    curl -s -D - -o /dev/null --max-time 15 "$url" || true
  fi
}

# --------------------------------------------------------------- config ---
section "Configuration"
if validate_testing_env 2>&1; then
  if (( VALIDATE_WARNS > 0 )); then warn "env validation: $VALIDATE_WARNS warning(s) (see above)"; else pass "env files valid"; fi
else
  fail "env validation: $VALIDATE_FAILS error(s) (see above)"
fi
info "source: $(repo_version_string)"

# ----------------------------------------------------------- containers ---
section "Containers (project $TESTING_PROJECT)"
for svc in testing-postgres testing-redis testing-api testing-worker testing-admin testing-website testing-proxy; do
  st="$(container_health "$svc")"
  case "$st" in
    healthy) pass "$svc healthy" ;;
    running) warn "$svc running (no health status)" ;;
    starting) warn "$svc still starting" ;;
    *) fail "$svc: $st" ;;
  esac
done
others="$(docker ps -a --filter "label=com.docker.compose.project=$TESTING_PROJECT" --format '{{.Label "com.docker.compose.service"}} {{.State}}' | awk '$1 !~ /^testing-(postgres|redis|api|worker|admin|website|proxy)$/')"
[[ -z "$others" ]] || info "other project containers: $(tr '\n' ';' <<<"$others")"

# ------------------------------------------------------------- data tier ---
section "Postgres and Redis"
if [[ -n "$(testing_container_id testing-postgres)" ]]; then
  r="$(testing_compose exec -T testing-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select 1"' 2>/dev/null | tr -d '[:space:]' || true)"
  [[ "$r" == "1" ]] && pass "postgres SELECT 1" || fail "postgres SELECT 1 failed"
else
  fail "postgres not running"
fi
if [[ -n "$(testing_container_id testing-redis)" ]]; then
  r="$(testing_compose exec -T testing-redis redis-cli ping 2>/dev/null | tr -d '[:space:]' || true)"
  [[ "$r" == "PONG" ]] && pass "redis PING" || fail "redis PING failed"
else
  fail "redis not running"
fi

# ------------------------------------------------------------------ API ---
section "API"
api_inside() {
  # Prints the HTTP status of a GET from inside the API container.
  testing_compose exec -T testing-api node -e "fetch('http://127.0.0.1:3000$1').then(r=>{console.log(r.status)}).catch(()=>console.log(0))" 2>/dev/null | tr -dc '0-9' || true
}
if [[ -n "$(testing_container_id testing-api)" ]]; then
  c="$(api_inside /health)"; [[ "$c" == "200" ]] && pass "API /health (in container) 200" || fail "API /health (in container): ${c:-none}"
  c="$(api_inside /ready)"; [[ "$c" == "200" ]] && pass "API /ready (in container) 200" || fail "API /ready (in container): ${c:-none} (database migrated? redis up?)"
else
  fail "testing-api not running"
fi
c="$(http_code "http://127.0.0.1:$API_PORT/api/v1/auth/csrf")"
case "$c" in
  200|401) pass "GET /api/v1/auth/csrf via proxy api port $API_PORT: $c (API reachable; 401 = no browser session, expected)" ;;
  403) warn "GET /api/v1/auth/csrf via api port: 403 (allowlist blocks the host; add the Docker gateway to TESTING_ALLOWED_CIDRS)" ;;
  *) fail "GET /api/v1/auth/csrf via api port $API_PORT: $c" ;;
esac
c="$(http_code "http://127.0.0.1:$API_PORT/health")"
case "$c" in
  200) pass "proxy api port /health 200" ;;
  404) info "proxy api port does not expose /health (only /api/)" ;;
  *) warn "proxy api port /health: $c" ;;
esac

# --------------------------------------------------------------- worker ---
section "Worker"
if [[ -n "$(testing_container_id testing-worker)" ]]; then
  wid="$(testing_container_id testing-worker)"
  info "worker started at $(docker inspect --format '{{.State.StartedAt}}' "$wid"), restarts: $(docker inspect --format '{{.RestartCount}}' "$wid")"
  errs="$(docker logs --since 30m "$wid" 2>&1 | grep -Eic '"level":(50|60)|fatal|unhandled' || true)"
  if [[ "${errs:-0}" -gt 0 ]]; then warn "worker logged $errs error/fatal line(s) in the last 30 min: testing_compose logs --since 30m testing-worker"
  else pass "worker: no error/fatal log lines in the last 30 min"; fi
  last="$(docker logs --tail 1 --timestamps "$wid" 2>&1 | awk '{print $1}' || true)"
  info "worker last log line at: ${last:-never}"
  section "PDF toolchain (worker)"
  v="$(testing_compose exec -T testing-worker sh -c 'xelatex --version 2>/dev/null | head -n 1' 2>/dev/null || true)"
  [[ -n "$v" ]] && pass "xelatex: $v" || fail "xelatex missing in worker"
  v="$(testing_compose exec -T testing-worker sh -c 'pdftotext -v 2>&1 | head -n 1' 2>/dev/null || true)"
  [[ "$v" == *pdftotext* ]] && pass "pdftotext: $v" || fail "pdftotext missing in worker"
  v="$(testing_compose exec -T testing-worker sh -c 'pdfinfo -v 2>&1 | head -n 1' 2>/dev/null || true)"
  [[ "$v" == *pdfinfo* ]] && pass "pdfinfo: $v" || warn "pdfinfo missing in worker"
  n="$(testing_compose exec -T testing-worker sh -c 'fc-list 2>/dev/null | grep -ic noto' 2>/dev/null | tr -dc '0-9' || true)"
  if [[ "${n:-0}" -gt 0 ]]; then pass "Noto fonts present ($n faces)"; else fail "no Noto fonts in worker (fc-list)"; fi
else
  fail "testing-worker not running"
fi

# ---------------------------------------------------------- frontends ---
section "Proxy, website and admin (local)"
c="$(http_code "http://$LOCAL_HOST:$WEB_PORT/healthz")"
[[ "$c" == "200" ]] && pass "proxy /healthz 200" || { [[ "$c" == "403" ]] && warn "proxy /healthz 403 (allowlist)" || fail "proxy /healthz: $c"; }
check_frontend() {
  local name="$1" port="$2" c
  c="$(http_code "http://$LOCAL_HOST:$port/")"
  if [[ "$BASIC" == "true" ]]; then
    case "$c" in
      401) pass "$name without credentials: 401 (protected)" ;;
      403) warn "$name: 403 (allowlist blocks this host)"; return ;;
      200) fail "$name answered 200 WITHOUT credentials although basic auth is enabled" ;;
      *) fail "$name without credentials: $c" ;;
    esac
    if [[ -n "$BA_USER" ]]; then
      c="$(http_code "http://$LOCAL_HOST:$port/" auth)"
      [[ "$c" == "200" ]] && pass "$name with credentials: 200" || fail "$name with credentials: $c"
    else
      warn "$name: $CRED_FILE not readable; credentialed check skipped"
    fi
  else
    case "$c" in
      200) pass "$name: 200 (basic auth disabled)" ;;
      403) warn "$name: 403 (allowlist)" ;;
      *) fail "$name: $c" ;;
    esac
  fi
}
check_frontend website "$WEB_PORT"
check_frontend admin "$ADM_PORT"
for pair in "website:$WEB_PORT" "admin:$ADM_PORT" "api:$API_PORT"; do
  name="${pair%%:*}"; port="${pair##*:}"
  url="http://$LOCAL_HOST:$port/"; [[ "$name" == api ]] && url="http://127.0.0.1:$port/api/v1/auth/csrf"
  if http_headers "$url" | grep -i '^x-robots-tag:' >/dev/null; then pass "$name: X-Robots-Tag header present"
  else warn "$name: X-Robots-Tag header missing (search engines could index testing)"; fi
done
if [[ -n "$BA_USER" && "$BASIC" == "true" ]]; then
  c="$(http_code "http://$LOCAL_HOST:$WEB_PORT/api/v1/auth/csrf" auth)"
  # 401 here comes from the API (no browser session), i.e. basic auth passed and /api/ reached the API.
  [[ "$c" == "200" || "$c" == "401" ]] && pass "website origin /api/v1/auth/csrf: $c (API reached through basic auth)" || fail "website origin /api/v1/auth/csrf: $c"
fi
[[ -n "$ALLOWLIST" ]] && info "IP allowlist active: $ALLOWLIST"

# ------------------------------------------------- production API refs ---
section "Frontend builds do not call production"
PROD_API_RE='api\.astrosushil\.com|backend\.astrosushil\.com'
if [[ -n "$(testing_container_id testing-website)" ]]; then
  hits="$(testing_compose exec -T testing-website sh -c "grep -rlE '$PROD_API_RE' /usr/share/nginx/html 2>/dev/null | head -n 5" 2>/dev/null || true)"
  if [[ -z "$hits" ]]; then pass "website build has no api./backend.astrosushil.com references"
  else fail "website build references a production API host: $(tr '\n' ' ' <<<"$hits")"; fi
fi
if [[ -n "$(testing_container_id testing-admin)" ]]; then
  hits="$(testing_compose exec -T testing-admin sh -c "d=\$(find / -maxdepth 4 -type d -name .next 2>/dev/null | head -n 1); [ -n \"\$d\" ] && grep -rlE '$PROD_API_RE' \"\$d/static\" 2>/dev/null | head -n 5" 2>/dev/null || true)"
  if [[ -z "$hits" ]]; then pass "admin client bundle has no api./backend.astrosushil.com references"
  else fail "admin bundle references a production API host: $(tr '\n' ' ' <<<"$hits")"; fi
fi

# --------------------------------------------------------------- storage ---
section "Storage"
if [[ -n "$(testing_container_id testing-api)" ]]; then
  s="$(testing_compose exec -T -w /app/apps/api testing-api node -e "
    const c=require('./dist/services/storage/storage-config.js');
    const t=c.resolveStorageTarget(process.env);
    console.log((t?t.provider:'local')+' '+(t?t.bucket:'-'));" 2>/dev/null | tail -n 1 || true)"
  prov="${s%% *}"; bucket="${s#* }"
  case "$prov" in
    aws|r2) pass "storage provider $prov, bucket $bucket" ;;
    local) fail "storage resolves to local disk (production mode refuses it; set the testing bucket in api.env)" ;;
    *) fail "storage provider check failed" ;;
  esac
  forbidden="$(env_file_get "$TESTING_ENV_DIR/api.env" TESTING_FORBIDDEN_BUCKETS || true)"
  IFS=', ' read -r -a fb <<<"$forbidden"
  for b in "${fb[@]}"; do
    [[ -n "$b" && "${b,,}" == "${bucket,,}" ]] && fail "bucket $bucket is a FORBIDDEN (production) bucket"
  done
  if (( STORAGE_WRITE == 1 )) && [[ "$prov" == aws || "$prov" == r2 ]]; then
    r="$(testing_compose exec -T -w /app/apps/api testing-api node -e "
      const {storageService:s}=require('./dist/services/storage.service.js');
      const key='healthchecks/verify-testing-'+Date.now()+'.txt';
      (async()=>{
        await s.upload({key,body:Buffer.from('astro testing healthcheck'),contentType:'text/plain',visibility:'private'});
        const ok=await s.exists(key);
        await s.delete(key);
        const gone=!(await s.exists(key));
        console.log('RESULT '+(ok?'written':'notwritten')+' '+(gone?'deleted':'notdeleted')+' '+key);
      })().catch(e=>{console.log('RESULT error '+String(e&&e.name||'Error'));});" 2>/dev/null | grep '^RESULT' | tail -n 1 || true)"
    case "$r" in
      "RESULT written deleted "*) pass "storage write test: object written and deleted (${r##* })" ;;
      "RESULT written notdeleted "*) warn "storage write test: written but not deleted: ${r##* }" ;;
      *) fail "storage write test failed: ${r:-no output}" ;;
    esac
  fi
fi

# ---------------------------------------------------------------- public ---
if (( NO_PUBLIC == 0 )); then
  section "Public access"
  for u in "${PUBLIC_URLS[@]}"; do
    c="$(http_code "$u")"
    case "$c" in 200|401) pass "public $u: $c" ;; 403) warn "public $u: 403 (allowlist)" ;; *) fail "public $u: $c" ;; esac
  done
  for k in TESTING_PUBLIC_WEBSITE_URL TESTING_PUBLIC_ADMIN_URL TESTING_PUBLIC_API_URL; do
    u="$(pget "$k")"
    [[ -n "$u" ]] || continue
    if [[ "$u" == https://* ]]; then
      h="$(url_host "$u")"
      end="$(openssl s_client -connect "$h:443" -servername "$h" </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || true)"
      if [[ -z "$end" ]]; then
        fail "$k: no TLS certificate from $h:443"
      else
        days=$(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 ))
        if (( days < 0 )); then fail "$k: certificate for $h expired"
        elif (( days < 14 )); then warn "$k: certificate for $h expires in $days days"
        else pass "$k: certificate for $h valid for $days days"; fi
      fi
    fi
    c="$(http_code "$u")"
    case "$c" in 200|401|404) pass "$k reachable ($c)" ;; 403) warn "$k: 403 (allowlist)" ;; *) fail "$k: $u answered $c" ;; esac
  done
else
  info "--no-public: public URL and HTTPS checks skipped"
fi

# --------------------------------------------------------------- database ---
if (( SKIP_DB == 0 )); then
  section "Database integrity"
  if [[ -f "$SCRIPT_DIR/verify-database.sh" ]]; then
    if bash "$SCRIPT_DIR/verify-database.sh"; then pass "verify-database.sh"; else fail "verify-database.sh reported problems"; fi
  else
    warn "verify-database.sh not found; skipped"
  fi
fi

section "Summary"
printf 'PASS=%d WARN=%d FAIL=%d\n' "$PASS" "$WARN" "$FAIL"
if (( FAIL > 0 )); then printf 'RESULT: FAIL\n'; exit 1; fi
if (( WARN > 0 )); then printf 'RESULT: WARN\n'; exit 2; fi
printf 'RESULT: PASS\n'
