import { ChartCalculator } from '../chart/chart-calculator';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { BirthDetails } from '../input/birth-details';
import { VarshaphalaCalculator } from '../varshaphala/varshaphala-calculator';
import { calculateTajikaPanchaVargiyaBala } from './pancha-vargiya-bala';
import { evaluateTajikaSixteenYogas } from './tajika-sixteen-yogas';
import {
  TajikaAnnualContext,
  TajikaAnnualLocation,
  TajikaNeutralScoring,
  TajikaPanchaVargiyaResult,
  TajikaSixteenYogasResult,
  TajikaYogaOptions,
} from './tajika-extended.types';

/** Varshaphala annual chart (solar return at the annual location) from the engine's VarshaphalaCalculator. */
export async function calculateTajikaAnnualContext(
  birth: BirthDetails,
  targetYear: number,
  location?: TajikaAnnualLocation,
  config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG,
  chartCalculator: ChartCalculator = new ChartCalculator(),
): Promise<TajikaAnnualContext> {
  const v = await new VarshaphalaCalculator(chartCalculator).calculateVarshaphala(birth, { targetYear, annualLocation: location }, config);
  return {
    targetYear,
    solarReturnUtcIso: v.solarReturn.solarReturnUtcIso,
    solarReturnLocalIso: v.solarReturn.solarReturnLocalIso,
    annualChart: v.annualChart,
  };
}

/** The 16 Tajika yogas of the Varshaphala annual chart. */
export async function calculateTajikaAnnualYogas(
  birth: BirthDetails,
  targetYear: number,
  location?: TajikaAnnualLocation,
  config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG,
  options: TajikaYogaOptions = {},
): Promise<{ annual: TajikaAnnualContext; yogas: TajikaSixteenYogasResult }> {
  const annual = await calculateTajikaAnnualContext(birth, targetYear, location, config);
  return { annual, yogas: evaluateTajikaSixteenYogas(annual.annualChart, options) };
}

/** Pancha-vargiya Bala of the Varshaphala annual chart (the figure used for Varshesha selection). */
export async function calculateTajikaAnnualPanchaVargiya(
  birth: BirthDetails,
  targetYear: number,
  location?: TajikaAnnualLocation,
  config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG,
  neutralScoring?: TajikaNeutralScoring,
): Promise<{ annual: TajikaAnnualContext; bala: TajikaPanchaVargiyaResult }> {
  const annual = await calculateTajikaAnnualContext(birth, targetYear, location, config);
  return { annual, bala: calculateTajikaPanchaVargiyaBala(annual.annualChart, { neutralScoring }) };
}
