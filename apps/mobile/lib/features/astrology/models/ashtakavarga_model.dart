/// Strongly typed models for Vedic Ashtakavarga charts, SAV, BAV, Shodhana & Pindas
/// Compliant with packages/astrology-engine deterministic Ashtakavarga Calculator.
library;

class SarvashtakavargaModel {
  final Map<int, int> signs;
  final List<int> signList;
  final Map<String, List<int>> byPlanet;
  final int grandTotal;

  const SarvashtakavargaModel({
    required this.signs,
    required this.signList,
    required this.byPlanet,
    required this.grandTotal,
  });

  factory SarvashtakavargaModel.fromJson(Map<String, dynamic> json) {
    final rawSigns = json['signs'] as Map<String, dynamic>? ?? {};
    final signsMap = <int, int>{};
    rawSigns.forEach((k, v) {
      final signNum = int.tryParse(k.toString()) ?? 1;
      signsMap[signNum] = (v as num?)?.toInt() ?? 0;
    });

    final signList = (json['signList'] as List? ?? [])
        .map((e) => (e as num).toInt())
        .toList();

    final rawByPlanet = json['byPlanet'] as Map<String, dynamic>? ?? {};
    final byPlanetMap = <String, List<int>>{};
    rawByPlanet.forEach((p, list) {
      if (list is List) {
        byPlanetMap[p] = list.map((e) => (e as num).toInt()).toList();
      }
    });

    return SarvashtakavargaModel(
      signs: signsMap,
      signList: signList,
      byPlanet: byPlanetMap,
      grandTotal: (json['grandTotal'] as num?)?.toInt() ?? 337,
    );
  }

  /// Get SAV score for 1-indexed Rashi (1 = Aries ... 12 = Pisces)
  int getScoreForRashi(int rashiIndex) {
    if (signs.containsKey(rashiIndex)) {
      return signs[rashiIndex]!;
    }
    if (rashiIndex >= 1 && rashiIndex <= signList.length) {
      return signList[rashiIndex - 1];
    }
    return 0;
  }
}

class BhinnashtakavargaModel {
  final String planet;
  final Map<int, int> signs;
  final List<int> signList;
  final Map<String, List<int>> prastara;
  final int totalPoints;

  const BhinnashtakavargaModel({
    required this.planet,
    required this.signs,
    required this.signList,
    required this.prastara,
    required this.totalPoints,
  });

  factory BhinnashtakavargaModel.fromJson(Map<String, dynamic> json) {
    final rawSigns = json['signs'] as Map<String, dynamic>? ?? {};
    final signsMap = <int, int>{};
    rawSigns.forEach((k, v) {
      final signNum = int.tryParse(k.toString()) ?? 1;
      signsMap[signNum] = (v as num?)?.toInt() ?? 0;
    });

    final signList = (json['signList'] as List? ?? [])
        .map((e) => (e as num).toInt())
        .toList();

    final rawPrastara = json['prastara'] as Map<String, dynamic>? ?? {};
    final prastaraMap = <String, List<int>>{};
    rawPrastara.forEach((contrib, list) {
      if (list is List) {
        prastaraMap[contrib] = list.map((e) => (e as num).toInt()).toList();
      }
    });

    return BhinnashtakavargaModel(
      planet: json['planet'] as String? ?? '',
      signs: signsMap,
      signList: signList,
      prastara: prastaraMap,
      totalPoints: (json['totalPoints'] as num?)?.toInt() ?? 0,
    );
  }

  int getScoreForRashi(int rashiIndex) {
    if (signs.containsKey(rashiIndex)) {
      return signs[rashiIndex]!;
    }
    if (rashiIndex >= 1 && rashiIndex <= signList.length) {
      return signList[rashiIndex - 1];
    }
    return 0;
  }
}

class ShodhanaModel {
  final String planet;
  final List<int> trikonaReduced;
  final List<int> ekadhipatyaReduced;
  final int totalTrikonaPoints;
  final int totalEkadhipatyaPoints;

  const ShodhanaModel({
    required this.planet,
    required this.trikonaReduced,
    required this.ekadhipatyaReduced,
    required this.totalTrikonaPoints,
    required this.totalEkadhipatyaPoints,
  });

  factory ShodhanaModel.fromJson(Map<String, dynamic> json) {
    return ShodhanaModel(
      planet: json['planet'] as String? ?? '',
      trikonaReduced: (json['trikonaReduced'] as List? ?? []).map((e) => (e as num).toInt()).toList(),
      ekadhipatyaReduced: (json['ekadhipatyaReduced'] as List? ?? []).map((e) => (e as num).toInt()).toList(),
      totalTrikonaPoints: (json['totalTrikonaPoints'] as num?)?.toInt() ?? 0,
      totalEkadhipatyaPoints: (json['totalEkadhipatyaPoints'] as num?)?.toInt() ?? 0,
    );
  }
}

class ShodhyaPindaModel {
  final String planet;
  final int rashiPinda;
  final int grahaPinda;
  final int shodhyaPinda;

  const ShodhyaPindaModel({
    required this.planet,
    required this.rashiPinda,
    required this.grahaPinda,
    required this.shodhyaPinda,
  });

  factory ShodhyaPindaModel.fromJson(Map<String, dynamic> json) {
    return ShodhyaPindaModel(
      planet: json['planet'] as String? ?? '',
      rashiPinda: (json['rashiPinda'] as num?)?.toInt() ?? 0,
      grahaPinda: (json['grahaPinda'] as num?)?.toInt() ?? 0,
      shodhyaPinda: (json['shodhyaPinda'] as num?)?.toInt() ?? 0,
    );
  }
}

class AshtakavargaResultModel {
  final SarvashtakavargaModel sav;
  final Map<String, BhinnashtakavargaModel> bav;
  final Map<String, ShodhanaModel> shodhana;
  final Map<String, ShodhyaPindaModel> pinda;

  const AshtakavargaResultModel({
    required this.sav,
    required this.bav,
    this.shodhana = const {},
    this.pinda = const {},
  });

  factory AshtakavargaResultModel.fromJson(Map<String, dynamic> json) {
    final root = json['data'] is Map
        ? Map<String, dynamic>.from(json['data'] as Map)
        : json;

    final sav = SarvashtakavargaModel.fromJson(
        root['sav'] is Map ? Map<String, dynamic>.from(root['sav'] as Map) : {});

    final rawBav = root['bav'] as Map? ?? {};
    final bavMap = <String, BhinnashtakavargaModel>{};
    rawBav.forEach((p, val) {
      if (val is Map) {
        bavMap[p.toString().toUpperCase()] =
            BhinnashtakavargaModel.fromJson(Map<String, dynamic>.from(val));
      }
    });

    final rawShodhana = root['shodhana'] as Map? ?? {};
    final shodhanaMap = <String, ShodhanaModel>{};
    rawShodhana.forEach((p, val) {
      if (val is Map) {
        shodhanaMap[p.toString().toUpperCase()] =
            ShodhanaModel.fromJson(Map<String, dynamic>.from(val));
      }
    });

    final rawPinda = root['pinda'] as Map? ?? {};
    final pindaMap = <String, ShodhyaPindaModel>{};
    rawPinda.forEach((p, val) {
      if (val is Map) {
        pindaMap[p.toString().toUpperCase()] =
            ShodhyaPindaModel.fromJson(Map<String, dynamic>.from(val));
      }
    });

    return AshtakavargaResultModel(
      sav: sav,
      bav: bavMap,
      shodhana: shodhanaMap,
      pinda: pindaMap,
    );
  }

  static const classicalPlanets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
}
