import { PlanetSymbol } from '../planets/planet.types';
import { findLocalSolarEvents } from '../astronomy/solar-day';
import { RAHU_KALA_DAY_SEGMENTS, VARA_LORDS } from '../panchang/panchang-calculator';
import {
  ChoghadiyaName,
  ChoghadiyaPeriod,
  ChoghadiyaQuality,
  DayDivisionInput,
  DayDivisionsReport,
  HoraPeriod,
  SolarDayBounds,
  TimeWindow,
} from './day-divisions.types';

/**
 * Sunrise-based day divisions used in Muhurta work.
 *
 * Conventions (standard, widely published panchanga practice):
 * - The Vedic day (vara) runs from local sunrise to the next local sunrise.
 * - Sunrise/sunset = upper limb of the Sun crossing the horizon with standard refraction
 *   (astronomy-engine `SearchRiseSet` via the shared `findLocalSolarEvents`, also used by PanchangCalculator),
 *   searched from LOCAL midnight of the civil date.
 * - Kala Hora: daytime and night-time are each divided into 12 equal horas. The first hora
 *   after sunrise belongs to the weekday lord, then lords follow the Chaldean order
 *   (descending geocentric orbital period): Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon.
 *   (BPHS Ch. 27 Kala Bala "Hora Bala"; Muhurta Chintamani.)
 * - Choghadiya: daytime and night-time are each divided into 8 equal parts. The published
 *   weekday tables are reproduced in CHOGHADIYA_DAY_TABLE / CHOGHADIYA_NIGHT_TABLE.
 * - Rahu / Yamaganda / Gulika Kaala: one of 8 equal daytime octants by weekday.
 * - Abhijit Muhurta: the 8th of 15 equal daytime muhurtas (centred on local apparent noon).
 */

/** Chaldean order used for successive horas. */
export const CHALDEAN_HORA_ORDER: PlanetSymbol[] = [
  PlanetSymbol.SATURN,
  PlanetSymbol.JUPITER,
  PlanetSymbol.MARS,
  PlanetSymbol.SUN,
  PlanetSymbol.VENUS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.MOON,
];

/** Choghadiya names and their ruling planets. */
export const CHOGHADIYA_LORDS: Record<ChoghadiyaName, PlanetSymbol> = {
  UDVEG: PlanetSymbol.SUN,
  AMRIT: PlanetSymbol.MOON,
  ROG: PlanetSymbol.MARS,
  LABH: PlanetSymbol.MERCURY,
  SHUBH: PlanetSymbol.JUPITER,
  CHAR: PlanetSymbol.VENUS,
  KAAL: PlanetSymbol.SATURN,
};

export const CHOGHADIYA_QUALITY: Record<ChoghadiyaName, ChoghadiyaQuality> = {
  AMRIT: 'AUSPICIOUS',
  SHUBH: 'AUSPICIOUS',
  LABH: 'AUSPICIOUS',
  CHAR: 'NEUTRAL',
  UDVEG: 'INAUSPICIOUS',
  ROG: 'INAUSPICIOUS',
  KAAL: 'INAUSPICIOUS',
};

/**
 * Standard published day Choghadiya table (index 0 = Sunday ... 6 = Saturday).
 * Source: traditional Gujarati / North Indian panchanga Choghadiya tables
 * (e.g. as printed in Sandesh / Janmabhoomi panchangs; same tables shown by drikpanchang.com).
 */
export const CHOGHADIYA_DAY_TABLE: ChoghadiyaName[][] = [
  ['UDVEG', 'CHAR', 'LABH', 'AMRIT', 'KAAL', 'SHUBH', 'ROG', 'UDVEG'],
  ['AMRIT', 'KAAL', 'SHUBH', 'ROG', 'UDVEG', 'CHAR', 'LABH', 'AMRIT'],
  ['ROG', 'UDVEG', 'CHAR', 'LABH', 'AMRIT', 'KAAL', 'SHUBH', 'ROG'],
  ['LABH', 'AMRIT', 'KAAL', 'SHUBH', 'ROG', 'UDVEG', 'CHAR', 'LABH'],
  ['SHUBH', 'ROG', 'UDVEG', 'CHAR', 'LABH', 'AMRIT', 'KAAL', 'SHUBH'],
  ['CHAR', 'LABH', 'AMRIT', 'KAAL', 'SHUBH', 'ROG', 'UDVEG', 'CHAR'],
  ['KAAL', 'SHUBH', 'ROG', 'UDVEG', 'CHAR', 'LABH', 'AMRIT', 'KAAL'],
];

