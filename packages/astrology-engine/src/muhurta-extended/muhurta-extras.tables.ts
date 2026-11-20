/**
 * Rule tables for Durmuhurta, Varjyam (Tyajyam / Visha ghatis), Amrit Kalam (Amrita ghatis),
 * Gandmool (Ganda-moola) nakshatras and Panchaka.
 *
 * Provisional – pending client review (docs/decisions.md ADR-016 §6). Each table cites its source;
 * changing a convention is a data change in this file plus its tests.
 */

export const MUHURTA_EXTRAS_PROVISIONAL_LABEL = 'provisional – pending client review';

// ---------------------------------------------------------------------------------------------
// 1. Durmuhurta
// ---------------------------------------------------------------------------------------------

export interface DurmuhurtaRule {
  /** 'DAY' = one of the 15 equal parts of sunrise→sunset; 'NIGHT' = one of the 15 equal parts of sunset→next sunrise. */
  part: 'DAY' | 'NIGHT';
  /** 1-based muhurta number within that part (1..15). */
  muhurtaNumber: number;
  /** Presiding deity name of that muhurta as given in the source verse. */
  muhurtaName: string;
}

export const DURMUHURTA_SOURCE =
  'Muhurta Chintamani (Daivajna Ramacharya), Shubhashubha Prakarana: weekday-forbidden muhurtas ' +
  '"ravāvaryamā brahma-rakṣaśca some kuje vahni-pitrye budhe cābhijit syāt / gurau toya-rakṣo bhṛgau brahma-pitrye ' +
  'śanāvīśa-sārpau muhūrtā niṣiddhāḥ", with the 15 day / 15 night muhurta deity order of the same text; ' +
  'as tabulated in published panchangs (Dur Muhurtam) and B.V. Raman, "Muhurtha (Electional Astrology)".';

/**
 * Weekday (0 = Sunday … 6 = Saturday) → forbidden muhurtas.
 * Derivation from the verse (deity → position in the 15-fold day / night order):
 *   Sun: Aryama = day 14.            Mon: Brahma (Vidhata) = day 9, Rakshasa (Nirriti) = day 12.
 *   Tue: Pitri = day 4, Vahni (Agni) = night 7.   Wed: Abhijit = day 8.
 *   Thu: Toya (Ambu/Jala) = day 6, Rakshasa = day 12.   Fri: Brahma = day 9, Pitri = day 4.
 *   Sat: Isha (Girisha/Rudra) = day 1, Sarpa (Bhujaga/Ahi) = day 2.
 */
export const DURMUHURTA_TABLE: Record<number, DurmuhurtaRule[]> = {
  0: [{ part: 'DAY', muhurtaNumber: 14, muhurtaName: 'Aryama' }],
  1: [
    { part: 'DAY', muhurtaNumber: 9, muhurtaName: 'Brahma (Vidhata)' },
    { part: 'DAY', muhurtaNumber: 12, muhurtaName: 'Rakshasa (Nirriti)' },
  ],
  2: [
    { part: 'DAY', muhurtaNumber: 4, muhurtaName: 'Pitri' },
    { part: 'NIGHT', muhurtaNumber: 7, muhurtaName: 'Vahni (Agni)' },
  ],
  3: [{ part: 'DAY', muhurtaNumber: 8, muhurtaName: 'Abhijit' }],
  4: [
    { part: 'DAY', muhurtaNumber: 6, muhurtaName: 'Toya (Jala)' },
    { part: 'DAY', muhurtaNumber: 12, muhurtaName: 'Rakshasa (Nirriti)' },
  ],
  5: [
    { part: 'DAY', muhurtaNumber: 4, muhurtaName: 'Pitri' },
    { part: 'DAY', muhurtaNumber: 9, muhurtaName: 'Brahma (Vidhata)' },
  ],
  6: [
    { part: 'DAY', muhurtaNumber: 1, muhurtaName: 'Isha (Rudra)' },
    { part: 'DAY', muhurtaNumber: 2, muhurtaName: 'Sarpa (Ahi)' },
  ],
};

