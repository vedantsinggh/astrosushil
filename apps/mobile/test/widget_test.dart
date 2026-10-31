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

    // Initial pump shows checking session / splash branding
    await tester.pump();

    // Verify root screen mounts Astro Sushil splash branding
    expect(find.text('ASTRO SUSHIL'), findsOneWidget);

    // Advance timer past splash duration
    await tester.pump(const Duration(milliseconds: 2600));
  });
}
