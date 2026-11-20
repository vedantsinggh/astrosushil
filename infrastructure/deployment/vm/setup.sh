#!/usr/bin/env bash
# =============================================================================
# Astro Sushil backend - one-time (and re-runnable) bootstrap for a small
# Ubuntu 24.04 VM (Oracle Cloud E2.1.Micro, 1 GB RAM). DEVELOPMENT / SHOWCASE
# use only, NOT production.
#
# Run ON THE VM, with sudo, from the copied kit folder:
#   sudo bash setup.sh [--domain api.example.duckdns.org] [--email you@example.com]
#
# Options:
#   --domain NAME       Public DNS name pointing at this VM. Caddy then gets a
#                       Let's Encrypt certificate and serves HTTPS on 443.
#                       Without it Caddy serves plain HTTP on port 80 (IP only).
#   --email ADDR        Contact e-mail for Let's Encrypt (optional).
#   --public-ip IP      Public IP to use in PUBLIC_API_URL when there is no
#                       domain (auto-detected when omitted).
#   --swap-size SIZE    Swapfile size, e.g. 2G or 4G (default 4G, 2G if disk is small).
#   --node-major N      Node.js major version (default 22).
#   --no-redis          Do not install Redis (see README: the API works without it).
#   --no-latex          Skip the XeLaTeX toolchain (report PDFs will then fail).
#   --open-api-port     Also open TCP 3000 in the VM firewall and bind the API to
#                       0.0.0.0 (normally the API is reachable only through Caddy).
#   --pm2-logrotate     Use the pm2-logrotate module (one more Node process,
#                       ~40 MB RAM) instead of the system logrotate rule.
#   -h, --help          Show this help.
#
# Never prints secrets. Generated secrets are written only to the API env file
# (/opt/astro-sushil/shared/api.env, mode 600, owned by the app user).
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------- settings ---
APP_USER="${SUDO_USER:-ubuntu}"
[ "$APP_USER" = "root" ] && APP_USER="ubuntu"
BASE_DIR="/opt/astro-sushil"
APP_DIR="$BASE_DIR/app"
SHARED_DIR="$BASE_DIR/shared"
ENV_FILE="$SHARED_DIR/api.env"
STORAGE_DIR="/var/lib/astro-sushil/storage"
BACKUP_DIR="/var/backups/astro-sushil"
DB_NAME="astro_sushil"
DB_USER="astro"
API_PORT=3000
PG_MAJOR=16

DOMAIN=""
ACME_EMAIL=""
PUBLIC_IP=""
SWAP_SIZE=""
NODE_MAJOR=22
WITH_REDIS=1
WITH_LATEX=1
OPEN_API_PORT=0
PM2_LOGROTATE=0

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_TEMPLATE="$KIT_DIR/.env.vm.example"

usage() { awk 'NR > 2 && /^# =====/ { exit } NR > 2' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN="${2:?--domain needs a value}"; shift 2 ;;
    --email) ACME_EMAIL="${2:?--email needs a value}"; shift 2 ;;
    --public-ip) PUBLIC_IP="${2:?--public-ip needs a value}"; shift 2 ;;
    --swap-size) SWAP_SIZE="${2:?--swap-size needs a value}"; shift 2 ;;
    --node-major) NODE_MAJOR="${2:?--node-major needs a value}"; shift 2 ;;
    --no-redis) WITH_REDIS=0; shift ;;
    --no-latex) WITH_LATEX=0; shift ;;
    --open-api-port) OPEN_API_PORT=1; shift ;;
    --pm2-logrotate) PM2_LOGROTATE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

