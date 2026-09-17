import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiIndex } from '../zodiac/rashi';
import type { AstroChart } from '../chart/astro-chart.types';
import { AshtottariEligibility } from './dasha.types';

export const RASHI_LORD_BY_INDEX: Record<number, PlanetSymbol> = {
  1: PlanetSymbol.MARS,       // Aries (Mesha)
  2: PlanetSymbol.VENUS,      // Taurus (Vrishabha)
  3: PlanetSymbol.MERCURY,    // Gemini (Mithuna)
  4: PlanetSymbol.MOON,       // Cancer (Karka)
  5: PlanetSymbol.SUN,        // Leo (Simha)
  6: PlanetSymbol.MERCURY,    // Virgo (Kanya)
  7: PlanetSymbol.VENUS,      // Libra (Tula)
  8: PlanetSymbol.MARS,       // Scorpio (Vrischika)
  9: PlanetSymbol.JUPITER,    // Sagittarius (Dhanu)
  10: PlanetSymbol.SATURN,    // Capricorn (Makara)
  11: PlanetSymbol.SATURN,    // Aquarius (Kumbha)
  12: PlanetSymbol.JUPITER,   // Pisces (Meena)
};

/**
 * Evaluates classical Parashari eligibility criteria for Ashtottari Dasha (BPHS Ch. 46, Verses 12-13).
 *
 * Conditions:
 * 1. Rahu Kendra/Trikona Rule: Rahu is in Kendra (1, 4, 7, 10) or Trikona (1, 5, 9) from the Lagna Lord,
 *    and Rahu is NOT in the Lagna itself.
 * 2. Paksha & Diurnal/Nocturnal Rule: Birth is during Daytime in Krishna Paksha (waning Moon)
 *    OR during Nighttime in Shukla Paksha (waxing Moon).
 */
export function evaluateAshtottariEligibility(chart: AstroChart): AshtottariEligibility {
  // 1. Resolve Lagna Rashi index [1, 12]
  let lagnaRashi = 1;
  if (chart.ascendant && typeof chart.ascendant.rashiIndex === 'number') {
    lagnaRashi = chart.ascendant.rashiIndex;
  } else if (chart.ascendant && typeof chart.ascendant.longitude === 'number') {
    lagnaRashi = getRashiIndex(chart.ascendant.longitude);
  } else if (chart.houses && chart.houses.length > 0) {
    lagnaRashi = chart.houses[0].rashiIndex;
  }

  // 2. Resolve Lagna Lord
  const lagnaLord = RASHI_LORD_BY_INDEX[lagnaRashi] || PlanetSymbol.MARS;
  const lagnaLordPlanet = chart.planets[lagnaLord];
  const lagnaLordRashi = lagnaLordPlanet
    ? (lagnaLordPlanet.rashiIndex || getRashiIndex(lagnaLordPlanet.longitude))
    : lagnaRashi;

  // 3. Resolve Rahu Rashi
  const rahuPlanet = chart.planets[PlanetSymbol.RAHU];
  const rahuRashi = rahuPlanet
    ? (rahuPlanet.rashiIndex || getRashiIndex(rahuPlanet.longitude))
    : 1;

  // 4. Rahu houses relative to Lagna and Lagna Lord
  const rahuHouseFromLagna = ((rahuRashi - lagnaRashi + 12) % 12) + 1;
  const isRahuInLagna = (rahuHouseFromLagna === 1);

  const rahuHouseFromLagnaLord = ((rahuRashi - lagnaLordRashi + 12) % 12) + 1;
  const isKendra = [1, 4, 7, 10].includes(rahuHouseFromLagnaLord);
  const isTrikona = [1, 5, 9].includes(rahuHouseFromLagnaLord);
  const isRahuInKendraOrTrikonaFromLagnaLord = isKendra || isTrikona;

  const meetsRahuCondition = isRahuInKendraOrTrikonaFromLagnaLord && !isRahuInLagna;

  // 5. Paksha (Shukla / Krishna) from Moon-Sun elongation
  const sunLon = chart.planets[PlanetSymbol.SUN]?.longitude ?? 0;
  const moonLon = chart.planets[PlanetSymbol.MOON]?.longitude ?? 0;
  const elongation = normalizeDegree(moonLon - sunLon);
  const paksha: 'SHUKLA' | 'KRISHNA' = elongation < 180 ? 'SHUKLA' : 'KRISHNA';

  // 6. Day / Night birth from Sun's house position relative to Lagna
  const sunRashi = chart.planets[PlanetSymbol.SUN]?.rashiIndex ?? getRashiIndex(sunLon);
  const sunHouseFromLagna = ((sunRashi - lagnaRashi + 12) % 12) + 1;
  // Houses 7 through 12 are above the horizon (Day), Houses 1 through 6 are below the horizon (Night)
  const birthTimeOfDay: 'DAY' | 'NIGHT' = (sunHouseFromLagna >= 7 && sunHouseFromLagna <= 12) ? 'DAY' : 'NIGHT';

  const meetsPakshaCondition =
    (birthTimeOfDay === 'DAY' && paksha === 'KRISHNA') ||
    (birthTimeOfDay === 'NIGHT' && paksha === 'SHUKLA');

  const isEligible = meetsRahuCondition && meetsPakshaCondition;

  // Build descriptive reason
  const reasons: string[] = [];
  if (isRahuInLagna) {
    reasons.push('Rahu is placed in Lagna (disqualifying under Parashari Ashtottari rule)');
  } else if (isRahuInKendraOrTrikonaFromLagnaLord) {
    reasons.push(`Rahu is in house ${rahuHouseFromLagnaLord} (${isKendra ? 'Kendra' : 'Trikona'}) from Lagna Lord ${lagnaLord}`);
  } else {
    reasons.push(`Rahu is in house ${rahuHouseFromLagnaLord} from Lagna Lord ${lagnaLord} (neither Kendra nor Trikona)`);
  }

  if (meetsPakshaCondition) {
    reasons.push(`birth occurs during ${birthTimeOfDay.toLowerCase()} time in ${paksha.toLowerCase()} paksha`);
  } else {
    reasons.push(`birth occurs during ${birthTimeOfDay.toLowerCase()} time in ${paksha.toLowerCase()} paksha (requires day/krishna or night/shukla)`);
  }

  const reason = isEligible
    ? `Chart fully satisfies classical Parashari Ashtottari eligibility: ${reasons.join(', ')}.`
    : `Chart does not satisfy classical Parashari Ashtottari eligibility: ${reasons.join(', ')}.`;

  return {
    isEligible,
    rahuHouseFromLagna,
    rahuHouseFromLagnaLord,
    lagnaLord,
    isRahuInKendraOrTrikonaFromLagnaLord,
    isRahuInLagna,
    paksha,
    birthTimeOfDay,
    meetsRahuCondition,
    meetsPakshaCondition,
    eligibilityMethod: 'COMBINED',
    reason,
  };
}
