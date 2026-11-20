import 'dart:convert';
import '../../../core/storage/secure_storage_service.dart';
import '../models/birth_profile_model.dart';

class LocalGuestBirthProfileService {
  final SecureStorageService _storage;

  static const String guestProfileId = 'guest_profile_local';

  LocalGuestBirthProfileService(this._storage);

  /// Fetch the guest's own saved birth profile, or null if none was saved.
  /// Never substitutes an invented default person.
  Future<BirthProfileModel?> getGuestProfile() async {
    final raw = await _storage.read(key: StorageKeys.guestBirthProfile);
    if (raw == null || raw.isEmpty) return null;
    try {
      final jsonMap = jsonDecode(raw) as Map<String, dynamic>;
      return BirthProfileModel.fromJson(jsonMap);
    } catch (_) {
      return null;
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
      country: dto.country,
      countryCode: dto.countryCode,
      state: dto.state,
      isResolved: dto.isResolved,
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
      country: profile.country,
      countryCode: profile.countryCode,
      state: profile.state,
      isResolved: profile.isResolved,
      createdAt: profile.createdAt,
      updatedAt: DateTime.now(),
    );

    final jsonStr = jsonEncode(updated.toJson());
    await _storage.write(key: StorageKeys.guestBirthProfile, value: jsonStr);
    return updated;
  }

  /// Returns the guest-created profile saved on this device only when it should
  /// be offered for saving to the signed-in account:
  /// - it is a genuine guest record (written by [saveGuestProfile]) with real
  ///   birth details, and
  /// - the account does not already hold the same person.
  ///
  /// Stale or already-saved records are cleared so they never prompt again.
  /// Duplicate matching mirrors the backend's idempotent migrate check
  /// (same name ignoring case, same date of birth, same place within 0.001 deg).
  Future<BirthProfileModel?> getPendingGuestProfile(List<BirthProfileModel> accountProfiles) async {
    final guest = await getGuestProfile();
    if (guest == null) return null;

    final isGenuineGuestRecord = guest.id == guestProfileId &&
        guest.userId == 'guest' &&
        guest.name.trim().isNotEmpty &&
        guest.dateOfBirth.trim().isNotEmpty &&
        guest.timeOfBirth.trim().isNotEmpty;
    if (!isGenuineGuestRecord) {
      await clearGuestProfile();
      return null;
    }

    final alreadyOnAccount = accountProfiles.any(
      (p) =>
          p.name.trim().toLowerCase() == guest.name.trim().toLowerCase() &&
          p.dateOfBirth == guest.dateOfBirth &&
          (p.latitude - guest.latitude).abs() < 0.001 &&
          (p.longitude - guest.longitude).abs() < 0.001,
    );
    if (alreadyOnAccount) {
      await clearGuestProfile();
      return null;
    }

    return guest;
  }

  /// Clear local guest birth profile after migration or explicit cleanup
  Future<void> clearGuestProfile() async {
    await _storage.delete(key: StorageKeys.guestBirthProfile);
  }
}
