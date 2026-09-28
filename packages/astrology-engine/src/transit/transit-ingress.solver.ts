import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
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

export class TransitIngressSolver {
  private readonly ephemerisProvider: EphemerisProvider;

  constructor(ephemerisProvider?: EphemerisProvider) {
    this.ephemerisProvider = ephemerisProvider || new AstronomyEngineAdapter();
  }

  /**
   * Calculates sidereal planetary state at an arbitrary Julian Day UT.
   */
  public async getPlanetaryState(
    planet: PlanetSymbol,
    julianDayUT: number
  ): Promise<PlanetaryTransitState> {
    const raw = await this.ephemerisProvider.getPlanetaryPosition(planet, julianDayUT);

    // Lahiri Ayanamsa approximation relative to J2000
    const yearsFromJ2000 = (julianDayUT - 2451545.0) / 365.25;
    const ayanamsaOffset = 23.85 + 0.01396 * yearsFromJ2000;
    const siderealLon = normalizeDegree(raw.longitude - ayanamsaOffset);

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
        // If moving direct into toSignDef: boundary = (toSignDef.index - 1) * 30
        // If moving retrograde: boundary = (prevState.index - 1) * 30
        let targetBoundaryLon = (toSignDef.index - 1) * 30.0;
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

        let targetBoundaryLon = (toNakDef.index - 1) * (360 / 27);
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

