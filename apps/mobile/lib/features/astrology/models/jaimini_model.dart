/// Strongly typed domain models for Jaimini Astrology.
/// Evaluated deterministically via Fastify backend POST /api/v1/astrology/jaimini.
class JaiminiReportModel {
  final String scheme;
  final List<CharaKarakaDetailModel> charaKarakas;
  final List<ArudhaPadaPlacementModel> arudhaPadas;
  final ArudhaPadaPlacementModel? arudhaLagna;
  final ArudhaPadaPlacementModel? upapadaLagna;
  final ArudhaPadaPlacementModel? darapada;
  final List<RashiDrishtiDetailModel> rashiDrishtis;
  final List<ArgalaDetailModel> argalas;
  final KarakamshaReportModel? karakamsha;

  const JaiminiReportModel({
    required this.scheme,
    required this.charaKarakas,
    required this.arudhaPadas,
    this.arudhaLagna,
    this.upapadaLagna,
    this.darapada,
    required this.rashiDrishtis,
    required this.argalas,
    this.karakamsha,
  });

  factory JaiminiReportModel.fromJson(Map<String, dynamic> json) {
    final root = json['data'] is Map
        ? Map<String, dynamic>.from(json['data'] as Map)
        : json;

    return JaiminiReportModel(
      scheme: root['scheme'] as String? ?? 'SEVEN_KARAKA',
      charaKarakas: (root['charaKarakas'] as List? ?? [])
          .whereType<Map>()
          .map((e) => CharaKarakaDetailModel.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      arudhaPadas: (root['arudhaPadas'] as List? ?? [])
          .whereType<Map>()
          .map((e) => ArudhaPadaPlacementModel.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      arudhaLagna: root['arudhaLagna'] is Map
          ? ArudhaPadaPlacementModel.fromJson(Map<String, dynamic>.from(root['arudhaLagna'] as Map))
          : null,
      upapadaLagna: root['upapadaLagna'] is Map
          ? ArudhaPadaPlacementModel.fromJson(Map<String, dynamic>.from(root['upapadaLagna'] as Map))
          : null,
      darapada: root['darapada'] is Map
          ? ArudhaPadaPlacementModel.fromJson(Map<String, dynamic>.from(root['darapada'] as Map))
          : null,
      rashiDrishtis: (root['rashiDrishtis'] as List? ?? [])
          .whereType<Map>()
          .map((e) => RashiDrishtiDetailModel.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      argalas: (root['argalas'] as List? ?? [])
          .whereType<Map>()
          .map((e) => ArgalaDetailModel.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      karakamsha: root['karakamsha'] is Map
          ? KarakamshaReportModel.fromJson(Map<String, dynamic>.from(root['karakamsha'] as Map))
          : null,
    );
  }

  CharaKarakaDetailModel? get atmakaraka =>
      charaKarakas.where((k) => k.roleCode == 'AK').firstOrNull;

  CharaKarakaDetailModel? get amatyakaraka =>
      charaKarakas.where((k) => k.roleCode == 'AmK').firstOrNull;

  CharaKarakaDetailModel? get darakaraka =>
      charaKarakas.where((k) => k.roleCode == 'DK').firstOrNull;
}

class CharaKarakaDetailModel {
  final String planet;
  final String code; // AK, AmK, BK, MK, PK, GK, DK
  final String name;
  final String sanskritName;
  final String significance;
  final int rank;
  final double degreeInSign;
  final String? rashi;
  final String? nakshatra;
  final int? padaIndex;

  const CharaKarakaDetailModel({
    required this.planet,
    required this.code,
    required this.name,
    required this.sanskritName,
    required this.significance,
    required this.rank,
    required this.degreeInSign,
    this.rashi,
    this.nakshatra,
    this.padaIndex,
  });

  factory CharaKarakaDetailModel.fromJson(Map<String, dynamic> json) {
    return CharaKarakaDetailModel(
      planet: json['planet'] as String? ?? '',
      code: (json['roleCode'] ?? json['code'] ?? '') as String,
      name: (json['roleName'] ?? json['name'] ?? '') as String,
      sanskritName: json['sanskritName'] as String? ?? '',
      significance: json['significance'] as String? ?? '',
      rank: (json['rank'] as num?)?.toInt() ?? 0,
      degreeInSign: ((json['degreeInRashi'] ?? json['degreeInSign']) as num?)?.toDouble() ?? 0.0,
      rashi: json['rashiName'] as String?,
      nakshatra: json['nakshatraName'] as String?,
      padaIndex: (json['pada'] as num?)?.toInt(),
    );
  }

  String get roleCode => code;
  String get roleName => name.isNotEmpty ? name : code;
  String get formattedDegree => '${degreeInSign.toStringAsFixed(2)}°';
  String get rashiName => rashi ?? '';
  String get nakshatraName => nakshatra ?? '';
  int get pada => padaIndex ?? 1;
}

class ArudhaPadaPlacementModel {
  final int houseNumber;
  final String code; // AL, A1..A12, UL
  final String name;
  final int signIndex;
  final String signName;
  final String lord;
  final int lordSignIndex;
  final int stepsCount;
  final String exceptionApplied;
  final List<String> occupants;

  const ArudhaPadaPlacementModel({
    required this.houseNumber,
    required this.code,
    required this.name,
    required this.signIndex,
    required this.signName,
    required this.lord,
    required this.lordSignIndex,
    required this.stepsCount,
    required this.exceptionApplied,
    required this.occupants,
  });

  factory ArudhaPadaPlacementModel.fromJson(Map<String, dynamic> json) {
    return ArudhaPadaPlacementModel(
      houseNumber: (json['house'] ?? json['houseNumber'] as num?)?.toInt() ?? 1,
      code: (json['padaCode'] ?? json['code'] ?? '') as String,
      name: json['name'] as String? ?? '',
      signIndex: (json['rashiIndex'] ?? json['signIndex'] as num?)?.toInt() ?? 1,
      signName: (json['rashiName'] ?? json['signName'] ?? '') as String,
      lord: json['lord'] as String? ?? '',
      lordSignIndex: (json['sourceLordSign'] ?? json['lordSignIndex'] as num?)?.toInt() ?? 1,
      stepsCount: (json['signOffset'] ?? json['stepsCount'] as num?)?.toInt() ?? 0,
      exceptionApplied: json['exceptionApplied'] as String? ?? 'NONE',
      occupants: (json['occupants'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }

  String get padaCode => code;
  int get house => houseNumber;
  String get rashiName => signName;
  int get signOffset => stepsCount;
}

class RashiDrishtiDetailModel {
  final int sourceSignIndex;
  final String sourceSignName;
  final String modality; // CHARA, STHIRA, DVISVABHAVA
  final List<String> aspectedSigns;
  final List<String> planetsInSignList;
  final List<String> aspectedPlanetsList;

  const RashiDrishtiDetailModel({
    required this.sourceSignIndex,
    required this.sourceSignName,
    required this.modality,
    required this.aspectedSigns,
    this.planetsInSignList = const [],
    this.aspectedPlanetsList = const [],
  });

  factory RashiDrishtiDetailModel.fromJson(Map<String, dynamic> json) {
    List<String> signs = [];
    if (json['aspectedSigns'] is List) {
      signs = (json['aspectedSigns'] as List).map((e) {
        if (e is Map) return e['signName']?.toString() ?? '';
        return e.toString();
      }).toList();
    }
    return RashiDrishtiDetailModel(
      sourceSignIndex: (json['rashiIndex'] ?? json['sourceSignIndex'] as num?)?.toInt() ?? 1,
      sourceSignName: (json['rashiName'] ?? json['sourceSignName'] ?? '') as String,
      modality: json['modality'] as String? ?? '',
      aspectedSigns: signs,
      planetsInSignList: (json['planetsInSign'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      aspectedPlanetsList: (json['aspectedPlanets'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }

  String get rashiName => sourceSignName;
  List<String> get planetsInSign => planetsInSignList;
  List<String> get aspectedPlanets => aspectedPlanetsList;
}

class ArgalaDetailModel {
  final int houseNumber;
  final int targetSignIndex;
  final String targetSign;
  final String argalaType; // PRIMARY, SECONDARY, SHUBHA, PAPA, NONE
  final bool isObstructed;
  final double netArgalaScore;
  final List<String> argalaPlanets;
  final List<String> obstructionPlanets;
  final int obstructionHouse;

  const ArgalaDetailModel({
    required this.houseNumber,
    required this.targetSignIndex,
    required this.targetSign,
    required this.argalaType,
    required this.isObstructed,
    required this.netArgalaScore,
    this.argalaPlanets = const [],
    this.obstructionPlanets = const [],
    this.obstructionHouse = 0,
  });

  factory ArgalaDetailModel.fromJson(Map<String, dynamic> json) {
    return ArgalaDetailModel(
      houseNumber: (json['argalaHouse'] ?? json['houseNumber'] as num?)?.toInt() ?? 1,
      targetSignIndex: (json['targetSignIndex'] as num?)?.toInt() ?? 1,
      targetSign: json['targetSign'] as String? ?? 'Sign ${json['targetSignIndex'] ?? 1}',
      argalaType: json['argalaType'] as String? ?? 'PRIMARY',
      isObstructed: json['isObstructed'] as bool? ?? false,
      netArgalaScore: (json['netArgalaScore'] as num?)?.toDouble() ?? 0.0,
      argalaPlanets: (json['argalaPlanets'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      obstructionPlanets: (json['obstructionPlanets'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      obstructionHouse: (json['obstructionHouse'] as num?)?.toInt() ?? 0,
    );
  }

  int get argalaHouse => houseNumber;
}

class KarakamshaReportModel {
  final String atmakarakaPlanet;
  final int karakamshaRashiIndex;
  final String karakamshaRashiName;
  final int karakamshaHouseFromLagna;
  final String lord;
  final List<String> planetsInKL;

  const KarakamshaReportModel({
    required this.atmakarakaPlanet,
    required this.karakamshaRashiIndex,
    required this.karakamshaRashiName,
    required this.karakamshaHouseFromLagna,
    this.lord = '',
    this.planetsInKL = const [],
  });

  factory KarakamshaReportModel.fromJson(Map<String, dynamic> json) {
    return KarakamshaReportModel(
      atmakarakaPlanet: json['atmakarakaPlanet'] as String? ?? '',
      karakamshaRashiIndex: (json['navamshaRashiIndex'] ?? json['karakamshaRashiIndex'] as num?)?.toInt() ?? 1,
      karakamshaRashiName: (json['rashiName'] ?? json['karakamshaRashiName'] ?? '') as String,
      karakamshaHouseFromLagna: (json['houseOffset'] ?? json['karakamshaHouseFromLagna'] as num?)?.toInt() ?? 1,
      lord: json['lord'] as String? ?? '',
      planetsInKL: (json['planetsInKL'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }

  String get rashiName => karakamshaRashiName;
  int get houseOffset => karakamshaHouseFromLagna;
}
