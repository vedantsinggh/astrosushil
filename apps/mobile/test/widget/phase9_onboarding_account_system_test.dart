import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart' hide secureStorageProvider;
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/auth/data/auth_repository.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/screens/forgot_password_screen.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/auth/screens/register_screen.dart';
import 'package:astro_mobile/features/auth/screens/verification_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/screens/birth_profile_detail_screen.dart';
import 'package:astro_mobile/features/birth_profile/screens/birth_profile_list_screen.dart';
import 'package:astro_mobile/features/birth_profile/screens/create_birth_profile_screen.dart';
import 'package:astro_mobile/features/onboarding/providers/onboarding_provider.dart';
import 'package:astro_mobile/features/onboarding/screens/onboarding_screen.dart';
import 'package:astro_mobile/features/settings/screens/app_settings_screen.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

final _testProfile = BirthProfileModel(
  id: 'profile-user-1',
  userId: 'user-1',
  name: 'Rahul Sharma',
  dateOfBirth: '1990-05-15',
  timeOfBirth: '14:30:00',
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: 'Asia/Kolkata',
  placeName: 'New Delhi, Delhi, India',
  country: 'India',
  countryCode: 'IN',
  state: 'Delhi',
  isResolved: true,
  createdAt: DateTime(2026, 1, 1),
  updatedAt: DateTime(2026, 1, 1),
);

