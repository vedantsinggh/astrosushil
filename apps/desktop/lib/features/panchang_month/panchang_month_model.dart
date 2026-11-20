import '../../src/util/format.dart';
import '../common/engine_call.dart';

DateTime? _dt(Object? v) => v is String ? DateTime.tryParse(v)?.toUtc() : null;

/// One panchanga element current at sunrise, with its end instant (engine values).
class MonthElement {
  MonthElement(JsonMap j)
      : index = asInt(j['index']) ?? 0,
        name = asStr(j['name']),
        paksha = j['paksha'] as String?,
        pada = asInt(j['pada']),
        end = _dt(j['endIso']);
  final int index;
  final String name;
  final String? paksha;
  final int? pada;
  final DateTime? end;
}

/// One civil day of `panchang.month`.
class PanchangDayRow {
  PanchangDayRow(JsonMap j)
      : date = asStr(j['date']),
        day = asInt(j['day']) ?? 0,
        weekdayIndex = asInt(j['weekdayIndex']) ?? 0,
        weekday = asStr(j['weekday']),
        vara = asStr(j['vara']),
        utcOffsetMinutes = asInt(j['utcOffsetMinutes']) ?? 0,
        sunrise = _dt(j['sunriseIso']),
        sunset = _dt(j['sunsetIso']),
        tithi = MonthElement(asMap(j['tithi'])),
        nakshatra = MonthElement(asMap(j['nakshatra'])),
        yoga = MonthElement(asMap(j['yoga'])),
        karana = MonthElement(asMap(j['karana'])),
        amantaMasa = asStr(asMap(j['masa'])['amanta']),
        purnimantaMasa = asStr(asMap(j['masa'])['purnimanta']),
        isAdhika = asMap(j['masa'])['isAdhika'] == true,
        paksha = asStr(j['paksha']),
        rahuStart = _dt(asMap(j['rahuKaala'])['startIso']),
        rahuEnd = _dt(asMap(j['rahuKaala'])['endIso']);
  final String date;
  final int day;
  final int weekdayIndex;
  final String weekday;
  final String vara;
  final int utcOffsetMinutes;
  final DateTime? sunrise;
  final DateTime? sunset;
  final MonthElement tithi, nakshatra, yoga, karana;
  final String amantaMasa, purnimantaMasa, paksha;
  final bool isAdhika;
  final DateTime? rahuStart, rahuEnd;

  /// Local `HH:mm` rounded to the nearest minute (as almanacs and USNO print), or `-` when absent.
  String hm(DateTime? t) => t == null ? '-' : localTime(t.add(const Duration(seconds: 30)), utcOffsetMinutes, pattern: 'HH:mm');

  /// End time of an element as local `HH:mm`, suffixed `+1`/`+2` when it falls on a later local date.
  String endLabel(MonthElement e) {
    if (e.end == null) return '-';
    final endDate = localTime(e.end!, utcOffsetMinutes, pattern: 'yyyy-MM-dd');
    final days = DateTime.parse(endDate).difference(DateTime.parse(date)).inDays;
    return '${hm(e.end)}${days > 0 ? ' +$days' : ''}';
  }

  String get tithiLabel => '${titleCase(tithi.paksha ?? paksha)} ${tithi.name}';
  String get masaLabel => '$amantaMasa${isAdhika ? ' (Adhika)' : ''}';
}

/// Result of `panchang.month`.
class PanchangMonthModel {
  PanchangMonthModel(JsonMap j)
      : year = asInt(j['year']) ?? 0,
        month = asInt(j['month']) ?? 1,
        placeName = asMap(j['location'])['placeName'] as String?,
        latitude = asDouble(asMap(j['location'])['latitude']) ?? 0,
        longitude = asDouble(asMap(j['location'])['longitude']) ?? 0,
        timezone = asStr(asMap(j['location'])['timezone']),
        reference = asStr(j['reference']),
        rows = asMapList(j['rows']).map(PanchangDayRow.new).toList();
  final int year;
  final int month;
  final String? placeName;
  final double latitude;
  final double longitude;
  final String timezone;
  final String reference;
  final List<PanchangDayRow> rows;

  String get title => '${monthNames[month - 1]} $year';
  String get placeLabel => placeName ?? latLon(latitude, longitude);

  static const columns = ['Date', 'Weekday', 'Sunrise', 'Sunset', 'Tithi', 'Ends', 'Nakshatra', 'Ends', 'Yoga', 'Ends', 'Karana', 'Ends', 'Masa (amanta)', 'Rahu Kaala'];

  List<List<String>> get tableRows => [
        for (final r in rows)
          [
            r.date,
            r.weekday,
            r.hm(r.sunrise),
            r.hm(r.sunset),
            r.tithiLabel,
            r.endLabel(r.tithi),
            '${r.nakshatra.name}${r.nakshatra.pada == null ? '' : ' ${r.nakshatra.pada}'}',
            r.endLabel(r.nakshatra),
            r.yoga.name,
            r.endLabel(r.yoga),
            r.karana.name,
            r.endLabel(r.karana),
            r.masaLabel,
            '${r.hm(r.rahuStart)}-${r.hm(r.rahuEnd)}',
          ],
      ];
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
