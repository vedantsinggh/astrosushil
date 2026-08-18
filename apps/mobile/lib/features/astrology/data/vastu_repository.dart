import '../../../core/network/api_client.dart';
import '../../../core/storage/local_cache_service.dart';
import '../models/vastu_model.dart';

class VastuRepository {
  final ApiClient _apiClient;
  final LocalCacheService? _cacheService;

  VastuRepository({
    required ApiClient apiClient,
    LocalCacheService? cacheService,
  })  : _apiClient = apiClient,
        _cacheService = cacheService;

  /// Fetch Vastu categories with offline caching
  Future<List<VastuCategoryModel>> getCategories({bool forceRefresh = false}) async {
    const cacheKey = 'vastu_categories';
    final cache = _cacheService;

    if (cache != null && !forceRefresh) {
      final cached = await cache.get<List<VastuCategoryModel>>(
        key: cacheKey,
        fromJson: (raw) => (raw as List)
            .map((item) => VastuCategoryModel.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList(),
      );
      if (cached != null && cached.isNotEmpty) {
        return cached;
      }
    }

    try {
      final response = await _apiClient.get('/vastu/categories');
      final list = (response['data'] as List? ?? []);
      final categories = list
          .map((item) => VastuCategoryModel.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();

      if (cache != null) {
        await cache.put<List<VastuCategoryModel>>(
          key: cacheKey,
          data: categories,
          ttl: const Duration(days: 30),
          toJson: (val) => val.map((e) => e.toJson()).toList(),
        );
      }

      return categories;
    } catch (e) {
      if (cache != null) {
        final cached = await cache.get<List<VastuCategoryModel>>(
          key: cacheKey,
          fromJson: (raw) => (raw as List)
              .map((item) => VastuCategoryModel.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList(),
        );
        if (cached != null && cached.isNotEmpty) {
          return cached;
        }
      }
      rethrow;
    }
  }

  /// Fetch Vastu guidance list with offline caching
  Future<List<VastuGuidanceModel>> getGuidance({
    int? categoryId,
    String? category,
    bool forceRefresh = false,
  }) async {
    final cacheKey = 'vastu_guidance_${categoryId ?? category ?? 'all'}';
    final cache = _cacheService;

    if (cache != null && !forceRefresh) {
      final cached = await cache.get<List<VastuGuidanceModel>>(
        key: cacheKey,
        fromJson: (raw) => (raw as List)
            .map((item) => VastuGuidanceModel.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList(),
      );
      if (cached != null && cached.isNotEmpty) {
        return cached;
      }
    }

    try {
      final queryParams = <String, dynamic>{};
      if (categoryId != null) queryParams['categoryId'] = categoryId;
      if (category != null) queryParams['category'] = category;

      final response = await _apiClient.get('/vastu/guidance', queryParameters: queryParams);
      final list = (response['data'] as List? ?? []);
      final guidance = list
          .map((item) => VastuGuidanceModel.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();

      if (cache != null) {
        await cache.put<List<VastuGuidanceModel>>(
          key: cacheKey,
          data: guidance,
          ttl: const Duration(days: 30),
          toJson: (val) => val.map((e) => e.toJson()).toList(),
        );
      }

      return guidance;
    } catch (e) {
      if (cache != null) {
        final cached = await cache.get<List<VastuGuidanceModel>>(
          key: cacheKey,
          fromJson: (raw) => (raw as List)
              .map((item) => VastuGuidanceModel.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList(),
        );
        if (cached != null && cached.isNotEmpty) {
          return cached;
        }
      }
      rethrow;
    }
  }
}
