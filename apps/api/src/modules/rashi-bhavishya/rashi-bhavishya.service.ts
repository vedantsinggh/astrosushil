import { prisma } from '../../services/prisma.service';
import { ChartCalculator, AstrologyConfig, RASHIS } from '@astro/astrology-engine';
import { mapBirthProfileToBirthDetails } from '../astrology/birth-details.mapper';
import { DAILY_PREDICTION_FIXTURES, RashiDailyPredictionContent } from './rashi-bhavishya.fixtures';
import { RashiBhavishyaQuery } from './rashi-bhavishya.schemas';

export interface RashiBhavishyaResponseDto {
  data: {
    date: string;
    rashi: {
      index: number;
      sanskritName: string;
      englishName: string;
      element: string;
      ruler: string;
    };
    prediction: {
      summary: string;
      categories: {
        general: string;
        health: string;
        love: string;
        career: string;
        finance: string;
      };
      luckyNumber: number;
      luckyColor: string;
    };
    source: string;
    isDevelopmentFixture: boolean;
  };
}

export class RashiBhavishyaService {
  private readonly calculator: ChartCalculator;

  constructor(calculator?: ChartCalculator) {
    this.calculator = calculator || new ChartCalculator();
  }

  /**
   * Retrieves today's Rashi Bhavishya prediction for an authenticated user.
   * Identifies user's Moon Rashi from their BirthProfile if query parameters are not supplied.
   */
  public async getTodayPrediction(
    userId: string,
    query?: RashiBhavishyaQuery
  ): Promise<RashiBhavishyaResponseDto> {
    const todayStr = query?.date || new Date().toISOString().split('T')[0];
    let rashiIndex = 1; // Default fallback to Mesha (1)

    // 1. If explicit rashiIndex is passed in query
    if (query?.rashiIndex) {
      rashiIndex = query.rashiIndex;
    } else if (query?.rashi) {
      // 2. Lookup by Rashi name (sanskrit or english case-insensitive match)
      const targetName = query.rashi.trim().toLowerCase();
      const matched = RASHIS.find(
        (r) =>
          r.sanskritName.toLowerCase() === targetName ||
          r.englishName.toLowerCase() === targetName
      );
      if (matched) {
        rashiIndex = matched.index;
      }
    } else {
      // 3. Automated Rashi Identification via User's Primary BirthProfile
      const userProfile = await prisma.birthProfile.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (userProfile) {
        try {
          const birthDetails = mapBirthProfileToBirthDetails(userProfile);
          const activeConfig: AstrologyConfig = {
            zodiacType: 'SIDEREAL',
            ayanamsa: 'LAHIRI',
            houseSystem: 'WHOLE_SIGN',
            nodeCalculation: 'MEAN_NODE',
            planetaryCalculationMode: 'GEOCENTRIC',
          };
          const chart = await this.calculator.calculateChart(birthDetails, activeConfig);
          // Moon Rashi is standard for Vedic Rashi Bhavishya daily horoscope
          const moonPlanet = chart.planets.MOON;
          if (moonPlanet) {
            rashiIndex = moonPlanet.rashiIndex;
          }
        } catch {
          // Fallback to default rashiIndex 1 if calculation fails
          rashiIndex = 1;
        }
      }
    }

    const fixture = DAILY_PREDICTION_FIXTURES[rashiIndex] || DAILY_PREDICTION_FIXTURES[1];

    return {
      data: {
        date: todayStr,
        rashi: {
          index: fixture.rashiIndex,
          sanskritName: fixture.sanskritName,
          englishName: fixture.englishName,
          element: fixture.element,
          ruler: fixture.ruler,
        },
        prediction: {
          summary: fixture.summary,
          categories: fixture.categories,
          luckyNumber: fixture.luckyNumber,
          luckyColor: fixture.luckyColor,
        },
        source: 'AstroSushil Reference Content Fixtures',
        isDevelopmentFixture: true,
      },
    };
  }

  /**
   * Returns predictions for all 12 Rashis for today.
   */
  public async getAllPredictions(date?: string): Promise<{ data: RashiDailyPredictionContent[] }> {
    const predictions = Object.values(DAILY_PREDICTION_FIXTURES);
    return {
      data: predictions,
    };
  }
}

export const rashiBhavishyaService = new RashiBhavishyaService();
