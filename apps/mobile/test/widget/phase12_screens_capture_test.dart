import 'dart:convert';
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
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

// Screens
import 'package:astro_mobile/home/screens/home_screen.dart';
import 'package:astro_mobile/home/screens/reports_screen.dart';
import 'package:astro_mobile/home/screens/consult_screen.dart';
import 'package:astro_mobile/home/screens/profile_screen.dart';

import 'package:astro_mobile/features/astrology/screens/divisional_charts_screen.dart';
import 'package:astro_mobile/features/astrology/screens/vimshottari_dasha_screen.dart';
import 'package:astro_mobile/features/astrology/screens/ashtakavarga_screen.dart';
import 'package:astro_mobile/features/astrology/screens/shadbala_screen.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/models/strength_model.dart';
import 'package:astro_mobile/features/astrology/models/ashtakavarga_model.dart';
import 'package:astro_mobile/features/astrology/models/dasha_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';

import 'package:astro_mobile/features/reports/screens/report_pdf_viewer_screen.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';

import 'package:astro_mobile/features/consultations/services/consultation_service.dart';
import 'package:astro_mobile/features/consultations/providers/consultation_provider.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';

import 'package:astro_mobile/features/courses/screens/courses_hub_screen.dart';
import 'package:astro_mobile/features/courses/models/course_models.dart';
import 'package:astro_mobile/features/courses/services/courses_service.dart';
import 'package:astro_mobile/features/courses/providers/courses_provider.dart';

import 'package:astro_mobile/features/shop/screens/shop_catalog_screen.dart';
import 'package:astro_mobile/features/shop/screens/cart_screen.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/models/cart_item_model.dart';
import 'package:astro_mobile/features/shop/services/shop_service.dart';
import 'package:astro_mobile/features/shop/providers/shop_provider.dart';

import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';

import 'package:astro_mobile/features/birth_profile/screens/birth_profile_list_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';

import 'package:astro_mobile/features/settings/screens/app_settings_screen.dart';
import 'package:astro_mobile/features/notifications/screens/notifications_screen.dart';
import 'package:astro_mobile/features/support/screens/help_support_screen.dart';
import 'package:astro_mobile/features/legal/screens/legal_documents_screen.dart';
import 'package:astro_mobile/shared/screens/system_maintenance_screen.dart';
import 'package:astro_mobile/shared/screens/not_found_screen.dart';

import 'package:astro_mobile/features/jyoti/screens/jyoti_chat_screen.dart';
import 'package:astro_mobile/features/jyoti/models/jyoti_message.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_api_repository.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_local_chat_repository.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_mock_data.dart';
import 'package:astro_mobile/features/jyoti/providers/jyoti_controller.dart';

