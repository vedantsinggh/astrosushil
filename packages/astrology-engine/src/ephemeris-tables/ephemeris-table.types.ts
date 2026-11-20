import { LocalDateInput, LocalTimeInput } from '../input/birth-details';

/** Bodies an ephemeris row can contain. The nine Vedic grahas come from the chart calculator;
 * Uranus, Neptune and Pluto (ADR-016 §6, provisional) come from the same ephemeris provider. */
export type EphemerisBody =
  | 'SUN' | 'MOON' | 'MARS' | 'MERCURY' | 'JUPITER' | 'VENUS' | 'SATURN' | 'RAHU' | 'KETU'
  | 'URANUS' | 'NEPTUNE' | 'PLUTO';

export const EPHEMERIS_VEDIC_BODIES: EphemerisBody[] = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];
export const EPHEMERIS_OUTER_BODIES: EphemerisBody[] = ['URANUS', 'NEPTUNE', 'PLUTO'];

export type EphemerisStep = 'DAY' | 'WEEK' | 'MONTH';

/** When in each civil day the row is computed. */
export type EphemerisTimeMode =
  | { kind: 'FIXED_TIME'; time: LocalTimeInput }
  | { kind: 'SUNRISE' };

export interface EphemerisTableRequest {
  /** First and last civil dates (inclusive) in `timezone`. */
  startDate: LocalDateInput;
  endDate: LocalDateInput;
  step: EphemerisStep;
  /** IANA zone of the civil dates and the fixed time ("UTC" for a 0h UT ephemeris). */
  timezone: string;
  timeMode: EphemerisTimeMode;
  /** Needed for SUNRISE rows and for the ascendant (local ephemeris). */
  location?: { latitude: number; longitude: number };
  /** Include Uranus, Neptune and Pluto (provisional, ADR-016 §6). */
  includeOuterPlanets?: boolean;
  /** Include visual magnitude (astronomy-engine `Illumination`) for Sun..Saturn and the outer planets. */
  includeMagnitude?: boolean;
  /** 0-based first row and maximum rows to compute (paging; rows are computed on demand). */
  offset?: number;
  limit?: number;
}

export interface EphemerisBodyEntry {
  body: EphemerisBody;
  /** Zodiacal longitude (sidereal or tropical per the config), degrees [0, 360). */
  longitude: number;
  latitude: number;
  degreeInSign: number;
  rashiIndex: number;
  rashiName: string;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  nakshatraLord: string;
  /** Degrees per day (negative = retrograde). */
  speed: number;
  isRetrograde: boolean;
  distanceAU: number;
  /** Visual magnitude, when requested and defined for the body. */
  magnitude?: number;
}

export interface EphemerisAscendantEntry {
  longitude: number;
  degreeInSign: number;
  rashiIndex: number;
  rashiName: string;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
}

export interface EphemerisRow {
  /** Civil date of the row in the request zone (YYYY-MM-DD). */
  date: string;
  /** Local civil time of the row (HH:mm:ss). */
  localTime: string;
  utcIso: string;
  julianDayUT: number;
  utcOffsetMinutes: number;
  /** Ayanamsa applied (0 for tropical), degrees. */
  ayanamsa: number;
  bodies: EphemerisBodyEntry[];
  ascendant?: EphemerisAscendantEntry;
}

export interface EphemerisTableResult {
  zodiac: 'SIDEREAL' | 'TROPICAL';
  ayanamsaSystem: string | null;
  nodeCalculation: string;
  step: EphemerisStep;
  timeMode: EphemerisTimeMode;
  timezone: string;
  totalRows: number;
  offset: number;
  rows: EphemerisRow[];
  /** Accuracy and convention notes to show with the table. */
  notes: string[];
  /** True when the outer planets are included (provisional per ADR-016 §6). */
  provisional: boolean;
  source: string;
}
