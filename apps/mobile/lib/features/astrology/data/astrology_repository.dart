import '../../../core/network/api_client.dart';
import '../../../core/storage/local_cache_service.dart';
import '../../birth_profile/models/birth_profile_model.dart';
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

  /// Derive deterministic cache key for a birth profile
  String _getCacheKey(BirthProfileModel profile) {
    if (profile.id.isNotEmpty && profile.id != 'guest_profile_local') {
      return 'kundli_chart_${profile.id}_$engineVersion';
    }
    final inputHash = '${profile.name}_${profile.dateOfBirth}_${profile.timeOfBirth}_${profile.latitude}_${profile.longitude}';
    return 'kundli_chart_${inputHash.hashCode}_$engineVersion';
  }

  /// Calculate natal chart for a given birth profile with offline cache fallback
  Future<AstroChartModel> getChartForProfile(
    BirthProfileModel profile, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = _getCacheKey(profile);
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
      final isGuestProfile = profile.id.isEmpty || profile.id == 'guest_profile_local';
      final Map<String, dynamic> payload;

      if (isGuestProfile) {
        payload = {
          'birthDetails': {
            'name': profile.name,
            'dateOfBirth': profile.dateOfBirth,
            'timeOfBirth': profile.timeOfBirth,
            'latitude': profile.latitude,
            'longitude': profile.longitude,
            'timezone': profile.timezone,
            'placeName': profile.placeName,
          },
        };
      } else {
        payload = {'birthProfileId': profile.id};
      }

      final response = await _apiClient.post(
        '/astrology/chart',
        data: payload,
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

  /// Deprecated convenience overload for profile ID lookup
  Future<AstroChartModel> getChart(
    String birthProfileId, {
    bool forceRefresh = false,
  }) async {
    final dummyProfile = BirthProfileModel(
      id: birthProfileId,
      userId: '',
      name: '',
      dateOfBirth: '',
      timeOfBirth: '',
      latitude: 0,
      longitude: 0,
      timezone: '',
      placeName: '',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    return getChartForProfile(dummyProfile, forceRefresh: forceRefresh);
  }
}
