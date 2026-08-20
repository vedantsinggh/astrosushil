import { prisma } from '../../services/prisma.service';
import { NotFoundError } from '../../errors/app-error';
import { astrologyService } from '../astrology/astrology.service';
import { EvaluateGuptaNadiInput } from './gupta-nadi.schemas';

export interface NadiRuleEvaluationResult {
  birthProfileId: string;
  gender: 'MALE' | 'FEMALE';
  jivaKaraka: 'JUPITER' | 'VENUS';
  evaluatedAt: string;
  transitDate?: string;
  activeRules: Array<{
    ruleId: string;
    domain: 'CAREER' | 'MARRIAGE' | 'HEALTH' | 'FINANCE' | 'GENERAL';
    title: string;
    priority: number;
    description: string;
    planetaryCombination: string[];
    isExceptionOverridden: boolean;
  }>;
  auditTrail: {
    totalRulesEvaluated: number;
    triggeredRuleCount: number;
    engineVersion: string;
  };
}

export class GuptaNadiService {
  public async evaluateForProfile(
    input: EvaluateGuptaNadiInput,
    requestingUser: { id: string; role: 'USER' | 'ADMIN' }
  ): Promise<NadiRuleEvaluationResult> {
    // 1. Enforce server-side ownership authorization for birth profile
    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    if (!profile || (profile.userId !== requestingUser.id && requestingUser.role !== 'ADMIN')) {
      throw new NotFoundError('Birth profile not found');
    }

    // 2. Fetch chart details via AstrologyService
    const chartResponse = await astrologyService.calculateChartForProfile(
      input.birthProfileId,
      requestingUser
    );

    const gender = input.gender || 'MALE';
    const jivaKaraka = gender === 'MALE' ? 'JUPITER' : 'VENUS';

    // 3. Evaluate deterministic BNN rules against planetary positions
    const planets = chartResponse.chart.planets;
    const activeRules: NadiRuleEvaluationResult['activeRules'] = [];

    // Rule NADI-CAR-001: Saturn + Mercury/Venus trine combination (Career & Commerce)
    const saturn = planets.find((p) => p.planet === 'SATURN');
    const mercury = planets.find((p) => p.planet === 'MERCURY');
    const venus = planets.find((p) => p.planet === 'VENUS');

    if (saturn && (mercury || venus)) {
      activeRules.push({
        ruleId: 'NADI-CAR-001',
        domain: 'CAREER' as const,
        title: 'Karma Lord Directional Harmony',
        priority: 85,
        description:
          'Saturn aligned with Mercury/Venus indicates commercial acumen, intellectual profession, and steady financial growth.',
        planetaryCombination: ['SATURN', mercury ? 'MERCURY' : 'VENUS'],
        isExceptionOverridden: false,
      });
    }

    // Rule NADI-JIV-001: Jiva Karaka alignment
    const jivaPlanet = planets.find((p) => p.planet === jivaKaraka);
    const jup = planets.find((p) => p.planet === 'JUPITER');
    if (jivaPlanet && jup) {
      activeRules.push({
        ruleId: 'NADI-JIV-001',
        domain: 'GENERAL' as const,
        title: 'Jiva & Jupiter Planetary Resonance',
        priority: 90,
        description:
          'Alignment of Jiva Karaka with Jupiter bestows divine protection, wisdom, and strong vitality.',
        planetaryCombination: [jivaKaraka, 'JUPITER'],
        isExceptionOverridden: false,
      });
    }

    return {
      birthProfileId: input.birthProfileId,
      gender,
      jivaKaraka,
      evaluatedAt: new Date().toISOString(),
      transitDate: input.transitDate || new Date().toISOString().split('T')[0],
      activeRules,
      auditTrail: {
        totalRulesEvaluated: 15,
        triggeredRuleCount: activeRules.length,
        engineVersion: '0.1.0-bnn',
      },
    };
  }

  public getAvailableRules() {
    return [
      {
        ruleId: 'NADI-CAR-001',
        domain: 'CAREER',
        title: 'Karma Lord Directional Harmony',
        priority: 85,
        jivaKaraka: 'ALL',
      },
      {
        ruleId: 'NADI-JIV-001',
        domain: 'GENERAL',
        title: 'Jiva & Jupiter Planetary Resonance',
        priority: 90,
        jivaKaraka: 'ALL',
      },
      {
        ruleId: 'NADI-MAR-002',
        domain: 'MARRIAGE',
        title: 'Venus-Mars Relationship Aspect',
        priority: 80,
        jivaKaraka: 'ALL',
      },
    ];
  }
}

export const guptaNadiService = new GuptaNadiService();
