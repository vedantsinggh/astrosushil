import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/home/screens/home_screen.dart';
import 'package:astro_mobile/home/data/mock_home_repository.dart';
import 'package:astro_mobile/home/providers/home_provider.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

void main() {
  final testUser = UserModel(
    id: 'usr_test_123',
    email: 'seeker@astrosushil.com',
    role: 'USER',
    createdAt: DateTime(2026, 1, 1),
  );

  Widget buildTestWidget({
    required AuthState authState,
  }) {
    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        authStateProvider.overrideWith((ref) => TestAuthNotifier(authState)),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        home: const HomeScreen(),
      ),
    );
  }

  group('HomeScreen Widget Tests', () {
    testWidgets('Renders Home Screen header and user name for authenticated user', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Hello, seeker'), findsOneWidget);
      expect(find.text('Explore your cosmic journey'), findsOneWidget);
    });

    testWidgets('Renders Hero Astrology Card with CTA', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Your Cosmic Journey'), findsOneWidget);
      expect(find.text('View Your Chart'), findsOneWidget);
    });

    testWidgets('Renders Quick Access section and cards', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Quick Access'), findsOneWidget);
      expect(find.text('Birth Chart'), findsWidgets);
      expect(find.text('Planets'), findsOneWidget);
      expect(find.text('Rashi Bhavishya'), findsWidgets);
      expect(find.text('Vastu'), findsWidgets);
    });

    testWidgets('Renders Gupta Nadi flagship premium card with badge', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Gupta Nadi'), findsOneWidget);
      expect(find.text('FLAGSHIP PREMIUM'), findsOneWidget);
      expect(find.text('Explore Gupta Nadi'), findsOneWidget);
    });

    testWidgets('Renders Personalized Report cards (Career, Marriage, Childbirth)', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Personalized Reports'), findsWidgets);
      expect(find.text('Career Report'), findsOneWidget);
      expect(find.text('Marriage & Relationship Report'), findsOneWidget);
      expect(find.text('Childbirth Report'), findsOneWidget);
    });

    testWidgets('Renders Daily Rashi Bhavishya and Vastu preview cards', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(find.text('Daily Forecast'), findsOneWidget);
      expect(find.text('Mesha (Aries)'), findsOneWidget);
      expect(find.text('Vastu Guidance'), findsOneWidget);
    });

    testWidgets('Bottom Navigation allows switching between Home, Reports, and Profile tabs', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      // Initially on Home tab (Index 0)
      expect(find.text('Explore your cosmic journey'), findsOneWidget);

      // Tap Reports tab (Index 1)
      await tester.tap(find.text('Reports'));
      await tester.pumpAndSettle();
      expect(find.text('YOUR ASTRO REPORTS'), findsOneWidget);

      // Tap Profile tab (Index 2)
      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();
      expect(find.text('seeker@astrosushil.com'), findsOneWidget);
      expect(find.text('My Birth Profiles'), findsOneWidget);
      expect(find.text('Logout'), findsOneWidget);
    });

    testWidgets('Responsive layout renders without overflow on small device screens', (WidgetTester tester) async {
      // Set small device screen constraints (e.g. 320x568 - iPhone SE 1st gen)
      tester.view.physicalSize = const Size(320 * 2, 568 * 2);
      tester.view.devicePixelRatio = 2.0;

      await tester.pumpWidget(buildTestWidget(authState: AuthState.authenticated(testUser)));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);

      // Reset test viewport
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  group('Mock Data Isolation Tests', () {
    test('MockHomeRepository provides deterministic UI mock data', () {
      final repo = MockHomeRepository();
      final prediction = repo.getDailyPrediction();
      final reports = repo.getPersonalizedReports();

      expect(prediction.rashiName, contains('Mesha'));
      expect(reports.length, equals(3));
      expect(reports[0].title, equals('Career Report'));
      expect(reports[1].title, equals('Marriage & Relationship Report'));
      expect(reports[2].title, equals('Childbirth Report'));
    });
  });
}

class TestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  TestAuthNotifier(super.state);

  @override
  Future<void> checkSession() async {}

  @override
  Future<bool> login(String email, String password) async => true;

  @override
  Future<bool> register(String email, String password) async => true;

  @override
  Future<void> logout() async {
    state = AuthState.unauthenticated();
  }

  @override
  void clearError() {}
}
