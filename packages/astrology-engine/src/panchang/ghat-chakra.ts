import { RASHIS } from '../zodiac/rashi';

export interface GhatChakraReport {
  moonRashiIndex: number;
  moonRashiName: string;
  ghatMasa: string;
  ghatTithi: string;
  ghatVara: string;
  ghatNakshatra: string;
  ghatPrahar: number;
  ghatLagna: string;
}

// Classical Ghat Chakra mapping per Moon Rashi (1 to 12)
export const GHAT_CHAKRA_TABLE: Record<
  number,
  {
    masa: string;
    tithi: string;
    vara: string;
    nakshatra: string;
    prahar: number;
    lagna: string;
  }
> = {
  1: { masa: 'Kartika', tithi: '1, 6, 11 (Nanda)', vara: 'Ravivara (Sunday)', nakshatra: 'Magha', prahar: 1, lagna: 'Mesha (Aries)' },
  2: { masa: 'Margashirsha', tithi: '5, 10, 15 (Purna)', vara: 'Shanivara (Saturday)', nakshatra: 'Hasta', prahar: 2, lagna: 'Vrishabha (Taurus)' },
  3: { masa: 'Pausha', tithi: '2, 7, 12 (Bhadra)', vara: 'Somavara (Monday)', nakshatra: 'Swati', prahar: 3, lagna: 'Mithuna (Gemini)' },
  4: { masa: 'Magha', tithi: '2, 7, 12 (Bhadra)', vara: 'Budhavara (Wednesday)', nakshatra: 'Anuradha', prahar: 4, lagna: 'Karka (Cancer)' },
  5: { masa: 'Phalguna', tithi: '3, 8, 13 (Jaya)', vara: 'Guruvara (Thursday)', nakshatra: 'Mula', prahar: 1, lagna: 'Simha (Leo)' },
  6: { masa: 'Chaitra', tithi: '4, 9, 14 (Rikta)', vara: 'Shanivara (Saturday)', nakshatra: 'Shravana', prahar: 2, lagna: 'Kanya (Virgo)' },
  7: { masa: 'Vaisakha', tithi: '4, 9, 14 (Rikta)', vara: 'Guruvara (Thursday)', nakshatra: 'Shatabhisha', prahar: 3, lagna: 'Tula (Libra)' },
  8: { masa: 'Jyeshtha', tithi: '5, 10, 15 (Purna)', vara: 'Shukravara (Friday)', nakshatra: 'Revati', prahar: 4, lagna: 'Vrishchika (Scorpio)' },
  9: { masa: 'Ashadha', tithi: '1, 6, 11 (Nanda)', vara: 'Shukravara (Friday)', nakshatra: 'Bharani', prahar: 1, lagna: 'Dhanu (Sagittarius)' },
  10: { masa: 'Shravana', tithi: '4, 9, 14 (Rikta)', vara: 'Mangalavara (Tuesday)', nakshatra: 'Rohini', prahar: 2, lagna: 'Makara (Capricorn)' },
  11: { masa: 'Bhadrapada', tithi: '3, 8, 13 (Jaya)', vara: 'Guruvara (Thursday)', nakshatra: 'Ardra', prahar: 3, lagna: 'Kumbha (Aquarius)' },
  12: { masa: 'Ashvina', tithi: '3, 8, 13 (Jaya)', vara: 'Budhavara (Wednesday)', nakshatra: 'Pushya', prahar: 4, lagna: 'Meena (Pisces)' },
};

export class GhatChakraCalculator {
  /**
   * Evaluates Ghat Chakra (inauspicious astrological elements) for a given natal Moon Rashi.
   */
  public static calculateGhatChakra(moonRashiIndex: number): GhatChakraReport {
    const idx = Math.min(12, Math.max(1, moonRashiIndex));
    const rashiDef = RASHIS[idx - 1];
    const data = GHAT_CHAKRA_TABLE[idx] || GHAT_CHAKRA_TABLE[1];

    return {
      moonRashiIndex: idx,
      moonRashiName: rashiDef.sanskritName,
      ghatMasa: data.masa,
      ghatTithi: data.tithi,
      ghatVara: data.vara,
      ghatNakshatra: data.nakshatra,
      ghatPrahar: data.prahar,
      ghatLagna: data.lagna,
    };
  }
}
