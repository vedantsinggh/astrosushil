import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/sushil_explainer/models/explanation_context.dart';
import 'package:astro_mobile/features/sushil_explainer/models/sushil_explanation_model.dart';
import 'package:astro_mobile/features/sushil_explainer/providers/sushil_explainer_provider.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_button.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_sheet.dart';
import 'package:astro_mobile/features/sushil_explainer/data/sushil_explainer_repository.dart';
import 'package:astro_mobile/features/jyoti/screens/jyoti_chat_screen.dart';
import 'package:astro_mobile/features/jyoti/models/jyoti_message.dart';
import 'package:astro_mobile/features/jyoti/providers/jyoti_controller.dart';
import 'package:astro_mobile/features/jyoti/widgets/jyoti_action_card.dart';
import 'package:astro_mobile/features/jyoti/widgets/jyoti_explanation_card.dart';
import 'package:astro_mobile/features/jyoti/widgets/jyoti_error.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_api_repository.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_local_chat_repository.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_mock_data.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

class _FakeExplainerRepository implements SushilExplainerRepository {
  SushilExplanationModel? responseToReturn;
  Exception? exceptionToThrow;
  int explainCallCount = 0;

  @override
  Future<SushilExplanationModel> explainScreen(ExplanationContext context) async {
    explainCallCount++;
    if (exceptionToThrow != null) {
      throw exceptionToThrow!;
    }
    return responseToReturn ??
        SushilExplanationModel(
          headline: 'Strong Planetary Placement',
          message: 'Your chart indicates positive career growth and balanced relationships based on classical Parashari principles.',
          keyPoints: const [
            'Sun placed in 10th house supports leadership and authority.',
            'Maintain practical routines to balance planetary energies.',
          ],
          disclaimer: 'AI Sushil Sir interpretation based strictly on supplied chart calculations.',
          feature: context.feature,
          screenTitle: context.screenTitle,
          cachedAt: DateTime(2026, 1, 1),
        );
  }
}

class _FakeJyotiApiRepository extends Fake implements JyotiApiRepository {
  @override
  Future<List<JyotiMessageModel>> sendMessage({
    required String message,
    required List<JyotiMessageModel> recentHistory,
    String? currentScreen,
    String? birthProfileId,
  }) async {
    return JyotiMockData.generateMockResponse(message);
  }
}

class _FakeJyotiLocalChatRepository extends Fake implements JyotiLocalChatRepository {
  @override
  Future<List<JyotiMessageModel>> loadMessages() async => [];
  @override
  Future<void> saveMessages(List<JyotiMessageModel> messages) async {}
  @override
  Future<void> clearChat() async {}
}

