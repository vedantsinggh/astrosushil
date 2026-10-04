import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/location_repository.dart';
import '../models/location_model.dart';

/// Provider for LocationRepository
final locationRepositoryProvider = Provider<LocationRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return LocationRepository(apiClient: apiClient);
});

/// State for location search
class LocationSearchState {
  final bool isLoading;
  final List<LocationModel> suggestions;
  final String? errorMessage;
  final String query;

  const LocationSearchState({
    this.isLoading = false,
    this.suggestions = const [],
    this.errorMessage,
    this.query = '',
  });

  LocationSearchState copyWith({
    bool? isLoading,
    List<LocationModel>? suggestions,
    String? errorMessage,
    String? query,
  }) {
    return LocationSearchState(
      isLoading: isLoading ?? this.isLoading,
      suggestions: suggestions ?? this.suggestions,
      errorMessage: errorMessage,
      query: query ?? this.query,
    );
  }
}

/// Notifier for search queries
class LocationSearchNotifier extends StateNotifier<LocationSearchState> {
  final LocationRepository _repository;

  LocationSearchNotifier(this._repository) : super(const LocationSearchState());

  Future<void> search(String query) async {
    final trimmed = query.trim();
    if (trimmed.length < 2) {
      state = state.copyWith(suggestions: [], query: trimmed, isLoading: false, errorMessage: null);
      return;
    }

    state = state.copyWith(isLoading: true, errorMessage: null, query: trimmed);

    try {
      final results = await _repository.searchLocations(trimmed);
      if (!mounted) return;
      // Ensure state only updates if query is still relevant
      if (state.query == trimmed) {
        state = state.copyWith(isLoading: false, suggestions: results);
      }
    } catch (e) {
      if (!mounted) return;
      if (state.query == trimmed) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Unable to load location suggestions. Please check your connection.',
        );
      }
    }
  }

  void clear() {
    state = const LocationSearchState();
  }
}

final locationSearchNotifierProvider =
    StateNotifierProvider.autoDispose<LocationSearchNotifier, LocationSearchState>((ref) {
  final repo = ref.watch(locationRepositoryProvider);
  return LocationSearchNotifier(repo);
});
