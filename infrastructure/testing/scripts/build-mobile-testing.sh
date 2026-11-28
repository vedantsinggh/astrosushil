#!/usr/bin/env bash
# Builds an Android APK of the Flutter app that talks ONLY to the testing API.
# Runs on the LOCAL machine (where Flutter is installed), never on the VPS.
#
#   infrastructure/testing/scripts/build-mobile-testing.sh --api-url https://api-test.example.com/api/v1
#
# The build passes --dart-define=DEPLOYMENT_ENV=testing, so the app itself refuses to start
# with a missing or production API URL (apps/mobile/lib/core/config/app_config.dart).
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"

API_URL=""
BUILD_KIND="apk"
MODE="release"
OUT_DIR="$REPO_ROOT/dist/testing-mobile"
EXTRA_DEFINES=()

PROD_HOSTS="backend.astrosushil.com api.astrosushil.com astrosushil.com www.astrosushil.com"

usage() {
  cat <<'EOF'
Usage: build-mobile-testing.sh --api-url <https://host/api/v1> [options]

Options:
  --api-url URL          Testing API base URL (required). Must be https and not a production host.
                         Use the API-only origin (api-test.<host>), not the website origin:
                         the website origin is behind HTTP basic auth, which the app cannot send.
  --debug                Build a debug APK instead of release.
  --appbundle            Build an .aab instead of an .apk.
  --define KEY=VALUE     Extra --dart-define (repeatable), e.g. GOOGLE_SERVER_CLIENT_ID=...
  --out DIR              Copy the result here (default: dist/testing-mobile).
  --allow-http           Allow an http:// URL (debug builds only; release Android blocks cleartext).
  -h, --help             Show this help.
EOF
}

ALLOW_HTTP=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url) API_URL="${2:-}"; shift 2 ;;
    --debug) MODE="debug"; shift ;;
    --appbundle) BUILD_KIND="appbundle"; shift ;;
    --define) EXTRA_DEFINES+=("--dart-define=${2:-}"); shift 2 ;;
    --out) OUT_DIR="${2:-}"; shift 2 ;;
    --allow-http) ALLOW_HTTP=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 64 ;;
  esac
done

die() { echo "ERROR: $*" >&2; exit 1; }

[[ -n "$API_URL" ]] || { usage; die "--api-url is required"; }
command -v flutter >/dev/null 2>&1 || die "flutter not found in PATH"

scheme="${API_URL%%://*}"
rest="${API_URL#*://}"
host="${rest%%/*}"
host="${host%%:*}"
host="$(printf '%s' "$host" | tr '[:upper:]' '[:lower:]')"
[[ -n "$host" && "$rest" != "$API_URL" ]] || die "invalid URL: $API_URL"
for h in $PROD_HOSTS; do
  [[ "$host" == "$h" ]] && die "refusing production API host: $host"
done
if [[ "$scheme" != "https" ]]; then
  if [[ "$scheme" == "http" && "$ALLOW_HTTP" == "1" && "$MODE" == "debug" ]]; then
    echo "WARN: http:// API URL; this only works in a debug build and on networks you trust." >&2
  else
    die "API URL must be https:// (release Android builds refuse cleartext HTTP). Use --debug --allow-http for a debug build."
  fi
fi
[[ "$API_URL" == */api/v1 || "$API_URL" == */api/v1/ ]] || echo "NOTE: /api/v1 is appended by the app when missing." >&2

cd "$MOBILE_DIR"
echo "Building $MODE $BUILD_KIND against $API_URL"
flutter build "$BUILD_KIND" "--$MODE" \
  --dart-define=DEPLOYMENT_ENV=testing \
  "--dart-define=API_BASE_URL=$API_URL" \
  ${EXTRA_DEFINES[@]+"${EXTRA_DEFINES[@]}"}

mkdir -p "$OUT_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
if [[ "$BUILD_KIND" == "apk" ]]; then
  src="build/app/outputs/flutter-apk/app-$MODE.apk"
  dst="$OUT_DIR/astro-sushil-testing-$MODE-$stamp.apk"
else
  src="build/app/outputs/bundle/${MODE}/app-${MODE}.aab"
  dst="$OUT_DIR/astro-sushil-testing-$MODE-$stamp.aab"
fi
[[ -f "$src" ]] || die "build output not found: $src"
cp "$src" "$dst"
( cd "$OUT_DIR" && sha256sum "$(basename "$dst")" > "$(basename "$dst").sha256" )
echo "Built: $dst"
echo "SHA256: $(cut -d' ' -f1 "$dst.sha256")"
echo "Note: the testing APK uses the same application id (com.astrosushil.app) as production;"
echo "      installing it replaces a production install on the same device."
