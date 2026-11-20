import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../charts/chart_geometry.dart';
import '../data/chart_file.dart';
import '../data/chart_library.dart';
import '../data/city_index.dart';
import '../data/recent_charts.dart';
import '../engine/astro_engine.dart';
import '../engine/engine_client.dart';
import '../engine/inputs.dart';
import '../engine/models.dart';
import '../engine/sidecar_locator.dart';
import 'preferences.dart';

export 'preferences.dart';
export 'tabs.dart';

// ---------------------------------------------------------------------------
// Engine process: start, status, automatic restart
// ---------------------------------------------------------------------------

/// Starts a sidecar process and returns its transport. Overridden in tests with a fake.
final sidecarLauncherProvider = Provider<Future<SidecarTransport> Function()>((ref) => () async {
      final cmd = SidecarLocator().locate();
      if (cmd == null) {
        throw EngineException(
          'SIDECAR_NOT_FOUND',
          'The calculation engine was not found. Please reinstall Astro Sushil Desktop. '
              '(Developers: build it with `npm run build:sea` in apps/desktop/engine-sidecar, or install Node.js.)',
        );
      }
      return ProcessTransport.start(cmd.executable, cmd.arguments, workingDirectory: cmd.workingDirectory);
    });

enum EngineRunState { starting, ready, restarting, failed }

class EngineStatus {
  const EngineStatus({this.phase = EngineRunState.starting, this.restarts = 0, this.lastCrash, this.message});
  final EngineRunState phase;

  /// Automatic restarts in this session.
  final int restarts;
  final DateTime? lastCrash;
  final String? message;

  EngineStatus copyWith({EngineRunState? phase, int? restarts, DateTime? lastCrash, String? message}) =>
      EngineStatus(phase: phase ?? this.phase, restarts: restarts ?? this.restarts, lastCrash: lastCrash ?? this.lastCrash, message: message ?? this.message);
}

class EngineStatusNotifier extends Notifier<EngineStatus> {
  final _crashTimes = <DateTime>[];

  /// Automatic restarts allowed within [window] before giving up (avoids a crash loop).
  static const maxRestarts = 3;
  static const window = Duration(minutes: 2);

  @override
  EngineStatus build() => const EngineStatus();

  void ready() => state = state.copyWith(phase: EngineRunState.ready);

  /// Records a crash; returns true if the engine should be restarted automatically.
  bool crashed() {
    final now = DateTime.now();
    _crashTimes
      ..add(now)
      ..removeWhere((t) => now.difference(t) > window);
    if (_crashTimes.length > maxRestarts) {
      state = state.copyWith(phase: EngineRunState.failed, lastCrash: now, message: 'The calculation engine keeps stopping.');
      return false;
    }
    state = state.copyWith(phase: EngineRunState.restarting, restarts: state.restarts + 1, lastCrash: now);
    return true;
  }

  void failed(String message) => state = state.copyWith(phase: EngineRunState.failed, message: message);

  void manualRestart() {
    _crashTimes.clear();
    state = state.copyWith(phase: EngineRunState.starting);
  }
}

final engineStatusProvider = NotifierProvider<EngineStatusNotifier, EngineStatus>(EngineStatusNotifier.new);

/// The running engine. One sidecar process is reused for the whole session; if it stops
/// unexpectedly it is restarted and every section that depends on it recomputes.
final engineProvider = FutureProvider<AstroEngine>((ref) async {
  final launch = ref.watch(sidecarLauncherProvider);
  final status = ref.read(engineStatusProvider.notifier);
  var disposed = false;
  final SidecarTransport transport;
  try {
    transport = await launch();
  } catch (e) {
    scheduleMicrotask(() => status.failed(e is EngineException ? e.message : '$e'));
    rethrow;
  }
  final client = EngineClient(transport);
  ref.onDispose(() {
    disposed = true;
    client.dispose();
  });
  unawaited(client.done.then((_) {
    if (disposed || client.wasDisposed) return;
    if (status.crashed()) {
      Timer(const Duration(milliseconds: 400), () {
        if (!disposed) ref.invalidateSelf();
      });
    }
  }));
  try {
    await client.ready.timeout(const Duration(seconds: 30));
  } catch (e) {
    scheduleMicrotask(() => status.failed(e is EngineException ? e.message : 'The calculation engine did not start in time.'));
    rethrow;
  }
  scheduleMicrotask(status.ready);
  return AstroEngine(client);
});

