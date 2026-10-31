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

  group('Phase 5 Consultation Screen Widget Tests', () {
    testWidgets('Renders dual tabs and consultation catalog offerings', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      // Check Tabs
      expect(find.text('Book Consultation'), findsOneWidget);
      expect(find.text('My Appointments'), findsOneWidget);

      // Check offerings
      expect(find.text('Budget Friendly Consultation'), findsOneWidget);
      expect(find.text('General Video Consultation'), findsOneWidget);
      expect(find.text('₹5000'), findsOneWidget);
      expect(find.text('₹15000'), findsOneWidget);

      // Check Book Now button
      expect(find.text('Book Now'), findsAtLeastNWidgets(1));
    });

    testWidgets('Switches to My Appointments tab and displays confirmed appointment', (tester) async {
      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pumpAndSettle();

      // Tap on "My Appointments" tab
      await tester.tap(find.text('My Appointments'));
      await tester.pumpAndSettle();

      // Verify confirmed booking details rendered
      expect(find.text('BK-TEST-1'), findsOneWidget);
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
      expect(find.text('परामर्श बुक करें'), findsOneWidget);
      expect(find.text('मेरी नियुक्तियाँ'), findsOneWidget);
      expect(find.text('अभी बुक करें'), findsAtLeastNWidgets(1));
    });
  });
}
