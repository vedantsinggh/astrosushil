import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { getMeanAyanamsa, getTrueAyanamsa, resolveAyanamsaSystem, SupportedAyanamsaSystem } from '../ayanamsa/ayanamsa';
import { calculateLunarNodes, LunarNodeType } from '../rahu-ketu/lunar-nodes';
import {
  AyanamsaSystem,
  DEFAULT_ASTROLOGY_CONFIG,
  NodeCalculationMethod,
  ZodiacType,
} from '../configuration/astrology-config';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiByLongitude, getRashiIndex } from '../zodiac/rashi';
import { getNakshatraByLongitude, getNakshatraIndex, getPada } from '../nakshatra/nakshatra';
import {
  TransitIngressEvent,
  TransitStationEvent,
  TransitTimelineEvent,
} from './transit.types';
import { julianDayToUtcDate, normalizeAngularDelta } from '../varshaphala/solar-return.solver';

export interface PlanetaryTransitState {
  planet: PlanetSymbol;
  longitude: number;
  speedLongitude: number;
  isRetrograde: boolean;
  rashiIndex: number;
  nakshatraIndex: number;
  pada: number;
}

/**
 * Optional methodology for the solver (ADR-016: calculators take the convention as a parameter).
 * Defaults reproduce the client defaults (ADR-017): sidereal, true Chitrapaksha Lahiri, mean node.
 */
export interface TransitIngressSolverOptions {
  zodiacType?: ZodiacType;
  ayanamsa?: AyanamsaSystem;
  nodeCalculation?: NodeCalculationMethod;
}

export class TransitIngressSolver {
  private readonly ephemerisProvider: EphemerisProvider;
  private readonly isSidereal: boolean;
  private readonly ayanamsaSystem: SupportedAyanamsaSystem;
  private readonly nodeType: LunarNodeType;

  constructor(ephemerisProvider?: EphemerisProvider, options: TransitIngressSolverOptions = {}) {
    this.ephemerisProvider = ephemerisProvider || new AstronomyEngineAdapter();
    this.isSidereal = (options.zodiacType ?? DEFAULT_ASTROLOGY_CONFIG.zodiacType) !== 'TROPICAL';
    this.ayanamsaSystem = resolveAyanamsaSystem(options.ayanamsa ?? DEFAULT_ASTROLOGY_CONFIG.ayanamsa);
    this.nodeType = (options.nodeCalculation ?? DEFAULT_ASTROLOGY_CONFIG.nodeCalculation) === 'TRUE_NODE' ? 'TRUE_NODE' : 'MEAN_NODE';
  }

  /**
   * Calculates sidereal planetary state at an arbitrary Julian Day UT.
   */
  public async getPlanetaryState(
    planet: PlanetSymbol,
    julianDayUT: number
  ): Promise<PlanetaryTransitState> {
    let raw = await this.ephemerisProvider.getPlanetaryPosition(planet, julianDayUT);

    // Ayanamsa and node type follow the solver options (default: true Chitrapaksha Lahiri, mean
    // node; ADR-017). As in ChartCalculator, the TRUE ayanamsa is subtracted from apparent
    // longitudes and the MEAN ayanamsa from mean-equinox quantities (lunar nodes).
    const isNode = planet === PlanetSymbol.RAHU || planet === PlanetSymbol.KETU;
    if (isNode && this.nodeType === 'TRUE_NODE') {
      const nodes = calculateLunarNodes(julianDayUT, 'TRUE_NODE');
      raw = {
        ...raw,
        longitude: planet === PlanetSymbol.RAHU ? nodes.rahuLongitude : nodes.ketuLongitude,
        speedLongitude: nodes.speedLongitude,
        isRetrograde: nodes.speedLongitude < 0,
      };
    }
    const ayanamsa = !this.isSidereal
      ? 0
      : isNode
        ? getMeanAyanamsa(julianDayUT, this.ayanamsaSystem)
        : getTrueAyanamsa(julianDayUT, this.ayanamsaSystem);
    const siderealLon = normalizeDegree(raw.longitude - ayanamsa);

    const rashiIndex = getRashiIndex(siderealLon);
    const nakshatraIndex = getNakshatraIndex(siderealLon);
    const pada = getPada(siderealLon);

    return {
      planet,
      longitude: siderealLon,
      speedLongitude: raw.speedLongitude,
      isRetrograde: raw.isRetrograde,
      rashiIndex,
      nakshatraIndex,
      pada,
    };
  }

