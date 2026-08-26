import {
  StructuredReportModel,
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';

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
): Promise<StructuredReportModel> {
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
  const ascendant: ReportAscendantDto = {
    sign: asc.rashiName || asc.sign || 'Aries',
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

  // 6. Houses
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
    rulingPlanet: moonPlanet.nakshatraLord || 'Moon',
    associatedInfo: `Janma Nakshatra: ${moonPlanet.nakshatra} (Pada ${moonPlanet.pada}).`,
  };

  // 8. Interpretations
  const sections = await interpretationProvider.generateInterpretations(
    ReportType.PLANETARY_SUMMARY,
    rawChartData
  );

  return {
    version: '1.0',
    type: ReportType.PLANETARY_SUMMARY,
    title: 'Planetary Summary Report',
    generatedAt: new Date().toISOString(),
    profile,
    configuration,
    ascendant,
    planets,
    houses,
    nakshatra,
    sections,
  };
}
