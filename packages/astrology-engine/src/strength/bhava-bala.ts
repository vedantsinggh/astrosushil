import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiIndex, getDegreeInRashi, RASHIS } from '../zodiac/rashi';
import { calculateAspectValue } from './drik-bala';
import { BhavaBalaReport, HouseBhavaBala, ShadbalaReport } from './strength.types';

export type SignType = 'NARA' | 'JALA' | 'CHATUSHAPADA' | 'KEETA';

/**
 * Classifies a sign and degree into classical Parashari sign types for Dig Bala:
 * - Nara (Human): Gemini (3), Virgo (6), Libra (7), 1st half Sagittarius (9, 0-15°), Aquarius (11)
 * - Jala (Watery): Cancer (4), Pisces (12), 2nd half Capricorn (10, 15-30°)
 * - Chatushpada (Quadruped): Aries (1), Taurus (2), Leo (5), 2nd half Sagittarius (9, 15-30°), 1st half Capricorn (10, 0-15°)
 * - Keeta (Insect): Scorpio (8)
 */
export function getSignType(rashiIndex: number, degreeInRashi: number): SignType {
  switch (rashiIndex) {
    case 1: // Aries
    case 2: // Taurus
    case 5: // Leo
      return 'CHATUSHAPADA';
    case 3: // Gemini
    case 6: // Virgo
    case 7: // Libra
    case 11: // Aquarius
      return 'NARA';
    case 4: // Cancer
    case 12: // Pisces
      return 'JALA';
    case 8: // Scorpio
      return 'KEETA';
    case 9: // Sagittarius: 1st half Nara, 2nd half Chatushpada
      return degreeInRashi < 15.0 ? 'NARA' : 'CHATUSHAPADA';
    case 10: // Capricorn: 1st half Chatushpada, 2nd half Jala
      return degreeInRashi < 15.0 ? 'CHATUSHAPADA' : 'JALA';
    default:
      return 'NARA';
  }
}

/**
 * Calculates Bhava Dig Bala (Directional Strength) for a house cusp according to BPHS Ch. 29:
 * - Nara signs have full Dig Bala (60) in Lagna / East (1st cusp); zero in 7th cusp (West).
 * - Jala signs have full Dig Bala in Nadir / North (4th cusp); zero in 10th cusp (South).
 * - Chatushpada signs have full Dig Bala in Meridian / South (10th cusp); zero in 4th cusp (North).
 * - Keeta signs have full Dig Bala in Descendant / West (7th cusp); zero in 1st cusp (East).
 */
export function calculateBhavaDigBala(
  cuspLongitude: number,
  ascendantLongitude: number
): number {
  const rashiIndex = getRashiIndex(cuspLongitude);
  const degInRashi = getDegreeInRashi(cuspLongitude);
  const signType = getSignType(rashiIndex, degInRashi);

  let nirbalaLongitude = 0;
  switch (signType) {
    case 'NARA':
      // Powerful at 1st cusp (ascendant), Nirbala at 7th cusp
      nirbalaLongitude = normalizeDegree(ascendantLongitude + 180.0);
      break;
    case 'JALA':
      // Powerful at 4th cusp (+90°), Nirbala at 10th cusp (+270°)
      nirbalaLongitude = normalizeDegree(ascendantLongitude + 270.0);
      break;
    case 'CHATUSHAPADA':
      // Powerful at 10th cusp (+270°), Nirbala at 4th cusp (+90°)
      nirbalaLongitude = normalizeDegree(ascendantLongitude + 90.0);
      break;
    case 'KEETA':
      // Powerful at 7th cusp (+180°), Nirbala at 1st cusp (ascendant)
      nirbalaLongitude = normalizeDegree(ascendantLongitude);
      break;
  }

  let dist = normalizeDegree(cuspLongitude - nirbalaLongitude);
  if (dist > 180.0) {
    dist = 360.0 - dist;
  }

  // Max 60 Shashtiamsas at 180° from Nirbala point
  const bala = dist / 3.0;
  return Number(bala.toFixed(4));
}

/**
 * Calculates Bhava Drishti Bala (Aspectual Strength on the House Cusp) according to BPHS Ch. 29:
 * - Benefic aspects add +Aspect/4
 * - Malefic aspects subtract -Aspect/4
 */
export function calculateBhavaDrishtiBala(
  cuspLongitude: number,
  chart: AstroChart
): number {
  const benefics = [PlanetSymbol.JUPITER, PlanetSymbol.VENUS];
  const malefics = [
    PlanetSymbol.SUN,
    PlanetSymbol.MARS,
    PlanetSymbol.SATURN,
    PlanetSymbol.RAHU,
    PlanetSymbol.KETU,
  ];

  const sunPos = chart.planets[PlanetSymbol.SUN];
  const moonPos = chart.planets[PlanetSymbol.MOON];
  const isWaxingMoon =
    sunPos && moonPos
      ? normalizeDegree(moonPos.longitude - sunPos.longitude) <= 180
      : true;

  let netDrishti = 0;

  for (const [sym, pos] of Object.entries(chart.planets)) {
    const symbol = sym as PlanetSymbol;
    if (!pos) continue;

    const aspectValue = calculateAspectValue(pos.longitude, cuspLongitude, symbol);
    if (aspectValue <= 0) continue;

    const quarterAspect = aspectValue / 4.0;

    let isBenefic = false;
    if (benefics.includes(symbol)) {
      isBenefic = true;
    } else if (symbol === PlanetSymbol.MOON) {
      isBenefic = isWaxingMoon;
    } else if (symbol === PlanetSymbol.MERCURY) {
      // Mercury treated as benefic unless conjunct malefic
      isBenefic = true;
    } else if (malefics.includes(symbol)) {
      isBenefic = false;
    }

    if (isBenefic) {
      netDrishti += quarterAspect;
    } else {
      netDrishti -= quarterAspect;
    }
  }

  return Number(netDrishti.toFixed(4));
}

