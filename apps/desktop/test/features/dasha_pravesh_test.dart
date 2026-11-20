import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/dasha_pravesh/dasha_pravesh_screen.dart';
import 'package:astro_desktop/src/charts/chart_view.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const birth =
    BirthInput(name: 'Reference', date: '1990-05-15', time: '14:30', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

Map<String, Object?> fixture(String name) => (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  final dasha = fixture('dasha_timeline_vimshottari.json');
  final local = fixture('dasha_pravesh_time_local.json');
  final chart = fixture('dasha_pravesh_chart.json');

  testWidgets('pre-selects the running antardasha, converts its start and shows the chart at period start', (tester) async {
    final t = await pumpFeature(
      tester,
      DashaPraveshScreen(birth: birth, now: DateTime.utc(2026, 11, 20)),
      (m, p) => switch (m) {
        'dasha.compute' => dasha,
        'time.local' => local,
        'chart.compute' => chart,
        _ => throw StateError(m),
      },
      size: const Size(1500, 2400),
    );
    final methods = t.sent.map((r) => r['method']).toList();
    expect(methods, ['dasha.compute', 'time.local', 'chart.compute']);
    // Moon antardasha of Rahu mahadasha starts 2026-06-18T03:18:04.152Z (engine output).
    expect(t.sent[1]['params'], {'timezone': 'Asia/Kolkata', 'utcIso': '2026-06-18T03:18:04.152Z', 'options': const CalcOptions().toJson()});
    final b = ((t.sent[2]['params'] as Map)['birth'] as Map);
    expect([b['date'], b['time'], b['timezone'], b['latitude'], b['longitude']], ['2026-06-18', '08:48:04', 'Asia/Kolkata', 28.6139, 77.209]);

    expect(find.text('Chart at period start'), findsOneWidget);
    expect(find.text('Moon antardasha of Rahu mahadasha'), findsOneWidget);
    expect(find.textContaining('UTC+05:30'), findsOneWidget);
    expect(find.byType(ChartView), findsNWidgets(2));
    expect(find.text('Planets at period start'), findsOneWidget);
    expect(find.text('Ketu'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('choosing the mahadasha start requests that instant', (tester) async {
    final t = await pumpFeature(
      tester,
      DashaPraveshScreen(birth: birth, now: DateTime.utc(2026, 11, 20)),
      (m, p) => switch (m) { 'dasha.compute' => dasha, 'time.local' => local, _ => chart },
      size: const Size(1500, 2400),
    );
    await tester.tap(find.byKey(const ValueKey('pravesh-ad')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('— mahadasha start —').last);
    await tester.pumpAndSettle();
    final tl = t.sent.where((r) => r['method'] == 'time.local').last;
    expect((tl['params'] as Map)['utcIso'], '2011-01-05T03:22:55.752Z'); // Rahu mahadasha start
    expect(find.text('Rahu mahadasha'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
