#!/usr/bin/env bash
# =============================================================================
# create-deployment-bundle.sh - LOCAL: build a source bundle for the TESTING
# VPS from a committed, tested git revision.
#
# Usage (on your workstation, inside the repo):
#   infrastructure/testing/scripts/create-deployment-bundle.sh [options]
#
# Options:
#   --ref REF        commit/branch/tag to bundle (default HEAD)
#   --allow-dirty    allow uncommitted changes in the working tree (they are
#                    listed and NOT included: the bundle is always the
#                    committed REF); also downgrades "testing files missing
#                    from REF" to a warning (bundle is then NOT installable)
#   --out DIR        output directory (default <repo>/dist/testing-bundles)
#   -h, --help       show this help
#
# How: `git archive REF` (untracked and ignored files such as node_modules,
# .env, backups and zips can never enter), then removes apps/mobile,
# apps/desktop, platform-output, test-results, tmp, docs/referencerepots and
# root-level *.zip / *.pdf, scans every file for secrets (rzp_live_ keys,
# AWS access key ids, private keys, Google API keys, *.env / .env* files other
# than *.example, *.pem / *.key / id_rsa files) and fails if any is found,
# adds MANIFEST.txt (commit, date, file count) and writes
#   <out>/astro-sushil-testing-<shortsha>-<UTC timestamp>.tar.gz (+ .sha256)
# Nothing secret is added. Prints the scp commands for the bundle and for a DB
# backup. Never contacts any server.
# Exit codes: 0 bundle written, 1 error / secret found.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

REF="HEAD"; ALLOW_DIRTY=0; OUT=""
while (($#)); do
  case "$1" in
    --ref) REF="${2:?}"; shift 2 ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --out) OUT="${2:?}"; shift 2 ;;
    -h|--help) print_script_help "$0"; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

require_cmd git tar gzip sha256sum find grep
ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
OUT="${OUT:-$ROOT/dist/testing-bundles}"
COMMIT="$(git -C "$ROOT" rev-parse --verify "$REF^{commit}")" || die "Unknown ref: $REF"
SHORT="$(git -C "$ROOT" rev-parse --short=10 "$COMMIT")"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="astro-sushil-testing-$SHORT-$TS"

# ------------------------------------------------------------ cleanliness ---
dirty="$(git -C "$ROOT" status --porcelain --untracked-files=no)"
if [[ -n "$dirty" ]]; then
  if (( ALLOW_DIRTY == 1 )); then
    log_warn "=================================================================="
    log_warn "WORKING TREE IS DIRTY. These changes are NOT in the bundle (it is"
    log_warn "built from commit $SHORT only):"
    printf '%s\n' "$dirty" | sed 's/^/    /' >&2
    log_warn "=================================================================="
  else
    printf '%s\n' "$dirty" | sed 's/^/    /' >&2
    die "Tracked files have uncommitted changes. Commit (and test) first, or pass --allow-dirty."
  fi
fi
[[ "$REF" == "HEAD" ]] || log_info "bundling ref $REF ($COMMIT)"

# --------------------------------------------------------------- staging ---
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd -P)"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/astro-bundle.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
TREE="$STAGE/$NAME"
mkdir -p "$TREE"
git -C "$ROOT" archive --format=tar "$COMMIT" | tar -x -C "$TREE"

for d in apps/mobile apps/desktop platform-output test-results tmp docs/referencerepots dist; do
  rm -rf "${TREE:?}/$d"
done
find "$TREE" -maxdepth 1 -type f \( -iname '*.zip' -o -iname '*.pdf' \) -delete

missing=()
for f in docker-compose.testing.yml infrastructure/testing/scripts/install-testing.sh \
         infrastructure/testing/env/api.env.example infrastructure/testing/nginx/testing.conf; do
  [[ -e "$TREE/$f" ]] || missing+=("$f")
