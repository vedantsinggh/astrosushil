import {
  ChartCalculator,
  DashaCalculator,
  AshtottariCalculator,
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
  normalizeVargaChart,
  ShadbalaCalculator,
  calculateBhavaBala,
  AshtakavargaCalculator,
  DashaRegistry,
  VarshaphalaCalculator,
  VarshaphalaChart,
  PrashnaCalculator,
  PrashnaChart,
  TransitCalculator,
  AstroChart,
  YogaCalculator,
  YogaEvaluationReport,
  SpecialPointsCalculator,
  JaiminiCalculator,
  KPCalculator,
  SadeSatiCalculator,
  ChartVariantsCalculator,
  AvakhadaChakraCalculator,
  GhatChakraCalculator,
  TaraChakraCalculator,
  VimshopakaCalculator,
} from '@astro/astrology-engine';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, AppError, ValidationError } from '../../errors/app-error';
import { mapBirthProfileToBirthDetails, mapDirectBirthDetailsToBirthDetails } from './birth-details.mapper';
import { mapAstroChartToResponse, AstroChartResponseDto } from './astrology-response.mapper';
import {
  CalculateChartInput,
  DirectBirthDetailsInput,
  DashaRequestInput,
  PanchangRequestInput,
  VargasRequestInput,
  MatchmakingRequestInput,
  CompatibilityRequestInput,
  StrengthRequestInput,
  AshtakavargaRequestInput,
  VarshaphalaRequestInput,
  PrashnaRequestInput,
  GocharaRequestInput,
  GocharaTimelineRequestInput,
  YogaRequestInput,
  SpecialPointsRequestInput,
  JaiminiRequestInput,
  KPRequestInput,
  SadeSatiRequestInput,
  ChartVariantsRequestInput,
  AvakhadaRequestInput,
  VimshopakaRequestInput,
} from './astrology.schemas';

export class AstrologyService {
  private readonly calculator: ChartCalculator;
  private readonly dashaCalculator: DashaCalculator;
  private readonly ashtottariCalculator: AshtottariCalculator;
  private readonly vargaCalculator: VargaCalculator;
  private readonly panchangCalculator: PanchangCalculator;
  private readonly matchmakingCalculator: MatchmakingCalculator;
  private readonly shadbalaCalculator: ShadbalaCalculator;
  private readonly ashtakavargaCalculator: AshtakavargaCalculator;
  private readonly varshaphalaCalculator: VarshaphalaCalculator;
  private readonly prashnaCalculator: PrashnaCalculator;
  private readonly transitCalculator: TransitCalculator;
  private readonly yogaCalculator: YogaCalculator;
  private readonly specialPointsCalculator: SpecialPointsCalculator;
  private readonly jaiminiCalculator: JaiminiCalculator;
  private readonly kpCalculator: KPCalculator;
  private readonly chartVariantsCalculator: ChartVariantsCalculator;
  private readonly vimshopakaCalculator: VimshopakaCalculator;

