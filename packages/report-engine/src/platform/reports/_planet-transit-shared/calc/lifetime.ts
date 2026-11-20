/**
 * Lifetime-scale Saturn calculations (birth − 10 years to birth + 100 years)
 * and planetary "returns" to the natal sign, all from solved ingresses.
 */
import { PlanetSymbol, TransitIngressSolver } from '@astro/astrology-engine';
import { ChartSnapshot } from '../../../snapshot/chart-snapshot';
import { PLANET_SYMBOL, PlanetKey } from './planet-transit';
import {
  computeKantakDhaiya,
  computeSadeSatiCycles,
  PhaseStatus,
  SadeSatiCycle,
  sadeSatiStatus,
  SaturnMoonPeriod,
} from './sade-sati';
import { computeSignSpans, groupStays, SignStay, yearsBetween, YEAR_MS } from './timeline';

export interface SaturnLifetime {
  birthIso: string;
  moonSign: number;
  lagnaSign: number;
  cycles: SadeSatiCycle[];
  status: PhaseStatus;
  kantak: SaturnMoonPeriod[];
  /** Index into `cycles` of the next cycle that starts after the report date (if any). */
  nextCycle?: number;
}

export function birthIso(snapshot: ChartSnapshot): string {
  return snapshot.natal.calculation.normalizedTime.utcIsoString;
}

export async function computeSaturnLifetime(snapshot: ChartSnapshot, solver = new TransitIngressSolver(), maxAge = 90): Promise<SaturnLifetime> {
  const b = birthIso(snapshot);
  const from = new Date(Date.parse(b) - 10 * YEAR_MS);
  const to = new Date(Date.parse(b) + (maxAge + 10) * YEAR_MS);
  const spans = await computeSignSpans(PlanetSymbol.SATURN, from, to, solver);
  const stays = groupStays(spans);
  const moonSign = snapshot.natal.planets.find((p) => p.name === PlanetSymbol.MOON)!.rashiIndex;
  const lagnaSign = snapshot.natal.ascendant.rashiIndex;
  const cycles = computeSadeSatiCycles(stays, moonSign, b, maxAge);
  const status = sadeSatiStatus(cycles, spans, moonSign, snapshot.asOfIso);
  const kantak = computeKantakDhaiya(stays, moonSign, lagnaSign, b, maxAge);
  const t = Date.parse(snapshot.asOfIso);
  const next = cycles.findIndex((c) => Date.parse(c.startIso) > t);
  return { birthIso: b, moonSign, lagnaSign, cycles, status, kantak, nextCycle: next >= 0 ? next : undefined };
}

export interface PlanetReturn {
  n: number;
  sign: string;
  startIso: string;
  endIso: string;
  age: number;
  stay: SignStay;
}

/**
 * Returns of a planet to its natal sign between birth and birth + maxAge
 * (the birth stay itself excluded). Saturn ≈ 29.5 y, Jupiter ≈ 12 y, nodes ≈ 18.6 y.
 */
export async function computeReturns(snapshot: ChartSnapshot, key: PlanetKey, solver = new TransitIngressSolver(), maxAge = 90): Promise<PlanetReturn[]> {
  const b = birthIso(snapshot);
  const sym = PLANET_SYMBOL[key];
  const natalSign = snapshot.natal.planets.find((p) => p.name === sym)!.rashiIndex;
  const spans = await computeSignSpans(sym, new Date(b), new Date(Date.parse(b) + (maxAge + 3) * YEAR_MS), solver);
  const stays = groupStays(spans).filter((s) => s.signIndex === natalSign && !s.spans[0].startClipped && !s.spans[s.spans.length - 1].endClipped);
  return stays
    .filter((s) => yearsBetween(b, s.firstStartIso) <= maxAge)
    .map((s, i) => ({ n: i + 1, sign: s.sign, startIso: s.firstStartIso, endIso: s.lastEndIso, age: yearsBetween(b, s.firstStartIso), stay: s }));
}
