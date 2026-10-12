import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/auth/screens/register_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  testWidgets('RegisterScreen renders Step 1 fields and validates requirements', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        ],
        child: const MaterialApp(
          home: RegisterScreen(),
        ),
      ),
    );

    // Verify Step 1 header and fields
    expect(find.text('Create Your Account'), findsOneWidget);
    expect(find.text('Step 1 of 2'), findsOneWidget);
    expect(find.text('Full Name'), findsOneWidget);
    expect(find.text('Email Address'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Confirm Password'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);

    // Tap Continue with empty fields
    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Verify validation error messages
    expect(find.text('Enter your full name.'), findsOneWidget);
    expect(find.text('Enter your email address.'), findsOneWidget);
    expect(find.text('Enter a password.'), findsOneWidget);
  });

  testWidgets('RegisterScreen validates password matching', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        ],
        child: const MaterialApp(
          home: RegisterScreen(),
        ),
      ),
    );

    // Index 0: Full Name, 1: Email, 2: Phone (Optional), 3: Password, 4: Confirm Password
    await tester.enterText(find.byType(TextFormField).at(0), 'Rahul Sharma');
    await tester.enterText(find.byType(TextFormField).at(1), 'rahul@example.com');
    await tester.enterText(find.byType(TextFormField).at(3), 'Password123!');
    await tester.enterText(find.byType(TextFormField).at(4), 'Mismatch123!');

    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    expect(find.text('Passwords do not match.'), findsOneWidget);
  });
}
