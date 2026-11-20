import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/common/interpretation_area.dart';
import 'package:astro_desktop/features/common/provisional.dart';
import 'package:astro_desktop/features/dashas_extended/planetary_patyayini_models.dart';
import 'package:astro_desktop/features/dashas_extended/planetary_patyayini_view.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const birth = BirthInput(name: 'Reference', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

Map<String, Object?> fixture(String name) =>
    (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  // Recorded from the real sidecar (dashaExt.patyayini, maxLevel 2, targetDate 2026-11-20) for the birth above.
  final y2026 = fixture('dashas_planetary_patyayini_2026.json');
  final y2027 = fixture('dashas_planetary_patyayini_2027.json');

  test('model reads the engine output as returned', () {
    final m = PatyayiniModel.fromJson(y2026);
    expect(m.provisional, isTrue);
    expect(m.targetYear, 2026);
    expect(m.rows, hasLength(8));
    expect(m.periods, hasLength(8));
    // Lagna + seven grahas, no nodes.
    expect(m.rows.map((r) => r.key).toSet(), {'LAGNA', 'SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'});
    // Engine marks the Lagna dasha active on 2026-11-20 (11 Nov - 23 Nov 2026).
    expect(m.periods[m.activeIndex].key, 'LAGNA');
    expect(m.periods.first.start, m.solarReturn);
    expect(m.periods.last.end, m.nextSolarReturn);
    final t = m.dashaTable;
    expect(t.rows.first[1], 'Sun');
    expect(t.rows.first[5], (m.periods.first.days).toStringAsFixed(2));
    expect(m.antardashaTable(0).rows.first[1], 'Sun');
  });

  testWidgets('renders the dasha and antardasha tables and steps through years', (tester) async {
    final t = await pumpFeature(tester, const PlanetaryPatyayiniView(birth: birth, initialYear: 2026), (m, p) {
      if (m == 'dashaExt.patyayini') return p['targetYear'] == 2027 ? y2027 : y2026;
      throw StateError('unexpected $m');
    }, size: const Size(1500, 2400));
    expect(t.sent.map((r) => r['method']), contains('dashaExt.patyayini'));
    expect(find.byType(ProvisionalBanner), findsOneWidget);
    expect(find.byType(InterpretationArea), findsOneWidget);
    expect(find.byKey(const ValueKey('patyayini-dasha-table')), findsOneWidget);
    expect(find.byKey(const ValueKey('patyayini-antardasha-table')), findsOneWidget);
    expect(find.text('Patyayini dasha 2026-2027'), findsOneWidget);
    // Active dasha (Lagna) is selected by default, so its antardashas are shown.
    expect(find.text('Patyayini antardashas in Lagna dasha (2026)'), findsOneWidget);

    await tester.tap(find.byTooltip('Next year'));
    await tester.pumpAndSettle();
    expect(find.text('Patyayini dasha 2027-2028'), findsOneWidget);
    expect(t.sent.where((r) => r['method'] == 'dashaExt.patyayini').length, greaterThanOrEqualTo(2));
  });
}
