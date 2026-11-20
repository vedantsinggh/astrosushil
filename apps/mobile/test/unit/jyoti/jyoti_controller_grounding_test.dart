import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/errors/app_exception.dart';
import 'package:astro_mobile/features/birth_profile/data/local_guest_birth_profile_service.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_api_repository.dart';
import 'package:astro_mobile/features/jyoti/models/jyoti_message.dart';
import 'package:astro_mobile/features/jyoti/providers/jyoti_controller.dart';

/// Records what the controller sends so grounding and history bugs are caught.
class _RecordingJyotiApi extends Fake implements JyotiApiRepository {
  final List<String?> profileIds = [];
  final List<List<String>> histories = [];
  final List<String> messages = [];
  Object? failWith;

  @override
  Future<List<JyotiMessageModel>> sendMessage({
    required String message,
    required List<JyotiMessageModel> recentHistory,
    String? currentScreen,
    String? birthProfileId,
  }) async {
    messages.add(message);
    profileIds.add(birthProfileId);
    histories.add(recentHistory.map((m) => m.text).toList());
    final err = failWith;
    if (err != null) {
      failWith = null;
      throw err;
    }
    return [JyotiMessageModel.jyotiText('r_${messages.length}', 'answer to $message')];
  }
}

void main() {
  group('JyotiController grounding & failure handling', () {
    test('sends the active birth profile id so answers use the chart the user selected', () async {
      final api = _RecordingJyotiApi();
      final controller = JyotiController(apiRepo: api, activeProfileId: () => 'profile-123');
      await controller.sendMessage('What is my Moon sign?');
      expect(api.profileIds.single, 'profile-123');
    });

    test('never sends the on-device guest profile id to the backend', () async {
      final api = _RecordingJyotiApi();
      final controller = JyotiController(
        apiRepo: api,
        activeProfileId: () => LocalGuestBirthProfileService.guestProfileId,
      );
      await controller.sendMessage('Hello');
      expect(api.profileIds.single, isNull);
    });

    test('history excludes the question being asked (it was previously sent twice)', () async {
      final api = _RecordingJyotiApi();
      final controller = JyotiController(apiRepo: api);
      await controller.sendMessage('first');
      await controller.sendMessage('second');
      expect(api.histories[0], isEmpty);
      expect(api.histories[1], ['first', 'answer to first']);
    });

    test('a failure shows a friendly error bubble, and Try again re-sends the failed question', () async {
      final api = _RecordingJyotiApi()..failWith = const ServerException('AI_SERVICE_UNAVAILABLE');
      final controller = JyotiController(apiRepo: api);

      await controller.sendMessage('Explain my 10th house');
      expect(controller.state.isThinking, isFalse);
      expect(controller.state.messages.last.type, JyotiMessageType.error);
      expect(controller.state.messages.last.text, 'Jyoti is unavailable right now. Please try again.');

      await controller.retryLastMessage();
      expect(api.messages, ['Explain my 10th house', 'Explain my 10th house']);
      final types = controller.state.messages.map((m) => m.type).toList();
      expect(types, [JyotiMessageType.user, JyotiMessageType.jyotiText]);
      expect(controller.state.messages.last.text, 'answer to Explain my 10th house');
    });

    test('guests get a sign-in prompt instead of a failing authenticated call', () async {
      final api = _RecordingJyotiApi();
      final controller = JyotiController(apiRepo: api, isGuest: () => true);
      await controller.sendMessage('Explain my chart');
      expect(api.messages, isEmpty);
      final last = controller.state.messages.last;
      expect(last.type, JyotiMessageType.actionCard);
      expect(last.action?.type, JyotiActionType.openLogin);
    });

    test('friendlyErrorText never exposes raw exception text', () {
      expect(JyotiController.friendlyErrorText(const RateLimitException('x')), contains('wait a moment'));
      expect(JyotiController.friendlyErrorText(const TimeoutException('x')), contains('taking too long'));
      expect(JyotiController.friendlyErrorText(const AuthenticationException('x')), contains('sign in'));
      expect(JyotiController.friendlyErrorText(Exception('stack trace at /srv/app.ts')),
          'Jyoti is unavailable right now. Please try again.');
    });
  });
}
