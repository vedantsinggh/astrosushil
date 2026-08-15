import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/onboarding/screens/onboarding_screen.dart';
import 'package:astro_mobile/features/onboarding/providers/onboarding_provider.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';

void main() {
  late InMemorySecureStorageService storageService;

  setUp(() {
    storageService = InMemorySecureStorageService();
  });

  Widget buildTestWidget() {
    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(storageService),
      ],
      child: const MaterialApp(
        home: OnboardingScreen(),
      ),
    );
  }

  testWidgets('OnboardingScreen displays Page 1 title "Know Your Chart" and Skip button', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestWidget());

    expect(find.text('Know Your '), findsOneWidget);
    expect(find.text('Chart'), findsOneWidget);
    expect(find.text('Explore your birth chart, planets and houses in one clear, beautiful view.'), findsOneWidget);
    expect(find.text('Skip'), findsOneWidget);
  });

  testWidgets('Tapping Next navigates from Page 1 -> Page 2 -> Page 3', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestWidget());

    // Verify Page 1
    expect(find.text('Chart'), findsOneWidget);

    // Tap Next arrow
    await tester.tap(find.byIcon(Icons.arrow_forward));
    await tester.pumpAndSettle();

    // Verify Page 2: "Find Your Direction"
    expect(find.text('Direction'), findsOneWidget);
    expect(find.text('Understand the patterns in your chart and explore the areas of life that matter to you.'), findsOneWidget);

    // Tap Next arrow again
    await tester.tap(find.byIcon(Icons.arrow_forward));
    await tester.pumpAndSettle();

    // Verify Page 3: "Go Beyond the Basics" and "Get Started" button
    expect(find.text('the Basics'), findsOneWidget);
    expect(find.text('Get Started'), findsOneWidget);
  });

  testWidgets('Tapping "Get Started" on Page 3 completes onboarding and persists flag', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestWidget());

    // Navigate to Page 3
    await tester.tap(find.byIcon(Icons.arrow_forward));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.arrow_forward));
    await tester.pumpAndSettle();

    // Tap Get Started
    await tester.tap(find.text('Get Started'));
    await tester.pumpAndSettle();

    // Verify Onboarding flag is persisted in storage
    final isCompleted = await storageService.read(key: StorageKeys.onboardingCompleted);
    expect(isCompleted, 'true');
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('Tapping "Skip" completes onboarding immediately', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestWidget());

    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();

    final isCompleted = await storageService.read(key: StorageKeys.onboardingCompleted);
    expect(isCompleted, 'true');
    expect(find.byType(LoginScreen), findsOneWidget);
  });
}
