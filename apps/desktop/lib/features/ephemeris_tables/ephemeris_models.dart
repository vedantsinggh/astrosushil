import '../../src/util/format.dart';
import '../common/date_controls.dart';
import '../common/engine_call.dart';
import '../common/table_pdf.dart';

/// One body in an ephemeris row (engine `EphemerisBodyEntry`).
class EphBody {
  EphBody(JsonMap j)
      : body = asStr(j['body']),
        longitude = asDouble(j['longitude']) ?? 0,
        speed = asDouble(j['speed']) ?? 0,
        isRetrograde = j['isRetrograde'] == true,
        rashiIndex = asInt(j['rashiIndex']) ?? 0,
        nakshatraName = asStr(j['nakshatraName']),
        pada = asInt(j['pada']) ?? 0,
        nakshatraLord = asStr(j['nakshatraLord']),
        latitude = asDouble(j['latitude']) ?? 0,
        magnitude = asDouble(j['magnitude']);
  final String body;
  final double longitude, speed, latitude;
  final bool isRetrograde;
  final int rashiIndex, pada;
  final String nakshatraName, nakshatraLord;
  final double? magnitude;

  String get position => '${signDms(longitude)}${isRetrograde ? ' R' : ''}';
  String get nakshatraPada => '$nakshatraName $pada';
  String get speedText => '${speed >= 0 ? '+' : ''}${speed.toStringAsFixed(4)}';
}

/// Lagna in an ephemeris row.
class EphAscendant {
  EphAscendant(JsonMap j)
      : longitude = asDouble(j['longitude']) ?? 0,
        nakshatraName = asStr(j['nakshatraName']),
        pada = asInt(j['pada']) ?? 0;
  final double longitude;
  final String nakshatraName;
  final int pada;
}

class EphRow {
  EphRow(JsonMap j)
      : date = asStr(j['date']),
        localTime = asStr(j['localTime']),
        utcIso = asStr(j['utcIso']),
        utcOffsetMinutes = asInt(j['utcOffsetMinutes']) ?? 0,
        ayanamsa = asDouble(j['ayanamsa']) ?? 0,
        bodies = [for (final b in asMapList(j['bodies'])) EphBody(b)],
        ascendant = j['ascendant'] is Map ? EphAscendant(asMap(j['ascendant'])) : null;
  final String date, localTime, utcIso;
  final int utcOffsetMinutes;
  final double ayanamsa;
  final List<EphBody> bodies;
  final EphAscendant? ascendant;

  EphBody? body(String code) => bodies.where((b) => b.body == code).firstOrNull;
}

/// A page of `ephemeris.table`.
class EphTablePage {
  EphTablePage(this.json)
      : rows = [for (final r in asMapList(json['rows'])) EphRow(r)],
        totalRows = asInt(json['totalRows']) ?? 0,
        page = asInt(json['page']) ?? 0,
        pageCount = asInt(json['pageCount']) ?? 1,
        zodiac = asStr(json['zodiac']),
        provisional = json['provisional'] == true,
        source = asStr(json['source']),
        notes = [for (final n in (json['notes'] as List? ?? const [])) '$n'];
  final JsonMap json;
  final List<EphRow> rows;
  final int totalRows, page, pageCount;
  final String zodiac, source;
  final bool provisional;
  final List<String> notes;

  List<String> get bodyCodes => rows.isEmpty ? const [] : [for (final b in rows.first.bodies) b.body];
  bool get hasAscendant => rows.any((r) => r.ascendant != null);
}

String bodyLabel(String code) => code == 'URANUS' || code == 'NEPTUNE' || code == 'PLUTO' ? titleCase(code) : planetName(code);

