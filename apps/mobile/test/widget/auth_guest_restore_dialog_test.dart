import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/auth/data/google_id_token_source.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/birth_profile/data/local_guest_birth_profile_service.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/google_auth_fakes.dart';

const _dialogTitle = 'Save Guest Birth Details?';

CreateBirthProfileDto _guestDto({String name = 'Ravi Kumar'}) => CreateBirthProfileDto(
      name: name,
      dateOfBirth: '1990-05-14',
      timeOfBirth: '06:30:00',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
      placeName: 'Mumbai, India',
    );

void main() {
  group('LocalGuestBirthProfileService.getPendingGuestProfile', () {
    test('returns null when this device has no guest profile', () async {
      final service = LocalGuestBirthProfileService(InMemorySecureStorageService());
      expect(await service.getPendingGuestProfile(const []), isNull);
      expect(await service.getPendingGuestProfile([accountBirthProfile()]), isNull);
    });

    test('returns a genuine guest profile that is not on the account', () async {
      final service = LocalGuestBirthProfileService(InMemorySecureStorageService());
      await service.saveGuestProfile(_guestDto());

      final pending = await service.getPendingGuestProfile([accountBirthProfile()]);
      expect(pending?.name, 'Ravi Kumar');
    });

    test('ignores and clears a guest profile already saved on the account', () async {
      final storage = InMemorySecureStorageService();
      final service = LocalGuestBirthProfileService(storage);
      await service.saveGuestProfile(_guestDto(name: 'asha verma'));

      expect(await service.getPendingGuestProfile([accountBirthProfile(name: 'Asha Verma')]), isNull);
      expect(await storage.read(key: StorageKeys.guestBirthProfile), isNull);
    });

    test('ignores and clears an unreadable or non-guest record', () async {
      final storage = InMemorySecureStorageService();
      await storage.write(key: StorageKeys.guestBirthProfile, value: '{"id":"server-1","userId":"user-1"}');
      final service = LocalGuestBirthProfileService(storage);

      expect(await service.getPendingGuestProfile(const []), isNull);
      expect(await storage.read(key: StorageKeys.guestBirthProfile), isNull);
    });
  });

  group('Restore guest profiles dialog at login', () {
    late InMemorySecureStorageService storage;
    late FakeBirthProfileRepository birthRepo;
    late int successCalls;

    Future<void> pumpAndSignIn(WidgetTester tester, {List<BirthProfileModel>? serverProfiles}) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      birthRepo = FakeBirthProfileRepository(
        storage: storage,
        serverProfiles: serverProfiles ?? [accountBirthProfile()],
      );
      successCalls = 0;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            secureStorageProvider.overrideWithValue(storage),
            authRepositoryProvider.overrideWithValue(
              FakeAuthRepository(
                storage: storage,
                googleUser: googleTestUser(profileComplete: true, missing: const [], phoneNumber: '+919876543210'),
              ),
            ),
            googleIdTokenSourceProvider.overrideWithValue(FakeGoogleIdTokenSource()),
            birthProfileRepositoryProvider.overrideWithValue(birthRepo),
          ],
          child: MaterialApp(home: LoginScreen(onLoginSuccess: () => successCalls++)),
        ),
      );
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Continue with Google'));
      await tester.tap(find.text('Continue with Google'));
      await tester.pumpAndSettle();
    }

    setUp(() => storage = InMemorySecureStorageService());

    testWidgets('does NOT appear when the device has no guest profiles (regression)', (tester) async {
      await pumpAndSignIn(tester);

      expect(find.text(_dialogTitle), findsNothing);
      expect(find.text('Start Fresh'), findsNothing);
      expect(successCalls, 1);
    });

    testWidgets('does NOT appear when the guest profile is already on the account', (tester) async {
      await LocalGuestBirthProfileService(storage).saveGuestProfile(_guestDto(name: 'Asha Verma'));

      await pumpAndSignIn(tester);

      expect(find.text(_dialogTitle), findsNothing);
      expect(successCalls, 1);
      expect(await storage.read(key: StorageKeys.guestBirthProfile), isNull);
    });

    testWidgets('still appears for a real guest profile not yet on the account', (tester) async {
      await LocalGuestBirthProfileService(storage).saveGuestProfile(_guestDto());

      await pumpAndSignIn(tester);

      expect(find.text(_dialogTitle), findsOneWidget);
      expect(find.textContaining('Ravi Kumar'), findsOneWidget);

      await tester.tap(find.text('Save to Account'));
      await tester.pumpAndSettle();
      expect(birthRepo.migrateCalls, 1);
      expect(successCalls, 1);
    });
  });

  group('Guest data is not left behind', () {
    test('exiting guest mode and logging out both clear the guest profile', () async {
      final storage = InMemorySecureStorageService();
      final notifier = AuthNotifier(
        FakeAuthRepository(storage: storage, googleUser: googleTestUser()),
        storage,
      );
      final guestService = LocalGuestBirthProfileService(storage);

      await notifier.continueAsGuest();
      await guestService.saveGuestProfile(_guestDto());
      await notifier.exitGuestMode();
      expect(await guestService.getGuestProfile(), isNull);

      await guestService.saveGuestProfile(_guestDto());
      await notifier.logout();
      expect(await guestService.getGuestProfile(), isNull);
      notifier.dispose();
    });
  });
}
