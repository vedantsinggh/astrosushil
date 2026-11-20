import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/ashtakavarga_reduction/ashtakavarga_reduction_models.dart';
import 'package:astro_desktop/features/ashtakavarga_reduction/ashtakavarga_reduction_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const birth =
    BirthInput(name: 'Reference', date: '1990-05-15', time: '14:30', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

Map<String, Object?> fixture(String name) => (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  final av = fixture('ashtakavarga_reduction_ashtakavarga.json');

  test('model keeps the engine values for each stage and the pindas', () {
    final d = AshtakavargaReductionData.fromJson(av);
    expect(d.rows.map((r) => r.planet), ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN']);
    final sun = d.rows.first;
    expect(sun.bav, [2, 2, 4, 2, 6, 4, 4, 6, 4, 3, 7, 4]);
    expect(sun.trikona, [0, 0, 0, 0, 4, 2, 0, 4, 2, 1, 3, 2]);
    expect(sun.ekadhipatya, [0, 0, 0, 0, 4, 0, 0, 0, 0, 1, 3, 2]);
    expect([sun.rashiPinda, sun.grahaPinda, sun.shodhyaPinda], [102, 48, 150]);
    expect(ReductionRow.changed(sun.trikona, sun.ekadhipatya), {5, 7, 8});
    final t = d.planetTable(sun);
    expect(t.rows.map((r) => r.first), ['Bhinnashtakavarga', 'After Trikona Shodhana', 'After Ekadhipatya Shodhana']);
    expect(t.rows.map((r) => r.last), ['48', '18', '10']);
    expect(d.pindaTable.rows.last, ['Saturn', '104', '93', '197']);
  });

  testWidgets('shows per-planet tables, all-planet tables, pinda table and filters by planet', (tester) async {
    final t = await pumpFeature(tester, const AshtakavargaReductionScreen(birth: birth), (m, p) => av, size: const Size(1500, 4000));
    expect(t.sent.single['method'], 'ashtakavarga.compute');
    expect(find.byKey(const ValueKey('reduction-SUN')), findsOneWidget);
    expect(find.byKey(const ValueKey('reduction-SATURN')), findsOneWidget);
    expect(find.text('Trikona Shodhana (all planets)'), findsOneWidget);
    expect(find.text('Rashi Pinda, Graha Pinda and Shodhya Pinda'), findsOneWidget);
    expect(find.text('197'), findsWidgets);

    await tester.tap(find.widgetWithText(ChoiceChip, 'Jupiter'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('reduction-SUN')), findsNothing);
    expect(find.byKey(const ValueKey('reduction-JUPITER')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