/// Overview columns: date, time, one position per body (and the Lagna).
ExportTable overviewTable(List<EphRow> rows, {required String title, String subtitle = '', String footnote = ''}) {
  final codes = rows.isEmpty ? <String>[] : [for (final b in rows.first.bodies) b.body];
  final asc = rows.any((r) => r.ascendant != null);
  return ExportTable(
    title: title,
    subtitle: subtitle,
    footnote: footnote,
    columns: ['Date', 'Time', if (asc) 'Lagna', for (final c in codes) bodyLabel(c)],
    rows: [
      for (final r in rows)
        [civilDate(r.date), r.localTime.substring(0, 5), if (asc) r.ascendant == null ? '' : signDms(r.ascendant!.longitude), for (final c in codes) r.body(c)?.position ?? ''],
    ],
  );
}

/// Detail columns for one body: longitude, speed, retrograde, nakshatra/pada, lord, latitude, magnitude.
ExportTable bodyDetailTable(List<EphRow> rows, String code, {required String title, String subtitle = ''}) {
  final mag = rows.any((r) => r.body(code)?.magnitude != null);
  return ExportTable(
    title: title,
    subtitle: subtitle,
    columns: ['Date', 'Time', 'Longitude', 'Speed °/day', 'Motion', 'Nakshatra / pada', 'Star lord', 'Latitude', if (mag) 'Magnitude'],
    rows: [
      for (final r in rows)
        if (r.body(code) case final b?)
          [
            civilDate(r.date),
            r.localTime.substring(0, 5),
            signDms(b.longitude),
            b.speedText,
            b.isRetrograde ? 'Retrograde' : 'Direct',
            b.nakshatraPada,
            planetName(b.nakshatraLord),
            dms(b.latitude, seconds: false),
            if (mag) b.magnitude == null ? '' : b.magnitude!.toStringAsFixed(2),
          ],
    ],
  );
}

/// Positions-at-a-moment table.
ExportTable positionsTable(EphRow r, {required String title}) => ExportTable(
      title: title,
      subtitle: '${civilDate(r.date)} ${r.localTime} (${offsetLabel(r.utcOffsetMinutes)}) · ayanamsa ${dms(r.ayanamsa)}',
      columns: ['Body', 'Longitude', 'Degree in sign', 'Speed °/day', 'Motion', 'Nakshatra / pada', 'Star lord', 'Latitude', 'Magnitude'],
      rows: [
        if (r.ascendant case final a?) ['Lagna', signDms(a.longitude), dms(a.longitude % 30), '', '', '${a.nakshatraName} ${a.pada}', '', '', ''],
        for (final b in r.bodies)
          [
            bodyLabel(b.body),
            signDms(b.longitude),
            dms(b.longitude % 30),
            b.speedText,
            b.isRetrograde ? 'Retrograde' : 'Direct',
            b.nakshatraPada,
            planetName(b.nakshatraLord),
            dms(b.latitude, seconds: false),
            b.magnitude == null ? '' : b.magnitude!.toStringAsFixed(2),
          ],
      ],
    );

/// Rising-sign table (`ascendant.rising`).
ExportTable risingTable(JsonMap j, {required String title}) {
  final off = asInt(j['utcOffsetMinutes']) ?? 0;
  String hm(String iso) => isoLocal(iso, off, seconds: true).substring(11);
  String dur(double m) => '${m ~/ 60}h ${(m % 60).round().toString().padLeft(2, '0')}m';
  return ExportTable(
    title: title,
    subtitle: 'Local times (${offsetLabel(off)}); window ${isoLocal(asStr(j['windowStartIso']), off)} to ${isoLocal(asStr(j['windowEndIso']), off)}',
    columns: ['Rising sign', 'Starts', 'Ends', 'Duration', 'Note'],
    rows: [
      for (final e in asMapList(j['entries']))
        [
          signNames[((asInt(e['rashiIndex']) ?? 1) - 1).clamp(0, 11)],
          hm(asStr(e['startIso'])),
          hm(asStr(e['endIso'])),
          dur(asDouble(e['durationMinutes']) ?? 0),
          [if (e['clippedStart'] == true) 'rising at window start', if (e['clippedEnd'] == true) 'still rising at window end'].join('; '),
        ],
    ],
  );
}
