import '../../../core/storage/secure_storage_service.dart';

/// Repository handling local storage lifecycle of onboarding completion status
class OnboardingRepository {
  final SecureStorageService _storageService;

  OnboardingRepository(this._storageService);

  /// Check if user has previously completed or skipped onboarding
  Future<bool> isOnboardingCompleted() async {
    final value = await _storageService.read(key: StorageKeys.onboardingCompleted);
    return value == 'true';
  }

  /// Mark onboarding as completed in local secure storage
  Future<void> setOnboardingCompleted() async {
    await _storageService.write(
      key: StorageKeys.onboardingCompleted,
      value: 'true',
    );
  }
}
