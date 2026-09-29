import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/astrology/models/jaimini_model.dart';
import 'package:astro_mobile/features/astrology/models/kp_model.dart';
import 'package:astro_mobile/features/astrology/models/varshaphala_model.dart';
import 'package:astro_mobile/features/astrology/models/prashna_model.dart';

void main() {
  group('Phase 5 Unit Tests: Jaimini Astrology Model', () {
    test('JaiminiReportModel parses 7 and 8 karakas, Arudhas, and Rashi Drishti', () {
      final sampleJson = {
        'calculationVersion': '1.1.0',
        'scheme': 'SEVEN_KARAKA',
        'charaKarakas': [
          {
            'roleCode': 'AK',
            'roleName': 'Atmakaraka',
            'planet': 'SUN',
            'siderealLongitude': 142.5,
            'rashiIndex': 5,
            'rashiName': 'Leo',
            'degreeInRashi': 22.5,
            'nakshatraIndex': 11,
            'nakshatraName': 'Purva Phalguni',
            'pada': 3,
            'nakshatraLord': 'VENUS',
            'rank': 1,
          },
          {
            'roleCode': 'AmK',
            'roleName': 'Amatyakaraka',
            'planet': 'JUPITER',
            'siderealLongitude': 81.2,
            'rashiIndex': 3,
            'rashiName': 'Gemini',
            'degreeInRashi': 21.2,
            'nakshatraIndex': 7,
            'nakshatraName': 'Punarvasu',
            'pada': 1,
            'nakshatraLord': 'JUPITER',
            'rank': 2,
          },
          {
            'roleCode': 'DK',
            'roleName': 'Darakaraka',
            'planet': 'VENUS',
            'siderealLongitude': 15.3,
            'rashiIndex': 1,
            'rashiName': 'Aries',
            'degreeInRashi': 15.3,
            'nakshatraIndex': 2,
            'nakshatraName': 'Bharani',
            'pada': 1,
            'nakshatraLord': 'VENUS',
            'rank': 7,
          },
        ],
        'atmakaraka': {
          'roleCode': 'AK',
          'roleName': 'Atmakaraka',
          'planet': 'SUN',
          'siderealLongitude': 142.5,
          'rashiIndex': 5,
          'rashiName': 'Leo',
          'degreeInRashi': 22.5,
          'nakshatraIndex': 11,
          'nakshatraName': 'Purva Phalguni',
          'pada': 3,
          'nakshatraLord': 'VENUS',
          'rank': 1,
        },
        'amatyakaraka': {
          'roleCode': 'AmK',
          'roleName': 'Amatyakaraka',
          'planet': 'JUPITER',
          'siderealLongitude': 81.2,
          'rashiIndex': 3,
          'rashiName': 'Gemini',
          'degreeInRashi': 21.2,
          'nakshatraIndex': 7,
          'nakshatraName': 'Punarvasu',
          'pada': 1,
          'nakshatraLord': 'JUPITER',
          'rank': 2,
        },
        'darakaraka': {
          'roleCode': 'DK',
          'roleName': 'Darakaraka',
          'planet': 'VENUS',
          'siderealLongitude': 15.3,
          'rashiIndex': 1,
          'rashiName': 'Aries',
          'degreeInRashi': 15.3,
          'nakshatraIndex': 2,
          'nakshatraName': 'Bharani',
          'pada': 1,
          'nakshatraLord': 'VENUS',
          'rank': 7,
        },
        'arudhaPadas': [
          {
            'padaCode': 'A1',
            'house': 1,
            'signOffset': 10,
            'rashiIndex': 10,
            'rashiName': 'Capricorn',
            'lord': 'SATURN',
            'sourceLordSign': 7,
          },
          {
            'padaCode': 'A12',
            'house': 12,
            'signOffset': 4,
            'rashiIndex': 4,
            'rashiName': 'Cancer',
            'lord': 'MOON',
            'sourceLordSign': 2,
          },
        ],
        'arudhaLagna': {
          'padaCode': 'AL',
          'house': 1,
          'signOffset': 10,
          'rashiIndex': 10,
          'rashiName': 'Capricorn',
          'lord': 'SATURN',
          'sourceLordSign': 7,
        },
        'upapadaLagna': {
          'padaCode': 'UL',
          'house': 12,
          'signOffset': 4,
          'rashiIndex': 4,
          'rashiName': 'Cancer',
          'lord': 'MOON',
          'sourceLordSign': 2,
        },
        'rashiDrishtis': [
          {
            'rashiIndex': 1,
            'rashiName': 'Aries',
            'aspectedSigns': ['Leo', 'Scorpio', 'Aquarius'],
            'aspectedSignsIndices': [5, 8, 11],
            'planetsInSign': ['VENUS'],
            'aspectedPlanets': ['SUN'],
          }
        ],
        'argalas': [
          {
            'targetSignIndex': 1,
            'targetSign': 'Aries',
            'argalaHouse': 4,
            'argalaType': 'PRIMARY',
            'argalaPlanets': ['MOON'],
            'obstructionHouse': 10,
            'obstructionPlanets': [],
            'isObstructed': false,
          }
        ],
        'karakamsha': {
          'atmakarakaPlanet': 'SUN',
          'navamshaRashiIndex': 9,
          'rashiName': 'Sagittarius',
          'lord': 'JUPITER',
          'houseOffset': 9,
          'planetsInKL': ['KETU'],
        },
      };

      final report = JaiminiReportModel.fromJson(sampleJson);
      expect(report.scheme, 'SEVEN_KARAKA');
      expect(report.charaKarakas.length, 3);
      expect(report.atmakaraka?.planet, 'SUN');
      expect(report.atmakaraka?.formattedDegree, '22.50°');
      expect(report.arudhaLagna?.rashiName, 'Capricorn');
      expect(report.upapadaLagna?.rashiName, 'Cancer');
      expect(report.rashiDrishtis.first.aspectedSigns, contains('Leo'));
      expect(report.argalas.first.isObstructed, isFalse);
      expect(report.karakamsha?.lord, 'JUPITER');
    });
  });

  group('Phase 5 Unit Tests: KP Astrology Model', () {
    test('KPReportModel parses 4-tier planetary lords, Placidus cusps, and significators', () {
      final sampleJson = {
        'calculationVersion': '1.1.0',
        'ayanamsa': 'KRISHNAMURTI',
        'planets': [
          {
            'name': 'Sun',
            'longitude': 125.4,
            'signIndex': 5,
            'signName': 'Leo',
            'signLord': 'Sun',
            'degreeInSign': 5.4,
            'nakshatraIndex': 10,
            'nakshatraName': 'Magha',
            'pada': 2,
            'starLord': 'Ketu',
            'subLord': 'Mars',
            'subSubLord': 'Jupiter',
            'subNumber': 84,
            'isRetrograde': false,
            'houseOccupiency': 5,
          },
          {
            'name': 'Moon',
            'longitude': 210.15,
            'signIndex': 7,
            'signName': 'Libra',
            'signLord': 'Venus',
            'degreeInSign': 0.15,
            'nakshatraIndex': 14,
            'nakshatraName': 'Chitra',
            'pada': 3,
            'starLord': 'Mars',
            'subLord': 'Mercury',
            'subSubLord': 'Saturn',
            'subNumber': 142,
            'isRetrograde': false,
            'houseOccupiency': 7,
          }
        ],
        'cusps': [
          {
            'cuspNumber': 1,
            'longitude': 15.5,
            'signIndex': 1,
            'signName': 'Aries',
            'signLord': 'Mars',
            'degreeInSign': 15.5,
            'nakshatraIndex': 2,
            'nakshatraName': 'Bharani',
            'pada': 1,
            'starLord': 'Venus',
            'subLord': 'Sun',
            'subSubLord': 'Moon',
            'subNumber': 12,
          }
        ],
        'significators': [
          {
            'house': 1,
            'levelA': ['Sun'],
            'levelB': ['Mars'],
            'levelC': ['Jupiter'],
            'levelD': ['Mars'],
            'allSignificators': ['Sun', 'Mars', 'Jupiter'],
            'cuspSubLord': 'Sun',
          }
        ],
        'rulingPlanets': {
          'dayLord': 'Mars',
          'moonSignLord': 'Venus',
          'moonStarLord': 'Mars',
          'moonSubLord': 'Mercury',
          'lagnaSignLord': 'Mars',
          'lagnaStarLord': 'Venus',
          'lagnaSubLord': 'Sun',
        },
        'parsFortuna': {
          'name': 'Pars Fortuna',
          'longitude': 100.25,
          'signIndex': 4,
          'signName': 'Cancer',
          'signLord': 'Moon',
          'degreeInSign': 10.25,
          'nakshatraIndex': 8,
          'nakshatraName': 'Pushya',
          'pada': 3,
          'starLord': 'Saturn',
          'subLord': 'Venus',
          'subSubLord': 'Mercury',
          'subNumber': 68,
        },
      };

      final kp = KPReportModel.fromJson(sampleJson);
      expect(kp.planets.length, 2);
      expect(kp.planets.first.signLord, 'Sun');
      expect(kp.planets.first.starLord, 'Ketu');
      expect(kp.planets.first.subLord, 'Mars');
      expect(kp.planets.first.subSubLord, 'Jupiter');
      expect(kp.cusps.first.signLord, 'Mars');
      expect(kp.significators.first.levelA, contains('Sun'));
      expect(kp.rulingPlanets.dayLord, 'Mars');
      expect(kp.parsFortuna?.signName, 'Cancer');
    });
  });

  group('Phase 5 Unit Tests: Varshaphala (Solar Return) Model', () {
    test('VarshaphalaChartModel parses exact solar return snapshot, Muntha, Harsha Bala, and Sahams', () {
      final sampleJson = {
        'calculationVersion': '1.1.0',
        'solarReturn': {
          'targetYear': 2026,
          'age': 36,
          'natalSunLongitude': 54.25,
          'natalSunSign': 'Taurus',
          'natalSunDegree': 24.25,
          'solarReturnSunLongitude': 54.25,
          'solarReturnSunSign': 'Taurus',
          'solarReturnSunDegree': 24.25,
          'solarReturnUtcIso': '2026-05-15T08:30:00.000Z',
          'solarReturnLocalIso': '2026-05-15T14:00:00.000+05:30',
          'timezone': 'Asia/Kolkata',
        },
        'varshaLagna': {
          'longitude': 165.12,
          'rashiIndex': 6,
          'rashiName': 'Virgo',
          'degreeInRashi': 15.12,
          'nakshatraIndex': 13,
          'nakshatraName': 'Hasta',
          'pada': 2,
          'lord': 'Mercury',
        },
        'planets': {
          'Sun': {
            'planet': 'Sun',
            'longitude': 54.25,
            'rashiIndex': 2,
            'rashiName': 'Taurus',
            'degreeInRashi': 24.25,
            'houseInVarshaChart': 9,
            'isRetrograde': false,
          }
        },
        'houses': [
          {
            'houseNumber': 1,
            'sign': 'Virgo',
            'lord': 'Mercury',
            'occupyingPlanets': [],
          }
        ],
        'muntha': {
          'rashiIndex': 1,
          'rashiName': 'Aries',
          'longitude': 15.0,
          'degreeInRashi': 15.0,
          'lord': 'Mars',
          'houseInVarshaChart': 8,
          'houseInNatalChart': 12,
          'progressionYears': 36,
        },
        'panchadhikari': {
          'isDayReturn': true,
          'sunHouseInVarshaChart': 9,
          'candidates': [
            {
              'role': 'MUNTHESHA',
              'roleTitle': 'Muntha Lord',
              'planet': 'Mars',
              'sourceDescription': 'Lord of Aries',
              'aspectsVarshaLagna': true,
              'harshaBalaScore': 15.0,
              'houseInVarshaChart': 8,
            },
            {
              'role': 'JANMESHA',
              'roleTitle': 'Janma Lagna Lord',
              'planet': 'Venus',
              'sourceDescription': 'Lord of Natal Taurus Lagna',
              'aspectsVarshaLagna': false,
              'harshaBalaScore': 10.0,
              'houseInVarshaChart': 9,
            },
          ],
        },
        'varshesha': {
          'selectedVarshesha': 'Mars',
          'role': 'MUNTHESHA',
          'selectionReason': 'Strongest Harsha Bala with direct aspect to Varsha Lagna',
          'aspectsVarshaLagna': true,
          'harshaBalaScore': 15.0,
          'candidates': [],
        },
        'harshaBala': {
          'Sun': {
            'planet': 'Sun',
            'sthanaBala': 5.0,
            'ucchaBala': 0.0,
            'striPurushaBala': 5.0,
            'dinaRatriBala': 5.0,
            'totalScore': 15.0,
            'hasHarsha': true,
          }
        },
        'tajikaYogas': [
          {
            'type': 'ITHASALA',
            'name': 'Ithasala Yoga (Muthasila)',
            'planet1': 'Moon',
            'planet2': 'Jupiter',
            'orbDegrees': 8.0,
            'actualDistanceDegrees': 3.2,
            'isApplying': true,
            'description': 'Faster Moon actively applying to slower Jupiter',
            'strength': 'STRONG',
          }
        ],
        'sahams': [
          {
            'name': 'Punya Saham',
            'sanskritName': 'पुण्य सहम',
            'longitude': 120.4,
            'rashiIndex': 5,
            'rashiName': 'Leo',
            'degreeInRashi': 0.4,
            'houseInVarshaChart': 12,
            'formula': 'Moon - Sun + Ascendant',
            'isDayFormula': true,
          }
        ],
      };

      final varsha = VarshaphalaChartModel.fromJson(sampleJson);
      expect(varsha.targetYear, 2026);
      expect(varsha.completedAge, 36);
      expect(varsha.varshaLagna.rashiName, 'Virgo');
      expect(varsha.muntha.rashiName, 'Aries');
      expect(varsha.muntha.isAuspicious, isFalse); // House 8 is challenging
      expect(varsha.varshesha.planet, 'Mars');
      expect(varsha.panchadhikari.munthesha, 'Mars');
      expect(varsha.harshaBala['Sun']?.tier, 'Uttama');
      expect(varsha.tajikaYogas.first.yogaType, 'ITHASALA');
      expect(varsha.sahams.first.name, 'Punya Saham');
      expect(varsha.sahams.first.lord, 'Sun');
    });
  });

  group('Phase 5 Unit Tests: Prashna (Horary) Model', () {
    test('PrashnaChartModel parses horary question details, Lagna, Chandra, and Sphutas', () {
      final sampleJson = {
        'calculationVersion': '1.1.0',
        'questionTime': {
          'utcIso': '2026-09-29T10:00:00.000Z',
          'localIso': '2026-09-29T15:30:00.000+05:30',
          'timezone': 'Asia/Kolkata',
          'julianDayUT': 2461313.916,
        },
        'location': {
          'latitude': 28.6139,
          'longitude': 77.2090,
          'timezone': 'Asia/Kolkata',
          'placeName': 'New Delhi, India',
        },
        'questionText': 'Will the project launch on schedule?',
        'prashnaLagna': {
          'longitude': 212.45,
          'rashiIndex': 8,
          'rashiName': 'Scorpio',
          'degreeInRashi': 2.45,
          'nakshatraIndex': 16,
          'nakshatraName': 'Vishakha',
          'pada': 4,
          'nakshatraLord': 'Jupiter',
          'lord': 'Mars',
        },
        'planets': {
          'Moon': {
            'planet': 'Moon',
            'longitude': 52.1,
            'isRetrograde': false,
            'speedLongitude': 12.8,
            'rashiIndex': 2,
            'rashiName': 'Taurus',
            'degreeInRashi': 22.1,
            'house': 7,
            'isCombust': false,
          }
        },
        'houses': [
          {
            'houseNumber': 1,
            'cuspLongitude': 212.45,
            'rashiIndex': 8,
            'rashiName': 'Scorpio',
            'degreeInRashi': 2.45,
            'lord': 'Mars',
            'occupantPlanets': [],
          }
        ],
        'moon': {
          'longitude': 52.1,
          'rashiIndex': 2,
          'rashiName': 'Taurus',
          'degreeInRashi': 22.1,
          'nakshatraIndex': 4,
          'nakshatraName': 'Rohini',
          'pada': 4,
          'nakshatraLord': 'Moon',
          'lord': 'Venus',
          'house': 7,
        },
        'sphutas': {
          'gulika': {
            'name': 'Gulika',
            'sanskritName': 'गुलिक',
            'longitude': 185.2,
            'rashiIndex': 7,
            'rashiName': 'Libra',
            'degreeInRashi': 5.2,
            'house': 12,
            'nakshatraName': 'Chitra',
            'pada': 4,
            'nakshatraLord': 'Mars',
            'formula': 'Day Gulika Portion End',
          },
          'trisphuta': {
            'name': 'Trisphuta',
            'sanskritName': 'त्रिस्फुट',
            'longitude': 89.75,
            'rashiIndex': 3,
            'rashiName': 'Gemini',
            'degreeInRashi': 29.75,
            'house': 8,
            'nakshatraName': 'Punarvasu',
            'pada': 3,
            'nakshatraLord': 'Jupiter',
            'formula': 'Lagna + Moon + Gulika',
          },
          'chatusphuta': {
            'name': 'Chatusphuta',
            'sanskritName': 'चतुष्स्फुट',
            'longitude': 249.75,
            'rashiIndex': 9,
            'rashiName': 'Sagittarius',
            'degreeInRashi': 9.75,
            'house': 2,
            'nakshatraName': 'Mula',
            'pada': 3,
            'nakshatraLord': 'Ketu',
            'formula': 'Trisphuta + Sun',
          },
          'panchasphuta': {
            'name': 'Panchasphuta',
            'sanskritName': 'पञ्चस्फुट',
            'longitude': 69.75,
            'rashiIndex': 3,
            'rashiName': 'Gemini',
            'degreeInRashi': 9.75,
            'house': 8,
            'nakshatraName': 'Ardra',
            'pada': 1,
            'nakshatraLord': 'Rahu',
            'formula': 'Chatusphuta + Rahu',
          },
        },
        'questionNumberDetails': {
          'system': 'PARASHARI_108',
          'number': 42,
          'rashiName': 'Cancer',
          'description': 'Rotated Lagna based on seed 42 in Navamsha progression',
        },
        'isRahuKala': false,
        'panchanga': {
          'tithiName': 'Krishna Tritiya',
          'varaName': 'Tuesday',
          'nakshatraName': 'Rohini',
          'yogaName': 'Harshana',
          'karanaName': 'Vanija',
          'isRahuKala': false,
        },
      };

      final prashna = PrashnaChartModel.fromJson(sampleJson);
      expect(prashna.questionText, 'Will the project launch on schedule?');
      expect(prashna.prashnaLagna.rashiName, 'Scorpio');
      expect(prashna.chandra.rashiName, 'Taurus');
      expect(prashna.chandra.house, 7);
      expect(prashna.sphutas.gulika.rashiName, 'Libra');
      expect(prashna.sphutas.trisphuta.formattedDegree, '29.75°');
      expect(prashna.panchanga?.varaName, 'Tuesday');
      expect(prashna.isRahuKala, isFalse);
    });
  });
}
