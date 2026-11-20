import { UnconfirmedMethodologyError } from '../errors/astrology.error';

export const CLIENT_CONFIRMATION_REQUIRED = 'CLIENT_CONFIRMATION_REQUIRED' as const;
export type ClientConfirmationRequired = typeof CLIENT_CONFIRMATION_REQUIRED;

export type ZodiacType = 'SIDEREAL' | 'TROPICAL' | ClientConfirmationRequired;
/**
 * Ayanamsa systems (definitions and sources: src/ayanamsa/ayanamsa.ts, docs/decisions.md ADR-017).
 * LAHIRI = true Chitrapaksha (ICRC) and is the default; KP = KP New (zero 291 CE);
 * KRISHNAMURTI = K.S. Krishnamurti's Reader table.
 */
export type AyanamsaSystem =
  | 'LAHIRI'
  | 'RAMAN'
  | 'KRISHNAMURTI'
  | 'KP'
  | 'FAGAN_BRADLEY'
  | ClientConfirmationRequired;
export type HouseSystem =
  | 'WHOLE_SIGN'
  | 'EQUAL'
  | 'PLACIDUS'
  | 'SRI_PATI'
  | ClientConfirmationRequired;
/** MEAN_NODE (default, Meeus eq. 47.7) or TRUE_NODE (osculating node): src/rahu-ketu/lunar-nodes.ts. */
export type NodeCalculationMethod = 'MEAN_NODE' | 'TRUE_NODE' | ClientConfirmationRequired;
/** House system used for KP cusps (client decision ADR-017: true Placidus). */
export type KpCuspSystem = 'PLACIDUS';
export const KP_CUSP_SYSTEM: KpCuspSystem = 'PLACIDUS';
export type PlanetaryCalculationMode = 'GEOCENTRIC' | 'TOPOCENTRIC' | ClientConfirmationRequired;
export type RoundingRule = 'NEAREST' | 'TRUNCATE' | 'NONE';
export type DashaSystem =
  | 'VIMSHOTTARI'
  | 'ASHTOTTARI'
  | 'STHIRA'
  | 'SHOOLA'
  | 'DWISAPTATI_SAMA'
  | 'SHATABDIKA'
  | 'CHATURASEETI_SAMA'
  | 'DWADASHOTTARI'
  | 'PANCHOTTARI'
  | 'YOGINI'
  | 'CHARA'
  | 'NARAYANA'
  | 'KALACHAKRA'
  | ClientConfirmationRequired;

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

export const DEFAULT_ASTROLOGY_CONFIG: AstrologyConfig = {
  zodiacType: 'SIDEREAL',
  ayanamsa: 'LAHIRI',
  houseSystem: 'WHOLE_SIGN',
  nodeCalculation: 'MEAN_NODE',
  planetaryCalculationMode: 'GEOCENTRIC',
  precisionDegrees: 0.0001,
  roundingRule: 'NEAREST',
  dashaSystem: 'VIMSHOTTARI',
};

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
