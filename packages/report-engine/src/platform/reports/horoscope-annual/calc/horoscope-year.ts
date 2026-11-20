/**
 * Deterministic data for the Personalised (annual) Horoscope.
 *
 * Period: the 12 months starting on the 1st of the report month (decision HOR-001),
 * split into three 4-month windows. Transits come from the engine's
 * TransitIngressSolver; houses are counted from both the natal Moon sign and
 * the natal Ascendant (the reference used the Moon sign only).
 */
import { PlanetName } from '../../../evidence/evidence-registry';
import { ChartSnapshot } from '../../../snapshot/chart-snapshot';
import { AvakahadaFacts, computeAvakahada } from '../../_annual-shared/avakahada';
import { digitReduce, SIGN_LORD, SignName, SLOW_PLANETS } from '../../_annual-shared/astro';
import { AnnualTransitPeriod, AnnualTransits, computeAnnualTransits, natalAnchors, periodsBetween } from '../../_annual-shared/transits';

/** Life areas and their classical houses (BPHS bhava significations). */
export const HORO_AREAS = [
  { key: 'career', label: 'Career', houses: [6, 10, 11] },
  { key: 'finance', label: 'Finance', houses: [2, 11] },
  { key: 'education', label: 'Education', houses: [4, 5, 9] },
  { key: 'love', label: 'Love and relationships', houses: [5, 7] },
  { key: 'family', label: 'Family and home', houses: [2, 4] },
  { key: 'health', label: 'Health', houses: [1, 6, 8] },
] as const;
export type HoroAreaKey = (typeof HORO_AREAS)[number]['key'];

export interface HoroWindow {
  index: number; // 1..3
  startIso: string;
  endIso: string;
  label: string;
}

export interface AreaFactor {
  planet: PlanetName;
  from: 'Moon' | 'Ascendant';
  house: number;
  period: AnnualTransitPeriod;
}

export interface HoroscopeYearData {
  startIso: string;
  endIso: string;
  windows: HoroWindow[];
  transits: AnnualTransits;
  /** areaFactors[area][windowIndex-1] = slow-planet transits over that area's houses. */
  areaFactors: Record<HoroAreaKey, AreaFactor[][]>;
  avakahada: AvakahadaFacts;
  moonSignLord: PlanetName;
  lagnaLord: PlanetName;
  numerology: Array<{ year: number; universal: number; personal: number }>;
}

const MONTH = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function horoscopeWindows(asOfIso: string): HoroWindow[] {
  const a = new Date(asOfIso);
  const y = a.getUTCFullYear();
  const m = a.getUTCMonth();
  return [0, 1, 2].map((k) => {
    const s = new Date(Date.UTC(y, m + 4 * k, 1));
    const e = new Date(Date.UTC(y, m + 4 * (k + 1), 1));
    const last = new Date(Date.UTC(y, m + 4 * (k + 1) - 1, 1));
    return { index: k + 1, startIso: s.toISOString(), endIso: e.toISOString(), label: `${MONTH(s)} – ${MONTH(last)}` };
  });
}

/** Personal year (standard numerology): digit sum of birth day + birth month + calendar year. */
export function personalYear(dateOfBirth: string, year: number): number {
  const [, mm, dd] = dateOfBirth.split('-').map(Number);
  return digitReduce(digitReduce(dd) + digitReduce(mm) + digitReduce(year));
}

export function areaFactorsFor(transits: AnnualTransits, w: HoroWindow, houses: readonly number[]): AreaFactor[] {
  const out: AreaFactor[] = [];
  for (const planet of SLOW_PLANETS) {
    for (const p of periodsBetween(transits[planet], w.startIso, w.endIso)) {
      if (houses.includes(p.houseFromMoon)) out.push({ planet, from: 'Moon', house: p.houseFromMoon, period: p });
      if (houses.includes(p.houseFromLagna)) out.push({ planet, from: 'Ascendant', house: p.houseFromLagna, period: p });
    }
  }
  return out;
}

export async function computeHoroscopeYear(snapshot: ChartSnapshot): Promise<HoroscopeYearData> {
  const windows = horoscopeWindows(snapshot.asOfIso);
  const startIso = windows[0].startIso;
  const endIso = windows[2].endIso;
  const anchors = natalAnchors(snapshot);
  const transits = await computeAnnualTransits(anchors, startIso, endIso);
  const areaFactors = {} as HoroscopeYearData['areaFactors'];
  for (const a of HORO_AREAS) areaFactors[a.key] = windows.map((w) => areaFactorsFor(transits, w, a.houses));
  const avakahada = computeAvakahada(snapshot);
  const years = [...new Set([new Date(startIso).getUTCFullYear(), new Date(Date.parse(endIso) - 1).getUTCFullYear()])];
  return {
    startIso, endIso, windows, transits, areaFactors, avakahada,
    moonSignLord: SIGN_LORD[avakahada.moonSign as SignName],
    lagnaLord: SIGN_LORD[avakahada.lagnaSign as SignName],
    numerology: years.map((y) => ({ year: y, universal: digitReduce(y), personal: personalYear(snapshot.subject.dateOfBirth, y) })),
  };
}
