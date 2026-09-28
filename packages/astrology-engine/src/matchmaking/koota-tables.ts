import { PlanetSymbol } from '../planets/planet.types';
import {
  GanaType,
  NadiType,
  TaraCategory,
  VarnaGrade,
  VashyaType,
  YoniAnimal,
  YoniGender,
  YoniRelationship,
} from './matchmaking.types';

/**
 * Canonical 8-factor Ashtakoota maximum points allocation (Total = 36 points).
 */
export const ASHTAKOOTA_WEIGHTS = {
  VARNA: 1,
  VASHYA: 2,
  TARA: 3,
  YONI: 4,
  GRAHA_MAITRI: 5,
  GANA: 6,
  BHAKOOT: 7,
  NADI: 8,
} as const;

export const TOTAL_MAX_ASHTAKOOTA_SCORE = 36;

/**
 * Validates the weight registry invariant: sum of all factors must strictly equal 36.
 */
export function validateAshtakootaWeights(): boolean {
  const sum = Object.values(ASHTAKOOTA_WEIGHTS).reduce((acc, w) => acc + w, 0);
  return sum === TOTAL_MAX_ASHTAKOOTA_SCORE;
}

/**
 * 12 Zodiac Rashis to Varna Classification.
 * Brahmin (4): Water signs (Cancer, Scorpio, Pisces)
 * Kshatriya (3): Fire signs (Aries, Leo, Sagittarius)
 * Vaishya (2): Earth signs (Taurus, Virgo, Capricorn)
 * Shudra (1): Air signs (Gemini, Libra, Aquarius)
 */
export const RASHI_VARNA_MAP: Record<number, { varna: VarnaGrade; rank: number }> = {
  1: { varna: 'KSHATRIYA', rank: 3 }, // Aries
  2: { varna: 'VAISHYA', rank: 2 },   // Taurus
  3: { varna: 'SHUDRA', rank: 1 },    // Gemini
  4: { varna: 'BRAHMIN', rank: 4 },   // Cancer
  5: { varna: 'KSHATRIYA', rank: 3 }, // Leo
  6: { varna: 'VAISHYA', rank: 2 },   // Virgo
  7: { varna: 'SHUDRA', rank: 1 },    // Libra
  8: { varna: 'BRAHMIN', rank: 4 },   // Scorpio
  9: { varna: 'KSHATRIYA', rank: 3 }, // Sagittarius
  10: { varna: 'VAISHYA', rank: 2 },  // Capricorn
  11: { varna: 'SHUDRA', rank: 1 },   // Aquarius
  12: { varna: 'BRAHMIN', rank: 4 },  // Pisces
};

/**
 * 12 Zodiac Rashis to Vashya Classification.
 * Chatushpada (Quadruped): Aries (1), Taurus (2), Capricorn 1st half (10)
 * Manava (Human/Biped): Gemini (3), Virgo (6), Libra (7), Sagittarius 1st half (9), Aquarius (11)
 * Jalachara (Aquatic/Water): Cancer (4), Pisces (12), Capricorn 2nd half (10)
 * Vanachara (Wild/Forest/Lion): Leo (5)
 * Keeta (Insect/Scorpion): Scorpio (8)
 */
export const RASHI_VASHYA_MAP: Record<number, VashyaType> = {
  1: 'CHATUSHPADA', // Aries
  2: 'CHATUSHPADA', // Taurus
  3: 'MANAVA',      // Gemini
  4: 'JALACHARA',   // Cancer
  5: 'VANACHARA',   // Leo
  6: 'MANAVA',      // Virgo
  7: 'MANAVA',      // Libra
  8: 'KEETA',       // Scorpio
  9: 'MANAVA',      // Sagittarius
  10: 'CHATUSHPADA',// Capricorn
  11: 'MANAVA',     // Aquarius
  12: 'JALACHARA',  // Pisces
};

/**
 * Classical 12x12 Rashi Vashya Compatibility Matrix (Scores: 0 to 2 points).
 * Based on Muhurta Chintamani & Brihat Parashara Hora Shastra.
 */
