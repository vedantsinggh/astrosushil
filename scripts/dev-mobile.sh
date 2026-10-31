#!/usr/bin/env bash
# ==============================================================================
# Astro Sushil - Mobile Development & Physical Android Device Helper
# ==============================================================================
# Connects Flutter on a physical Android device to the local Fastify backend.
# Supports both Wi-Fi LAN direct routing (192.168.1.10:3000) and USB ADB reverse (127.0.0.1:3000).
# Features reliable multi-device discovery, physical device preference, and explicit device overrides.
# ==============================================================================

set -euo pipefail

BACKEND_PORT=3000
DEFAULT_LAN_IP="192.168.1.10"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MOBILE_DIR="${WORKSPACE_ROOT}/apps/mobile"

# Ensure Java 17 is used for Gradle/Flutter Android builds if available
if [[ -z "${JAVA_HOME:-}" || "${JAVA_HOME}" == *java-25* ]]; then
  if [[ -d "/usr/lib/jvm/java-1.17.0-openjdk-amd64" ]]; then
    export JAVA_HOME="/usr/lib/jvm/java-1.17.0-openjdk-amd64"
    export PATH="${JAVA_HOME}/bin:${PATH}"
  fi
fi

# Locate adb binary - prefer Android SDK platform-tools to avoid conflicts
find_adb() {
  if [[ -n "${ANDROID_HOME:-}" && -x "${ANDROID_HOME}/platform-tools/adb" ]]; then
    echo "${ANDROID_HOME}/platform-tools/adb"
  elif [[ -n "${ANDROID_SDK_ROOT:-}" && -x "${ANDROID_SDK_ROOT}/platform-tools/adb" ]]; then
    echo "${ANDROID_SDK_ROOT}/platform-tools/adb"
  elif [[ -x "/home/pilot/Android/Sdk/platform-tools/adb" ]]; then
    echo "/home/pilot/Android/Sdk/platform-tools/adb"
  elif [[ -x "/home/pilot/Android/platform-tools/adb" ]]; then
    echo "/home/pilot/Android/platform-tools/adb"
  elif command -v adb >/dev/null 2>&1; then
    command -v adb
  else
    echo "adb"
  fi
}

ADB_BIN="$(find_adb)"

# Locate flutter binary
find_flutter() {
  if command -v flutter >/dev/null 2>&1; then
    command -v flutter
  elif [[ -x "/home/pilot/develop/flutter/bin/flutter" ]]; then
    echo "/home/pilot/develop/flutter/bin/flutter"
  else
    echo "flutter"
  fi
}

FLUTTER_BIN="$(find_flutter)"

show_help() {
  cat << EOF
Astro Sushil - Mobile Development Helper Script

Usage:
  ./scripts/dev-mobile.sh [command] [options]

Commands:
  lan [IP] [-d <id>]  Run Flutter app targeting laptop Wi-Fi LAN IP (Default: 192.168.1.10)
  reverse [-d <id>]   Configure ADB reverse socket (tcp:3000) and run Flutter via 127.0.0.1
  check               Verify local backend health, ADB availability, and connected devices
  devices             List all detected ADB and Flutter devices with device IDs
  reverse-only [<id>] Run 'adb reverse tcp:3000 tcp:3000' for selected device without Flutter

Options:
  -d, --device <id>   Specify target Android device ID (or name)
  --device=<id>       Specify target Android device ID via key-value syntax
  --dry-run, -n       Print resolved device, URL, and launch command without executing
  [IP]                Optional custom LAN IP (defaults to 192.168.1.10)

Environment Variables:
  DEVICE_ID           Optional default device ID to use (e.g. DEVICE_ID=00119647H000246)
  FLUTTER_DEVICE_ID   Alias for DEVICE_ID

Examples:
  ./scripts/dev-mobile.sh lan
  ./scripts/dev-mobile.sh lan --dry-run
  ./scripts/dev-mobile.sh lan 192.168.1.10
  ./scripts/dev-mobile.sh lan -d 00119647H000246
  ./scripts/dev-mobile.sh reverse
  ./scripts/dev-mobile.sh check
EOF
}

