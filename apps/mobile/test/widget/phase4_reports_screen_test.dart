import 'package:flutter/material.dart';
import '../helpers/report_catalog_fixture.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/home/screens/reports_screen.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
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
            reportCatalogTestOverride,
        // My reports is now on the same page; keep it off the network.
        userReportsProvider.overrideWith((ref) async => const <UserReportItemModel>[]),
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

  testWidgets('ReportsScreen renders all 13 canonical report cards with live pricing and Coming Soon badges', (tester) async {
    await tester.pumpWidget(createTestWidget());
    await tester.pumpAndSettle();

    // 1. Featured Career report
    expect(find.text('Career & Professional Life Report'), findsOneWidget);
    expect(find.text('₹499'), findsWidgets); // career price from server catalogue

    // 2. Kundli report (₹299)
    expect(find.text('Premium Personalised Kundli Report'), findsOneWidget);
    expect(find.text('₹299'), findsOneWidget);

    // 3. Horoscope report (₹499)
    expect(find.text('Personalised Horoscope Report'), findsOneWidget);

    // 4. Retired Pro/Executive career report must not be shown.
    expect(find.text('Executive Career & Wealth Prosperity Dossier'), findsNothing);
    expect(find.text('Pro Horoscope & Divisional Charts'), findsNothing);
    expect(find.text('₹699'), findsNothing);

    // 5. Matchmaking Report (₹499)
    expect(find.text('Marriage & Relationship Compatibility Report'), findsOneWidget);
    expect(find.text('₹499'), findsWidgets);

    // 6. Reports without active server pricing show Coming Soon (no fake price)
    expect(find.text('Coming Soon'), findsNWidgets(5));

    // Simple layout: one heading and the "Get a report" tab
    expect(find.text('Reports'), findsOneWidget);
    expect(find.text('Get a report'), findsOneWidget);
  });
}
