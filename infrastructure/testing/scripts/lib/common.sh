# shellcheck shell=bash
# =============================================================================
# Astro Sushil TESTING deployment - shared helpers.
#
# Source this file from every testing script:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   # shellcheck source=lib/common.sh
#   source "$SCRIPT_DIR/lib/common.sh"
#
# Public API (other scripts depend on these exact names):
#   TESTING_ROOT        default /opt/astro-sushil/testing (env override), exported
#   TESTING_PROJECT     astro_testing
#   REPO_DIR            $TESTING_ROOT/repo
#   testing_compose     docker compose for project astro_testing (see contract)
#   log_info / log_warn / log_error / log_ok / die
#   confirm_phrase "<exact phrase>"   read from /dev/tty, non-zero on mismatch
#   confirm_yes "<question>"          y/N prompt; ASSUME_YES=1 answers yes
#   require_cmd <cmd>...              die when a command is missing
#   load_env_file <file> [prefix]     safe KEY=VALUE parser (never sources)
#   env_file_get <file> <KEY>         print one value (empty when absent)
#   is_prod_host <host>               exact match against the production denylist
#   is_prod_api_url <url>             true when the URL's host is a production host
#   url_host <url>                    lower-case host of a URL
#   port_in_use <port>                true when a TCP listener uses the port
#   port_used_by_testing <port>       true when an astro_testing container publishes it
#   assert_testing_container <svc>    die unless a running astro_testing container exists
#   testing_container_id <svc>        print the container id (empty when none)
#   wait_service_healthy <svc> [secs] wait until healthy (or running without healthcheck)
#   mask_secret <value>               print a masked form (first 4 chars + ***)
#   sha256_verify <file> [sumfile]    verify <file>.sha256 (or the given sum file)
#   assert_safe_testing_root          refuse dangerous TESTING_ROOT values
#
# Safety: nothing in this file prunes Docker resources, edits firewall rules,
# or touches production paths (/opt/astro-sushil/app, /opt/astro-sushil/shared).
# =============================================================================

if [[ -n "${_ASTRO_TESTING_COMMON_LOADED:-}" ]]; then
  return 0
fi
_ASTRO_TESTING_COMMON_LOADED=1

COMMON_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTING_SCRIPTS_DIR="$(cd "$COMMON_LIB_DIR/.." && pwd)"

TESTING_ROOT="${TESTING_ROOT:-/opt/astro-sushil/testing}"
# Strip trailing slashes (but keep "/" itself so the safety check can refuse it).
while [[ "$TESTING_ROOT" == */ && "$TESTING_ROOT" != "/" ]]; do TESTING_ROOT="${TESTING_ROOT%/}"; done
export TESTING_ROOT
TESTING_PROJECT="astro_testing"
REPO_DIR="$TESTING_ROOT/repo"
TESTING_ENV_DIR="$TESTING_ROOT/env"
TESTING_NGINX_DIR="$TESTING_ROOT/nginx"
TESTING_DATA_DIR="$TESTING_ROOT/data"
TESTING_BACKUP_DIR="$TESTING_ROOT/data/postgres-backup"
TESTING_LOG_DIR="$TESTING_ROOT/logs"
TESTING_DEPLOY_DIR="$TESTING_ROOT/deployment"
TESTING_COMPOSE_FILE="$REPO_DIR/docker-compose.testing.yml"

# Production paths and hosts the testing stack must never touch or call.
PRODUCTION_BASE_DIR="/opt/astro-sushil"
PRODUCTION_DIRS=("/opt/astro-sushil/app" "/opt/astro-sushil/shared")
# Exact production host names (space separated). Override only to ADD hosts.
# test.*, admin-test.*, api-test.* sub-domains of the client domain are allowed.
PRODUCTION_HOST_DENYLIST="${PRODUCTION_HOST_DENYLIST:-astrosushil.com www.astrosushil.com api.astrosushil.com backend.astrosushil.com admin.astrosushil.com}"

# ------------------------------------------------------------------ logging ---
if [[ -t 2 && -z "${NO_COLOR:-}" ]]; then
  _C_RED=$'\033[1;31m'; _C_YEL=$'\033[1;33m'; _C_GRN=$'\033[1;32m'; _C_BLU=$'\033[1;34m'; _C_OFF=$'\033[0m'
