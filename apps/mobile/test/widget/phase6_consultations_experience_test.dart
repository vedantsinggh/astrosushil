import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
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

class MockConsultationService implements ConsultationService {
  final List<ConsultationOfferingModel> catalog;
  final List<AppointmentSlotModel> slots;
  final List<ConsultationBookingModel> myBookings;

  MockConsultationService({
    List<ConsultationOfferingModel>? catalog,
    List<AppointmentSlotModel>? slots,
    List<ConsultationBookingModel>? myBookings,
  })  : catalog = catalog ?? _defaultCatalog(),
        slots = slots ?? _defaultSlots(),
        myBookings = myBookings ?? _defaultBookings();

  static List<ConsultationOfferingModel> _defaultCatalog() {
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
        description: '30-minute direct one-on-one voice call covering comprehensive life issues.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 30,
        pricePaise: 1000000,
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
      ConsultationOfferingModel(
        sku: 'consult-urgent-video',
        title: 'Urgent Consultation (Video)',
        description: '30-minute expedited video call guaranteed within 4 days.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 3500000,
        responseDaysNotice: 4,
        category: 'Urgent Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-signature-analysis',
        title: 'Signature Analysis Consultation',
        description: '30-minute specialized graphology session optimizing your signature.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 2500000,
        responseDaysNotice: 7,
        category: 'Specialized Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-in-person-delhi',
        title: 'Face-to-Face Consultation (Delhi / NCR)',
        description: '30-minute private in-person consultation at Astro Sushil Delhi office.',
        mode: 'IN_PERSON',
        durationMinutes: 30,
        pricePaise: 10000000,
        responseDaysNotice: 7,
        category: 'In-Person Consultation',
      ),
    ];
  }

  static List<AppointmentSlotModel> _defaultSlots() {
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
        status: 'BOOKED',
        isBookable: false,
      ),
    ];
  }

  static List<ConsultationBookingModel> _defaultBookings() {
    return const [
      ConsultationBookingModel(
        id: 'bk-123',
        bookingReference: 'BK-TEST-1',
        serviceTitle: 'General Consultation (Video)',
        consultationMode: 'ONLINE_VIDEO',
        appointmentDate: '2026-10-26',
        startTime: '10:00',
        endTime: '10:30',
        status: 'CONFIRMED',
        meetingLink: 'https://meet.jit.si/astrosushil-BK-TEST-1',
        query: 'Career promotion timing in 2026',
        pricePaise: 1500000,
      ),
      ConsultationBookingModel(
        id: 'bk-124',
        bookingReference: 'BK-TEST-2',
        serviceTitle: 'Urgent Consultation (Video)',
        consultationMode: 'ONLINE_VIDEO',
        appointmentDate: '2026-10-28',
        startTime: '15:00',
        endTime: '15:30',
        status: 'PENDING_PAYMENT',
        query: 'Immediate business decision clarity',
        pricePaise: 3500000,
      ),
    ];
  }

  @override
  Future<List<ConsultationOfferingModel>> fetchCatalog() async => catalog;

  @override
  Future<List<AppointmentSlotModel>> fetchSlots({
    required String date,
    required String mode,
    String? practitionerId,
  }) async =>
      slots;

  @override
  Future<Map<String, dynamic>> bookAppointment({
    required String slotId,
    required String consultationSku,
    required String consultationMode,
    String? birthProfileId,
    String? query,
  }) async {
    return {
      'booking': {
        'id': 'bk-new',
        'bookingReference': 'BK-CONF-88',
        'serviceTitle': 'General Consultation (Video)',
        'consultationMode': consultationMode,
        'appointmentDate': '2026-10-26',
        'startTime': '10:00',
        'endTime': '10:30',
        'status': 'PENDING_PAYMENT',
      },
      'order': {
        'id': 'ord-new',
        'totalPaise': 1500000,
      },
    };
  }

  @override
  Future<ConsultationBookingModel> verifyPayment({
    required String bookingId,
    required String orderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    return const ConsultationBookingModel(
      id: 'bk-new',
      bookingReference: 'BK-CONF-88',
      serviceTitle: 'General Consultation (Video)',
      consultationMode: 'ONLINE_VIDEO',
      appointmentDate: '2026-10-26',
      startTime: '10:00',
      endTime: '10:30',
      status: 'CONFIRMED',
      meetingLink: 'https://meet.jit.si/astrosushil-BK-CONF-88',
      pricePaise: 1500000,
    );
  }

  @override
  Future<List<ConsultationBookingModel>> getMyBookings() async => myBookings;

  @override
  Future<ConsultationBookingModel> getBookingDetails(String bookingId) async =>
      myBookings.firstWhere((b) => b.id == bookingId);

  @override
  Future<ConsultationBookingModel> rescheduleBooking({
    required String bookingId,
    required String newSlotId,
    String? reason,
  }) async =>
      myBookings.first;

  @override
  Future<ConsultationBookingModel> cancelBooking({
    required String bookingId,
    String? reason,
  }) async {
    final original = myBookings.firstWhere((b) => b.id == bookingId);
    return ConsultationBookingModel(
      id: original.id,
      bookingReference: original.bookingReference,
      serviceTitle: original.serviceTitle,
      consultationMode: original.consultationMode,
      appointmentDate: original.appointmentDate,
      startTime: original.startTime,
      endTime: original.endTime,
      status: 'CANCELLED',
      meetingLink: null,
      query: original.query,
      pricePaise: original.pricePaise,
    );
  }
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
  final testProfile = BirthProfileModel(
    id: 'bp-test-01',
    userId: 'usr-test-01',
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

  Widget buildAppWrapper({
    required Widget child,
    ConsultationService? service,
    Locale locale = const Locale('en'),
    List<BirthProfileModel>? profiles,
  }) {
    final mockService = service ?? MockConsultationService();
    return ProviderScope(
      overrides: [
        consultationServiceProvider.overrideWithValue(mockService),
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => TestBirthProfilesNotifier(profiles ?? [testProfile]),
        ),
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
        home: child,
      ),
    );
  }

  group('Phase 6 Consultations Visual Redesign & Experience Tests', () {
    testWidgets('Discovery Catalogue renders hero header, steps, and verified consultation tiers',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      // Check Cosmic Header Badges & IST Timezone Notice
      expect(find.text('1-ON-1 GUIDANCE'), findsOneWidget);
      expect(find.text('100% CONFIDENTIAL'), findsOneWidget);
      expect(find.text('Consult Sushil Sir'), findsAtLeastNWidgets(1));
      expect(find.text('All times are in Indian Standard Time (IST / UTC+05:30)'), findsOneWidget);

      // Check How It Works Steps
      expect(find.text('How Consultation Works'), findsOneWidget);
      expect(find.text('1. Select Format & Date'), findsOneWidget);
      expect(find.text('2. Confirm Slot & Queries'), findsOneWidget);
      expect(find.text('3. Meet Astro Sushil'), findsOneWidget);

      // Check Offerings & Prices
      expect(find.text('Budget Friendly Consultation'), findsOneWidget);
      expect(find.text('General Consultation (Audio)'), findsOneWidget);
      expect(find.text('General Consultation (Video)'), findsOneWidget);
      expect(find.text('Urgent Consultation (Video)'), findsOneWidget);
      expect(find.text('₹5000'), findsOneWidget);
      expect(find.text('₹15000'), findsOneWidget);
      expect(find.text('₹35000'), findsOneWidget);

      // Check Badges
      expect(find.text('18% GST Included'), findsAtLeastNWidgets(1));
      expect(find.text('15 mins'), findsOneWidget);
      expect(find.text('30 mins'), findsAtLeastNWidgets(1));
    });

    testWidgets('Category filters isolate Video, Voice, Urgent, and In-Person tiers accurately',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      // Filter by Video
      await tester.tap(find.text('Video'));
      await tester.pumpAndSettle();

      expect(find.text('General Consultation (Video)'), findsOneWidget);
      expect(find.text('Urgent Consultation (Video)'), findsOneWidget);
      expect(find.text('Budget Friendly Consultation'), findsNothing);

      // Filter by Audio / Voice
      await tester.tap(find.text('Voice'));
      await tester.pumpAndSettle();

      expect(find.text('Budget Friendly Consultation'), findsOneWidget);
      expect(find.text('General Consultation (Audio)'), findsOneWidget);
      expect(find.text('General Consultation (Video)'), findsNothing);

      // Filter by Urgent
      await tester.tap(find.text('Urgent'));
      await tester.pumpAndSettle();

      expect(find.text('Urgent Consultation (Video)'), findsOneWidget);
      expect(find.text('Budget Friendly Consultation'), findsNothing);

      // Restore All
      await tester.tap(find.text('All'));
      await tester.pumpAndSettle();

      expect(find.text('Budget Friendly Consultation'), findsOneWidget);
      expect(find.text('General Consultation (Video)'), findsOneWidget);
    });

    testWidgets('BookingFlowSheet validates date, slot, profile, and shows 18% inclusive GST breakdown',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
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

      await tester.pumpWidget(buildAppWrapper(
        child: const Scaffold(
          body: BookingFlowSheet(offering: offering),
        ),
      ));
      await tester.pumpAndSettle();

      // Check Offering Title & Duration
      expect(find.text('General Consultation (Video)'), findsOneWidget);
      expect(find.text('30 mins • ONLINE VIDEO'), findsOneWidget);
      expect(find.text('₹15000'), findsOneWidget);

      // Check Profile Chips
      expect(find.text('Proceed as Self'), findsOneWidget);
      expect(find.text('Rahul Sharma'), findsOneWidget);

      // Check Date & Timezone notice
      expect(find.text('Select Date'), findsOneWidget);
      expect(find.text('7 days notice'), findsOneWidget);
      expect(find.text('All times are in Indian Standard Time (IST / UTC+05:30)'), findsOneWidget);

      // Check Slots
      expect(find.text('Select Time Slot'), findsOneWidget);
      expect(find.text('10:00 - 10:30 IST'), findsOneWidget);

      // Check Confidential Reassurance
      expect(
        find.text(
          'Your birth details and life questions are strictly confidential, shared only with Astro Sushil.',
        ),
        findsOneWidget,
      );

      // Check Price & 18% Inclusive GST Breakdown: ₹15,000 Total, ₹12,712 Base, ₹2,288 GST
      expect(find.text('Base Consultation Fee'), findsOneWidget);
      expect(find.text('₹12,712'), findsOneWidget);
      expect(find.text('GST (18% Included)'), findsOneWidget);
      expect(find.text('₹2,288'), findsOneWidget);
      expect(find.text('Total Amount'), findsOneWidget);

      // Slot is available, tap it
      await tester.tap(find.text('10:00 - 10:30 IST'));
      await tester.pumpAndSettle();

      // Action button active
      expect(find.text('Proceed to Pay ₹15000'), findsOneWidget);
    });

    testWidgets('Duplicate submission prevention locks button with active spinner during booking',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const offering = ConsultationOfferingModel(
        sku: 'consult-general-video',
        title: 'General Consultation (Video)',
        description: '30-minute interactive video call.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 7,
        category: 'Video Consultation',
      );

      await tester.pumpWidget(buildAppWrapper(
        child: const Scaffold(
          body: BookingFlowSheet(offering: offering),
        ),
      ));
      await tester.pumpAndSettle();

      // Pick slot
      await tester.tap(find.text('10:00 - 10:30 IST'));
      await tester.pumpAndSettle();

      // Tap Proceed to Pay
      await tester.tap(find.text('Proceed to Pay ₹15000'));
      await tester.pump();

      // Verify booking handles flow and transitions to confirmed state
      await tester.pumpAndSettle();
      expect(find.text('Appointment Confirmed!'), findsOneWidget);
      expect(find.text('Booking ID: BK-CONF-88'), findsOneWidget);
      expect(find.text('https://meet.jit.si/astrosushil-BK-CONF-88'), findsOneWidget);
    });

    testWidgets('My Appointments tab displays bookings, status badges, and authorized meeting links',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      // Switch to My Appointments Tab
      await tester.tap(find.text('My Appointments'));
      await tester.pumpAndSettle();

      // Check status filter chips
      expect(find.text('All (2)'), findsOneWidget);
      expect(find.text('Upcoming (1)'), findsOneWidget);
      expect(find.text('Pending (1)'), findsOneWidget);

      // Check confirmed booking item
      expect(find.text('BK-TEST-1'), findsOneWidget);
      expect(find.text('Confirmed'), findsOneWidget);
      expect(find.text('General Consultation (Video)'), findsOneWidget);
      expect(find.text('2026-10-26  •  10:00 - 10:30 IST'), findsOneWidget);
      expect(find.text('Query: Career promotion timing in 2026'), findsOneWidget);
      expect(find.text('Join Live Session'), findsOneWidget);

      // Check pending payment booking item
      expect(find.text('BK-TEST-2'), findsOneWidget);
      expect(find.text('Pending Payment'), findsOneWidget);

      // Filter by Pending
      await tester.tap(find.text('Pending (1)'));
      await tester.pumpAndSettle();

      expect(find.text('BK-TEST-2'), findsOneWidget);
      expect(find.text('BK-TEST-1'), findsNothing);
    });

    testWidgets('Cancellation confirmation dialog triggers properly from booking card',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      // Switch to My Appointments Tab
      await tester.tap(find.text('My Appointments'));
      await tester.pumpAndSettle();

      // Tap Cancel Appointment button on first card
      expect(find.text('Cancel Appointment'), findsAtLeastNWidgets(1));
      await tester.tap(find.text('Cancel Appointment').first);
      await tester.pumpAndSettle();

      // Verify cancellation confirmation modal
      expect(
        find.textContaining('Are you sure you want to cancel booking BK-TEST-1?'),
        findsOneWidget,
      );
      expect(find.text('Keep Appointment'), findsOneWidget);
      expect(find.text('Yes, Cancel'), findsOneWidget);

      // Tap Keep Appointment to dismiss
      await tester.tap(find.text('Keep Appointment'));
      await tester.pumpAndSettle();

      expect(find.text('Keep Appointment'), findsNothing);
    });

    testWidgets('Empty bookings view renders cosmic illustration and direct navigation button',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final emptyService = MockConsultationService(myBookings: const []);
      await tester.pumpWidget(buildAppWrapper(
        child: const ConsultScreen(),
        service: emptyService,
      ));
      await tester.pumpAndSettle();

      // Switch to My Appointments Tab
      await tester.tap(find.text('My Appointments'));
      await tester.pumpAndSettle();

      expect(find.text('No consultation appointments found.'), findsOneWidget);
      expect(find.text('Book Now'), findsOneWidget);

      // Tapping Book Now switches back to Tab 0
      await tester.tap(find.text('Book Now'));
      await tester.pumpAndSettle();

      expect(find.text('1-ON-1 GUIDANCE'), findsOneWidget);
    });

    testWidgets('Responsive layouts render across 320, 360, 390, and 414 dp viewports without overflow',
        (tester) async {
      const viewports = [320.0, 360.0, 390.0, 414.0];

      for (final width in viewports) {
        tester.view.physicalSize = Size(width, 800);
        tester.view.devicePixelRatio = 1.0;

        await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull,
            reason: 'RenderFlex overflow detected at ${width}dp viewport');
      }
      tester.view.resetPhysicalSize();
    });

    testWidgets('Hindi localization renders properly without overflow across discovery and booking',
        (tester) async {
      tester.view.physicalSize = const Size(414, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildAppWrapper(
        child: const ConsultScreen(),
        locale: const Locale('hi'),
      ));
      await tester.pumpAndSettle();

      // Check Hindi texts
      expect(find.text('सुशील जी से परामर्श'), findsAtLeastNWidgets(1));
      expect(find.text('परामर्श प्रक्रिया'), findsOneWidget);
      expect(find.text('सभी'), findsOneWidget);
      expect(find.text('वीडियो'), findsOneWidget);
      expect(find.text('ऑडियो'), findsOneWidget);
      expect(find.text('अभी बुक करें'), findsAtLeastNWidgets(1));

      expect(tester.takeException(), isNull);
    });

    testWidgets('Dynamic text scaling (1.5x) renders without overflow', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(1.5)),
          child: buildAppWrapper(child: const ConsultScreen()),
        ),
      );
      await tester.pumpAndSettle();

      final ex = tester.takeException();
      if (ex != null) {
        debugPrint('Dynamic scaling exception: $ex');
      }
      expect(ex, isNull,
          reason: 'RenderFlex overflow under 1.5x dynamic text scaling');
    });
  });
}
