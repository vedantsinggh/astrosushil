import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/errors/app_exception.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/features/birth_profile/data/local_guest_birth_profile_service.dart';
import 'package:astro_mobile/features/sushil_explainer/data/sushil_explainer_repository.dart';
import 'package:astro_mobile/features/sushil_explainer/models/explanation_context.dart';
import 'package:astro_mobile/features/sushil_explainer/models/sushil_explanation_model.dart';
import 'package:astro_mobile/features/sushil_explainer/providers/sushil_explainer_provider.dart';

class _RecordingApiClient extends Fake implements ApiClient {
  Map<String, dynamic> response = {'data': <String, dynamic>{}};
  Object? errorToThrow;
  dynamic lastData;
  int calls = 0;

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
    Duration? timeout,
  }) async {
    calls++;
    lastData = data;
    final err = errorToThrow;
    if (err != null) throw err;
    return response;
  }
}

const _ctx = ExplanationContext(
  feature: 'birth_chart',
  screenTitle: 'Birth Chart',
  astrologyData: {'ascendant': 'Virgo'},
);

void main() {
  group('Sushil explainer failure handling', () {
    test('guest profile id is not sent (backend would reject it with 400)', () async {
      final client = _RecordingApiClient()
        ..response = {
          'data': {'headline': 'H', 'message': 'Explained.', 'keyPoints': <String>[]},
        };
      final repo = SushilExplainerRepository(apiClient: client);
      await repo.explainScreen(_ctx.copyWith(birthProfileId: LocalGuestBirthProfileService.guestProfileId));
      expect((client.lastData as Map<String, dynamic>).containsKey('birthProfileId'), isFalse);
    });

    test('an empty backend message is an error, not invented filler copy', () async {
      final client = _RecordingApiClient()..response = {'data': <String, dynamic>{'headline': 'H'}};
      final repo = SushilExplainerRepository(apiClient: client);
      await expectLater(repo.explainScreen(_ctx), throwsA(isA<ServerException>()));
    });

    test('no generic key points are injected when the model returned none', () {
      final model = SushilExplanationModel.fromJson(
        const {'headline': 'H', 'message': 'M', 'keyPoints': <String>[]},
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
      );
      expect(model.keyPoints, isEmpty);
    });

    test('a 503 from the backend becomes a friendly retryable error and is not cached', () async {
      final client = _RecordingApiClient()..errorToThrow = const ServerException('AI_SERVICE_UNAVAILABLE');
      final notifier = SushilExplainerNotifier(SushilExplainerRepository(apiClient: client));

      final failed = await notifier.fetchExplanation(_ctx);
      expect(failed.isError, isTrue);
      expect(failed.message, 'Sushil Sir is unavailable right now. Please try again in a moment.');

      client
        ..errorToThrow = null
        ..response = {
          'data': {'headline': 'H', 'message': 'Now explained.', 'keyPoints': ['k']},
        };
      final retried = await notifier.fetchExplanation(_ctx, forceRefresh: true);
      expect(retried.isError, isFalse);
      expect(retried.message, 'Now explained.');
      expect(client.calls, 2);
    });

    test('friendlyErrorText maps auth, rate limit and network failures', () {
      expect(SushilExplainerNotifier.friendlyErrorText(const AuthenticationException('x')), contains('sign in'));
      expect(SushilExplainerNotifier.friendlyErrorText(const RateLimitException('x')), contains('wait a moment'));
      expect(SushilExplainerNotifier.friendlyErrorText(const NetworkException('x')), contains('check your network'));
      expect(SushilExplainerNotifier.friendlyErrorText(const TimeoutException('x')), contains('unavailable right now'));
      expect(SushilExplainerNotifier.friendlyErrorText(const ServerException('x'), isHindi: true), contains('उपलब्ध नहीं'));
    });
  });
}
