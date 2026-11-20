import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/common/interpretation_area.dart';
import 'package:astro_desktop/features/common/provisional.dart';
import 'package:astro_desktop/features/matching_south/matching_south_models.dart';
import 'package:astro_desktop/features/matching_south/matching_south_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const boy = BirthInput(name: 'Boy', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');
const girl = BirthInput(name: 'Girl', date: '1992-08-20', time: '06:00:00', timezone: 'Asia/Kolkata', latitude: 13.0827, longitude: 80.2707, placeName: 'Chennai');

Map<String, Object?> fixture(String name) =>
    (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  // Recorded from the real sidecar (matching.porutham / matching.dashakoota) for the two births above.
  final porutham = fixture('matching_south_porutham.json');
  final dashakoota = fixture('matching_south_dashakoota.json');

  test('models read the engine output as returned', () {
    final p = SouthMatchingModel.fromJson(porutham);
    expect(p.system, 'PORUTHAM');
    expect(p.provisional, isTrue);
    expect(p.girl.nakshatraName, 'Bharani');
    expect(p.boy.nakshatraName, 'Uttara Ashadha');
    expect(p.kootas, hasLength(10));
    expect(p.matchedCount, p.kootas.where((k) => k.matched).length);
    // Bharani(2) → Uttara Ashadha(21): inclusive count 20.
    expect(p.kootas.first.inputs['count'], 20);
    final t = p.table;
    expect(t.rows, hasLength(10));
    expect(t.columns, ['Koota', 'Result', 'Grade', 'Lookups']);
    final d = SouthMatchingModel.fromJson(dashakoota);
    expect(d.system, 'DASHAKOOTA');
    expect(d.title, 'Dashakoota');
  });

  testWidgets('renders inputs, both tables, banners and notes area', (tester) async {
    final t = await pumpFeature(tester, const MatchingSouthScreen(boy: boy, girl: girl), (m, p) {
      if (m == 'matching.porutham') return porutham;
      if (m == 'matching.dashakoota') return dashakoota;
      throw StateError('unexpected $m');
    }, size: const Size(1500, 2400));
    expect(t.sent.map((r) => r['method']).toSet(), {'matching.porutham', 'matching.dashakoota'});
    expect(find.byType(ProvisionalBanner), findsNWidgets(2));
    expect(find.byKey(const ValueKey('porutham-table')), findsOneWidget);
    expect(find.byKey(const ValueKey('dashakoota-table')), findsOneWidget);
    expect(find.text('Porutham (10 poruthams)'), findsOneWidget);
    expect(find.text('Dashakoota'), findsOneWidget);
    expect(find.textContaining('Bharani'), findsWidgets);
    expect(find.textContaining('Uttara Ashadha'), findsWidgets);
    expect(find.text('Rajju'), findsWidgets);
    expect(find.text('Vedhai'), findsWidgets);
    expect(find.byType(InterpretationArea), findsOneWidget);
  });
}
