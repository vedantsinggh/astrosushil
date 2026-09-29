import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/astrology/models/matchmaking_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/astrology/screens/matchmaking_screen.dart';

void main() {
  final testProfileA = BirthProfileModel(
    id: 'profile-a',
    userId: 'user-p6',
    name: 'Aarav Sharma',
    dateOfBirth: '1992-04-12',
    timeOfBirth: '07:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  final testProfileB = BirthProfileModel(
    id: 'profile-b',
    userId: 'user-p6',
    name: 'Diya Patel',
    dateOfBirth: '1994-08-25',
    timeOfBirth: '15:45:00',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    placeName: 'Mumbai, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  const sampleMatchReport = MatchmakingReportModel(
    calculationVersion: '0.1.0',
    convention: MatchmakingConventionModel(
      name: 'Classical Parashari Ashtakoota Milan',
      description: 'Traditional 36-point Guna Milan and pairwise Manglik evaluation',
      totalMaxScore: 36.0,
      ayanamsa: 'LAHIRI',
      zodiac: 'SIDEREAL',
    ),
    personA: DerivedMoonProfileModel(
      personLabel: 'Boy',
      moonLongitude: 45.2,
      rashiIndex: 2,
      rashiName: 'Vrishabha',
      rashiLord: 'Venus',
      nakshatraIndex: 4,
      nakshatraName: 'Rohini',
      pada: 2,
      nakshatraLord: 'Moon',
      varna: 'Vaishya',
      varnaRank: 2,
      vashya: 'Chatushpada',
      gana: 'Manushya',
      yoniAnimal: 'Serpent',
      yoniGender: 'Male',
      nadi: 'Antya',
    ),
    personB: DerivedMoonProfileModel(
      personLabel: 'Girl',
      moonLongitude: 195.4,
      rashiIndex: 7,
      rashiName: 'Tula',
      rashiLord: 'Venus',
      nakshatraIndex: 15,
      nakshatraName: 'Swati',
      pada: 3,
      nakshatraLord: 'Rahu',
      varna: 'Shudra',
      varnaRank: 1,
      vashya: 'Manava',
      gana: 'Deva',
      yoniAnimal: 'Buffalo',
      yoniGender: 'Female',
      nadi: 'Antya',
    ),
    ashtakoota: AshtakootaReportModel(
      totalMaxPoints: 36.0,
      totalObtainedPoints: 28.0,
      isCompatible: true,
      kootaList: [
        IndividualKootaModel(
          key: 'varna',
          name: 'Varna',
          sanskritName: 'वर्ण',
          maxPoints: 1.0,
          obtainedPoints: 1.0,
          description: 'Mental compatibility and spiritual harmony',
          isSymmetric: false,
          evidence: {},
        ),
        IndividualKootaModel(
          key: 'vashya',
          name: 'Vashya',
          sanskritName: 'वश्य',
          maxPoints: 2.0,
          obtainedPoints: 1.0,
          description: 'Mutual magnetism and dominance harmony',
          isSymmetric: true,
          evidence: {},
        ),
        IndividualKootaModel(
          key: 'tara',
          name: 'Tara',
          sanskritName: 'तारा',
          maxPoints: 3.0,
          obtainedPoints: 3.0,
          description: 'Health, longevity and destiny alignment',
          isSymmetric: false,
          evidence: {},
        ),
        IndividualKootaModel(
          key: 'yoni',
          name: 'Yoni',
          sanskritName: 'योनि',
          maxPoints: 4.0,
          obtainedPoints: 2.0,
          description: 'Biological and physical compatibility',
          isSymmetric: true,
          evidence: {},
        ),
        IndividualKootaModel(
          key: 'grahaMaitri',
          name: 'Graha Maitri',
          sanskritName: 'ग्रहमैत्री',
          maxPoints: 5.0,
          obtainedPoints: 5.0,
          description: 'Psychological rapport & Moon lord planetary friendship',
          isSymmetric: true,
          evidence: {},
        ),
        IndividualKootaModel(
          key: 'gana',
          name: 'Gana',
          sanskritName: 'गण',
          maxPoints: 6.0,
          obtainedPoints: 6.0,
          description: 'Temperament and behavioral compatibility',
          isSymmetric: true,
          evidence: {},
        ),
        IndividualKootaModel(
          key: 'bhakoot',
          name: 'Bhakoot',
          sanskritName: 'भकूट',
          maxPoints: 7.0,
          obtainedPoints: 7.0,
          description: 'Family welfare, emotional bonding and mutual prosperity',
          isSymmetric: true,
          evidence: {},
        ),
        IndividualKootaModel(
          key: 'nadi',
          name: 'Nadi',
          sanskritName: 'नाडी',
          maxPoints: 8.0,
          obtainedPoints: 3.0,
          description: 'Genetic compatibility and health vitality',
          isSymmetric: true,
          evidence: {},
          isDoshaCancelled: true,
          cancellationReason: 'Same Rashi lord with different Nakshatras',
        ),
      ],
    ),
    manglikComparison: ManglikComparisonModel(
      personA: ManglikStatusModel(
        isManglik: false,
        severity: 'NONE',
        cancellationFactors: [],
        isCancelled: false,
        effectiveManglik: false,
        houseFromLagna: 9,
        houseFromMoon: 8,
      ),
      personB: ManglikStatusModel(
        isManglik: false,
        severity: 'NONE',
        cancellationFactors: [],
        isCancelled: false,
        effectiveManglik: false,
        houseFromLagna: 3,
        houseFromMoon: 2,
      ),
      verdict: 'BOTH_NON_MANGLIK',
      isDoshaCancelledByMatch: false,
      explanation: 'Both individuals are non-Manglik. No dosha mitigation required.',
    ),
    overallSummary: MatchmakingSummaryModel(
      totalScore: 28.0,
      maxScore: 36.0,
      isAshtakootaCompatible: true,
      manglikVerdict: 'BOTH_NON_MANGLIK',
    ),
    overallVerdict: 'Compatible Marriage Match',
  );

  Widget createTestWidget({
    BirthProfileModel? personA,
    BirthProfileModel? personB,
    MatchmakingReportModel? report,
    String? errorMessage,
  }) {
    return ProviderScope(
      overrides: [
        matchmakingPersonAProvider.overrideWith((ref) => personA),
        matchmakingPersonBProvider.overrideWith((ref) => personB),
        matchmakingProvider.overrideWith(
          (ref) => MatchmakingNotifier(ref.watch(astrologyRepositoryProvider))
            ..state = MatchmakingState(
              result: report,
              errorMessage: errorMessage,
            ),
        ),
        birthProfilesListNotifierProvider.overrideWith(
          (ref) => BirthProfilesNotifier(
            ref.watch(birthProfileRepositoryProvider),
            ref.watch(authStateProvider),
          )..state = BirthProfilesState(
              profiles: [
                if (personA != null) personA,
                if (personB != null) personB,
              ],
            ),
        ),
      ],
      child: const MaterialApp(
        home: MatchmakingScreen(),
      ),
    );
  }

  group('Phase 6 Widget Tests: MatchmakingScreen', () {
    testWidgets('renders profile selection cards and disabled Calculate button when missing person B', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(createTestWidget(personA: testProfileA, personB: null));
      await tester.pumpAndSettle();

      expect(find.text('Kundli Matchmaking (Guna Milan)'), findsOneWidget);
      expect(find.text('36-Point Ashtakoota Milan'), findsOneWidget);
      expect(find.text('Person A (Boy / First Partner)'), findsOneWidget);
      expect(find.text('Aarav Sharma'), findsOneWidget);
      expect(find.text('Person B (Girl / Second Partner)'), findsOneWidget);
      expect(find.text('Select Profile'), findsOneWidget);
      expect(find.text('Please select both birth profiles to proceed.'), findsOneWidget);
    });

    testWidgets('renders full 36-point result view with 8-koota breakdown, Moon comparison & Manglik verdict', (tester) async {
      tester.view.physicalSize = const Size(800, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        createTestWidget(
          personA: testProfileA,
          personB: testProfileB,
          report: sampleMatchReport,
        ),
      );
      await tester.pumpAndSettle();

      // Hero Score Card
      expect(find.text('28'), findsOneWidget);
      expect(find.text('/ 36'), findsOneWidget);
      expect(find.text('Excellent Match (Uttama)'), findsOneWidget);
      expect(find.text('PASSED (≥ 18)'), findsOneWidget);
      expect(find.text('HARMONIOUS'), findsOneWidget);

      // Moon Comparison Card
      expect(find.text('Moon Placement Comparison'), findsOneWidget);
      expect(find.textContaining('Aarav Sharma vs Diya Patel'), findsOneWidget);
      expect(find.textContaining('Rohini'), findsOneWidget);
      expect(find.textContaining('Swati'), findsOneWidget);

      // 8 Kootas
      expect(find.textContaining('8-Koota Breakdown'), findsOneWidget);
      expect(find.textContaining('(वर्ण)'), findsOneWidget);
      expect(find.textContaining('(वश्य)'), findsOneWidget);
      expect(find.textContaining('(तारा)'), findsOneWidget);
      expect(find.textContaining('(योनि)'), findsOneWidget);
      expect(find.textContaining('(ग्रहमैत्री)'), findsOneWidget);
      expect(find.textContaining('(गण)'), findsOneWidget);
      expect(find.textContaining('(भकूट)'), findsOneWidget);
      expect(find.textContaining('(नाडी)'), findsOneWidget);
      expect(find.text('1 / 1'), findsOneWidget);
      expect(find.text('5 / 5'), findsOneWidget);
      expect(find.text('6 / 6'), findsOneWidget);
      expect(find.text('7 / 7'), findsOneWidget);
      expect(find.text('3 / 8'), findsOneWidget);
      expect(find.textContaining('Dosha Cancelled: Same Rashi lord'), findsOneWidget);

      // Manglik Card
      expect(find.text('Manglik Dosha Comparison (Kuja Dosha)'), findsOneWidget);
      expect(find.textContaining('Verdict: BOTH NON MANGLIK'), findsOneWidget);
      expect(find.text('NON-MANGLIK'), findsWidgets);

      // Action button
      expect(find.text('Select Different Profiles'), findsOneWidget);
    });

    testWidgets('renders error state and allows retry', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        createTestWidget(
          personA: testProfileA,
          personB: testProfileB,
          errorMessage: 'Backend calculation timeout error',
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Backend calculation timeout error'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('renders responsive layouts across 320px, 360px, 390px, 414px without overflow', (tester) async {
      const viewports = [
        Size(320, 640),
        Size(360, 780),
        Size(390, 844),
        Size(414, 896),
      ];

      for (final size in viewports) {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;

        await tester.pumpWidget(
          createTestWidget(
            personA: testProfileA,
            personB: testProfileB,
            report: sampleMatchReport,
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
}
