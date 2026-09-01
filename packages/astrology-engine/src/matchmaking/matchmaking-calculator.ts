import { AstroChart } from '../chart/astro-chart.types';
import { getNakshatraByLongitude, getNakshatraIndex } from '../nakshatra/nakshatra';
import { getRashiByLongitude } from '../zodiac/rashi';
import { PlanetSymbol } from '../planets/planet.types';
import {
  AshtakootaResult,
  KootaScore,
  ManglikStatus,
  MatchmakingResult,
} from './matchmaking.types';

export class MatchmakingCalculator {
  /**
   * Evaluates complete Ashtakoota Matchmaking (36 points Guna Milan) & Manglik Dosha for Boy and Girl.
   */
  public evaluateCompatibility(boyChart: AstroChart, girlChart: AstroChart): MatchmakingResult {
    const boyMoon = boyChart.planets[PlanetSymbol.MOON].longitude;
    const girlMoon = girlChart.planets[PlanetSymbol.MOON].longitude;

    const ashtakoota = this.calculateAshtakoota(boyMoon, girlMoon);
    const boyManglik = this.evaluateManglikDosha(boyChart);
    const girlManglik = this.evaluateManglikDosha(girlChart);

    let verdict = 'Compatible Marriage Match';
    if (ashtakoota.totalObtainedPoints < 18) {
      verdict = 'Low Guna Match (< 18 Points)';
    } else if (boyManglik.isManglik !== girlManglik.isManglik) {
      verdict = 'Guna Match Favorable, but Manglik Mismatch detected';
    }

    return {
      ashtakoota,
      boyManglik,
      girlManglik,
      overallVerdict: verdict,
    };
  }

  /**
   * Calculates Ashtakoota Guna Milan (36 Points) between Boy's Moon and Girl's Moon longitudes.
   */
  public calculateAshtakoota(boyMoonLong: number, girlMoonLong: number): AshtakootaResult {
    const boyRashi = getRashiByLongitude(boyMoonLong).index;
    const girlRashi = getRashiByLongitude(girlMoonLong).index;

    const boyNakshatra = getNakshatraIndex(boyMoonLong);
    const girlNakshatra = getNakshatraIndex(girlMoonLong);

    // 1. Varna (1 Point)
    const varnaScore = this.calcVarna(boyRashi, girlRashi);

    // 2. Vashya (2 Points)
    const vashyaScore = this.calcVashya(boyRashi, girlRashi);

    // 3. Tara (3 Points)
    const taraScore = this.calcTara(boyNakshatra, girlNakshatra);

    // 4. Yoni (4 Points)
    const yoniScore = this.calcYoni(boyNakshatra, girlNakshatra);

    // 5. Graha Maitri (5 Points)
    const maitriScore = this.calcGrahaMaitri(boyRashi, girlRashi);

    // 6. Gana (6 Points)
    const ganaScore = this.calcGana(boyNakshatra, girlNakshatra);

    // 7. Bhakoot (7 Points)
    const bhakootScore = this.calcBhakoot(boyRashi, girlRashi);

    // 8. Nadi (8 Points)
    const nadiScore = this.calcNadi(boyNakshatra, girlNakshatra);

    const kootas: Record<string, KootaScore> = {
      Varna: { name: 'Varna', maxPoints: 1, obtainedPoints: varnaScore, description: 'Work & Ego Compatibility' },
      Vashya: { name: 'Vashya', maxPoints: 2, obtainedPoints: vashyaScore, description: 'Mutual Attraction & Dominance' },
      Tara: { name: 'Tara', maxPoints: 3, obtainedPoints: taraScore, description: 'Destiny & Health Compatibility' },
      Yoni: { name: 'Yoni', maxPoints: 4, obtainedPoints: yoniScore, description: 'Physical & Sexual Compatibility' },
      GrahaMaitri: { name: 'Graha Maitri', maxPoints: 5, obtainedPoints: maitriScore, description: 'Mental & Psychological Affinity' },
      Gana: { name: 'Gana', maxPoints: 6, obtainedPoints: ganaScore, description: 'Temperament & Behavior Match' },
      Bhakoot: { name: 'Bhakoot', maxPoints: 7, obtainedPoints: bhakootScore, description: 'Family Welfare & Longevity' },
      Nadi: { name: 'Nadi', maxPoints: 8, obtainedPoints: nadiScore, description: 'Progeny & Genetic Health' },
    };

    const totalObtainedPoints =
      varnaScore +
      vashyaScore +
      taraScore +
      yoniScore +
      maitriScore +
      ganaScore +
      bhakootScore +
      nadiScore;

    return {
      totalMaxPoints: 36,
      totalObtainedPoints,
      kootas,
      isCompatible: totalObtainedPoints >= 18,
    };
  }

