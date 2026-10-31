import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart' hide secureStorageProvider;
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/auth/screens/verification_screen.dart';
import 'package:astro_mobile/features/auth/screens/register_screen.dart';
import 'package:astro_mobile/features/onboarding/providers/onboarding_provider.dart';
import 'package:astro_mobile/features/onboarding/screens/onboarding_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/screens/create_birth_profile_screen.dart';
import 'package:astro_mobile/features/birth_profile/screens/birth_profile_list_screen.dart';
import 'package:astro_mobile/features/birth_profile/screens/birth_profile_detail_screen.dart';
import 'package:astro_mobile/features/settings/screens/app_settings_screen.dart';

class _CaptureAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _CaptureAuthNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _CaptureOnboardingNotifier extends StateNotifier<bool> implements OnboardingNotifier {
  _CaptureOnboardingNotifier([super.initial = false]);

  @override
  Future<void> checkCompletionStatus() async {}

  @override
  Future<void> completeOnboarding() async {
    state = true;
  }
}

class _CaptureBirthProfilesNotifier extends StateNotifier<BirthProfilesState> implements BirthProfilesNotifier {
  _CaptureBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

void main() {
  final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_9');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  final testProfile = BirthProfileModel(
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

  final testUser = UserModel(
    id: 'user-1',
    email: 'seeker@astrosushil.com',
    phoneNumber: '+919876543210',
    role: 'USER',
    createdAt: DateTime(2026, 1, 1),
  );

  Widget buildCaptureApp({
    required GlobalKey boundaryKey,
    required Widget child,
    List<Override> overrides = const [],
    Locale locale = const Locale('en'),
  }) {
    final storage = InMemorySecureStorageService();

    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        onboardingCompletedProvider.overrideWith((ref) => _CaptureOnboardingNotifier(false)),
        authStateProvider.overrideWith((ref) => _CaptureAuthNotifier(AuthState.unauthenticated())),
        birthProfilesListNotifierProvider.overrideWith((ref) => _CaptureBirthProfilesNotifier([testProfile])),
        selectedBirthProfileIdProvider.overrideWith((ref) => testProfile.id),
        singleBirthProfileProvider(testProfile.id).overrideWith((ref) => testProfile),
        ...overrides,
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
        home: RepaintBoundary(
          key: boundaryKey,
          child: child,
        ),
      ),
    );
  }

  Future<void> captureToFile(
    WidgetTester tester,
    GlobalKey boundaryKey,
    String filename,
  ) async {
    await tester.runAsync(() async {
      final RenderRepaintBoundary boundary =
          boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final file = File('${outDir.path}/$filename');
        await file.writeAsBytes(byteData.buffer.asUint8List());
      }
    });
  }

  group('Phase 9 Onboarding, Account, & System Screens Capture Suite', () {
    testWidgets('Capture 01_onboarding_welcome', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const OnboardingScreen(),
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      await captureToFile(tester, boundaryKey, '01_onboarding_welcome.png');
    });

    testWidgets('Capture 02_login_phone_auth', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const LoginScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '02_login_phone_auth.png');
    });

    testWidgets('Capture 03_otp_verification_countdown', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const VerificationScreen(phoneNumber: '+919876543210'),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '03_otp_verification_countdown.png');
    });

    testWidgets('Capture 04_otp_error_state', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const VerificationScreen(phoneNumber: '+919876543210'),
      ));
      await tester.pumpAndSettle();

      // Trigger error state by attempting verification with empty OTP
      await tester.tap(find.text('Verify & Continue'));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '04_otp_error_state.png');
    });

    testWidgets('Capture 05_register_account_credentials', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const RegisterScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '05_register_account_credentials.png');
    });

    testWidgets('Capture 06_create_birth_profile_form', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const CreateBirthProfileScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '06_create_birth_profile_form.png');
    });

    testWidgets('Capture 07_saved_birth_profiles_list', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const BirthProfileListScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '07_saved_birth_profiles_list.png');
    });

    testWidgets('Capture 08_birth_profile_detail_actions', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: BirthProfileDetailScreen(profileId: testProfile.id),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '08_birth_profile_detail_actions.png');
    });

    testWidgets('Capture 09_app_settings_preferences', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const AppSettingsScreen(),
        overrides: [
          authStateProvider.overrideWith((ref) => _CaptureAuthNotifier(AuthState.authenticated(testUser))),
        ],
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '09_app_settings_preferences.png');
    });
  });
}
