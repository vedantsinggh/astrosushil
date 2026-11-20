/**
 * Lifetime Sade Sati cycles from real Saturn sign periods.
 *
 * Classical rule: Sade Sati is the span during which transiting Saturn occupies
 * the 12th, 1st and 2nd signs counted from the natal Moon sign. Phases:
 *   1st (rising)  — Saturn in the 12th from the Moon
 *   2nd (peak)    — Saturn over the natal Moon sign
 *   3rd (setting) — Saturn in the 2nd from the Moon
 * Saturn sign periods come from the engine's TransitIngressSolver (via
 * platform/snapshot/transit-periods.ts), so retrograde re-entries are real.
 * A cycle runs from Saturn's first entry into the 12th from the Moon to its
 * final exit from the 2nd; stretches separated by a short retrograde step-back
 * (under 3 years) are merged into one cycle. Decision KUN-006.
 */
import { SignPeriod } from '../../../snapshot/transit-periods';

export type SadeSatiPhaseName = 'rising' | 'peak' | 'setting';

export interface SadeSatiPhaseSpan {
  phase: SadeSatiPhaseName;
  sign: string;
  startIso: string;
  endIso: string;
}

export interface SadeSatiCycle {
  index: number;
  startIso: string;
  endIso: string;
  phases: SadeSatiPhaseSpan[];
  /** True if the cycle was already running at the start of the horizon (birth). */
  runningAtBirth: boolean;
}

const MERGE_GAP_MS = 3 * 365.25 * 86400000;

export function phaseOf(saturnSign: number, moonSign: number): SadeSatiPhaseName | null {
  const d = ((saturnSign - moonSign + 12) % 12) + 1;
  if (d === 12) return 'rising';
  if (d === 1) return 'peak';
  if (d === 2) return 'setting';
  return null;
}

export function computeSadeSatiCycles(saturnPeriods: SignPeriod[], moonSign: number): SadeSatiCycle[] {
  const groups: SignPeriod[][] = [];
  let current: SignPeriod[] = [];
  for (const p of saturnPeriods) {
    if (phaseOf(p.signIndex, moonSign)) {
      current.push(p);
    } else if (current.length) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);

  // Merge groups split by a brief retrograde step back out of the band.
  const merged: SignPeriod[][] = [];
  for (const g of groups) {
    const last = merged[merged.length - 1];
    if (last && Date.parse(g[0].startIso) - Date.parse(last[last.length - 1].endIso) < MERGE_GAP_MS) last.push(...g);
    else merged.push([...g]);
  }

  const horizonStart = saturnPeriods.length ? saturnPeriods[0].startIso : '';
  return merged.map((g, i) => {
    // Collapse consecutive periods of the same phase into one span (first entry to last exit).
    const phases: SadeSatiPhaseSpan[] = [];
    for (const p of g) {
      const phase = phaseOf(p.signIndex, moonSign)!;
      const existing = phases.find((x) => x.phase === phase);
      if (existing) existing.endIso = p.endIso;
      else phases.push({ phase, sign: p.sign, startIso: p.startIso, endIso: p.endIso });
    }
    const order: SadeSatiPhaseName[] = ['rising', 'peak', 'setting'];
    phases.sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase));
    return {
      index: i + 1,
      startIso: g[0].startIso,
      endIso: g[g.length - 1].endIso,
      phases,
      runningAtBirth: g[0].startIso === horizonStart,
    };
  });
}

/** Status at a date: the active cycle and phase, else the next cycle. */
export function sadeSatiStatusAt(cycles: SadeSatiCycle[], saturnPeriods: SignPeriod[], moonSign: number, atIso: string) {
  const t = Date.parse(atIso);
  const active = cycles.find((c) => Date.parse(c.startIso) <= t && t < Date.parse(c.endIso));
  const now = saturnPeriods.find((p) => Date.parse(p.startIso) <= t && t < Date.parse(p.endIso));
  const phase = active && now ? phaseOf(now.signIndex, moonSign) : null;
  const next = cycles.find((c) => Date.parse(c.startIso) > t);
  return { active, phase, next };
}
