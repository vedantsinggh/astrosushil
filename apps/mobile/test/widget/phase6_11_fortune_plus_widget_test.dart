import 'dart:typed_data';
import '../helpers/report_catalog_fixture.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/home/screens/reports_screen.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/features/reports/services/reports_service.dart';
import 'package:astro_mobile/features/reports/screens/report_pdf_viewer_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';

void main() {
  final testProfile = BirthProfileModel(
    id: 'bp_fortune_plus_001',
    userId: 'usr_fp_001',
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45:00',
    latitude: 28.4069,
    longitude: 77.8498,
    timezone: 'Asia/Kolkata',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  final completedFortunePlusReport = UserReportItemModel(
    id: 'rep_fp_100',
    userId: 'usr_fp_001',
    birthProfileId: 'bp_fortune_plus_001',
    profileName: 'Puneet Kumar',
    reportType: 'FORTUNE_PLUS',
    status: 'COMPLETED',
    stage: 'COMPLETED',
    progress: 100,
    storageKey: 'reports/canonical_fortune_plus_report.pdf',
    createdAt: DateTime(2026, 11, 11, 10, 30),
    completedAt: DateTime(2026, 11, 11, 10, 32),
  );

  Widget createTestWidget({
    required Widget child,
    List<Override> overrides = const [],
  }) {
    return ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('en')],
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(390, 844),
          ),
          child: child,
        ),
      ),
    );
  }

  group('Phase 6.11A: Fortune Plus Mobile UI & Widget Verification', () {
    testWidgets('1. Fortune Plus shows Coming Soon without an invented price when inactive in server catalogue', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            reportCatalogTestOverride,
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile),
            userReportsProvider.overrideWith((ref) => Future.value([])),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // FORTUNE_PLUS is one of the 13 canonical reports, shown with Coming Soon
      // and no invented price or "PRICING PENDING" placeholder.
      final fortunePlusCard = find.byKey(const ValueKey('report-offer-FORTUNE_PLUS'));
      expect(fortunePlusCard, findsOneWidget);
      expect(
        find.descendant(of: fortunePlusCard, matching: find.text('Personalised Fortune Report Plus')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: fortunePlusCard, matching: find.text('Coming Soon')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: fortunePlusCard, matching: find.textContaining('₹')),
        findsNothing,
      );
      expect(find.text('PRICING PENDING'), findsNothing);
    });

    testWidgets('2. My Reports history displays existing completed FORTUNE_PLUS report with correct badges and allows viewing', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            reportCatalogTestOverride,
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile),
            userReportsProvider.overrideWith((ref) => Future.value([completedFortunePlusReport])),
            reportGenerationNotifierProvider.overrideWith(
              (ref) => _MockGenerationNotifier(
                ReportGenerationState(
                  pdfBytes: Uint8List.fromList([0x25, 0x50, 0x44, 0x46]), // %PDF
                ),
              ),
            ),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // My reports is shown at the top of the single Reports page.
      expect(find.text('My reports'), findsOneWidget);

      // Verify report item rendered with model getters
      expect(find.text('Personalised Fortune Report Plus'), findsOneWidget);
      expect(find.textContaining('For Puneet Kumar'), findsOneWidget);
      expect(find.text('Ready'), findsOneWidget);

      // One clear action for a ready report: Open report
      final openPdfButton = find.text('Open report');
      expect(openPdfButton, findsOneWidget);

      // Tap Open PDF button
      await tester.tap(openPdfButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Verify navigation to ReportPdfViewerScreen
      expect(find.byType(ReportPdfViewerScreen), findsOneWidget);
      expect(find.text('Personalised Fortune Report Plus'), findsWidgets);
      expect(find.text('Puneet Kumar'), findsOneWidget);
    });
  });
}

class _MockBirthProfilesNotifier extends StateNotifier<BirthProfilesState>
    implements BirthProfilesNotifier {
  _MockBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  Future<void> fetchProfiles() async {}

  @override
  Future<BirthProfileModel?> createProfile(dynamic dto) async => null;

  @override
  Future<BirthProfileModel?> migrateGuestProfile(dynamic dto) async => null;
}

class _FakeApiClient extends Fake implements ApiClient {}

class _MockReportsService extends ReportsService {
  _MockReportsService() : super(apiClient: _FakeApiClient());
}

class _MockGenerationNotifier extends ReportGenerationNotifier {
  _MockGenerationNotifier(ReportGenerationState initialState)
      : super(_MockReportsService()) {
    state = initialState;
  }

  @override
  void startPolling(String reportId) {}

  @override
  void stopPolling() {}

  @override
  Future<Uint8List?> downloadAndCachePdf(String reportId) async {
    return state.pdfBytes;
  }
}
