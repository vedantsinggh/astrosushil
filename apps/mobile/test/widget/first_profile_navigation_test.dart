// Regression: after creating the FIRST birth profile during sign-up the user
// was left on the birth chart as the root route (no back button, system back
// exited the app). The chart must always sit on top of the main shell.
import 'dart:convert';
import 'dart:io';

import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/astrology/screens/birth_chart_screen.dart';
import 'package:astro_mobile/features/auth/data/google_id_token_source.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/birth_profile/data/location_repository.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/models/location_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/birth_profile/providers/location_provider.dart';
import 'package:astro_mobile/features/birth_profile/screens/birth_profile_list_screen.dart';
import 'package:astro_mobile/features/birth_profile/screens/create_birth_profile_screen.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/consultations/providers/consultation_provider.dart';
import 'package:astro_mobile/features/consultations/services/consultation_service.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/home/screens/home_screen.dart';
import 'package:astro_mobile/home/widgets/home_bottom_navigation.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/shared/widgets/astro_nav_bar.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/google_auth_fakes.dart';

/// Server-side profile list that grows when a profile is created.
class _CreatingBirthProfileRepository extends FakeBirthProfileRepository {
  final List<BirthProfileModel> created = [];

  _CreatingBirthProfileRepository({required super.storage, required List<BirthProfileModel> initial})
      : super(serverProfiles: initial);

  @override
  Future<List<BirthProfileModel>> getProfiles({bool forceRefresh = false}) async =>
      List.of(serverProfiles);

  @override
  Future<BirthProfileModel> createProfile(CreateBirthProfileDto dto) async {
    final profile = BirthProfileModel(
      id: 'created-${created.length + 1}',
      userId: 'user-google-1',
      name: dto.name,
      dateOfBirth: dto.dateOfBirth,
      timeOfBirth: dto.timeOfBirth,
      latitude: dto.latitude,
      longitude: dto.longitude,
      timezone: dto.timezone,
      placeName: dto.placeName,
      isResolved: true,
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
    );
    created.add(profile);
    serverProfiles.insert(0, profile);
    return profile;
  }
}

class _FakeLocationRepository extends LocationRepository {
  _FakeLocationRepository(SecureStorageService storage) : super(apiClient: ApiClient(storageService: storage));

  @override
  Future<List<LocationModel>> searchLocations(String query, {int limit = 10}) async => const [
        LocationModel(
          id: 'delhi',
          name: 'New Delhi',
          displayName: 'New Delhi, Delhi, India',
          country: 'India',
          countryCode: 'IN',
          state: 'Delhi',
          latitude: 28.6139,
          longitude: 77.2090,
          timezone: 'Asia/Kolkata',
        ),
      ];
}

class _FakeConsultationService extends ConsultationService {
  _FakeConsultationService(SecureStorageService storage) : super(apiClient: ApiClient(storageService: storage));

  @override
  Future<List<ConsultationOfferingModel>> fetchCatalog() async => const [];

  @override
  Future<List<AppointmentSlotModel>> fetchSlots({required String consultationId, required String date}) async =>
      const [];

  @override
  Future<List<ConsultationBookingModel>> getMyBookings() async => const [];
}

