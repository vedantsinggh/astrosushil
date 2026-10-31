class BundleAssetModel {
  final String name;
  final String key;
  final String type; // IMAGE, AUDIO, PDF

  const BundleAssetModel({
    required this.name,
    required this.key,
    required this.type,
  });

  factory BundleAssetModel.fromJson(Map<String, dynamic> json) {
    return BundleAssetModel(
      name: json['name'] as String? ?? 'Asset',
      key: json['key'] as String? ?? '',
      type: json['type'] as String? ?? 'IMAGE',
    );
  }
}

class DigitalDownloadModel {
  final String id;
  final String productId;
  final String? orderId;
  final String productTitle;
  final String? productHindiTitle;
  final String productType;
  final String category;
  final String? imageUrl;
  final String status; // ACTIVE, EXPIRED, REVOKED
  final int downloadCount;
  final DateTime? lastDownloadedAt;
  final DateTime grantedAt;
  final DateTime? expiresAt;
  final List<BundleAssetModel> bundleAssets;
  final bool hasBundleAssets;

  const DigitalDownloadModel({
    required this.id,
    required this.productId,
    this.orderId,
    required this.productTitle,
    this.productHindiTitle,
    required this.productType,
    required this.category,
    this.imageUrl,
    required this.status,
    required this.downloadCount,
    this.lastDownloadedAt,
    required this.grantedAt,
    this.expiresAt,
    this.bundleAssets = const [],
    this.hasBundleAssets = false,
  });

  factory DigitalDownloadModel.fromJson(Map<String, dynamic> json) {
    List<BundleAssetModel> parsedBundle = [];
    if (json['bundleAssets'] is List) {
      parsedBundle = (json['bundleAssets'] as List)
          .map((b) => BundleAssetModel.fromJson(b as Map<String, dynamic>))
          .toList();
    }

    return DigitalDownloadModel(
      id: json['id'] as String? ?? '',
      productId: json['productId'] as String? ?? '',
      orderId: json['orderId'] as String?,
      productTitle: json['productTitle'] as String? ?? '',
      productHindiTitle: json['productHindiTitle'] as String?,
      productType: json['productType'] as String? ?? 'DIGITAL_WALLPAPER',
      category: json['category'] as String? ?? 'WALLPAPER',
      imageUrl: json['imageUrl'] as String?,
      status: json['status'] as String? ?? 'ACTIVE',
      downloadCount: json['downloadCount'] is int ? json['downloadCount'] as int : 0,
      lastDownloadedAt: json['lastDownloadedAt'] != null
          ? DateTime.tryParse(json['lastDownloadedAt'].toString())
          : null,
      grantedAt: json['grantedAt'] != null
          ? DateTime.tryParse(json['grantedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      expiresAt: json['expiresAt'] != null
          ? DateTime.tryParse(json['expiresAt'].toString())
          : null,
      bundleAssets: parsedBundle,
      hasBundleAssets: parsedBundle.isNotEmpty || (json['hasBundleAssets'] == true),
    );
  }

  bool get isActive => status == 'ACTIVE';
  bool get isRevoked => status == 'REVOKED';
  bool get isExpired => status == 'EXPIRED';

  String displayTitle(String languageCode) {
    if (languageCode == 'hi' && productHindiTitle != null && productHindiTitle!.isNotEmpty) {
      return productHindiTitle!;
    }
    return productTitle;
  }
}
