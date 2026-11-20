import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/auth/data/google_id_token_source.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/google_auth_fakes.dart';

void main() {
  late InMemorySecureStorageService storage;
  late FakeAuthRepository authRepo;
  late int successCalls;

  Future<void> pumpLogin(
    WidgetTester tester, {
    required UserModel googleUser,
    UserModel? userAfterPhoneLinked,
  }) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    storage = InMemorySecureStorageService();
    authRepo = FakeAuthRepository(
      storage: storage,
      googleUser: googleUser,
      userAfterPhoneLinked: userAfterPhoneLinked,
    );
    successCalls = 0;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(authRepo),
          googleIdTokenSourceProvider.overrideWithValue(FakeGoogleIdTokenSource()),
          birthProfileRepositoryProvider.overrideWithValue(
            FakeBirthProfileRepository(storage: storage, serverProfiles: [accountBirthProfile()]),
          ),
        ],
        child: MaterialApp(
          home: LoginScreen(onLoginSuccess: () => successCalls++),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> tapGoogle(WidgetTester tester) async {
    await tester.ensureVisible(find.text('Continue with Google'));
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();
  }

  testWidgets('Google sign-in missing a phone number must complete the profile before continuing',
      (tester) async {
    await pumpLogin(
      tester,
      googleUser: googleTestUser(),
      userAfterPhoneLinked: googleTestUser(profileComplete: true, missing: const [], phoneNumber: '+919876543210'),
    );

    await tapGoogle(tester);

    expect(authRepo.calls, contains('google:fake-google-id-token'));
    expect(find.text('Just one more step'), findsOneWidget);
    expect(find.text('Mobile number'), findsOneWidget);
    expect(find.text('Your full name'), findsNothing, reason: 'Google already supplied the name');
    expect(successCalls, 0, reason: 'Home must not be reached while the profile is incomplete');

    // The empty number is rejected with the same message as the login screen.
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();
    expect(find.text('Enter your phone number.'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('complete_profile_phone')), '9876543210');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();

    expect(authRepo.calls, contains('otp:+919876543210'));
    expect(find.text('Enter your code'), findsOneWidget);
    expect(successCalls, 0);

    await tester.enterText(find.byKey(const Key('complete_profile_code')), '123456');
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();

    expect(authRepo.calls, contains('link:+919876543210:123456'));
    expect(find.text('Just one more step'), findsNothing);
    expect(find.text('Enter your code'), findsNothing);
    expect(successCalls, 1);
  });

  testWidgets('Google account without a name asks for the name and saves it before sending the code',
      (tester) async {
    await pumpLogin(
      tester,
      googleUser: googleTestUser(missing: const ['fullName', 'phoneNumber']),
      userAfterPhoneLinked: googleTestUser(profileComplete: true, missing: const [], phoneNumber: '+919876543210'),
    );

    await tapGoogle(tester);

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
    // Server still says incomplete after linking (e.g. it rejected the change).
    await pumpLogin(tester, googleUser: googleTestUser());

    await tapGoogle(tester);
    await tester.enterText(find.byKey(const Key('complete_profile_phone')), '9876543210');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('complete_profile_code')), '123456');
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();

    expect(successCalls, 0);
    expect(find.text('Some details are still missing. Please fill in every box.'), findsOneWidget);
  });

  testWidgets('Google account that is already complete goes straight on', (tester) async {
    await pumpLogin(
      tester,
      googleUser: googleTestUser(profileComplete: true, missing: const [], phoneNumber: '+919876543210'),
    );

    await tapGoogle(tester);

    expect(find.text('Just one more step'), findsNothing);
    expect(successCalls, 1);
  });

  testWidgets('Closing the Google picker leaves the user on the login screen', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final store = InMemorySecureStorageService();
    final repo = FakeAuthRepository(storage: store, googleUser: googleTestUser());

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(store),
          authRepositoryProvider.overrideWithValue(repo),
          googleIdTokenSourceProvider.overrideWithValue(FakeGoogleIdTokenSource(null)),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    await tester.pumpAndSettle();
    await tapGoogle(tester);

    expect(repo.calls, isEmpty, reason: 'no token must be sent when the user cancels');
    expect(find.text('Welcome to Astro Sushil'), findsOneWidget);
  });
}
