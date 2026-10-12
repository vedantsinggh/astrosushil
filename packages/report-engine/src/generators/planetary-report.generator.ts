import {
  StructuredReportModel,
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
  MiniHoroscopeModel,
  TransitPlacementDto,
  TransitWindowDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import { SadeSatiCalculator } from '@astro/astrology-engine';

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

// Classical transit house impacts from Moon
const BENEFIC_TRANSIT_HOUSES: Record<string, number[]> = {
  SUN: [3, 6, 10, 11],
  MOON: [1, 3, 6, 7, 10, 11],
  MARS: [3, 6, 11],
  MERCURY: [2, 4, 6, 8, 10, 11],
  JUPITER: [2, 5, 7, 9, 11],
  VENUS: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  SATURN: [3, 6, 11],
  RAHU: [3, 6, 10, 11],
  KETU: [3, 6, 11],
};

export async function generatePlanetaryReport(
  profileInput: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    timezone?: string;
  },
  rawChartData: any,
  interpretationProvider: ReportInterpretationProvider
): Promise<StructuredReportModel & { miniHoroscopeData?: MiniHoroscopeModel }> {
  // 1. Validate complete astrology data
  validateAstrologyDataForReport(rawChartData);

  const chart = rawChartData.chart || rawChartData.data || rawChartData;
  const metadata = chart.config ? chart : (rawChartData.data?.metadata || chart.metadata || {});
  const configObj = chart.config || metadata.config || {};

  // 2. Profile
  const profile: ReportProfileDto = {
    name: profileInput.name || 'User Profile',
    dateOfBirth: profileInput.dateOfBirth,
    timeOfBirth: profileInput.timeOfBirth,
    placeName: profileInput.placeName || null,
    timezone: profileInput.timezone || 'Asia/Kolkata',
  };

  // 3. Config
  const configuration: ReportConfigDto = {
    zodiacType: String(configObj.zodiacType || 'SIDEREAL'),
    ayanamsa: String(configObj.ayanamsa || 'LAHIRI'),
    houseSystem: String(configObj.houseSystem || 'WHOLE_SIGN'),
    nodeCalculation: String(configObj.nodeCalculation || 'MEAN_NODE'),
  };

  // 4. Ascendant
  const asc = chart.ascendant;
  const ascSign = asc.rashiName || asc.sign || 'Aries';
  const ascendant: ReportAscendantDto = {
    sign: ascSign,
    degree: typeof asc.degreeInRashi === 'number' ? asc.degreeInRashi : (asc.degree || 0),
    nakshatra: asc.nakshatraName || asc.nakshatra || 'Ashwini',
    pada: asc.pada || 1,
  };

  // 5. Planets
  const planets: ReportPlanetDto[] = (chart.planets || []).map((p: any) => ({
    planet: String(p.planet || p.name).toUpperCase(),
    sign: p.rashiName || p.sign || 'Aries',
    degree: typeof p.degreeInRashi === 'number' ? p.degreeInRashi : (p.degree || 0),
    house: p.house || p.houseNumber || 1,
    nakshatra: p.nakshatraName || p.nakshatra || 'Ashwini',
    pada: p.pada || 1,
    isRetrograde: Boolean(p.isRetrograde),
  }));

  // 6. Houses (1 to 12)
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

  // 7. Nakshatra
  const moonPlanet = planets.find((p) => p.planet === 'MOON') || planets[0];
  const nakshatra: ReportNakshatraDto = {
    birthNakshatra: moonPlanet.nakshatra,
    pada: moonPlanet.pada,
    rulingPlanet: moonPlanet.planet === 'MOON' ? 'Moon' : 'Unknown',
    associatedInfo: `Moon placed in ${moonPlanet.sign} (${(typeof moonPlanet.degree === 'number' ? moonPlanet.degree : 0).toFixed(2)}°) in ${moonPlanet.nakshatra} Pada ${moonPlanet.pada}.`,
  };

  // 8. Deterministic Current Transits & 3-6 Month Forecast
  const natalMoonRashiIdx = SIGN_INDEX_MAP[(moonPlanet.sign || 'Aries').toUpperCase()] || 1;
  const natalLagnaRashiIdx = SIGN_INDEX_MAP[(ascSign || 'Aries').toUpperCase()] || 1;

  // Approximate current planetary ephemeris positions for deterministic reference
  // Saturn in Pisces (~345°), Jupiter in Taurus (~45°), Rahu in Pisces (~350°), Ketu in Virgo (~170°), Mars in Gemini (~80°)
  const ephemerisSnapshot: Array<{ planet: string; sign: string; signIdx: number; deg: number; isRetro: boolean }> = [
    { planet: 'SATURN', sign: 'Pisces', signIdx: 12, deg: 15.2, isRetro: false },
    { planet: 'JUPITER', sign: 'Taurus', signIdx: 2, deg: 18.5, isRetro: false },
    { planet: 'RAHU', sign: 'Pisces', signIdx: 12, deg: 20.1, isRetro: true },
    { planet: 'KETU', sign: 'Virgo', signIdx: 6, deg: 20.1, isRetro: true },
    { planet: 'MARS', sign: 'Gemini', signIdx: 3, deg: 11.4, isRetro: false },
    { planet: 'SUN', sign: 'Libra', signIdx: 7, deg: 24.0, isRetro: false },
    { planet: 'VENUS', sign: 'Scorpio', signIdx: 8, deg: 5.6, isRetro: false },
    { planet: 'MERCURY', sign: 'Libra', signIdx: 7, deg: 14.8, isRetro: false },
  ];

  const currentTransits: TransitPlacementDto[] = ephemerisSnapshot.map((t) => {
    const houseFromMoon = ((t.signIdx - natalMoonRashiIdx + 12) % 12) + 1;
    const houseFromLagna = ((t.signIdx - natalLagnaRashiIdx + 12) % 12) + 1;
    const isBenefic = (BENEFIC_TRANSIT_HOUSES[t.planet] || []).includes(houseFromMoon);

    return {
      planet: t.planet,
      currentSign: t.sign,
      currentDegree: t.deg,
      houseFromMoon,
      houseFromLagna,
      isRetrograde: t.isRetro,
      status: isBenefic ? 'FAVORABLE' : 'CHALLENGING',
      impactSummary: isBenefic
        ? `Transiting House ${houseFromMoon} from Moon: Classical Vedanga Gochara indicates positive support and strength.`
        : `Transiting House ${houseFromMoon} from Moon: Vedanga Gochara suggests caution, diligence, and extra patience.`,
    };
  });

  // 9. Sade Sati Status
  const rawMoonLong = ((chart.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'MOON'))?.longitude ?? 0;
  const transitSaturnLong = 345.0; // Pisces
  const sadeSatiResult = SadeSatiCalculator.evaluateSadeSati(rawMoonLong, transitSaturnLong);

  // 10. 3-to-6 Month Transit Windows
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  const transitWindows: TransitWindowDto[] = [
    {
      planet: 'JUPITER',
      event: 'Gochara Guru Transit through 2nd/5th/9th Axis',
      startDate: dateStr,
      endDate: new Date(today.getTime() + 90 * 86400000).toISOString().split('T')[0],
      significance: 'Expansion of professional contacts, higher wisdom, and familial stability.',
      recommendation: 'Favorable window for initiating long-term educational and financial plans.',
    },
    {
      planet: 'SATURN',
      event: 'Shani Gochara Stability Phase in Pisces',
      startDate: dateStr,
      endDate: new Date(today.getTime() + 180 * 86400000).toISOString().split('T')[0],
      significance: 'Karmic restructuring of spiritual discipline, expenses, and endurance.',
      recommendation: 'Maintain grounded routines, avoid speculative ventures, and honor commitments.',
    },
    {
      planet: 'MARS',
      event: 'Mangal Ingress & Energetic Shift',
      startDate: new Date(today.getTime() + 45 * 86400000).toISOString().split('T')[0],
      endDate: new Date(today.getTime() + 105 * 86400000).toISOString().split('T')[0],
      significance: 'High dynamic drive, proactive leadership, and potential for conflict if unchecked.',
      recommendation: 'Channel excess physical energy into focused productive work; avoid hasty arguments.',
    },
  ];

  // 11. Caution Periods
  const cautionPeriods = [
    {
      period: 'Next 60 Days',
      planet: 'SATURN & RAHU',
      caution: 'Saturn and Rahu occupy Pisces concurrently; avoid impulsive overseas commitments or major debt expansion.',
    },
    {
      period: 'Days 45 to 90',
      planet: 'MARS',
      caution: 'Mars transit accelerates impulsiveness; drive carefully and review agreements before signing.',
    },
  ];

  // 12. Interpretations
  const sections = await interpretationProvider.generateInterpretations(
    ReportType.PLANETARY_SUMMARY,
    rawChartData
  );

  const miniHoroscopeData: MiniHoroscopeModel = {
    version: '1.0',
    type: ReportType.PLANETARY_SUMMARY,
    title: 'Mini Horoscope & Transit Forecast',
    generatedAt: new Date().toISOString(),
    referenceDate: dateStr,
    forecastPeriod: 'Next 180 Days (6 Months)',
    profile,
    configuration,
    currentTransits,
    sadeSati: {
      isSadeSatiActive: sadeSatiResult.isSadeSatiActive,
      phase: sadeSatiResult.phase,
      phaseName: sadeSatiResult.phaseName,
      description: sadeSatiResult.description,
      isDhaiyyaActive: sadeSatiResult.isDhaiyyaActive,
      dhaiyyaName: sadeSatiResult.dhaiyyaName,
    },
    transitWindows,
    cautionPeriods,
    sections,
  };

  return {
    version: '1.0',
    type: ReportType.PLANETARY_SUMMARY,
    title: 'Mini Horoscope & Planetary Summary Report',
    generatedAt: new Date().toISOString(),
    profile,
    configuration,
    ascendant,
    planets,
    houses,
    nakshatra,
    sections,
    miniHoroscopeData,
  };
}
