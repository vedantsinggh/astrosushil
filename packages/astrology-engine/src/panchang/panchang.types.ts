import { PlanetSymbol } from '../planets/planet.types';

export type Paksha = 'SUKLA' | 'KRISHNA';

export interface TithiDetails {
  index: number;               // 1 to 30
  name: string;                // e.g. "Pratipada", "Purnima", "Amavasya"
  paksha: Paksha;
  degreeInTithi: number;       // 0 to 12 degrees
  completionPercentage: number;
  startIso?: string;
  endIso?: string;
}

export interface VaraDetails {
  dayIndex: number;            // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  name: string;                // e.g. "Ravivara", "Somavara"
  lord: PlanetSymbol;
}

export interface NakshatraPanchangDetails {
  index: number;               // 1 to 27
  name: string;                // e.g. "Ashwini", "Bharani"
  lord: PlanetSymbol;
  pada: number;                // 1 to 4
  startIso?: string;
  endIso?: string;
}

export interface YogaDetails {
  index: number;               // 1 to 27 (Panchanga Soli-Lunar Yoga)
  name: string;                // e.g. "Vishkambha", "Priti"
  completionPercentage: number;
  startIso?: string;
  endIso?: string;
}

export interface KaranaDetails {
  index: number;               // 1 to 60 (half-tithi)
  name: string;                // e.g. "Bava", "Balava", "Vishti"
  type: 'MOVABLE' | 'FIXED';
  startIso?: string;
  endIso?: string;
}

export interface SunriseSunsetDetails {
  sunriseIso: string;
  sunsetIso: string;
  dayLengthMinutes: number;
}

export interface RahuKalaDetails {
  startIso: string;
  endIso: string;
  segmentIndex: number;        // 1 to 8 (which of the 8 daytime segments)
  totalSegments: number;       // 8
}

export interface HinduCalendarDate {
  amantaMasa: string;          // e.g. "Chaitra", "Vaisakha"
  purnimantaMasa: string;      // e.g. "Vaisakha"
  paksha: Paksha;
  tithiIndex: number;
  tithiName: string;
  solarRashi: string;          // e.g. "Mesha"
  solarRashiIndex: number;     // 1 to 12
  isAdhika: boolean;
}

export type PanchangaTransitionType =
  | 'TITHI_CHANGE'
  | 'NAKSHATRA_CHANGE'
  | 'YOGA_CHANGE'
  | 'KARANA_CHANGE'
  | 'SUNRISE'
  | 'SUNSET'
  | 'RAHU_KALA_START'
  | 'RAHU_KALA_END';

export interface PanchangaTransitionEvent {
  type: PanchangaTransitionType;
  name: string;
  timestampIso: string;
  fromName?: string;
  toName?: string;
}

export interface PanchangOutput {
  tithi: TithiDetails;
  vara: VaraDetails;
  nakshatra: NakshatraPanchangDetails;
  yoga: YogaDetails;
  karana: KaranaDetails;
  sunriseSunset?: SunriseSunsetDetails;
  rahuKala?: RahuKalaDetails;
  hinduCalendar?: HinduCalendarDate;
}

export interface DailyPanchangOutput {
  date: string;                // YYYY-MM-DD
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  instantaneous: PanchangOutput;
  sun: SunriseSunsetDetails;
  rahuKala: RahuKalaDetails;
  hinduCalendar: HinduCalendarDate;
  transitions: PanchangaTransitionEvent[];
}

