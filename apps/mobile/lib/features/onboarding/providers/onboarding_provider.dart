import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/onboarding_repository.dart';

/// Onboarding repository provider
final onboardingRepositoryProvider = Provider<OnboardingRepository>((ref) {
  final storageService = ref.watch(secureStorageProvider);
  return OnboardingRepository(storageService);
});

/// Onboarding state notifier tracking completed status
final onboardingCompletedProvider = StateNotifierProvider<OnboardingNotifier, bool>((ref) {
  final repository = ref.watch(onboardingRepositoryProvider);
  return OnboardingNotifier(repository);
});

class OnboardingNotifier extends StateNotifier<bool> {
  final OnboardingRepository _repository;

  OnboardingNotifier(this._repository) : super(false) {
    checkCompletionStatus();
  }

  Future<void> checkCompletionStatus() async {
    state = await _repository.isOnboardingCompleted();
  }

  Future<void> completeOnboarding() async {
    await _repository.setOnboardingCompleted();
    state = true;
  }
}
