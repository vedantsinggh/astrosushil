import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import '../../../core/network/api_client.dart';
import '../models/explanation_context.dart';
import '../models/sushil_explanation_model.dart';

class SushilExplainerRepository {
  final ApiClient _apiClient;

  SushilExplainerRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Requests a one-shot plain-language contextual explanation from AI Sushil Sir.
  Future<SushilExplanationModel> explainScreen(ExplanationContext context) async {
    if (context.astrologyData.isEmpty) {
      return SushilExplanationModel.emptyData(
        feature: context.feature,
        screenTitle: context.screenTitle,
        mode: context.mode,
        language: context.language,
      );
    }

    if (kDebugMode) {
      developer.log(
        '[SUSHIL EXPLAINER] Requesting explanation for feature: ${context.feature}, screen: ${context.screenTitle}, mode: ${context.mode}, lang: ${context.language}',
        name: 'SushilExplainerRepository',
      );
    }

    final response = await _apiClient.post(
      '/jyoti/explain',
      timeout: const Duration(seconds: 45),
      data: context.toJson(),
    );

    final data = response['data'] as Map<String, dynamic>? ?? response;

    return SushilExplanationModel.fromJson(
      data,
      feature: context.feature,
      screenTitle: context.screenTitle,
      mode: context.mode,
      language: context.language,
    );
  }
}
