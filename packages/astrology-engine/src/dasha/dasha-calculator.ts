import { PlanetSymbol } from '../planets/planet.types';
import { getNakshatraByLongitude, NAKSHATRA_LORDS_ORDER } from '../nakshatra/nakshatra';
import { DashaPeriod, VimshottariDashaTree } from './dasha.types';
import { normalizeDegree } from '../coordinates/angular-math';

export const DASHA_YEARS: Record<PlanetSymbol, number> = {
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

export const DASHA_ORDER: PlanetSymbol[] = NAKSHATRA_LORDS_ORDER;

/**
 * Calculates complete Vimshottari Dasha tree up to Level 3 (Mahadasha -> Antardasha -> Pratyantardasha).
 */
export class DashaCalculator {
  /**
   * Calculates Vimshottari Dasha timeline given sidereal Moon longitude and UTC birth date.
   */
  public calculateVimshottariDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    maxLevel: number = 3
  ): VimshottariDashaTree {
    const normMoon = normalizeDegree(moonLongitude);
    const nakshatraDef = getNakshatraByLongitude(normMoon);
    const nakshatraSpan = 360 / 27; // 13.333333333333334
    
    // Degree elapsed in the birth Nakshatra
    const degreeInNakshatra = normMoon - nakshatraDef.startDegree;
    const fractionElapsed = degreeInNakshatra / nakshatraSpan;
    const fractionRemaining = 1 - fractionElapsed;

    const firstLord = nakshatraDef.lord;
    const firstLordTotalYears = DASHA_YEARS[firstLord];
    const balanceAtBirthYears = fractionRemaining * firstLordTotalYears;
    const elapsedAtBirthYears = fractionElapsed * firstLordTotalYears;

    // Birth time as milliseconds epoch
    const birthTimeMs = birthDateUtc.getTime();
    const msPerYear = 365.2425 * 24 * 60 * 60 * 1000;

    // Start time of the first Mahadasha (before birth)
    let currentMahadashaStartMs = birthTimeMs - elapsedAtBirthYears * msPerYear;

    const mahadashas: DashaPeriod[] = [];
    const firstLordIndex = DASHA_ORDER.indexOf(firstLord);

    // Calculate full 120-year cycle (9 Mahadashas)
    for (let i = 0; i < 9; i++) {
      const lordIndex = (firstLordIndex + i) % 9;
      const lord = DASHA_ORDER[lordIndex];
      const durationYears = DASHA_YEARS[lord];
      const durationMs = durationYears * msPerYear;
      const currentMahadashaEndMs = currentMahadashaStartMs + durationMs;

      const startDateIso = new Date(currentMahadashaStartMs).toISOString();
      const endDateIso = new Date(currentMahadashaEndMs).toISOString();

      let subPeriods: DashaPeriod[] | undefined = undefined;

      if (maxLevel >= 2) {
        subPeriods = this.calculateAntardashas(
          lord,
          currentMahadashaStartMs,
          durationYears,
          msPerYear,
          maxLevel
        );
      }

      mahadashas.push({
        lord,
        startDateIso,
        endDateIso,
        durationYears,
        subPeriods,
      });

      currentMahadashaStartMs = currentMahadashaEndMs;
    }

    return {
      moonNakshatraIndex: nakshatraDef.index,
      balanceAtBirthYears,
      mahadashas,
    };
  }

  /**
   * Calculates 9 Antardashas for a given Mahadasha.
   */
  private calculateAntardashas(
    mahadashaLord: PlanetSymbol,
    mahadashaStartMs: number,
    mahadashaDurationYears: number,
    msPerYear: number,
    maxLevel: number
  ): DashaPeriod[] {
    const antardashas: DashaPeriod[] = [];
    const startIndex = DASHA_ORDER.indexOf(mahadashaLord);

    let currentStartMs = mahadashaStartMs;

    for (let i = 0; i < 9; i++) {
      const subLordIndex = (startIndex + i) % 9;
      const subLord = DASHA_ORDER[subLordIndex];
      const subLordYears = DASHA_YEARS[subLord];

      // Antardasha duration = (Mahadasha Years * Antardasha Lord Years) / 120
      const durationYears = (mahadashaDurationYears * subLordYears) / 120;
      const durationMs = durationYears * msPerYear;
      const currentEndMs = currentStartMs + durationMs;

      let pratyantardashas: DashaPeriod[] | undefined = undefined;
      if (maxLevel >= 3) {
        pratyantardashas = this.calculatePratyantardashas(
          subLord,
          currentStartMs,
          durationYears,
          msPerYear
        );
      }

      antardashas.push({
        lord: subLord,
        startDateIso: new Date(currentStartMs).toISOString(),
        endDateIso: new Date(currentEndMs).toISOString(),
        durationYears,
        subPeriods: pratyantardashas,
      });

      currentStartMs = currentEndMs;
    }

    return antardashas;
  }

  /**
   * Calculates 9 Pratyantardashas for a given Antardasha.
   */
  private calculatePratyantardashas(
    antardashaLord: PlanetSymbol,
    antardashaStartMs: number,
    antardashaDurationYears: number,
    msPerYear: number
  ): DashaPeriod[] {
    const pratyantardashas: DashaPeriod[] = [];
    const startIndex = DASHA_ORDER.indexOf(antardashaLord);

    let currentStartMs = antardashaStartMs;

    for (let i = 0; i < 9; i++) {
      const subSubLordIndex = (startIndex + i) % 9;
      const subSubLord = DASHA_ORDER[subSubLordIndex];
      const subSubLordYears = DASHA_YEARS[subSubLord];

      // Pratyantardasha duration = (Antardasha Years * SubSub Lord Years) / 120
      const durationYears = (antardashaDurationYears * subSubLordYears) / 120;
      const durationMs = durationYears * msPerYear;
      const currentEndMs = currentStartMs + durationMs;

      pratyantardashas.push({
        lord: subSubLord,
        startDateIso: new Date(currentStartMs).toISOString(),
        endDateIso: new Date(currentEndMs).toISOString(),
        durationYears,
      });

      currentStartMs = currentEndMs;
    }

    return pratyantardashas;
  }
}