export const DURMUHURTA_CONVENTION_NOTES: string[] = [
  'Day = sunrise to sunset and night = sunset to next sunrise, each divided into 15 equal muhurtas (unequal-hour system).',
  'Sunrise/sunset from the engine solar-day primitive (DayDivisionsCalculator.calculateSolarDay, ADR-015 sunrise convention).',
  "Monday's and Friday's \"Brahma\" is taken as the 9th DAY muhurta (Vidhata), as in published panchangs; the night muhurta Dhata (8th) is not used.",
  "Tuesday's \"Vahni\" is the 7th NIGHT muhurta (sunset→next sunrise of the Tuesday Vedic day); it may fall after civil midnight.",
  'Verse number not stated: printed editions number the Shubhashubha Prakarana verses differently.',
];

// ---------------------------------------------------------------------------------------------
// 2. Varjyam and Amrit Kalam (ghati offsets from nakshatra start, nakshatra = 60 ghatis)
// ---------------------------------------------------------------------------------------------

/** Duration of each Varjyam / Amrit Kalam window in ghatis of a 60-ghati nakshatra. */
export const NAKSHATRA_GHATI_WINDOW_LENGTH = 4;

export type VarjyamTableVariant = 'PUBLISHED_PANCHANG' | 'PRASHNA_MARGA';

/**
 * Varjyam start offsets (ghatis elapsed since the nakshatra began), index 0 = Ashwini … 26 = Revati.
 * Source: drikpanchang.com "Nakshatra Thyajyam" table (tyajya ghatis "51 to 54" for Ashwini etc.,
 * i.e. the 4 ghatis after 50 have elapsed) — the table used by published daily panchangs.
 */
export const VARJYAM_GHATIS_PUBLISHED: readonly number[] = [
  50, 24, 30, 40, 14, 21, 30, 20, 32, 30, 20, 18, 21, 20, 14, 14, 10, 14, 56, 24, 20, 10, 10, 18, 16, 24, 30,
];

/**
 * Visha ghatis per Prashna Marga (B.V. Raman tr., Part I, verse 21 as cited there, pp. 45–47), as transcribed in
 * Table 5.6 of the wisdomlib essay "Significance of the Moon in Ancient Civilizations". Differs from the
 * published-panchang table at Ardra (11 vs 21), Hasta (22 vs 21) and Mula (20 vs 56).
 */
export const VARJYAM_GHATIS_PRASHNA_MARGA: readonly number[] = [
  50, 24, 30, 40, 14, 11, 30, 20, 32, 30, 20, 18, 22, 20, 14, 14, 10, 14, 20, 24, 20, 10, 10, 18, 16, 24, 30,
];

/**
 * Amrita ghati start offsets per Prashna Marga (B.V. Raman tr., Part I, pp. 45–47), as transcribed in Table 5.6
 * (column "Amrita Ghatika/60 (Prashnamarga)") of the same wisdomlib essay. Index 0 = Ashwini … 26 = Revati.
 */
export const AMRIT_KALAM_GHATIS: readonly number[] = [
  42, 48, 54, 52, 38, 35, 54, 44, 56, 54, 44, 42, 45, 44, 38, 38, 28, 38, 44, 48, 44, 34, 34, 42, 40, 48, 54,
];

export const VARJYAM_SOURCE_PUBLISHED =
  'Varjyam (Tyajyam / Visha ghatis): published panchang table (drikpanchang.com "Nakshatra Thyajyam"), 4 ghatis starting ' +
  'after the tabulated ghatis of a 60-ghati nakshatra, scaled to the actual nakshatra duration.';
export const VARJYAM_SOURCE_PRASHNA_MARGA =
  'Varjyam (Visha ghatis): Prashna Marga (B.V. Raman tr., Part I, pp. 45–47), 4 ghatis, scaled to the actual nakshatra duration.';
