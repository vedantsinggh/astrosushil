import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/models/dasha_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/astrology/screens/divisional_charts_screen.dart';
import 'package:astro_mobile/features/astrology/screens/vimshottari_dasha_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';

void main() {
  final sampleProfile = BirthProfileModel(
    id: 'test_profile_p2',
    userId: 'user_p2',
    name: 'Aarav Sharma',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  AstroChartModel createSampleChart(String varga) {
    return const AstroChartModel(
      calculationVersion: '1.1.0',
      providerName: 'SwissEphemeris',
      providerVersion: '2.10',
      normalizedTime: NormalizedTimeModel(
        utcIsoString: '1990-05-15T09:00:00.000Z',
        julianDayUT: 2448027.875,
        timezoneOffsetMinutes: 330,
      ),
      config: ChartConfigModel(
        zodiacType: 'SIDEREAL',
        ayanamsa: 'LAHIRI',
        houseSystem: 'WHOLE_SIGN',
        nodeCalculation: 'MEAN_NODE',
        planetaryCalculationMode: 'GEOCENTRIC',
      ),
      ascendant: AscendantModel(
        longitude: 145.2,
        rashiIndex: 5,
        rashiName: 'Simha',
        degreeInRashi: 25.2,
        nakshatraIndex: 11,
        nakshatraName: 'Purva Phalguni',
        pada: 4,
        nakshatraLord: 'Venus',
      ),
      planets: [
        PlanetModel(
          planet: 'SUN',
          longitude: 30.5,
          latitude: 0.0,
          speedLongitude: 0.98,
          isRetrograde: false,
          rashiIndex: 2,
          rashiName: 'Vrishabha',
          degreeInRashi: 0.5,
          nakshatraIndex: 3,
          nakshatraName: 'Krittika',
          pada: 2,
          nakshatraLord: 'Sun',
        ),
        PlanetModel(
          planet: 'MOON',
          longitude: 275.4,
          latitude: 4.5,
          speedLongitude: 12.5,
          isRetrograde: false,
          rashiIndex: 10,
          rashiName: 'Makara',
          degreeInRashi: 5.4,
          nakshatraIndex: 21,
          nakshatraName: 'Uttara Ashadha',
          pada: 3,
          nakshatraLord: 'Sun',
        ),
        PlanetModel(
          planet: 'JUPITER',
          longitude: 95.8,
          latitude: 0.2,
          speedLongitude: -0.05,
          isRetrograde: true,
          rashiIndex: 4,
          rashiName: 'Karka',
          degreeInRashi: 5.8,
          nakshatraIndex: 8,
          nakshatraName: 'Pushya',
          pada: 1,
          nakshatraLord: 'Saturn',
        ),
      ],
      houses: [],
    );
  }

  DashaTreeModel createSampleDashaTree() {
    final now = DateTime.now();
    return DashaTreeModel(
      system: 'VIMSHOTTARI',
      totalSpanYears: 120,
      mahadashas: [
        DashaPeriodModel(
          planet: 'SUN',
          level: 'MAHADASHA',
          levelNumber: 1,
          order: 1,
          startDate: now.subtract(const Duration(days: 365 * 10)),
          endDate: now.subtract(const Duration(days: 365 * 4)),
          durationYears: 6.0,
          subPeriods: [],
        ),
        DashaPeriodModel(
          planet: 'MOON',
          level: 'MAHADASHA',
          levelNumber: 1,
          order: 2,
          startDate: now.subtract(const Duration(days: 365 * 4)),
          endDate: now.add(const Duration(days: 365 * 6)),
          durationYears: 10.0,
          isActive: true,
          subPeriods: [
            DashaPeriodModel(
              planet: 'MOON',
              level: 'ANTARDASHA',
              levelNumber: 2,
              order: 1,
              startDate: now.subtract(const Duration(days: 365 * 4)),
              endDate: now.subtract(const Duration(days: 365 * 3)),
              durationYears: 0.83,
              subPeriods: [],
            ),
            DashaPeriodModel(
              planet: 'MARS',
              level: 'ANTARDASHA',
              levelNumber: 2,
              order: 2,
              startDate: now.subtract(const Duration(days: 100)),
              endDate: now.add(const Duration(days: 150)),
              durationYears: 0.58,
              isActive: true,
              subPeriods: [
                DashaPeriodModel(
                  planet: 'MARS',
                  level: 'PRATYANTARDASHA',
                  levelNumber: 3,
                  order: 1,
                  startDate: now.subtract(const Duration(days: 100)),
                  endDate: now.subtract(const Duration(days: 80)),
                  durationYears: 0.05,
                ),
                DashaPeriodModel(
                  planet: 'RAHU',
                  level: 'PRATYANTARDASHA',
                  levelNumber: 3,
                  order: 2,
                  startDate: now.subtract(const Duration(days: 80)),
                  endDate: now.add(const Duration(days: 30)),
                  durationYears: 0.15,
                  isActive: true,
                ),
              ],
            ),
          ],
        ),
        DashaPeriodModel(
          planet: 'MARS',
          level: 'MAHADASHA',
          levelNumber: 1,
          order: 3,
          startDate: now.add(const Duration(days: 365 * 6)),
          endDate: now.add(const Duration(days: 365 * 13)),
          durationYears: 7.0,
          subPeriods: [],
        ),
      ],
      activeDasha: ActiveDashaInfo(
        targetDate: now,
        mahadasha: ActiveDashaPeriodSummary(
          level: 1,
          lord: 'MOON',
          startDate: now.subtract(const Duration(days: 365 * 4)),
          endDate: now.add(const Duration(days: 365 * 6)),
          durationYears: 10.0,
          nominalYears: 10.0,
        ),
        antardasha: ActiveDashaPeriodSummary(
          level: 2,
          lord: 'MARS',
          startDate: now.subtract(const Duration(days: 100)),
          endDate: now.add(const Duration(days: 150)),
          durationYears: 0.58,
          nominalYears: 0.58,
        ),
        path: ['MOON', 'MARS', 'RAHU'],
        description: 'Moon-Mars-Rahu',
      ),
    );
  }

  Widget createTestWidget({
    required Widget child,
    BirthProfileModel? profile,
    Map<String, AstroChartModel>? vargaCharts,
    DashaTreeModel? dashaTree,
    Object? errorToThrow,
  }) {
    return ProviderScope(
      overrides: [
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => _MockBirthProfilesNotifier(profile != null ? [profile] : []),
        ),
        if (profile != null)
          selectedBirthProfileIdProvider.overrideWith((ref) => profile.id),
        if (errorToThrow != null) ...[
          divisionalChartProvider.overrideWith((ref, query) => Future.error(errorToThrow)),
          vimshottariDashaForProfileProvider.overrideWith((ref, profile) => Future.error(errorToThrow)),
        ] else ...[
          divisionalChartProvider.overrideWith((ref, query) {
            final chart = vargaCharts?[query.vargaType.toUpperCase()] ?? createSampleChart(query.vargaType);
            return Future.value(chart);
          }),
          if (dashaTree != null)
            vimshottariDashaForProfileProvider.overrideWith((ref, p) => Future.value(dashaTree)),
        ],
      ],
      child: MaterialApp(
        theme: ThemeData(useMaterial3: true),
        home: child,
      ),
    );
  }

  group('DivisionalChartsScreen Widget Tests', () {
    testWidgets('Renders empty state when no birth profile is available', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const DivisionalChartsScreen(),
        profile: null,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('No Active Birth Profile'), findsOneWidget);
      expect(find.text('Add Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders priority selector pills, North Indian chart, and planetary table', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const DivisionalChartsScreen(initialVarga: 'D1'),
        profile: sampleProfile,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Aarav Sharma'), findsOneWidget);
      expect(find.text('D1 Rashi'), findsOneWidget);
      expect(find.text('D9 Navamsha'), findsOneWidget);
      expect(find.text('D10 Dashamsha'), findsOneWidget);
      expect(find.text('D60 Shashtiamsha'), findsOneWidget);
      expect(find.text('All Vargas (16)'), findsOneWidget);

      expect(find.text('Planetary Placements in D1'), findsOneWidget);
      expect(find.text('Sun'), findsOneWidget);
      expect(find.text('Moon'), findsOneWidget);
      expect(find.text('Jupiter'), findsOneWidget);
    });

    testWidgets('Switching selector to D9 updates chart title and fetches D9 placements', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const DivisionalChartsScreen(initialVarga: 'D1'),
        profile: sampleProfile,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      await tester.tap(find.text('D9 Navamsha'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('Planetary Placements in D9'), findsOneWidget);
    });

    testWidgets('Opens All 16 Vargas modal sheet and selects D7', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const DivisionalChartsScreen(),
        profile: sampleProfile,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      await tester.ensureVisible(find.text('All Vargas (16)'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('All Vargas (16)'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.text('Saptamsha (सप्तांश)'), findsOneWidget);
      await tester.tap(find.text('Saptamsha (सप्तांश)'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.text('Planetary Placements in D7'), findsOneWidget);
    });

    testWidgets('Handles API calculation error and displays retry button', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const DivisionalChartsScreen(),
        profile: sampleProfile,
        errorToThrow: Exception('Ephemeris engine unavailable'),
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Failed to calculate D1 chart. Tap to retry.'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('Renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      final viewports = [
        const Size(320, 640),
        const Size(360, 780),
        const Size(390, 844),
        const Size(414, 896),
      ];

      for (final size in viewports) {
        tester.view.physicalSize = size * 2;
        tester.view.devicePixelRatio = 2.0;

        await tester.pumpWidget(createTestWidget(
          child: const DivisionalChartsScreen(),
          profile: sampleProfile,
        ));
        await tester.pump(Duration.zero);
        await tester.pump(const Duration(milliseconds: 150));

        expect(tester.takeException(), isNull, reason: 'Failed at viewport size $size');
      }

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  group('VimshottariDashaScreen Widget Tests', () {
    testWidgets('Renders empty state when no active birth profile is selected', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const VimshottariDashaScreen(),
        profile: null,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('No Active Birth Profile'), findsOneWidget);
      expect(find.text('Add Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders active period card and 120-year timeline list', (tester) async {
      final tree = createSampleDashaTree();
      await tester.pumpWidget(createTestWidget(
        child: const VimshottariDashaScreen(),
        profile: sampleProfile,
        dashaTree: tree,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('ACTIVE PERIOD'), findsOneWidget);
      expect(find.text('Current Dasha Influence'), findsOneWidget);
      expect(find.text('120-Year Mahadasha Timeline'), findsOneWidget);

      expect(find.text('Sun Mahadasha'), findsOneWidget);
      expect(find.text('Moon Mahadasha'), findsOneWidget);
      expect(find.text('Mars Mahadasha'), findsOneWidget);
    });

    testWidgets('Expands Mahadasha accordion to reveal Antardashas and Pratyantardashas', (tester) async {
      final tree = createSampleDashaTree();
      await tester.pumpWidget(createTestWidget(
        child: const VimshottariDashaScreen(),
        profile: sampleProfile,
        dashaTree: tree,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      // Scroll to and tap Moon Mahadasha to expand Antardashas
      await tester.scrollUntilVisible(find.text('Moon Mahadasha'), 100);
      await tester.tap(find.text('Moon Mahadasha'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('Moon – Mars'), findsOneWidget);

      // Scroll to and tap Moon – Mars Antardasha to expand Pratyantardashas
      await tester.scrollUntilVisible(find.text('Moon – Mars'), 100);
      await tester.tap(find.text('Moon – Mars'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('Mars – Rahu'), findsOneWidget);
    });

    testWidgets('Handles dasha calculation error cleanly with retry action', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const VimshottariDashaScreen(),
        profile: sampleProfile,
        errorToThrow: Exception('Database timeout calculating dasha'),
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Failed to calculate Dasha timeline. Tap to retry.'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('Renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      final tree = createSampleDashaTree();
      final viewports = [
        const Size(320, 640),
        const Size(360, 780),
        const Size(390, 844),
        const Size(414, 896),
      ];

      for (final size in viewports) {
        tester.view.physicalSize = size * 2;
        tester.view.devicePixelRatio = 2.0;

        await tester.pumpWidget(createTestWidget(
          child: const VimshottariDashaScreen(),
          profile: sampleProfile,
          dashaTree: tree,
        ));
        await tester.pump(Duration.zero);
        await tester.pump(const Duration(milliseconds: 150));

        expect(tester.takeException(), isNull, reason: 'Failed at viewport size $size');
      }

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });
}

class _MockBirthProfilesNotifier extends StateNotifier<BirthProfilesState>
    implements BirthProfilesNotifier {
  _MockBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  Future<void> fetchProfiles() async {}

  @override
  Future<BirthProfileModel?> createProfile(dynamic dto) async => null;

  @override
  Future<BirthProfileModel?> migrateGuestProfile(dynamic dto) async => null;
}