  constructor(calculator?: ChartCalculator) {
    this.calculator = calculator || new ChartCalculator();
    this.dashaCalculator = new DashaCalculator();
    this.ashtottariCalculator = new AshtottariCalculator();
    this.vargaCalculator = new VargaCalculator();
    this.panchangCalculator = new PanchangCalculator();
    this.matchmakingCalculator = new MatchmakingCalculator();
    this.shadbalaCalculator = new ShadbalaCalculator(this.vargaCalculator);
    this.ashtakavargaCalculator = new AshtakavargaCalculator();
    this.varshaphalaCalculator = new VarshaphalaCalculator(this.calculator, this.panchangCalculator);
    this.prashnaCalculator = new PrashnaCalculator(this.calculator, this.panchangCalculator);
    this.transitCalculator = new TransitCalculator();
    this.yogaCalculator = new YogaCalculator();
    this.specialPointsCalculator = new SpecialPointsCalculator(this.panchangCalculator);
    this.jaiminiCalculator = new JaiminiCalculator(this.vargaCalculator);
    this.kpCalculator = new KPCalculator();
    this.chartVariantsCalculator = new ChartVariantsCalculator(this.vargaCalculator, this.jaiminiCalculator);
    this.vimshopakaCalculator = new VimshopakaCalculator(this.vargaCalculator);
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
    requestingUser?: { id: string; role?: string }
  ): Promise<BirthDetails> {
    if (input.birthProfileId) {
      if (!requestingUser) {
        throw new ValidationError('Authentication required to calculate for saved profile');
      }

      const profile = await prisma.birthProfile.findUnique({
        where: { id: input.birthProfileId },
      });

      if (!profile) {
        throw new NotFoundError('Birth profile not found');
      }

      // Check ownership unless admin/system
      if (profile.userId !== requestingUser.id && requestingUser.role !== 'SUPERADMIN' && requestingUser.role !== 'ADMIN') {
        throw new NotFoundError('Birth profile not found');
      }

      return mapBirthProfileToBirthDetails(profile);
    }

    if (input.birthDetails) {
      return mapDirectBirthDetailsToBirthDetails(input.birthDetails);
    }

    throw new ValidationError('Either birthProfileId or birthDetails must be provided');
  }

  public async calculateChart(
    input: CalculateChartInput,
    requestingUser?: { id: string; role?: string }
  ): Promise<AstroChartResponseDto> {
    if (input.birthProfileId) {
      return this.calculateChartForProfile(input.birthProfileId, requestingUser, (input.vargaType as any) || 'D1');
    }
    if (input.birthDetails) {
      return this.calculateChartForDirectInput(input.birthDetails, (input.vargaType as any) || 'D1');
    }
    throw new ValidationError('Either birthProfileId or birthDetails must be provided');
  }

