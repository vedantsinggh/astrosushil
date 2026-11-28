#!/usr/bin/env bash
# =============================================================================
# copy-historical-assets.sh - copy the website-era files the migrated database
# refers to (report PDFs, purchased digital files) from the LEGACY (website)
# bucket into the dedicated TESTING bucket, under the SAME object keys.
#
# The API then serves them from the testing bucket once the legacy bucket is
# listed in STORAGE_LEGACY_AWS_BUCKETS (see docs/historical-assets.md).
#
# Usage:
#   copy-historical-assets.sh --source-bucket B --source-region R --source-profile P \
#       --dest-bucket B --dest-region R --dest-profile P \
#       (--keys-file FILE | --keys-from-db) [options]
#
# Required:
#   --source-bucket <name>    legacy bucket to READ from (e.g. the website bucket)
#   --source-region <region>  its region (e.g. ap-south-1)
#   --source-profile <name>   AWS profile with READ-ONLY access to the source
#   --dest-bucket <name>      testing bucket to write to (never a production bucket)
#   --dest-region <region>    its region (R2: auto)
#   --dest-profile <name>     AWS profile with access to the testing bucket ONLY
# Keys (at least one; both may be combined):
#   --keys-file <file>        one object key (or bucket URL) per line; blank lines
#                             and lines starting with # are ignored
#   --keys-from-db            read every file reference from the TESTING database
#                             (read-only SQL through testing_compose exec -T
#                             testing-postgres psql): reports.s3Url, reports.storageKey,
#                             entitlement assetKey / bundleAssets keys, variant
#                             downloadKey, products.metadata.digitalAssetKey.
#                             URLs are mapped to keys with the API's resolveKey()
#                             rules for the SOURCE bucket; other hosts are skipped.
#   --no-bare-keys            with --keys-from-db: skip references that are already
#                             bare keys (only copy those stored as source-bucket URLs)
# Options:
#   --dest-endpoint <url>     S3 endpoint of the destination (Cloudflare R2:
#                             https://<account>.r2.cloudflarestorage.com)
#   --dry-run                 (DEFAULT) list and check what would be copied; reads
#                             object metadata (HEAD) only, writes nothing
#   --execute                 really copy
#   --overwrite               replace destination objects that differ from the source
#                             (asks for a typed confirmation); default: skip them
#   --limit <n>               process only the first n keys
#   --report-dir <dir>        where the result and failure lists go
#                             (default: $TESTING_ROOT/logs when writable, else .)
#   --aws-mode <auto|docker|local>
#                             auto (default): the amazon/aws-cli Docker image when
#                             docker is available, else a local `aws` binary
#   --aws-image <image>       default amazon/aws-cli:2.15.0
#   --aws-config-dir <dir>    AWS config/credentials directory (default ~/.aws),
#                             mounted read-only into the container
#   -h, --help
#
# Safety:
#   - Never deletes anything, in either bucket. Never changes the source.
#   - Refuses when source and destination are the same bucket, when the
#     destination is a known production bucket (PROTECTED_BUCKETS), or when both
#     profiles resolve to the same AWS identity.
#   - Every object is downloaded to a private temp dir, checked (size, MD5 vs a
#     single-part ETag, SHA-256 vs a stored S3 SHA-256 checksum when present),
#     uploaded with Content-MD5, and the destination is HEADed again to verify.
#   - Destination objects are private (no ACL is sent).
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/lib/common.sh" ]]; then
  # shellcheck source=lib/common.sh
  source "$SCRIPT_DIR/lib/common.sh"
fi
type -t log_info >/dev/null || log_info() { printf '[info]  %s\n' "$*" >&2; }
type -t log_ok >/dev/null || log_ok() { printf '[ok]    %s\n' "$*" >&2; }
type -t log_warn >/dev/null || log_warn() { printf '[warn]  %s\n' "$*" >&2; }
type -t log_error >/dev/null || log_error() { printf '[error] %s\n' "$*" >&2; }
type -t die >/dev/null || die() { log_error "$*"; exit 1; }
type -t confirm_phrase >/dev/null || confirm_phrase() {
  local reply=""
  { : </dev/tty; } 2>/dev/null || { log_error "No terminal available to confirm."; return 1; }
  printf '\nType exactly the following to continue:\n  %s\n> ' "$1" >/dev/tty
  IFS= read -r reply </dev/tty || return 1
  [[ "$reply" == "$1" ]]
}
TESTING_ROOT="${TESTING_ROOT:-/opt/astro-sushil/testing}"