# Resolve target Android device reliably using flutter devices --machine and ADB diagnostics
resolve_target_device() {
  local req_id="$1"
  local devices_json
  devices_json="$("${FLUTTER_BIN}" devices --machine 2>/dev/null || echo "[]")"

  # Case 1: User specified an explicit device ID via CLI or env var
  if [[ -n "${req_id}" ]]; then
    local match_info
    match_info="$(echo "${devices_json}" | jq -r --arg id "${req_id}" '.[] | select(.id == $id or .name == $id) | "\(.id)\t\(.name)\t\(.targetPlatform)\t\(.sdk)"' 2>/dev/null | head -n 1)"
    if [[ -n "${match_info}" ]]; then
      SELECTED_DEVICE_ID="$(echo "${match_info}" | cut -f1)"
      SELECTED_DEVICE_NAME="$(echo "${match_info}" | cut -f2)"
      SELECTED_DEVICE_SDK="$(echo "${match_info}" | cut -f4)"
      echo "📱 Using specified device: ${SELECTED_DEVICE_NAME} (ID: ${SELECTED_DEVICE_ID}, ${SELECTED_DEVICE_SDK})"
      return 0
    else
      # Not in Flutter device list - check ADB directly for targeted diagnostic
      local adb_devices
      adb_devices="$("${ADB_BIN}" devices 2>&1 || true)"
      if echo "${adb_devices}" | grep -q "${req_id}.*unauthorized"; then
        echo "❌ Requested device '${req_id}' is UNAUTHORIZED in ADB." >&2
        echo "   Please unlock your phone and tap 'Allow' on the USB debugging prompt." >&2
        exit 1
      elif echo "${adb_devices}" | grep -q "${req_id}.*offline"; then
        echo "❌ Requested device '${req_id}' is OFFLINE in ADB." >&2
        echo "   Please reconnect the USB cable or run: ${ADB_BIN} kill-server && ${ADB_BIN} start-server" >&2
        exit 1
      else
        echo "❌ Specified device '${req_id}' was not found among connected devices." >&2
        echo "   Available devices according to Flutter:" >&2
        "${FLUTTER_BIN}" devices >&2 || true
        exit 1
      fi
    fi
  fi

  # Case 2: Auto-discovery
  # Check for physical Android devices first (.emulator == false)
  local physical_devices
  physical_devices="$(echo "${devices_json}" | jq -c '[.[] | select(.targetPlatform | startswith("android")) | select(.emulator == false)]' 2>/dev/null || echo "[]")"
  local physical_count
  physical_count="$(echo "${physical_devices}" | jq -r 'length' 2>/dev/null || echo "0")"

  if [[ "${physical_count}" -eq 1 ]]; then
    SELECTED_DEVICE_ID="$(echo "${physical_devices}" | jq -r '.[0].id')"
    SELECTED_DEVICE_NAME="$(echo "${physical_devices}" | jq -r '.[0].name')"
    SELECTED_DEVICE_SDK="$(echo "${physical_devices}" | jq -r '.[0].sdk')"
    echo "📱 Auto-detected physical Android device: ${SELECTED_DEVICE_NAME} (ID: ${SELECTED_DEVICE_ID}, ${SELECTED_DEVICE_SDK})"
    return 0
  elif [[ "${physical_count}" -gt 1 ]]; then
    echo "❌ Multiple physical Android devices detected. Please specify target device with -d <device_id> or DEVICE_ID=<id>:" >&2
    echo "${physical_devices}" | jq -r '.[] | "   • \(.name) (ID: \(.id), \(.sdk))"' >&2
    echo "" >&2
    local first_id
    first_id="$(echo "${physical_devices}" | jq -r '.[0].id')"
    echo "Example: ./scripts/dev-mobile.sh lan -d ${first_id}" >&2
    exit 1
  fi

  # If no physical devices, check for running Android emulators
  local emulators
  emulators="$(echo "${devices_json}" | jq -c '[.[] | select(.targetPlatform | startswith("android")) | select(.emulator == true)]' 2>/dev/null || echo "[]")"
  local emu_count
  emu_count="$(echo "${emulators}" | jq -r 'length' 2>/dev/null || echo "0")"

  if [[ "${emu_count}" -eq 1 ]]; then
    SELECTED_DEVICE_ID="$(echo "${emulators}" | jq -r '.[0].id')"
    SELECTED_DEVICE_NAME="$(echo "${emulators}" | jq -r '.[0].name')"
    SELECTED_DEVICE_SDK="$(echo "${emulators}" | jq -r '.[0].sdk')"
    echo "📱 No physical Android device detected; using Android emulator: ${SELECTED_DEVICE_NAME} (ID: ${SELECTED_DEVICE_ID})"
    return 0
  elif [[ "${emu_count}" -gt 1 ]]; then
    echo "❌ Multiple Android emulators detected. Please specify target device with -d <device_id> or DEVICE_ID=<id>:" >&2
    echo "${emulators}" | jq -r '.[] | "   • \(.name) (ID: \(.id), \(.sdk))"' >&2
    exit 1
  fi

  # Case 3: Zero Android devices detected by Flutter. Provide helpful diagnostics via ADB.
  echo "🔍 No Android devices recognized by Flutter. Running ADB diagnostics..." >&2
  local adb_output
  adb_output="$("${ADB_BIN}" devices 2>&1 || true)"

  if echo "${adb_output}" | grep -q "unauthorized"; then
    local unauth_ids
    unauth_ids="$(echo "${adb_output}" | grep "unauthorized" | awk '{print $1}' | tr '\n' ' ')"
    echo "❌ Android device connected via USB but UNAUTHORIZED in ADB:" >&2
    echo "   Device serial(s): ${unauth_ids}" >&2
    echo "   Action required: Unlock your phone screen and tap 'Allow' on the 'Allow USB debugging?' dialog." >&2
    echo "   (Tip: Check 'Always allow from this computer' and tap Allow)" >&2
  elif echo "${adb_output}" | grep -q "offline"; then
    local offline_ids
    offline_ids="$(echo "${adb_output}" | grep "offline" | awk '{print $1}' | tr '\n' ' ')"
    echo "❌ Android device connected via USB is in OFFLINE state:" >&2
    echo "   Device serial(s): ${offline_ids}" >&2
    echo "   Action required: Unplug and reconnect the USB cable, or run:" >&2
    echo "   ${ADB_BIN} kill-server && ${ADB_BIN} start-server" >&2
  elif echo "${adb_output}" | grep -q "no permissions"; then
    echo "❌ Android device detected by ADB without Linux udev permissions (no permissions)." >&2
    echo "   Action required: Configure udev rules for Android USB devices or restart ADB server with sudo." >&2
  else
    echo "❌ No Android devices found connected via USB or Wi-Fi." >&2
    echo "   Troubleshooting checklist:" >&2
    echo "   1. Ensure Developer Options and USB Debugging are enabled on your Android phone." >&2
    echo "   2. Connect your phone to this laptop with a USB data cable." >&2
    echo "   3. Run 'npm run dev:mobile:check' or '${ADB_BIN} devices' to verify detection." >&2
    echo "   4. If on the same Wi-Fi network, consider wireless debugging via ADB: 'adb connect <phone-ip>:5555'" >&2
  fi

  echo "" >&2
  echo "Current ADB device list:" >&2
  "${ADB_BIN}" devices -l >&2 || true

  exit 1
}

