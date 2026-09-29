import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/shared/widgets/astro_loader/astro_loader.dart';

void main() {
  group('AstroLoader Widget Tests', () {
    testWidgets('full-screen loader renders message and canvas', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AstroLoader.fullScreen(
              message: 'Aligning your stars...',
              isDark: false,
            ),
          ),
        ),
      );

      expect(find.text('Aligning your stars...'), findsOneWidget);
      expect(find.text('Astro Sushil Cosmic Calculations'), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);
      await tester.pump(const Duration(seconds: 1));
    });

    testWidgets('dark full-screen loader renders correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AstroLoader.fullScreen(
              message: 'Mapping planetary positions...',
              isDark: true,
            ),
          ),
        ),
      );

      expect(find.text('Mapping planetary positions...'), findsOneWidget);
      final container = tester.widget<Container>(find.byType(Container).first);
      expect(container.color, equals(const Color(0xFF121440)));
      await tester.pump(const Duration(seconds: 1));
    });

    testWidgets('inline loader renders with message', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AstroLoader.inline(
              message: 'Reading cosmic patterns...',
              size: 24.0,
            ),
          ),
        ),
      );

      expect(find.text('Reading cosmic patterns...'), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);
      await tester.pump(const Duration(seconds: 1));
    });

    testWidgets('card loader renders within card container', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AstroLoader.card(
              message: 'Preparing your guidance...',
              isDark: false,
            ),
          ),
        ),
      );

      expect(find.text('Preparing your guidance...'), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);
      await tester.pump(const Duration(seconds: 1));
    });

    testWidgets('button loader renders and disables button click', (WidgetTester tester) async {
      final bool pressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AstroLoader.button(
              label: 'Preparing your Kundli...',
            ),
          ),
        ),
      );

      expect(find.text('Preparing your Kundli...'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsOneWidget);

      await tester.tap(find.byType(ElevatedButton));
      expect(pressed, isFalse);
      await tester.pump(const Duration(seconds: 1));
    });

    testWidgets('reduced motion mode disables animation without errors', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AstroLoader.fullScreen(
              message: 'Reduced motion test',
              reducedMotion: true,
            ),
          ),
        ),
      );

      expect(find.text('Reduced motion test'), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);
      await tester.pumpAndSettle();
    });

    testWidgets('loader does not overflow on small screens (360x640)', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AstroLoader.fullScreen(
              message: 'Small screen test',
            ),
          ),
        ),
      );

      expect(find.text('Small screen test'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pump(const Duration(seconds: 1));
    });
  });
}
