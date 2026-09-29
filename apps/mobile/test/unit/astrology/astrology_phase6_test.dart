import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/astrology/models/matchmaking_model.dart';

void main() {
  group('Phase 6 Unit Tests: Kundli Matchmaking Domain Models', () {
    test('MatchmakingReportModel correctly parses 36-point Ashtakoota and Manglik comparison', () {
      final json = {
        'calculationVersion': '0.1.0',
        'convention': {
          'name': 'Classical Parashari Ashtakoota Milan',
          'description': 'Traditional 36-point Guna Milan and pairwise Manglik evaluation',
          'totalMaxScore': 36,
          'ayanamsa': 'LAHIRI',
          'zodiac': 'SIDEREAL',
        },
        'personA': {
          'personLabel': 'Boy',
          'moonLongitude': 45.2,
          'rashiIndex': 2,
          'rashiName': 'Vrishabha',
          'rashiLord': 'VENUS',
          'nakshatraIndex': 4,
          'nakshatraName': 'Rohini',
          'pada': 2,
          'nakshatraLord': 'MOON',
          'varna': 'VAISHYA',
          'varnaRank': 2,
          'vashya': 'CHATUSHPADA',
          'gana': 'MANUSHYA',
          'yoni': {'animal': 'SERPENT', 'gender': 'MALE'},
          'nadi': 'ANTYA',
        },
        'personB': {
          'personLabel': 'Girl',
          'moonLongitude': 195.4,
          'rashiIndex': 7,
          'rashiName': 'Tula',
          'rashiLord': 'VENUS',
          'nakshatraIndex': 15,
          'nakshatraName': 'Swati',
          'pada': 3,
          'nakshatraLord': 'RAHU',
          'varna': 'SHUDRA',
          'varnaRank': 1,
          'vashya': 'MANAVA',
          'gana': 'DEVA',
          'yoni': {'animal': 'BUFFALO', 'gender': 'FEMALE'},
          'nadi': 'ANTYA',
        },
        'ashtakoota': {
          'totalMaxPoints': 36,
          'totalObtainedPoints': 28.0,
          'isCompatible': true,
          'kootas': {
            'varna': {
              'name': 'Varna',
              'sanskritName': 'वर्ण',
              'maxPoints': 1,
              'obtainedPoints': 1.0,
              'description': 'Mental compatibility and spiritual harmony',
              'isSymmetric': false,
              'evidence': {},
            },
            'vashya': {
              'name': 'Vashya',
              'sanskritName': 'वश्य',
              'maxPoints': 2,
              'obtainedPoints': 1.0,
              'description': 'Mutual magnetism and dominance harmony',
              'isSymmetric': true,
              'evidence': {},
            },
            'tara': {
              'name': 'Tara',
              'sanskritName': 'तारा',
              'maxPoints': 3,
              'obtainedPoints': 3.0,
              'description': 'Health, longevity and destiny alignment',
              'isSymmetric': false,
              'evidence': {},
            },
            'yoni': {
              'name': 'Yoni',
              'sanskritName': 'योनि',
              'maxPoints': 4,
              'obtainedPoints': 2.0,
              'description': 'Biological and physical compatibility',
              'isSymmetric': true,
              'evidence': {},
            },
            'grahaMaitri': {
              'name': 'Graha Maitri',
              'sanskritName': 'ग्रहमैत्री',
              'maxPoints': 5,
              'obtainedPoints': 5.0,
              'description': 'Psychological rapport & Moon lord planetary friendship',
              'isSymmetric': true,
              'evidence': {},
            },
            'gana': {
              'name': 'Gana',
              'sanskritName': 'गण',
              'maxPoints': 6,
              'obtainedPoints': 6.0,
              'description': 'Temperament and behavioral compatibility',
              'isSymmetric': true,
              'evidence': {},
            },
            'bhakoot': {
              'name': 'Bhakoot',
              'sanskritName': 'भकूट',
              'maxPoints': 7,
              'obtainedPoints': 7.0,
              'description': 'Family welfare, emotional bonding and mutual prosperity',
              'isSymmetric': true,
              'evidence': {},
              'isDoshaCancelled': false,
            },
            'nadi': {
              'name': 'Nadi',
              'sanskritName': 'नाडी',
              'maxPoints': 8,
              'obtainedPoints': 3.0,
              'description': 'Genetic compatibility and health vitality',
              'isSymmetric': true,
              'evidence': {},
              'isDoshaCancelled': true,
              'cancellationReason': 'Same Rashi lord with different Nakshatra padas',
            },
          },
        },
        'manglikComparison': {
          'personA': {
            'isManglik': false,
            'severity': 'NONE',
            'cancellationFactors': [],
            'isCancelled': false,
            'effectiveManglik': false,
            'marsPlacement': {'houseFromLagna': 9, 'houseFromMoon': 8},
          },
          'personB': {
            'isManglik': false,
            'severity': 'NONE',
            'cancellationFactors': [],
            'isCancelled': false,
            'effectiveManglik': false,
            'marsPlacement': {'houseFromLagna': 3, 'houseFromMoon': 2},
          },
          'verdict': 'BOTH_NON_MANGLIK',
          'isDoshaCancelledByMatch': false,
          'explanation': 'Both individuals are non-Manglik. No dosha mitigation required.',
        },
        'overallSummary': {
          'totalScore': 28.0,
          'maxScore': 36,
          'isAshtakootaCompatible': true,
          'manglikVerdict': 'BOTH_NON_MANGLIK',
        },
      };

      final report = MatchmakingReportModel.fromJson(json);

      expect(report.totalScore, 28.0);
      expect(report.maxScore, 36.0);
      expect(report.isCompatible, isTrue);
      expect(report.ashtakoota.kootaList.length, 8);
      expect(report.personA.rashiName, 'Vrishabha');
      expect(report.personA.nakshatraName, 'Rohini');
      expect(report.personB.rashiName, 'Tula');
      expect(report.personB.nakshatraName, 'Swati');

      final varna = report.ashtakoota.getKoota('varna');
      expect(varna, isNotNull);
      expect(varna!.obtainedPoints, 1.0);
      expect(varna.maxPoints, 1.0);

      final nadi = report.ashtakoota.getKoota('nadi');
      expect(nadi, isNotNull);
      expect(nadi!.obtainedPoints, 3.0);
      expect(nadi.isDoshaCancelled, isTrue);
      expect(nadi.cancellationReason, contains('Same Rashi lord'));

      expect(report.manglikComparison.verdict, 'BOTH_NON_MANGLIK');
      expect(report.manglikComparison.isHarmonious, isTrue);
    });
  });
}