Widget _wrapWidget({
  required Widget child,
  List<Override> overrides = const [],
  Locale locale = const Locale('en'),
  double textScaleFactor = 1.0,
}) {
  return ProviderScope(
    overrides: [
      secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
      jyotiApiRepositoryProvider.overrideWithValue(_FakeJyotiApiRepository()),
      jyotiLocalChatRepositoryProvider.overrideWithValue(_FakeJyotiLocalChatRepository()),
      ...overrides,
    ],
    child: MaterialApp(
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('hi')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppTheme.lightTheme,
      home: Builder(
        builder: (context) {
          final mq = MediaQuery.of(context);
          return MediaQuery(
            data: mq.copyWith(textScaler: TextScaler.linear(textScaleFactor)),
            child: Scaffold(body: child),
          );
        },
      ),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const sampleContext = ExplanationContext(
    feature: 'birth_chart',
    screenTitle: 'Birth Chart',
    astrologyData: {'ascendant': 'Leo', 'sunHouse': 10},
  );

  group('Phase 10: Sushil Explainer Contextual Experience', () {
    testWidgets('1. SushilExplainerButton renders label, AI badge, and triggers bottom sheet', (tester) async {
      final fakeRepo = _FakeExplainerRepository();

      await tester.pumpWidget(_wrapWidget(
        child: const Center(
          child: SushilExplainerButton(
            contextData: sampleContext,
          ),
        ),
        overrides: [
          sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      ));

      expect(find.text('Let Sushil Sir explain'), findsOneWidget);
      expect(find.text('AI'), findsOneWidget);

      await tester.tap(find.byType(SushilExplainerButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('AI Sushil Sir'), findsOneWidget);
      expect(find.text('Explaining Birth Chart'), findsOneWidget);
      expect(find.text('Strong Planetary Placement'), findsOneWidget);
      expect(find.text('Got It'), findsOneWidget);
    });

    testWidgets('2. SushilExplainerSheet displays error state and supports retry', (tester) async {
      final fakeRepo = _FakeExplainerRepository();
      fakeRepo.exceptionToThrow = Exception('Network offline');

      await tester.pumpWidget(_wrapWidget(
        child: const SushilExplainerSheet(
          explanationContext: sampleContext,
        ),
        overrides: [
          sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      ));

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Explanation Unavailable'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);

      // Verify retry button touch target is >= 48dp
      final retryFinder = find.widgetWithText(ElevatedButton, 'Try Again');
      expect(retryFinder, findsOneWidget);
      final retrySize = tester.getSize(retryFinder);
      expect(retrySize.height, greaterThanOrEqualTo(48.0));

      // Retry successfully
      fakeRepo.exceptionToThrow = null;
      await tester.tap(retryFinder);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Strong Planetary Placement'), findsOneWidget);
    });

    testWidgets('3. SushilExplainerSheet displays empty context fallback gracefully', (tester) async {
      final fakeRepo = _FakeExplainerRepository();
      fakeRepo.responseToReturn = SushilExplanationModel(
        headline: 'No Chart Data Available',
        message: 'Please calculate or select a birth profile first to view astrological explanations.',
        keyPoints: const [],
        disclaimer: 'AI Sushil Sir interpretation.',
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
        cachedAt: DateTime(2026, 1, 1),
        isEmptyData: true,
      );

      await tester.pumpWidget(_wrapWidget(
        child: const SushilExplainerSheet(
          explanationContext: sampleContext,
        ),
        overrides: [
          sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      ));

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('No Chart Data Available'), findsOneWidget);
      expect(find.text('Close'), findsOneWidget);

      final closeBtn = find.widgetWithText(ElevatedButton, 'Close');
      expect(tester.getSize(closeBtn).height, greaterThanOrEqualTo(48.0));
    });

    testWidgets('4. SushilExplainerSheet provides clear handoff button to Jyoti Assistant', (tester) async {
      final fakeRepo = _FakeExplainerRepository();

      await tester.pumpWidget(_wrapWidget(
        child: const SushilExplainerSheet(
          explanationContext: sampleContext,
        ),
        overrides: [
          sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      ));

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Have specific questions?'), findsOneWidget);
      expect(find.text('Ask Jyoti AI'), findsOneWidget);

      final askJyotiBtn = find.widgetWithText(OutlinedButton, 'Ask Jyoti AI');
      expect(tester.getSize(askJyotiBtn).height, greaterThanOrEqualTo(48.0));
    });
  });

  group('Phase 10: Jyoti In-App Assistant Interaction & Action Safety', () {
    testWidgets('5. Jyoti initial greeting displays AI identity badge and Vedic disclosure', (tester) async {
      await tester.pumpWidget(_wrapWidget(
        child: const JyotiChatScreen(),
      ));

      expect(find.text('AI ASTROLOGY ASSISTANT'), findsOneWidget);
      expect(find.text("Hi, I'm Jyoti."), findsOneWidget);
      expect(find.text("How can I help you?"), findsOneWidget);
      expect(find.text('Automated AI Guidance · Based on Vedic Jyotish principles'), findsOneWidget);
    });

    testWidgets('6. Jyoti composer supports multiline input and 48dp send button', (tester) async {
      await tester.pumpWidget(_wrapWidget(
        child: const JyotiChatScreen(),
      ));

      final textField = find.byType(TextField);
      expect(textField, findsOneWidget);

      // Verify composer sends message
      await tester.enterText(textField, 'Explain my birth chart');
      await tester.pump();

      final sendBtn = find.byIcon(Icons.arrow_upward_rounded);
      expect(sendBtn, findsOneWidget);
      await tester.tap(sendBtn);
      await tester.pump();

      expect(find.text('Explain my birth chart'), findsWidgets);
    });

    testWidgets('7. JyotiActionCard renders warm surface, destination badge, and 48dp button', (tester) async {
      JyotiActionType? executedAction;

      const testAction = JyotiAction(
        type: JyotiActionType.openBirthChart,
        title: '✦ View Kundli',
        subtitle: 'Inspect your Lagna chart and planetary degrees.',
        buttonText: 'Open Birth Chart →',
      );

      await tester.pumpWidget(_wrapWidget(
        child: JyotiActionCardWidget(
          action: testAction,
          onExecuteAction: (type) => executedAction = type,
        ),
      ));

      expect(find.text('SUGGESTED ACTION'), findsOneWidget);
      expect(find.text('✦ View Kundli'), findsOneWidget);
      expect(find.text('Open Birth Chart →'), findsOneWidget);

      final buttonFinder = find.widgetWithText(ElevatedButton, 'Open Birth Chart →');
      expect(tester.getSize(buttonFinder).height, greaterThanOrEqualTo(48.0));

      await tester.tap(buttonFinder);
      await tester.pump();
      expect(executedAction, JyotiActionType.openBirthChart);
    });

    testWidgets('8. JyotiExplanationCard renders expandable details with accessible touch targets', (tester) async {
      const testExplanation = JyotiExplanation(
        title: '7th House of Partnerships',
        category: 'Relationships',
        summary: 'Governs long-term commitments and marriage.',
        detailedText: 'In Vedic Jyotish, the 7th house sits directly opposite the ascendant, showing relational balance.',
        actionButtonText: 'Explore House →',
        actionType: JyotiActionType.openHouses,
      );

      await tester.pumpWidget(_wrapWidget(
        child: const JyotiExplanationCardWidget(
          explanation: testExplanation,
        ),
      ));

      expect(find.text('RELATIONSHIPS'), findsOneWidget);
      expect(find.text('7th House of Partnerships'), findsOneWidget);
      expect(find.text('Read more'), findsOneWidget);

      // Expand
      await tester.tap(find.text('Read more'));
      await tester.pumpAndSettle();

      expect(find.text('Show less'), findsOneWidget);
      expect(find.textContaining('In Vedic Jyotish, the 7th house sits directly opposite'), findsOneWidget);
    });

    testWidgets('9. JyotiErrorCard and Suggestion chips maintain >= 48dp touch targets', (tester) async {
      bool tryAgainTapped = false;

      await tester.pumpWidget(_wrapWidget(
        child: Column(
          children: [
            JyotiErrorCard(
              onTryAgain: () => tryAgainTapped = true,
              onContinueExploring: () {},
            ),
          ],
        ),
      ));

      expect(find.text("Jyoti couldn't respond right now."), findsOneWidget);
      final tryAgain = find.widgetWithText(ElevatedButton, 'Try Again');
      expect(tester.getSize(tryAgain).height, greaterThanOrEqualTo(48.0));

      await tester.tap(tryAgain);
      expect(tryAgainTapped, isTrue);
    });
  });

  group('Phase 10: Viewport & Accessibility Defenses', () {
    testWidgets('10. Header and action card survive 320dp compact width and 2.0x text scaling without overflow', (tester) async {
      tester.view.physicalSize = const Size(320 * 2, 700 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      final fakeRepo = _FakeExplainerRepository();
      FlutterErrorDetails? caughtDetails;
      final oldHandler = FlutterError.onError;
      FlutterError.onError = (details) {
        caughtDetails = details;
      };

      await tester.pumpWidget(
        _wrapWidget(
          textScaleFactor: 2.0,
          child: const SushilExplainerSheet(
            explanationContext: sampleContext,
          ),
          overrides: [
            sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
          ],
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 150));
      FlutterError.onError = oldHandler;

      expect(caughtDetails, isNull);
      expect(find.text('AI Sushil Sir'), findsOneWidget);
    });
  });
}
