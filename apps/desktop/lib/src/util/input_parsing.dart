/// Forgiving parsers for typed dates and times (input handling only; no astrology).
library;

const minYear = 1800;
const maxYear = 2200;

const _months = {
  'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3, 'apr': 4, 'april': 4, 'may': 5,
  'jun': 6, 'june': 6, 'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'sept': 9, 'september': 9,
  'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12,
};

/// Outcome of parsing user input: a canonical value or a plain-language error.
class Parsed {
  const Parsed.ok(this.value) : error = null;
  const Parsed.error(this.error) : value = null;
  final String? value;
  final String? error;
  bool get isOk => value != null;
}

String _p2(int n) => n.toString().padLeft(2, '0');

Parsed _ymd(int y, int m, int d) {
  if (y < minYear || y > maxYear) return const Parsed.error('Please enter a year between $minYear and $maxYear.');
  if (m < 1 || m > 12) return const Parsed.error('The month must be between 1 and 12.');
  final dt = DateTime.utc(y, m, d);
  if (d < 1 || dt.month != m || dt.day != d) return const Parsed.error("This date doesn't exist. Please check the day and month.");
  return Parsed.ok('${y.toString().padLeft(4, '0')}-${_p2(m)}-${_p2(d)}');
}

/// Accepts `1990-05-15`, `15-05-1990`, `15/05/1990`, `15.5.1990`, `15 May 1990`, `May 15, 1990`.
/// Numeric day/month order is day-first (as written in India and Europe) unless the first number
/// cannot be a day-month pair that way (e.g. `05/31/1990`). Returns `YYYY-MM-DD`.
Parsed parseDateInput(String? input) {
  final s = (input ?? '').trim().toLowerCase();
  if (s.isEmpty) return const Parsed.error('Please enter the date, for example 15-05-1990 or 15 May 1990.');
  const unreadable = Parsed.error("We couldn't read this date. Try 15-05-1990 or 15 May 1990.");

  final iso = RegExp(r'^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$').firstMatch(s);
  if (iso != null) return _ymd(int.parse(iso[1]!), int.parse(iso[2]!), int.parse(iso[3]!));

  final num = RegExp(r'^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})$').firstMatch(s);
  if (num != null) {
    if (num[3]!.length != 4) return const Parsed.error('Please write the year with four digits, for example 1990.');
    final a = int.parse(num[1]!), b = int.parse(num[2]!), y = int.parse(num[3]!);
    if (a > 12 || b <= 12) return _ymd(y, b, a); // day first
    return _ymd(y, a, b); // month first (second number cannot be a month)
  }

  final words = s.replaceAll(',', ' ').replaceAllMapped(RegExp(r'(\d)(st|nd|rd|th)\b'), (m) => m[1]!).split(RegExp(r'[\s\-/.]+')).where((w) => w.isNotEmpty).toList();
  if (words.length == 3) {
    int? month, day, year;
    for (final w in words) {
      final m = _months[w];
      if (m != null) {
        month = m;
      } else if (RegExp(r'^\d{4}$').hasMatch(w)) {
        year = int.parse(w);
      } else if (RegExp(r'^\d{1,2}$').hasMatch(w)) {
        day = int.parse(w);
      }
    }
    if (month != null && day != null && year != null) return _ymd(year, month, day);
    if (month != null && day != null && year == null) return const Parsed.error('Please write the year with four digits, for example 1990.');
  }
  return unreadable;
}

/// Accepts `14:30`, `14:30:15`, `14.30`, `1430`, `2:30 pm`, `2pm`, `12 am`. Returns `HH:mm:ss`.
Parsed parseTimeInput(String? input) {
  final s = (input ?? '').trim().toLowerCase().replaceAll(' ', '');
  if (s.isEmpty) return const Parsed.error('Please enter the time, for example 14:30 or 2:30 pm. If it is not known, use 12:00.');
  const unreadable = Parsed.error("We couldn't read this time. Try 14:30 or 2:30 pm.");
  final m = RegExp(r'^(\d{1,2})(?:[:.h](\d{1,2}))?(?:[:.m](\d{1,2}))?s?(am|pm|a\.m\.|p\.m\.)?$').firstMatch(s);
  int h, mi = 0, sec = 0;
  String? ampm;
  if (m != null) {
    h = int.parse(m[1]!);
    mi = m[2] == null ? 0 : int.parse(m[2]!);
    sec = m[3] == null ? 0 : int.parse(m[3]!);
    ampm = m[4];
  } else {
    final compact = RegExp(r'^(\d{3,4})(am|pm)?$').firstMatch(s);
    if (compact == null) return unreadable;
    final digits = compact[1]!;
    h = int.parse(digits.substring(0, digits.length - 2));
    mi = int.parse(digits.substring(digits.length - 2));
    ampm = compact[2];
  }
  if (ampm != null) {
    if (h < 1 || h > 12) return const Parsed.error('With am/pm the hour must be between 1 and 12.');
    final pm = ampm.startsWith('p');
    h = (h % 12) + (pm ? 12 : 0);
  }
  if (h > 23) return const Parsed.error('The hour must be between 0 and 23 (or use am/pm).');
  if (mi > 59) return const Parsed.error('The minutes must be between 0 and 59.');
  if (sec > 59) return const Parsed.error('The seconds must be between 0 and 59.');
  return Parsed.ok('${_p2(h)}:${_p2(mi)}:${_p2(sec)}');
}

/// Accepts decimal degrees (`28.6139`, `-77.2`) or degrees with a hemisphere letter (`28.61 N`,
/// `77.2E`, `28°36'50" N`). Returns decimal degrees (+N/+E), or null.
double? parseCoordinate(String? input, {required bool latitude}) {
  final s = (input ?? '').trim().toUpperCase();
  if (s.isEmpty) return null;
  final hemi = RegExp(r'([NSEW])\s*$').firstMatch(s)?.group(1);
  if (hemi != null && (latitude ? !'NS'.contains(hemi) : !'EW'.contains(hemi))) return null;
  final body = s.replaceAll(RegExp(r'[NSEW]\s*$'), '').trim();
  double? v;
  final dmsMatch = RegExp(r'''^(-?\d+(?:\.\d+)?)\s*[°\s]\s*(\d+(?:\.\d+)?)?\s*['′]?\s*(\d+(?:\.\d+)?)?\s*["″]?$''').firstMatch(body);
  if (double.tryParse(body) != null) {
    v = double.parse(body);
  } else if (dmsMatch != null) {
    final d = double.parse(dmsMatch[1]!);
    final m = double.tryParse(dmsMatch[2] ?? '') ?? 0;
    final sec = double.tryParse(dmsMatch[3] ?? '') ?? 0;
    if (m >= 60 || sec >= 60) return null;
    v = d.abs() + m / 60 + sec / 3600;
    if (d < 0) v = -v;
  }
  if (v == null) return null;
  if (hemi == 'S' || hemi == 'W') v = -v.abs();
  final limit = latitude ? 90 : 180;
  return v.abs() > limit ? null : v;
}
