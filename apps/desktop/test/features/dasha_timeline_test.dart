import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/dasha_timeline/dasha_timeline_models.dart';
import 'package:astro_desktop/features/dasha_timeline/dasha_timeline_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const birth =
    BirthInput(name: 'Reference', date: '1990-05-15', time: '14:30', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

Map<String, Object?> fixture(String name) => (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  final vim = fixture('dasha_timeline_vimshottari.json');
  final yog = fixture('dasha_timeline_yogini.json');
  final now = DateTime.utc(2026, 11, 20);

  Object? handler(String m, Map<String, Object?> p) => p['system'] == 'YOGINI' ? yog : vim;

  test('lists the 13 sidecar dasha systems', () {
    expect(dashaSystemLabels.length, 13);
    expect(dashaSystemLabels.keys.first, 'VIMSHOTTARI');
  });

  testWidgets('draws mahadashas, antardasha bands, now marker and zooms the running mahadasha', (tester) async {
    final t = await pumpFeature(tester, DashaTimelineScreen(birth: birth, now: now), handler, size: const Size(1500, 2200));
    expect(t.sent.single['method'], 'dasha.compute');
    expect((t.sent.single['params'] as Map)['system'], 'VIMSHOTTARI');
    expect((t.sent.single['params'] as Map)['maxLevel'], 2);
    // 9 Vimshottari mahadashas from birth (Sun balance .. Venus).
    for (var i = 0; i < 9; i++) {
      expect(find.byKey(ValueKey('md-$i')), findsOneWidget);
    }
    expect(find.byKey(const ValueKey('ad-0-0')), findsOneWidget);
    expect(find.byKey(const ValueKey('now-marker')), findsNWidgets(2)); // life + zoom
    // 2026-11-20 falls in Rahu mahadasha (2011-01-05 .. 2029-01-04 per the engine).
    expect(find.textContaining('Rahu mahadasha:'), findsOneWidget);
    expect(find.byKey(const ValueKey('zoom-ad-0')), findsOneWidget);
    // Hover tooltip carries the engine dates.
    expect(find.byTooltip('Sun mahadasha\n15 May 1990 – 05 Jan 1994\n3.64 years'), findsOneWidget);

    // Tap Jupiter mahadasha (index 4) to zoom into it.
    await tester.tap(find.byKey(const ValueKey('md-4')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Jupiter mahadasha:'), findsOneWidget);
    expect(find.byKey(const ValueKey('now-marker')), findsOneWidget); // now not inside Jupiter
    expect(tester.takeException(), isNull);
  });

  testWidgets('switching system re-requests and handles now outside the range', (tester) async {
    final t = await pumpFeature(tester, DashaTimelineScreen(birth: birth, now: now), handler, size: const Size(1500, 2200));
    await tester.tap(find.byKey(const ValueKey('dasha-system')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Yogini').last);
    await tester.pumpAndSettle();
    expect((t.sent.last['params'] as Map)['system'], 'YOGINI');
    expect(find.byKey(const ValueKey('md-7')), findsOneWidget); // 8 yoginis, one cycle
    expect(find.byKey(const ValueKey('now-marker')), findsNothing);
    expect(find.textContaining('is outside the computed range'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
