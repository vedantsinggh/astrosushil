/// Strongly typed domain models for Prashna (Horary) Astrology.
/// Evaluated deterministically via Fastify backend POST /api/v1/astrology/prashna.
class PrashnaChartModel {
  final String calculationVersion;
  final PrashnaTimeDetailsModel questionTime;
  final PrashnaLocationModel location;
  final String? questionText;
  final PrashnaLagnaModel prashnaLagna;
  final Map<String, PrashnaPlanetModel> planets;
  final List<PrashnaHouseModel> houses;
  final PrashnaMoonModel moon;
  final PrashnaSphutasModel sphutas;
  final PrashnaNumberDetailsModel? questionNumberDetails;
  final bool isRahuKala;
  final PrashnaPanchangaModel? panchanga;

  const PrashnaChartModel({
    required this.calculationVersion,
    required this.questionTime,
    required this.location,
    this.questionText,
    required this.prashnaLagna,
    required this.planets,
    required this.houses,
    required this.moon,
    required this.sphutas,
    this.questionNumberDetails,
    required this.isRahuKala,
    this.panchanga,
  });

  factory PrashnaChartModel.fromJson(Map<String, dynamic> json) {
    final rawPlanets = json['planets'] as Map<String, dynamic>? ?? {};
    final parsedPlanets = rawPlanets.map((key, value) =>
        MapEntry(key, PrashnaPlanetModel.fromJson(value as Map<String, dynamic>)));

    return PrashnaChartModel(
      calculationVersion: json['calculationVersion'] as String? ?? '1.1.0',
      questionTime: PrashnaTimeDetailsModel.fromJson(
          json['questionTime'] as Map<String, dynamic>? ?? {}),
      location: PrashnaLocationModel.fromJson(
          json['location'] as Map<String, dynamic>? ?? {}),
      questionText: json['questionText'] as String?,
      prashnaLagna: PrashnaLagnaModel.fromJson(
          json['prashnaLagna'] as Map<String, dynamic>? ?? {}),
      planets: parsedPlanets,
      houses: (json['houses'] as List<dynamic>?)
              ?.map((e) => PrashnaHouseModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      moon: PrashnaMoonModel.fromJson(
          json['moon'] as Map<String, dynamic>? ?? {}),
      sphutas: PrashnaSphutasModel.fromJson(
          json['sphutas'] as Map<String, dynamic>? ?? {}),
      questionNumberDetails: json['questionNumberDetails'] != null
          ? PrashnaNumberDetailsModel.fromJson(
              json['questionNumberDetails'] as Map<String, dynamic>)
          : null,
      isRahuKala: json['isRahuKala'] as bool? ?? false,
      panchanga: json['panchanga'] != null
          ? PrashnaPanchangaModel.fromJson(json['panchanga'] as Map<String, dynamic>)
          : null,
    );
  }

  PrashnaTimeDetailsModel get timeDetails => questionTime;
  PrashnaMoonModel get chandra => moon;
}

class PrashnaPanchangaModel {
  final String tithiName;
  final String varaName;
  final String nakshatraName;
  final String yogaName;
  final String karanaName;
  final bool isRahuKala;

  const PrashnaPanchangaModel({
    required this.tithiName,
    required this.varaName,
    required this.nakshatraName,
    required this.yogaName,
    required this.karanaName,
    required this.isRahuKala,
  });

  factory PrashnaPanchangaModel.fromJson(Map<String, dynamic> json) {
    return PrashnaPanchangaModel(
      tithiName: json['tithiName'] as String? ?? 'Shukla Pratipada',
      varaName: json['varaName'] as String? ?? 'Sunday',
      nakshatraName: json['nakshatraName'] as String? ?? 'Ashwini',
      yogaName: json['yogaName'] as String? ?? 'Vishkambha',
      karanaName: json['karanaName'] as String? ?? 'Bava',
      isRahuKala: json['isRahuKala'] as bool? ?? false,
    );
  }
}

class PrashnaTimeDetailsModel {
  final String utcIso;
  final String localIso;
  final String timezone;
  final double julianDayUT;

  const PrashnaTimeDetailsModel({
    required this.utcIso,
    required this.localIso,
    required this.timezone,
    required this.julianDayUT,
  });

  factory PrashnaTimeDetailsModel.fromJson(Map<String, dynamic> json) {
    return PrashnaTimeDetailsModel(
      utcIso: json['utcIso'] as String? ?? '',
      localIso: json['localIso'] as String? ?? '',
      timezone: json['timezone'] as String? ?? 'UTC',
      julianDayUT: (json['julianDayUT'] as num?)?.toDouble() ?? 0.0,
    );
  }

  String get formattedLocalTime => localIso.isNotEmpty ? localIso : utcIso;
}

class PrashnaLocationModel {
  final double latitude;
  final double longitude;
  final String timezone;
  final String placeName;

  const PrashnaLocationModel({
    required this.latitude,
    required this.longitude,
    required this.timezone,
    required this.placeName,
  });

  factory PrashnaLocationModel.fromJson(Map<String, dynamic> json) {
    return PrashnaLocationModel(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      timezone: json['timezone'] as String? ?? 'UTC',
      placeName: json['placeName'] as String? ?? '',
    );
  }
}

class PrashnaLagnaModel {
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int nakshatraIndex;
  final String nakshatraName;
  final int pada;
  final String nakshatraLord;
  final String lord;