# Parse common command-line options
parse_run_args() {
  EXPLICIT_DEVICE="${DEVICE_ID:-${FLUTTER_DEVICE_ID:-}}"
  TARGET_IP="${DEFAULT_LAN_IP}"
  DRY_RUN="false"
  EXTRA_ARGS=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -d|--device|--device-id)
        if [[ -n "${2:-}" && ! "$2" =~ ^- ]]; then
          EXPLICIT_DEVICE="$2"
          shift 2
        else
          echo "❌ Missing argument for $1. Example: $1 00119647H000246" >&2
          exit 1
        fi
        ;;
      -d=*|--device=*|--device-id=*)
        EXPLICIT_DEVICE="${1#*=}"
        shift
        ;;
      --dry-run|-n)
        DRY_RUN="true"
        shift
        ;;
      [0-9]*.[0-9]*.[0-9]*.[0-9]*)
        # Positional IP argument (e.g. 192.168.1.10)
        TARGET_IP="$1"
        shift
        ;;
      *)
        EXTRA_ARGS+=("$1")
        shift
        ;;
    esac
  done
}

cmd_check() {
  echo "=================================================================="
  echo "🔍 Astro Sushil: Mobile Development Environment Check"
  echo "=================================================================="
  
  echo -n "1. Checking local Fastify Backend (http://127.0.0.1:${BACKEND_PORT}/health)... "
  if curl -s -f -m 3 "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1; then
    echo "✅ Running and responding (200 OK)"
  else
    echo "❌ Unreachable (Is 'npm run dev:api' running in Terminal 1?)"
  fi

  echo -n "2. Checking Wi-Fi LAN Host (http://${DEFAULT_LAN_IP}:${BACKEND_PORT}/health)... "
  if curl -s -f -m 3 "http://${DEFAULT_LAN_IP}:${BACKEND_PORT}/health" >/dev/null 2>&1; then
    echo "✅ Accessible on local network"
  else
    echo "⚠️  Unreachable on LAN IP. Check interface wlo1 or Ubuntu UFW firewall."
    echo "    (Tip: If UFW is active, run 'sudo ufw allow 3000/tcp' or use ADB reverse)"
  fi

  echo -n "3. Checking ADB tool (${ADB_BIN})... "
  if "${ADB_BIN}" version >/dev/null 2>&1; then
    ADB_VER="$("${ADB_BIN}" version 2>/dev/null | head -n 1)"
    echo "✅ Available (${ADB_VER})"
  else
    echo "❌ adb binary not found in PATH or /home/pilot/Android/Sdk/platform-tools/adb"
  fi

  echo -n "4. Checking Flutter SDK (${FLUTTER_BIN})... "
  if "${FLUTTER_BIN}" --version >/dev/null 2>&1; then
    FLUTTER_VER="$("${FLUTTER_BIN}" --version 2>/dev/null | head -n 1)"
    echo "✅ Available (${FLUTTER_VER})"
  else
    echo "❌ flutter binary not found"
  fi

  echo ""
  echo "5. Android Device Discovery:"
  local devices_json
  devices_json="$("${FLUTTER_BIN}" devices --machine 2>/dev/null || echo "[]")"
  local android_count
  android_count="$(echo "${devices_json}" | jq -r '[.[] | select(.targetPlatform | startswith("android"))] | length' 2>/dev/null || echo "0")"

  if [[ "${android_count}" -gt 0 ]]; then
    echo "✅ Flutter recognized ${android_count} Android device(s):"
    echo "${devices_json}" | jq -r '[.[] | select(.targetPlatform | startswith("android"))][] | "   • \(.name) [ID: \(.id)] (Platform: \(.targetPlatform), \(.sdk), Physical: \(if .emulator then "No (Emulator)" else "Yes" end))"'
  else
    echo "⚠️  No Android devices currently recognized by Flutter."
    echo "   Raw ADB attached devices:"
    "${ADB_BIN}" devices -l || true
  fi

  echo "=================================================================="
}

