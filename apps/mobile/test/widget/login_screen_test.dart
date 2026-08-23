import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  testWidgets('LoginScreen renders header, form fields, and validates empty inputs', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    // Verify header and main texts render
    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Sign in to continue your cosmic journey'), findsOneWidget);
    expect(find.text('Email Address'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Forgot Password?'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
    expect(find.text('Continue as Guest'), findsOneWidget);

    // Tap Login button with empty fields to trigger validation
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();

    // Verify inline validation messages
    expect(find.text('Enter your email address.'), findsOneWidget);
    expect(find.text('Enter your password.'), findsOneWidget);
  });

  testWidgets('LoginScreen validates invalid email format', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    await tester.enterText(find.widgetWithText(TextFormField, 'Email Address'), 'invalidemail');
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), 'password123');
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();

    expect(find.text('Enter a valid email address.'), findsOneWidget);
  });

  testWidgets('LoginScreen handles Continue as Guest action', (WidgetTester tester) async {
    final storage = InMemorySecureStorageService();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(storage),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.text('Continue as Guest'), findsOneWidget);
    await tester.tap(find.text('Continue as Guest'));
    await tester.pumpAndSettle();

    final isGuest = await storage.read(key: StorageKeys.isGuestMode);
    expect(isGuest, equals('true'));
  });
}
