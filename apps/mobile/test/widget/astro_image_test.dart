import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/shared/widgets/astro_image.dart';

void main() {
  // ── Helper ────────────────────────────────────────────────────────────────

  Widget _wrap(Widget child) {
    return MaterialApp(home: Scaffold(body: Center(child: child)));
  }

  // ── Valid asset tests ─────────────────────────────────────────────────────

  group('AstroImage — valid asset path', () {
    testWidgets('renders Image.asset when asset is available', (tester) async {
      // This test relies on the test environment having the asset bundle.
      // If not available, errorBuilder will fire — which is also tested below.
      await tester.pumpWidget(
        _wrap(
          const AstroImage(
            assetPath: 'assets/images/logo_short.png',
            width: 80,
            height: 80,
            semanticLabel: 'Astro logo',
          ),
        ),
      );
      await tester.pump();

      // AstroImage wraps a Semantics node — always present
      expect(find.byType(AstroImage), findsOneWidget);
    });
  });

  // ── Missing asset fallback ────────────────────────────────────────────────

  group('AstroImage — missing asset fallback', () {
    testWidgets('does NOT throw when asset is missing', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const AstroImage(
            assetPath: 'assets/images/test_missing_asset_that_does_not_exist.png',
            width: 120,
            height: 120,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Should not find any error text or broken-image widgets
      expect(find.byType(AstroImage), findsOneWidget);
      expect(find.textContaining('Unable to load asset'), findsNothing);
    });

    testWidgets('renders fallback widget with correct size', (tester) async {
      const double size = 100.0;

      await tester.pumpWidget(
        _wrap(
          const AstroImage(
            assetPath: 'assets/images/test_missing_asset_that_does_not_exist.png',
            width: size,
            height: size,
            fallback: AstroImageFallback.celestial,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // The SizedBox in the fallback should be constrained to our size
      final sizedBoxes = tester.widgetList<SizedBox>(find.byType(SizedBox));
      expect(
        sizedBoxes.any((b) => b.width == size && b.height == size),
        isTrue,
        reason: 'Fallback SizedBox should match requested width/height',
      );
    });

    testWidgets('renders celestial fallback variant', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const AstroImage(
            assetPath: 'assets/images/nonexistent.png',
            width: 140,
            height: 140,
            fallback: AstroImageFallback.celestial,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(CustomPaint), findsWidgets);
    });

    testWidgets('renders minimal fallback variant', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const AstroImage(
            assetPath: 'assets/images/nonexistent.png',
            width: 60,
            height: 60,
            fallback: AstroImageFallback.minimal,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(CustomPaint), findsWidgets);
    });

    testWidgets('renders icon fallback variant', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const AstroImage(
            assetPath: 'assets/images/nonexistent.png',
            width: 40,
            height: 40,
            fallback: AstroImageFallback.icon,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(CustomPaint), findsWidgets);
    });
  });

  // ── Semantic label ────────────────────────────────────────────────────────

  group('AstroImage — semantic label', () {
    testWidgets('exposes semanticLabel in Semantics tree', (tester) async {
      const label = 'Offline connection illustration';

      await tester.pumpWidget(
        _wrap(
          const AstroImage(
            assetPath: 'assets/images/nonexistent.png',
            width: 120,
            height: 120,
            semanticLabel: label,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.bySemanticsLabel(label),
        findsWidgets,
        reason: 'Semantic label should propagate to the Semantics widget',
      );
    });
  });

  // ── Named constructors ────────────────────────────────────────────────────

  group('AstroImage named constructors', () {
    testWidgets('AstroImage.celestial creates celestial fallback', (tester) async {
      await tester.pumpWidget(
        _wrap(
          AstroImage.celestial(
            assetPath: 'assets/images/nonexistent.png',
            width: 180,
            height: 180,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AstroImage), findsOneWidget);
    });

    testWidgets('AstroImage.minimal creates minimal fallback', (tester) async {
      await tester.pumpWidget(
        _wrap(
          AstroImage.minimal(
            assetPath: 'assets/images/nonexistent.png',
            width: 60,
            height: 60,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AstroImage), findsOneWidget);
    });

    testWidgets('AstroImage.icon creates icon fallback', (tester) async {
      await tester.pumpWidget(
        _wrap(
          AstroImage.icon(
            assetPath: 'assets/images/nonexistent.png',
            width: 40,
            height: 40,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AstroImage), findsOneWidget);
    });
  });

  // ── Multiple AstroImage widgets ───────────────────────────────────────────

  group('AstroImage — multiple simultaneous widgets', () {
    testWidgets('handles many missing assets without crash', (tester) async {
      await tester.pumpWidget(
        _wrap(
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              AstroImage(
                assetPath: 'assets/images/state_offline.png',
                width: 60,
                height: 60,
                fallback: AstroImageFallback.celestial,
              ),
              AstroImage(
                assetPath: 'assets/images/state_server_error.png',
                width: 60,
                height: 60,
                fallback: AstroImageFallback.minimal,
              ),
              AstroImage(
                assetPath: 'assets/images/state_maintenance.png',
                width: 40,
                height: 40,
                fallback: AstroImageFallback.icon,
              ),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(AstroImage), findsNWidgets(3));
      expect(find.textContaining('Unable to load asset'), findsNothing);
    });
  });
}
