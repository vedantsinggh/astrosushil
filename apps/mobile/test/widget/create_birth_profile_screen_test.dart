import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/birth_profile/screens/create_birth_profile_screen.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  testWidgets('CreateBirthProfileScreen renders form and validates inputs', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
          birthProfilesListNotifierProvider.overrideWith((ref) => BirthProfilesNotifier(
                ref.watch(birthProfileRepositoryProvider),
                ref.watch(authStateProvider),
              )),
        ],
        child: const MaterialApp(
          home: CreateBirthProfileScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify fields render
    expect(find.text('Your Birth Details'), findsWidgets);
    expect(find.text('Full Name'), findsOneWidget);
    expect(find.text('Date of Birth'), findsOneWidget);
    expect(find.text('Time of Birth'), findsOneWidget);
    expect(find.text('Place of Birth'), findsOneWidget);
    expect(find.text('Create Birth Chart'), findsOneWidget);

    // Tap Save with empty Name/Date/Time to trigger validation
    await tester.tap(find.text('Create Birth Chart'));
    await tester.pumpAndSettle();

    // Verify validation error
    expect(find.text('Full Name is required'), findsOneWidget);
  });
}

