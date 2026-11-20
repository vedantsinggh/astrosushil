# Astro Sushil Desktop (`apps/desktop`)

An offline Vedic astrology workstation for **Windows, macOS and Linux**, built with **Flutter
desktop**. It offers a professional chart workspace: Rasi/Navamsa and all 16 vargas in
North/South/East Indian styles, 13 dasha systems, panchang with hora/choghadiya, Ashtakavarga,
Shadbala/Bhava Bala/Ishta-Kashta, transits, matching, KP, Jaimini, Varshaphala, Prashna,
eclipses, and chart files with print/PDF.

## Why this app exists (approval record)

AGENTS.md §1.1 requires explicit human approval for structural changes to the monorepo. The
product owner asked in writing for *"a desktop application compatible with all OSes, using our
astro engine"*. That request is the approval for adding `apps/desktop`. The owner then chose
**Flutter desktop + a local engine sidecar** over Electron because the team already maintains
Flutter (`apps/mobile`). See `docs/decisions.md` ADR-014.

## Architecture

```
Flutter UI (Riverpod)  --NDJSON over stdin/stdout-->  engine-sidecar (Node SEA)  -->  packages/astrology-engine
 lib/src/ui, charts, print                              engine-sidecar/src            (all calculations)
```

- **No astrology in Dart.** `lib/` only renders engine results (chart geometry, tables, PDF).
  This follows AGENTS.md: business logic lives in `packages/*` and is never duplicated.
- **Sidecar.** `engine-sidecar/` is a small TypeScript program. It imports
  `@astro/astrology-engine` and serves the protocol in `docs/sidecar-protocol.md`. For release it
  is bundled with esbuild and packed into a standalone executable using Node's Single Executable
  Application (SEA) feature, so users do not need Node.
- **Offline.** There are no network calls. Places come from a bundled GeoNames extract
  (`assets/geo/cities.tsv`, CC BY 4.0, attributed in the app).
- **Files.** Charts are saved as `.aschart` JSON containing *inputs only*. Every value is
  recomputed when a chart is opened. The recent list lives in the OS app-support directory.

## Develop

```bash
# 1. sidecar (once; uses the monorepo's node_modules for the engine)
cd apps/desktop/engine-sidecar
npm ci                     # local devDeps: esbuild, postject, tsx, vitest, typescript
npm test                   # adapter unit tests + process round-trip tests
npm run typecheck          # strict tsc
npm run build:sea          # -> dist/astro-engine-sidecar (standalone executable)

# 2. app
cd ..
flutter pub get
flutter analyze && flutter test
flutter run -d linux       # or -d windows / -d macos
```

The app finds the engine in this order (`lib/src/engine/sidecar_locator.dart`):

1. `$ASTRO_ENGINE_SIDECAR`
2. the bundled `engine/astro-engine-sidecar` next to the app
3. in the monorepo, `engine-sidecar/dist/astro-engine-sidecar`
4. `node dist/sidecar.cjs`
5. `node tsx src/main.ts`

So `flutter run` works without building the SEA if Node is installed.

## Build installers / bundles

| OS | Command | Sidecar bundling |
|---|---|---|
| Linux | `npm run build:sea` (in engine-sidecar), then `flutter build linux` | CMake installs it to `bundle/engine/` (verified) |
| Windows | same, on Windows (`flutter build windows`) | CMake installs `engine\astro-engine-sidecar.exe` (configured, not verified here) |
| macOS | same on macOS, `flutter build macos`, then `tool/bundle_sidecar_macos.sh` | copies to `Contents/Resources/engine/` and ad-hoc signs (configured, not verified here) |

SEA embeds the host Node binary, so build the sidecar on each target OS. macOS entitlements turn
off the App Sandbox so the app can launch its bundled engine. That suits direct (non-App-Store)
distribution; notarisation still needs a Developer ID.

## Data and licences

- GeoNames `cities15000` (CC BY 4.0). Regenerate with `tool/build_cities.py`.
- Flutter packages: flutter_riverpod (MIT); pdf and printing (Apache-2.0); file_selector,
  path_provider and path (BSD-3-Clause); intl (BSD-3-Clause). The UX work added **no new
  packages**: menus, shortcuts, tabs, split panes, skeletons and window state use the Flutter SDK
  (`PlatformMenuBar`, `MenuBar`, `Shortcuts`/`Actions`, `AppLifecycleListener`) and small native
  runner changes.
- Sidecar devDeps: esbuild (MIT), postject (MIT), tsx (MIT), vitest (MIT), typescript (Apache-2.0).
- Ephemeris: astronomy-engine (MIT), already used by the engine. No Swiss Ephemeris, no paid APIs.

## Using the app (UX overview)

