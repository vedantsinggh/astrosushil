/**
 * Small, pure helpers shared by the natal stages (S1–S3, S5).
 *
 * Sign arithmetic (whole-sign counting, Parashari, ADR-015) and the name mappings between
 * engine planet symbols ('JUPITER') and registry planet names ('Jupiter'). No tables are
 * duplicated: sign names and rulers come from `@astro/astrology-engine`.
 */
import { RASHIS, getRashiRuler, type PlanetSymbol, type VargaChart, type VargaPlacement } from '@astro/astrology-engine';
import type { FactView } from '../input';
import { PLANET_NAMES, type HouseCategory, type InterpretationRule, type PlanetName, type RuleRef } from '../types';

/** 1-based sign index counted `n` signs from `from` (n = 1 is the same sign). */
export const signFrom = (from: number, n: number): number => ((((from - 1 + n - 1) % 12) + 12) % 12) + 1;

/** Position (1–12) of sign `target` counted from sign `from` (the same sign = 1). */
export const countFrom = (from: number, target: number): number => ((((target - from) % 12) + 12) % 12) + 1;

/** English sign name ('Aries' … 'Pisces') for a 1-based sign index. */
export function signName(rashiIndex: number): string {
  const r = RASHIS[rashiIndex - 1];
  if (!r) throw new RangeError(`sign index must be 1..12, got ${rashiIndex}`);
  return r.englishName;
}

/** 'JUPITER' | 'Jupiter' → 'Jupiter'. Throws for symbols outside the nine grahas. */
export function planetNameOf(symbol: string): PlanetName {
  const s = String(symbol).toLowerCase();
  const found = PLANET_NAMES.find((p) => p.toLowerCase() === s);
  if (!found) throw new RangeError(`unknown planet symbol ${symbol}`);
  return found;
}

/** 'Jupiter' → 'JUPITER' (engine `PlanetSymbol` value). */
export const symbolOf = (name: PlanetName): PlanetSymbol => name.toUpperCase() as PlanetSymbol;

/** Lord (registry name) of a sign. Scorpio → Mars, Aquarius → Saturn (engine `RASHIS.ruler`). */
export const signLordName = (rashiIndex: number): PlanetName => planetNameOf(getRashiRuler(rashiIndex));

/** Registry segment of a planet ('Jupiter' → 'jupiter'). */
export const planetKey = (name: PlanetName): string => name.toLowerCase();

/** Ordering by `PLANET_NAMES` (Sun … Ketu), the registry order. */
export const byPlanetOrder = (a: PlanetName, b: PlanetName): number => PLANET_NAMES.indexOf(a) - PLANET_NAMES.indexOf(b);

/**
 * Whole-sign house categories (definitional; BPHS ch. 11 / Laghu Parashari ch. 1):
 * kendra 1, 4, 7, 10; trikona 1, 5, 9; dusthana 6, 8, 12; upachaya 3, 6, 10, 11.
 * The 2nd house belongs to none of them (empty array).
 */
export function houseCategoriesOf(house: number): HouseCategory[] {
  if (!Number.isInteger(house) || house < 1 || house > 12) throw new RangeError(`house must be 1..12, got ${house}`);
  const out: HouseCategory[] = [];
  if ([1, 4, 7, 10].includes(house)) out.push('kendra');
  if ([1, 5, 9].includes(house)) out.push('trikona');
  if ([6, 8, 12].includes(house)) out.push('dusthana');
  if ([3, 6, 10, 11].includes(house)) out.push('upachaya');
  return out;
}

/**
 * The first candidate fact ID present in the registry, else `preferred`. Stages always emit
 * the canonical ID when no candidate exists, so a missing fact fails closed downstream
 * (`INTERPRETATION_UNKNOWN_FACT`) instead of being silently dropped.
 */
export function pickFact(facts: FactView, preferred: string, ...fallbacks: string[]): string {
  for (const id of [preferred, ...fallbacks]) if (facts.has(id)) return id;
  return preferred;
}

/** Sorted, de-duplicated list of fact IDs (stable output order). */
export const uniqueSorted = (ids: readonly string[]): string[] => [...new Set(ids)].sort();

/** `RuleRef` view of a stage rule (first source is the citation shown on the reference). */
export const ruleRef = (rule: InterpretationRule): RuleRef => ({ ruleId: rule.id, source: rule.sources.join('; '), status: rule.status });

/** A planet's placement in a varga chart (by registry name), if present. */
export function vargaPlacement(chart: VargaChart | undefined, name: PlanetName): VargaPlacement | undefined {
  if (!chart) return undefined;
  const direct = chart.placements[symbolOf(name)] ?? chart.placements[name];
  if (direct) return direct;
  return Object.values(chart.placements).find((p) => String(p.planet).toLowerCase() === name.toLowerCase());
}

/** House of a placement counted from the varga ascendant (whole sign); null without an ascendant. */
export function vargaHouse(chart: VargaChart | undefined, placement: VargaPlacement | undefined): number | null {
  if (!chart || !placement) return null;
  if (typeof placement.house === 'number') return placement.house;
  return chart.ascendant ? countFrom(chart.ascendant.rashiIndex, placement.rashiIndex) : null;
}
