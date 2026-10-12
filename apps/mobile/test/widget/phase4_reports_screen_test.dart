import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/home/screens/reports_screen.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';

class MockBirthProfilesNotifier extends StateNotifier<BirthProfilesState>
    implements BirthProfilesNotifier {
  MockBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(profiles: profiles));

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  Widget createTestWidget() {
    final sampleProfile = BirthProfileModel(
      id: 'profile-111',
      userId: 'user-111',
      name: 'Rohan Sharma',
      dateOfBirth: '1990-05-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi',
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
    );

    return ProviderScope(
      overrides: [
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => MockBirthProfilesNotifier([sampleProfile]),
        ),
      ],
      child: const MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: ReportsScreen(),
      ),
    );
  }

  testWidgets('ReportsScreen renders all 5 active report tiers with pricing badges', (tester) async {
    await tester.pumpWidget(createTestWidget());
    await tester.pumpAndSettle();

    // 1. Featured Career report
    expect(find.text('Career & Professional Life'), findsOneWidget);
    expect(find.text('PREMIUM PDF'), findsOneWidget);

    // 2. Kundli report (₹299)
    expect(find.text('Birth Chart & Kundli Report'), findsOneWidget);
    expect(find.text('₹299'), findsOneWidget);

    // 3. Mini Horoscope (₹199)
    expect(find.text('Mini Horoscope & Transit Forecast'), findsOneWidget);
    expect(find.text('₹199'), findsOneWidget);

    // 4. Pro Horoscope (₹699)
    expect(find.text('Pro Horoscope & Divisional Charts'), findsOneWidget);
    expect(find.text('₹699'), findsOneWidget);

    // 5. Matchmaking Report (₹999)
    expect(find.text('Marriage & Relationship Report'), findsOneWidget);
    expect(find.text('₹999'), findsOneWidget);

    // Verify 100% Deterministic Engine pill badge
    expect(find.text('100% Deterministic Engine'), findsOneWidget);
  });
}
