import {
  ChartCalculator,
  DashaCalculator,
  VargaCalculator,
  PanchangCalculator,
  MatchmakingCalculator,
  AstrologyConfig,
  UnconfirmedMethodologyError,
  BirthDetailsValidationError,
  BirthDetails,
  PlanetSymbol,
  VargaType,
  NormalizedChart,
  normalizeAstroChart,
} from '@astro/astrology-engine';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, AppError, ValidationError } from '../../errors/app-error';
import { mapBirthProfileToBirthDetails } from './birth-details.mapper';
import { mapAstroChartToResponse, AstroChartResponseDto } from './astrology-response.mapper';
import {
  DirectBirthDetailsInput,
  DashaRequestInput,
  PanchangRequestInput,
  VargasRequestInput,
  MatchmakingRequestInput,
} from './astrology.schemas';

export class AstrologyService {
  private readonly calculator: ChartCalculator;
  private readonly dashaCalculator: DashaCalculator;
  private readonly vargaCalculator: VargaCalculator;
  private readonly panchangCalculator: PanchangCalculator;
  private readonly matchmakingCalculator: MatchmakingCalculator;

  constructor(calculator?: ChartCalculator) {
    this.calculator = calculator || new ChartCalculator();
    this.dashaCalculator = new DashaCalculator();
    this.vargaCalculator = new VargaCalculator();
    this.panchangCalculator = new PanchangCalculator();
    this.matchmakingCalculator = new MatchmakingCalculator();
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
   * Helper to resolve BirthDetails from either birthProfileId or direct input.
   */
  private async resolveBirthDetails(
    input: { birthProfileId?: string; birthDetails?: DirectBirthDetailsInput },
    requestingUser?: { id: string; role: 'USER' | 'ADMIN' }
  ): Promise<BirthDetails> {
    if (input.birthProfileId) {
      if (!requestingUser) {
        throw new NotFoundError('Birth profile requires authenticated user');
      }
      const profile = await prisma.birthProfile.findUnique({
        where: { id: input.birthProfileId },
      });
      if (!profile || (profile.userId !== requestingUser.id && requestingUser.role !== 'ADMIN')) {
        throw new NotFoundError('Birth profile not found');
      }
      return mapBirthProfileToBirthDetails(profile);
    } else if (input.birthDetails) {
      return mapBirthProfileToBirthDetails({
        id: 'ephemeral',
        name: input.birthDetails.name,
        dateOfBirth: input.birthDetails.dateOfBirth,
        timeOfBirth: input.birthDetails.timeOfBirth,
        latitude: input.birthDetails.latitude,
        longitude: input.birthDetails.longitude,
        timezone: input.birthDetails.timezone,
        placeName: input.birthDetails.placeName,
      });
    }
    throw new ValidationError('Either birthProfileId or birthDetails must be provided');
  }

  /**
   * Calculates an AstroChart for an authenticated user's birth profile.
   */
  public async calculateChartForProfile(
    birthProfileId: string,
    requestingUser: { id: string; role: 'USER' | 'ADMIN' }
  ): Promise<AstroChartResponseDto> {
    const birthDetails = await this.resolveBirthDetails({ birthProfileId }, requestingUser);
    return this.executeCalculation(birthDetails);
  }

  /**
   * Calculates an AstroChart directly from provided birth details (Guest Mode).
   */
  public async calculateChartForDirectInput(
    input: DirectBirthDetailsInput
  ): Promise<AstroChartResponseDto> {
    const birthDetails = await this.resolveBirthDetails({ birthDetails: input });
    return this.executeCalculation(birthDetails);
  }

  /**
   * Calculates Vimshottari Dasha timeline up to Level 3.
   */
  public async calculateDasha(
    input: DashaRequestInput,
    requestingUser?: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());
    const moonLongitude = chart.planets[PlanetSymbol.MOON].longitude;
    const birthDateUtc = new Date(chart.metadata.normalizedTime.utcIsoString);

    const dashaTree = this.dashaCalculator.calculateVimshottariDasha(
      moonLongitude,
      birthDateUtc,
      input.maxLevel || 3
    );

    return {
      birthDetails,
      dashaTree,
    };
  }

  /**
   * Calculates Panchang elements (Tithi, Vara, Nakshatra, Yoga, Karana).
   */
  public async calculatePanchang(input: PanchangRequestInput) {
    const dateTimeStr = `${input.dateOfBirth}T${input.timeOfBirth}Z`;
    const birthDateUtc = new Date(dateTimeStr);

    const ephemeralDetails = mapBirthProfileToBirthDetails({
      id: 'ephemeral',
      name: 'Panchang Query',
      dateOfBirth: input.dateOfBirth,
      timeOfBirth: input.timeOfBirth,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone || 'UTC',
    });

    const chart = await this.calculator.calculateChart(ephemeralDetails, this.getActiveConfig());
    const sunLong = chart.planets[PlanetSymbol.SUN].longitude;
    const moonLong = chart.planets[PlanetSymbol.MOON].longitude;

    const panchang = this.panchangCalculator.calculatePanchang(sunLong, moonLong, birthDateUtc);

    return {
      query: input,
      panchang,
    };
  }

  /**
   * Calculates Divisional Charts (Vargas).
   */
  public async calculateVargas(
    input: VargasRequestInput,
    requestingUser?: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());

    const defaultVargas: VargaType[] = ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D30'];
    const vargaTypes = input.vargaTypes && input.vargaTypes.length > 0 ? input.vargaTypes : defaultVargas;

    const vargaCharts = vargaTypes.map((vType) =>
      this.vargaCalculator.calculateVarga(chart, vType as VargaType)
    );

    return {
      birthDetails,
      vargas: vargaCharts,
    };
  }

  /**
   * Calculates Matchmaking compatibility & Manglik status between Boy and Girl.
   */
  public async calculateMatchmaking(
    input: MatchmakingRequestInput,
    requestingUser?: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    const boyDetails = await this.resolveBirthDetails(input.boy, requestingUser);
    const girlDetails = await this.resolveBirthDetails(input.girl, requestingUser);

    const activeConfig = this.getActiveConfig();
    const boyChart = await this.calculator.calculateChart(boyDetails, activeConfig);
    const girlChart = await this.calculator.calculateChart(girlDetails, activeConfig);

    const result = this.matchmakingCalculator.evaluateCompatibility(boyChart, girlChart);

    return {
      boy: {
        name: boyDetails.name || 'Boy',
        dateOfBirth:
          boyDetails.dateOfBirth ||
          `${boyDetails.date.year}-${String(boyDetails.date.month).padStart(2, '0')}-${String(boyDetails.date.day).padStart(2, '0')}`,
      },
      girl: {
        name: girlDetails.name || 'Girl',
        dateOfBirth:
          girlDetails.dateOfBirth ||
          `${girlDetails.date.year}-${String(girlDetails.date.month).padStart(2, '0')}-${String(girlDetails.date.day).padStart(2, '0')}`,
      },
      compatibility: result,
    };
  }

  public async calculateNormalizedChart(
    input: { birthProfileId?: string; birthDetails?: DirectBirthDetailsInput },
    requestingUser?: { id: string; role: 'USER' | 'ADMIN' }
  ): Promise<NormalizedChart> {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const activeConfig = this.getActiveConfig();
    const astroChart = await this.calculator.calculateChart(birthDetails, activeConfig);
    return normalizeAstroChart(astroChart);
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