else
  _C_RED=""; _C_YEL=""; _C_GRN=""; _C_BLU=""; _C_OFF=""
fi

log_info()  { printf '%s[info]%s  %s\n' "$_C_BLU" "$_C_OFF" "$*" >&2; }
log_ok()    { printf '%s[ok]%s    %s\n' "$_C_GRN" "$_C_OFF" "$*" >&2; }
log_warn()  { printf '%s[warn]%s  %s\n' "$_C_YEL" "$_C_OFF" "$*" >&2; }
log_error() { printf '%s[error]%s %s\n' "$_C_RED" "$_C_OFF" "$*" >&2; }
log_step()  { printf '\n%s==> %s%s\n' "$_C_BLU" "$*" "$_C_OFF" >&2; }
die()       { log_error "$*"; exit 1; }

# Print the leading comment block of a script (between the shebang and the
# first "# ====" line after the header) as its --help text.
print_script_help() {
  local file="$1"
  awk 'NR == 1 { next } /^# =====/ { n++; if (n == 2) exit; next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$file"
}

mask_secret() {
  local v="${1:-}"
  if [[ -z "$v" ]]; then printf '(empty)'; elif (( ${#v} <= 6 )); then printf '***'; else printf '%s***' "${v:0:4}"; fi
}

# ------------------------------------------------------------------ prompts ---
# confirm_phrase "<exact phrase>": the user must type the phrase exactly.
confirm_phrase() {
  local expected="$1" reply=""
  if ! { : </dev/tty; } 2>/dev/null; then
    log_error "No terminal available to confirm. Run this script interactively."
    return 1
  fi
  printf '\nType exactly the following to continue:\n  %s\n> ' "$expected" >/dev/tty
  IFS= read -r reply </dev/tty || return 1
  if [[ "$reply" != "$expected" ]]; then
    log_error "Confirmation text did not match. Nothing was changed by this step."
    return 1
  fi
  return 0
}

# confirm_yes "<question>": y/N prompt for NON-destructive actions only.
confirm_yes() {
  local question="$1" reply=""
  if [[ "${ASSUME_YES:-0}" == "1" ]]; then
    log_info "$question -> yes (--yes)"
    return 0
  fi
  if ! { : </dev/tty; } 2>/dev/null; then
    log_error "No terminal available for: $question (use --yes for non-destructive prompts)."
    return 1
  fi
  printf '%s [y/N] ' "$question" >/dev/tty
  IFS= read -r reply </dev/tty || return 1
  [[ "$reply" =~ ^[Yy]([Ee][Ss])?$ ]]
}

# ------------------------------------------------------------- requirements ---
require_cmd() {
  local c missing=()
  for c in "$@"; do command -v "$c" >/dev/null 2>&1 || missing+=("$c"); done
  if (( ${#missing[@]} > 0 )); then
    die "Missing required command(s): ${missing[*]}"
  fi
}

# compose_version_ok: Docker Compose v2.17+ (multiple --env-file) or newer major.
compose_version() { docker compose version --short 2>/dev/null | sed 's/^v//'; }
compose_version_ok() {
  local v major minor
  v="$(compose_version)"
  [[ -n "$v" ]] || return 1
  major="${v%%.*}"; minor="${v#*.}"; minor="${minor%%.*}"
  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ ]] || return 1
  (( major > 2 || (major == 2 && minor >= 17) ))
}

require_docker() {
  require_cmd docker
  docker info >/dev/null 2>&1 || die "Cannot talk to the Docker daemon (run with sudo or add your user to the docker group)."
  compose_version_ok || die "Docker Compose v2.17+ is required (found: '$(compose_version || true)'). Install the docker-compose-plugin."
}

# ---------------------------------------------------------------- env files ---
# _env_parse_line <line>: on success sets _ENV_KEY and _ENV_VAL. Never evaluates.
_env_parse_line() {
  local line="$1" key val
  line="${line%$'\r'}"
  [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# ]] && return 1
  line="${line#"${line%%[![:space:]]*}"}"
  [[ "$line" == export\ * ]] && line="${line#export }"
  [[ "$line" == *=* ]] || return 1
  key="${line%%=*}"; val="${line#*=}"
  key="${key%"${key##*[![:space:]]}"}"
  [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || return 1
  if [[ "$val" =~ ^\"(.*)\"[[:space:]]*$ ]]; then
    val="${BASH_REMATCH[1]}"
  elif [[ "$val" =~ ^\'(.*)\'[[:space:]]*$ ]]; then
    val="${BASH_REMATCH[1]}"
  else
    # Unquoted: drop an inline " # comment" and trailing whitespace.
    val="${val%%[[:space:]]#*}"
    val="${val%"${val##*[![:space:]]}"}"
  fi
  _ENV_KEY="$key"; _ENV_VAL="$val"
  return 0
}

# Variables an env file may never set through load_env_file without a prefix.
_ENV_PROTECTED_RE='^(PATH|IFS|HOME|SHELL|USER|PS[0-9]|BASH.*|LD_.*|ENV|CDPATH|SHELLOPTS|TESTING_ROOT|TESTING_PROJECT|REPO_DIR|TESTING_.*_DIR|TESTING_COMPOSE_FILE|PRODUCTION_.*|ASSUME_YES|DOCKER_.*|COMPOSE_.*)$'

# load_env_file <file> [prefix]: set shell variables (not exported) from KEY=VALUE lines.
load_env_file() {
  local file="$1" prefix="${2:-}" line
  [[ -f "$file" ]] || { log_error "Env file not found: $file"; return 1; }
  while IFS= read -r line || [[ -n "$line" ]]; do
    _env_parse_line "$line" || continue
    if [[ -z "$prefix" && "$_ENV_KEY" =~ $_ENV_PROTECTED_RE ]]; then
      log_warn "Ignoring protected variable $_ENV_KEY in $file"
      continue
    fi
    printf -v "${prefix}${_ENV_KEY}" '%s' "$_ENV_VAL"
  done <"$file"
  return 0
}

# env_file_get <file> <KEY>: print the LAST value of KEY (compose semantics), empty when absent.
env_file_get() {
  local file="$1" want="$2" line out="" found=1
  [[ -f "$file" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    _env_parse_line "$line" || continue
    if [[ "$_ENV_KEY" == "$want" ]]; then out="$_ENV_VAL"; found=0; fi
  done <"$file"
  printf '%s' "$out"
  return $found
}

# env_file_keys <file>: list keys, one per line.
env_file_keys() {
  local file="$1" line
  [[ -f "$file" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    _env_parse_line "$line" && printf '%s\n' "$_ENV_KEY"
  done <"$file"
  return 0
}

# ------------------------------------------------------------ host checks ---
# url_host <url>: lower-case host part (no scheme, userinfo, port or path).
url_host() {
  local u="${1:-}"
  u="${u#*://}"; u="${u%%/*}"; u="${u%%\?*}"; u="${u%%#*}"; u="${u##*@}"
  if [[ "$u" == \[*\]* ]]; then u="${u%%]*}"; u="${u#[}"; else u="${u%%:*}"; fi
  u="${u%.}"
  printf '%s' "${u,,}"
}

is_prod_host() {
  local h="${1,,}" p
  h="${h%.}"
  [[ -n "$h" ]] || return 1
  for p in $PRODUCTION_HOST_DENYLIST; do
    [[ "$h" == "${p,,}" ]] && return 0
  done
  return 1
}

# is_prod_api_url <url>: true when the URL's host is a production host.
is_prod_api_url() {
  local u="${1:-}"
  [[ -n "$u" ]] || return 1
  # Relative URLs (/api/v1, /) are same-origin and never production.
  [[ "$u" == /* && "$u" != //* ]] && return 1
  is_prod_host "$(url_host "$u")"
}

# list_has_prod_host "<comma/space separated urls>": true if any entry is production.
list_has_prod_host() {
  local item
  local IFS=$', \t'
  for item in $1; do
    [[ -z "$item" ]] && continue
    is_prod_api_url "$item" && return 0
  done
  return 1
}

# --------------------------------------------------------------- ports ---
port_in_use() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ ]] || return 1
  if command -v ss >/dev/null 2>&1; then
    ss -Hltn 2>/dev/null | awk '{print $4}' | grep -E "[:.]${port}\$" >/dev/null
    return $?
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && return 0
  return 1
}

# port_owner <port>: best-effort process description (needs root for names).
port_owner() {
  local port="$1"
  command -v ss >/dev/null 2>&1 || { printf 'unknown'; return 0; }
  ss -Hltnp 2>/dev/null | awk -v p="$port" '$4 ~ "[:.]"p"$" { sub(/.*users:\(\(/, "", $0); sub(/\)\).*/, "", $0); print; exit }' | grep . || printf 'unknown (run as root to see process names)'
}

port_used_by_testing() {
  local port="$1"
  docker ps --filter "label=com.docker.compose.project=$TESTING_PROJECT" --format '{{.Ports}}' 2>/dev/null \
    | tr ',' '\n' | grep -E "[:.]${port}->" >/dev/null
}

# ----------------------------------------------------------- compose/docker ---
testing_compose() {
  TESTING_ROOT="$TESTING_ROOT" docker compose \
    --project-name "$TESTING_PROJECT" \
    --env-file "$TESTING_ROOT/env/build.env" \
    --env-file "$TESTING_ROOT/env/proxy.env" \
    -f "$TESTING_ROOT/repo/docker-compose.testing.yml" \
    "$@"
}

testing_container_id() {
  local svc="$1"
  docker ps -q \
    --filter "label=com.docker.compose.project=$TESTING_PROJECT" \
    --filter "label=com.docker.compose.service=$svc" 2>/dev/null | head -n 1
}

assert_testing_container() {
  local svc="$1" id project
  id="$(testing_container_id "$svc")"
  [[ -n "$id" ]] || die "No running container for service '$svc' in project $TESTING_PROJECT."
  project="$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.project" }}' "$id" 2>/dev/null || true)"
  [[ "$project" == "$TESTING_PROJECT" ]] || die "Container $id is not part of project $TESTING_PROJECT (label: '$project')."
  return 0
}

# container_health <svc>: healthy|unhealthy|starting|running|exited|missing
container_health() {
  local svc="$1" id state
  id="$(docker ps -aq --filter "label=com.docker.compose.project=$TESTING_PROJECT" --filter "label=com.docker.compose.service=$svc" 2>/dev/null | head -n 1)"
  [[ -n "$id" ]] || { printf 'missing'; return 0; }
  state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || printf 'missing')"
  printf '%s' "$state"
}

wait_service_healthy() {
  local svc="$1" timeout="${2:-180}" waited=0 state
  while :; do
    state="$(container_health "$svc")"
    case "$state" in
      healthy) log_ok "$svc is healthy"; return 0 ;;
      running)
        # No healthcheck defined: running for 5s counts as up.
        if (( waited >= 5 )); then log_ok "$svc is running (no healthcheck)"; return 0; fi ;;
      unhealthy|exited|dead) log_error "$svc is $state"; return 1 ;;
    esac
    if (( waited >= timeout )); then
      log_error "$svc did not become healthy within ${timeout}s (state: $state)"
      return 1
    fi
    sleep 3; waited=$((waited + 3))
  done
}

# testing_resource_snapshot: names of every Docker container/volume/network/image
# (used by teardown to prove nothing outside the project was removed).
docker_resource_snapshot() {
  {
    docker ps -a --format 'container {{.Names}}' 2>/dev/null
    docker volume ls --format 'volume {{.Name}}' 2>/dev/null
    docker network ls --format 'network {{.Name}}' 2>/dev/null
    docker image ls --format 'image {{.Repository}}:{{.Tag}}' 2>/dev/null
  } | sort
}

# --------------------------------------------------------------- integrity ---
sha256_verify() {
  local file="$1" sumfile="${2:-$1.sha256}" expected actual
  [[ -f "$file" ]] || { log_error "File not found: $file"; return 1; }
  [[ -f "$sumfile" ]] || { log_error "Checksum file not found: $sumfile"; return 1; }
  expected="$(awk 'NF { print $1; exit }' "$sumfile")"
  actual="$(sha256sum "$file" | awk '{print $1}')"
  [[ "$expected" =~ ^[0-9a-f]{64}$ ]] || { log_error "Malformed checksum in $sumfile"; return 1; }
  if [[ "$expected" != "$actual" ]]; then
    log_error "SHA-256 mismatch for $file"
    return 1
  fi
  return 0
}

# ------------------------------------------------------------ path safety ---
# assert_safe_testing_root: TESTING_ROOT must be absolute, end in /testing, and
# must not be or contain a production directory.
assert_safe_testing_root() {
  local r="$TESTING_ROOT" real p
  [[ "$r" == /* ]] || die "TESTING_ROOT must be an absolute path (got '$r')."
  [[ "$r" != "/" ]] || die "TESTING_ROOT must not be /."
  [[ "$r" != *"/../"* && "$r" != *"/.." && "$r" != *"/./"* ]] || die "TESTING_ROOT must not contain '.' or '..' segments."
  [[ "$(basename "$r")" == "testing" ]] || die "TESTING_ROOT must end with /testing (got '$r')."
  real="$r"
  if [[ -e "$r" ]]; then real="$(cd "$r" && pwd -P)"; fi
  for p in "/" "$PRODUCTION_BASE_DIR" "${PRODUCTION_DIRS[@]}" /opt /usr /etc /var /home /root; do
    [[ "$real" != "$p" ]] || die "TESTING_ROOT resolves to a protected path: $real"
  done
  for p in "${PRODUCTION_DIRS[@]}"; do
    [[ "$real" != "$p"/* ]] || die "TESTING_ROOT is inside a production directory: $real"
    [[ "$p" != "$real"/* ]] || die "TESTING_ROOT contains a production directory: $p"
  done
  return 0
}

# ensure_dir <path> <mode>
ensure_dir() {
  local d="$1" mode="$2"
  mkdir -p "$d"
  chmod "$mode" "$d"
}

# write_file_atomic <dest> <mode>: content from stdin.
write_file_atomic() {
  local dest="$1" mode="$2" tmp
  tmp="$(mktemp "$(dirname "$dest")/.$(basename "$dest").XXXXXX")"
  if ! cat >"$tmp"; then rm -f "$tmp"; return 1; fi
  chmod "$mode" "$tmp"
  mv -f "$tmp" "$dest"
}

# ------------------------------------------------------------ repo install ---
# install_repo_from_source --source-dir <dir> | --bundle <tar.gz>
# Stages the new source next to the repo, then swaps it in. The previous repo
# is moved to $TESTING_DEPLOY_DIR/repo-<UTC timestamp>. Env files live outside
# the repo and are never touched.
install_repo_from_source() {
  local mode="$1" src="$2" ts staging
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  ensure_dir "$TESTING_DEPLOY_DIR" 700
  # Remove staging dirs left by an interrupted earlier run (only inside our own dir).
  rm -rf "${TESTING_DEPLOY_DIR:?}"/.staging-*
  staging="$(mktemp -d "$TESTING_DEPLOY_DIR/.staging-$ts.XXXXXX")"

  case "$mode" in
    --bundle)
      [[ -f "$src" ]] || die "Bundle not found: $src"
      log_info "Verifying bundle checksum ($src.sha256)"
      sha256_verify "$src" || die "Bundle checksum verification failed; refusing to install."
      if tar -tzf "$src" | grep -E '^/|(^|/)\.\.(/|$)' >/dev/null; then
        die "Bundle contains absolute or '..' paths; refusing to extract."
      fi
      tar -xzf "$src" -C "$staging" --strip-components=1 --no-same-owner --no-same-permissions
      [[ -f "$staging/MANIFEST.txt" ]] || die "Bundle has no MANIFEST.txt; not a deployment bundle."
      ;;
    --source-dir)
      [[ -d "$src" ]] || die "Source directory not found: $src"
      src="$(cd "$src" && pwd -P)"
      if [[ -d "$src/.git" ]] || git -C "$src" rev-parse --git-dir >/dev/null 2>&1; then
        require_cmd git
        log_info "Source is a git checkout: exporting tracked files of HEAD only (no untracked/ignored files)."
        if [[ -n "$(git -C "$src" status --porcelain --untracked-files=no 2>/dev/null)" ]]; then
          log_warn "Source checkout has uncommitted changes to tracked files; only the committed HEAD is installed."
        fi
        git -C "$src" archive --format=tar HEAD | tar -x -C "$staging"
        printf 'commit=%s\nsource=git:%s\n' "$(git -C "$src" rev-parse HEAD)" "$src" >"$staging/.install-source"
      elif [[ -f "$src/MANIFEST.txt" ]]; then
        log_info "Source is an extracted deployment bundle."
        tar -C "$src" -cf - . | tar -x -C "$staging" --no-same-owner
      else
        die "--source-dir must be a git checkout or an extracted deployment bundle (with MANIFEST.txt)."
      fi
      ;;
    *) die "install_repo_from_source: unknown mode $mode" ;;
  esac

  [[ -f "$staging/docker-compose.testing.yml" ]] || die "Source has no docker-compose.testing.yml at its root."
  if [[ -e "$REPO_DIR" ]]; then
    log_info "Keeping previous source at $TESTING_DEPLOY_DIR/repo-$ts"
    mv "$REPO_DIR" "$TESTING_DEPLOY_DIR/repo-$ts"
  fi
  mv "$staging" "$REPO_DIR"
  chmod 755 "$REPO_DIR"
  if [[ "$mode" == "--bundle" && "$(dirname "$src")" != "$TESTING_DEPLOY_DIR" ]]; then
    cp -f "$src" "$src.sha256" "$TESTING_DEPLOY_DIR/" 2>/dev/null || true
  fi
  log_ok "Source installed at $REPO_DIR"
}

# repo_version_string: commit/bundle identification of the installed source.
repo_version_string() {
  if [[ -f "$REPO_DIR/MANIFEST.txt" ]]; then
    awk -F': *' '/^(commit|bundle)/ { printf "%s=%s ", $1, $2 }' "$REPO_DIR/MANIFEST.txt"
  elif [[ -f "$REPO_DIR/.install-source" ]]; then
    tr '\n' ' ' <"$REPO_DIR/.install-source"
  elif git -C "$REPO_DIR" rev-parse HEAD >/dev/null 2>&1; then
    printf 'commit=%s source=git-checkout' "$(git -C "$REPO_DIR" rev-parse HEAD)"
  else
    printf 'unknown'
  fi
}

# write_install_state <action>: $TESTING_DEPLOY_DIR/install-state.env (KEY=VALUE).
write_install_state() {
  local action="$1"
  ensure_dir "$TESTING_DEPLOY_DIR" 700
  {
    printf 'LAST_ACTION=%s\n' "$action"
    printf 'LAST_ACTION_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'SOURCE_VERSION="%s"\n' "$(repo_version_string | sed 's/[[:space:]]*$//')"
    printf 'TESTING_ROOT=%s\n' "$TESTING_ROOT"
    printf 'COMPOSE_VERSION=%s\n' "$(compose_version)"
  } | write_file_atomic "$TESTING_DEPLOY_DIR/install-state.env" 600
  printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$action" "$(repo_version_string)" >>"$TESTING_DEPLOY_DIR/history.log"
  chmod 600 "$TESTING_DEPLOY_DIR/history.log"
}

# env_files_present: all four env files exist.
env_files_present() {
  local f
  for f in api postgres build proxy; do [[ -f "$TESTING_ENV_DIR/$f.env" ]] || return 1; done
  return 0
}

# -------------------------------------------------------- env validation ---
# Keys that must be present and non-empty in env/api.env. Override with a
# space-separated TESTING_REQUIRED_API_KEYS in the calling environment.
TESTING_REQUIRED_API_KEYS="${TESTING_REQUIRED_API_KEYS:-DATABASE_URL JWT_SECRET CORS_ORIGIN PUBLIC_API_URL FRONTEND_URL ADMIN_URL STORAGE_PROVIDER RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET}"

# validate_testing_env: checks the four env files. Prints FAIL/WARN lines
# (key names only, never values) and returns 1 when any FAIL was found.
# Sets VALIDATE_FAILS / VALIDATE_WARNS / VALIDATE_PLACEHOLDER_KEYS.
validate_testing_env() {
  local api="$TESTING_ENV_DIR/api.env" pg="$TESTING_ENV_DIR/postgres.env"
  local build="$TESTING_ENV_DIR/build.env" proxy="$TESTING_ENV_DIR/proxy.env"
  local f k v provider bucket forbidden b host
  VALIDATE_FAILS=0; VALIDATE_WARNS=0; VALIDATE_PLACEHOLDER_KEYS=""
  _vf() { VALIDATE_FAILS=$((VALIDATE_FAILS + 1)); log_error "env: $*"; }
  _vw() { VALIDATE_WARNS=$((VALIDATE_WARNS + 1)); log_warn "env: $*"; }

  for f in "$api" "$pg" "$build" "$proxy"; do
    [[ -f "$f" ]] || { _vf "missing $f"; continue; }
    [[ "$(stat -c '%a' "$f")" == "600" ]] || _vw "$f should be mode 600 (is $(stat -c '%a' "$f"))"
    while IFS= read -r k; do
      v="$(env_file_get "$f" "$k" || true)"
      if [[ "$v" == *__SET_ME__* || "$v" == *__GENERATE__* ]]; then
        VALIDATE_PLACEHOLDER_KEYS+="$(basename "$f"):$k "
      fi
    done < <(env_file_keys "$f")
  done
  if [[ -n "$VALIDATE_PLACEHOLDER_KEYS" ]]; then
    _vf "placeholders still to fill (__SET_ME__/__GENERATE__): $VALIDATE_PLACEHOLDER_KEYS"
  fi
  [[ -f "$api" ]] || return 1

  for k in $TESTING_REQUIRED_API_KEYS; do
    v="$(env_file_get "$api" "$k" || true)"
    [[ -n "$v" ]] || _vf "api.env: required key $k is missing or empty"
  done

  v="$(env_file_get "$api" NODE_ENV || true)"
  if [[ -n "$v" && "$v" != "production" ]]; then
    _vf "api.env: NODE_ENV=$v; testing must run with NODE_ENV=production (compose forces it; remove the line)"
  fi

  v="$(env_file_get "$api" RAZORPAY_KEY_ID || true)"
  if [[ "$v" == rzp_live_* ]]; then
    _vf "api.env: RAZORPAY_KEY_ID is a LIVE key (rzp_live_). Use a Razorpay TEST key (rzp_test_)."
  elif [[ -n "$v" && "$v" != rzp_test_* && "$v" != *__SET_ME__* ]]; then
    _vf "api.env: RAZORPAY_KEY_ID must start with rzp_test_"
  fi

  for k in CORS_ORIGIN PUBLIC_API_URL FRONTEND_URL ADMIN_URL OPENROUTER_SITE_URL; do
    v="$(env_file_get "$api" "$k" || true)"
    [[ -n "$v" ]] || continue
    list_has_prod_host "$v" && _vf "api.env: $k contains a production host (denylist: $PRODUCTION_HOST_DENYLIST)"
  done

  v="$(env_file_get "$api" DATABASE_URL || true)"
  if [[ -n "$v" && "$v" != *__* ]]; then
    host="$(url_host "$v")"
    [[ "$host" == "testing-postgres" ]] || _vf "api.env: DATABASE_URL must point at host testing-postgres (got host '$host')"
  fi
  v="$(env_file_get "$api" REDIS_URL || true)"
  if [[ -n "$v" ]]; then
    host="$(url_host "$v")"
    [[ "$host" == "testing-redis" ]] || _vw "api.env: REDIS_URL host '$host' is ignored; compose forces redis://testing-redis:6379/0"
  fi

  provider="$(env_file_get "$api" STORAGE_PROVIDER || true)"; provider="${provider,,}"
  case "$provider" in
    aws) bucket="$(env_file_get "$api" AWS_STORAGE_BUCKET_NAME || true)" ;;
    r2)  bucket="$(env_file_get "$api" R2_BUCKET_NAME || true)"; [[ -n "$bucket" ]] || bucket="$(env_file_get "$api" S3_BUCKET_NAME || true)" ;;
    "")  bucket="" ;;
    *)   _vf "api.env: STORAGE_PROVIDER must be aws or r2 (production mode refuses local disk)"; bucket="" ;;
  esac
  if [[ "$provider" == "aws" || "$provider" == "r2" ]]; then
    [[ -n "$bucket" ]] || _vf "api.env: no bucket name for STORAGE_PROVIDER=$provider"
    forbidden="$(env_file_get "$api" TESTING_FORBIDDEN_BUCKETS || true)"
    if [[ -z "$forbidden" ]]; then
      _vw "api.env: TESTING_FORBIDDEN_BUCKETS is empty; list the production bucket name(s) so a mix-up is refused"
    else
      local IFS=$', \t'
      for b in $forbidden; do
        [[ -n "$b" && "${bucket,,}" == "${b,,}" ]] && _vf "api.env: storage bucket '$bucket' is listed in TESTING_FORBIDDEN_BUCKETS (production bucket)"
      done
      unset IFS
    fi
    [[ -z "$bucket" || "$bucket" == *__* || "${bucket,,}" == *test* ]] || _vw "api.env: bucket '$bucket' does not contain 'test'; make sure it is a dedicated testing bucket"
  fi

  local allowlist_on
  allowlist_on="$(env_file_get "$api" MESSAGING_RECIPIENT_ALLOWLIST_ENABLED || true)"; allowlist_on="${allowlist_on,,}"
  while IFS= read -r k; do
    v="$(env_file_get "$api" "$k" || true)"
    case "$k" in
      REPORT_STALE_RECOVERY_SCHEDULER_ENABLED) ;;  # recovery of stuck jobs only; sends nothing
      *_SCHEDULER_ENABLED|MESSAGING_INLINE_DISPATCH|NOTIFICATION_CAMPAIGNS_ENABLED|AUTO_DELIVER_WHEN_READY|INVOICE_RECOVERY_ENABLED)
        [[ "${v,,}" == "true" || "$v" == "1" ]] && _vw "api.env: $k=true (scheduled/automatic work or sends are active in testing)" ;;
      SMS_PROVIDER|WHATSAPP_PROVIDER|EMAIL_PROVIDER)
        if [[ -n "$v" && "${v,,}" != "fake" && "${v,,}" != "none" && "$allowlist_on" != "true" ]]; then
          _vw "api.env: $k=$v with MESSAGING_RECIPIENT_ALLOWLIST_ENABLED not true (real messages can reach real people)"
        fi ;;
      ALLOW_DEV_MASTER_OTP)
        [[ "${v,,}" == "true" ]] && _vw "api.env: ALLOW_DEV_MASTER_OTP=true is ignored under NODE_ENV=production; remove it" ;;
    esac
  done < <(env_file_keys "$api")

  if [[ -f "$build" ]]; then
    for k in TESTING_WEBSITE_API_URL TESTING_ADMIN_API_URL; do
      v="$(env_file_get "$build" "$k" || true)"
      if [[ -z "$v" ]]; then _vf "build.env: $k is required"; continue; fi
      host=""; [[ "$v" == /* && "$v" != //* ]] || host="$(url_host "$v")"
      if is_prod_host "$host" || [[ "$host" == astrosushil.com || "$host" == *.astrosushil.com ]]; then
        # Build args are baked into images: refuse every astrosushil.com host.
        _vf "build.env: $k points at an astrosushil.com host; use a relative path (/api/v1 or /)"
      elif [[ "$v" != /* ]]; then
        _vw "build.env: $k=$v is absolute; relative values keep images independent of the hostname"
      fi
    done
  fi

  if [[ -f "$proxy" ]]; then
    for k in TESTING_WEBSITE_PORT TESTING_ADMIN_PORT TESTING_API_PORT; do
      v="$(env_file_get "$proxy" "$k" || true)"
      [[ -z "$v" || "$v" =~ ^[0-9]{2,5}$ ]] || _vf "proxy.env: $k must be a port number"
      [[ "$v" != "80" && "$v" != "443" ]] || _vf "proxy.env: $k must not be 80/443 (owned by the production host proxy)"
    done
    for k in TESTING_PUBLIC_WEBSITE_URL TESTING_PUBLIC_ADMIN_URL TESTING_PUBLIC_API_URL; do
      v="$(env_file_get "$proxy" "$k" || true)"
      [[ -n "$v" ]] && is_prod_api_url "$v" && _vf "proxy.env: $k is a production host"
    done
  fi

  unset -f _vf _vw
  (( VALIDATE_FAILS == 0 ))
}
