import '../../../core/network/api_client.dart';
import '../models/location_model.dart';

/// Repository for fetching verified geographic location suggestions
class LocationRepository {
  final ApiClient _apiClient;
  final Map<String, List<LocationModel>> _cache = {};

  LocationRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Searches worldwide cities/places with in-memory caching (backend only)
  Future<List<LocationModel>> searchLocations(String query, {int limit = 10}) async {
    final trimmed = query.trim();
    if (trimmed.length < 2) return [];

    final cacheKey = '${trimmed.toLowerCase()}_$limit';
    if (_cache.containsKey(cacheKey)) {
      return _cache[cacheKey]!;
    }

    // Backend is the only source of verified coordinates/timezones. Errors
    // propagate so the UI shows a clear "unable to load" message instead of
    // a silent, incomplete offline catalogue.
    final responseList = await _apiClient.getList(
      '/locations/search',
      queryParameters: {
        'q': trimmed,
        'limit': limit,
      },
    );

    final results = responseList
        .map((item) => LocationModel.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();

    if (results.isNotEmpty) {
      _cache[cacheKey] = results;
    }
    return results;
  }

  void clearCache() {
    _cache.clear();
  }
}