  /**
   * Evaluates Manglik Dosha (Mars placement in 1st, 4th, 7th, 8th, or 12th house from Lagna).
   */
  public evaluateManglikDosha(chart: AstroChart): ManglikStatus {
    const marsPos = chart.planets[PlanetSymbol.MARS];
    if (!marsPos) {
      return { isManglik: false, manglikHouses: [], severity: 'NONE' };
    }

    const ascRashi = chart.ascendant?.rashiIndex ?? 1;
    const marsRashi = marsPos.rashiIndex;

    // Calculate house number of Mars relative to Ascendant (1 to 12)
    const marsHouse = ((marsRashi - ascRashi + 12) % 12) + 1;

    const manglikHouses = [1, 4, 7, 8, 12];
    const isManglik = manglikHouses.includes(marsHouse);

    let severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' = 'NONE';
    if (isManglik) {
      if (marsHouse === 7 || marsHouse === 8) {
        severity = 'HIGH';
      } else if (marsHouse === 1 || marsHouse === 4) {
        severity = 'MEDIUM';
      } else {
        severity = 'LOW';
      }
    }

    return {
      isManglik,
      manglikHouses: isManglik ? [marsHouse] : [],
      severity,
    };
  }

  // --- Koota Helper Calculations ---

  private calcVarna(boyRashi: number, girlRashi: number): number {
    // Varna grade: Brahmin=4, Kshatriya=3, Vaishya=2, Shudra=1
    const varnaMap: Record<number, number> = {
      4: 4, 8: 4, 12: 4, // Cancer, Scorpio, Pisces -> Brahmin
      1: 3, 5: 3, 9: 3,  // Aries, Leo, Sag -> Kshatriya
      2: 2, 6: 2, 10: 2, // Taurus, Virgo, Cap -> Vaishya
      3: 1, 7: 1, 11: 1, // Gemini, Libra, Aq -> Shudra
    };

    const boyVarna = varnaMap[boyRashi] || 1;
    const girlVarna = varnaMap[girlRashi] || 1;

    return boyVarna >= girlVarna ? 1 : 0;
  }

  private calcVashya(boyRashi: number, girlRashi: number): number {
    if (boyRashi === girlRashi) return 2;
    // Standard rule: Same element or friendly rashi pair -> 1 or 2 pts
    const diff = Math.abs(boyRashi - girlRashi);
    if (diff === 4 || diff === 8) return 2; // Same trikona
    if (diff === 6) return 0; // Opposite
    return 1;
  }

  private calcTara(boyNak: number, girlNak: number): number {
    const diff1 = ((girlNak - boyNak + 27) % 9);
    const diff2 = ((boyNak - girlNak + 27) % 9);

    const isFavorable1 = diff1 !== 2 && diff1 !== 4 && diff1 !== 6;
    const isFavorable2 = diff2 !== 2 && diff2 !== 4 && diff2 !== 6;

    if (isFavorable1 && isFavorable2) return 3;
    if (isFavorable1 || isFavorable2) return 1.5;
    return 0;
  }

