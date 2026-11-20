/**
 * The 28-nakshatra zodiac (with Abhijit) used by the Sarvatobhadra and Kota chakras.
 *
 * Abhijit span (standard, most widely published): the 4th pada of Uttarashadha (276°40'–280°00')
 * plus the first 1/15 of Shravana (280°00'–280°53'20"), i.e. 276°40'–280°53'20" sidereal.
 * Source: Muhurta Chintamani (nakshatra prakarana) as reproduced in the engine's Ashtottari sectors
 * (src/dasha/ashtottari-sectors.ts) and in Saravali "Sbc basics" (saravali.github.io/astrology/sbc_basics.html,
 * "the last quarter of Uttarashadha and the first fifteenth of Sravana").
 * Alternative (recorded, not used): some authors treat Abhijit as Uttarashadha pada 4 only.
 */
import { normalizeDegree } from '../coordinates/angular-math';
import { getNakshatraIndex, getPada } from '../nakshatra/nakshatra';

/** 28 nakshatra names, Ashwini first, Abhijit between Uttara Ashadha and Shravana (index 22). */
export const CHAKRA_NAKSHATRAS_28: readonly string[] = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Abhijit', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

export const CHAKRA_ABHIJIT_START_DEG = 276 + 40 / 60;
export const CHAKRA_ABHIJIT_END_DEG = 280 + 53 / 60 + 20 / 3600;

/** 1-based index into CHAKRA_NAKSHATRAS_28 for a sidereal longitude. */
export function chakraNakshatra28Index(longitude: number): number {
  const lon = normalizeDegree(longitude);
  if (lon >= CHAKRA_ABHIJIT_START_DEG && lon < CHAKRA_ABHIJIT_END_DEG) return 22;
  const n27 = getNakshatraIndex(lon);
  return n27 <= 21 ? n27 : n27 + 1;
}

/** Converts a 27-scheme nakshatra index (1..27) to the 28-scheme (Abhijit not reachable this way). */
export function chakraNakshatra27To28(n27: number): number {
  return n27 <= 21 ? n27 : n27 + 1;
}

/** Pada (1..4) in the ordinary 27-nakshatra scheme (padas are not defined for Abhijit). */
export function chakraPada27(longitude: number): number {
  return getPada(normalizeDegree(longitude));
}
