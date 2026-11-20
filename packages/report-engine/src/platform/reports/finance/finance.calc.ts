/**
 * Finance Report — deterministic calculations (no LLM, no scoring formulas).
 *
 * Everything is derived from the ChartSnapshot: Jupiter/Saturn sign periods
 * (TransitIngressSolver), Vimshottari periods (DashaCalculator), Whole Sign
 * houses, Sarvashtakavarga and engine-detected yogas. Classification rules are
 * classical and documented in docs/report-system/decisions/finance-couple.md.
 */
import { planetName, PlanetName } from '../../evidence/evidence-registry';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import { classifyFunctionalNature, FunctionalClassification } from '../_finance-couple-shared/functional-nature';
import { ClippedPeriod, houseFrom, housesTouched, isFavourableFromMoon, periodsInRange } from '../_finance-couple-shared/gochara';

export const WEALTH_HOUSES = [2, 5, 9, 11] as const;
export const TRIK_HOUSES = [6, 8, 12] as const;
export const FINANCE_YEARS = 5;

export const HOUSE_THEME: Record<number, string> = {
  1: 'Self, health, overall vitality', 2: 'Savings, family wealth, speech', 3: 'Effort, courage, enterprise',
  4: 'Property, vehicles, home comforts', 5: 'Intelligence, investments, speculation', 6: 'Debts, loans, competition, service',
  7: 'Partnerships, business dealings', 8: 'Sudden gains or losses, inheritance, insurance', 9: 'Fortune, grace, long-term luck',
  10: 'Profession, status, earned income', 11: 'Gains, income streams, fulfilment of wishes', 12: 'Expenditure, investments abroad, letting go',
};

/** First calendar year of the 5-year outlook: the report year if asOf is in Jan–Jun, else the next year (FIN-005). */
export function outlookStartYear(asOfIso: string): number {
  const d = new Date(asOfIso);
  return d.getUTCMonth() <= 5 ? d.getUTCFullYear() : d.getUTCFullYear() + 1;
}

export interface TransitRow {
  planet: 'JUPITER' | 'SATURN';
  period: ClippedPeriod;
  fromAsc: number;
  fromMoon: number;
  favourableFromMoon: boolean;
  /** Wealth houses (2/5/9/11 from Lagna) occupied or aspected. */
  wealthOccupied: number[];
  wealthAspected: number[];
}

export interface DashaSpan {
  md: PlanetName;
  ad: PlanetName;
  startIso: string;
  endIso: string;
}

export interface MonthRow {
  month: number; // 0..11
  jupiter: TransitRow[];
  saturn: TransitRow[];
  dashas: DashaSpan[];
}

export interface YearOutlook {
  n: number;
  year: number;
  transits: TransitRow[];
  months: MonthRow[];
  dashas: DashaSpan[];
}

function transitRows(snap: ChartSnapshot, planet: 'JUPITER' | 'SATURN', startMs: number, endMs: number): TransitRow[] {
  const asc = snap.natal.ascendant.rashiIndex;
  const moon = snap.natal.planets.find((p) => planetName(p.name) === 'Moon')!.rashiIndex;
  return periodsInRange(snap.transits[planet], startMs, endMs).map((period) => {
    const t = housesTouched(planet, period.signIndex, asc);
    const fromMoon = houseFrom(moon, period.signIndex);
    return {
      planet, period, fromAsc: t.occupies, fromMoon,
      favourableFromMoon: isFavourableFromMoon(planet, fromMoon),
      wealthOccupied: WEALTH_HOUSES.filter((h) => h === t.occupies),
      wealthAspected: WEALTH_HOUSES.filter((h) => t.aspects.includes(h)),
    };
  });
}

/** Vimshottari MD–AD spans overlapping [startMs, endMs). */
export function dashaSpans(snap: ChartSnapshot, startMs: number, endMs: number): DashaSpan[] {
  const out: DashaSpan[] = [];
  for (const md of snap.vimshottari.mahadashas) {
    for (const ad of md.subPeriods ?? []) {
      const s = Date.parse(ad.startDateIso);
      const e = Date.parse(ad.endDateIso);
      if (e <= startMs || s >= endMs) continue;
      out.push({ md: planetName(md.lord), ad: planetName(ad.lord), startIso: ad.startDateIso, endIso: ad.endDateIso });
    }
  }
  return out;
}

