import {
  StructuredReportModel,
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
  DoshaAnalysisDto,
  GemstoneRecommendationsDto,
  VimshottariDashaDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import { DashaCalculator, SadeSatiCalculator, MatchmakingCalculator } from '@astro/astrology-engine';

const SIGN_INDEX_MAP: Record<string, number> = {
  ARIES: 1, MESHA: 1,
  TAURUS: 2, VRISHABHA: 2,
  GEMINI: 3, MITHUNA: 3,
  CANCER: 4, KARKA: 4,
  LEO: 5, SIMHA: 5,
  VIRGO: 6, KANYA: 6,
  LIBRA: 7, TULA: 7,
  SCORPIO: 8, VRISCHIKA: 8,
  SAGITTARIUS: 9, DHANU: 9,
  CAPRICORN: 10, MAKARA: 10,
  AQUARIUS: 11, KUMBHA: 11,
  PISCES: 12, MEENA: 12,
};

const SIGN_NAMES_BY_INDEX: Record<number, string> = {
  1: 'Aries', 2: 'Taurus', 3: 'Gemini', 4: 'Cancer',
  5: 'Leo', 6: 'Virgo', 7: 'Libra', 8: 'Scorpio',
  9: 'Sagittarius', 10: 'Capricorn', 11: 'Aquarius', 12: 'Pisces',
};

const SIGN_LORDS: Record<number, { lord: string; gemstone: string; sanskritName: string; finger: string; metal: string }> = {
  1: { lord: 'Mars', gemstone: 'Red Coral', sanskritName: 'Moonga', finger: 'Ring Finger', metal: 'Copper / Gold' },
  2: { lord: 'Venus', gemstone: 'Diamond / White Sapphire', sanskritName: 'Heera', finger: 'Middle / Little Finger', metal: 'Silver / White Gold' },
  3: { lord: 'Mercury', gemstone: 'Emerald', sanskritName: 'Panna', finger: 'Little Finger', metal: 'Gold / Silver' },
  4: { lord: 'Moon', gemstone: 'Natural Pearl', sanskritName: 'Moti', finger: 'Little Finger', metal: 'Silver' },
  5: { lord: 'Sun', gemstone: 'Ruby', sanskritName: 'Manik', finger: 'Ring Finger', metal: 'Gold / Copper' },
  6: { lord: 'Mercury', gemstone: 'Emerald', sanskritName: 'Panna', finger: 'Little Finger', metal: 'Gold / Silver' },
  7: { lord: 'Venus', gemstone: 'Diamond / White Sapphire', sanskritName: 'Heera', finger: 'Middle / Little Finger', metal: 'Silver / White Gold' },
  8: { lord: 'Mars', gemstone: 'Red Coral', sanskritName: 'Moonga', finger: 'Ring Finger', metal: 'Copper / Gold' },
  9: { lord: 'Jupiter', gemstone: 'Yellow Sapphire', sanskritName: 'Pukhraj', finger: 'Index Finger', metal: 'Gold' },
  10: { lord: 'Saturn', gemstone: 'Blue Sapphire', sanskritName: 'Neelam', finger: 'Middle Finger', metal: 'Silver / Panchdhatu' },
  11: { lord: 'Saturn', gemstone: 'Blue Sapphire', sanskritName: 'Neelam', finger: 'Middle Finger', metal: 'Silver / Panchdhatu' },
  12: { lord: 'Jupiter', gemstone: 'Yellow Sapphire', sanskritName: 'Pukhraj', finger: 'Index Finger', metal: 'Gold' },
};

export async function generateKundliReport(
  profileInput: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    timezone?: string;
  },
  rawChartData: any,
  interpretationProvider: ReportInterpretationProvider
): Promise<StructuredReportModel> {
  // 1. Validate complete astrology data
  validateAstrologyDataForReport(rawChartData);

  const chart = rawChartData.chart || rawChartData.data || rawChartData;
  const metadata = chart.config ? chart : (rawChartData.data?.metadata || chart.metadata || {});
  const configObj = chart.config || metadata.config || {};

  // 2. Map Profile
  const profile: ReportProfileDto = {
    name: profileInput.name || 'User Profile',
    dateOfBirth: profileInput.dateOfBirth,
    timeOfBirth: profileInput.timeOfBirth,
    placeName: profileInput.placeName || null,
    timezone: profileInput.timezone || 'Asia/Kolkata',
  };

  // 3. Map Config
  const configuration: ReportConfigDto = {
    zodiacType: String(configObj.zodiacType || 'SIDEREAL'),
    ayanamsa: String(configObj.ayanamsa || 'LAHIRI'),
    houseSystem: String(configObj.houseSystem || 'WHOLE_SIGN'),
    nodeCalculation: String(configObj.nodeCalculation || 'MEAN_NODE'),
  };

  // 4. Map Ascendant
  const asc = chart.ascendant;
  const ascendantSign = asc.rashiName || asc.sign || 'Aries';
  const ascendant: ReportAscendantDto = {
    sign: ascendantSign,
    degree: typeof asc.degreeInRashi === 'number' ? asc.degreeInRashi : (asc.degree || 0),
    nakshatra: asc.nakshatraName || asc.nakshatra || 'Ashwini',
    pada: asc.pada || 1,
  };

  // 5. Map Planets
  const planets: ReportPlanetDto[] = (chart.planets || []).map((p: any) => ({
    planet: String(p.planet || p.name).toUpperCase(),
    sign: p.rashiName || p.sign || 'Aries',
    degree: typeof p.degreeInRashi === 'number' ? p.degreeInRashi : (p.degree || 0),
    house: p.house || p.houseNumber || 1,
    nakshatra: p.nakshatraName || p.nakshatra || 'Ashwini',
    pada: p.pada || 1,
    isRetrograde: Boolean(p.isRetrograde),
  }));

  // 6. Map Houses (1 to 12)
  const houses: ReportHouseDto[] = [];
  for (let h = 1; h <= 12; h++) {
    const rawHouse = (chart.houses || []).find((houseObj: any) => houseObj.houseNumber === h || houseObj.number === h) || chart.houses?.[h - 1] || {};
    const planetsInHouse = planets
      .filter((p) => p.house === h)
      .map((p) => p.planet);

    houses.push({
      houseNumber: h,
      sign: rawHouse.rashiName || rawHouse.sign || `House ${h} Sign`,
      planetsPresent: planetsInHouse,
    });
  }

  // 7. Map Nakshatra (Moon Nakshatra)
  const moonPlanet = planets.find((p) => p.planet === 'MOON') || planets[0];
  const nakshatra: ReportNakshatraDto = {
    birthNakshatra: moonPlanet.nakshatra,
    pada: moonPlanet.pada,
    rulingPlanet: moonPlanet.planet === 'MOON' ? 'Moon' : 'Unknown',
    associatedInfo: `Moon placed in ${moonPlanet.sign} (${(typeof moonPlanet.degree === 'number' ? moonPlanet.degree : 0).toFixed(2)}°) in ${moonPlanet.nakshatra} Pada ${moonPlanet.pada}.`,
  };

  // 8. Chandra Kundli (Moon Chart)
  const moonSignNorm = (moonPlanet.sign || 'Aries').toUpperCase();
  const moonRashiIndex = SIGN_INDEX_MAP[moonSignNorm] || 1;
  const chandraHouses: ReportHouseDto[] = [];
  for (let h = 1; h <= 12; h++) {
    const houseRashiIdx = ((moonRashiIndex - 1 + (h - 1)) % 12) + 1;
    const signName = SIGN_NAMES_BY_INDEX[houseRashiIdx] || `Rashi ${houseRashiIdx}`;
    const planetsInHouse = planets
      .filter((p) => {
        const pRashiIdx = SIGN_INDEX_MAP[(p.sign || '').toUpperCase()] || 1;
        const pHouseFromMoon = ((pRashiIdx - moonRashiIndex + 12) % 12) + 1;
        return pHouseFromMoon === h;
      })
      .map((p) => p.planet);

    chandraHouses.push({
      houseNumber: h,
      sign: signName,
      planetsPresent: planetsInHouse,
    });
  }

  // 9. Vimshottari Dasha Calculation
  let vimshottariDasha: VimshottariDashaDto | undefined;
  try {
    const rawMoon = (chart.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'MOON');
    const moonLong = typeof rawMoon?.longitude === 'number' ? rawMoon.longitude : 0;
    const birthDate = new Date(`${profileInput.dateOfBirth}T${profileInput.timeOfBirth || '12:00:00'}Z`);
    const validDate = isNaN(birthDate.getTime()) ? new Date() : birthDate;

    const dashaCalc = new DashaCalculator();
    const dashaTree = dashaCalc.calculateVimshottariDasha(moonLong, validDate, { maxLevel: 2 });
    const activeDasha = dashaCalc.getActiveDasha(dashaTree, new Date());

    if (activeDasha) {
      vimshottariDasha = {
        currentMahadasha: activeDasha.mahadasha.lord,
        currentAntardasha: activeDasha.antardasha?.lord || activeDasha.mahadasha.lord,
        currentPratyantardasha: activeDasha.pratyantardasha?.lord,
        currentCycleStart: activeDasha.mahadasha.startDateIso.split('T')[0],
        currentCycleEnd: activeDasha.mahadasha.endDateIso.split('T')[0],
        timeline: dashaTree.mahadashas.map((m) => ({
          planet: m.lord,
          startDate: m.startDateIso.split('T')[0],
          endDate: m.endDateIso.split('T')[0],
          durationYears: m.durationYears,
          isCurrent: m.lord === activeDasha.mahadasha.lord,
        })),
      };
    } else if (dashaTree.mahadashas.length > 0) {
      const first = dashaTree.mahadashas[0];
      vimshottariDasha = {
        currentMahadasha: first.lord,
        currentAntardasha: first.lord,
        currentCycleStart: first.startDateIso.split('T')[0],
        currentCycleEnd: first.endDateIso.split('T')[0],
        timeline: dashaTree.mahadashas.map((m) => ({
          planet: m.lord,
          startDate: m.startDateIso.split('T')[0],
          endDate: m.endDateIso.split('T')[0],
          durationYears: m.durationYears,
          isCurrent: false,
        })),
      };
    }
  } catch (_e) {
    // If dasha calculation cannot resolve date, provide fallback timeline
  }

  // 10. Dosha Analysis
  // A. Manglik Dosha
  const marsPlanet = planets.find((p) => p.planet === 'MARS');
  const marsHouse = marsPlanet ? marsPlanet.house : 1;
  const isMarsInManglikHouse = [1, 4, 7, 8, 12].includes(marsHouse);
  const manglikSeverity = isMarsInManglikHouse ? (marsHouse === 7 || marsHouse === 8 ? 'HIGH' : 'MEDIUM') : 'NONE';
  const manglikDesc = isMarsInManglikHouse
    ? `Mars is placed in House ${marsHouse} (Kendra/Dusthana placement from Lagna), indicating ${manglikSeverity} Kuja / Manglik influence.`
    : `Mars is placed in House ${marsHouse}, which is outside the canonical Manglik placements (1, 4, 7, 8, 12). No significant Manglik dosha.`;

  // B. Sade Sati
  const rawMoonLong = ((chart.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'MOON'))?.longitude ?? 0;
  // Current Saturn longitude approx (Pisces ~345 deg)
  const transitSaturnLong = 345.0;
  const sadeSatiResult = SadeSatiCalculator.evaluateSadeSati(rawMoonLong, transitSaturnLong);

  // C. Kaal Sarp Check
  // Check if all 7 planets are between Rahu and Ketu
  const rahuPlanet = (chart.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'RAHU');
  const ketuPlanet = (chart.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'KETU');
  let isKaalSarp = false;
  if (rahuPlanet && ketuPlanet && typeof rahuPlanet.longitude === 'number' && typeof ketuPlanet.longitude === 'number') {
    const rahuLong = rahuPlanet.longitude;
    const ketuLong = ketuPlanet.longitude;
    const physicalPlanets = (chart.planets || []).filter((p: any) => {
      const name = String(p.planet || p.name).toUpperCase();
      return ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'].includes(name);
    });

    const isSideA = physicalPlanets.every((p: any) => {
      const l = p.longitude;
      return (rahuLong <= ketuLong) ? (l >= rahuLong && l <= ketuLong) : (l >= rahuLong || l <= ketuLong);
    });
    const isSideB = physicalPlanets.every((p: any) => {
      const l = p.longitude;
      return (ketuLong <= rahuLong) ? (l >= ketuLong && l <= rahuLong) : (l >= ketuLong || l <= rahuLong);
    });
    isKaalSarp = isSideA || isSideB;
  }

  const doshaAnalysis: DoshaAnalysisDto = {
    manglik: {
      isManglik: isMarsInManglikHouse,
      severity: manglikSeverity as any,
      description: manglikDesc,
      cancellingFactors: isMarsInManglikHouse && marsPlanet?.sign === 'Aries' ? ['Mars placed in own sign Aries'] : [],
    },
    sadeSati: {
      isSadeSatiActive: sadeSatiResult.isSadeSatiActive,
      phase: sadeSatiResult.phase,
      phaseName: sadeSatiResult.phaseName,
      description: sadeSatiResult.description,
      isDhaiyyaActive: sadeSatiResult.isDhaiyyaActive,
      dhaiyyaName: sadeSatiResult.dhaiyyaName,
    },
    kaalSarp: {
      isKaalSarpPresent: isKaalSarp,
      typeName: isKaalSarp ? 'Anant Kaal Sarp Yoga' : 'No Kaal Sarp Yoga',
      description: isKaalSarp
        ? 'All 7 classical physical grahas are hemmed between the Rahu-Ketu lunar node axis.'
        : 'Planets are distributed across both sides of the Rahu-Ketu axis. No Kaal Sarp yoga detected.',
    },
  };

  // 11. Deterministic Gemstone Recommendations (Lagna, 5th, 9th Trikona Lords)
  const lagnaRashiIdx = SIGN_INDEX_MAP[ascendantSign.toUpperCase()] || 1;
  const fifthHouseIdx = ((lagnaRashiIdx - 1 + 4) % 12) + 1;
  const ninthHouseIdx = ((lagnaRashiIdx - 1 + 8) % 12) + 1;

  const lagnaLordInfo = SIGN_LORDS[lagnaRashiIdx];
  const fifthLordInfo = SIGN_LORDS[fifthHouseIdx];
  const ninthLordInfo = SIGN_LORDS[ninthHouseIdx];

  const gemstoneRecommendations: GemstoneRecommendationsDto = {
    lagnaGem: {
      gemstone: lagnaLordInfo.gemstone,
      sanskritName: lagnaLordInfo.sanskritName,
      finger: lagnaLordInfo.finger,
      metal: lagnaLordInfo.metal,
      rulingLord: lagnaLordInfo.lord,
      purpose: 'Life Stone (Jeevan Ratna) - Enhances health, longevity, physical vitality, and overall identity.',
      caution: 'Ensure natural, untreated gemstone. Consult before wearing if lagna lord rules dusthanas.',
      isRecommended: true,
    },
    luckyGem5th: {
      gemstone: fifthLordInfo.gemstone,
      sanskritName: fifthLordInfo.sanskritName,
      finger: fifthLordInfo.finger,
      metal: fifthLordInfo.metal,
      rulingLord: fifthLordInfo.lord,
      purpose: 'Lucky Stone (Karaka Ratna) - Strengthens intellect, learning, creativity, and children.',
      caution: 'Wear on an auspicious Shukla Paksha day during the hora of the ruling lord.',
      isRecommended: true,
    },
    fortuneGem9th: {
      gemstone: ninthLordInfo.gemstone,
      sanskritName: ninthLordInfo.sanskritName,
      finger: ninthLordInfo.finger,
      metal: ninthLordInfo.metal,
      rulingLord: ninthLordInfo.lord,
      purpose: 'Fortune Stone (Bhagya Ratna) - Activates dharma, higher fortune, divine grace, and prosperity.',
      caution: 'Perform proper purification (Prana Pratishtha) before first wear.',
      isRecommended: true,
    },
    generalAdvisory:
      'NOTE ON METHODOLOGY: Gemstone recommendations are derived strictly from the auspicious Trikona house lords (1st, 5th, and 9th). Calculated astrological facts are distinguished from recommendations. Always verify with a qualified practitioner before wearing.',
  };

  // 12. Generate Interpretations
  const sections = await interpretationProvider.generateInterpretations(
    ReportType.KUNDLI,
    rawChartData
  );

  return {
    version: '1.0',
    type: ReportType.KUNDLI,
    title: 'Birth Chart & Kundli Report',
    generatedAt: new Date().toISOString(),
    profile,
    configuration,
    ascendant,
    planets,
    houses,
    nakshatra,
    sections,
    chandraKundli: {
      moonSign: moonPlanet.sign,
      houses: chandraHouses,
    },
    vimshottariDasha,
    doshaAnalysis,
    gemstoneRecommendations,
  };
}
