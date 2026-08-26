import '../../astrology/models/astro_chart_model.dart';

class ReportProfileModel {
  final String name;
  final String dateOfBirth;
  final String timeOfBirth;
  final String? placeName;
  final String timezone;

  const ReportProfileModel({
    required this.name,
    required this.dateOfBirth,
    required this.timeOfBirth,
    this.placeName,
    required this.timezone,
  });

  factory ReportProfileModel.fromJson(Map<String, dynamic> json) {
    return ReportProfileModel(
      name: json['name'] as String? ?? 'User Profile',
      dateOfBirth: json['dateOfBirth'] as String? ?? '',
      timeOfBirth: json['timeOfBirth'] as String? ?? '',
      placeName: json['placeName'] as String?,
      timezone: json['timezone'] as String? ?? 'Asia/Kolkata',
    );
  }
}

class ReportConfigModel {
  final String zodiacType;
  final String ayanamsa;
  final String houseSystem;
  final String nodeCalculation;

  const ReportConfigModel({
    required this.zodiacType,
    required this.ayanamsa,
    required this.houseSystem,
    required this.nodeCalculation,
  });

  factory ReportConfigModel.fromJson(Map<String, dynamic> json) {
    return ReportConfigModel(
      zodiacType: json['zodiacType'] as String? ?? 'SIDEREAL',
      ayanamsa: json['ayanamsa'] as String? ?? 'LAHIRI',
      houseSystem: json['houseSystem'] as String? ?? 'WHOLE_SIGN',
      nodeCalculation: json['nodeCalculation'] as String? ?? 'MEAN_NODE',
    );
  }
}

class ReportAscendantModel {
  final String sign;
  final double degree;
  final String nakshatra;
  final int pada;

  const ReportAscendantModel({
    required this.sign,
    required this.degree,
    required this.nakshatra,
    required this.pada,
  });

  factory ReportAscendantModel.fromJson(Map<String, dynamic> json) {
    return ReportAscendantModel(
      sign: json['sign'] as String? ?? '',
      degree: (json['degree'] as num?)?.toDouble() ?? 0.0,
      nakshatra: json['nakshatra'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
    );
  }
}

class ReportPlanetModel {
  final String planet;
  final String sign;
  final double degree;
  final int house;
  final String nakshatra;
  final int pada;
  final bool isRetrograde;

  const ReportPlanetModel({
    required this.planet,
    required this.sign,
    required this.degree,
    required this.house,
    required this.nakshatra,
    required this.pada,
    required this.isRetrograde,
  });

  factory ReportPlanetModel.fromJson(Map<String, dynamic> json) {
    return ReportPlanetModel(
      planet: json['planet'] as String? ?? '',
      sign: json['sign'] as String? ?? '',
      degree: (json['degree'] as num?)?.toDouble() ?? 0.0,
      house: (json['house'] as num?)?.toInt() ?? 1,
      nakshatra: json['nakshatra'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      isRetrograde: json['isRetrograde'] as bool? ?? false,
    );
  }
}

class ReportHouseModel {
  final int houseNumber;
  final String sign;
  final List<String> planetsPresent;

  const ReportHouseModel({
    required this.houseNumber,
    required this.sign,
    required this.planetsPresent,
  });

