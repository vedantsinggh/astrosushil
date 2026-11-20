import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';

/// The single place where the app decides which timezone a date belongs to.
///
/// There are three kinds of date values and each is handled differently:
///
/// 1. **Server instants** (`createdAt`, `completedAt`, `paidAt`, message
///    timestamps...). The API sends them as UTC ISO-8601 strings ending in
///    `Z`. They are parsed with [parseInstant] and shown in the device's local
///    timezone ([toLocal] / [formatLocal]). Formatting a UTC `DateTime`
///    directly shows the UTC calendar day, which is the bug this class fixes
///    (an order at 04:22 IST on 20 Nov is 22:52 UTC on 19 Nov).
///
/// 2. **Calendar dates and civil times** that are not instants: birth date and
///    time (the birth place's local civil time, used for calculations),
///    consultation slot dates (IST), the rashi-bhavishya IST date. They are
///    parsed with [parseCalendarDate] and are never shifted to another
///    timezone. Calling `.toLocal()` / `.toUtc()` on them would move the day.
///
/// 3. **Business dates** (IST, `Asia/Kolkata`, UTC+05:30, no DST): which day
///    is "today" for consultation booking and the daily rashi-bhavishya. Use
///    [istToday] / [istDateKey].
class AppDateTime {
  AppDateTime._();

  /// India Standard Time offset (Asia/Kolkata has no DST).
  static const Duration istOffset = Duration(hours: 5, minutes: 30);

  static Duration? _debugLocalOffset;

  /// Test hook: when set, [toLocal] converts instants with this fixed offset
  /// instead of the host timezone, so tests can simulate a device in IST (or
  /// anywhere else) independently of the machine running them.
  @visibleForTesting
  static set debugLocalOffset(Duration? offset) => _debugLocalOffset = offset;

  @visibleForTesting
  static Duration? get debugLocalOffset => _debugLocalOffset;

  static final RegExp _ymd = RegExp(r'^(\d{4})-(\d{2})-(\d{2})');

  /// Parses a server timestamp and returns it in device-local time.
  ///
  /// The API serializes every instant as UTC ISO-8601 with a `Z` suffix. A
  /// string without a zone designator keeps Dart's meaning (device-local wall
  /// time), which is what older local caches wrote; new caches write UTC via
  /// [toJsonInstant]. Returns null for null, empty or unparseable input.
  static DateTime? parseInstant(Object? raw) {
    if (raw == null) return null;
    if (raw is DateTime) return toLocal(raw);
    final s = raw.toString().trim();
    if (s.isEmpty) return null;
    final parsed = DateTime.tryParse(s);
    return parsed == null ? null : toLocal(parsed);
  }

  /// Serializes an instant unambiguously (UTC with `Z`) for caches/requests.
  static String toJsonInstant(DateTime instant) => instant.toUtc().toIso8601String();

  /// Converts an instant to device-local wall-clock time. A non-UTC
  /// `DateTime` is assumed to be local already and is returned unchanged.
  static DateTime toLocal(DateTime instant) {
    if (!instant.isUtc) return instant;
    final override = _debugLocalOffset;
    if (override == null) return instant.toLocal();
    final shifted = instant.add(override);
    return DateTime(shifted.year, shifted.month, shifted.day, shifted.hour, shifted.minute, shifted.second,
        shifted.millisecond, shifted.microsecond);
  }

  /// Formats an instant in device-local time with an `intl` pattern.
  /// Returns [fallback] for null.
  static String formatLocal(DateTime? instant, String pattern, {String? locale, String fallback = ''}) {
    if (instant == null) return fallback;
    return DateFormat(pattern, locale).format(toLocal(instant));
  }

  /// Local calendar date of an instant as `d/M/yyyy` (orders, timeline).
  static String shortNumericDate(DateTime? instant) => formatLocal(instant, 'd/M/yyyy');

  /// Compact elapsed time ("5m ago", "3h ago", "2d ago"). Works on instants,
  /// so it is timezone-independent; a timestamp slightly in the future (clock
  /// skew between device and server) reads as "0m ago" rather than negative.
  static String timeAgo(DateTime instant, {DateTime? now}) {
    var diff = (now ?? DateTime.now()).toUtc().difference(instant.toUtc());
    if (diff.isNegative) diff = Duration.zero;
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  /// Parses the `yyyy-MM-dd` calendar date at the start of [raw] (any time or
  /// zone suffix is ignored) without any timezone conversion. Used for birth
  /// dates, appointment dates and IST business dates.
  static DateTime? parseCalendarDate(String? raw) {
    if (raw == null) return null;
    final m = _ymd.firstMatch(raw.trim());
    if (m == null) return null;
    final y = int.parse(m.group(1)!), mo = int.parse(m.group(2)!), d = int.parse(m.group(3)!);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    final date = DateTime(y, mo, d);
    // Reject overflowed dates such as 2026-02-31.
    if (date.month != mo || date.day != d) return null;
    return date;
  }

  /// Formats a calendar date string (see [parseCalendarDate]); returns the raw
  /// value when it is not a `yyyy-MM-dd` date.
  static String formatCalendarDate(String? raw, String pattern, {String? locale, String fallback = ''}) {
    if (raw == null || raw.trim().isEmpty) return fallback;
    final d = parseCalendarDate(raw);
    return d == null ? raw : DateFormat(pattern, locale).format(d);
  }

  /// Wall-clock time of an instant at a fixed UTC [offset], as a `DateTime`
  /// whose fields are that place's date and time (independent of the device
  /// timezone). Use it for place-specific times (panchang of a location).
  static DateTime atOffset(DateTime instant, Duration offset) {
    final s = instant.toUtc().add(offset);
    return DateTime(s.year, s.month, s.day, s.hour, s.minute, s.second, s.millisecond, s.microsecond);
  }

  /// IST wall-clock time of an instant (see [atOffset]).
  static DateTime toIstWallClock(DateTime instant) => atOffset(instant, istOffset);

  /// Today's IST calendar date (midnight, no time part).
  static DateTime istToday([DateTime? now]) {
    final ist = toIstWallClock(now ?? DateTime.now());
    return DateTime(ist.year, ist.month, ist.day);
  }

  /// `yyyy-MM-dd` key of a calendar date (no timezone conversion).
  static String dateKey(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  /// `yyyy-MM-dd` of the IST calendar day containing [now].
  static String istDateKey([DateTime? now]) => dateKey(istToday(now));

  /// [date] plus [days] calendar days (DST-safe, unlike adding a Duration).
  static DateTime addCalendarDays(DateTime date, int days) => DateTime(date.year, date.month, date.day + days);
}
