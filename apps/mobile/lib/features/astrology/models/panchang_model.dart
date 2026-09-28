/// Strongly typed models for Vedic Panchanga API responses

class TithiModel {
  final int index;
  final String name;
  final String paksha; // 'Shukla' or 'Krishna'
  final double completionPercentage;

  const TithiModel({
    required this.index,
    required this.name,
    required this.paksha,
    required this.completionPercentage,
  });

  factory TithiModel.fromJson(Map<String, dynamic> json) {
    return TithiModel(
      index: (json['index'] as num?)?.toInt() ?? 1,
      name: json['name'] as String? ?? 'Pratipada',
      paksha: json['paksha'] as String? ?? 'Shukla',
      completionPercentage: (json['completionPercentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class NakshatraPanchangModel {
  final int index;
  final String name;
  final String lord;
  final int pada;
  final double completionPercentage;

  const NakshatraPanchangModel({
    required this.index,
    required this.name,
    required this.lord,
    required this.pada,
    required this.completionPercentage,
  });

  factory NakshatraPanchangModel.fromJson(Map<String, dynamic> json) {
    return NakshatraPanchangModel(
      index: (json['index'] as num?)?.toInt() ?? 1,
      name: json['name'] as String? ?? 'Ashwini',
      lord: json['lord'] as String? ?? 'Ketu',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      completionPercentage: (json['completionPercentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class YogaPanchangModel {
  final int index;
  final String name;

  const YogaPanchangModel({
    required this.index,
    required this.name,
  });

  factory YogaPanchangModel.fromJson(Map<String, dynamic> json) {
    return YogaPanchangModel(
      index: (json['index'] as num?)?.toInt() ?? 1,
      name: json['name'] as String? ?? 'Vishkambha',
    );
  }
}

class KaranaPanchangModel {
  final int index;
  final String name;

  const KaranaPanchangModel({
    required this.index,
    required this.name,
  });

  factory KaranaPanchangModel.fromJson(Map<String, dynamic> json) {
    return KaranaPanchangModel(
      index: (json['index'] as num?)?.toInt() ?? 1,
      name: json['name'] as String? ?? 'Bava',
    );
  }
}

class PanchangModel {
  final TithiModel tithi;
  final String vara;
  final NakshatraPanchangModel nakshatra;
  final YogaPanchangModel yoga;
  final KaranaPanchangModel karana;
  final String? sunrise;
  final String? sunset;
  final String? rahuKalam;
  final String? gulikaKalam;
  final String? yamaganda;

  const PanchangModel({
    required this.tithi,
    required this.vara,
    required this.nakshatra,
    required this.yoga,
    required this.karana,
    this.sunrise,
    this.sunset,
    this.rahuKalam,
    this.gulikaKalam,
    this.yamaganda,
  });

  factory PanchangModel.fromJson(Map<String, dynamic> json) {
    final pData = (json['data'] is Map && (json['data'] as Map)['panchang'] is Map)
        ? (json['data'] as Map)['panchang'] as Map<String, dynamic>
        : (json['panchang'] is Map)
            ? json['panchang'] as Map<String, dynamic>
            : json;

    return PanchangModel(
      tithi: TithiModel.fromJson(pData['tithi'] is Map ? Map<String, dynamic>.from(pData['tithi']) : {}),
      vara: pData['vara'] as String? ?? 'Sunday',
      nakshatra: NakshatraPanchangModel.fromJson(pData['nakshatra'] is Map ? Map<String, dynamic>.from(pData['nakshatra']) : {}),
      yoga: YogaPanchangModel.fromJson(pData['yoga'] is Map ? Map<String, dynamic>.from(pData['yoga']) : {}),
      karana: KaranaPanchangModel.fromJson(pData['karana'] is Map ? Map<String, dynamic>.from(pData['karana']) : {}),
      sunrise: pData['sunrise'] as String?,
      sunset: pData['sunset'] as String?,
      rahuKalam: pData['rahuKalam'] as String? ?? pData['rahuKala'] as String?,
      gulikaKalam: pData['gulikaKalam'] as String? ?? pData['gulikaKala'] as String?,
      yamaganda: pData['yamaganda'] as String?,
    );
  }
}
