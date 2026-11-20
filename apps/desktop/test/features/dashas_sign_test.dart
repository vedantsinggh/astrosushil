import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/common/interpretation_area.dart';
import 'package:astro_desktop/features/common/provisional.dart';
import 'package:astro_desktop/features/dashas_extended/dashas_extended_screen.dart';
import 'package:astro_desktop/features/dashas_extended/sign_dasha_models.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const birth = BirthInput(name: 'Reference', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

Map<String, Object?> fixture(String name) =>
    (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  // Recorded from the real sidecar for the birth above, targetDate 2026-11-20:
  // dashaExt.list; dashaExt.sign.compute (SUDASA / DRIG, maxLevel 2); dashaExt.sign.subPeriods (SUDASA, path [6, 1]).
  final list = fixture('dashas_sign_list.json');
  final sudasa = fixture('dashas_sign_sudasa.json');
  final drig = fixture('dashas_sign_drig.json');
  final sudasaPd = fixture('dashas_sign_sudasa_pd.json');

  Object? handler(String m, Map<String, Object?> p) {
    if (m == 'dashaExt.list') return list;
    if (m == 'dashaExt.sign.compute') return p['system'] == 'DRIG' ? drig : sudasa;
    if (m == 'dashaExt.sign.subPeriods') return sudasaPd;
    throw StateError('unexpected $m');
  }

  test('models read the engine output as returned', () {
    final entries = dashaExtEntries(list);
    expect(entries.where((e) => e.group == 'SIGN' && e.implemented).map((e) => e.system), ['SUDASA', 'DRIG', 'NIRYANA_SHOOLA', 'MANDOOKA', 'TRIKONA', 'KENDRADI']);
    expect(entries.where((e) => e.group == 'SIGN' && !e.implemented).every((e) => e.notImplementedReason.isNotEmpty), isTrue);
    final t = DashaExtTree.fromJson(sudasa);
    expect(t.provisional, isTrue);
    expect(t.label, 'provisional – pending client review');
    expect(t.source, contains('Narasimha Rao'));
    expect(t.periods.first.label, 'Capricorn');
    expect(t.periods.first.years, 12);
    // Engine marks Gemini Mahadasha / Virgo Antardasha as running on 2026-11-20.
    expect(t.periods[t.activeIndex].label, 'Gemini');
    expect(t.currentPath, 'Gemini - Virgo');
    expect(t.facts.map((f) => f.$1), containsAll(['Starting sign', 'Sree Lagna', 'Balance at birth']));
    final table = t.periodTable('x', t.periods);
    expect(table.rows.first.sublist(1, 4), ['Capricorn', 'Saturn', '1']);
  });

  testWidgets('shows the system dropdown, provisional banner and the three period tables', (tester) async {
    final t = await pumpFeature(tester, const DashasExtendedScreen(birth: birth), handler, size: const Size(1500, 3200));
    expect(t.sent.map((r) => r['method']), containsAll(['dashaExt.list', 'dashaExt.sign.compute', 'dashaExt.sign.subPeriods']));
    expect(find.byKey(const ValueKey('dashas-ext-system')), findsOneWidget);
    expect(find.byType(ProvisionalBanner), findsOneWidget);
    expect(find.byType(InterpretationArea), findsOneWidget);
    expect(find.byKey(const ValueKey('sign-dasha-md-table')), findsOneWidget);
    expect(find.byKey(const ValueKey('sign-dasha-ad-table')), findsOneWidget);
    expect(find.byKey(const ValueKey('sign-dasha-pd-table')), findsOneWidget);
    // Active Mahadasha is preselected, so its Antardashas and the active Antardasha's Pratyantardashas show.
    expect(find.text('Antardashas of Gemini'), findsOneWidget);
    expect(find.text('Pratyantardashas of Gemini – Virgo'), findsOneWidget);
    expect(find.text('Not yet available'), findsOneWidget);

    // Switch to Drig Dasa through the dropdown.
    await tester.tap(find.byKey(const ValueKey('dashas-ext-system')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign · Drig Dasa').last);
    await tester.pumpAndSettle();
    expect(t.sent.any((r) => r['method'] == 'dashaExt.sign.compute' && (r['params'] as Map)['system'] == 'DRIG'), isTrue);
    expect(find.text('Drig Dasa – Mahadashas'), findsOneWidget);
  });
}
