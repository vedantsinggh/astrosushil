int _parseInt(dynamic value) {
  if (value is int) return value;
  if (value is double) return (value * 100).toInt();
  if (value != null) return int.tryParse(value.toString()) ?? 0;
  return 0;
}

double? _parseDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value != null) return double.tryParse(value.toString());
  return null;
}

class ProductVariantModel {
  final String id;
  final String name;
  final String value;
  final int price; // in paise
  final int mrp; // in paise
  final int? priceWithGst; // in paise
  final int? gst; // in paise or percentage depending on backend
  final int? discount;
  final bool isInCart;
  final bool isInWishlist;
  final int stock;

  const ProductVariantModel({
    required this.id,
    required this.name,
    required this.value,
    required this.price,
    required this.mrp,
    this.priceWithGst,
    this.gst,
    this.discount,
    this.isInCart = false,
    this.isInWishlist = false,
    this.stock = 0,
  });

  factory ProductVariantModel.fromJson(Map<String, dynamic> json) {
    return ProductVariantModel(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      value: json['value'] as String? ?? '',
      price: _parseInt(json['price']),
      mrp: _parseInt(json['mrp']),
      priceWithGst: json['priceWithGst'] != null ? _parseInt(json['priceWithGst']) : null,
      gst: json['gst'] != null ? _parseInt(json['gst']) : null,
      discount: json['discount'] != null ? _parseInt(json['discount']) : null,
      isInCart: json['isInCart'] as bool? ?? false,
      isInWishlist: json['isInWishlist'] as bool? ?? false,
      stock: json['stock'] is int ? json['stock'] as int : 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'value': value,
    'price': price,
    'mrp': mrp,
    if (priceWithGst != null) 'priceWithGst': priceWithGst,
    if (gst != null) 'gst': gst,
    if (discount != null) 'discount': discount,
    'isInCart': isInCart,
    'isInWishlist': isInWishlist,
    'stock': stock,
  };
}

class ProductModel {
  final String id;
  final String slug;
  final String catalogId;
  final String title;
  final String? hindiTitle;
  final String? shortDescription;
  final String? description;
  final String? hindiDescription;
  final String category;
  final Map<String, dynamic>? categoryInfo;
  final String productType; // DIGITAL_WALLPAPER, DIGITAL_ART, DIGITAL_BUNDLE, PHYSICAL
  final int mrp; // in paise
  final int price; // in paise
  final int? priceWithGst; // in paise
  final int? gst;
  final int? discount;
  final String currency;
  final int stock;
  final bool isAvailable;
  final bool requiresShipping;
  final bool isFeatured;
  final bool isTrending;
  final bool isBestSeller;
  final double? rating;
  final int reviewsCount;
  final bool isInCart;
  final bool isInWishlist;
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
    this.shortDescription,
    this.description,
    this.hindiDescription,
    required this.category,
    this.categoryInfo,
    required this.productType,
    required this.mrp,
    required this.price,
    this.priceWithGst,
    this.gst,
    this.discount,
    this.currency = 'INR',
    this.stock = 0,
    this.isAvailable = true,
    this.requiresShipping = false,
    this.isFeatured = false,
    this.isTrending = false,
    this.isBestSeller = false,
    this.rating,
    this.reviewsCount = 0,
    this.isInCart = false,
    this.isInWishlist = false,
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

    final rawCategoryInfo = json['categoryInfo'] is Map
        ? Map<String, dynamic>.from(json['categoryInfo'] as Map)
        : null;

    return ProductModel(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      catalogId: json['catalogId'] as String? ?? json['slug'] as String? ?? '',
      title: json['title'] as String? ?? json['name'] as String? ?? '',
      hindiTitle: json['hindiTitle'] as String?,
      shortDescription: json['shortDescription'] as String?,
      description: json['description'] as String?,
      hindiDescription: json['hindiDescription'] as String?,
      category: json['category'] as String? ?? rawCategoryInfo?['name'] as String? ?? 'GENERAL',
      categoryInfo: rawCategoryInfo,
      productType: json['productType'] as String? ?? (json['type'] == 'physical' ? 'PHYSICAL' : 'DIGITAL_WALLPAPER'),
      mrp: json['mrp'] is int ? json['mrp'] as int : 0,
      price: json['price'] is int ? json['price'] as int : 0,
      priceWithGst: json['priceWithGst'] != null ? _parseInt(json['priceWithGst']) : null,
      gst: json['gst'] != null ? _parseInt(json['gst']) : null,
      discount: json['discount'] != null ? _parseInt(json['discount']) : null,
      currency: json['currency'] as String? ?? 'INR',
      stock: json['stock'] is int ? json['stock'] as int : 0,
      isAvailable: json['isAvailable'] as bool? ?? true,
      requiresShipping: json['requiresShipping'] as bool? ?? false,
      isFeatured: json['isFeatured'] as bool? ?? false,
      isTrending: json['isTrending'] as bool? ?? false,
      isBestSeller: json['isBestSeller'] as bool? ?? false,
      rating: _parseDouble(json['rating']),
      reviewsCount: json['reviewsCount'] is int
          ? json['reviewsCount'] as int
          : int.tryParse(json['reviewsCount']?.toString() ?? '0') ?? 0,
      isInCart: json['isInCart'] as bool? ?? false,
      isInWishlist: json['isInWishlist'] as bool? ?? false,
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
