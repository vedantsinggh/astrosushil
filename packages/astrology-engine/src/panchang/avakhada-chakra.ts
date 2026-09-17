import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS, getRashiByLongitude } from '../zodiac/rashi';
import { NAKSHATRAS, getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';

export interface AvakhadaChakraReport {
  varna: 'Brahmin' | 'Kshatriya' | 'Vaishya' | 'Shudra';
  vashya: 'Chatushpada' | 'Manava' | 'Jalachara' | 'Vanachara' | 'Keeta';
  yoni: string;
  yoniGender: 'Male' | 'Female';
  gana: 'Deva' | 'Manushya' | 'Rakshasa';
  nadi: 'Adi' | 'Madhya' | 'Antya';
  rashi: string;
  rashiLord: PlanetSymbol;
  nakshatra: string;
  nakshatraLord: PlanetSymbol;
  pada: number;
  namakshara: string;
  tatwa: 'Agni' | 'Prithvi' | 'Vayu' | 'Jala';
  paya: 'Swarna (Gold)' | 'Rajata (Silver)' | 'Tamra (Copper)' | 'Loha (Iron)';
  yunja: 'Purva' | 'Madhya' | 'Uttara';
  hansaka: string;
}

// Canonical 108 Namakshara syllables for 27 Nakshatras (4 Padas each)
export const NAKSHATRA_NAMAKSHARAS: Record<number, [string, string, string, string]> = {
  1: ['Chu', 'Che', 'Cho', 'La'],       // Ashwini
  2: ['Li', 'Lu', 'Le', 'Lo'],          // Bharani
  3: ['A', 'I', 'U', 'E'],              // Krittika
  4: ['O', 'Va', 'Vi', 'Vu'],           // Rohini
  5: ['Ve', 'Vo', 'Ka', 'Ki'],          // Mrigashirsha
  6: ['Ku', 'Gha', 'Ng', 'Chha'],       // Ardra
  7: ['Ke', 'Ko', 'Ha', 'Hi'],          // Punarvasu
  8: ['Hu', 'He', 'Ho', 'Da'],          // Pushya
  9: ['De', 'Du', 'De', 'Do'],          // Ashlesha
  10: ['Ma', 'Mi', 'Mu', 'Me'],         // Magha
  11: ['Mo', 'Ta', 'Ti', 'Tu'],         // Purva Phalguni
  12: ['Te', 'To', 'Pa', 'Pi'],         // Uttara Phalguni
  13: ['Pu', 'Sha', 'Na', 'Tha'],       // Hasta
  14: ['Pe', 'Po', 'Ra', 'Ri'],         // Chitra
  15: ['Ru', 'Re', 'Ro', 'Ta'],         // Swati
  16: ['Ti', 'Tu', 'Te', 'To'],         // Vishakha
  17: ['Na', 'Ni', 'Nu', 'Ne'],         // Anuradha
  18: ['No', 'Ya', 'Yi', 'Yu'],         // Jyeshtha
  19: ['Ye', 'Yo', 'Bha', 'Bhi'],       // Mula
  20: ['Bhu', 'Dha', 'Pha', 'Dha'],     // Purva Ashadha
  21: ['Bhe', 'Bho', 'Ja', 'Ji'],       // Uttara Ashadha
  22: ['Khi', 'Khu', 'Khe', 'Kho'],     // Shravana
  23: ['Ga', 'Gi', 'Gu', 'Ge'],         // Dhanishta
  24: ['Go', 'Sa', 'Si', 'Su'],         // Shatabhisha
  25: ['Se', 'So', 'Da', 'Di'],         // Purva Bhadrapada
  26: ['Du', 'Tha', 'Jha', 'Jna'],      // Uttara Bhadrapada
  27: ['De', 'Do', 'Cha', 'Chi'],       // Revati
};

export const NAKSHATRA_YONIS: Record<number, { yoni: string; gender: 'Male' | 'Female' }> = {
  1: { yoni: 'Ashwa (Horse)', gender: 'Male' },
  2: { yoni: 'Gaja (Elephant)', gender: 'Male' },
  3: { yoni: 'Mesha (Sheep)', gender: 'Female' },
  4: { yoni: 'Sarpa (Serpent)', gender: 'Male' },
  5: { yoni: 'Sarpa (Serpent)', gender: 'Female' },
  6: { yoni: 'Shwana (Dog)', gender: 'Female' },
  7: { yoni: 'Marjara (Cat)', gender: 'Female' },
  8: { yoni: 'Mesha (Sheep)', gender: 'Male' },
  9: { yoni: 'Marjara (Cat)', gender: 'Male' },
  10: { yoni: 'Mushaka (Rat)', gender: 'Male' },
  11: { yoni: 'Mushaka (Rat)', gender: 'Female' },
  12: { yoni: 'Gau (Cow)', gender: 'Male' },
  13: { yoni: 'Mahisha (Buffalo)', gender: 'Female' },
  14: { yoni: 'Vyaghra (Tiger)', gender: 'Female' },
  15: { yoni: 'Mahisha (Buffalo)', gender: 'Male' },
  16: { yoni: 'Vyaghra (Tiger)', gender: 'Male' },
  17: { yoni: 'Mriga (Deer)', gender: 'Female' },
  18: { yoni: 'Mriga (Deer)', gender: 'Male' },
  19: { yoni: 'Shwana (Dog)', gender: 'Male' },
  20: { yoni: 'Vanara (Monkey)', gender: 'Male' },
  21: { yoni: 'Nakula (Mongoose)', gender: 'Male' },
  22: { yoni: 'Vanara (Monkey)', gender: 'Female' },
  23: { yoni: 'Simha (Lion)', gender: 'Female' },
  24: { yoni: 'Ashwa (Horse)', gender: 'Female' },
  25: { yoni: 'Simha (Lion)', gender: 'Male' },
  26: { yoni: 'Gau (Cow)', gender: 'Female' },
  27: { yoni: 'Gaja (Elephant)', gender: 'Female' },
};

export const NAKSHATRA_GANAS: Record<number, 'Deva' | 'Manushya' | 'Rakshasa'> = {
  1: 'Deva',
  2: 'Manushya',
  3: 'Rakshasa',
  4: 'Manushya',
  5: 'Deva',
  6: 'Manushya',
  7: 'Deva',
  8: 'Deva',
  9: 'Rakshasa',
  10: 'Rakshasa',
  11: 'Manushya',
  12: 'Manushya',
  13: 'Deva',
  14: 'Rakshasa',
  15: 'Deva',
  16: 'Rakshasa',
  17: 'Deva',
  18: 'Rakshasa',
  19: 'Rakshasa',
  20: 'Manushya',
  21: 'Manushya',
  22: 'Deva',
  23: 'Rakshasa',
  24: 'Rakshasa',
  25: 'Manushya',
  26: 'Manushya',
  27: 'Deva',
};

export const NAKSHATRA_NADIS: Record<number, 'Adi' | 'Madhya' | 'Antya'> = {
  1: 'Adi',
  2: 'Madhya',
  3: 'Antya',
  4: 'Antya',
  5: 'Madhya',
  6: 'Adi',
  7: 'Adi',
  8: 'Madhya',
  9: 'Antya',
  10: 'Antya',
  11: 'Madhya',
  12: 'Adi',
  13: 'Adi',
  14: 'Madhya',
  15: 'Antya',
  16: 'Antya',
  17: 'Madhya',
  18: 'Adi',
  19: 'Adi',
  20: 'Madhya',
  21: 'Antya',
  22: 'Antya',
  23: 'Madhya',
  24: 'Adi',
  25: 'Adi',
  26: 'Madhya',
  27: 'Antya',
};

export class AvakhadaChakraCalculator {
  /**
   * Evaluates complete deterministic Avakhada Chakra for a birth Moon placement and Ascendant.
   */
  public static calculateAvakhada(
    moonLongitude: number,
    ascendantRashiIndex: number
  ): AvakhadaChakraReport {
    const normMoon = normalizeDegree(moonLongitude);
    const rashiDef = getRashiByLongitude(normMoon);
    const nakDef = getNakshatraByLongitude(normMoon);
    const pada = getPada(normMoon);
    const rashiIdx = rashiDef.index;

    // 1. Varna
    let varna: AvakhadaChakraReport['varna'] = 'Shudra';
    if ([4, 8, 12].includes(rashiIdx)) varna = 'Brahmin';
    else if ([1, 5, 9].includes(rashiIdx)) varna = 'Kshatriya';
    else if ([2, 6, 10].includes(rashiIdx)) varna = 'Vaishya';
    else varna = 'Shudra';

    // 2. Vashya
    let vashya: AvakhadaChakraReport['vashya'] = 'Manava';
    if (rashiIdx === 1 || rashiIdx === 2) vashya = 'Chatushpada';
    else if (rashiIdx === 5) vashya = 'Vanachara';
    else if (rashiIdx === 8) vashya = 'Keeta';
    else if (rashiIdx === 4 || rashiIdx === 12) vashya = 'Jalachara';
    else vashya = 'Manava';

    // 3. Yoni & Gender
    const yoniInfo = NAKSHATRA_YONIS[nakDef.index] || { yoni: 'Ashwa', gender: 'Male' };

    // 4. Gana
    const gana = NAKSHATRA_GANAS[nakDef.index] || 'Deva';

    // 5. Nadi
    const nadi = NAKSHATRA_NADIS[nakDef.index] || 'Adi';

    // 6. Namakshara
    const syllables = NAKSHATRA_NAMAKSHARAS[nakDef.index] || ['A', 'I', 'U', 'E'];
    const namakshara = syllables[pada - 1] || syllables[0];

    // 7. Tatwa
    let tatwa: AvakhadaChakraReport['tatwa'] = 'Agni';
    if ([1, 5, 9].includes(rashiIdx)) tatwa = 'Agni';
    else if ([2, 6, 10].includes(rashiIdx)) tatwa = 'Prithvi';
    else if ([3, 7, 11].includes(rashiIdx)) tatwa = 'Vayu';
    else tatwa = 'Jala';

    // 8. Paya (Metal) based on Moon house from Lagna
    const moonHouseFromLagna = ((rashiIdx - ascendantRashiIndex + 12) % 12) + 1;
    let paya: AvakhadaChakraReport['paya'] = 'Swarna (Gold)';
    if ([1, 6, 11].includes(moonHouseFromLagna)) paya = 'Swarna (Gold)';
    else if ([2, 5, 9].includes(moonHouseFromLagna)) paya = 'Rajata (Silver)';
    else if ([3, 7, 10].includes(moonHouseFromLagna)) paya = 'Tamra (Copper)';
    else paya = 'Loha (Iron)';

    // 9. Yunja & Hansaka
    const yunja: AvakhadaChakraReport['yunja'] = nakDef.index <= 9 ? 'Purva' : (nakDef.index <= 18 ? 'Madhya' : 'Uttara');
    const hansaka = tatwa === 'Agni' ? 'Bhoomi' : tatwa === 'Prithvi' ? 'Varun' : tatwa === 'Vayu' ? 'Vayu' : 'Jala';

    return {
      varna,
      vashya,
      yoni: yoniInfo.yoni,
      yoniGender: yoniInfo.gender,
      gana,
      nadi,
      rashi: rashiDef.sanskritName,
      rashiLord: rashiDef.ruler as PlanetSymbol,
      nakshatra: nakDef.name,
      nakshatraLord: nakDef.lord,
      pada,
      namakshara,
      tatwa,
      paya,
      yunja,
      hansaka,
    };
  }
}