/// Requests currently being computed by the engine (0 when idle).
final engineBusyProvider = StreamProvider<int>((ref) async* {
  final engine = await ref.watch(engineProvider.future);
  final n = engine.client.inFlight;
  final ctrl = StreamController<int>();
  void listener() => ctrl.add(n.value);
  n.addListener(listener);
  ref.onDispose(() {
    n.removeListener(listener);
    ctrl.close();
  });
  yield n.value;
  yield* ctrl.stream;
});

/// Calculation options from Preferences (ayanamsa, node type), sent as `params.options`.
final calcOptionsProvider = Provider<CalcOptions>((ref) => ref.watch(prefsProvider.select((p) => p.calcOptions)));

/// The engine bound to the current calculation options. Every computation provider watches this
/// (not [engineProvider]), so the per-chart result cache is keyed on the options: changing them in
/// Preferences drops every cached result and recomputes the open sections. The sidecar process is
/// not restarted.
final calcEngineProvider = FutureProvider<AstroEngine>((ref) async {
  final options = ref.watch(calcOptionsProvider);
  return (await ref.watch(engineProvider.future)).withOptions(options);
});

final engineInfoProvider = FutureProvider<Json>((ref) async => (await ref.watch(calcEngineProvider.future)).info());

final cityIndexProvider = FutureProvider<CityIndex>((ref) async => CityIndex.parse(await rootBundle.loadString('assets/geo/cities.tsv')));

/// Chart drawing style (from preferences).
final chartStyleProvider = Provider<ChartStyle>((ref) => ref.watch(prefsProvider.select((p) => p.chartStyle)));

// ---------------------------------------------------------------------------
// Files: recent charts and the chart database
// ---------------------------------------------------------------------------

final appSupportDirProvider = FutureProvider<Directory>((ref) => getApplicationSupportDirectory());

final recentStoreProvider = FutureProvider<RecentCharts>((ref) async {
  final dir = await ref.watch(appSupportDirProvider.future);
  return RecentCharts(File(p.join(dir.path, 'recent_charts.json')));
});

class RecentNotifier extends AsyncNotifier<List<String>> {
  @override
  Future<List<String>> build() async => (await ref.watch(recentStoreProvider.future)).load();

  Future<void> add(String path) async => state = AsyncData(await (await ref.read(recentStoreProvider.future)).add(path));
  Future<void> remove(String path) async => state = AsyncData(await (await ref.read(recentStoreProvider.future)).remove(path));
}

final recentProvider = AsyncNotifierProvider<RecentNotifier, List<String>>(RecentNotifier.new);

/// Default folder for saved charts (`Documents/Astro Sushil Charts`). Created on first save.
final defaultChartFolderProvider = FutureProvider<String?>((ref) async {
  try {
    final docs = await getApplicationDocumentsDirectory();
    return p.join(docs.path, 'Astro Sushil Charts');
  } catch (_) {
    return null;
  }
});

/// All charts known to the chart database: recent files plus the chart folders.
final chartLibraryProvider = FutureProvider<({List<ChartLibraryEntry> entries, int skipped})>((ref) async {
  final recent = await ref.watch(recentProvider.future);
  final folders = ref.watch(prefsProvider.select((p) => p.libraryFolders));
  final def = await ref.watch(defaultChartFolderProvider.future);
  return ChartLibraryScanner.scan(files: recent, folders: [if (def != null) def, ...folders]);
});

/// Header summary for a recent-chart path (name, date, place), read from the file.
final chartFileSummaryProvider = FutureProvider.family<ChartFile?, String>((ref, path) async {
  try {
    return await ChartFile.load(path);
  } catch (_) {
    return null;
  }
});

// ---------------------------------------------------------------------------
// Engine computations, cached per input for the whole session
// ---------------------------------------------------------------------------

final chartResultProvider = FutureProvider.family<ChartResult, BirthInput>((ref, b) async => (await ref.watch(calcEngineProvider.future)).chart(b));

