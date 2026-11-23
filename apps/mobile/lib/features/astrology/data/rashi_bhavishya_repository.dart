import '../../../core/localization/content_language.dart';
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

  /// The key names the language as well as the date and sign, so the English
  /// and the Hindi horoscope of one day are never served for each other.
  static String cacheKey({required String language, required String date, required int rashiIndex}) =>
      'rashi_bhavishya_v2_${language}_${date}_$rashiIndex';

  /// Fetches today's Rashi Bhavishya for a Moon sign (1–12) in [language]
  /// (`en` or `hi`; anything else is read as English, the API default).
  ///
  /// The local cache holds only a response for the same IST date, sign and
  /// language (the backend content for a date never changes), so it is never
  /// stale content from another day or text in the other language.
  Future<RashiBhavishyaModel> getTodayPrediction({
    required int rashiIndex,
    String language = ContentLanguage.fallback,
    bool forceRefresh = false,
  }) async {
    final lang = ContentLanguage.tryParse(language) ?? ContentLanguage.fallback;
    final today = istToday();
    final cacheKey = RashiBhavishyaRepository.cacheKey(language: lang, date: today, rashiIndex: rashiIndex);
    final cache = _cacheService;
    RashiBhavishyaModel parse(Object? data) => RashiBhavishyaModel.fromJson(Map<String, dynamic>.from(data as Map));
    bool matches(RashiBhavishyaModel m) => m.date == today && m.language == lang;

    if (cache != null && !forceRefresh) {
      final cached = await cache.get<RashiBhavishyaModel>(key: cacheKey, fromJson: parse);
      if (cached != null && matches(cached)) return cached;
    }

    try {
      final response = await _apiClient.get(
        '/rashi-bhavishya/today',
        queryParameters: {'rashiIndex': rashiIndex, 'date': today, 'language': lang},
        timeout: requestTimeout,
      );
      final prediction = RashiBhavishyaModel.fromJson(response);
      // Stored only when it is the day and the language that were asked for.
      if (cache != null && matches(prediction)) {
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
        if (envelope != null && matches(envelope.data)) return envelope.data;
      }
      rethrow;
    }
  }
}
