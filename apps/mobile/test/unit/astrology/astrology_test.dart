import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/core/utils/formatters.dart';

void main() {
  group('Astrology Engine Model Unit Tests', () {
    test('AstroChartModel.fromJson parses full backend API payload', () {
      // Payload for REF_CHART_001 (1990-05-15 14:30 IST, New Delhi), engine 0.2.0 (true Lahiri, ADR-017).
      // Sun and Mercury: packages/astrology-engine/tests/fixtures/reference-charts.ts, i.e. JPL Horizons
      // apparent tropical longitude minus the IAE true Lahiri ayanamsa 23.7257785° (Sun 30.549787°,
      // Mercury 14.302297°; daily motion and latitude from Horizons). The earlier payload (Sun 50.2541°
      // Vrishabha/Rohini) did not match the sky. The ascendant is engine 0.2.0 output (no independent
      // reference in the fixture).
      final json = {
        'chart': {
          'calculationVersion': '0.2.0',
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
            'longitude': 151.9053,
            'rashiIndex': 6,
            'rashiName': 'Kanya',
            'degreeInRashi': 1.9053,
            'nakshatraIndex': 12,
            'nakshatraName': 'Uttara Phalguni',
            'pada': 2,
            'nakshatraLord': 'SUN',
          },
          'planets': [
            {
              'planet': 'SUN',
              'longitude': 30.5498,
              'latitude': 0.0,
              'speedLongitude': 0.9643,
              'isRetrograde': false,
              'rashiIndex': 2,
              'rashiName': 'Vrishabha',
              'degreeInRashi': 0.5498,
              'nakshatraIndex': 3,
              'nakshatraName': 'Krittika',
              'pada': 2,
              'nakshatraLord': 'SUN',
            },
            {
              'planet': 'MERCURY',
              'longitude': 14.3023,
              'latitude': -2.4952,
              'speedLongitude': -0.1296,
              'isRetrograde': true,
              'rashiIndex': 1,
              'rashiName': 'Mesha',
              'degreeInRashi': 14.3023,
              'nakshatraIndex': 2,
              'nakshatraName': 'Bharani',
              'pada': 1,
              'nakshatraLord': 'VENUS',
            },
          ],
          'houses': [],
        },
      };

      final chart = AstroChartModel.fromJson(json);

      expect(chart.calculationVersion, equals('0.2.0'));
      expect(chart.providerName, contains('AstronomyEngineAdapter'));
      expect(chart.config.ayanamsa, equals('LAHIRI'));
      expect(chart.config.zodiacType, equals('SIDEREAL'));

      expect(chart.ascendant, isNotNull);
      expect(chart.ascendant!.rashiName, equals('Kanya'));
      expect(chart.ascendant!.nakshatraLord, equals('SUN'));

      expect(chart.planets.length, equals(2));
      final sun = chart.planets.firstWhere((p) => p.planet == 'SUN');
      expect(sun.rashiName, equals('Vrishabha'));
      expect(sun.nakshatraName, equals('Krittika'));
      expect(sun.pada, equals(2));
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
