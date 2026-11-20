import 'dart:async';

import 'package:astro_desktop/main.dart';
import 'package:astro_desktop/src/data/chart_file.dart';
import 'package:astro_desktop/src/data/chart_library.dart';
import 'package:astro_desktop/src/data/city_index.dart';
import 'package:astro_desktop/src/engine/engine_client.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:astro_desktop/src/state/providers.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' show Key, RepaintBoundary;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

const refBirth = BirthInput(name: 'Reference Chart 001', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi, India');

final testCities = CityIndex([
  const City(name: 'New Delhi', region: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', population: 300000),
  const City(name: 'Newcastle upon Tyne', region: 'England', country: 'United Kingdom', latitude: 54.97, longitude: -1.61, timezone: 'Europe/London', population: 190000),
  const City(name: 'Pune', region: 'Maharashtra', country: 'India', latitude: 18.52, longitude: 73.85, timezone: 'Asia/Kolkata', population: 3000000),
]);

class FixedRecent extends RecentNotifier {
  FixedRecent(this.items);
  final List<String> items;
  @override
  Future<List<String>> build() async => items;
  @override
  Future<void> add(String path) async => state = AsyncData([path, ...items.where((e) => e != path)]);
}

/// Test app with a fake engine (recorded fixtures), in-memory preferences and no real files.
class Harness {
  Harness({Preferences prefs = const Preferences(hintDismissed: true), this.recent = const [], this.library, this.handler = fixtureHandler})
      : store = MemoryPrefsStore(prefs),
        initialPrefs = prefs;

  final MemoryPrefsStore store;
  final Preferences initialPrefs;
  final List<String> recent;
  final List<ChartLibraryEntry>? library;

  /// Answers engine requests (default: recorded fixtures).
  final Object? Function(String method, Map<String, Object?> params) handler;
  final transports = <FakeTransport>[];
  late ProviderContainer container;

  Future<void> pump(WidgetTester tester, {Size size = const Size(1600, 1000), Key? boundaryKey}) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    container = ProviderContainer(overrides: [
      sidecarLauncherProvider.overrideWithValue(() async {
        // Emit `ready` after the client has subscribed (the launcher is async).
        final t = FakeTransport(handler: handler, autoReady: false);
        Timer(Duration.zero, t.emitReady);
        transports.add(t);
        return t as SidecarTransport;
      }),
      prefsStoreProvider.overrideWithValue(store),
      initialPrefsProvider.overrideWithValue(initialPrefs),
      recentProvider.overrideWith(() => FixedRecent(recent)),
      defaultChartFolderProvider.overrideWith((ref) async => null),
      cityIndexProvider.overrideWith((ref) async => testCities),
      chartFileSummaryProvider.overrideWith((ref, path) async => ChartFile(birth: refBirth.copyWith(name: path.split('/').last.replaceAll('.aschart', '')), path: path)),
      if (library != null) chartLibraryProvider.overrideWith((ref) async => (entries: library!, skipped: 0)),
    ]);
    addTearDown(container.dispose);
    await tester.pumpWidget(UncontrolledProviderScope(
      container: container,
      child: boundaryKey == null ? const AstroDesktopApp() : RepaintBoundary(key: boundaryKey, child: const AstroDesktopApp()),
    ));
    await tester.pumpAndSettle();
  }

  TabsNotifier get tabs => container.read(tabsProvider.notifier);

  Future<void> openRef(WidgetTester tester, {String? path, String name = 'Reference Chart 001', bool dirty = false}) async {
    tabs.open(ChartFile(birth: refBirth.copyWith(name: name), path: path), dirty: dirty);
    await tester.pumpAndSettle();
  }

  /// Lets pending timers (debounced saves, snackbars) finish so the test ends cleanly.
  Future<void> finish(WidgetTester tester) async {
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
  }
}

Future<void> pressShortcut(WidgetTester tester, LogicalKeyboardKey key, {bool ctrl = false, bool shift = false, bool alt = false}) async {
  if (ctrl) await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
  if (shift) await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
  if (alt) await tester.sendKeyDownEvent(LogicalKeyboardKey.altLeft);
  await tester.sendKeyEvent(key);
  if (alt) await tester.sendKeyUpEvent(LogicalKeyboardKey.altLeft);
  if (shift) await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
  if (ctrl) await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
  await tester.pumpAndSettle();
}

/// Silences unawaited-future lints in tests.
void ignore(Future<void> f) => unawaited(f);
