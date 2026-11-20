import { BirthDetails } from '../input/birth-details';
import { normalizeBirthTime } from '../validation/birth-details.validator';
import { AstrologyConfig, validateRequiredMethodology } from '../configuration/astrology-config';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import { PlanetSymbol, PlanetPosition, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { CalculatedPoint, HousePlacement } from '../houses/house.types';
import { AstroChart, ASTROLOGY_ENGINE_VERSION } from './astro-chart.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiByLongitude, getDegreeInRashi, RASHIS } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { AyanamsaValue, computeAyanamsa, resolveAyanamsaSystem } from '../ayanamsa/ayanamsa';
import { calculateLunarNodes, LunarNodeType } from '../rahu-ketu/lunar-nodes';
import { calculateHouseAngles } from '../houses/house-cusps';

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

    // Ayanamsa (ADR-017): true Chitrapaksha Lahiri unless the config selects another system.
    // The TRUE ayanamsa is subtracted from apparent (true-equinox) ephemeris longitudes and the
    // MEAN ayanamsa from mean-equinox quantities (ascendant, MC, lunar nodes): src/ayanamsa/ayanamsa.ts.
    let ayanamsa: AyanamsaValue | null = null;
    if (zodiacType === 'SIDEREAL') {
      const ayanamsaSystem = resolveAyanamsaSystem(validateRequiredMethodology(config.ayanamsa, 'ayanamsa'));
      ayanamsa = computeAyanamsa(normalizedTime.julianDayUT, ayanamsaSystem);
    }
    const trueAyanamsaOffset = ayanamsa ? ayanamsa.trueDegrees : 0;
    const meanAyanamsaOffset = ayanamsa ? ayanamsa.meanDegrees : 0;

    // Lunar nodes (ADR-017): mean node by default, true (osculating) node selectable.
    const nodeType: LunarNodeType =
      validateRequiredMethodology(config.nodeCalculation ?? 'MEAN_NODE', 'nodeCalculation') === 'TRUE_NODE'
        ? 'TRUE_NODE'
        : 'MEAN_NODE';

    // Step 3: Compute raw planetary positions from EphemerisProvider
    const rawPositions = {
      ...(await this.ephemerisProvider.getAllPlanetaryPositions(normalizedTime.julianDayUT)),
    };
    if (nodeType === 'TRUE_NODE') {
      const nodes = calculateLunarNodes(normalizedTime.julianDayUT, 'TRUE_NODE');
      for (const [symbol, longitude] of [
        [PlanetSymbol.RAHU, nodes.rahuLongitude],
        [PlanetSymbol.KETU, nodes.ketuLongitude],
      ] as const) {
        if (!rawPositions[symbol]) continue;
        rawPositions[symbol] = {
          ...rawPositions[symbol],
          longitude,
          speedLongitude: nodes.speedLongitude,
          isRetrograde: nodes.speedLongitude < 0,
        };
      }
    }

    // Step 4: Map raw coordinates into normalized PlanetPosition vectors
    const planetsResult: Partial<Record<PlanetSymbol, PlanetPosition>> = {};

    for (const planetSymbol of MANDATORY_VEDIC_PLANETS) {
      const raw = rawPositions[planetSymbol];
      if (!raw) {
        continue;
      }

      // Convert tropical longitude to sidereal longitude if configured. Node longitudes are
      // referred to the mean equinox of date (EphemerisProvider contract), planets to the true one.
      const isNode = planetSymbol === PlanetSymbol.RAHU || planetSymbol === PlanetSymbol.KETU;
      const finalLongitude = normalizeDegree(raw.longitude - (isNode ? meanAyanamsaOffset : trueAyanamsaOffset));

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

    // Step 5: Compute Ascendant (Lagna) & Houses
    // Mean-equinox angles (GMST, mean obliquity; Meeus eq. 12.4 / 14.2): src/houses/house-cusps.ts.
    const angles = calculateHouseAngles(normalizedTime.julianDayUT, details.latitude, details.longitude);
    const ascSidereal = normalizeDegree(angles.ascendantTropical - meanAyanamsaOffset);
    const mcSidereal = normalizeDegree(angles.mcTropical - meanAyanamsaOffset);

    const ascRashiDef = getRashiByLongitude(ascSidereal);
    const ascNakshatraDef = getNakshatraByLongitude(ascSidereal);
    const ascPada = getPada(ascSidereal);
    const ascDegreeInRashi = getDegreeInRashi(ascSidereal);

    const ascendant: CalculatedPoint = {
      name: 'Ascendant',
      longitude: ascSidereal,
      rashiIndex: ascRashiDef.index,
      degreeInRashi: ascDegreeInRashi,
      nakshatraIndex: ascNakshatraDef.index,
      pada: ascPada,
      nakshatraLord: ascNakshatraDef.lord,
    };

    const mcRashiDef = getRashiByLongitude(mcSidereal);
    const mcNakshatraDef = getNakshatraByLongitude(mcSidereal);
    const midheaven: CalculatedPoint = {
      name: 'Midheaven',
      longitude: mcSidereal,
      rashiIndex: mcRashiDef.index,
      degreeInRashi: getDegreeInRashi(mcSidereal),
      nakshatraIndex: mcNakshatraDef.index,
      pada: getPada(mcSidereal),
      nakshatraLord: mcNakshatraDef.lord,
    };

    // Build Whole Sign Houses (1 to 12)
    const houses: HousePlacement[] = [];
    for (let h = 1; h <= 12; h++) {
      const houseRashiIndex = ((ascRashiDef.index - 1 + (h - 1)) % 12) + 1;
      const houseRashiDef = RASHIS[houseRashiIndex - 1];
      const startLongitude = (houseRashiIndex - 1) * 30;
      const endLongitude = houseRashiIndex * 30;

      houses.push({
        houseNumber: h,
        cuspLongitude: startLongitude,
        startLongitude,
        endLongitude,
        rashiIndex: houseRashiIndex,
        rashiName: houseRashiDef.sanskritName,
      });
    }

    // Step 6: Assemble and return deterministic AstroChart output
    return {
      metadata: {
        engineVersion: ASTROLOGY_ENGINE_VERSION,
        calculationTimestampIso: new Date().toISOString(),
        providerName: this.ephemerisProvider.getProviderName(),
        providerVersion: this.ephemerisProvider.getProviderVersion(),
        config,
        normalizedTime,
        ayanamsa: ayanamsa
          ? {
              system: ayanamsa.system,
              label: ayanamsa.definition.label,
              trueDegrees: ayanamsa.trueDegrees,
              meanDegrees: ayanamsa.meanDegrees,
            }
          : null,
        nodeType,
      },
      birthDetails: details,
      ascendant,
      midheaven,
      planets: planetsResult as Record<PlanetSymbol, PlanetPosition>,
      houses,
    };
  }
}

