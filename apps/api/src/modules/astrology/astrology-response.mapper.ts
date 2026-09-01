import {
  AstroChart,
  NormalizedChart,
  normalizeAstroChart,
  RASHIS,
  NAKSHATRAS,
} from '@astro/astrology-engine';
import { AppError } from '../../errors/app-error';

export interface PlanetResponseDto {
  name?: string;
  planet: string;
  sign?: string;
  degree?: number;
  house?: number;
  nakshatra?: string;
  pada?: number;
  retrograde?: boolean;
  combust?: boolean;
  dignity?: string;
  lordship?: number[];
  longitude: number;
  latitude: number;
  speedLongitude: number;
  isRetrograde: boolean;
  rashiIndex: number;
  rashiName: string;
  degreeInRashi: number;
  nakshatraIndex: number;
  nakshatraName: string;
  nakshatraLord: string;
  status?: string;
}

export interface HouseResponseDto {
  number: number;
  houseNumber: number;
  sign: string;
  lord: string;
  occupants: string[];
  cuspLongitude: number;
  startLongitude: number;
  endLongitude: number;
  rashiIndex: number;
  rashiName: string;
  status: string;
}

export interface RashiSummaryDto {
  index: number;
  name: string;
  englishName: string;
  lord: string;
  element: string;
  modality: string;
  planetsPresent: string[];
  houseNumber?: number;
}

export interface NakshatraSummaryDto {
  index: number;
  name: string;
  lord: string;
  planetsPresent: string[];
  startDegree?: number;
  endDegree?: number;
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
  ascendant: any;
  houses: HouseResponseDto[];
  planets: PlanetResponseDto[];
  rashis: RashiSummaryDto[];
  nakshatras: NakshatraSummaryDto[];
}

export interface AstroChartResponseDto {
  data: AstroChartDataDto;
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
    ascendant: any;
    planets: PlanetResponseDto[];
    houses: HouseResponseDto[];
    rashis: RashiSummaryDto[];
    nakshatras: NakshatraSummaryDto[];
  };
  normalizedChart?: NormalizedChart;
}

/**
 * Maps the domain chart object into a sanitized, validated public API response DTO.
 * Guarantees no empty {} objects for ascendant, planets, or houses.
 */
export function mapAstroChartToResponse(chart: AstroChart | NormalizedChart): AstroChartResponseDto {
  const normalized: NormalizedChart =
    'ascendant' in chart && 'planets' in chart && Array.isArray(chart.planets)
      ? (chart as NormalizedChart)
      : normalizeAstroChart(chart as AstroChart);

  // Strict Validation to ensure no empty {} objects
  if (!normalized.ascendant || typeof normalized.ascendant !== 'object' || !normalized.ascendant.sign) {
    throw new AppError('Astrology chart ascendant calculation failed or returned empty data', 500, 'ASTROLOGY_CALCULATION_INVALID');
  }

  if (!Array.isArray(normalized.planets) || normalized.planets.length < 9) {
    throw new AppError('Astrology chart planets calculation failed or returned incomplete data', 500, 'ASTROLOGY_CALCULATION_INVALID');
  }

  if (!Array.isArray(normalized.houses) || normalized.houses.length < 12) {
    throw new AppError('Astrology chart houses calculation failed or returned incomplete data', 500, 'ASTROLOGY_CALCULATION_INVALID');
  }

  const planetsList: PlanetResponseDto[] = normalized.planets.map((p) => ({
    name: p.name,
    planet: p.name,
    sign: p.sign,
    degree: p.degree,
    house: p.house,
    nakshatra: p.nakshatra,
    pada: p.pada,
    retrograde: p.retrograde,
    combust: p.combust,
    dignity: p.dignity,
    lordship: p.lordship,
    longitude: p.absoluteDegree,
    latitude: 0,
    speedLongitude: 0,
    isRetrograde: p.retrograde,
    rashiIndex: p.rashiIndex,
    rashiName: p.sign,
    degreeInRashi: p.degree,
    nakshatraIndex: p.nakshatraIndex,
    nakshatraName: p.nakshatra,
    nakshatraLord: p.nakshatraLord,
    status: p.status,
  }));

  const housesList: HouseResponseDto[] = normalized.houses.map((h) => ({
    number: h.number,
    houseNumber: h.number,
    sign: h.sign,
    lord: h.lord,
    occupants: h.occupants,
    cuspLongitude: h.cuspLongitude,
    startLongitude: h.startLongitude,
    endLongitude: h.endLongitude,
    rashiIndex: h.rashiIndex,
    rashiName: h.sign,
    status: h.status,
  }));

  const ascendantDto = {
    sign: normalized.ascendant.sign,
    degree: normalized.ascendant.degree,
    absoluteDegree: normalized.ascendant.absoluteDegree,
    nakshatra: normalized.ascendant.nakshatra,
    pada: normalized.ascendant.pada,
    house: normalized.ascendant.house,
    lord: normalized.ascendant.lord,
    name: 'Ascendant',
    longitude: normalized.ascendant.absoluteDegree,
    rashiIndex: normalized.ascendant.rashiIndex,
    rashiName: normalized.ascendant.sign,
    degreeInRashi: normalized.ascendant.degree,
    nakshatraIndex: normalized.ascendant.nakshatraIndex,
    nakshatraName: normalized.ascendant.nakshatra,
  };

  const rashisList: RashiSummaryDto[] = normalized.rashis.map((r) => ({
    index: r.index,
    name: r.name,
    englishName: r.englishName,
    lord: r.lord,
    element: r.element,
    modality: r.modality,
    houseNumber: r.houseNumber,
    planetsPresent: r.occupants,
  }));

  const nakshatrasList: NakshatraSummaryDto[] = normalized.nakshatras.map((n) => ({
    index: n.index,
    name: n.name,
    lord: n.lord,
    startDegree: n.startDegree,
    endDegree: n.endDegree,
    planetsPresent: n.occupants,
  }));

  const metadataPayload = {
    engineVersion: normalized.calculation.calculationVersion,
    providerName: normalized.calculation.providerName,
    providerVersion: normalized.calculation.providerVersion,
    calculationVersion: normalized.calculation.calculationVersion,
    normalizedTime: normalized.calculation.normalizedTime,
    config: normalized.calculation.config,
  };

  const chartPayload = {
    calculationVersion: normalized.calculation.calculationVersion,
    providerName: normalized.calculation.providerName,
    providerVersion: normalized.calculation.providerVersion,
    normalizedTime: normalized.calculation.normalizedTime,
    config: normalized.calculation.config,
    ascendant: ascendantDto,
    planets: planetsList,
    houses: housesList,
    rashis: rashisList,
    nakshatras: nakshatrasList,
  };

  const dataPayload: AstroChartDataDto = {
    metadata: metadataPayload,
    ascendant: ascendantDto,
    houses: housesList,
    planets: planetsList,
    rashis: rashisList,
    nakshatras: nakshatrasList,
  };

  return {
    data: dataPayload,
    chart: chartPayload,
    normalizedChart: normalized,
  };
}
