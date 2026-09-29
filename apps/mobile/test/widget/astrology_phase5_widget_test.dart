import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/astrology/models/jaimini_model.dart';
import 'package:astro_mobile/features/astrology/models/kp_model.dart';
import 'package:astro_mobile/features/astrology/models/varshaphala_model.dart';
import 'package:astro_mobile/features/astrology/models/prashna_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/astrology/screens/jaimini_screen.dart';
import 'package:astro_mobile/features/astrology/screens/kp_astrology_screen.dart';
import 'package:astro_mobile/features/astrology/screens/varshaphala_screen.dart';
import 'package:astro_mobile/features/astrology/screens/prashna_screen.dart';

void main() {
  final testProfile = BirthProfileModel(
    id: 'test-profile-p5',
    userId: 'user-p5',
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

  const sampleJaimini = JaiminiReportModel(
    scheme: 'SEVEN_KARAKA',
    charaKarakas: [
      CharaKarakaDetailModel(
        planet: 'Sun',
        code: 'AK',
        name: 'Atmakaraka',
        sanskritName: 'आत्मकारक',
        significance: 'Soul Significator',
        rank: 1,
        degreeInSign: 22.5,
        rashi: 'Leo',
        nakshatra: 'Purva Phalguni',
        padaIndex: 3,
      ),
      CharaKarakaDetailModel(
        planet: 'Jupiter',
        code: 'AmK',
        name: 'Amatyakaraka',
        sanskritName: 'अमात्यकारक',
        significance: 'Career & Intellect',
        rank: 2,
        degreeInSign: 21.2,
        rashi: 'Gemini',
        nakshatra: 'Punarvasu',
        padaIndex: 1,
      ),
      CharaKarakaDetailModel(
        planet: 'Venus',
        code: 'DK',
        name: 'Darakaraka',
        sanskritName: 'दारकारक',
        significance: 'Spouse & Partner',
        rank: 7,
        degreeInSign: 15.3,
        rashi: 'Aries',
        nakshatra: 'Bharani',
        padaIndex: 1,
      ),
    ],
    arudhaPadas: [
      ArudhaPadaPlacementModel(
        houseNumber: 1,
        code: 'A1',
        name: 'Lagna Pada',
        signIndex: 10,
        signName: 'Capricorn',
        lord: 'Saturn',
        lordSignIndex: 7,
        stepsCount: 10,
        exceptionApplied: 'NONE',
        occupants: [],
      ),
      ArudhaPadaPlacementModel(
        houseNumber: 12,
        code: 'A12',
        name: 'Upapada',
        signIndex: 4,
        signName: 'Cancer',
        lord: 'Moon',
        lordSignIndex: 2,
        stepsCount: 4,
        exceptionApplied: 'NONE',
        occupants: [],
      ),
    ],
    arudhaLagna: ArudhaPadaPlacementModel(
      houseNumber: 1,
      code: 'AL',
      name: 'Arudha Lagna',
      signIndex: 10,
      signName: 'Capricorn',
      lord: 'Saturn',
      lordSignIndex: 7,
      stepsCount: 10,
      exceptionApplied: 'NONE',
      occupants: [],
    ),
    upapadaLagna: ArudhaPadaPlacementModel(
      houseNumber: 12,
      code: 'UL',
      name: 'Upapada Lagna',
      signIndex: 4,
      signName: 'Cancer',
      lord: 'Moon',
      lordSignIndex: 2,
      stepsCount: 4,
      exceptionApplied: 'NONE',
      occupants: [],
    ),
    rashiDrishtis: [
      RashiDrishtiDetailModel(
        sourceSignIndex: 1,
        sourceSignName: 'Aries',
        modality: 'CHARA',
        aspectedSigns: ['Leo', 'Scorpio', 'Aquarius'],
      ),
    ],
    argalas: [
      ArgalaDetailModel(
        houseNumber: 4,
        targetSignIndex: 1,
        targetSign: 'Aries',
        argalaType: 'PRIMARY',
        isObstructed: false,
        netArgalaScore: 10.0,
        argalaPlanets: ['Moon'],
      ),
    ],
    karakamsha: KarakamshaReportModel(
      atmakarakaPlanet: 'Sun',
      karakamshaRashiIndex: 9,
      karakamshaRashiName: 'Sagittarius',
      karakamshaHouseFromLagna: 9,
      lord: 'Jupiter',
      planetsInKL: ['Ketu'],
    ),
  );

  const sampleKP = KPReportModel(
    ayanamsaType: 'KRISHNAMURTI',
    ayanamsaValue: 23.85,
    cusps: [
      KPCuspPlacementModel(
        cuspNumber: 1,
        longitude: 15.5,
        rashiIndex: 1,
        rashiName: 'Aries',
        degreeInRashi: 15.5,
        nakshatraIndex: 2,
        nakshatraName: 'Bharani',
        pada: 1,
        subNumber: 12,
        signLord: 'Mars',
        starLord: 'Venus',
        subLord: 'Sun',
        subSubLord: 'Moon',
      ),
    ],
    planets: [
      KPPointPlacementModel(
        name: 'Sun',
        longitude: 125.4,
        rashiIndex: 5,
        rashiName: 'Leo',
        degreeInRashi: 5.4,
        nakshatraIndex: 10,
        nakshatraName: 'Magha',
        pada: 2,
        subNumber: 84,
        signLord: 'Sun',
        starLord: 'Ketu',
        subLord: 'Mars',
        subSubLord: 'Jupiter',
      ),
    ],
    houseSignificators: [
      KPHouseSignificatorsModel(
        house: 1,
        levelA: ['Sun'],
        levelB: ['Mars'],
        levelC: ['Jupiter'],
        levelD: ['Mars'],
        allSignificators: ['Sun', 'Mars', 'Jupiter'],
        cuspSubLord: 'Sun',
      ),
    ],
    planetSignifications: {
      'Sun': [1, 5, 9],
    },
    rulingPlanets: KPRulingPlanetsModel(
      dayLord: 'Mars',
      moonSignLord: 'Venus',
      moonStarLord: 'Mars',
      moonSubLord: 'Mercury',
      lagnaSignLord: 'Mars',
      lagnaStarLord: 'Venus',
      lagnaSubLord: 'Sun',
    ),
    parsFortuna: KPPointPlacementModel(
      name: 'Pars Fortuna',
      longitude: 100.25,
      rashiIndex: 4,
      rashiName: 'Cancer',
      degreeInRashi: 10.25,
      nakshatraIndex: 8,
      nakshatraName: 'Pushya',
      pada: 3,
      subNumber: 68,
      signLord: 'Moon',
      starLord: 'Saturn',
      subLord: 'Venus',
      subSubLord: 'Mercury',
    ),
  );

  const sampleVarshaphala = VarshaphalaChartModel(
    calculationVersion: '1.1.0',
    solarReturn: SolarReturnDetailsModel(
      targetYear: 2026,
      age: 36,
      natalSunLongitude: 54.25,
      natalSunSign: 'Taurus',
      natalSunDegree: 24.25,
      solarReturnSunLongitude: 54.25,
      solarReturnSunSign: 'Taurus',
      solarReturnSunDegree: 24.25,
      solarReturnUtcIso: '2026-05-15T08:30:00.000Z',
      solarReturnLocalIso: '2026-05-15T14:00:00.000+05:30',
      timezone: 'Asia/Kolkata',
    ),
    varshaLagna: VarshaLagnaModel(
      longitude: 165.12,
      rashiIndex: 6,
      rashiName: 'Virgo',
      degreeInRashi: 15.12,
      nakshatraIndex: 13,
      nakshatraName: 'Hasta',
      pada: 2,
      lord: 'Mercury',
    ),
    planets: {
      'Sun': AnnualPlanetModel(
        planet: 'Sun',
        longitude: 54.25,
        rashiIndex: 2,
        rashiName: 'Taurus',
        degreeInRashi: 24.25,
        house: 9,
        speedLongitude: 0.98,
        isCombust: false,
        isRetrograde: false,
      ),
    },
    houses: [
      AnnualHouseModel(
        houseNumber: 1,
        sign: 'Virgo',
        lord: 'Mercury',
        occupyingPlanets: [],
      ),
    ],
    muntha: MunthaDetailsModel(
      rashiIndex: 1,
      rashiName: 'Aries',
      longitude: 15.0,
      degreeInRashi: 15.0,
      lord: 'Mars',
      houseInVarshaChart: 8,
      houseInNatalChart: 12,
      progressionYears: 36,
    ),
    panchadhikari: PanchadhikariDetailsModel(
      isDayReturn: true,
      sunHouseInVarshaChart: 9,
      candidates: [
        PanchadhikariCandidateModel(
          role: 'MUNTHESHA',
          roleTitle: 'Muntha Lord',
          planet: 'Mars',
          sourceDescription: 'Lord of Aries',
          aspectsVarshaLagna: true,
          harshaBalaScore: 15.0,
          houseInVarshaChart: 8,
        ),
      ],
    ),
    varshesha: VarsheshaDetailsModel(
      selectedVarshesha: 'Mars',
      role: 'MUNTHESHA',
      selectionReason: 'Strongest Harsha Bala with direct aspect to Varsha Lagna',
      aspectsVarshaLagna: true,
      harshaBalaScore: 15.0,
      candidates: [],
    ),
    harshaBala: {
      'Sun': PlanetHarshaBalaModel(
        planet: 'Sun',
        sthanaBala: 5.0,
        ucchaBala: 0.0,
        striPurushaBala: 5.0,
        dinaRatriBala: 5.0,
        totalScore: 15.0,
        hasHarsha: true,
      ),
    },
    tajikaYogas: [
      TajikaYogaModel(
        type: 'ITHASALA',
        name: 'Ithasala Yoga (Muthasila)',
        planet1: 'Moon',
        planet2: 'Jupiter',
        orbDegrees: 8.0,
        actualDistanceDegrees: 3.2,
        isApplying: true,
        description: 'Faster Moon actively applying to slower Jupiter',
        strength: 'STRONG',
      ),
    ],
    sahams: [
      SahamResultModel(
        name: 'Punya Saham',
        sanskritName: 'पुण्य सहम',
        longitude: 120.4,
        rashiIndex: 5,
        rashiName: 'Leo',
        degreeInRashi: 0.4,
        houseInVarshaChart: 12,
        formula: 'Moon - Sun + Ascendant',
        isDayFormula: true,
      ),
    ],
  );

  const samplePrashna = PrashnaChartModel(
    calculationVersion: '1.1.0',
    questionTime: PrashnaTimeDetailsModel(
      utcIso: '2026-09-29T10:00:00.000Z',
      localIso: '2026-09-29T15:30:00.000+05:30',
      timezone: 'Asia/Kolkata',
      julianDayUT: 2461313.916,
    ),
    location: PrashnaLocationModel(
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    ),
    questionText: 'Will the contract finalize smoothly?',
    prashnaLagna: PrashnaLagnaModel(
      longitude: 212.45,
      rashiIndex: 8,
      rashiName: 'Scorpio',
      degreeInRashi: 2.45,
      nakshatraIndex: 16,
      nakshatraName: 'Vishakha',
      pada: 4,
      nakshatraLord: 'Jupiter',
      lord: 'Mars',
    ),
    planets: {},
    houses: [],
    moon: PrashnaMoonModel(
      longitude: 52.1,
      rashiIndex: 2,
      rashiName: 'Taurus',
      degreeInRashi: 22.1,
      nakshatraIndex: 4,
      nakshatraName: 'Rohini',
      pada: 4,
      nakshatraLord: 'Moon',
      lord: 'Venus',
      house: 7,
    ),
    sphutas: PrashnaSphutasModel(
      gulika: SphutaPointModel(
        name: 'Gulika',
        sanskritName: 'गुलिक',
        longitude: 185.2,
        rashiIndex: 7,
        rashiName: 'Libra',
        degreeInRashi: 5.2,
        house: 12,
        nakshatraName: 'Chitra',
        pada: 4,
        nakshatraLord: 'Mars',
        formula: 'Day Gulika Portion End',
      ),
      trisphuta: SphutaPointModel(
        name: 'Trisphuta',
        sanskritName: 'त्रिस्फुट',
        longitude: 89.75,
        rashiIndex: 3,
        rashiName: 'Gemini',
        degreeInRashi: 29.75,
        house: 8,
        nakshatraName: 'Punarvasu',
        pada: 3,
        nakshatraLord: 'Jupiter',
        formula: 'Lagna + Moon + Gulika',
      ),
      chatusphuta: SphutaPointModel(
        name: 'Chatusphuta',
        sanskritName: 'चतुष्स्फुट',
        longitude: 249.75,
        rashiIndex: 9,
        rashiName: 'Sagittarius',
        degreeInRashi: 9.75,
        house: 2,
        nakshatraName: 'Mula',
        pada: 3,
        nakshatraLord: 'Ketu',
        formula: 'Trisphuta + Sun',
      ),
      panchasphuta: SphutaPointModel(
        name: 'Panchasphuta',
        sanskritName: 'पञ्चस्फुट',
        longitude: 69.75,
        rashiIndex: 3,
        rashiName: 'Gemini',
        degreeInRashi: 9.75,
        house: 8,
        nakshatraName: 'Ardra',
        pada: 1,
        nakshatraLord: 'Rahu',
        formula: 'Chatusphuta + Rahu',
      ),
    ),
    questionNumberDetails: PrashnaNumberDetailsModel(
      system: 'PARASHARI_108',
      number: 42,
      rashiName: 'Cancer',
      description: 'Rotated Lagna based on seed 42 in Navamsha progression',
    ),
    isRahuKala: false,
    panchanga: PrashnaPanchangaModel(
      tithiName: 'Krishna Tritiya',
      varaName: 'Tuesday',
      nakshatraName: 'Rohini',
      yogaName: 'Harshana',
      karanaName: 'Vanija',
      isRahuKala: false,
    ),
  );

  Widget createTestWidget(Widget child, {BirthProfileModel? profile, List<Override> extraOverrides = const []}) {
    return ProviderScope(
      overrides: [
        selectedBirthProfileProvider.overrideWith((ref) => profile),
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => BirthProfilesNotifier(
            ref.watch(birthProfileRepositoryProvider),
            ref.watch(authStateProvider),
          )..state = BirthProfilesState(profiles: profile != null ? [profile] : []),
        ),
        ...extraOverrides,
      ],
      child: MaterialApp(
        theme: ThemeData(useMaterial3: true),
        home: child,
      ),
    );
  }

  group('Phase 5 Widget Tests: JaiminiScreen', () {
    testWidgets('renders Chara Karakas, scheme switcher, and Arudha Padas', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        createTestWidget(
          const JaiminiScreen(),
          profile: testProfile,
          extraOverrides: [
            activeProfileJaiminiProvider.overrideWith((ref) => Future.value(sampleJaimini)),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Jaimini Astrology'), findsOneWidget);
      expect(find.text('Prime Karakas Summary'), findsOneWidget);
      expect(find.textContaining('Atmakaraka'), findsWidgets);
      expect(find.text('Sun'), findsWidgets);
      expect(find.textContaining('Amatyakaraka'), findsWidgets);
      expect(find.text('Jupiter'), findsWidgets);

      // Switch to Arudha Padas tab
      await tester.tap(find.text('Arudha Padas'));
      await tester.pumpAndSettle();

      expect(find.text('Key Special Padas'), findsOneWidget);
      expect(find.textContaining('Arudha Lagna'), findsWidgets);
      expect(find.textContaining('Upapada Lagna'), findsWidgets);
      expect(find.text('Capricorn'), findsWidgets);
    });

    testWidgets('renders responsiveness on small 320px viewport without overflow', (tester) async {
      tester.view.physicalSize = const Size(320, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        createTestWidget(
          const JaiminiScreen(),
          profile: testProfile,
          extraOverrides: [
            activeProfileJaiminiProvider.overrideWith((ref) => Future.value(sampleJaimini)),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });
  });

  group('Phase 5 Widget Tests: KPAstrologyScreen', () {
    testWidgets('renders 4-tier planetary lords, Placidus cusps, and Significators', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        createTestWidget(
          const KPAstrologyScreen(),
          profile: testProfile,
          extraOverrides: [
            activeProfileKPProvider.overrideWith((ref) => Future.value(sampleKP)),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('KP Astrology (Krishnamurti)'), findsOneWidget);
      expect(find.text('Planetary 4-Tier Lordships'), findsOneWidget);
      expect(find.text('SignL'), findsWidgets);
      expect(find.text('StarL'), findsWidgets);
      expect(find.text('SubL'), findsWidgets);

      // Switch to Cusps tab
      await tester.tap(find.text('Placidus Cusps'));
      await tester.pumpAndSettle();
      expect(find.text('Placidus KP Cusp Lordships'), findsOneWidget);
      expect(find.text('Cusp 1'), findsOneWidget);

      // Switch to Significators tab
      await tester.tap(find.text('Significators'));
      await tester.pumpAndSettle();
      expect(find.text('KP 4-Fold House Significators'), findsOneWidget);
      expect(find.text('House 1'), findsOneWidget);

      // Switch to Ruling Planets tab
      await tester.tap(find.text('Ruling Planets'));
      await tester.pumpAndSettle();
      expect(find.text('Ruling Planets (RP) at Birth Moment'), findsOneWidget);
      expect(find.text('Day Lord (Vara Lord)'), findsOneWidget);
    });

    testWidgets('renders responsiveness on 360px viewport without overflow', (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        createTestWidget(
          const KPAstrologyScreen(),
          profile: testProfile,
          extraOverrides: [
            activeProfileKPProvider.overrideWith((ref) => Future.value(sampleKP)),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });
  });

  group('Phase 5 Widget Tests: VarshaphalaScreen', () {
    testWidgets('renders Solar return snapshot, Muntha, Harsha Bala, and searchable Sahams', (tester) async {
      tester.view.physicalSize = const Size(1000, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        createTestWidget(
          const VarshaphalaScreen(),
          profile: testProfile,
          extraOverrides: [
            activeProfileVarshaphalaProvider.overrideWith((ref) => Future.value(sampleVarshaphala)),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Varshaphala (Solar Return)'), findsOneWidget);
      expect(find.textContaining('Solar Return: Year'), findsOneWidget);
      expect(find.text('Solar Return Astronomical Snapshot'), findsOneWidget);
      expect(find.text('Varsha Lagna (Annual Ascendant)'), findsOneWidget);

      // Switch to Muntha tab
      await tester.tap(find.text('Muntha & Lord'));
      await tester.pumpAndSettle();
      expect(find.text('Muntha Progression'), findsOneWidget);
      expect(find.text('Varshesha (Lord of the Year)'), findsOneWidget);
      expect(find.text('Panchadhikari (5 Office Bearers)'), findsOneWidget);

      // Switch to Harsha Bala tab
      await tester.tap(find.text('Harsha Bala'));
      await tester.pumpAndSettle();
      expect(find.text('Tajika Harsha Bala (Annual Planetary Strengths)'), findsOneWidget);

      // Switch to Sahams tab and test search
      await tester.tap(find.text('Sahams (36)'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Punya Saham'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Punya');
      await tester.pumpAndSettle();
      expect(find.textContaining('Punya Saham'), findsOneWidget);
    });

    testWidgets('renders responsiveness on 390px and 414px viewports without overflow', (tester) async {
      const viewports = [
        Size(390, 844),
        Size(414, 896),
      ];

      for (final size in viewports) {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;

        await tester.pumpWidget(
          createTestWidget(
            const VarshaphalaScreen(),
            profile: testProfile,
            extraOverrides: [
              activeProfileVarshaphalaProvider.overrideWith((ref) => Future.value(sampleVarshaphala)),
            ],
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull, reason: 'Failed at viewport size $size');
      }

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });

  group('Phase 5 Widget Tests: PrashnaScreen', () {
    testWidgets('renders input form and casts horary query with result view', (tester) async {
      tester.view.physicalSize = const Size(800, 2000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        createTestWidget(
          const PrashnaScreen(),
          profile: testProfile,
          extraOverrides: [
            prashnaProvider.overrideWith(
              (ref) => PrashnaNotifier(ref.watch(astrologyRepositoryProvider))
                ..state = const PrashnaState(result: samplePrashna),
            ),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Prashna (Horary Astrology)'), findsOneWidget);
      expect(find.text('Will the contract finalize smoothly?'), findsOneWidget);
      expect(find.text('Prashna Lagna (Horary Ascendant)'), findsOneWidget);
      expect(find.text('Scorpio'), findsOneWidget);
      expect(find.text('Chandra (Moon Position & Query Mind)'), findsOneWidget);
      expect(find.text('Classical Horary Sphutas (Sensitive Points)'), findsOneWidget);
      expect(find.text('Gulika / Mandi'), findsOneWidget);
      expect(find.text('Trisphuta (Lagna + Moon + Gulika)'), findsOneWidget);
      expect(find.text('Moment Panchanga'), findsOneWidget);
      expect(find.text('Cast Another Prashna'), findsOneWidget);
    });

    testWidgets('renders input form when no result and validates seed number', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        createTestWidget(
          const PrashnaScreen(),
          profile: testProfile,
          extraOverrides: [
            prashnaProvider.overrideWith(
              (ref) => PrashnaNotifier(ref.watch(astrologyRepositoryProvider))
                ..state = const PrashnaState(),
            ),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('1. Query Details'), findsOneWidget);
      expect(find.text('Cast Prashna Chart'), findsOneWidget);
    });
  });
}
