import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/astrology/models/panchang_model.dart';
import 'package:astro_mobile/features/astrology/models/yoga_model.dart';
import 'package:astro_mobile/features/astrology/models/special_points_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/astrology/screens/panchanga_screen.dart';
import 'package:astro_mobile/features/astrology/screens/yogas_screen.dart';
import 'package:astro_mobile/features/astrology/screens/special_points_screen.dart';

void main() {
  final sampleProfile = BirthProfileModel(
    id: 'test_profile_p3',
    userId: 'user_p3',
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

  PanchangModel createSamplePanchang() {
    return const PanchangModel(
      date: '1990-05-15',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      tithi: TithiModel(
        index: 6,
        name: 'Shashthi',
        paksha: 'KRISHNA',
        degreeInTithi: 8.45,
        completionPercentage: 70.4,
      ),
      vara: VaraModel(
        dayIndex: 2,
        name: 'Mangalavara',
        lord: 'MARS',
      ),
      nakshatra: NakshatraPanchangModel(
        index: 21,
        name: 'Uttara Ashadha',
        lord: 'SUN',
        pada: 3,
      ),
      yoga: YogaPanchangModel(
        index: 23,
        name: 'Shubha',
        completionPercentage: 45.2,
      ),
      karana: KaranaModel(
        index: 12,
        name: 'Taitila',
        type: 'MOVABLE',
      ),
      sunriseSunset: SunriseSunsetModel(
        sunriseIso: '1990-05-15T05:32:00.000Z',
        sunsetIso: '1990-05-15T19:04:00.000Z',
        dayLengthMinutes: 812,
      ),
      rahuKala: RahuKalaModel(
        startIso: '1990-05-15T15:00:00.000Z',
        endIso: '1990-05-15T16:30:00.000Z',
        segmentIndex: 7,
        totalSegments: 8,
      ),
      hinduCalendar: HinduCalendarModel(
        amantaMasa: 'Vaishakha',
        purnimantaMasa: 'Jyeshtha',
        paksha: 'KRISHNA',
        tithiIndex: 6,
        tithiName: 'Shashthi',
        solarRashi: 'Vrishabha',
        solarRashiIndex: 2,
        isAdhika: false,
      ),
      transitions: [],
    );
  }

  YogaEvaluationReportModel createSampleYogaReport() {
    return const YogaEvaluationReportModel(
      calculationVersion: '1.0.0',
      varga: 'D1',
      totalEvaluated: 45,
      detectedCount: 2,
      detectedYogas: [
        YogaResultModel(
          id: 'gajakesari',
          canonicalName: 'Gaja Kesari Yoga',
          sanskritName: 'गजकेसरी योग',
          category: 'CHANDRA',
          isDetected: true,
          varga: 'D1',
          convention: 'PARASHARI',
          evidence: YogaEvidenceModel(
            conditions: [
              YogaConditionModel(
                id: 'jupiter_kendra_moon',
                description: 'Jupiter in Kendra from Moon',
                satisfied: true,
                expected: true,
                observed: true,
              ),
            ],
            involvedPlanets: [
              YogaPlanetEvidenceModel(
                planet: 'JUPITER',
                rashiIndex: 4,
                rashiName: 'Karka',
                house: 1,
                longitude: 95.8,
                degreeInRashi: 5.8,
                dignity: 'EXALTED',
                isCombust: false,
                isRetrograde: true,
              ),
              YogaPlanetEvidenceModel(
                planet: 'MOON',
                rashiIndex: 10,
                rashiName: 'Makara',
                house: 7,
                longitude: 275.4,
                degreeInRashi: 5.4,
                dignity: 'NEUTRAL',
                isCombust: false,
                isRetrograde: false,
              ),
            ],
            involvedHouses: [
              YogaHouseEvidenceModel(
                houseNumber: 1,
                rashiIndex: 4,
                rashiName: 'Karka',
                lord: 'MOON',
                occupyingPlanets: ['JUPITER'],
              ),
            ],
            relationships: [
              YogaRelationshipEvidenceModel(
                relationshipType: 'KENDRA_RELATION',
                planets: ['JUPITER', 'MOON'],
                houses: [1, 7],
                description: 'Jupiter in 7th house (Kendra) from Moon',
              ),
            ],
            strengthFactors: ['Jupiter is exalted in Cancer'],
          ),
        ),
        YogaResultModel(
          id: 'hamsa',
          canonicalName: 'Hamsa Yoga',
          sanskritName: 'हंस योग',
          category: 'MAHAPURUSHA',
          isDetected: true,
          varga: 'D1',
          convention: 'PARASHARI',
          evidence: YogaEvidenceModel(
            conditions: [
              YogaConditionModel(
                id: 'jupiter_kendra_swakshetra',
                description: 'Jupiter exalted in Kendra house 1',
                satisfied: true,
                expected: true,
                observed: true,
              ),
            ],
            involvedPlanets: [
              YogaPlanetEvidenceModel(
                planet: 'JUPITER',
                rashiIndex: 4,
                rashiName: 'Karka',
                house: 1,
                longitude: 95.8,
                degreeInRashi: 5.8,
                dignity: 'EXALTED',
                isCombust: false,
                isRetrograde: true,
              ),
            ],
            involvedHouses: [],
            relationships: [],
            strengthFactors: ['Pancha Mahapurusha formation'],
          ),
        ),
      ],
    );
  }

  SpecialPointsReportModel createSampleSpecialPoints() {
    return const SpecialPointsReportModel(
      upagrahas: UpagrahasReportModel(
        dhooma: CalculatedSpecialPointModel(
          name: 'Dhooma',
          sanskritName: 'धूम',
          longitude: 163.5,
          rashiIndex: 6,
          rashiName: 'Kanya',
          degreeInRashi: 13.5,
          house: 2,
          nakshatraIndex: 13,
          nakshatraName: 'Hasta',
          pada: 2,
          nakshatraLord: 'Moon',
          formula: 'Sun Longitude + 133°20\'',
          category: 'UPAGRAHA',
        ),
        vyatipata: CalculatedSpecialPointModel(
          name: 'Vyatipata',
          sanskritName: 'व्यतीपात',
          longitude: 196.5,
          rashiIndex: 7,
          rashiName: 'Tula',
          degreeInRashi: 16.5,
          house: 3,
          nakshatraIndex: 15,
          nakshatraName: 'Swati',
          pada: 3,
          nakshatraLord: 'Rahu',
          formula: '360° - Dhooma',
          category: 'UPAGRAHA',
        ),
        parivesha: CalculatedSpecialPointModel(
          name: 'Parivesha',
          sanskritName: 'परिवेष',
          longitude: 16.5,
          rashiIndex: 1,
          rashiName: 'Mesha',
          degreeInRashi: 16.5,
          house: 9,
          nakshatraIndex: 2,
          nakshatraName: 'Bharani',
          pada: 1,
          nakshatraLord: 'Venus',
          formula: 'Vyatipata + 180°',
          category: 'UPAGRAHA',
        ),
        indrachapa: CalculatedSpecialPointModel(
          name: 'Indrachapa',
          sanskritName: 'इन्द्रचाप',
          longitude: 343.5,
          rashiIndex: 12,
          rashiName: 'Meena',
          degreeInRashi: 13.5,
          house: 8,
          nakshatraIndex: 26,
          nakshatraName: 'Uttara Bhadrapada',
          pada: 4,
          nakshatraLord: 'Saturn',
          formula: '360° - Parivesha',
          category: 'UPAGRAHA',
        ),
        upaketu: CalculatedSpecialPointModel(
          name: 'Upaketu',
          sanskritName: 'उपकेतु',
          longitude: 0.16,
          rashiIndex: 1,
          rashiName: 'Mesha',
          degreeInRashi: 0.16,
          house: 9,
          nakshatraIndex: 1,
          nakshatraName: 'Ashwini',
          pada: 1,
          nakshatraLord: 'Ketu',
          formula: 'Indrachapa + 16°40\'',
          category: 'UPAGRAHA',
        ),
        gulika: CalculatedSpecialPointModel(
          name: 'Gulika',
          sanskritName: 'गुलिक',
          longitude: 112.4,
          rashiIndex: 4,
          rashiName: 'Karka',
          degreeInRashi: 22.4,
          house: 12,
          nakshatraIndex: 9,
          nakshatraName: 'Ashlesha',
          pada: 2,
          nakshatraLord: 'Mercury',
          formula: 'Saturn portion of daytime',
          category: 'UPAGRAHA',
        ),
        mandi: CalculatedSpecialPointModel(
          name: 'Mandi',
          sanskritName: 'मान्दि',
          longitude: 108.2,
          rashiIndex: 4,
          rashiName: 'Karka',
          degreeInRashi: 18.2,
          house: 12,
          nakshatraIndex: 9,
          nakshatraName: 'Ashlesha',
          pada: 1,
          nakshatraLord: 'Mercury',
          formula: 'Middle of Gulika duration segment',
          category: 'UPAGRAHA',
        ),
      ),
      specialLagnas: SpecialLagnasReportModel(
        bhavaLagna: CalculatedSpecialPointModel(
          name: 'Bhava Lagna',
          sanskritName: 'भाव लग्न',
          longitude: 150.2,
          rashiIndex: 6,
          rashiName: 'Kanya',
          degreeInRashi: 0.2,
          house: 2,
          nakshatraIndex: 12,
          nakshatraName: 'Uttara Phalguni',
          pada: 2,
          nakshatraLord: 'Sun',
          formula: 'Sun + ghati harmonics',
          category: 'SPECIAL_LAGNA',
        ),
        horaLagna: CalculatedSpecialPointModel(
          name: 'Hora Lagna',
          sanskritName: 'होरा लग्न',
          longitude: 210.5,
          rashiIndex: 7,
          rashiName: 'Tula',
          degreeInRashi: 0.5,
          house: 3,
          nakshatraIndex: 16,
          nakshatraName: 'Vishakha',
          pada: 1,
          nakshatraLord: 'Jupiter',
          formula: 'Sun + hora harmonics',
          category: 'SPECIAL_LAGNA',
        ),
        ghatikaLagna: CalculatedSpecialPointModel(
          name: 'Ghatika Lagna',
          sanskritName: 'घटिका लग्न',
          longitude: 270.8,
          rashiIndex: 10,
          rashiName: 'Makara',
          degreeInRashi: 0.8,
          house: 6,
          nakshatraIndex: 21,
          nakshatraName: 'Uttara Ashadha',
          pada: 2,
          nakshatraLord: 'Sun',
          formula: 'Sun + ghatika harmonics',
          category: 'SPECIAL_LAGNA',
        ),
        induLagna: CalculatedSpecialPointModel(
          name: 'Indu Lagna',
          sanskritName: 'इन्दु लग्न',
          longitude: 120.4,
          rashiIndex: 5,
          rashiName: 'Simha',
          degreeInRashi: 0.4,
          house: 1,
          nakshatraIndex: 10,
          nakshatraName: 'Magha',
          pada: 1,
          nakshatraLord: 'Ketu',
          formula: 'Moon sign + 9th kalas',
          category: 'SPECIAL_LAGNA',
        ),
        pranapadaLagna: CalculatedSpecialPointModel(
          name: 'Pranapada Lagna',
          sanskritName: 'प्राणपद लग्न',
          longitude: 45.2,
          rashiIndex: 2,
          rashiName: 'Vrishabha',
          degreeInRashi: 15.2,
          house: 10,
          nakshatraIndex: 4,
          nakshatraName: 'Rohini',
          pada: 2,
          nakshatraLord: 'Moon',
          formula: 'Breath harmonics',
          category: 'SPECIAL_LAGNA',
        ),
        varnadaLagna: CalculatedSpecialPointModel(
          name: 'Varnada Lagna',
          sanskritName: 'वर्णद लग्न',
          longitude: 75.1,
          rashiIndex: 3,
          rashiName: 'Mithuna',
          degreeInRashi: 15.1,
          house: 11,
          nakshatraIndex: 6,
          nakshatraName: 'Ardra',
          pada: 3,
          nakshatraLord: 'Rahu',
          formula: 'Lagna/Hora synthesis',
          category: 'SPECIAL_LAGNA',
        ),
      ),
      arishtaPoints: ArishtaPointsReportModel(
        sixtyFourthNavamshaMoon: CalculatedSpecialPointModel(
          name: '64th Navamsha from Moon',
          sanskritName: 'चतुःषष्ट्यंश (चन्द्र)',
          longitude: 85.4,
          rashiIndex: 3,
          rashiName: 'Mithuna',
          degreeInRashi: 25.4,
          house: 11,
          nakshatraIndex: 7,
          nakshatraName: 'Punarvasu',
          pada: 2,
          nakshatraLord: 'Jupiter',
          formula: 'Moon + 210°',
          category: 'ARISHTA_POINT',
        ),
        sixtyFourthNavamshaAscendant: CalculatedSpecialPointModel(
          name: '64th Navamsha from Ascendant',
          sanskritName: 'चतुःषष्ट्यंश (लग्न)',
          longitude: 355.2,
          rashiIndex: 12,
          rashiName: 'Meena',
          degreeInRashi: 25.2,
          house: 8,
          nakshatraIndex: 27,
          nakshatraName: 'Revati',
          pada: 3,
          nakshatraLord: 'Mercury',
          formula: 'Ascendant + 210°',
          category: 'ARISHTA_POINT',
        ),
        twentySecondDrekkanaAscendant: CalculatedSpecialPointModel(
          name: '22nd Drekkana from Ascendant (Kharesha)',
          sanskritName: 'द्वाविंश द्वेष्काण (खरेश)',
          longitude: 355.2,
          rashiIndex: 12,
          rashiName: 'Meena',
          degreeInRashi: 25.2,
          house: 8,
          nakshatraIndex: 27,
          nakshatraName: 'Revati',
          pada: 3,
          nakshatraLord: 'Mercury',
          formula: 'Ascendant + 210°',
          category: 'ARISHTA_POINT',
        ),
        twentySecondDrekkanaMoon: CalculatedSpecialPointModel(
          name: '22nd Drekkana from Moon',
          sanskritName: 'द्वाविंश द्वेष्काण (चन्द्र)',
          longitude: 85.4,
          rashiIndex: 3,
          rashiName: 'Mithuna',
          degreeInRashi: 25.4,
          house: 11,
          nakshatraIndex: 7,
          nakshatraName: 'Punarvasu',
          pada: 2,
          nakshatraLord: 'Jupiter',
          formula: 'Moon + 210°',
          category: 'ARISHTA_POINT',
        ),
        sarpaDreshkanaPlacements: [],
      ),
      yogiPoints: YogiPointDetailsModel(
        yogiPoint: CalculatedSpecialPointModel(
          name: 'Yogi Point',
          sanskritName: 'योगी',
          longitude: 105.9,
          rashiIndex: 4,
          rashiName: 'Karka',
          degreeInRashi: 15.9,
          house: 12,
          nakshatraIndex: 8,
          nakshatraName: 'Pushya',
          pada: 4,
          nakshatraLord: 'Saturn',
          formula: 'Sun + Moon + 93°20\'',
          category: 'YOGI_POINT',
        ),
        yogiPlanet: 'Saturn',
        yogiNakshatra: 'Pushya',
        avyogiPoint: CalculatedSpecialPointModel(
          name: 'Avyogi Point',
          sanskritName: 'अव्योगी',
          longitude: 285.9,
          rashiIndex: 10,
          rashiName: 'Makara',
          degreeInRashi: 15.9,
          house: 6,
          nakshatraIndex: 22,
          nakshatraName: 'Shravana',
          pada: 2,
          nakshatraLord: 'Moon',
          formula: 'Yogi Point + 186°40\'',
          category: 'YOGI_POINT',
        ),
        avyogiPlanet: 'Moon',
        avyogiNakshatra: 'Shravana',
        duplicateYogiPlanet: 'Mars',
      ),
      mrityuBhaga: MrityuBhagaReportModel(
        hasAnyAfflicted: false,
        afflictedPlanets: [],
        points: [
          MrityuBhagaStatusModel(
            planet: 'SUN',
            exactFatalDegree: 20.0,
            currentDegreeInRashi: 0.5,
            deltaDegree: 19.5,
            isWithinOrb: false,
            orbDegrees: 1.0,
            severity: 'NONE',
          ),
        ],
      ),
    );
  }

  Widget createTestWidget({
    required Widget child,
    BirthProfileModel? profile,
    PanchangModel? panchang,
    YogaEvaluationReportModel? yogaReport,
    SpecialPointsReportModel? specialPoints,
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
          panchangForProfileProvider.overrideWith((ref, p) => Future.error(errorToThrow)),
          yogasForProfileProvider.overrideWith((ref, q) => Future.error(errorToThrow)),
          specialPointsForProfileProvider.overrideWith((ref, p) => Future.error(errorToThrow)),
        ] else ...[
          if (panchang != null)
            panchangForProfileProvider.overrideWith((ref, p) => Future.value(panchang)),
          if (yogaReport != null)
            yogasForProfileProvider.overrideWith((ref, q) => Future.value(yogaReport)),
          if (specialPoints != null)
            specialPointsForProfileProvider.overrideWith((ref, p) => Future.value(specialPoints)),
        ],
      ],
      child: MaterialApp(
        theme: ThemeData(useMaterial3: true),
        home: child,
      ),
    );
  }

  group('PanchangaScreen Widget Tests', () {
    testWidgets('Renders empty state when no active birth profile is selected', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const PanchangaScreen(),
        profile: null,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('No Active Birth Profile'), findsOneWidget);
      expect(find.text('Add Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders 5 cosmic limbs, solar timings, and Hindu calendar', (tester) async {
      final panchang = createSamplePanchang();
      await tester.pumpWidget(createTestWidget(
        child: const PanchangaScreen(),
        profile: sampleProfile,
        panchang: panchang,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Aarav Sharma'), findsOneWidget);
      expect(find.text('The Five Limbs (पञ्चाङ्ग)'), findsOneWidget);

      // Limbs
      expect(find.text('Shashthi'), findsWidgets);
      expect(find.text('Mangalavara'), findsOneWidget);
      expect(find.text('Uttara Ashadha'), findsWidgets);
      expect(find.text('Shubha'), findsOneWidget);
      expect(find.text('Taitila'), findsOneWidget);

      // Solar & Hindu Calendar
      expect(find.text('Solar & Inauspicious Timings'), findsOneWidget);
      expect(find.text('RAHU KALA (राहुकाल)'), findsOneWidget);
      expect(find.text('Vaishakha'), findsOneWidget);
    });

    testWidgets('Handles API calculation error and displays retry button', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const PanchangaScreen(),
        profile: sampleProfile,
        errorToThrow: Exception('Ephemeris calculations failed'),
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Failed to calculate Panchanga. Tap to retry.'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('Renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      final panchang = createSamplePanchang();
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
          child: const PanchangaScreen(),
          profile: sampleProfile,
          panchang: panchang,
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

  group('YogasScreen Widget Tests', () {
    testWidgets('Renders empty state when no active profile', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const YogasScreen(),
        profile: null,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('No Active Birth Profile'), findsOneWidget);
      expect(find.text('Add Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders detected yogas list, category tabs, and expand condition evidence', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final yogaReport = createSampleYogaReport();
      await tester.pumpWidget(createTestWidget(
        child: const YogasScreen(),
        profile: sampleProfile,
        yogaReport: yogaReport,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Gaja Kesari Yoga'), findsOneWidget);
      expect(find.text('Hamsa Yoga'), findsOneWidget);
      expect(find.text('2 Formed Yogas Detected'), findsOneWidget);

      // Tap on Gaja Kesari Yoga card to expand evidence
      await tester.tap(find.text('Gaja Kesari Yoga'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('Rule Verification Evidence'), findsOneWidget);
      expect(find.text('Jupiter in Kendra from Moon'), findsOneWidget);
      expect(find.text('Astronomical Relationships'), findsOneWidget);
    });

    testWidgets('Filtering by category updates visible yogas list', (tester) async {
      final yogaReport = createSampleYogaReport();
      await tester.pumpWidget(createTestWidget(
        child: const YogasScreen(),
        profile: sampleProfile,
        yogaReport: yogaReport,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      // Tap on Mahapurusha tab
      await tester.tap(find.text('Mahapurusha'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Hamsa Yoga'), findsOneWidget);
      expect(find.text('Gaja Kesari Yoga'), findsNothing);
    });

    testWidgets('Handles API calculation error and displays retry button', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const YogasScreen(),
        profile: sampleProfile,
        errorToThrow: Exception('Database timeout evaluating yogas'),
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Failed to evaluate Yogas. Tap to retry.'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('Renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      final yogaReport = createSampleYogaReport();
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
          child: const YogasScreen(),
          profile: sampleProfile,
          yogaReport: yogaReport,
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

  group('SpecialPointsScreen Widget Tests', () {
    testWidgets('Renders empty state when no active profile', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const SpecialPointsScreen(),
        profile: null,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('No Active Birth Profile'), findsOneWidget);
      expect(find.text('Add Birth Profile'), findsOneWidget);
    });

    testWidgets('Renders Upagrahas tab, switches to Special Lagnas and Yogi Points tabs', (tester) async {
      final specialPoints = createSampleSpecialPoints();
      await tester.pumpWidget(createTestWidget(
        child: const SpecialPointsScreen(),
        profile: sampleProfile,
        specialPoints: specialPoints,
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      // Tab 1: Upagrahas
      expect(find.text('Vedic Upagrahas (उपग्रह)'), findsOneWidget);
      expect(find.text('Dhooma'), findsOneWidget);
      expect(find.text('Gulika'), findsOneWidget);
      expect(find.text('Mandi'), findsOneWidget);

      // Switch to Tab 2: Special Lagnas
      await tester.tap(find.text('Special Lagnas'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Special Reference Lagnas (विशेष लग्न)'), findsOneWidget);
      expect(find.text('Indu Lagna'), findsOneWidget);
      expect(find.text('Hora Lagna'), findsOneWidget);
      expect(find.text('Ghatika Lagna'), findsOneWidget);

      // Switch to Tab 3: Yogi Points
      await tester.tap(find.text('Yogi Points'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('YOGI POINT (योगाधिपति)'), findsOneWidget);
      expect(find.text('AVYOGI POINT (अव्योगी)'), findsOneWidget);
      expect(find.text('Ruling Planet: Mars'), findsOneWidget);

      // Switch to Tab 4: Arishta & Fatal
      await tester.tap(find.text('Arishta & Fatal'));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Classical Arishta Points (अनिष्ट बिन्दु)'), findsOneWidget);
      expect(find.text('Mrityu Bhaga Analysis (मृत्युभाग)'), findsOneWidget);
    });

    testWidgets('Handles API calculation error and displays retry button', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const SpecialPointsScreen(),
        profile: sampleProfile,
        errorToThrow: Exception('Calculation of upagrahas failed'),
      ));
      await tester.pump(Duration.zero);
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.text('Failed to calculate Special Points. Tap to retry.'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('Renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      final specialPoints = createSampleSpecialPoints();
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
          child: const SpecialPointsScreen(),
          profile: sampleProfile,
          specialPoints: specialPoints,
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
