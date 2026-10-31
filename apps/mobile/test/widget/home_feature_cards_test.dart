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
        selectedBirthProfileProvider.overrideWith(
          (ref) => profiles.isNotEmpty ? profiles.first : null,
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

      expect(find.text('Birth Chart (Kundli)'), findsOneWidget);
      expect(find.text('Divisional Charts (Vargas)'), findsOneWidget);
      expect(find.text('Planetary Placements'), findsOneWidget);
      expect(find.text('Vimshottari Dasha'), findsOneWidget);
      expect(find.text('Transits (Gochara)'), findsOneWidget);
      expect(find.text('Panchanga'), findsOneWidget);
      expect(find.text('Vedic Yogas'), findsOneWidget);
      expect(find.text('Kundli Matchmaking (Guna Milan)'), findsOneWidget);
      expect(find.textContaining('Planetary & House Strength'), findsOneWidget);
      expect(find.textContaining('Advanced Astrological Systems'), findsOneWidget);
      expect(find.textContaining('Shadbala'), findsWidgets);
      expect(find.textContaining('Bhava Bala'), findsWidgets);
      expect(find.textContaining('Ashtakavarga'), findsWidgets);
      expect(find.textContaining('Jaimini'), findsWidgets);
      expect(find.textContaining('KP Sub-Lords'), findsWidgets);
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

      // Tap 'Charts & Kundli' filter pill
      await tester.tap(find.text('Charts & Kundli').first);
      await tester.pumpAndSettle();
      expect(find.text('Birth Chart (Kundli)'), findsOneWidget);
      expect(find.text('Divisional Charts (Vargas)'), findsOneWidget);
      expect(find.text('Planetary Placements'), findsOneWidget);

      // Tap 'Timing & Dashas' filter
      await tester.tap(find.text('Timing & Dashas').first);
      await tester.pumpAndSettle();
      expect(find.text('Vimshottari Dasha'), findsOneWidget);
      expect(find.text('Transits (Gochara)'), findsOneWidget);
      expect(find.text('Panchanga'), findsOneWidget);
      expect(find.text('Vedic Yogas'), findsOneWidget);

      // Tap 'Strengths' filter
      await tester.tap(find.text('Strengths').first);
      await tester.pumpAndSettle();
      expect(find.text('Shadbala (षड्बल)'), findsOneWidget);
      expect(find.text('Bhava Bala (भावबल)'), findsOneWidget);
      expect(find.text('Ashtakavarga Matrix'), findsOneWidget);

      // Tap 'Advanced' filter
      await tester.tap(find.text('Advanced').first);
      await tester.pumpAndSettle();
      expect(find.text('Jaimini Astrology'), findsOneWidget);
      expect(find.text('KP System (Krishnamurti Padhdhati)'), findsOneWidget);
      expect(find.text('Varshaphala (Solar Return)'), findsOneWidget);
      expect(find.text('Prashna (Horary Astrology)'), findsOneWidget);
      expect(find.text('Special Lagnas & Upagrahas'), findsOneWidget);

      // Tap 'Matchmaking' filter pill
      await tester.tap(find.text('Matchmaking').first);
      await tester.pumpAndSettle();
      expect(find.text('Kundli Matchmaking (Guna Milan)'), findsOneWidget);
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

      expect(find.text('No Birth Profile Available'), findsOneWidget);
      expect(find.text('Add Birth Profile'), findsOneWidget);
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