STEP=0
step() { STEP=$((STEP + 1)); printf '\n\033[1;34m==> [%02d] %s\033[0m\n' "$STEP" "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '\033[1;33m    WARNING: %s\033[0m\n' "$*" >&2; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run with sudo: sudo bash $0 $*"
[ -f "$ENV_TEMPLATE" ] || die "Missing $ENV_TEMPLATE (copy the whole infrastructure/deployment/vm folder to the VM)."
id "$APP_USER" >/dev/null 2>&1 || die "User '$APP_USER' does not exist."
APP_HOME="$(getent passwd "$APP_USER" | cut -d: -f6)"

# Inside a container (used to test this script) there is no systemd, swap or firewall.
IN_CONTAINER=0
if [ -f /.dockerenv ] || grep -qaE '(docker|containerd|lxc)' /proc/1/cgroup 2>/dev/null; then IN_CONTAINER=1; fi
HAS_SYSTEMD=0
if [ -d /run/systemd/system ]; then HAS_SYSTEMD=1; fi

export DEBIAN_FRONTEND=noninteractive
APT_OPTS=(-y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold --no-install-recommends)

svc() { # svc <action> <unit>: systemctl when available, else the SysV wrapper.
  if [ "$HAS_SYSTEMD" -eq 1 ]; then systemctl "$1" "$2"; else service "$2" "$1" >/dev/null 2>&1 || true; fi
}

# ------------------------------------------------------------- 1. packages ---
step "Base packages"
. /etc/os-release
if [ "${VERSION_ID:-}" != "24.04" ]; then warn "Tested on Ubuntu 24.04; this is ${PRETTY_NAME:-unknown}."; fi
info "Architecture: $(dpkg --print-architecture)"
apt-get update -q
apt-get install "${APT_OPTS[@]}" ca-certificates curl gnupg openssl rsync logrotate cron procps

# ----------------------------------------------------------------- 2. swap ---
step "Swap"
if [ "$IN_CONTAINER" -eq 1 ]; then
  info "Container detected: skipping swap."
elif swapon --show --noheadings | grep -q .; then
  info "Swap already active:"; swapon --show | sed 's/^/    /'
else
  if [ -z "$SWAP_SIZE" ]; then
    free_gb=$(df --output=avail -BG / | tail -1 | tr -dc '0-9')
    if [ "${free_gb:-0}" -ge 12 ]; then SWAP_SIZE=4G; else SWAP_SIZE=2G; fi
  fi
  info "Creating /swapfile ($SWAP_SIZE)"
  if [ ! -f /swapfile ]; then
    fallocate -l "$SWAP_SIZE" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$(( ${SWAP_SIZE%G} * 1024 )) status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
if [ "$IN_CONTAINER" -eq 0 ]; then
  cat > /etc/sysctl.d/99-astro-sushil.conf <<'EOF'
# Astro Sushil dev VM: use swap only under real pressure, keep file cache.
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
  sysctl -q -p /etc/sysctl.d/99-astro-sushil.conf
  info "vm.swappiness=10"
fi

# -------------------------------------------------------------- 3. Node.js ---
step "Node.js $NODE_MAJOR + pm2"
current_major=""
if command -v node >/dev/null 2>&1; then current_major="$(node -p 'process.versions.node.split(".")[0]')"; fi
if [ "$current_major" != "$NODE_MAJOR" ]; then
  info "Installing Node.js $NODE_MAJOR from NodeSource"
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -q
  apt-get install "${APT_OPTS[@]}" nodejs
else
  info "Node.js $(node -v) already installed"
fi
if ! command -v pm2 >/dev/null 2>&1; then
  info "Installing pm2 globally"
  npm install -g --no-fund --no-audit pm2 >/dev/null
fi
# (pm2 -v would spawn a root pm2 daemon; read the version from disk instead.)
info "node $(node -v), npm $(npm -v), pm2 $(node -p "require('$(npm root -g)/pm2/package.json').version")"

# ----------------------------------------------------------- 4. PostgreSQL ---
step "PostgreSQL $PG_MAJOR (apt, localhost only, low-memory tuning)"
apt-get install "${APT_OPTS[@]}" "postgresql-$PG_MAJOR" postgresql-client-common
PG_CONF_DIR="/etc/postgresql/$PG_MAJOR/main/conf.d"
install -d -o postgres -g postgres "$PG_CONF_DIR"
cat > "$PG_CONF_DIR/astro-lowmem.conf" <<'EOF'
# Astro Sushil dev VM (1 GB RAM). Loaded via include_dir = 'conf.d'.
listen_addresses = 'localhost'
max_connections = 20
shared_buffers = 64MB
effective_cache_size = 256MB
work_mem = 2MB
maintenance_work_mem = 32MB
wal_buffers = 2MB
min_wal_size = 64MB
max_wal_size = 256MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1
max_worker_processes = 2
max_parallel_workers = 1
max_parallel_workers_per_gather = 0
max_parallel_maintenance_workers = 1
autovacuum_max_workers = 2
jit = off
huge_pages = off
# Defence in depth: the API already pins its sessions to UTC, but raw SQL from
# psql / cron backups then reads the same wall-clock values Prisma writes.
timezone = 'UTC'
log_timezone = 'UTC'
EOF
if [ "$HAS_SYSTEMD" -eq 1 ]; then
  systemctl enable --quiet postgresql
  systemctl restart postgresql
else
  pg_ctlcluster "$PG_MAJOR" main restart 2>/dev/null || pg_ctlcluster "$PG_MAJOR" main start
fi
for _ in $(seq 1 30); do pg_isready -q -h localhost && break; sleep 1; done
pg_isready -q -h localhost || die "PostgreSQL did not start (see: journalctl -u postgresql)."

# Reuse the DB password already in the env file (re-runs), otherwise generate one.
DB_PASS=""
if [ -f "$ENV_FILE" ]; then
  DB_PASS="$(sed -n "s|^DATABASE_URL=\"\{0,1\}postgresql://$DB_USER:\([^@]*\)@.*|\1|p" "$ENV_FILE" | head -1)"
