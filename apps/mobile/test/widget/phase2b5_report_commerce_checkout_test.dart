import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/reports/models/report_purchase_models.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/features/reports/services/reports_service.dart';
import 'package:astro_mobile/features/reports/services/razorpay_checkout_service.dart';
import 'package:astro_mobile/features/reports/screens/report_detail_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_generation_screen.dart';

class MockRazorpayCheckoutService implements IRazorpayCheckoutService {
  RazorpaySuccessCallback? onSuccessCallback;
  RazorpayFailureCallback? onFailureCallback;
  RazorpayCancelCallback? onCancelCallback;
  RazorpayExternalWalletCallback? onExternalWalletCallback;
  ReportPaymentOrder? lastOpenedOrder;
  String? lastReportTitle;
  int openCheckoutCalls = 0;
  int initCalls = 0;
  int disposeCalls = 0;

  @override
  void init({
    required RazorpaySuccessCallback onSuccess,
    required RazorpayFailureCallback onFailure,
    required RazorpayCancelCallback onCancel,
    RazorpayExternalWalletCallback? onExternalWallet,
  }) {
    initCalls++;
    onSuccessCallback = onSuccess;
    onFailureCallback = onFailure;
    onCancelCallback = onCancel;
    onExternalWalletCallback = onExternalWallet;
  }

  @override
  void openCheckout({
    required ReportPaymentOrder order,
    required String reportTitle,
    String? userEmail,
    String? userContact,
  }) {
    openCheckoutCalls++;
    lastOpenedOrder = order;
    lastReportTitle = reportTitle;
  }

  void triggerSuccess({
    String? razorpayOrderId,
    String? razorpayPaymentId,
    String? razorpaySignature,
  }) {
    onSuccessCallback?.call(
      razorpayOrderId: razorpayOrderId ?? lastOpenedOrder?.razorpayOrderId ?? 'order_mock_rzp_123',
      razorpayPaymentId: razorpayPaymentId ?? 'pay_mock_test_456',
      razorpaySignature: razorpaySignature ?? 'sig_mock_valid_789',
    );
  }

  void triggerFailure({String? errorCode, String? errorMessage}) {
    onFailureCallback?.call(
      errorCode: errorCode ?? 'BAD_REQUEST_ERROR',
      errorMessage: errorMessage ?? 'Payment was declined by issuing bank',
    );
  }

  void triggerCancel() {
    onCancelCallback?.call();
  }

  @override
  void dispose() {
    disposeCalls++;
  }
}

class MockReportsService extends ReportsService {
  MockReportsService() : super(apiClient: _FakeApiClient());

  int createReportOrderCalls = 0;
  String? lastCreatedReportType;
  int verifyReportPaymentCalls = 0;
  int createReportJobCalls = 0;
  String? lastJobOrderId;
  bool shouldFailOrderCreation = false;
  bool shouldFailVerification = false;
  bool shouldTimeoutVerification = false;

  @override
  Future<ReportPaymentOrder> createReportOrder({
    required String reportType,
    String? idempotencyKey,
  }) async {
    createReportOrderCalls++;
    lastCreatedReportType = reportType;
    if (shouldFailOrderCreation) {
      throw Exception('Payment gateway unavailable');
    }

    final priceMap = {
      'KUNDLI': 29900,
      'PLANETARY_SUMMARY': 19900,
      'CAREER': 49900,
      'MARRIAGE_COMPATIBILITY': 49900,
      'CAREER_PROSITY': 69900,
    };

    final amount = priceMap[reportType] ?? 49900;
    return ReportPaymentOrder(
      orderId: 'ord_mock_${DateTime.now().millisecondsSinceEpoch}',
      razorpayOrderId: 'order_mock_rzp_123',
      amount: amount,
      subtotal: (amount / 1.18).round(),
      taxAmount: amount - (amount / 1.18).round(),
      currency: 'INR',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      reportType: reportType,
      razorpayKey: 'rzp_test_placeholder_key',
    );
  }