usage() { awk 'NR == 1 { next } /^# =====/ { n++; if (n == 2) exit; next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; }

# Buckets that hold production data. The destination may never be one of them.
# PROTECTED_BUCKETS_EXTRA (space separated) adds more names.
PROTECTED_BUCKETS="astrosushil astro-sushil pdfapilambda ${PROTECTED_BUCKETS_EXTRA:-}"

SRC_BUCKET="" SRC_REGION="" SRC_PROFILE=""
DST_BUCKET="" DST_REGION="" DST_PROFILE="" DST_ENDPOINT=""
KEYS_FILE="" KEYS_FROM_DB=0 BARE_KEYS=1
EXECUTE=0 OVERWRITE=0 LIMIT=0 REPORT_DIR=""
AWS_MODE="auto" AWS_IMAGE="amazon/aws-cli:2.15.0" AWS_CONFIG_DIR="${HOME:-/root}/.aws"

need_arg() { [[ $# -ge 2 && -n "$2" && "$2" != --* ]] || die "Option $1 needs a value."; }
while (($#)); do
  case "$1" in
    --source-bucket) need_arg "$@"; SRC_BUCKET="$2"; shift 2 ;;
    --source-region) need_arg "$@"; SRC_REGION="$2"; shift 2 ;;
    --source-profile) need_arg "$@"; SRC_PROFILE="$2"; shift 2 ;;
    --dest-bucket) need_arg "$@"; DST_BUCKET="$2"; shift 2 ;;
    --dest-region) need_arg "$@"; DST_REGION="$2"; shift 2 ;;
    --dest-profile) need_arg "$@"; DST_PROFILE="$2"; shift 2 ;;
    --dest-endpoint) need_arg "$@"; DST_ENDPOINT="$2"; shift 2 ;;
    --keys-file) need_arg "$@"; KEYS_FILE="$2"; shift 2 ;;
    --keys-from-db) KEYS_FROM_DB=1; shift ;;
    --no-bare-keys) BARE_KEYS=0; shift ;;
    --dry-run) EXECUTE=0; shift ;;
    --execute) EXECUTE=1; shift ;;
    --overwrite) OVERWRITE=1; shift ;;
    --limit) need_arg "$@"; LIMIT="$2"; shift 2 ;;
    --report-dir) need_arg "$@"; REPORT_DIR="$2"; shift 2 ;;
    --aws-mode) need_arg "$@"; AWS_MODE="$2"; shift 2 ;;
    --aws-image) need_arg "$@"; AWS_IMAGE="$2"; shift 2 ;;
    --aws-config-dir) need_arg "$@"; AWS_CONFIG_DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

# ------------------------------------------------------------- validation ---
BUCKET_RE='^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$'
REGION_RE='^([a-z]{2}(-[a-z]+)+-[0-9]{1,2}|auto)$'
PROFILE_RE='^[A-Za-z0-9_.+-]{1,64}$'