void main() {
  final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_12');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  late AstroChartModel canonicalChartD1;
  late ComprehensiveStrengthModel canonicalStrength;
  late AshtakavargaResultModel canonicalAshtakavarga;

  final testUser = UserModel(
    id: 'usr_p12_001',
    email: 'seeker@astrosushil.com',
    role: 'USER',
    createdAt: DateTime(2026, 1, 1),
  );

  final testBirthProfile = BirthProfileModel(
    id: 'bp_p12_001',
    userId: 'usr_p12_001',
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

  DashaTreeModel createSampleDashaTree() {
    final now = DateTime.now();
    return DashaTreeModel(
      system: 'VIMSHOTTARI',
      totalSpanYears: 120,
      mahadashas: [
        DashaPeriodModel(
          planet: 'SUN',
          level: 'MAHADASHA',
          levelNumber: 1,
          order: 1,
          startDate: now.subtract(const Duration(days: 365 * 10)),
          endDate: now.subtract(const Duration(days: 365 * 4)),
          durationYears: 6.0,
          subPeriods: [],
        ),
        DashaPeriodModel(
          planet: 'MOON',
          level: 'MAHADASHA',
          levelNumber: 1,
          order: 2,
          startDate: now.subtract(const Duration(days: 365 * 4)),
          endDate: now.add(const Duration(days: 365 * 6)),
          durationYears: 10.0,
          isActive: true,
          subPeriods: [
            DashaPeriodModel(
              planet: 'MOON',
              level: 'ANTARDASHA',
              levelNumber: 2,
              order: 1,
              startDate: now.subtract(const Duration(days: 365 * 4)),
              endDate: now.subtract(const Duration(days: 365 * 3)),
              durationYears: 0.83,
              subPeriods: [],
            ),
          ],
        ),
      ],
    );
  }

  setUpAll(() {
    final file = File('test/fixtures_live.json');
    final fixtures = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;

    canonicalChartD1 = AstroChartModel.fromJson(fixtures['chart_d1'] as Map<String, dynamic>);
    canonicalStrength = ComprehensiveStrengthModel.fromJson(
        (fixtures['strength']['data'] ?? fixtures['strength']) as Map<String, dynamic>);
    canonicalAshtakavarga = AshtakavargaResultModel.fromJson(
        (fixtures['ashtakavarga']['data'] ?? fixtures['ashtakavarga']) as Map<String, dynamic>);
  });

  Future<void> captureScreen(WidgetTester tester, GlobalKey key, String filename) async {
    await tester.runAsync(() async {
      final boundary = key.currentContext!.findRenderObject() as RenderRepaintBoundary;
      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final file = File('${outDir.path}/$filename');
        await file.writeAsBytes(byteData.buffer.asUint8List());
      }
    });
  }

  Widget buildCaptureApp({
    required GlobalKey boundaryKey,
    required Widget child,
    List<Override> overrides = const [],
    Locale locale = const Locale('en'),
  }) {
    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        selectedBirthProfileProvider.overrideWith((ref) => testBirthProfile),
        selectedBirthProfileIdProvider.overrideWith((ref) => testBirthProfile.id),
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => _P12TestBirthProfilesNotifier([testBirthProfile]),
        ),
        authStateProvider.overrideWith(
          (ref) => _P12TestAuthNotifier(AuthState.authenticated(testUser)),
        ),
        userReportsProvider.overrideWith((ref) => Future.value([])),
        consultationServiceProvider.overrideWithValue(_P12MockConsultationService()),
        coursesServiceProvider.overrideWithValue(_P12MockCoursesService()),
        shopServiceProvider.overrideWithValue(_P12FakeShopService()),
        divisionalChartProvider.overrideWith((ref, query) => Future.value(canonicalChartD1)),
        vimshottariDashaForProfileProvider.overrideWith((ref, p) => Future.value(createSampleDashaTree())),
        strengthForProfileProvider.overrideWith((ref, p) => Future.value(canonicalStrength)),
        ashtakavargaForProfileProvider.overrideWith((ref, p) => Future.value(canonicalAshtakavarga)),
        jyotiApiRepositoryProvider.overrideWithValue(_P12CaptureJyotiApiRepository()),
        jyotiLocalChatRepositoryProvider.overrideWithValue(_P12CaptureJyotiLocalChatRepository()),
        ...overrides,
      ],
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

  group('Phase 12: Final Visual QA & Cross-Phase Screenshot Suite', () {
    testWidgets('01_home_screen_dashboard', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const HomeScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '01_home_screen_dashboard.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('02_core_astrology_janma_kundli', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const DivisionalChartsScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '02_core_astrology_janma_kundli.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('03_core_astrology_vimshottari_dasha', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const VimshottariDashaScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '03_core_astrology_vimshottari_dasha.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('04_advanced_astrology_ashtakavarga', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const AshtakavargaScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '04_advanced_astrology_ashtakavarga.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('05_advanced_astrology_shadbala', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const ShadbalaScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '05_advanced_astrology_shadbala.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('06_reports_catalogue_hub', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const ReportsScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '06_reports_catalogue_hub.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('07_reports_pdf_viewer', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: key,
        overrides: [
          reportGenerationNotifierProvider.overrideWith(
            (ref) => _P12MockReportGenerationNotifier(
              ReportGenerationState(
                pdfBytes: Uint8List.fromList([0x25, 0x50, 0x44, 0x46]),
              ),
            ),
          ),
        ],
        child: const ReportPdfViewerScreen(
          reportId: 'rep_p12_001',
          reportTitle: 'Comprehensive Janma Kundli Dossier',
          clientName: 'Rahul Sharma',
        ),
      ));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '07_reports_pdf_viewer.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('08_consultations_booking_catalog', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const ConsultScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '08_consultations_booking_catalog.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('09_courses_learning_hub', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const CoursesHubScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '09_courses_learning_hub.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('10_shop_commerce_catalog', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const ShopCatalogScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '10_shop_commerce_catalog.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('11_shop_cart_and_summary', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const CartScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '11_shop_cart_and_summary.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('12_auth_login_and_phone_otp', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: key,
        overrides: [
          authStateProvider.overrideWith(
            (ref) => _P12TestAuthNotifier(AuthState.unauthenticated()),
          ),
        ],
        child: const LoginScreen(),
      ));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '12_auth_login_and_phone_otp.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('13_birth_profiles_management', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const BirthProfileListScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '13_birth_profiles_management.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('14_account_profile_settings', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const ProfileScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '14_account_profile_settings.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('15_app_settings', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const AppSettingsScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '15_app_settings.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('16_inbox_notifications_hub', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const NotificationsScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '16_inbox_notifications_hub.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('17_help_support_faq', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const HelpSupportScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '17_help_support_faq.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('18_legal_documents_repository', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: key,
        child: const LegalDocumentsScreen(initialDocument: LegalDocumentType.shipping),
      ));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '18_legal_documents_repository.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('19_system_maintenance_fallback', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: key,
        child: const SystemMaintenanceScreen(),
      ));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '19_system_maintenance_fallback.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('20_not_found_recovery', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: key,
        child: const NotFoundScreen(routePath: '/invalid-celestial-link'),
      ));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '20_not_found_recovery.png');
      addTearDown(tester.view.resetPhysicalSize);
    });

    testWidgets('21_jyoti_vedic_assistant', (tester) async {
      final key = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildCaptureApp(boundaryKey: key, child: const JyotiChatScreen()));
      await tester.pumpAndSettle();

      await captureScreen(tester, key, '21_jyoti_vedic_assistant.png');
      addTearDown(tester.view.resetPhysicalSize);
    });
  });
}