- **Layout.** Menu bar (File, Edit, View, Chart, Tools, Help; native `PlatformMenuBar` on macOS, in-app
  `MenuBar` on Windows/Linux), a labelled sidebar grouped by topic, chart tabs, a top bar with the chart's
  name, date, place and quick actions, a breadcrumb + section title, and a status bar (engine state,
  ayanamsa/house/node conventions, text size).
- **Tabs.** Each open chart is a tab that stays mounted, so switching is instant and each tab keeps its
  section, scroll and selections. Unsaved charts are marked and you are asked before closing or quitting.
- **Welcome.** Recent charts with their details, New / Open / Chart database, and a one-time hint.
- **Birth form.** Accepts dates like `15/05/1990`, `15 May 1990` or `1990-05-15` and times like `14:30`
  or `2:30 pm`, shows how the input was understood, offers calendar/clock pickers, place search with
  ↑/↓/Enter, remembers the last place, and explains problems in plain words.
- **Charts.** Hover a house for occupants with degrees and nakshatras; right-click for details or copy.
  Lagna is highlighted in all three styles; a legend explains abbreviations.
- **Tables.** Zebra rows, tabular figures, a pinned header for long tables, right-click copy (value, row,
  table) and Copy / Export CSV buttons.
- **Preferences** (`Ctrl+,`): chart style, light/dark/system theme, text size 90–150 %, date format,
  section shown when a chart opens, and **Calculation** settings: ayanamsa (values from `engine.info`,
  default true Lahiri) and Rahu/Ketu node (mean or true). Saved in `preferences.json` in the app-support
  folder. Every engine request sends them as `params.options`; changing them drops the cached results and
  recomputes the open sections. The status bar shows the ayanamsa, house system (Placidus on the KP screen)
  and node type echoed by the engine.
- **Window state.** Size, position and maximised state are restored by the native runners (Linux:
  `~/.config/astro_sushil_desktop/window.ini`; Windows: `HKCU\Software\AstroSushil\Desktop`; macOS:
  `setFrameAutosaveName`). Wayland ignores client window positions; size still applies.
- **Keyboard.** Press `F1` for the full cheat-sheet. Highlights: `Ctrl+N/O/S/P/W`, `Ctrl+Shift+S` save as,
  `Ctrl+Shift+E` export PDF, `Ctrl+E` edit birth details, `Ctrl+F` chart database, `Ctrl+Tab` /
  `Ctrl+1…9` tabs, `Alt+1…9` and `Alt+↑/↓` sections, `Ctrl+Alt+1/2/3` chart style, `Ctrl+=/-/0` text size,
  `Ctrl+Shift+L` theme, `Ctrl+B` sidebar, `F5` recalculate. (`Cmd` instead of `Ctrl` on macOS.)
- **Engine.** Results are cached per chart and input for the session; recalculation after edits is
  debounced; big responses are decoded off the UI thread; if the engine stops it is restarted
  automatically with a friendly notice.

### Adding a screen

1. Add a value to `Section` in `lib/src/ui/sections.dart` (label, icon, sidebar group, one-line description).
2. Add a case to `buildSectionBody` in `lib/src/ui/section_body.dart` returning your widget.
3. Use `PageBody`, `SectionCard`, `SimpleTable`, `AsyncView` (skeleton + keep-previous-result + retry),
   `ControlBar` and `context.palette` from `lib/src/ui/widgets/common.dart` and `lib/src/theme.dart`.

The sidebar, Chart menu, `Alt+number` shortcuts, breadcrumb and the Preferences "Open charts at" list
pick the new section up automatically.

### Screenshots

`SCREENSHOT_DIR=/tmp/shots flutter test test/screenshots_test.dart` renders the main screens at
1280×800 and 1920×1080 in light and dark themes.

## Feature screens (`lib/features/`)

Parity features added after the client decisions (`docs/decisions.md` ADR-016) live in
self-contained folders under `lib/features/<feature>/` and call the sidecar's feature methods
(`engine-sidecar/src/feature-handlers/`, listed in `docs/sidecar-protocol.md`). They include
ephemeris tables and a positions calculator, Lagna rising, combustion periods, transit tables
and timeline, Sade Sati periods, planetary relationships, strength graphs, the multi-page
horoscope PDF and monthly panchang, extra dashas, Tajika, South Indian matching, chakras, extra
vargas, muhurta extras, Lal Kitab (calculation only) and a birth-time sensitivity aid.
Calculations that follow a provisional convention are labelled "provisional – pending client
review" with their cited source. No new packages were added for them.

## Status

See `docs/feature-parity.md` for the capability matrix, what is implemented, and the methodology
questions that need the client before anything else is added.
