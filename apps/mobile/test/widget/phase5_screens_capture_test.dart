import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
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
import 'package:astro_mobile/core/network/api_client.dart';

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

  final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_5');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  Widget buildCaptureWidget({
    required GlobalKey boundaryKey,
    required Widget child,
    required List<Override> overrides,
    required Locale locale,
  }) {
    return ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: RepaintBoundary(
          key: boundaryKey,
          child: child,
        ),
      ),
    );
  }

  Future<void> captureToFile(
    WidgetTester tester,
    GlobalKey boundaryKey,
    String filename,
  ) async {
    await tester.runAsync(() async {
      final RenderRepaintBoundary boundary =
          boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final file = File('${outDir.path}/$filename');
        await file.writeAsBytes(byteData.buffer.asUint8List());
      }
    });
  }

  group('Phase 5 Reports Screens Capture Suite', () {
    testWidgets('Capture reports_catalogue_390w_en_profile', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([testProfile1, testProfile2]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
            userReportsProvider.overrideWith((ref) => Future.value([])),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'reports_catalogue_390w_en_profile.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture reports_catalogue_360w_hi_profile', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(360 * 2, 800 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('hi'),
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
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'reports_catalogue_360w_hi_profile.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture reports_catalogue_320w_en_profile', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(320 * 2, 640 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
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
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'reports_catalogue_320w_en_profile.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture reports_catalogue_390w_en_noprofile', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
          overrides: [
            birthProfilesListNotifierProvider.overrideWith(
              (ref) => _MockBirthProfilesNotifier([]),
            ),
            selectedBirthProfileProvider.overrideWith((ref) => null),
            userReportsProvider.overrideWith((ref) => Future.value([])),
          ],
          child: const ReportsScreen(),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'reports_catalogue_390w_en_noprofile.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture reports_history_390w_en', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
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
      await tester.pump(const Duration(milliseconds: 100));
      // Switch to History tab
      await tester.tap(find.text('My Reports'));
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'reports_history_390w_en.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture reports_history_360w_hi', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(360 * 2, 800 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('hi'),
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
      await tester.pump(const Duration(milliseconds: 100));
      // Switch to History tab
      await tester.tap(find.text('मेरी रिपोर्ट्स'));
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'reports_history_360w_hi.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture reports_history_empty_390w_en', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
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
      await tester.pump(const Duration(milliseconds: 100));
      await tester.tap(find.text('My Reports'));
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'reports_history_empty_390w_en.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture report_detail_kundli_390w_en', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
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
            description: 'Comprehensive astrological document detailing Janma & Chandra Kundli, 9 Grahas, Vimshottari Dasha, Doshas, and Gemstones.',
            priceText: '₹299',
            pricePaise: 29900,
            icon: Icons.auto_awesome,
            accentColor: AppColors.tintVioletText,
            initialProfile: testProfile1,
            includedSections: const [
              'Janma Kundli & Navamsha (D9)',
              '9 Planetary Dignities & Avastas',
              'Vimshottari Mahadasha & Antardasha Timeline',
              'Manglik & Kaal Sarp Dosha Evaluation',
              'Primary Lucky Gemstones & Auspicious Colors',
            ],
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'report_detail_kundli_390w_en.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture report_detail_matchmaking_390w_en', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
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
            description: 'Comprehensive 36-point Guna Milan, comparative Manglik analysis, and synastry synthesis for prospective couples.',
            priceText: '₹999',
            pricePaise: 99900,
            icon: Icons.favorite,
            accentColor: AppColors.tintRoseText,
            initialProfile: testProfile1,
            includedSections: const [
              '36-Point Ashtakoota Guna Milan',
              'Manglik Dosha & Bhakoot Compatibility',
              'Nadi Dosha Cancellation Exceptions',
              'Long-Term Marital Harmony Synthesis',
            ],
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'report_detail_matchmaking_390w_en.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture report_generation_analyzing_390w_en', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
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

      await captureToFile(tester, boundaryKey, 'report_generation_analyzing_390w_en.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture report_generation_failed_390w_en', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
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

      await captureToFile(tester, boundaryKey, 'report_generation_failed_390w_en.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });

    testWidgets('Capture report_pdf_viewer_390w_en', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(
        buildCaptureWidget(
          boundaryKey: boundaryKey,
          locale: const Locale('en'),
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
      await tester.pump(const Duration(milliseconds: 300));

      await captureToFile(tester, boundaryKey, 'report_pdf_viewer_390w_en.png');
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
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
