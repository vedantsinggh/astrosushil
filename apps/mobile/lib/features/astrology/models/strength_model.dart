/// Strongly typed models for Shadbala (Sixfold Planetary Strength) & Bhava Bala (House Potency)
/// Compliant with packages/astrology-engine deterministic Strength Calculators.
library;

class SthanaBalaBreakdownModel {
  final double uchchaBala;
  final double saptavargajaBala;
  final double ojhayugmaBala;
  final double kendradiBala;
  final double drekkanaBala;
  final double total;

  const SthanaBalaBreakdownModel({
    required this.uchchaBala,
    required this.saptavargajaBala,
    required this.ojhayugmaBala,
    required this.kendradiBala,
    required this.drekkanaBala,
    required this.total,
  });

  factory SthanaBalaBreakdownModel.fromJson(Map<String, dynamic> json) {
    return SthanaBalaBreakdownModel(
      uchchaBala: (json['uchchaBala'] as num?)?.toDouble() ?? 0.0,
      saptavargajaBala: (json['saptavargajaBala'] as num?)?.toDouble() ?? 0.0,
      ojhayugmaBala: (json['ojhayugmaBala'] as num?)?.toDouble() ?? 0.0,
      kendradiBala: (json['kendradiBala'] as num?)?.toDouble() ?? 0.0,
      drekkanaBala: (json['drekkanaBala'] as num?)?.toDouble() ?? 0.0,
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class KalaBalaBreakdownModel {
  final double nathonnathaBala;
  final double pakshaBala;
  final double tribhagaBala;
  final double varaBala;
  final double horaBala;
  final double ayanaBala;
  final double yuddhaBala;
  final double total;

  const KalaBalaBreakdownModel({
    required this.nathonnathaBala,
    required this.pakshaBala,
    required this.tribhagaBala,
    required this.varaBala,
    required this.horaBala,
    required this.ayanaBala,
    required this.yuddhaBala,
    required this.total,
  });

  factory KalaBalaBreakdownModel.fromJson(Map<String, dynamic> json) {
    return KalaBalaBreakdownModel(
      nathonnathaBala: (json['nathonnathaBala'] as num?)?.toDouble() ?? 0.0,
      pakshaBala: (json['pakshaBala'] as num?)?.toDouble() ?? 0.0,
      tribhagaBala: (json['tribhagaBala'] as num?)?.toDouble() ?? 0.0,
      varaBala: (json['varaBala'] as num?)?.toDouble() ?? 0.0,
      horaBala: (json['horaBala'] as num?)?.toDouble() ?? 0.0,
      ayanaBala: (json['ayanaBala'] as num?)?.toDouble() ?? 0.0,
      yuddhaBala: (json['yuddhaBala'] as num?)?.toDouble() ?? 0.0,
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class PlanetShadbalaModel {
  final String planet;
  final double totalShashtiamsas;
  final double totalRupas;
  final SthanaBalaBreakdownModel sthanaBala;
  final double digBala;
  final KalaBalaBreakdownModel kalaBala;
  final double cheshtaBala;
  final double naisargikaBala;
  final double drikBala;
  final double minimumRequirement;
  final double minimumRequirementRupas;
  final double ratio;
  final bool isStrong;
  final int rank;

  const PlanetShadbalaModel({
    required this.planet,
    required this.totalShashtiamsas,
    required this.totalRupas,
    required this.sthanaBala,
    required this.digBala,
    required this.kalaBala,
    required this.cheshtaBala,
    required this.naisargikaBala,
    required this.drikBala,
    required this.minimumRequirement,
    required this.minimumRequirementRupas,
    required this.ratio,
    required this.isStrong,
    required this.rank,
  });

  factory PlanetShadbalaModel.fromJson(Map<String, dynamic> json) {
    return PlanetShadbalaModel(
      planet: json['planet'] as String? ?? '',
      totalShashtiamsas: (json['totalShashtiamsas'] as num?)?.toDouble() ?? 0.0,
      totalRupas: (json['totalRupas'] as num?)?.toDouble() ?? 0.0,
      sthanaBala: SthanaBalaBreakdownModel.fromJson(json['sthanaBala'] as Map<String, dynamic>? ?? {}),
      digBala: (json['digBala'] as num?)?.toDouble() ?? 0.0,
      kalaBala: KalaBalaBreakdownModel.fromJson(json['kalaBala'] as Map<String, dynamic>? ?? {}),
      cheshtaBala: (json['cheshtaBala'] as num?)?.toDouble() ?? 0.0,
      naisargikaBala: (json['naisargikaBala'] as num?)?.toDouble() ?? 0.0,
      drikBala: (json['drikBala'] as num?)?.toDouble() ?? 0.0,
      minimumRequirement: (json['minimumRequirement'] as num?)?.toDouble() ?? 0.0,
      minimumRequirementRupas: (json['minimumRequirementRupas'] as num?)?.toDouble() ?? 0.0,
      ratio: (json['ratio'] as num?)?.toDouble() ?? 0.0,
      isStrong: json['isStrong'] as bool? ?? false,
      rank: (json['rank'] as num?)?.toInt() ?? 1,
    );
  }
}

class ShadbalaReportModel {
  final Map<String, PlanetShadbalaModel> planets;
  final List<PlanetShadbalaModel> summary;

  const ShadbalaReportModel({
    required this.planets,
    required this.summary,
  });

  factory ShadbalaReportModel.fromJson(Map<String, dynamic> json) {
    final rawPlanets = json['planets'] as Map<String, dynamic>? ?? {};
    final planetsMap = <String, PlanetShadbalaModel>{};
    rawPlanets.forEach((k, v) {
      if (v is Map<String, dynamic>) {
        planetsMap[k.toUpperCase()] = PlanetShadbalaModel.fromJson(v);
      }
    });

    final summaryList = (json['summary'] as List? ?? [])
        .whereType<Map>()
        .map((s) => PlanetShadbalaModel.fromJson(Map<String, dynamic>.from(s)))
        .toList();

    return ShadbalaReportModel(
      planets: planetsMap,
      summary: summaryList,
    );
  }
}

class HouseBhavaBalaModel {
  final int houseNumber;
  final String sign;
  final int rashiIndex;
  final String lord;
  final double bhavadhipatiBala;
  final double bhavaDigBala;
  final double bhavaDrishtiBala;
  final double bhavaOccupantBala;
  final double totalShashtiamsas;
  final double totalRupas;
  final int rank;

  const HouseBhavaBalaModel({
    required this.houseNumber,
    required this.sign,
    required this.rashiIndex,
    required this.lord,
    required this.bhavadhipatiBala,
    required this.bhavaDigBala,
    required this.bhavaDrishtiBala,
    required this.bhavaOccupantBala,
    required this.totalShashtiamsas,
    required this.totalRupas,
    required this.rank,
  });

  factory HouseBhavaBalaModel.fromJson(Map<String, dynamic> json) {
    return HouseBhavaBalaModel(
      houseNumber: (json['houseNumber'] as num?)?.toInt() ?? 1,
      sign: json['sign'] as String? ?? '',
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      lord: json['lord'] as String? ?? '',
      bhavadhipatiBala: (json['bhavadhipatiBala'] as num?)?.toDouble() ?? 0.0,
      bhavaDigBala: (json['bhavaDigBala'] as num?)?.toDouble() ?? 0.0,
      bhavaDrishtiBala: (json['bhavaDrishtiBala'] as num?)?.toDouble() ?? 0.0,
      bhavaOccupantBala: (json['bhavaOccupantBala'] as num?)?.toDouble() ?? 0.0,
      totalShashtiamsas: (json['totalShashtiamsas'] as num?)?.toDouble() ?? 0.0,
      totalRupas: (json['totalRupas'] as num?)?.toDouble() ?? 0.0,
      rank: (json['rank'] as num?)?.toInt() ?? 1,
    );
  }
}

class BhavaBalaReportModel {
  final List<HouseBhavaBalaModel> houses;

  const BhavaBalaReportModel({
    required this.houses,
  });

  factory BhavaBalaReportModel.fromJson(Map<String, dynamic> json) {
    final list = (json['houses'] as List? ?? [])
        .whereType<Map>()
        .map((h) => HouseBhavaBalaModel.fromJson(Map<String, dynamic>.from(h)))
        .toList();

    return BhavaBalaReportModel(houses: list);
  }
}

class ComprehensiveStrengthModel {
  final ShadbalaReportModel shadbala;
  final BhavaBalaReportModel bhavaBala;

  const ComprehensiveStrengthModel({
    required this.shadbala,
    required this.bhavaBala,
  });

  factory ComprehensiveStrengthModel.fromJson(Map<String, dynamic> json) {
    return ComprehensiveStrengthModel(
      shadbala: ShadbalaReportModel.fromJson(json['shadbala'] as Map<String, dynamic>? ?? {}),
      bhavaBala: BhavaBalaReportModel.fromJson(json['bhavaBala'] as Map<String, dynamic>? ?? {}),
    );
  }
}
