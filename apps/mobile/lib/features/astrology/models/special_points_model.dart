/// Strongly typed models for Vedic Special Points & Upagrahas API responses
/// Compliant with packages/astrology-engine deterministic calculations.
library;

class CalculatedSpecialPointModel {
  final String name;
  final String sanskritName;
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int house;
  final int nakshatraIndex;
  final String nakshatraName;
  final int pada;
  final String nakshatraLord;
  final String formula;
  final String category;

  const CalculatedSpecialPointModel({
    required this.name,
    required this.sanskritName,
    required this.longitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.house,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    required this.nakshatraLord,
    required this.formula,
    required this.category,
  });

  factory CalculatedSpecialPointModel.fromJson(Map<String, dynamic> json) {
    return CalculatedSpecialPointModel(
      name: json['name'] as String? ?? '',
      sanskritName: json['sanskritName'] as String? ?? '',
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? 'Mesha',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      house: (json['house'] as num?)?.toInt() ?? 1,
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? 'Ashwini',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      nakshatraLord: json['nakshatraLord'] as String? ?? 'Ketu',
      formula: json['formula'] as String? ?? '',
      category: json['category'] as String? ?? 'SPECIAL_POINT',
    );
  }
}

class UpagrahasReportModel {
  final CalculatedSpecialPointModel dhooma;
  final CalculatedSpecialPointModel vyatipata;
  final CalculatedSpecialPointModel parivesha;
  final CalculatedSpecialPointModel indrachapa;
  final CalculatedSpecialPointModel upaketu;
  final CalculatedSpecialPointModel gulika;
  final CalculatedSpecialPointModel mandi;

  const UpagrahasReportModel({
    required this.dhooma,
    required this.vyatipata,
    required this.parivesha,
    required this.indrachapa,
    required this.upaketu,
    required this.gulika,
    required this.mandi,
  });

  factory UpagrahasReportModel.fromJson(Map<String, dynamic> json) {
    return UpagrahasReportModel(
      dhooma: CalculatedSpecialPointModel.fromJson(json['dhooma'] is Map ? Map<String, dynamic>.from(json['dhooma']) : {}),
      vyatipata: CalculatedSpecialPointModel.fromJson(json['vyatipata'] is Map ? Map<String, dynamic>.from(json['vyatipata']) : {}),
      parivesha: CalculatedSpecialPointModel.fromJson(json['parivesha'] is Map ? Map<String, dynamic>.from(json['parivesha']) : {}),
      indrachapa: CalculatedSpecialPointModel.fromJson(json['indrachapa'] is Map ? Map<String, dynamic>.from(json['indrachapa']) : {}),
      upaketu: CalculatedSpecialPointModel.fromJson(json['upaketu'] is Map ? Map<String, dynamic>.from(json['upaketu']) : {}),
      gulika: CalculatedSpecialPointModel.fromJson(json['gulika'] is Map ? Map<String, dynamic>.from(json['gulika']) : {}),
      mandi: CalculatedSpecialPointModel.fromJson(json['mandi'] is Map ? Map<String, dynamic>.from(json['mandi']) : {}),
    );
  }

  List<CalculatedSpecialPointModel> get allPoints => [
    dhooma,
    vyatipata,
    parivesha,
    indrachapa,
    upaketu,
    gulika,
    mandi,
  ];
}

class SpecialLagnasReportModel {
  final CalculatedSpecialPointModel bhavaLagna;
  final CalculatedSpecialPointModel horaLagna;
  final CalculatedSpecialPointModel ghatikaLagna;
  final CalculatedSpecialPointModel induLagna;
  final CalculatedSpecialPointModel pranapadaLagna;
  final CalculatedSpecialPointModel varnadaLagna;

  const SpecialLagnasReportModel({
    required this.bhavaLagna,
    required this.horaLagna,
    required this.ghatikaLagna,
    required this.induLagna,
    required this.pranapadaLagna,
    required this.varnadaLagna,
  });

  factory SpecialLagnasReportModel.fromJson(Map<String, dynamic> json) {
    return SpecialLagnasReportModel(
      bhavaLagna: CalculatedSpecialPointModel.fromJson(json['bhavaLagna'] is Map ? Map<String, dynamic>.from(json['bhavaLagna']) : {}),
      horaLagna: CalculatedSpecialPointModel.fromJson(json['horaLagna'] is Map ? Map<String, dynamic>.from(json['horaLagna']) : {}),
      ghatikaLagna: CalculatedSpecialPointModel.fromJson(json['ghatikaLagna'] is Map ? Map<String, dynamic>.from(json['ghatikaLagna']) : {}),
      induLagna: CalculatedSpecialPointModel.fromJson(json['induLagna'] is Map ? Map<String, dynamic>.from(json['induLagna']) : {}),
      pranapadaLagna: CalculatedSpecialPointModel.fromJson(json['pranapadaLagna'] is Map ? Map<String, dynamic>.from(json['pranapadaLagna']) : {}),
      varnadaLagna: CalculatedSpecialPointModel.fromJson(json['varnadaLagna'] is Map ? Map<String, dynamic>.from(json['varnadaLagna']) : {}),
    );
  }