// ── Mock & Helper Classes ──────────────────────────────────────────────────

class _P12TestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _P12TestAuthNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _P12TestBirthProfilesNotifier extends StateNotifier<BirthProfilesState> implements BirthProfilesNotifier {
  _P12TestBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _P12MockConsultationService implements ConsultationService {
  @override
  Future<List<ConsultationOfferingModel>> fetchCatalog() async => const [
        ConsultationOfferingModel(
          sku: 'consult-budget-friendly',
          title: 'Budget Friendly Consultation',
          description: '15-minute voice call session with Astro Sushil.',
          mode: 'ONLINE_VOICE',
          durationMinutes: 15,
          pricePaise: 500000,
          responseDaysNotice: 15,
          category: 'Audio Consultation',
        ),
        ConsultationOfferingModel(
          sku: 'consult-general-video',
          title: 'General Consultation (Video)',
          description: '30-minute interactive video call with thorough chart analysis.',
          mode: 'ONLINE_VIDEO',
          durationMinutes: 30,
          pricePaise: 1500000,
          responseDaysNotice: 15,
          category: 'Video Consultation',
        ),
      ];

  @override
  Future<List<AppointmentSlotModel>> fetchSlots({
    required String date,
    required String mode,
    String? practitionerId,
  }) async =>
      const [];

  @override
  Future<Map<String, dynamic>> bookAppointment({
    required String slotId,
    required String consultationSku,
    required String consultationMode,
    String? birthProfileId,
    String? query,
  }) async =>
      {};

  @override
  Future<ConsultationBookingModel> verifyPayment({
    required String bookingId,
    required String orderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async =>
      throw UnimplementedError();

  @override
  Future<List<ConsultationBookingModel>> getMyBookings() async => const [];

  @override
  Future<ConsultationBookingModel> getBookingDetails(String bookingId) async =>
      throw UnimplementedError();

  @override
  Future<ConsultationBookingModel> rescheduleBooking({
    required String bookingId,
    required String newSlotId,
    String? reason,
  }) async =>
      throw UnimplementedError();

  @override
  Future<ConsultationBookingModel> cancelBooking({
    required String bookingId,
    String? reason,
  }) async =>
      throw UnimplementedError();
}

class _P12MockCoursesService extends Fake implements CoursesService {
  @override
  Future<List<CourseSummaryModel>> fetchCourses({String? level, String? language, String? search}) async => const [
        CourseSummaryModel(
          id: 'c-gupt-nadi',
          sku: 'course-gupt-nadi',
          slug: 'gupt-nadi-astrology',
          title: 'Gupt Nadi Astrology Masterclass',
          hindiTitle: 'गुप्त नाड़ी ज्योतिष',
          shortDescription: 'Comprehensive Nadi course with 12 video lectures.',
          hindiDescription: 'सम्पूर्ण गुप्त नाड़ी ज्योतिष पाठ्यक्रम।',
          instructorName: 'Astro Sushil Kumar Singh',
          language: 'English',
          level: CourseLevelEnum.beginner,
          pricePaise: 599900,
          priceRupees: 5999,
          originalPricePaise: 1099900,
          originalPriceRupees: 10999,
          currency: 'INR',
          totalDurationMinutes: 240,
          totalLessons: 13,
          rating: 5.0,
          isEnrolled: false,
          isFeatured: true,
        ),
      ];
}

class _P12FakeShopService extends Fake implements ShopService {
  final List<ProductModel> mockProducts = const [
    ProductModel(
      id: 'prod_herb',
      slug: 'ancient-ramayana-era-herb-unlimited-wealth',
      catalogId: 'prod_herb',
      title: 'Ayodhya Ravi Pushya Sacred Herb',
      hindiTitle: 'अयोध्या रवि पुष्य पावन जड़ी-बूटी',
      category: 'AYODHYA_RAVI_PUSHYA',
      productType: 'PHYSICAL',
      mrp: 699900,
      price: 399900,
      requiresShipping: true,
      description: 'Sacred consecrated herb for unlimited wealth blessed during Ravi Pushya Nakshatra in Ayodhya.',
    ),
  ];

  @override
  Future<List<ProductModel>> fetchProducts({String? category, String? productType, String? search}) async =>
      mockProducts;

  @override
  Future<ProductModel> fetchProductDetails(String idOrSlug) async => mockProducts.first;

  @override
  Future<CartCalculationResult> calculateCart(List<CartItemModel> items, {String? shippingAddressId}) async {
    int total = items.fold(0, (sum, i) => sum + i.totalPaise);
    return CartCalculationResult(
      items: const [],
      subtotalPaise: total,
      taxAmountPaise: 0,
      shippingAmountPaise: 0,
      totalAmountPaise: total,
      requiresShipping: true,
      eligibleForFreeShipping: true,
    );
  }
}

class _P12MockReportGenerationNotifier extends StateNotifier<ReportGenerationState>
    implements ReportGenerationNotifier {
  _P12MockReportGenerationNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _P12CaptureJyotiApiRepository extends Fake implements JyotiApiRepository {
  @override
  Future<List<JyotiMessageModel>> sendMessage({
    required String message,
    required List<JyotiMessageModel> recentHistory,
    String? currentScreen,
    String? birthProfileId,
  }) async {
    return JyotiMockData.generateMockResponse(message);
  }
}

class _P12CaptureJyotiLocalChatRepository extends Fake implements JyotiLocalChatRepository {
  @override
  Future<List<JyotiMessageModel>> loadMessages() async => [
        JyotiMessageModel(
          id: 'welcome_1',
          text: 'Namaste! I am Jyoti, your Vedic astrology companion. How may I guide you through your cosmic journey today?',
          type: JyotiMessageType.jyotiText,
          timestamp: DateTime.now(),
        ),
      ];
  @override
  Future<void> saveMessages(List<JyotiMessageModel> messages) async {}
  @override
  Future<void> clearChat() async {}
}