  factory ReportHouseModel.fromJson(Map<String, dynamic> json) {
    return ReportHouseModel(
      houseNumber: (json['houseNumber'] as num?)?.toInt() ?? 1,
      sign: json['sign'] as String? ?? '',
      planetsPresent: (json['planetsPresent'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}

class ReportNakshatraModel {
  final String birthNakshatra;
  final int pada;
  final String rulingPlanet;
  final String associatedInfo;

  const ReportNakshatraModel({
    required this.birthNakshatra,
    required this.pada,
    required this.rulingPlanet,
    required this.associatedInfo,
  });

  factory ReportNakshatraModel.fromJson(Map<String, dynamic> json) {
    return ReportNakshatraModel(
      birthNakshatra: json['birthNakshatra'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      rulingPlanet: json['rulingPlanet'] as String? ?? '',
      associatedInfo: json['associatedInfo'] as String? ?? '',
    );
  }
}

class ReportSectionModel {
  final String id;
  final String title;
  final String type;
  final String content;
  final Map<String, String>? keyValues;
  final List<String>? listItems;

  const ReportSectionModel({
    required this.id,
    required this.title,
    required this.type,
    required this.content,
    this.keyValues,
    this.listItems,
  });

  factory ReportSectionModel.fromJson(Map<String, dynamic> json) {
    Map<String, String>? kv;
    if (json['keyValues'] is Map) {
      kv = (json['keyValues'] as Map).map(
        (key, value) => MapEntry(key.toString(), value.toString()),
      );
    }
    return ReportSectionModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      type: json['type'] as String? ?? 'TEXT',
      content: json['content'] as String? ?? '',
      keyValues: kv,
      listItems: (json['listItems'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
    );
  }
}

class ReportDataModel {
  final String version;
  final String type;
  final String title;
  final String generatedAt;
  final ReportProfileModel profile;
  final ReportConfigModel configuration;
  final ReportAscendantModel ascendant;
  final List<ReportPlanetModel> planets;
  final List<ReportHouseModel> houses;
  final ReportNakshatraModel nakshatra;
  final List<ReportSectionModel> sections;

  const ReportDataModel({
    required this.version,
    required this.type,
    required this.title,
    required this.generatedAt,
    required this.profile,
    required this.configuration,
    required this.ascendant,
    required this.planets,
    required this.houses,
    required this.nakshatra,
    required this.sections,
  });

  factory ReportDataModel.fromJson(Map<String, dynamic> json) {
    return ReportDataModel(
      version: json['version'] as String? ?? '1.0',
      type: json['type'] as String? ?? 'KUNDLI',
      title: json['title'] as String? ?? 'Kundli Report',
      generatedAt: json['generatedAt'] as String? ?? '',
      profile: ReportProfileModel.fromJson(json['profile'] as Map<String, dynamic>? ?? {}),
      configuration: ReportConfigModel.fromJson(json['configuration'] as Map<String, dynamic>? ?? {}),
      ascendant: ReportAscendantModel.fromJson(json['ascendant'] as Map<String, dynamic>? ?? {}),
      planets: (json['planets'] as List<dynamic>?)
              ?.map((p) => ReportPlanetModel.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      houses: (json['houses'] as List<dynamic>?)
              ?.map((h) => ReportHouseModel.fromJson(h as Map<String, dynamic>))
              .toList() ??
          [],
      nakshatra: ReportNakshatraModel.fromJson(json['nakshatra'] as Map<String, dynamic>? ?? {}),
      sections: (json['sections'] as List<dynamic>?)
              ?.map((s) => ReportSectionModel.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  /// Converts structured report data to AstroChartModel for KundliChartWidget visualization
  AstroChartModel toAstroChartModel() {
    int getRashiIndex(String sign) {
      const rashis = [
        'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
        'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'
      ];
      const englishRashis = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
      ];

      final clean = sign.trim();
      int idx = rashis.indexWhere((r) => r.toLowerCase() == clean.toLowerCase());
      if (idx != -1) return idx + 1;

      idx = englishRashis.indexWhere((r) => r.toLowerCase() == clean.toLowerCase());
      if (idx != -1) return idx + 1;

      return 1;
    }

    final ascRashiIdx = getRashiIndex(ascendant.sign);

    final mappedPlanets = planets.map((p) {
      final rIdx = getRashiIndex(p.sign);
      return PlanetModel(
        planet: p.planet,
        longitude: 0.0,
        latitude: 0.0,
        speedLongitude: 0.0,
        isRetrograde: p.isRetrograde,
        rashiIndex: rIdx,
        rashiName: p.sign,
        degreeInRashi: p.degree,
        nakshatraIndex: 1,
        nakshatraName: p.nakshatra,
        pada: p.pada,
        nakshatraLord: '',
      );
    }).toList();

    final mappedHouses = houses.map((h) {
      return HouseModel(
        houseNumber: h.houseNumber,
        startLongitude: 0.0,
        cuspLongitude: 0.0,
        endLongitude: 0.0,
        rashiName: h.sign,
      );
    }).toList();

    return AstroChartModel(
      calculationVersion: '1.0.0',
      providerName: 'Astro Sushil Report Engine',
      providerVersion: version,
      normalizedTime: const NormalizedTimeModel(
        utcIsoString: '',
        julianDayUT: 0.0,
        timezoneOffsetMinutes: 330,
      ),
      config: ChartConfigModel(
        zodiacType: configuration.zodiacType,
        ayanamsa: configuration.ayanamsa,
        houseSystem: configuration.houseSystem,
        nodeCalculation: configuration.nodeCalculation,
        planetaryCalculationMode: 'GEOCENTRIC',
      ),
      ascendant: AscendantModel(
        longitude: 0.0,
        rashiIndex: ascRashiIdx,
        rashiName: ascendant.sign,
        degreeInRashi: ascendant.degree,
        nakshatraIndex: 1,
        nakshatraName: ascendant.nakshatra,
        pada: ascendant.pada,
        nakshatraLord: '',
      ),
      planets: mappedPlanets,
      houses: mappedHouses,
    );
  }
}

class ReportResponseModel {
  final String id;
  final String userId;
  final String birthProfileId;
  final String reportType;
  final String status;
  final String version;
  final String createdAt;
  final ReportDataModel report;

  const ReportResponseModel({
    required this.id,
    required this.userId,
    required this.birthProfileId,
    required this.reportType,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.report,
  });

  factory ReportResponseModel.fromJson(Map<String, dynamic> json) {
    final reportData = json['report'] is Map<String, dynamic>
        ? json['report'] as Map<String, dynamic>
        : json;
    return ReportResponseModel(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      birthProfileId: json['birthProfileId'] as String? ?? '',
      reportType: json['reportType'] as String? ?? 'KUNDLI',
      status: json['status'] as String? ?? 'COMPLETED',
      version: json['version'] as String? ?? '1.0',
      createdAt: json['createdAt'] as String? ?? '',
      report: ReportDataModel.fromJson(reportData),
    );
  }
}
