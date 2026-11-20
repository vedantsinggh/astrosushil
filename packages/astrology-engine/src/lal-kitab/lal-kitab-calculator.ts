/**
 * Lal Kitab calculations (ADR-016 §1: calculation only; no remedies, no interpretation).
 *
 * 1. Lal Kitab birth chart (teva): the fixed Kalpurush chart in which house 1 is always Aries
 *    (Mesha), house 2 Taurus ... house 12 Pisces. A planet in the Nth house counted from the natal
 *    lagna (sign-based, whole-sign houses) is placed in house N of this fixed chart; the signs the
 *    planets occupy are not used further.
 * 2. Lal Kitab Varshphal: the annual chart for running year `age` (1–120) moves every planet of
 *    natal house N to house LAL_KITAB_VARSHPHAL_TABLE[age-1][N-1] (lal-kitab-varshphal-table.ts).
 *
 * Planet positions and the lagna come only from ChartCalculator with the given AstrologyConfig,
 * so ayanamsa / node options flow through unchanged.
 */
import { BirthDetails } from '../input/birth-details';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { AstroChart } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { MANDATORY_VEDIC_PLANETS, PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { AstrologyEngineError } from '../errors/astrology.error';
import { LAL_KITAB_VARSHPHAL_RECONCILED_ROWS, LAL_KITAB_VARSHPHAL_TABLE } from './lal-kitab-varshphal-table';

export const LAL_KITAB_CHART_SOURCE =
  'Lal Kitab (Pt. Roop Chand Joshi, 1952 ed.): fixed Kalpurush teva — house 1 = Mesha (Aries) always; ' +
  'a planet in the Nth house from the natal lagna is placed in house N of the fixed chart.';

export const LAL_KITAB_VARSHPHAL_SOURCE =
  'Lal Kitab (Pt. Roop Chand Joshi, 1952 ed.) Varshphal table, ages 1–120, as reproduced in ' +
  '"Varshphal sequence of movement of planets as per Lalkitab" (Astrostudents Collections) and ' +
  'R. N. Bhandari, "Varshphal Annual Transition Chart Part 2", Saptarishis Astrology ' +
  '(saptarishisastrology.com/?p=10498); 114/120 rows identical in both, 6 single-cell typos reconciled.';

export const LAL_KITAB_MIN_AGE = 1;
export const LAL_KITAB_MAX_AGE = 120;

export interface LalKitabPlanetPlacement {
  planet: PlanetSymbol;
  /** House in the fixed Lal Kitab chart (= house counted from the natal lagna). */
  house: number;
  /** Sidereal sign of the planet in the natal chart (1 = Mesha), for reference only. */
  natalRashiIndex: number;
  natalRashiName: string;
  longitude: number;
  isRetrograde: boolean;
}

export interface LalKitabHouse {
  house: number;
  /** Fixed sign of this house in the Lal Kitab chart (always equal to `house`). */
  fixedRashiIndex: number;
  fixedRashiName: string;
  planets: PlanetSymbol[];
}

export interface LalKitabChart {
  system: 'LAL_KITAB';
  provisional: true;
  source: string;
  conventionNotes: string[];
  natalLagnaRashiIndex: number;
  natalLagnaRashiName: string;
  planets: LalKitabPlanetPlacement[];
  houses: LalKitabHouse[];
}

export interface LalKitabHouseMapping {
  natalHouse: number;
  annualHouse: number;
}

export interface LalKitabAnnualPlacement {
  planet: PlanetSymbol;
  natalHouse: number;
  annualHouse: number;
}

export interface LalKitabVarshphal {
  system: 'LAL_KITAB_VARSHPHAL';
  provisional: true;
  source: string;
  conventionNotes: string[];
  /** Running year of life (1 = from birth to the first birthday). */
  age: number;
  /** Calendar year in which this running year begins (birth year + age − 1). */
  startsInYear: number;
  /** True if this table row was reconciled between the two transcriptions. */
  tableRowReconciled: boolean;
  houseMapping: LalKitabHouseMapping[];
  planets: LalKitabAnnualPlacement[];
  houses: LalKitabHouse[];
  natal: LalKitabChart;
}

export interface LalKitabVarshphalOptions {
  /** Running year of life, 1–120. */
  age?: number;
  /** Calendar year; the running year that begins on the birthday in this year is used. */
  targetYear?: number;
}

function assertHouse(n: number, what: string): void {
  if (!Number.isInteger(n) || n < 1 || n > 12) throw new AstrologyEngineError(`${what} must be an integer 1-12, got ${n}`);
}

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < LAL_KITAB_MIN_AGE || age > LAL_KITAB_MAX_AGE) {
    throw new AstrologyEngineError(`Lal Kitab Varshphal age must be an integer ${LAL_KITAB_MIN_AGE}-${LAL_KITAB_MAX_AGE}, got ${age}`);
  }
}

/** Table row for running year `age`: annual house for natal houses 1..12. */
export function lalKitabVarshphalRow(age: number): number[] {
  assertAge(age);
  return [...LAL_KITAB_VARSHPHAL_TABLE[age - 1]];
}

/** Annual house of natal house `natalHouse` in running year `age`. */
export function lalKitabAnnualHouse(natalHouse: number, age: number): number {
  assertHouse(natalHouse, 'natalHouse');
  assertAge(age);
  return LAL_KITAB_VARSHPHAL_TABLE[age - 1][natalHouse - 1];
}

