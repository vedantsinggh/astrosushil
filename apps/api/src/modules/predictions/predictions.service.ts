import { prisma } from '../../services/prisma.service';
import { AppError, NotFoundError } from '../../errors/app-error';
import {
  GenerateNatalPredictionInput,
  GenerateTransitPredictionInput,
} from './predictions.schemas';

/**
 * Raised while no deterministic, rule-based prediction compiler is wired to these endpoints.
 * Previously they returned hard-coded scores (82/78/85), canned summaries and fixed transit
 * signs for every user; those were not genuine predictions.
 */
export class PredictionEngineUnavailableError extends AppError {
  constructor(kind: 'natal' | 'transit') {
    super(
      kind === 'natal'
        ? 'Natal predictions are not available yet.'
        : 'Transit predictions are not available yet.',
      501,
      'PREDICTION_ENGINE_NOT_IMPLEMENTED'
    );
  }
}

export class PredictionsService {
  private async assertProfileAccess(
    birthProfileId: string,
    requestingUser: { id: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | string }
  ): Promise<void> {
    const profile = await prisma.birthProfile.findUnique({
      where: { id: birthProfileId },
    });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(requestingUser.role);
    if (!profile || (profile.userId !== requestingUser.id && !isAdmin)) {
      throw new NotFoundError('Birth profile not found');
    }
  }

  public async generateNatalPrediction(
    input: GenerateNatalPredictionInput,
    requestingUser: { id: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | string }
  ): Promise<never> {
    await this.assertProfileAccess(input.birthProfileId, requestingUser);
    throw new PredictionEngineUnavailableError('natal');
  }

  public async generateTransitPrediction(
    input: GenerateTransitPredictionInput,
    requestingUser: { id: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | string }
  ): Promise<never> {
    await this.assertProfileAccess(input.birthProfileId, requestingUser);
    throw new PredictionEngineUnavailableError('transit');
  }
}

export const predictionsService = new PredictionsService();
