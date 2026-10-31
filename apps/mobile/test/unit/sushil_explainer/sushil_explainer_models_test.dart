import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/sushil_explainer/models/explanation_context.dart';
import 'package:astro_mobile/features/sushil_explainer/models/sushil_explanation_model.dart';
import 'package:astro_mobile/features/sushil_explainer/data/sushil_explainer_repository.dart';
import 'package:astro_mobile/features/sushil_explainer/providers/sushil_explainer_provider.dart';
import 'package:astro_mobile/core/network/api_client.dart';

class MockApiClient extends Fake implements ApiClient {
  Map<String, dynamic>? mockResponse;
  Exception? errorToThrow;
  int callCount = 0;

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Duration? timeout,
    CancelToken? cancelToken,
  }) async {
    callCount++;
    if (errorToThrow != null) {
      throw errorToThrow!;
    }
    return mockResponse ?? <String, dynamic>{'data': <String, dynamic>{}};
  }
}

void main() {
  group('Sushil Explainer Unit & Model Tests', () {
    test('1. ExplanationContext serializes to valid backend payload and generates deterministic cache key', () {
      const context = ExplanationContext(
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
        purpose: 'Explain natal chart placements',
        astrologyData: {
          'ascendant': {'sign': 'Leo', 'degree': 14.5},
        },
        importantValues: {'lagna': 'Leo'},
        userProfileContext: {'name': 'Test User'},
      );

      final json = context.toJson();
      expect(json['feature'], 'birth_chart');
      expect(json['screenTitle'], 'Birth Chart');
      expect(json['purpose'], 'Explain natal chart placements');
      expect(json['context']['astrologyData']['ascendant']['sign'], 'Leo');

      final key1 = context.cacheKey;
      const contextIdentical = ExplanationContext(
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
        astrologyData: {
          'ascendant': {'sign': 'Leo', 'degree': 14.5},
        },
        importantValues: {'lagna': 'Leo'},
      );
      final key2 = contextIdentical.cacheKey;
      expect(key1, key2);
    });

    test('2. SushilExplanationModel parses structured response properly', () {
      final json = {
        'headline': 'Strategic Leadership and Discipline',
        'message': 'Your Sun in the 10th House empowers career success.\\n\\nStay consistent in your efforts.',
        'keyPoints': [
          'Sun in 10th house brings ambition.',
          'Discipline leads to long-term gains.',
        ],
        'disclaimer': 'AI Sushil Sir interpretation.',
      };

      final model = SushilExplanationModel.fromJson(
        json,
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
      );

      expect(model.headline, 'Strategic Leadership and Discipline');
      expect(model.message, contains('Your Sun in the 10th House'));
      expect(model.message, isNot(contains(r'\n')));
      expect(model.keyPoints, hasLength(2));
      expect(model.isError, isFalse);
      expect(model.isEmptyData, isFalse);
    });

    test('3. SushilExplanationModel emptyData and error factory constructors', () {
      final emptyModel = SushilExplanationModel.emptyData(
        feature: 'shadbala',
        screenTitle: 'Planetary Strength',
      );
      expect(emptyModel.isEmptyData, isTrue);
      expect(emptyModel.headline, 'Data Unavailable');

      final errorModel = SushilExplanationModel.error(
        feature: 'vimshottari_dasha',
        screenTitle: 'Vimshottari Dasha',
        message: 'Network timeout',
      );
      expect(errorModel.isError, isTrue);
      expect(errorModel.message, 'Network timeout');
    });

    test('4. SushilExplainerNotifier caches explanation in memory and avoids repeated API calls', () async {
      final mockClient = MockApiClient();
      mockClient.mockResponse = {
        'data': {
          'headline': 'Ascendant Highlights',
          'message': 'Your lagna indicates vitality.',
          'keyPoints': ['Strong vitality.'],
        },
      };

      final repo = SushilExplainerRepository(apiClient: mockClient);
      final notifier = SushilExplainerNotifier(repo);

      const ctx = ExplanationContext(
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
        astrologyData: {'lagna': 'Aries'},
      );

      // First call -> hits API
      final res1 = await notifier.fetchExplanation(ctx);
      expect(res1.headline, 'Ascendant Highlights');
      expect(mockClient.callCount, 1);

      // Second call -> hits cache (no new API call)
      final res2 = await notifier.fetchExplanation(ctx);
      expect(res2.headline, 'Ascendant Highlights');
      expect(mockClient.callCount, 1);

      // Force refresh -> hits API again
      final res3 = await notifier.fetchExplanation(ctx, forceRefresh: true);
      expect(res3.headline, 'Ascendant Highlights');
      expect(mockClient.callCount, 2);
    });

    test('5. ExplanationContext differentiates cache keys across modes, languages, and profile IDs', () {
      const baseContext = ExplanationContext(
        feature: 'course_detail',
        screenTitle: 'Gupta Nadi Masterclass',
        mode: 'standard',
        language: 'en',
        birthProfileId: 'profile_1',
      );

      final simpleContext = baseContext.copyWith(mode: 'simple');
      final hindiContext = baseContext.copyWith(language: 'hi');
      final user2Context = baseContext.copyWith(birthProfileId: 'profile_2');

      expect(baseContext.cacheKey, isNot(equals(simpleContext.cacheKey)));
      expect(baseContext.cacheKey, isNot(equals(hindiContext.cacheKey)));
      expect(baseContext.cacheKey, isNot(equals(user2Context.cacheKey)));

      expect(simpleContext.toJson()['mode'], 'simple');
      expect(hindiContext.toJson()['language'], 'hi');
      expect(user2Context.toJson()['birthProfileId'], 'profile_2');
    });

    test('6. SushilExplanationModel generates accurate Hindi fallbacks for empty and error states', () {
      final hindiEmpty = SushilExplanationModel.emptyData(
        feature: 'consultation_prep',
        screenTitle: 'परामर्श की तैयारी',
        language: 'hi',
      );
      expect(hindiEmpty.headline, 'डेटा उपलब्ध नहीं');
      expect(hindiEmpty.message, contains('पर्याप्त जानकारी'));
      expect(hindiEmpty.isEmptyData, isTrue);

      final hindiError = SushilExplanationModel.error(
        feature: 'shop_product',
        screenTitle: 'रुद्राक्ष माला',
        message: 'कनेक्शन त्रुटि',
        language: 'hi',
      );
      expect(hindiError.headline, 'व्याख्या अनुपलब्ध');
      expect(hindiError.isError, isTrue);
      expect(hindiError.message, 'कनेक्शन त्रुटि');
    });

    test('7. ExplanationContext accurately handles Phase 8 features (courses, consultations, shop)', () {
      const courseLessonCtx = ExplanationContext(
        feature: 'course_lesson',
        screenTitle: 'Karma Alignment Principle',
        data: {'lessonId': 'lsn_123', 'duration': 1800},
      );
      expect(courseLessonCtx.toJson()['feature'], 'course_lesson');
      expect(courseLessonCtx.toJson()['context']['astrologyData']['lessonId'], 'lsn_123');

      const shopProductCtx = ExplanationContext(
        feature: 'shop_product',
        screenTitle: 'Shri Yantra Plate',
        data: {'productId': 'prod_456', 'isPhysical': true},
      );
      expect(shopProductCtx.toJson()['feature'], 'shop_product');
      expect(shopProductCtx.toJson()['context']['astrologyData']['isPhysical'], true);
    });
  });
}
