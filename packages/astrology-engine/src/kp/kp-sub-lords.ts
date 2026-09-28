import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getNakshatraByLongitude } from '../nakshatra/nakshatra';
import { RASHIS, getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { KPLordshipFourFold } from './kp.types';

export const VIMSHOTTARI_PLANET_ORDER: PlanetSymbol[] = [
  PlanetSymbol.KETU,
  PlanetSymbol.VENUS,
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.RAHU,
  PlanetSymbol.JUPITER,
  PlanetSymbol.SATURN,
  PlanetSymbol.MERCURY,
];

export const VIMSHOTTARI_YEARS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.KETU]: 7,
  [PlanetSymbol.VENUS]: 20,
  [PlanetSymbol.SUN]: 6,
  [PlanetSymbol.MOON]: 10,
  [PlanetSymbol.MARS]: 7,
  [PlanetSymbol.RAHU]: 18,
  [PlanetSymbol.JUPITER]: 16,
  [PlanetSymbol.SATURN]: 19,
  [PlanetSymbol.MERCURY]: 17,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

export class KPSubLordCalculator {
  /**
   * Resolves the complete 4-tier KP Lordship (Sign Lord, Star Lord, Sub Lord, Sub-Sub Lord)
   * and Sub Number (1 to 249 table) for any sidereal longitude.
   */
  public static calculateKPLords(longitude: number): KPLordshipFourFold & { subNumber: number } {
    const norm = normalizeDegree(longitude);
    const rashiDef = getRashiByLongitude(norm);
    const signLord = rashiDef.ruler as PlanetSymbol;

    const nakDef = getNakshatraByLongitude(norm);
    const starLord = nakDef.lord;

    // Position within the current Nakshatra (0° to 13°20' = 0 to 800 arcminutes)
    const nakSpan = 360 / 27; // 13.333333333333334 deg
    const degInNak = norm % nakSpan;
    const minutesInNak = degInNak * 60; // 0 to 800 arcminutes

    // Find star lord starting index in Vimshottari sequence
    const starLordIndex = VIMSHOTTARI_PLANET_ORDER.indexOf(starLord);
    const startIdx = starLordIndex >= 0 ? starLordIndex : 0;

    let accumulatedMinutes = 0;
    let subLord: PlanetSymbol = starLord;
    let subLordIndex = startIdx;
    let subStartMinutes = 0;
    let subSpanMinutes = 0;

    for (let i = 0; i < 9; i++) {
      const pIdx = (startIdx + i) % 9;
      const planet = VIMSHOTTARI_PLANET_ORDER[pIdx];
      const years = VIMSHOTTARI_YEARS[planet];
      const currentSubSpan = (years / 120) * 800; // arcminutes

      if (minutesInNak >= accumulatedMinutes && minutesInNak < accumulatedMinutes + currentSubSpan + 1e-7) {
        subLord = planet;
        subLordIndex = pIdx;
        subStartMinutes = accumulatedMinutes;
        subSpanMinutes = currentSubSpan;
        break;
      }
      accumulatedMinutes += currentSubSpan;
    }

    // Sub-Sub Lord calculation: subdivide the Sub into 9 parts starting with Sub Lord
    const minutesInSub = Math.max(0, minutesInNak - subStartMinutes);
    let subSubAccumulated = 0;
    let subSubLord: PlanetSymbol = subLord;

    for (let i = 0; i < 9; i++) {
      const pIdx = (subLordIndex + i) % 9;
      const planet = VIMSHOTTARI_PLANET_ORDER[pIdx];
      const years = VIMSHOTTARI_YEARS[planet];
      const currentSubSubSpan = (years / 120) * subSpanMinutes;

      if (minutesInSub >= subSubAccumulated && minutesInSub < subSubAccumulated + currentSubSubSpan + 1e-7) {
        subSubLord = planet;
        break;
      }
      subSubAccumulated += currentSubSubSpan;
    }

    // Canonical KP 1-249 Sub Number
    // Total 27 Nakshatras * 9 Subs = 243 subs + 6 sign boundary splits = 249
    const subNumber = this.calculateSubNumber(norm);

    return {
      signLord,
      starLord,
      subLord,
      subSubLord,
      subNumber,
    };
  }

  /**
   * Deterministically calculates the canonical KP Sub Number (1 to 249).
   * Sign boundaries (Aries 30°, Taurus 60°, etc.) split across 6 subs into 249 distinct spans.
   */
  public static calculateSubNumber(longitude: number): number {
    const norm = normalizeDegree(longitude);
    const nakIndex = Math.floor(norm / (360 / 27)); // 0 to 26
    const degInNak = norm % (360 / 27);
    const minutesInNak = degInNak * 60;

    const nakDef = getNakshatraByLongitude(norm);
    const starLordIndex = VIMSHOTTARI_PLANET_ORDER.indexOf(nakDef.lord);
    const startIdx = starLordIndex >= 0 ? starLordIndex : 0;

    let subOffsetInNak = 0;
    let accumulatedMinutes = 0;

    for (let i = 0; i < 9; i++) {
      const pIdx = (startIdx + i) % 9;
      const planet = VIMSHOTTARI_PLANET_ORDER[pIdx];
      const years = VIMSHOTTARI_YEARS[planet];
      const span = (years / 120) * 800;

      if (minutesInNak >= accumulatedMinutes && minutesInNak < accumulatedMinutes + span + 1e-7) {
        subOffsetInNak = i;
        break;
      }
      accumulatedMinutes += span;
    }

    // Base sub index = nakIndex * 9 + subOffsetInNak (0 to 242)
    let rawIndex = nakIndex * 9 + subOffsetInNak + 1;

    // In classical KP 249 table, 6 Nakshatra Subs are divided across sign boundaries:
    // Krittika 1st pada (Aries/Taurus), Mrigashirsha (Taurus/Gemini), Punarvasu (Gemini/Cancer),
    // Uttara Phalguni (Leo/Virgo), Chitra (Virgo/Libra), Vishakha (Libra/Scorpio),
    // Uttarashadha (Sagittarius/Capricorn), Dhanishta (Capricorn/Aquarius), Purva Bhadrapada (Aquarius/Pisces)
    const signBorderSubs = [28, 56, 83, 111, 139, 166];
    for (const border of signBorderSubs) {
      if (rawIndex >= border) {
        rawIndex++;
      }
    }

    return Math.min(249, Math.max(1, rawIndex));
  }
}