  /**
   * Solves for all sign ingresses for a planet over a Julian Day time range.
   */
  public async findSignIngresses(
    planet: PlanetSymbol,
    startJD: number,
    endJD: number
  ): Promise<TransitIngressEvent[]> {
    const events: TransitIngressEvent[] = [];

    // Step size based on planetary velocity
    let stepDays = 1.0;
    if (planet === PlanetSymbol.MOON) {
      stepDays = 0.25; // 6 hours
    } else if (planet === PlanetSymbol.SUN || planet === PlanetSymbol.MERCURY || planet === PlanetSymbol.VENUS) {
      stepDays = 1.0;
    } else {
      stepDays = 3.0; // Mars, Jupiter, Saturn, Rahu, Ketu
    }

    let currentJD = startJD;
    let prevState = await this.getPlanetaryState(planet, currentJD);

    while (currentJD < endJD) {
      const nextJD = Math.min(currentJD + stepDays, endJD);
      const nextState = await this.getPlanetaryState(planet, nextJD);

      if (prevState.rashiIndex !== nextState.rashiIndex) {
        // Sign boundary crossed in [currentJD, nextJD]
        const fromSignDef = getRashiByLongitude(prevState.longitude);
        const toSignDef = getRashiByLongitude(nextState.longitude);

        // Determine target boundary degree
        // Direct ingress into toSignDef: boundary = (toSignDef.index - 1) * 30.0
        // Retrograde ingress into toSignDef: boundary = (fromSignDef.index - 1) * 30.0
        const isRetrogradeIngress =
          prevState.isRetrograde ||
          (fromSignDef.index === 1 && toSignDef.index === 12) ||
          (toSignDef.index < fromSignDef.index && !(fromSignDef.index === 12 && toSignDef.index === 1));

        let targetBoundaryLon = isRetrogradeIngress
          ? (fromSignDef.index - 1) * 30.0
          : (toSignDef.index - 1) * 30.0;
        if (targetBoundaryLon >= 360) targetBoundaryLon = 0;

        const exactJD = await this.bisectBoundaryCrossing(
          planet,
          currentJD,
          nextJD,
          targetBoundaryLon
        );

        const exactState = await this.getPlanetaryState(planet, exactJD);
        const utcDate = julianDayToUtcDate(exactJD);

        events.push({
          eventType: 'SIGN_INGRESS',
          planet,
          timestampIso: utcDate.toISOString(),
          julianDayUT: exactJD,
          fromSign: { index: fromSignDef.index, name: fromSignDef.sanskritName },
          toSign: { index: toSignDef.index, name: toSignDef.sanskritName },
          longitude: exactState.longitude,
        });
      }

      currentJD = nextJD;
      prevState = nextState;
    }

    return events;
  }

  /**
   * Solves for all Nakshatra ingresses for a planet over a Julian Day time range.
   */
  public async findNakshatraIngresses(
    planet: PlanetSymbol,
    startJD: number,
    endJD: number
  ): Promise<TransitIngressEvent[]> {
    const events: TransitIngressEvent[] = [];

    let stepDays = 0.5;
    if (planet === PlanetSymbol.MOON) {
      stepDays = 0.1; // ~2.4 hours
    } else if (planet === PlanetSymbol.SUN || planet === PlanetSymbol.MERCURY || planet === PlanetSymbol.VENUS) {
      stepDays = 0.5;
    } else {
      stepDays = 1.5;
    }

    let currentJD = startJD;
    let prevState = await this.getPlanetaryState(planet, currentJD);

    while (currentJD < endJD) {
      const nextJD = Math.min(currentJD + stepDays, endJD);
      const nextState = await this.getPlanetaryState(planet, nextJD);

      if (prevState.nakshatraIndex !== nextState.nakshatraIndex) {
        const fromNakDef = getNakshatraByLongitude(prevState.longitude);
        const toNakDef = getNakshatraByLongitude(nextState.longitude);

        const isRetrogradeNak =
          prevState.isRetrograde ||
          (fromNakDef.index === 1 && toNakDef.index === 27) ||
          (toNakDef.index < fromNakDef.index && !(fromNakDef.index === 27 && toNakDef.index === 1));

        let targetBoundaryLon = isRetrogradeNak
          ? (fromNakDef.index - 1) * (360 / 27)
          : (toNakDef.index - 1) * (360 / 27);
        if (targetBoundaryLon >= 360) targetBoundaryLon = 0;

        const exactJD = await this.bisectBoundaryCrossing(
          planet,
          currentJD,
          nextJD,
          targetBoundaryLon
        );

        const exactState = await this.getPlanetaryState(planet, exactJD);
        const utcDate = julianDayToUtcDate(exactJD);

        events.push({
          eventType: 'NAKSHATRA_INGRESS',
          planet,
          timestampIso: utcDate.toISOString(),
          julianDayUT: exactJD,
          fromNakshatra: { index: fromNakDef.index, name: fromNakDef.name },
          toNakshatra: { index: toNakDef.index, name: toNakDef.name },
          pada: exactState.pada,
          longitude: exactState.longitude,
        });
      }

      currentJD = nextJD;
      prevState = nextState;
    }

    return events;
  }

