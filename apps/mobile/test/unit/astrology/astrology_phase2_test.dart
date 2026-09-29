import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/astrology/models/dasha_model.dart';
import 'package:astro_mobile/features/astrology/models/divisional_chart_info.dart';

void main() {
  group('Phase 2: Dasha & Divisional Chart Models Unit Tests', () {
    test('DivisionalChartInfo catalog contains all 16 Vedic Shodashvargas', () {
      expect(DivisionalChartInfo.allVargas.length, 16);

      final codes = DivisionalChartInfo.allVargas.map((v) => v.code).toSet();
      const expectedCodes = {
        'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
        'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'
      };
      expect(codes, expectedCodes);

      final priorityCodes = DivisionalChartInfo.priorityVargas.map((v) => v.code).toList();
      expect(priorityCodes, ['D1', 'D9', 'D10', 'D60']);

      final d9 = DivisionalChartInfo.findByCode('d9');
      expect(d9.code, 'D9');
      expect(d9.sanskritName, contains('Navamsha'));
      expect(d9.division, 9);
      expect(d9.isPriority, true);

      final d60 = DivisionalChartInfo.findByCode('D60');
      expect(d60.code, 'D60');
      expect(d60.sanskritName, contains('Shashtiamsha'));
      expect(d60.division, 60);
    });

    test('DashaPeriodModel parses multi-tier periods and formats durations correctly', () {
      final samplePeriodJson = {
        'level': 1,
        'lord': 'JUPITER',
        'order': 5,
        'startDateIso': '2020-01-01T00:00:00.000Z',
        'endDateIso': '2036-01-01T00:00:00.000Z',
        'durationYears': 16.0,
        'nominalYears': 16.0,
        'isBirthDasha': false,
        'isActive': true,
        'subPeriods': [
          {
            'level': 2,
            'lord': 'SATURN',
            'order': 2,
            'startDateIso': '2022-02-18T00:00:00.000Z',
            'endDateIso': '2024-09-01T00:00:00.000Z',
            'durationYears': 2.53,
            'nominalYears': 2.53,
            'isActive': true,
            'subPeriods': [
              {
                'level': 3,
                'lord': 'MERCURY',
                'order': 3,
                'startDateIso': '2023-05-10T00:00:00.000Z',
                'endDateIso': '2023-09-18T00:00:00.000Z',
                'durationYears': 0.36,
                'isActive': true,
              }
            ],
          }
        ],
      };

      final md = DashaPeriodModel.fromJson(samplePeriodJson);
      expect(md.planet, 'JUPITER');
      expect(md.displayName, 'Jupiter');
      expect(md.sanskritName, contains('Guru'));
      expect(md.level, 'MAHADASHA');
      expect(md.levelNumber, 1);
      expect(md.durationYears, 16.0);
      expect(md.formattedDuration, '16.0 Years');
      expect(md.formattedDateRange, contains('2020'));
      expect(md.formattedDateRange, contains('2036'));
      expect(md.subPeriods.length, 1);

      final ad = md.subPeriods.first;
      expect(ad.displayName, 'Saturn');
      expect(ad.level, 'ANTARDASHA');
      expect(ad.levelNumber, 2);
      expect(ad.subPeriods.length, 1);

      final pd = ad.subPeriods.first;
      expect(pd.displayName, 'Mercury');
      expect(pd.level, 'PRATYANTARDASHA');
      expect(pd.levelNumber, 3);
    });

    test('DashaTreeModel parses full Fastify backend API response structure', () {
      final apiResponse = {
        'data': {
          'system': 'VIMSHOTTARI',
          'totalSpanYears': 120,
          'tree': {
            'system': 'VIMSHOTTARI',
            'periods': [
              {
                'level': 1,
                'lord': 'KETU',
                'order': 1,
                'startDateIso': '1990-05-15T00:00:00.000Z',
                'endDateIso': '1997-05-15T00:00:00.000Z',
                'durationYears': 7.0,
                'subPeriods': [],
              },
              {
                'level': 1,
                'lord': 'VENUS',
                'order': 2,
                'startDateIso': '1997-05-15T00:00:00.000Z',
                'endDateIso': '2017-05-15T00:00:00.000Z',
                'durationYears': 20.0,
                'subPeriods': [],
              },
              {
                'level': 1,
                'lord': 'SUN',
                'order': 3,
                'startDateIso': '2017-05-15T00:00:00.000Z',
                'endDateIso': '2023-05-15T00:00:00.000Z',
                'durationYears': 6.0,
                'subPeriods': [],
              },
              {
                'level': 1,
                'lord': 'MOON',
                'order': 4,
                'startDateIso': '2023-05-15T00:00:00.000Z',
                'endDateIso': '2033-05-15T00:00:00.000Z',
                'durationYears': 10.0,
                'isActive': true,
                'subPeriods': [
                  {
                    'level': 2,
                    'lord': 'MARS',
                    'order': 2,
                    'startDateIso': '2024-03-15T00:00:00.000Z',
                    'endDateIso': '2024-10-15T00:00:00.000Z',
                    'durationYears': 0.58,
                    'isActive': true,
                    'subPeriods': [],
                  }
                ],
              },
            ],
            'activeDasha': {
              'targetDateIso': '2024-06-01T00:00:00.000Z',
              'mahadasha': {
                'level': 1,
                'lord': 'MOON',
                'startDateIso': '2023-05-15T00:00:00.000Z',
                'endDateIso': '2033-05-15T00:00:00.000Z',
                'durationYears': 10.0,
                'nominalYears': 10.0,
              },
              'path': ['MOON', 'MARS'],
              'description': 'Moon-Mars',
            },
          },
        },
      };

      final tree = DashaTreeModel.fromJson(apiResponse);
      expect(tree.system, 'VIMSHOTTARI');
      expect(tree.totalSpanYears, 120);
      expect(tree.mahadashas.length, 4);
      expect(tree.activeDasha, isNotNull);
      expect(tree.activeDasha!.mahadasha.lord, 'MOON');
      expect(tree.activeDasha!.description, 'Moon-Mars');

      final testDate = DateTime.parse('2024-06-01T00:00:00.000Z');
      final activeMd = tree.getCurrentMahadasha(testDate);
      expect(activeMd, isNotNull);
      expect(activeMd!.displayName, 'Moon');

      final activeAd = tree.getCurrentAntardasha(testDate);
      expect(activeAd, isNotNull);
      expect(activeAd!.displayName, 'Mars');
    });
  });
}