  const PrashnaLagnaModel({
    required this.longitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    required this.nakshatraLord,
    required this.lord,
  });

  factory PrashnaLagnaModel.fromJson(Map<String, dynamic> json) {
    return PrashnaLagnaModel(
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      nakshatraLord: json['nakshatraLord'] as String? ?? '',
      lord: json['lord'] as String? ?? '',
    );
  }

  String get formattedDegree => '${degreeInRashi.toStringAsFixed(2)}°';
}

class PrashnaPlanetModel {
  final String planet;
  final double longitude;
  final bool isRetrograde;
  final double speedLongitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int house;
  final bool isCombust;

  const PrashnaPlanetModel({
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

  factory PrashnaPlanetModel.fromJson(Map<String, dynamic> json) {
    return PrashnaPlanetModel(
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

  String get formattedDegree => '${degreeInRashi.toStringAsFixed(2)}°';
}

class PrashnaHouseModel {
  final int houseNumber;
  final double cuspLongitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final String lord;
  final List<String> occupantPlanets;

  const PrashnaHouseModel({
    required this.houseNumber,
    required this.cuspLongitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.lord,
    required this.occupantPlanets,
  });

  factory PrashnaHouseModel.fromJson(Map<String, dynamic> json) {
    return PrashnaHouseModel(
      houseNumber: (json['houseNumber'] as num?)?.toInt() ?? 1,
      cuspLongitude: (json['cuspLongitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      lord: json['lord'] as String? ?? '',
      occupantPlanets: (json['occupantPlanets'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}

class PrashnaMoonModel {
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int nakshatraIndex;
  final String nakshatraName;
  final int pada;
  final String nakshatraLord;
  final String lord;
  final int house;

  const PrashnaMoonModel({
    required this.longitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    required this.nakshatraLord,
    required this.lord,
    required this.house,
  });

  factory PrashnaMoonModel.fromJson(Map<String, dynamic> json) {
    return PrashnaMoonModel(
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      nakshatraLord: json['nakshatraLord'] as String? ?? '',
      lord: json['lord'] as String? ?? '',
      house: (json['house'] as num?)?.toInt() ?? 1,
    );
  }

  String get formattedDegree => '${degreeInRashi.toStringAsFixed(2)}°';
}

class SphutaPointModel {
  final String name;
  final String sanskritName;
  final double longitude;
  final int rashiIndex;
  final String rashiName;
  final double degreeInRashi;
  final int house;
  final String nakshatraName;
  final int pada;
  final String nakshatraLord;
  final String formula;

  const SphutaPointModel({
    required this.name,
    required this.sanskritName,
    required this.longitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.degreeInRashi,
    required this.house,
    required this.nakshatraName,
    required this.pada,
    required this.nakshatraLord,
    required this.formula,
  });

  factory SphutaPointModel.fromJson(Map<String, dynamic> json) {
    return SphutaPointModel(
      name: json['name'] as String? ?? '',
      sanskritName: json['sanskritName'] as String? ?? '',
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      degreeInRashi: (json['degreeInRashi'] as num?)?.toDouble() ?? 0.0,
      house: (json['house'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      nakshatraLord: json['nakshatraLord'] as String? ?? '',
      formula: json['formula'] as String? ?? '',
    );
  }

  String get formattedDegree => '${degreeInRashi.toStringAsFixed(2)}°';
}

class PrashnaSphutasModel {
  final SphutaPointModel gulika;
  final SphutaPointModel trisphuta;
  final SphutaPointModel chatusphuta;
  final SphutaPointModel panchasphuta;

  const PrashnaSphutasModel({
    required this.gulika,
    required this.trisphuta,
    required this.chatusphuta,
    required this.panchasphuta,
  });

  factory PrashnaSphutasModel.fromJson(Map<String, dynamic> json) {
    return PrashnaSphutasModel(
      gulika: SphutaPointModel.fromJson(json['gulika'] as Map<String, dynamic>? ?? {}),
      trisphuta: SphutaPointModel.fromJson(json['trisphuta'] as Map<String, dynamic>? ?? {}),
      chatusphuta: SphutaPointModel.fromJson(json['chatusphuta'] as Map<String, dynamic>? ?? {}),
      panchasphuta: SphutaPointModel.fromJson(json['panchasphuta'] as Map<String, dynamic>? ?? {}),
    );
  }
}

class PrashnaNumberDetailsModel {
  final String system;
  final int number;
  final String rashiName;
  final String? signLord;
  final String? starLord;
  final String? subLord;
  final String description;

  const PrashnaNumberDetailsModel({
    required this.system,
    required this.number,
    required this.rashiName,
    this.signLord,
    this.starLord,
    this.subLord,
    required this.description,
  });

  factory PrashnaNumberDetailsModel.fromJson(Map<String, dynamic> json) {
    return PrashnaNumberDetailsModel(
      system: json['system'] as String? ?? '',
      number: (json['number'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      signLord: json['signLord'] as String?,
      starLord: json['starLord'] as String?,
      subLord: json['subLord'] as String?,
      description: json['description'] as String? ?? '',
    );
  }
}
