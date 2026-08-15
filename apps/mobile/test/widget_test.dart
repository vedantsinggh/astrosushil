import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/app/app.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  testWidgets('App root launch smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        ],
        child: const AstroMobileApp(),
      ),
    );

    // Initial pump shows checking session / loading indicator or login
    await tester.pumpAndSettle();

    // Verify root screen navigates to LoginScreen when unauthenticated
    expect(find.text('Welcome to Astro Platform'), findsOneWidget);
  });
}
