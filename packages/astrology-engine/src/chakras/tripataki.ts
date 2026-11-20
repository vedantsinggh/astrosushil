/**
 * Tripataki Chakra (annual, Varshaphala): the age-progressed signs of the natal planets for a
 * running year of life, with the Varsha Lagna of that year.
 *
 * PROVISIONAL – pending client review (ADR-016 §6). Calculated facts only, no interpretation.
 *
 * Progression rule (K. S. Charak, "A Textbook of Varshaphala", ch. VIII "The Tri-Pataki Chakra", as
 * restated by V. Ayalur "Tri Pataki Chakra" (vijayalur.com, 2016) and by VedAstro's open (MIT)
 * reconstruction, github.com/VedAstro/Tripataki-Chart-Jagannatha-Hora-Reverse-Engineered):
 *   running year = completed years + 1;
 *   Moon: running year mod 9; Sun, Mercury, Jupiter, Venus, Saturn: mod 4; Mars: mod 6;
 *   Rahu: mod 6 counted backwards; Ketu opposite Rahu. A remainder of 0 counts as the divisor;
 *   a count of 1 is the natal sign itself (inclusive counting from the natal sign).
 *
 * NOT computed (still ❓): the Tripataki lattice geometry and its vedha pairs. The published
 * descriptions disagree (three-flag lattice from the Varsha Lagna vs. fixed Mesha/Vrishabha/Mithuna
 * flags), and no source available here states which points are joined, so no vedha is emitted.
 */
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { BirthDetails } from '../input/birth-details';
import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { ChartCalculator } from '../chart/chart-calculator';
import { VarshaphalaCalculator } from '../varshaphala/varshaphala-calculator';

export const TRIPATAKI_SOURCE =
  'Tripataki progression per K. S. Charak, A Textbook of Varshaphala, ch. VIII (as restated by V. Ayalur, ' +
  '"Tri Pataki Chakra", 2016, and VedAstro\'s Tripataki reconstruction); Varsha Lagna from the engine\'s sidereal solar return.';

export interface TripatakiRule {
  planet: PlanetSymbol;
  divisor: number;
  direction: 'FORWARD' | 'REVERSE';
}

export const TRIPATAKI_RULES: readonly TripatakiRule[] = [
  { planet: PlanetSymbol.SUN, divisor: 4, direction: 'FORWARD' },
  { planet: PlanetSymbol.MOON, divisor: 9, direction: 'FORWARD' },
  { planet: PlanetSymbol.MARS, divisor: 6, direction: 'FORWARD' },
  { planet: PlanetSymbol.MERCURY, divisor: 4, direction: 'FORWARD' },
  { planet: PlanetSymbol.JUPITER, divisor: 4, direction: 'FORWARD' },
  { planet: PlanetSymbol.VENUS, divisor: 4, direction: 'FORWARD' },
  { planet: PlanetSymbol.SATURN, divisor: 4, direction: 'FORWARD' },
  { planet: PlanetSymbol.RAHU, divisor: 6, direction: 'REVERSE' },
];

export interface TripatakiPlacement {
  planet: PlanetSymbol;
  natalRashiIndex: number;
  divisor: number;
  direction: 'FORWARD' | 'REVERSE';
  count: number;              // inclusive sign count (1 = natal sign)
  rashiIndex: number;         // progressed sign 1..12
  rashiName: string;
  houseFromVarshaLagna?: number;
}

/** Pure progression: natal sign indices (1..12) + completed years -> progressed signs. */
export function tripatakiProgression(natalRashi: Partial<Record<PlanetSymbol, number>>, completedYears: number): TripatakiPlacement[] {
  if (!Number.isInteger(completedYears) || completedYears < 0) throw new RangeError('completedYears must be a non-negative integer');
  const running = completedYears + 1;
  const out: TripatakiPlacement[] = [];
  const signAt = (from: number, count: number, dir: 'FORWARD' | 'REVERSE') =>
    ((((from - 1 + (dir === 'FORWARD' ? 1 : -1) * (count - 1)) % 12) + 12) % 12) + 1;
  for (const r of TRIPATAKI_RULES) {
    const natal = natalRashi[r.planet];
    if (natal === undefined) continue;
    const count = running % r.divisor || r.divisor;
    const rashiIndex = signAt(natal, count, r.direction);
    out.push({ planet: r.planet, natalRashiIndex: natal, divisor: r.divisor, direction: r.direction, count, rashiIndex, rashiName: RASHIS[rashiIndex - 1].sanskritName });
    if (r.planet === PlanetSymbol.RAHU) {
      const k = ((rashiIndex + 6 - 1) % 12) + 1;
      const kn = natalRashi[PlanetSymbol.KETU] ?? ((natal + 6 - 1) % 12) + 1;
      out.push({ planet: PlanetSymbol.KETU, natalRashiIndex: kn, divisor: r.divisor, direction: 'REVERSE', count, rashiIndex: k, rashiName: RASHIS[k - 1].sanskritName });
    }
  }
  return out;
}

export interface TripatakiResult {
  provisional: true;
  source: string;
  conventionNotes: string[];
  targetYear: number;
  completedYears: number;
  runningYear: number;
  solarReturnUtcIso: string;
  varshaLagna: { rashiIndex: number; rashiName: string; longitude: number };
  placements: TripatakiPlacement[];
  /** Vedha on the Moon is not computed: lattice not reliably sourced (see conventionNotes). */
  vedha: null;
}

export const TRIPATAKI_CONVENTION_NOTES: readonly string[] = [
  'Running year = completed years at the solar return of the target year + 1.',
  'Mars uses the 6-year cycle (Charak); some authorities put Mars in the 4-year group.',
  'Ketu is always opposite the progressed Rahu.',
  'Vedha on the Moon is NOT computed: published lattices disagree and none states the joined points; pending a client-supplied diagram.',
];

export class TripatakiChakraCalculator {
  private readonly varshaphalaCalculator: VarshaphalaCalculator;

  constructor(private readonly chartCalculator: ChartCalculator = new ChartCalculator()) {
    this.varshaphalaCalculator = new VarshaphalaCalculator(chartCalculator);
  }

  public async calculate(birth: BirthDetails, targetYear: number, config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG): Promise<TripatakiResult> {
    const natalChart = await this.chartCalculator.calculateChart(birth, config);
    const v = await this.varshaphalaCalculator.calculateVarshaphala(birth, { targetYear }, config);
    const natal: Partial<Record<PlanetSymbol, number>> = {};
    for (const r of TRIPATAKI_RULES) natal[r.planet] = natalChart.planets[r.planet].rashiIndex;
    natal[PlanetSymbol.KETU] = natalChart.planets[PlanetSymbol.KETU].rashiIndex;
    const completedYears = v.solarReturn.age;
    const vl = v.varshaLagna;
    const placements = tripatakiProgression(natal, completedYears).map((p) => ({
      ...p,
      houseFromVarshaLagna: ((p.rashiIndex - vl.rashiIndex + 12) % 12) + 1,
    }));
    return {
      provisional: true,
      source: TRIPATAKI_SOURCE,
      conventionNotes: [...TRIPATAKI_CONVENTION_NOTES],
      targetYear,
      completedYears,
      runningYear: completedYears + 1,
      solarReturnUtcIso: v.solarReturn.solarReturnUtcIso,
      varshaLagna: { rashiIndex: vl.rashiIndex, rashiName: vl.rashiName, longitude: vl.longitude },
      placements,
      vedha: null,
    };
  }
}
