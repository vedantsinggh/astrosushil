/**
 * Classical gochara (transit) reference tables used by Rashi Bhavishya.
 *
 * Every entry here is a fixed, published classical rule — see
 * docs/report-system/decisions/rashi-bhavishya.md (RB-004 … RB-007) for the
 * source of each table. Nothing here is generated or tuned.
 */

export const GOCHARA_PLANETS = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'] as const;
export type GocharaPlanet = (typeof GOCHARA_PLANETS)[number];

export const PLANET_DISPLAY_NAMES: Record<GocharaPlanet, string> = {
  SUN: 'Sun',
  MOON: 'Moon',
  MARS: 'Mars',
  MERCURY: 'Mercury',
  JUPITER: 'Jupiter',
  VENUS: 'Venus',
  SATURN: 'Saturn',
  RAHU: 'Rahu',
  KETU: 'Ketu',
};

/**
 * Houses counted from the janma rashi (natal Moon sign) in which a transiting
 * planet is classically favourable. All other houses are "demanding".
 * Basis: Phaladeepika ch. 26 (Gochara Phala); the same table is given in
 * Muhurta Chintamani and B. V. Raman's "Hindu Predictive Astrology".
 * Rahu and Ketu follow Saturn (3, 6, 11), as in the standard tables.
 */
export const FAVOURABLE_HOUSES_FROM_MOON: Record<GocharaPlanet, readonly number[]> = {
  SUN: [3, 6, 10, 11],
  MOON: [1, 3, 6, 7, 10, 11],
  MARS: [3, 6, 11],
  MERCURY: [2, 4, 6, 8, 10, 11],
  JUPITER: [2, 5, 7, 9, 11],
  VENUS: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  SATURN: [3, 6, 11],
  RAHU: [3, 6, 11],
  KETU: [3, 6, 11],
};

/**
 * Areas of life signified by each house (bhava karakatva, BPHS ch. 11–12),
 * worded neutrally. Used to explain what a house "from your Moon sign" is
 * about — never as an outcome by itself.
 */
export const HOUSE_THEMES: Record<number, string> = {
  1: 'self, body and general vitality',
  2: 'money, family and speech',
  3: 'courage, effort, siblings and short journeys',
  4: 'home, mother, comfort and inner peace',
  5: 'intellect, children, creativity and learning',
  6: 'daily work, health routines and competition',
  7: 'partnerships, spouse and dealings with others',
  8: 'sudden changes, research and hidden matters',
  9: 'fortune, teachers, faith and long journeys',
  10: 'career, status and public action',
  11: 'gains, friends and fulfilment of wishes',
  12: 'expenses, rest, retreat and spiritual life',
};

/** Natural significations (naisargika karakatva, BPHS ch. 3), worded neutrally. */
export const PLANET_THEMES: Record<GocharaPlanet, string> = {
  SUN: 'authority, vitality and self-confidence',
  MOON: 'mind, feelings and day-to-day mood',
  MARS: 'energy, drive and decisive action',
  MERCURY: 'communication, thinking and trade',
  JUPITER: 'wisdom, growth and guidance',
  VENUS: 'relationships, comforts and the arts',
  SATURN: 'discipline, duty and patience',
  RAHU: 'ambition and unconventional pursuits',
  KETU: 'detachment, introspection and letting go',
};

export const VARA_ENGLISH: Record<string, string> = {
  Ravivara: 'Sunday',
  Somavara: 'Monday',
  Mangalavara: 'Tuesday',
  Budhavara: 'Wednesday',
  Guruvara: 'Thursday',
  Shukravara: 'Friday',
  Shanivara: 'Saturday',
};

export type GocharaClass = 'favourable' | 'demanding';

/** House of `transitSign` counted from `janmaRashi` (both 1–12), inclusive counting: same sign = 1st. */
export function houseFromSign(janmaRashi: number, transitSign: number): number {
  if (!Number.isInteger(janmaRashi) || janmaRashi < 1 || janmaRashi > 12) throw new RangeError(`Invalid janma rashi ${janmaRashi}`);
  if (!Number.isInteger(transitSign) || transitSign < 1 || transitSign > 12) throw new RangeError(`Invalid transit sign ${transitSign}`);
  return ((transitSign - janmaRashi + 12) % 12) + 1;
}

export function gocharaClass(planet: GocharaPlanet, house: number): GocharaClass {
  return FAVOURABLE_HOUSES_FROM_MOON[planet].includes(house) ? 'favourable' : 'demanding';
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
