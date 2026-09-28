/// Strongly typed models for Classical Yoga API responses

class YogaModel {
  final String id;
  final String name;
  final String category;
  final String description;
  final bool isFormed;
  final String? strength;
  final List<String> involvedPlanets;
  final List<String> involvedHouses;
  final String? result;

  const YogaModel({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.isFormed,
    this.strength,
    this.involvedPlanets = const [],
    this.involvedHouses = const [],
    this.result,
  });

  factory YogaModel.fromJson(Map<String, dynamic> json) {
    final planets = (json['involvedPlanets'] as List? ?? json['planets'] as List? ?? []).map((e) => e.toString()).toList();
    final houses = (json['involvedHouses'] as List? ?? json['houses'] as List? ?? []).map((e) => e.toString()).toList();

    return YogaModel(
      id: json['id'] as String? ?? json['yogaId'] as String? ?? '',
      name: json['name'] as String? ?? 'Classical Yoga',
      category: json['category'] as String? ?? 'GENERAL',
      description: json['description'] as String? ?? json['explanation'] as String? ?? '',
      isFormed: json['isFormed'] as bool? ?? json['detected'] as bool? ?? true,
      strength: json['strength'] as String? ?? json['status'] as String?,
      involvedPlanets: planets,
      involvedHouses: houses,
      result: json['result'] as String? ?? json['effects'] as String?,
    );
  }
}

class YogaResponseModel {
  final int totalDetected;
  final List<YogaModel> detectedYogas;

  const YogaResponseModel({
    required this.totalDetected,
    required this.detectedYogas,
  });

  factory YogaResponseModel.fromJson(Map<String, dynamic> json) {
    final yData = (json['data'] is Map && (json['data'] as Map)['yogas'] is Map)
        ? (json['data'] as Map)['yogas'] as Map<String, dynamic>
        : (json['yogas'] is Map)
            ? json['yogas'] as Map<String, dynamic>
            : json;

    final rawList = yData['detectedYogas'] as List? ?? yData['yogas'] as List? ?? [];

    return YogaResponseModel(
      totalDetected: (yData['totalDetected'] as num?)?.toInt() ?? rawList.length,
      detectedYogas: rawList
          .whereType<Map<String, dynamic>>()
          .map((y) => YogaModel.fromJson(y))
          .toList(),
    );
  }
}
