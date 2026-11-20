import 'package:intl/intl.dart';
import 'app_date_time.dart';

/// Formatting helpers for dates, times, and astrological output
class Formatters {
  Formatters._();

  static String formatDate(DateTime? date) {
    if (date == null) return 'N/A';
    return DateFormat('yyyy-MM-dd').format(date);
  }

  /// Formats a calendar date such as a birth date (`yyyy-MM-dd`). The value is
  /// the birth place's civil date and is never converted to another timezone.
  static String formatDisplayDate(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return 'N/A';
    return AppDateTime.formatCalendarDate(isoDate, 'MMM dd, yyyy');
  }

  static String formatCoordinate(double? val, bool isLatitude) {
    if (val == null) return 'N/A';
    final absVal = val.abs().toStringAsFixed(4);
    if (isLatitude) {
      return '$absVal° ${val >= 0 ? "N" : "S"}';
    } else {
      return '$absVal° ${val >= 0 ? "E" : "W"}';
    }
  }

  static String formatDegree(double? degree) {
    if (degree == null) return 'N/A';
    final deg = degree.floor();
    final minutesDouble = (degree - deg) * 60;
    final min = minutesDouble.floor();
    return '$deg° $min′';
  }
}
