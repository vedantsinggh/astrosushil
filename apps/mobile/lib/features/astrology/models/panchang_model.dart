import 'package:intl/intl.dart';

/// Strongly typed models for Vedic Panchanga (Five Limbs of Time) API responses
/// Compliant with packages/astrology-engine deterministic calculations.

class TithiModel {
  final int index;
  final String name;
  final String paksha; // 'SUKLA' or 'KRISHNA'
  final double degreeInTithi;
  final double completionPercentage;
  final String? startIso;
  final String? endIso;

  const TithiModel({
    required this.index,
    required this.name,
    required this.paksha,
    required this.degreeInTithi,
    required this.completionPercentage,
    this.startIso,
    this.endIso,
  });

  factory TithiModel.fromJson(Map<String, dynamic> json) {
    return TithiModel(
      index: (json['index'] as num?)?.toInt() ?? 1,
      name: json['name'] as String? ?? 'Pratipada',
      paksha: json['paksha'] as String? ?? 'SUKLA',
      degreeInTithi: (json['degreeInTithi'] as num?)?.toDouble() ?? 0.0,
      completionPercentage: (json['completionPercentage'] as num?)?.toDouble() ?? 0.0,
      startIso: json['startIso'] as String?,
      endIso: json['endIso'] as String?,
    );
  }

  String get formattedPaksha {
    final upper = paksha.toUpperCase();
    if (upper == 'SUKLA' || upper == 'SHUKLA') return 'Shukla Paksha (Waxing)';
    if (upper == 'KRISHNA') return 'Krishna Paksha (Waning)';
    return paksha;
  }

  bool get isShukla => paksha.toUpperCase() == 'SUKLA' || paksha.toUpperCase() == 'SHUKLA';
}

class VaraModel {
  final int dayIndex; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  final String name;
  final String lord;

  const VaraModel({
    required this.dayIndex,
    required this.name,
    required this.lord,
  });

