import '../../../core/network/api_client.dart';
import '../../../core/storage/local_cache_service.dart';
import '../models/rashi_bhavishya_model.dart';

/// Today's calendar date in India (the API's day boundary), independent of the device time zone.
String istToday([DateTime? now]) {
  final ist = (now ?? DateTime.now()).toUtc().add(const Duration(hours: 5, minutes: 30));
  return ist.toIso8601String().split('T').first;
}

class RashiBhavishyaRepository {
  final ApiClient _apiClient;
  final LocalCacheService? _cacheService;

  /// The first request of a day may wait while the backend writes that day's narrative.
  static const Duration requestTimeout = Duration(seconds: 90);

  RashiBhavishyaRepository({
    required ApiClient apiClient,
    LocalCacheService? cacheService,
  })  : _apiClient = apiClient,
        _cacheService = cacheService;

  String _cacheKey(int rashiIndex, String date) => 'rashi_bhavishya_v2_${date}_$rashiIndex';

  /// Fetches today's Rashi Bhavishya for a Moon sign (1–12).
  ///
  /// The local cache holds only a response for the same IST date and sign (the
  /// backend content for a date never changes), so it is never stale content
  /// from another day.
  Future<RashiBhavishyaModel> getTodayPrediction({
    required int rashiIndex,
    bool forceRefresh = false,
  }) async {
    final today = istToday();
    final cacheKey = _cacheKey(rashiIndex, today);
    final cache = _cacheService;
    RashiBhavishyaModel parse(Object? data) => RashiBhavishyaModel.fromJson(Map<String, dynamic>.from(data as Map));

    if (cache != null && !forceRefresh) {
      final cached = await cache.get<RashiBhavishyaModel>(key: cacheKey, fromJson: parse);
      if (cached != null && cached.date == today) return cached;
    }

    try {
      final response = await _apiClient.get(
        '/rashi-bhavishya/today',
        queryParameters: {'rashiIndex': rashiIndex, 'date': today},
        timeout: requestTimeout,
      );
      final prediction = RashiBhavishyaModel.fromJson(response);
      if (cache != null && prediction.date == today) {
        await cache.put<RashiBhavishyaModel>(
          key: cacheKey,
          data: prediction,
          // Plain-wording fallback is cached briefly so the validated narrative replaces it once ready.
          ttl: prediction.isDeterministicFallback ? const Duration(minutes: 15) : const Duration(hours: 24),
          toJson: (val) => val.toJson(),
        );
      }
      return prediction;
    } catch (_) {
      // Offline: the same day's genuine response may still be on the device.
      if (cache != null) {
        final envelope = await cache.getEnvelope<RashiBhavishyaModel>(key: cacheKey, fromJson: parse);
        if (envelope != null && envelope.data.date == today) return envelope.data;
      }
      rethrow;
    }
  }
}
