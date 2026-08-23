import { AstroChart, RASHIS, NAKSHATRAS } from '@astro/astrology-engine';

export interface PlanetResponseDto {
  planet: string;
  longitude: number;
  latitude: number;
  speedLongitude: number;
  isRetrograde: boolean;
  rashiIndex: number;
  rashiName: string;
  degreeInRashi: number;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  nakshatraLord: string;
}

export interface RashiSummaryDto {
  index: number;
  name: string;
  englishName: string;
  lord: string;
  element: string;
  modality: string;
  planetsPresent: string[];
}

export interface NakshatraSummaryDto {
  index: number;
  name: string;
  lord: string;
  planetsPresent: string[];
}

export interface AstroChartDataDto {
  metadata: {
    engineVersion: string;
    providerName: string;
    providerVersion: string;
    calculationVersion: string;
    normalizedTime: {
      utcIsoString: string;
      julianDayUT: number;
      timezoneOffsetMinutes: number;
    };
    config: {
      zodiacType: string;
      ayanamsa: string;
      houseSystem: string;
      nodeCalculation: string;
      planetaryCalculationMode: string;
    };
  };
  ascendant: any | null;
  houses: any[];
  planets: PlanetResponseDto[];
  rashis: RashiSummaryDto[];
  nakshatras: NakshatraSummaryDto[];
}

export interface AstroChartResponseDto {
  data: AstroChartDataDto;
  // Included for backward compatibility with root-level chart readers
  chart: {
    calculationVersion: string;
    providerName: string;
    providerVersion: string;
    normalizedTime: {
      utcIsoString: string;
      julianDayUT: number;
      timezoneOffsetMinutes: number;
    };
    config: {
      zodiacType: string;
      ayanamsa: string;
      houseSystem: string;
      nodeCalculation: string;
      planetaryCalculationMode: string;
    };
    ascendant: any | null;
    planets: PlanetResponseDto[];
    houses: any[];
    rashis: RashiSummaryDto[];
    nakshatras: NakshatraSummaryDto[];
  };
}

/**
 * Maps the internal domain AstroChart object into a sanitized public API response DTO.
 * Excludes internal ephemeris implementation details and raw data structures.
 */
export function mapAstroChartToResponse(chart: AstroChart): AstroChartResponseDto {
  const planetsList: PlanetResponseDto[] = Object.values(chart.planets).map((p) => ({
    planet: p.planet,
    longitude: p.longitude,
    latitude: p.latitude,
    speedLongitude: p.speedLongitude,
    isRetrograde: p.isRetrograde,
    rashiIndex: p.rashiIndex,
    rashiName: p.rashiName,
    degreeInRashi: p.degreeInRashi,
    nakshatraIndex: p.nakshatraIndex,
    nakshatraName: p.nakshatraName,
    pada: p.pada,
    nakshatraLord: p.nakshatraLord,
  }));

  // Build Rashi summaries (1 to 12) with planet placements
  const rashisList: RashiSummaryDto[] = RASHIS.map((rashi) => {
    const planetsInRashi = planetsList
      .filter((p) => p.rashiIndex === rashi.index)
      .map((p) => p.planet);

    return {
      index: rashi.index,
      name: rashi.sanskritName,
      englishName: rashi.englishName,
      lord: rashi.ruler,
      element: rashi.element,
      modality: rashi.modality,
      planetsPresent: planetsInRashi,
    };
  });

  // Build Nakshatra summaries (1 to 27) with planet placements
  const nakshatrasList: NakshatraSummaryDto[] = NAKSHATRAS.map((nakshatra) => {
    const planetsInNakshatra = planetsList
      .filter((p) => p.nakshatraIndex === nakshatra.index)
      .map((p) => p.planet);

    return {
      index: nakshatra.index,
      name: nakshatra.name,
      lord: nakshatra.lord,
      planetsPresent: planetsInNakshatra,
    };
  });

  const chartPayload = {
    calculationVersion: chart.metadata.engineVersion,
    providerName: chart.metadata.providerName,
    providerVersion: chart.metadata.providerVersion,
    normalizedTime: {
      utcIsoString: chart.metadata.normalizedTime.utcIsoString,
      julianDayUT: chart.metadata.normalizedTime.julianDayUT,
      timezoneOffsetMinutes: chart.metadata.normalizedTime.timezoneOffsetMinutes,
    },
    config: {
      zodiacType: String(chart.metadata.config.zodiacType),
      ayanamsa: String(chart.metadata.config.ayanamsa),
      houseSystem: String(chart.metadata.config.houseSystem),
      nodeCalculation: String(chart.metadata.config.nodeCalculation),
      planetaryCalculationMode: String(chart.metadata.config.planetaryCalculationMode),
    },
    ascendant: chart.ascendant ? {
      ...chart.ascendant,
      rashiName: RASHIS[chart.ascendant.rashiIndex - 1]?.sanskritName ?? '',
      nakshatraName: NAKSHATRAS[chart.ascendant.nakshatraIndex - 1]?.name ?? '',
    } : null,
    planets: planetsList,
    houses: chart.houses ? [...chart.houses] : [],
    rashis: rashisList,
    nakshatras: nakshatrasList,
  };

  const dataPayload: AstroChartDataDto = {
    metadata: {
      engineVersion: chart.metadata.engineVersion,
      providerName: chart.metadata.providerName,
      providerVersion: chart.metadata.providerVersion,
      calculationVersion: chart.metadata.engineVersion,
      normalizedTime: {
        utcIsoString: chart.metadata.normalizedTime.utcIsoString,
        julianDayUT: chart.metadata.normalizedTime.julianDayUT,
        timezoneOffsetMinutes: chart.metadata.normalizedTime.timezoneOffsetMinutes,
      },
      config: {
        zodiacType: String(chart.metadata.config.zodiacType),
        ayanamsa: String(chart.metadata.config.ayanamsa),
        houseSystem: String(chart.metadata.config.houseSystem),
        nodeCalculation: String(chart.metadata.config.nodeCalculation),
        planetaryCalculationMode: String(chart.metadata.config.planetaryCalculationMode),
      },
    },
    ascendant: chart.ascendant ? {
      ...chart.ascendant,
      rashiName: RASHIS[chart.ascendant.rashiIndex - 1]?.sanskritName ?? '',
      nakshatraName: NAKSHATRAS[chart.ascendant.nakshatraIndex - 1]?.name ?? '',
    } : null,
    houses: chart.houses ? [...chart.houses] : [],
    planets: planetsList,
    rashis: rashisList,
    nakshatras: nakshatrasList,
  };

  return {
    data: dataPayload,
    chart: chartPayload,
  };
}
