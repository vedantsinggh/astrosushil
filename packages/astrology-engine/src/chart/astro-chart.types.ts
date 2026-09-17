import { BirthDetails, NormalizedBirthTime } from '../input/birth-details';
import { AstrologyConfig } from '../configuration/astrology-config';
import { PlanetSymbol, PlanetPosition } from '../planets/planet.types';
import { CalculatedPoint, HousePlacement } from '../houses/house.types';
import { VargaType, VargaChart } from '../varga/varga.types';
import { DashaTree } from '../dasha/dasha.types';

export const ASTROLOGY_ENGINE_VERSION = '0.1.0';

export interface ChartCalculationMetadata {
  engineVersion: string;
  calculationTimestampIso: string;
  providerName: string;
  providerVersion: string;
  config: AstrologyConfig;
  normalizedTime: NormalizedBirthTime;
}

export interface AstroChart {
  metadata: ChartCalculationMetadata;
  birthDetails: BirthDetails;
  ascendant?: CalculatedPoint;
  planets: Record<PlanetSymbol, PlanetPosition>;
  houses?: HousePlacement[];
  vargas?: Partial<Record<VargaType, VargaChart>>;
  dashas?: DashaTree;
}
