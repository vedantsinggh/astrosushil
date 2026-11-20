/**
 * Deterministic sign-occupancy periods for slow planets, computed with the
 * engine's TransitIngressSolver (same ayanamsa as natal charts). Retrograde
 * re-entries appear as separate periods, exactly as the solver reports them.
 */
import { PlanetSymbol, TransitIngressSolver } from '@astro/astrology-engine';

export interface SignPeriod {
  planet: string;
  /** English sign name. */
  sign: string;
  signIndex: number;
  startIso: string;
  endIso: string;
  /** True when the period began with the planet moving backwards into the sign. */
  enteredRetrograde: boolean;
}

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const msToJd = (ms: number) => ms / 86400000 + 2440587.5;

export async function computeSignPeriods(
  planet: PlanetSymbol,
  from: Date,
  years: number,
  solver = new TransitIngressSolver()
): Promise<SignPeriod[]> {
  const startJd = msToJd(from.getTime());
  const endJd = startJd + years * 365.25;
  const initial = await solver.getPlanetaryState(planet, startJd);
  const events = await solver.findSignIngresses(planet, startJd, endJd);
  const periods: SignPeriod[] = [];
  let curSign = initial.rashiIndex;
  let curStart = from.toISOString();
  let curRetro = false;
  for (const ev of events) {
    periods.push({
      planet: String(planet), sign: SIGNS[curSign - 1], signIndex: curSign,
      startIso: curStart, endIso: ev.timestampIso, enteredRetrograde: curRetro,
    });
    const to = ev.toSign!.index;
    curRetro = (to === curSign - 1) || (curSign === 1 && to === 12);
    curSign = to;
    curStart = ev.timestampIso;
  }
  periods.push({
    planet: String(planet), sign: SIGNS[curSign - 1], signIndex: curSign,
    startIso: curStart, endIso: new Date((endJd - 2440587.5) * 86400000).toISOString(), enteredRetrograde: curRetro,
  });
  return periods;
}
