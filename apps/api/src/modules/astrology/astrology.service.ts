import {
  ChartCalculator,
  AstrologyConfig,
  UnconfirmedMethodologyError,
  BirthDetailsValidationError,
} from '@astro/astrology-engine';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, AppError, ValidationError } from '../../errors/app-error';
import { mapBirthProfileToBirthDetails } from './birth-details.mapper';
import { mapAstroChartToResponse, AstroChartResponseDto } from './astrology-response.mapper';

export interface ChartCalculationResult extends AstroChartResponseDto {
  executionMetrics: {
    durationMs: number;
    engineVersion: string;
    methodologyVersion: string;
  };
}

export class AstrologyService {
  private readonly calculator: ChartCalculator;

  constructor(calculator?: ChartCalculator) {
    this.calculator = calculator || new ChartCalculator();
  }

  /**
   * Calculates an AstroChart for an authenticated user's birth profile.
   * Enforces server-side ownership authorization.
   */
  public async calculateChartForProfile(
    birthProfileId: string,
    requestingUser: { id: string; role: 'USER' | 'ADMIN' }
  ): Promise<ChartCalculationResult> {
    // 1. Fetch birth profile from PostgreSQL
    const profile = await prisma.birthProfile.findUnique({
      where: { id: birthProfileId },
    });

    // 2. Authorization & Privacy Guard: Enforce strict server-side ownership isolation.
    // Return 404 NotFound if profile does not exist or belongs to another user.
    if (!profile || (profile.userId !== requestingUser.id && requestingUser.role !== 'ADMIN')) {
      throw new NotFoundError('Birth profile not found');
    }

    // 3. Map Prisma BirthProfile to domain BirthDetails
    let birthDetails;
    try {
      birthDetails = mapBirthProfileToBirthDetails(profile);
    } catch (err: any) {
      throw new ValidationError(`Invalid birth profile data: ${err.message}`);
    }

    // 4. Define current active engine configuration
    const activeConfig: AstrologyConfig = {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN_NODE',
      planetaryCalculationMode: 'GEOCENTRIC',
      precisionDegrees: 0.0001,
      roundingRule: 'NEAREST',
      dashaSystem: 'VIMSHOTTARI',
    };

    // 5. Execute local deterministic astrology engine calculation with performance measurement
    const startTime = performance.now();
    try {
      const astroChart = await this.calculator.calculateChart(birthDetails, activeConfig);
      const endTime = performance.now();
      const durationMs = Number((endTime - startTime).toFixed(3));

      // 6. Map domain AstroChart output to public API response DTO
      const mappedResponse = mapAstroChartToResponse(astroChart);

      return {
        ...mappedResponse,
        executionMetrics: {
          durationMs,
          engineVersion: astroChart.metadata.engineVersion,
          methodologyVersion: `${activeConfig.zodiacType}_${activeConfig.ayanamsa}_${activeConfig.nodeCalculation}`,
        },
      };
    } catch (err: any) {
      if (err instanceof UnconfirmedMethodologyError) {
        throw new AppError(
          `Calculation blocked: methodology for '${err.methodologyName}' requires explicit client confirmation.`,
          422,
          'UNCONFIRMED_METHODOLOGY'
        );
      }
      if (err instanceof BirthDetailsValidationError) {
        throw new ValidationError(
          `Invalid birth details: ${err.message}`,
          err.validationErrors.map((msg) => ({ message: msg }))
        );
      }

      // Catch-all calculation error preventing unhandled stack trace leaks
      throw new AppError('Unable to calculate astrology chart', 500, 'ASTROLOGY_CALCULATION_FAILED');
    }
  }
}

export const astrologyService = new AstrologyService();
