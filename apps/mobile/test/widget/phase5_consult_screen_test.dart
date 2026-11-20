import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/home/screens/consult_screen.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/consultations/providers/consultation_provider.dart';
import 'package:astro_mobile/features/consultations/services/consultation_service.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart' show AuthNotifier, AuthState, authStateProvider;

class MockConsultationService implements ConsultationService {
  @override
  Future<List<ConsultationOfferingModel>> fetchCatalog() async {
    return const [
      ConsultationOfferingModel(
        sku: 'consult-budget-friendly',
        title: 'Budget Friendly Consultation',
        description: '15-minute voice session with Astro Sushil Kumar Singh',
        mode: 'ONLINE_VOICE',
        durationMinutes: 15,
        pricePaise: 500000,
        responseDaysNotice: 15,
        category: 'Audio Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-general-video',
        title: 'General Video Consultation',
        description: '30-minute interactive video session',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 15,
        category: 'Video Consultation',
      ),
    ];
  }

  @override
  Future<List<AppointmentSlotModel>> fetchSlots({
    required String date,
    required String mode,
    String? practitionerId,
  }) async {
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
    ];
  }

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
        'id': 'bk-123',
        'bookingReference': 'BK-TEST-1',
        'serviceTitle': 'General Video Consultation',
        'consultationMode': consultationMode,
        'appointmentDate': '2026-10-26',
        'startTime': '10:00',
        'endTime': '10:30',
        'status': 'PENDING_PAYMENT',
      },
      'order': {
        'id': 'ord-123',
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
      id: 'bk-123',
      bookingReference: 'BK-TEST-1',
      serviceTitle: 'General Video Consultation',
      consultationMode: 'ONLINE_VIDEO',
      appointmentDate: '2026-10-26',
      startTime: '10:00',
      endTime: '10:30',
      status: 'CONFIRMED',
      meetingLink: 'https://meet.jit.si/astrosushil-BK-TEST-1',
    );
  }

  @override
  Future<List<ConsultationBookingModel>> getMyBookings() async {
    return const [
      ConsultationBookingModel(
        id: 'bk-123',
        bookingReference: 'BK-TEST-1',
        serviceTitle: 'General Video Consultation',
        consultationMode: 'ONLINE_VIDEO',
        appointmentDate: '2026-10-26',
        startTime: '10:00',
        endTime: '10:30',
        status: 'CONFIRMED',
        meetingLink: 'https://meet.jit.si/astrosushil-BK-TEST-1',
        pricePaise: 1500000,
      ),
    ];
  }

  @override
  Future<ConsultationBookingModel> getBookingDetails(String bookingId) async {
    return (await getMyBookings()).first;
  }

  @override
  Future<ConsultationBookingModel> rescheduleBooking({
    required String bookingId,
    required String newSlotId,
    String? reason,
  }) async {
    return (await getMyBookings()).first;
  }

  @override
  Future<ConsultationBookingModel> cancelBooking({
    required String bookingId,
    String? reason,
  }) async {
    return const ConsultationBookingModel(
      id: 'bk-123',
      bookingReference: 'BK-TEST-1',
      serviceTitle: 'General Video Consultation',
      consultationMode: 'ONLINE_VIDEO',
      appointmentDate: '2026-10-26',
      startTime: '10:00',
      endTime: '10:30',
      status: 'CANCELLED',
    );
  }
}

class TestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  TestAuthNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class TestCustomLocaleNotifier extends LocaleNotifier {
  TestCustomLocaleNotifier(super.storage, Locale initialLocale) {
    state = initialLocale;
  }
}

class TestBirthProfilesNotifier extends StateNotifier<BirthProfilesState>
    implements BirthProfilesNotifier {
  TestBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  Future<void> fetchProfiles() async {}

  @override
  Future<BirthProfileModel?> createProfile(CreateBirthProfileDto dto) async => null;

  @override
  Future<BirthProfileModel?> migrateGuestProfile(CreateBirthProfileDto dto) async => null;
}

void main() {
  Widget buildAppWrapper({
    required Widget child,
    Locale locale = const Locale('en'),
  }) {
    final storage = InMemorySecureStorageService();
    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        consultationServiceProvider.overrideWithValue(MockConsultationService()),
        localeProvider.overrideWith((ref) => TestCustomLocaleNotifier(storage, locale)),
        birthProfilesListNotifierProvider.overrideWith((ref) => TestBirthProfilesNotifier([])),
        authStateProvider.overrideWith((ref) => TestAuthNotifier(AuthState.authenticated(UserModel(
              id: 'usr-1',
              email: 'seeker@astrosushil.com',
              role: 'USER',
              createdAt: DateTime(2026, 1, 1),
            )))),
      ],
      child: MaterialApp(
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

  Future<void> openTab(WidgetTester tester, String label) async {
    await tester.tap(find.descendant(of: find.byKey(const ValueKey('consult_tabs')), matching: find.text(label)));
    await tester.pumpAndSettle();
  }

  group('Phase 5 Consultation Screen Widget Tests', () {
    testWidgets('Renders services and bookings sections with catalogue offerings', (tester) async {
      tester.view.physicalSize = const Size(800, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      // Two tabs pinned under the title: Book a session / My bookings
      expect(find.text('Book a session'), findsOneWidget);
      expect(find.text('My bookings'), findsOneWidget);
      await openTab(tester, 'Book a session');

      // Check offerings
      expect(find.text('Budget Friendly Consultation'), findsOneWidget);
      expect(find.byKey(const ValueKey('consult_service_consult-general-video')), findsOneWidget);
      expect(find.text('₹5,000'), findsOneWidget);
      expect(find.text('₹15,000'), findsOneWidget);

      // Check Book Now button
      expect(find.text('Book Now'), findsNWidgets(2));
    });

    testWidgets('Shows confirmed appointment with Join and Cancel', (tester) async {
      tester.view.physicalSize = const Size(800, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Ref: BK-TEST-1'), findsOneWidget);
      expect(find.text('Confirmed'), findsOneWidget);
      expect(find.text('Join Live Session'), findsOneWidget);
      expect(find.text('Cancel Appointment'), findsOneWidget);
    });

    testWidgets('Renders Hindi localization properly for consultations', (tester) async {
      await tester.pumpWidget(buildAppWrapper(
        locale: const Locale('hi'),
        child: const ConsultScreen(),
      ));
      await tester.pumpAndSettle();

      // Check Hindi tab labels
      expect(find.text('मुलाकात बुक करें'), findsOneWidget);
      expect(find.text('मेरी बुकिंग'), findsOneWidget);
      await openTab(tester, 'मुलाकात बुक करें');
      expect(find.text('अभी बुक करें'), findsAtLeastNWidgets(1));
    });
  });
}
