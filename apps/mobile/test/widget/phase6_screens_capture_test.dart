import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import '../helpers/test_artifact_directory.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/home/screens/consult_screen.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/consultations/providers/consultation_provider.dart';
import 'package:astro_mobile/features/consultations/services/consultation_service.dart';
import 'package:astro_mobile/features/consultations/widgets/booking_flow_sheet.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/reports/services/razorpay_checkout_service.dart';
import '../helpers/consultation_fakes.dart';

class _CaptureAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _CaptureAuthNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class MockCaptureConsultationService implements ConsultationService {
  @override
  Future<List<ConsultationOfferingModel>> fetchCatalog() async {
    return const [
      ConsultationOfferingModel(
        sku: 'consult-budget-friendly',
        title: 'Budget Friendly Consultation',
        description: '15-minute voice call session with Astro Sushil answering up to 3 specific questions.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 15,
        pricePaise: 500000,
        responseDaysNotice: 15,
        category: 'Audio Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-general-audio',
        title: 'General Consultation (Audio)',
        description: '30-minute direct one-on-one voice call covering comprehensive life issues and remedies.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 30,
        pricePaise: 1000000,
        responseDaysNotice: 15,
        category: 'Audio Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-general-video',
        title: 'General Consultation (Video)',
        description: '30-minute interactive video call with thorough chart analysis and planetary remedies.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 15,
        category: 'Video Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-urgent-video',
        title: 'Urgent Consultation (Video)',
        description: '30-minute expedited video call guaranteed within 4 days for fast astrological clarity.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 3500000,
        responseDaysNotice: 4,
        category: 'Urgent Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-signature-analysis',
        title: 'Signature Analysis Consultation',
        description: '30-minute specialized graphology session optimizing your signature for wealth.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 2500000,
        responseDaysNotice: 7,
        category: 'Specialized Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-in-person-delhi',
        title: 'Face-to-Face Consultation (Delhi / NCR)',
        description: '30-minute private in-person consultation at Astro Sushil Delhi NCR office.',
        mode: 'IN_PERSON',
        durationMinutes: 30,
        pricePaise: 10000000,
        responseDaysNotice: 7,
        category: 'In-Person Consultation',
      ),
    ];
  }

  @override
  Future<List<AppointmentSlotModel>> fetchSlots({required String consultationId, required String date}) async {
    return const [
      AppointmentSlotModel(
        id: 'slot-1',
        practitionerId: 'p-1',
        practitionerName: 'Astro Sushil',
        date: '2026-10-26',
        startTime: '10:00',
        endTime: '10:30',
        mode: 'ONLINE_VIDEO',
        status: 'AVAILABLE',
        isBookable: true,
      ),
      AppointmentSlotModel(
        id: 'slot-2',
        practitionerId: 'p-1',
        practitionerName: 'Astro Sushil',
        date: '2026-10-26',
        startTime: '11:00',
        endTime: '11:30',
        mode: 'ONLINE_VIDEO',
        status: 'AVAILABLE',
        isBookable: true,
      ),
      AppointmentSlotModel(
        id: 'slot-3',
        practitionerId: 'p-1',
        practitionerName: 'Astro Sushil',
        date: '2026-10-26',
        startTime: '15:00',
        endTime: '15:30',
        mode: 'ONLINE_VIDEO',
        status: 'BOOKED',
        isBookable: false,
      ),
    ];
  }

  @override
  Future<ConsultationReservation> bookAppointment({
    required String consultationId,
    required String mode,
    required String date,
    required String startTime,
    required String endTime,
    String? birthProfileId,
    String? notes,
  }) async =>
      fakeConsultationReservation(
        consultationId: consultationId,
        mode: mode,
        date: date,
        startTime: startTime,
        endTime: endTime,
        catalog: await fetchCatalog(),
      );

