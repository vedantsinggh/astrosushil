import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/home/screens/home_screen.dart';
import 'package:astro_mobile/home/data/mock_home_repository.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/data/auth_repository.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/home/widgets/hero_astrology_card.dart';
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
        home: const HomeScreen(),
      ),
    );
  }

  group('HomeScreen Widget Tests', () {
    testWidgets('Renders Home Screen header and user name for authenticated user', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Hello, seeker'), findsOneWidget);
      expect(find.text('Explore your cosmic journey'), findsOneWidget);
    });

    testWidgets('Renders Hero Card with "Create Your Birth Profile" for first-time user without birth profile', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [],
      ));
      await tester.pumpAndSettle();

      expect(find.descendant(of: find.byType(HeroAstrologyCard), matching: find.textContaining('Create Your')), findsOneWidget);
      expect(find.descendant(of: find.byType(HeroAstrologyCard), matching: find.textContaining('Birth Profile')), findsOneWidget);
      expect(find.text('Add Birth Details'), findsOneWidget);
    });

    testWidgets('Renders Hero Card with "Your Cosmic Journey" when user has a birth profile', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(
        authState: AuthState.authenticated(testUser),
        profiles: [testBirthProfile],
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('Your Cosmic'), findsOneWidget);
      expect(find.textContaining('Journey'), findsOneWidget);
      expect(find.text('View Your Chart'), findsOneWidget);
    });

    testWidgets('Renders Quick Access section and 4 core cards', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Quick Access'), findsOneWidget);
      expect(find.text('Birth Chart'), findsWidgets);
      expect(find.text('Planets'), findsOneWidget);
      expect(find.text('Rashi Bhavishya'), findsWidgets);
      expect(find.text('Vastu'), findsWidgets);
    });

    testWidgets('Renders Gupta Nadi flagship premium card with badge', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Gupta Nadi'), findsOneWidget);
      expect(find.text('PREMIUM'), findsOneWidget);
      expect(find.text('Explore Gupta Nadi'), findsOneWidget);
    });

    testWidgets('Renders Personalized Report cards (Career, Marriage, Childbirth)', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Personalized Reports'), findsWidgets);
      expect(find.text('Career Report'), findsOneWidget);
      expect(find.text('Marriage & Relationship Report'), findsOneWidget);
      expect(find.text('Childbirth Report'), findsOneWidget);
    });

    testWidgets('Renders Today\'s Rashi Bhavishya preview card', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text("Today's Rashi Bhavishya"), findsOneWidget);
      expect(find.text('Aries'), findsOneWidget);
    });

    testWidgets('Bottom Navigation allows switching between Home, Reports, and Profile tabs', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      // Initially on Home tab (Index 0)
      expect(find.text('Explore your cosmic journey'), findsOneWidget);

      // Tap Reports tab (Index 1)
      await tester.tap(find.text('Reports'));
      await tester.pumpAndSettle();
      expect(find.text('YOUR ASTRO REPORTS'), findsOneWidget);

      // Tap Profile tab (Index 2)
      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();
      expect(find.text('seeker@astrosushil.com'), findsOneWidget);
      expect(find.text('My Birth Profiles'), findsOneWidget);
      expect(find.text('Logout'), findsOneWidget);
    });

    testWidgets('Responsive layout renders without overflow on small device screens', (WidgetTester tester) async {
      // Set small device screen constraints (e.g. 320x568 - iPhone SE 1st gen)
      tester.view.physicalSize = const Size(320 * 2, 568 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);

      // Reset test viewport
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  group('Mock Data Isolation Tests', () {
    test('MockHomeRepository provides deterministic UI mock data', () {
      final repo = MockHomeRepository();
      final prediction = repo.getDailyPrediction();
      final reports = repo.getPersonalizedReports();

      expect(prediction.rashiName, contains('Mesha'));
      expect(reports.length, equals(3));
      expect(reports[0].title, equals('Career Report'));
      expect(reports[1].title, equals('Marriage & Relationship Report'));
      expect(reports[2].title, equals('Childbirth Report'));
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
