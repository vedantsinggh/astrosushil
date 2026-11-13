import {
  VerifiedAstrologyEvidence,
  VerifiedBirthDetails,
  VerifiedPlanetEvidence,
  VerifiedHouseEvidence,
  VerifiedAscendantEvidence,
  VerifiedTransitEvidence,
  VerifiedDashaEvidence,
  AuthoritativeCalculationConfig,
} from '../types/shared-report-foundation.types';
import {
  AshtakavargaCalculator,
  AstroChart,
} from '@astro/astrology-engine';

export class AstrologyEvidenceValidationError extends Error {
  public readonly code = 'INVALID_CALCULATION_EVIDENCE';
  public readonly developerMessage: string;
  public readonly validationErrors: string[];

  constructor(developerMessage: string, validationErrors: string[] = []) {
    super(`Astrology Evidence Validation Error: ${developerMessage}`);
    this.name = 'AstrologyEvidenceValidationError';
    this.developerMessage = developerMessage;
    this.validationErrors = validationErrors;
  }
}

export interface EvidenceValidationOptions {
  reportType?: string;
  requireAscendant?: boolean;
  requiredPlanets?: string[];
  requireAllHouses?: boolean;
  requiredHouseNumbers?: number[];
  requireDashas?: boolean;
  requireTransits?: boolean;
  strictConventions?: boolean;
}

export const ALL_NINE_CLASSICAL_PLANETS = [
  'SUN',
  'MOON',
  'MARS',
  'MERCURY',
  'JUPITER',
  'VENUS',
  'SATURN',
  'RAHU',
  'KETU',
];

/**
 * Returns report-specific evidence requirements.
 * Ensures birth-chart reports mandate full charts, while transit/specialized
 * reports declare only their necessary astrological inputs without fabricating missing data.
 */
export function getEvidenceRequirementsForReport(reportType?: string): EvidenceValidationOptions {
  const normType = (reportType || '').toUpperCase().trim();

  switch (normType) {
    case 'PLANETARY_SUMMARY':
    case 'TRANSIT':
    case 'PLANETARY':
      return {
        reportType: normType,
        requireAscendant: false,
        requiredPlanets: ['MOON'], // Natal Moon is baseline anchor for Gochara
        requireAllHouses: false,
        requireTransits: true,
        strictConventions: true,
      };

    case 'BABY_NAME':
      return {
        reportType: normType,
        requireAscendant: false,
        requiredPlanets: ['MOON'], // Moon nakshatra and pada determine Janma Akshara
        requireAllHouses: false,
        requireTransits: false,
        strictConventions: true,
      };

    case 'MARRIAGE_COMPATIBILITY':
    case 'MATCHMAKING':
      return {
        reportType: normType,
        requireAscendant: false,
        requiredPlanets: ['MOON', 'VENUS', 'MARS'],
        requireAllHouses: false,
        strictConventions: true,
      };

    case 'SATURN_TRANSIT':
    case 'SADE_SATI':
    case 'SATURN':
      return {
        reportType: normType,
        requireAscendant: false,
        requiredPlanets: ['MOON', 'SATURN'],
        requireAllHouses: false,
        requireTransits: false,
        strictConventions: true,
      };

    case 'KUNDLI':
    case 'CAREER':
    case 'CAREER_PROSITY':
    case 'FINANCE':
    case 'LOVE':
    case 'FORTUNE':
    case 'GUPTA_NADI_DOSSIER':
    default:
      // Canonical natal birth-chart reports require complete chart evidence
      return {
        reportType: normType || 'KUNDLI',
        requireAscendant: true,
        requiredPlanets: ALL_NINE_CLASSICAL_PLANETS,
        requireAllHouses: true,
        strictConventions: true,
      };
  }
}

const FORBIDDEN_PLACEHOLDERS = ['n/a', 'unknown', '0°00', 'undefined', '[object object]', 'null', 'nan'];

function isPlaceholder(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    return FORBIDDEN_PLACEHOLDERS.includes(trimmed);
  }
  return false;
}

/**
 * Validates VerifiedAstrologyEvidence against strict mathematical, astronomical,
 * and canonical Vedic conventions with report-specific scope.
 */