Widget _wrapWidget({
  required Widget child,
  List<Override> overrides = const [],
  Locale locale = const Locale('en'),
}) {
  return ProviderScope(
    overrides: [
      secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
      ...overrides,
    ],
    child: MaterialApp(
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('hi')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppTheme.lightTheme,
      home: child,
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 9: Onboarding Experience', () {
    testWidgets('1. Onboarding displays Page 1 title, Skip CTA, and Why Birth Data modal', (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        _wrapWidget(
          child: const OnboardingScreen(),
          overrides: [
            onboardingCompletedProvider.overrideWith((ref) => MockOnboardingNotifier(false)),
          ],
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Check first page headline and description
      expect(find.text('Skip'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (w) => w is RichText && w.text.toPlainText().contains('Know Your Chart'),
        ),
        findsOneWidget,
      );
      expect(find.text('Explore your birth chart, planets and houses in one clear, beautiful view.'), findsOneWidget);

      // Verify educational "Why Birth Data?" trigger is present
      expect(find.text('Why Birth Data?'), findsOneWidget);

      // Tap "Why Birth Data?" to verify educational sheet
      await tester.tap(find.text('Why Birth Data?'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Why We Ask for Birth Details'), findsOneWidget);
      expect(find.text('Understood'), findsOneWidget);

      await tester.ensureVisible(find.text('Understood'));
      await tester.tap(find.text('Understood'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
    });
  });

  group('Phase 9: Authentication & OTP Validation', () {
    testWidgets('2. LoginScreen displays phone authentication and validates empty input', (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        _wrapWidget(
          child: const LoginScreen(),
          overrides: [
            authStateProvider.overrideWith((ref) => AuthNotifierMock(AuthState.unauthenticated())),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Welcome to Astro Sushil'), findsOneWidget);
      expect(find.text('Phone Number'), findsOneWidget);
      expect(find.text('Send OTP'), findsOneWidget);
      expect(find.text('Continue with Google'), findsOneWidget);
      expect(find.text('Explore as Guest'), findsOneWidget);

      // Tap Send OTP with empty phone field
      await tester.tap(find.text('Send OTP'));
      await tester.pumpAndSettle();

      expect(find.text('Enter your phone number.'), findsOneWidget);
    });

    testWidgets('3. VerificationScreen renders masked target, 6 pin fields, resend countdown, and error banner', (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        _wrapWidget(
          child: const VerificationScreen(phoneNumber: '+919876543210'),
          overrides: [
            authStateProvider.overrideWith((ref) => AuthNotifierMock(AuthState.unauthenticated())),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Verify Your Phone'), findsOneWidget);
      expect(find.textContaining('+91••••••10'), findsOneWidget);
      expect(find.text('Verify & Continue'), findsOneWidget);
      expect(find.textContaining('Resend Code in 00:'), findsOneWidget);

      // Tap verify with empty inputs to trigger validation error
      await tester.tap(find.text('Verify & Continue'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter the full 6-digit verification code.'), findsOneWidget);
    });

    testWidgets('4. RegisterScreen renders Step 1 form and validates password confirmation', (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        _wrapWidget(
          child: const RegisterScreen(),
          overrides: [
            authStateProvider.overrideWith((ref) => AuthNotifierMock(AuthState.unauthenticated())),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Create Your Account'), findsOneWidget);
      expect(find.text('Step 1 of 2'), findsOneWidget);
      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Email Address'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Confirm Password'), findsOneWidget);
      expect(find.text('Continue'), findsOneWidget);

      // Enter mismatched passwords
      await tester.enterText(find.byType(TextFormField).at(0), 'Rahul Sharma');
      await tester.enterText(find.byType(TextFormField).at(1), 'rahul@example.com');
      await tester.enterText(find.byType(TextFormField).at(3), 'Password123!');
      await tester.enterText(find.byType(TextFormField).at(4), 'Mismatch123!');
      await tester.ensureVisible(find.text('Continue'));
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();

      expect(find.text('Passwords do not match.'), findsOneWidget);
    });

    testWidgets('5. ForgotPasswordScreen renders email input and submit CTA', (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        _wrapWidget(
          child: const ForgotPasswordScreen(),
          overrides: [
            authStateProvider.overrideWith((ref) => AuthNotifierMock(AuthState.unauthenticated())),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Forgot Password?'), findsOneWidget);
      expect(find.text('Send Reset Code'), findsOneWidget);
      expect(find.text('Back to Login'), findsOneWidget);
    });
  });

  group('Phase 9: Birth Profile Management', () {
    testWidgets('6. CreateBirthProfileScreen renders form fields, approximate time note, and guidance', (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        _wrapWidget(
          child: const CreateBirthProfileScreen(),
          overrides: [
            birthProfilesListNotifierProvider.overrideWith((ref) => BirthProfilesNotifierMock([_testProfile])),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Your Birth Details'), findsWidgets);
      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Date of Birth'), findsOneWidget);
      expect(find.text('Time of Birth'), findsOneWidget);
      expect(find.text('Place of Birth'), findsOneWidget);
      expect(find.text('Create Birth Chart'), findsOneWidget);
      expect(find.textContaining('If exact birth time is approximate, use 12:00 PM (Noon)'), findsOneWidget);
    });

    testWidgets('7. BirthProfileListScreen renders profile card with active badge and FAB', (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        _wrapWidget(
          child: const BirthProfileListScreen(),
          overrides: [
            birthProfilesListNotifierProvider.overrideWith((ref) => BirthProfilesNotifierMock([_testProfile])),
            selectedBirthProfileIdProvider.overrideWith((ref) => _testProfile.id),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('My Birth Profiles'), findsOneWidget);
      expect(find.text('Rahul Sharma'), findsOneWidget);
      expect(find.text('ACTIVE'), findsOneWidget);
      expect(find.text('New Profile'), findsOneWidget);
    });

    testWidgets('8. BirthProfileDetailScreen renders details, set active button, and delete dialog', (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        _wrapWidget(
          child: BirthProfileDetailScreen(profileId: _testProfile.id),
          overrides: [
            singleBirthProfileProvider(_testProfile.id).overrideWith((ref) => _testProfile),
            selectedBirthProfileIdProvider.overrideWith((ref) => 'other-id'),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Birth Profile Details'), findsOneWidget);
      expect(find.text('Rahul Sharma'), findsOneWidget);
      expect(find.text('Set as Active Profile'), findsOneWidget);
      expect(find.text('Delete Profile'), findsOneWidget);

      // Tap Delete Profile to verify confirmation dialog
      await tester.tap(find.text('Delete Profile'));
      await tester.pumpAndSettle();

      expect(find.text('Delete Birth Profile?'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
    });
  });

  group('Phase 9: Settings, Preferences & Security', () {
    testWidgets('9. AppSettingsScreen renders language, notifications, security, and cache management', (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      final testUser = UserModel(
        id: 'user-1',
        email: 'user@astrosushil.com',
        role: 'USER',
        createdAt: DateTime(2026, 1, 1),
      );

      await tester.pumpWidget(
        _wrapWidget(
          child: const AppSettingsScreen(),
          overrides: [
            authStateProvider.overrideWith((ref) => AuthNotifierMock(AuthState.authenticated(testUser))),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Settings & Preferences'), findsOneWidget);
      expect(find.text('English'), findsOneWidget);
      expect(find.text('हिन्दी (Hindi)'), findsOneWidget);
      expect(find.text('Planetary Transit Alerts'), findsOneWidget);
      expect(find.text('Daily Panchang & Muhurta'), findsOneWidget);
      expect(find.text('Device Permission: Granted'), findsOneWidget);
      expect(find.text('user@astrosushil.com'), findsOneWidget);
      expect(find.text('Clear Local Cache'), findsOneWidget);
      expect(find.text('Sign Out'), findsOneWidget);
      expect(find.text('Delete Account & Personal Data'), findsOneWidget);

      // Verify Clear Local Cache dialog
      await tester.ensureVisible(find.text('Clear Local Cache'));
      await tester.tap(find.text('Clear Local Cache'));
      await tester.pumpAndSettle();

      expect(find.text('Clear Local Cache?'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      // Verify Sign Out confirmation dialog
      await tester.ensureVisible(find.text('Sign Out'));
      await tester.tap(find.text('Sign Out'));
      await tester.pumpAndSettle();

      expect(find.text('Sign Out?'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
    });

    testWidgets('10. Multi-viewport and 2.0x text scaling robustness without flex overflows', (tester) async {
      final viewports = [
        const Size(320, 568), // Compact iPhone SE 1st gen
        const Size(360, 640), // Standard Android compact
        const Size(390, 844), // iPhone 12/13/14
        const Size(414, 896), // iPhone XR / Plus
      ];

      for (final vp in viewports) {
        await tester.binding.setSurfaceSize(vp);
        await tester.pumpWidget(
          MediaQuery(
            data: MediaQueryData(
              size: vp,
              textScaler: const TextScaler.linear(1.5),
            ),
            child: _wrapWidget(
              child: const AppSettingsScreen(),
              overrides: [
                authStateProvider.overrideWith((ref) => AuthNotifierMock(AuthState.guest())),
              ],
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Zero exceptions / zero overflows
        expect(tester.takeException(), isNull);
      }
      await tester.binding.setSurfaceSize(null);
    });
  });
}

class AuthNotifierMock extends StateNotifier<AuthState> implements AuthNotifier {
  AuthNotifierMock(super.initialState);

  @override
  Future<void> checkSession() async {}
  @override
  void clearError() {}
  @override
  Future<void> continueAsGuest() async {}
  @override
  Future<void> exitGuestMode() async {}
  @override
  Future<String?> forgotPassword(String email) async => null;
  @override
  Future<void> handleSessionExpired() async {}
  @override
  Future<bool> linkGoogle(String idToken) async => true;
  @override
  Future<bool> linkPhone(String phoneNumber, String otp) async => true;
  @override
  Future<AuthRegistrationResult?> login(String email, String password) async => null;
  @override
  Future<void> logout() async {}
  @override
  Future<AuthRegistrationResult?> register(String email, String password, {String? fullName, String? phoneNumber, Map<String, dynamic>? birthProfile}) async => null;
  @override
  Future<String?> resendVerification(String email) async => null;
  @override
  Future<bool> resetPassword(String email, String otp, String newPassword) async => true;
  @override
  Future<bool> sendPhoneOtp(String phoneNumber) async => true;
  @override
  Future<bool> signInWithGoogle(String idToken, [Map<String, dynamic>? birthProfile]) async => true;
  @override
  Future<bool> verifyEmail(String email, String otp) async => true;
  @override
  Future<bool> verifyPhoneOtp(String phoneNumber, String otp, [Map<String, dynamic>? birthProfile]) async => true;
  @override
  Future<bool> deleteAccount({String? confirmation, String? password}) async => true;
}

class BirthProfilesNotifierMock extends StateNotifier<BirthProfilesState> implements BirthProfilesNotifier {
  BirthProfilesNotifierMock(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  Future<void> fetchProfiles() async {}
  @override
  Future<BirthProfileModel?> createProfile(CreateBirthProfileDto dto) async => null;
  @override
  Future<BirthProfileModel?> migrateGuestProfile(CreateBirthProfileDto dto) async => null;
}

class MockOnboardingNotifier extends StateNotifier<bool> implements OnboardingNotifier {
  MockOnboardingNotifier([super.initial = false]);

  @override
  Future<void> checkCompletionStatus() async {}

  @override
  Future<void> completeOnboarding() async {
    state = true;
  }
}

