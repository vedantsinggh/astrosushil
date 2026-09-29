import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/astrology/models/gochara_model.dart';
import 'package:astro_mobile/features/astrology/models/ashtakavarga_model.dart';
import 'package:astro_mobile/features/astrology/models/strength_model.dart';

void main() {
  group('Phase 4 Unit Tests: Gochara / Transit Model', () {
    test('TransitSnapshotModel parses complete Fastify API transit snapshot response', () {
      final sampleJson = {
        'calculationVersion': '1.1.0',
        'transitChart': {
          'transitTime': {
            'utcIso': '2026-09-29T00:00:00.000Z',
            'localIso': '2026-09-29T05:30:00.000+05:30',
            'timezone': 'Asia/Kolkata',
          },
          'planets': {
            'SUN': {
              'planet': 'SUN',
              'longitude': 162.45,
              'latitude': 0.0,
              'speedLongitude': 0.985,
              'isRetrograde': false,
              'isCombust': false,
              'rashiIndex': 6,
              'rashiName': 'Virgo',
              'rashiLord': 'MERCURY',
              'degreeInRashi': 12.45,
              'house': 6,
              'nakshatraIndex': 13,
              'nakshatraName': 'Hasta',
              'nakshatraLord': 'MOON',
              'pada': 1,
              'degreeInNakshatra': 0.45,
            },
            'JUPITER': {
              'planet': 'JUPITER',
              'longitude': 85.12,
              'latitude': 0.12,
              'speedLongitude': -0.05,
              'isRetrograde': true,
              'isCombust': false,
              'rashiIndex': 3,
              'rashiName': 'Gemini',
              'rashiLord': 'MERCURY',
              'degreeInRashi': 25.12,
              'house': 3,
              'nakshatraIndex': 7,
              'nakshatraName': 'Punarvasu',
              'nakshatraLord': 'JUPITER',
              'pada': 2,
              'degreeInNakshatra': 5.12,
            },
          },
        },
        'transitToMoon': [
          {
            'transitPlanet': 'SUN',
            'transitSignIndex': 6,
            'transitSignName': 'Virgo',
            'natalMoonSignIndex': 2,
            'natalMoonSignName': 'Taurus',
            'signDistance': 5,
            'houseFromMoon': 5,
            'transitNakshatra': 'Hasta',
            'bavScore': 5,
          },
        ],
        'transitToLagna': [
          {
            'transitPlanet': 'SUN',
            'transitSignIndex': 6,
            'transitSignName': 'Virgo',
            'natalLagnaSignIndex': 1,
            'natalLagnaSignName': 'Aries',
            'signDistance': 6,
            'houseFromLagna': 6,
            'angularSeparation': 162.45,
          },
        ],
        'ashtakavargaTransit': [
          {
            'planet': 'SUN',
            'transitSignIndex': 6,
            'transitSignName': 'Virgo',
            'bavPoints': 5,
            'savPoints': 31,
            'isBavFavorable': true,
            'isSavFavorable': true,
          },
        ],
        'gocharaKakshas': [
          {
            'transitPlanet': 'SUN',
            'transitSignIndex': 6,
            'transitSignName': 'Virgo',
            'degreeInSign': 12.45,
            'kakshaIndex': 4,
            'kakshaRuler': 'SUN',
            'startDegree': 11.25,
            'endDegree': 15.0,
            'hasNatalBindu': true,
            'description': 'Sun transit in Sun Kaksha',
          },
        ],
      };

      final snapshot = TransitSnapshotModel.fromJson(sampleJson);

      expect(snapshot.calculationVersion, equals('1.1.0'));
      expect(snapshot.timezone, equals('Asia/Kolkata'));
      expect(snapshot.planets.containsKey('SUN'), isTrue);
      expect(snapshot.planets.containsKey('JUPITER'), isTrue);

      final sun = snapshot.planets['SUN']!;
      expect(sun.rashiName, equals('Virgo'));
      expect(sun.formattedDegree, equals('12° 27′'));
      expect(sun.isRetrograde, isFalse);

      final jupiter = snapshot.planets['JUPITER']!;
      expect(jupiter.isRetrograde, isTrue);

      final moonRel = snapshot.getMoonRelationship('SUN');
      expect(moonRel, isNotNull);
      expect(moonRel!.houseFromMoon, equals(5));
      expect(moonRel.bavScore, equals(5));

      final lagnaRel = snapshot.getLagnaRelationship('SUN');
      expect(lagnaRel, isNotNull);
      expect(lagnaRel!.houseFromLagna, equals(6));

      final av = snapshot.getAshtakavargaDetail('SUN');
      expect(av, isNotNull);
      expect(av!.bavPoints, equals(5));
      expect(av.isBavFavorable, isTrue);

      final kaksha = snapshot.getKakshaDetail('SUN');
      expect(kaksha, isNotNull);
      expect(kaksha!.hasNatalBindu, isTrue);
      expect(kaksha.kakshaRuler, equals('SUN'));
    });
  });

  group('Phase 4 Unit Tests: Ashtakavarga Model', () {
    test('AshtakavargaResultModel parses SAV, BAV, Shodhana, and Shodhya Pindas', () {
      final sampleJson = {
        'sav': {
          'signs': {'1': 30, '2': 28, '3': 32, '4': 25, '5': 29, '6': 31, '7': 27, '8': 26, '9': 34, '10': 24, '11': 28, '12': 23},
          'signList': [30, 28, 32, 25, 29, 31, 27, 26, 34, 24, 28, 23],
          'grandTotal': 337,
        },
        'bav': {
          'SUN': {
            'planet': 'SUN',
            'signs': {'1': 4, '2': 5, '3': 4, '4': 3, '5': 6, '6': 5, '7': 3, '8': 4, '9': 5, '10': 3, '11': 4, '12': 2},
            'signList': [4, 5, 4, 3, 6, 5, 3, 4, 5, 3, 4, 2],
            'totalPoints': 48,
          },
          'JUPITER': {
            'planet': 'JUPITER',
            'signs': {'1': 5, '2': 6, '3': 5, '4': 4, '5': 5, '6': 6, '7': 4, '8': 5, '9': 6, '10': 4, '11': 3, '12': 3},
            'signList': [5, 6, 5, 4, 5, 6, 4, 5, 6, 4, 3, 3],
            'totalPoints': 56,
          },
        },
        'shodhana': {
          'SUN': {
            'planet': 'SUN',
            'trikonaReduced': [1, 2, 1, 0, 3, 2, 0, 1, 2, 0, 1, 0],
            'ekadhipatyaReduced': [1, 1, 1, 0, 3, 2, 0, 1, 2, 0, 1, 0],
            'totalTrikonaPoints': 13,
            'totalEkadhipatyaPoints': 12,
          },
        },
        'pinda': {
          'SUN': {
            'planet': 'SUN',
            'rashiPinda': 72,
            'grahaPinda': 45,
            'shodhyaPinda': 117,
          },
        },
      };

      final report = AshtakavargaResultModel.fromJson(sampleJson);

      expect(report.sav.grandTotal, equals(337));
      expect(report.sav.getScoreForRashi(1), equals(30));
      expect(report.sav.getScoreForRashi(9), equals(34));

      expect(report.bav.containsKey('SUN'), isTrue);
      final sunBav = report.bav['SUN']!;
      expect(sunBav.totalPoints, equals(48));
      expect(sunBav.getScoreForRashi(5), equals(6));

      expect(report.shodhana.containsKey('SUN'), isTrue);
      expect(report.shodhana['SUN']!.totalTrikonaPoints, equals(13));

      expect(report.pinda.containsKey('SUN'), isTrue);
      expect(report.pinda['SUN']!.shodhyaPinda, equals(117));
    });
  });

  group('Phase 4 Unit Tests: Strength Model (Shadbala & Bhava Bala)', () {
    test('ComprehensiveStrengthModel parses complete 6-fold Shadbala and 12-house Bhava Bala', () {
      final sampleJson = {
        'shadbala': {
          'planets': {
            'SUN': {
              'planet': 'SUN',
              'totalShashtiamsas': 435.5,
              'totalRupas': 7.26,
              'sthanaBala': {
                'uchchaBala': 45.0,
                'saptavargajaBala': 90.0,
                'ojhayugmaBala': 15.0,
                'kendradiBala': 30.0,
                'drekkanaBala': 10.0,
                'total': 190.0,
              },
              'digBala': 52.5,
              'kalaBala': {
                'nathonnathaBala': 48.0,
                'pakshaBala': 35.0,
                'tribhagaBala': 20.0,
                'varaBala': 0.0,
                'horaBala': 0.0,
                'ayanaBala': 45.0,
                'yuddhaBala': 0.0,
                'total': 148.0,
              },
              'cheshtaBala': 25.0,
              'naisargikaBala': 60.0,
              'drikBala': -40.0,
              'minimumRequirement': 390.0,
              'minimumRequirementRupas': 6.5,
              'ratio': 1.116,
              'isStrong': true,
              'rank': 2,
            },
          },
          'summary': [
            {
              'planet': 'SUN',
              'totalShashtiamsas': 435.5,
              'totalRupas': 7.26,
              'sthanaBala': {
                'uchchaBala': 45.0,
                'saptavargajaBala': 90.0,
                'ojhayugmaBala': 15.0,
                'kendradiBala': 30.0,
                'drekkanaBala': 10.0,
                'total': 190.0,
              },
              'digBala': 52.5,
              'kalaBala': {
                'nathonnathaBala': 48.0,
                'pakshaBala': 35.0,
                'tribhagaBala': 20.0,
                'varaBala': 0.0,
                'horaBala': 0.0,
                'ayanaBala': 45.0,
                'yuddhaBala': 0.0,
                'total': 148.0,
              },
              'cheshtaBala': 25.0,
              'naisargikaBala': 60.0,
              'drikBala': -40.0,
              'minimumRequirement': 390.0,
              'minimumRequirementRupas': 6.5,
              'ratio': 1.116,
              'isStrong': true,
              'rank': 2,
            }
          ],
        },
        'bhavaBala': {
          'houses': [
            {
              'houseNumber': 1,
              'sign': 'Aries',
              'rashiIndex': 1,
              'lord': 'MARS',
              'bhavadhipatiBala': 420.0,
              'bhavaDigBala': 30.0,
              'bhavaDrishtiBala': 15.0,
              'bhavaOccupantBala': 60.0,
              'totalShashtiamsas': 525.0,
              'totalRupas': 8.75,
              'rank': 1,
            },
            {
              'houseNumber': 10,
              'sign': 'Capricorn',
              'rashiIndex': 10,
              'lord': 'SATURN',
              'bhavadhipatiBala': 380.0,
              'bhavaDigBala': 60.0,
              'bhavaDrishtiBala': -10.0,
              'bhavaOccupantBala': 40.0,
              'totalShashtiamsas': 470.0,
              'totalRupas': 7.83,
              'rank': 3,
            },
          ],
        },
      };

      final strength = ComprehensiveStrengthModel.fromJson(sampleJson);

      expect(strength.shadbala.planets.containsKey('SUN'), isTrue);
      final sun = strength.shadbala.planets['SUN']!;
      expect(sun.totalRupas, equals(7.26));
      expect(sun.isStrong, isTrue);
      expect(sun.sthanaBala.total, equals(190.0));
      expect(sun.kalaBala.total, equals(148.0));
      expect(sun.digBala, equals(52.5));
      expect(sun.naisargikaBala, equals(60.0));

      expect(strength.bhavaBala.houses.length, equals(2));
      final h1 = strength.bhavaBala.houses.first;
      expect(h1.houseNumber, equals(1));
      expect(h1.sign, equals('Aries'));
      expect(h1.totalRupas, equals(8.75));
      expect(h1.rank, equals(1));
    });
  });
}
