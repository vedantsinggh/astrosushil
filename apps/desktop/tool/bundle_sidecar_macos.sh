#!/usr/bin/env bash
# macOS: copy the engine sidecar into the built .app bundle (Contents/Resources/engine/),
# where lib/src/engine/sidecar_locator.dart looks for it. Run after `flutter build macos`.
# Build the sidecar on macOS first: (cd engine-sidecar && npm ci && npm run build:sea)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:-Release}"
app="$here/build/macos/Build/Products/$mode/astro_desktop.app"
src="$here/engine-sidecar/dist/astro-engine-sidecar"
[ -d "$app" ] || { echo "App bundle not found: $app" >&2; exit 1; }
[ -x "$src" ] || { echo "Sidecar not built: $src" >&2; exit 1; }
mkdir -p "$app/Contents/Resources/engine"
cp "$src" "$app/Contents/Resources/engine/"
codesign --force --sign - "$app/Contents/Resources/engine/astro-engine-sidecar"
echo "Bundled sidecar into $app"
