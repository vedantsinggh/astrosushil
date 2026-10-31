import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/home/screens/home_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/data/auth_repository.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
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

  Widget buildCaptureWidget({
    required GlobalKey boundaryKey,
    required bool hasProfile,
    required Locale locale,
  }) {
    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        authStateProvider.overrideWith(
          (ref) => TestAuthNotifier(AuthState.authenticated(testUser)),
        ),
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => TestBirthProfilesNotifier(hasProfile ? [testBirthProfile] : []),
        ),
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
        home: RepaintBoundary(
          key: boundaryKey,
          child: const HomeScreen(),
        ),
      ),
    );
  }

  group('Home Screen Viewport Screenshot Capture', () {
    const widths = [320.0, 360.0, 390.0, 414.0];
    const locales = [Locale('en'), Locale('hi')];
    const profileStates = [true, false];

    for (final width in widths) {
      for (final locale in locales) {
        for (final hasProfile in profileStates) {
          final profileTag = hasProfile ? 'profile' : 'noprofile';
          final testName = 'Capture Home ${width.toInt()}px ${locale.languageCode} $profileTag';

          testWidgets(testName, (WidgetTester tester) async {
            final boundaryKey = GlobalKey();
            tester.view.physicalSize = Size(width * 2, 844 * 2);
            tester.view.devicePixelRatio = 2.0;

            await tester.pumpWidget(
              buildCaptureWidget(
                boundaryKey: boundaryKey,
                hasProfile: hasProfile,
                locale: locale,
              ),
            );
            await tester.pumpAndSettle();

            await tester.runAsync(() async {
              final RenderRepaintBoundary boundary =
                  boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
              final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
              final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
              if (byteData != null) {
                final bytes = byteData.buffer.asUint8List();
                final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_2');
                if (!outDir.existsSync()) {
                  outDir.createSync(recursive: true);
                }
                final file = File(
                  '${outDir.path}/home_${width.toInt()}w_${locale.languageCode}_$profileTag.png',
                );
                await file.writeAsBytes(bytes);
              }
            });

            addTearDown(() {
              tester.view.resetPhysicalSize();
              tester.view.resetDevicePixelRatio();
            });
          });
        }
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
