import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  testWidgets('LoginScreen renders form fields and validates inputs', (WidgetTester tester) async {
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

    // Verify fields render
    expect(find.text('Welcome to Astro Platform'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Email Address'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Password'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Register'), findsOneWidget);

    // Tap Sign In with empty fields to trigger validation
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();

    // Verify validation messages
    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
  });
}
