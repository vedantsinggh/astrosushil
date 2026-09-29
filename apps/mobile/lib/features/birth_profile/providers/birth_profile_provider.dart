import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/network_state_manager.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/birth_profile_repository.dart';
import '../data/local_guest_birth_profile_service.dart';
import '../models/birth_profile_model.dart';

/// Provider for LocalGuestBirthProfileService
final localGuestBirthProfileServiceProvider = Provider<LocalGuestBirthProfileService>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return LocalGuestBirthProfileService(storage);
});

/// Provider for BirthProfileRepository
final birthProfileRepositoryProvider = Provider<BirthProfileRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final cacheService = ref.watch(localCacheServiceProvider);
  final guestService = ref.watch(localGuestBirthProfileServiceProvider);
  return BirthProfileRepository(
    apiClient: apiClient,
    cacheService: cacheService,
    guestService: guestService,
  );
});

/// State model for birth profiles list
class BirthProfilesState {
  final bool isLoading;
  final List<BirthProfileModel> profiles;
  final String? errorMessage;

  const BirthProfilesState({
    this.isLoading = false,
    this.profiles = const [],
    this.errorMessage,
  });

  BirthProfilesState copyWith({
    bool? isLoading,
    List<BirthProfileModel>? profiles,
    String? errorMessage,
  }) {
    return BirthProfilesState(
      isLoading: isLoading ?? this.isLoading,
      profiles: profiles ?? this.profiles,
      errorMessage: errorMessage,
    );
  }
}

/// Provider managing list of birth profiles for the current user or guest
final birthProfilesListNotifierProvider =
    StateNotifierProvider<BirthProfilesNotifier, BirthProfilesState>((ref) {
  final repository = ref.watch(birthProfileRepositoryProvider);
  final authState = ref.watch(authStateProvider);
  return BirthProfilesNotifier(repository, authState);
});

class BirthProfilesNotifier extends StateNotifier<BirthProfilesState> {
  final BirthProfileRepository _repository;
  final AuthState _authState;

  BirthProfilesNotifier(this._repository, this._authState) : super(const BirthProfilesState()) {
    fetchProfiles();
  }

  Future<void> fetchProfiles() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      if (_authState.isGuest) {
        final guestProfile = await _repository.getGuestProfile();
        state = state.copyWith(
          isLoading: false,
          profiles: guestProfile != null ? [guestProfile] : [],
        );
      } else {
        final profiles = await _repository.getProfiles();
        state = state.copyWith(isLoading: false, profiles: profiles);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<BirthProfileModel?> createProfile(CreateBirthProfileDto dto) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      if (_authState.isGuest) {
        final newProfile = await _repository.saveGuestProfile(dto);
        state = state.copyWith(isLoading: false, profiles: [newProfile]);
        return newProfile;
      } else {
        final newProfile = await _repository.createProfile(dto);
        final updatedList = [newProfile, ...state.profiles];
        state = state.copyWith(isLoading: false, profiles: updatedList);
        return newProfile;
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return null;
    }
  }

  /// Migrate guest profile to user account
  Future<BirthProfileModel?> migrateGuestProfile(CreateBirthProfileDto dto) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final migrated = await _repository.migrateGuestProfile(dto);
      await fetchProfiles();
      return migrated;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return null;
    }
  }
}

/// Family provider to fetch a single profile by ID
final singleBirthProfileProvider =
    FutureProvider.family<BirthProfileModel, String>((ref, id) async {
  final repository = ref.watch(birthProfileRepositoryProvider);
  if (id == LocalGuestBirthProfileService.guestProfileId) {
    final guest = await repository.getGuestProfile();
    if (guest != null) return guest;
  }
  return await repository.getProfileById(id);
});

/// StateProvider to track the explicitly selected birth profile ID
final selectedBirthProfileIdProvider = StateProvider<String?>((ref) => null);

/// Provider resolving the currently active BirthProfileModel:
/// returns the explicitly selected profile if set and exists,
/// else falls back to the first profile in the list (or guest profile).
final selectedBirthProfileProvider = Provider<BirthProfileModel?>((ref) {
  final profilesState = ref.watch(birthProfilesListNotifierProvider);
  final selectedId = ref.watch(selectedBirthProfileIdProvider);

  if (profilesState.profiles.isEmpty) {
    return null;
  }

  if (selectedId != null) {
    final matched = profilesState.profiles.where((p) => p.id == selectedId);
    if (matched.isNotEmpty) {
      return matched.first;
    }
  }

  return profilesState.profiles.first;
});

