#!/usr/bin/env bash
# =============================================================================
# Astro Sushil backend - build locally, ship to the dev VM, (re)start with pm2.
#
# Run ON YOUR DEV MACHINE from anywhere inside the repository:
#   infrastructure/deployment/vm/deploy.sh ubuntu@<vm-ip-or-domain>
#
# What it does:
#   1. (dev machine) prisma generate + TypeScript build of packages/* and apps/api.
#      The build never runs on the 1 GB VM (tsc can run out of memory there).
#   2. (dev machine) packs only the runtime files into a staging folder:
#      root package.json + package-lock.json, workspace package.json files,
#      apps/api/dist, apps/api/prisma (schema + migrations), packages/*/dist,
#      packages/report-engine/templates (LaTeX style + images), this script,
#      create-admin.sh and ecosystem.config.cjs.
#   3. rsync the pack to /opt/astro-sushil/app on the VM (node_modules and the
#      .env link on the VM are preserved).
#   4. (VM, over ssh) runs this same script with --remote:
#      npm ci --omit=dev for the API workspaces only (skipped when the lockfile
#      did not change), prisma generate, prisma migrate deploy, pm2 startOrReload,
#      pm2 save, health check.
#
# Options:
#   --dry-run          Build and pack into --out, then stop. No rsync, no ssh.
#   --out DIR          Staging folder for the pack
#                      (default: ${TMPDIR:-/tmp}/astro-sushil-vm-pack; it is wiped first).
#   --skip-build       Reuse the existing dist folders (no prisma generate / tsc).
#   --clean            Remove dist folders and tsbuildinfo files before building
#                      (use after deleting or renaming source files).
#   -i, --identity F   ssh private key file.
#   -p, --port N       ssh port (default 22).
#   --remote-dir DIR   App directory on the VM (default /opt/astro-sushil/app).
#   --no-restart       Upload and install, but do not restart pm2 apps.
#   --remote           Internal: the VM half. Run by step 4 over ssh.
#   -h, --help         Show this help.
# =============================================================================
set -euo pipefail

REMOTE_DIR="/opt/astro-sushil/app"
SHARED_ENV="/opt/astro-sushil/shared/api.env"
MODE="local"
DRY_RUN=0
SKIP_BUILD=0
CLEAN=0
NO_RESTART=0
OUT_DIR=""
SSH_PORT=22
SSH_KEY=""
TARGET=""

usage() { awk 'NR > 2 && /^# =====/ { exit } NR > 2' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --out) OUT_DIR="${2:?--out needs a value}"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --clean) CLEAN=1; shift ;;
    -i|--identity) SSH_KEY="${2:?--identity needs a value}"; shift 2 ;;
    -p|--port) SSH_PORT="${2:?--port needs a value}"; shift 2 ;;
    --remote-dir) REMOTE_DIR="${2:?--remote-dir needs a value}"; shift 2 ;;
    --no-restart) NO_RESTART=1; shift ;;
    --remote) MODE="remote"; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    *) TARGET="$1"; shift ;;
  esac
done

