/**
 * Lifetime Sade Sati cycles (FP-003).
 *
 * Classical definition: Sade Sati is the period in which transiting Saturn
 * occupies the 12th, 1st and 2nd signs from the natal Moon sign (rising, peak,
 * setting phases). Saturn's sign periods come from the engine's
 * TransitIngressSolver (via computeSignPeriods), so retrograde re-entries are
 * included. Periods in the three signs that follow each other without a break
 * longer than `maxGapDays` (a brief retrograde step back) form one cycle; each
 * phase runs from Saturn's first entry into that sign within the cycle to its
 * final exit.
 */
import { PlanetSymbol } from '@astro/astrology-engine';
import { computeSignPeriods, SignPeriod } from '../../../snapshot/transit-periods';

export type SadeSatiPhaseName = 'rising' | 'peak' | 'setting';

export interface SadeSatiPhase {
  phase: SadeSatiPhaseName;
  sign: string;
  signIndex: number;
  startIso: string;
  endIso: string;
}

export interface SadeSatiCycle {
  index: number;
  startIso: string;
  endIso: string;
  /** The cycle was already running at birth (its start is clipped to the birth moment). */
  inProgressAtBirth: boolean;
  /** The cycle runs past the computed horizon. */
  openEnded: boolean;
  phases: SadeSatiPhase[];
}

export interface SadeSatiResult {
  moonSign: string;
  moonSignIndex: number;
  cycles: SadeSatiCycle[];
  /** Status on the report date. */
  current: { active: boolean; phase?: SadeSatiPhaseName; cycleIndex?: number; nextCycleIndex?: number };
  horizonYears: number;
}

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export function phaseOf(moonSignIndex: number, saturnSignIndex: number): SadeSatiPhaseName | undefined {
  const rel = ((saturnSignIndex - moonSignIndex + 12) % 12) + 1; // 1 = same sign
  return rel === 12 ? 'rising' : rel === 1 ? 'peak' : rel === 2 ? 'setting' : undefined;
}

/** Pure grouping step (unit-tested with synthetic periods). */
export function groupSadeSati(periods: SignPeriod[], moonSignIndex: number, birthIso: string, horizonEndIso: string, asOfIso: string, maxGapDays = 400): SadeSatiResult {
  const relevant = periods.filter((p) => phaseOf(moonSignIndex, p.signIndex));
  const groups: SignPeriod[][] = [];
  for (const p of relevant) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    if (prev && (Date.parse(p.startIso) - Date.parse(prev.endIso)) / 86400000 <= maxGapDays) last.push(p);
    else groups.push([p]);
  }
  const order: SadeSatiPhaseName[] = ['rising', 'peak', 'setting'];
  const cycles: SadeSatiCycle[] = groups.map((g, i) => {
    const phases: SadeSatiPhase[] = [];
    for (const ph of order) {
      const inPhase = g.filter((p) => phaseOf(moonSignIndex, p.signIndex) === ph);
      if (!inPhase.length) continue;
      phases.push({
        phase: ph, sign: inPhase[0].sign, signIndex: inPhase[0].signIndex,
        startIso: inPhase[0].startIso, endIso: inPhase[inPhase.length - 1].endIso,
      });
    }
    return {
      index: i + 1,
      startIso: g[0].startIso,
      endIso: g[g.length - 1].endIso,
      inProgressAtBirth: g[0].startIso === birthIso,
      openEnded: g[g.length - 1].endIso === horizonEndIso,
      phases,
    };
  });
  const t = Date.parse(asOfIso);
  const now = relevant.find((p) => Date.parse(p.startIso) <= t && t < Date.parse(p.endIso));
  const cycleNow = cycles.find((c) => Date.parse(c.startIso) <= t && t < Date.parse(c.endIso));
  const next = cycles.find((c) => Date.parse(c.startIso) > t);
  return {
    moonSign: SIGNS[moonSignIndex - 1],
    moonSignIndex,
    cycles,
    current: {
      active: Boolean(cycleNow),
      phase: cycleNow ? (now ? phaseOf(moonSignIndex, now.signIndex) : undefined) : undefined,
      cycleIndex: cycleNow?.index,
      nextCycleIndex: next?.index,
    },
    horizonYears: 0,
  };
}

export async function computeSadeSati(birthUtcIso: string, moonSignIndex: number, asOfIso: string, years = 100): Promise<SadeSatiResult> {
  const from = new Date(birthUtcIso);
  const periods = await computeSignPeriods(PlanetSymbol.SATURN, from, years);
  const res = groupSadeSati(periods, moonSignIndex, from.toISOString(), periods[periods.length - 1].endIso, asOfIso);
  res.horizonYears = years;
  return res;
}
