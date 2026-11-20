import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import { PlanetSymbol } from '../planets/planet.types';
import { calculateCombustion, getCombustionThreshold } from '../planets/combustion';
import { julianDayToUtcDate, utcDateToJulianDay } from '../varshaphala/solar-return.solver';

export const COMBUSTION_PERIOD_PLANETS = [
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
] as const;

export const COMBUSTION_ORB_SOURCE =
  "Engine's existing orbs (planets/combustion.ts): Moon 12°, Mars 17°, Mercury 14° (12° retrograde), Jupiter 11°, " +
  'Venus 10° (8° retrograde), Saturn 15° (Surya Siddhanta / BPHS as commonly tabulated). Provisional – pending client review (ADR-016 §6, N8).';

export interface CombustionPeriod {
  planet: PlanetSymbol;
  /** Entry into combustion (or the range start, if already combust). */
  startIso: string;
  /** Exit from combustion (or the range end, if still combust). */
  endIso: string;
  durationDays: number;
  startsBeforeRange: boolean;
  endsAfterRange: boolean;
  /** Smallest Sun–planet longitude separation inside the period, and when. */
  minSeparation: number;
  minSeparationIso: string;
  /** Planet retrograde at the closest approach (inferior conjunction for Mercury/Venus). */
  retrogradeAtClosest: boolean;
  /** Orb in force at entry and at exit (Mercury/Venus orbs depend on retrograde motion). */
  orbAtStart: number;
  orbAtEnd: number;
}

export interface CombustionPeriodsResult {
  startIso: string;
  endIso: string;
  periods: CombustionPeriod[];
  orbs: Array<{ planet: PlanetSymbol; direct: number; retrograde: number }>;
  provisional: true;
  source: string;
  notes: string[];
}

interface Sample {
  jd: number;
  combust: boolean;
  separation: number;
  retro: boolean;
  orb: number;
}

const MAX_RANGE_DAYS = 3660;

/**
 * Finds the periods when each planet is combust (within the engine's combustion orb of the Sun),
 * over a date range. Combustion at an instant is decided by the engine's own `calculateCombustion`
 * (longitude separation and retrograde-dependent orbs), so the table always agrees with the
 * chart. Entries and exits are bracketed by sampling and refined by bisection to ~1 second.
 * Longitude differences are frame-independent, so the ayanamsa does not affect the result.
 */
export class CombustionPeriodSolver {
  private readonly provider: EphemerisProvider;

  constructor(ephemerisProvider?: EphemerisProvider) {
    this.provider = ephemerisProvider ?? new AstronomyEngineAdapter();
  }

  private async sample(planet: PlanetSymbol, jd: number): Promise<Sample> {
    const [p, s] = await Promise.all([this.provider.getPlanetaryPosition(planet, jd), this.provider.getPlanetaryPosition(PlanetSymbol.SUN, jd)]);
    const c = calculateCombustion(planet, p.longitude, s.longitude, p.isRetrograde);
    return { jd, combust: c.isCombust, separation: c.angularSeparation, retro: p.isRetrograde, orb: c.threshold };
  }

  private async bisect(planet: PlanetSymbol, lo: Sample, hi: Sample): Promise<Sample> {
    let a = lo;
    let b = hi;
    for (let i = 0; i < 40 && b.jd - a.jd > 1 / 86400; i++) {
      const m = await this.sample(planet, (a.jd + b.jd) / 2);
      if (m.combust === a.combust) a = m;
      else b = m;
    }
    return b;
  }

  /** Ternary search for the minimum separation between two instants (unimodal near conjunction). */
  private async closest(planet: PlanetSymbol, lo: number, hi: number): Promise<Sample> {
    let a = lo;
    let b = hi;
    for (let i = 0; i < 60 && b - a > 1 / 1440; i++) {
      const m1 = a + (b - a) / 3;
      const m2 = b - (b - a) / 3;
      const [s1, s2] = await Promise.all([this.sample(planet, m1), this.sample(planet, m2)]);
      if (s1.separation <= s2.separation) b = m2;
      else a = m1;
    }
    return this.sample(planet, (a + b) / 2);
  }

  public async findPeriods(input: { startIso: string; endIso: string; planets?: PlanetSymbol[] }): Promise<CombustionPeriodsResult> {
    const start = new Date(input.startIso);
    const end = new Date(input.endIso);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error('Combustion range must be a positive ISO interval');
    if ((end.getTime() - start.getTime()) / 86400000 > MAX_RANGE_DAYS) throw new Error(`Combustion range exceeds ${MAX_RANGE_DAYS} days`);
    const planets = input.planets && input.planets.length > 0 ? input.planets : [...COMBUSTION_PERIOD_PLANETS];
    for (const p of planets) {
      if (!(COMBUSTION_PERIOD_PLANETS as readonly PlanetSymbol[]).includes(p)) throw new Error(`Combustion is not defined for ${p}`);
    }
    const startJD = utcDateToJulianDay(start);
    const endJD = utcDateToJulianDay(end);
    const periods: CombustionPeriod[] = [];

    for (const planet of planets) {
      // Moon's separation changes ~12°/day; planets' ≤ ~2°/day. Steps keep every period (≥ ~1.5 days) bracketed.
      const step = planet === PlanetSymbol.MOON ? 0.125 : 0.5;
      let prev = await this.sample(planet, startJD);
      let open: Sample | null = prev.combust ? prev : null;
      let openedBefore = prev.combust;
      const close = async (exit: Sample, endsAfter: boolean) => {
        if (!open) return;
        const c = await this.closest(planet, open.jd, exit.jd);
        periods.push({
          planet,
          startIso: julianDayToUtcDate(open.jd).toISOString(),
          endIso: julianDayToUtcDate(exit.jd).toISOString(),
          durationDays: exit.jd - open.jd,
          startsBeforeRange: openedBefore,
          endsAfterRange: endsAfter,
          minSeparation: c.separation,
          minSeparationIso: julianDayToUtcDate(c.jd).toISOString(),
          retrogradeAtClosest: c.retro,
          orbAtStart: open.orb,
          orbAtEnd: exit.orb,
        });
        open = null;
        openedBefore = false;
      };
      for (let jd = startJD + step; ; jd += step) {
        const t = Math.min(jd, endJD);
        const cur = await this.sample(planet, t);
        if (cur.combust !== prev.combust) {
          const edge = await this.bisect(planet, prev, cur);
          if (edge.combust) open = edge;
          else await close(edge, false);
        }
        prev = cur;
        if (t >= endJD) break;
      }
      if (open) await close(prev, true);
    }
    periods.sort((a, b) => a.startIso.localeCompare(b.startIso) || a.planet.localeCompare(b.planet));
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      periods,
      orbs: planets.map((p) => ({ planet: p, direct: getCombustionThreshold(p, false), retrograde: getCombustionThreshold(p, true) })),
      provisional: true,
      source: COMBUSTION_ORB_SOURCE,
      notes: [
        'Separation is the difference of geocentric ecliptic longitudes (latitude ignored), as in the chart’s combustion flag.',
        'Times are solved to about one second; ephemeris accuracy (about ±1 arc-minute) limits real accuracy to minutes.',
      ],
    };
  }
}