  @override
  Future<Map<String, dynamic>> verifyReportPayment({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    verifyReportPaymentCalls++;
    if (shouldFailVerification) {
      throw Exception('Invalid payment signature');
    }
    if (shouldTimeoutVerification) {
      throw Exception('Connection timed out');
    }

    return {
      'message': 'Payment verified successfully',
      'order': {
        'id': 'ord_mock_verified',
        'status': 'PAID',
        'paymentStatus': 'CAPTURED',
        'razorpayOrderId': razorpayOrderId,
        'amount': 29900,
      },
    };
  }

  @override
  Future<Map<String, dynamic>> getPaymentOrderStatus(String orderId) async {
    return {
      'id': orderId,
      'status': shouldFailVerification ? 'FAILED' : 'PAID',
      'paymentStatus': shouldFailVerification ? 'FAILED' : 'CAPTURED',
      'amount': 29900,
      'currency': 'INR',
    };
  }

  @override
  Future<Map<String, dynamic>> createReportJob({
    required String birthProfileId,
    required String reportType,
    String? partnerProfileId,
    String? orderId,
    bool forceRegenerate = false,
    bool async = true,
  }) async {
    createReportJobCalls++;
    lastJobOrderId = orderId;
    return {
      'reportId': 'rep_job_789',
      'id': 'rep_job_789',
      'status': 'QUEUED',
      'stage': 'QUEUED',
      'progress': 0,
      'reportType': reportType,
      'orderId': orderId,
    };
  }

  @override
  Future<UserReportItemModel> getUniversalReportStatus(String id) async {
    return UserReportItemModel(
      id: id,
      userId: 'usr_001',
      birthProfileId: 'bp_001',
      profileName: 'Aarav Sharma',
      reportType: 'KUNDLI',
      status: 'COMPLETED',
      stage: 'COMPLETED',
      progress: 100,
      createdAt: DateTime.now(),
      completedAt: DateTime.now(),
    );
  }
}

class _FakeApiClient implements ApiClient {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _MockGenerationNotifier extends ReportGenerationNotifier {
  _MockGenerationNotifier(ReportsService service) : super(service);

  @override
  void startPolling(String reportId) {
    // No-op in widget tests to avoid periodic timer leaks
  }
}

class _MockBirthProfilesNotifier extends StateNotifier<BirthProfilesState>
    implements BirthProfilesNotifier {
  _MockBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(profiles: profiles, isLoading: false));

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _MockAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _MockAuthNotifier(AuthState state) : super(state);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final testProfile1 = BirthProfileModel(
    id: 'bp_001',
    userId: 'usr_001',
    name: 'Aarav Sharma',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30',
    placeName: 'New Delhi, India',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  final testProfile2 = BirthProfileModel(
    id: 'bp_002',
    userId: 'usr_001',
    name: 'Diya Verma',
    dateOfBirth: '1992-08-20',
    timeOfBirth: '10:15',
    placeName: 'Mumbai, India',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    createdAt: DateTime(2026, 1, 2),
    updatedAt: DateTime(2026, 1, 2),
  );

  final testUser = UserModel(
    id: 'usr_001',
    email: 'test@astrosushil.com',
    role: 'USER',
    createdAt: DateTime(2026, 1, 1),
  );

  Widget createTestWidget({
    required Widget child,
    required MockReportsService mockService,
    required MockRazorpayCheckoutService mockRazorpayService,
    List<BirthProfileModel>? profiles,
  }) {
    return ProviderScope(
      overrides: [
        reportsServiceProvider.overrideWithValue(mockService),
        razorpayCheckoutServiceProvider.overrideWithValue(mockRazorpayService),
        reportGenerationNotifierProvider.overrideWith(
          (ref) => _MockGenerationNotifier(mockService),
        ),
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => _MockBirthProfilesNotifier(profiles ?? [testProfile1, testProfile2]),
        ),
        selectedBirthProfileProvider.overrideWith((ref) => testProfile1),
        userReportsProvider.overrideWith((ref) => Future.value([])),
        authStateProvider.overrideWith(
          (ref) => _MockAuthNotifier(AuthState.authenticated(testUser)),
        ),
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
        home: MediaQuery(
          data: const MediaQueryData(size: Size(390, 844)),
          child: child,
        ),
      ),
    );
  }

