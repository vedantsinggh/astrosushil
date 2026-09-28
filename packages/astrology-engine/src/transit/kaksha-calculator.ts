import { PlanetSymbol } from '../planets/planet.types';
import { AshtakavargaContributor, AshtakavargaResult, AshtakavargaPlanet } from '../ashtakavarga/ashtakavarga.types';
import { GocharaKakshaDetail } from './transit.types';
import { getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';

/**
 * Classical 8 Kaksha planetary rulers in order (from Saturn to Lagna).
 * Each Kaksha spans 3° 45' (3.75°).
 */
export const KAKSHA_RULERS_ORDER: AshtakavargaContributor[] = [
  AshtakavargaContributor.SATURN,
  AshtakavargaContributor.JUPITER,
  AshtakavargaContributor.MARS,
  AshtakavargaContributor.SUN,
  AshtakavargaContributor.VENUS,
  AshtakavargaContributor.MERCURY,
  AshtakavargaContributor.MOON,
  AshtakavargaContributor.LAGNA,
];

export const KAKSHA_SPAN_DEGREES = 3.75; // 3 degrees 45 arcminutes

export class KakshaCalculator {
  /**
   * Calculates the active Kaksha division for a transiting planet.
   *
   * @param planet Transiting planet symbol
   * @param longitude Transiting planet sidereal longitude [0.0, 360.0)
   * @param natalAshtakavarga Optional natal Ashtakavarga calculation result
   */
  public calculateKaksha(
    planet: PlanetSymbol,
    longitude: number,
    natalAshtakavarga?: AshtakavargaResult
  ): GocharaKakshaDetail {
    const rashiDef = getRashiByLongitude(longitude);
    const degreeInSign = getDegreeInRashi(longitude);

    let kakshaIndex = Math.floor(degreeInSign / KAKSHA_SPAN_DEGREES) + 1;
    if (kakshaIndex > 8) {
      kakshaIndex = 8;
    }

    const kakshaRuler = KAKSHA_RULERS_ORDER[kakshaIndex - 1];
    const startDegree = (kakshaIndex - 1) * KAKSHA_SPAN_DEGREES;
    const endDegree = kakshaIndex * KAKSHA_SPAN_DEGREES;

    let hasNatalBindu = false;
    if (natalAshtakavarga && natalAshtakavarga.bav) {
      const bavTable = natalAshtakavarga.bav[planet as AshtakavargaPlanet];
      if (bavTable && bavTable.prastara && bavTable.prastara[kakshaRuler]) {
        const contributorRow = bavTable.prastara[kakshaRuler];
        const rashiZeroIndex = rashiDef.index - 1;
        hasNatalBindu = (contributorRow[rashiZeroIndex] ?? 0) === 1;
      }
    }

    const description = `Kaksha ${kakshaIndex}/8 (${kakshaRuler}): ${startDegree.toFixed(2)}° - ${endDegree.toFixed(2)}° in ${rashiDef.sanskritName}. Bindu status: ${hasNatalBindu ? 'Benefic (Active)' : 'Inactive'}.`;

    return {
      transitPlanet: planet,
      transitSignIndex: rashiDef.index,
      transitSignName: rashiDef.sanskritName,
      degreeInSign,
      kakshaIndex,
      kakshaRuler,
      startDegree,
      endDegree,
      hasNatalBindu,
      description,
    };
  }
}