  /**
   * Finds stationary points (retrograde and direct stations) where speed changes sign.
   */
  public async findStationEvents(
    planet: PlanetSymbol,
    startJD: number,
    endJD: number
  ): Promise<TransitStationEvent[]> {
    // Sun, Moon, Rahu, Ketu do not undergo normal speed sign inversions
    const stationEligiblePlanets = [
      PlanetSymbol.MARS,
      PlanetSymbol.MERCURY,
      PlanetSymbol.JUPITER,
      PlanetSymbol.VENUS,
      PlanetSymbol.SATURN,
    ];

    if (!stationEligiblePlanets.includes(planet)) {
      return [];
    }

    const events: TransitStationEvent[] = [];
    const stepDays = 1.0;

    let currentJD = startJD;
    let prevState = await this.getPlanetaryState(planet, currentJD);

    while (currentJD < endJD) {
      const nextJD = Math.min(currentJD + stepDays, endJD);
      const nextState = await this.getPlanetaryState(planet, nextJD);

      const prevSpeed = prevState.speedLongitude;
      const nextSpeed = nextState.speedLongitude;

      if ((prevSpeed > 0 && nextSpeed < 0) || (prevSpeed < 0 && nextSpeed > 0)) {
        // Station event in [currentJD, nextJD]
        const exactJD = await this.bisectSpeedZero(planet, currentJD, nextJD);
        const exactState = await this.getPlanetaryState(planet, exactJD);
        const utcDate = julianDayToUtcDate(exactJD);
        const rashiDef = getRashiByLongitude(exactState.longitude);

        const eventType =
          prevSpeed > 0 ? 'RETROGRADE_STATION' : 'DIRECT_STATION';

        events.push({
          eventType,
          planet,
          timestampIso: utcDate.toISOString(),
          julianDayUT: exactJD,
          longitude: exactState.longitude,
          rashiIndex: rashiDef.index,
          rashiName: rashiDef.sanskritName,
        });
      }

      currentJD = nextJD;
      prevState = nextState;
    }

    return events;
  }

  /**
   * Bisection root-finder to locate the exact Julian Day when planet crosses a boundary degree.
   */
  private async bisectBoundaryCrossing(
    planet: PlanetSymbol,
    lowJD: number,
    highJD: number,
    targetLon: number
  ): Promise<number> {
    let low = lowJD;
    let high = highJD;
    const toleranceJD = 1 / 86400; // ~1 second precision

    for (let iter = 0; iter < 30; iter++) {
      const mid = (low + high) / 2;
      if (high - low < toleranceJD) {
        return mid;
      }

      const stateLow = await this.getPlanetaryState(planet, low);
      const stateMid = await this.getPlanetaryState(planet, mid);

      const errLow = normalizeAngularDelta(stateLow.longitude, targetLon);
      const errMid = normalizeAngularDelta(stateMid.longitude, targetLon);

      if (Math.sign(errLow) === Math.sign(errMid)) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return (low + high) / 2;
  }

  /**
   * Bisection root-finder to locate the moment when speed is zero.
   */
  private async bisectSpeedZero(
    planet: PlanetSymbol,
    lowJD: number,
    highJD: number
  ): Promise<number> {
    let low = lowJD;
    let high = highJD;
    const toleranceJD = 1 / 86400;

    for (let iter = 0; iter < 30; iter++) {
      const mid = (low + high) / 2;
      if (high - low < toleranceJD) {
        return mid;
      }

      const stateLow = await this.getPlanetaryState(planet, low);
      const stateMid = await this.getPlanetaryState(planet, mid);

      if (Math.sign(stateLow.speedLongitude) === Math.sign(stateMid.speedLongitude)) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return (low + high) / 2;
  }
}