  List<CalculatedSpecialPointModel> get allLagnas => [
    bhavaLagna,
    horaLagna,
    ghatikaLagna,
    induLagna,
    pranapadaLagna,
    varnadaLagna,
  ];
}

class SarpaDreshkanaModel {
  final String planet;
  final bool isSarpaDreshkana;
  final int decanateIndex;
  final int signIndex;

  const SarpaDreshkanaModel({
    required this.planet,
    required this.isSarpaDreshkana,
    required this.decanateIndex,
    required this.signIndex,
  });

  factory SarpaDreshkanaModel.fromJson(Map<String, dynamic> json) {
    return SarpaDreshkanaModel(
      planet: json['planet'] as String? ?? '',
      isSarpaDreshkana: json['isSarpaDreshkana'] as bool? ?? false,
      decanateIndex: (json['decanateIndex'] as num?)?.toInt() ?? 1,
      signIndex: (json['signIndex'] as num?)?.toInt() ?? 1,
    );
  }
}

class ArishtaPointsReportModel {
  final CalculatedSpecialPointModel sixtyFourthNavamshaMoon;
  final CalculatedSpecialPointModel sixtyFourthNavamshaAscendant;
  final CalculatedSpecialPointModel twentySecondDrekkanaAscendant;
  final CalculatedSpecialPointModel twentySecondDrekkanaMoon;
  final List<SarpaDreshkanaModel> sarpaDreshkanaPlacements;

  const ArishtaPointsReportModel({
    required this.sixtyFourthNavamshaMoon,
    required this.sixtyFourthNavamshaAscendant,
    required this.twentySecondDrekkanaAscendant,
    required this.twentySecondDrekkanaMoon,
    this.sarpaDreshkanaPlacements = const [],
  });

  factory ArishtaPointsReportModel.fromJson(Map<String, dynamic> json) {
    final rawSarpa = json['sarpaDreshkanaPlacements'] as List? ?? [];
    return ArishtaPointsReportModel(
      sixtyFourthNavamshaMoon: CalculatedSpecialPointModel.fromJson(
          json['sixtyFourthNavamshaMoon'] is Map ? Map<String, dynamic>.from(json['sixtyFourthNavamshaMoon']) : {}),
      sixtyFourthNavamshaAscendant: CalculatedSpecialPointModel.fromJson(
          json['sixtyFourthNavamshaAscendant'] is Map ? Map<String, dynamic>.from(json['sixtyFourthNavamshaAscendant']) : {}),
      twentySecondDrekkanaAscendant: CalculatedSpecialPointModel.fromJson(
          json['twentySecondDrekkanaAscendant'] is Map ? Map<String, dynamic>.from(json['twentySecondDrekkanaAscendant']) : {}),
      twentySecondDrekkanaMoon: CalculatedSpecialPointModel.fromJson(
          json['twentySecondDrekkanaMoon'] is Map ? Map<String, dynamic>.from(json['twentySecondDrekkanaMoon']) : {}),
      sarpaDreshkanaPlacements: rawSarpa
          .whereType<Map>()
          .map((s) => SarpaDreshkanaModel.fromJson(Map<String, dynamic>.from(s)))
          .toList(),
    );
  }

  List<CalculatedSpecialPointModel> get allPoints => [
    sixtyFourthNavamshaMoon,
    sixtyFourthNavamshaAscendant,
    twentySecondDrekkanaAscendant,
    twentySecondDrekkanaMoon,
  ];
}

class YogiPointDetailsModel {
  final CalculatedSpecialPointModel yogiPoint;
  final String yogiPlanet;
  final String yogiNakshatra;
  final CalculatedSpecialPointModel avyogiPoint;
  final String avyogiPlanet;
  final String avyogiNakshatra;
  final String duplicateYogiPlanet;

  const YogiPointDetailsModel({
    required this.yogiPoint,
    required this.yogiPlanet,
    required this.yogiNakshatra,
    required this.avyogiPoint,
    required this.avyogiPlanet,
    required this.avyogiNakshatra,
    required this.duplicateYogiPlanet,
  });