  factory VaraModel.fromJson(Map<String, dynamic> json) {
    return VaraModel(
      dayIndex: (json['dayIndex'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? 'Ravivara',
      lord: json['lord'] as String? ?? 'SUN',
    );
  }

  String get englishDayName {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (dayIndex >= 0 && dayIndex < days.length) return days[dayIndex];
    return 'Sunday';
  }
}

class NakshatraPanchangModel {
  final int index;
  final String name;
  final String lord;
  final int pada;
  final String? startIso;
  final String? endIso;

  const NakshatraPanchangModel({
    required this.index,
    required this.name,
    required this.lord,
    required this.pada,
    this.startIso,
    this.endIso,
  });

  factory NakshatraPanchangModel.fromJson(Map<String, dynamic> json) {
    return NakshatraPanchangModel(
      index: (json['index'] as num?)?.toInt() ?? 1,
      name: json['name'] as String? ?? 'Ashwini',
      lord: json['lord'] as String? ?? 'Ketu',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      startIso: json['startIso'] as String?,
      endIso: json['endIso'] as String?,
    );
  }
}

class YogaPanchangModel {
  final int index;
  final String name;
  final double completionPercentage;
  final String? startIso;
  final String? endIso;

  const YogaPanchangModel({
    required this.index,
    required this.name,
    this.completionPercentage = 0.0,
    this.startIso,
    this.endIso,
  });

  factory YogaPanchangModel.fromJson(Map<String, dynamic> json) {
    return YogaPanchangModel(
      index: (json['index'] as num?)?.toInt() ?? 1,
      name: json['name'] as String? ?? 'Vishkambha',
      completionPercentage: (json['completionPercentage'] as num?)?.toDouble() ?? 0.0,
      startIso: json['startIso'] as String?,
      endIso: json['endIso'] as String?,
    );
  }
}

class KaranaModel {
  final int index;
  final String name;
  final String type; // 'MOVABLE' or 'FIXED'
  final String? startIso;
  final String? endIso;

  const KaranaModel({
    required this.index,
    required this.name,
    required this.type,
    this.startIso,
    this.endIso,
  });

  factory KaranaModel.fromJson(Map<String, dynamic> json) {
    return KaranaModel(
      index: (json['index'] as num?)?.toInt() ?? 1,
      name: json['name'] as String? ?? 'Bava',
      type: json['type'] as String? ?? 'MOVABLE',
      startIso: json['startIso'] as String?,
      endIso: json['endIso'] as String?,
    );
  }
}

class SunriseSunsetModel {
  final String sunriseIso;
  final String sunsetIso;
  final int dayLengthMinutes;

  const SunriseSunsetModel({
    required this.sunriseIso,
    required this.sunsetIso,
    required this.dayLengthMinutes,
  });

  factory SunriseSunsetModel.fromJson(Map<String, dynamic> json) {
    return SunriseSunsetModel(
      sunriseIso: json['sunriseIso'] as String? ?? '',
      sunsetIso: json['sunsetIso'] as String? ?? '',
      dayLengthMinutes: (json['dayLengthMinutes'] as num?)?.toInt() ?? 720,
    );
  }

  String get formattedSunrise {
    if (sunriseIso.isEmpty) return '06:00 AM';
    try {
      final dt = DateTime.parse(sunriseIso).toLocal();
      return DateFormat('hh:mm a').format(dt);
    } catch (_) {
      return sunriseIso;
    }
  }

  String get formattedSunset {
    if (sunsetIso.isEmpty) return '06:30 PM';
    try {
      final dt = DateTime.parse(sunsetIso).toLocal();
      return DateFormat('hh:mm a').format(dt);
    } catch (_) {
      return sunsetIso;
    }
  }

  String get formattedDayLength {
    final hours = dayLengthMinutes ~/ 60;
    final mins = dayLengthMinutes % 60;
    return '${hours}h ${mins}m';
  }
}

class RahuKalaModel {
  final String startIso;
  final String endIso;
  final int segmentIndex;
  final int totalSegments;

  const RahuKalaModel({
    required this.startIso,
    required this.endIso,
    required this.segmentIndex,
    required this.totalSegments,
  });

  factory RahuKalaModel.fromJson(Map<String, dynamic> json) {
    return RahuKalaModel(
      startIso: json['startIso'] as String? ?? '',
      endIso: json['endIso'] as String? ?? '',
      segmentIndex: (json['segmentIndex'] as num?)?.toInt() ?? 1,
      totalSegments: (json['totalSegments'] as num?)?.toInt() ?? 8,
    );
  }

  String get formattedWindow {
    if (startIso.isEmpty || endIso.isEmpty) return 'N/A';
    try {
      final start = DateTime.parse(startIso).toLocal();
      final end = DateTime.parse(endIso).toLocal();
      final fmt = DateFormat('hh:mm a');
      return '${fmt.format(start)} – ${fmt.format(end)}';
    } catch (_) {
      return '$startIso – $endIso';
    }
  }
}

class HinduCalendarModel {
  final String amantaMasa;
  final String purnimantaMasa;
  final String paksha;
  final int tithiIndex;
  final String tithiName;
  final String solarRashi;
  final int solarRashiIndex;
  final bool isAdhika;

  const HinduCalendarModel({
    required this.amantaMasa,
    required this.purnimantaMasa,
    required this.paksha,
    required this.tithiIndex,
    required this.tithiName,
    required this.solarRashi,
    required this.solarRashiIndex,
    required this.isAdhika,
  });

  factory HinduCalendarModel.fromJson(Map<String, dynamic> json) {
    return HinduCalendarModel(
      amantaMasa: json['amantaMasa'] as String? ?? 'Chaitra',
      purnimantaMasa: json['purnimantaMasa'] as String? ?? 'Chaitra',
      paksha: json['paksha'] as String? ?? 'SUKLA',
      tithiIndex: (json['tithiIndex'] as num?)?.toInt() ?? 1,
      tithiName: json['tithiName'] as String? ?? 'Pratipada',
      solarRashi: json['solarRashi'] as String? ?? 'Mesha',
      solarRashiIndex: (json['solarRashiIndex'] as num?)?.toInt() ?? 1,
      isAdhika: json['isAdhika'] as bool? ?? false,
    );
  }
}

class PanchangTransitionModel {
  final String type;
  final String name;
  final String timestampIso;
  final String? fromName;
  final String? toName;

  const PanchangTransitionModel({
    required this.type,
    required this.name,
    required this.timestampIso,
    this.fromName,
    this.toName,
  });

  factory PanchangTransitionModel.fromJson(Map<String, dynamic> json) {
    return PanchangTransitionModel(
      type: json['type'] as String? ?? '',
      name: json['name'] as String? ?? '',
      timestampIso: json['timestampIso'] as String? ?? '',
      fromName: json['fromName'] as String?,
      toName: json['toName'] as String?,
    );
  }

  String get formattedTime {
    if (timestampIso.isEmpty) return '';
    try {
      final dt = DateTime.parse(timestampIso).toLocal();
      return DateFormat('hh:mm a').format(dt);
    } catch (_) {
      return timestampIso;
    }
  }
}

class PanchangModel {
  final String date;
  final double latitude;
  final double longitude;
  final String timezone;
  final TithiModel tithi;
  final VaraModel vara;
  final NakshatraPanchangModel nakshatra;
  final YogaPanchangModel yoga;
  final KaranaModel karana;
  final SunriseSunsetModel? sunriseSunset;
  final RahuKalaModel? rahuKala;
  final HinduCalendarModel? hinduCalendar;
  final List<PanchangTransitionModel> transitions;

  const PanchangModel({
    required this.date,
    required this.latitude,
    required this.longitude,
    required this.timezone,
    required this.tithi,
    required this.vara,
    required this.nakshatra,
    required this.yoga,
    required this.karana,
    this.sunriseSunset,
    this.rahuKala,
    this.hinduCalendar,
    this.transitions = const [],
  });

  factory PanchangModel.fromJson(Map<String, dynamic> json) {
    final root = json['data'] is Map<String, dynamic>
        ? json['data'] as Map<String, dynamic>
        : json;

    final inst = (root['instantaneous'] is Map<String, dynamic>)
        ? root['instantaneous'] as Map<String, dynamic>
        : (root['panchang'] is Map<String, dynamic>)
            ? root['panchang'] as Map<String, dynamic>
            : root;

    final loc = root['location'] is Map<String, dynamic>
        ? root['location'] as Map<String, dynamic>
        : <String, dynamic>{};

    final sunData = root['sun'] is Map<String, dynamic>
        ? root['sun'] as Map<String, dynamic>
        : inst['sunriseSunset'] is Map<String, dynamic>
            ? inst['sunriseSunset'] as Map<String, dynamic>
            : null;

    final rahuData = root['rahuKala'] is Map<String, dynamic>
        ? root['rahuKala'] as Map<String, dynamic>
        : inst['rahuKala'] is Map<String, dynamic>
            ? inst['rahuKala'] as Map<String, dynamic>
            : null;

    final hinduData = root['hinduCalendar'] is Map<String, dynamic>
        ? root['hinduCalendar'] as Map<String, dynamic>
        : inst['hinduCalendar'] is Map<String, dynamic>
            ? inst['hinduCalendar'] as Map<String, dynamic>
            : null;

    final rawTransitions = root['transitions'] as List? ?? [];

    return PanchangModel(
      date: root['date'] as String? ?? DateFormat('yyyy-MM-dd').format(DateTime.now()),
      latitude: (loc['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (loc['longitude'] as num?)?.toDouble() ?? 0.0,
      timezone: loc['timezone'] as String? ?? 'UTC',
      tithi: TithiModel.fromJson(inst['tithi'] is Map ? Map<String, dynamic>.from(inst['tithi']) : {}),
      vara: inst['vara'] is Map
          ? VaraModel.fromJson(Map<String, dynamic>.from(inst['vara']))
          : VaraModel(dayIndex: 0, name: inst['vara']?.toString() ?? 'Ravivara', lord: 'SUN'),
      nakshatra: NakshatraPanchangModel.fromJson(inst['nakshatra'] is Map ? Map<String, dynamic>.from(inst['nakshatra']) : {}),
      yoga: YogaPanchangModel.fromJson(inst['yoga'] is Map ? Map<String, dynamic>.from(inst['yoga']) : {}),
      karana: KaranaModel.fromJson(inst['karana'] is Map ? Map<String, dynamic>.from(inst['karana']) : {}),
      sunriseSunset: sunData != null ? SunriseSunsetModel.fromJson(sunData) : null,
      rahuKala: rahuData != null ? RahuKalaModel.fromJson(rahuData) : null,
      hinduCalendar: hinduData != null ? HinduCalendarModel.fromJson(hinduData) : null,
      transitions: rawTransitions
          .whereType<Map>()
          .map((t) => PanchangTransitionModel.fromJson(Map<String, dynamic>.from(t)))
          .toList(),
    );
  }
}