fi
[ -n "$DB_PASS" ] || DB_PASS="$(openssl rand -hex 24)"
info "Ensuring role '$DB_USER' and database '$DB_NAME' (password not shown)"
# SQL goes through stdin so the password never appears in the process list.
runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 -d postgres >/dev/null <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';
  ELSE
    ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';
  END IF;
END
\$\$;
SQL
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  runuser -u postgres -- createdb -O "$DB_USER" "$DB_NAME"
  info "Created database $DB_NAME"
else
  info "Database $DB_NAME already exists"
fi

# ---------------------------------------------------------------- 5. Redis ---
step "Redis"
if [ "$WITH_REDIS" -eq 1 ]; then
  apt-get install "${APT_OPTS[@]}" redis-server
  cat > /etc/redis/astro-lowmem.conf <<'EOF'
# Astro Sushil dev VM: locks/cache only, small and local.
bind 127.0.0.1 -::1
protected-mode yes
maxmemory 32mb
maxmemory-policy allkeys-lru
save ""
appendonly no
EOF
  chown redis:redis /etc/redis/astro-lowmem.conf
  grep -q '^include /etc/redis/astro-lowmem.conf' /etc/redis/redis.conf || echo 'include /etc/redis/astro-lowmem.conf' >> /etc/redis/redis.conf
  if [ "$HAS_SYSTEMD" -eq 1 ]; then systemctl enable --quiet redis-server; systemctl restart redis-server; else service redis-server restart >/dev/null 2>&1 || redis-server /etc/redis/redis.conf --daemonize yes; fi
  info "Redis bound to 127.0.0.1, maxmemory 32mb"
else
  info "Skipped (--no-redis). REDIS_URL stays empty; locks fall back to PostgreSQL."
fi

# ---------------------------------------------------------------- 6. LaTeX ---
step "XeLaTeX toolchain for report PDFs"
if [ "$WITH_LATEX" -eq 1 ]; then
  # Exactly what packages/report-engine/templates/platform/astrosushil-platform.sty needs:
  #  texlive-xetex             xelatex, fontspec backend, ucharclasses
  #  texlive-latex-recommended fontspec, xunicode, listings (tcolorbox 'most')
  #  texlive-latex-extra       tcolorbox, enumitem, lastpage, needspace, titletoc, newunicodechar
  #  texlive-pictures          tikz/pgf
  #  texlive-fonts-recommended pzdr.tfm (ZapfDingbats metrics xetex's hyperref driver loads)
  #  fonts-texgyre             TeX Gyre Pagella (main font)
  #  fonts-open-sans           Open Sans (sans font)
  #  fonts-noto-core           Noto Serif Devanagari (Hindi text, e.g. Fortune report)
  #  fonts-lmodern             Latin Modern (fontspec default fallback)
  #  poppler-utils             pdfinfo/pdftotext/pdffonts used by the PDF QA gate
  apt-get install "${APT_OPTS[@]}" \
    texlive-xetex texlive-latex-recommended texlive-latex-extra texlive-pictures texlive-fonts-recommended \
    fonts-texgyre fonts-open-sans fonts-noto-core fonts-lmodern fontconfig poppler-utils
  fc-cache -f >/dev/null 2>&1 || true
  for f in "TeX Gyre Pagella" "Open Sans" "Noto Serif Devanagari"; do
    if fc-list : family | grep -F -- "$f" >/dev/null; then info "font ok: $f"; else warn "font missing: $f"; fi
  done
  info "$(xelatex --version | head -1)"
else
  info "Skipped (--no-latex). Report generation will fail at the PDF step."
fi

# ---------------------------------------------------------------- 7. Caddy ---
step "Caddy reverse proxy"
apt-get install "${APT_OPTS[@]}" caddy
if [ -z "$DOMAIN" ] && [ -z "$PUBLIC_IP" ]; then
  PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null || true)"
