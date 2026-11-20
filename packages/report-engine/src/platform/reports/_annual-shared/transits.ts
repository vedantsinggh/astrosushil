/**
 * Transit sign periods for an annual window, for every transiting graha,
 * computed with the engine's TransitIngressSolver (via the platform's
 * computeSignPeriods). Periods are clipped to the window and carry houses
 * counted from the natal Lagna and natal Moon sign, plus the classical
 * gochara status from the Moon.
 */
import { TransitIngressSolver } from '@astro/astrology-engine';
import { PlanetName } from '../../evidence/evidence-registry';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import { computeSignPeriods } from '../../snapshot/transit-periods';
import { gocharaStatus, houseFrom, SYMBOL, TRANSIT_PLANETS } from './astro';

export interface AnnualTransitPeriod {
  planet: PlanetName;
  sign: string;
  signIndex: number;
  startIso: string;
  endIso: string;
  /** Retrograde re-entry (never set for the nodes, which always move backwards). */
  retrograde: boolean;
  houseFromLagna: number;
  houseFromMoon: number;
  gochara: 'favourable' | 'demanding';
}

export type AnnualTransits = Record<PlanetName, AnnualTransitPeriod[]>;

export interface NatalAnchors {
  lagnaSign: number;
  moonSign: number;
}

export function natalAnchors(snapshot: ChartSnapshot): NatalAnchors {
  const moon = snapshot.natal.planets.find((p) => String(p.name).toUpperCase() === 'MOON');
  if (!moon) throw new Error('Natal Moon missing');
  return { lagnaSign: snapshot.natal.ascendant.rashiIndex, moonSign: moon.rashiIndex };
}

export async function computeAnnualTransits(
  anchors: NatalAnchors,
  fromIso: string,
  toIso: string,
  planets: PlanetName[] = TRANSIT_PLANETS
): Promise<AnnualTransits> {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const years = (to.getTime() - from.getTime()) / (365.25 * 86400000) + 0.002;
  const solver = new TransitIngressSolver();
  const out = {} as AnnualTransits;
  for (const planet of planets) {
    const raw = await computeSignPeriods(SYMBOL[planet], from, years, solver);
    const isNode = planet === 'Rahu' || planet === 'Ketu';
    out[planet] = raw
      .filter((p) => Date.parse(p.startIso) < to.getTime())
      .map((p) => {
        const hm = houseFrom(anchors.moonSign, p.signIndex);
        return {
          planet,
          sign: p.sign,
          signIndex: p.signIndex,
          startIso: p.startIso,
          endIso: Date.parse(p.endIso) > to.getTime() ? to.toISOString() : p.endIso,
          retrograde: !isNode && p.enteredRetrograde,
          houseFromLagna: houseFrom(anchors.lagnaSign, p.signIndex),
          houseFromMoon: hm,
          gochara: gocharaStatus(planet, hm),
        };
      });
  }
  return out;
}

/** The period that contains `iso` (start inclusive). */
export function periodAt(periods: AnnualTransitPeriod[], iso: string): AnnualTransitPeriod {
  const t = Date.parse(iso);
  const found = periods.find((p) => Date.parse(p.startIso) <= t && t < Date.parse(p.endIso));
  return found ?? periods[periods.length - 1];
}

/** Periods overlapping [fromIso, toIso). */
export function periodsBetween(periods: AnnualTransitPeriod[], fromIso: string, toIso: string): AnnualTransitPeriod[] {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  return periods.filter((p) => Date.parse(p.startIso) < b && Date.parse(p.endIso) > a);
}

/** Fraction of [fromIso, toIso) covered by a period. */
export function overlapFraction(p: AnnualTransitPeriod, fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  const s = Math.max(a, Date.parse(p.startIso));
  const e = Math.min(b, Date.parse(p.endIso));
  return Math.max(0, e - s) / (b - a);
}
