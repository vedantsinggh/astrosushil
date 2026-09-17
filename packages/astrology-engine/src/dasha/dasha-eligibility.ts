import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiIndex } from '../zodiac/rashi';
import type { AstroChart } from '../chart/astro-chart.types';
import { DashaEligibilityResult } from './dasha.types';
import { evaluateAshtottariEligibility, RASHI_LORD_BY_INDEX } from './ashtottari-eligibility';
export { RASHI_LORD_BY_INDEX };

/**
 * Resolves the Lagna Rashi index [1..12] from an AstroChart.
 */
export function resolveLagnaRashiIndex(chart: AstroChart): number {
  if (chart.ascendant && typeof chart.ascendant.rashiIndex === 'number') {
    return chart.ascendant.rashiIndex;
  }
  if (chart.ascendant && typeof chart.ascendant.longitude === 'number') {
    return getRashiIndex(chart.ascendant.longitude);
  }
  if (chart.houses && chart.houses.length > 0 && typeof chart.houses[0].rashiIndex === 'number') {
    return chart.houses[0].rashiIndex;
  }
  return 1;
}

/**
 * Resolves the Navamsha (D9) Rashi index [1..12] for a given longitude.
 */
export function getNavamshaRashiIndex(longitude: number): number {
  const norm = normalizeDegree(longitude);
  const rashiIndex = Math.floor(norm / 30) + 1;
  const degreeInSign = norm % 30;
  const span = 30 / 9;
  const part = Math.min(8, Math.floor(degreeInSign / span));
  const elementGroup = (rashiIndex - 1) % 4;
  let startSign = 1;
  if (elementGroup === 0) startSign = 1;  // Fiery: Aries
  if (elementGroup === 1) startSign = 10; // Earthy: Capricorn
  if (elementGroup === 2) startSign = 7;  // Airy: Libra
  if (elementGroup === 3) startSign = 4;  // Watery: Cancer
  return ((startSign - 1 + part) % 12) + 1;
}

/**
 * Resolves the Dwadasamsha (D12) Rashi index [1..12] for a given longitude.
 */
export function getDwadasamshaRashiIndex(longitude: number): number {
  const norm = normalizeDegree(longitude);
  const rashiIndex = Math.floor(norm / 30) + 1;
  const degreeInSign = norm % 30;
  const part = Math.min(11, Math.floor(degreeInSign / 2.5));
  return ((rashiIndex - 1 + part) % 12) + 1;
}

/**
 * Resolves planet placement Rashi index [1..12].
 */
export function getPlanetRashiIndex(chart: AstroChart, planet: PlanetSymbol): number {
  const pos = chart.planets[planet];
  if (pos && typeof pos.rashiIndex === 'number') {
    return pos.rashiIndex;
  }
  if (pos && typeof pos.longitude === 'number') {
    return getRashiIndex(pos.longitude);
  }
  return 1;
}

/**
 * Evaluates Parashari eligibility for Dwisaptati Sama Dasha (BPHS Ch. 46, Verses 27-31).
 * Condition: Lagna Lord is in 7th House OR 7th Lord is in Lagna (1st House).
 */
export function evaluateDwisaptatiSamaEligibility(chart: AstroChart): DashaEligibilityResult {
  const lagnaRashi = resolveLagnaRashiIndex(chart);
  const lagnaLord = RASHI_LORD_BY_INDEX[lagnaRashi] || PlanetSymbol.MARS;
  const lagnaLordRashi = getPlanetRashiIndex(chart, lagnaLord);
  const lagnaLordHouse = ((lagnaLordRashi - lagnaRashi + 12) % 12) + 1;

  const seventhRashi = ((lagnaRashi - 1 + 6) % 12) + 1;
  const seventhLord = RASHI_LORD_BY_INDEX[seventhRashi] || PlanetSymbol.VENUS;
  const seventhLordRashi = getPlanetRashiIndex(chart, seventhLord);
  const seventhLordHouse = ((seventhLordRashi - lagnaRashi + 12) % 12) + 1;

  const lagnaLordIn7th = (lagnaLordHouse === 7);
  const seventhLordIn1st = (seventhLordHouse === 1);
  const isEligible = lagnaLordIn7th || seventhLordIn1st;

  let reason = '';
  if (isEligible) {
    const matchedParts: string[] = [];
    if (lagnaLordIn7th) matchedParts.push(`Lagna Lord (${lagnaLord}) is in the 7th house`);
    if (seventhLordIn1st) matchedParts.push(`7th Lord (${seventhLord}) is in the 1st house (Lagna)`);
    reason = `Chart satisfies Parashari Dwisaptati Sama eligibility: ${matchedParts.join(' and ')}.`;
  } else {
    reason = `Chart does not satisfy Parashari Dwisaptati Sama eligibility: Lagna Lord (${lagnaLord}) is in house ${lagnaLordHouse} (not 7th), and 7th Lord (${seventhLord}) is in house ${seventhLordHouse} (not 1st).`;
  }

  return {
    isEligible,
    system: 'DWISAPTATI_SAMA',
    tradition: 'PARASHARA',
    eligibilityMethod: 'LAGNA_LORD_IN_7TH_OR_7TH_LORD_IN_1ST',
    reason,
    criteria: {
      lagnaRashi,
      lagnaLord,
      lagnaLordRashi,
      lagnaLordHouse,
      seventhRashi,
      seventhLord,
      seventhLordRashi,
      seventhLordHouse,
      lagnaLordIn7th,
      seventhLordIn1st,
    },
  };
}