[[ -n "$SRC_BUCKET" && -n "$SRC_REGION" && -n "$SRC_PROFILE" ]] || die "--source-bucket, --source-region and --source-profile are required."
[[ -n "$DST_BUCKET" && -n "$DST_REGION" && -n "$DST_PROFILE" ]] || die "--dest-bucket, --dest-region and --dest-profile are required."
[[ "$SRC_BUCKET" =~ $BUCKET_RE && "$SRC_BUCKET" != *..* ]] || die "Invalid source bucket name: $SRC_BUCKET"
[[ "$DST_BUCKET" =~ $BUCKET_RE && "$DST_BUCKET" != *..* ]] || die "Invalid destination bucket name: $DST_BUCKET"
[[ "$SRC_REGION" =~ $REGION_RE && "$SRC_REGION" != auto ]] || die "Invalid source region: $SRC_REGION"
[[ "$DST_REGION" =~ $REGION_RE ]] || die "Invalid destination region: $DST_REGION"
[[ "$SRC_PROFILE" =~ $PROFILE_RE ]] || die "Invalid source profile name."
[[ "$DST_PROFILE" =~ $PROFILE_RE ]] || die "Invalid destination profile name."
[[ "$SRC_PROFILE" != "$DST_PROFILE" ]] || die "Source and destination must use DIFFERENT profiles (read-only source, testing-only destination)."
if [[ -n "$DST_ENDPOINT" ]]; then
  [[ "$DST_ENDPOINT" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]] || die "--dest-endpoint must be an https:// origin, e.g. https://<account>.r2.cloudflarestorage.com"
fi
if [[ "$SRC_BUCKET" == "$DST_BUCKET" && -z "$DST_ENDPOINT" ]]; then
  die "Source and destination are the same bucket ($SRC_BUCKET). Refusing."
fi
for protected in $PROTECTED_BUCKETS; do
  [[ "$DST_BUCKET" != "$protected" ]] || die "Destination '$DST_BUCKET' is a production bucket. The destination must be the dedicated testing bucket."
done
[[ "$LIMIT" =~ ^[0-9]+$ ]] || die "--limit must be a number."
[[ -n "$KEYS_FILE" || "$KEYS_FROM_DB" == 1 ]] || die "Give --keys-file <file> and/or --keys-from-db."
[[ -z "$KEYS_FILE" || -r "$KEYS_FILE" ]] || die "Cannot read keys file: $KEYS_FILE"

case "$AWS_MODE" in
  auto) if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then AWS_MODE=docker
        elif command -v aws >/dev/null 2>&1; then AWS_MODE=local
        else die "Neither a usable docker nor an 'aws' binary was found."; fi ;;
  docker) command -v docker >/dev/null 2>&1 || die "docker not found." ;;
  local) command -v aws >/dev/null 2>&1 || die "aws not found." ;;
  *) die "--aws-mode must be auto, docker or local." ;;
esac
[[ "$AWS_MODE" != docker || -d "$AWS_CONFIG_DIR" ]] || die "AWS config directory not found: $AWS_CONFIG_DIR"
for cmd in md5sum sha256sum base64 od awk sort; do
  command -v "$cmd" >/dev/null 2>&1 || die "Required command missing: $cmd"
done

if [[ -z "$REPORT_DIR" ]]; then
  if [[ -d "$TESTING_ROOT/logs" && -w "$TESTING_ROOT/logs" ]]; then REPORT_DIR="$TESTING_ROOT/logs"; else REPORT_DIR="$PWD"; fi
fi
mkdir -p "$REPORT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RESULTS_FILE="$REPORT_DIR/copy-historical-assets-$STAMP.results.tsv"
FAILURES_FILE="$REPORT_DIR/copy-historical-assets-$STAMP.failures.tsv"

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/astro-historical-assets.XXXXXX")"
chmod 700 "$WORK_DIR"
cleanup() { [[ -n "${WORK_DIR:-}" && -d "$WORK_DIR" && "$WORK_DIR" == */astro-historical-assets.* ]] && rm -rf -- "$WORK_DIR"; }
trap cleanup EXIT

