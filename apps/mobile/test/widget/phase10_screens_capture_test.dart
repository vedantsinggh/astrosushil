import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/sushil_explainer/models/explanation_context.dart';
import 'package:astro_mobile/features/sushil_explainer/models/sushil_explanation_model.dart';
import 'package:astro_mobile/features/sushil_explainer/providers/sushil_explainer_provider.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_sheet.dart';
import 'package:astro_mobile/features/sushil_explainer/data/sushil_explainer_repository.dart';
import 'package:astro_mobile/features/jyoti/screens/jyoti_chat_screen.dart';
import 'package:astro_mobile/features/jyoti/models/jyoti_message.dart';
import 'package:astro_mobile/features/jyoti/providers/jyoti_controller.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_api_repository.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_local_chat_repository.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_mock_data.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

class _CaptureExplainerRepository implements SushilExplainerRepository {
  SushilExplanationModel? responseToReturn;
  Exception? exceptionToThrow;

  @override
  Future<SushilExplanationModel> explainScreen(ExplanationContext context) async {
    if (exceptionToThrow != null) {
      throw exceptionToThrow!;
    }
    return responseToReturn ??
        SushilExplanationModel(
          headline: 'Strong Planetary Placement',
          message:
              'Your 10th house Sun creates auspicious leadership potential and professional visibility. In BNN (Brihaspati Nandi Nadi), this indicates steady career elevation when balanced with disciplined daily habits.',
          keyPoints: const [
            'Sun in 10th house grants natural executive capability.',
            'Maintain ethical conduct to preserve planetary blessings.',
            'Best suited for leadership, public service, or enterprise.',
          ],
          disclaimer: 'AI Sushil Sir interpretation based strictly on verified planetary calculations.',
          feature: context.feature,
          screenTitle: context.screenTitle,
          cachedAt: DateTime(2026, 1, 1),
        );
  }
}

class _CaptureJyotiApiRepository extends Fake implements JyotiApiRepository {
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

class _CaptureJyotiLocalChatRepository extends Fake implements JyotiLocalChatRepository {
  @override
  Future<List<JyotiMessageModel>> loadMessages() async => [];
  @override
  Future<void> saveMessages(List<JyotiMessageModel> messages) async {}
  @override
  Future<void> clearChat() async {}
}

void main() {
  final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_10');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  const sampleContextEn = ExplanationContext(
    feature: 'birth_chart',
    screenTitle: 'Birth Chart',
    astrologyData: {'ascendant': 'Leo', 'sunHouse': 10},
    language: 'en',
  );

  const sampleContextHi = ExplanationContext(
    feature: 'birth_chart',
    screenTitle: 'जन्म कुंडली',
    astrologyData: {'ascendant': 'Leo', 'sunHouse': 10},
    language: 'hi',
  );

