import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS, getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';
import { SphutaPoint, PrashnaSphutas } from './prashna.types';
import { calculateHouseAngles } from '../houses/house-cusps';
import { getMeanAyanamsa, SupportedAyanamsaSystem, DEFAULT_AYANAMSA_SYSTEM } from '../ayanamsa/ayanamsa';

export class PrashnaSphutaCalculator {
  /**
   * Computes the sidereal Ascendant for any given Julian Day UT and geographic coordinates
   * using standard astronomical equations (GMST, mean obliquity) and the engine ayanamsa
   * (default true Chitrapaksha Lahiri, ADR-017; mean value because the ascendant is mean-equinox).
   */
  public static calculateSiderealAscendant(
    julianDayUT: number,
    latitude: number,
    longitude: number,
    ayanamsaSystem: SupportedAyanamsaSystem = DEFAULT_AYANAMSA_SYSTEM
  ): number {
    const angles = calculateHouseAngles(julianDayUT, latitude, longitude);
    return normalizeDegree(angles.ascendantTropical - getMeanAyanamsa(julianDayUT, ayanamsaSystem));
  }

  /**
   * Computes Gulika's exact sidereal longitude and house placement following Prashna Marga.
   * Day or night is divided into 8 parts; Gulika corresponds to the Ascendant at the start of Saturn's part.
   */
  public static calculateGulika(
    questionDate: Date,
    sunriseIso: string,
    sunsetIso: string,
    dayIndex: number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    latitude: number,
    longitude: number,
    lagnaRashiIndex: number
  ): SphutaPoint {
    const questionMs = questionDate.getTime();
    const riseMs = new Date(sunriseIso).getTime();
    const setMs = new Date(sunsetIso).getTime();

    const isDayTime = questionMs >= riseMs && questionMs <= setMs;
    let gulikaMs: number;

    if (isDayTime) {
      const dayDuration = Math.max(0, setMs - riseMs);
      const partDuration = dayDuration / 8;
      // Saturn parts for day: Sun=6, Mon=5, Tue=4, Wed=3, Thu=2, Fri=1, Sat=0
      const dayElapsedParts = [6, 5, 4, 3, 2, 1, 0][dayIndex] ?? 0;
      gulikaMs = riseMs + dayElapsedParts * partDuration;
    } else {
      // Night calculation: determine whether before sunrise or after sunset
      let nightStartMs: number;
      let nightDuration: number;
      if (questionMs > setMs) {
        nightStartMs = setMs;
        // Night ends approximately at tomorrow's sunrise (~12h later)
        nightDuration = Math.max(0, 86400000 - (setMs - riseMs));
      } else {
        // Before sunrise: night started yesterday at sunset
        nightDuration = Math.max(0, 86400000 - (setMs - riseMs));
        nightStartMs = riseMs - nightDuration;
      }
      const partDuration = nightDuration / 8;
      // Saturn parts for night: Sun=2, Mon=1, Tue=0, Wed=6, Thu=5, Fri=4, Sat=3
      const nightElapsedParts = [2, 1, 0, 6, 5, 4, 3][dayIndex] ?? 0;
      gulikaMs = nightStartMs + nightElapsedParts * partDuration;
    }

    const gulikaJD = gulikaMs / 86400000 + 2440587.5;
    const gulikaLongitude = this.calculateSiderealAscendant(gulikaJD, latitude, longitude);

    return this.createSphutaPoint(
      'Gulika',
      'Gulika (Mandi)',
      gulikaLongitude,
      lagnaRashiIndex,
      'Ascendant rising at the start of Saturn\'s 1/8th diurnal/nocturnal portion (Prashna Marga)'
    );
  }

  /**
   * Helper to build a complete, strongly-typed SphutaPoint from a longitude.
   */
  public static createSphutaPoint(
    name: string,
    sanskritName: string,
    longitude: number,
    lagnaRashiIndex: number,
    formula: string
  ): SphutaPoint {
    const norm = normalizeDegree(longitude);
    const rashiDef = getRashiByLongitude(norm);
    const nakshatraDef = getNakshatraByLongitude(norm);
    const pada = getPada(norm);
    const degreeInRashi = getDegreeInRashi(norm);
    const house = ((rashiDef.index - lagnaRashiIndex + 12) % 12) + 1;

    return {
      name,
      sanskritName,
      longitude: norm,
      rashiIndex: rashiDef.index,
      rashiName: rashiDef.sanskritName,
      degreeInRashi,
      house,
      nakshatraIndex: nakshatraDef.index,
      nakshatraName: nakshatraDef.name,
      pada,
      nakshatraLord: nakshatraDef.lord,
      formula,
    };
  }

  /**
   * Computes the four foundational classical Prashna Marga Sphutas:
   * 1. Gulika (Mandi)
   * 2. Trisphuta: Lagna + Moon + Gulika
   * 3. Chatusphuta: Trisphuta + Sun
   * 4. Panchasphuta: Chatusphuta + Rahu
   */
  public static calculateAllSphutas(
    lagnaLongitude: number,
    lagnaRashiIndex: number,
    moonLongitude: number,
    sunLongitude: number,
    rahuLongitude: number,
    questionDate: Date,
    sunriseIso: string,
    sunsetIso: string,
    dayIndex: number,
    latitude: number,
    longitude: number
  ): PrashnaSphutas {
    const gulika = this.calculateGulika(
      questionDate,
      sunriseIso,
      sunsetIso,
      dayIndex,
      latitude,
      longitude,
      lagnaRashiIndex
    );

    const trisphutaLong = normalizeDegree(lagnaLongitude + moonLongitude + gulika.longitude);
    const trisphuta = this.createSphutaPoint(
      'Trisphuta',
      'Trisphuta',
      trisphutaLong,
      lagnaRashiIndex,
      'Lagna + Chandra + Gulika (mod 360°)'
    );

    const chatusphutaLong = normalizeDegree(trisphutaLong + sunLongitude);
    const chatusphuta = this.createSphutaPoint(
      'Chatusphuta',
      'Chatusphuta',
      chatusphutaLong,
      lagnaRashiIndex,
      'Trisphuta + Surya (mod 360°)'
    );

    const panchasphutaLong = normalizeDegree(chatusphutaLong + rahuLongitude);
    const panchasphuta = this.createSphutaPoint(
      'Panchasphuta',
      'Panchasphuta',
      panchasphutaLong,
      lagnaRashiIndex,
      'Chatusphuta + Rahu (mod 360°)'
    );

    return {
      gulika,
      trisphuta,
      chatusphuta,
      panchasphuta,
    };
  }
}

