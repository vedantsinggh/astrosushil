import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/birth_profile/screens/create_birth_profile_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  testWidgets('CreateBirthProfileScreen renders form and validates inputs', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        ],
        child: const MaterialApp(
          home: CreateBirthProfileScreen(),
        ),
      ),
    );

    // Verify fields render
    expect(find.text('Create Birth Profile'), findsWidgets);
    expect(find.widgetWithText(TextFormField, 'Full Name'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Date of Birth'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Time of Birth'), findsOneWidget);
    expect(find.text('Explicit Timezone'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Latitude'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Longitude'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Place Name'), findsOneWidget);
    expect(find.text('Save Birth Profile'), findsOneWidget);

    // Tap Save with empty Name/Date/Time to trigger validation
    await tester.tap(find.text('Save Birth Profile'));
    await tester.pumpAndSettle();

    // Verify validation error
    expect(find.text('Name is required'), findsOneWidget);
  });
}
