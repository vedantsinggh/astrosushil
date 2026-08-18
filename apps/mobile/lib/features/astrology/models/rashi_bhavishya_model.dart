/// Strongly typed models for Rashi Bhavishya daily predictions
class RashiBhavishyaCategoryModel {
  final String general;
  final String health;
  final String love;
  final String career;
  final String finance;

  const RashiBhavishyaCategoryModel({
    required this.general,
    required this.health,
    required this.love,
    required this.career,
    required this.finance,
  });

  factory RashiBhavishyaCategoryModel.fromJson(Map<String, dynamic> json) {
    return RashiBhavishyaCategoryModel(
      general: json['general'] as String? ?? '',
      health: json['health'] as String? ?? '',
      love: json['love'] as String? ?? '',
      career: json['career'] as String? ?? '',
      finance: json['finance'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'general': general,
      'health': health,
      'love': love,
      'career': career,
      'finance': finance,
    };
  }
}

class RashiBhavishyaPredictionModel {
  final String summary;
  final RashiBhavishyaCategoryModel categories;
  final int luckyNumber;
  final String luckyColor;

  const RashiBhavishyaPredictionModel({
    required this.summary,
    required this.categories,
    required this.luckyNumber,
    required this.luckyColor,
  });

  factory RashiBhavishyaPredictionModel.fromJson(Map<String, dynamic> json) {
    return RashiBhavishyaPredictionModel(
      summary: json['summary'] as String? ?? '',
      categories: json['categories'] is Map
          ? RashiBhavishyaCategoryModel.fromJson(Map<String, dynamic>.from(json['categories'] as Map))
          : const RashiBhavishyaCategoryModel(general: '', health: '', love: '', career: '', finance: ''),
      luckyNumber: (json['luckyNumber'] as num?)?.toInt() ?? 7,
      luckyColor: json['luckyColor'] as String? ?? 'Gold',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'summary': summary,
      'categories': categories.toJson(),
      'luckyNumber': luckyNumber,
      'luckyColor': luckyColor,
    };
  }
}

class RashiInfoModel {
  final int index;
  final String sanskritName;
  final String englishName;
  final String element;
  final String ruler;

  const RashiInfoModel({
    required this.index,
    required this.sanskritName,
    required this.englishName,
    required this.element,
    required this.ruler,
  });

  factory RashiInfoModel.fromJson(Map<String, dynamic> json) {
    return RashiInfoModel(
      index: (json['index'] as num?)?.toInt() ?? 1,
      sanskritName: json['sanskritName'] as String? ?? 'Mesha',
      englishName: json['englishName'] as String? ?? 'Aries',
      element: json['element'] as String? ?? 'Fire',
      ruler: json['ruler'] as String? ?? 'Mars',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'index': index,
      'sanskritName': sanskritName,
      'englishName': englishName,
      'element': element,
      'ruler': ruler,
    };
  }
}

class RashiBhavishyaModel {
  final String date;
  final RashiInfoModel rashi;
  final RashiBhavishyaPredictionModel prediction;
  final String source;
  final bool isDevelopmentFixture;

  const RashiBhavishyaModel({
    required this.date,
    required this.rashi,
    required this.prediction,
    required this.source,
    required this.isDevelopmentFixture,
  });

  factory RashiBhavishyaModel.fromJson(Map<String, dynamic> json) {
    final dataMap = (json['data'] is Map)
        ? Map<String, dynamic>.from(json['data'] as Map)
        : json;

    return RashiBhavishyaModel(
      date: dataMap['date'] as String? ?? 'Today',
      rashi: dataMap['rashi'] is Map
          ? RashiInfoModel.fromJson(Map<String, dynamic>.from(dataMap['rashi'] as Map))
          : const RashiInfoModel(index: 1, sanskritName: 'Mesha', englishName: 'Aries', element: 'Fire', ruler: 'Mars'),
      prediction: dataMap['prediction'] is Map
          ? RashiBhavishyaPredictionModel.fromJson(Map<String, dynamic>.from(dataMap['prediction'] as Map))
          : const RashiBhavishyaPredictionModel(
              summary: 'A positive day for new beginnings. Focus on core tasks.',
              categories: RashiBhavishyaCategoryModel(
                general: 'Positivity helps you make progress on key tasks.',
                health: 'Energy is high. Stay active.',
                love: 'Clear communication deepens bonds.',
                career: 'Collaborative work brings good results.',
                finance: 'Financial outlook remains balanced.',
              ),
              luckyNumber: 9,
              luckyColor: 'Red',
            ),
      source: dataMap['source'] as String? ?? 'AstroSushil Reference Content Fixtures',
      isDevelopmentFixture: dataMap['isDevelopmentFixture'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'date': date,
      'rashi': rashi.toJson(),
      'prediction': prediction.toJson(),
      'source': source,
      'isDevelopmentFixture': isDevelopmentFixture,
    };
  }
}
