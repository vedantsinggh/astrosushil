/// Strongly typed models for Ashtakoota Matchmaking API responses

class KootaDetailModel {
  final String name;
  final double maxPoints;
  final double obtainedPoints;
  final String description;

  const KootaDetailModel({
    required this.name,
    required this.maxPoints,
    required this.obtainedPoints,
    required this.description,
  });

  factory KootaDetailModel.fromJson(Map<String, dynamic> json) {
    return KootaDetailModel(
      name: json['name'] as String? ?? json['koota'] as String? ?? '',
      maxPoints: (json['maxPoints'] as num?)?.toDouble() ?? (json['max'] as num?)?.toDouble() ?? 0.0,
      obtainedPoints: (json['obtainedPoints'] as num?)?.toDouble() ?? (json['score'] as num?)?.toDouble() ?? 0.0,
      description: json['description'] as String? ?? json['explanation'] as String? ?? '',
    );
  }
}

class ManglikDoshaModel {
  final bool isManglik;
  final String description;

  const ManglikDoshaModel({
    required this.isManglik,
    required this.description,
  });

  factory ManglikDoshaModel.fromJson(Map<String, dynamic> json) {
    return ManglikDoshaModel(
      isManglik: json['isManglik'] as bool? ?? false,
      description: json['description'] as String? ?? (json['isManglik'] == true ? 'Manglik Dosha detected' : 'No Manglik Dosha'),
    );
  }
}

class MatchmakingResultModel {
  final double totalScore;
  final double maxScore;
  final String overallVerdict;
  final List<KootaDetailModel> kootas;
  final ManglikDoshaModel? boyManglik;
  final ManglikDoshaModel? girlManglik;

  const MatchmakingResultModel({
    required this.totalScore,
    this.maxScore = 36.0,
    required this.overallVerdict,
    required this.kootas,
    this.boyManglik,
    this.girlManglik,
  });

  factory MatchmakingResultModel.fromJson(Map<String, dynamic> json) {
    final match = (json['data'] is Map && (json['data'] as Map)['compatibility'] is Map)
        ? (json['data'] as Map)['compatibility'] as Map<String, dynamic>
        : (json['match'] is Map)
            ? json['match'] as Map<String, dynamic>
            : json;

    final ashtakoota = match['ashtakoota'] as Map<String, dynamic>? ?? {};
    final kootaList = <KootaDetailModel>[];

    if (ashtakoota['kootas'] is List) {
      for (final k in ashtakoota['kootas'] as List) {
        if (k is Map) kootaList.add(KootaDetailModel.fromJson(Map<String, dynamic>.from(k)));
      }
    } else if (ashtakoota['kootas'] is Map) {
      (ashtakoota['kootas'] as Map).forEach((k, v) {
        if (v is Map) {
          final m = Map<String, dynamic>.from(v);
          m['name'] ??= k.toString();
          kootaList.add(KootaDetailModel.fromJson(m));
        }
      });
    }

    final totalPts = (ashtakoota['totalObtainedPoints'] as num?)?.toDouble() ??
        (match['totalScore'] as num?)?.toDouble() ??
        0.0;

    return MatchmakingResultModel(
      totalScore: totalPts,
      maxScore: (ashtakoota['totalMaxPoints'] as num?)?.toDouble() ?? 36.0,
      overallVerdict: match['overallVerdict'] as String? ?? (totalPts >= 18 ? 'Favorable Compatibility' : 'Low Compatibility'),
      kootas: kootaList,
      boyManglik: match['boyManglik'] is Map ? ManglikDoshaModel.fromJson(Map<String, dynamic>.from(match['boyManglik'])) : null,
      girlManglik: match['girlManglik'] is Map ? ManglikDoshaModel.fromJson(Map<String, dynamic>.from(match['girlManglik'])) : null,
    );
  }
}