/** Running year of life whose start falls in calendar year `targetYear`. */
export function lalKitabAgeForYear(birthYear: number, targetYear: number): number {
  if (!Number.isInteger(birthYear) || !Number.isInteger(targetYear)) throw new AstrologyEngineError('years must be integers');
  const age = targetYear - birthYear + 1;
  assertAge(age);
  return age;
}

function fixedHouses(placements: Array<{ planet: PlanetSymbol; house: number }>): LalKitabHouse[] {
  const out: LalKitabHouse[] = [];
  for (let h = 1; h <= 12; h++) {
    out.push({
      house: h,
      fixedRashiIndex: h,
      fixedRashiName: RASHIS[h - 1].sanskritName,
      planets: placements.filter((p) => p.house === h).map((p) => p.planet),
    });
  }
  return out;
}

/** Lal Kitab teva from an engine chart (pure; no astronomy here). */
export function lalKitabChartFromAstroChart(chart: AstroChart): LalKitabChart {
  if (!chart.ascendant) throw new AstrologyEngineError('Chart has no ascendant; Lal Kitab chart needs the natal lagna.');
  const lagna = chart.ascendant.rashiIndex;
  // Whole-sign house of each sign, from the engine's house list when present.
  const houseOfSign = new Map<number, number>();
  for (const h of chart.houses ?? []) houseOfSign.set(h.rashiIndex, h.houseNumber);
  const houseFor = (rashi: number): number => houseOfSign.get(rashi) ?? ((rashi - lagna + 12) % 12) + 1;

  const planets: LalKitabPlanetPlacement[] = [];
  for (const sym of MANDATORY_VEDIC_PLANETS) {
    const p = chart.planets[sym];
    if (!p) continue;
    planets.push({
      planet: sym,
      house: houseFor(p.rashiIndex),
      natalRashiIndex: p.rashiIndex,
      natalRashiName: p.rashiName,
      longitude: p.longitude,
      isRetrograde: p.isRetrograde,
    });
  }
  return {
    system: 'LAL_KITAB',
    provisional: true,
    source: LAL_KITAB_CHART_SOURCE,
    conventionNotes: [
      'Houses are sign-based (whole-sign) from the natal lagna, as Lal Kitab counts houses; the configured house system is not used for this chart.',
      'Lal Kitab places planets only by house; degrees and natal signs are listed for reference and are not used.',
      'Pakka Ghar, sleeping (soya) planets/houses and Lal Kitab dignity houses are not computed: published secondary tables conflict and no primary text was available.',
    ],
    natalLagnaRashiIndex: lagna,
    natalLagnaRashiName: RASHIS[lagna - 1].sanskritName,
    planets,
    houses: fixedHouses(planets),
  };
}

/** Lal Kitab Varshphal for a natal Lal Kitab chart (pure, table lookup only). */
export function lalKitabVarshphalFromChart(natal: LalKitabChart, age: number, birthYear: number): LalKitabVarshphal {
  const row = lalKitabVarshphalRow(age);
  const planets = natal.planets.map((p) => ({ planet: p.planet, natalHouse: p.house, annualHouse: row[p.house - 1] }));
  const reconciled = LAL_KITAB_VARSHPHAL_RECONCILED_ROWS.find((r) => r.age === age);
  const notes = [
    'Age is the running year of life: year 1 runs from birth to the first birthday; a target calendar year selects the running year that begins on the birthday in that year.',
    'All planets of one natal house move together to the same annual house.',
  ];
  if (reconciled) {
    notes.push(
      `Table row ${age}: the two transcriptions differ at natal house ${reconciled.natalHouse} (${reconciled.used} vs ${reconciled.rejected}); ` +
        `${reconciled.used} is used because the other value repeats a house in that row.`,
    );
  }
  return {
    system: 'LAL_KITAB_VARSHPHAL',
    provisional: true,
    source: LAL_KITAB_VARSHPHAL_SOURCE,
    conventionNotes: notes,
    age,
    startsInYear: birthYear + age - 1,
    tableRowReconciled: reconciled !== undefined,
    houseMapping: row.map((annualHouse, i) => ({ natalHouse: i + 1, annualHouse })),
    planets,
    houses: fixedHouses(planets.map((p) => ({ planet: p.planet, house: p.annualHouse }))),
    natal,
  };
}

export class LalKitabCalculator {
  private readonly chartCalculator: ChartCalculator;

  constructor(chartCalculator?: ChartCalculator) {
    this.chartCalculator = chartCalculator ?? new ChartCalculator();
  }

  public async calculateChart(details: BirthDetails, config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG): Promise<LalKitabChart> {
    const chart = await this.chartCalculator.calculateChart(details, config);
    return lalKitabChartFromAstroChart(chart);
  }

  public async calculateVarshphal(
    details: BirthDetails,
    options: LalKitabVarshphalOptions,
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG,
  ): Promise<LalKitabVarshphal> {
    const birthYear = details.date.year;
    let age: number;
    if (options.age !== undefined && options.targetYear !== undefined) {
      throw new AstrologyEngineError('Give either age or targetYear, not both.');
    } else if (options.age !== undefined) {
      age = options.age;
    } else if (options.targetYear !== undefined) {
      age = lalKitabAgeForYear(birthYear, options.targetYear);
    } else {
      throw new AstrologyEngineError('age or targetYear is required.');
    }
    assertAge(age);
    const natal = await this.calculateChart(details, config);
    return lalKitabVarshphalFromChart(natal, age, birthYear);
  }
}
