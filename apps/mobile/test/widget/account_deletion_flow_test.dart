import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart' hide secureStorageProvider;
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/onboarding/providers/onboarding_provider.dart';
import 'package:astro_mobile/features/onboarding/screens/onboarding_screen.dart';
import 'package:astro_mobile/features/reports/providers/career_report_provider.dart';
import 'package:astro_mobile/features/settings/screens/app_settings_screen.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

class AccountDeletionTestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  bool deleteCalled = false;
  String? lastConfirmation;
  String? lastPassword;
  bool shouldSucceed;
  String? failureError;
  Completer<bool>? deleteCompleter;

  AccountDeletionTestAuthNotifier({
    required UserModel user,
    this.shouldSucceed = true,
    this.failureError,
  }) : super(AuthState.authenticated(user));

  @override
  Future<bool> deleteAccount({String? confirmation, String? password}) async {
    deleteCalled = true;
    lastConfirmation = confirmation;
    lastPassword = password;
    if (deleteCompleter != null) {
      final res = await deleteCompleter!.future;
      if (res) {
        state = AuthState.unauthenticated();
      } else {
        state = state.copyWith(
          isLoading: false,
          errorMessage: failureError ?? 'API deletion failed',
        );
      }
      return res;
    }
    if (shouldSucceed) {
      state = AuthState.unauthenticated();
      return true;
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: failureError ?? 'API deletion failed',
      );
      return false;
    }
  }

  @override
  Future<void> logout() async {
    state = AuthState.unauthenticated();
  }

  @override
  Future<void> continueAsGuest() async {
    state = AuthState.guest();
  }

  @override
  Future<void> exitGuestMode() async {
    state = AuthState.unauthenticated();
  }

  @override
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class TestCareerReportNotifier extends StateNotifier<CareerReportState> implements CareerReportNotifier {
  bool cacheCleared = false;

  TestCareerReportNotifier() : super(const CareerReportState());

  @override
  Future<void> clearAllLocalReportCache() async {
    cacheCleared = true;
    state = const CareerReportState();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class TestOnboardingNotifier extends StateNotifier<bool> implements OnboardingNotifier {
  TestOnboardingNotifier([super.initial = true]);

  @override
  Future<void> checkCompletionStatus() async {}

  @override
  Future<void> completeOnboarding() async {
    state = true;
  }
}

class _TestLocaleNotifier extends LocaleNotifier {
  _TestLocaleNotifier(super.storage, Locale initialLocale) {
    state = initialLocale;
  }
}

Widget _buildTestApp({
  required Widget child,
  required AccountDeletionTestAuthNotifier authNotifier,
  required TestCareerReportNotifier reportNotifier,
  Locale locale = const Locale('en'),
}) {
  final storage = InMemorySecureStorageService();
  return ProviderScope(
    overrides: [
      secureStorageProvider.overrideWithValue(storage),
      localeProvider.overrideWith((ref) => _TestLocaleNotifier(storage, locale)),
      authStateProvider.overrideWith((ref) => authNotifier),
      careerReportNotifierProvider.overrideWith((ref) => reportNotifier),
      onboardingCompletedProvider.overrideWith((ref) => TestOnboardingNotifier(true)),
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

final _testUser = UserModel(
  id: 'usr_del_test_001',
  email: 'deletion-test@astrosushil.com',
  phoneNumber: '+919876543210',
  role: 'USER',
  createdAt: DateTime(2026, 1, 1),
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Mobile Account Deletion Flow Tests', () {
    testWidgets('1. Displays confirmation dialog with comprehensive statutory consequence disclosures (English)', (tester) async {
      final authNotifier = AccountDeletionTestAuthNotifier(user: _testUser);
      final reportNotifier = TestCareerReportNotifier();

      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(_buildTestApp(
        child: const AppSettingsScreen(),
        authNotifier: authNotifier,
        reportNotifier: reportNotifier,
      ));
      await tester.pumpAndSettle();

      // Scroll down to the Danger Zone
      final trigger = find.text('Delete Account & Personal Data');
      await tester.scrollUntilVisible(trigger, 200);
      await tester.pumpAndSettle();
      expect(trigger, findsOneWidget);

      // Tap to open dialog
      await tester.tap(trigger);
      await tester.pumpAndSettle();

      // Verify dialog header and warnings
      expect(find.text('Delete Account & Data?'), findsOneWidget);
      expect(find.textContaining('All active sessions across all devices will be revoked'), findsOneWidget);
      expect(find.textContaining('Future consultation appointments will be cancelled'), findsOneWidget);
      expect(find.textContaining('Course and digital download access will be terminated'), findsOneWidget);
      expect(find.textContaining('In accordance with statutory tax rules, past order invoices remain archived'), findsOneWidget);
      expect(find.textContaining('This action is permanent and cannot be undone'), findsOneWidget);

      // Verify action buttons
      expect(find.widgetWithText(TextButton, 'Cancel'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Permanently Delete'), findsOneWidget);
    });

    testWidgets('2. Cancellation dismisses dialog and leaves account intact without backend invocation', (tester) async {
      final authNotifier = AccountDeletionTestAuthNotifier(user: _testUser);
      final reportNotifier = TestCareerReportNotifier();

      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(_buildTestApp(
        child: const AppSettingsScreen(),
        authNotifier: authNotifier,
        reportNotifier: reportNotifier,
      ));
      await tester.pumpAndSettle();

      final trigger = find.text('Delete Account & Personal Data');
      await tester.scrollUntilVisible(trigger, 200);
      await tester.pumpAndSettle();
      await tester.tap(trigger);
      await tester.pumpAndSettle();

      // Tap Cancel
      final cancelButton = find.widgetWithText(TextButton, 'Cancel');
      await tester.tap(cancelButton);
      await tester.pumpAndSettle();

      // Dialog is gone
      expect(find.text('Delete Account & Data?'), findsNothing);
      // No deletion was called
      expect(authNotifier.deleteCalled, isFalse);
      // Local cache was NOT cleared
      expect(reportNotifier.cacheCleared, isFalse);
      // User is still authenticated on Settings screen
      expect(find.text('Settings & Preferences'), findsOneWidget);
    });

    testWidgets('3. Successful deletion invokes backend with confirmation, clears cache, shows snackbar, and redirects to signed-out screen', (tester) async {
      final authNotifier = AccountDeletionTestAuthNotifier(user: _testUser, shouldSucceed: true);
      final reportNotifier = TestCareerReportNotifier();

      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(_buildTestApp(
        child: const AppSettingsScreen(),
        authNotifier: authNotifier,
        reportNotifier: reportNotifier,
      ));
      await tester.pumpAndSettle();

      final trigger = find.text('Delete Account & Personal Data');
      await tester.scrollUntilVisible(trigger, 200);
      await tester.pumpAndSettle();
      await tester.tap(trigger);
      await tester.pumpAndSettle();

      // Confirm deletion inside the dialog
      final confirmDeleteButton = find.widgetWithText(ElevatedButton, 'Permanently Delete');
      await tester.tap(confirmDeleteButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Verify backend call was made with exact confirmation
      expect(authNotifier.deleteCalled, isTrue);
      expect(authNotifier.lastConfirmation, equals('DELETE'));

      // Verify local report cache was purged
      expect(reportNotifier.cacheCleared, isTrue);

      // Verify success SnackBar is rendered
      expect(find.text('Your account and personal data have been permanently deleted.'), findsOneWidget);

      // Verify navigation redirected to OnboardingScreen (signed out)
      expect(find.byType(OnboardingScreen), findsOneWidget);
    });

    testWidgets('4. API failure keeps user authenticated, shows recoverable error, and does not falsely report success', (tester) async {
      final authNotifier = AccountDeletionTestAuthNotifier(
        user: _testUser,
        shouldSucceed: false,
        failureError: 'Network timeout connecting to deletion service',
      );
      final reportNotifier = TestCareerReportNotifier();

      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(_buildTestApp(
        child: const AppSettingsScreen(),
        authNotifier: authNotifier,
        reportNotifier: reportNotifier,
      ));
      await tester.pumpAndSettle();

      final trigger = find.text('Delete Account & Personal Data');
      await tester.scrollUntilVisible(trigger, 200);
      await tester.pumpAndSettle();
      await tester.tap(trigger);
      await tester.pumpAndSettle();

      // Confirm deletion
      final confirmDeleteButton = find.widgetWithText(ElevatedButton, 'Permanently Delete');
      await tester.tap(confirmDeleteButton);
      await tester.pumpAndSettle();

      // Verify deletion was attempted
      expect(authNotifier.deleteCalled, isTrue);

      // Verify cache was NOT cleared on failure
      expect(reportNotifier.cacheCleared, isFalse);

      // Verify error SnackBar is displayed
      expect(find.text('Network timeout connecting to deletion service'), findsOneWidget);

      // Verify user is NOT on OnboardingScreen
      expect(find.byType(OnboardingScreen), findsNothing);
      // Dialog remains open for retry or cancellation
      expect(find.text('Delete Account & Data?'), findsOneWidget);
    });

    testWidgets('5. In-flight deletion shows loading indicator and prevents duplicate submissions', (tester) async {
      final authNotifier = AccountDeletionTestAuthNotifier(user: _testUser);
      final completer = Completer<bool>();
      authNotifier.deleteCompleter = completer;
      final reportNotifier = TestCareerReportNotifier();

      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(_buildTestApp(
        child: const AppSettingsScreen(),
        authNotifier: authNotifier,
        reportNotifier: reportNotifier,
      ));
      await tester.pumpAndSettle();

      final trigger = find.text('Delete Account & Personal Data');
      await tester.scrollUntilVisible(trigger, 200);
      await tester.pumpAndSettle();
      await tester.tap(trigger);
      await tester.pumpAndSettle();

      // Tap confirm button
      final confirmDeleteButton = find.widgetWithText(ElevatedButton, 'Permanently Delete');
      await tester.tap(confirmDeleteButton);
      await tester.pump(); // Pump frame without settling to observe in-flight loading state

      // Verify loading spinner and message are visible
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Deleting account...'), findsOneWidget);

      // Verify action buttons are disabled to prevent duplicate submissions
      final elevatedBtnWidget = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Permanently Delete'));
      expect(elevatedBtnWidget.onPressed, isNull);

      final textBtnWidget = tester.widget<TextButton>(find.widgetWithText(TextButton, 'Cancel'));
      expect(textBtnWidget.onPressed, isNull);

      // Complete the deletion
      completer.complete(true);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Final state: cache cleared and navigated to Onboarding
      expect(reportNotifier.cacheCleared, isTrue);
      expect(find.byType(OnboardingScreen), findsOneWidget);
    });

    testWidgets('6. Hindi localization displays authentic Devanagari warnings and labels', (tester) async {
      final authNotifier = AccountDeletionTestAuthNotifier(user: _testUser);
      final reportNotifier = TestCareerReportNotifier();

      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(_buildTestApp(
        child: const AppSettingsScreen(),
        authNotifier: authNotifier,
        reportNotifier: reportNotifier,
        locale: const Locale('hi'),
      ));
      await tester.pumpAndSettle();

      // Find Hindi Delete Account button in settings list
      final trigger = find.text('खाता स्थायी रूप से हटाएं (Delete Account)');
      await tester.scrollUntilVisible(trigger, 200);
      await tester.pumpAndSettle();
      expect(trigger, findsOneWidget);
      await tester.tap(trigger);
      await tester.pumpAndSettle();

      // Verify Hindi dialog title
      expect(find.text('खाता एवं डेटा हटाएं?'), findsOneWidget);
      // Verify Hindi statutory consequences
      expect(find.textContaining('वित्तीय एवं कर अनुपालन हेतु पूर्व आर्डर्स का रिकॉर्ड सुरक्षित रहेगा।'), findsOneWidget);
      expect(find.textContaining('सभी डिवाइसों से आपके सक्रिय सत्र समाप्त हो जाएंगे।'), findsOneWidget);
      expect(find.textContaining('भविष्य के सभी परामर्श रद्द कर दिए जाएंगे।'), findsOneWidget);

      // Verify Hindi action buttons
      expect(find.widgetWithText(TextButton, 'रद्द करें'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'स्थायी रूप से हटाएं'), findsOneWidget);
    });
  });
}
