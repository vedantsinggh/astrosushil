import { PlanetSymbol } from '../planets/planet.types';

/**
 * Types for sunrise-based day divisions (Kala Hora, Choghadiya, Rahu/Yamaganda/Gulika Kaala,
 * Abhijit Muhurta). All instants are UTC ISO strings; presentation layers format them locally.
 */

export interface LocalCivilDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export interface DayDivisionInput {
  date: LocalCivilDate;
  timezone: string; // IANA timezone
  latitude: number;
  longitude: number;
}

export interface SolarDayBounds {
  sunriseIso: string;
  sunsetIso: string;
  nextSunriseIso: string;
  dayLengthMinutes: number;
  nightLengthMinutes: number;
  /** Weekday of the local civil date (0 = Sunday ... 6 = Saturday). The Vedic day starts at sunrise. */
  weekdayIndex: number;
  weekdayLord: PlanetSymbol;
}

export interface HoraPeriod {
  index: number; // 1-24 (1-12 day horas, 13-24 night horas)
  isDay: boolean;
  lord: PlanetSymbol;
  startIso: string;
  endIso: string;
}

export type ChoghadiyaName = 'UDVEG' | 'CHAR' | 'LABH' | 'AMRIT' | 'KAAL' | 'SHUBH' | 'ROG';
export type ChoghadiyaQuality = 'AUSPICIOUS' | 'NEUTRAL' | 'INAUSPICIOUS';

export interface ChoghadiyaPeriod {
  index: number; // 1-16 (1-8 day, 9-16 night)
  isDay: boolean;
  name: ChoghadiyaName;
  lord: PlanetSymbol;
  quality: ChoghadiyaQuality;
  startIso: string;
  endIso: string;
}

export interface TimeWindow {
  name: string;
  startIso: string;
  endIso: string;
  /** For octant-based kaalas, the 1-based day octant used. */
  segmentIndex?: number;
}

export interface DayDivisionsReport {
  input: DayDivisionInput;
  bounds: SolarDayBounds;
  horas: HoraPeriod[];
  choghadiya: ChoghadiyaPeriod[];
  rahuKaala: TimeWindow;
  yamagandaKaala: TimeWindow;
  gulikaKaala: TimeWindow;
  abhijitMuhurta: TimeWindow;
  conventions: string[];
}
