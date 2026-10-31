/// Strongly typed models for AstroChart API response
library;

double _parseDouble(dynamic val, [double defaultValue = 0.0]) {
  if (val == null) return defaultValue;
  if (val is num) return val.toDouble();
  if (val is String) {
    return double.tryParse(val) ?? defaultValue;
  }
  return defaultValue;
}

int _parseInt(dynamic val, [int defaultValue = 1]) {
  if (val == null) return defaultValue;
  if (val is num) return val.toInt();
  if (val is String) {
    return int.tryParse(val) ?? defaultValue;
  }
  return defaultValue;
}

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
      utcIsoString: json['utcIsoString'] as String? ?? json['utc_iso_string'] as String? ?? '',
      julianDayUT: _parseDouble(json['julianDayUT'] ?? json['julian_day_ut']),
      timezoneOffsetMinutes: _parseInt(json['timezoneOffsetMinutes'] ?? json['timezone_offset_minutes'], 0),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'utcIsoString': utcIsoString,
      'julianDayUT': julianDayUT,
      'timezoneOffsetMinutes': timezoneOffsetMinutes,
    };
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
      zodiacType: json['zodiacType'] as String? ?? json['zodiac_type'] as String? ?? 'SIDEREAL',
      ayanamsa: json['ayanamsa'] as String? ?? 'LAHIRI',
      houseSystem: json['houseSystem'] as String? ?? json['house_system'] as String? ?? 'WHOLE_SIGN',
      nodeCalculation: json['nodeCalculation'] as String? ?? json['node_calculation'] as String? ?? 'MEAN_NODE',
      planetaryCalculationMode: json['planetaryCalculationMode'] as String? ?? json['planetary_calculation_mode'] as String? ?? 'GEOCENTRIC',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'zodiacType': zodiacType,
      'ayanamsa': ayanamsa,
      'houseSystem': houseSystem,
      'nodeCalculation': nodeCalculation,
      'planetaryCalculationMode': planetaryCalculationMode,
    };
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
  final String? dignity;

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
    this.dignity,
  });

  factory PlanetModel.fromJson(Map<String, dynamic> json) {
    final planetStr = json['planet'] as String? ??
        json['name'] as String? ??
        json['planetSymbol'] as String? ??
        json['symbol'] as String? ??
        json['id'] as String? ??
        json['code'] as String? ??
        json['planet_name'] as String? ??
        json['planetName'] as String? ??
        '';

    final rashiStr = json['rashiName'] as String? ??
        json['rashi'] as String? ??
        json['rashi_name'] as String? ??
        json['sign'] as String? ??
        json['signName'] as String? ??
        json['sign_name'] as String? ??
        '';

    final nakshatraStr = json['nakshatraName'] as String? ??
        json['nakshatra'] as String? ??
        json['nakshatra_name'] as String? ??
        '';

    final nakshatraLordStr = json['nakshatraLord'] as String? ??
        json['nakshatra_lord'] as String? ??
        json['lord'] as String? ??
        '';

    final parsedRashiIndex = _parseInt(
      json['rashiIndex'] ?? json['rashi_index'] ?? json['rashi'] ?? json['signIndex'] ?? json['sign_index'],
      1,
    );

    final parsedNakshatraIndex = _parseInt(
      json['nakshatraIndex'] ?? json['nakshatra_index'] ?? json['nakshatra'],
      1,
    );

    final parsedDegreeInRashi = _parseDouble(
      json['degreeInRashi'] ?? json['degree_in_rashi'] ?? json['degreeInSign'] ?? json['degree_in_sign'] ?? json['degree'] ?? json['degrees'],
      0.0,
    );

    const rashis = [
      'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
      'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'
    ];

    const nakshatras = [
      'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
      'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
      'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
      'Moola', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
      'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ];

    const nakshatraLords = [
      'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
    ];

    final effectiveRashiName = (rashiStr.isNotEmpty && rashiStr != 'N/A')
        ? rashiStr
        : (parsedRashiIndex >= 1 && parsedRashiIndex <= 12)
            ? rashis[parsedRashiIndex - 1]
            : 'N/A';

    final effectiveNakshatraName = (nakshatraStr.isNotEmpty && nakshatraStr != 'N/A')
        ? nakshatraStr
        : (parsedNakshatraIndex >= 1 && parsedNakshatraIndex <= 27)
            ? nakshatras[parsedNakshatraIndex - 1]
            : 'N/A';

    final effectiveNakshatraLord = (nakshatraLordStr.isNotEmpty && nakshatraLordStr != 'N/A')
        ? nakshatraLordStr
        : (parsedNakshatraIndex >= 1 && parsedNakshatraIndex <= 27)
            ? nakshatraLords[(parsedNakshatraIndex - 1) % 9]
            : 'N/A';

    final isRetro = json['isRetrograde'] is bool
        ? json['isRetrograde'] as bool
        : json['is_retrograde'] is bool
            ? json['is_retrograde'] as bool
            : (json['isRetrograde']?.toString().toLowerCase() == 'true' ||
                json['is_retrograde']?.toString().toLowerCase() == 'true');

    return PlanetModel(
      planet: planetStr,
      longitude: _parseDouble(json['longitude']),
      latitude: _parseDouble(json['latitude']),
      speedLongitude: _parseDouble(json['speedLongitude'] ?? json['speed_longitude']),
      isRetrograde: isRetro,
      rashiIndex: parsedRashiIndex,
      rashiName: effectiveRashiName,
      degreeInRashi: parsedDegreeInRashi,
      nakshatraIndex: parsedNakshatraIndex,
      nakshatraName: effectiveNakshatraName,
      pada: _parseInt(json['pada'], 1),
      nakshatraLord: effectiveNakshatraLord,
      dignity: json['dignity'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'planet': planet,
      'longitude': longitude,
      'latitude': latitude,
      'speedLongitude': speedLongitude,
      'isRetrograde': isRetrograde,
      'rashiIndex': rashiIndex,
      'rashiName': rashiName,
      'degreeInRashi': degreeInRashi,
      'nakshatraIndex': nakshatraIndex,
      'nakshatraName': nakshatraName,
      'pada': pada,
      'nakshatraLord': nakshatraLord,
      if (dignity != null) 'dignity': dignity,
    };
  }

  /// Format dignity to clean label (e.g. 'Exalted', 'Debilitated', 'Own Sign')
  String get formattedDignity {
    if (dignity == null || dignity!.isEmpty) return '';
    final d = dignity!.toUpperCase();
    switch (d) {
      case 'EXALTED': return 'Exalted';
      case 'DEBILITATED': return 'Debilitated';
      case 'OWN_SIGN': return 'Own Sign';
      case 'MOOLATRIKONA': return 'Moolatrikona';
      case 'GREAT_FRIEND': return 'Great Friend';
      case 'FRIEND': return 'Friendly';
      case 'NEUTRAL': return 'Neutral';
      case 'ENEMY': return 'Enemy';
      case 'GREAT_ENEMY': return 'Great Enemy';
      default: return dignity!;
    }
  }

  /// Format planet symbol to clean title-cased name
  String get displayName {
    final clean = planet.replaceAll('(R)', '').trim().toUpperCase();
    switch (clean) {
      case 'SUN': case 'SURYA': case 'SOORYA': return 'Sun';
      case 'MOON': case 'CHANDRA': return 'Moon';
      case 'MARS': case 'MANGAL': case 'KUJA': return 'Mars';
      case 'MERCURY': case 'BUDHA': return 'Mercury';
      case 'JUPITER': case 'GURU': case 'BRHASPATI': return 'Jupiter';
      case 'VENUS': case 'SHUKRA': return 'Venus';
      case 'SATURN': case 'SHANI': return 'Saturn';
      case 'RAHU': return 'Rahu';
      case 'KETU': return 'Ketu';
      default:
        if (clean.isEmpty) return 'Planet';
        return clean[0] + clean.substring(1).toLowerCase();
    }
  }

  String get displayNameWithRetro {
    return displayName + (isRetrograde ? ' (R)' : '');
  }

  /// Calculates Whole Sign House placement (1..12) given the Ascendant Rashi Index (1..12)
  int calculateHouseNumber(int ascendantRashiIndex) {
    return ((rashiIndex - ascendantRashiIndex + 12) % 12) + 1;
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
    final parsedRashiIndex = _parseInt(
      json['rashiIndex'] ?? json['rashi_index'] ?? json['rashi'] ?? json['signIndex'] ?? json['sign_index'],
      1,
    );

    final parsedNakshatraIndex = _parseInt(
      json['nakshatraIndex'] ?? json['nakshatra_index'] ?? json['nakshatra'],
      1,
    );

    final parsedDegreeInRashi = _parseDouble(
      json['degreeInRashi'] ?? json['degree_in_rashi'] ?? json['degreeInSign'] ?? json['degree_in_sign'] ?? json['degree'] ?? json['degrees'],
      0.0,
    );

    final rashiStr = json['rashiName'] as String? ?? json['rashi'] as String? ?? json['rashi_name'] as String? ?? json['sign'] as String? ?? json['signName'] as String? ?? '';
    final nakshatraStr = json['nakshatraName'] as String? ?? json['nakshatra'] as String? ?? json['nakshatra_name'] as String? ?? '';
    final nakshatraLordStr = json['nakshatraLord'] as String? ?? json['nakshatra_lord'] as String? ?? json['lord'] as String? ?? '';

    const rashis = [
      'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
      'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'
    ];

    const nakshatras = [
      'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
      'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
      'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
      'Moola', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
      'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ];

    const nakshatraLords = [
      'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
    ];

    final effectiveRashiName = (rashiStr.isNotEmpty && rashiStr != 'N/A')
        ? rashiStr
        : (parsedRashiIndex >= 1 && parsedRashiIndex <= 12)
            ? rashis[parsedRashiIndex - 1]
            : 'N/A';

    final effectiveNakshatraName = (nakshatraStr.isNotEmpty && nakshatraStr != 'N/A')
        ? nakshatraStr
        : (parsedNakshatraIndex >= 1 && parsedNakshatraIndex <= 27)
            ? nakshatras[parsedNakshatraIndex - 1]
            : 'N/A';

    final effectiveNakshatraLord = (nakshatraLordStr.isNotEmpty && nakshatraLordStr != 'N/A')
        ? nakshatraLordStr
        : (parsedNakshatraIndex >= 1 && parsedNakshatraIndex <= 27)
            ? nakshatraLords[(parsedNakshatraIndex - 1) % 9]
            : 'N/A';

    return AscendantModel(
      longitude: _parseDouble(json['longitude']),
      rashiIndex: parsedRashiIndex,
      rashiName: effectiveRashiName,
      degreeInRashi: parsedDegreeInRashi,
      nakshatraIndex: parsedNakshatraIndex,
      nakshatraName: effectiveNakshatraName,
      pada: _parseInt(json['pada'], 1),
      nakshatraLord: effectiveNakshatraLord,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'longitude': longitude,
      'rashiIndex': rashiIndex,
      'rashiName': rashiName,
      'degreeInRashi': degreeInRashi,
      'nakshatraIndex': nakshatraIndex,
      'nakshatraName': nakshatraName,
      'pada': pada,
      'nakshatraLord': nakshatraLord,
    };
  }
}

class HouseModel {
  final int houseNumber;
  final double startLongitude;
  final double cuspLongitude;
  final double endLongitude;
  final String rashiName;
  final String? lord;
  final int? rashiIndex;
  final List<String> occupants;

  const HouseModel({
    required this.houseNumber,
    required this.startLongitude,
    required this.cuspLongitude,
    required this.endLongitude,
    required this.rashiName,
    this.lord,
    this.rashiIndex,
    this.occupants = const [],
  });

  factory HouseModel.fromJson(Map<String, dynamic> json) {
    final rawNumber = _parseInt(
      json['houseNumber'] ?? json['house_number'] ?? json['house'] ?? json['number'],
      1,
    );
    final rawRashi = json['rashiName'] as String? ??
        json['rashi'] as String? ??
        json['rashi_name'] as String? ??
        json['sign'] as String? ??
        '';
    final rawLord = json['lord'] as String? ??
        json['rashiLord'] as String? ??
        json['rashi_lord'] as String?;
    final rawRashiIndex = json['rashiIndex'] != null
        ? _parseInt(json['rashiIndex'])
        : (json['rashi_index'] != null ? _parseInt(json['rashi_index']) : null);
    final rawOccupants = (json['occupants'] as List?)
            ?.map((e) => e.toString())
            .toList() ??
        const <String>[];

    return HouseModel(
      houseNumber: rawNumber,
      startLongitude: _parseDouble(json['startLongitude'] ?? json['start_longitude']),
      cuspLongitude: _parseDouble(json['cuspLongitude'] ?? json['cusp_longitude']),
      endLongitude: _parseDouble(json['endLongitude'] ?? json['end_longitude']),
      rashiName: rawRashi,
      lord: rawLord,
      rashiIndex: rawRashiIndex,
      occupants: rawOccupants,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'houseNumber': houseNumber,
      'startLongitude': startLongitude,
      'cuspLongitude': cuspLongitude,
      'endLongitude': endLongitude,
      'rashiName': rashiName,
      if (lord != null) 'lord': lord,
      if (rashiIndex != null) 'rashiIndex': rashiIndex,
      if (occupants.isNotEmpty) 'occupants': occupants,
    };
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
        : (json['data'] is Map)
            ? Map<String, dynamic>.from(json['data'] as Map)
            : json;

    final Map<String, dynamic> metadataMap = (chartMap['metadata'] is Map)
        ? Map<String, dynamic>.from(chartMap['metadata'] as Map)
        : (json['metadata'] is Map)
            ? Map<String, dynamic>.from(json['metadata'] as Map)
            : (json['data'] is Map && (json['data'] as Map)['metadata'] is Map)
                ? Map<String, dynamic>.from((json['data'] as Map)['metadata'] as Map)
                : {};

    List<dynamic> extractList(String key) {
      dynamic val;
      if (chartMap[key] != null) {
        val = chartMap[key];
      } else if (json['data'] is Map && (json['data'] as Map)[key] != null) {
        val = (json['data'] as Map)[key];
      } else if (json['chart'] is Map && (json['chart'] as Map)[key] != null) {
        val = (json['chart'] as Map)[key];
      } else if (json[key] != null) {
        val = json[key];
      }

      if (val is List && val.isNotEmpty) {
        return val;
      }

      if (val is Map && val.isNotEmpty) {
        return val.entries.map((e) {
          if (e.value is Map) {
            final mapVal = Map<String, dynamic>.from(e.value as Map);
            mapVal['planet'] ??= e.key.toString();
            mapVal['name'] ??= e.key.toString();
            return mapVal;
          }
          return e.value;
        }).toList();
      }

      return [];
    }

    final planetsList = extractList('planets');
    final housesList = extractList('houses');

    Map<String, dynamic>? extractAscendant() {
      if (chartMap['ascendant'] is Map) {
        return Map<String, dynamic>.from(chartMap['ascendant'] as Map);
      }
      if (json['data'] is Map && (json['data'] as Map)['ascendant'] is Map) {
        return Map<String, dynamic>.from((json['data'] as Map)['ascendant'] as Map);
      }
      if (json['chart'] is Map && (json['chart'] as Map)['ascendant'] is Map) {
        return Map<String, dynamic>.from((json['chart'] as Map)['ascendant'] as Map);
      }
      if (json['ascendant'] is Map) {
        return Map<String, dynamic>.from(json['ascendant'] as Map);
      }
      return null;
    }

    final rawAscendant = extractAscendant();

    return AstroChartModel(
      calculationVersion: chartMap['calculationVersion'] as String? ??
          metadataMap['calculationVersion'] as String? ??
          '0.1.0',
      providerName: chartMap['providerName'] as String? ??
          metadataMap['providerName'] as String? ??
          '',
      providerVersion: chartMap['providerVersion'] as String? ??
          metadataMap['providerVersion'] as String? ??
          '',
      normalizedTime: NormalizedTimeModel.fromJson(
        chartMap['normalizedTime'] is Map
            ? Map<String, dynamic>.from(chartMap['normalizedTime'] as Map)
            : metadataMap['normalizedTime'] is Map
                ? Map<String, dynamic>.from(metadataMap['normalizedTime'] as Map)
                : {},
      ),
      config: ChartConfigModel.fromJson(
        chartMap['config'] is Map
            ? Map<String, dynamic>.from(chartMap['config'] as Map)
            : metadataMap['config'] is Map
                ? Map<String, dynamic>.from(metadataMap['config'] as Map)
                : {},
      ),
      ascendant: rawAscendant != null ? AscendantModel.fromJson(rawAscendant) : null,
      planets: planetsList
          .whereType<Map>()
          .map((p) => PlanetModel.fromJson(Map<String, dynamic>.from(p)))
          .toList(),
      houses: housesList
          .whereType<Map>()
          .map((h) => HouseModel.fromJson(Map<String, dynamic>.from(h)))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'calculationVersion': calculationVersion,
      'providerName': providerName,
      'providerVersion': providerVersion,
      'normalizedTime': normalizedTime.toJson(),
      'config': config.toJson(),
      if (ascendant != null) 'ascendant': ascendant!.toJson(),
      'planets': planets.map((p) => p.toJson()).toList(),
      'houses': houses.map((h) => h.toJson()).toList(),
    };
  }
}

