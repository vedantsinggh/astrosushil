import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/astrology/screens/astrology_hub_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/data/auth_repository.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

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
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        home: const AstrologyHubScreen(),
      ),
    );
  }

  group('Home Screen Feature Cards Visual Overhaul Tests', () {
    testWidgets('Renders all 18 feature cards under All Tools', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1200, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [testBirthProfile],
      ));
      await tester.pumpAndSettle();

      expect(find.text('Birth Chart'), findsWidgets);
      expect(find.text('Divisional Charts'), findsOneWidget);
      expect(find.text('Vimshottari Dasha'), findsOneWidget);
      expect(find.text('Matchmaking'), findsWidgets);
      expect(find.text('Daily Panchanga'), findsOneWidget);
      expect(find.text('Planets'), findsOneWidget);
      expect(find.text('Transits (Gochara)'), findsOneWidget);
      expect(find.text('Vedic Yogas'), findsOneWidget);
      expect(find.text('Shadbala Strengths'), findsOneWidget);
      expect(find.text('Bhava Bala'), findsOneWidget);
      expect(find.text('Ashtakavarga'), findsOneWidget);
      expect(find.text('Jaimini Sutras'), findsOneWidget);
      expect(find.text('KP Astrology'), findsOneWidget);
      expect(find.text('Varshaphala'), findsOneWidget);
      expect(find.text('Prashna Shastra'), findsOneWidget);
      expect(find.text('Special Points'), findsOneWidget);
      expect(find.text('Vastu'), findsWidgets);
    });

    testWidgets('Category filter pills filter cards correctly', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1200, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [testBirthProfile],
      ));
      await tester.pumpAndSettle();

      // Tap 'Charts & Kundli' filter
      await tester.tap(find.text('Charts & Kundli'));
      await tester.pumpAndSettle();
      expect(find.text('Birth Chart'), findsWidgets);
      expect(find.text('Divisional Charts'), findsOneWidget);
      expect(find.text('Planets'), findsOneWidget);
      expect(find.text('Special Points'), findsOneWidget);

      // Tap 'Timing & Dashas' filter
      await tester.tap(find.text('Timing & Dashas'));
      await tester.pumpAndSettle();
      expect(find.text('Vimshottari Dasha'), findsOneWidget);
      expect(find.text('Transits (Gochara)'), findsOneWidget);
      expect(find.text('Daily Panchanga'), findsOneWidget);
      expect(find.text('Vedic Yogas'), findsOneWidget);

      // Tap 'Matchmaking' filter pill (first occurrence)
      await tester.tap(find.text('Matchmaking').first);
      await tester.pumpAndSettle();
      expect(find.text('Matchmaking'), findsWidgets);

      // Tap 'Advanced' filter
      await tester.tap(find.text('Advanced'));
      await tester.pumpAndSettle();
      expect(find.text('Shadbala Strengths'), findsOneWidget);
      expect(find.text('Bhava Bala'), findsOneWidget);
      expect(find.text('Ashtakavarga'), findsOneWidget);
      expect(find.text('Jaimini Sutras'), findsOneWidget);
      expect(find.text('KP Astrology'), findsOneWidget);
      expect(find.text('Prashna Shastra'), findsOneWidget);
    });

    testWidgets('No-profile empty states render meaningful prompts without crashing', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1200, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [],
      ));
      await tester.pumpAndSettle();

      expect(find.text('Create Birth Profile'), findsWidgets);
      expect(find.text('Add birth details to generate real Kundli'), findsOneWidget);
      expect(find.text('Your D1 to D60 Vargas will appear here'), findsOneWidget);
    });
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
