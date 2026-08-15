import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/core/utils/formatters.dart';

void main() {
  group('Astrology Engine Model Unit Tests', () {
    test('AstroChartModel.fromJson parses full backend API payload', () {
      final json = {
        'chart': {
          'calculationVersion': '0.1.0',
          'providerName': 'AstronomyEngineAdapter (astronomy-engine)',
          'providerVersion': '2.1.19-mit',
          'normalizedTime': {
            'utcIsoString': '1990-05-15T09:00:00.000Z',
            'julianDayUT': 2448026.875,
            'timezoneOffsetMinutes': 330,
          },
          'config': {
            'zodiacType': 'SIDEREAL',
            'ayanamsa': 'LAHIRI',
            'houseSystem': 'WHOLE_SIGN',
            'nodeCalculation': 'MEAN_NODE',
            'planetaryCalculationMode': 'GEOCENTRIC',
          },
          'ascendant': {
            'longitude': 120.45,
            'rashiIndex': 4,
            'rashiName': 'Simha',
            'degreeInRashi': 0.45,
            'nakshatraIndex': 10,
            'nakshatraName': 'Magha',
            'pada': 1,
            'nakshatraLord': 'KETU',
          },
          'planets': [
            {
              'planet': 'SUN',
              'longitude': 50.2541,
              'latitude': 0.0,
              'speedLongitude': 0.963,
              'isRetrograde': false,
              'rashiIndex': 2,
              'rashiName': 'Vrishabha',
              'degreeInRashi': 20.2541,
              'nakshatraIndex': 4,
              'nakshatraName': 'Rohini',
              'pada': 4,
              'nakshatraLord': 'MOON',
            },
            {
              'planet': 'MERCURY',
              'longitude': 42.12,
              'latitude': -1.2,
              'speedLongitude': -0.15,
              'isRetrograde': true,
              'rashiIndex': 2,
              'rashiName': 'Vrishabha',
              'degreeInRashi': 12.12,
              'nakshatraIndex': 4,
              'nakshatraName': 'Rohini',
              'pada': 1,
              'nakshatraLord': 'MOON',
            },
          ],
          'houses': [],
        },
      };

      final chart = AstroChartModel.fromJson(json);

      expect(chart.calculationVersion, equals('0.1.0'));
      expect(chart.providerName, contains('AstronomyEngineAdapter'));
      expect(chart.config.ayanamsa, equals('LAHIRI'));
      expect(chart.config.zodiacType, equals('SIDEREAL'));

      expect(chart.ascendant, isNotNull);
      expect(chart.ascendant!.rashiName, equals('Simha'));
      expect(chart.ascendant!.nakshatraLord, equals('KETU'));

      expect(chart.planets.length, equals(2));
      final sun = chart.planets.firstWhere((p) => p.planet == 'SUN');
      expect(sun.rashiName, equals('Vrishabha'));
      expect(sun.isRetrograde, isFalse);

      final mercury = chart.planets.firstWhere((p) => p.planet == 'MERCURY');
      expect(mercury.isRetrograde, isTrue);
    });

    test('Formatters format degree in rashi correctly', () {
      expect(Formatters.formatDegree(20.2541), equals('20° 15′'));
      expect(Formatters.formatDegree(0.5), equals('0° 30′'));
    });
  });
}