  private calcYoni(boyNak: number, girlNak: number): number {
    // Yoni animal assignment (14 types)
    const yoniMap: Record<number, number> = {
      1: 1, 24: 1,  // Horse
      2: 2, 27: 2,  // Elephant
      3: 3, 8: 3,   // Sheep
      4: 4, 5: 4,   // Serpent
      6: 5, 19: 5,  // Dog
      7: 6, 9: 6,   // Cat
      10: 7, 11: 7, // Rat
      12: 8, 13: 8, // Cow
      14: 9, 15: 9, // Buffalo
      16: 10, 17: 10,// Tiger
      18: 11, 20: 11,// Deer
      21: 12, 22: 12,// Monkey
      23: 13, 25: 13,// Mongoose
      26: 14,       // Lion
    };

    const boyYoni = yoniMap[boyNak] || 1;
    const girlYoni = yoniMap[girlNak] || 1;

    if (boyYoni === girlYoni) return 4;
    const diff = Math.abs(boyYoni - girlYoni);
    if (diff === 1) return 3;
    if (diff === 2) return 2;
    if (diff === 3) return 1;
    return 0;
  }

  private calcGrahaMaitri(boyRashi: number, girlRashi: number): number {
    // Rashi lords: 1,8:Mars; 2,7:Venus; 3,6:Merc; 4:Moon; 5:Sun; 9,12:Jup; 10,11:Sat
    const lordMap: Record<number, string> = {
      1: 'MARS', 8: 'MARS',
      2: 'VENUS', 7: 'VENUS',
      3: 'MERCURY', 6: 'MERCURY',
      4: 'MOON',
      5: 'SUN',
      9: 'JUPITER', 12: 'JUPITER',
      10: 'SATURN', 11: 'SATURN',
    };

    const boyLord = lordMap[boyRashi];
    const girlLord = lordMap[girlRashi];

    if (boyLord === girlLord) return 5;

    // Friends pair
    const friends = [
      ['SUN', 'MOON'], ['SUN', 'MARS'], ['SUN', 'JUPITER'],
      ['MOON', 'MERCURY'], ['MARS', 'JUPITER'],
      ['MERCURY', 'VENUS'], ['VENUS', 'SATURN'],
    ];

    const isFriend = friends.some(
      ([a, b]) => (a === boyLord && b === girlLord) || (b === boyLord && a === girlLord)
    );

    return isFriend ? 5 : 2.5;
  }

  private calcGana(boyNak: number, girlNak: number): number {
    // 1: Deva, 2: Manushya, 3: Rakshasa
    const ganaMap: Record<number, number> = {
      1: 1, 5: 1, 7: 1, 8: 1, 13: 1, 15: 1, 17: 1, 22: 1, 27: 1, // Deva
      2: 2, 4: 2, 6: 2, 11: 2, 12: 2, 20: 2, 21: 2, 25: 2, 26: 2, // Manushya
      3: 3, 9: 3, 10: 3, 14: 3, 16: 3, 18: 3, 19: 3, 23: 3, 24: 3, // Rakshasa
    };

    const boyGana = ganaMap[boyNak] || 2;
    const girlGana = ganaMap[girlNak] || 2;

    if (boyGana === girlGana) return 6;
    if (boyGana === 1 && girlGana === 2) return 5;
    if (boyGana === 2 && girlGana === 1) return 6;
    if ((boyGana === 1 && girlGana === 3) || (boyGana === 3 && girlGana === 1)) return 1;
    return 0;
  }

  private calcBhakoot(boyRashi: number, girlRashi: number): number {
    const rawDiff = Math.abs(boyRashi - girlRashi);
    const diff = rawDiff > 6 ? 12 - rawDiff : rawDiff;
    // 2/12 (diff=1), 5/9 (diff=4), 6/8 (diff=5 or 6) -> 0 points (Dosha)
    if (diff === 1 || diff === 4 || diff === 5 || diff === 6) {
      return 0;
    }
    return 7;
  }

  private calcNadi(boyNak: number, girlNak: number): number {
    // Nadi: 1: Adi, 2: Madhya, 3: Antya
    const nadiMap = (nak: number) => ((nak - 1) % 3) + 1;
    const boyNadi = nadiMap(boyNak);
    const girlNadi = nadiMap(girlNak);

    // Same Nadi -> 0 Points (Nadi Dosha), Different Nadi -> 8 Points
    return boyNadi === girlNadi ? 0 : 8;
  }
}
