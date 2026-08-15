import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/birth_profile_repository.dart';
import '../models/birth_profile_model.dart';

/// Provider for BirthProfileRepository
final birthProfileRepositoryProvider = Provider<BirthProfileRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return BirthProfileRepository(apiClient: apiClient);
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

/// Provider managing list of birth profiles for the current user
final birthProfilesListNotifierProvider =
    StateNotifierProvider<BirthProfilesNotifier, BirthProfilesState>((ref) {
  final repository = ref.watch(birthProfileRepositoryProvider);
  return BirthProfilesNotifier(repository);
});

class BirthProfilesNotifier extends StateNotifier<BirthProfilesState> {
  final BirthProfileRepository _repository;

  BirthProfilesNotifier(this._repository) : super(const BirthProfilesState()) {
    fetchProfiles();
  }

  Future<void> fetchProfiles() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final profiles = await _repository.getProfiles();
      state = state.copyWith(isLoading: false, profiles: profiles);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<BirthProfileModel?> createProfile(CreateBirthProfileDto dto) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final newProfile = await _repository.createProfile(dto);
      final updatedList = [newProfile, ...state.profiles];
      state = state.copyWith(isLoading: false, profiles: updatedList);
      return newProfile;
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
  return await repository.getProfileById(id);
});