cmd_reverse_only() {
  local target_id="${1:-${SELECTED_DEVICE_ID:-}}"
  echo "🔌 Configuring ADB reverse socket (tcp:${BACKEND_PORT} -> tcp:${BACKEND_PORT})..."
  if [[ -n "${target_id}" ]]; then
    "${ADB_BIN}" -s "${target_id}" reverse "tcp:${BACKEND_PORT}" "tcp:${BACKEND_PORT}"
  else
    "${ADB_BIN}" reverse "tcp:${BACKEND_PORT}" "tcp:${BACKEND_PORT}"
  fi
  echo "✅ Port reversed successfully. Device can access backend via http://127.0.0.1:${BACKEND_PORT}/api/v1"
}

cmd_lan() {
  parse_run_args "$@"
  resolve_target_device "${EXPLICIT_DEVICE}"

  local target_url="http://${TARGET_IP}:${BACKEND_PORT}"
  echo "🚀 Launching Flutter on device ${SELECTED_DEVICE_NAME} (ID: ${SELECTED_DEVICE_ID})"
  echo "   Network Mode: Wi-Fi LAN direct"
  echo "   API Base URL: ${target_url}/api/v1"

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "🔎 [DRY RUN] Would execute:"
    echo "   cd \"${MOBILE_DIR}\" && \"${FLUTTER_BIN}\" run -d \"${SELECTED_DEVICE_ID}\" --dart-define=\"API_BASE_URL=${target_url}\" ${EXTRA_ARGS[*]:-}"
    return 0
  fi

  cd "${MOBILE_DIR}"
  exec "${FLUTTER_BIN}" run -d "${SELECTED_DEVICE_ID}" --dart-define="API_BASE_URL=${target_url}" "${EXTRA_ARGS[@]}"
}

