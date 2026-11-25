import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  testWidgets('LoginScreen renders Phone/Email OTP tabs and guest CTAs', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

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
    await tester.pumpAndSettle();

    // Verify header and phone OTP auth elements
    expect(find.text('Welcome to Astro Sushil'), findsOneWidget);
    expect(find.text('Phone OTP'), findsOneWidget);
    expect(find.text('Email OTP'), findsOneWidget);
    expect(find.text('Enter your phone number to receive a secure OTP'), findsOneWidget);
    expect(find.text('Phone Number'), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);
    expect(find.text('Continue with Google'), findsNothing);
    expect(find.text('Explore as Guest'), findsOneWidget);

    // Tap Send OTP with empty field to trigger validation
    await tester.tap(find.text('Send OTP'));
    await tester.pumpAndSettle();

    // Verify validation message
    expect(find.text('Enter your phone number.'), findsOneWidget);
  });

  testWidgets('LoginScreen switches to Email OTP tab and validates', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

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
    await tester.pumpAndSettle();

    // Switch to Email OTP tab
    await tester.tap(find.byKey(const ValueKey('login-tab-email')));
    await tester.pumpAndSettle();

    expect(find.text('Enter your email address to receive a secure OTP'), findsOneWidget);
    expect(find.text('Email Address'), findsOneWidget);
    expect(find.text('Send Email OTP'), findsOneWidget);

    // Submit empty field
    await tester.tap(find.text('Send Email OTP'));
    await tester.pumpAndSettle();

    expect(find.text('Enter your email address.'), findsOneWidget);
  });

  testWidgets('LoginScreen handles Explore as Guest action', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

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
    await tester.pumpAndSettle();

    final guestBtn = find.text('Explore as Guest');
    await tester.scrollUntilVisible(guestBtn, 100, scrollable: find.byType(Scrollable).first);
    await tester.tap(guestBtn);
    await tester.pumpAndSettle();

    final isGuest = await storage.read(key: StorageKeys.isGuestMode);
    expect(isGuest, equals('true'));
  });
}
