import 'package:astro_mobile/core/utils/app_date_time.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/home/screens/reports_screen.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/report_catalog_fixture.dart';

class _MockBirthProfilesNotifier extends StateNotifier<BirthProfilesState> implements BirthProfilesNotifier {
  _MockBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  Future<void> fetchProfiles() async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  final profile = BirthProfileModel(
    id: 'bp_tz_001',
    userId: 'usr_tz_001',
    name: 'Asha Rao',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '00:15:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  // Ordered at 04:22 IST on 20 Nov 2026 = 22:52:22 UTC on 19 Nov (as stored).
  Map<String, dynamic> serverReport() => {
        'id': 'rep_tz_001',
        'userId': 'usr_tz_001',
        'birthProfileId': 'bp_tz_001',
        'reportType': 'KUNDLI',
        'status': 'COMPLETED',
        'stage': 'COMPLETED',
        'progress': 100,
        'createdAt': '2026-11-19T22:52:22.000Z',
        'completedAt': '2026-11-19T23:05:00.000Z',
        'birthProfile': {'name': 'Asha Rao'},
      };

  Future<void> pumpReports(WidgetTester tester) async {
    tester.view.physicalSize = const Size(390 * 2, 844 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);
    // Parse inside the test so the simulated device timezone applies.
    final report = UserReportItemModel.fromJson(serverReport());
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          reportCatalogTestOverride,
          birthProfilesListNotifierProvider.overrideWith((ref) => _MockBirthProfilesNotifier([profile])),
          selectedBirthProfileProvider.overrideWith((ref) => profile),
          userReportsProvider.overrideWith((ref) => Future.value([report])),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: const [Locale('en'), Locale('hi')],
          home: const ReportsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  tearDown(() => AppDateTime.debugLocalOffset = null);

  testWidgets('a report ordered at 04:22 IST shows 20 Nov on an IST device', (tester) async {
    AppDateTime.debugLocalOffset = const Duration(hours: 5, minutes: 30);
    await pumpReports(tester);

    expect(find.textContaining('20 Nov 2026'), findsOneWidget);
    expect(find.textContaining('19 Nov 2026'), findsNothing);
  });

  testWidgets('the same report shows 19 Nov on a device in New York', (tester) async {
    AppDateTime.debugLocalOffset = const Duration(hours: -5);
    await pumpReports(tester);

    expect(find.textContaining('19 Nov 2026'), findsOneWidget);
    expect(find.textContaining('20 Nov 2026'), findsNothing);
  });
}