# ---------------------------------------------------------------- aws cli ---
# aws_run <src|dst> <aws args...>: runs the CLI with that side's profile/region.
# Host AWS_* credential variables are never passed on: only the named profile is used.
aws_run() {
  local side="$1"; shift
  local -a extra
  if [[ "$side" == src ]]; then
    extra=(--profile "$SRC_PROFILE" --region "$SRC_REGION")
  else
    extra=(--profile "$DST_PROFILE" --region "$DST_REGION")
    [[ -z "$DST_ENDPOINT" ]] || extra+=(--endpoint-url "$DST_ENDPOINT")
  fi
  if [[ "$AWS_MODE" == docker ]]; then
    # No -i: the CLI must never read stdin (the key loop feeds stdin).
    docker run --rm \
      --user "$(id -u):$(id -g)" \
      -e HOME=/tmp -e AWS_PAGER= \
      -e AWS_CONFIG_FILE=/aws/config -e AWS_SHARED_CREDENTIALS_FILE=/aws/credentials \
      -v "$AWS_CONFIG_DIR:/aws:ro" -v "$WORK_DIR:/work" \
      "$AWS_IMAGE" "$@" "${extra[@]}" </dev/null
  else
    env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN -u AWS_PROFILE AWS_PAGER= \
      aws "$@" "${extra[@]}" </dev/null
  fi
}
# Path of a work file as the CLI sees it.
cli_path() { if [[ "$AWS_MODE" == docker ]]; then printf '/work/%s' "$1"; else printf '%s/%s' "$WORK_DIR" "$1"; fi; }

# head_object <src|dst> <bucket> <key>: prints "size<TAB>etag<TAB>type<TAB>sha256<TAB>source-etag".
# Exit 0 found, 3 not found, 1 other error (message on stderr).
head_object() {
  local side="$1" bucket="$2" key="$3" out err rc=0
  err="$WORK_DIR/head.err"
  out="$(aws_run "$side" s3api head-object --bucket "$bucket" --key "$key" --checksum-mode ENABLED \
    --query '[ContentLength, ETag, ContentType, ChecksumSHA256, Metadata."source-etag"]' --output text 2>"$err")" || rc=$?
  if ((rc != 0)); then
    if grep -q '(404)\|Not Found' "$err"; then return 3; fi
    if grep -q '(403)\|Forbidden' "$err"; then
      log_error "HEAD $side forbidden for this key (without s3:ListBucket a missing object also answers 403)"
    else
      log_error "HEAD $side failed: $(tr '\n' ' ' <"$err" | cut -c1-300)"
    fi
    return 1
  fi
  # Text output: tab separated; the ETag keeps its quotes.
  printf '%s\n' "${out//\"/}"
}

hex_to_b64() { printf '%b' "$(printf '%s' "$1" | sed 's/../\\x&/g')" | base64 | tr -d '\n'; }
b64_to_hex() { printf '%s' "$1" | base64 -d 2>/dev/null | od -An -v -tx1 | tr -d ' \n'; }

# -------------------------------------------------------- key extraction ---
# url_decode: %XX sequences only ('+' stays '+', as decodeURIComponent does).
url_decode() {
  local s="$1" stripped
  [[ "$s" != *\\* ]] || return 1
  # Every % must start a valid %XX escape.
  stripped="$(printf '%s' "$s" | sed 's/%[0-9A-Fa-f][0-9A-Fa-f]//g')"
  [[ "$stripped" != *%* ]] || return 1
  printf '%b' "${s//%/\\x}"
}

