import '../../../core/network/api_client.dart';
import '../../../core/storage/local_cache_service.dart';
import '../models/rashi_bhavishya_model.dart';

class RashiBhavishyaRepository {
  final ApiClient _apiClient;
  final LocalCacheService? _cacheService;

  RashiBhavishyaRepository({
    required ApiClient apiClient,
    LocalCacheService? cacheService,
  })  : _apiClient = apiClient,
        _cacheService = cacheService;

  /// Fetch daily horoscope prediction with local caching and offline fallback
  Future<RashiBhavishyaModel> getTodayPrediction({
    String? rashi,
    int? rashiIndex,
    bool forceRefresh = false,
  }) async {
    final keyIndex = rashiIndex ?? (rashi != null ? rashi.hashCode : 1);
    final todayStr = DateTime.now().toIso8601String().split('T').first;
    final cacheKey = 'rashi_prediction_${todayStr}_$keyIndex';
    final cache = _cacheService;

    // 1. Try local cache first
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<RashiBhavishyaModel>(
        key: cacheKey,
        fromJson: (data) => RashiBhavishyaModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Fetch fresh prediction from network
    try {
      final queryParams = <String, dynamic>{};
      if (rashi != null) queryParams['rashi'] = rashi;
      if (rashiIndex != null) queryParams['rashiIndex'] = rashiIndex;

      final response = await _apiClient.get(
        '/rashi-bhavishya/today',
        queryParameters: queryParams,
      );
      final prediction = RashiBhavishyaModel.fromJson(response);

      // Save to cache
      if (cache != null) {
        await cache.put<RashiBhavishyaModel>(
          key: cacheKey,
          data: prediction,
          ttl: const Duration(hours: 24),
          toJson: (val) => val.toJson(),
        );
      }

      return prediction;
    } catch (e) {
      // 3. Fallback to cached prediction if network fails
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<RashiBhavishyaModel>(
          key: cacheKey,
          fromJson: (data) => RashiBhavishyaModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Get cache envelope to inspect whether prediction is stale
  Future<CacheEnvelope<RashiBhavishyaModel>?> getPredictionCacheEnvelope({
    String? rashi,
    int? rashiIndex,
  }) async {
    final cache = _cacheService;
    if (cache == null) return null;
    final keyIndex = rashiIndex ?? (rashi != null ? rashi.hashCode : 1);
    final todayStr = DateTime.now().toIso8601String().split('T').first;
    final cacheKey = 'rashi_prediction_${todayStr}_$keyIndex';
    return cache.getEnvelope<RashiBhavishyaModel>(
      key: cacheKey,
      fromJson: (data) => RashiBhavishyaModel.fromJson(Map<String, dynamic>.from(data as Map)),
    );
  }
}