  public async calculateNormalizedChart(
    input: CalculateChartInput,
    requestingUser?: { id: string; role?: string }
  ): Promise<NormalizedChart> {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const rawChart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());
    return normalizeAstroChart(rawChart);
  }

  public async calculateChartForProfile(
    birthProfileId: string,
    requestingUser?: { id: string; role?: string },
    vargaType: VargaType = 'D1'
  ): Promise<AstroChartResponseDto> {
    const birthDetails = await this.resolveBirthDetails({ birthProfileId }, requestingUser);
    return this.calculateChartForDirectInput(birthDetails, vargaType);
  }

  public async calculateChartForDirectInput(
    birthDetailsInput: BirthDetails | DirectBirthDetailsInput,
    vargaType: VargaType = 'D1'
  ): Promise<AstroChartResponseDto> {
    try {
      const birthDetails =
        'dateOfBirth' in (birthDetailsInput as any)
          ? mapDirectBirthDetailsToBirthDetails(birthDetailsInput as any)
          : (birthDetailsInput as BirthDetails);

      const config = this.getActiveConfig();
      const rawChart = await this.calculator.calculateChart(birthDetails, config);

      if (vargaType && vargaType !== 'D1') {
        const vargaChart = this.vargaCalculator.calculateVarga(rawChart, vargaType);
        const normalizedVarga = normalizeVargaChart(rawChart, vargaChart);
        return mapAstroChartToResponse(rawChart, normalizedVarga);
      }

      const normalized = normalizeAstroChart(rawChart);
      return mapAstroChartToResponse(rawChart, normalized);
    } catch (error: any) {
      if (error instanceof BirthDetailsValidationError) {
        throw new ValidationError(error.message);
      }
      if (error instanceof UnconfirmedMethodologyError) {
        throw new AppError(error.message, 400, 'UNCONFIRMED_METHODOLOGY');
      }
      throw error;
    }
  }

  public async calculateDasha(
    input: DashaRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(
      { birthProfileId: input.birthProfileId, birthDetails: input.birthDetails },
      requestingUser
    );

    const config = this.getActiveConfig();
    const chart = await this.calculator.calculateChart(birthDetails, config);
    const dashaSystem = input.dashaSystem || 'VIMSHOTTARI';

    const dashaResult = DashaRegistry.calculateDasha(dashaSystem as any, chart, {
      maxLevel: input.maxLevel || 3,
      timeHorizonYears: input.timeHorizonYears,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
    });

    const def = DashaRegistry.getDefinition(dashaSystem as any);
    const totalSpanYears = def?.totalCycleYears || 120;

    return {
      birthDetails: chart.birthDetails,
      system: dashaSystem,
      totalSpanYears,
      tree: dashaResult,
      dashaTree: dashaResult,
      eligibility: (dashaResult as any).eligibility,
      activePeriods: (dashaResult as any).activeDasha,
    };
  }

  public async calculatePanchang(input: PanchangRequestInput) {
    const timeParts = input.timeOfBirth.split(':');
    const hours = parseInt(timeParts[0] || '12', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    const seconds = parseInt(timeParts[2] || '0', 10);

    const dateParts = input.dateOfBirth.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    const targetDateUtc = new Date(Date.UTC(year, month, day, hours, minutes, seconds));

    const panchang = this.panchangCalculator.calculateDailyPanchang(
      targetDateUtc,
      input.latitude,
      input.longitude,
      input.timezone || 'UTC'
    );

    return {
      panchang: panchang.instantaneous,
      ...panchang,
    };
  }

  public async calculateVargas(
    input: VargasRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(
      { birthProfileId: input.birthProfileId, birthDetails: input.birthDetails },
      requestingUser
    );

    const config = this.getActiveConfig();
    const rawChart = await this.calculator.calculateChart(birthDetails, config);

    const requestedTypes: VargaType[] =
      input.vargaTypes && input.vargaTypes.length > 0
        ? (input.vargaTypes as VargaType[])
        : [
            'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
            'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
          ];

    const vargasResult: Partial<Record<VargaType, any>> = {};
    for (const vType of requestedTypes) {
      vargasResult[vType] = this.vargaCalculator.calculateVarga(rawChart, vType);
    }

    return {
      birthDetails: rawChart.birthDetails,
      vargas: Object.values(vargasResult),
      vargasMap: vargasResult,
    };
  }

  public async calculateMatchmaking(
    input: MatchmakingRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const boyDetails = await this.resolveBirthDetails(input.boy, requestingUser);
    const girlDetails = await this.resolveBirthDetails(input.girl, requestingUser);

    const config = this.getActiveConfig();
    const [boyChart, girlChart] = await Promise.all([
      this.calculator.calculateChart(boyDetails, config),
      this.calculator.calculateChart(girlDetails, config),
    ]);

    const compatibility = this.matchmakingCalculator.evaluateCompatibility(
      boyChart,
      girlChart,
      { personALabel: 'Boy', personBLabel: 'Girl' }
    );

    return {
      compatibility,
      ...compatibility,
    };
  }

  public async calculateCompatibility(
    input: CompatibilityRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const personARef = input.personA || input.boy;
    const personBRef = input.personB || input.girl;

    if (!personARef || !personBRef) {
      throw new ValidationError('Both persons must be provided for compatibility analysis');
    }

    const personADetails = await this.resolveBirthDetails(personARef, requestingUser);
    const personBDetails = await this.resolveBirthDetails(personBRef, requestingUser);

    const config = this.getActiveConfig();
    const [personAChart, personBChart] = await Promise.all([
      this.calculator.calculateChart(personADetails, config),
      this.calculator.calculateChart(personBDetails, config),
    ]);

    const compatibility = this.matchmakingCalculator.evaluateCompatibility(
      personAChart,
      personBChart
    );

    return {
      compatibility,
      ...compatibility,
    };
  }

  public async getDomainEvidence(
    input: { birthProfileId?: string; birthDetails?: DirectBirthDetailsInput; domain?: string },
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const config = this.getActiveConfig();
    const chart = await this.calculator.calculateChart(birthDetails, config);
    return normalizeAstroChart(chart);
  }

  public async getPredictions(
    input: { birthProfileId?: string; birthDetails?: DirectBirthDetailsInput; category?: string },
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const config = this.getActiveConfig();
    const chart = await this.calculator.calculateChart(birthDetails, config);
    return normalizeAstroChart(chart);
  }

  public async calculateStrength(
    input: StrengthRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(
      { birthProfileId: input.birthProfileId, birthDetails: input.birthDetails },
      requestingUser
    );

    const config = this.getActiveConfig();
    const rawChart = await this.calculator.calculateChart(birthDetails, config);
    const shadbala = this.shadbalaCalculator.calculateShadbala(rawChart);
    const bhavaBala = calculateBhavaBala(rawChart, shadbala);

    return {
      birthDetails: rawChart.birthDetails,
      shadbala,
      bhavaBala,
    };
  }

  public async calculateAshtakavarga(
    input: AshtakavargaRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(
      { birthProfileId: input.birthProfileId, birthDetails: input.birthDetails },
      requestingUser
    );

    const config = this.getActiveConfig();
    const rawChart = await this.calculator.calculateChart(birthDetails, config);
    return this.ashtakavargaCalculator.calculateAshtakavarga(rawChart);
  }

  public async calculateVarshaphala(
    input: VarshaphalaRequestInput,
    requestingUser?: { id: string; role?: string }
  ): Promise<VarshaphalaChart> {
    const birthDetails = await this.resolveBirthDetails(
      { birthProfileId: input.birthProfileId, birthDetails: input.birthDetails },
      requestingUser
    );

    const annualLocation = input.annualLocation || {
      latitude: birthDetails.latitude,
      longitude: birthDetails.longitude,
      timezone: birthDetails.timezone,
      placeName: birthDetails.placeName,
    };

    const varshaphala = await this.varshaphalaCalculator.calculateVarshaphala(
      birthDetails,
      {
        targetYear: input.targetYear,
        annualLocation,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      },
      this.getActiveConfig()
    );

    return varshaphala;
  }

  public async calculatePrashna(
    input: PrashnaRequestInput,
    _requestingUser?: { id: string; role?: string }
  ): Promise<PrashnaChart> {
    const prashna = await this.prashnaCalculator.calculatePrashna(
      {
        questionTimestamp: input.questionTimestamp,
        timezone: input.timezone,
        location: {
          latitude: input.location.latitude,
          longitude: input.location.longitude,
          timezone: input.timezone,
          placeName: input.location.placeName,
        },
        questionNumber: input.questionNumber,
        questionNumberSystem: input.questionNumberSystem,
        questionText: input.questionText,
      },
      this.getActiveConfig()
    );

    return prashna;
  }

  public async calculateGochara(
    input: GocharaRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    let natalChart: AstroChart | undefined = undefined;
    if (input.birthProfileId || input.birthDetails) {
      const birthDetails = await this.resolveBirthDetails(
        { birthProfileId: input.birthProfileId, birthDetails: input.birthDetails },
        requestingUser
      );
      natalChart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());
    }

    const snapshot = await this.transitCalculator.calculateTransitSnapshot(
      {
        timestampIso: input.timestamp,
        timezone: input.timezone,
        location: {
          latitude: input.location.latitude,
          longitude: input.location.longitude,
          timezone: input.location.timezone || input.timezone,
          placeName: input.location.placeName,
        },
      },
      natalChart,
      this.getActiveConfig(),
      (input.vargas as any) || ['D1', 'D9']
    );

    return snapshot;
  }

  public async calculateGocharaTimeline(input: GocharaTimelineRequestInput) {
    const timeline = await this.transitCalculator.calculateTransitTimeline({
      startDateIso: input.startDate,
      endDateIso: input.endDate,
      timezone: input.timezone,
      planets: input.planets as any,
      eventTypes: input.eventTypes as any,
    });

    return timeline;
  }

  public async calculateYogas(
    input: YogaRequestInput,
    requestingUser?: { id: string; role?: string }
  ): Promise<YogaEvaluationReport> {
    const birthDetails = await this.resolveBirthDetails(
      { birthProfileId: input.birthProfileId, birthDetails: input.birthDetails },
      requestingUser
    );
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());

    const report = this.yogaCalculator.evaluateYogas(chart, {
      varga: input.varga as any,
      categories: input.categories as any,
      yogaIds: input.yogaIds,
      includeUndetected: input.includeUndetected,
    });

    return report;
  }

  // -------------------------------------------------------------
  // Phase 2X Extended Service Methods
  // -------------------------------------------------------------

  public async calculateSpecialPoints(
    input: SpecialPointsRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());
    const birthDate = new Date(chart.metadata.normalizedTime.utcIsoString);

    return this.specialPointsCalculator.calculateFromChart(
      chart,
      birthDate,
      birthDetails.latitude,
      birthDetails.longitude
    );
  }

  public async calculateJaimini(
    input: JaiminiRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());

    return this.jaiminiCalculator.calculateFromChart(chart, input.scheme);
  }

  public async calculateKP(
    input: KPRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());
    const birthDate = new Date(chart.metadata.normalizedTime.utcIsoString);

    return this.kpCalculator.calculateKP(chart, birthDate, input.isDayBirth);
  }

  public async calculateSadeSati(
    input: SadeSatiRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());
    const natalMoon = chart.planets[PlanetSymbol.MOON];

    if (!natalMoon) {
      throw new AppError('Could not calculate natal Moon position', 500, 'ASTRONOMY_CALCULATION_ERROR');
    }

    let transitSaturnLong = input.transitSaturnLongitude;
    if (typeof transitSaturnLong !== 'number') {
      const transitDate = input.transitDate ? new Date(input.transitDate) : new Date();
      const transitSnapshot = await this.transitCalculator.calculateTransitSnapshot(
        {
          timestampIso: transitDate.toISOString(),
          timezone: birthDetails.timezone || 'UTC',
          location: {
            latitude: birthDetails.latitude,
            longitude: birthDetails.longitude,
            timezone: birthDetails.timezone || 'UTC',
          },
        },
        chart,
        this.getActiveConfig(),
        ['D1']
      );
      const saturnTransit = transitSnapshot.transitChart.planets[PlanetSymbol.SATURN];
      transitSaturnLong = saturnTransit?.longitude ?? 0;
    }

    return SadeSatiCalculator.evaluateSadeSati(natalMoon.longitude, transitSaturnLong);
  }

  public async calculateChartVariants(
    input: ChartVariantsRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());

    return this.chartVariantsCalculator.calculateAllVariants(chart);
  }

  public async calculateAvakhada(
    input: AvakhadaRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());

    const moon = chart.planets[PlanetSymbol.MOON];
    const ascRashi = chart.ascendant?.rashiIndex ?? 1;

    if (!moon) {
      throw new AppError('Could not calculate natal Moon position', 500, 'ASTRONOMY_CALCULATION_ERROR');
    }

    const avakhada = AvakhadaChakraCalculator.calculateAvakhada(moon.longitude, ascRashi);
    const ghat = GhatChakraCalculator.calculateGhatChakra(moon.rashiIndex);
    const tara = TaraChakraCalculator.calculateTaraChakra(moon.nakshatraIndex);

    return {
      avakhada,
      ghat,
      tara,
    };
  }

  public async calculateVimshopaka(
    input: VimshopakaRequestInput,
    requestingUser?: { id: string; role?: string }
  ) {
    const birthDetails = await this.resolveBirthDetails(input, requestingUser);
    const chart = await this.calculator.calculateChart(birthDetails, this.getActiveConfig());

    return this.vimshopakaCalculator.calculateVimshopaka(chart);
  }
}

export const astrologyService = new AstrologyService();
