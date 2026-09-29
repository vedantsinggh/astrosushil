/// Strongly typed models for Gochara (Planetary Transits) API responses
/// Compliant with packages/astrology-engine deterministic Transit Calculator.
library;

class TransitPlanetPositionModel {
  final String planet;
  final double longitude;
  final double latitude;
  final double speedLongitude;
  final bool isRetrograde;
  final bool isCombust;
  final int rashiIndex;
  final String rashiName;
  final String rashiLord;
  final double degreeInRashi;
  final int house;
  final int nakshatraIndex;
  final String nakshatraName;
  final String nakshatraLord;
  final int pada;
  final double degreeInNakshatra;

  const TransitPlanetPositionModel({
    required this.planet,
    required this.longitude,
    required this.latitude,
    required this.speedLongitude,
    required this.isRetrograde,
    required this.isCombust,
    required this.rashiIndex,
    required this.rashiName,
    required this.rashiLord,
    required this.degreeInRashi,
    required this.house,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.nakshatraLord,
    required this.pada,
    required this.degreeInNakshatra,
  });

  factory TransitPlanetPositionModel.fromJson(Map<String, dynamic> json) {
    return TransitPlanetPositionModel(
      planet: json['planet'] as String? ?? '',
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      speedLongitude: (json['speedLongitude'] as num?)?.toDouble() ?? 0.0,
      isRetrograde: json['isRetrograde'] as bool? ?? false,
      isCombust: json['isCombust'] as bool? ?? false,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      rashiLord: json['rashiLord'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      house: (json['house'] as num?)?.toInt() ?? 1,
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      nakshatraLord: json['nakshatraLord'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      degreeInNakshatra: (json['degreeInNakshatra'] as num?)?.toDouble() ?? 0.0,
    );
  }

  String get formattedDegree {
    final deg = degreeInRashi.floor();
    final min = ((degreeInRashi - deg) * 60).round();
    return '$deg° $min′';
  }
}

class TransitToMoonRelationshipModel {
  final String transitPlanet;
  final int transitSignIndex;
  final String transitSignName;
  final int natalMoonSignIndex;
  final String natalMoonSignName;
  final int signDistance;
  final int houseFromMoon;
  final String transitNakshatra;
  final int? bavScore;

  const TransitToMoonRelationshipModel({
    required this.transitPlanet,
    required this.transitSignIndex,
    required this.transitSignName,
    required this.natalMoonSignIndex,
    required this.natalMoonSignName,
    required this.signDistance,
    required this.houseFromMoon,
    required this.transitNakshatra,
    this.bavScore,
  });

  factory TransitToMoonRelationshipModel.fromJson(Map<String, dynamic> json) {
    return TransitToMoonRelationshipModel(
      transitPlanet: json['transitPlanet'] as String? ?? '',
      transitSignIndex: (json['transitSignIndex'] as num?)?.toInt() ?? 1,
      transitSignName: json['transitSignName'] as String? ?? '',
      natalMoonSignIndex: (json['natalMoonSignIndex'] as num?)?.toInt() ?? 1,
      natalMoonSignName: json['natalMoonSignName'] as String? ?? '',
      signDistance: (json['signDistance'] as num?)?.toInt() ?? 1,
      houseFromMoon: (json['houseFromMoon'] as num?)?.toInt() ?? 1,
      transitNakshatra: json['transitNakshatra'] as String? ?? '',
      bavScore: (json['bavScore'] as num?)?.toInt(),
    );
  }
}

class TransitToLagnaRelationshipModel {
  final String transitPlanet;
  final int transitSignIndex;
  final String transitSignName;
  final int natalLagnaSignIndex;
  final String natalLagnaSignName;
  final int signDistance;
  final int houseFromLagna;
  final double angularSeparation;

  const TransitToLagnaRelationshipModel({
    required this.transitPlanet,
    required this.transitSignIndex,
    required this.transitSignName,
    required this.natalLagnaSignIndex,
    required this.natalLagnaSignName,
    required this.signDistance,
    required this.houseFromLagna,
    required this.angularSeparation,
  });

  factory TransitToLagnaRelationshipModel.fromJson(Map<String, dynamic> json) {
    return TransitToLagnaRelationshipModel(
      transitPlanet: json['transitPlanet'] as String? ?? '',
      transitSignIndex: (json['transitSignIndex'] as num?)?.toInt() ?? 1,
      transitSignName: json['transitSignName'] as String? ?? '',
      natalLagnaSignIndex: (json['natalLagnaSignIndex'] as num?)?.toInt() ?? 1,
      natalLagnaSignName: json['natalLagnaSignName'] as String? ?? '',
      signDistance: (json['signDistance'] as num?)?.toInt() ?? 1,
      houseFromLagna: (json['houseFromLagna'] as num?)?.toInt() ?? 1,
      angularSeparation: (json['angularSeparation'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class TransitToNatalPlanetRelationshipModel {
  final String transitPlanet;
  final String natalPlanet;
  final double transitLongitude;
  final double natalLongitude;
  final double angularSeparation;
  final int signDistance;
  final int houseDistance;
  final String relationship;

  const TransitToNatalPlanetRelationshipModel({
    required this.transitPlanet,
    required this.natalPlanet,
    required this.transitLongitude,
    required this.natalLongitude,
    required this.angularSeparation,
    required this.signDistance,
    required this.houseDistance,
    required this.relationship,
  });

  factory TransitToNatalPlanetRelationshipModel.fromJson(Map<String, dynamic> json) {
    return TransitToNatalPlanetRelationshipModel(
      transitPlanet: json['transitPlanet'] as String? ?? '',
      natalPlanet: json['natalPlanet'] as String? ?? '',
      transitLongitude: (json['transitLongitude'] as num?)?.toDouble() ?? 0.0,
      natalLongitude: (json['natalLongitude'] as num?)?.toDouble() ?? 0.0,
      angularSeparation: (json['angularSeparation'] as num?)?.toDouble() ?? 0.0,
      signDistance: (json['signDistance'] as num?)?.toInt() ?? 1,
      houseDistance: (json['houseDistance'] as num?)?.toInt() ?? 1,
      relationship: json['relationship'] as String? ?? '',
    );
  }
}

class TransitAshtakavargaDetailModel {
  final String planet;
  final int transitSignIndex;
  final String transitSignName;
  final int bavPoints;
  final int savPoints;
  final bool isBavFavorable;
  final bool isSavFavorable;

  const TransitAshtakavargaDetailModel({
    required this.planet,
    required this.transitSignIndex,
    required this.transitSignName,
    required this.bavPoints,
    required this.savPoints,
    required this.isBavFavorable,
    required this.isSavFavorable,
  });

  factory TransitAshtakavargaDetailModel.fromJson(Map<String, dynamic> json) {
    return TransitAshtakavargaDetailModel(
      planet: json['planet'] as String? ?? '',
      transitSignIndex: (json['transitSignIndex'] as num?)?.toInt() ?? 1,
      transitSignName: json['transitSignName'] as String? ?? '',
      bavPoints: (json['bavPoints'] as num?)?.toInt() ?? 0,
      savPoints: (json['savPoints'] as num?)?.toInt() ?? 0,
      isBavFavorable: json['isBavFavorable'] as bool? ?? false,
      isSavFavorable: json['isSavFavorable'] as bool? ?? false,
    );
  }
}

class GocharaKakshaDetailModel {
  final String transitPlanet;
  final int transitSignIndex;
  final String transitSignName;
  final double degreeInSign;
  final int kakshaIndex;
  final String kakshaRuler;
  final double startDegree;
  final double endDegree;
  final bool hasNatalBindu;
  final String description;

  const GocharaKakshaDetailModel({
    required this.transitPlanet,
    required this.transitSignIndex,
    required this.transitSignName,
    required this.degreeInSign,
    required this.kakshaIndex,
    required this.kakshaRuler,
    required this.startDegree,
    required this.endDegree,
    required this.hasNatalBindu,
    required this.description,
  });

  factory GocharaKakshaDetailModel.fromJson(Map<String, dynamic> json) {
    return GocharaKakshaDetailModel(
      transitPlanet: json['transitPlanet'] as String? ?? '',
      transitSignIndex: (json['transitSignIndex'] as num?)?.toInt() ?? 1,
      transitSignName: json['transitSignName'] as String? ?? '',
      degreeInSign: (json['degreeInSign'] as num?)?.toDouble() ?? 0.0,
      kakshaIndex: (json['kakshaIndex'] as num?)?.toInt() ?? 1,
      kakshaRuler: json['kakshaRuler'] as String? ?? '',
      startDegree: (json['startDegree'] as num?)?.toDouble() ?? 0.0,
      endDegree: (json['endDegree'] as num?)?.toDouble() ?? 0.0,
      hasNatalBindu: json['hasNatalBindu'] as bool? ?? false,
      description: json['description'] as String? ?? '',
    );
  }
}

class TransitSnapshotModel {
  final String calculationVersion;
  final String utcIso;
  final String localIso;
  final String timezone;
  final Map<String, TransitPlanetPositionModel> planets;
  final List<TransitToMoonRelationshipModel> transitToMoon;
  final List<TransitToLagnaRelationshipModel> transitToLagna;
  final List<TransitToNatalPlanetRelationshipModel> transitToNatalPlanets;
  final List<TransitAshtakavargaDetailModel> ashtakavargaTransit;
  final List<GocharaKakshaDetailModel> gocharaKakshas;

  const TransitSnapshotModel({
    required this.calculationVersion,
    required this.utcIso,
    required this.localIso,
    required this.timezone,
    required this.planets,
    this.transitToMoon = const [],
    this.transitToLagna = const [],
    this.transitToNatalPlanets = const [],
    this.ashtakavargaTransit = const [],
    this.gocharaKakshas = const [],
  });

  factory TransitSnapshotModel.fromJson(Map<String, dynamic> json) {
    final chart = json['transitChart'] as Map<String, dynamic>? ?? {};
    final transitTime = chart['transitTime'] as Map<String, dynamic>? ?? {};
    final rawPlanets = chart['planets'] as Map<String, dynamic>? ?? {};

    final planetsMap = <String, TransitPlanetPositionModel>{};
    rawPlanets.forEach((key, val) {
      if (val is Map<String, dynamic>) {
        planetsMap[key] = TransitPlanetPositionModel.fromJson(val);
      }
    });

    final moonRel = (json['transitToMoon'] as List? ?? [])
        .whereType<Map>()
        .map((m) => TransitToMoonRelationshipModel.fromJson(Map<String, dynamic>.from(m)))
        .toList();

    final lagnaRel = (json['transitToLagna'] as List? ?? [])
        .whereType<Map>()
        .map((m) => TransitToLagnaRelationshipModel.fromJson(Map<String, dynamic>.from(m)))
        .toList();

    final natalPlanetsRel = (json['transitToNatalPlanets'] as List? ?? [])
        .whereType<Map>()
        .map((m) => TransitToNatalPlanetRelationshipModel.fromJson(Map<String, dynamic>.from(m)))
        .toList();

    final avTransit = (json['ashtakavargaTransit'] as List? ?? [])
        .whereType<Map>()
        .map((m) => TransitAshtakavargaDetailModel.fromJson(Map<String, dynamic>.from(m)))
        .toList();

    final kakshas = (json['gocharaKakshas'] as List? ?? [])
        .whereType<Map>()
        .map((m) => GocharaKakshaDetailModel.fromJson(Map<String, dynamic>.from(m)))
        .toList();

    return TransitSnapshotModel(
      calculationVersion: json['calculationVersion'] as String? ?? '1.0.0',
      utcIso: transitTime['utcIso'] as String? ?? '',
      localIso: transitTime['localIso'] as String? ?? '',
      timezone: transitTime['timezone'] as String? ?? 'UTC',
      planets: planetsMap,
      transitToMoon: moonRel,
      transitToLagna: lagnaRel,
      transitToNatalPlanets: natalPlanetsRel,
      ashtakavargaTransit: avTransit,
      gocharaKakshas: kakshas,
    );
  }

  /// Ordered classical planets for Gochara overview
  List<TransitPlanetPositionModel> get orderedPlanets {
    const order = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];
    final list = <TransitPlanetPositionModel>[];
    for (final p in order) {
      if (planets.containsKey(p)) {
        list.add(planets[p]!);
      }
    }
    return list;
  }

  TransitToMoonRelationshipModel? getMoonRelationship(String planet) {
    try {
      return transitToMoon.firstWhere((m) => m.transitPlanet.toUpperCase() == planet.toUpperCase());
    } catch (_) {
      return null;
    }
  }

  TransitToLagnaRelationshipModel? getLagnaRelationship(String planet) {
    try {
      return transitToLagna.firstWhere((l) => l.transitPlanet.toUpperCase() == planet.toUpperCase());
    } catch (_) {
      return null;
    }
  }

  TransitAshtakavargaDetailModel? getAshtakavargaDetail(String planet) {
    try {
      return ashtakavargaTransit.firstWhere((a) => a.planet.toUpperCase() == planet.toUpperCase());
    } catch (_) {
      return null;
    }
  }

  GocharaKakshaDetailModel? getKakshaDetail(String planet) {
    try {
      return gocharaKakshas.firstWhere((k) => k.transitPlanet.toUpperCase() == planet.toUpperCase());
    } catch (_) {
      return null;
    }
  }
}