# valid_key: mirrors StorageService.validateKey, a little stricter.
valid_key() {
  local k="$1"
  [[ -n "$k" && ${#k} -le 1024 ]] || return 1
  [[ "$k" != /* && "$k" != -* && "$k" != *..* && "$k" != *\\* ]] || return 1
  [[ "$k" != *$'\t'* && "$k" != *$'\r'* && "$k" != *$'\n'* ]] || return 1
  [[ ! "$k" =~ [[:cntrl:]] ]] || return 1
  return 0
}

# ref_to_key <reference>: prints the object key of the SOURCE bucket, same rules as
# StorageService.resolveKey for that bucket: virtual-hosted (<b>.s3.<r>, <b>.s3,
# <b>.s3-<r>) and path-style (s3.<r>/<b>/, s3/<b>/) URLs, http(s) only, query and
# fragment ignored. A bare key is returned as it is (unless --no-bare-keys).
ref_to_key() {
  local ref="$1" host path key b r
  b="$SRC_BUCKET"; r="$SRC_REGION"
  ref="${ref#"${ref%%[![:space:]]*}"}"; ref="${ref%"${ref##*[![:space:]]}"}"
  [[ -n "$ref" ]] || return 1
  [[ "$ref" != //* ]] || ref="https:$ref"
  if [[ "$ref" =~ ^[A-Za-z][A-Za-z0-9+.-]*: ]]; then
    local lower="${ref,,}"
    [[ "$lower" == http://* || "$lower" == https://* ]] || return 1
    [[ "$ref" =~ ^[A-Za-z]+://([^/?#]*)(/[^?#]*)? ]] || return 1
    host="${BASH_REMATCH[1],,}"; path="${BASH_REMATCH[2]:-}"
    [[ "$host" != *@* ]] || return 1
    case "$host" in
      "$b.s3.$r.amazonaws.com"|"$b.s3.amazonaws.com"|"$b.s3-$r.amazonaws.com")
        key="$path"; while [[ "$key" == /* ]]; do key="${key#/}"; done ;;
      "s3.$r.amazonaws.com"|"s3.amazonaws.com")
        [[ "$path" == "/$b/"* ]] || return 1
        key="${path#"/$b/"}" ;;
      *) return 1 ;;
    esac
    key="$(url_decode "$key")" || return 1
  else
    [[ "$BARE_KEYS" == 1 ]] || return 1
    key="$ref"
  fi
  valid_key "$key" || return 1
  printf '%s\n' "$key"
}

KEYS_RAW="$WORK_DIR/refs.txt"
KEYS_LIST="$WORK_DIR/keys.txt"
: >"$KEYS_RAW"

if [[ -n "$KEYS_FILE" ]]; then
  grep -v '^[[:space:]]*\(#\|$\)' "$KEYS_FILE" >>"$KEYS_RAW" || true
fi

if [[ "$KEYS_FROM_DB" == 1 ]]; then
  type -t testing_compose >/dev/null || die "--keys-from-db needs scripts/lib/common.sh (testing_compose)."
  log_info "Reading file references from the testing database (read-only transaction)"
  # Every column the API reads a stored file from. Read-only by PGOPTIONS; no writes possible.
  DB_SQL='
SELECT "s3Url" FROM reports WHERE "s3Url" IS NOT NULL
UNION ALL SELECT "storageKey" FROM reports WHERE "storageKey" IS NOT NULL
UNION ALL SELECT "assetKey" FROM digital_product_entitlements WHERE "assetKey" IS NOT NULL
UNION ALL SELECT b->>'"'"'key'"'"' FROM digital_product_entitlements e
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(e."bundleAssets"::jsonb) = '"'"'array'"'"' THEN e."bundleAssets"::jsonb ELSE '"'"'[]'"'"'::jsonb END) b
  WHERE b->>'"'"'key'"'"' IS NOT NULL
UNION ALL SELECT "downloadKey" FROM product_variants WHERE "downloadKey" IS NOT NULL
UNION ALL SELECT metadata::jsonb->>'"'"'digitalAssetKey'"'"' FROM products WHERE metadata::jsonb->>'"'"'digitalAssetKey'"'"' IS NOT NULL;'
  printf '%s\n' "$DB_SQL" | testing_compose exec -T -e PGOPTIONS='-c default_transaction_read_only=on' testing-postgres \
    sh -c 'exec psql -X -q -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >>"$KEYS_RAW" \
    || die "Could not read file references from the testing database."
fi

total_refs=0 rejected=0
: >"$KEYS_LIST.unsorted"
while IFS= read -r ref || [[ -n "$ref" ]]; do
  [[ -n "${ref//[[:space:]]/}" ]] || continue
  total_refs=$((total_refs + 1))
  if key="$(ref_to_key "$ref")"; then
    printf '%s\n' "$key" >>"$KEYS_LIST.unsorted"
  else
    rejected=$((rejected + 1))
  fi
done <"$KEYS_RAW"
LC_ALL=C sort -u "$KEYS_LIST.unsorted" >"$KEYS_LIST"
total="$(wc -l <"$KEYS_LIST" | tr -d ' ')"
if ((LIMIT > 0 && total > LIMIT)); then
  head -n "$LIMIT" "$KEYS_LIST" >"$KEYS_LIST.limited" && mv "$KEYS_LIST.limited" "$KEYS_LIST"
  total="$LIMIT"
fi
log_info "References read: $total_refs; not of bucket $SRC_BUCKET or invalid: $rejected; unique keys: $total"
((total > 0)) || { log_warn "No keys to process."; exit 0; }

# ---------------------------------------------------------- identity check ---
log_info "Mode: $([[ $EXECUTE == 1 ]] && echo EXECUTE || echo 'DRY RUN (nothing is written)'); aws: $AWS_MODE"
src_arn="$(aws_run src sts get-caller-identity --query Arn --output text 2>/dev/null)" || die "Source profile '$SRC_PROFILE' has no working credentials."
log_info "Source:      s3://$SRC_BUCKET ($SRC_REGION) as $src_arn"
if [[ -z "$DST_ENDPOINT" ]]; then
  dst_arn="$(aws_run dst sts get-caller-identity --query Arn --output text 2>/dev/null)" || die "Destination profile '$DST_PROFILE' has no working credentials."
  [[ "$src_arn" != "$dst_arn" ]] || die "Both profiles resolve to the same identity ($src_arn). Use a read-only source identity and a testing-only destination identity."
  log_info "Destination: s3://$DST_BUCKET ($DST_REGION) as $dst_arn"
else
  log_info "Destination: $DST_ENDPOINT/$DST_BUCKET (profile $DST_PROFILE)"
fi

if [[ "$EXECUTE" == 1 && "$OVERWRITE" == 1 ]]; then
  log_warn "--overwrite replaces destination objects that differ from the source."
  confirm_phrase "overwrite objects in $DST_BUCKET" || die "Not confirmed."
fi

# ------------------------------------------------------------------ copy ---
printf 'key\tresult\tsize\tsha256\n' >"$RESULTS_FILE"
printf 'key\treason\n' >"$FAILURES_FILE"
copied=0 would_copy=0 same=0 differs=0 missing=0 failed=0 n=0

record() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "${3:-}" "${4:-}" >>"$RESULTS_FILE"; }
fail() { failed=$((failed + 1)); printf '%s\t%s\n' "$1" "$2" >>"$FAILURES_FILE"; record "$1" failed; log_error "[$n/$total] $1: $2"; }

while IFS= read -r key; do
  n=$((n + 1))
  rc=0; src_head="$(head_object src "$SRC_BUCKET" "$key")" || rc=$?
  if ((rc == 3)); then
    missing=$((missing + 1)); record "$key" missing-in-source
    printf '%s\t%s\n' "$key" "missing in source" >>"$FAILURES_FILE"
    log_warn "[$n/$total] $key: not in the source bucket"
    continue
  elif ((rc != 0)); then fail "$key" "source HEAD failed"; continue; fi
  IFS=$'\t' read -r s_size s_etag s_type s_sha _ <<<"$src_head"
  [[ "$s_type" != None && -n "$s_type" ]] || s_type="application/octet-stream"
  [[ "$s_sha" != None ]] || s_sha=""

  rc=0; dst_head="$(head_object dst "$DST_BUCKET" "$key")" || rc=$?
  if ((rc == 0)); then
    IFS=$'\t' read -r d_size d_etag _ _ d_src_etag <<<"$dst_head"
    if [[ "$d_size" == "$s_size" && ( "$d_etag" == "$s_etag" || "$d_src_etag" == "$s_etag" ) ]]; then
      same=$((same + 1)); record "$key" already-present "$s_size"
      log_info "[$n/$total] $key: already in destination (same size and ETag), skipped"
      continue
    fi
    if [[ "$OVERWRITE" != 1 ]]; then
      differs=$((differs + 1)); record "$key" differs-skipped "$s_size"
      printf '%s\t%s\n' "$key" "destination differs from source (use --overwrite)" >>"$FAILURES_FILE"
      log_warn "[$n/$total] $key: destination exists and differs, skipped (use --overwrite)"
      continue
    fi
  elif ((rc != 3)); then fail "$key" "destination HEAD failed"; continue; fi

  if [[ "$EXECUTE" != 1 ]]; then
    would_copy=$((would_copy + 1)); record "$key" would-copy "$s_size"
    log_info "[$n/$total] $key: would copy ($s_size bytes)"
    continue
  fi

  # Download into the private work dir and verify before uploading.
  obj="obj.bin"; rm -f -- "$WORK_DIR/$obj"
  if ! aws_run src s3api get-object --bucket "$SRC_BUCKET" --key "$key" "$(cli_path "$obj")" >/dev/null 2>"$WORK_DIR/get.err"; then
    fail "$key" "download failed: $(tr '\n' ' ' <"$WORK_DIR/get.err" | cut -c1-200)"; continue
  fi
  l_size="$(wc -c <"$WORK_DIR/$obj" | tr -d ' ')"
  [[ "$l_size" == "$s_size" ]] || { fail "$key" "downloaded size $l_size != source size $s_size"; continue; }
  l_md5="$(md5sum "$WORK_DIR/$obj" | awk '{print $1}')"
  l_sha="$(sha256sum "$WORK_DIR/$obj" | awk '{print $1}')"
  if [[ "$s_etag" =~ ^[0-9a-f]{32}$ ]]; then
    [[ "$l_md5" == "$s_etag" ]] || { fail "$key" "MD5 $l_md5 != source ETag $s_etag (SSE-KMS source? see docs)"; continue; }
  else
    log_warn "[$n/$total] $key: multipart source ETag; integrity checked by size$([[ -n $s_sha && $s_sha != *-* ]] && echo ' and SHA-256')"
  fi
  if [[ -n "$s_sha" && "$s_sha" != *-* ]]; then
    [[ "$(b64_to_hex "$s_sha")" == "$l_sha" ]] || { fail "$key" "SHA-256 differs from the source checksum"; continue; }
  fi

  if ! aws_run dst s3api put-object --bucket "$DST_BUCKET" --key "$key" --body "$(cli_path "$obj")" \
      --content-type "$s_type" --content-md5 "$(hex_to_b64 "$l_md5")" \
      --metadata "source-etag=$s_etag,source-sha256=$l_sha" >/dev/null 2>"$WORK_DIR/put.err"; then
    fail "$key" "upload failed: $(tr '\n' ' ' <"$WORK_DIR/put.err" | cut -c1-200)"; continue
  fi
  rm -f -- "$WORK_DIR/$obj"

  rc=0; dst_head="$(head_object dst "$DST_BUCKET" "$key")" || rc=$?
  ((rc == 0)) || { fail "$key" "uploaded but destination HEAD failed"; continue; }
  IFS=$'\t' read -r d_size d_etag _ _ _ <<<"$dst_head"
  [[ "$d_size" == "$l_size" ]] || { fail "$key" "destination size $d_size != $l_size after upload"; continue; }
  if [[ "$d_etag" =~ ^[0-9a-f]{32}$ && "$d_etag" != "$l_md5" ]]; then
    fail "$key" "destination ETag $d_etag != MD5 $l_md5 after upload"; continue
  fi
  copied=$((copied + 1)); record "$key" copied "$l_size" "$l_sha"
  log_ok "[$n/$total] $key: copied and verified ($l_size bytes)"
done <"$KEYS_LIST"

# --------------------------------------------------------------- summary ---
printf '\nSummary (%s)\n' "$([[ $EXECUTE == 1 ]] && echo execute || echo dry-run)"
printf '  keys processed:            %s\n' "$n"
printf '  copied and verified:       %s\n' "$copied"
printf '  would copy (dry run):      %s\n' "$would_copy"
printf '  already present (same):    %s\n' "$same"
printf '  destination differs:       %s (skipped)\n' "$differs"
printf '  missing in source:         %s\n' "$missing"
printf '  failed:                    %s\n' "$failed"
printf '  results:  %s\n  failures: %s\n' "$RESULTS_FILE" "$FAILURES_FILE"
[[ "$EXECUTE" == 1 ]] || printf 'Dry run: nothing was written. Re-run with --execute to copy.\n'
((failed == 0)) || exit 1
exit 0
