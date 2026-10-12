class ProductVariantModel {
  final String id;
  final String name;
  final String value;
  final int price; // in paise
  final int mrp; // in paise
  final int stock;

  const ProductVariantModel({
    required this.id,
    required this.name,
    required this.value,
    required this.price,
    required this.mrp,
    this.stock = 0,
  });

  factory ProductVariantModel.fromJson(Map<String, dynamic> json) {
    return ProductVariantModel(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      value: json['value'] as String? ?? '',
      price: json['price'] is int
          ? json['price'] as int
          : (json['price'] is double ? ((json['price'] as double) * 100).toInt() : (json['price'] != null ? int.tryParse(json['price'].toString()) ?? 0 : 0)),
      mrp: json['mrp'] is int
          ? json['mrp'] as int
          : (json['mrp'] is double ? ((json['mrp'] as double) * 100).toInt() : (json['mrp'] != null ? int.tryParse(json['mrp'].toString()) ?? 0 : 0)),
      stock: json['stock'] is int ? json['stock'] as int : 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'value': value,
    'price': price,
    'mrp': mrp,
    'stock': stock,
  };
}

class ProductModel {
  final String id;
  final String slug;
  final String catalogId;
  final String title;
  final String? hindiTitle;
  final String? description;
  final String? hindiDescription;
  final String category;
  final String productType; // DIGITAL_WALLPAPER, DIGITAL_ART, DIGITAL_BUNDLE, PHYSICAL
  final int mrp; // in paise
  final int price; // in paise
  final String currency;
  final int stock;
  final bool isAvailable;
  final bool requiresShipping;
  final String? imageUrl;
  final List<String> galleryImages;
  final List<ProductVariantModel> variants;
  final Map<String, dynamic>? metadata;

  const ProductModel({
    required this.id,
    required this.slug,
    required this.catalogId,
    required this.title,
    this.hindiTitle,
    this.description,
    this.hindiDescription,
    required this.category,
    required this.productType,
    required this.mrp,
    required this.price,
    this.currency = 'INR',
    this.stock = 0,
    this.isAvailable = true,
    this.requiresShipping = false,
    this.imageUrl,
    this.galleryImages = const [],
    this.variants = const [],
    this.metadata,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    List<ProductVariantModel> parsedVariants = [];
    if (json['variants'] is List) {
      parsedVariants = (json['variants'] as List)
          .map((v) => ProductVariantModel.fromJson(v as Map<String, dynamic>))
          .toList();
    }

    List<String> parsedGallery = [];
    if (json['galleryImages'] is List) {
      parsedGallery = (json['galleryImages'] as List).map((g) => g.toString()).toList();
    }

    return ProductModel(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      catalogId: json['catalogId'] as String? ?? json['slug'] as String? ?? '',
      title: json['title'] as String? ?? json['name'] as String? ?? '',
      hindiTitle: json['hindiTitle'] as String?,
      description: json['description'] as String?,
      hindiDescription: json['hindiDescription'] as String?,
      category: json['category'] as String? ?? 'GENERAL',
      productType: json['productType'] as String? ?? (json['type'] == 'physical' ? 'PHYSICAL' : 'DIGITAL_WALLPAPER'),
      mrp: json['mrp'] is int ? json['mrp'] as int : 0,
      price: json['price'] is int ? json['price'] as int : 0,
      currency: json['currency'] as String? ?? 'INR',
      stock: json['stock'] is int ? json['stock'] as int : 0,
      isAvailable: json['isAvailable'] as bool? ?? true,
      requiresShipping: json['requiresShipping'] as bool? ?? false,
      imageUrl: json['imageUrl'] as String? ?? json['thumbnail'] as String?,
      galleryImages: parsedGallery,
      variants: parsedVariants,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  bool get isPhysical => requiresShipping || productType == 'PHYSICAL';
  bool get isDigital => !isPhysical;
  bool get isBundle => productType == 'DIGITAL_BUNDLE';

  String get formattedPrice {
    final rupees = (price / 100).round();
    return '₹$rupees';
  }

  String get formattedMrp {
    final rupees = (mrp / 100).round();
    return '₹$rupees';
  }

  int get discountPercent {
    if (mrp <= price || mrp <= 0) return 0;
    return (((mrp - price) / mrp) * 100).round();
  }

  String displayTitle(String languageCode) {
    if (languageCode == 'hi' && hindiTitle != null && hindiTitle!.isNotEmpty) {
      return hindiTitle!;
    }
    return title;
  }

  String displayDescription(String languageCode) {
    if (languageCode == 'hi' && hindiDescription != null && hindiDescription!.isNotEmpty) {
      return hindiDescription!;
    }
    return description ?? '';
  }
}
