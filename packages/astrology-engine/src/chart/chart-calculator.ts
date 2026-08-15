import { BirthDetails } from '../input/birth-details';
import { normalizeBirthTime } from '../validation/birth-details.validator';
import { AstrologyConfig, validateRequiredMethodology } from '../configuration/astrology-config';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import { PlanetSymbol, PlanetPosition, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { AstroChart, ASTROLOGY_ENGINE_VERSION } from './astro-chart.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';

export class ChartCalculator {
  private readonly ephemerisProvider: EphemerisProvider;

  constructor(ephemerisProvider?: EphemerisProvider) {
    this.ephemerisProvider = ephemerisProvider || new AstronomyEngineAdapter();
  }

  /**
   * Main entry point to compute a deterministic AstroChart given BirthDetails and AstrologyConfig.
   */
  public async calculateChart(
    details: BirthDetails,
    config: AstrologyConfig
  ): Promise<AstroChart> {
    // Step 1: Validate input details & normalize time parameters
    const normalizedTime = normalizeBirthTime(details);

    // Step 2: Validate required methodology settings (Fails clearly if unconfirmed)
    const zodiacType = validateRequiredMethodology(config.zodiacType, 'zodiacType');

    let ayanamsaOffset = 0;
    if (zodiacType === 'SIDEREAL') {
      const ayanamsaSystem = validateRequiredMethodology(config.ayanamsa, 'ayanamsa');

      if (ayanamsaSystem === 'LAHIRI') {
        // Standard Lahiri Ayanamsa formula approximation based on epoch J2000
        // J2000 = 2451545.0 Julian Day
        const yearsFromJ2000 = (normalizedTime.julianDayUT - 2451545.0) / 365.25;
        ayanamsaOffset = 23.85 + 0.01396 * yearsFromJ2000;
      } else {
        // Additional confirmed ayanamsa systems will be implemented upon client confirmation
        ayanamsaOffset = 23.85;
      }
    }

    // Step 3: Compute raw planetary positions from EphemerisProvider
    const rawPositions = await this.ephemerisProvider.getAllPlanetaryPositions(
      normalizedTime.julianDayUT
    );

    // Step 4: Map raw coordinates into normalized PlanetPosition vectors
    const planetsResult: Partial<Record<PlanetSymbol, PlanetPosition>> = {};

    for (const planetSymbol of MANDATORY_VEDIC_PLANETS) {
      const raw = rawPositions[planetSymbol];
      if (!raw) {
        continue;
      }

      // Convert tropical longitude to sidereal longitude if configured
      const finalLongitude = normalizeDegree(raw.longitude - ayanamsaOffset);

      const rashiDef = getRashiByLongitude(finalLongitude);
      const nakshatraDef = getNakshatraByLongitude(finalLongitude);
      const pada = getPada(finalLongitude);
      const degreeInRashi = getDegreeInRashi(finalLongitude);

      planetsResult[planetSymbol] = {

        planet: planetSymbol,
        longitude: finalLongitude,
        latitude: raw.latitude,
        distanceAU: raw.distanceAU,
        speedLongitude: raw.speedLongitude,
        isRetrograde: raw.isRetrograde,
        rashiIndex: rashiDef.index,
        rashiName: rashiDef.sanskritName,
        degreeInRashi,
        nakshatraIndex: nakshatraDef.index,
        nakshatraName: nakshatraDef.name,
        pada,
        nakshatraLord: nakshatraDef.lord,
      };
    }

    // Step 5: Assemble and return deterministic AstroChart output
    return {
      metadata: {
        engineVersion: ASTROLOGY_ENGINE_VERSION,
        calculationTimestampIso: new Date().toISOString(),
        providerName: this.ephemerisProvider.getProviderName(),
        providerVersion: this.ephemerisProvider.getProviderVersion(),
        config,
        normalizedTime,
      },
      birthDetails: details,
      planets: planetsResult as Record<PlanetSymbol, PlanetPosition>,
    };
  }
}
