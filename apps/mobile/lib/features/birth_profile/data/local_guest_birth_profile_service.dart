import 'dart:convert';
import '../../../core/storage/secure_storage_service.dart';
import '../models/birth_profile_model.dart';

class LocalGuestBirthProfileService {
  final SecureStorageService _storage;

  static const String guestProfileId = 'guest_profile_local';

  LocalGuestBirthProfileService(this._storage);

  static final BirthProfileModel defaultGuestProfile = BirthProfileModel(
    id: guestProfileId,
    userId: 'guest',
    name: 'Guest User',
    dateOfBirth: '1995-01-01',
    timeOfBirth: '12:00:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime(1995, 1, 1),
    updatedAt: DateTime(1995, 1, 1),
  );

  /// Fetch local guest birth profile if saved, or return default profile
  Future<BirthProfileModel?> getGuestProfile() async {
    final raw = await _storage.read(key: StorageKeys.guestBirthProfile);
    if (raw == null || raw.isEmpty) return defaultGuestProfile;
    try {
      final jsonMap = jsonDecode(raw) as Map<String, dynamic>;
      return BirthProfileModel.fromJson(jsonMap);
    } catch (_) {
      return defaultGuestProfile;
    }
  }

  /// Save local guest birth profile
  Future<BirthProfileModel> saveGuestProfile(CreateBirthProfileDto dto) async {
    final now = DateTime.now();
    final profile = BirthProfileModel(
      id: guestProfileId,
      userId: 'guest',
      name: dto.name,
      dateOfBirth: dto.dateOfBirth,
      timeOfBirth: dto.timeOfBirth,
      latitude: dto.latitude,
      longitude: dto.longitude,
      timezone: dto.timezone,
      placeName: dto.placeName,
      createdAt: now,
      updatedAt: now,
    );

    final jsonStr = jsonEncode(profile.toJson());
    await _storage.write(key: StorageKeys.guestBirthProfile, value: jsonStr);
    return profile;
  }

  /// Update local guest birth profile
  Future<BirthProfileModel> updateGuestProfile(BirthProfileModel profile) async {
    final updated = BirthProfileModel(
      id: guestProfileId,
      userId: 'guest',
      name: profile.name,
      dateOfBirth: profile.dateOfBirth,
      timeOfBirth: profile.timeOfBirth,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
      placeName: profile.placeName,
      createdAt: profile.createdAt,
      updatedAt: DateTime.now(),
    );

    final jsonStr = jsonEncode(updated.toJson());
    await _storage.write(key: StorageKeys.guestBirthProfile, value: jsonStr);
    return updated;
  }

  /// Clear local guest birth profile after migration or explicit cleanup
  Future<void> clearGuestProfile() async {
    await _storage.delete(key: StorageKeys.guestBirthProfile);
  }
}