void main() {
  late AstroChartModel chart;
  late InMemorySecureStorageService storage;
  late FakeAuthRepository authRepo;
  late _CreatingBirthProfileRepository profileRepo;

  setUpAll(() {
    final fixtures = jsonDecode(File('test/fixtures_live.json').readAsStringSync()) as Map<String, dynamic>;
    chart = AstroChartModel.fromJson(fixtures['chart_d1'] as Map<String, dynamic>);
  });

  Future<void> pumpApp(WidgetTester tester, {required Widget home, List<BirthProfileModel>? initial}) async {
    // Wide enough that the existing "Create Birth Profile" dialog title row
    // (icon + text, no Flexible) fits with the wide test font.
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    storage = InMemorySecureStorageService();
    authRepo = FakeAuthRepository(
      storage: storage,
      googleUser: googleTestUser(),
      userAfterPhoneLinked: googleTestUser(profileComplete: true, missing: const [], phoneNumber: '+919876543210'),
    );
    profileRepo = _CreatingBirthProfileRepository(storage: storage, initial: [...?initial]);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(authRepo),
          googleIdTokenSourceProvider.overrideWithValue(FakeGoogleIdTokenSource()),
          birthProfileRepositoryProvider.overrideWithValue(profileRepo),
          locationRepositoryProvider.overrideWithValue(_FakeLocationRepository(storage)),
          consultationServiceProvider.overrideWithValue(_FakeConsultationService(storage)),
          userReportsProvider.overrideWith((ref) => Future.value([])),
          astrologyChartForProfileProvider.overrideWith((ref, profile) => Future.value(chart)),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          home: home,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  /// Fills the create form through the real UI (adaptive pickers, place search).
  Future<void> fillAndSubmitForm(WidgetTester tester, String name) async {
    final form = find.byType(CreateBirthProfileScreen);
    expect(form, findsOneWidget);
    await tester.enterText(find.descendant(of: form, matching: find.byType(TextFormField)).first, name);

    final confirm = defaultTargetPlatform == TargetPlatform.iOS ? 'Done' : 'OK';
    await tester.ensureVisible(find.byKey(const Key('birth_date_field')));
    await tester.tap(find.byKey(const Key('birth_date_field')));
    await tester.pumpAndSettle();
    await tester.tap(find.text(confirm));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('birth_time_field')));
    await tester.tap(find.byKey(const Key('birth_time_field')));
    await tester.pumpAndSettle();
    await tester.tap(find.text(confirm));
    await tester.pumpAndSettle();

    final place = find.widgetWithText(TextField, 'Search city or place (e.g. Delhi, London)');
    await tester.ensureVisible(place);
    await tester.enterText(place, 'Delhi');
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('location_item_delhi')));
    await tester.tap(find.byKey(const Key('location_item_delhi')));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Create Birth Chart'));
    await tester.tap(find.text('Create Birth Chart'));
    await tester.pumpAndSettle();
  }

  void expectShell(WidgetTester tester) {
    expect(find.byType(BirthChartScreen), findsNothing);
    expect(find.byType(CreateBirthProfileScreen), findsNothing);
    expect(find.byType(HomeScreen), findsOneWidget);
    expect(find.byType(HomeBottomNavigation), findsOneWidget);
    expect(Navigator.of(tester.element(find.byType(HomeScreen))).canPop(), isFalse,
        reason: 'the shell is the root route');
  }

  /// Google sign-in from the root login screen (as reached from onboarding),
  /// completes the missing phone, accepts the "create profile" prompt and
  /// saves the first profile.
  Future<void> signUpAndCreateFirstProfile(WidgetTester tester) async {
    await pumpApp(tester, home: const LoginScreen());

    await tester.ensureVisible(find.text('Continue with Google'));
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    // Complete profile (Google account without a phone number).
    await tester.enterText(find.byKey(const Key('complete_profile_phone')), '9876543210');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('complete_profile_code')), '123456');
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();

    // No profiles yet: the app offers to create one.
    expect(find.text('Create Birth Profile'), findsOneWidget);
    await tester.tap(find.text('Create Profile'));
    await tester.pumpAndSettle();

    // The form itself sits above the shell, so it is never a dead end.
    expect(Navigator.of(tester.element(find.byType(CreateBirthProfileScreen))).canPop(), isTrue);

    await fillAndSubmitForm(tester, 'Asha Verma');

    expect(find.byType(BirthChartScreen), findsOneWidget);
    expect(Navigator.of(tester.element(find.byType(BirthChartScreen))).canPop(), isTrue,
        reason: 'the chart must not be the root route');
    expect(find.byType(AstroBackButton), findsOneWidget);
  }

  testWidgets('first profile after sign-up: chart back button returns to Home', (tester) async {
    await signUpAndCreateFirstProfile(tester);

    await tester.tap(find.byType(AstroBackButton));
    await tester.pumpAndSettle();

    expectShell(tester);
    expect(tester.takeException(), isNull);
  }, variant: const TargetPlatformVariant({TargetPlatform.android, TargetPlatform.iOS}));

  testWidgets('first profile after sign-up: system back returns to Home and does not exit',
      (tester) async {
    await signUpAndCreateFirstProfile(tester);

    final handled = await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    expect(handled, isTrue, reason: 'back must pop to Home, not close the app');
    expectShell(tester);
    expect(tester.takeException(), isNull);
  }, variant: const TargetPlatformVariant({TargetPlatform.android, TargetPlatform.iOS}));

  testWidgets('first profile after sign-up: the new profile is the active profile', (tester) async {
    await signUpAndCreateFirstProfile(tester);

    await tester.tap(find.byType(AstroBackButton));
    await tester.pumpAndSettle();
    expectShell(tester);

    final container = ProviderScope.containerOf(tester.element(find.byType(HomeScreen)));
    final active = container.read(selectedBirthProfileProvider);
    expect(profileRepo.created, hasLength(1));
    expect(active?.id, profileRepo.created.single.id);
    expect(active?.name, 'Asha Verma');
  }, variant: const TargetPlatformVariant({TargetPlatform.android, TargetPlatform.iOS}));

  testWidgets('guest form opened as the root route still lands on Home with the chart on top',
      (tester) async {
    // Defensive path: if the form is ever the root route, saving must not
    // leave the chart as a dead-end root.
    await pumpApp(tester, home: const CreateBirthProfileScreen());

    await fillAndSubmitForm(tester, 'Guest Seeker');

    expect(find.byType(BirthChartScreen), findsOneWidget);
    expect(Navigator.of(tester.element(find.byType(BirthChartScreen))).canPop(), isTrue);

    expect(await tester.binding.handlePopRoute(), isTrue);
    await tester.pumpAndSettle();
    expectShell(tester);
    final container = ProviderScope.containerOf(tester.element(find.byType(HomeScreen)));
    expect(container.read(selectedBirthProfileProvider)?.name, 'Guest Seeker');
    expect(tester.takeException(), isNull);
  }, variant: const TargetPlatformVariant({TargetPlatform.android, TargetPlatform.iOS}));

  testWidgets('adding a second profile from the profile list returns to the list', (tester) async {
    await pumpApp(
      tester,
      initial: [accountBirthProfile()],
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BirthProfileListScreen()),
              ),
              child: const Text('Open profiles'),
            ),
          ),
        ),
      ),
    );
    // Signed-in user with one profile already on the account.
    await authRepo.signInWithGoogle('token');
    final container = ProviderScope.containerOf(tester.element(find.text('Open profiles')));
    await container.read(authStateProvider.notifier).checkSession();
    await tester.pumpAndSettle();

    await tester.tap(find.text('Open profiles'));
    await tester.pumpAndSettle();
    expect(find.byType(BirthProfileListScreen), findsOneWidget);

    await tester.ensureVisible(find.text('New Profile'));
    await tester.tap(find.text('New Profile'));
    await tester.pumpAndSettle();

    await fillAndSubmitForm(tester, 'Ravi Verma');

    // "Create Birth Chart" shows the new chart above the list...
    expect(find.byType(BirthChartScreen), findsOneWidget);
    expect(find.byType(HomeScreen), findsNothing, reason: 'the stack must not be reset');

    // ...and back returns to the list, which now has both profiles.
    await tester.tap(find.byType(AstroBackButton));
    await tester.pumpAndSettle();
    expect(find.byType(BirthChartScreen), findsNothing);
    expect(find.byType(CreateBirthProfileScreen), findsNothing);
    expect(find.byType(BirthProfileListScreen), findsOneWidget);
    expect(find.text('Ravi Verma'), findsWidgets);
    expect(find.text('Asha Verma'), findsWidgets);
    expect(tester.takeException(), isNull);
  }, variant: const TargetPlatformVariant({TargetPlatform.android, TargetPlatform.iOS}));
}