export const RASHI_VASHYA_MATRIX: Record<number, Record<number, number>> = {
  // 1: Aries
  1: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 },
  // 2: Taurus
  2: { 1: 1, 2: 2, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 },
  // 3: Gemini
  3: { 1: 1, 2: 1, 3: 2, 4: 1, 5: 0, 6: 2, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 },
  // 4: Cancer
  4: { 1: 1, 2: 1, 3: 1, 4: 2, 5: 0, 6: 1, 7: 1, 8: 2, 9: 2, 10: 1, 11: 1, 12: 1 },
  // 5: Leo
  5: { 1: 1, 2: 1, 3: 0, 4: 0, 5: 2, 6: 0, 7: 0, 8: 0, 9: 1, 10: 1, 11: 0, 12: 0 },
  // 6: Virgo
  6: { 1: 1, 2: 1, 3: 2, 4: 1, 5: 0, 6: 2, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 2 },
  // 7: Libra
  7: { 1: 1, 2: 2, 3: 1, 4: 1, 5: 0, 6: 1, 7: 2, 8: 1, 9: 1, 10: 2, 11: 1, 12: 1 },
  // 8: Scorpio
  8: { 1: 1, 2: 1, 3: 1, 4: 2, 5: 0, 6: 1, 7: 1, 8: 2, 9: 1, 10: 1, 11: 1, 12: 1 },
  // 9: Sagittarius
  9: { 1: 1, 2: 1, 3: 1, 4: 2, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 1, 11: 1, 12: 2 },
  // 10: Capricorn
  10: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 1, 9: 1, 10: 2, 11: 2, 12: 1 },
  // 11: Aquarius
  11: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 0, 6: 1, 7: 1, 8: 1, 9: 1, 10: 2, 11: 2, 12: 1 },
  // 12: Pisces
  12: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0, 6: 2, 7: 1, 8: 1, 9: 2, 10: 1, 11: 1, 12: 2 },
};

/**
 * 9 Classical Navatara Definitions.
 */
export const TARA_DEFINITIONS: Record<number, { name: TaraCategory; isAuspicious: boolean; description: string }> = {
  1: { name: 'JANMA', isAuspicious: true, description: 'Birth / Self (Auspicious / Neutral)' },
  2: { name: 'SAMPAT', isAuspicious: true, description: 'Wealth & Prosperity (Auspicious)' },
  3: { name: 'VIPAT', isAuspicious: false, description: 'Danger & Obstacles (Inauspicious)' },
  4: { name: 'KSHEMA', isAuspicious: true, description: 'Well-being & Security (Auspicious)' },
  5: { name: 'PRATYAK', isAuspicious: false, description: 'Adversity & Hurdles (Inauspicious)' },
  6: { name: 'SADHANA', isAuspicious: true, description: 'Achievement & Success (Auspicious)' },
  7: { name: 'NAIDHANA', isAuspicious: false, description: 'Loss & Destruction (Inauspicious)' },
  8: { name: 'MITRA', isAuspicious: true, description: 'Friendship & Harmony (Auspicious)' },
  9: { name: 'PARAMA_MITRA', isAuspicious: true, description: 'Best Friend / Supreme Harmony (Auspicious)' },
};

/**
 * 27 Nakshatras to Yoni Animal and Gender.
 */
