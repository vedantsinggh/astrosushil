import { PlanetSymbol } from '../planets/planet.types';
import { DEEPTAMSHAS, isTajikaAspect } from '../varshaphala/tajika-yogas-calculator';
import { TajikaAspectName, TajikaGraha, TajikaOrbRule } from './tajika-extended.types';

/**
 * Shared Tajika tables for the tajika-extended module. Citations:
 * - Deeptamshas and aspects: Tajika Neelakanthi, Samjna Tantra (deeptamsha and drishti sections), as given in
 *   P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated Approach" (Sagar Publications, 2000), ch. 28 §28.2
 *   (Sun 15, Moon 12, Mars 8, Mercury 7, Jupiter 9, Venus 7, Saturn 9). Values reused from the engine's
 *   varshaphala DEEPTAMSHAS, which match that list.
 * - Speed order: same book, ch. 29 footnote 83 (increasing speed: Saturn, Rahu/Ketu, Jupiter, Mars, Sun,
 *   Venus, Mercury, Moon). "Faster" in every Tajika yoga means faster in this natural order.
 * - Hadda table: same book, ch. 28 Table 72 "Hadda Lords" (the Tajika hadda used with Neelakanthi). It is
 *   close to Ptolemy's "Egyptian terms" (Tetrabiblos I.20) but differs in Gemini (Venus 6-12, Jupiter 12-17
 *   in Table 72); Table 72 is used verbatim.
 * - Deep exaltation points: same book, ch. 28 §28.4.2 (Sun 10 Ar, Moon 3 Ta, Mars 28 Cp, Mercury 15 Vi,
 *   Jupiter 5 Cn, Venus 27 Pi, Saturn 20 Li).
 */

export const TAJIKA_GRAHAS: TajikaGraha[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

/** Natural speed rank (higher = faster). P.V.R. Narasimha Rao ch. 29 fn. 83. */
export const TAJIKA_SPEED_RANK: Record<TajikaGraha, number> = {
  [PlanetSymbol.SATURN]: 1,
  [PlanetSymbol.JUPITER]: 2,
  [PlanetSymbol.MARS]: 3,
  [PlanetSymbol.SUN]: 4,
  [PlanetSymbol.VENUS]: 5,
  [PlanetSymbol.MERCURY]: 6,
  [PlanetSymbol.MOON]: 7,
};

export function tajikaDeeptamsha(p: TajikaGraha): number {
  return DEEPTAMSHAS[p];
}

export function tajikaIsFaster(a: TajikaGraha, b: TajikaGraha): boolean {
  return TAJIKA_SPEED_RANK[a] > TAJIKA_SPEED_RANK[b];
}

/** Sign count of `to` from `from` (1-12). */
export function tajikaSignDistance(fromRashi: number, toRashi: number): number {
  return ((toRashi - fromRashi + 12) % 12) + 1;
}

export function tajikaAspectName(fromRashi: number, toRashi: number, includeSemiSextile: boolean): TajikaAspectName {
  const d = tajikaSignDistance(fromRashi, toRashi);
  if (isTajikaAspect(fromRashi, toRashi)) {
    if (d === 1) return 'CONJUNCTION';
    if (d === 3 || d === 11) return 'SEXTILE';
    if (d === 4 || d === 10) return 'SQUARE';
    if (d === 5 || d === 9) return 'TRINE';
    return 'OPPOSITION';
  }
  if (includeSemiSextile && (d === 2 || d === 12)) return 'SEMI_SEXTILE';
  return 'NONE';
}

export function tajikaAllowedOrb(a: TajikaGraha, b: TajikaGraha, rule: TajikaOrbRule): number {
  const da = DEEPTAMSHAS[a];
  const db = DEEPTAMSHAS[b];
  return rule === 'MUTUAL' ? Math.min(da, db) : (da + db) / 2;
}

/** One hadda span: [start, end) degrees within the sign, ruled by `lord`. */
export interface TajikaHaddaSpan {
  start: number;
  end: number;
  lord: PlanetSymbol;
}

const { MARS, MERCURY, JUPITER, VENUS, SATURN } = PlanetSymbol;
const h = (b: number[], lords: PlanetSymbol[]): TajikaHaddaSpan[] =>
  lords.map((lord, i) => ({ start: i === 0 ? 0 : b[i - 1], end: b[i], lord }));

/** Table 72 (P.V.R. Narasimha Rao ch. 28), index 0 = Aries. Upper bounds of the five haddas per sign. */
export const TAJIKA_HADDA_TABLE: TajikaHaddaSpan[][] = [
  h([6, 12, 20, 25, 30], [JUPITER, VENUS, MERCURY, MARS, SATURN]), // Ar
  h([8, 14, 22, 27, 30], [VENUS, MERCURY, JUPITER, SATURN, MARS]), // Ta
  h([6, 12, 17, 24, 30], [MERCURY, VENUS, JUPITER, MARS, SATURN]), // Ge
  h([7, 13, 19, 26, 30], [MARS, VENUS, MERCURY, JUPITER, SATURN]), // Cn
  h([6, 11, 18, 24, 30], [JUPITER, VENUS, SATURN, MERCURY, MARS]), // Le
  h([7, 17, 21, 28, 30], [MERCURY, VENUS, JUPITER, MARS, SATURN]), // Vi
  h([6, 14, 21, 28, 30], [SATURN, MERCURY, JUPITER, VENUS, MARS]), // Li
  h([7, 11, 19, 24, 30], [MARS, VENUS, MERCURY, JUPITER, SATURN]), // Sc
  h([12, 17, 21, 26, 30], [JUPITER, VENUS, MERCURY, MARS, SATURN]), // Sg
  h([7, 14, 22, 26, 30], [MERCURY, JUPITER, VENUS, SATURN, MARS]), // Cp
  h([7, 13, 20, 25, 30], [MERCURY, VENUS, JUPITER, MARS, SATURN]), // Aq
  h([12, 16, 19, 28, 30], [VENUS, JUPITER, MERCURY, MARS, SATURN]), // Pi
];

/** Hadda span holding a sidereal longitude. */
export function tajikaHaddaOf(longitude: number): TajikaHaddaSpan & { rashiIndex: number } {
  const lon = ((longitude % 360) + 360) % 360;
  const rashiIndex = Math.floor(lon / 30) + 1;
  const deg = lon - (rashiIndex - 1) * 30;
  const spans = TAJIKA_HADDA_TABLE[rashiIndex - 1];
  const span = spans.find((s) => deg >= s.start && deg < s.end) ?? spans[spans.length - 1];
  return { ...span, rashiIndex };
}

/** Deep exaltation longitudes (sidereal), §28.4.2. */
export const TAJIKA_DEEP_EXALTATION: Record<TajikaGraha, number> = {
  [PlanetSymbol.SUN]: 10,
  [PlanetSymbol.MOON]: 33,
  [PlanetSymbol.MARS]: 298,
  [PlanetSymbol.MERCURY]: 165,
  [PlanetSymbol.JUPITER]: 95,
  [PlanetSymbol.VENUS]: 357,
  [PlanetSymbol.SATURN]: 200,
};