done
if (( ${#missing[@]} > 0 )); then
  if (( ALLOW_DIRTY == 1 )); then
    log_warn "Commit $SHORT lacks testing files (${missing[*]}): this bundle is NOT installable. Commit them first."
  else
    die "Commit $SHORT lacks testing files: ${missing[*]}. Commit them first."
  fi
fi

# ----------------------------------------------------------- secret scan ---
log_info "Scanning $(find "$TREE" -type f | wc -l) files for secrets"
# Real Razorpay live key ids are rzp_live_ + 14 characters; AWS documents the
# fake id AKIAIOSFODNN7EXAMPLE (used in unit tests); *.example files may hold
# placeholder PEM markers. Those known placeholders are ignored, nothing else.
SECRET_RE='rzp_live_[A-Za-z0-9]{14,}|AKIA[0-9A-Z]{16}|-----BEGIN ([A-Z]+ )*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35}'
hits="$(grep -rIoE "$SECRET_RE" "$TREE" 2>/dev/null | sed "s|^$TREE/||" \
  | grep -vE ':AKIA[0-9A-Z]{9}EXAMPLE$' \
  | grep -vE '\.example:-----BEGIN ([A-Z]+ )*PRIVATE KEY-----$' \
  | cut -d: -f1 | sort -u || true)"
badnames="$(cd "$TREE" && find . -type f \( -name '*.env' -o -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name 'id_rsa*' -o -name '*.p12' -o -name '*.pfx' \) \
  ! -name '*.example' | sed 's|^\./||' || true)"
if [[ -n "$hits" || -n "$badnames" ]]; then
  [[ -z "$hits" ]] || { log_error "Secret-like content in:"; printf '    %s\n' $hits >&2; }
  [[ -z "$badnames" ]] || { log_error "Secret-like file names:"; printf '    %s\n' $badnames >&2; }
  die "Secret scan failed; no bundle written. Remove the secrets from git history/commit, then retry."
fi
log_ok "secret scan clean"

# -------------------------------------------------------------- manifest ---
FILE_COUNT="$(find "$TREE" -type f | wc -l)"
{
  printf 'bundle: %s\n' "$NAME"
  printf 'commit: %s\n' "$COMMIT"
  printf 'ref: %s\n' "$REF"
  printf 'commit_date: %s\n' "$(git -C "$ROOT" show -s --format=%cI "$COMMIT")"
  printf 'created_at: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'working_tree_dirty: %s\n' "$([[ -n "$dirty" ]] && echo yes || echo no)"
  printf 'file_count: %s\n' "$((FILE_COUNT + 1))"
  printf 'excluded: apps/mobile apps/desktop platform-output test-results tmp docs/referencerepots dist /*.zip /*.pdf\n'
} >"$TREE/MANIFEST.txt"

ARCHIVE="$OUT/$NAME.tar.gz"
MTIME="$(git -C "$ROOT" show -s --format=%cI "$COMMIT")"
tar -C "$STAGE" --sort=name --owner=0 --group=0 --numeric-owner --mtime="$MTIME" -cf - "$NAME" | gzip -n -9 >"$ARCHIVE"
( cd "$OUT" && sha256sum "$NAME.tar.gz" >"$NAME.tar.gz.sha256" )
SIZE="$(du -h "$ARCHIVE" | cut -f1)"
log_ok "bundle: $ARCHIVE ($SIZE, $((FILE_COUNT + 1)) files)"
log_ok "sha256: $ARCHIVE.sha256"

cat <<EOT

Copy to the VPS (replace user@VPS):
  scp "$ARCHIVE" "$ARCHIVE.sha256" user@VPS:/tmp/

Database backup (separately; it contains personal data):
  scp <backup>.dump <backup>.dump.sha256 <backup>.dump.meta user@VPS:/tmp/
  ssh user@VPS 'chmod 600 /tmp/<backup>.dump*'
  # on the VPS move it into /opt/astro-sushil/testing/data/postgres-backup/ (mode 700 dir)

Install / update on the VPS:
  mkdir -p /tmp/$NAME && tar -xzf /tmp/$NAME.tar.gz -C /tmp/$NAME --strip-components=1
  sudo /tmp/$NAME/infrastructure/testing/scripts/install-testing.sh --bundle /tmp/$NAME.tar.gz
  sudo /opt/astro-sushil/testing/repo/infrastructure/testing/scripts/update-testing.sh --bundle /tmp/$NAME.tar.gz --backup-db
EOT
