import { YoniAnimal } from '../matchmaking/matchmaking.types';
import { SouthRajjuGroup } from './south-matching.types';

/**
 * Data tables for South Indian Porutham / Dashakoota (ADR-016 §4).
 * Provisional – pending client review. Each table cites its published source.
 *
 * Nakshatra gana and yoni-animal tables are identical to the North Indian ones, so they are
 * imported from src/matchmaking (NAKSHATRA_GANA_MAP, NAKSHATRA_YONI_MAP) and not duplicated.
 * Nakshatra numbering: 1 Ashwini ... 27 Revati. Rashi numbering: 1 Mesha ... 12 Meena.
 */

export const SOUTH_MATCHING_PROVISIONAL_LABEL = 'provisional – pending client review';

export const PORUTHAM_SOURCE =
  'Standard published Tamil/Kerala 10-porutham tables (Dinam, Ganam, Mahendram, Stree Deergham, Yoni, Rasi, ' +
  'Rasi Athipathi, Vasiyam, Rajju, Vedhai) as reproduced in Tamil panchanga porutham explainers ' +
  '(e.g. hindutone.com "Porutham Explained", astroved.com "Vasya Porutham" table); kuta list as in ' +
  'B.V. Raman, "Muhurtha (Electional Astrology)", chapter on marriage; rashi-lord friendship by BPHS naisargika maitri (engine table).';

export const DASHAKOOTA_SOURCE =
  'Dashakoota (10 kootas: Dina, Gana, Mahendra, Stree-Deergha, Yoni, Rasi, Rasyadhipati, Vasya, Rajju, Vedha) ' +
  'as listed in B.V. Raman, "Muhurtha (Electional Astrology)", chapter on marriage; Dina by the ' +
  'remainder-after-9 (Tara) rule; remaining tables identical to the published Porutham tables.';

/** Dinam (Tamil list): counts girl→boy (inclusive) that agree. Published Tamil table. */
export const PORUTHAM_DINA_GOOD_COUNTS: readonly number[] = [2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24, 26];

/** Dina (Dashakoota): remainder of count/9 that agree (0 = exactly divisible). */
export const DASHAKOOTA_DINA_GOOD_REMAINDERS: readonly number[] = [2, 4, 6, 8, 0];

/** Mahendram: counts girl→boy (inclusive) that agree. */
export const MAHENDRA_GOOD_COUNTS: readonly number[] = [4, 7, 10, 13, 16, 19, 22, 25];

/** Stree Deergham: count girl→boy must exceed this. */
export const STREE_DEERGHA_MIN_EXCLUSIVE = 13;

/** Yoni: the seven hostile (enemy) animal pairs; any other combination agrees. */
export const SOUTH_YONI_ENEMY_PAIRS: ReadonlyArray<readonly [YoniAnimal, YoniAnimal]> = [
  ['HORSE', 'BUFFALO'],
  ['ELEPHANT', 'LION'],
  ['SHEEP', 'MONKEY'],
  ['SERPENT', 'MONGOOSE'],
  ['DOG', 'DEER'],
  ['CAT', 'RAT'],
  ['COW', 'TIGER'],
];

/**
 * Vasiyam table: rashi → its vasya rashis (published table, astroved.com "Vasya Porutham").
 * Agreement if either person's rashi is vasya to the other's.
 */
export const SOUTH_VASYA_TABLE: Readonly<Record<number, readonly number[]>> = {
  1: [8, 5], // Mesha: Vrischika, Simha
  2: [4, 7], // Rishabha: Kataka, Thula
  3: [6], // Mithuna: Kanni
  4: [8, 9], // Kataka: Vrischika, Dhanus
  5: [7], // Simha: Thula
  6: [3, 12], // Kanni: Mithuna, Meena
  7: [10], // Thula: Makara
  8: [4, 6], // Vrischika: Kataka, Kanni
  9: [12], // Dhanus: Meena
  10: [11, 1], // Makara: Kumbha, Mesha
  11: [1], // Kumbha: Mesha
  12: [10], // Meena: Makara
};

/** Rajju: five groups (head, neck, navel, thigh/waist, feet). Same group = Rajju dosha. */
export const SOUTH_RAJJU_GROUPS: Readonly<Record<SouthRajjuGroup, readonly number[]>> = {
  SIRO: [5, 14, 23], // Mrigashira, Chitra, Dhanishta
  KANTHA: [4, 6, 13, 15, 22, 24], // Rohini, Ardra, Hasta, Swati, Shravana, Shatabhisha
  NABHI: [3, 7, 12, 16, 21, 25], // Krittika, Punarvasu, U.Phalguni, Vishakha, U.Ashadha, P.Bhadrapada
  KATI: [2, 8, 11, 17, 20, 26], // Bharani, Pushya, P.Phalguni, Anuradha, P.Ashadha, U.Bhadrapada
  PADA: [1, 9, 10, 18, 19, 27], // Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati
};

export const SOUTH_RAJJU_BODY_PART: Readonly<Record<SouthRajjuGroup, string>> = {
  SIRO: 'Siro (head)',
  KANTHA: 'Kantha (neck)',
  NABHI: 'Nabhi / Udara (navel)',
  KATI: 'Kati / Ooru (waist / thigh)',
  PADA: 'Pada (feet)',
};

export function southRajjuOf(nakshatraIndex: number): SouthRajjuGroup {
  for (const [g, list] of Object.entries(SOUTH_RAJJU_GROUPS) as Array<[SouthRajjuGroup, readonly number[]]>) {
    if (list.includes(nakshatraIndex)) return g;
  }
  throw new Error(`Invalid nakshatra index ${nakshatraIndex}`);
}

/**
 * Vedhai: mutually obstructing nakshatra pairs (12 pairs) plus the mutual triplet
 * Mrigashira–Chitra–Dhanishta.
 */
export const SOUTH_VEDHA_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 18], // Ashwini – Jyeshtha
  [2, 17], // Bharani – Anuradha
  [3, 16], // Krittika – Vishakha
  [4, 15], // Rohini – Swati
  [6, 22], // Ardra – Shravana
  [7, 21], // Punarvasu – Uttara Ashadha
  [8, 20], // Pushya – Purva Ashadha
  [9, 19], // Ashlesha – Mula
  [10, 27], // Magha – Revati
  [11, 26], // Purva Phalguni – Uttara Bhadrapada
  [12, 25], // Uttara Phalguni – Purva Bhadrapada
  [13, 24], // Hasta – Shatabhisha
  [5, 14], // Mrigashira – Chitra
  [5, 23], // Mrigashira – Dhanishta
  [14, 23], // Chitra – Dhanishta
];

export function southIsVedha(a: number, b: number): boolean {
  return SOUTH_VEDHA_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function southIsYoniEnemy(a: YoniAnimal, b: YoniAnimal): boolean {
  return SOUTH_YONI_ENEMY_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Inclusive count from `from` to `to` in a cycle of `n` (same = 1). */
export function southInclusiveCount(from: number, to: number, n: number): number {
  return ((((to - from) % n) + n) % n) + 1;
}