export const NAKSHATRA_YONI_MAP: Record<number, { animal: YoniAnimal; gender: YoniGender }> = {
  1: { animal: 'HORSE', gender: 'MALE' },        // Ashwini
  2: { animal: 'ELEPHANT', gender: 'MALE' },     // Bharani
  3: { animal: 'SHEEP', gender: 'FEMALE' },      // Krittika
  4: { animal: 'SERPENT', gender: 'MALE' },      // Rohini
  5: { animal: 'SERPENT', gender: 'FEMALE' },    // Mrigashira
  6: { animal: 'DOG', gender: 'FEMALE' },        // Ardra
  7: { animal: 'CAT', gender: 'FEMALE' },        // Punarvasu
  8: { animal: 'SHEEP', gender: 'MALE' },        // Pushya
  9: { animal: 'CAT', gender: 'MALE' },          // Ashlesha
  10: { animal: 'RAT', gender: 'MALE' },         // Magha
  11: { animal: 'RAT', gender: 'FEMALE' },       // Purva Phalguni
  12: { animal: 'COW', gender: 'MALE' },         // Uttara Phalguni
  13: { animal: 'BUFFALO', gender: 'FEMALE' },   // Hasta
  14: { animal: 'TIGER', gender: 'FEMALE' },     // Chitra
  15: { animal: 'BUFFALO', gender: 'MALE' },     // Swati
  16: { animal: 'TIGER', gender: 'MALE' },       // Vishakha
  17: { animal: 'DEER', gender: 'FEMALE' },      // Anuradha
  18: { animal: 'DEER', gender: 'MALE' },        // Jyeshtha
  19: { animal: 'DOG', gender: 'MALE' },         // Mula
  20: { animal: 'MONKEY', gender: 'MALE' },      // Purva Ashadha
  21: { animal: 'MONGOOSE', gender: 'MALE' },    // Uttara Ashadha
  22: { animal: 'MONKEY', gender: 'FEMALE' },    // Shravana
  23: { animal: 'LION', gender: 'FEMALE' },      // Dhanishta
  24: { animal: 'HORSE', gender: 'FEMALE' },     // Shatabhisha
  25: { animal: 'LION', gender: 'MALE' },        // Purva Bhadrapada
  26: { animal: 'COW', gender: 'FEMALE' },       // Uttara Bhadrapada
  27: { animal: 'ELEPHANT', gender: 'FEMALE' },  // Revati
};

/**
 * 14x14 Classical Yoni Compatibility Matrix (Scores: 0 to 4 points).
 * Order: HORSE, ELEPHANT, SHEEP, SERPENT, DOG, CAT, RAT, COW, BUFFALO, TIGER, DEER, MONKEY, MONGOOSE, LION.
 */
export const YONI_ANIMALS_ORDER: YoniAnimal[] = [
  'HORSE',
  'ELEPHANT',
  'SHEEP',
  'SERPENT',
  'DOG',
  'CAT',
  'RAT',
  'COW',
  'BUFFALO',
  'TIGER',
  'DEER',
  'MONKEY',
  'MONGOOSE',
  'LION',
];

