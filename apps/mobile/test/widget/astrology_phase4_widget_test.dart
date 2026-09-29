import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/astrology/models/gochara_model.dart';
import 'package:astro_mobile/features/astrology/models/ashtakavarga_model.dart';
import 'package:astro_mobile/features/astrology/models/strength_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/astrology/screens/gochara_screen.dart';
import 'package:astro_mobile/features/astrology/screens/ashtakavarga_screen.dart';
import 'package:astro_mobile/features/astrology/screens/shadbala_screen.dart';
import 'package:astro_mobile/features/astrology/screens/bhava_bala_screen.dart';

void main() {
  final testProfile = BirthProfileModel(
    id: 'test-profile-p4',
    userId: 'user-p4',
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

  const sampleGochara = TransitSnapshotModel(
    calculationVersion: '1.1.0',
    utcIso: '2026-09-29T00:00:00.000Z',
    localIso: '2026-09-29T05:30:00.000+05:30',
    timezone: 'Asia/Kolkata',
    planets: {
      'SUN': TransitPlanetPositionModel(
        planet: 'SUN',
        longitude: 162.45,
        latitude: 0.0,
        speedLongitude: 0.985,
        isRetrograde: false,
        isCombust: false,
        rashiIndex: 6,
        rashiName: 'Virgo',
        rashiLord: 'MERCURY',
        degreeInRashi: 12.45,
        house: 6,
        nakshatraIndex: 13,
        nakshatraName: 'Hasta',
        nakshatraLord: 'MOON',
        pada: 1,
        degreeInNakshatra: 0.45,
      ),
      'MOON': TransitPlanetPositionModel(
        planet: 'MOON',
        longitude: 45.2,
        latitude: 2.1,
        speedLongitude: 13.2,
        isRetrograde: false,
        isCombust: false,
        rashiIndex: 2,
        rashiName: 'Taurus',
        rashiLord: 'VENUS',
        degreeInRashi: 15.2,
        house: 2,
        nakshatraIndex: 4,
        nakshatraName: 'Rohini',
        nakshatraLord: 'MOON',
        pada: 2,
        degreeInNakshatra: 1.86,
      ),
      'MARS': TransitPlanetPositionModel(
        planet: 'MARS',
        longitude: 110.0,
        latitude: 1.0,
        speedLongitude: 0.6,
        isRetrograde: false,
        isCombust: false,
        rashiIndex: 4,
        rashiName: 'Cancer',
        rashiLord: 'MOON',
        degreeInRashi: 20.0,
        house: 4,
        nakshatraIndex: 9,
        nakshatraName: 'Ashlesha',
        nakshatraLord: 'MERCURY',
        pada: 2,
        degreeInNakshatra: 6.66,
      ),
    },
    transitToMoon: [
      TransitToMoonRelationshipModel(
        transitPlanet: 'SUN',
        transitSignIndex: 6,
        transitSignName: 'Virgo',
        natalMoonSignIndex: 2,
        natalMoonSignName: 'Taurus',
        signDistance: 5,
        houseFromMoon: 5,
        transitNakshatra: 'Hasta',
        bavScore: 5,
      ),
    ],
    transitToLagna: [
      TransitToLagnaRelationshipModel(
        transitPlanet: 'SUN',
        transitSignIndex: 6,
        transitSignName: 'Virgo',
        natalLagnaSignIndex: 1,
        natalLagnaSignName: 'Aries',
        signDistance: 6,
        houseFromLagna: 6,
        angularSeparation: 162.45,
      ),
    ],
    ashtakavargaTransit: [
      TransitAshtakavargaDetailModel(
        planet: 'SUN',
        transitSignIndex: 6,
        transitSignName: 'Virgo',
        bavPoints: 5,
        savPoints: 31,
        isBavFavorable: true,
        isSavFavorable: true,
      ),
    ],
    gocharaKakshas: [
      GocharaKakshaDetailModel(
        transitPlanet: 'SUN',
        transitSignIndex: 6,
        transitSignName: 'Virgo',
        degreeInSign: 12.45,
        kakshaIndex: 4,
        kakshaRuler: 'SUN',
        startDegree: 11.25,
        endDegree: 15.0,
        hasNatalBindu: true,
        description: 'Sun transit in Sun Kaksha',
      ),
    ],
  );

  const sampleAshtakavarga = AshtakavargaResultModel(
    sav: SarvashtakavargaModel(
      signs: {1: 30, 2: 28, 3: 32, 4: 25, 5: 29, 6: 31, 7: 27, 8: 26, 9: 34, 10: 24, 11: 28, 12: 23},
      signList: [30, 28, 32, 25, 29, 31, 27, 26, 34, 24, 28, 23],
      byPlanet: {},
      grandTotal: 337,
    ),
    bav: {
      'SUN': BhinnashtakavargaModel(
        planet: 'SUN',
        signs: {1: 4, 2: 5, 3: 4, 4: 3, 5: 6, 6: 5, 7: 3, 8: 4, 9: 5, 10: 3, 11: 4, 12: 2},
        signList: [4, 5, 4, 3, 6, 5, 3, 4, 5, 3, 4, 2],
        prastara: {},
        totalPoints: 48,
      ),
      'JUPITER': BhinnashtakavargaModel(
        planet: 'JUPITER',
        signs: {1: 5, 2: 6, 3: 5, 4: 4, 5: 5, 6: 6, 7: 4, 8: 5, 9: 6, 10: 4, 11: 3, 12: 3},
        signList: [5, 6, 5, 4, 5, 6, 4, 5, 6, 4, 3, 3],
        prastara: {},
        totalPoints: 56,
      ),
    },
    shodhana: {
      'SUN': ShodhanaModel(
        planet: 'SUN',
        trikonaReduced: [1, 2, 1, 0, 3, 2, 0, 1, 2, 0, 1, 0],
        ekadhipatyaReduced: [1, 1, 1, 0, 3, 2, 0, 1, 2, 0, 1, 0],
        totalTrikonaPoints: 13,
        totalEkadhipatyaPoints: 12,
      ),
    },
    pinda: {
      'SUN': ShodhyaPindaModel(
        planet: 'SUN',
        rashiPinda: 72,
        grahaPinda: 45,
        shodhyaPinda: 117,
      ),
    },
  );

  const sampleStrength = ComprehensiveStrengthModel(
    shadbala: ShadbalaReportModel(
      planets: {
        'SUN': PlanetShadbalaModel(
          planet: 'SUN',
          totalShashtiamsas: 435.5,
          totalRupas: 7.26,
          sthanaBala: SthanaBalaBreakdownModel(
            uchchaBala: 45.0,
            saptavargajaBala: 90.0,
            ojhayugmaBala: 15.0,
            kendradiBala: 30.0,
            drekkanaBala: 10.0,
            total: 190.0,
          ),
          digBala: 52.5,
          kalaBala: KalaBalaBreakdownModel(
            nathonnathaBala: 48.0,
            pakshaBala: 35.0,
            tribhagaBala: 20.0,
            varaBala: 0.0,
            horaBala: 0.0,
            ayanaBala: 45.0,
            yuddhaBala: 0.0,
            total: 148.0,
          ),
          cheshtaBala: 25.0,
          naisargikaBala: 60.0,
          drikBala: -40.0,
          minimumRequirement: 390.0,
          minimumRequirementRupas: 6.5,
          ratio: 1.116,
          isStrong: true,
          rank: 1,
        ),
      },
      summary: [
        PlanetShadbalaModel(
          planet: 'SUN',
          totalShashtiamsas: 435.5,
          totalRupas: 7.26,
          sthanaBala: SthanaBalaBreakdownModel(
            uchchaBala: 45.0,
            saptavargajaBala: 90.0,
            ojhayugmaBala: 15.0,
            kendradiBala: 30.0,
            drekkanaBala: 10.0,
            total: 190.0,
          ),
          digBala: 52.5,
          kalaBala: KalaBalaBreakdownModel(
            nathonnathaBala: 48.0,
            pakshaBala: 35.0,
            tribhagaBala: 20.0,
            varaBala: 0.0,
            horaBala: 0.0,
            ayanaBala: 45.0,
            yuddhaBala: 0.0,
            total: 148.0,
          ),
          cheshtaBala: 25.0,
          naisargikaBala: 60.0,
          drikBala: -40.0,
          minimumRequirement: 390.0,
          minimumRequirementRupas: 6.5,
          ratio: 1.116,
          isStrong: true,
          rank: 1,
        ),
      ],
    ),
    bhavaBala: BhavaBalaReportModel(
      houses: [
        HouseBhavaBalaModel(
          houseNumber: 1,
          sign: 'Aries',
          rashiIndex: 1,
          lord: 'MARS',
          bhavadhipatiBala: 420.0,
          bhavaDigBala: 30.0,
          bhavaDrishtiBala: 15.0,
          bhavaOccupantBala: 60.0,
          totalShashtiamsas: 525.0,
          totalRupas: 8.75,
          rank: 1,
        ),
        HouseBhavaBalaModel(
          houseNumber: 2,
          sign: 'Taurus',
          rashiIndex: 2,
          lord: 'VENUS',
          bhavadhipatiBala: 390.0,
          bhavaDigBala: 40.0,
          bhavaDrishtiBala: 10.0,
          bhavaOccupantBala: 0.0,
          totalShashtiamsas: 440.0,
          totalRupas: 7.33,
          rank: 2,
        ),
      ],
    ),
  );

  Widget createTestWidget(Widget child, {BirthProfileModel? profile}) {
    return ProviderScope(
      overrides: [
        selectedBirthProfileProvider.overrideWith((ref) => profile),
        if (profile != null) ...[
          gocharaForProfileProvider(profile).overrideWith(
            (ref) => sampleGochara,
          ),
          ashtakavargaForProfileProvider(profile).overrideWith(
            (ref) => sampleAshtakavarga,
          ),
          strengthForProfileProvider(profile).overrideWith(
            (ref) => sampleStrength,
          ),
        ],
      ],
      child: MaterialApp(
        theme: ThemeData(useMaterial3: true),
        home: child,
      ),
    );
  }

  group('GocharaScreen Widget Tests', () {
    testWidgets('Renders empty state when no profile selected', (tester) async {
      await tester.pumpWidget(createTestWidget(const GocharaScreen(), profile: null));
      await tester.pumpAndSettle();

      expect(find.text('No Active Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders transit positions, Moon/Lagna relationships & Ashtakavarga metrics', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(const GocharaScreen(), profile: testProfile));
      await tester.pumpAndSettle();

      expect(find.text('Gochara (गोचर / Transits)'), findsOneWidget);
      expect(find.text('Real-Time Sidereal Transits'), findsOneWidget);
      expect(find.text('Transit SUN'), findsOneWidget);
      expect(find.text('Virgo'), findsWidgets);
      expect(find.text('H-5'), findsWidgets); // Moon relationship & position
      expect(find.text('H-6'), findsWidgets); // Lagna relationship & house
      expect(find.text('Transit Intelligence & Kaksha'), findsOneWidget);
      expect(find.text('Current Planetary Positions'), findsOneWidget);
    });

    testWidgets('Handles API calculation error and displays retry button', (tester) async {
      final errorWidget = ProviderScope(
        overrides: [
          selectedBirthProfileProvider.overrideWith((ref) => testProfile),
          gocharaForProfileProvider(testProfile).overrideWith(
            (ref) => Future.error(Exception('Ephemeris transit calculation timeout')),
          ),
        ],
        child: const MaterialApp(home: GocharaScreen()),
      );

      await tester.pumpWidget(errorWidget);
      await tester.pumpAndSettle();

      expect(find.text('Failed to calculate transit snapshot'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('Renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      const viewports = [
        Size(320, 640),
        Size(360, 780),
        Size(390, 844),
        Size(414, 896),
      ];

      for (final size in viewports) {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;

        await tester.pumpWidget(createTestWidget(const GocharaScreen(), profile: testProfile));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed at viewport size $size');
      }

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  group('AshtakavargaScreen Widget Tests', () {
    testWidgets('Renders empty state when no profile selected', (tester) async {
      await tester.pumpWidget(createTestWidget(const AshtakavargaScreen(), profile: null));
      await tester.pumpAndSettle();

      expect(find.text('No Active Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders SAV total hero, 12-sign grid, and switches to BAV & Shodhana tabs', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(const AshtakavargaScreen(), profile: testProfile));
      await tester.pumpAndSettle();

      expect(find.text('Ashtakavarga (अष्टकवर्ग)'), findsOneWidget);
      expect(find.text('337 Bindus'), findsOneWidget);
      expect(find.text('Sign-Wise SAV Distribution'), findsOneWidget);

      // Tap BAV Tab
      await tester.tap(find.text('Bhinnashtakavarga (BAV)'));
      await tester.pumpAndSettle();

      expect(find.text('SUN BAV Total'), findsOneWidget);
      expect(find.text('48 Benefic Bindus'), findsOneWidget);

      // Tap Shodhana & Pindas Tab
      await tester.tap(find.text('Shodhana & Pindas'));
      await tester.pumpAndSettle();

      expect(find.text('Shodhya Pinda Summary'), findsOneWidget);
      expect(find.text('117'), findsOneWidget);
      expect(find.text('Shodhana (Reductions)'), findsOneWidget);
    });

    testWidgets('Handles API calculation error and displays retry button', (tester) async {
      final errorWidget = ProviderScope(
        overrides: [
          selectedBirthProfileProvider.overrideWith((ref) => testProfile),
          ashtakavargaForProfileProvider(testProfile).overrideWith(
            (ref) => Future.error(Exception('Ashtakavarga computation error')),
          ),
        ],
        child: const MaterialApp(home: AshtakavargaScreen()),
      );

      await tester.pumpWidget(errorWidget);
      await tester.pumpAndSettle();

      expect(find.text('Failed to calculate Ashtakavarga'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('Renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      const viewports = [
        Size(320, 640),
        Size(360, 780),
        Size(390, 844),
        Size(414, 896),
      ];

      for (final size in viewports) {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;

        await tester.pumpWidget(createTestWidget(const AshtakavargaScreen(), profile: testProfile));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed at viewport size $size');
      }

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  group('ShadbalaScreen Widget Tests', () {
    testWidgets('Renders empty state when no active profile', (tester) async {
      await tester.pumpWidget(createTestWidget(const ShadbalaScreen(), profile: null));
      await tester.pumpAndSettle();

      expect(find.text('No Active Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders 6-fold breakdown, Virupa/Rupa metrics, and ranking table', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(const ShadbalaScreen(), profile: testProfile));
      await tester.pumpAndSettle();

      expect(find.text('Shadbala (षड्बल)'), findsOneWidget);
      expect(find.text('SUN Shadbala'), findsOneWidget);
      expect(find.text('435.5 Virupas'), findsOneWidget);
      expect(find.text('7.26 Rupas'), findsOneWidget);
      expect(find.text('STRONG (≥1.0)'), findsOneWidget);
      expect(find.text('Six-Fold Strength Components'), findsOneWidget);
      expect(find.text('1. Sthana Bala (Positional)'), findsOneWidget);
      expect(find.text('2. Dig Bala (Directional)'), findsOneWidget);
      expect(find.text('3. Kala Bala (Temporal)'), findsOneWidget);
      expect(find.text('Shadbala Planetary Ranking'), findsOneWidget);
    });

    testWidgets('Handles API calculation error and displays retry button', (tester) async {
      final errorWidget = ProviderScope(
        overrides: [
          selectedBirthProfileProvider.overrideWith((ref) => testProfile),
          activeProfileStrengthProvider.overrideWith(
            (ref) => Future.error(Exception('Shadbala algorithm failure')),
          ),
        ],
        child: const MaterialApp(home: ShadbalaScreen()),
      );

      await tester.pumpWidget(errorWidget);
      await tester.pumpAndSettle();

      expect(find.text('Failed to calculate Shadbala'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('Renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      const viewports = [
        Size(320, 640),
        Size(360, 780),
        Size(390, 844),
        Size(414, 896),
      ];

      for (final size in viewports) {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;

        await tester.pumpWidget(createTestWidget(const ShadbalaScreen(), profile: testProfile));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed at viewport size $size');
      }

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  group('BhavaBalaScreen Widget Tests', () {
    testWidgets('Renders empty state when no active profile', (tester) async {
      await tester.pumpWidget(createTestWidget(const BhavaBalaScreen(), profile: null));
      await tester.pumpAndSettle();

      expect(find.text('No Active Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders 12-house selector, 4-component breakdown, and potency table', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(const BhavaBalaScreen(), profile: testProfile));
      await tester.pumpAndSettle();

      expect(find.text('Bhava Bala (भावबल)'), findsOneWidget);
      expect(find.text('1st (Tanu) Bhava'), findsOneWidget);
      expect(find.text('525.0 V'), findsWidgets);
      expect(find.text('8.75 Rupas'), findsWidgets);
      expect(find.text('Bhava Strength Breakdown'), findsOneWidget);
      expect(find.text('1. Bhavadhipati Bala (Lord MARS)'), findsOneWidget);
      expect(find.text('12 Houses Potency Summary'), findsOneWidget);

      // Select House 2
      await tester.tap(find.text('H-2').first);
      await tester.pumpAndSettle();

      expect(find.text('2nd (Dhana) Bhava'), findsOneWidget);
      expect(find.text('440.0 V'), findsWidgets);
      expect(find.text('7.33 Rupas'), findsWidgets);
    });

    testWidgets('Handles API calculation error and displays retry button', (tester) async {
      final errorWidget = ProviderScope(
        overrides: [
          selectedBirthProfileProvider.overrideWith((ref) => testProfile),
          activeProfileStrengthProvider.overrideWith(
            (ref) => Future.error(Exception('Bhava Bala algorithm failure')),
          ),
        ],
        child: const MaterialApp(home: BhavaBalaScreen()),
      );

      await tester.pumpWidget(errorWidget);
      await tester.pumpAndSettle();

      expect(find.text('Failed to calculate Bhava Bala'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('Renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      const viewports = [
        Size(320, 640),
        Size(360, 780),
        Size(390, 844),
        Size(414, 896),
      ];

      for (final size in viewports) {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;

        await tester.pumpWidget(createTestWidget(const BhavaBalaScreen(), profile: testProfile));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed at viewport size $size');
      }

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });
}
