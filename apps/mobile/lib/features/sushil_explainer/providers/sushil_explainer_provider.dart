import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/sushil_explainer_repository.dart';
import '../models/explanation_context.dart';
import '../models/sushil_explanation_model.dart';

/// Provider for SushilExplainerRepository
final sushilExplainerRepositoryProvider = Provider<SushilExplainerRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SushilExplainerRepository(apiClient: apiClient);
});

/// State notifier managing active explanation requests and in-memory screen session caching
class SushilExplainerNotifier extends StateNotifier<AsyncValue<SushilExplanationModel?>> {
  final SushilExplainerRepository _repository;
  final Map<String, SushilExplanationModel> _sessionCache = {};

  SushilExplainerNotifier(this._repository) : super(const AsyncValue.data(null));

  /// Requests or retrieves cached explanation for the given screen context
  Future<SushilExplanationModel> fetchExplanation(
    ExplanationContext context, {
    bool forceRefresh = false,
  }) async {
    final key = context.cacheKey;

    if (kDebugMode) {
      developer.log(
        'Event: sushil_explainer_opened | feature: ${context.feature} | screen: ${context.screenTitle}',
        name: 'analytics.sushil_explainer',
      );
    }

    // 1. Check in-memory screen session cache
    if (!forceRefresh && _sessionCache.containsKey(key)) {
      final cached = _sessionCache[key]!;
      state = AsyncValue.data(cached);
      return cached;
    }

    // 2. Set loading state
    state = const AsyncValue.loading();

    try {
      final result = await _repository.explainScreen(context);
      _sessionCache[key] = result;
      state = AsyncValue.data(result);

      if (kDebugMode) {
        developer.log(
          'Event: sushil_explainer_completed | feature: ${context.feature}',
          name: 'analytics.sushil_explainer',
        );
      }

      return result;
    } catch (e, stackTrace) {
      if (kDebugMode) {
        developer.log(
          'Event: sushil_explainer_failed | feature: ${context.feature} | error: $e',
          name: 'analytics.sushil_explainer',
        );
      }

      final isHindi = context.language == 'hi';
      final errorModel = SushilExplanationModel.error(
        feature: context.feature,
        screenTitle: context.screenTitle,
        mode: context.mode,
        language: context.language,
        message: e.toString().contains('SocketException') || e.toString().contains('connection')
            ? (isHindi
                ? "सुशील सर अभी कनेक्ट नहीं हो सके। कृपया नेटवर्क जांचें और पुनः प्रयास करें।"
                : "Sushil Sir couldn't connect right now. Please check your network and try again.")
            : (isHindi
                ? "सुशील सर अभी इस खंड को नहीं समझा सके। कृपया पुनः प्रयास करें।"
                : "Sushil Sir couldn't explain this section right now. Please try again."),
      );

      state = AsyncValue.error(e, stackTrace);
      return errorModel;
    }
  }

  /// Clears in-memory session cache (e.g. on profile change)
  void clearCache() {
    _sessionCache.clear();
    state = const AsyncValue.data(null);
  }
}

/// Provider for SushilExplainerNotifier
final sushilExplainerProvider =
    StateNotifierProvider<SushilExplainerNotifier, AsyncValue<SushilExplanationModel?>>((ref) {
  final repository = ref.watch(sushilExplainerRepositoryProvider);
  return SushilExplainerNotifier(repository);
});