export const YONI_COMPATIBILITY_MATRIX: Record<YoniAnimal, Record<YoniAnimal, number>> = {
  HORSE: {
    HORSE: 4, ELEPHANT: 2, SHEEP: 2, SERPENT: 2, DOG: 2, CAT: 2, RAT: 2, COW: 2, BUFFALO: 0, TIGER: 1, DEER: 2, MONKEY: 3, MONGOOSE: 2, LION: 1,
  },
  ELEPHANT: {
    HORSE: 2, ELEPHANT: 4, SHEEP: 3, SERPENT: 3, DOG: 2, CAT: 2, RAT: 2, COW: 2, BUFFALO: 3, TIGER: 1, DEER: 2, MONKEY: 3, MONGOOSE: 2, LION: 0,
  },
  SHEEP: {
    HORSE: 2, ELEPHANT: 3, SHEEP: 4, SERPENT: 2, DOG: 1, CAT: 2, RAT: 1, COW: 3, BUFFALO: 3, TIGER: 1, DEER: 2, MONKEY: 0, MONGOOSE: 2, LION: 1,
  },
  SERPENT: {
    HORSE: 2, ELEPHANT: 3, SHEEP: 2, SERPENT: 4, DOG: 2, CAT: 1, RAT: 1, COW: 1, BUFFALO: 1, TIGER: 2, DEER: 2, MONKEY: 2, MONGOOSE: 0, LION: 2,
  },
  DOG: {
    HORSE: 2, ELEPHANT: 2, SHEEP: 1, SERPENT: 2, DOG: 4, CAT: 2, RAT: 1, COW: 2, BUFFALO: 2, TIGER: 1, DEER: 0, MONKEY: 2, MONGOOSE: 1, LION: 1,
  },
  CAT: {
    HORSE: 2, ELEPHANT: 2, SHEEP: 2, SERPENT: 1, DOG: 2, CAT: 4, RAT: 0, COW: 2, BUFFALO: 2, TIGER: 1, DEER: 3, MONKEY: 2, MONGOOSE: 2, LION: 1,
  },
  RAT: {
    HORSE: 2, ELEPHANT: 2, SHEEP: 1, SERPENT: 1, DOG: 1, CAT: 0, RAT: 4, COW: 2, BUFFALO: 2, TIGER: 2, DEER: 2, MONKEY: 2, MONGOOSE: 2, LION: 1,
  },
  COW: {
    HORSE: 2, ELEPHANT: 2, SHEEP: 3, SERPENT: 1, DOG: 2, CAT: 2, RAT: 2, COW: 4, BUFFALO: 3, TIGER: 0, DEER: 3, MONKEY: 2, MONGOOSE: 2, LION: 1,
  },
  BUFFALO: {
    HORSE: 0, ELEPHANT: 3, SHEEP: 3, SERPENT: 1, DOG: 2, CAT: 2, RAT: 2, COW: 3, BUFFALO: 4, TIGER: 1, DEER: 2, MONKEY: 2, MONGOOSE: 2, LION: 1,
  },
  TIGER: {
    HORSE: 1, ELEPHANT: 1, SHEEP: 1, SERPENT: 2, DOG: 1, CAT: 1, RAT: 2, COW: 0, BUFFALO: 1, TIGER: 4, DEER: 1, MONKEY: 1, MONGOOSE: 1, LION: 1,
  },
  DEER: {
    HORSE: 2, ELEPHANT: 2, SHEEP: 2, SERPENT: 2, DOG: 0, CAT: 3, RAT: 2, COW: 3, BUFFALO: 2, TIGER: 1, DEER: 4, MONKEY: 2, MONGOOSE: 2, LION: 1,
  },
  MONKEY: {
    HORSE: 3, ELEPHANT: 3, SHEEP: 0, SERPENT: 2, DOG: 2, CAT: 2, RAT: 2, COW: 2, BUFFALO: 2, TIGER: 1, DEER: 2, MONKEY: 4, MONGOOSE: 2, LION: 2,
  },
  MONGOOSE: {
    HORSE: 2, ELEPHANT: 2, SHEEP: 2, SERPENT: 0, DOG: 1, CAT: 2, RAT: 2, COW: 2, BUFFALO: 2, TIGER: 1, DEER: 2, MONKEY: 2, MONGOOSE: 4, LION: 2,
  },
  LION: {
    HORSE: 1, ELEPHANT: 0, SHEEP: 1, SERPENT: 2, DOG: 1, CAT: 1, RAT: 1, COW: 1, BUFFALO: 1, TIGER: 1, DEER: 1, MONKEY: 2, MONGOOSE: 2, LION: 4,
  },
};

/**
 * 27 Nakshatras to Gana Classification.
 * Deva (9): Ashwini (1), Mrigashira (5), Punarvasu (7), Pushya (8), Hasta (13), Swati (15), Anuradha (17), Shravana (22), Revati (27)
 * Manushya (9): Bharani (2), Rohini (4), Ardra (6), Purva Phalguni (11), Uttara Phalguni (12), Purva Ashadha (20), Uttara Ashadha (21), Purva Bhadrapada (25), Uttara Bhadrapada (26)
 * Rakshasa (9): Krittika (3), Ashlesha (9), Magha (10), Chitra (14), Vishakha (16), Jyeshtha (18), Mula (19), Dhanishta (23), Shatabhisha (24)
 */
