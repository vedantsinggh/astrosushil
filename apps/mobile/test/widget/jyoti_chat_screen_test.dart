import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/auth/auth_required_sheet.dart';
import 'package:astro_mobile/features/jyoti/screens/jyoti_chat_screen.dart';
import 'package:astro_mobile/features/jyoti/widgets/home_jyoti_card.dart';
import 'package:astro_mobile/features/jyoti/widgets/jyoti_floating_button.dart';

void main() {
  group('Jyoti UI Shell Widget Tests', () {
    testWidgets('HomeJyotiCard renders branding title, subtitle and icon', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: HomeJyotiCard(
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Ask Jyoti'), findsOneWidget);
      expect(find.text('Your personal astrology guide'), findsOneWidget);
      expect(find.text('AI Guide'), findsOneWidget);

      await tester.tap(find.byType(HomeJyotiCard));
      expect(tapped, isTrue);
    });

    testWidgets('JyotiFloatingButton renders orb button with semantic accessibility', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            floatingActionButton: JyotiFloatingButton(
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Ask Jyoti'), findsOneWidget);
      await tester.tap(find.byType(JyotiFloatingButton));
      expect(tapped, isTrue);
    });

    testWidgets('AuthRequiredSheet displays guest login prompt properly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              return ElevatedButton(
                onPressed: () {
                  AuthRequiredSheet.show(context: context);
                },
                child: const Text('Show Sheet'),
              );
            },
          ),
        ),
      );

      await tester.tap(find.text('Show Sheet'));
      await tester.pumpAndSettle();

      expect(find.text('Meet Jyoti'), findsOneWidget);
      expect(find.text('Your personal astrology guide'), findsOneWidget);
      expect(find.text('Login to use Jyoti'), findsOneWidget);
      expect(find.text('Create an Account'), findsOneWidget);
      expect(find.text('Maybe Later'), findsOneWidget);
    });

    testWidgets('JyotiChatScreen renders top app bar, header greeting, and input bar', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: JyotiChatScreen(),
          ),
        ),
      );

      // Verify app bar title
      expect(find.text('Jyoti'), findsWidgets);

      // Verify header greeting
      expect(find.text("Hi, I'm Jyoti."), findsOneWidget);
      expect(find.text("How can I help you?"), findsOneWidget);

      // Verify input text field
      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('Ask Jyoti...'), findsOneWidget);

      // Verify suggestion chips presence
      expect(find.text('Generate my Kundli'), findsOneWidget);
      expect(find.text('Explain my birth chart'), findsOneWidget);
      expect(find.text('Explain this screen'), findsOneWidget);
    });

    testWidgets('Tapping a suggestion chip inputs message and shows response', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: JyotiChatScreen(),
          ),
        ),
      );

      await tester.tap(find.text('Generate my Kundli'));
      await tester.pump(); // Start sending message

      // Verify user message is added
      expect(find.text('Generate my Kundli'), findsWidgets);

      // Fast forward past thinking timer
      await tester.pump(const Duration(milliseconds: 700));

      // Verify action card appears
      expect(find.text('✦ Birth Chart & Kundli'), findsOneWidget);
      expect(find.text('Open Birth Chart →'), findsOneWidget);
    });

    testWidgets('Tapping microphone icon triggers Voice input coming soon notification', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: JyotiChatScreen(),
          ),
        ),
      );

      final micFinder = find.byIcon(Icons.mic_none_rounded);
      expect(micFinder, findsOneWidget);

      await tester.tap(micFinder);
      await tester.pump();

      expect(find.text('Voice input coming soon'), findsOneWidget);
    });
  });
}
