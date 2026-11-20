// Account tab (ProfileScreen): every action is present and tappable, guest
// handling, language switching and sign-out behaviour.
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/core/localization/locale_provider.dart' hide secureStorageProvider;
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/auth/screens/signup_screen.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/screens/birth_profile_list_screen.dart';
import 'package:astro_mobile/features/legal/screens/legal_documents_screen.dart';
import 'package:astro_mobile/features/notifications/screens/notifications_screen.dart';
import 'package:astro_mobile/features/onboarding/screens/onboarding_screen.dart';
import 'package:astro_mobile/features/settings/screens/app_settings_screen.dart';
import 'package:astro_mobile/features/shop/screens/order_history_screen.dart';
import 'package:astro_mobile/features/shop/screens/shipping_addresses_screen.dart';
import 'package:astro_mobile/features/support/screens/help_support_screen.dart';
import 'package:astro_mobile/home/providers/home_provider.dart';
import 'package:astro_mobile/home/screens/profile_screen.dart';

import '../ui_audit/audit_fixtures.dart';

/// Records which session-ending method the Account tab called.
class _RecordingAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _RecordingAuthNotifier(super.state);

  int logoutCalls = 0;
  int exitGuestCalls = 0;

  @override
  Future<void> logout() async {
    logoutCalls++;
    state = AuthState.unauthenticated();
  }

  @override
  Future<void> exitGuestMode() async {
    exitGuestCalls++;
    state = AuthState.unauthenticated();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _Harness {
  final _RecordingAuthNotifier auth;
  _Harness(this.auth);
}

Future<_Harness> _pump(
  WidgetTester tester, {
  AuthState? authState,
  bool noProfile = false,
  int initialTab = 3,
}) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final auth = _RecordingAuthNotifier(authState ?? AuthState.authenticated(makeUser()));
  final overrides = baseOverrides(noProfile: noProfile);
  // baseOverrides() puts authStateProvider at index 2; swap in the
  // recording notifier rather than overriding the provider twice.
  overrides[2] = authStateProvider.overrideWith((ref) => auth);
  overrides.add(localeProvider.overrideWith((ref) => LocaleNotifier(InMemorySecureStorageService())));
  overrides.add(homeTabControllerProvider.overrideWith((ref) => initialTab));

  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: Consumer(
        builder: (context, ref, _) => MaterialApp(
          locale: ref.watch(localeProvider),
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          home: const ProfileScreen(),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return _Harness(auth);
}

ProviderContainer _container(WidgetTester tester) =>
    ProviderScope.containerOf(tester.element(find.byType(ProfileScreen)));

Future<void> _tapKey(WidgetTester tester, String key) async {
  final finder = find.byKey(ValueKey(key));
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
}

void main() {
  group('Account tab (signed in)', () {
    testWidgets('header shows name, phone, email and the active birth profile', (tester) async {
      await _pump(tester);

      expect(find.text('Account'), findsWidgets);
      expect(find.text('seeker'), findsOneWidget);
      expect(find.text('+919876543210'), findsOneWidget);
      expect(find.text('seeker@astrosushil.com'), findsOneWidget);
      expect(find.text(kProfile.name), findsOneWidget);
      expect(find.byKey(const ValueKey('account-change-profile')), findsOneWidget);

      // Old fake/jargon labels are gone.
      expect(find.text('AUTHENTICATED USER'), findsNothing);
      expect(find.textContaining('48-72'), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('every account row is present and opens the right screen', (tester) async {
      await _pump(tester);

      final pushed = <String, Type>{
        'account-row-birth-profiles': BirthProfileListScreen,
        'account-row-orders': OrderHistoryScreen,
        'account-row-addresses': ShippingAddressesScreen,
        'account-row-notifications': NotificationsScreen,
        'account-row-settings': AppSettingsScreen,
        'account-row-help': HelpSupportScreen,
        'account-row-legal': LegalDocumentsScreen,
      };

      for (final entry in pushed.entries) {
        await _tapKey(tester, entry.key);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
        expect(find.byType(entry.value), findsOneWidget, reason: '${entry.key} should open ${entry.value}');
        Navigator.of(tester.element(find.byType(entry.value))).pop();
        await tester.pumpAndSettle();
        expect(find.byType(ProfileScreen), findsOneWidget);
      }
      expect(tester.takeException(), isNull);
    });

    testWidgets('rows that duplicate bottom tabs or live elsewhere are not listed', (tester) async {
      await _pump(tester);
      // Reports and bookings have their own bottom tabs; downloads are under
      // My orders; courses under Home -> Courses -> My Learning.
      for (final key in ['account-row-reports', 'account-row-bookings', 'account-row-downloads', 'account-row-courses']) {
        expect(find.byKey(ValueKey(key)), findsNothing, reason: key);
      }
      expect(find.text('My reports'), findsNothing);
      expect(find.text('My bookings'), findsNothing);
    });

    testWidgets('"Change" opens the profile switcher and selects a profile', (tester) async {
      await _pump(tester);

      await _tapKey(tester, 'account-change-profile');
      await tester.pumpAndSettle();
      expect(find.text('Switch Profile'), findsOneWidget);
      expect(find.text('Add New Profile'), findsOneWidget);

      await tester.tap(find.byKey(ValueKey('account-switch-${kProfile2.id}')));
      await tester.pumpAndSettle();
      expect(_container(tester).read(selectedBirthProfileIdProvider), kProfile2.id);
    });

    testWidgets('no birth profile shows an "Add" action instead of a blank header', (tester) async {
      await _pump(tester, noProfile: true);
      expect(find.text('None yet'), findsOneWidget);
      expect(find.byKey(const ValueKey('account-add-profile')), findsOneWidget);
    });

    testWidgets('language row switches the app to Hindi', (tester) async {
      await _pump(tester);

      await _tapKey(tester, 'account-row-language');
      await tester.pumpAndSettle();
      expect(find.text('Select App Language'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('account-lang-hi')));
      await tester.pumpAndSettle();

      expect(_container(tester).read(localeProvider).languageCode, 'hi');
      // Labels follow the new language.
      expect(find.text('मेरे ऑर्डर'), findsOneWidget);
      expect(find.text('खाता'), findsWidgets);
    });

    testWidgets('sign out uses logout(), resets to the Home tab and opens onboarding', (tester) async {
      final h = await _pump(tester);

      expect(find.text('Sign Out'), findsOneWidget);
      await _tapKey(tester, 'account-signout');
      await tester.pumpAndSettle();
      expect(find.text('Sign out of your account?'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('account-signout-confirm')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      expect(h.auth.logoutCalls, 1);
      expect(h.auth.exitGuestCalls, 0);
      expect(find.byType(OnboardingScreen), findsOneWidget);
      final container = ProviderScope.containerOf(tester.element(find.byType(OnboardingScreen)));
      expect(container.read(homeTabControllerProvider), 0);
    });

    testWidgets('cancelling sign out keeps the user signed in', (tester) async {
      final h = await _pump(tester);
      await _tapKey(tester, 'account-signout');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(h.auth.logoutCalls, 0);
      expect(find.byType(ProfileScreen), findsOneWidget);
    });
  });

  group('Account tab (guest / signed out)', () {
    testWidgets('guest sees a sign-in card, no account-only rows, and "Exit guest mode"', (tester) async {
      final h = await _pump(tester, authState: AuthState.guest(), noProfile: true);

      expect(find.byKey(const ValueKey('account-signin-card')), findsOneWidget);
      expect(find.textContaining('as a guest'), findsOneWidget);
      for (final key in [
        'account-row-orders',
        'account-row-addresses',
      ]) {
        expect(find.byKey(ValueKey(key)), findsNothing, reason: key);
      }
      for (final key in [
        'account-row-birth-profiles',
        'account-row-notifications',
        'account-row-language',
        'account-row-settings',
        'account-row-help',
        'account-row-legal',
      ]) {
        expect(find.byKey(ValueKey(key)), findsOneWidget, reason: key);
      }

      // Bug fix: guests used to see "Sign Out" although they never signed in.
      expect(find.text('Sign Out'), findsNothing);
      expect(find.text('Exit guest mode'), findsOneWidget);

      await _tapKey(tester, 'account-signout');
      await tester.pumpAndSettle();
      expect(find.textContaining('guest birth details'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('account-signout-confirm')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(h.auth.exitGuestCalls, 1);
      expect(h.auth.logoutCalls, 0);
      expect(find.byType(OnboardingScreen), findsOneWidget);
    });

    testWidgets('sign-in card buttons open Login and Create account', (tester) async {
      await _pump(tester, authState: AuthState.guest(), noProfile: true);

      await _tapKey(tester, 'account-signin');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(LoginScreen), findsOneWidget);
      Navigator.of(tester.element(find.byType(LoginScreen))).pop();
      await tester.pumpAndSettle();

      await _tapKey(tester, 'account-create');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(SignupScreen), findsOneWidget);
    });

    testWidgets('signed-out (not guest) users get no sign-out button', (tester) async {
      await _pump(tester, authState: AuthState.unauthenticated(), noProfile: true);
      expect(find.byKey(const ValueKey('account-signin-card')), findsOneWidget);
      expect(find.byKey(const ValueKey('account-signout')), findsNothing);
      expect(find.text('Account'), findsWidgets);
    });
  });
}