/** Standard published night Choghadiya table (index 0 = Sunday night ... 6 = Saturday night). */
export const CHOGHADIYA_NIGHT_TABLE: ChoghadiyaName[][] = [
  ['SHUBH', 'AMRIT', 'CHAR', 'ROG', 'KAAL', 'LABH', 'UDVEG', 'SHUBH'],
  ['CHAR', 'ROG', 'KAAL', 'LABH', 'UDVEG', 'SHUBH', 'AMRIT', 'CHAR'],
  ['KAAL', 'LABH', 'UDVEG', 'SHUBH', 'AMRIT', 'CHAR', 'ROG', 'KAAL'],
  ['UDVEG', 'SHUBH', 'AMRIT', 'CHAR', 'ROG', 'KAAL', 'LABH', 'UDVEG'],
  ['AMRIT', 'CHAR', 'ROG', 'KAAL', 'LABH', 'UDVEG', 'SHUBH', 'AMRIT'],
  ['ROG', 'KAAL', 'LABH', 'UDVEG', 'SHUBH', 'AMRIT', 'CHAR', 'ROG'],
  ['LABH', 'UDVEG', 'SHUBH', 'AMRIT', 'CHAR', 'ROG', 'KAAL', 'LABH'],
];

/** Yamaganda Kaala daytime octant by weekday (0 = Sunday). Standard published table. */
export const YAMAGANDA_DAY_SEGMENTS: Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6 };

/** Gulika Kaala daytime octant by weekday (0 = Sunday). Standard published table. */
export const GULIKA_KAALA_DAY_SEGMENTS: Record<number, number> = { 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

export class DayDivisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DayDivisionError';
  }
}

const iso = (ms: number): string => new Date(Math.round(ms)).toISOString();

