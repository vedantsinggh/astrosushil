/**
 * Assembles all deterministic data of the Varshphal report for the solar-return
 * year that contains the report date. Built only on @astro/astrology-engine
 * (VarshaphalaCalculator, TransitIngressSolver) and the calculations in this folder.
 */
import { PlanetSymbol, VarshaphalaCalculator, VarshaphalaChart } from '@astro/astrology-engine';
import { PlanetName, planetName } from '../../../evidence/evidence-registry';
import { ChartSnapshot } from '../../../snapshot/chart-snapshot';
import { AvakahadaFacts, computeAvakahada } from '../../_annual-shared/avakahada';
import { houseFrom, TRANSIT_PLANETS } from '../../_annual-shared/astro';
import { AnnualTransitPeriod, AnnualTransits, computeAnnualTransits, natalAnchors, periodAt, periodsBetween } from '../../_annual-shared/transits';
import { computeMudda, muddaAt, MuddaPeriod } from './mudda';
import { computeLunarEvents, computeMasaPravesha, LunarEvent, VarshaMonth } from './sky';

/** Life areas and the houses (from the natal Lagna) that classically signify them (BPHS bhava karakatvas). */
export const LIFE_AREAS = [
  { key: 'work', label: 'Work and wealth', houses: [2, 6, 10, 11] },
  { key: 'heart', label: 'Love, family and home', houses: [2, 4, 5, 7] },
  { key: 'health', label: 'Health and vitality', houses: [1, 6, 8] },
  { key: 'inner', label: 'Learning and inner life', houses: [5, 9, 12] },
] as const;
export type AreaKey = (typeof LIFE_AREAS)[number]['key'];

export interface MonthFacts {
  month: VarshaMonth;
  midIso: string;
  /** Position of each transiting planet at mid-month. */
  mid: Record<PlanetName, AnnualTransitPeriod>;
  /** Sign changes that begin inside the month. */
  ingresses: AnnualTransitPeriod[];
  mudda: MuddaPeriod[];
  focus: PlanetName;
  supportiveCount: number;
  areas: Record<AreaKey, Array<{ planet: PlanetName; house: number }>>;
}

export interface VarshaYearData {
  targetYear: number;
  varsha: VarshaphalaChart;
  avakahada: AvakahadaFacts;
  yearStartIso: string;
  yearEndIso: string;
  transits: AnnualTransits;
  mudda: MuddaPeriod[];
  months: MonthFacts[];
  lunar: LunarEvent[];
  natalLagnaSign: number;
  natalMoonSign: number;
}

/** Varshaphala for the solar-return year containing `asOf`. */
export async function currentVarsha(snapshot: ChartSnapshot, calc = new VarshaphalaCalculator()): Promise<{ targetYear: number; varsha: VarshaphalaChart }> {
  const asOf = new Date(snapshot.asOfIso);
  const birthYear = snapshot.raw.birthDetails.date.year;
  let year = asOf.getUTCFullYear();
  if (year <= birthYear) year = birthYear + 1;
  let varsha = await calc.calculateVarshaphala(snapshot.raw.birthDetails, { targetYear: year, targetDate: asOf });
  if (Date.parse(varsha.solarReturn.solarReturnUtcIso) > asOf.getTime() && year - 1 > birthYear) {
    year -= 1;
    varsha = await calc.calculateVarshaphala(snapshot.raw.birthDetails, { targetYear: year, targetDate: asOf });
  }
  return { targetYear: year, varsha };
}

export async function computeVarshaYear(snapshot: ChartSnapshot): Promise<VarshaYearData> {
  const { targetYear, varsha } = await currentVarsha(snapshot);
  const yearStartIso = varsha.solarReturn.solarReturnUtcIso;
  const yearEndIso = varsha.nextSolarReturn?.solarReturnUtcIso ?? new Date(Date.parse(yearStartIso) + 365.2422 * 86400000).toISOString();
  const anchors = natalAnchors(snapshot);
  const transits = await computeAnnualTransits(anchors, yearStartIso, yearEndIso);
  const mudda = computeMudda({
    natalMoonLongitude: snapshot.raw.planets[PlanetSymbol.MOON].longitude,
    completedYears: varsha.solarReturn.age,
    yearStartIso, yearEndIso,
  });
  const masas = await computeMasaPravesha(varsha.solarReturn.natalSunLongitude, yearStartIso, yearEndIso);
  const months = masas.map((m) => monthFacts(m, transits, mudda, anchors.lagnaSign));
  const lunar = await computeLunarEvents(yearStartIso, yearEndIso);
  return {
    targetYear, varsha, avakahada: computeAvakahada(snapshot), yearStartIso, yearEndIso, transits, mudda, months, lunar,
    natalLagnaSign: anchors.lagnaSign, natalMoonSign: anchors.moonSign,
  };
}

export function monthFacts(month: VarshaMonth, transits: AnnualTransits, mudda: MuddaPeriod[], lagnaSign: number): MonthFacts {
  const midIso = new Date((Date.parse(month.startIso) + Date.parse(month.endIso)) / 2).toISOString();
  const mid = {} as Record<PlanetName, AnnualTransitPeriod>;
  const ingresses: AnnualTransitPeriod[] = [];
  for (const p of TRANSIT_PLANETS) {
    mid[p] = periodAt(transits[p], midIso);
    for (const per of periodsBetween(transits[p], month.startIso, month.endIso)) {
      if (Date.parse(per.startIso) > Date.parse(month.startIso)) ingresses.push(per);
    }
  }
  ingresses.sort((a, b) => Date.parse(a.startIso) - Date.parse(b.startIso));
  const md = mudda.filter((d) => Date.parse(d.startIso) < Date.parse(month.endIso) && Date.parse(d.endIso) > Date.parse(month.startIso));
  const areas = {} as MonthFacts['areas'];
  for (const a of LIFE_AREAS) {
    areas[a.key] = TRANSIT_PLANETS
      .map((p) => ({ planet: p, house: houseFrom(lagnaSign, mid[p].signIndex) }))
      .filter((x) => (a.houses as readonly number[]).includes(x.house));
  }
  return {
    month, midIso, mid, ingresses, mudda: md, focus: muddaAt(mudda, midIso).lord,
    supportiveCount: TRANSIT_PLANETS.filter((p) => mid[p].gochara === 'favourable').length,
    areas,
  };
}

/** Planet symbol → display name, tolerant of engine casing. */
export const pn = (s: string): PlanetName => planetName(String(s));