STEP=0
step() { STEP=$((STEP + 1)); printf '\n\033[1;34m==> [%02d] %s\033[0m\n' "$STEP" "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '\033[1;33m    WARNING: %s\033[0m\n' "$*" >&2; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# Workspaces the API needs at runtime. apps/api imports report-engine,
# prediction-engine and gupta-nadi-engine without declaring them in its
# package.json, so every one is listed explicitly for `npm ci -w`.
RUNTIME_WORKSPACES=(apps/api packages/shared packages/astrology-engine packages/gupta-nadi-engine packages/prediction-engine packages/report-engine)

# =============================================================================
# VM half
# =============================================================================
remote_main() {
  cd "$REMOTE_DIR"
  [ -f .deploy-info ] || die "$REMOTE_DIR/.deploy-info missing: run deploy.sh from the dev machine."
  # shellcheck disable=SC1091
  . ./.deploy-info

  step "Checks on the VM"
  command -v node >/dev/null || die "node not found: run setup.sh first."
  command -v pm2 >/dev/null || die "pm2 not found: run setup.sh first."
  [ -f "$SHARED_ENV" ] || die "$SHARED_ENV missing: run setup.sh first."
  [ -r "$SHARED_ENV" ] || die "$SHARED_ENV is not readable by $(id -un)."
  info "node $(node -v) on $(uname -m); release $DEPLOY_GIT_REF built $DEPLOY_BUILT_AT"
  if [ "${DEPLOY_NODE_MAJOR:-}" != "$(node -p 'process.versions.node.split(".")[0]')" ]; then
    info "Built with Node $DEPLOY_NODE_MAJOR, running on $(node -v): fine (plain ES2021 output, no native addons)."
  fi
  env_has() { grep -Eq "^$1=\"?[^\"[:space:]]+" "$SHARED_ENV"; }
  env_has DATABASE_URL || die "DATABASE_URL is empty in $SHARED_ENV (re-run setup.sh)."
  env_has JWT_SECRET || die "JWT_SECRET is empty in $SHARED_ENV (re-run setup.sh)."
  grep -Eq '^[A-Z0-9_]+="?__GENERATE__' "$SHARED_ENV" && die "$SHARED_ENV still has __GENERATE__ placeholders (re-run setup.sh)."
  env_has GEMINI_API_KEY || warn "GEMINI_API_KEY is empty: report PDFs and Rashi Bhavishya will fail."
  env_has OPENROUTER_API_KEY || warn "OPENROUTER_API_KEY is empty: Jyoti chat will not answer."
  env_has OPENROUTER_MODEL || warn "OPENROUTER_MODEL is empty: the code default model no longer exists on OpenRouter."
  command -v xelatex >/dev/null || warn "xelatex not installed: report PDFs will fail (setup.sh without --no-latex)."
  ln -sfn "$SHARED_ENV" apps/api/.env
  info "apps/api/.env -> $SHARED_ENV"

  step "Production dependencies (npm ci --omit=dev, API workspaces only)"
  local lock_hash ws_args=()
  lock_hash="$( (sha256sum package-lock.json; node -v) | sha256sum | cut -c1-16)"
  for ws in "${RUNTIME_WORKSPACES[@]}"; do ws_args+=(-w "$ws"); done
  if [ -d node_modules ] && [ "$(cat node_modules/.astro-lock-hash 2>/dev/null || true)" = "$lock_hash" ]; then
    info "package-lock.json unchanged: keeping node_modules"
  else
    # One npm process at a time with a modest heap; swap absorbs the peak.
    NODE_OPTIONS=--max-old-space-size=384 npm ci --omit=dev --no-audit --no-fund --loglevel=error "${ws_args[@]}"
    echo "$lock_hash" > node_modules/.astro-lock-hash
    info "Installed $(du -sh node_modules | cut -f1) of runtime dependencies"
  fi
  for pkg in api shared astrology-engine gupta-nadi-engine prediction-engine report-engine; do
    [ -e "node_modules/@astro/$pkg" ] || die "node_modules/@astro/$pkg is missing after npm ci."
  done

  step "Prisma generate + migrate deploy"
  local prisma_cmd
  if [ -x node_modules/.bin/prisma ] && [ "$(node -p "require('prisma/package.json').version" 2>/dev/null)" = "$DEPLOY_PRISMA_VERSION" ]; then
    prisma_cmd=("$REMOTE_DIR/node_modules/.bin/prisma")
  else
    prisma_cmd=(npx --yes "prisma@$DEPLOY_PRISMA_VERSION")
  fi
  # Run from apps/api so Prisma loads apps/api/.env (DATABASE_URL).
  (cd apps/api && "${prisma_cmd[@]}" generate --schema prisma/schema.prisma >/dev/null && info "Prisma client generated for $(uname -m)")
  (cd apps/api && "${prisma_cmd[@]}" migrate deploy --schema prisma/schema.prisma)

  storage_dir="$(sed -n 's|^STORAGE_LOCAL_DIR=||p' "$SHARED_ENV" | tr -d '"' | head -1)"
  if [ -n "$storage_dir" ]; then
    [ -w "$storage_dir" ] || die "Report storage $storage_dir is not writable by $(id -un)."
    info "Report storage: $storage_dir ($(df -h --output=avail "$storage_dir" | tail -1 | tr -d ' ') free)"
  fi

  if [ "$NO_RESTART" -eq 1 ]; then
    info "--no-restart: pm2 apps not restarted."
    return
  fi

  step "Start / reload with pm2"
  # Fork mode: reload = graceful restart of each app in turn. On SIGTERM the
  # worker stops claiming, gives the running report REPORT_SHUTDOWN_GRACE_MS,
  # then releases its claim; the new worker resumes it on start (finished LLM
  # topics come from the cache). The API is unreachable for the few seconds of
  # its own restart. No report is stranded: worst case (hard kill) it resumes
  # once its 60 s lease expires, so an in-progress report is delayed by about
  # 2 minutes at most.
  pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save >/dev/null
  info "pm2 process list saved (restored on boot by pm2-$(id -un).service)"

  step "Health check"
  local port ok=0
  port="$(sed -n 's|^PORT=||p' "$SHARED_ENV" | tr -d '"' | head -1)"
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 "http://127.0.0.1:${port:-3000}/health" >/dev/null 2>&1; then ok=1; break; fi
    sleep 2
  done
  [ "$ok" -eq 1 ] || { pm2 logs astro-api --lines 40 --nostream || true; die "API did not answer on /health."; }
  info "GET /health -> $(curl -fsS "http://127.0.0.1:${port:-3000}/health")"
  info "GET /ready  -> $(curl -sS "http://127.0.0.1:${port:-3000}/ready" || true)"
  pm2 status
  free -m | sed 's/^/    /'
}

# =============================================================================
# Dev-machine half
# =============================================================================
local_main() {
  local repo
  repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
  cd "$repo"
  [ -f package.json ] && [ -d apps/api ] || die "Could not find the repository root (looked in $repo)."
  [ -n "$OUT_DIR" ] || OUT_DIR="${TMPDIR:-/tmp}/astro-sushil-vm-pack"
  if [ "$DRY_RUN" -eq 0 ] && [ -z "$TARGET" ]; then
    usage; die "Missing target, e.g. ubuntu@203.0.113.10 (or use --dry-run)."
  fi

  step "Build on this machine"
  command -v node >/dev/null || die "node not found."
  if [ ! -d node_modules ]; then info "node_modules missing: npm ci"; npm ci --no-audit --no-fund; fi
  if [ "$SKIP_BUILD" -eq 1 ]; then
    info "--skip-build: using existing dist folders"
  else
    if [ "$CLEAN" -eq 1 ]; then
      info "--clean: removing dist folders and tsbuildinfo files"
      rm -rf apps/api/dist packages/*/dist
      rm -f apps/api/tsconfig.tsbuildinfo packages/*/tsconfig.tsbuildinfo
    fi
    npm run db:generate --workspace=apps/api --silent >/dev/null
    npm run build:packages --silent
    npm run build:api --silent
    info "TypeScript build finished"
  fi
  for f in apps/api/dist/server.js apps/api/dist/worker.js packages/report-engine/dist/index.js; do
    [ -f "$f" ] || die "$f missing: the build did not produce it."
  done

  step "Pack runtime files into $OUT_DIR"
  rm -rf "$OUT_DIR"
  mkdir -p "$OUT_DIR"
  cp package.json package-lock.json "$OUT_DIR/"
  # Every workspace manifest (admin too) keeps the lockfile consistent for npm ci.
  for manifest in apps/*/package.json packages/*/package.json; do
    install -D -m 0644 "$manifest" "$OUT_DIR/$manifest"
  done
  local rs=(rsync -a --exclude '*.tsbuildinfo' --exclude '__tests__/' --exclude '*.test.js' --exclude '*.test.js.map')
  "${rs[@]}" --exclude '/apps/' apps/api/dist/ "$OUT_DIR/apps/api/dist/"
  "${rs[@]}" --exclude 'seed.ts' apps/api/prisma/ "$OUT_DIR/apps/api/prisma/"
  for pkg in shared astrology-engine gupta-nadi-engine prediction-engine report-engine; do
    "${rs[@]}" --exclude '*.d.ts' --exclude '*.d.ts.map' "packages/$pkg/dist/" "$OUT_DIR/packages/$pkg/dist/"
  done
  # Read at runtime by packages/report-engine/dist/platform/render/document.js (../../../templates).
  rsync -a packages/report-engine/templates/ "$OUT_DIR/packages/report-engine/templates/"
  cp infrastructure/deployment/vm/ecosystem.config.cjs "$OUT_DIR/"
  install -m 0755 infrastructure/deployment/vm/deploy.sh "$OUT_DIR/deploy.sh"
  install -m 0755 infrastructure/deployment/vm/create-admin.sh "$OUT_DIR/create-admin.sh"

  local git_ref prisma_version
  git_ref="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  if [ -n "$(git status --porcelain -- apps/api packages 2>/dev/null | head -1)" ]; then git_ref="$git_ref+uncommitted"; fi
  prisma_version="$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")"
  cat > "$OUT_DIR/.deploy-info" <<EOF
DEPLOY_GIT_REF='$git_ref'
DEPLOY_BUILT_AT='$(date -u +%Y-%m-%dT%H:%M:%SZ)'
DEPLOY_NODE_MAJOR='$(node -p 'process.versions.node.split(".")[0]')'
DEPLOY_PRISMA_VERSION='$prisma_version'
EOF
  # The pack must never contain env files or secrets.
  if find "$OUT_DIR" -name '.env*' | grep -q .; then die "An .env file ended up in the pack; aborting."; fi
  info "Pack size: $(du -sh "$OUT_DIR" | cut -f1) ($(find "$OUT_DIR" -type f | wc -l) files), release $git_ref, prisma $prisma_version"

  if [ "$DRY_RUN" -eq 1 ]; then
    step "Dry run: stopping before rsync"
    info "Inspect: ls $OUT_DIR"
    info "Local smoke test: (cd $OUT_DIR && npm ci --omit=dev ${RUNTIME_WORKSPACES[*]/#/-w })"
    return
  fi

  local ssh_opts=(-p "$SSH_PORT" -o ServerAliveInterval=30)
  [ -n "$SSH_KEY" ] && ssh_opts+=(-i "$SSH_KEY")

  step "Upload to $TARGET:$REMOTE_DIR"
  ssh "${ssh_opts[@]}" "$TARGET" "test -d '$REMOTE_DIR' && test -w '$REMOTE_DIR'" \
    || die "$REMOTE_DIR does not exist or is not writable on the VM: run setup.sh there first."
  # --delete removes stale files from older releases but keeps the VM's
  # node_modules and the apps/api/.env symlink.
  rsync -az --delete --info=stats1 \
    --filter='P node_modules/' --filter='P /apps/api/.env' \
    -e "ssh ${ssh_opts[*]}" "$OUT_DIR/" "$TARGET:$REMOTE_DIR/"

  step "Install, migrate and restart on the VM"
  local remote_flags=""
  [ "$NO_RESTART" -eq 1 ] && remote_flags="--no-restart"
  ssh "${ssh_opts[@]}" "$TARGET" "bash '$REMOTE_DIR/deploy.sh' --remote --remote-dir '$REMOTE_DIR' $remote_flags"

  step "Deployed"
  info "Logs:    ssh $TARGET pm2 logs"
  info "Status:  ssh $TARGET pm2 status"
}

if [ "$MODE" = "remote" ]; then remote_main; else local_main; fi
