import 'dart:convert';
import 'dart:io';

import 'package:astro_desktop/features/common/interpretation_area.dart';
import 'package:astro_desktop/features/common/provisional.dart';
import 'package:astro_desktop/features/common/table_pdf.dart';
import 'package:astro_desktop/features/muhurta_extras/muhurta_extras_models.dart';
import 'package:astro_desktop/features/muhurta_extras/muhurta_extras_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'feature_harness.dart';

const moment = BirthInput(date: '2026-03-03', time: '12:00:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

Map<String, Object?> fixture(String name) =>
    (jsonDecode(File('test/fixtures/features/$name').readAsStringSync()) as Map).cast<String, Object?>();

void main() {
  // Recorded from the real sidecar: muhurta.extras (New Delhi, 2026-03-03) and
  // muhurta.gandmoolPanchaka (from that civil day's local midnight, 90 days, Asia/Kolkata).
  final day = fixture('muhurta_extras_day_2026_03_03.json');
  final range = fixture('muhurta_extras_range_90.json');

  test('models read the engine output as returned', () {
    final d = MuhurtaExtrasDayModel(day);
    expect(d.provisional, isTrue);
    expect(d.weekdayName, 'Tuesday');
    expect(d.utcOffsetMinutes, 330);
    // Tuesday rule: 4th day muhurta and 7th night muhurta.
    expect(d.durmuhurta.map((w) => w.label), ['Day muhurta 4', 'Night muhurta 7']);
    expect(d.varjyam, isNotEmpty);
    expect(d.amritKalam, isNotEmpty);
    expect(d.tableRows.length, d.durmuhurta.length + d.varjyam.length + d.amritKalam.length);
    // Rows are sorted by start time.
    final starts = d.allWindows.map((w) => w.start).toList();
    expect([...starts]..sort(), starts);

    final r = GandmoolPanchakaRangeModel(range);
    expect(r.provisional, isTrue);
    expect(r.rows.length, r.totalRows);
    expect(r.rows.where((x) => x.kind == 'PANCHAKA').every((x) => x.nakshatras.first == 'Dhanishta' && x.nakshatras.last == 'Revati'), isTrue);
    final ExportTable t = r.exportTable('Gandmool and Panchaka periods', 'test');
    expect(t.columns, GandmoolPanchakaRangeModel.columns);
    expect(t.rows.length, r.rows.length);
  });

  testWidgets('renders the day windows and the Gandmool / Panchaka table', (tester) async {
    final t = await pumpFeature(tester, const MuhurtaExtrasScreen(initial: moment), (m, p) {
      if (m == 'muhurta.extras') return day;
      if (m == 'muhurta.gandmoolPanchaka') return range;
      throw StateError('unexpected $m');
    }, size: const Size(1500, 3200));
    final sent = t.sent.toList();
    expect(sent.map((r) => r['method']), containsAll(['muhurta.extras', 'muhurta.gandmoolPanchaka']));
    final rangeReq = sent.firstWhere((r) => r['method'] == 'muhurta.gandmoolPanchaka');
    expect((rangeReq['params'] as Map)['startIso'], day['civilDayStartIso']);

    expect(find.byType(ProvisionalBanner), findsNWidgets(2));
    expect(find.byType(InterpretationArea), findsOneWidget);
    expect(find.text('Day muhurta 4'), findsOneWidget);
    expect(find.text('Night muhurta 7'), findsOneWidget);
    expect(find.text('Panchaka'), findsWidgets);
    expect(find.text('Gandmool'), findsWidgets);
    expect(find.text('Export PDF'), findsNWidgets(2));

    await tester.tap(find.text('1 year'));
    await tester.pumpAndSettle();
    final yearReq = t.sent.lastWhere((r) => r['method'] == 'muhurta.gandmoolPanchaka');
    final params = yearReq['params'] as Map;
    expect(DateTime.parse(params['endIso'] as String).difference(DateTime.parse(params['startIso'] as String)).inDays, 365);
  });
}
