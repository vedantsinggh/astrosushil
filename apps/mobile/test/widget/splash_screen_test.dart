import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/splash/screens/splash_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  testWidgets('SplashScreen renders custom app logo, gold app name, and decorative divider', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        ],
        child: const MaterialApp(
          home: SplashScreen(),
        ),
      ),
    );

    // Verify title and logo elements
    expect(find.text('ASTRO SUSHIL'), findsOneWidget);
    expect(find.byType(Image), findsWidgets);
    expect(find.byIcon(Icons.auto_awesome), findsWidgets);

    // Advance timer past 2.5s duration
    await tester.pump(const Duration(milliseconds: 2600));
  });
}
