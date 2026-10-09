import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/sushil_explainer/models/explanation_context.dart';
import 'package:astro_mobile/features/sushil_explainer/models/sushil_explanation_model.dart';
import 'package:astro_mobile/features/sushil_explainer/providers/sushil_explainer_provider.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_button.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_sheet.dart';
import 'package:astro_mobile/features/sushil_explainer/data/sushil_explainer_repository.dart';

class FakeExplainerRepository implements SushilExplainerRepository {
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
          message: 'Your chart indicates positive career growth and balanced relationships.',
          keyPoints: const [
            'Sun in 10th house supports authority.',
            'Maintain practical routines.',
          ],
          disclaimer: 'AI Sushil Sir interpretation.',
          feature: context.feature,
          screenTitle: context.screenTitle,
          cachedAt: DateTime.now(),
        );
  }
}

void main() {
  group('Sushil Explainer Widget Tests', () {
    const testContext = ExplanationContext(
      feature: 'birth_chart',
      screenTitle: 'Birth Chart',
      astrologyData: {'ascendant': 'Leo', 'sunHouse': 10},
    );

    testWidgets('1. SushilExplainerButton renders label, AI badge, and avatar', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Center(
                child: SushilExplainerButton(
                  contextData: testContext,
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Let Sushil Sir explain'), findsOneWidget);
      expect(find.text('AI'), findsOneWidget);
      expect(find.byType(SushilExplainerButton), findsOneWidget);
    });

    testWidgets('2. Compact SushilExplainerButton renders correctly', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Center(
                child: SushilExplainerButton(
                  contextData: testContext,
                  isCompact: true,
                  label: 'Explain Chart',
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Explain Chart'), findsOneWidget);
      expect(find.text('AI'), findsOneWidget);
    });

    testWidgets('3. SushilExplainerSheet renders loaded explanation with headline, message, key points, and Got It button',
        (tester) async {
      final fakeRepo = FakeExplainerRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: SushilExplainerSheet(
                explanationContext: testContext,
              ),
            ),
          ),
        ),
      );

      // Advance frames to resolve loading
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('AI Sushil Sir'), findsOneWidget);
      expect(find.text('Explaining Birth Chart'), findsOneWidget);
      expect(find.text('Strong Planetary Placement'), findsOneWidget);
      expect(find.text('Your chart indicates positive career growth and balanced relationships.'), findsOneWidget);
      expect(find.text('KEY TAKEAWAYS'), findsOneWidget);
      expect(find.text('Sun in 10th house supports authority.'), findsOneWidget);
      expect(find.text('Got It'), findsOneWidget);
    });

    testWidgets('4. SushilExplainerSheet renders error state and handles retry tap', (tester) async {
      final fakeRepo = FakeExplainerRepository();
      fakeRepo.exceptionToThrow = Exception('Network error');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sushilExplainerRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: SushilExplainerSheet(
                explanationContext: testContext,
              ),
            ),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Explanation Unavailable'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);

      // Tap Try Again after resolving error
      fakeRepo.exceptionToThrow = null;
      await tester.tap(find.text('Try Again'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Strong Planetary Placement'), findsOneWidget);
    });
  });
}
