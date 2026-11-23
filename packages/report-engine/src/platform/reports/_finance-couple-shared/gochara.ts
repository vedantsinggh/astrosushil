/**
 * Transit (gochara) helpers shared by the Finance and Couple Matching reports.
 * Everything here works on the sign periods already in the ChartSnapshot
 * (TransitIngressSolver output); nothing is estimated.
 */
import { SignPeriod } from '../../snapshot/transit-periods';
import { Lang, MONTHS_HI, MONTHS_SHORT_HI } from './shared.hindi';

/** House of `sign` counted from `fromSign` (both 1..12), inclusive counting. */
export const houseFrom = (fromSign: number, sign: number): number => ((sign - fromSign + 12) % 12) + 1;

/**
 * Classical gochara: houses from the natal Moon in which a transit is
 * favourable (Phaladeepika ch. 26; also Brihat Samhita ch. 104).
 * Vedha (obstruction) is not applied — see decision FIN-006.
 */
export const GOCHARA_FAVOURABLE_FROM_MOON: Record<'JUPITER' | 'SATURN', number[]> = {
  JUPITER: [2, 5, 7, 9, 11],
  SATURN: [3, 6, 11],
};

/** Graha drishti (counted from the planet, inclusive): every planet aspects the 7th; Jupiter adds 5th/9th, Saturn 3rd/10th. */
export const SPECIAL_ASPECTS: Record<'JUPITER' | 'SATURN', number[]> = {
  JUPITER: [5, 7, 9],
  SATURN: [3, 7, 10],
};

export function isFavourableFromMoon(planet: 'JUPITER' | 'SATURN', houseFromMoon: number): boolean {
  return GOCHARA_FAVOURABLE_FROM_MOON[planet].includes(houseFromMoon);
}

/** Houses (from the reference sign) that a planet in `sign` occupies or aspects. */
export function housesTouched(planet: 'JUPITER' | 'SATURN', sign: number, fromSign: number): { occupies: number; aspects: number[] } {
  const occupies = houseFrom(fromSign, sign);
  const aspects = SPECIAL_ASPECTS[planet].map((d) => ((occupies - 1 + d - 1) % 12) + 1);
  return { occupies, aspects };
}

export interface ClippedPeriod extends SignPeriod {
  /** Index of the period in the snapshot list (0-based) — maps to evidence `transit.<planet>.NN`. */
  index: number;
  clipStartIso: string;
  clipEndIso: string;
}

/** Sign periods overlapping [startMs, endMs), clipped to the range. */
export function periodsInRange(periods: SignPeriod[], startMs: number, endMs: number): ClippedPeriod[] {
  const out: ClippedPeriod[] = [];
  periods.forEach((p, index) => {
    const s = Date.parse(p.startIso);
    const e = Date.parse(p.endIso);
    if (e <= startMs || s >= endMs) return;
    out.push({
      ...p, index,
      clipStartIso: new Date(Math.max(s, startMs)).toISOString(),
      clipEndIso: new Date(Math.min(e, endMs)).toISOString(),
    });
  });
  return out;
}

export const transitEvidenceId = (prefix: string, planet: 'JUPITER' | 'SATURN', index: number) =>
  `${prefix}transit.${planet.toLowerCase()}.${String(index + 1).padStart(2, '0')}`;

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

export function dayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** Month names in the report language (0 = January). */
export const monthName = (lang: Lang, month: number): string => (lang === 'hi' ? MONTHS_HI : MONTHS)[month];
export const monthShort = (lang: Lang, month: number): string => (lang === 'hi' ? MONTHS_SHORT_HI : MONTHS_SHORT)[month];

/** `dayMonth` in the report language: "5 Jun" / "5 जून". */
export function dayMonthText(lang: Lang, iso: string): string {
  if (lang === 'en') return dayMonth(iso);
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT_HI[d.getUTCMonth()]}`;
}