  void setupViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(390 * 2, 844 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  group('Phase 2B.5 Task 1A: Report Commerce & Native Razorpay SDK Checkout Tests', () {
    testWidgets('1. Order creation requests correct report SKU and opens native Razorpay SDK',
        (tester) async {
      setupViewport(tester);
      final mockService = MockReportsService();
      final mockRazorpayService = MockRazorpayCheckoutService();

      await tester.pumpWidget(
        createTestWidget(
          mockService: mockService,
          mockRazorpayService: mockRazorpayService,
          child: ReportDetailScreen(
            reportType: 'KUNDLI',
            title: 'Janma Kundli Report',
            tagline: 'VEDIC BIRTH CHART',
            description: 'Full analysis.',
            priceText: '₹299',
            pricePaise: 29900,
            icon: Icons.auto_awesome,
            accentColor: Colors.amber,
            initialProfile: testProfile1,
            includedSections: const ['Section A', 'Section B'],
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final purchaseButton = find.byKey(const Key('report_purchase_button'));
      await tester.ensureVisible(purchaseButton);
      await tester.tap(purchaseButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Verify order creation was called with KUNDLI SKU
      expect(mockService.createReportOrderCalls, 1);
      expect(mockService.lastCreatedReportType, 'KUNDLI');

      // Verify native Razorpay Checkout openCheckout was called
      expect(mockRazorpayService.openCheckoutCalls, 1);
      expect(mockRazorpayService.lastOpenedOrder?.razorpayOrderId, 'order_mock_rzp_123');
      expect(mockRazorpayService.lastOpenedOrder?.amount, 29900);
      expect(mockRazorpayService.lastReportTitle, 'Janma Kundli Report');
    });

    testWidgets('2. Native Razorpay SDK success callback verifies payment and initiates report generation',
        (tester) async {
      setupViewport(tester);
      final mockService = MockReportsService();
      final mockRazorpayService = MockRazorpayCheckoutService();

      await tester.pumpWidget(
        createTestWidget(
          mockService: mockService,
          mockRazorpayService: mockRazorpayService,
          child: ReportDetailScreen(
            reportType: 'CAREER',
            title: 'Career & Professional Life',
            tagline: '10TH HOUSE',
            description: 'Career path.',
            priceText: '₹499',
            pricePaise: 49900,
            icon: Icons.work,
            accentColor: Colors.teal,
            initialProfile: testProfile1,
            includedSections: const ['Vocational DNA'],
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final purchaseButton = find.byKey(const Key('report_purchase_button'));
      await tester.ensureVisible(purchaseButton);
      await tester.tap(purchaseButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Simulate native SDK callback success
      expect(mockRazorpayService.openCheckoutCalls, 1);
      mockRazorpayService.triggerSuccess(
        razorpayOrderId: 'order_mock_rzp_123',
        razorpayPaymentId: 'pay_valid_123',
        razorpaySignature: 'sig_valid_123',
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Verify payment verification API was invoked
      expect(mockService.verifyReportPaymentCalls, 1);

      // Verify report job creation was invoked with verified orderId
      expect(mockService.createReportJobCalls, 1);
      expect(mockService.lastJobOrderId, isNotNull);

      // Verify navigation to ReportGenerationScreen
      expect(find.byType(ReportGenerationScreen), findsOneWidget);
    });

    testWidgets('3. User cancels Razorpay checkout: resets state and does not create report job',
        (tester) async {
      setupViewport(tester);
      final mockService = MockReportsService();
      final mockRazorpayService = MockRazorpayCheckoutService();

      await tester.pumpWidget(
        createTestWidget(
          mockService: mockService,
          mockRazorpayService: mockRazorpayService,
          child: ReportDetailScreen(
            reportType: 'PLANETARY_SUMMARY',
            title: 'Planetary Dignities',
            tagline: 'ASTRONOMICAL STRENGTH',
            description: 'Placements.',
            priceText: '₹199',
            pricePaise: 19900,
            icon: Icons.public,
            accentColor: Colors.blue,
            initialProfile: testProfile1,
            includedSections: const ['Dignities'],
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final purchaseButton = find.byKey(const Key('report_purchase_button'));
      await tester.ensureVisible(purchaseButton);
      await tester.tap(purchaseButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Trigger user cancellation callback from Razorpay SDK
      mockRazorpayService.triggerCancel();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Assert cancellation SnackBar shown
      expect(find.text('Payment cancelled. You can retry whenever you are ready.'), findsOneWidget);

      // Assert NO verification or report job creation
      expect(mockService.verifyReportPaymentCalls, 0);
      expect(mockService.createReportJobCalls, 0);

      // Assert purchase button is re-enabled for retry
      expect(find.byKey(const Key('report_purchase_button')), findsOneWidget);
    });

    testWidgets('4. Razorpay failure callback: shows error and does not create report job',
        (tester) async {
      setupViewport(tester);
      final mockService = MockReportsService();
      final mockRazorpayService = MockRazorpayCheckoutService();

      await tester.pumpWidget(
        createTestWidget(
          mockService: mockService,
          mockRazorpayService: mockRazorpayService,
          child: ReportDetailScreen(
            reportType: 'CAREER_PROSITY',
            title: 'Pro Horoscope',
            tagline: 'ADVANCED DOSSIER',
            description: 'Deep dive.',
            priceText: '₹699',
            pricePaise: 69900,
            icon: Icons.psychology,
            accentColor: Colors.purple,
            initialProfile: testProfile1,
            includedSections: const ['Shodashvarga'],
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final purchaseButton = find.byKey(const Key('report_purchase_button'));
      await tester.ensureVisible(purchaseButton);
      await tester.tap(purchaseButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Trigger failure callback from Razorpay SDK
      mockRazorpayService.triggerFailure(
        errorCode: 'BAD_REQUEST_ERROR',
        errorMessage: 'Payment declined by bank',
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Verify error snackbar shown
      expect(find.textContaining('Payment Failed (BAD_REQUEST_ERROR): Payment declined by bank'), findsOneWidget);

      // Verify no report job created
      expect(mockService.createReportJobCalls, 0);
    });

    testWidgets('5. Invalid signature verification: stops flow and does not create report job',
        (tester) async {
      setupViewport(tester);
      final mockService = MockReportsService();
      mockService.shouldFailVerification = true;
      final mockRazorpayService = MockRazorpayCheckoutService();

      await tester.pumpWidget(
        createTestWidget(
          mockService: mockService,
          mockRazorpayService: mockRazorpayService,
          child: ReportDetailScreen(
            reportType: 'KUNDLI',
            title: 'Janma Kundli Report',
            tagline: 'VEDIC BIRTH CHART',
            description: 'Full analysis.',
            priceText: '₹299',
            pricePaise: 29900,
            icon: Icons.auto_awesome,
            accentColor: Colors.amber,
            initialProfile: testProfile1,
            includedSections: const ['Section A'],
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final purchaseButton = find.byKey(const Key('report_purchase_button'));
      await tester.ensureVisible(purchaseButton);
      await tester.tap(purchaseButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Trigger success callback
      mockRazorpayService.triggerSuccess();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Verification attempted but failed
      expect(mockService.verifyReportPaymentCalls, 1);
      expect(find.textContaining('Payment Verification Failed: Invalid payment signature'), findsOneWidget);

      // Generation NOT triggered
      expect(mockService.createReportJobCalls, 0);
    });

    testWidgets('6. Network timeout during verification: checks order status before failing',
        (tester) async {
      setupViewport(tester);
      final mockService = MockReportsService();
      mockService.shouldTimeoutVerification = true;
      final mockRazorpayService = MockRazorpayCheckoutService();

      await tester.pumpWidget(
        createTestWidget(
          mockService: mockService,
          mockRazorpayService: mockRazorpayService,
          child: ReportDetailScreen(
            reportType: 'KUNDLI',
            title: 'Janma Kundli Report',
            tagline: 'VEDIC BIRTH CHART',
            description: 'Full analysis.',
            priceText: '₹299',
            pricePaise: 29900,
            icon: Icons.auto_awesome,
            accentColor: Colors.amber,
            initialProfile: testProfile1,
            includedSections: const ['Section A'],
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final purchaseButton = find.byKey(const Key('report_purchase_button'));
      await tester.ensureVisible(purchaseButton);
      await tester.tap(purchaseButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Trigger success callback
      mockRazorpayService.triggerSuccess();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Verification threw timeout exception, but fallback getPaymentOrderStatus resolved PAID
      expect(mockService.verifyReportPaymentCalls, 1);
      expect(mockService.createReportJobCalls, 1);
      expect(find.byType(ReportGenerationScreen), findsOneWidget);
    });

    testWidgets('7. Rejects purchase for unsupported SKU client-side (CHILDBIRTH_FAMILY)',
        (tester) async {
      setupViewport(tester);
      final mockService = MockReportsService();
      final mockRazorpayService = MockRazorpayCheckoutService();

      await tester.pumpWidget(
        createTestWidget(
          mockService: mockService,
          mockRazorpayService: mockRazorpayService,
          child: ReportDetailScreen(
            reportType: 'CHILDBIRTH_FAMILY',
            title: 'Childbirth & Family Dynamics',
            tagline: '5TH HOUSE',
            description: 'Unsupported test.',
            priceText: '₹499',
            pricePaise: 49900,
            icon: Icons.family_restroom,
            accentColor: Colors.pink,
            initialProfile: testProfile1,
            includedSections: const ['Progeny Analysis'],
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final purchaseButton = find.byKey(const Key('report_purchase_button'));
      await tester.ensureVisible(purchaseButton);
      await tester.tap(purchaseButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Assert error snackbar shown and no order created
      expect(find.text('This report edition is coming soon and cannot be purchased yet.'), findsOneWidget);
      expect(mockService.createReportOrderCalls, 0);
      expect(mockRazorpayService.openCheckoutCalls, 0);
    });

    testWidgets('8. Double-tap protection: button is disabled while submitting',
        (tester) async {
      setupViewport(tester);
      final mockService = MockReportsService();
      final mockRazorpayService = MockRazorpayCheckoutService();

      await tester.pumpWidget(
        createTestWidget(
          mockService: mockService,
          mockRazorpayService: mockRazorpayService,
          child: ReportDetailScreen(
            reportType: 'KUNDLI',
            title: 'Janma Kundli Report',
            tagline: 'VEDIC BIRTH CHART',
            description: 'Full analysis.',
            priceText: '₹299',
            pricePaise: 29900,
            icon: Icons.auto_awesome,
            accentColor: Colors.amber,
            initialProfile: testProfile1,
            includedSections: const ['Section A'],
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final purchaseButton = find.byKey(const Key('report_purchase_button'));
      await tester.ensureVisible(purchaseButton);

      // Single tap
      await tester.tap(purchaseButton);
      await tester.pump();

      // Immediately tap again before resolution
      await tester.tap(purchaseButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Verify order creation was called exactly ONCE
      expect(mockService.createReportOrderCalls, 1);
      expect(mockRazorpayService.openCheckoutCalls, 1);

      // Cleanly cancel
      mockRazorpayService.triggerCancel();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
    });
  });
}
