import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/network/api_client.dart';
import '../../birth_profile/data/local_guest_birth_profile_service.dart';
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

    // The on-device guest profile has no server record (and is not a UUID), so it must not be
    // sent as birthProfileId: the backend would reject the whole request with 400.
    final requestContext = context.birthProfileId == LocalGuestBirthProfileService.guestProfileId
        ? ExplanationContext(
            feature: context.feature,
            screenTitle: context.screenTitle,
            purpose: context.purpose,
            mode: context.mode,
            language: context.language,
            astrologyData: context.astrologyData,
            importantValues: context.importantValues,
            availableSections: context.availableSections,
            userProfileContext: context.userProfileContext,
            displayPreferences: context.displayPreferences,
          )
        : context;

    final response = await _apiClient.post(
      '/jyoti/explain',
      // The backend bounds its LLM retries to ~50s and always answers before this,
      // with either the reply or a clean AI_SERVICE_UNAVAILABLE error.
      timeout: const Duration(seconds: 60),
      data: requestContext.toJson(),
    );

    final data = response['data'] as Map<String, dynamic>? ?? response;
    final rawMessage = data['message'];
    if (rawMessage is! String || rawMessage.trim().isEmpty) {
      // Never substitute invented copy for a missing explanation.
      throw const ServerException('Sushil Sir did not return an explanation.', code: 'SUSHIL_EMPTY_RESPONSE');
    }

    return SushilExplanationModel.fromJson(
      data,
      feature: context.feature,
      screenTitle: context.screenTitle,
      mode: context.mode,
      language: context.language,
    );
  }
}
