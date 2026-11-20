import 'package:intl/intl.dart';

/// Presentation-only helpers (no astrological computation).

const planetAbbr = <String, String>{
  'SUN': 'Su', 'MOON': 'Mo', 'MARS': 'Ma', 'MERCURY': 'Me', 'JUPITER': 'Ju',
  'VENUS': 'Ve', 'SATURN': 'Sa', 'RAHU': 'Ra', 'KETU': 'Ke', 'LAGNA': 'La', 'Ascendant': 'As',
};

const planetOrder = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];

/// Display names for signs 1-12 (labels only).
const signNames = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
const signShort = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];

String abbr(String planet) => planetAbbr[planet] ?? (planet.length > 2 ? planet.substring(0, 2) : planet);

String titleCase(String s) => s.isEmpty ? s : s.split(RegExp(r'[_\s]+')).map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1).toLowerCase()).join(' ');

/// 0..30 degrees as `12°34'56"`.
String dms(double deg, {bool seconds = true}) {
  final sign = deg < 0 ? '-' : '';
  var x = deg.abs();
  var d = x.floor();
  var mFull = (x - d) * 60;
  var m = mFull.floor();
  var s = ((mFull - m) * 60).round();
  if (s == 60) {
    s = 0;
    m += 1;
  }
  if (m == 60) {
    m = 0;
    d += 1;
  }
  final mm = m.toString().padLeft(2, '0');
  final ss = s.toString().padLeft(2, '0');
  return seconds ? "$sign$d°$mm'$ss\"" : "$sign$d°$mm'";
}

/// Absolute longitude as `Sg 12°34'`.
String signDms(double longitude) {
  final norm = ((longitude % 360) + 360) % 360;
  final idx = (norm ~/ 30).clamp(0, 11);
  return '${signShort[idx]} ${dms(norm - idx * 30, seconds: false)}';
}

String latLon(double lat, double lon) {
  String f(double v, String pos, String neg) => '${dms(v.abs(), seconds: false)} ${v >= 0 ? pos : neg}';
  return '${f(lat, 'N', 'S')}, ${f(lon, 'E', 'W')}';
}

String offsetLabel(int minutes) {
  final sign = minutes >= 0 ? '+' : '-';
  final m = minutes.abs();
  return 'UTC$sign${(m ~/ 60).toString().padLeft(2, '0')}:${(m % 60).toString().padLeft(2, '0')}';
}

/// Formats a UTC instant at a fixed UTC offset (minutes).
String localTime(DateTime utc, int offsetMinutes, {String pattern = 'HH:mm:ss'}) =>
    DateFormat(pattern).format(utc.toUtc().add(Duration(minutes: offsetMinutes)));

/// Date pattern chosen in Preferences (display only). Set by the app root.
String dateDisplayPattern = 'dd MMM yyyy';

String localDate(DateTime utc, int offsetMinutes) => localTime(utc, offsetMinutes, pattern: dateDisplayPattern);

String localDateTime(DateTime utc, int offsetMinutes) => localTime(utc, offsetMinutes, pattern: '$dateDisplayPattern HH:mm');

/// Formats a `YYYY-MM-DD` civil date string with the chosen pattern (falls back to the input).
String civilDate(String isoDate) {
  final d = DateTime.tryParse(isoDate);
  return d == null ? isoDate : DateFormat(dateDisplayPattern).format(d);
}

/// Full display names for planet codes.
const planetNames = <String, String>{
  'SUN': 'Sun', 'MOON': 'Moon', 'MARS': 'Mars', 'MERCURY': 'Mercury', 'JUPITER': 'Jupiter',
  'VENUS': 'Venus', 'SATURN': 'Saturn', 'RAHU': 'Rahu', 'KETU': 'Ketu',
};

String planetName(String code) => planetNames[code] ?? titleCase(code);

/// Escapes one CSV field (RFC 4180).
String csvField(String v) => (v.contains(',') || v.contains('"') || v.contains('\n') || v.contains('\r')) ? '"${v.replaceAll('"', '""')}"' : v;

/// Builds CSV text from a header and rows.
String toCsv(List<String> header, List<List<String>> rows) =>
    [header, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n');

String fixed(double v, [int digits = 2]) => v.toStringAsFixed(digits);

// ---------------------------------------------------------------------------
// Calculation option labels (engine enum names from `engine.info` → `options`; labels only)
// ---------------------------------------------------------------------------

/// Descriptive ayanamsa labels for Preferences. Unknown values fall back to [titleCase].
const _ayanamsaLabels = <String, String>{
  'LAHIRI': 'Lahiri (true Chitrapaksha)',
  'RAMAN': 'Raman',
  'KP': 'KP New (Senthilathiban)',
  'KP_NEW': 'KP New (Senthilathiban)',
  'KRISHNAMURTI': 'KP – KSK original',
  'FAGAN_BRADLEY': 'Fagan–Bradley',
};

/// Short ayanamsa names for the status bar and summaries.
const _ayanamsaShort = <String, String>{
  'LAHIRI': 'Lahiri',
  'RAMAN': 'Raman',
  'KP': 'KP New',
  'KP_NEW': 'KP New',
  'KRISHNAMURTI': 'KP (KSK original)',
  'FAGAN_BRADLEY': 'Fagan–Bradley',
};

String ayanamsaLabel(String code) => _ayanamsaLabels[code] ?? titleCase(code);
String ayanamsaShort(String code) => _ayanamsaShort[code] ?? titleCase(code);

/// `MEAN_NODE` → `Mean node`, `TRUE_NODE` → `True node`.
String nodeLabel(String code) => switch (code) {
      'MEAN_NODE' => 'Mean node',
      'TRUE_NODE' => 'True node',
      _ => titleCase(code),
    };

/// `WHOLE_SIGN` → `Whole Sign`, `PLACIDUS` → `Placidus`.
String houseSystemLabel(String code) => titleCase(code);
