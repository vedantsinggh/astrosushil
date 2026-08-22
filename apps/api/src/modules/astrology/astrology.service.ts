import {
  ChartCalculator,
  AstrologyConfig,
  UnconfirmedMethodologyError,
  BirthDetailsValidationError,
  BirthDetails,
} from '@astro/astrology-engine';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, AppError, ValidationError } from '../../errors/app-error';
import { mapBirthProfileToBirthDetails } from './birth-details.mapper';
import { mapAstroChartToResponse, AstroChartResponseDto } from './astrology-response.mapper';
import { DirectBirthDetailsInput } from './astrology.schemas';

export class AstrologyService {
  private readonly calculator: ChartCalculator;

  constructor(calculator?: ChartCalculator) {
    this.calculator = calculator || new ChartCalculator();
  }

  private getActiveConfig(): AstrologyConfig {
    return {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN_NODE',
      planetaryCalculationMode: 'GEOCENTRIC',
      precisionDegrees: 0.0001,
      roundingRule: 'NEAREST',
      dashaSystem: 'VIMSHOTTARI',
    };
  }

  /**
   * Calculates an AstroChart for an authenticated user's birth profile.
   * Enforces server-side ownership authorization.
   */
  public async calculateChartForProfile(
    birthProfileId: string,
    requestingUser: { id: string; role: 'USER' | 'ADMIN' }
  ): Promise<AstroChartResponseDto> {
    // 1. Fetch birth profile from PostgreSQL
    const profile = await prisma.birthProfile.findUnique({
      where: { id: birthProfileId },
    });

    // 2. Authorization & Privacy Guard: Enforce strict server-side ownership isolation.
    if (!profile || (profile.userId !== requestingUser.id && requestingUser.role !== 'ADMIN')) {
      throw new NotFoundError('Birth profile not found');
    }

    // 3. Map Prisma BirthProfile to domain BirthDetails
    let birthDetails: BirthDetails;
    try {
      birthDetails = mapBirthProfileToBirthDetails(profile);
    } catch (err: any) {
      throw new ValidationError(`Invalid birth profile data: ${err.message}`);
    }

    return this.executeCalculation(birthDetails);
  }

  /**
   * Calculates an AstroChart directly from provided birth details (Guest Mode / ephemeral calculation).
   * Does NOT touch or persist anything to PostgreSQL.
   */
  public async calculateChartForDirectInput(
    input: DirectBirthDetailsInput
  ): Promise<AstroChartResponseDto> {
    let birthDetails: BirthDetails;
    try {
      birthDetails = mapBirthProfileToBirthDetails({
        id: 'ephemeral',
        name: input.name,
        dateOfBirth: input.dateOfBirth,
        timeOfBirth: input.timeOfBirth,
        latitude: input.latitude,
        longitude: input.longitude,
        timezone: input.timezone,
        placeName: input.placeName,
      });
    } catch (err: any) {
      throw new ValidationError(`Invalid birth details input: ${err.message}`);
    }

    return this.executeCalculation(birthDetails);
  }

  private async executeCalculation(birthDetails: BirthDetails): Promise<AstroChartResponseDto> {
    const activeConfig = this.getActiveConfig();

    try {
      const astroChart = await this.calculator.calculateChart(birthDetails, activeConfig);
      return mapAstroChartToResponse(astroChart);
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

      throw new AppError('Unable to calculate astrology chart', 500, 'ASTROLOGY_CALCULATION_FAILED');
    }
  }
}

export const astrologyService = new AstrologyService();
