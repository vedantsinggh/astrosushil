import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/astrology/screens/astrology_hub_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
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
    testWidgets('Renders every astrology tool, grouped into plain-language sections', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1200, 4800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [testBirthProfile],
      ));
      await tester.pumpAndSettle();

      // The hub groups tools under section headings (no filter pills).
      for (final section in ['Charts & Kundli', 'Timing & Periods', 'Strength', 'Advanced Tools', 'Matchmaking']) {
        expect(find.text(section), findsOneWidget, reason: section);
      }

      const tools = [
        'Birth Chart (Kundli)',
        'Planetary Placements',
        '12 Houses (Bhavas)',
        'Nakshatra Profile',
        'Divisional Charts (Vargas)',
        'Vimshottari Dasha',
        'Transits (Gochara)',
        'Panchanga',
        'Vedic Yogas',
        'Shadbala (षड्बल)',
        'Bhava Bala (भावबल)',
        'Ashtakavarga Matrix',
        'Jaimini Astrology',
        'KP System (Krishnamurti Padhdhati)',
        'Varshaphala (Solar Return)',
        'Prashna (Horary Astrology)',
        'Special Lagnas & Upagrahas',
        'Kundli Matchmaking (Guna Milan)',
      ];
      for (final t in tools) {
        await tester.scrollUntilVisible(find.text(t), 200, scrollable: find.byType(Scrollable).first);
        expect(find.text(t), findsOneWidget, reason: t);
      }
    });

    testWidgets('Each tool shows a one-line plain-language description', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1200, 4800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [testBirthProfile],
      ));
      await tester.pumpAndSettle();

      expect(find.text('Your main birth chart'), findsOneWidget);
      expect(find.text('Your planet periods over time'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Check how well two charts match'), 200,
          scrollable: find.byType(Scrollable).first);
      expect(find.text('Check how well two charts match'), findsOneWidget);
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
  Future<String?> forgotPassword(String email) async => 'OTP sent';

  @override
  Future<bool> resetPassword(String email, String otp, String newPassword) async => true;

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
  Future<bool> sendEmailOtp(String email) async => true;

  @override
  Future<bool> verifyEmailOtp(String email, String otp, {String? fullName, Map<String, dynamic>? birthProfile}) async => true;

  @override
  Future<bool> linkPhone(String phoneNumber, String otp) async => true;

  @override
  Future<bool> linkEmail(String email, String otp) async => true;

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
