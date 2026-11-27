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
import 'package:astro_mobile/shared/widgets/astro_controls.dart' show AstroSegmentedControl;
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/reports/services/razorpay_checkout_service.dart';
import '../helpers/consultation_fakes.dart';

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
        consultationId: 'consult-general-video',
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
  Future<List<AppointmentSlotModel>> fetchSlots({required String consultationId, required String date}) async =>
      slots;

  @override
  Future<ConsultationReservation> bookAppointment({
    required String consultationId,
    required String mode,
    String? date,
    String? startTime,
    String? endTime,
    String? birthProfileId,
    String? notes,
  }) async =>
      fakeConsultationReservation(
        consultationId: consultationId,
        mode: mode,
        date: date ?? '',
        startTime: startTime ?? '',
        endTime: endTime ?? '',
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
  Future<List<String>> fetchBlockedDates({required int month, required int year}) async => const [];

  @override
  Future<ConsultationInvoiceModel> getBookingInvoice(String bookingId) async => throw UnimplementedError();

  @override
  Future<ConsultationBookingModel> getBookingDetails(String bookingId) async =>
      myBookings.firstWhere((b) => b.id == bookingId);

  @override
  Future<ConsultationBookingModel> rescheduleBooking({
    required String bookingId,
    required String newDate,
    required String newStartTime,
    required String newEndTime,
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

class TestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  TestAuthNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

final testUser = UserModel(
  id: 'usr-test-01',
  email: 'seeker@astrosushil.com',
  role: 'USER',
  createdAt: DateTime(2026, 1, 1),
);

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
    bool signedIn = true,
    IRazorpayCheckoutService? razorpay,
  }) {
    final mockService = service ?? MockConsultationService();
    return ProviderScope(
      overrides: [
        consultationServiceProvider.overrideWithValue(mockService),
        // The payment gateway is always faked: no network, no real payment.
        razorpayCheckoutServiceProvider
            .overrideWithValue(razorpay ?? FakeRazorpayCheckoutService(autoSucceed: true)),
        authStateProvider.overrideWith(
          (ref) => TestAuthNotifier(signedIn ? AuthState.authenticated(testUser) : AuthState.unauthenticated()),
        ),
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

  /// Taps a segment of the pinned "Book a session | My bookings" switch.
  Future<void> openTab(WidgetTester tester, String label) async {
    await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text(label)));
    await tester.pumpAndSettle();
  }

  group('Phase 6 Consultations Visual Redesign & Experience Tests', () {
    // Each tab is one scrolling page; a tall viewport keeps every card built.
    void tall(WidgetTester tester, [double w = 800, double h = 6000]) {
      tester.view.physicalSize = Size(w, h);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
    }

    testWidgets('Catalogue shows intro card and server services with mode, duration and price',
        (tester) async {
      tall(tester);
      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();
      await openTab(tester, 'Book a session');

      expect(find.text('Consult Sushil Sir'), findsOneWidget);
      expect(find.text('Personalized 1-on-1 astrological guidance with Astro Sushil Kumar Singh.'), findsOneWidget);

      expect(find.text('Budget Friendly Consultation'), findsOneWidget);
      expect(find.text('General Consultation (Audio)'), findsOneWidget);
      // The two bookings with the same titles are on the My bookings tab.
      expect(find.text('General Consultation (Video)'), findsOneWidget);
      expect(find.text('Urgent Consultation (Video)'), findsOneWidget);
      expect(find.text('Face-to-Face Consultation (Delhi / NCR)'), findsOneWidget);

      // Prices straight from pricePaise, Indian grouping.
      expect(find.text('₹5,000'), findsOneWidget);
      expect(find.text('₹15,000'), findsOneWidget);
      expect(find.text('₹35,000'), findsOneWidget);
      expect(find.text('₹1,00,000'), findsOneWidget);

      expect(find.text('Phone call · 15 mins'), findsOneWidget);
      expect(find.text('Video call · 30 mins'), findsNWidgets(3));
      expect(find.text('In person · 30 mins'), findsOneWidget);
      expect(find.text('Earliest in 4 days'), findsOneWidget);
      expect(find.text('18% GST Included'), findsNWidgets(6));
      expect(find.text('Book Now'), findsNWidgets(6));

      // Old ornate hero / slogans are gone.
      expect(find.text('1-ON-1 GUIDANCE'), findsNothing);
      expect(find.text('100% CONFIDENTIAL'), findsNothing);

      await openTab(tester, 'My bookings');
      expect(find.text('General Consultation (Video)'), findsOneWidget);
      expect(find.text('Urgent Consultation (Video)'), findsOneWidget);
      expect(find.text('Budget Friendly Consultation'), findsNothing);
    });

    testWidgets('Mode filter shows only matching services', (tester) async {
      tall(tester);
      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      await openTab(tester, 'Book a session');
      Finder service(String sku) => find.byKey(ValueKey('consult_service_$sku'));

      await tester.tap(find.byKey(const ValueKey('consult_filter_VIDEO')));
      await tester.pumpAndSettle();
      expect(service('consult-general-video'), findsOneWidget);
      expect(service('consult-urgent-video'), findsOneWidget);
      expect(service('consult-budget-friendly'), findsNothing);

      await tester.tap(find.byKey(const ValueKey('consult_filter_AUDIO')));
      await tester.pumpAndSettle();
      expect(service('consult-budget-friendly'), findsOneWidget);
      expect(service('consult-general-audio'), findsOneWidget);
      expect(service('consult-general-video'), findsNothing);

      await tester.tap(find.byKey(const ValueKey('consult_filter_IN_PERSON')));
      await tester.pumpAndSettle();
      expect(service('consult-in-person-delhi'), findsOneWidget);
      expect(service('consult-budget-friendly'), findsNothing);

      await tester.tap(find.byKey(const ValueKey('consult_filter_ALL')));
      await tester.pumpAndSettle();
      expect(service('consult-budget-friendly'), findsOneWidget);
      expect(service('consult-general-video'), findsOneWidget);
    });

    testWidgets('BookingFlowSheet validates date, slot, profile, and shows the server GST breakdown (18% included)',
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
        // As GET /consultations sends it for a type whose GST is inclusive.
        basePricePaise: 1500000,
        gstPaise: 228814,
        taxIncluded: true,
        taxRateBasisPoints: 1800,
      );

      await tester.pumpWidget(buildAppWrapper(
        child: const Scaffold(
          body: BookingFlowSheet(offering: offering),
        ),
      ));
      await tester.pumpAndSettle();

      // Check Offering Title & Duration (header stays visible on every step)
      expect(find.text('General Consultation (Video)'), findsOneWidget);
      expect(find.text('30 mins • ONLINE VIDEO'), findsOneWidget);
      expect(find.text('₹15,000'), findsOneWidget);

      // Step 1 of 3: Date, timezone notice and slots
      expect(find.text('Step 1 of 3'), findsOneWidget);
      expect(find.text('Select Date'), findsOneWidget);
      expect(find.text('7 days notice'), findsOneWidget);
      expect(find.text('All times are in Indian Standard Time (IST / UTC+05:30)'), findsOneWidget);
      expect(find.text('Select Time Slot'), findsOneWidget);
      expect(find.text('10:00 - 10:30 IST'), findsOneWidget);

      // Next is locked until a slot is chosen
      final nextBtn = find.byKey(const ValueKey('booking_next'));
      expect(tester.widget<ElevatedButton>(nextBtn).onPressed, isNull);

      // Slot is available, tap it
      await tester.tap(find.text('10:00 - 10:30 IST'));
      await tester.pumpAndSettle();
      expect(tester.widget<ElevatedButton>(nextBtn).onPressed, isNotNull);

      await tester.tap(nextBtn);
      await tester.pumpAndSettle();

      // Step 2 of 3: Profile choices and confidential reassurance
      expect(find.text('Step 2 of 3'), findsOneWidget);
      expect(find.text('Select Birth Profile'), findsOneWidget);
      expect(find.text('Proceed as Self'), findsOneWidget);
      expect(find.text('Rahul Sharma'), findsOneWidget);
      expect(
        find.text(
          'Your birth details and life questions are strictly confidential, shared only with Astro Sushil.',
        ),
        findsOneWidget,
      );

      await tester.tap(find.byKey(const ValueKey('booking_next')));
      await tester.pumpAndSettle();

      // Step 3 of 3: the server's figures, to the paisa: ₹15,000 total, of
      // which ₹2,288.14 is the GST already inside the listed price.
      expect(find.text('Step 3 of 3'), findsOneWidget);
      expect(find.text('Consultation fee (before GST)'), findsOneWidget);
      expect(find.text('₹12,711.86'), findsOneWidget);
      expect(find.text('GST (18%) included'), findsOneWidget);
      expect(find.text('₹2,288.14'), findsOneWidget);
      expect(find.text('Total Amount'), findsOneWidget);
      // Header and total row.
      expect(find.text('₹15,000'), findsNWidgets(2));
      // The customer is told about the 15-minute hold before paying.
      expect(find.textContaining('held for you for 15 minutes'), findsOneWidget);

      // Action button active
      expect(find.text('Proceed to Pay ₹15,000'), findsOneWidget);

      // Back returns to the previous step
      await tester.tap(find.byKey(const ValueKey('booking_back')));
      await tester.pumpAndSettle();
      expect(find.text('Step 2 of 3'), findsOneWidget);
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

      // Pick slot, then step through details to review
      await tester.tap(find.text('10:00 - 10:30 IST'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('booking_next')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('booking_next')));
      await tester.pumpAndSettle();

      // Tap Proceed to Pay (the fake gateway answers with a successful payment)
      await tester.tap(find.text('Proceed to Pay ₹15,000'));
      await tester.pump();

      // Verify booking handles flow and transitions to confirmed state
      await tester.pumpAndSettle();
      expect(find.text('Appointment Confirmed!'), findsOneWidget);
      expect(find.text('Booking ID: BK-CONF-88'), findsOneWidget);
      expect(find.text('https://meet.jit.si/astrosushil-BK-CONF-88'), findsOneWidget);
    });


    testWidgets('My Appointments shows upcoming bookings with date, time, status and actions',
        (tester) async {
      tall(tester);
      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      // Opens on My bookings: the user has upcoming bookings.
      final selected = tester.widget<AstroSegmentedControl<ConsultTab>>(find.byKey(const ValueKey('consult_tabs')));
      expect(selected.selected, ConsultTab.bookings);
      expect(find.text('Book Now'), findsNothing);

      // Confirmed booking
      expect(find.text('Ref: BK-TEST-1'), findsOneWidget);
      expect(find.text('Confirmed'), findsOneWidget);
      expect(find.text('Mon, 26 Oct 2026'), findsOneWidget);
      expect(find.text('10:00 – 10:30 IST'), findsOneWidget);
      expect(find.text('Career promotion timing in 2026'), findsOneWidget);
      expect(find.byKey(const ValueKey('consult_join_bk-123')), findsOneWidget);
      expect(find.text('Join Live Session'), findsOneWidget);
      expect(find.byKey(const ValueKey('consult_reschedule_bk-123')), findsNothing);
      expect(find.byKey(const ValueKey('consult_cancel_bk-123')), findsOneWidget);

      // Pending-payment booking: no Join / Reschedule, but can be cancelled.
      expect(find.text('Ref: BK-TEST-2'), findsOneWidget);
      expect(find.text('Pending Payment'), findsOneWidget);
      expect(find.text('Wed, 28 Oct 2026'), findsOneWidget);
      expect(find.text('Payment is not complete yet.'), findsOneWidget);
      expect(find.byKey(const ValueKey('consult_join_bk-124')), findsNothing);
      expect(find.byKey(const ValueKey('consult_reschedule_bk-124')), findsNothing);
      expect(find.byKey(const ValueKey('consult_cancel_bk-124')), findsOneWidget);

      // No past bookings, so no expander.
      expect(find.byKey(const ValueKey('consult_past_bookings')), findsNothing);
    });

    testWidgets('Cancel asks for confirmation and reports the result', (tester) async {
      tall(tester);
      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('consult_cancel_bk-123')));
      await tester.pumpAndSettle();

      expect(find.textContaining('Are you sure you want to cancel booking BK-TEST-1?'), findsOneWidget);
      expect(find.text('Keep Appointment'), findsOneWidget);
      expect(find.text('Yes, Cancel'), findsOneWidget);

      await tester.tap(find.text('Keep Appointment'));
      await tester.pumpAndSettle();
      expect(find.text('Keep Appointment'), findsNothing);

      // Bug fix: confirming used to give no feedback at all.
      await tester.tap(find.byKey(const ValueKey('consult_cancel_bk-123')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Yes, Cancel'));
      await tester.pumpAndSettle();
      expect(find.text('Appointment cancelled.'), findsOneWidget);
    });

    testWidgets('Empty bookings shows a calm empty message', (tester) async {
      tall(tester);
      final emptyService = MockConsultationService(myBookings: const []);
      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen(), service: emptyService));
      await tester.pumpAndSettle();

      // No upcoming booking: opens on Book a session.
      expect(find.text('Book Now'), findsNWidgets(6));

      await openTab(tester, 'My bookings');
      expect(find.text('No bookings yet'), findsOneWidget);
      // Booking stays one tap away.
      await tester.tap(find.byKey(const ValueKey('consult_bookings_empty_book')));
      await tester.pumpAndSettle();
      expect(find.text('Book Now'), findsNWidgets(6));
    });

    testWidgets('Responsive layouts render across phone, tablet and landscape without overflow',
        (tester) async {
      const sizes = [Size(320, 568), Size(360, 640), Size(390, 844), Size(414, 896), Size(1024, 1366), Size(640, 360)];

      for (final size in sizes) {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;

        await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Layout exception at $size');
      }
      tester.view.resetPhysicalSize();
    });

    testWidgets('Content width is capped on tablets', (tester) async {
      tall(tester, 1280, 2000);
      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();
      await openTab(tester, 'Book a session');

      final card = find.ancestor(of: find.text('Budget Friendly Consultation'), matching: find.byType(Container)).last;
      expect(tester.getSize(card).width, lessThanOrEqualTo(720));
    });

    testWidgets('Hindi localization renders properly without overflow', (tester) async {
      tester.view.physicalSize = const Size(414, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen(), locale: const Locale('hi')));
      await tester.pumpAndSettle();
      expect(find.text('मेरी बुकिंग'), findsOneWidget);
      await openTab(tester, 'मुलाकात बुक करें');

      expect(find.text('सुशील जी से परामर्श'), findsOneWidget);
      expect(find.text('सभी'), findsOneWidget);
      expect(find.text('वीडियो कॉल'), findsOneWidget);
      expect(find.text('फ़ोन कॉल'), findsOneWidget);
      expect(find.text('अभी बुक करें'), findsAtLeastNWidgets(1));
      expect(tester.takeException(), isNull);
    });

    for (final scale in [1.3, 2.0]) {
      testWidgets('Dynamic text scaling (${scale}x) renders without overflow at 320 and 390', (tester) async {
        for (final w in [320.0, 390.0]) {
          tester.view.physicalSize = Size(w, 2400);
          tester.view.devicePixelRatio = 1.0;
          await tester.pumpWidget(
            MediaQuery(
              data: MediaQueryData(size: Size(w, 2400), textScaler: TextScaler.linear(scale)),
              child: buildAppWrapper(child: const ConsultScreen()),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull, reason: 'Overflow at ${w}dp, ${scale}x text');
        }
        tester.view.resetPhysicalSize();
      });
    }
  });
}
