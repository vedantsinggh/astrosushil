/**
 * Couple Kundli Matching — deterministic calculations.
 *
 * Ashtakoota and Manglik come from the engine's MatchmakingCalculator; the
 * rest (Sade Sati windows, nodal-axis distribution, dasha overlap, joint
 * transit table) is derived from each ChartSnapshot. No scores are invented.
 */
import { CompatibilityResult, DashaCalculator, ManglikStatus, MatchmakingCalculator, VimshottariDashaTree } from '@astro/astrology-engine';
import { planetName, PlanetName } from '../../evidence/evidence-registry';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import { SignPeriod } from '../../snapshot/transit-periods';
import { houseFrom, isFavourableFromMoon } from '../_finance-couple-shared/gochara';

export type Who = 'native' | 'partner';

export interface CoupleMatch {
  /** Which person's chart was used as the groom's (person A) in the directional kootas. */
  groom: Who;
  result: CompatibilityResult;
  /** Manglik status keyed by person. */
  manglik: Record<Who, ManglikStatus>;
  /** Moon profiles keyed by person. */
  profile: Record<Who, CompatibilityResult['personA']>;
}

/**
 * Person A (groom) in the directional kootas: the male partner when the pair is
 * male/female; otherwise the person who ordered the report (decision COU-002).
 */
export function groomOf(native: ChartSnapshot, partner: ChartSnapshot): Who {
  return native.subject.gender === 'female' && partner.subject.gender === 'male' ? 'partner' : 'native';
}

export function computeMatch(native: ChartSnapshot, partner: ChartSnapshot): CoupleMatch {
  const groom = groomOf(native, partner);
  const [a, b] = groom === 'native' ? [native, partner] : [partner, native];
  const result = new MatchmakingCalculator().evaluateCompatibility(a.raw, b.raw);
  const byWho = <T>(x: T, y: T): Record<Who, T> => (groom === 'native' ? { native: x, partner: y } : { native: y, partner: x });
  return {
    groom, result,
    manglik: byWho(result.manglikComparison.personA, result.manglikComparison.personB),
    profile: byWho(result.personA, result.personB),
  };
}

export const KOOTA_KEYS = ['varna', 'vashya', 'tara', 'yoni', 'grahaMaitri', 'gana', 'bhakoot', 'nadi'] as const;
export type KootaKey = (typeof KOOTA_KEYS)[number];
export const KOOTA_SLUG: Record<KootaKey, string> = {
  varna: 'varna', vashya: 'vashya', tara: 'tara', yoni: 'yoni', grahaMaitri: 'maitri', gana: 'gana', bhakoot: 'bhakoot', nadi: 'nadi',
};
export const KOOTA_AREA: Record<KootaKey, string> = {
  varna: 'Work ethic and values', vashya: 'Mutual attraction and influence', tara: 'Wellbeing and destiny rhythm',
  yoni: 'Intimacy and instinct', grahaMaitri: 'Mental friendship', gana: 'Temperament', bhakoot: 'Family life and emotional growth',
  nadi: 'Constitution and family health',
};

// ------------------------------------------------------------ Sade Sati --

export interface SaturnMoonPeriod {
  period: SignPeriod;
  index: number;
  houseFromMoon: number;
  phase: 'Sade Sati - rising (12th)' | 'Sade Sati - peak (1st)' | 'Sade Sati - setting (2nd)' | 'Dhaiya (4th)' | 'Dhaiya (8th)';
}

/** Saturn sign periods (from the snapshot horizon) falling in the 12th, 1st, 2nd, 4th or 8th from the natal Moon. */
export function saturnMoonPeriods(snap: ChartSnapshot): SaturnMoonPeriod[] {
  const moon = snap.natal.planets.find((p) => planetName(p.name) === 'Moon')!.rashiIndex;
  const PH: Record<number, SaturnMoonPeriod['phase']> = {
    12: 'Sade Sati - rising (12th)', 1: 'Sade Sati - peak (1st)', 2: 'Sade Sati - setting (2nd)', 4: 'Dhaiya (4th)', 8: 'Dhaiya (8th)',
  };
  const out: SaturnMoonPeriod[] = [];
  snap.transits.SATURN.forEach((period, index) => {
    const h = houseFrom(moon, period.signIndex);
    if (PH[h]) out.push({ period, index, houseFromMoon: h, phase: PH[h] });
  });
  return out;
}

