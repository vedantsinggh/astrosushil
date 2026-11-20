import {
  calculateTajikaAnnualContext,
  calculateTajikaPanchaVargiyaBala,
  calculateTithiPravesha,
  evaluateTajikaSixteenYogas,
  normalizeAstroChart,
  TajikaNeutralScoring,
  TajikaOrbRule,
  TajikaYogaOptions,
} from '@astro/astrology-engine';
import { ACTIVE_CONFIG, Handler, chartCalc, chartFor, intParam, isRecord } from '../common';
import { parseBirthInput, parseLocation, toBirthDetails } from '../birth';
import { BirthInput, LocationInput, ProtocolError } from '../protocol';

/** Feature handlers: tajika. Method names are listed in docs/sidecar-protocol.md. Parsing and shaping only. */

const ORB_RULES: readonly TajikaOrbRule[] = ['MUTUAL', 'HALF_SUM'];
const NEUTRAL_SCORINGS: readonly TajikaNeutralScoring[] = ['AS_ENEMY', 'AS_FRIEND'];

function targetYearOf(p: Record<string, unknown>, birth: BirthInput): number {
  const y = intParam(p.targetYear, 'targetYear', 1800, 2200);
  if (y < Number(birth.date.slice(0, 4))) throw new ProtocolError('INVALID_PARAMS', 'targetYear must not precede the birth year');
  return y;
}

function locationOf(p: Record<string, unknown>): LocationInput | undefined {
  return p.location === undefined ? undefined : parseLocation(p.location);
}

function boolOpt(v: unknown, field: string): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'boolean') throw new ProtocolError('INVALID_PARAMS', `${field} must be a boolean`);
  return v;
}

function enumOpt<T extends string>(v: unknown, field: string, allowed: readonly T[]): T | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new ProtocolError('INVALID_PARAMS', `${field} must be one of ${allowed.join(', ')}`);
  }
  return v as T;
}

function yogaOptionsOf(v: unknown): TajikaYogaOptions {
  if (v === undefined) return {};
  if (!isRecord(v)) throw new ProtocolError('INVALID_PARAMS', 'options must be an object');
  return {
    orbRule: enumOpt(v.orbRule, 'options.orbRule', ORB_RULES),
    includeSemiSextile: boolOpt(v.includeSemiSextile, 'options.includeSemiSextile'),
    manahooByAspect: boolOpt(v.manahooByAspect, 'options.manahooByAspect'),
  };
}

export const handlers: Record<string, Handler> = {
  /** The 16 Tajika yogas of the Varshaphala annual chart. */
  'tajika.yogas': async (p) => {
    const birth = parseBirthInput(p.birth);
    const targetYear = targetYearOf(p, birth);
    const options = yogaOptionsOf(p.options);
    const annual = await calculateTajikaAnnualContext(toBirthDetails(birth), targetYear, locationOf(p), ACTIVE_CONFIG, chartCalc);
    return {
      targetYear,
      solarReturnUtcIso: annual.solarReturnUtcIso,
      solarReturnLocalIso: annual.solarReturnLocalIso,
      ...evaluateTajikaSixteenYogas(annual.annualChart, options),
    };
  },

  /** Pancha-vargiya Bala of the annual chart (targetYear given) or of the natal chart (no targetYear). */
  'tajika.panchaVargiya': async (p) => {
    const birth = parseBirthInput(p.birth);
    const neutralScoring = enumOpt(p.neutralScoring, 'neutralScoring', NEUTRAL_SCORINGS);
    if (p.targetYear === undefined) {
      if (p.location !== undefined) throw new ProtocolError('INVALID_PARAMS', 'location needs targetYear');
      return { chartKind: 'NATAL', ...calculateTajikaPanchaVargiyaBala(await chartFor(birth), { neutralScoring }) };
    }
    const targetYear = targetYearOf(p, birth);
    const annual = await calculateTajikaAnnualContext(toBirthDetails(birth), targetYear, locationOf(p), ACTIVE_CONFIG, chartCalc);
    return {
      chartKind: 'ANNUAL',
      targetYear,
      solarReturnUtcIso: annual.solarReturnUtcIso,
      solarReturnLocalIso: annual.solarReturnLocalIso,
      ...calculateTajikaPanchaVargiyaBala(annual.annualChart, { neutralScoring }),
    };
  },

  /** Tithi Pravesha moment and chart (birth place unless location given). */
  'tajika.tithiPravesha': async (p) => {
    const birth = parseBirthInput(p.birth);
    const targetYear = targetYearOf(p, birth);
    const { chart, ...rest } = await calculateTithiPravesha(toBirthDetails(birth), targetYear, locationOf(p), ACTIVE_CONFIG, chartCalc);
    return { ...rest, rasi: normalizeAstroChart(chart) };
  },
};
