import { PlanetSymbol } from '../planets/planet.types';

export type Paksha = 'SUKLA' | 'KRISHNA';

export interface TithiDetails {
  index: number;               // 1 to 30
  name: string;                // e.g. "Pratipada", "Purnima", "Amavasya"
  paksha: Paksha;
  degreeInTithi: number;       // 0 to 12 degrees
  completionPercentage: number;
}

export interface VaraDetails {
  dayIndex: number;            // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  name: string;                // e.g. "Ravivara", "Somavara"
  lord: PlanetSymbol;
}

export interface YogaDetails {
  index: number;               // 1 to 27
  name: string;                // e.g. "Vishkambha", "Preeti"
  completionPercentage: number;
}

export interface KaranaDetails {
  index: number;               // 1 to 60 (half-tithi)
  name: string;                // e.g. "Bava", "Balava", "Vishti"
  type: 'MOVABLE' | 'FIXED';
}

export interface PanchangOutput {
  tithi: TithiDetails;
  vara: VaraDetails;
  nakshatra: {
    index: number;
    name: string;
    lord: PlanetSymbol;
    pada: number;
  };
  yoga: YogaDetails;
  karana: KaranaDetails;
}