  @override
  Future<ConsultationBookingModel> verifyPayment({
    required String bookingId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    return const ConsultationBookingModel(
      id: 'bk-cap-01',
      bookingReference: 'BK-CONF-779',
      serviceTitle: 'General Consultation (Video)',
      consultationMode: 'ONLINE_VIDEO',
      appointmentDate: '2026-10-26',
      startTime: '10:00',
      endTime: '10:30',
      status: 'CONFIRMED',
      meetingLink: 'https://meet.jit.si/astrosushil-BK-CONF-779',
      pricePaise: 1500000,
    );
  }

  @override
  Future<List<ConsultationBookingModel>> getMyBookings() async {
    return const [
      ConsultationBookingModel(
        id: 'bk-cap-01',
        bookingReference: 'BK-CONF-779',
        serviceTitle: 'General Consultation (Video)',
        consultationMode: 'ONLINE_VIDEO',
        appointmentDate: '2026-10-26',
        startTime: '10:00',
        endTime: '10:30',
        status: 'CONFIRMED',
        meetingLink: 'https://meet.jit.si/astrosushil-BK-CONF-779',
        query: 'Career promotion roadmap and remedial gemstones for Jupiter period',
        pricePaise: 1500000,
      ),
      ConsultationBookingModel(
        id: 'bk-cap-02',
        bookingReference: 'BK-PEND-412',
        serviceTitle: 'Urgent Consultation (Video)',
        consultationMode: 'ONLINE_VIDEO',
        appointmentDate: '2026-10-28',
        startTime: '16:00',
        endTime: '16:30',
        status: 'PENDING_PAYMENT',
        query: 'Immediate business partnership evaluation',
        pricePaise: 3500000,
      ),
    ];
  }

  @override
  Future<List<String>> fetchBlockedDates({required int month, required int year}) async => const [];

  @override
  Future<ConsultationInvoiceModel> getBookingInvoice(String bookingId) async => throw UnimplementedError();

  @override
  Future<ConsultationBookingModel> getBookingDetails(String bookingId) async =>
      (await getMyBookings()).first;

  @override
  Future<ConsultationBookingModel> rescheduleBooking({
    required String bookingId,
    required String newDate,
    required String newStartTime,
    required String newEndTime,
    String? reason,
  }) async =>
      (await getMyBookings()).first;

  @override
  Future<ConsultationBookingModel> cancelBooking({
    required String bookingId,
    String? reason,
  }) async =>
      (await getMyBookings()).first;
}

class TestBirthProfilesNotifier extends StateNotifier<BirthProfilesState>
    implements BirthProfilesNotifier {
  TestBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  Future<void> fetchProfiles() async {}

  @override
  Future<BirthProfileModel?> createProfile(dynamic dto) async => null;

  @override
  Future<BirthProfileModel?> migrateGuestProfile(dynamic dto) async => null;
}

void main() {
  final outDir = createTestArtifactDirectory('mobile-phase-6-capture');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  final testProfile = BirthProfileModel(
    id: 'bp-cap-01',
    userId: 'usr-cap-01',
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

  Widget buildCaptureWidget({
    required GlobalKey boundaryKey,
    required Widget child,
    Locale locale = const Locale('en'),
  }) {
    final mockService = MockCaptureConsultationService();
    return ProviderScope(
      overrides: [
        consultationServiceProvider.overrideWithValue(mockService),
        razorpayCheckoutServiceProvider.overrideWithValue(FakeRazorpayCheckoutService(autoSucceed: true)),
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => TestBirthProfilesNotifier([testProfile]),
        ),
        authStateProvider.overrideWith((ref) => _CaptureAuthNotifier(AuthState.authenticated(UserModel(
              id: 'usr-cap',
              email: 'seeker@astrosushil.com',
              role: 'USER',
              createdAt: DateTime(2026, 1, 1),
            )))),
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

  group('Phase 6 Consultations Screens Capture Suite', () {
    testWidgets('Capture 01_consultations_discovery_catalog', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const ConsultScreen(),
      ));
      await tester.pumpAndSettle();

      // Opens on My bookings (upcoming booking); the catalogue is the other tab.
      await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text('Book a session')));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '01_consultations_discovery_catalog.png');
    });

    testWidgets('Capture 02_consultations_filter_video', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const ConsultScreen(),
      ));
      await tester.pumpAndSettle();

      // Opens on My bookings (upcoming booking); the catalogue is the other tab.
      await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text('Book a session')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('consult_filter_VIDEO')));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '02_consultations_filter_video.png');
    });

    testWidgets('Capture 03_consultations_filter_phone', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const ConsultScreen(),
      ));
      await tester.pumpAndSettle();

      // Opens on My bookings (upcoming booking); the catalogue is the other tab.
      await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text('Book a session')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('consult_filter_AUDIO')));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '03_consultations_filter_phone.png');
    });

    testWidgets('Capture 04_consultations_booking_flow_sheet', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      const offering = ConsultationOfferingModel(
        sku: 'consult-general-video',
        title: 'General Consultation (Video)',
        description: '30-minute interactive video call with thorough chart analysis and solutions.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 7,
        category: 'Video Consultation',
      );

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const Scaffold(
          body: BookingFlowSheet(offering: offering),
        ),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '04_consultations_booking_flow_sheet.png');
    });

    testWidgets('Capture 05_consultations_booking_confirmed', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      const offering = ConsultationOfferingModel(
        sku: 'consult-general-video',
        title: 'General Consultation (Video)',
        description: '30-minute interactive video call with thorough chart analysis.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 7,
        category: 'Video Consultation',
      );

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const Scaffold(
          body: BookingFlowSheet(offering: offering),
        ),
      ));
      await tester.pumpAndSettle();

      // Tap slot, step through details to review, and confirm
      await tester.tap(find.text('10:00 - 10:30 IST'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('booking_next')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('booking_next')));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.byKey(const ValueKey('booking_pay')));
      await tester.pumpAndSettle();

      // The fake gateway answers with a successful payment at once.
      await tester.tap(find.byKey(const ValueKey('booking_pay')));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '05_consultations_booking_confirmed.png');
    });

    testWidgets('Capture 06_consultations_my_appointments', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const ConsultScreen(),
      ));
      await tester.pumpAndSettle();

      // My bookings is its own tab (and the default with an upcoming booking).
      await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text('My bookings')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('consult_upcoming_group')), findsOneWidget);

      await captureToFile(tester, boundaryKey, '06_consultations_my_appointments.png');
    });

    testWidgets('Capture 07_consultations_hindi_discovery', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        locale: const Locale('hi'),
        child: const ConsultScreen(),
      ));
      await tester.pumpAndSettle();
      await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text('मुलाकात बुक करें')));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '07_consultations_hindi_discovery.png');
    });

    testWidgets('Capture 08_consultations_hindi_booking', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      const offering = ConsultationOfferingModel(
        sku: 'consult-general-video',
        title: 'सामान्य वीडियो परामर्श',
        description: 'एस्ट्रो सुशील जी के साथ 30 मिनट का गहन कुंडली विश्लेषण सत्र।',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 7,
        category: 'Video Consultation',
      );

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        locale: const Locale('hi'),
        child: const Scaffold(
          body: BookingFlowSheet(offering: offering),
        ),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '08_consultations_hindi_booking.png');
    });
  });
}
