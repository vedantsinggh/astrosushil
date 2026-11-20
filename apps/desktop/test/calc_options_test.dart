// Calculation options (ADR-017): Preferences → Calculation, params.options on every request,
// cache invalidation on change, status bar, KP high-latitude notice, Bhava Chalit screen.
import 'package:astro_desktop/src/engine/engine_client.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:astro_desktop/src/state/providers.dart';
import 'package:astro_desktop/src/ui/sections.dart';
import 'package:astro_desktop/src/ui/widgets/common.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'app_harness.dart';
import 'helpers.dart';

/// Fixture engine that echoes the request's options like the real sidecar does
/// (`chart.compute` → `options`/`config`, `kp.compute` → `ayanamsaType`).
Object? echoingHandler(String method, Map<String, Object?> params) {
  final r = fixtureHandler(method, params);
  final o = (params['options'] as Map?)?.cast<String, Object?>();
  if (o == null || r is! Map) return r;
  final m = Map<String, Object?>.from(r);
  if (method == 'chart.compute') {
    m['options'] = {...o, 'kpCuspSystem': 'PLACIDUS'};
    m['config'] = {...(m['config'] as Map), 'ayanamsa': o['ayanamsa'], 'nodeCalculation': o['nodeType']};
  }
  if (method == 'kp.compute') m['ayanamsaType'] = o['ayanamsa'];
  return m;
}

List<Map<String, Object?>> _sent(Harness h, String method) =>
    [for (final t in h.transports) ...t.sent.where((r) => r['method'] == method)];

Map<String, Object?>? _options(Map<String, Object?> request) => ((request['params'] as Map)['options'] as Map?)?.cast<String, Object?>();

String _status(WidgetTester tester) => tester.widget<Text>(find.byKey(const Key('calc-status'))).data!;

