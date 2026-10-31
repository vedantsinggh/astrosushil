import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/features/astrology/screens/matchmaking_screen.dart';
import 'package:astro_mobile/features/astrology/screens/planets_screen.dart';
import 'package:astro_mobile/features/astrology/screens/ashtakavarga_screen.dart';
import 'package:astro_mobile/features/astrology/widgets/astrology_explanation_card.dart';
import 'package:astro_mobile/features/astrology/widgets/kundli_chart_widget.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/models/ashtakavarga_model.dart';
import 'package:astro_mobile/features/astrology/models/dasha_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

void main() {
  final profile1 = BirthProfileModel(
    id: 'profile-001',
    userId: 'user-001',
    name: 'Aarav Sharma',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );

  final profile2 = BirthProfileModel(
    id: 'profile-002',
    userId: 'user-001',
    name: 'Diya Patel',
    dateOfBirth: '1992-09-20',
    timeOfBirth: '10:15:00',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    placeName: 'Mumbai, India',
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );

  Widget createTestWidget(
    Widget child, {
    Locale locale = const Locale('en'),
    List<Override> overrides = const [],
  }) {
    return ProviderScope(
      overrides: [
        birthProfilesListNotifierProvider.overrideWith((ref) => TestBirthProfilesNotifier([profile1, profile2])),
        selectedBirthProfileProvider.overrideWith((ref) => profile1),
        ...overrides,
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
        home: Scaffold(body: child),
      ),
    );
  }

  group('Phase 2: Astrology Engine Parity & Data Reliability Tests', () {
    testWidgets('1. KundliChartWidget does NOT render fabricated fallback planets when chart is null', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(
              child: KundliChartWidget(
                chart: null,
                size: 300,
              ),
            ),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 200));

      // Previously hardcoded fake planet tokens must NOT exist in the widget tree
      expect(find.textContaining('Ve 5'), findsNothing);
      expect(find.textContaining('Mo 6'), findsNothing);
      expect(find.textContaining('Ju 8'), findsNothing);
      expect(find.textContaining('SaR 12'), findsNothing);
    });

    testWidgets('2. PlanetsScreen renders honest empty state when profile has no chart data (no fake rows)', (tester) async {
      final file = File('test/fixtures_live.json');
      final fixtures = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
      final fullChart = AstroChartModel.fromJson(fixtures['chart_d1'] as Map<String, dynamic>);
      final emptyPlanetsChart = AstroChartModel(
        calculationVersion: fullChart.calculationVersion,
        providerName: fullChart.providerName,
        providerVersion: fullChart.providerVersion,
        normalizedTime: fullChart.normalizedTime,
        config: fullChart.config,
        ascendant: fullChart.ascendant,
        planets: const [],
        houses: fullChart.houses,
      );

      await tester.pumpWidget(createTestWidget(
        PlanetsScreen(profile: profile1),
        overrides: [
          astrologyChartForProfileProvider(profile1).overrideWith((ref) => Future.value(emptyPlanetsChart)),
        ],
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Must display honest empty state, not mock fallback planet rows
      expect(find.text('Data not available'), findsOneWidget);
      expect(find.text('Planets'), findsOneWidget);
      expect(find.textContaining('No planetary placements calculated for Aarav Sharma.'), findsOneWidget);
    });

    testWidgets('3. Matchmaking prevents self-matching and warns user when same profile is selected', (tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 1400));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(createTestWidget(
        const MatchmakingScreen(),
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Set both personA and personB to profile1 via StateController
      final container = ProviderScope.containerOf(tester.element(find.byType(MatchmakingScreen)));
      container.read(matchmakingPersonAProvider.notifier).state = profile1;
      container.read(matchmakingPersonBProvider.notifier).state = profile1;
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Warning should be displayed
      expect(find.text('Please select two different birth profiles to evaluate compatibility.'), findsOneWidget);

      // Button should be disabled (cannot calculate)
      final calcBtn = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(calcBtn.onPressed, isNull);
    });

    testWidgets('4. Ashtakavarga displays dash for missing pinda values instead of misleading 0', (tester) async {
      final file = File('test/fixtures_live.json');
      final fixtures = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
      final fullAshtakavarga = AshtakavargaResultModel.fromJson(fixtures['ashtakavarga'] as Map<String, dynamic>);

      // Create model with empty pinda map to test missing data handling
      final emptyPindaModel = AshtakavargaResultModel(
        bav: fullAshtakavarga.bav,
        sav: fullAshtakavarga.sav,
        shodhana: const {},
        pinda: const {},
      );

      await tester.pumpWidget(createTestWidget(
        const AshtakavargaScreen(),
        overrides: [
          ashtakavargaForProfileProvider(profile1).overrideWith((ref) => Future.value(emptyPindaModel)),
        ],
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Tap Tab 3 (Shodhana & Pindas)
      await tester.tap(find.text('Shodhana & Pindas'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Must find dashes '—' instead of '0' for missing pinda fields
      expect(find.text('—'), findsWidgets);
    });

    testWidgets('5. AstrologyExplanationCard displays bilingual educational guidance', (tester) async {
      // Test English
      await tester.pumpWidget(createTestWidget(
        const AstrologyExplanationCard(
          title: 'Understanding Your Kundli',
          whatIsText: 'Your Kundli is a snapshot of the celestial sky at the exact moment and location of your birth.',
          howToReadText: 'House 1 represents your Ascendant.',
          initiallyExpanded: true,
        ),
        locale: const Locale('en'),
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('Understanding Your Kundli'), findsOneWidget);
      expect(find.text('What does this mean?'), findsWidgets);
      expect(find.text('Your Kundli is a snapshot of the celestial sky at the exact moment and location of your birth.'), findsOneWidget);
      expect(find.text('How to read this'), findsOneWidget);
      expect(find.text('House 1 represents your Ascendant.'), findsOneWidget);
      expect(find.text('Limitations & Guidance'), findsOneWidget);

      // Test Hindi
      await tester.pumpWidget(createTestWidget(
        const AstrologyExplanationCard(
          title: 'अपनी कुण्डली को समझें',
          whatIsText: 'आपकी कुण्डली आपके जन्म के सटीक समय और स्थान पर आकाश का एक खगोलीय नक्शा है।',
          howToReadText: 'भाव 1 आपका लग्न दर्शाता है।',
          initiallyExpanded: true,
        ),
        locale: const Locale('hi'),
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('अपनी कुण्डली को समझें'), findsOneWidget);
      expect(find.text('इसका क्या अर्थ है?'), findsWidgets);
      expect(find.text('आपकी कुण्डली आपके जन्म के सटीक समय और स्थान पर आकाश का एक खगोलीय नक्शा है।'), findsOneWidget);
      expect(find.text('इसे कैसे समझें'), findsOneWidget);
      expect(find.text('सीमाएं एवं मार्गदर्शन'), findsOneWidget);
    });

    testWidgets('6. DashaPeriodModel invalid dates do not fabricate DateTime.now() active periods', (tester) async {
      final invalidPeriod = DashaPeriodModel.fromJson({
        'planet': 'JUPITER',
        'level': 'MAHADASHA',
        'startDateIso': 'INVALID_DATE',
        'endDateIso': 'INVALID_DATE',
      });

      expect(invalidPeriod.startDate.millisecondsSinceEpoch, equals(0));
      expect(invalidPeriod.endDate.millisecondsSinceEpoch, equals(0));
      expect(invalidPeriod.isCurrent(), isFalse);
      expect(invalidPeriod.formattedDateRange, equals('Dates not available'));
    });
  });
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
