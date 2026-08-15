/// Strongly typed models for AstroChart API response

class NormalizedTimeModel {
  final String utcIsoString;
  final double julianDayUT;
  final int timezoneOffsetMinutes;

  const NormalizedTimeModel({
    required this.utcIsoString,
    required this.julianDayUT,
    required this.timezoneOffsetMinutes,
  });

  factory NormalizedTimeModel.fromJson(Map<String, dynamic> json) {
    return NormalizedTimeModel(
      utcIsoString: json['utcIsoString'] as String? ?? '',
      julianDayUT: (json['julianDayUT'] as num?)?.toDouble() ?? 0.0,
      timezoneOffsetMinutes: (json['timezoneOffsetMinutes'] as num?)?.toInt() ?? 0,
    );
  }
}

class ChartConfigModel {
  final String zodiacType;
  final String ayanamsa;
  final String houseSystem;
  final String nodeCalculation;
  final String planetaryCalculationMode;

  const ChartConfigModel({
    required this.zodiacType,
    required this.ayanamsa,
    required this.houseSystem,
    required this.nodeCalculation,
    required this.planetaryCalculationMode,
  });

  factory ChartConfigModel.fromJson(Map<String, dynamic> json) {
    return ChartConfigModel(
      zodiacType: json['zodiacType'] as String? ?? 'SIDEREAL',
      ayanamsa: json['ayanamsa'] as String? ?? 'LAHIRI',
      houseSystem: json['houseSystem'] as String? ?? 'WHOLE_SIGN',
      nodeCalculation: json['nodeCalculation'] as String? ?? 'MEAN_NODE',
      planetaryCalculationMode: json['planetaryCalculationMode'] as String? ?? 'GEOCENTRIC',
    );
  }
}

class PlanetModel {
  final String planet;
  final double longitude;
  final double latitude;
  final double speedLongitude;
  final bool isRetrograde;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int nakshatraIndex;
  final String nakshatraName;
  final int pada;
  final String nakshatraLord;

  const PlanetModel({
    required this.planet,
    required this.longitude,
    required this.latitude,
    required this.speedLongitude,
    required this.isRetrograde,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    required this.nakshatraLord,
  });

  factory PlanetModel.fromJson(Map<String, dynamic> json) {
    return PlanetModel(
      planet: json['planet'] as String? ?? '',
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      speedLongitude: (json['speedLongitude'] as num?)?.toDouble() ?? 0.0,
      isRetrograde: json['isRetrograde'] as bool? ?? false,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      nakshatraLord: json['nakshatraLord'] as String? ?? '',
    );
  }
}

class AscendantModel {
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int nakshatraIndex;
  final String nakshatraName;
  final int pada;
  final String nakshatraLord;

  const AscendantModel({
    required this.longitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    required this.nakshatraLord,
  });

  factory AscendantModel.fromJson(Map<String, dynamic> json) {
    return AscendantModel(
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      nakshatraLord: json['nakshatraLord'] as String? ?? '',
    );
  }
}

class HouseModel {
  final int houseNumber;
  final double startLongitude;
  final double cuspLongitude;
  final double endLongitude;
  final String rashiName;

  const HouseModel({
    required this.houseNumber,
    required this.startLongitude,
    required this.cuspLongitude,
    required this.endLongitude,
    required this.rashiName,
  });

  factory HouseModel.fromJson(Map<String, dynamic> json) {
    return HouseModel(
      houseNumber: (json['houseNumber'] as num?)?.toInt() ?? 1,
      startLongitude: (json['startLongitude'] as num?)?.toDouble() ?? 0.0,
      cuspLongitude: (json['cuspLongitude'] as num?)?.toDouble() ?? 0.0,
      endLongitude: (json['endLongitude'] as num?)?.toDouble() ?? 0.0,
      rashiName: json['rashiName'] as String? ?? '',
    );
  }
}

class AstroChartModel {
  final String calculationVersion;
  final String providerName;
  final String providerVersion;
  final NormalizedTimeModel normalizedTime;
  final ChartConfigModel config;
  final AscendantModel? ascendant;
  final List<PlanetModel> planets;
  final List<HouseModel> houses;

  const AstroChartModel({
    required this.calculationVersion,
    required this.providerName,
    required this.providerVersion,
    required this.normalizedTime,
    required this.config,
    this.ascendant,
    required this.planets,
    required this.houses,
  });

  factory AstroChartModel.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> chartMap = (json['chart'] is Map)
        ? Map<String, dynamic>.from(json['chart'] as Map)
        : json;

    return AstroChartModel(
      calculationVersion: chartMap['calculationVersion'] as String? ?? '0.1.0',
      providerName: chartMap['providerName'] as String? ?? '',
      providerVersion: chartMap['providerVersion'] as String? ?? '',
      normalizedTime: NormalizedTimeModel.fromJson(
        chartMap['normalizedTime'] is Map
            ? Map<String, dynamic>.from(chartMap['normalizedTime'] as Map)
            : {},
      ),
      config: ChartConfigModel.fromJson(
        chartMap['config'] is Map
            ? Map<String, dynamic>.from(chartMap['config'] as Map)
            : {},
      ),
      ascendant: chartMap['ascendant'] is Map
          ? AscendantModel.fromJson(Map<String, dynamic>.from(chartMap['ascendant'] as Map))
          : null,
      planets: (chartMap['planets'] as List? ?? [])
          .whereType<Map>()
          .map((p) => PlanetModel.fromJson(Map<String, dynamic>.from(p)))
          .toList(),
      houses: (chartMap['houses'] as List? ?? [])
          .whereType<Map>()
          .map((h) => HouseModel.fromJson(Map<String, dynamic>.from(h)))
          .toList(),
    );
  }
}