export function yearOutlook(snap: ChartSnapshot, n: number): YearOutlook {
  const year = outlookStartYear(snap.asOfIso) + n - 1;
  const ys = Date.UTC(year, 0, 1);
  const ye = Date.UTC(year + 1, 0, 1);
  const months: MonthRow[] = Array.from({ length: 12 }, (_, m) => {
    const ms = Date.UTC(year, m, 1);
    const me = Date.UTC(year, m + 1, 1);
    return { month: m, jupiter: transitRows(snap, 'JUPITER', ms, me), saturn: transitRows(snap, 'SATURN', ms, me), dashas: dashaSpans(snap, ms, me) };
  });
  return {
    n, year,
    transits: [...transitRows(snap, 'JUPITER', ys, ye), ...transitRows(snap, 'SATURN', ys, ye)],
    months,
    dashas: dashaSpans(snap, ys, ye),
  };
}

export interface PlanetWealthLink {
  planet: PlanetName;
  house: number;
  rules: number[];
  functional: FunctionalClassification;
  /** Wealth houses (2/5/9/11) the planet rules or occupies. */
  wealthLinks: string[];
  /** 6/8/12 houses the planet rules or occupies. */
  trikLinks: string[];
}

export function planetWealthLink(snap: ChartSnapshot, planet: PlanetName): PlanetWealthLink {
  const p = snap.natal.planets.find((x) => planetName(x.name) === planet)!;
  const functional = classifyFunctionalNature(snap.natal.ascendant.rashiIndex).find((c) => c.planet === planet)!;
  const ord = (n: number) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
  const links = (set: readonly number[]) => {
    const ruled = p.lordship.filter((h) => set.includes(h));
    return [
      ...(ruled.length ? [`rules ${ruled.map(ord).join(' & ')}`] : []),
      ...(set.includes(p.house) ? [`in ${ord(p.house)}`] : []),
    ];
  };
  return { planet, house: p.house, rules: p.lordship, functional, wealthLinks: links(WEALTH_HOUSES), trikLinks: links(TRIK_HOUSES) };
}

/** Engine-detected wealth yogas: the DHANA category plus Lakshmi Yoga (FIN-004). */
export function dhanaYogas(snap: ChartSnapshot) {
  return snap.yogas.filter((y) => y.isDetected && (y.category === 'DHANA' || y.id === 'YOGA_LAKSHMI'));
}

/** Hora (D2): which planets fall in the Sun's hora (Leo) and the Moon's hora (Cancer). */
export function horaSplit(snap: ChartSnapshot): { sun: PlanetName[]; moon: PlanetName[] } {
  const d2 = snap.vargas.D2;
  if (!d2) throw new Error('BLOCK_DATA_MISSING: D2');
  const sun: PlanetName[] = [];
  const moon: PlanetName[] = [];
  for (const pl of Object.values(d2.placements)) {
    if (pl.planet === 'Ascendant') continue;
    const name = planetName(String(pl.planet));
    (pl.rashiIndex === 5 ? sun : moon).push(name);
  }
  return { sun, moon };
}

/** SAV bindus of a house (1..12 from Lagna). */
export function savOfHouse(snap: ChartSnapshot, house: number): number {
  const sign = ((snap.natal.ascendant.rashiIndex - 1 + house - 1) % 12) + 1;
  return snap.ashtakavarga.sav.signs[sign as keyof typeof snap.ashtakavarga.sav.signs] as unknown as number;
}

/** Report window for the dasha analysis: asOf to the end of the 5-year outlook. */
export function outlookWindow(snap: ChartSnapshot): { startMs: number; endMs: number } {
  const start = outlookStartYear(snap.asOfIso);
  return { startMs: Date.parse(snap.asOfIso), endMs: Date.UTC(start + FINANCE_YEARS, 0, 1) };
}