export const AMRIT_KALAM_SOURCE =
  'Amrit Kalam (Amrita ghatis): Prashna Marga (B.V. Raman tr., Part I, pp. 45–47), 4 ghatis starting after the tabulated ' +
  'ghatis of a 60-ghati nakshatra, scaled to the actual nakshatra duration.';

export const VARJYAM_AMRIT_CONVENTION_NOTES: string[] = [
  'Window start = nakshatra start + (ghatis / 60) × actual nakshatra duration; length = (4 / 60) × actual duration (standard proportional method).',
  'Nakshatra = Moon sidereal longitude in 13°20′ divisions; start/end found by bisection on engine Moon positions (±1 s).',
  'Windows are reported when they overlap the local civil day (local midnight to next local midnight).',
  'Alternative Varjyam table (Prashna Marga) differs at Ardra 11, Hasta 22, Mula 20; selectable via varjyamTable option.',
  'Madhaveeyam gives a different Amrita ghati column (e.g. Ashwini 54); not used.',
];

// ---------------------------------------------------------------------------------------------
// 3. Gandmool and 4. Panchaka
// ---------------------------------------------------------------------------------------------

/** Gandmool nakshatras (1-based nakshatra indices): Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati. */
export const GANDMOOL_NAKSHATRA_INDICES: readonly number[] = [1, 9, 10, 18, 19, 27];

/**
 * Stricter "gandanta" variant: only the junction padas (last pada of the water-sign nakshatra and first pada of
 * the following fire-sign nakshatra). Pairs of (nakshatraIndex, pada).
 */
export const GANDANTA_JUNCTION_PADAS: ReadonlyArray<readonly [number, number]> = [
  [9, 4], [10, 1], [18, 4], [19, 1], [27, 4], [1, 1],
];

export const GANDMOOL_SOURCE =
  'Gandmool (Ganda-moola) nakshatras Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati — the six nakshatras at the ' +
  'water/fire sign junctions (Mina–Mesha, Karka–Simha, Vrischika–Dhanu); BPHS (R. Santhanam tr.), chapters on ' +
  'Gandanta / Abhukta-mula birth; Muhurta Chintamani, Nakshatra Prakarana; as listed in published panchangs (Ganda Mool).';

export const GANDMOOL_CONVENTION_NOTES: string[] = [
  'All four padas of the six nakshatras are flagged (published panchang "Gand Mool" convention).',
  'Stricter variant: only the gandanta junction padas (Ashlesha 4, Magha 1, Jyeshtha 4, Mula 1, Revati 4, Ashwini 1); reported as gandantaJunctionPada for an instant.',
  'Contiguous Gandmool nakshatras (Revati→Ashwini, Ashlesha→Magha, Jyeshtha→Mula) are merged into one window.',
];

/** Panchaka: Moon sidereal longitude in [300°, 360°) — second half of Dhanishta (pada 3 onward) to the end of Revati. */
export const PANCHAKA_START_DEGREE = 300;
export const PANCHAKA_END_DEGREE = 360;

export const PANCHAKA_SOURCE =
  'Panchaka (Dhanishta-panchaka / Vasu-panchaka): Moon from the second half of Dhanishta through Shatabhisha, ' +
  'Purva Bhadrapada, Uttara Bhadrapada and Revati, i.e. Moon in Kumbha and Mina (sidereal 300°–360°); ' +
  'Muhurta Chintamani, Nakshatra Prakarana, and published panchangs (Panchak).';

export const PANCHAKA_CONVENTION_NOTES: string[] = [
  'Starts at Dhanishta pada 3 = Kumbha 0° (sidereal 300°), ends when the Moon leaves Revati (360° / Mesha 0°).',
  'Variant: some sources start Panchaka at the beginning of Dhanishta (293°20′); not used.',
  'Weekday-based Panchaka type names (Roga/Raja/Agni/Chora/Mrityu) are not included: no classical verse located; popular sources disagree on Wednesday/Thursday.',
];

export const GANDMOOL_PANCHAKA_SOURCE = `${GANDMOOL_SOURCE} ${PANCHAKA_SOURCE}`;