export const NAKSHATRA_GANA_MAP: Record<number, GanaType> = {
  1: 'DEVA',      // Ashwini
  2: 'MANUSHYA',  // Bharani
  3: 'RAKSHASA',  // Krittika
  4: 'MANUSHYA',  // Rohini
  5: 'DEVA',      // Mrigashira
  6: 'MANUSHYA',  // Ardra
  7: 'DEVA',      // Punarvasu
  8: 'DEVA',      // Pushya
  9: 'RAKSHASA',  // Ashlesha
  10: 'RAKSHASA', // Magha
  11: 'MANUSHYA', // Purva Phalguni
  12: 'MANUSHYA', // Uttara Phalguni
  13: 'DEVA',     // Hasta
  14: 'RAKSHASA', // Chitra
  15: 'DEVA',     // Swati
  16: 'RAKSHASA', // Vishakha
  17: 'DEVA',     // Anuradha
  18: 'RAKSHASA', // Jyeshtha
  19: 'RAKSHASA', // Mula
  20: 'MANUSHYA', // Purva Ashadha
  21: 'MANUSHYA', // Uttara Ashadha
  22: 'DEVA',     // Shravana
  23: 'RAKSHASA', // Dhanishta
  24: 'RAKSHASA', // Shatabhisha
  25: 'MANUSHYA', // Purva Bhadrapada
  26: 'MANUSHYA', // Uttara Bhadrapada
  27: 'DEVA',     // Revati
};

/**
 * Classical Gana Compatibility Matrix (Scores: 0 to 6 points).
 * Row = Person A (Groom / Boy), Column = Person B (Bride / Girl).
 */
export const GANA_COMPATIBILITY_MATRIX: Record<GanaType, Record<GanaType, number>> = {
  DEVA: {
    DEVA: 6,
    MANUSHYA: 6,
    RAKSHASA: 1,
  },
  MANUSHYA: {
    DEVA: 5,
    MANUSHYA: 6,
    RAKSHASA: 0,
  },
  RAKSHASA: {
    DEVA: 0,
    MANUSHYA: 0,
    RAKSHASA: 6,
  },
};

/**
 * 27 Nakshatras to Nadi Classification (Classical Serpentine 9-9-9 assignment).
 * Adi (Vata, 9): Ashwini (1), Ardra (6), Punarvasu (7), Uttara Phalguni (12), Hasta (13), Jyeshtha (18), Mula (19), Shatabhisha (24), Purva Bhadrapada (25)
 * Madhya (Pitta, 9): Bharani (2), Mrigashira (5), Pushya (8), Purva Phalguni (11), Chitra (14), Anuradha (17), Purva Ashadha (20), Dhanishta (23), Uttara Bhadrapada (26)
 * Antya (Kapha, 9): Krittika (3), Rohini (4), Ashlesha (9), Magha (10), Swati (15), Vishakha (16), Uttara Ashadha (21), Shravana (22), Revati (27)
 */
export const NAKSHATRA_NADI_MAP: Record<number, NadiType> = {
  1: 'ADI',      // Ashwini
  2: 'MADHYA',  // Bharani
  3: 'ANTYA',    // Krittika
  4: 'ANTYA',    // Rohini
  5: 'MADHYA',  // Mrigashira
  6: 'ADI',      // Ardra
  7: 'ADI',      // Punarvasu
  8: 'MADHYA',  // Pushya
  9: 'ANTYA',    // Ashlesha
  10: 'ANTYA',   // Magha
  11: 'MADHYA',  // Purva Phalguni
  12: 'ADI',     // Uttara Phalguni
  13: 'ADI',     // Hasta
  14: 'MADHYA',  // Chitra
  15: 'ANTYA',   // Swati
  16: 'ANTYA',   // Vishakha
  17: 'MADHYA',  // Anuradha
  18: 'ADI',     // Jyeshtha
  19: 'ADI',     // Mula
  20: 'MADHYA',  // Purva Ashadha
  21: 'ANTYA',   // Uttara Ashadha
  22: 'ANTYA',   // Shravana
  23: 'MADHYA',  // Dhanishta
  24: 'ADI',     // Shatabhisha
  25: 'ADI',     // Purva Bhadrapada
  26: 'MADHYA',  // Uttara Bhadrapada
  27: 'ANTYA',   // Revati
};

