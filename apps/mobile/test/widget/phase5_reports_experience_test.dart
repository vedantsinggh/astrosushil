import 'dart:typed_data';
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
import 'package:astro_mobile/features/reports/screens/report_detail_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_generation_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_pdf_viewer_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';

void main() {
  final testProfile1 = BirthProfileModel(
    id: 'bp_phase5_001',
    userId: 'usr_phase5_001',
    name: 'Rahul Sharma',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  final testProfile2 = BirthProfileModel(
    id: 'bp_phase5_002',
    userId: 'usr_phase5_001',
    name: 'Priya Patel',
    dateOfBirth: '1992-08-20',
    timeOfBirth: '09:15:00',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    placeName: 'Mumbai, India',
    createdAt: DateTime(2026, 1, 2),
    updatedAt: DateTime(2026, 1, 2),
  );

  final mockCompletedReport = UserReportItemModel(
    id: 'rep_001',
    userId: 'usr_phase5_001',
    birthProfileId: 'bp_phase5_001',
    profileName: 'Rahul Sharma',
    reportType: 'KUNDLI',
    status: 'COMPLETED',
    stage: 'COMPLETED',
    progress: 100,
    storageKey: 'reports/rep_001.pdf',
    createdAt: DateTime(2026, 3, 15, 10, 30),
    completedAt: DateTime(2026, 3, 15, 10, 32),
  );

  final mockProcessingReport = UserReportItemModel(
    id: 'rep_002',
    userId: 'usr_phase5_001',
    birthProfileId: 'bp_phase5_001',
    profileName: 'Rahul Sharma',
    reportType: 'CAREER',
    status: 'ANALYZING',
    stage: 'ANALYZING',
    progress: 45,
    storageKey: null,
    createdAt: DateTime(2026, 3, 16, 11, 00),
    completedAt: null,
  );

  final mockFailedReport = UserReportItemModel(
    id: 'rep_003',
    userId: 'usr_phase5_001',
    birthProfileId: 'bp_phase5_002',
    profileName: 'Priya Patel',
    reportType: 'MARRIAGE_COMPATIBILITY',
    status: 'FAILED',
    stage: 'FAILED',
    progress: 10,
    errorMessage: 'Ephemeris calculation timeout',
    createdAt: DateTime(2026, 3, 14, 08, 00),
    completedAt: null,
  );

  Widget createTestWidget({
    required Widget child,
    List<Override> overrides = const [],
    Locale locale = const Locale('en'),
    double textScaleFactor = 1.0,
  }) {
    return ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('en'),
          Locale('hi'),
        ],
        home: MediaQuery(
          data: MediaQueryData(
            textScaler: TextScaler.linear(textScaleFactor),
            size: const Size(390, 844),
          ),
          child: child,
        ),
      ),
    );
  }

  group('Phase 5 Reports Experience Tests', () {
    testWidgets('Catalogue renders all 5 active report tiers and 2 upcoming tiers', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile1]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
            userReportsProvider.overrideWith((ref) => Future.value([])),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Verify header and badge
      expect(find.text('100% Deterministic Engine'), findsOneWidget);
      expect(find.text('Your Astrology Reports'), findsOneWidget);
      expect(find.text('Personalized Reports'), findsOneWidget);

      // Verify 5 active report tiers
      expect(find.text('Birth Chart & Kundli Report'), findsOneWidget);
      expect(find.text('₹299'), findsOneWidget);

      expect(find.text('Mini Horoscope & Transit Forecast'), findsOneWidget);
      expect(find.text('₹199'), findsOneWidget);

      expect(find.text('Career & Professional Life'), findsOneWidget);
      expect(find.text('PREMIUM PDF'), findsOneWidget);

      expect(find.text('Pro Horoscope & Divisional Charts'), findsOneWidget);
      expect(find.text('₹699'), findsOneWidget);

      expect(find.text('Marriage & Relationship Report'), findsOneWidget);
      expect(find.text('₹999'), findsOneWidget);

      // Scroll to view upcoming categories
      await tester.drag(find.byType(ListView), const Offset(0, -600));
      await tester.pumpAndSettle();

      expect(find.text('Childbirth & Family Lineage'), findsOneWidget);
      expect(find.text('Gupta Nadi Life Dossier'), findsOneWidget);
      expect(find.text('COMING SOON'), findsNWidgets(2));
    });

    testWidgets('Compare Report Tiers bottom sheet displays all comparison matrices', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile1]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
            userReportsProvider.overrideWith((ref) => Future.value([])),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pumpAndSettle();

      final compareButton = find.textContaining('Compare Report Tiers');
      expect(compareButton, findsOneWidget);
      await tester.tap(compareButton);
      await tester.pumpAndSettle();

      // Comparison sheet should display
      expect(find.text('Compare Report Tiers'), findsWidgets);
      expect(find.text('Understand what each verified report tier provides.'), findsOneWidget);
      expect(find.textContaining('Mini'), findsWidgets);
      expect(find.textContaining('Basic'), findsWidgets);
      expect(find.textContaining('Pro'), findsWidgets);
      expect(find.text('Janma Kundli (D1 & Chandra)'), findsOneWidget);
    });

    testWidgets('My Reports tab renders empty state when no reports generated', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile1]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
            userReportsProvider.overrideWith((ref) => Future.value([])),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Switch to My Reports tab
      final historyTab = find.text('My Reports');
      expect(historyTab, findsOneWidget);
      await tester.tap(historyTab);
      await tester.pumpAndSettle();

      expect(find.text('No Reports Generated Yet'), findsOneWidget);
      final browseBtn = find.text('Browse Report Catalogue');
      expect(browseBtn, findsOneWidget);

      // Tapping browse button switches back to Catalogue tab
      await tester.tap(browseBtn);
      await tester.pumpAndSettle();
      expect(find.text('Your Astrology Reports'), findsOneWidget);
    });

    testWidgets('My Reports tab displays reports with correct status badges and filtering', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile1, testProfile2]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
            userReportsProvider.overrideWith(
              (ref) => Future.value([mockCompletedReport, mockProcessingReport, mockFailedReport]),
            ),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Switch to My Reports tab
      await tester.tap(find.text('My Reports'));
      await tester.pumpAndSettle();

      // Filter chips should be present
      expect(find.text('All Reports (3)'), findsOneWidget);
      expect(find.text('Ready (1)'), findsOneWidget);
      expect(find.text('In Progress (1)'), findsOneWidget);
      expect(find.text('Failed (1)'), findsOneWidget);

      // Initial visible reports
      expect(find.text('Birth Chart & Kundli Report'), findsOneWidget);
      expect(find.text('Career & Professional Life'), findsOneWidget);

      // Filter by Ready
      await tester.tap(find.text('Ready (1)'));
      await tester.pumpAndSettle();
      expect(find.text('Birth Chart & Kundli Report'), findsOneWidget);
      expect(find.text('Career & Professional Life'), findsNothing);

      // Drag filter chips horizontally to bring In Progress into view
      await tester.drag(find.text('Ready (1)'), const Offset(-250, 0));
      await tester.pumpAndSettle();

      // Filter by In Progress
      await tester.tap(find.text('In Progress (1)'));
      await tester.pumpAndSettle();
      expect(find.text('Career & Professional Life'), findsOneWidget);
      expect(find.text('Birth Chart & Kundli Report'), findsNothing);

      // Drag filter chips horizontally to bring Failed into view
      await tester.drag(find.text('In Progress (1)'), const Offset(-250, 0));
      await tester.pumpAndSettle();

      // Filter by Failed
      await tester.tap(find.text('Failed (1)'));
      await tester.pumpAndSettle();
      expect(find.text('Marriage & Relationship Report'), findsOneWidget);
      expect(find.text('Ephemeris calculation timeout'), findsOneWidget);
    });

    testWidgets('ReportDetailScreen shows deliverables, 18% inclusive GST, and profile selector', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile1, testProfile2]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
            userReportsProvider.overrideWith((ref) => Future.value([])),
          ],
          child: ReportDetailScreen(
            reportType: 'KUNDLI',
            title: 'Birth Chart & Kundli Report',
            tagline: 'Complete 30+ Page Vedic Horoscope',
            description: 'In-depth analysis of Janma Kundli',
            priceText: '₹299',
            pricePaise: 29900,
            icon: Icons.auto_awesome,
            accentColor: AppColors.tintVioletText,
            initialProfile: testProfile1,
            includedSections: const [
              'Janma Kundli & Navamsha (D9)',
              '9 Planetary Dignities & Avastas',
              'Vimshottari Mahadasha & Antardasha Timeline',
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Birth Chart & Kundli Report'), findsWidgets);
      expect(find.text('Primary Birth Profile'), findsOneWidget);
      expect(find.text('Rahul Sharma'), findsOneWidget);

      // Included sections for KUNDLI
      expect(find.text('Included Astrological Sections'), findsOneWidget);
      expect(find.text('Janma Kundli & Navamsha (D9)'), findsOneWidget);
      expect(find.text('9 Planetary Dignities & Avastas'), findsOneWidget);
      expect(find.text('Vimshottari Mahadasha & Antardasha Timeline'), findsOneWidget);

      // Pricing & GST
      expect(find.text('Price & Tax Breakdown'), findsOneWidget);
      expect(find.text('Base Price'), findsOneWidget);
      expect(find.text('18% GST Included'), findsOneWidget);
      expect(find.text('₹45.61'), findsOneWidget);
      expect(find.text('₹299'), findsWidgets);
    });

    testWidgets('ReportDetailScreen enforces partner profile selection for Match Making', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile1, testProfile2]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
            userReportsProvider.overrideWith((ref) => Future.value([])),
          ],
          child: ReportDetailScreen(
            reportType: 'MARRIAGE_COMPATIBILITY',
            title: 'Marriage & Relationship Report',
            tagline: 'Ashtakoota Milan & Manglik Analysis',
            description: 'Comprehensive 36-guna Milan',
            priceText: '₹999',
            pricePaise: 99900,
            icon: Icons.favorite,
            accentColor: AppColors.tintRoseText,
            initialProfile: testProfile1,
            includedSections: const [
              '36-Point Ashtakoota Guna Milan',
              'Manglik Dosha & Bhakoot Compatibility',
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Partner Profile'), findsOneWidget);
      expect(find.text('Select Partner'), findsOneWidget);

      // Tap to pick partner profile
      await tester.tap(find.text('Select Partner'));
      await tester.pumpAndSettle();

      // Bottom sheet with Priya Patel
      final partnerTile = find.widgetWithText(ListTile, 'Priya Patel');
      expect(partnerTile, findsOneWidget);
      await tester.tap(partnerTile);
      await tester.pumpAndSettle();

      // Selected partner profile should now show Priya Patel
      expect(find.text('Priya Patel (1992-08-20)'), findsOneWidget);
    });

    testWidgets('ReportGenerationScreen displays active stages and progress', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            reportGenerationNotifierProvider.overrideWith(
              (ref) => _MockGenerationNotifier(
                ReportGenerationState(
                  isPolling: true,
                  activeReportId: 'rep_002',
                  status: mockProcessingReport,
                ),
              ),
            ),
          ],
          child: ReportGenerationScreen(
            reportId: 'rep_002',
            reportType: 'CAREER',
            reportTitle: 'Career & Professional Life',
            profile: testProfile1,
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Career & Professional Life'), findsWidgets);
      expect(find.text('Rahul Sharma'), findsOneWidget);
      expect(find.text('Analyzing astrological yogas...'), findsOneWidget);
      expect(find.text('45%'), findsOneWidget);
      expect(find.text('PROCESSING'), findsOneWidget);
    });

    testWidgets('ReportGenerationScreen displays failure state with retry button', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            reportGenerationNotifierProvider.overrideWith(
              (ref) => _MockGenerationNotifier(
                ReportGenerationState(
                  isPolling: false,
                  activeReportId: 'rep_003',
                  status: mockFailedReport,
                ),
              ),
            ),
          ],
          child: ReportGenerationScreen(
            reportId: 'rep_003',
            reportType: 'MARRIAGE_COMPATIBILITY',
            reportTitle: 'Marriage & Relationship Report',
            profile: testProfile2,
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Report Generation Failed'), findsOneWidget);
      expect(find.text('Ephemeris calculation timeout'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('ReportPdfViewerScreen displays document header and handles errors cleanly', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          overrides: [
            reportGenerationNotifierProvider.overrideWith(
              (ref) => _MockGenerationNotifier(
                ReportGenerationState(
                  pdfBytes: Uint8List.fromList([0x25, 0x50, 0x44, 0x46]), // %PDF
                ),
              ),
            ),
          ],
          child: const ReportPdfViewerScreen(
            reportId: 'rep_001',
            reportTitle: 'Birth Chart & Kundli Report',
            clientName: 'Rahul Sharma',
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Birth Chart & Kundli Report'), findsOneWidget);
      expect(find.text('Rahul Sharma'), findsOneWidget);
    });

    testWidgets('Responsive layouts across 320, 360, 390, and 414 dp viewports without overflow', (tester) async {
      final widths = [320.0, 360.0, 390.0, 414.0];

      for (final width in widths) {
        tester.view.physicalSize = Size(width * 2, 844 * 2);
        tester.view.devicePixelRatio = 2.0;

        await tester.pumpWidget(
          createTestWidget(
            overrides: [
              birthProfilesListNotifierProvider.overrideWith(
                (ref) => _MockBirthProfilesNotifier([testProfile1]),
              ),
              selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
              userReportsProvider.overrideWith(
                (ref) => Future.value([mockCompletedReport, mockProcessingReport]),
              ),
            ],
            child: const ReportsScreen(),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('100% Deterministic Engine'), findsOneWidget);
        expect(tester.takeException(), isNull, reason: 'Overflow occurred at width $width');
      }
    });

    testWidgets('Hindi localization renders properly without overflow', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          locale: const Locale('hi'),
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile1]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
            userReportsProvider.overrideWith((ref) => Future.value([mockCompletedReport])),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('100% प्रामाणिक वैदिक गणना'), findsOneWidget);
      expect(find.text('रिपोर्ट कैटलॉग'), findsOneWidget);
      expect(find.text('मेरी रिपोर्ट्स'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('Dynamic text scaling (1.5x) renders without overflow', (tester) async {
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        createTestWidget(
          textScaleFactor: 1.5,
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile1]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
            userReportsProvider.overrideWith((ref) => Future.value([])),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Your Astrology Reports'), findsOneWidget);
      expect(tester.takeException(), isNull);
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
