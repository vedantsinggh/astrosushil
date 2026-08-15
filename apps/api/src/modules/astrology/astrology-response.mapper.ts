import { AstroChart } from '@astro/astrology-engine';

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

export interface AstroChartResponseDto {
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
    rashis: any[];
    nakshatras: any[];
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

  return {
    chart: {
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
      ascendant: chart.ascendant ? { ...chart.ascendant } : null,
      planets: planetsList,
      houses: chart.houses ? [...chart.houses] : [],
      rashis: [],
      nakshatras: [],
    },
  };
}
