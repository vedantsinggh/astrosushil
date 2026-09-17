import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { NAKSHATRAS, NAKSHATRA_LORDS_ORDER } from '../nakshatra/nakshatra';
import {
  Parashari108Details,
  KP249Details,
  PrashnaNumberDetails,
  PrashnaNumberSystem,
} from './prashna.types';

interface InternalKpSub {
  number: number;
  startLongitude: number;
  endLongitude: number;
  rashiIndex: number;
  rashiName: string;
  signLord: PlanetSymbol;
  starLord: PlanetSymbol;
  subLord: PlanetSymbol;
}

export class PrashnaNumberCalculator {
  private static kpTableCache: InternalKpSub[] | null = null;

  /**
   * Calculates classical Parashari 1–108 Navamsha Arudha point details.
   * Number 1 to 108 maps each 3°20' arc to its Rashi, Navamsha sign, Nakshatra, and Pada.
   */
  public static calculateParashari108(
    questionNumber: number,
    lagnaRashiIndex: number
  ): Parashari108Details {
    if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 108) {
      throw new Error(`Classical Parashari question number must be an integer between 1 and 108. Received: ${questionNumber}`);
    }

    const arcSpan = 10 / 3; // 3°20' = 3.3333333333333335°
    const startLongitude = (questionNumber - 1) * arcSpan;
    const endLongitude = questionNumber * arcSpan;
    const midLongitude = (questionNumber - 0.5) * arcSpan;

    // Rashi (1 to 12)
    const rashiIndex = Math.min(12, Math.floor(midLongitude / 30) + 1);
    const rashiDef = RASHIS[rashiIndex - 1];

    // Navamsha Rashi (1 to 12 cycles through 12 signs 9 times across 108 navamshas)
    const navamshaRashiIndex = ((questionNumber - 1) % 12) + 1;
    const navamshaRashiDef = RASHIS[navamshaRashiIndex - 1];
    const navamshaLord = navamshaRashiDef.ruler as PlanetSymbol;

    // Nakshatra (1 to 27) and Pada (1 to 4)
    const nakshatraIndex = Math.min(27, Math.floor((questionNumber - 1) / 4) + 1);
    const nakshatraDef = NAKSHATRAS[nakshatraIndex - 1];
    const pada = ((questionNumber - 1) % 4) + 1;
    const nakshatraLord = nakshatraDef.lord;

    // House offset from Prashna Lagna (Whole sign)
    const arudhaHouseFromLagna = ((navamshaRashiIndex - lagnaRashiIndex + 12) % 12) + 1;

    const description = `Classical Parashari Navamsha Arudha #${questionNumber} (${rashiDef.sanskritName} ${startLongitude.toFixed(2)}°-${endLongitude.toFixed(2)}°) -> D9 ${navamshaRashiDef.sanskritName} (House ${arudhaHouseFromLagna} from Lagna), Nakshatra ${nakshatraDef.name} Pada ${pada} (${nakshatraLord})`;

