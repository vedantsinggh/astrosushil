import { UnconfirmedMethodologyError } from '../errors/astrology.error';

export const CLIENT_CONFIRMATION_REQUIRED = 'CLIENT_CONFIRMATION_REQUIRED' as const;
export type ClientConfirmationRequired = typeof CLIENT_CONFIRMATION_REQUIRED;

export type ZodiacType = 'SIDEREAL' | 'TROPICAL' | ClientConfirmationRequired;
export type AyanamsaSystem =
  | 'LAHIRI'
  | 'RAMAN'
  | 'KRISHNAMURTI'
  | 'KP'
  | ClientConfirmationRequired;
export type HouseSystem =
  | 'WHOLE_SIGN'
  | 'EQUAL'
  | 'PLACIDUS'
  | 'SRI_PATI'
  | ClientConfirmationRequired;
export type NodeCalculationMethod = 'MEAN_NODE' | 'TRUE_NODE' | ClientConfirmationRequired;
export type PlanetaryCalculationMode = 'GEOCENTRIC' | 'TOPOCENTRIC' | ClientConfirmationRequired;
export type RoundingRule = 'NEAREST' | 'TRUNCATE' | 'NONE';
export type DashaSystem = 'VIMSHOTTARI' | ClientConfirmationRequired;

export interface AstrologyConfig {
  zodiacType: ZodiacType;
  ayanamsa: AyanamsaSystem;
  houseSystem: HouseSystem;
  nodeCalculation: NodeCalculationMethod;
  planetaryCalculationMode: PlanetaryCalculationMode;
  precisionDegrees: number;
  roundingRule: RoundingRule;
  dashaSystem: DashaSystem;
}

/**
 * Creates an initial default configuration with explicit CLIENT_CONFIRMATION_REQUIRED flags.
 */
export function createUnconfirmedAstrologyConfig(): AstrologyConfig {
  return {
    zodiacType: CLIENT_CONFIRMATION_REQUIRED,
    ayanamsa: CLIENT_CONFIRMATION_REQUIRED,
    houseSystem: CLIENT_CONFIRMATION_REQUIRED,
    nodeCalculation: CLIENT_CONFIRMATION_REQUIRED,
    planetaryCalculationMode: CLIENT_CONFIRMATION_REQUIRED,
    precisionDegrees: 0.0001,
    roundingRule: 'NEAREST',
    dashaSystem: CLIENT_CONFIRMATION_REQUIRED,
  };
}

/**
 * Ensures that a required methodology configuration setting is explicitly confirmed.
 * Throws UnconfirmedMethodologyError if value is CLIENT_CONFIRMATION_REQUIRED.
 */
export function validateRequiredMethodology<T>(
  value: T | ClientConfirmationRequired,
  methodologyName: string
): T {
  if (value === CLIENT_CONFIRMATION_REQUIRED) {
    throw new UnconfirmedMethodologyError(methodologyName);
  }
  return value as T;
}
