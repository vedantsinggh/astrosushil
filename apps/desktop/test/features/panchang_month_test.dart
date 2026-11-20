import 'dart:convert';

import 'package:astro_desktop/features/panchang_month/panchang_month_model.dart';
import 'package:astro_desktop/features/panchang_month/panchang_month_pdf.dart';
import 'package:astro_desktop/features/panchang_month/panchang_month_screen.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers.dart';
import 'feature_harness.dart';

/// Real `panchang.month` output for New Delhi, January 2026 (engine-sidecar dispatchLine via tsx).
final _fx = fixture('features/panchang_month_2026_01');
const _delhi = LocationInput(latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'New Delhi, India');

void main() {
  test('model reads the month and formats local times', () {
    final m = PanchangMonthModel(_fx);
    expect(m.title, 'January 2026');
    expect(m.rows, hasLength(31));
    final d1 = m.rows.first;
    // 1 Jan 2026 is a Thursday (Gregorian calendar).
    expect(d1.weekday, 'Thursday');
    expect(d1.weekdayIndex, 4);
    // USNO (aa.usno.navy.mil/api/rstt/oneday?date=2026-01-01&coords=28.6139,77.209&tz=5.5):
    // rise 07:14, set 17:35 IST; the engine values round to the same minute (+/-1).
    final rise = d1.hm(d1.sunrise).split(':').map(int.parse).toList();
    expect((rise[0] * 60 + rise[1] - (7 * 60 + 14)).abs(), lessThanOrEqualTo(1));
    final set = d1.hm(d1.sunset).split(':').map(int.parse).toList();
    expect((set[0] * 60 + set[1] - (17 * 60 + 35)).abs(), lessThanOrEqualTo(1));
    expect(m.tableRows, hasLength(31));
    expect(m.tableRows.first, hasLength(PanchangMonthModel.columns.length));
  });

  test('endLabel marks next-day ends', () {
    final r = PanchangDayRow({
      'date': '2026-01-01',
      'utcOffsetMinutes': 330,
      'tithi': {'name': 'X', 'endIso': '2026-01-01T20:00:00Z'}, // 01:30 IST on 2 Jan
      'nakshatra': {'name': 'Y', 'endIso': '2026-01-01T10:00:00Z'}, // 15:30 IST same day
    });
    expect(r.endLabel(r.tithi), '01:30 +1');
    expect(r.endLabel(r.nakshatra), '15:30');
  });

  test('A4 landscape PDF: one page per month', () async {
    final m = PanchangMonthModel(_fx);
    final one = await buildPanchangMonthPdf([m]);
    expect(latin1.decode(one.sublist(0, 5)), '%PDF-');
    final two = await buildPanchangMonthPdf([m, m]);
    int pages(List<int> b) => RegExp(r'/Type\s*/Page(?![s\w])').allMatches(latin1.decode(b)).length;
    expect(pages(one), 1);
    expect(pages(two), 2);
    // Landscape A4 media box (841.89 x 595.28 pt).
    expect(latin1.decode(one), contains('841.8'));
  });

  testWidgets('screen shows the calendar grid, table and stepper', (tester) async {
    final t = await pumpFeature(tester, const PanchangMonthScreen(location: _delhi, initialYear: 2026, initialMonth: 1), (method, p) {
      expect(method, 'panchang.month');
      return _fx;
    });
    expect(find.text('January 2026'), findsOneWidget);
    expect(find.text('Panchang - January 2026'), findsOneWidget);
    expect(find.byType(MonthGrid), findsOneWidget);
    expect(find.text('Save PDF'), findsOneWidget);
    expect(find.text('Print'), findsOneWidget);
    expect(find.text('Thu'), findsOneWidget);
    final p = t.sent.first['params'] as Map;
    expect(p['year'], 2026);
    expect(p['month'], 1);
    expect((p['location'] as Map)['timezone'], 'Asia/Kolkata');

    await tester.tap(find.byTooltip('Next month'));
    await tester.pumpAndSettle();
    expect(find.text('February 2026'), findsOneWidget);
    expect((t.sent.last['params'] as Map)['month'], 2);
  });
}