/**
 * Evaluates Parashari eligibility for Shatabdika Dasha (BPHS Ch. 46, Verses 32-35).
 * Condition: Lagna is Vargottama (Lagna Rashi in D1 equals Lagna Rashi in D9 Navamsha).
 */
export function evaluateShatabdikaEligibility(chart: AstroChart): DashaEligibilityResult {
  const ascLon = chart.ascendant?.longitude ?? 0;
  const lagnaD1Rashi = resolveLagnaRashiIndex(chart);
  const lagnaD9Rashi = getNavamshaRashiIndex(ascLon);

  const isEligible = (lagnaD1Rashi === lagnaD9Rashi);
  const reason = isEligible
    ? `Chart satisfies Parashari Shatabdika eligibility: Lagna is Vargottama (D1 Rashi ${lagnaD1Rashi} === D9 Navamsha Rashi ${lagnaD9Rashi}).`
    : `Chart does not satisfy Parashari Shatabdika eligibility: Lagna is not Vargottama (D1 Rashi ${lagnaD1Rashi} vs D9 Navamsha Rashi ${lagnaD9Rashi}).`;

  return {
    isEligible,
    system: 'SHATABDIKA',
    tradition: 'PARASHARA',
    eligibilityMethod: 'LAGNA_VARGOTTAMA',
    reason,
    criteria: {
      ascendantLongitude: ascLon,
      lagnaD1Rashi,
      lagnaD9Rashi,
      isVargottama: isEligible,
    },
  };
}

/**
 * Evaluates Parashari eligibility for Chaturaseeti Sama Dasha (BPHS Ch. 46, Verses 36-39).
 * Condition: 10th Lord is in the 10th House (Karmesha karma-bhavasthe).
 */
export function evaluateChaturaseetiSamaEligibility(chart: AstroChart): DashaEligibilityResult {
  const lagnaRashi = resolveLagnaRashiIndex(chart);
  const tenthRashi = ((lagnaRashi - 1 + 9) % 12) + 1;
  const tenthLord = RASHI_LORD_BY_INDEX[tenthRashi] || PlanetSymbol.SATURN;
  const tenthLordRashi = getPlanetRashiIndex(chart, tenthLord);
  const tenthLordHouse = ((tenthLordRashi - lagnaRashi + 12) % 12) + 1;

  const isEligible = (tenthLordHouse === 10);
  const reason = isEligible
    ? `Chart satisfies Parashari Chaturaseeti Sama eligibility: 10th Lord (${tenthLord}) is in the 10th house.`
    : `Chart does not satisfy Parashari Chaturaseeti Sama eligibility: 10th Lord (${tenthLord}) is in house ${tenthLordHouse} (requires 10th house).`;

  return {
    isEligible,
    system: 'CHATURASEETI_SAMA',
    tradition: 'PARASHARA',
    eligibilityMethod: '10TH_LORD_IN_10TH_HOUSE',
    reason,
    criteria: {
      lagnaRashi,
      tenthRashi,
      tenthLord,
      tenthLordRashi,
      tenthLordHouse,
      isTenthLordIn10th: isEligible,
    },
  };
}

/**
 * Evaluates Parashari eligibility for Dwadashottari Dasha (BPHS Ch. 46, Verses 40-45).
 * Condition: Lagna is in the Navamsha of Venus (Taurus [2] or Libra [7] Navamsha).
 */
export function evaluateDwadashottariEligibility(chart: AstroChart): DashaEligibilityResult {
  const ascLon = chart.ascendant?.longitude ?? 0;
  const lagnaD9Rashi = getNavamshaRashiIndex(ascLon);

  const isEligible = (lagnaD9Rashi === 2 || lagnaD9Rashi === 7);
  const reason = isEligible
    ? `Chart satisfies Parashari Dwadashottari eligibility: Lagna Navamsha is Rashi ${lagnaD9Rashi} (${lagnaD9Rashi === 2 ? 'Taurus' : 'Libra'}, ruled by Venus).`
    : `Chart does not satisfy Parashari Dwadashottari eligibility: Lagna Navamsha is Rashi ${lagnaD9Rashi} (requires Venus Navamsha: Taurus [2] or Libra [7]).`;

  return {
    isEligible,
    system: 'DWADASHOTTARI',
    tradition: 'PARASHARA',
    eligibilityMethod: 'LAGNA_IN_VENUS_NAVAMSHA',
    reason,
    criteria: {
      ascendantLongitude: ascLon,
      lagnaD9Rashi,
      isVenusNavamsha: isEligible,
    },
  };
}