function weekdayOfCivilDate(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export class DayDivisionsCalculator {
  public calculateSolarDay(input: DayDivisionInput): SolarDayBounds {
    const { date, timezone, latitude, longitude } = input;
    // Shared local-midnight sunrise primitive (also used by PanchangCalculator).
    const { sunrise: rise, sunset: set, nextSunrise: nextRise } = findLocalSolarEvents(date, latitude, longitude, timezone);
    if (!rise) throw new DayDivisionError('No sunrise on this local date at this latitude (polar day/night).');
    if (!set) throw new DayDivisionError('No sunset after sunrise within one day at this latitude.');
    if (!nextRise) throw new DayDivisionError('No following sunrise within one day at this latitude.');

    const weekdayIndex = weekdayOfCivilDate(date.year, date.month, date.day);
    const riseMs = rise.getTime();
    const setMs = set.getTime();
    const nextMs = nextRise.getTime();
    return {
      sunriseIso: iso(riseMs),
      sunsetIso: iso(setMs),
      nextSunriseIso: iso(nextMs),
      dayLengthMinutes: (setMs - riseMs) / 60000,
      nightLengthMinutes: (nextMs - setMs) / 60000,
      weekdayIndex,
      weekdayLord: VARA_LORDS[weekdayIndex].lord,
    };
  }

  /** 24 Kala Horas from sunrise to next sunrise. */
  public calculateHoras(bounds: SolarDayBounds): HoraPeriod[] {
    const riseMs = Date.parse(bounds.sunriseIso);
    const setMs = Date.parse(bounds.sunsetIso);
    const nextMs = Date.parse(bounds.nextSunriseIso);
    const dayPart = (setMs - riseMs) / 12;
    const nightPart = (nextMs - setMs) / 12;
    const startIdx = CHALDEAN_HORA_ORDER.indexOf(bounds.weekdayLord);
    const horas: HoraPeriod[] = [];
    for (let i = 0; i < 24; i++) {
      const isDay = i < 12;
      const startMs = isDay ? riseMs + i * dayPart : setMs + (i - 12) * nightPart;
      const endMs = isDay ? riseMs + (i + 1) * dayPart : setMs + (i - 11) * nightPart;
      horas.push({
        index: i + 1,
        isDay,
        lord: CHALDEAN_HORA_ORDER[(startIdx + i) % 7],
        startIso: iso(startMs),
        endIso: iso(i === 23 ? nextMs : endMs),
      });
    }
    return horas;
  }

  /** 16 Choghadiyas (8 day + 8 night) from sunrise to next sunrise. */
  public calculateChoghadiya(bounds: SolarDayBounds): ChoghadiyaPeriod[] {
    const riseMs = Date.parse(bounds.sunriseIso);
    const setMs = Date.parse(bounds.sunsetIso);
    const nextMs = Date.parse(bounds.nextSunriseIso);
    const dayPart = (setMs - riseMs) / 8;
    const nightPart = (nextMs - setMs) / 8;
    const out: ChoghadiyaPeriod[] = [];
    for (let i = 0; i < 16; i++) {
      const isDay = i < 8;
      const k = isDay ? i : i - 8;
      const name = (isDay ? CHOGHADIYA_DAY_TABLE : CHOGHADIYA_NIGHT_TABLE)[bounds.weekdayIndex][k];
      const base = isDay ? riseMs : setMs;
      const part = isDay ? dayPart : nightPart;
      out.push({
        index: i + 1,
        isDay,
        name,
        lord: CHOGHADIYA_LORDS[name],
        quality: CHOGHADIYA_QUALITY[name],
        startIso: iso(base + k * part),
        endIso: iso(i === 15 ? nextMs : base + (k + 1) * part),
      });
    }
    return out;
  }

  public calculateOctantKaala(bounds: SolarDayBounds, name: string, table: Record<number, number>): TimeWindow {
    const riseMs = Date.parse(bounds.sunriseIso);
    const setMs = Date.parse(bounds.sunsetIso);
    const part = (setMs - riseMs) / 8;
    const seg = table[bounds.weekdayIndex];
    return { name, startIso: iso(riseMs + (seg - 1) * part), endIso: iso(riseMs + seg * part), segmentIndex: seg };
  }

  /** Abhijit Muhurta: 8th of 15 equal daytime muhurtas. */
  public calculateAbhijit(bounds: SolarDayBounds): TimeWindow {
    const riseMs = Date.parse(bounds.sunriseIso);
    const setMs = Date.parse(bounds.sunsetIso);
    const part = (setMs - riseMs) / 15;
    return { name: 'Abhijit Muhurta', startIso: iso(riseMs + 7 * part), endIso: iso(riseMs + 8 * part), segmentIndex: 8 };
  }

  public calculate(input: DayDivisionInput): DayDivisionsReport {
    const bounds = this.calculateSolarDay(input);
    return {
      input,
      bounds,
      horas: this.calculateHoras(bounds),
      choghadiya: this.calculateChoghadiya(bounds),
      rahuKaala: this.calculateOctantKaala(bounds, 'Rahu Kaala', RAHU_KALA_DAY_SEGMENTS),
      yamagandaKaala: this.calculateOctantKaala(bounds, 'Yamaganda Kaala', YAMAGANDA_DAY_SEGMENTS),
      gulikaKaala: this.calculateOctantKaala(bounds, 'Gulika Kaala', GULIKA_KAALA_DAY_SEGMENTS),
      abhijitMuhurta: this.calculateAbhijit(bounds),
      conventions: [
        'Day runs sunrise to next sunrise; sunrise/sunset from astronomy-engine SearchRiseSet (upper limb, standard refraction).',
        'Kala Hora: 12 equal day + 12 equal night parts; first hora = weekday lord; Chaldean order.',
        'Choghadiya: 8 equal day + 8 equal night parts; standard weekday tables.',
        'Rahu/Yamaganda/Gulika Kaala: weekday-specific daytime octant.',
        'Abhijit: 8th of 15 equal daytime muhurtas.',
      ],
    };
  }
}
