import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/home/widgets/home_bottom_navigation.dart';
import 'package:astro_mobile/home/screens/consult_screen.dart';
import 'package:astro_mobile/home/screens/profile_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart' hide secureStorageProvider;
import 'package:astro_mobile/features/auth/data/auth_repository.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

void main() {
  Widget buildAppWrapper({
    required Widget child,
    Locale locale = const Locale('en'),
    InMemorySecureStorageService? storage,
  }) {
    final effectiveStorage = storage ?? InMemorySecureStorageService();
    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(effectiveStorage),
        localeProvider.overrideWith((ref) => TestCustomLocaleNotifier(effectiveStorage, locale)),
        authStateProvider.overrideWith((ref) => TestAuthNotifier(AuthState.guest())),
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
        home: Scaffold(body: child),
      ),
    );
  }

  group('Phase 1: 4-Destination Primary Navigation Tests', () {
    testWidgets('HomeBottomNavigation renders all 4 destinations with distinct labels', (tester) async {
      int tappedIndex = -1;

      await tester.pumpWidget(buildAppWrapper(
        child: HomeBottomNavigation(
          currentIndex: 0,
          onTap: (index) => tappedIndex = index,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Reports'), findsOneWidget);
      expect(find.text('Consult'), findsOneWidget);
      expect(find.text('Account'), findsOneWidget);

      // Verify tap on Consult (Index 2)
      await tester.tap(find.text('Consult'));
      expect(tappedIndex, equals(2));

      // Verify tap on Account (Index 3)
      await tester.tap(find.text('Account'));
      expect(tappedIndex, equals(3));

      // Verify tap on Reports (Index 1)
      await tester.tap(find.text('Reports'));
      expect(tappedIndex, equals(1));
    });

    testWidgets('HomeBottomNavigation items meet 48dp minimum touch target height', (tester) async {
      await tester.pumpWidget(buildAppWrapper(
        child: HomeBottomNavigation(
          currentIndex: 0,
          onTap: (_) {},
        ),
      ));
      await tester.pumpAndSettle();

      final navBarFinder = find.byType(HomeBottomNavigation);
      final navBarSize = tester.getSize(navBarFinder);
      expect(navBarSize.height, greaterThanOrEqualTo(48.0));

      // Check each item container constraint
      final itemFinders = find.byType(InkWell);
      expect(itemFinders, findsNWidgets(4));

      for (int i = 0; i < 4; i++) {
        final itemSize = tester.getSize(itemFinders.at(i));
        expect(itemSize.height, greaterThanOrEqualTo(48.0));
      }
    });

    testWidgets('HomeBottomNavigation renders Devanagari labels when locale is Hindi', (tester) async {
      await tester.pumpWidget(buildAppWrapper(
        locale: const Locale('hi'),
        child: HomeBottomNavigation(
          currentIndex: 0,
          onTap: (_) {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('मुख्य'), findsOneWidget);
      expect(find.text('रिपोर्ट्स'), findsOneWidget);
      expect(find.text('परामर्श'), findsOneWidget);
      expect(find.text('खाता'), findsOneWidget);
    });
  });

  group('Phase 1: Consult Screen Integration Tests', () {
    testWidgets('ConsultScreen renders Book Consultation and My Appointments tabs', (tester) async {
      await tester.pumpWidget(buildAppWrapper(child: const ConsultScreen()));
      await tester.pump(const Duration(seconds: 1));

      expect(find.text('Book Consultation'), findsOneWidget);
      expect(find.text('My Appointments'), findsOneWidget);
    });

    testWidgets('ConsultScreen renders smoothly under 1.5x large text scale without overflow', (tester) async {
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(1.5)),
          child: buildAppWrapper(child: const ConsultScreen()),
        ),
      );
      await tester.pump(const Duration(seconds: 1));

      expect(tester.takeException(), isNull);
      expect(find.text('Book Consultation'), findsOneWidget);
    });
  });

  group('Phase 1: Account Screen & Language Selection Tests', () {
    testWidgets('ProfileScreen shows language selection option and opens dialog', (tester) async {
      final storage = InMemorySecureStorageService();

      await tester.pumpWidget(buildAppWrapper(
        storage: storage,
        child: const ProfileScreen(),
      ));
      await tester.pumpAndSettle();

      expect(find.text('My Account'), findsOneWidget);
      expect(find.text('App Language / भाषा'), findsOneWidget);

      // Tap on Language Setting (ensure visible in scroll view)
      await tester.scrollUntilVisible(find.text('App Language / भाषा'), 200);
      await tester.tap(find.text('App Language / भाषा'));
      await tester.pumpAndSettle();

      // Language dialog displays options
      expect(find.text('Select App Language'), findsOneWidget);
      expect(find.text('हिन्दी (Hindi)'), findsOneWidget);

      // Select Hindi
      await tester.tap(find.text('हिन्दी (Hindi)'));
      await tester.pumpAndSettle();

      // Verify persisted
      final persisted = await storage.read(key: StorageKeys.appLocale);
      expect(persisted, equals('hi'));
    });
  });
}

class TestCustomLocaleNotifier extends LocaleNotifier {
  TestCustomLocaleNotifier(super.storage, Locale initialLocale) {
    state = initialLocale;
  }
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
