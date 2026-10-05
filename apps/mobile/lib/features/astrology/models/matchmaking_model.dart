/// Strongly typed domain models for Kundli Matchmaking (Ashtakoota Guna Milan & Manglik Comparison).
/// Evaluated deterministically via Fastify backend POST /api/v1/astrology/matchmaking.

class MatchmakingReportModel {
  final String calculationVersion;
  final MatchmakingConventionModel convention;
  final DerivedMoonProfileModel personA;
  final DerivedMoonProfileModel personB;
  final AshtakootaReportModel ashtakoota;
  final ManglikComparisonModel manglikComparison;
  final MatchmakingSummaryModel overallSummary;
  final String? overallVerdict;

  const MatchmakingReportModel({
    required this.calculationVersion,
    required this.convention,
    required this.personA,
    required this.personB,
    required this.ashtakoota,
    required this.manglikComparison,
    required this.overallSummary,
    this.overallVerdict,
  });

  factory MatchmakingReportModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? json['data'] as Map : json;
    final root = data['compatibility'] is Map
        ? Map<String, dynamic>.from(data['compatibility'] as Map)
        : Map<String, dynamic>.from(data);

    return MatchmakingReportModel(
      calculationVersion: root['calculationVersion'] as String? ?? '0.1.0',
      convention: MatchmakingConventionModel.fromJson(
        root['convention'] is Map ? Map<String, dynamic>.from(root['convention'] as Map) : {},
      ),
      personA: DerivedMoonProfileModel.fromJson(
        root['personA'] is Map
            ? Map<String, dynamic>.from(root['personA'] as Map)
            : (root['boy'] is Map ? Map<String, dynamic>.from(root['boy'] as Map) : {}),
      ),
      personB: DerivedMoonProfileModel.fromJson(
        root['personB'] is Map
            ? Map<String, dynamic>.from(root['personB'] as Map)
            : (root['girl'] is Map ? Map<String, dynamic>.from(root['girl'] as Map) : {}),
      ),
      ashtakoota: AshtakootaReportModel.fromJson(
        root['ashtakoota'] is Map ? Map<String, dynamic>.from(root['ashtakoota'] as Map) : {},
      ),
      manglikComparison: ManglikComparisonModel.fromJson(
        root['manglikComparison'] is Map
            ? Map<String, dynamic>.from(root['manglikComparison'] as Map)
            : {},
      ),
      overallSummary: MatchmakingSummaryModel.fromJson(
        root['overallSummary'] is Map
            ? Map<String, dynamic>.from(root['overallSummary'] as Map)
            : {},
      ),
      overallVerdict: json['overallVerdict'] as String? ?? root['overallVerdict'] as String?,
    );
  }

  double get totalScore => ashtakoota.totalObtainedPoints;
  double get maxScore => ashtakoota.totalMaxPoints;
  bool get isCompatible => ashtakoota.isCompatible;
}

class MatchmakingConventionModel {
  final String name;
  final String description;
  final double totalMaxScore;
  final String ayanamsa;
  final String zodiac;

  const MatchmakingConventionModel({
    required this.name,
    required this.description,
    required this.totalMaxScore,
    required this.ayanamsa,
    required this.zodiac,
  });

  factory MatchmakingConventionModel.fromJson(Map<String, dynamic> json) {
    return MatchmakingConventionModel(
      name: json['name'] as String? ?? 'Classical Parashari Ashtakoota Milan',
      description: json['description'] as String? ?? '',
      totalMaxScore: (json['totalMaxScore'] as num?)?.toDouble() ?? 36.0,
      ayanamsa: json['ayanamsa'] as String? ?? 'LAHIRI',
      zodiac: json['zodiac'] as String? ?? 'SIDEREAL',
    );
  }
}

class DerivedMoonProfileModel {
  final String personLabel;
  final double moonLongitude;
  final int rashiIndex;
  final String rashiName;
  final String rashiLord;
  final int nakshatraIndex;
  final String nakshatraName;
  final int pada;
  final String nakshatraLord;
  final String varna;
  final int varnaRank;
  final String vashya;
  final String gana;
  final String yoniAnimal;
  final String yoniGender;
  final String nadi;