/**
 * Evaluates Parashari eligibility for Panchottari Dasha (BPHS Ch. 46, Verses 46-51).
 * Condition: Lagna in Cancer (Rashi 4) AND Dwadasamsha (D12) of Lagna is Cancer.
 */
export function evaluatePanchottariEligibility(chart: AstroChart): DashaEligibilityResult {
  const ascLon = chart.ascendant?.longitude ?? 0;
  const lagnaRashi = resolveLagnaRashiIndex(chart);
  const lagnaD12Rashi = getDwadasamshaRashiIndex(ascLon);

  const isLagnaCancer = (lagnaRashi === 4);
  const isD12Cancer = (lagnaD12Rashi === 4);
  const isEligible = isLagnaCancer && isD12Cancer;

  let reason = '';
  if (isEligible) {
    reason = 'Chart satisfies Parashari Panchottari eligibility: Lagna is Cancer (Rashi 4) and Lagna Dwadasamsha (D12) is Cancer.';
  } else {
    reason = `Chart does not satisfy Parashari Panchottari eligibility: Lagna is Rashi ${lagnaRashi} (requires Cancer [4]) and Lagna D12 is Rashi ${lagnaD12Rashi} (requires Cancer [4]).`;
  }

  return {
    isEligible,
    system: 'PANCHOTTARI',
    tradition: 'PARASHARA',
    eligibilityMethod: 'CANCER_LAGNA_AND_CANCER_DWADASAMSHA',
    reason,
    criteria: {
      ascendantLongitude: ascLon,
      lagnaRashi,
      lagnaD12Rashi,
      isLagnaCancer,
      isD12Cancer,
    },
  };
}

/**
 * Evaluates Jaimini Sthira Dasha eligibility (Universal).
 */
export function evaluateSthiraEligibility(_chart?: AstroChart): DashaEligibilityResult {
  return {
    isEligible: true,
    system: 'STHIRA',
    tradition: 'JAIMINI',
    eligibilityMethod: 'UNIVERSAL_JAIMINI_RASHI',
    reason: 'Sthira Dasha is applicable to all charts as a universal Jaimini longevity and lifecycle dasha.',
  };
}

/**
 * Evaluates Jaimini Shoola Dasha eligibility (Universal).
 */
export function evaluateShoolaEligibility(_chart?: AstroChart): DashaEligibilityResult {
  return {
    isEligible: true,
    system: 'SHOOLA',
    tradition: 'JAIMINI',
    eligibilityMethod: 'UNIVERSAL_JAIMINI_SHOOLA',
    reason: 'Shoola Dasha is applicable to all charts as a universal Jaimini longevity and critical period dasha.',
  };
}

/**
 * Evaluates Vimshottari Dasha eligibility (Universal).
 */
export function evaluateVimshottariEligibility(_chart?: AstroChart): DashaEligibilityResult {
  return {
    isEligible: true,
    system: 'VIMSHOTTARI',
    tradition: 'PARASHARA',
    eligibilityMethod: 'UNIVERSAL_PARASHARA_VIMSHOTTARI',
    reason: 'Vimshottari Dasha is universally applicable to all charts in the Kali Yuga.',
  };
}

/**
 * Evaluates Ashtottari Dasha eligibility and formats into standardized DashaEligibilityResult.
 */
export function evaluateAshtottariEligibilityStandard(chart: AstroChart): DashaEligibilityResult {
  const result = evaluateAshtottariEligibility(chart);
  return {
    isEligible: result.isEligible,
    system: 'ASHTOTTARI',
    tradition: 'PARASHARA',
    eligibilityMethod: result.eligibilityMethod,
    reason: result.reason,
    criteria: {
      rahuHouseFromLagna: result.rahuHouseFromLagna,
      rahuHouseFromLagnaLord: result.rahuHouseFromLagnaLord,
      lagnaLord: result.lagnaLord,
      isRahuInKendraOrTrikonaFromLagnaLord: result.isRahuInKendraOrTrikonaFromLagnaLord,
      isRahuInLagna: result.isRahuInLagna,
      paksha: result.paksha,
      birthTimeOfDay: result.birthTimeOfDay,
      meetsRahuCondition: result.meetsRahuCondition,
      meetsPakshaCondition: result.meetsPakshaCondition,
    },
  };
}
