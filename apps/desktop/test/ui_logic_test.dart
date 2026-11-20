import 'package:astro_desktop/src/charts/chart_geometry.dart';
import 'package:astro_desktop/src/data/chart_file.dart';
import 'package:astro_desktop/src/data/chart_library.dart';
import 'package:astro_desktop/src/engine/models.dart';
import 'package:astro_desktop/src/ui/commands.dart';
import 'package:astro_desktop/src/ui/screens/transit_timeline_screen.dart';
import 'package:astro_desktop/src/util/format.dart';
import 'package:astro_desktop/src/util/input_parsing.dart';
import 'package:flutter/widgets.dart' show SingleActivator;
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'app_harness.dart';
import 'helpers.dart';

void main() {
  group('forgiving date input', () {
    test('accepts common formats', () {
      for (final s in ['1990-05-15', '15-05-1990', '15/05/1990', '15.5.1990', '15 May 1990', 'May 15, 1990', '15th may 1990', '05/15/1990']) {
        expect(parseDateInput(s).value, '1990-05-15', reason: s);
      }
    });
    test('explains problems in plain words', () {
      expect(parseDateInput('').error, contains('Please enter the date'));
      expect(parseDateInput('31/02/1990').error, contains("doesn't exist"));
      expect(parseDateInput('15/05/90').error, contains('four digits'));
      expect(parseDateInput('15/05/1700').error, contains('between 1800 and 2200'));
      expect(parseDateInput('soon').error, contains("couldn't read"));
    });
  });

  group('forgiving time input', () {
    test('accepts 24h, am/pm and compact forms', () {
      final cases = {'14:30': '14:30:00', '14:30:15': '14:30:15', '14.30': '14:30:00', '1430': '14:30:00', '2:30 pm': '14:30:00', '2pm': '14:00:00', '12 am': '00:00:00', '12:05 PM': '12:05:00', '9': '09:00:00'};
      cases.forEach((k, v) => expect(parseTimeInput(k).value, v, reason: k));
    });
    test('rejects out-of-range values', () {
      expect(parseTimeInput('25:00').error, contains('hour'));
      expect(parseTimeInput('13 pm').error, contains('between 1 and 12'));
      expect(parseTimeInput('10:75').error, contains('minutes'));
      expect(parseTimeInput('').error, contains('12:00'));
    });
    test('coordinates with hemispheres and DMS', () {
      expect(parseCoordinate('28.6139', latitude: true), 28.6139);
      expect(parseCoordinate('33.86 S', latitude: true), -33.86);
      expect(parseCoordinate("77°12'32\" E", latitude: false), closeTo(77.2089, 1e-3));
      expect(parseCoordinate('77 W', latitude: false), -77);
      expect(parseCoordinate('95', latitude: true), isNull);
      expect(parseCoordinate('10 E', latitude: true), isNull);
    });
  });

  group('chart database query', () {
    ChartLibraryEntry e(String name, String date, String? g, String place, {String notes = ''}) =>
        ChartLibraryEntry(path: '/c/$name.aschart', file: ChartFile(birth: refBirth.copyWith(name: name, date: date, placeName: place), gender: g, notes: notes), modified: DateTime(2026, 1, date.length));
    final all = [e('Asha Rao', '1990-05-15', 'F', 'Pune', notes: 'rectified'), e('Vikram', '1975-02-01', 'M', 'Mumbai'), e('Meera', '1988-11-30', 'F', 'Chennai')];
    test('text matches every word across name, place, notes and date', () {
      expect(const LibraryQuery(text: 'asha pune').apply(all).map((x) => x.name), ['Asha Rao']);
      expect(const LibraryQuery(text: 'rectified').apply(all), hasLength(1));
      expect(const LibraryQuery(text: '1975').apply(all).single.name, 'Vikram');
    });
    test('gender and year range filters, sorting', () {
      expect(const LibraryQuery(gender: 'F', fromYear: 1989).apply(all).single.name, 'Asha Rao');
      expect(const LibraryQuery(sort: LibrarySort.name, descending: false).apply(all).map((x) => x.name), ['Asha Rao', 'Meera', 'Vikram']);
      expect(const LibraryQuery(sort: LibrarySort.birthDate, descending: true).apply(all).first.name, 'Asha Rao');
    });
  });

  group('transit timeline grouping (display only)', () {
    final t = TransitTimelineModel(fixture('timeline'));
    test('sign spans start and end exactly at engine ingress events', () {
      final spans = signSpans('SUN', t.events, t.start, t.end);
      final ingresses = t.events.where((e) => e.planet == 'SUN' && e.isSignIngress).toList();
      expect(spans.length, ingresses.length + 1);
      for (var i = 0; i < ingresses.length; i++) {
        expect(spans[i].end, ingresses[i].at);
        expect(spans[i + 1].start, ingresses[i].at);
        expect(spans[i + 1].sign, ingresses[i].toIndex);
      }
      expect(spans.first.start, t.start);
      expect(spans.last.end, t.end);
    });
    test('planets without an ingress use the provided snapshot sign', () {
      final spans = signSpans('NONE', t.events, t.start, t.end, initialSign: 3, initialName: 'Mithuna');
      expect(spans.single.name, 'Mithuna');
      expect(signSpans('NONE', t.events, t.start, t.end), isEmpty);
    });
  });

  group('chart geometry hit-testing', () {
    test('every cell anchor lies inside its own polygon, in every style', () {
      for (final st in ChartStyle.values) {
        for (var asc = 1; asc <= 12; asc++) {
          final l = buildLayout(st, asc);
          for (final c in l.cells) {
            expect(l.signAt(c.anchor), c.sign, reason: '$st asc $asc sign ${c.sign}');
          }
        }
      }
    });
    test('North: the top diamond is the ascendant sign (house 1)', () {
      expect(buildLayout(ChartStyle.north, 5).signAt(const Pt(0.5, 0.2)), 5);
      expect(buildLayout(ChartStyle.south, 1).signAt(const Pt(0.5, 0.5)), isNull); // empty centre
    });
  });

  group('commands', () {
    test('no two commands share a shortcut', () {
      final map = <String, String>{};
      final specs = buildCommandSpecs();
      for (final s in specs) {
        for (final a in [if (s.shortcut != null) s.shortcut!, ...s.altShortcuts]) {
          final k = '${a.trigger.keyId}-${a.control}-${a.shift}-${a.alt}-${a.meta}';
          expect(map.containsKey(k), isFalse, reason: '${s.label} vs ${map[k]}');
          map[k] = s.label;
        }
      }
      expect(buildShortcutMap(specs).length, greaterThan(specs.length));
    });
    test('labels read naturally', () {
      expect(shortcutLabel(primary(LogicalKeyboardKey.keyS, shift: true)), 'Ctrl+Shift+S');
      expect(shortcutLabel(const SingleActivator(LogicalKeyboardKey.f1)), 'F1');
    });
    test('CSV escaping', () {
      expect(toCsv(['a', 'b'], [['x,y', 'say "hi"']]), 'a,b\r\n"x,y","say ""hi"""');
    });
  });
}