void main() {
  test('preferences persist the calculation options (JSON round trip, lenient)', () {
    const p = Preferences(ayanamsa: 'RAMAN', nodeType: 'TRUE_NODE');
    final back = Preferences.fromJson(p.toJson());
    expect(back.ayanamsa, 'RAMAN');
    expect(back.nodeType, 'TRUE_NODE');
    expect(back.calcOptions, const CalcOptions(ayanamsa: 'RAMAN', nodeType: 'TRUE_NODE'));
    // Defaults: true Lahiri, mean node; malformed values fall back.
    expect(Preferences.fromJson(const {}).calcOptions, const CalcOptions());
    expect(Preferences.fromJson(const {'ayanamsa': 'lahiri; drop', 'nodeType': 3}).calcOptions, const CalcOptions());
  });

  testWidgets('Preferences: ayanamsa dropdown and node choice persist and are sent with every request', (tester) async {
    final h = Harness(handler: echoingHandler);
    await h.pump(tester);
    await h.openRef(tester);
    expect(_options(_sent(h, 'chart.compute').last), {'ayanamsa': 'LAHIRI', 'nodeType': 'MEAN_NODE'});

    await pressShortcut(tester, LogicalKeyboardKey.comma, ctrl: true);
    expect(find.byKey(const Key('pref-calculation')), findsOneWidget);
    // Default selection, with labels for every value engine.info lists.
    expect(find.descendant(of: find.byKey(const Key('pref-ayanamsa')), matching: find.text('Lahiri (true Chitrapaksha)')), findsOneWidget);
    await tester.tap(find.byKey(const Key('pref-ayanamsa')));
    await tester.pumpAndSettle();
    for (final label in ['Raman', 'KP New (Senthilathiban)', 'KP – KSK original', 'Fagan–Bradley']) {
      expect(find.text(label), findsWidgets, reason: label);
    }
    await tester.tap(find.text('KP New (Senthilathiban)').last);
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(of: find.byKey(const Key('pref-node')), matching: find.text('True node')));
    await tester.pumpAndSettle();
    expect(h.container.read(calcOptionsProvider), const CalcOptions(ayanamsa: 'KP', nodeType: 'TRUE_NODE'));
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();
    await tester.pump(const Duration(milliseconds: 400));

    // Persisted to preferences.json (the store) ...
    expect(h.store.value.ayanamsa, 'KP');
    expect(h.store.value.nodeType, 'TRUE_NODE');
    expect(h.store.value.toJson(), containsPair('ayanamsa', 'KP'));
    // ... and sent with the recomputed chart.
    expect(_options(_sent(h, 'chart.compute').last), {'ayanamsa': 'KP', 'nodeType': 'TRUE_NODE'});

    // Every request issued from now on carries the options, whatever the section.
    final before = h.transports.expand((t) => t.sent).length;
    h.tabs.setSection(Section.ashtakavarga);
    await tester.pumpAndSettle();
    h.tabs.setSection(Section.relationships);
    await tester.pumpAndSettle();
    final later = h.transports.expand((t) => t.sent).skip(before).toList();
    expect(later, isNotEmpty);
    for (final r in later) {
      expect(_options(r), {'ayanamsa': 'KP', 'nodeType': 'TRUE_NODE'}, reason: '${r['method']}');
    }
    await h.finish(tester);
  });

  testWidgets('changing the options invalidates the cached results and recomputes open sections', (tester) async {
    final h = Harness(handler: echoingHandler);
    await h.pump(tester);
    await h.openRef(tester);
    h.tabs.setSection(Section.chart);
    await tester.pumpAndSettle();
    final charts0 = _sent(h, 'chart.compute').length;
    expect(charts0, greaterThan(0));

    // Same options again: served from the cache, no new request.
    h.tabs.setSection(Section.vargas);
    await tester.pumpAndSettle();
    h.tabs.setSection(Section.chart);
    await tester.pumpAndSettle();
    expect(_sent(h, 'chart.compute').length, charts0);
    final vargas0 = _sent(h, 'vargas.compute').length;

    h.container.read(prefsProvider.notifier).update((p) => p.copyWith(ayanamsa: 'RAMAN'));
    await tester.pumpAndSettle();
    final charts1 = _sent(h, 'chart.compute');
    expect(charts1.length, greaterThan(charts0), reason: 'the open chart section recomputed');
    expect(_options(charts1.last)!['ayanamsa'], 'RAMAN');
    // The birth-data card shows the value the engine applied.
    expect(find.textContaining('Raman'), findsWidgets);

    // A cached section seen earlier is recomputed with the new options too (cache keyed on them).
    h.tabs.setSection(Section.vargas);
    await tester.pumpAndSettle();
    final vargas1 = _sent(h, 'vargas.compute');
    expect(vargas1.length, greaterThan(vargas0));
    expect(_options(vargas1.last)!['ayanamsa'], 'RAMAN');
    // The engine process was not restarted.
    expect(h.transports, hasLength(1));
    await h.finish(tester);
  });

  testWidgets('status bar shows the engine-echoed ayanamsa, house system of the view and node type', (tester) async {
    final h = Harness(handler: echoingHandler);
    await h.pump(tester);
    await h.openRef(tester);
    h.tabs.setSection(Section.chart);
    await tester.pumpAndSettle();
    expect(_status(tester), 'Lahiri ayanamsa  ·  Whole Sign houses  ·  Mean node');

    h.tabs.setSection(Section.kp);
    await tester.pumpAndSettle();
    expect(_status(tester), 'Lahiri ayanamsa  ·  Placidus houses  ·  Mean node');

    h.container.read(prefsProvider.notifier).update((p) => p.copyWith(ayanamsa: 'KRISHNAMURTI', nodeType: 'TRUE_NODE'));
    await tester.pumpAndSettle();
    expect(_status(tester), 'KP (KSK original) ayanamsa  ·  Placidus houses  ·  True node');
    // KP screen header: cusp system and the ayanamsa the KP chart used.
    final kpHeader = find.byKey(const Key('kp-conventions'));
    expect(find.descendant(of: kpHeader, matching: find.text('Placidus')), findsOneWidget);
    expect(find.descendant(of: kpHeader, matching: find.textContaining('KP (KSK original)')), findsOneWidget);

    h.tabs.setSection(Section.chart);
    await tester.pumpAndSettle();
    expect(_status(tester), 'KP (KSK original) ayanamsa  ·  Whole Sign houses  ·  True node');
    await h.finish(tester);
  });

  testWidgets('KP above the polar circle shows a plain-language notice; the rest of the chart works', (tester) async {
    Object? handler(String method, Map<String, Object?> params) {
      if (method == 'kp.compute') {
        throw EngineException(
          'CALCULATION_ERROR',
          'Placidus house cusps are undefined at latitude 69.6500°: beyond ±66.56° (polar circle) ...',
          reason: 'PLACIDUS_UNDEFINED_AT_LATITUDE',
        );
      }
      return fixtureHandler(method, params);
    }

    final h = Harness(handler: handler);
    await h.pump(tester);
    await h.openRef(tester);
    h.tabs.setSection(Section.kp);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('kp-placidus-undefined')), findsOneWidget);
    expect(find.text('Placidus houses are not defined at this latitude'), findsOneWidget);
    expect(find.byType(ErrorPanel), findsNothing);
    expect(find.textContaining('CALCULATION_ERROR'), findsNothing);
    expect(_status(tester), contains('Placidus houses'));

    h.tabs.setSection(Section.chart);
    await tester.pumpAndSettle();
    expect(find.text('Rasi (D1)'), findsOneWidget);
    expect(find.byType(ErrorPanel), findsNothing);
    await h.finish(tester);
  });

  testWidgets('Bhava Chalit screen shows the chart, madhya and sandhi from chartVariants.compute', (tester) async {
    final h = Harness();
    await h.pump(tester);
    await h.openRef(tester);
    h.tabs.setSection(Section.bhavaChalit);
    await tester.pumpAndSettle();
    expect(_sent(h, 'chartVariants.compute'), isNotEmpty);
    expect(find.text('Sripati Bhava Chalit Chart'), findsOneWidget);
    final table = find.byKey(const Key('bhava-table'));
    expect(table, findsOneWidget);
    for (final col in ['Begins (sandhi)', 'Madhya', 'Ends (sandhi)']) {
      expect(find.descendant(of: table, matching: find.text(col)), findsOneWidget, reason: col);
    }
    await h.finish(tester);
  });
}
