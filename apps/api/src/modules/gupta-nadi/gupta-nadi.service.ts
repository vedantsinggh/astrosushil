import { prisma } from '../../services/prisma.service';
import { AppError, NotFoundError } from '../../errors/app-error';
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

/**
 * Raised while the Brihaspati Nandi Nadi (BNN) rule engine has not been implemented from the
 * client-approved specification. Previously this module returned stub rules that fired for every
 * chart (and a fabricated "15 rules evaluated" audit count); those were not genuine evaluations.
 */
export class GuptaNadiEngineUnavailableError extends AppError {
  constructor() {
    super(
      'Gupta Nadi (BNN) rule evaluation is not available yet.',
      501,
      'GUPTA_NADI_ENGINE_NOT_IMPLEMENTED'
    );
  }
}

export class GuptaNadiService {
  public async evaluateForProfile(
    input: EvaluateGuptaNadiInput,
    requestingUser: { id: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | string }
  ): Promise<NadiRuleEvaluationResult> {
    // 1. Enforce server-side ownership authorization for birth profile
    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(requestingUser.role);
    if (!profile || (profile.userId !== requestingUser.id && !isAdmin)) {
      throw new NotFoundError('Birth profile not found');
    }

    // 2. No genuine BNN rule set is implemented yet (see docs/gupta-nadi-spec.md).
    //    Never return placeholder rules as if they were evaluated against the chart.
    throw new GuptaNadiEngineUnavailableError();
  }

  /**
   * Lists rule definitions that are actually implemented and evaluated. None are yet.
   */
  public getAvailableRules(): Array<{ ruleId: string; domain: string; title: string; priority: number; jivaKaraka: string }> {
    return [];
  }
}

export const guptaNadiService = new GuptaNadiService();