  const DerivedMoonProfileModel({
    required this.personLabel,
    required this.moonLongitude,
    required this.rashiIndex,
    required this.rashiName,
    required this.rashiLord,
    required this.nakshatraIndex,
    required this.nakshatraName,
    required this.pada,
    required this.nakshatraLord,
    required this.varna,
    required this.varnaRank,
    required this.vashya,
    required this.gana,
    required this.yoniAnimal,
    required this.yoniGender,
    required this.nadi,
  });

  factory DerivedMoonProfileModel.fromJson(Map<String, dynamic> json) {
    final yoniMap = json['yoni'] is Map ? Map<String, dynamic>.from(json['yoni'] as Map) : {};

    return DerivedMoonProfileModel(
      personLabel: json['personLabel'] as String? ?? 'Person',
      moonLongitude: (json['moonLongitude'] as num?)?.toDouble() ?? 0.0,
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? '',
      rashiLord: json['rashiLord'] as String? ?? '',
      nakshatraIndex: (json['nakshatraIndex'] as num?)?.toInt() ?? 1,
      nakshatraName: json['nakshatraName'] as String? ?? '',
      pada: (json['pada'] as num?)?.toInt() ?? 1,
      nakshatraLord: json['nakshatraLord'] as String? ?? '',
      varna: json['varna'] as String? ?? '',
      varnaRank: (json['varnaRank'] as num?)?.toInt() ?? 1,
      vashya: json['vashya'] as String? ?? '',
      gana: json['gana'] as String? ?? '',
      yoniAnimal: yoniMap['animal'] as String? ?? (json['yoniAnimal'] as String? ?? ''),
      yoniGender: yoniMap['gender'] as String? ?? (json['yoniGender'] as String? ?? ''),
      nadi: json['nadi'] as String? ?? '',
    );
  }
}

class AshtakootaReportModel {
  final double totalMaxPoints;
  final double totalObtainedPoints;
  final bool isCompatible;
  final List<IndividualKootaModel> kootaList;

  const AshtakootaReportModel({
    required this.totalMaxPoints,
    required this.totalObtainedPoints,
    required this.isCompatible,
    required this.kootaList,
  });

  factory AshtakootaReportModel.fromJson(Map<String, dynamic> json) {
    final kootasMap = json['kootas'] is Map ? Map<String, dynamic>.from(json['kootas'] as Map) : {};
    final List<IndividualKootaModel> list = [];

    // Order of 8 classical Kootas: Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi
    final keys = ['varna', 'vashya', 'tara', 'yoni', 'grahaMaitri', 'gana', 'bhakoot', 'nadi'];
    for (final key in keys) {
      if (kootasMap.containsKey(key) && kootasMap[key] is Map) {
        list.add(IndividualKootaModel.fromJson(Map<String, dynamic>.from(kootasMap[key] as Map), key));
      }
    }

    return AshtakootaReportModel(
      totalMaxPoints: (json['totalMaxPoints'] as num?)?.toDouble() ?? 36.0,
      totalObtainedPoints: (json['totalObtainedPoints'] as num?)?.toDouble() ?? 0.0,
      isCompatible: json['isCompatible'] as bool? ?? false,
      kootaList: list,
    );
  }

  IndividualKootaModel? getKoota(String name) =>
      kootaList.where((k) => k.name.toLowerCase() == name.toLowerCase() || k.key.toLowerCase() == name.toLowerCase()).firstOrNull;
}

class IndividualKootaModel {
  final String key;
  final String name;
  final String sanskritName;
  final double maxPoints;
  final double obtainedPoints;
  final String description;
  final bool isSymmetric;
  final Map<String, dynamic> evidence;
  final bool isDoshaCancelled;
  final String? cancellationReason;

  const IndividualKootaModel({
    required this.key,
    required this.name,
    required this.sanskritName,
    required this.maxPoints,
    required this.obtainedPoints,
    required this.description,
    required this.isSymmetric,
    required this.evidence,
    this.isDoshaCancelled = false,
    this.cancellationReason,
  });

  factory IndividualKootaModel.fromJson(Map<String, dynamic> json, [String fallbackKey = '']) {
    return IndividualKootaModel(
      key: fallbackKey.isNotEmpty ? fallbackKey : (json['name'] as String? ?? '').toLowerCase(),
      name: json['name'] as String? ?? fallbackKey,
      sanskritName: json['sanskritName'] as String? ?? '',
      maxPoints: (json['maxPoints'] as num?)?.toDouble() ?? 0.0,
      obtainedPoints: (json['obtainedPoints'] as num?)?.toDouble() ?? 0.0,
      description: json['description'] as String? ?? '',
      isSymmetric: json['isSymmetric'] as bool? ?? true,
      evidence: json['evidence'] is Map ? Map<String, dynamic>.from(json['evidence'] as Map) : {},
      isDoshaCancelled: json['isDoshaCancelled'] as bool? ?? false,
      cancellationReason: json['cancellationReason'] as String?,
    );
  }