final vargasProvider = FutureProvider.family<Map<String, VargaChartModel>, BirthInput>((ref, b) async => (await ref.watch(calcEngineProvider.future)).vargas(b));

final dashaProvider = FutureProvider.family<DashaResultModel, (BirthInput, String, int)>(
    (ref, a) async => (await ref.watch(calcEngineProvider.future)).dasha(a.$1, a.$2, maxLevel: a.$3));

/// Children of one dasha node for a tree of depth `maxLevel` (levels 4-5 load lazily).
final dashaSubPeriodsProvider = FutureProvider.family<List<DashaPeriodNode>, (BirthInput, String, int, String)>((ref, a) async {
  final path = (jsonDecode(a.$4) as List).cast<int>();
  return (await (await ref.watch(calcEngineProvider.future)).dashaSubPeriods(a.$1, a.$2, path, maxLevel: a.$3)).periods;
});

final panchangProvider = FutureProvider.family<PanchangResultModel, BirthInput>((ref, m) async => (await ref.watch(calcEngineProvider.future)).panchang(m));

final ashtakavargaProvider = FutureProvider.family<AshtakavargaModel, BirthInput>((ref, b) async => (await ref.watch(calcEngineProvider.future)).ashtakavarga(b));

final strengthProvider = FutureProvider.family<StrengthModel, BirthInput>((ref, b) async => (await ref.watch(calcEngineProvider.future)).strength(b));

final transitProvider = FutureProvider.family<TransitModel, (BirthInput?, BirthInput)>(
    (ref, a) async => (await ref.watch(calcEngineProvider.future)).transit(a.$1, a.$2));

/// Ingress/station events for (start UTC, end UTC, timezone).
final transitTimelineProvider = FutureProvider.family<TransitTimelineModel, (DateTime, DateTime, String)>(
    (ref, a) async => (await ref.watch(calcEngineProvider.future)).transitTimeline(a.$1, a.$2, timezone: a.$3));

final matchProvider = FutureProvider.family<MatchModel, (BirthInput, BirthInput)>((ref, a) async => (await ref.watch(calcEngineProvider.future)).match(a.$1, a.$2));

final kpProvider = FutureProvider.family<KpModel, BirthInput>((ref, b) async => (await ref.watch(calcEngineProvider.future)).kp(b));

final sudarshanaProvider = FutureProvider.family<List<SudarshanaRingModel>, BirthInput>((ref, b) async => (await ref.watch(calcEngineProvider.future)).sudarshana(b));

final eclipsesProvider = FutureProvider.family<List<EclipseModel>, int>((ref, year) async =>
    (await ref.watch(calcEngineProvider.future)).eclipses(DateTime.utc(year), DateTime.utc(year + 1)));

/// Generic structured results (rendered by StructuredResultView).
/// Family key = (method, JSON-encoded params) so equal requests share one cached result.
final rawProvider = FutureProvider.family<Json, (String, String)>((ref, a) async {
  final engine = await ref.watch(calcEngineProvider.future);
  return engine.raw(a.$1, (jsonDecode(a.$2) as Map).cast<String, Object?>());
});

(String, String) rawKey(String method, Map<String, Object?> params) => (method, jsonEncode(params));

/// "Now" at the given place (local civil time resolved by the engine), used as the default
/// moment for transits, panchang and prashna.
final nowAtPlaceProvider = FutureProvider.family<BirthInput, BirthInput>((ref, b) async {
  final engine = await ref.watch(calcEngineProvider.future);
  final now = await engine.localTime(b.timezone);
  return BirthInput(date: now.date, time: now.time, timezone: b.timezone, latitude: b.latitude, longitude: b.longitude, placeName: b.placeName);
});

/// Drops every cached result for [b] so the next view recomputes (View > Recalculate).
void invalidateChart(WidgetRef ref, BirthInput b) {
  ref.invalidate(chartResultProvider(b));
  ref.invalidate(vargasProvider(b));
  ref.invalidate(ashtakavargaProvider(b));
  ref.invalidate(strengthProvider(b));
  ref.invalidate(kpProvider(b));
  ref.invalidate(sudarshanaProvider(b));
  ref.invalidate(dashaProvider);
  ref.invalidate(dashaSubPeriodsProvider);
  ref.invalidate(transitProvider);
  ref.invalidate(rawProvider);
}