    return {
      system: 'PARASHARI_1_108',
      number: questionNumber,
      startLongitude,
      endLongitude,
      midLongitude,
      rashiIndex,
      rashiName: rashiDef.sanskritName,
      navamshaRashiIndex,
      navamshaRashiName: navamshaRashiDef.sanskritName,
      navamshaLord,
      nakshatraIndex,
      nakshatraName: nakshatraDef.name,
      pada,
      nakshatraLord,
      arudhaHouseFromLagna,
      description,
    };
  }

  /**
   * Generates the canonical 249 Krishnamurti Paddhati (KP) sub-divisions.
   * Strictly 249 subdivisions across the 360° zodiac.
   */
  public static getKpTable(): InternalKpSub[] {
    if (this.kpTableCache) {
      return this.kpTableCache;
    }

    const VIMSHOTTARI_YEARS: Partial<Record<PlanetSymbol, number>> = {
      [PlanetSymbol.KETU]: 7,
      [PlanetSymbol.VENUS]: 20,
      [PlanetSymbol.SUN]: 6,
      [PlanetSymbol.MOON]: 10,
      [PlanetSymbol.MARS]: 7,
      [PlanetSymbol.RAHU]: 18,
      [PlanetSymbol.JUPITER]: 16,
      [PlanetSymbol.SATURN]: 19,
      [PlanetSymbol.MERCURY]: 17,
    };

    const subs: InternalKpSub[] = [];
    let currentMinutes = 0; // Total 21600 arcminutes (360 degrees)

    for (let n = 0; n < 27; n++) {
      const starLordIndex = n % 9;
      const starLord = NAKSHATRA_LORDS_ORDER[starLordIndex];

      for (let s = 0; s < 9; s++) {
        const subLordIndex = (starLordIndex + s) % 9;
        const subLord = NAKSHATRA_LORDS_ORDER[subLordIndex];
        const years = VIMSHOTTARI_YEARS[subLord] ?? 0;
        const spanMinutes = (years * 20) / 3;
        const endMinutes = currentMinutes + spanMinutes;

        // Check for 30-degree (1800 arcminutes) sign boundary crossing
        let boundaryCrossing: number | null = null;
        for (let b = 1800; b < 21600; b += 1800) {
          if (currentMinutes < b - 1e-5 && endMinutes > b + 1e-5) {
            boundaryCrossing = b;
            break;
          }
        }

        if (boundaryCrossing !== null) {
          // Part 1: before boundary
          const signIndex1 = Math.floor(currentMinutes / 1800) + 1;
          const rashi1 = RASHIS[signIndex1 - 1];
          subs.push({
            number: subs.length + 1,
            startLongitude: currentMinutes / 60,
            endLongitude: boundaryCrossing / 60,
            rashiIndex: signIndex1,
            rashiName: rashi1.sanskritName,
            signLord: rashi1.ruler as PlanetSymbol,
            starLord,
            subLord,
          });

          // Part 2: after boundary
          const signIndex2 = Math.floor(boundaryCrossing / 1800) + 1;
          const rashi2 = RASHIS[signIndex2 - 1];
          subs.push({
            number: subs.length + 1,
            startLongitude: boundaryCrossing / 60,
            endLongitude: endMinutes / 60,
            rashiIndex: signIndex2,
            rashiName: rashi2.sanskritName,
            signLord: rashi2.ruler as PlanetSymbol,
            starLord,
            subLord,
          });
        } else {
          const signIndex = Math.min(12, Math.floor(currentMinutes / 1800) + 1);
          const rashi = RASHIS[signIndex - 1];
          subs.push({
            number: subs.length + 1,
            startLongitude: currentMinutes / 60,
            endLongitude: endMinutes / 60,
            rashiIndex: signIndex,
            rashiName: rashi.sanskritName,
            signLord: rashi.ruler as PlanetSymbol,
            starLord,
            subLord,
          });
        }

        currentMinutes = endMinutes;
      }
    }

    this.kpTableCache = subs;
    return subs;
  }

  /**
   * Calculates KP 1–249 sub-division details.
   */
  public static calculateKP249(questionNumber: number): KP249Details {
    if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 249) {
      throw new Error(`KP Horary question number must be an integer between 1 and 249. Received: ${questionNumber}`);
    }

    const table = this.getKpTable();
    const sub = table[questionNumber - 1];
    if (!sub) {
      throw new Error(`KP sub-division index ${questionNumber} not found.`);
    }

    const description = `KP Horary #${questionNumber}: ${sub.rashiName} (${sub.startLongitude.toFixed(2)}°-${sub.endLongitude.toFixed(2)}°) | Sign Lord: ${sub.signLord}, Star Lord: ${sub.starLord}, Sub Lord: ${sub.subLord}`;

    return {
      system: 'KP_1_249',
      number: questionNumber,
      startLongitude: sub.startLongitude,
      endLongitude: sub.endLongitude,
      rashiIndex: sub.rashiIndex,
      rashiName: sub.rashiName,
      signLord: sub.signLord,
      starLord: sub.starLord,
      subLord: sub.subLord,
      description,
    };
  }

  /**
   * Dispatches question number evaluation deterministically based on system preference and value.
   */
  public static calculate(
    questionNumber: number,
    lagnaRashiIndex: number,
    systemPreference: PrashnaNumberSystem = 'AUTO'
  ): PrashnaNumberDetails {
    if (systemPreference === 'KP_1_249') {
      return this.calculateKP249(questionNumber);
    }

    if (systemPreference === 'PARASHARI_1_108') {
      return this.calculateParashari108(questionNumber, lagnaRashiIndex);
    }

    // AUTO: if <= 108 default to Classical Parashari; if > 108 evaluate as KP 1–249
    if (questionNumber >= 1 && questionNumber <= 108) {
      return this.calculateParashari108(questionNumber, lagnaRashiIndex);
    }

    if (questionNumber >= 109 && questionNumber <= 249) {
      return this.calculateKP249(questionNumber);
    }

    throw new Error(`Question number ${questionNumber} is out of bounds (must be 1-108 for Parashari or 1-249 for KP).`);
  }
}