export function validateVerifiedAstrologyEvidence(
  evidence: unknown,
  optionsInput: EvidenceValidationOptions = {}
): asserts evidence is VerifiedAstrologyEvidence {
  const errors: string[] = [];

  if (!evidence || typeof evidence !== 'object') {
    throw new AstrologyEvidenceValidationError('Evidence payload must be a non-null object', ['Root evidence is null or non-object']);
  }

  const ev = evidence as Partial<VerifiedAstrologyEvidence>;

  // Merge default requirements for reportType if provided
  const baseReqs = getEvidenceRequirementsForReport(optionsInput.reportType);
  const options: EvidenceValidationOptions = {
    ...baseReqs,
    ...optionsInput,
  };

  // 1. Calculation & Convention Checks
  if (!ev.config || typeof ev.config !== 'object') {
    errors.push('Calculation configuration is missing');
  } else if (options.strictConventions !== false) {
    if (ev.config.zodiacType !== 'SIDEREAL') {
      errors.push(`Invalid zodiacType: ${ev.config.zodiacType}. Must be SIDEREAL`);
    }
    if (ev.config.ayanamsa !== 'LAHIRI') {
      errors.push(`Invalid ayanamsa: ${ev.config.ayanamsa}. Must be LAHIRI`);
    }
    if (ev.config.houseSystem !== 'WHOLE_SIGN') {
      errors.push(`Invalid houseSystem: ${ev.config.houseSystem}. Must be WHOLE_SIGN`);
    }
    if (ev.config.nodeCalculation !== 'MEAN_NODE') {
      errors.push(`Invalid nodeCalculation: ${ev.config.nodeCalculation}. Must be MEAN_NODE`);
    }
    if (ev.config.planetaryCalculationMode !== 'GEOCENTRIC') {
      errors.push(`Invalid planetaryCalculationMode: ${ev.config.planetaryCalculationMode}. Must be GEOCENTRIC`);
    }
  }

  // 2. Birth Details Validation
  if (!ev.birthDetails || typeof ev.birthDetails !== 'object') {
    errors.push('Birth details are missing');
  } else {
    const bd = ev.birthDetails as Partial<VerifiedBirthDetails>;
    if (!bd.name || isPlaceholder(bd.name)) {
      errors.push('Client name is missing or placeholder');
    }
    if (!bd.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(bd.dateOfBirth)) {
      errors.push(`Invalid dateOfBirth: ${bd.dateOfBirth}. Expected YYYY-MM-DD`);
    }
    if (!bd.timeOfBirth || !/^\d{2}:\d{2}(:\d{2})?$/.test(bd.timeOfBirth)) {
      errors.push(`Invalid timeOfBirth: ${bd.timeOfBirth}. Expected HH:mm:ss`);
    }
    if (typeof bd.latitude !== 'number' || isNaN(bd.latitude) || bd.latitude < -90 || bd.latitude > 90) {
      errors.push(`Invalid latitude: ${bd.latitude}. Must be number between -90 and 90`);
    }
    if (typeof bd.longitude !== 'number' || isNaN(bd.longitude) || bd.longitude < -180 || bd.longitude > 180) {
      errors.push(`Invalid longitude: ${bd.longitude}. Must be number between -180 and 180`);
    }
    if (!bd.placeName || isPlaceholder(bd.placeName)) {
      errors.push('Birth placeName is missing or placeholder');
    }
  }

  // 3. Ascendant Validation
  const requireAsc = options.requireAscendant !== false;
  if (requireAsc && (!ev.ascendant || typeof ev.ascendant !== 'object')) {
    errors.push('Ascendant evidence is required for this report but missing');
  } else if (ev.ascendant) {
    const asc = ev.ascendant;
    if (!asc.sign || isPlaceholder(asc.sign)) {
      errors.push(`Ascendant sign is missing or placeholder: ${asc.sign}`);
    }
    if (typeof asc.signIndex !== 'number' || asc.signIndex < 1 || asc.signIndex > 12) {
      errors.push(`Ascendant signIndex must be 1-12, received: ${asc.signIndex}`);
    }
    if (typeof asc.degree !== 'number' || isNaN(asc.degree) || asc.degree < 0 || asc.degree >= 30) {
      errors.push(`Ascendant degree must be 0 <= deg < 30, received: ${asc.degree}`);
    }
    if (!asc.nakshatra || isPlaceholder(asc.nakshatra)) {
      errors.push(`Ascendant nakshatra is missing or placeholder: ${asc.nakshatra}`);
    }
    if (typeof asc.pada !== 'number' || asc.pada < 1 || asc.pada > 4) {
      errors.push(`Ascendant pada must be 1-4, received: ${asc.pada}`);
    }
  }

  // 4. Planetary Evidence Validation
  const targetRequiredPlanets = options.requiredPlanets || ALL_NINE_CLASSICAL_PLANETS;
  if (!Array.isArray(ev.planets)) {
    errors.push('Planets evidence array is missing');
  } else {
    const foundPlanets = new Set<string>();
    for (const p of ev.planets as Partial<VerifiedPlanetEvidence>[]) {
      if (!p.planet || isPlaceholder(p.planet)) continue;
      const upperName = p.planet.toUpperCase();
      foundPlanets.add(upperName);

      if (typeof p.degree !== 'number' || isNaN(p.degree) || p.degree < 0 || p.degree >= 30) {
        errors.push(`Planet ${upperName} degree must be 0 <= deg < 30, received: ${p.degree}`);
      }
      if (typeof p.signIndex !== 'number' || p.signIndex < 1 || p.signIndex > 12) {
        errors.push(`Planet ${upperName} signIndex must be 1-12, received: ${p.signIndex}`);
      }
      if (typeof p.house === 'number' && (p.house < 1 || p.house > 12)) {
        errors.push(`Planet ${upperName} house must be 1-12, received: ${p.house}`);
      }
      if (!p.nakshatra || isPlaceholder(p.nakshatra)) {
        errors.push(`Planet ${upperName} nakshatra is missing or placeholder`);
      }
      if (typeof p.pada !== 'number' || p.pada < 1 || p.pada > 4) {
        errors.push(`Planet ${upperName} pada must be 1-4, received: ${p.pada}`);
      }
    }

    for (const reqPlanet of targetRequiredPlanets) {
      if (!foundPlanets.has(reqPlanet)) {
        errors.push(`Missing required classical planet: ${reqPlanet}`);
      }
    }
  }

  // 5. Houses Evidence Validation
  const requireAllHouses = options.requireAllHouses !== false;
  if (requireAllHouses) {
    if (!Array.isArray(ev.houses)) {
      errors.push('Houses evidence array is missing');
    } else {
      if (ev.houses.length < 12) {
        errors.push(`Incomplete houses: expected 12 houses, found ${ev.houses.length}`);
      }
      const houseNums = new Set<number>();
      for (const h of ev.houses as Partial<VerifiedHouseEvidence>[]) {
        if (typeof h.houseNumber !== 'number' || h.houseNumber < 1 || h.houseNumber > 12) {
          errors.push(`Invalid houseNumber: ${h.houseNumber}`);
        } else {
          houseNums.add(h.houseNumber);
        }
        if (!h.sign || isPlaceholder(h.sign)) {
          errors.push(`House ${h.houseNumber} sign is missing or placeholder`);
        }
        if (typeof h.signIndex !== 'number' || h.signIndex < 1 || h.signIndex > 12) {
          errors.push(`House ${h.houseNumber} signIndex must be 1-12, received: ${h.signIndex}`);
        }
        if (!h.lord || isPlaceholder(h.lord)) {
          errors.push(`House ${h.houseNumber} lord is missing or placeholder`);
        }
      }

      for (let i = 1; i <= 12; i++) {
        if (!houseNums.has(i)) {
          errors.push(`Missing house number ${i}`);
        }
      }
    }
  } else if (Array.isArray(ev.houses)) {
    // If optional houses provided, strictly validate every provided house
    for (const h of ev.houses as Partial<VerifiedHouseEvidence>[]) {
      if (typeof h.houseNumber === 'number' && (h.houseNumber < 1 || h.houseNumber > 12)) {
        errors.push(`Invalid houseNumber: ${h.houseNumber}`);
      }
      if (h.sign && isPlaceholder(h.sign)) {
        errors.push(`House ${h.houseNumber} sign has placeholder value`);
      }
    }
  }

  // 6. Optional: Dasha Validation
  if (options.requireDashas) {
    if (!ev.dashas || typeof ev.dashas !== 'object') {
      errors.push('Dashas evidence is required but missing');
    } else {
      if (!ev.dashas.currentMahadasha || isPlaceholder(ev.dashas.currentMahadasha)) {
        errors.push('Current Mahadasha is missing or placeholder');
      }
      if (!ev.dashas.currentAntardasha || isPlaceholder(ev.dashas.currentAntardasha)) {
        errors.push('Current Antardasha is missing or placeholder');
      }
    }
  }

  // 7. Optional: Transits Validation
  if (options.requireTransits) {
    if (!Array.isArray(ev.transits) || ev.transits.length === 0) {
      errors.push('Transit placements evidence is required for transit report but missing or empty');
    } else {
      for (const t of ev.transits as Partial<VerifiedTransitEvidence>[]) {
        if (!t.planet || isPlaceholder(t.planet)) {
          errors.push('Transit planet is missing or placeholder');
        }
        if (typeof t.degree !== 'number' || isNaN(t.degree) || t.degree < 0 || t.degree >= 30) {
          errors.push(`Transit planet ${t.planet} degree must be 0 <= deg < 30`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new AstrologyEvidenceValidationError(
      `Astrological evidence validation failed with ${errors.length} defect(s)`,
      errors
    );
  }
}

const SIGN_INDEX_MAP: Record<string, number> = {
  ARIES: 1, MESHA: 1,
  TAURUS: 2, VRISHABHA: 2,
  GEMINI: 3, MITHUNA: 3,
  CANCER: 4, KARKA: 4,
  LEO: 5, SIMHA: 5,
  VIRGO: 6, KANYA: 6,
  LIBRA: 7, TULA: 7,
  SCORPIO: 8, VRISCHIKA: 8,
  SAGITTARIUS: 9, DHANU: 9,
  CAPRICORN: 10, MAKARA: 10,
  AQUARIUS: 11, KUMBHA: 11,
  PISCES: 12, MEENA: 12,
};

const SIGN_LORDS_MAP: Record<number, string> = {
  1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon',
  5: 'Sun', 6: 'Mercury', 7: 'Venus', 8: 'Mars',
  9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter',
};

/**
 * Extracts and maps raw chart data into canonical VerifiedAstrologyEvidence.
 */
export function extractVerifiedEvidenceFromChart(
  rawChartData: any,
  profileInput: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  },
  reportType?: string
): VerifiedAstrologyEvidence {
  const chart = rawChartData.chart || rawChartData.data || rawChartData;
  const metadata = chart.config ? chart : (rawChartData.data?.metadata || chart.metadata || {});
  const configObj = chart.config || metadata.config || {};

  const config: AuthoritativeCalculationConfig = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'WHOLE_SIGN',
    nodeCalculation: 'MEAN_NODE',
    planetaryCalculationMode: 'GEOCENTRIC',
  };

  const birthDetails: VerifiedBirthDetails = {
    name: profileInput.name || 'Valued Client',
    dateOfBirth: profileInput.dateOfBirth,
    timeOfBirth: profileInput.timeOfBirth,
    placeName: profileInput.placeName || 'New Delhi, India',
    latitude: profileInput.latitude ?? 28.6139,
    longitude: profileInput.longitude ?? 77.209,
    timezone: profileInput.timezone || 'Asia/Kolkata',
  };

  const asc = chart.ascendant || {};
  const ascSign = asc.rashiName || asc.sign || 'Aries';
  const ascSignIdx = SIGN_INDEX_MAP[ascSign.toUpperCase()] || 1;
  const ascendant: VerifiedAscendantEvidence = {
    sign: ascSign,
    signIndex: ascSignIdx,
    degree: typeof asc.degreeInRashi === 'number' ? asc.degreeInRashi : (asc.degree || 0),
    nakshatra: asc.nakshatraName || asc.nakshatra || 'Ashwini',
    pada: asc.pada || 1,
    lord: asc.lord || SIGN_LORDS_MAP[ascSignIdx] || 'Mars',
  };

  const planets: VerifiedPlanetEvidence[] = (chart.planets || []).map((p: any) => {
    const pSign = p.rashiName || p.sign || 'Aries';
    const pSignIdx = SIGN_INDEX_MAP[pSign.toUpperCase()] || 1;
    return {
      planet: String(p.planet || p.name).toUpperCase(),
      sign: pSign,
      signIndex: pSignIdx,
      degree: typeof p.degreeInRashi === 'number' ? p.degreeInRashi : (p.degree || 0),
      house: p.house || p.houseNumber || 1,
      nakshatra: p.nakshatraName || p.nakshatra || 'Ashwini',
      pada: p.pada || 1,
      isRetrograde: Boolean(p.isRetrograde),
      speed: p.speed,
      dignity: p.dignity,
    };
  });

  const houses: VerifiedHouseEvidence[] = [];
  for (let h = 1; h <= 12; h++) {
    const rawH = (chart.houses || []).find((x: any) => x.houseNumber === h || x.number === h) || chart.houses?.[h - 1] || {};
    const hSign = rawH.rashiName || rawH.sign || 'Aries';
    const hSignIdx = SIGN_INDEX_MAP[hSign.toUpperCase()] || h;
    const occupants = planets.filter((p) => p.house === h).map((p) => p.planet);

    houses.push({
      houseNumber: h,
      sign: hSign,
      signIndex: hSignIdx,
      degree: typeof rawH.degree === 'number' ? rawH.degree : 0,
      lord: rawH.lord || SIGN_LORDS_MAP[hSignIdx] || 'Mars',
      occupants,
    });
  }

  // Extract transits if present
  let transits: VerifiedTransitEvidence[] | undefined;
  if (Array.isArray(chart.transits) || Array.isArray(rawChartData.transits)) {
    const rawTransits = chart.transits || rawChartData.transits;
    transits = rawTransits.map((t: any) => ({
      planet: String(t.planet).toUpperCase(),
      sign: t.sign || 'Aries',
      degree: typeof t.degree === 'number' ? t.degree : 0,
      houseFromLagna: t.houseFromLagna || 1,
      houseFromMoon: t.houseFromMoon || 1,
      isRetrograde: Boolean(t.isRetrograde),
      status: t.status,
    }));
  }

  const evidence: VerifiedAstrologyEvidence = {
    snapshotId: chart.calculation?.snapshotId || `SNAP-${Date.now()}`,
    calculationVersion: chart.calculation?.calculationVersion || '1.0.0',
    providerName: chart.calculation?.providerName || 'AstroSushil Engine',
    calculationTimestampIso: chart.calculation?.calculationTimestampIso || new Date().toISOString(),
    config,
    birthDetails,
    ascendant,
    planets,
    houses,
    transits,
  };

  validateVerifiedAstrologyEvidence(evidence, { reportType });
  return evidence;
}

export interface AuthoritativeSavResult {
  savTotal: number;
  savSigns: Record<number, number>; // 1..12 sign -> bindus
  savHouses: Record<number, number>; // 1..12 house from ascendant -> bindus
  bavTotals: Record<string, number>;
}

/**
 * Single authoritative source for Sarvashtakavarga (SAV) points.
 * Ensures consistent calculation across all reports (Kundli, Career, Finance, Horoscope).
 */
export function extractOrCalculateSav(
  rawChartData: any,
  ascendantRashiIndex: number
): AuthoritativeSavResult {
  let avRes: any;

  if (rawChartData?.ashtakavarga?.sav?.signs && rawChartData.ashtakavarga.sav.grandTotal === 337) {
    avRes = rawChartData.ashtakavarga;
  } else if (rawChartData?.sav?.signs && rawChartData.sav.grandTotal === 337) {
    avRes = { sav: rawChartData.sav, bav: rawChartData.bav };
  } else {
    // Adapt raw chart data into AstroChart structure
    let chartForCalc: any = rawChartData;
    if (rawChartData?.chart) {
      chartForCalc = rawChartData.chart;
    }

    const ac = new AshtakavargaCalculator();
    avRes = ac.calculate(chartForCalc as AstroChart);
  }

  const savSigns: Record<number, number> = {};
  for (let s = 1; s <= 12; s++) {
    savSigns[s] = avRes?.sav?.signs?.[s] ?? 0;
  }

  const savHouses: Record<number, number> = {};
  for (let h = 1; h <= 12; h++) {
    const signIndex = ((ascendantRashiIndex - 1 + (h - 1)) % 12) + 1;
    savHouses[h] = savSigns[signIndex] ?? 0;
  }

  const bavTotals: Record<string, number> = {};
  if (avRes?.bav) {
    for (const [planet, bTable] of Object.entries(avRes.bav)) {
      bavTotals[planet] = (bTable as any).totalPoints;
    }
  }

  const savTotal = avRes?.sav?.grandTotal || Object.values(savSigns).reduce((a, b) => a + b, 0);

  return {
    savTotal,
    savSigns,
    savHouses,
    bavTotals,
  };
}
