import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/home/screens/home_screen.dart';
import 'package:astro_mobile/home/screens/consult_screen.dart';
import 'package:astro_mobile/home/screens/profile_screen.dart';
import 'package:astro_mobile/home/screens/reports_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/data/auth_repository.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/home/widgets/home_greeting.dart';
import 'package:astro_mobile/home/widgets/home_today_cards.dart';
import 'package:astro_mobile/home/widgets/home_bottom_navigation.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/features/consultations/providers/consultation_provider.dart';
import 'package:astro_mobile/features/consultations/services/consultation_service.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

void main() {
  final testUser = UserModel(
    id: 'usr_test_123',
    email: 'seeker@astrosushil.com',
    role: 'USER',
    createdAt: DateTime(2026, 1, 1),
  );

  final testBirthProfile = BirthProfileModel(
    id: 'bp_123',
    userId: 'usr_test_123',
    name: 'Cosmic Traveler',
    dateOfBirth: '1995-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  Widget buildTestWidget({
    required AuthState authState,
    List<BirthProfileModel> profiles = const [],
  }) {
    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        authStateProvider.overrideWith((ref) => TestAuthNotifier(authState)),
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => TestBirthProfilesNotifier(profiles),
        ),
        userReportsProvider.overrideWith((ref) => Future.value([])),
        consultationServiceProvider.overrideWithValue(_MockHomeScreenConsultationService()),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: const HomeScreen(),
      ),
    );
  }

  group('HomeScreen Widget Tests', () {
    testWidgets('Renders brand bar and a short greeting for authenticated user', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Astro Sushil'), findsOneWidget);
      expect(find.text('Namaste, seeker'), findsOneWidget);
      // No marketing slogan on the home screen.
      expect(find.textContaining('Vedic guidance'), findsNothing);
    });

    testWidgets('Highlight card asks first-time user without birth profile to add details', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [],
      ));
      await tester.pumpAndSettle();

      final card = find.byType(HomeHoroscopeCard);
      expect(card, findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('Add your birth details')), findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('Create Profile')), findsOneWidget);
      // No profile selector when there is no profile.
      expect(find.byType(HomeGreeting), findsOneWidget);
      expect(find.text('Change'), findsNothing);
    });

    testWidgets('Shows active birth profile with a Change action and today\'s horoscope card', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [testBirthProfile],
      ));
      await tester.pumpAndSettle();

      expect(find.descendant(of: find.byType(HomeGreeting), matching: find.text('Cosmic Traveler')), findsOneWidget);
      expect(find.descendant(of: find.byType(HomeGreeting), matching: find.text('Change')), findsOneWidget);
      expect(find.descendant(of: find.byType(HomeHoroscopeCard), matching: find.text("Today's Horoscope")), findsOneWidget);

      // Tapping the profile row opens the profile switcher.
      await tester.tap(find.text('Cosmic Traveler'));
      await tester.pumpAndSettle();
      expect(find.text('Switch Profile'), findsOneWidget);
    });

    testWidgets('Renders Astrology and Services sections with short tile labels', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Astrology'), findsOneWidget);
      expect(find.text('Services'), findsOneWidget);
      for (final label in [
        'Kundli', 'Horoscope', 'Panchang', 'Matching', 'Planets', 'Dasha',
        'Ask Jyoti', 'Explain Chart', 'Courses', 'Gupta Nadi', 'Shop',
        'All Vedic Astrology Tools',
      ]) {
        expect(find.text(label), findsOneWidget, reason: '$label tile missing');
      }
    });

    testWidgets('Every home destination is present, labelled and tappable', (WidgetTester tester) async {
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [testBirthProfile],
      ));
      await tester.pumpAndSettle();

      const destinations = <String, String>{
        'kundli': 'Kundli',
        'horoscope': 'Horoscope',
        'panchang': 'Panchang',
        'matching': 'Matching',
        'planets': 'Planets',
        'dasha': 'Dasha',
        'all-tools': 'All Vedic Astrology Tools',
        'ask-jyoti': 'Ask Jyoti',
        'explain-chart': 'Explain Chart',
        'consult': 'Consult',
        'reports': 'Reports',
        'courses': 'Courses',
        'gupta-nadi': 'Gupta Nadi',
        'shop': 'Shop',
      };

      for (final entry in destinations.entries) {
        final tile = find.byKey(ValueKey('home-service-${entry.key}'));
        expect(tile, findsOneWidget, reason: '${entry.key} tile missing');
        await tester.ensureVisible(tile);
        await tester.pumpAndSettle();
        expect(tile.hitTestable(), findsOneWidget, reason: '${entry.key} tile is not tappable');
        expect(
          tester.getSemantics(tile),
          matchesSemantics(label: entry.value, isButton: true, hasTapAction: true),
        );
        final size = tester.getSize(tile);
        expect(size.height, greaterThanOrEqualTo(48));
        expect(size.width, greaterThanOrEqualTo(48));
      }

      // Header destinations: notifications, language and account.
      expect(find.bySemanticsLabel('Notifications and daily alerts'), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('^Switch language')), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('^View Account and Profile')), findsOneWidget);

      // Tiles that switch tabs actually switch them.
      await tester.ensureVisible(find.byKey(const ValueKey('home-service-reports')));
      await tester.tap(find.byKey(const ValueKey('home-service-reports')));
      await tester.pumpAndSettle();
      // The Reports tab is now the visible tab (its copy is owned by that screen).
      expect(find.byType(ReportsScreen), findsOneWidget);

      semantics.dispose();
    });

    testWidgets('Renders Today\'s horoscope highlight without invented text', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [testBirthProfile],
      ));
      await tester.pumpAndSettle();

      expect(find.text("Today's Horoscope"), findsOneWidget);
      // No hard-coded "Aries"/Mesha preview: without a genuine chart+prediction
      // the card shows an explicit status instead of invented horoscope text.
      expect(find.text('Aries'), findsNothing);
      expect(find.textContaining('favorable period'), findsNothing);
    });

    testWidgets('Bottom Navigation allows switching between Home, Reports, Consult, and Account tabs', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      // Initially on Home tab (Index 0)
      expect(find.text('Namaste, seeker'), findsOneWidget);

      // Tap Reports tab (Index 1). Inactive tabs stay offstage in the
      // IndexedStack, so the default finder only sees the visible tab.
      await tester.tap(find.descendant(of: find.byType(HomeBottomNavigation), matching: find.text('Reports')));
      await tester.pumpAndSettle();
      expect(find.byType(ReportsScreen), findsOneWidget);

      // Tap Consult tab (Index 2)
      await tester.tap(find.descendant(of: find.byType(HomeBottomNavigation), matching: find.text('Consult')));
      await tester.pumpAndSettle();
      expect(find.byType(ConsultScreen), findsOneWidget);
      expect(find.byType(ReportsScreen), findsNothing);

      // Tap Account tab (Index 3)
      await tester.tap(find.descendant(of: find.byType(HomeBottomNavigation), matching: find.text('Account')));
      await tester.pumpAndSettle();
      expect(find.byType(ProfileScreen), findsOneWidget);
      expect(find.text('seeker@astrosushil.com'), findsOneWidget);
    });

    const layouts = <String, (Size, double)>{
      'small phone 320x568 @1.0': (Size(320, 568), 1.0),
      'small phone 320x568 @1.3': (Size(320, 568), 1.3),
      'small phone 320x568 @2.0': (Size(320, 568), 2.0),
      'phone 390x844 @2.0': (Size(390, 844), 2.0),
      'landscape 640x360 @1.0': (Size(640, 360), 1.0),
      'tablet 1024x1366 @1.3': (Size(1024, 1366), 1.3),
    };
    for (final entry in layouts.entries) {
      for (final hasProfile in [false, true]) {
        testWidgets('Layout has no overflow or exceptions: ${entry.key}, profile=$hasProfile', (WidgetTester tester) async {
          final (size, scale) = entry.value;
          tester.view.physicalSize = size * 2;
          tester.view.devicePixelRatio = 2.0;
          tester.platformDispatcher.textScaleFactorTestValue = scale;
          addTearDown(tester.view.reset);
          addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

          await tester.pumpWidget(buildTestWidget(
            authState: AuthState.authenticated(testUser),
            profiles: hasProfile ? [testBirthProfile] : [],
          ));
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);

          // Scroll to the bottom so every section is laid out.
          await tester.ensureVisible(find.byKey(const ValueKey('home-service-shop')));
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
        });
      }
    }
  });
}

class TestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  TestAuthNotifier(super.state);

  @override
  Future<void> checkSession() async {}

  @override
  Future<AuthRegistrationResult?> login(String email, String password) async => null;

  @override
  Future<AuthRegistrationResult?> register(String email, String password,
      {Map<String, dynamic>? birthProfile, String? fullName, String? phoneNumber}) async => null;

  @override
  Future<bool> verifyEmail(String email, String otp) async => true;

  @override
  Future<String?> forgotPassword(String email) async => 'OTP sent';

  @override
  Future<bool> resetPassword(String email, String otp, String newPassword) async => true;

  @override
  Future<String?> resendVerification(String email) async => 'OTP sent';

  @override
  Future<void> handleSessionExpired() async {}

  @override
  Future<void> logout() async {
    state = AuthState.unauthenticated();
  }

  @override
  Future<bool> sendPhoneOtp(String phoneNumber) async => true;

  @override
  Future<bool> verifyPhoneOtp(String phoneNumber, String otp, [Map<String, dynamic>? birthProfile]) async => true;

  @override
  Future<bool> signInWithGoogle(String idToken, [Map<String, dynamic>? birthProfile]) async => true;

  @override
  Future<bool> linkPhone(String phoneNumber, String otp) async => true;

  @override
  Future<bool> linkGoogle(String idToken) async => true;

  @override
  Future<void> continueAsGuest() async {
    state = AuthState.guest();
  }

  @override
  Future<void> exitGuestMode() async {
    state = AuthState.unauthenticated();
  }

  @override
  void clearError() {}

  @override
  Future<bool> deleteAccount({String? confirmation, String? password}) async => true;
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

class _MockHomeScreenConsultationService implements ConsultationService {
  @override
  Future<List<ConsultationOfferingModel>> fetchCatalog() async => const [
        ConsultationOfferingModel(
          sku: 'consult-budget-friendly',
          title: 'Consult Sushil Sir',
          description: '15-minute voice call session with Astro Sushil.',
          mode: 'ONLINE_VOICE',
          durationMinutes: 15,
          pricePaise: 500000,
          responseDaysNotice: 15,
          category: 'Audio Consultation',
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

