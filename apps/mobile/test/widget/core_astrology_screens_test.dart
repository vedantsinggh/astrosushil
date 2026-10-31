import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/features/astrology/screens/birth_chart_screen.dart';
import 'package:astro_mobile/features/astrology/screens/planets_screen.dart';
import 'package:astro_mobile/features/astrology/screens/planet_detail_screen.dart';
import 'package:astro_mobile/features/astrology/screens/rashi_bhavishya_screen.dart';
import 'package:astro_mobile/features/astrology/screens/vastu_screen.dart';
import 'package:astro_mobile/features/astrology/screens/vastu_detail_screen.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/models/rashi_bhavishya_model.dart';
import 'package:astro_mobile/features/astrology/models/vastu_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/astrology/providers/rashi_bhavishya_provider.dart';
import 'package:astro_mobile/features/astrology/providers/vastu_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

void main() {
  late AstroChartModel canonicalChartD1;

  final testProfile = BirthProfileModel(
    id: 'profile-123',
    userId: 'user-123',
    name: 'Rahul Sharma',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );

  const mockCat = VastuCategoryModel(
    id: 1,
    slug: 'main-entrance',
    name: 'Main Entrance (Simhadwara)',
    sanskritName: 'Simhadwara',
    description: 'Primary gateway of cosmic Prana energy.',
    idealDirection: 'North, East, or North-East',
    element: 'Air / Space',
    iconName: 'door',
  );

  const mockGuidance = VastuGuidanceModel(
    categoryId: 1,
    categorySlug: 'main-entrance',
    categoryName: 'Main Entrance (Simhadwara)',
    idealDirection: 'North, East, or North-East',
    alternativeDirections: ['East'],
    forbiddenDirections: ['South-West'],
    element: 'Air / Space',
    rulingPlanet: 'Sun / Jupiter',
    keyPrinciples: ['Keep well lit and clean.'],
    dos: ['Clean regularly'],
    donts: ['Avoid clutter'],
    remedies: ['Place a Swastika symbol'],
  );

  setUpAll(() {
    final file = File('test/fixtures_live.json');
    final fixtures = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    canonicalChartD1 = AstroChartModel.fromJson(fixtures['chart_d1'] as Map<String, dynamic>);
  });

  Widget createTestableWidget(Widget child, {List<Override> extraOverrides = const []}) {
    return ProviderScope(
      overrides: [
        astrologyChartForProfileProvider(testProfile).overrideWith((ref) => Future.value(canonicalChartD1)),
        vastuCategoriesProvider.overrideWith((ref) => Future.value([mockCat])),
        vastuGuidanceProvider(1).overrideWith((ref) => Future.value([mockGuidance])),
        todayRashiBhavishyaProvider(1).overrideWith((ref) => Future.value(RashiBhavishyaModel.fromJson({}))),
        ...extraOverrides,
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
        home: child,
      ),
    );
  }

  group('Core Astrology UI Widget Tests', () {
    testWidgets('BirthChartScreen renders profile summary and chart tab by default', (tester) async {
      await tester.pumpWidget(createTestableWidget(BirthChartScreen(profile: testProfile)));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Your Birth Chart'), findsOneWidget);
      expect(find.text('Rahul Sharma'), findsOneWidget);
      expect(find.text('1990-05-15  •  14:30:00'), findsOneWidget);
      expect(find.text('Kundli'), findsOneWidget);
      expect(find.text('•  North Indian Style'), findsOneWidget);
      expect(find.text('At a Glance'), findsOneWidget);
      expect(find.text('Key Placements'), findsOneWidget);
      expect(find.text('Your chart is a map of your potential.'), findsOneWidget);
    });

    testWidgets('BirthChartScreen switches tabs correctly (Planets, Houses, Nakshatra)', (tester) async {
      await tester.pumpWidget(createTestableWidget(BirthChartScreen(profile: testProfile)));
      await tester.pump(const Duration(milliseconds: 300));

      // Tap Planets tab
      await tester.tap(find.text('Planets'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Planetary Positions'), findsOneWidget);

      // Tap Houses tab
      await tester.tap(find.text('Houses'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('12 Houses (Bhavas)'), findsOneWidget);
      expect(find.text('1st House • Tanu Bhava'), findsOneWidget);

      // Tap Nakshatra tab
      await tester.tap(find.text('Nakshatra'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Nakshatra Profile'), findsOneWidget);
      expect(find.text('BIRTH NAKSHATRA (JANMA NAKSHATRA)'), findsOneWidget);

      // Tap Chart tab back
      await tester.tap(find.text('Chart'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Kundli'), findsOneWidget);
    });

    testWidgets('PlanetsScreen renders scannable list of planetary positions', (tester) async {
      await tester.pumpWidget(createTestableWidget(PlanetsScreen(profile: testProfile)));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Planets'), findsOneWidget);
      expect(find.text('See where each planet was positioned at the time of your birth.'), findsOneWidget);
      expect(find.text('Sun'), findsWidgets);
      expect(find.text('Moon'), findsWidgets);
    });

    testWidgets('PlanetDetailScreen renders celestial visual and placement sections', (tester) async {
      await tester.pumpWidget(createTestableWidget(
        const PlanetDetailScreen(
          planetName: 'Sun',
          signName: 'Leo',
          degree: '18°24\'',
          houseNumber: 5,
        ),
      ));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('SUN'), findsWidgets);
      expect(find.text('Leo • 18°24\''), findsOneWidget);
      expect(find.text('House 5'), findsOneWidget);
      expect(find.text('Overview'), findsOneWidget);
      expect(find.text('Placement'), findsOneWidget);
      expect(find.text('Meaning'), findsOneWidget);
      expect(find.text('About the Sun'), findsOneWidget);
    });

    testWidgets('RashiBhavishyaScreen renders Rashi selector and prediction categories', (tester) async {
      await tester.pumpWidget(createTestableWidget(const RashiBhavishyaScreen()));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.textContaining('Rashi Bhavishya'), findsOneWidget);
      expect(find.textContaining('Aries'), findsWidgets);
      expect(find.text('Today\'s Outlook'), findsOneWidget);
      expect(find.text('Category Guidance'), findsOneWidget);
    });

    testWidgets('VastuScreen and VastuDetailScreen render spatial guidance', (tester) async {
      await tester.pumpWidget(createTestableWidget(const VastuScreen()));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Vastu Shastra'), findsOneWidget);
      expect(find.textContaining('Main Entrance'), findsWidgets);

      await tester.pumpWidget(createTestableWidget(const VastuDetailScreen(category: mockCat)));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Simhadwara'), findsOneWidget);
      expect(find.text('Directional Placement'), findsOneWidget);
    });
  });
}