/**
 * Calculates Bhava Occupant Bala:
 * Planets occupying the house contribute to its strength:
 * Benefic occupants add +(Shadbala / 4); malefic occupants subtract -(Shadbala / 4).
 */
export function calculateBhavaOccupantBala(
  houseRashiIndex: number,
  chart: AstroChart,
  shadbalaReport: ShadbalaReport
): number {
  const benefics = [PlanetSymbol.JUPITER, PlanetSymbol.VENUS];
  const malefics = [
    PlanetSymbol.SUN,
    PlanetSymbol.MARS,
    PlanetSymbol.SATURN,
    PlanetSymbol.RAHU,
    PlanetSymbol.KETU,
  ];

  const sunPos = chart.planets[PlanetSymbol.SUN];
  const moonPos = chart.planets[PlanetSymbol.MOON];
  const isWaxingMoon =
    sunPos && moonPos
      ? normalizeDegree(moonPos.longitude - sunPos.longitude) <= 180
      : true;

  let occupantBala = 0;

  for (const [sym, pos] of Object.entries(chart.planets)) {
    const symbol = sym as PlanetSymbol;
    if (!pos || pos.rashiIndex !== houseRashiIndex) continue;

    const planetShadbala = shadbalaReport.planets[symbol]?.totalShashtiamsas ?? 0;
    const quarterBala = planetShadbala / 4.0;

    let isBenefic = false;
    if (benefics.includes(symbol)) {
      isBenefic = true;
    } else if (symbol === PlanetSymbol.MOON) {
      isBenefic = isWaxingMoon;
    } else if (symbol === PlanetSymbol.MERCURY) {
      isBenefic = true;
    } else if (malefics.includes(symbol)) {
      isBenefic = false;
    }

    if (isBenefic) {
      occupantBala += quarterBala;
    } else {
      occupantBala -= quarterBala;
    }
  }

  return Number(occupantBala.toFixed(4));
}

/**
 * Deterministically calculates Bhava Bala for all 12 houses of D1 (Natal Chart).
 */
export function calculateBhavaBala(
  chart: AstroChart,
  shadbalaReport: ShadbalaReport
): BhavaBalaReport {
  const ascLongitude = chart.ascendant?.longitude ?? 0;
  const ascRashi = chart.ascendant?.rashiIndex ?? getRashiIndex(ascLongitude);

  const houses: HouseBhavaBala[] = [];

  for (let houseNum = 1; houseNum <= 12; houseNum++) {
    // Determine cusp longitude and rashi
    let cuspLongitude: number;
    let rashiIndex: number;
    let signName: string;

    const existingPlacement = chart.houses?.find((h) => h.houseNumber === houseNum);
    if (existingPlacement) {
      cuspLongitude = existingPlacement.cuspLongitude;
      rashiIndex = existingPlacement.rashiIndex;
      signName = existingPlacement.rashiName;
    } else {
      // In Whole Sign system, house 1 starts at Lagna rashi
      rashiIndex = ((ascRashi - 1 + (houseNum - 1)) % 12) + 1;
      cuspLongitude = normalizeDegree(ascLongitude + (houseNum - 1) * 30.0);
      const rashiDef = RASHIS[rashiIndex - 1];
      signName = rashiDef.sanskritName;
    }

    const rashiDef = RASHIS[rashiIndex - 1];
    const lord = rashiDef.ruler as PlanetSymbol;

    // 1. Bhavadhipati Bala (Lord's Shadbala)
    const bhavadhipatiBala = shadbalaReport.planets[lord]?.totalShashtiamsas ?? 0;

    // 2. Bhava Dig Bala
    const bhavaDigBala = calculateBhavaDigBala(cuspLongitude, ascLongitude);

    // 3. Bhava Drishti Bala
    const bhavaDrishtiBala = calculateBhavaDrishtiBala(cuspLongitude, chart);

    // 4. Bhava Occupant Bala
    const bhavaOccupantBala = calculateBhavaOccupantBala(rashiIndex, chart, shadbalaReport);

    // Total in Shashtiamsas (Virupas)
    const totalShashtiamsas = Number(
      (bhavadhipatiBala + bhavaDigBala + bhavaDrishtiBala + bhavaOccupantBala).toFixed(4)
    );
    const totalRupas = Number((totalShashtiamsas / 60.0).toFixed(4));

    houses.push({
      houseNumber: houseNum,
      sign: signName,
      rashiIndex,
      lord,
      bhavadhipatiBala,
      bhavaDigBala,
      bhavaDrishtiBala,
      bhavaOccupantBala,
      totalShashtiamsas,
      totalRupas,
      rank: 1, // Will be ranked below
    });
  }

  // Rank houses by total strength descending (1 = strongest)
  const sorted = [...houses].sort((a, b) => b.totalShashtiamsas - a.totalShashtiamsas);
  sorted.forEach((h, index) => {
    const original = houses.find((item) => item.houseNumber === h.houseNumber);
    if (original) {
      original.rank = index + 1;
    }
  });

  return { houses };
}
