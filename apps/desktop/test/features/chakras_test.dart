import 'package:astro_desktop/features/chakras/chakras_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers.dart';
import 'feature_harness.dart';

// Fixtures recorded from the real sidecar (chakra.* handlers) for New Delhi, 1990-05-15 14:30 IST,
// transit moment 2026-11-20 12:00, Tripataki year 2026.
const birth = BirthInput(name: 'Reference Chart 001', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi, India');
final moment = birth.copyWith(date: '2026-11-20', time: '12:00');

Object? handler(String method, Map<String, Object?> params) => switch (method) {
      'chakra.sarvatobhadra' => fixture('features/chakras_sarvatobhadra'),
      'chakra.kota' => fixture('features/chakras_kota'),
      'chakra.tripataki' => fixture('features/chakras_tripataki'),
      _ => throw StateError('unexpected $method'),
    };

void main() {
  testWidgets('Sarvatobhadra: grid, banner, vedha tables, transit request', (tester) async {
    final t = await pumpFeature(tester, SarvatobhadraScreen(birth: birth, initialMoment: moment), handler);
    expect(find.byKey(const ValueKey('sbc-grid')), findsOneWidget);
    expect(find.textContaining('Provisional – pending client review'), findsOneWidget);
    expect(find.textContaining('Narapatijayacharya'), findsWidgets);
    expect(find.text('Vedha lines'), findsOneWidget);
    expect(find.text('Notes / interpretation'), findsOneWidget);
    final req = t.sent.firstWhere((m) => m['method'] == 'chakra.sarvatobhadra');
    expect((req['params'] as Map).containsKey('moment'), isTrue);
    // Selecting another planet keeps the screen consistent.
    await tester.tap(find.widgetWithText(ChoiceChip, 'Saturn').first);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Sarvatobhadra without transit sends no moment', (tester) async {
    final t = await pumpFeature(tester, const SarvatobhadraScreen(birth: birth), handler);
    final req = t.sent.firstWhere((m) => m['method'] == 'chakra.sarvatobhadra');
    expect((req['params'] as Map).containsKey('moment'), isFalse);
  });

  testWidgets('Kota: Kota Swami / Pala from the engine and the fort drawing', (tester) async {
    await pumpFeature(tester, KotaChakraScreen(birth: birth, initialMoment: moment), handler);
    expect(find.byKey(const ValueKey('kota-chart')), findsOneWidget);
    expect(find.text('Saturn (lord of Makara)'), findsOneWidget);
    expect(find.text('Saturn (letter भो)'), findsOneWidget);
    expect(find.text('Uttara Ashadha pada 2'), findsOneWidget);
    expect(find.textContaining('Provisional'), findsOneWidget);
  });

  testWidgets('Tripataki: placements, Varsha Lagna, year stepper', (tester) async {
    final t = await pumpFeature(tester, const TripatakiScreen(birth: birth, initialYear: 2026), handler);
    expect(find.text('Vrischika'), findsWidgets);
    expect(find.text('Running year'), findsOneWidget);
    expect(find.textContaining('Vedha on the Moon is not shown'), findsOneWidget);
    await tester.tap(find.byTooltip('Next year'));
    await tester.pumpAndSettle();
    expect(t.sent.where((m) => m['method'] == 'chakra.tripataki').map((m) => (m['params'] as Map)['targetYear']), containsAll([2026, 2027]));
  });

  testWidgets('ChakrasScreen shows the three tabs', (tester) async {
    await pumpFeature(tester, const ChakrasScreen(birth: birth), handler);
    expect(find.text('Sarvatobhadra'), findsWidgets);
    await tester.tap(find.text('Tripataki'));
    await tester.pumpAndSettle();
    expect(find.text('Tripataki placements'), findsWidgets);
  });
}