  bool get isFullScore => obtainedPoints >= maxPoints && maxPoints > 0;
  bool get isZeroScore => obtainedPoints == 0.0;
  String get scoreFormatted => '${obtainedPoints.toStringAsFixed(obtainedPoints % 1 == 0 ? 0 : 1)} / ${maxPoints.toInt()}';
}

class ManglikComparisonModel {
  final ManglikStatusModel personA;
  final ManglikStatusModel personB;
  final String verdict; // BOTH_NON_MANGLIK, BOTH_MANGLIK, MANGLIK_MISMATCH
  final bool isDoshaCancelledByMatch;
  final String explanation;

  const ManglikComparisonModel({
    required this.personA,
    required this.personB,
    required this.verdict,
    required this.isDoshaCancelledByMatch,
    required this.explanation,
  });

  factory ManglikComparisonModel.fromJson(Map<String, dynamic> json) {
    return ManglikComparisonModel(
      personA: ManglikStatusModel.fromJson(
        json['personA'] is Map
            ? Map<String, dynamic>.from(json['personA'] as Map)
            : (json['boy'] is Map ? Map<String, dynamic>.from(json['boy'] as Map) : {}),
      ),
      personB: ManglikStatusModel.fromJson(
        json['personB'] is Map
            ? Map<String, dynamic>.from(json['personB'] as Map)
            : (json['girl'] is Map ? Map<String, dynamic>.from(json['girl'] as Map) : {}),
      ),
      verdict: json['verdict'] as String? ?? 'BOTH_NON_MANGLIK',
      isDoshaCancelledByMatch: json['isDoshaCancelledByMatch'] as bool? ?? false,
      explanation: json['explanation'] as String? ?? '',
    );
  }

  bool get isHarmonious => verdict != 'MANGLIK_MISMATCH' || isDoshaCancelledByMatch;
}

class ManglikStatusModel {
  final bool isManglik;
  final String severity; // NONE, LOW, MEDIUM, HIGH
  final List<String> cancellationFactors;
  final bool isCancelled;
  final bool effectiveManglik;
  final int houseFromLagna;
  final int houseFromMoon;

  const ManglikStatusModel({
    required this.isManglik,
    required this.severity,
    required this.cancellationFactors,
    required this.isCancelled,
    required this.effectiveManglik,
    required this.houseFromLagna,
    required this.houseFromMoon,
  });

  factory ManglikStatusModel.fromJson(Map<String, dynamic> json) {
    final marsMap = json['marsPlacement'] is Map ? Map<String, dynamic>.from(json['marsPlacement'] as Map) : {};

    return ManglikStatusModel(
      isManglik: json['isManglik'] as bool? ?? false,
      severity: json['severity'] as String? ?? 'NONE',
      cancellationFactors: (json['cancellationFactors'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      isCancelled: json['isCancelled'] as bool? ?? false,
      effectiveManglik: json['effectiveManglik'] as bool? ?? false,
      houseFromLagna: (marsMap['houseFromLagna'] as num?)?.toInt() ?? 1,
      houseFromMoon: (marsMap['houseFromMoon'] as num?)?.toInt() ?? 1,
    );
  }
}

class MatchmakingSummaryModel {
  final double totalScore;
  final double maxScore;
  final bool isAshtakootaCompatible;
  final String manglikVerdict;

  const MatchmakingSummaryModel({
    required this.totalScore,
    required this.maxScore,
    required this.isAshtakootaCompatible,
    required this.manglikVerdict,
  });

  factory MatchmakingSummaryModel.fromJson(Map<String, dynamic> json) {
    return MatchmakingSummaryModel(
      totalScore: (json['totalScore'] as num?)?.toDouble() ?? 0.0,
      maxScore: (json['maxScore'] as num?)?.toDouble() ?? 36.0,
      isAshtakootaCompatible: json['isAshtakootaCompatible'] as bool? ?? false,
      manglikVerdict: json['manglikVerdict'] as String? ?? 'BOTH_NON_MANGLIK',
    );
  }
}