  factory YogiPointDetailsModel.fromJson(Map<String, dynamic> json) {
    return YogiPointDetailsModel(
      yogiPoint: CalculatedSpecialPointModel.fromJson(json['yogiPoint'] is Map ? Map<String, dynamic>.from(json['yogiPoint']) : {}),
      yogiPlanet: json['yogiPlanet'] as String? ?? 'Jupiter',
      yogiNakshatra: json['yogiNakshatra'] as String? ?? 'Pushya',
      avyogiPoint: CalculatedSpecialPointModel.fromJson(json['avyogiPoint'] is Map ? Map<String, dynamic>.from(json['avyogiPoint']) : {}),
      avyogiPlanet: json['avyogiPlanet'] as String? ?? 'Rahu',
      avyogiNakshatra: json['avyogiNakshatra'] as String? ?? 'Shatabhisha',
      duplicateYogiPlanet: json['duplicateYogiPlanet'] as String? ?? json['sahayogi'] as String? ?? 'Mars',
    );
  }
}

class MrityuBhagaStatusModel {
  final String planet;
  final double exactFatalDegree;
  final double currentDegreeInRashi;
  final double deltaDegree;
  final bool isWithinOrb;
  final double orbDegrees;
  final String severity; // 'EXACT' | 'CRITICAL' | 'MODERATE' | 'NONE'

  const MrityuBhagaStatusModel({
    required this.planet,
    required this.exactFatalDegree,
    required this.currentDegreeInRashi,
    required this.deltaDegree,
    required this.isWithinOrb,
    required this.orbDegrees,
    required this.severity,
  });

  factory MrityuBhagaStatusModel.fromJson(Map<String, dynamic> json) {
    return MrityuBhagaStatusModel(
      planet: json['planet'] as String? ?? '',
      exactFatalDegree: (json['exactFatalDegree'] as num?)?.toDouble() ?? 0.0,
      currentDegreeInRashi: (json['currentDegreeInRashi'] as num?)?.toDouble() ?? 0.0,
      deltaDegree: (json['deltaDegree'] as num?)?.toDouble() ?? 0.0,
      isWithinOrb: json['isWithinOrb'] as bool? ?? false,
      orbDegrees: (json['orbDegrees'] as num?)?.toDouble() ?? 1.0,
      severity: json['severity'] as String? ?? 'NONE',
    );
  }
}

class MrityuBhagaReportModel {
  final List<MrityuBhagaStatusModel> points;
  final bool hasAnyAfflicted;
  final List<String> afflictedPlanets;

  const MrityuBhagaReportModel({
    this.points = const [],
    this.hasAnyAfflicted = false,
    this.afflictedPlanets = const [],
  });

  factory MrityuBhagaReportModel.fromJson(Map<String, dynamic> json) {
    final rawPoints = json['points'] as List? ?? [];
    final rawAfflicted = json['afflictedPlanets'] as List? ?? [];
    return MrityuBhagaReportModel(
      points: rawPoints
          .whereType<Map>()
          .map((p) => MrityuBhagaStatusModel.fromJson(Map<String, dynamic>.from(p)))
          .toList(),
      hasAnyAfflicted: json['hasAnyAfflicted'] as bool? ?? false,
      afflictedPlanets: rawAfflicted.map((e) => e.toString()).toList(),
    );
  }
}

class SpecialPointsReportModel {
  final UpagrahasReportModel upagrahas;
  final SpecialLagnasReportModel specialLagnas;
  final ArishtaPointsReportModel arishtaPoints;
  final YogiPointDetailsModel yogiPoints;
  final MrityuBhagaReportModel mrityuBhaga;

  const SpecialPointsReportModel({
    required this.upagrahas,
    required this.specialLagnas,
    required this.arishtaPoints,
    required this.yogiPoints,
    required this.mrityuBhaga,
  });

  factory SpecialPointsReportModel.fromJson(Map<String, dynamic> json) {
    final root = json['data'] is Map<String, dynamic>
        ? json['data'] as Map<String, dynamic>
        : json;

    return SpecialPointsReportModel(
      upagrahas: UpagrahasReportModel.fromJson(root['upagrahas'] is Map ? Map<String, dynamic>.from(root['upagrahas']) : {}),
      specialLagnas: SpecialLagnasReportModel.fromJson(root['specialLagnas'] is Map ? Map<String, dynamic>.from(root['specialLagnas']) : {}),
      arishtaPoints: ArishtaPointsReportModel.fromJson(root['arishtaPoints'] is Map ? Map<String, dynamic>.from(root['arishtaPoints']) : {}),
      yogiPoints: YogiPointDetailsModel.fromJson(root['yogiPoints'] is Map ? Map<String, dynamic>.from(root['yogiPoints']) : {}),
      mrityuBhaga: MrityuBhagaReportModel.fromJson(root['mrityuBhaga'] is Map ? Map<String, dynamic>.from(root['mrityuBhaga']) : {}),
    );
  }
}