fi
if [ -n "$DOMAIN" ]; then
  PUBLIC_URL="https://$DOMAIN"
  {
    if [ -n "$ACME_EMAIL" ]; then printf '{\n\temail %s\n}\n\n' "$ACME_EMAIL"; fi
    printf '%s {\n\tencode gzip\n\trequest_body {\n\t\tmax_size 20MB\n\t}\n\treverse_proxy 127.0.0.1:%s\n}\n' "$DOMAIN" "$API_PORT"
  } > /etc/caddy/Caddyfile
  info "HTTPS for $DOMAIN (certificate is requested on first start; ports 80 and 443 must be reachable)"
else
  PUBLIC_URL="http://${PUBLIC_IP:-YOUR_VM_PUBLIC_IP}"
  printf ':80 {\n\tencode gzip\n\trequest_body {\n\t\tmax_size 20MB\n\t}\n\treverse_proxy 127.0.0.1:%s\n}\n' "$API_PORT" > /etc/caddy/Caddyfile
  info "Plain HTTP on port 80 (no domain given)"
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || die "Generated Caddyfile is invalid."
if [ "$HAS_SYSTEMD" -eq 1 ]; then systemctl enable --quiet caddy; systemctl restart caddy; else info "No systemd: Caddy not started (container test)."; fi

# ------------------------------------------------------------- 8. firewall ---
step "Firewall (Oracle iptables + ufw)"
open_port() { # Insert an ACCEPT before Oracle's final REJECT rule, once.
  local port="$1"
  if iptables -C INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null; then
    info "iptables: tcp/$port already open"; return
  fi
  local pos
  pos="$(iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"{print $1; exit}')"
  iptables -I INPUT "${pos:-1}" -p tcp -m state --state NEW --dport "$port" -j ACCEPT
  info "iptables: opened tcp/$port (position ${pos:-1})"
}
if [ "$IN_CONTAINER" -eq 1 ]; then
  info "Container detected: skipping firewall."
else
  if ! command -v netfilter-persistent >/dev/null 2>&1; then
    echo iptables-persistent iptables-persistent/autosave_v4 boolean false | debconf-set-selections
    echo iptables-persistent iptables-persistent/autosave_v6 boolean false | debconf-set-selections
    apt-get install "${APT_OPTS[@]}" iptables-persistent
  fi
  open_port 80
  open_port 443
  if [ "$OPEN_API_PORT" -eq 1 ]; then open_port "$API_PORT"; fi
  netfilter-persistent save >/dev/null 2>&1 && info "iptables rules saved (/etc/iptables/rules.v4)"
  if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then
    ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
    [ "$OPEN_API_PORT" -eq 1 ] && ufw allow "$API_PORT/tcp" >/dev/null
    info "ufw is active: rules added"
  fi
  info "PostgreSQL and Redis listen on localhost only; they are never opened."
fi

# --------------------------------------------------------- 9. directories ---
step "Directories and API env file"
install -d -o "$APP_USER" -g "$APP_USER" -m 0755 "$BASE_DIR" "$APP_DIR"
install -d -o "$APP_USER" -g "$APP_USER" -m 0700 "$SHARED_DIR"
install -d -o "$APP_USER" -g "$APP_USER" -m 0700 "$STORAGE_DIR"
install -d -o postgres -g postgres -m 0700 "$BACKUP_DIR"

