import { BirthDetails, NormalizedBirthTime } from '../input/birth-details';
import { AstrologyConfig } from '../configuration/astrology-config';
import { PlanetSymbol, PlanetPosition } from '../planets/planet.types';
import { CalculatedPoint, HousePlacement } from '../houses/house.types';
import { VargaType, VargaChart } from '../varga/varga.types';
import { DashaTree } from '../dasha/dasha.types';

/**
 * Engine calculation version. 0.2.0 (2026-11-20, ADR-017): true Chitrapaksha Lahiri ayanamsa,
 * selectable ayanamsa / node, true Placidus KP cusps, real-MC Sripati bhava chalit. Outputs differ
 * from 0.1.0 (linear Lahiri approximation), so anything keyed on this version is recomputed.
 */
export const ASTROLOGY_ENGINE_VERSION = '0.2.0';

/** Ayanamsa actually applied to a chart (null for tropical charts). */
export interface ChartAyanamsaMetadata {
  system: string;
  label: string;
  /** Subtracted from apparent planetary longitudes (true equinox of date). */
  trueDegrees: number;
  /** Subtracted from mean-equinox quantities (ascendant, MC, house cusps, lunar nodes). */
  meanDegrees: number;
}

export interface ChartCalculationMetadata {
  engineVersion: string;
  calculationTimestampIso: string;
  providerName: string;
  providerVersion: string;
  config: AstrologyConfig;
  normalizedTime: NormalizedBirthTime;
  /** Present on charts from engine 0.2.0. */
  ayanamsa?: ChartAyanamsaMetadata | null;
  /** Lunar node method applied (engine 0.2.0). */
  nodeType?: 'MEAN_NODE' | 'TRUE_NODE';
}

export interface AstroChart {
  metadata: ChartCalculationMetadata;
  birthDetails: BirthDetails;
  ascendant?: CalculatedPoint;
  /** Sidereal (or tropical) MC, engine 0.2.0. */
  midheaven?: CalculatedPoint;
  planets: Record<PlanetSymbol, PlanetPosition>;
  houses?: HousePlacement[];
  vargas?: Partial<Record<VargaType, VargaChart>>;
  dashas?: DashaTree;
}
