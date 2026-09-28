import { PlanetSymbol } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { RASHIS, getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import {
  CalculatedSpecialPoint,
  UpagrahasReport,
  SpecialLagnasReport,
  ArishtaPointsReport,
  YogiPointDetails,
  SpecialPointsReport,
} from './special-points.types';
import { evaluateAllMrityuBhaga } from './mrityu-bhaga';
import { PrashnaSphutaCalculator } from '../prashna/prashna-sphuta.calculator';
import { PanchangCalculator } from '../panchang/panchang-calculator';

// Planetary Ray units for Indu Lagna (BPHS / Jataka Parijata)
export const INDU_LAGNA_PLANETARY_RAYS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 30,
  [PlanetSymbol.MOON]: 16,
  [PlanetSymbol.MARS]: 6,
  [PlanetSymbol.MERCURY]: 8,
  [PlanetSymbol.JUPITER]: 10,
  [PlanetSymbol.VENUS]: 12,
  [PlanetSymbol.SATURN]: 1,
  [PlanetSymbol.RAHU]: 0,
  [PlanetSymbol.KETU]: 0,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

export class SpecialPointsCalculator {
  private panchangCalculator: PanchangCalculator;

  constructor(panchangCalculator?: PanchangCalculator) {
    this.panchangCalculator = panchangCalculator || new PanchangCalculator();
  }

  /**
   * Helper to construct a CalculatedSpecialPoint from a given sidereal longitude.
   */
  public createSpecialPoint(
    name: string,
    sanskritName: string,
    longitude: number,
    lagnaRashiIndex: number,
    formula: string,
    category: 'UPAGRAHA' | 'SPECIAL_LAGNA' | 'ARISHTA_POINT' | 'YOGI_POINT' | 'CHAMBER_POINT'
  ): CalculatedSpecialPoint {
    const norm = normalizeDegree(longitude);
    const rashiDef = getRashiByLongitude(norm);
    const nakshatraDef = getNakshatraByLongitude(norm);
    const pada = getPada(norm);
    const degreeInRashi = getDegreeInRashi(norm);
    const house = ((rashiDef.index - lagnaRashiIndex + 12) % 12) + 1;

    return {
      name,
      sanskritName,
      longitude: Number(norm.toFixed(4)),
      rashiIndex: rashiDef.index,
      rashiName: rashiDef.sanskritName,
      degreeInRashi: Number(degreeInRashi.toFixed(4)),
      house,
      nakshatraIndex: nakshatraDef.index,
      nakshatraName: nakshatraDef.name,
      pada,
      nakshatraLord: nakshatraDef.lord,
      formula,
      category,
    };
  }

  /**
   * Calculates the 5 Mathematical Upagrahas (Dhooma, Vyatipata, Parivesha, Indrachapa, Upaketu)
   * plus time-based Gulika and Mandi.
   */
  public calculateUpagrahas(
    sunLongitude: number,
    lagnaRashiIndex: number,
    birthDate: Date,
    latitude: number,
    longitude: number
  ): UpagrahasReport {
    // 1. Dhooma = Sun + 133°20' (4 signs 13°20' = 133.333333°)
    const dhoomaLong = normalizeDegree(sunLongitude + 133 + 20 / 60);
    const dhooma = this.createSpecialPoint(
      'Dhooma',
      'Dhuma',
      dhoomaLong,
      lagnaRashiIndex,
      'Surya + 133°20\'',
      'UPAGRAHA'
    );

    // 2. Vyatipata = 360° - Dhooma
    const vyatipataLong = normalizeDegree(360 - dhoomaLong);
    const vyatipata = this.createSpecialPoint(
      'Vyatipata',
      'Vyatipata (Pata)',
      vyatipataLong,
      lagnaRashiIndex,
      '360° - Dhuma',
      'UPAGRAHA'
    );

    // 3. Parivesha / Paridhi = Vyatipata + 180°
    const pariveshaLong = normalizeDegree(vyatipataLong + 180);
    const parivesha = this.createSpecialPoint(
      'Parivesha',
      'Parivesha (Paridhi)',
      pariveshaLong,
      lagnaRashiIndex,
      'Vyatipata + 180°',
      'UPAGRAHA'
    );

    // 4. Indrachapa / Kodanda = 360° - Parivesha
    const indrachapaLong = normalizeDegree(360 - pariveshaLong);
    const indrachapa = this.createSpecialPoint(
      'Indrachapa',
      'Indrachapa (Kodanda)',
      indrachapaLong,
      lagnaRashiIndex,
      '360° - Parivesha',
      'UPAGRAHA'
    );

    // 5. Upaketu / Sikhi = Indrachapa + 16°40' (16.666667°)
    const upaketuLong = normalizeDegree(indrachapaLong + 16 + 40 / 60);
    const upaketu = this.createSpecialPoint(
      'Upaketu',
      'Upaketu (Sikhi)',
      upaketuLong,
      lagnaRashiIndex,
      'Indrachapa + 16°40\'',
      'UPAGRAHA'
    );

    // 6 & 7. Gulika & Mandi (Time-based division)
    const sunTimes = this.panchangCalculator.calculateSunriseSunset(birthDate, latitude, longitude);
    const dayIndex = birthDate.getUTCDay();

    const gulikaSphuta = PrashnaSphutaCalculator.calculateGulika(
      birthDate,
      sunTimes.sunriseIso,
      sunTimes.sunsetIso,
      dayIndex,
      latitude,
      longitude,
      lagnaRashiIndex
    );

    const gulika = this.createSpecialPoint(
      'Gulika',
      'Gulika',
      gulikaSphuta.longitude,
      lagnaRashiIndex,
      'Ascendant rising at the start of Saturn\'s 1/8th diurnal/nocturnal portion (BPHS)',
      'UPAGRAHA'
    );

    // Mandi is rising at middle of Saturn's portion (offset by half of 1/8th portion)
    const mandiLong = normalizeDegree(gulikaSphuta.longitude + 1.875);
    const mandi = this.createSpecialPoint(
      'Mandi',
      'Mandi',
      mandiLong,
      lagnaRashiIndex,
      'Ascendant rising at the midpoint of Saturn\'s 1/8th diurnal/nocturnal portion',
      'UPAGRAHA'
    );

    return {
      dhooma,
      vyatipata,
      parivesha,
      indrachapa,
      upaketu,
      gulika,
      mandi,
    };
  }

  /**
   * Calculates Special Lagnas:
   * - Bhava Lagna (BL)
   * - Hora Lagna (HL)
   * - Ghatika Lagna (GL)
   * - Indu Lagna
   * - Pranapada Lagna
   * - Varnada Lagna
   */
  public calculateSpecialLagnas(
    chart: AstroChart,
    birthDate: Date,
    latitude: number,
    longitude: number
  ): SpecialLagnasReport {
    const ascLong = chart.ascendant?.longitude ?? 0;
    const ascRashi = chart.ascendant?.rashiIndex ?? 1;
    const sunLong = chart.planets[PlanetSymbol.SUN]?.longitude ?? 0;
    const moonLong = chart.planets[PlanetSymbol.MOON]?.longitude ?? 0;
    const moonRashi = chart.planets[PlanetSymbol.MOON]?.rashiIndex ?? 1;

    const sunTimes = this.panchangCalculator.calculateSunriseSunset(birthDate, latitude, longitude);
    const sunriseMs = new Date(sunTimes.sunriseIso).getTime();
    const birthMs = birthDate.getTime();

    // Elapsed time from sunrise in milliseconds
    const elapsedMs = Math.max(0, birthMs - sunriseMs);
    const elapsedHours = elapsedMs / 3600000;
    const elapsedGhatis = (elapsedMs / (24 * 60 * 1000)); // 1 Ghati = 24 minutes

    // 1. Bhava Lagna = Sun + (Elapsed Ghatis * 30° / 5) = Sun + (Elapsed Hours * 15°)
    const bhavaLagnaLong = normalizeDegree(sunLong + elapsedHours * 15);
    const bhavaLagna = this.createSpecialPoint(
      'Bhava Lagna',
      'Bhava Lagna',
      bhavaLagnaLong,
      ascRashi,
      'Surya + (Elapsed Time from Sunrise in Hours * 15°)',
      'SPECIAL_LAGNA'
    );

    // 2. Hora Lagna = Sun + (Elapsed Ghatis * 12°) = Sun + (Elapsed Hours * 30°)
    const horaLagnaLong = normalizeDegree(sunLong + elapsedHours * 30);
    const horaLagna = this.createSpecialPoint(
      'Hora Lagna',
      'Hora Lagna',
      horaLagnaLong,
      ascRashi,
      'Surya + (Elapsed Time from Sunrise in Hours * 30°)',
      'SPECIAL_LAGNA'
    );

    // 3. Ghatika Lagna = Sun + (Elapsed Ghatis * 30°) = Sun + (Elapsed Hours * 75°)
    const ghatikaLagnaLong = normalizeDegree(sunLong + elapsedGhatis * 30);
    const ghatikaLagna = this.createSpecialPoint(
      'Ghatika Lagna',
      'Ghatika Lagna',
      ghatikaLagnaLong,
      ascRashi,
      'Surya + (Elapsed Ghatis * 30°)',
      'SPECIAL_LAGNA'
    );

    // 4. Indu Lagna (Wealth Lagna)
    // 9th house from Lagna lord rays + 9th house from Moon lord rays -> sum mod 12 from Moon sign
    const ninthFromLagnaSign = ((ascRashi - 1 + 8) % 12) + 1;
    const ninthFromMoonSign = ((moonRashi - 1 + 8) % 12) + 1;

    const lord9Lagna = RASHIS[ninthFromLagnaSign - 1].ruler as PlanetSymbol;
    const lord9Moon = RASHIS[ninthFromMoonSign - 1].ruler as PlanetSymbol;

    const rays9Lagna = INDU_LAGNA_PLANETARY_RAYS[lord9Lagna] ?? 0;
    const rays9Moon = INDU_LAGNA_PLANETARY_RAYS[lord9Moon] ?? 0;
    const totalRays = rays9Lagna + rays9Moon;
    const remainder = totalRays % 12 === 0 ? 12 : totalRays % 12;

    const induLagnaSign = ((moonRashi - 1 + (remainder - 1)) % 12) + 1;
    const induLagnaLong = (induLagnaSign - 1) * 30 + (moonLong % 30);
    const induLagna = this.createSpecialPoint(
      'Indu Lagna',
      'Indu Lagna (Dhana Lagna)',
      induLagnaLong,
      ascRashi,
      `Chandra Rashi + (Rays of 9th from Lagna [${lord9Lagna}:${rays9Lagna}] + 9th from Moon [${lord9Moon}:${rays9Moon}] mod 12)`,
      'SPECIAL_LAGNA'
    );

    // 5. Pranapada Lagna
    // Pranapada = Sun + (Elapsed Vighatis / 15 * 30°) + Movable(0°), Fixed(240°), Dual(120°)
    const elapsedVighatis = elapsedGhatis * 60;
    const sunRashiModality = RASHIS[Math.floor(sunLong / 30)].modality;
    let modalityOffset = 0;
    if (sunRashiModality === 'STHIRA') modalityOffset = 240;
    else if (sunRashiModality === 'DVISVABHAVA') modalityOffset = 120;

    const pranapadaLong = normalizeDegree(sunLong + (elapsedVighatis * (30 / 15)) + modalityOffset);
    const pranapadaLagna = this.createSpecialPoint(
      'Pranapada Lagna',
      'Pranapada Lagna',
      pranapadaLong,
      ascRashi,
      'Surya + (Vighatis * 2°) + Solar Modality Offset',
      'SPECIAL_LAGNA'
    );

    // 6. Varnada Lagna (Jaimini / BPHS)
    const isOddLagna = ascRashi % 2 !== 0;
    const hlRashi = Math.floor(horaLagnaLong / 30) + 1;
    const isOddHL = hlRashi % 2 !== 0;

    const lagnaCount = isOddLagna ? ascRashi : (12 - ascRashi + 1);
    const hlCount = isOddHL ? hlRashi : (12 - hlRashi + 1);
    const combinedCount = (lagnaCount + hlCount) % 12 || 12;
    const varnadaSign = isOddLagna ? combinedCount : ((12 - combinedCount + 1 + 12) % 12 || 12);
    const varnadaLong = (varnadaSign - 1) * 30 + (ascLong % 30);

    const varnadaLagna = this.createSpecialPoint(
      'Varnada Lagna',
      'Varnada Lagna',
      varnadaLong,
      ascRashi,
      'Combination of Lagna and Hora Lagna count based on odd/even signs (Jaimini Upadesha)',
      'SPECIAL_LAGNA'
    );

    return {
      bhavaLagna,
      horaLagna,
      ghatikaLagna,
      induLagna,
      pranapadaLagna,
      varnadaLagna,
    };
  }

  /**
   * Calculates Arishta Points:
   * - 64th Navamsha (Moon & Ascendant)
   * - 22nd Drekkana (Ascendant & Moon)
   * - Sarpa Dreshkana detection for all planets
   */
  public calculateArishtaPoints(chart: AstroChart): ArishtaPointsReport {
    const ascLong = chart.ascendant?.longitude ?? 0;
    const ascRashi = chart.ascendant?.rashiIndex ?? 1;
    const moonLong = chart.planets[PlanetSymbol.MOON]?.longitude ?? 0;

    // 64th Navamsha is exactly the 8th house in D9 (spanning 210° ahead in Navamsha = 210° / 9 in sidereal space = 23°20')
    // Alternatively: exact point in 8th house from Moon/Asc in D9
    const sixtyFourthNavMoonLong = normalizeDegree(moonLong + 210);
    const sixtyFourthNavMoon = this.createSpecialPoint(
      '64th Navamsha (Moon)',
      '64th Navamsha (Khara Chandra)',
      sixtyFourthNavMoonLong,
      ascRashi,
      'Chandra + 210° (8th house cusp in Navamsha)',
      'ARISHTA_POINT'
    );

    const sixtyFourthNavAscLong = normalizeDegree(ascLong + 210);
    const sixtyFourthNavAsc = this.createSpecialPoint(
      '64th Navamsha (Lagna)',
      '64th Navamsha (Khara Lagna)',
      sixtyFourthNavAscLong,
      ascRashi,
      'Lagna + 210° (8th house cusp in Navamsha)',
      'ARISHTA_POINT'
    );

    // 22nd Drekkana is the 8th house in D3 (210° ahead in natal longitude)
    const twentySecondDrekAscLong = normalizeDegree(ascLong + 210);
    const twentySecondDrekAsc = this.createSpecialPoint(
      '22nd Drekkana (Lagna)',
      '22nd Drekkana (Kharesh)',
      twentySecondDrekAscLong,
      ascRashi,
      'Lagna + 210° (8th house in Drekkana D3)',
      'ARISHTA_POINT'
    );

    const twentySecondDrekMoonLong = normalizeDegree(moonLong + 210);
    const twentySecondDrekMoon = this.createSpecialPoint(
      '22nd Drekkana (Moon)',
      '22nd Drekkana (Kharesh Chandra)',
      twentySecondDrekMoonLong,
      ascRashi,
      'Chandra + 210° (8th house in Drekkana D3)',
      'ARISHTA_POINT'
    );

    // Sarpa Dreshkana:
    // Cancer (Rashi 4): 2nd & 3rd decanate (10° to 30°)
    // Scorpio (Rashi 8): 1st & 2nd decanate (0° to 20°)
    // Pisces (Rashi 12): 3rd decanate (20° to 30°)
    const sarpaDreshkanaPlacements = Object.entries(chart.planets).map(([symStr, pos]) => {
      const sym = symStr as PlanetSymbol;
      if (!pos || typeof pos.longitude !== 'number') {
        return {
          planet: sym,
          isSarpaDreshkana: false,
          decanateIndex: 1,
          signIndex: 1,
        };
      }
      const rashiIdx = pos.rashiIndex;
      const deg = pos.degreeInRashi;
      const decanateIndex = Math.min(3, Math.floor(deg / 10) + 1);

      let isSarpa = false;
      if (rashiIdx === 4 && (decanateIndex === 2 || decanateIndex === 3)) isSarpa = true;
      else if (rashiIdx === 8 && (decanateIndex === 1 || decanateIndex === 2)) isSarpa = true;
      else if (rashiIdx === 12 && decanateIndex === 3) isSarpa = true;

      return {
        planet: sym,
        isSarpaDreshkana: isSarpa,
        decanateIndex,
        signIndex: rashiIdx,
      };
    });

    return {
      sixtyFourthNavamshaMoon: sixtyFourthNavMoon,
      sixtyFourthNavamshaAscendant: sixtyFourthNavAsc,
      twentySecondDrekkanaAscendant: twentySecondDrekAsc,
      twentySecondDrekkanaMoon: twentySecondDrekMoon,
      sarpaDreshkanaPlacements,
    };
  }

  /**
   * Calculates Yogi, Avyogi, and Sahayogi (Duplicate Yogi) points.
   */
  public calculateYogiPoints(sunLongitude: number, moonLongitude: number, lagnaRashiIndex: number): YogiPointDetails {
    // Yogi Point = Sun + Moon + 93°20' (93.333333°)
    const yogiLong = normalizeDegree(sunLongitude + moonLongitude + 93 + 20 / 60);
    const yogiPoint = this.createSpecialPoint(
      'Yogi Point',
      'Yogi Sphuta',
      yogiLong,
      lagnaRashiIndex,
      'Surya + Chandra + 93°20\'',
      'YOGI_POINT'
    );

    const yogiNakDef = getNakshatraByLongitude(yogiLong);
    const yogiPlanet = yogiNakDef.lord;
    const yogiNakshatra = yogiNakDef.name;

    // Sahayogi (Duplicate Yogi) = Sign lord of the sign containing Yogi Point
    const yogiRashiDef = getRashiByLongitude(yogiLong);
    const duplicateYogiPlanet = yogiRashiDef.ruler as PlanetSymbol;

    // Avyogi Point = Yogi Point + 186°40' (186.666667°)
    const avyogiLong = normalizeDegree(yogiLong + 186 + 40 / 60);
    const avyogiPoint = this.createSpecialPoint(
      'Avyogi Point',
      'Avyogi Sphuta',
      avyogiLong,
      lagnaRashiIndex,
      'Yogi Sphuta + 186°40\'',
      'YOGI_POINT'
    );

    const avyogiNakDef = getNakshatraByLongitude(avyogiLong);
    const avyogiPlanet = avyogiNakDef.lord;
    const avyogiNakshatra = avyogiNakDef.name;

    return {
      yogiPoint,
      yogiPlanet,
      yogiNakshatra,
      avyogiPoint,
      avyogiPlanet,
      avyogiNakshatra,
      duplicateYogiPlanet,
    };
  }

  /**
   * Full composite execution method for all special points.
   */
  public calculateFromChart(
    chart: AstroChart,
    birthDate: Date,
    latitude: number,
    longitude: number
  ): SpecialPointsReport {
    const sunLong = chart.planets[PlanetSymbol.SUN]?.longitude ?? 0;
    const moonLong = chart.planets[PlanetSymbol.MOON]?.longitude ?? 0;
    const ascRashi = chart.ascendant?.rashiIndex ?? 1;
    const ascDeg = chart.ascendant?.degreeInRashi ?? 0;

    const upagrahas = this.calculateUpagrahas(sunLong, ascRashi, birthDate, latitude, longitude);
    const specialLagnas = this.calculateSpecialLagnas(chart, birthDate, latitude, longitude);
    const arishtaPoints = this.calculateArishtaPoints(chart);
    const yogiPoints = this.calculateYogiPoints(sunLong, moonLong, ascRashi);

    const mrityuBhaga = evaluateAllMrityuBhaga(
      chart.planets,
      { rashiIndex: ascRashi, degreeInRashi: ascDeg },
      1.0
    );

    return {
      upagrahas,
      specialLagnas,
      arishtaPoints,
      yogiPoints,
      mrityuBhaga,
    };
  }
}
