import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/common/interpretation_area.dart';
import 'package:astro_desktop/features/common/provisional.dart';
import 'package:astro_desktop/features/tajika/tajika_models.dart';
import 'package:astro_desktop/features/tajika/tajika_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const birth = BirthInput(name: 'Reference Chart 001', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi, India');

Map<String, Object?> fixture(String name) =>
    (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  // Recorded from the real sidecar (tajika.yogas / tajika.panchaVargiya / tajika.tithiPravesha, targetYear 2026).
  final yogas = fixture('tajika_yogas_2026.json');
  final bala = fixture('tajika_pancha_vargiya_2026.json');
  final tp = fixture('tajika_tithi_pravesha_2026.json');

  test('models read the engine output as returned', () {
    final y = TajikaYogasModel.fromJson(yogas);
    expect(y.yogas, hasLength(16));
    expect(y.provisional, isTrue);
    expect(y.yogas.where((e) => e.present).map((e) => e.id), ['ITHASALA', 'ISHRAFA', 'DURUPHA']);
    final ith = y.yogas.firstWhere((e) => e.id == 'ITHASALA').occurrences.single;
    expect(ith.variant, 'VARTAMANA');
    expect(ith.roles, {'faster': 'VENUS', 'slower': 'MARS'});
    expect(y.summaryTable.rows, hasLength(16));
    expect(y.evidenceTable.rows.first.first, 'Ithasala');

    final b = TajikaPanchaVargiyaModel.fromJson(bala);
    expect(b.chartKind, 'ANNUAL');
    expect(b.planets, hasLength(7));
    for (final p in b.planets) {
      expect(p.vimshopaka, closeTo(p.total / 4, 1e-9));
    }

    final t = TithiPraveshaModel.fromJson(tp);
    expect(t.momentUtc.startsWith('2026-06-05T22:4'), isTrue);
    expect(t.sunSignMatches, isTrue);
    expect(t.candidates, hasLength(2));
    expect(t.chartData.ascSign, t.rasi.ascendant.rashiIndex);
  });

  testWidgets('renders the three sections and steps through years', (tester) async {
    final transport = await pumpFeature(tester, const TajikaScreen(birth: birth, initialYear: 2026), (m, p) {
      switch (m) {
        case 'tajika.yogas':
          return {...yogas, 'targetYear': p['targetYear']};
        case 'tajika.panchaVargiya':
          return {...bala, 'targetYear': p['targetYear']};
        case 'tajika.tithiPravesha':
          return {...tp, 'targetYear': p['targetYear']};
      }
      throw StateError('unexpected $m');
    }, size: const Size(1500, 3200));
    expect(transport.sent.map((r) => r['method']), containsAll(['tajika.yogas', 'tajika.panchaVargiya', 'tajika.tithiPravesha']));
    expect(find.byKey(const ValueKey('tajika-yoga-table')), findsOneWidget);
    expect(find.byKey(const ValueKey('tajika-evidence-table')), findsOneWidget);
    expect(find.byKey(const ValueKey('tajika-bala-table')), findsOneWidget);
    expect(find.byKey(const ValueKey('tajika-tithi-pravesha-chart')), findsOneWidget);
    expect(find.byType(ProvisionalBanner), findsNWidgets(3));
    expect(find.byType(InterpretationArea), findsOneWidget);
    expect(find.text('Gairi-Kamboola (Gairikamboola)'), findsOneWidget);
    expect(find.text('Tajika yogas (16)'), findsOneWidget);

    await tester.tap(find.byTooltip('Next year'));
    await tester.pumpAndSettle();
    final years = transport.sent.where((r) => r['method'] == 'tajika.yogas').map((r) => (r['params'] as Map)['targetYear']).toList();
    expect(years, containsAll([2026, 2027]));
    expect(find.text('2027'), findsOneWidget);
  });
}
