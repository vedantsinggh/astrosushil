/// Strongly typed domain models for KP (Krishnamurti Padhdhati) Astrology.
/// Evaluated deterministically via Fastify backend POST /api/v1/astrology/kp.
class KPReportModel {
  final String ayanamsaType;
  final double ayanamsaValue;
  final List<KPCuspPlacementModel> cusps;
  final List<KPPointPlacementModel> planets;
  final List<KPHouseSignificatorsModel> houseSignificators;
  final Map<String, List<int>> planetSignifications;
  final KPRulingPlanetsModel rulingPlanets;
  final KPPointPlacementModel? parsFortuna;

  const KPReportModel({
    required this.ayanamsaType,
    required this.ayanamsaValue,
    required this.cusps,
    required this.planets,
    required this.houseSignificators,
    required this.planetSignifications,
    required this.rulingPlanets,
    this.parsFortuna,
  });

  factory KPReportModel.fromJson(Map<String, dynamic> json) {
    final root = json['data'] is Map
        ? Map<String, dynamic>.from(json['data'] as Map)
        : json;

    List<KPPointPlacementModel> parsedPlanets = [];
    if (root['planets'] is List) {
      parsedPlanets = (root['planets'] as List)
          .whereType<Map>()
          .map((e) => KPPointPlacementModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } else if (root['planets'] is Map) {
      parsedPlanets = (root['planets'] as Map)
          .values
          .whereType<Map>()
          .map((e) => KPPointPlacementModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    final rawSignifications = root['planetSignifications'] as Map? ?? {};
    final parsedSignifications = <String, List<int>>{};
    rawSignifications.forEach((key, value) {
      if (value is List) {
        parsedSignifications[key.toString()] =
            value.map((e) => (e as num).toInt()).toList();
      }
    });

    final rawSignificators = root['houseSignificators'] ?? root['significators'];
    final parsedSignificators = (rawSignificators as List? ?? [])
        .whereType<Map>()
        .map((e) => KPHouseSignificatorsModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();

    return KPReportModel(
      ayanamsaType: root['ayanamsaType'] as String? ?? root['ayanamsa'] as String? ?? 'KRISHNAMURTI',
      ayanamsaValue: (root['ayanamsaValue'] as num?)?.toDouble() ?? 0.0,
      cusps: (root['cusps'] as List? ?? [])
          .whereType<Map>()
          .map((e) => KPCuspPlacementModel.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      planets: parsedPlanets,
      houseSignificators: parsedSignificators,
      planetSignifications: parsedSignifications,
      rulingPlanets: root['rulingPlanets'] is Map
          ? KPRulingPlanetsModel.fromJson(Map<String, dynamic>.from(root['rulingPlanets'] as Map))
          : const KPRulingPlanetsModel.empty(),
      parsFortuna: root['parsFortuna'] is Map
          ? KPPointPlacementModel.fromJson(Map<String, dynamic>.from(root['parsFortuna'] as Map))
          : null,
    );
  }

  List<KPHouseSignificatorsModel> get significators => houseSignificators;
}

class KPPointPlacementModel {
  final String name;
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int nakshatraIndex;
  final String nakshatraName;
  final int pada;
  final int? house;
  final int subNumber; // 1 to 249
  final String signLord;
  final String starLord;
  final String subLord;
  final String subSubLord;
  final bool isRetrograde;

  const KPPointPlacementModel({
    required this.name,
    required this.longitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    this.house,
    required this.subNumber,
    required this.signLord,
    required this.starLord,
    required this.subLord,
    required this.subSubLord,
    this.isRetrograde = false,
  });

  factory KPPointPlacementModel.fromJson(Map<String, dynamic> json) {
    return KPPointPlacementModel(
      name: json['name'] as String? ?? '',
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['signIndex'] ?? json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: (json['signName'] ?? json['rashiName'] ?? '') as String,
      degreeInRashi: ((json['degreeInSign'] ?? json['degreeInRashi']) as num?)?.toDouble() ?? 0.0,
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      house: (json['houseOccupiency'] ?? json['house'] as num?)?.toInt(),
      subNumber: (json['subNumber'] as num?)?.toInt() ?? 1,
      signLord: json['signLord'] as String? ?? '',
      starLord: json['starLord'] as String? ?? '',
      subLord: json['subLord'] as String? ?? '',
      subSubLord: json['subSubLord'] as String? ?? '',
      isRetrograde: json['isRetrograde'] as bool? ?? false,
    );
  }

  String get formattedDegree => '${degreeInRashi.toStringAsFixed(2)}°';
  String get signName => rashiName;
  int? get houseOccupiency => house;
}

class KPCuspPlacementModel {
  final int cuspNumber;
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int nakshatraIndex;
  final String nakshatraName;
  final int pada;
  final int subNumber;
  final String signLord;
  final String starLord;
  final String subLord;
  final String subSubLord;

  const KPCuspPlacementModel({
    required this.cuspNumber,
    required this.longitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    required this.subNumber,
    required this.signLord,
    required this.starLord,
    required this.subLord,
    required this.subSubLord,
  });

  factory KPCuspPlacementModel.fromJson(Map<String, dynamic> json) {
    return KPCuspPlacementModel(
      cuspNumber: (json['cuspNumber'] as num?)?.toInt() ?? 1,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['signIndex'] ?? json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: (json['signName'] ?? json['rashiName'] ?? '') as String,
      degreeInRashi: ((json['degreeInSign'] ?? json['degreeInRashi']) as num?)?.toDouble() ?? 0.0,
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      subNumber: (json['subNumber'] as num?)?.toInt() ?? 1,
      signLord: json['signLord'] as String? ?? '',
      starLord: json['starLord'] as String? ?? '',
      subLord: json['subLord'] as String? ?? '',
      subSubLord: json['subSubLord'] as String? ?? '',
    );
  }

  String get signName => rashiName;
  String get formattedDegree => '${degreeInRashi.toStringAsFixed(2)}°';
}

class KPHouseSignificatorsModel {
  final int house;
  final List<String> levelA;
  final List<String> levelB;
  final List<String> levelC;
  final List<String> levelD;
  final List<String> allSignificators;
  final String cuspSubLord;

  const KPHouseSignificatorsModel({
    required this.house,
    required this.levelA,
    required this.levelB,
    required this.levelC,
    required this.levelD,
    required this.allSignificators,
    this.cuspSubLord = '',
  });

  factory KPHouseSignificatorsModel.fromJson(Map<String, dynamic> json) {
    return KPHouseSignificatorsModel(
      house: (json['house'] as num?)?.toInt() ?? 1,
      levelA: (json['levelA'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      levelB: (json['levelB'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      levelC: (json['levelC'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      levelD: (json['levelD'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      allSignificators: (json['allSignificators'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      cuspSubLord: json['cuspSubLord'] as String? ?? '',
    );
  }
}

class KPRulingPlanetsModel {
  final String dayLord;
  final String moonSignLord;
  final String moonStarLord;
  final String moonSubLord;
  final String lagnaSignLord;
  final String lagnaStarLord;
  final String lagnaSubLord;

  const KPRulingPlanetsModel({
    required this.dayLord,
    required this.moonSignLord,
    required this.moonStarLord,
    this.moonSubLord = '',
    required this.lagnaSignLord,
    required this.lagnaStarLord,
    this.lagnaSubLord = '',
  });

  const KPRulingPlanetsModel.empty()
      : dayLord = '',
        moonSignLord = '',
        moonStarLord = '',
        moonSubLord = '',
        lagnaSignLord = '',
        lagnaStarLord = '',
        lagnaSubLord = '';

  factory KPRulingPlanetsModel.fromJson(Map<String, dynamic> json) {
    return KPRulingPlanetsModel(
      dayLord: json['dayLord'] as String? ?? '',
      moonSignLord: json['moonSignLord'] as String? ?? '',
      moonStarLord: json['moonStarLord'] as String? ?? '',
      moonSubLord: json['moonSubLord'] as String? ?? '',
      lagnaSignLord: json['lagnaSignLord'] as String? ?? '',
      lagnaStarLord: json['lagnaStarLord'] as String? ?? '',
      lagnaSubLord: json['lagnaSubLord'] as String? ?? '',
    );
  }
}
