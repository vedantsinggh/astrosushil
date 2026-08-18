/// Strongly typed models for Vastu Shastra space guidance
class VastuCategoryModel {
  final int id;
  final String slug;
  final String name;
  final String sanskritName;
  final String description;
  final String idealDirection;
  final String element;
  final String iconName;

  const VastuCategoryModel({
    required this.id,
    required this.slug,
    required this.name,
    required this.sanskritName,
    required this.description,
    required this.idealDirection,
    required this.element,
    required this.iconName,
  });

  factory VastuCategoryModel.fromJson(Map<String, dynamic> json) {
    return VastuCategoryModel(
      id: (json['id'] as num?)?.toInt() ?? 1,
      slug: json['slug'] as String? ?? '',
      name: json['name'] as String? ?? '',
      sanskritName: json['sanskritName'] as String? ?? '',
      description: json['description'] as String? ?? '',
      idealDirection: json['idealDirection'] as String? ?? '',
      element: json['element'] as String? ?? '',
      iconName: json['iconName'] as String? ?? 'home',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'slug': slug,
      'name': name,
      'sanskritName': sanskritName,
      'description': description,
      'idealDirection': idealDirection,
      'element': element,
      'iconName': iconName,
    };
  }
}

class VastuGuidanceModel {
  final int categoryId;
  final String categorySlug;
  final String categoryName;
  final String idealDirection;
  final List<String> alternativeDirections;
  final List<String> forbiddenDirections;
  final String element;
  final String rulingPlanet;
  final List<String> keyPrinciples;
  final List<String> dos;
  final List<String> donts;
  final List<String> remedies;

  const VastuGuidanceModel({
    required this.categoryId,
    required this.categorySlug,
    required this.categoryName,
    required this.idealDirection,
    required this.alternativeDirections,
    required this.forbiddenDirections,
    required this.element,
    required this.rulingPlanet,
    required this.keyPrinciples,
    required this.dos,
    required this.donts,
    required this.remedies,
  });

  factory VastuGuidanceModel.fromJson(Map<String, dynamic> json) {
    return VastuGuidanceModel(
      categoryId: (json['categoryId'] as num?)?.toInt() ?? 1,
      categorySlug: json['categorySlug'] as String? ?? '',
      categoryName: json['categoryName'] as String? ?? '',
      idealDirection: json['idealDirection'] as String? ?? '',
      alternativeDirections: (json['alternativeDirections'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
      forbiddenDirections: (json['forbiddenDirections'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
      element: json['element'] as String? ?? '',
      rulingPlanet: json['rulingPlanet'] as String? ?? '',
      keyPrinciples: (json['keyPrinciples'] as List? ?? []).map((e) => e.toString()).toList(),
      dos: (json['dos'] as List? ?? []).map((e) => e.toString()).toList(),
      donts: (json['donts'] as List? ?? []).map((e) => e.toString()).toList(),
      remedies: (json['remedies'] as List? ?? []).map((e) => e.toString()).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'categoryId': categoryId,
      'categorySlug': categorySlug,
      'categoryName': categoryName,
      'idealDirection': idealDirection,
      'alternativeDirections': alternativeDirections,
      'forbiddenDirections': forbiddenDirections,
      'element': element,
      'rulingPlanet': rulingPlanet,
      'keyPrinciples': keyPrinciples,
      'dos': dos,
      'donts': donts,
      'remedies': remedies,
    };
  }
}
