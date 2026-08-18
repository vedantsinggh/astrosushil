import '../../../core/network/api_client.dart';
import '../../../core/storage/local_cache_service.dart';
import '../models/astro_chart_model.dart';

/// Repository for Astrology API endpoints with offline-first caching
class AstrologyRepository {
  final ApiClient _apiClient;
  final LocalCacheService? _cacheService;

  static const String engineVersion = '1.0.0';

  AstrologyRepository({
    required ApiClient apiClient,
    LocalCacheService? cacheService,
  })  : _apiClient = apiClient,
        _cacheService = cacheService;

  /// Calculate natal chart for a given birth profile ID with offline cache fallback
  Future<AstroChartModel> getChart(
    String birthProfileId, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = 'kundli_chart_${birthProfileId}_$engineVersion';
    final cache = _cacheService;

    // 1. Try local cache first if available and not forcing refresh
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<AstroChartModel>(
        key: cacheKey,
        fromJson: (data) => AstroChartModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Fetch fresh calculation from network
    try {
      final response = await _apiClient.post(
        '/astrology/chart',
        data: {'birthProfileId': birthProfileId},
        timeout: const Duration(seconds: 30),
      );
      final chart = AstroChartModel.fromJson(response);

      // Save to cache
      if (cache != null) {
        await cache.put<AstroChartModel>(
          key: cacheKey,
          data: chart,
          ttl: const Duration(days: 30),
          version: engineVersion,
          toJson: (val) => val.toJson(),
        );
      }

      return chart;
    } catch (e) {
      // 3. Fallback to cached chart if network fails
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<AstroChartModel>(
          key: cacheKey,
          fromJson: (data) => AstroChartModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Get cache envelope for a birth chart to inspect cache metadata (stale age)
  Future<CacheEnvelope<AstroChartModel>?> getChartCacheEnvelope(String birthProfileId) async {
    final cache = _cacheService;
    if (cache == null) return null;
    final cacheKey = 'kundli_chart_${birthProfileId}_$engineVersion';
    return cache.getEnvelope<AstroChartModel>(
      key: cacheKey,
      fromJson: (data) => AstroChartModel.fromJson(Map<String, dynamic>.from(data as Map)),
    );
  }
}
