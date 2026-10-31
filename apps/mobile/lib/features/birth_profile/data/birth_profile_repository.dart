import '../../../core/network/api_client.dart';
import '../../../core/storage/local_cache_service.dart';
import '../models/birth_profile_model.dart';
import 'local_guest_birth_profile_service.dart';

/// Repository for Birth Profile API endpoints and local guest storage
class BirthProfileRepository {
  final ApiClient _apiClient;
  final LocalCacheService? _cacheService;
  final LocalGuestBirthProfileService? _guestService;

  static const String _profilesCacheKey = 'user_birth_profiles_list';

  BirthProfileRepository({
    required ApiClient apiClient,
    LocalCacheService? cacheService,
    LocalGuestBirthProfileService? guestService,
  })  : _apiClient = apiClient,
        _cacheService = cacheService,
        _guestService = guestService;

  /// Fetch guest profile from local storage
  Future<BirthProfileModel?> getGuestProfile() async {
    if (_guestService == null) return null;
    return await _guestService!.getGuestProfile();
  }

  /// Save local guest birth profile
  Future<BirthProfileModel> saveGuestProfile(CreateBirthProfileDto dto) async {
    if (_guestService == null) {
      throw Exception('Guest storage service unavailable');
    }
    return await _guestService!.saveGuestProfile(dto);
  }

  /// Clear local guest birth profile
  Future<void> clearGuestProfile() async {
    if (_guestService != null) {
      await _guestService!.clearGuestProfile();
    }
  }

  /// Migrate guest birth profile to authenticated DB user account
  Future<BirthProfileModel> migrateGuestProfile(CreateBirthProfileDto dto) async {
    final response = await _apiClient.post(
      '/birth-profiles/migrate',
      data: dto.toJson(),
    );
    final migratedProfile = BirthProfileModel.fromJson(response);

    // Clear local guest profile after successful migration
    await clearGuestProfile();

    // Invalidate profiles cache
    final cache = _cacheService;
    if (cache != null) {
      await cache.remove(_profilesCacheKey);
    }

    return migratedProfile;
  }

  /// Fetch all birth profiles owned by authenticated user with offline caching
  Future<List<BirthProfileModel>> getProfiles({bool forceRefresh = false}) async {
    final cache = _cacheService;
    // 1. Try local cache first
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<List<BirthProfileModel>>(
        key: _profilesCacheKey,
        fromJson: (raw) => (raw as List)
            .map((item) => BirthProfileModel.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList(),
      );
      if (cached != null && cached.isNotEmpty) {
        return cached;
      }
    }

    // 2. Network fetch
    try {
      final responseList = await _apiClient.getList('/birth-profiles');
      final profiles = responseList
          .map((item) => BirthProfileModel.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();

      // Update cache
      if (cache != null) {
        await cache.put<List<BirthProfileModel>>(
          key: _profilesCacheKey,
          data: profiles,
          ttl: const Duration(days: 7),
          toJson: (val) => val.map((e) => e.toJson()).toList(),
        );
      }

      return profiles;
    } catch (e) {
      // Fallback to cache
      if (cache != null) {
        final cached = await cache.get<List<BirthProfileModel>>(
          key: _profilesCacheKey,
          fromJson: (raw) => (raw as List)
              .map((item) => BirthProfileModel.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList(),
        );
        if (cached != null && cached.isNotEmpty) {
          return cached;
        }
      }
      rethrow;
    }
  }

  /// Fetch a single birth profile by ID
  Future<BirthProfileModel> getProfileById(String id) async {
    final profiles = await getProfiles();
    final match = profiles.where((p) => p.id == id).firstOrNull;
    if (match != null) return match;

    final response = await _apiClient.get('/birth-profiles/$id');
    return BirthProfileModel.fromJson(response);
  }

  /// Create a new birth profile
  Future<BirthProfileModel> createProfile(CreateBirthProfileDto dto) async {
    final response = await _apiClient.post(
      '/birth-profiles',
      data: dto.toJson(),
    );
    final newProfile = BirthProfileModel.fromJson(response);

    // Invalidate profile cache so next fetch is fresh
    final cache = _cacheService;
    if (cache != null) {
      await cache.remove(_profilesCacheKey);
    }

    return newProfile;
  }

  /// Delete a birth profile
  Future<void> deleteProfile(String id, {bool isGuest = false}) async {
    if (isGuest) {
      await clearGuestProfile();
      return;
    }
    await _apiClient.delete('/birth-profiles/$id');
    final cache = _cacheService;
    if (cache != null) {
      await cache.remove(_profilesCacheKey);
    }
  }

  /// Update a birth profile
  Future<BirthProfileModel> updateProfile(String id, CreateBirthProfileDto dto, {bool isGuest = false}) async {
    if (isGuest) {
      return await saveGuestProfile(dto);
    }
    final response = await _apiClient.put(
      '/birth-profiles/$id',
      data: dto.toJson(),
    );
    final updated = BirthProfileModel.fromJson(response);
    final cache = _cacheService;
    if (cache != null) {
      await cache.remove(_profilesCacheKey);
    }
    return updated;
  }
}