  Widget buildCaptureApp({
    required GlobalKey boundaryKey,
    required Widget child,
    List<Override> overrides = const [],
    Locale locale = const Locale('en'),
    double textScaleFactor = 1.0,
  }) {
    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        jyotiApiRepositoryProvider.overrideWithValue(_CaptureJyotiApiRepository()),
        jyotiLocalChatRepositoryProvider.overrideWithValue(_CaptureJyotiLocalChatRepository()),
        ...overrides,
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(
          builder: (context) {
            final mq = MediaQuery.of(context);
            return MediaQuery(
              data: mq.copyWith(textScaler: TextScaler.linear(textScaleFactor)),
              child: RepaintBoundary(
                key: boundaryKey,
                child: Scaffold(
                  backgroundColor: const Color(0xFF0D0E2B),
                  body: Align(
                    alignment: Alignment.bottomCenter,
                    child: child,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> captureToFile(
    WidgetTester tester,
    GlobalKey boundaryKey,
    String filename,
  ) async {
    await tester.runAsync(() async {
      final RenderRepaintBoundary boundary =
          boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final file = File('${outDir.path}/$filename');
        await file.writeAsBytes(byteData.buffer.asUint8List());
      }
    });
  }

  group('Phase 10: Headless Screenshot Capture Suite', () {
    testWidgets('Capture 01_jyoti_initial_state', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const JyotiChatScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '01_jyoti_initial_state.png');
    });

    testWidgets('Capture 02_jyoti_conversation_multi_messages', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const JyotiChatScreen(
          initialPrompt: 'Explain 7th house dynamics',
        ),
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '02_jyoti_conversation_multi_messages.png');
    });

    testWidgets('Capture 03_jyoti_typing_loading_state', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const JyotiChatScreen(
          initialPrompt: 'What is my Moon sign?',
        ),
      ));
      await tester.pump(); // Start thinking without resolving timer
      await tester.pump(const Duration(milliseconds: 100));

      await captureToFile(tester, boundaryKey, '03_jyoti_typing_loading_state.png');
    });

    testWidgets('Capture 04_jyoti_action_card_suggestion', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const JyotiChatScreen(
          initialPrompt: 'Generate my Kundli',
        ),
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '04_jyoti_action_card_suggestion.png');
    });

    testWidgets('Capture 05_jyoti_offline_error_state', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      // Create screen and trigger simulated error and offline mode
      late BuildContext localCtx;
      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: Builder(
          builder: (context) {
            localCtx = context;
            return const JyotiChatScreen();
          },
        ),
      ));
      await tester.pumpAndSettle();

      final container = ProviderScope.containerOf(localCtx);
      container.read(jyotiControllerProvider.notifier).setOffline(true);
      container.read(jyotiControllerProvider.notifier).triggerSimulatedError();
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '05_jyoti_offline_error_state.png');
    });

    testWidgets('Capture 06_sushil_explainer_loaded_state', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      final fakeRepo = _CaptureExplainerRepository();

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const SushilExplainerSheet(
          explanationContext: sampleContextEn,
        ),
        overrides: [
          sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 150));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '06_sushil_explainer_loaded_state.png');
    });

    testWidgets('Capture 07_sushil_explainer_loading_error_state', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      final fakeRepo = _CaptureExplainerRepository();
      fakeRepo.exceptionToThrow = Exception('Network connection failed');

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const SushilExplainerSheet(
          explanationContext: sampleContextEn,
        ),
        overrides: [
          sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 150));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '07_sushil_explainer_loading_error_state.png');
    });

    testWidgets('Capture 08_sushil_explainer_hindi_or_large_text', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      final fakeRepo = _CaptureExplainerRepository();
      fakeRepo.responseToReturn = SushilExplanationModel(
        headline: 'शुभ ग्रह स्थिति (कर्म भाव सूर्य)',
        message:
            'आपकी कुंडली में दशम भाव में सूर्य का प्रभाव कार्यक्षेत्र में सम्मान, नेतृत्व और प्रशासनिक सफलता की प्रबल संभावना दर्शाता है। यह बृहस्पित नंदी नाड़ी के अनुसार शुभ संकेत है।',
        keyPoints: const [
          'दशम भाव में सूर्य नेतृत्व और प्रतिष्ठा को बल देता है।',
          'नियमित अनुशासन और सदाचार से ग्रहों की ऊर्जा संतुलित रहती है।',
          'प्रशासन, स्वतंत्र व्यवसाय और नेतृत्व के अवसर अनुकूल हैं।',
        ],
        disclaimer: 'यह विश्लेषण केवल आपकी कुंडली के गणितीय गणनाओं पर आधारित AI परामर्श है।',
        feature: 'birth_chart',
        screenTitle: 'जन्म कुंडली',
        cachedAt: DateTime(2026, 1, 1),
      );

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        locale: const Locale('hi'),
        textScaleFactor: 1.25,
        child: const SushilExplainerSheet(
          explanationContext: sampleContextHi,
        ),
        overrides: [
          sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 150));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '08_sushil_explainer_hindi_or_large_text.png');
    });
  });
}
