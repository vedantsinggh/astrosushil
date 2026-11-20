import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/strength_graph/strength_graph_models.dart';
import 'package:astro_desktop/features/strength_graph/strength_graph_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const birth =
    BirthInput(name: 'Reference', date: '1990-05-15', time: '14:30', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

Map<String, Object?> fixture(String name) => (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  final strength = fixture('strength_graph_strength.json');

  test('model reads the six components, totals and required minimum as returned', () {
    final g = StrengthGraphData.fromJson(strength);
    expect(g.planets.map((p) => p.planet), ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN']);
    final jup = g.planets.firstWhere((p) => p.planet == 'JUPITER');
    expect(jup.components, [293.6009, 35.2675, 217.9061, 45, 34.29, -10.4513]);
    expect(jup.totalRupas, 10.2602);
    expect(jup.requiredRupas, 6.5);
    expect(g.planets.firstWhere((p) => p.planet == 'MERCURY').isStrong, isFalse);
    expect(g.houses.map((h) => h.house), List.generate(12, (i) => i + 1));
    expect(g.bhavaTable.rows.first, ['1', 'Kanya', 'Mercury', '413.83', '6.90', '7']);
  });

  testWidgets('renders three graphs with tooltips and the value tables', (tester) async {
    final t = await pumpFeature(tester, const StrengthGraphScreen(birth: birth), (m, p) => strength, size: const Size(1500, 2600));
    expect(t.sent.single['method'], 'strength.compute');
    expect(find.byKey(const ValueKey('shadbala-total-graph')), findsOneWidget);
    expect(find.byKey(const ValueKey('shadbala-components-graph')), findsOneWidget);
    expect(find.byKey(const ValueKey('bhava-bala-graph')), findsOneWidget);
    expect(find.text('Required minimum'), findsOneWidget);
    for (final c in shadbalaComponents) {
      expect(find.text(c), findsWidgets);
    }
    expect(find.byTooltip('Jupiter: 10.26 rupas (required 6.50)'), findsOneWidget);
    expect(find.text('H12'), findsOneWidget);
    expect(find.text('7 (below minimum)'), findsOneWidget); // Mercury rank 7, isStrong false
    expect(tester.takeException(), isNull);
  });
}
