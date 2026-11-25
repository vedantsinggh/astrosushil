import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/screens/complete_profile_screen.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/google_auth_fakes.dart';

void main() {
  late InMemorySecureStorageService storage;
  late FakeAuthRepository authRepo;

  Future<void> pumpCompleteProfile(
    WidgetTester tester, {
    required UserModel user,
    UserModel? userAfterPhoneLinked,
  }) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    storage = InMemorySecureStorageService();
    authRepo = FakeAuthRepository(
      storage: storage,
      googleUser: user,
      userAfterPhoneLinked: userAfterPhoneLinked,
    );
    await authRepo.verifyPhoneOtp(phoneNumber: '+919876543210', otp: '123456');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(authRepo),
          birthProfileRepositoryProvider.overrideWithValue(
            FakeBirthProfileRepository(storage: storage, serverProfiles: [accountBirthProfile()]),
          ),
        ],
        child: const MaterialApp(
          home: CompleteProfileScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('Account missing a phone number must complete the profile before continuing',
      (tester) async {
    await pumpCompleteProfile(
      tester,
      user: googleTestUser(),
      userAfterPhoneLinked: googleTestUser(profileComplete: true, missing: const [], phoneNumber: '+919876543210'),
    );

    expect(find.text('Just one more step'), findsOneWidget);
    expect(find.text('Mobile number'), findsOneWidget);
    expect(find.text('Your full name'), findsNothing);

    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();
    expect(find.text('Enter your phone number.'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('complete_profile_phone')), '9876543210');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();

    expect(authRepo.calls, contains('otp:+919876543210'));
    expect(find.text('Enter your code'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('complete_profile_code')), '123456');
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();

    expect(authRepo.calls, contains('link:+919876543210:123456'));
  });

  testWidgets('Account without a name asks for the name and saves it before sending the code',
      (tester) async {
    await pumpCompleteProfile(
      tester,
      user: googleTestUser(missing: const ['fullName', 'phoneNumber']),
      userAfterPhoneLinked: googleTestUser(profileComplete: true, missing: const [], phoneNumber: '+919876543210'),
    );

    expect(find.text('Your full name'), findsOneWidget);
    expect(find.text('Mobile number'), findsOneWidget);

    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();
    expect(find.text('Enter your full name.'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('complete_profile_name')), 'Asha Verma');
    await tester.enterText(find.byKey(const Key('complete_profile_phone')), '9876543210');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();

    expect(authRepo.calls.indexOf('name:Asha Verma'), lessThan(authRepo.calls.indexOf('otp:+919876543210')));
    expect(find.text('Enter your code'), findsOneWidget);
  });

  testWidgets('Code is not accepted unless the backend reports the profile complete', (tester) async {
    await pumpCompleteProfile(tester, user: googleTestUser());

    await tester.enterText(find.byKey(const Key('complete_profile_phone')), '9876543210');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('complete_profile_code')), '123456');
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();

    expect(find.text('Some details are still missing. Please fill in every box.'), findsOneWidget);
  });

  testWidgets('LoginScreen supports Email OTP sign-in flow', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final store = InMemorySecureStorageService();
    final repo = FakeAuthRepository(
      storage: store,
      googleUser: googleTestUser(profileComplete: true, missing: const [], phoneNumber: '+919876543210'),
    );
    var successCalls = 0;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(store),
          authRepositoryProvider.overrideWithValue(repo),
          birthProfileRepositoryProvider.overrideWithValue(
            FakeBirthProfileRepository(storage: store, serverProfiles: [accountBirthProfile()]),
          ),
        ],
        child: MaterialApp(home: LoginScreen(onLoginSuccess: () => successCalls++)),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('login-tab-email')));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).first, 'asha@example.com');
    await tester.tap(find.text('Send Email OTP'));
    await tester.pumpAndSettle();

    expect(repo.calls, contains('emailOtp:asha@example.com'));

    final otpFields = find.byType(TextField);
    for (var i = 0; i < 6; i++) {
      await tester.enterText(otpFields.at(i), '${i + 1}');
    }
    await tester.pumpAndSettle();

    expect(repo.calls, contains('verifyEmailOtp:asha@example.com:123456'));
    expect(successCalls, 1);
  });
}