cmd_reverse() {
  parse_run_args "$@"
  resolve_target_device "${EXPLICIT_DEVICE}"

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "🔎 [DRY RUN] Would execute:"
    echo "   \"${ADB_BIN}\" -s \"${SELECTED_DEVICE_ID}\" reverse tcp:${BACKEND_PORT} tcp:${BACKEND_PORT}"
    echo "   cd \"${MOBILE_DIR}\" && \"${FLUTTER_BIN}\" run -d \"${SELECTED_DEVICE_ID}\" --dart-define=\"USE_ADB_REVERSE=true\" ${EXTRA_ARGS[*]:-}"
    return 0
  fi

  cmd_reverse_only "${SELECTED_DEVICE_ID}"
  echo "🚀 Launching Flutter on device ${SELECTED_DEVICE_NAME} (ID: ${SELECTED_DEVICE_ID})"
  echo "   Network Mode: USB ADB Reverse tunnel"
  echo "   API Base URL: http://127.0.0.1:${BACKEND_PORT}/api/v1"
  cd "${MOBILE_DIR}"
  exec "${FLUTTER_BIN}" run -d "${SELECTED_DEVICE_ID}" --dart-define="USE_ADB_REVERSE=true" "${EXTRA_ARGS[@]}"
}

cmd_devices() {
  echo "📱 Listing attached ADB devices:"
  "${ADB_BIN}" devices -l
  echo ""
  echo "📱 Listing Flutter recognized devices:"
  "${FLUTTER_BIN}" devices
}

COMMAND="${1:-check}"
case "${COMMAND}" in
  check)
    cmd_check
    ;;
  lan)
    shift || true
    cmd_lan "$@"
    ;;
  reverse)
    shift || true
    cmd_reverse "$@"
    ;;
  reverse-only)
    shift || true
    cmd_reverse_only "$@"
    ;;
  devices)
    cmd_devices
    ;;
  help|-h|--help)
    show_help
    ;;
  *)
    echo "Unknown command: ${COMMAND}"
    show_help
    exit 1
    ;;
esac
