import '../../../core/network/api_client.dart';
import '../models/location_model.dart';

/// Repository for fetching verified geographic location suggestions
class LocationRepository {
  final ApiClient _apiClient;
  final Map<String, List<LocationModel>> _cache = {};

  LocationRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Searches worldwide cities/places with in-memory caching and offline fallback
  Future<List<LocationModel>> searchLocations(String query, {int limit = 10}) async {
    final trimmed = query.trim();
    if (trimmed.length < 2) return [];

    final cacheKey = '${trimmed.toLowerCase()}_$limit';
    if (_cache.containsKey(cacheKey)) {
      return _cache[cacheKey]!;
    }

    try {
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
        return results;
      }
    } catch (_) {
      // Fallback to local catalog if API is unavailable
    }

    final localMatches = _fallbackCatalog
        .where((loc) =>
            loc.name.toLowerCase().contains(trimmed.toLowerCase()) ||
            loc.displayName.toLowerCase().contains(trimmed.toLowerCase()) ||
            (loc.state != null && loc.state!.toLowerCase().contains(trimmed.toLowerCase())) ||
            loc.country.toLowerCase().contains(trimmed.toLowerCase()))
        .take(limit)
        .toList();

    if (localMatches.isNotEmpty) {
      _cache[cacheKey] = localMatches;
      return localMatches;
    }

    return [];
  }

  void clearCache() {
    _cache.clear();
  }
}

const List<LocationModel> _fallbackCatalog = [
  LocationModel(
    id: 'geo-in-delhi',
    name: 'New Delhi',
    displayName: 'New Delhi, Delhi, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-in-mumbai',
    name: 'Mumbai',
    displayName: 'Mumbai, Maharashtra, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Maharashtra',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-in-bengaluru',
    name: 'Bengaluru',
    displayName: 'Bengaluru, Karnataka, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Karnataka',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-in-kolkata',
    name: 'Kolkata',
    displayName: 'Kolkata, West Bengal, India',
    country: 'India',
    countryCode: 'IN',
    state: 'West Bengal',
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-in-chennai',
    name: 'Chennai',
    displayName: 'Chennai, Tamil Nadu, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Tamil Nadu',
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-in-hyderabad',
    name: 'Hyderabad',
    displayName: 'Hyderabad, Telangana, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Telangana',
    latitude: 17.3850,
    longitude: 78.4867,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-in-ahmedabad',
    name: 'Ahmedabad',
    displayName: 'Ahmedabad, Gujarat, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Gujarat',
    latitude: 23.0225,
    longitude: 72.5714,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-in-pune',
    name: 'Pune',
    displayName: 'Pune, Maharashtra, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Maharashtra',
    latitude: 18.5204,
    longitude: 73.8567,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-in-jaipur',
    name: 'Jaipur',
    displayName: 'Jaipur, Rajasthan, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Rajasthan',
    latitude: 26.9124,
    longitude: 75.7873,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-in-lucknow',
    name: 'Lucknow',
    displayName: 'Lucknow, Uttar Pradesh, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Uttar Pradesh',
    latitude: 26.8467,
    longitude: 80.9462,
    timezone: 'Asia/Kolkata',
  ),
  LocationModel(
    id: 'geo-gb-london',
    name: 'London',
    displayName: 'London, Greater London, United Kingdom',
    country: 'United Kingdom',
    countryCode: 'GB',
    state: 'England',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
  ),
  LocationModel(
    id: 'geo-us-newyork',
    name: 'New York',
    displayName: 'New York, New York, United States',
    country: 'United States',
    countryCode: 'US',
    state: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
  ),
  LocationModel(
    id: 'geo-ae-dubai',
    name: 'Dubai',
    displayName: 'Dubai, Dubai, United Arab Emirates',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    state: 'Dubai',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
  ),
  LocationModel(
    id: 'geo-sg-singapore',
    name: 'Singapore',
    displayName: 'Singapore, Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: 'Asia/Singapore',
  ),
  LocationModel(
    id: 'geo-ca-toronto',
    name: 'Toronto',
    displayName: 'Toronto, Ontario, Canada',
    country: 'Canada',
    countryCode: 'CA',
    state: 'Ontario',
    latitude: 43.6532,
    longitude: -79.3832,
    timezone: 'America/Toronto',
  ),
  LocationModel(
    id: 'geo-au-sydney',
    name: 'Sydney',
    displayName: 'Sydney, New South Wales, Australia',
    country: 'Australia',
    countryCode: 'AU',
    state: 'New South Wales',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
  ),
];