set_env() { # set_env KEY VALUE: replace the KEY= line or append it.
  local key="$1" value="$2" escaped
  escaped="$(printf '%s' "$value" | sed -e 's/[\\&|]/\\&/g')"
  if grep -q "^$key=" "$ENV_FILE"; then
    sed -i "s|^$key=.*|$key=$escaped|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}
fill_once() { # fill_once KEY VALUE: only if empty or still the __GENERATE__ placeholder.
  local key="$1" value="$2" cur
  cur="$(sed -n "s|^$key=||p" "$ENV_FILE" | head -1 | tr -d '"')"
  if [ -z "$cur" ] || [ "$cur" = "__GENERATE__" ]; then set_env "$key" "$value"; info "$key generated"; else info "$key kept"; fi
}

if [ ! -f "$ENV_FILE" ]; then
  install -o "$APP_USER" -g "$APP_USER" -m 0600 "$ENV_TEMPLATE" "$ENV_FILE"
  info "Created $ENV_FILE from .env.vm.example"
else
  info "Keeping existing $ENV_FILE (managed keys are refreshed)"
fi
umask 077
# Managed on every run:
set_env DATABASE_URL "\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public&connection_limit=5\""
set_env STORAGE_LOCAL_DIR "$STORAGE_DIR"
set_env PORT "$API_PORT"
if [ "$OPEN_API_PORT" -eq 1 ]; then set_env HOST 0.0.0.0; else set_env HOST 127.0.0.1; fi
set_env TRUST_PROXY 127.0.0.1
if [ "$WITH_REDIS" -eq 1 ]; then set_env REDIS_URL "redis://127.0.0.1:6379/0"; else set_env REDIS_URL ""; fi
# PUBLIC_API_URL: refreshed when a domain/IP is known, otherwise left as is.
cur_public="$(sed -n 's|^PUBLIC_API_URL=||p' "$ENV_FILE" | head -1)"
if [ -n "$DOMAIN" ] || [ -z "$cur_public" ] || [ "$cur_public" = "__GENERATE__" ]; then set_env PUBLIC_API_URL "$PUBLIC_URL"; fi
# Generated once, never overwritten:
fill_once JWT_SECRET "$(openssl rand -hex 48)"
fill_once DEV_MASTER_OTP "$(( $(od -An -N4 -tu4 /dev/urandom | tr -d ' ') % 900000 + 100000 ))"
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"
unset DB_PASS

# ------------------------------------------------------------------ 10. pm2 ---
step "pm2 startup on boot and log rotation"
if [ "$HAS_SYSTEMD" -eq 1 ]; then
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "$APP_HOME" >/dev/null
  systemctl enable --quiet "pm2-$APP_USER" 2>/dev/null || true
  info "pm2-$APP_USER.service enabled (apps start after the first deploy + 'pm2 save')"
else
  info "No systemd: skipping pm2 startup (container test)."
fi
if [ "$PM2_LOGROTATE" -eq 1 ]; then
  runuser -u "$APP_USER" -- env HOME="$APP_HOME" pm2 install pm2-logrotate >/dev/null
  runuser -u "$APP_USER" -- env HOME="$APP_HOME" pm2 set pm2-logrotate:max_size 20M >/dev/null
  runuser -u "$APP_USER" -- env HOME="$APP_HOME" pm2 set pm2-logrotate:retain 7 >/dev/null
  runuser -u "$APP_USER" -- env HOME="$APP_HOME" pm2 set pm2-logrotate:compress true >/dev/null
  rm -f /etc/logrotate.d/astro-sushil-pm2
  info "pm2-logrotate module installed (20M, keep 7)"
else
  cat > /etc/logrotate.d/astro-sushil-pm2 <<EOF
$APP_HOME/.pm2/logs/*.log {
    daily
    maxsize 20M
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    su $APP_USER $APP_USER
}
EOF
  info "System logrotate rule for pm2 logs (daily or 20M, keep 7; no extra process)"
fi

# pm2 commands run as root (startup) may leave a root daemon behind: ~60 MB wasted.
if pgrep -u root -f 'PM2 v.*God Daemon' >/dev/null 2>&1; then HOME=/root pm2 kill >/dev/null 2>&1 || true; fi

# --------------------------------------------------------------- 11. backup ---
step "Nightly database backup"
cat > /etc/cron.d/astro-sushil-backup <<EOF
# Nightly pg_dump at 03:15, keep 7 days. Restore: see README "Backups".
15 3 * * * postgres pg_dump -Fc $DB_NAME > $BACKUP_DIR/$DB_NAME-\$(date +\%a).dump 2>/dev/null
EOF
chmod 644 /etc/cron.d/astro-sushil-backup
info "/etc/cron.d/astro-sushil-backup -> $BACKUP_DIR (one file per weekday)"

# -------------------------------------------------------------- summary ---
step "Done"
cat <<EOF
    App user ........ $APP_USER
    App directory ... $APP_DIR          (filled by deploy.sh)
    API env file .... $ENV_FILE  (mode 600; secrets not shown)
    Report storage .. $STORAGE_DIR
    Public URL ...... $PUBLIC_URL
    Health check .... curl $PUBLIC_URL/health   (after the first deploy)

Next steps:
  1. Edit the env file and add your API keys (GEMINI_API_KEY for reports,
     OPENROUTER_API_KEY + OPENROUTER_MODEL for Jyoti chat):
       nano $ENV_FILE
  2. On your dev machine run:
       infrastructure/deployment/vm/deploy.sh $APP_USER@<vm-ip-or-domain>
  3. Master OTP for test logins:  sudo grep '^DEV_MASTER_OTP=' $ENV_FILE
EOF
