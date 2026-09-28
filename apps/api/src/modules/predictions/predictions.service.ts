import { prisma } from '../../services/prisma.service';
import { NotFoundError } from '../../errors/app-error';
import { astrologyService } from '../astrology/astrology.service';
import { guptaNadiService } from '../gupta-nadi/gupta-nadi.service';
import {
  GenerateNatalPredictionInput,
  GenerateTransitPredictionInput,
} from './predictions.schemas';

export class PredictionsService {
  public async generateNatalPrediction(
    input: GenerateNatalPredictionInput,
    requestingUser: { id: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | string }
  ) {
    // 1. Ownership authorization check
    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(requestingUser.role);
    if (!profile || (profile.userId !== requestingUser.id && !isAdmin)) {
      throw new NotFoundError('Birth profile not found');
    }

    // 2. Fetch chart and BNN rule evaluation
    const chartData = await astrologyService.calculateChartForProfile(
      input.birthProfileId,
      requestingUser
    );

    const nadiData = await guptaNadiService.evaluateForProfile(
      { birthProfileId: input.birthProfileId, gender: 'MALE' },
      requestingUser
    );

    // 3. Compile deterministic prediction tree payload
    return {
      birthProfileId: input.birthProfileId,
      domain: input.domain || 'ALL',
      generatedAt: new Date().toISOString(),
      chartSummary: {
        ascendantSign: chartData.chart.ascendant ? (chartData.chart.ascendant as any).rashiName : 'Not Available',
        totalPlanetsEvaluated: chartData.chart.planets.length,
      },
      predictions: [
        {
          category: 'CAREER',
          score: 82,
          summary: 'Favorable planetary alignment for analytical, commercial, and technical endeavors.',
          keyInfluences: ['Saturn in trine', 'Mercury aspect'],
          triggeredRules: nadiData.activeRules.filter((r) => r.domain === 'CAREER'),
        },
        {
          category: 'FINANCE',
          score: 78,
          summary: 'Steady financial accumulation expected through secondary income streams.',
          keyInfluences: ['Jupiter wealth aspect'],
          triggeredRules: nadiData.activeRules.filter((r) => r.domain === 'FINANCE'),
        },
        {
          category: 'HEALTH',
          score: 85,
          summary: 'Strong vitality and robust physical stamina overall.',
          keyInfluences: ['Jiva Karaka protected by Jupiter'],
          triggeredRules: nadiData.activeRules.filter((r) => r.domain === 'GENERAL'),
        },
      ],
    };
  }

  public async generateTransitPrediction(
    input: GenerateTransitPredictionInput,
    requestingUser: { id: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | string }
  ) {
    const targetDate = input.targetDate || new Date().toISOString().split('T')[0];

    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(requestingUser.role);
    if (!profile || (profile.userId !== requestingUser.id && !isAdmin)) {
      throw new NotFoundError('Birth profile not found');
    }

    return {
      birthProfileId: input.birthProfileId,
      targetDate,
      transitOverview: 'Jupiter transit creates expansion opportunity; Saturn transit emphasizes discipline.',
      transits: [
        {
          planet: 'JUPITER',
          transitSign: 'Vrishabha',
          impactRating: 'HIGHLY_FAVORABLE',
          description: 'Transiting Jupiter aspects natal Sun, signaling major growth window.',
        },
        {
          planet: 'SATURN',
          transitSign: 'Kumbha',
          impactRating: 'NEUTRAL_STABLE',
          description: 'Transiting Saturn enforces long-term discipline in career endeavors.',
        },
      ],
    };
  }
}

export const predictionsService = new PredictionsService();
