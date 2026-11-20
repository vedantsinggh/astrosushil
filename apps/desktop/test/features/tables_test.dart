import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/combustion_periods/combustion_periods_screen.dart';
import 'package:astro_desktop/features/ephemeris_tables/ephemeris_models.dart';
import 'package:astro_desktop/features/ephemeris_tables/ephemeris_tools_screen.dart';
import 'package:astro_desktop/features/rectification/rectification_screen.dart';
import 'package:astro_desktop/features/relationships/relationships_screen.dart';
import 'package:astro_desktop/features/sade_sati/sade_sati_screen.dart';
import 'package:astro_desktop/features/transit_tables/transit_tables_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:astro_desktop/src/ui/widgets/common.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

Map<String, Object?> fx(String name) => (jsonDecode(File('test/fixtures/features/$name.json').readAsStringSync()) as Map).cast<String, Object?>();

/// Real sidecar output recorded for New Delhi (see scratchpad tables/rec.ts).
Object? handler(String method, Map<String, Object?> params) => switch (method) {
      'ephemeris.table' => fx('tables_ephemeris_table'),
      'ephemeris.positions' => fx('tables_ephemeris_positions'),
      'ascendant.rising' => fx('tables_ascendant_rising'),
      'combustion.periods' => fx('tables_combustion'),
      'transit.tables' => fx('tables_transit'),
      'relationships.compute' => fx('tables_relationships'),
      'sadeSati.periods' => fx('tables_sade_sati'),
      'rectification.sensitivity' => fx('tables_rectification'),
      _ => throw StateError('unexpected $method'),
    };

const delhi = BirthInput(name: 'Reference Chart 001', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi, India');
const jan2026 = BirthInput(date: '2026-01-01', time: '05:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi, India');

void main() {
  testWidgets('ephemeris tools: table, positions and Lagna rising tabs', (tester) async {
    final t = await pumpFeature(tester, const EphemerisToolsScreen(initial: jan2026), handler);
    expect(find.byType(ErrorPanel), findsNothing);
    expect(find.textContaining('31 rows'), findsOneWidget);
    expect(find.text('Lagna'), findsWidgets);
    final req = t.sent.firstWhere((m) => m['method'] == 'ephemeris.table');
    expect((req['params'] as Map)['startDate'], '2026-01-01');
    expect((req['params'] as Map)['endDate'], '2026-01-31');
    // body detail view
    await tester.tap(find.widgetWithText(ChoiceChip, 'Venus'));
    await tester.pumpAndSettle();
    expect(find.text('Speed °/day'), findsOneWidget);

    await tester.tap(find.text('Positions at a moment'));
    await tester.pumpAndSettle();
    expect(find.text('Pluto'), findsWidgets);
    expect(find.textContaining('Provisional'), findsWidgets);

    await tester.tap(find.text('Lagna rising'));
    await tester.pumpAndSettle();
    expect(find.text('Tula'), findsOneWidget);
    expect(find.byType(ErrorPanel), findsNothing);
  });

  test('ephemeris models format engine rows', () {
    final page = EphTablePage(fx('tables_ephemeris_table'));
    expect(page.rows.length, 31);
    final t = overviewTable(page.rows, title: 'x');
    expect(t.columns.take(3), ['Date', 'Time', 'Lagna']);
    expect(t.rows.first[1], '05:30');
    expect(bodyDetailTable(page.rows, 'MOON', title: 'm').columns, contains('Magnitude'));
  });

  testWidgets('combustion periods screen shows the provisional label and the periods', (tester) async {
    await pumpFeature(tester, const CombustionPeriodsScreen(timezone: 'Asia/Kolkata', initialYear: 2026), handler);
    expect(find.byType(ErrorPanel), findsNothing);
    expect(find.textContaining('Provisional – pending client review'), findsWidgets);
    expect(find.text('Saturn'), findsWidgets);
    final t = combustionTable(fx('tables_combustion'), 'c');
    expect(t.rows.length, greaterThan(10));
  });

  testWidgets('transit tables and timeline', (tester) async {
    await pumpFeature(tester, const TransitTablesScreen(place: delhi, initialYear: 2026), handler);
    expect(find.byType(ErrorPanel), findsNothing);
    expect(find.byType(TransitTimeline), findsOneWidget);
    expect(find.textContaining('Sign ingresses'), findsWidgets);
    await tester.tap(find.textContaining('Retrograde and direct stations'));
    await tester.pumpAndSettle();
    expect(find.text('Turns retrograde'), findsWidgets);
  });

  testWidgets('relationships matrices', (tester) async {
    await pumpFeature(tester, const RelationshipsScreen(birth: delhi), handler);
    expect(find.text('Compound (Panchadha) relationships'), findsOneWidget);
    expect(find.text('Great friend'), findsWidgets);
  });

  testWidgets('Sade Sati periods table', (tester) async {
    await pumpFeature(tester, const SadeSatiScreen(birth: delhi), handler);
    expect(find.byType(ErrorPanel), findsNothing);
    expect(find.text('Sade Sati cycles'), findsWidgets);
    expect(find.text('Moon sign (peak)'), findsWidgets);
  });

  testWidgets('birth-time sensitivity', (tester) async {
    await pumpFeature(tester, const RectificationScreen(birth: delhi), handler);
    expect(find.byType(ErrorPanel), findsNothing);
    expect(find.text('Margin from the recorded birth time'), findsWidgets);
    expect(find.text('Kanya'), findsWidgets);
  });
}
