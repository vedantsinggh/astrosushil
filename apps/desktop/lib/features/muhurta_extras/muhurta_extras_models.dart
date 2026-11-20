import '../../src/util/format.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

/// Dart views of the sidecar's `muhurta.extras` and `muhurta.gandmoolPanchaka` results.
/// Pure readers and formatting: every instant and rule comes from the engine.

const weekdayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

DateTime _t(Object? v) => DateTime.parse(asStr(v)).toUtc();

String _when(DateTime utc, int off) => localTime(utc, off, pattern: 'dd MMM HH:mm');

class MuhurtaWindowRow {
  MuhurtaWindowRow({required this.kind, required this.label, required this.start, required this.end, this.detail = ''});
  final String kind;
  final String label;
  final String detail;
  final DateTime start;
  final DateTime end;
}

class MuhurtaExtrasDayModel {
  MuhurtaExtrasDayModel(this.json)
      : utcOffsetMinutes = asInt(json['utcOffsetMinutes']) ?? 0,
        weekdayIndex = asInt(json['weekdayIndex']) ?? 0,
        provisional = json['provisional'] == true,
        source = asStr(json['source']),
        conventionNotes = [for (final n in (json['conventionNotes'] is List ? json['conventionNotes'] as List : const [])) asStr(n)],
        varjyamTable = asStr(json['varjyamTable']),
        civilDayStart = _t(json['civilDayStartIso']),
        sunrise = _t(json['sunriseIso']),
        sunset = _t(json['sunsetIso']),
        nextSunrise = _t(json['nextSunriseIso']),
        dayMuhurtaMinutes = asDouble(json['dayMuhurtaMinutes']) ?? 0,
        nightMuhurtaMinutes = asDouble(json['nightMuhurtaMinutes']) ?? 0;

  final JsonMap json;
  final int utcOffsetMinutes;
  final int weekdayIndex;
  final bool provisional;
  final String source;
  final List<String> conventionNotes;
  final String varjyamTable;
  final DateTime civilDayStart;
  final DateTime sunrise;
  final DateTime sunset;
  final DateTime nextSunrise;
  final double dayMuhurtaMinutes;
  final double nightMuhurtaMinutes;

  String get weekdayName => weekdayNamesEn[weekdayIndex.clamp(0, 6)];

  List<MuhurtaWindowRow> get durmuhurta => [
        for (final d in asMapList(json['durmuhurta']))
          MuhurtaWindowRow(
            kind: 'Durmuhurta',
            label: '${asStr(d['part']) == 'NIGHT' ? 'Night' : 'Day'} muhurta ${asInt(d['muhurtaNumber']) ?? ''}',
            detail: asStr(d['muhurtaName']),
            start: _t(d['startIso']),
            end: _t(d['endIso']),
          ),
      ];

  List<MuhurtaWindowRow> _ghati(String key, String kind) => [
        for (final w in asMapList(json[key]))
          MuhurtaWindowRow(
            kind: kind,
            label: asStr(w['nakshatraName']),
            detail: 'after ${asInt(w['ghatiOffset']) ?? ''} of 60 ghatis, ${asInt(w['ghatiLength']) ?? 4} ghatis',
            start: _t(w['startIso']),
            end: _t(w['endIso']),
          ),
      ];

  List<MuhurtaWindowRow> get varjyam => _ghati('varjyam', 'Varjyam');
  List<MuhurtaWindowRow> get amritKalam => _ghati('amritKalam', 'Amrit Kalam');

  List<MuhurtaWindowRow> get allWindows => [...durmuhurta, ...varjyam, ...amritKalam]..sort((a, b) => a.start.compareTo(b.start));

  List<List<String>> get nakshatraRows => [
        for (final n in asMapList(json['nakshatras'])) [asStr(n['name']), _when(_t(n['startIso']), utcOffsetMinutes), _when(_t(n['endIso']), utcOffsetMinutes)],
      ];

  static const columns = ['Window', 'Muhurta / nakshatra', 'Rule', 'From', 'To'];

  List<List<String>> get tableRows => [
        for (final w in allWindows) [w.kind, w.label, w.detail, _when(w.start, utcOffsetMinutes), _when(w.end, utcOffsetMinutes)],
      ];

  ExportTable exportTable(String title) => ExportTable(
        title: title,
        subtitle: 'Times local (${offsetLabel(utcOffsetMinutes)}). Provisional - pending client review.',
        columns: columns,
        rows: tableRows,
        footnote: 'Source: $source',
      );
}

class GandmoolPanchakaRow {
  GandmoolPanchakaRow(JsonMap j)
      : kind = asStr(j['kind']),
        start = _t(j['startIso']),
        end = _t(j['endIso']),
        durationHours = asDouble(j['durationHours']) ?? 0,
        utcOffsetMinutes = asInt(j['utcOffsetMinutes']) ?? 0,
        nakshatras = [for (final n in asMapList(j['nakshatras'])) asStr(n['name'])];
  final String kind;
  final DateTime start;
  final DateTime end;
  final double durationHours;
  final int utcOffsetMinutes;
  final List<String> nakshatras;

  String get kindLabel => kind == 'PANCHAKA' ? 'Panchaka' : 'Gandmool';
}

class GandmoolPanchakaRangeModel {
  GandmoolPanchakaRangeModel(this.json)
      : provisional = json['provisional'] == true,
        source = asStr(json['source']),
        conventionNotes = [for (final n in (json['conventionNotes'] is List ? json['conventionNotes'] as List : const [])) asStr(n)],
        totalRows = asInt(json['totalRows']) ?? 0,
        pageCount = asInt(json['pageCount']) ?? 1,
        rows = [for (final r in asMapList(json['rows'])) GandmoolPanchakaRow(r)];

  final JsonMap json;
  final bool provisional;
  final String source;
  final List<String> conventionNotes;
  final int totalRows;
  final int pageCount;
  final List<GandmoolPanchakaRow> rows;

  static const columns = ['Type', 'From', 'To', 'Hours', 'Nakshatras'];

  List<List<String>> get tableRows => [
        for (final r in rows)
          [r.kindLabel, _when(r.start, r.utcOffsetMinutes), _when(r.end, r.utcOffsetMinutes), fixed(r.durationHours, 1), r.nakshatras.join(', ')],
      ];

  ExportTable exportTable(String title, String subtitle) => ExportTable(
        title: title,
        subtitle: '$subtitle. Provisional - pending client review.',
        columns: columns,
        rows: tableRows,
        footnote: 'Source: $source',
      );
}
