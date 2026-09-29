import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/astrology/models/panchang_model.dart';
import 'package:astro_mobile/features/astrology/models/yoga_model.dart';
import 'package:astro_mobile/features/astrology/models/special_points_model.dart';

void main() {
  group('Phase 3 Unit Tests: PanchangModel', () {
    final samplePanchangJson = {
      'date': '1990-05-15',
      'location': {
        'latitude': 28.6139,
        'longitude': 77.2090,
        'timezone': 'Asia/Kolkata',
      },
      'instantaneous': {
        'tithi': {
          'index': 6,
          'name': 'Shashthi',
          'paksha': 'KRISHNA',
          'degreeInTithi': 8.45,
          'completionPercentage': 70.4,
          'startIso': '1990-05-15T02:30:00.000Z',
          'endIso': '1990-05-16T00:15:00.000Z',
        },
        'vara': {
          'dayIndex': 2,
          'name': 'Mangalavara',
          'lord': 'MARS',
        },
        'nakshatra': {
          'index': 21,
          'name': 'Uttara Ashadha',
          'lord': 'SUN',
          'pada': 3,
        },
        'yoga': {
          'index': 23,
          'name': 'Shubha',
          'completionPercentage': 45.2,
        },
        'karana': {
          'index': 12,
          'name': 'Taitila',
          'type': 'MOVABLE',
        },
        'sunriseSunset': {
          'sunriseIso': '1990-05-15T05:32:00.000Z',
          'sunsetIso': '1990-05-15T19:04:00.000Z',
          'dayLengthMinutes': 812,
        },
        'rahuKala': {
          'startIso': '1990-05-15T15:00:00.000Z',
          'endIso': '1990-05-15T16:30:00.000Z',
          'segmentIndex': 7,
          'totalSegments': 8,
        },
        'hinduCalendar': {
          'amantaMasa': 'Vaishakha',
          'purnimantaMasa': 'Jyeshtha',
          'paksha': 'KRISHNA',
          'tithiIndex': 6,
          'tithiName': 'Shashthi',
          'solarRashi': 'Vrishabha',
          'solarRashiIndex': 2,
          'isAdhika': false,
        },
      },
      'transitions': [
        {
          'type': 'TITHI_CHANGE',
          'name': 'Shashthi to Saptami',
          'timestampIso': '1990-05-16T00:15:00.000Z',
          'fromName': 'Shashthi',
          'toName': 'Saptami',
        },
      ],
    };

    test('PanchangModel parses complete backend API response and computes formatters', () {
      final panchang = PanchangModel.fromJson(samplePanchangJson);

      expect(panchang.date, '1990-05-15');
      expect(panchang.latitude, 28.6139);
      expect(panchang.longitude, 77.2090);
      expect(panchang.timezone, 'Asia/Kolkata');

      // Tithi
      expect(panchang.tithi.index, 6);
      expect(panchang.tithi.name, 'Shashthi');
      expect(panchang.tithi.paksha, 'KRISHNA');
      expect(panchang.tithi.formattedPaksha, 'Krishna Paksha (Waning)');
      expect(panchang.tithi.isShukla, false);

      // Vara
      expect(panchang.vara.dayIndex, 2);
      expect(panchang.vara.name, 'Mangalavara');
      expect(panchang.vara.lord, 'MARS');
      expect(panchang.vara.englishDayName, 'Tuesday');

      // Nakshatra & Yoga & Karana
      expect(panchang.nakshatra.name, 'Uttara Ashadha');
      expect(panchang.nakshatra.lord, 'SUN');
      expect(panchang.nakshatra.pada, 3);
      expect(panchang.yoga.name, 'Shubha');
      expect(panchang.karana.name, 'Taitila');
      expect(panchang.karana.type, 'MOVABLE');

      // Sun & Rahu Kala
      expect(panchang.sunriseSunset?.formattedDayLength, '13h 32m');
      expect(panchang.rahuKala?.segmentIndex, 7);

      // Hindu Calendar
      expect(panchang.hinduCalendar?.amantaMasa, 'Vaishakha');
      expect(panchang.hinduCalendar?.solarRashi, 'Vrishabha');
      expect(panchang.hinduCalendar?.isAdhika, false);

      // Transitions
      expect(panchang.transitions.length, 1);
      expect(panchang.transitions.first.name, 'Shashthi to Saptami');
    });
  });

  group('Phase 3 Unit Tests: YogaEvaluationReportModel', () {
    final sampleYogaJson = {
      'calculationVersion': '1.0.0',
      'varga': 'D1',
      'totalEvaluated': 45,
      'detectedCount': 3,
      'detectedYogas': [
        {
          'id': 'gajakesari',
          'canonicalName': 'Gaja Kesari Yoga',
          'sanskritName': 'गजकेसरी योग',
          'category': 'CHANDRA',
          'isDetected': true,
          'varga': 'D1',
          'convention': 'PARASHARI',
          'evidence': {
            'conditions': [
              {
                'id': 'jupiter_kendra_moon',
                'description': 'Jupiter in Kendra from Moon',
                'satisfied': true,
                'expected': true,
                'observed': true,
              },
            ],
            'involvedPlanets': [
              {
                'planet': 'JUPITER',
                'rashiIndex': 4,
                'rashiName': 'Karka',
                'house': 1,
                'longitude': 95.8,
                'degreeInRashi': 5.8,
                'dignity': 'EXALTED',
                'isCombust': false,
                'isRetrograde': true,
              },
              {
                'planet': 'MOON',
                'rashiIndex': 10,
                'rashiName': 'Makara',
                'house': 7,
                'longitude': 275.4,
                'degreeInRashi': 5.4,
                'dignity': 'NEUTRAL',
                'isCombust': false,
                'isRetrograde': false,
              },
            ],
            'involvedHouses': [
              {
                'houseNumber': 1,
                'rashiIndex': 4,
                'rashiName': 'Karka',
                'lord': 'MOON',
                'occupyingPlanets': ['JUPITER'],
              },
            ],
            'relationships': [
              {
                'relationshipType': 'KENDRA_RELATION',
                'planets': ['JUPITER', 'MOON'],
                'houses': [1, 7],
                'description': 'Jupiter in 7th house (Kendra) from Moon',
              },
            ],
            'strengthFactors': ['Jupiter is exalted in Cancer (1st house)'],
          },
        },
      ],
    };

    test('YogaEvaluationReportModel parses structured evidence, conditions, and planets', () {
      final report = YogaEvaluationReportModel.fromJson(sampleYogaJson);

      expect(report.calculationVersion, '1.0.0');
      expect(report.varga, 'D1');
      expect(report.totalEvaluated, 45);
      expect(report.detectedCount, 3);
      expect(report.detectedYogas.length, 1);

      final yoga = report.detectedYogas.first;
      expect(yoga.id, 'gajakesari');
      expect(yoga.canonicalName, 'Gaja Kesari Yoga');
      expect(yoga.sanskritName, 'गजकेसरी योग');
      expect(yoga.category, 'CHANDRA');
      expect(yoga.formattedCategory, 'Chandra (Lunar) Yoga');
      expect(yoga.planetNames, ['JUPITER', 'MOON']);
      expect(yoga.houseNumbers, [1]);

      expect(yoga.evidence.conditions.length, 1);
      expect(yoga.evidence.conditions.first.satisfied, true);
      expect(yoga.evidence.involvedPlanets.first.dignity, 'EXALTED');
      expect(yoga.evidence.relationships.first.relationshipType, 'KENDRA_RELATION');
    });
  });

  group('Phase 3 Unit Tests: SpecialPointsReportModel', () {
    final sampleSpecialPointsJson = {
      'data': {
        'upagrahas': {
          'dhooma': {
            'name': 'Dhooma',
            'sanskritName': 'धूम',
            'longitude': 163.5,
            'rashiIndex': 6,
            'rashiName': 'Kanya',
            'degreeInRashi': 13.5,
            'house': 2,
            'nakshatraIndex': 13,
            'nakshatraName': 'Hasta',
            'pada': 2,
            'nakshatraLord': 'Moon',
            'formula': 'Sun Longitude + 133°20\'',
            'category': 'UPAGRAHA',
          },
          'vyatipata': {
            'name': 'Vyatipata',
            'sanskritName': 'व्यतीपात',
            'longitude': 196.5,
            'rashiIndex': 7,
            'rashiName': 'Tula',
            'degreeInRashi': 16.5,
            'house': 3,
            'nakshatraIndex': 15,
            'nakshatraName': 'Swati',
            'pada': 3,
            'nakshatraLord': 'Rahu',
            'formula': '360° - Dhooma',
            'category': 'UPAGRAHA',
          },
          'parivesha': {
            'name': 'Parivesha',
            'sanskritName': 'परिवेष',
            'longitude': 16.5,
            'rashiIndex': 1,
            'rashiName': 'Mesha',
            'degreeInRashi': 16.5,
            'house': 9,
            'nakshatraIndex': 2,
            'nakshatraName': 'Bharani',
            'pada': 1,
            'nakshatraLord': 'Venus',
            'formula': 'Vyatipata + 180°',
            'category': 'UPAGRAHA',
          },
          'indrachapa': {
            'name': 'Indrachapa',
            'sanskritName': 'इन्द्रचाप',
            'longitude': 343.5,
            'rashiIndex': 12,
            'rashiName': 'Meena',
            'degreeInRashi': 13.5,
            'house': 8,
            'nakshatraIndex': 26,
            'nakshatraName': 'Uttara Bhadrapada',
            'pada': 4,
            'nakshatraLord': 'Saturn',
            'formula': '360° - Parivesha',
            'category': 'UPAGRAHA',
          },
          'upaketu': {
            'name': 'Upaketu',
            'sanskritName': 'उपकेतु',
            'longitude': 0.16,
            'rashiIndex': 1,
            'rashiName': 'Mesha',
            'degreeInRashi': 0.16,
            'house': 9,
            'nakshatraIndex': 1,
            'nakshatraName': 'Ashwini',
            'pada': 1,
            'nakshatraLord': 'Ketu',
            'formula': 'Indrachapa + 16°40\'',
            'category': 'UPAGRAHA',
          },
          'gulika': {
            'name': 'Gulika',
            'sanskritName': 'गुलिक',
            'longitude': 112.4,
            'rashiIndex': 4,
            'rashiName': 'Karka',
            'degreeInRashi': 22.4,
            'house': 12,
            'nakshatraIndex': 9,
            'nakshatraName': 'Ashlesha',
            'pada': 2,
            'nakshatraLord': 'Mercury',
            'formula': 'Saturn portion of daytime divisions',
            'category': 'UPAGRAHA',
          },
          'mandi': {
            'name': 'Mandi',
            'sanskritName': 'मान्दि',
            'longitude': 108.2,
            'rashiIndex': 4,
            'rashiName': 'Karka',
            'degreeInRashi': 18.2,
            'house': 12,
            'nakshatraIndex': 9,
            'nakshatraName': 'Ashlesha',
            'pada': 1,
            'nakshatraLord': 'Mercury',
            'formula': 'Middle of Gulika duration segment',
            'category': 'UPAGRAHA',
          },
        },
        'specialLagnas': {
          'bhavaLagna': {
            'name': 'Bhava Lagna',
            'sanskritName': 'भाव लग्न',
            'longitude': 150.2,
            'rashiIndex': 6,
            'rashiName': 'Kanya',
            'degreeInRashi': 0.2,
            'house': 2,
            'nakshatraIndex': 12,
            'nakshatraName': 'Uttara Phalguni',
            'pada': 2,
            'nakshatraLord': 'Sun',
            'formula': 'Sun longitude + (Birth time past sunrise * 1 rashi/ghati)',
            'category': 'SPECIAL_LAGNA',
          },
          'horaLagna': {
            'name': 'Hora Lagna',
            'sanskritName': 'होरा लग्न',
            'longitude': 210.5,
            'rashiIndex': 7,
            'rashiName': 'Tula',
            'degreeInRashi': 0.5,
            'house': 3,
            'nakshatraIndex': 16,
            'nakshatraName': 'Vishakha',
            'pada': 1,
            'nakshatraLord': 'Jupiter',
            'formula': 'Sun longitude + (Birth time past sunrise * 1 rashi/hora)',
            'category': 'SPECIAL_LAGNA',
          },
          'ghatikaLagna': {
            'name': 'Ghatika Lagna',
            'sanskritName': 'घटिका लग्न',
            'longitude': 270.8,
            'rashiIndex': 10,
            'rashiName': 'Makara',
            'degreeInRashi': 0.8,
            'house': 6,
            'nakshatraIndex': 21,
            'nakshatraName': 'Uttara Ashadha',
            'pada': 2,
            'nakshatraLord': 'Sun',
            'formula': 'Sun longitude + (Birth time past sunrise * 1 rashi/ghatika)',
            'category': 'SPECIAL_LAGNA',
          },
          'induLagna': {
            'name': 'Indu Lagna',
            'sanskritName': 'इन्दु लग्न',
            'longitude': 120.4,
            'rashiIndex': 5,
            'rashiName': 'Simha',
            'degreeInRashi': 0.4,
            'house': 1,
            'nakshatraIndex': 10,
            'nakshatraName': 'Magha',
            'pada': 1,
            'nakshatraLord': 'Ketu',
            'formula': 'Moon sign + ((9th lord from Lagna kalas + 9th lord from Moon kalas) % 12)',
            'category': 'SPECIAL_LAGNA',
          },
          'pranapadaLagna': {
            'name': 'Pranapada Lagna',
            'sanskritName': 'प्राणपद लग्न',
            'longitude': 45.2,
            'rashiIndex': 2,
            'rashiName': 'Vrishabha',
            'degreeInRashi': 15.2,
            'house': 10,
            'nakshatraIndex': 4,
            'nakshatraName': 'Rohini',
            'pada': 2,
            'nakshatraLord': 'Moon',
            'formula': 'Vedic breath cycle harmonics',
            'category': 'SPECIAL_LAGNA',
          },
          'varnadaLagna': {
            'name': 'Varnada Lagna',
            'sanskritName': 'वर्णद लग्न',
            'longitude': 75.1,
            'rashiIndex': 3,
            'rashiName': 'Mithuna',
            'degreeInRashi': 15.1,
            'house': 11,
            'nakshatraIndex': 6,
            'nakshatraName': 'Ardra',
            'pada': 3,
            'nakshatraLord': 'Rahu',
            'formula': 'Lagna and Hora Lagna count synthesis',
            'category': 'SPECIAL_LAGNA',
          },
        },
        'arishtaPoints': {
          'sixtyFourthNavamshaMoon': {
            'name': '64th Navamsha from Moon',
            'sanskritName': 'चतुःषष्ट्यंश (चन्द्र)',
            'longitude': 85.4,
            'rashiIndex': 3,
            'rashiName': 'Mithuna',
            'degreeInRashi': 25.4,
            'house': 11,
            'nakshatraIndex': 7,
            'nakshatraName': 'Punarvasu',
            'pada': 2,
            'nakshatraLord': 'Jupiter',
            'formula': 'Moon Longitude + 210°',
            'category': 'ARISHTA_POINT',
          },
          'sixtyFourthNavamshaAscendant': {
            'name': '64th Navamsha from Ascendant',
            'sanskritName': 'चतुःषष्ट्यंश (लग्न)',
            'longitude': 355.2,
            'rashiIndex': 12,
            'rashiName': 'Meena',
            'degreeInRashi': 25.2,
            'house': 8,
            'nakshatraIndex': 27,
            'nakshatraName': 'Revati',
            'pada': 3,
            'nakshatraLord': 'Mercury',
            'formula': 'Ascendant Longitude + 210°',
            'category': 'ARISHTA_POINT',
          },
          'twentySecondDrekkanaAscendant': {
            'name': '22nd Drekkana from Ascendant (Kharesha)',
            'sanskritName': 'द्वाविंश द्वेष्काण (खरेश)',
            'longitude': 355.2,
            'rashiIndex': 12,
            'rashiName': 'Meena',
            'degreeInRashi': 25.2,
            'house': 8,
            'nakshatraIndex': 27,
            'nakshatraName': 'Revati',
            'pada': 3,
            'nakshatraLord': 'Mercury',
            'formula': 'Ascendant Longitude + 210°',
            'category': 'ARISHTA_POINT',
          },
          'twentySecondDrekkanaMoon': {
            'name': '22nd Drekkana from Moon',
            'sanskritName': 'द्वाविंश द्वेष्काण (चन्द्र)',
            'longitude': 85.4,
            'rashiIndex': 3,
            'rashiName': 'Mithuna',
            'degreeInRashi': 25.4,
            'house': 11,
            'nakshatraIndex': 7,
            'nakshatraName': 'Punarvasu',
            'pada': 2,
            'nakshatraLord': 'Jupiter',
            'formula': 'Moon Longitude + 210°',
            'category': 'ARISHTA_POINT',
          },
          'sarpaDreshkanaPlacements': [],
        },
        'yogiPoints': {
          'yogiPoint': {
            'name': 'Yogi Point',
            'sanskritName': 'योगी',
            'longitude': 105.9,
            'rashiIndex': 4,
            'rashiName': 'Karka',
            'degreeInRashi': 15.9,
            'house': 12,
            'nakshatraIndex': 8,
            'nakshatraName': 'Pushya',
            'pada': 4,
            'nakshatraLord': 'Saturn',
            'formula': 'Sun Longitude + Moon Longitude + 93°20\'',
            'category': 'YOGI_POINT',
          },
          'yogiPlanet': 'Saturn',
          'yogiNakshatra': 'Pushya',
          'avyogiPoint': {
            'name': 'Avyogi Point',
            'sanskritName': 'अव्योगी',
            'longitude': 285.9,
            'rashiIndex': 10,
            'rashiName': 'Makara',
            'degreeInRashi': 15.9,
            'house': 6,
            'nakshatraIndex': 22,
            'nakshatraName': 'Shravana',
            'pada': 2,
            'nakshatraLord': 'Moon',
            'formula': 'Yogi Point + 186°40\'',
            'category': 'YOGI_POINT',
          },
          'avyogiPlanet': 'Moon',
          'avyogiNakshatra': 'Shravana',
          'duplicateYogiPlanet': 'Mars',
        },
        'mrityuBhaga': {
          'hasAnyAfflicted': false,
          'afflictedPlanets': [],
          'points': [
            {
              'planet': 'SUN',
              'exactFatalDegree': 20.0,
              'currentDegreeInRashi': 0.5,
              'deltaDegree': 19.5,
              'isWithinOrb': false,
              'orbDegrees': 1.0,
              'severity': 'NONE',
            },
          ],
        },
      },
    };

    test('SpecialPointsReportModel parses upagrahas, lagnas, yogi points, and arishta points', () {
      final report = SpecialPointsReportModel.fromJson(sampleSpecialPointsJson);

      // Upagrahas
      expect(report.upagrahas.allPoints.length, 7);
      expect(report.upagrahas.dhooma.name, 'Dhooma');
      expect(report.upagrahas.dhooma.rashiName, 'Kanya');
      expect(report.upagrahas.gulika.name, 'Gulika');
      expect(report.upagrahas.mandi.name, 'Mandi');

      // Special Lagnas
      expect(report.specialLagnas.allLagnas.length, 6);
      expect(report.specialLagnas.induLagna.name, 'Indu Lagna');
      expect(report.specialLagnas.horaLagna.name, 'Hora Lagna');
      expect(report.specialLagnas.ghatikaLagna.name, 'Ghatika Lagna');

      // Yogi Points
      expect(report.yogiPoints.yogiPlanet, 'Saturn');
      expect(report.yogiPoints.avyogiPlanet, 'Moon');
      expect(report.yogiPoints.duplicateYogiPlanet, 'Mars');

      // Arishta & Mrityu Bhaga
      expect(report.arishtaPoints.allPoints.length, 4);
      expect(report.mrityuBhaga.hasAnyAfflicted, false);
      expect(report.mrityuBhaga.points.length, 1);
    });
  });
}
