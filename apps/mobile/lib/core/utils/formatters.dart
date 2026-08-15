import 'package:intl/intl.dart';

/// Formatting helpers for dates, times, and astrological output
class Formatters {
  Formatters._();

  static String formatDate(DateTime? date) {
    if (date == null) return 'N/A';
    return DateFormat('yyyy-MM-dd').format(date);
  }

  static String formatDisplayDate(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return 'N/A';
    try {
      final date = DateTime.parse(isoDate);
      return DateFormat('MMM dd, yyyy').format(date);
    } catch (_) {
      return isoDate;
    }
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
