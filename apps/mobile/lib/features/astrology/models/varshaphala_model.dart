/// Strongly typed domain models for Varshaphala (Tajika Solar Return Annual Chart).
/// Evaluated deterministically via Fastify backend POST /api/v1/astrology/varshaphala.
class VarshaphalaChartModel {
  final String calculationVersion;
  final SolarReturnDetailsModel solarReturn;
  final VarshaLagnaModel varshaLagna;
  final Map<String, AnnualPlanetModel> planets;
  final List<AnnualHouseModel> houses;
  final MunthaDetailsModel muntha;
  final PanchadhikariDetailsModel panchadhikari;
  final VarsheshaDetailsModel varshesha;
  final Map<String, PlanetHarshaBalaModel> harshaBala;
  final List<TajikaYogaModel> tajikaYogas;
  final List<SahamResultModel> sahams;
  final MuddaDashaTreeModel? muddaDasha;

  const VarshaphalaChartModel({
    required this.calculationVersion,
    required this.solarReturn,
    required this.varshaLagna,
    required this.planets,
    required this.houses,
    required this.muntha,
    required this.panchadhikari,
    required this.varshesha,
    required this.harshaBala,
    required this.tajikaYogas,
    required this.sahams,
    this.muddaDasha,
  });

  factory VarshaphalaChartModel.fromJson(Map<String, dynamic> json) {
    final root = json['data'] is Map
        ? Map<String, dynamic>.from(json['data'] as Map)
        : json;

    final rawPlanets = root['planets'] as Map? ?? {};
    final parsedPlanets = <String, AnnualPlanetModel>{};
    rawPlanets.forEach((key, value) {
      if (value is Map) {
        parsedPlanets[key.toString()] =
            AnnualPlanetModel.fromJson(Map<String, dynamic>.from(value));
      }
    });

    final rawHarsha = root['harshaBala'] as Map? ?? {};
    final parsedHarsha = <String, PlanetHarshaBalaModel>{};
    rawHarsha.forEach((key, value) {
      if (value is Map) {
        parsedHarsha[key.toString()] =
            PlanetHarshaBalaModel.fromJson(Map<String, dynamic>.from(value));
      }
    });

    return VarshaphalaChartModel(
      calculationVersion: root['calculationVersion'] as String? ?? '1.1.0',
      solarReturn: SolarReturnDetailsModel.fromJson(
          root['solarReturn'] is Map ? Map<String, dynamic>.from(root['solarReturn'] as Map) : {}),
      varshaLagna: VarshaLagnaModel.fromJson(
          root['varshaLagna'] is Map ? Map<String, dynamic>.from(root['varshaLagna'] as Map) : {}),
      planets: parsedPlanets,
      houses: (root['houses'] as List? ?? [])
          .whereType<Map>()
          .map((e) => AnnualHouseModel.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      muntha: MunthaDetailsModel.fromJson(
          root['muntha'] is Map ? Map<String, dynamic>.from(root['muntha'] as Map) : {}),
      panchadhikari: PanchadhikariDetailsModel.fromJson(
          root['panchadhikari'] is Map ? Map<String, dynamic>.from(root['panchadhikari'] as Map) : {}),
      varshesha: VarsheshaDetailsModel.fromJson(
          root['varshesha'] is Map ? Map<String, dynamic>.from(root['varshesha'] as Map) : {}),
      harshaBala: parsedHarsha,
      tajikaYogas: (root['tajikaYogas'] as List? ?? [])
          .whereType<Map>()
          .map((e) => TajikaYogaModel.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      sahams: (root['sahams'] as List? ?? [])
          .whereType<Map>()
          .map((e) => SahamResultModel.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      muddaDasha: root['muddaDasha'] is Map
          ? MuddaDashaTreeModel.fromJson(Map<String, dynamic>.from(root['muddaDasha'] as Map))
          : null,
    );
  }

  SolarReturnDetailsModel get solarReturnDetails => solarReturn;
  int get targetYear => solarReturn.targetYear;
  int get completedAge => solarReturn.age;
}

class SolarReturnDetailsModel {
  final int targetYear;
  final int age;
  final double natalSunLongitude;
  final String natalSunSign;
  final double natalSunDegree;
  final double solarReturnSunLongitude;
  final String solarReturnSunSign;
  final double solarReturnSunDegree;
  final String solarReturnUtcIso;
  final String solarReturnLocalIso;
  final String timezone;

  const SolarReturnDetailsModel({
    required this.targetYear,
    required this.age,
    required this.natalSunLongitude,
    required this.natalSunSign,
    required this.natalSunDegree,
    required this.solarReturnSunLongitude,
    required this.solarReturnSunSign,
    required this.solarReturnSunDegree,
    required this.solarReturnUtcIso,
    required this.solarReturnLocalIso,
    required this.timezone,
  });

  factory SolarReturnDetailsModel.fromJson(Map<String, dynamic> json) {
    return SolarReturnDetailsModel(
      targetYear: (json['targetYear'] as num?)?.toInt() ?? 2026,
      age: (json['age'] as num?)?.toInt() ?? 0,
      natalSunLongitude: (json['natalSunLongitude'] as num?)?.toDouble() ?? 0.0,
      natalSunSign: json['natalSunSign'] as String? ?? '',
      natalSunDegree: (json['natalSunDegree'] as num?)?.toDouble() ?? 0.0,
      solarReturnSunLongitude:
          (json['solarReturnSunLongitude'] as num?)?.toDouble() ?? 0.0,
      solarReturnSunSign: json['solarReturnSunSign'] as String? ?? '',
      solarReturnSunDegree:
          (json['solarReturnSunDegree'] as num?)?.toDouble() ?? 0.0,
      solarReturnUtcIso: json['solarReturnUtcIso'] as String? ?? '',
      solarReturnLocalIso: json['solarReturnLocalIso'] as String? ?? '',
      timezone: json['timezone'] as String? ?? 'UTC',
    );
  }

  String get returnTimestamp =>
      solarReturnLocalIso.isNotEmpty ? solarReturnLocalIso : solarReturnUtcIso;
  String get returnWeekday => 'Astronomical Solar Transit';
  bool get isDayReturn => true;
  String get natalSunDegreeFormatted =>
      '$natalSunSign ${natalSunDegree.toStringAsFixed(2)}°';
  String get returnSunDegreeFormatted =>
      '$solarReturnSunSign ${solarReturnSunDegree.toStringAsFixed(2)}°';
}

class VarshaLagnaModel {
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int nakshatraIndex;
  final String nakshatraName;
  final int pada;
  final String lord;

  const VarshaLagnaModel({
    required this.longitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    required this.lord,
  });

  factory VarshaLagnaModel.fromJson(Map<String, dynamic> json) {
    return VarshaLagnaModel(
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      lord: json['lord'] as String? ?? '',
    );
  }

  String get formattedDegree => '${degreeInRashi.toStringAsFixed(2)}°';
}

class AnnualPlanetModel {
  final String planet;
  final double longitude;
  final bool isRetrograde;
  final double speedLongitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int house;
  final bool isCombust;

  const AnnualPlanetModel({
    required this.planet,
    required this.longitude,
    required this.isRetrograde,
    required this.speedLongitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.house,
    required this.isCombust,
  });

  factory AnnualPlanetModel.fromJson(Map<String, dynamic> json) {
    return AnnualPlanetModel(
      planet: json['planet'] as String? ?? '',
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      isRetrograde: json['isRetrograde'] as bool? ?? false,
      speedLongitude: (json['speedLongitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      house: (json['house'] as num?)?.toInt() ?? 1,
      isCombust: json['isCombust'] as bool? ?? false,
    );
  }
}

class AnnualHouseModel {
  final int houseNumber;
  final String sign;
  final String lord;
  final List<String> occupyingPlanets;

  const AnnualHouseModel({
    required this.houseNumber,
    required this.sign,
    required this.lord,
    required this.occupyingPlanets,
  });

  factory AnnualHouseModel.fromJson(Map<String, dynamic> json) {
    return AnnualHouseModel(
      houseNumber: (json['houseNumber'] as num?)?.toInt() ?? 1,
      sign: json['sign'] as String? ?? '',
      lord: json['lord'] as String? ?? '',
      occupyingPlanets: (json['occupyingPlanets'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}

class MunthaDetailsModel {
  final int rashiIndex;
  final String rashiName;
  final double longitude;
  final double degreeInRashi;
  final String lord;
  final int houseInVarshaChart;
  final int houseInNatalChart;
  final int progressionYears;

  const MunthaDetailsModel({
    required this.rashiIndex,
    required this.rashiName,
    required this.longitude,
    required this.degreeInRashi,
    required this.lord,
    required this.houseInVarshaChart,
    required this.houseInNatalChart,
    required this.progressionYears,
  });

  factory MunthaDetailsModel.fromJson(Map<String, dynamic> json) {
    return MunthaDetailsModel(
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      lord: json['lord'] as String? ?? '',
      houseInVarshaChart: (json['houseInVarshaChart'] as num?)?.toInt() ?? 1,
      houseInNatalChart: (json['houseInNatalChart'] as num?)?.toInt() ?? 1,
      progressionYears: (json['progressionYears'] as num?)?.toInt() ?? 0,
    );
  }

  bool get isAuspicious => [1, 2, 3, 5, 9, 10, 11].contains(houseInVarshaChart);
  int get houseInVarshaLagna => houseInVarshaChart;
}

class PanchadhikariCandidateModel {
  final String role; // MUNTHESHA, JANMESHA, VARSHA_LAGNESHA, TRIRASHISHA, DINA_RATRI_PATI
  final String roleTitle;
  final String planet;
  final String sourceDescription;
  final bool aspectsVarshaLagna;
  final double harshaBalaScore;
  final int houseInVarshaChart;

  const PanchadhikariCandidateModel({
    required this.role,
    required this.roleTitle,
    required this.planet,
    required this.sourceDescription,
    required this.aspectsVarshaLagna,
    required this.harshaBalaScore,
    required this.houseInVarshaChart,
  });

  factory PanchadhikariCandidateModel.fromJson(Map<String, dynamic> json) {
    return PanchadhikariCandidateModel(
      role: json['role'] as String? ?? '',
      roleTitle: json['roleTitle'] as String? ?? '',
      planet: json['planet'] as String? ?? '',
      sourceDescription: json['sourceDescription'] as String? ?? '',
      aspectsVarshaLagna: json['aspectsVarshaLagna'] as bool? ?? false,
      harshaBalaScore: (json['harshaBalaScore'] as num?)?.toDouble() ?? 0.0,
      houseInVarshaChart: (json['houseInVarshaChart'] as num?)?.toInt() ?? 1,
    );
  }
}

class PanchadhikariDetailsModel {
  final bool isDayReturn;
  final int sunHouseInVarshaChart;
  final List<PanchadhikariCandidateModel> candidates;

  const PanchadhikariDetailsModel({
    required this.isDayReturn,
    required this.sunHouseInVarshaChart,
    required this.candidates,
  });

  factory PanchadhikariDetailsModel.fromJson(Map<String, dynamic> json) {
    return PanchadhikariDetailsModel(
      isDayReturn: json['isDayReturn'] as bool? ?? true,
      sunHouseInVarshaChart: (json['sunHouseInVarshaChart'] as num?)?.toInt() ?? 1,
      candidates: (json['candidates'] as List<dynamic>?)
              ?.map((e) => PanchadhikariCandidateModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  String get munthesha => _getCandidatePlanet('MUNTHESHA');
  String get janmaLagnesha => _getCandidatePlanet('JANMESHA');
  String get varshaLagnesha => _getCandidatePlanet('VARSHA_LAGNESHA');
  String get triRashiPati => _getCandidatePlanet('TRIRASHISHA');
  String get dinRatriPati => _getCandidatePlanet('DINA_RATRI_PATI');

  String _getCandidatePlanet(String role) {
    try {
      return candidates.firstWhere((c) => c.role == role).planet;
    } catch (_) {
      return '—';
    }
  }
}

class VarsheshaDetailsModel {
  final String selectedVarshesha;
  final String role;
  final String selectionReason;
  final bool aspectsVarshaLagna;
  final double harshaBalaScore;
  final List<PanchadhikariCandidateModel> candidates;

  const VarsheshaDetailsModel({
    required this.selectedVarshesha,
    required this.role,
    required this.selectionReason,
    required this.aspectsVarshaLagna,
    required this.harshaBalaScore,
    required this.candidates,
  });

  factory VarsheshaDetailsModel.fromJson(Map<String, dynamic> json) {
    return VarsheshaDetailsModel(
      selectedVarshesha: json['selectedVarshesha'] as String? ?? '',
      role: json['role'] as String? ?? '',
      selectionReason: json['selectionReason'] as String? ?? '',
      aspectsVarshaLagna: json['aspectsVarshaLagna'] as bool? ?? false,
      harshaBalaScore: (json['harshaBalaScore'] as num?)?.toDouble() ?? 0.0,
      candidates: (json['candidates'] as List<dynamic>?)
              ?.map((e) => PanchadhikariCandidateModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  String get planet => selectedVarshesha;
  String get selectionRationale => selectionReason;
}

class PlanetHarshaBalaModel {
  final String planet;
  final double sthanaBala;
  final double ucchaBala;
  final double striPurushaBala;
  final double dinaRatriBala;
  final double totalScore;
  final bool hasHarsha;

  const PlanetHarshaBalaModel({
    required this.planet,
    required this.sthanaBala,
    required this.ucchaBala,
    required this.striPurushaBala,
    required this.dinaRatriBala,
    required this.totalScore,
    required this.hasHarsha,
  });

  factory PlanetHarshaBalaModel.fromJson(Map<String, dynamic> json) {
    return PlanetHarshaBalaModel(
      planet: json['planet'] as String? ?? '',
      sthanaBala: (json['sthanaBala'] as num?)?.toDouble() ?? 0.0,
      ucchaBala: (json['ucchaBala'] as num?)?.toDouble() ?? 0.0,
      striPurushaBala: (json['striPurushaBala'] as num?)?.toDouble() ?? 0.0,
      dinaRatriBala: (json['dinaRatriBala'] as num?)?.toDouble() ?? 0.0,
      totalScore: (json['totalScore'] as num?)?.toDouble() ?? 0.0,
      hasHarsha: json['hasHarsha'] as bool? ?? false,
    );
  }

  double get uchchaBala => ucchaBala;
  double get haddaBala => striPurushaBala;
  double get totalBala => totalScore;
  String get tier => totalScore >= 15 ? 'Uttama' : (totalScore >= 10 ? 'Madhyama' : 'Alpa');
}

class TajikaYogaModel {
  final String type; // ITHASALA, ISARPHA, NAKTA, YAMAYA, KAMBOOLA
  final String name;
  final String planet1;
  final String planet2;
  final String? intermediaryPlanet;
  final double orbDegrees;
  final double actualDistanceDegrees;
  final bool isApplying;
  final String description;
  final String strength; // STRONG, MODERATE, WEAK

  const TajikaYogaModel({
    required this.type,
    required this.name,
    required this.planet1,
    required this.planet2,
    this.intermediaryPlanet,
    required this.orbDegrees,
    required this.actualDistanceDegrees,
    required this.isApplying,
    required this.description,
    required this.strength,
  });

  factory TajikaYogaModel.fromJson(Map<String, dynamic> json) {
    return TajikaYogaModel(
      type: json['type'] as String? ?? '',
      name: json['name'] as String? ?? '',
      planet1: json['planet1'] as String? ?? '',
      planet2: json['planet2'] as String? ?? '',
      intermediaryPlanet: json['intermediaryPlanet'] as String?,
      orbDegrees: (json['orbDegrees'] as num?)?.toDouble() ?? 0.0,
      actualDistanceDegrees:
          (json['actualDistanceDegrees'] as num?)?.toDouble() ?? 0.0,
      isApplying: json['isApplying'] as bool? ?? true,
      description: json['description'] as String? ?? '',
      strength: json['strength'] as String? ?? 'MODERATE',
    );
  }

  String get yogaName => name;
  String get yogaType => type;
  List<String> get participatingPlanets => intermediaryPlanet != null
      ? [planet1, intermediaryPlanet!, planet2]
      : [planet1, planet2];
}

class SahamResultModel {
  final String name;
  final String sanskritName;
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int houseInVarshaChart;
  final String formula;
  final bool isDayFormula;

  const SahamResultModel({
    required this.name,
    required this.sanskritName,
    required this.longitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.houseInVarshaChart,
    required this.formula,
    required this.isDayFormula,
  });

  factory SahamResultModel.fromJson(Map<String, dynamic> json) {
    return SahamResultModel(
      name: json['name'] as String? ?? '',
      sanskritName: json['sanskritName'] as String? ?? '',
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      houseInVarshaChart: (json['houseInVarshaChart'] as num?)?.toInt() ?? 1,
      formula: json['formula'] as String? ?? '',
      isDayFormula: json['isDayFormula'] as bool? ?? true,
    );
  }

  String get formattedDegree => '${degreeInRashi.toStringAsFixed(2)}°';
  String get sahamName => sanskritName.isNotEmpty ? '$name ($sanskritName)' : name;
  String get lord => _getRashiLord(rashiIndex);

  static String _getRashiLord(int rashi) {
    switch (rashi) {
      case 1:
      case 8:
        return 'Mars';
      case 2:
      case 7:
        return 'Venus';
      case 3:
      case 6:
        return 'Mercury';
      case 4:
        return 'Moon';
      case 5:
        return 'Sun';
      case 9:
      case 12:
        return 'Jupiter';
      case 10:
      case 11:
        return 'Saturn';
      default:
        return '';
    }
  }
}

class MuddaDashaTreeModel {
  final String dashaSystem;
  final String birthLord;
  final double totalCycleDays;
  final String startDateIso;
  final String endDateIso;
  final List<MuddaDashaPeriodModel> periods;

  const MuddaDashaTreeModel({
    required this.dashaSystem,
    required this.birthLord,
    required this.totalCycleDays,
    required this.startDateIso,
    required this.endDateIso,
    required this.periods,
  });

  factory MuddaDashaTreeModel.fromJson(Map<String, dynamic> json) {
    return MuddaDashaTreeModel(
      dashaSystem: json['dashaSystem'] as String? ?? 'MUDDA',
      birthLord: json['birthLord'] as String? ?? '',
      totalCycleDays: (json['totalCycleDays'] as num?)?.toDouble() ?? 365.2425,
      startDateIso: json['startDateIso'] as String? ?? '',
      endDateIso: json['endDateIso'] as String? ?? '',
      periods: (json['periods'] as List<dynamic>?)
              ?.map((e) => MuddaDashaPeriodModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class MuddaDashaPeriodModel {
  final String lord;
  final String startDate;
  final String endDate;
  final double durationDays;

  const MuddaDashaPeriodModel({
    required this.lord,
    required this.startDate,
    required this.endDate,
    required this.durationDays,
  });

  factory MuddaDashaPeriodModel.fromJson(Map<String, dynamic> json) {
    return MuddaDashaPeriodModel(
      lord: json['lord'] as String? ?? '',
      startDate: json['startDate'] as String? ?? '',
      endDate: json['endDate'] as String? ?? '',
      durationDays: (json['durationDays'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