// ------------------------------------------------------------ nodal axis --

export interface NodalAxis {
  /** True when all seven planets lie within one half of the zodiac bounded by Rahu and Ketu. */
  oneSide: boolean;
  /** Planets on the Rahu-to-Ketu side (increasing longitude from Rahu). */
  rahuSide: PlanetName[];
  ketuSide: PlanetName[];
}

export function nodalAxis(snap: ChartSnapshot): NodalAxis {
  const rahu = snap.natal.planets.find((p) => planetName(p.name) === 'Rahu')!.absoluteDegree;
  const rahuSide: PlanetName[] = [];
  const ketuSide: PlanetName[] = [];
  for (const p of snap.natal.planets) {
    const name = planetName(p.name);
    if (name === 'Rahu' || name === 'Ketu') continue;
    const d = (p.absoluteDegree - rahu + 360) % 360;
    (d < 180 ? rahuSide : ketuSide).push(name);
  }
  return { oneSide: rahuSide.length === 0 || ketuSide.length === 0, rahuSide, ketuSide };
}

// --------------------------------------------------------- dasha overlap --

export interface DashaSegment {
  startIso: string;
  endIso: string;
  native: { md: PlanetName; ad: PlanetName };
  partner: { md: PlanetName; ad: PlanetName };
}

function adAt(snap: ChartSnapshot, ms: number): { md: PlanetName; ad: PlanetName; endMs: number } {
  for (const md of snap.vimshottari.mahadashas) {
    for (const ad of md.subPeriods ?? []) {
      if (Date.parse(ad.startDateIso) <= ms && ms < Date.parse(ad.endDateIso)) {
        return { md: planetName(md.lord), ad: planetName(ad.lord), endMs: Date.parse(ad.endDateIso) };
      }
    }
  }
  throw new Error('BLOCK_DATA_MISSING: no antardasha at date');
}

/** Joint timeline: a new segment starts whenever either person's Antardasha changes. */
export function dashaOverlap(native: ChartSnapshot, partner: ChartSnapshot, years: number): DashaSegment[] {
  const start = Date.parse(native.asOfIso);
  const end = start + years * 365.25 * 86400000;
  const out: DashaSegment[] = [];
  let t = start;
  while (t < end) {
    const a = adAt(native, t);
    const b = adAt(partner, t);
    const next = Math.min(a.endMs, b.endMs, end);
    out.push({ startIso: new Date(t).toISOString(), endIso: new Date(next).toISOString(), native: { md: a.md, ad: a.ad }, partner: { md: b.md, ad: b.ad } });
    t = next;
  }
  return out;
}

// ---------------------------------------------------------- joint transits --

export interface JointTransitRow {
  planet: 'JUPITER' | 'SATURN';
  period: SignPeriod;
  index: number;
  native: { fromMoon: number; favourable: boolean };
  partner: { fromMoon: number; favourable: boolean };
}

export function jointTransits(native: ChartSnapshot, partner: ChartSnapshot): JointTransitRow[] {
  const moonOf = (s: ChartSnapshot) => s.natal.planets.find((p) => planetName(p.name) === 'Moon')!.rashiIndex;
  const out: JointTransitRow[] = [];
  for (const planet of ['JUPITER', 'SATURN'] as const) {
    native.transits[planet].forEach((period, index) => {
      const hn = houseFrom(moonOf(native), period.signIndex);
      const hp = houseFrom(moonOf(partner), period.signIndex);
      out.push({ planet, period, index, native: { fromMoon: hn, favourable: isFavourableFromMoon(planet, hn) }, partner: { fromMoon: hp, favourable: isFavourableFromMoon(planet, hp) } });
    });
  }
  return out;
}

/** Vimshottari to Pratyantar level for the running Antardasha (sub-sub periods). */
export function pratyantarTree(snap: ChartSnapshot): VimshottariDashaTree {
  return new DashaCalculator().calculateForChart(snap.raw, { maxLevel: 3, targetDate: new Date(snap.asOfIso) });
}

export interface CoupleExt {
  match: CoupleMatch;
  pratyantar: Record<Who, VimshottariDashaTree>;
}

export async function coupleExtend(native: ChartSnapshot, partner: ChartSnapshot): Promise<CoupleExt> {
  return { match: computeMatch(native, partner), pratyantar: { native: pratyantarTree(native), partner: pratyantarTree(partner) } };
}
