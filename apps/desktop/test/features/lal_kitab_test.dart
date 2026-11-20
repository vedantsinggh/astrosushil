import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/common/interpretation_area.dart';
import 'package:astro_desktop/features/common/provisional.dart';
import 'package:astro_desktop/features/lal_kitab/lal_kitab_models.dart';
import 'package:astro_desktop/features/lal_kitab/lal_kitab_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const birth = BirthInput(name: 'Reference', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

Map<String, Object?> fixture(String name) =>
    (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  // Recorded from the real sidecar (lalKitab.chart / lalKitab.varshphal) for the birth above.
  final chart = fixture('lal_kitab_chart.json');
  final v21 = fixture('lal_kitab_varshphal_21.json');
  final v22 = fixture('lal_kitab_varshphal_22.json');

  test('models read the engine output as returned', () {
    final c = LalKitabChartModel.fromJson(chart);
    expect(c.provisional, isTrue);
    expect(c.lagnaName, 'Kanya');
    expect(c.houses.first.fixedRashiName, 'Mesha');
    expect(c.planets.firstWhere((p) => p.planet == 'SUN').house, 9);
    // Fixed chart: drawn with reference sign 1, so house N is the cell of sign N.
    expect(c.chartData.ascSign, 1);
    expect(c.chartData.bodies[9]!.map((b) => b.code), ['SUN']);

    final v = LalKitabVarshphalModel.fromJson(v21);
    expect(v.age, 21);
    expect(v.startsInYear, 2010);
    // Lal Kitab 1952 table row for age 21: 12 2 8 5 10 3 9 4 1 11 7 6
    expect(v.mapping.map((m) => m.annualHouse), [12, 2, 8, 5, 10, 3, 9, 4, 1, 11, 7, 6]);
    final t = v.mappingTable;
    expect(t.rows[4], ['5', '10', 'Moon, Saturn, Rahu']);
    expect(t.rows[8], ['9', '1', 'Sun']);
  });

  testWidgets('renders both charts, the mapping table and steps through years', (tester) async {
    final t = await pumpFeature(tester, const LalKitabScreen(birth: birth, initialAge: 21), (m, p) {
      if (m == 'lalKitab.chart') return chart;
      if (m == 'lalKitab.varshphal') return p['age'] == 22 ? v22 : v21;
      throw StateError('unexpected $m');
    }, size: const Size(1500, 2400));
    expect(t.sent.map((r) => r['method']), containsAll(['lalKitab.chart', 'lalKitab.varshphal']));
    expect(find.byKey(const ValueKey('lal-kitab-natal-chart')), findsOneWidget);
    expect(find.byKey(const ValueKey('lal-kitab-annual-chart')), findsOneWidget);
    expect(find.byType(ProvisionalBanner), findsNWidgets(2));
    expect(find.byType(InterpretationArea), findsOneWidget);
    expect(find.text('Annual chart for running year 21 of life (begins on the birthday in 2010)'), findsOneWidget);
    expect(find.text('Moon, Saturn, Rahu'), findsOneWidget);

    await tester.tap(find.byTooltip('Next year'));
    await tester.pumpAndSettle();
    final last = t.sent.last;
    expect(last['method'], 'lalKitab.varshphal');
    expect((last['params'] as Map)['age'], 22);
    expect(find.text('Annual chart for running year 22 of life (begins on the birthday in 2011)'), findsOneWidget);
  });

  testWidgets('without an initial age it asks for the current calendar year', (tester) async {
    final t = await pumpFeature(tester, const LalKitabScreen(birth: birth), (m, p) => m == 'lalKitab.chart' ? chart : v21, size: const Size(1500, 2400));
    final req = t.sent.firstWhere((r) => r['method'] == 'lalKitab.varshphal');
    expect((req['params'] as Map)['targetYear'], DateTime.now().year);
  });
}
