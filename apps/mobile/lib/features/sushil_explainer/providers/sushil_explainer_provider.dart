import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
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
        message: friendlyErrorText(e, isHindi: isHindi),
      );

      state = AsyncValue.error(e, stackTrace);
      return errorModel;
    }
  }

  /// Maps a failure to short, friendly copy. Never exposes raw exception text.
  static String friendlyErrorText(Object error, {bool isHindi = false}) {
    if (error is AuthenticationException) {
      return isHindi
          ? 'सुशील सर की व्याख्या देखने के लिए कृपया साइन इन करें।'
          : 'Please sign in to get Sushil Sir\'s explanation.';
    }
    if (error is RateLimitException) {
      return isHindi
          ? 'बहुत सारे अनुरोध हुए हैं। कृपया एक क्षण रुककर पुनः प्रयास करें।'
          : 'Too many requests just now. Please wait a moment and try again.';
    }
    if (error is NetworkException && error is! TimeoutException) {
      return isHindi
          ? 'सुशील सर अभी कनेक्ट नहीं हो सके। कृपया नेटवर्क जांचें और पुनः प्रयास करें।'
          : "Sushil Sir couldn't connect right now. Please check your network and try again.";
    }
    return isHindi
        ? 'सुशील सर अभी उपलब्ध नहीं हैं। कृपया थोड़ी देर में पुनः प्रयास करें।'
        : 'Sushil Sir is unavailable right now. Please try again in a moment.';
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
