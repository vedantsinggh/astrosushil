import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_mock_data.dart';
import 'package:astro_mobile/features/jyoti/models/jyoti_message.dart';
import 'package:astro_mobile/features/jyoti/providers/jyoti_controller.dart';

void main() {
  group('JyotiController Unit Tests', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    test('Initial state contains empty messages and default suggestions', () {
      final state = container.read(jyotiControllerProvider);
      expect(state.messages, isEmpty);
      expect(state.isThinking, isFalse);
      expect(state.isOffline, isFalse);
      expect(state.suggestions, equals(JyotiMockData.defaultSuggestions));
    });

    test('sendMessage appends user message and simulated Jyoti responses', () async {
      final controller = container.read(jyotiControllerProvider.notifier);
      final future = controller.sendMessage('Generate my Kundli');
      
      var state = container.read(jyotiControllerProvider);
      expect(state.isThinking, isTrue);
      expect(state.messages.length, equals(1));
      expect(state.messages.first.type, equals(JyotiMessageType.user));

      await future;

      state = container.read(jyotiControllerProvider);
      expect(state.isThinking, isFalse);
      // User message + 2 Jyoti responses (text + action card)
      expect(state.messages.length, equals(3));
      expect(state.messages[1].type, equals(JyotiMessageType.jyotiText));
      expect(state.messages[2].type, equals(JyotiMessageType.actionCard));
      expect(state.messages[2].action?.type, equals(JyotiActionType.openBirthChart));
    });

    test('sendMessage handles offline mode properly', () async {
      final controller = container.read(jyotiControllerProvider.notifier);
      controller.setOffline(true);
      expect(container.read(jyotiControllerProvider).isOffline, isTrue);

      await controller.sendMessage('Explain 7th house');

      final state = container.read(jyotiControllerProvider);
      expect(state.messages.length, equals(2));
      expect(state.messages[0].type, equals(JyotiMessageType.user));
      expect(state.messages[1].type, equals(JyotiMessageType.offline));
    });

    test('clearChat resets state back to empty', () async {
      final controller = container.read(jyotiControllerProvider.notifier);
      await controller.sendMessage('Planets');
      expect(container.read(jyotiControllerProvider).messages, isNotEmpty);

      controller.clearChat();
      expect(container.read(jyotiControllerProvider).messages, isEmpty);
    });

    test('triggerSimulatedError appends error state message', () {
      final controller = container.read(jyotiControllerProvider.notifier);
      controller.triggerSimulatedError();
      final state = container.read(jyotiControllerProvider);
      expect(state.messages.length, equals(1));
      expect(state.messages.first.type, equals(JyotiMessageType.error));
    });
  });
}
