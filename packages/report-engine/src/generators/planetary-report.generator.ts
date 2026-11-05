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
import { SadeSatiCalculator, TransitCalculator, PlanetSymbol, RASHIS } from '@astro/astrology-engine';

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

  // 8. Deterministic Dynamic Current Transits & 3-6 Month Forecast
  const natalMoonRashiIdx = SIGN_INDEX_MAP[(moonPlanet.sign || 'Aries').toUpperCase()] || 1;
  const natalLagnaRashiIdx = SIGN_INDEX_MAP[(ascSign || 'Aries').toUpperCase()] || 1;

  const targetDate = (profileInput as any).calculationDate
    ? new Date((profileInput as any).calculationDate)
    : new Date();
  const calcDate = isNaN(targetDate.getTime()) ? new Date() : targetDate;
  const dateStr = calcDate.toISOString().split('T')[0];

  const transitCalculator = new TransitCalculator();
  const transitChart = await transitCalculator.calculateTransitChart({
    timestampIso: calcDate.toISOString(),
    timezone: profileInput.timezone || 'UTC',
    location: {
      latitude: (profileInput as any).latitude ?? 28.6139,
      longitude: (profileInput as any).longitude ?? 77.2090,
      placeName: profileInput.placeName ?? 'Default Location',
      timezone: profileInput.timezone || 'UTC',
    },
  });

  const transitPlanetsList: PlanetSymbol[] = [
    PlanetSymbol.SATURN,
    PlanetSymbol.JUPITER,
    PlanetSymbol.RAHU,
    PlanetSymbol.KETU,
    PlanetSymbol.MARS,
    PlanetSymbol.SUN,
    PlanetSymbol.VENUS,
    PlanetSymbol.MERCURY,
  ];

  const currentTransits: TransitPlacementDto[] = transitPlanetsList.map((pSym) => {
    const tPos = transitChart.planets[pSym];
    const signIdx = tPos?.rashiIndex ?? 1;
    const signDef = RASHIS[signIdx - 1];
    const signName = signDef ? signDef.englishName : (SIGN_NAMES_BY_INDEX[signIdx] || 'Aries');
    const deg = tPos ? parseFloat(tPos.degreeInRashi.toFixed(1)) : 0.0;
    const isRetro = tPos ? tPos.isRetrograde : false;

    const houseFromMoon = ((signIdx - natalMoonRashiIdx + 12) % 12) + 1;
    const houseFromLagna = ((signIdx - natalLagnaRashiIdx + 12) % 12) + 1;
    const isBenefic = (BENEFIC_TRANSIT_HOUSES[pSym] || []).includes(houseFromMoon);

    return {
      planet: pSym,
      currentSign: signName,
      currentDegree: deg,
      houseFromMoon,
      houseFromLagna,
      isRetrograde: isRetro,
      status: isBenefic ? 'FAVORABLE' : 'CHALLENGING',
      impactSummary: isBenefic
        ? `Transiting House ${houseFromMoon} from Moon: Classical Vedanga Gochara indicates positive support and strength.`
        : `Transiting House ${houseFromMoon} from Moon: Vedanga Gochara suggests caution, diligence, and extra patience.`,
    };
  });

  // 9. Neutral Saturn Transit Analysis (without dosha classification)
  const rawMoonLong = ((chart.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'MOON'))?.longitude ?? 0;
  const transitSaturnPos = transitChart.planets[PlanetSymbol.SATURN];
  const transitSaturnLong = transitSaturnPos?.longitude ?? 345.0;
  const sadeSatiResult = SadeSatiCalculator.evaluateSadeSati(rawMoonLong, transitSaturnLong);

  // 10. 3-to-6 Month Transit Windows
  const saturnSign = currentTransits.find((t) => t.planet === 'SATURN')?.currentSign || 'Pisces';
  const jupiterSign = currentTransits.find((t) => t.planet === 'JUPITER')?.currentSign || 'Taurus';

  const transitWindows: TransitWindowDto[] = [
    {
      planet: 'JUPITER',
      event: `Gochara Guru Transit in ${jupiterSign}`,
      startDate: dateStr,
      endDate: new Date(calcDate.getTime() + 90 * 86400000).toISOString().split('T')[0],
      significance: 'Expansion of professional contacts, higher wisdom, and familial stability.',
      recommendation: 'Favorable window for initiating long-term educational and financial plans.',
    },
    {
      planet: 'SATURN',
      event: `Shani Gochara Stability Phase in ${saturnSign}`,
      startDate: dateStr,
      endDate: new Date(calcDate.getTime() + 180 * 86400000).toISOString().split('T')[0],
      significance: 'Karmic restructuring of spiritual discipline, expenses, and endurance.',
      recommendation: 'Maintain grounded routines, avoid speculative ventures, and honor commitments.',
    },
    {
      planet: 'MARS',
      event: 'Mangal Ingress & Energetic Shift',
      startDate: new Date(calcDate.getTime() + 45 * 86400000).toISOString().split('T')[0],
      endDate: new Date(calcDate.getTime() + 105 * 86400000).toISOString().split('T')[0],
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
