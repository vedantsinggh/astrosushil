import {
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
  ReportSectionDto,
  JupiterReportModel,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import { AstroChart, JupiterCalculator, getRashiByLongitude, getNakshatraByLongitude } from '@astro/astrology-engine';

export const JUPITER_REPORT_DISCLAIMER =
  'This Jupiter Transit Report is based on the principles of Vedic astrology, offering insights into Jupiter’s movement and its potential influence on your personal horoscope. The interpretations provided here are derived from astrological calculations and classical wisdom. This report does not predict fixed outcomes but rather serves as a navigational guide to help you align with Jupiter’s expansive energy and make informed decisions. While Jupiter is associated with growth, wisdom, and fortune, its transit is not a replacement for medical, financial, or legal advice. Suggestions and remedies should be followed in accordance with personal discretion, faith, and ethical intent.';

export const JUPITER_REPORT_AUTHOR =
  'Astro Sushil (Sushil Kumaar Singh), Founder & Chief Astrologer';

export const JUPITER_REPORT_MESSAGE =
  'Jupiter (Guru / Brihaspati) is the supreme celestial preceptor, embodying divine wisdom, spiritual expansion, higher fortune, and benevolent protection. Wherever Guru sits and gazes in your horoscope, it awakens ethical clarity, protects against acute catastrophe, and multiplies dharmic prosperity. As Jupiter journeys through dynamic zodiacal transitions, may this report empower you to recognize expansive cosmic windows, cultivate inner wisdom, and act with dignified integrity.';

export async function generateJupiterReport(
  profile: ReportProfileDto,
  config: ReportConfigDto,
  chartData: any,
  interpretationProvider?: ReportInterpretationProvider,
  options?: { allowUnknownBirthTime?: boolean; referenceDate?: Date | string }
): Promise<JupiterReportModel> {
  validateAstrologyDataForReport(chartData, options);

  const rawChart: AstroChart = chartData.chart || chartData.data || chartData;
  const isTimeUnknown = Boolean(
    options?.allowUnknownBirthTime &&
      ((rawChart as any).isTimeUnknown ||
        (profile as any).timeOfBirth === '00:00:00' ||
        !(profile as any).timeOfBirth ||
        (profile as any).isTimeUnknown ||
        !rawChart.ascendant ||
        (rawChart.ascendant as any)?.isIndeterminate ||
        rawChart.ascendant?.rashiIndex === undefined ||
        rawChart.ascendant?.rashiIndex === 0)
  );

  const analysis = JupiterCalculator.calculateJupiterAnalysis(
    rawChart,
    isTimeUnknown,
    options?.referenceDate || (config as any)?.referenceDate
  );

  // Map Ascendant
  let ascendantDto: ReportAscendantDto;
  if (!isTimeUnknown && rawChart.ascendant) {
    const ascRashi = getRashiByLongitude(rawChart.ascendant.longitude);
    const ascNak = getNakshatraByLongitude(rawChart.ascendant.longitude);
    ascendantDto = {
      sign: ascRashi.sanskritName,
      degree: rawChart.ascendant.degreeInRashi ?? 0,
      nakshatra: ascNak.name,
      pada: rawChart.ascendant.pada ?? 1,
    };
  } else {
    ascendantDto = {
      sign: 'Indeterminate',
      degree: 0,
      nakshatra: 'Indeterminate',
      pada: 1,
    };
  }

  // Map Planets
  const rawPlanetsList: any[] = Array.isArray(rawChart.planets)
    ? rawChart.planets
    : Object.values(rawChart.planets || {});

  const planetsDto: ReportPlanetDto[] = rawPlanetsList.map((pos: any) => {
    const pRashi = getRashiByLongitude(pos.longitude);
    const pNak = getNakshatraByLongitude(pos.longitude);
    const houseNum =
      isTimeUnknown || !rawChart.ascendant
        ? 1
        : ((pRashi.index - rawChart.ascendant.rashiIndex + 12) % 12) + 1;

    return {
      planet: (pos.planet || pos.name || '').toUpperCase(),
      sign: pRashi.sanskritName,
      degree: pos.degreeInRashi ?? 0,
      house: houseNum,
      nakshatra: pNak.name,
      pada: pos.pada ?? 1,
      isRetrograde: Boolean(pos.isRetrograde),
    };
  });

  // Map Houses
  const ascRashiIndex = rawChart.ascendant ? rawChart.ascendant.rashiIndex : 1;
  const housesDto: ReportHouseDto[] = [];
  for (let h = 1; h <= 12; h++) {
    const signIdx = ((ascRashiIndex - 1 + (h - 1)) % 12) + 1;
    const signDef = getRashiByLongitude((signIdx - 1) * 30);
    const planetsInHouse = planetsDto
      .filter((p) => p.house === h)
      .map((p) => p.planet);

    housesDto.push({
      houseNumber: h,
      sign: signDef.sanskritName,
      planetsPresent: planetsInHouse,
    });
  }

  // Moon Nakshatra DTO
  const moonPlanet = planetsDto.find((p) => p.planet === 'MOON') || planetsDto[0];
  const nakshatraDto: ReportNakshatraDto = {
    birthNakshatra: moonPlanet.nakshatra,
    pada: moonPlanet.pada,
    rulingPlanet: (rawChart.planets as any)?.MOON?.nakshatraLord || (rawChart.planets as any)?.moon?.nakshatraLord || 'Mars',
    associatedInfo: `Natal Moon placed in ${moonPlanet.sign} (${moonPlanet.degree.toFixed(2)}°) in ${moonPlanet.nakshatra} Pada ${moonPlanet.pada}.`,
  };

  // Structured Sections
  const sections: ReportSectionDto[] = [
    {
      id: 'sec-jup-placement',
      title: "Jupiter's Divine Placement in Birth Chart",
      type: 'TEXT',
      content: `Jupiter placed in ${analysis.jupiterPlacement.sign} (${analysis.jupiterPlacement.houseFormatted}) with dignity ${analysis.jupiterPlacement.dignity}.\n\n${analysis.jupiterPlacement.traits.join('\n')}`,
      listItems: [analysis.jupiterPlacement.karmicLesson],
    },
    {
      id: 'sec-jup-aspects',
      title: "Natal Jupiter's Sacred Aspects (5th, 7th, 9th Drishti)",
      type: 'TEXT',
      content: analysis.jupiterAspects.description,
      listItems: analysis.jupiterAspects.aspects.map(
        (a) =>
          `Aspect ${a.aspectNumber} on ${a.sign}${
            a.house ? ` (House ${a.house})` : ''
          }: ${a.areaTested}`
      ),
    },
    {
      id: 'sec-jup-bav',
      title: 'Jupiter Bhinnashtakavarga (BAV) 56-Point Scorecard',
      type: 'TEXT',
      content: `Total 56 points across zodiac.\n\n${analysis.jupiterAshtakavarga.interpretation}`,
      listItems: [
        `Gemini holds ${analysis.jupiterAshtakavarga.currentGeminiPoints} bindus`,
        `Cancer holds ${analysis.jupiterAshtakavarga.cancerPoints} bindus`,
      ],
    },
    {
      id: 'sec-jup-transits',
      title: 'Jupiter Gochara Transits: Gemini & Exalted Cancer',
      type: 'TEXT',
      content: `Gemini Transit (${analysis.geminiTransit.period}) & Cancer Exaltation Transit (${analysis.cancerTransit.period}).`,
      listItems: [
        ...analysis.geminiTransit.predictions,
        ...analysis.cancerTransit.predictions,
      ],
    },
  ];

  return {
    version: '1.0.0',
    type: ReportType.JUPITER_TRANSIT,
    title: 'Jupiter Transit Report',
    generatedAt: new Date().toISOString(),
    profile,
    configuration: config,
    ascendant: ascendantDto,
    planets: planetsDto,
    houses: housesDto,
    nakshatra: nakshatraDto,
    sections,
    jupiterPlacement: {
      sign: analysis.jupiterPlacement.sign,
      signIndex: analysis.jupiterPlacement.signIndex,
      degree: analysis.jupiterPlacement.degree,
      degreeInRashi: analysis.jupiterPlacement.degreeInRashi,
      house: analysis.jupiterPlacement.house,
      houseFormatted: analysis.jupiterPlacement.houseFormatted,
      nakshatra: analysis.jupiterPlacement.nakshatra,
      pada: analysis.jupiterPlacement.pada,
      dignity: analysis.jupiterPlacement.dignity,
      isRetrograde: analysis.jupiterPlacement.isRetrograde,
      isCombust: analysis.jupiterPlacement.isCombust,
      lordship: analysis.jupiterPlacement.lordship,
      traits: analysis.jupiterPlacement.traits,
      karmicLesson: analysis.jupiterPlacement.karmicLesson,
    },
    jupiterAspects: {
      aspects: analysis.jupiterAspects.aspects.map((a) => ({
        aspectNumber: a.aspectNumber,
        house: a.house,
        sign: a.sign,
        areaTested: a.areaTested,
      })),
      description: analysis.jupiterAspects.description,
    },
    beneficVsMalefic: analysis.beneficVsMalefic,
    moonSignRelation: {
      moonSign: analysis.moonSignRelation.moonSign,
      moonNakshatra: analysis.moonSignRelation.moonNakshatra,
      moonPada: analysis.moonSignRelation.moonPada,
      jupiterRelationToMoonLord: analysis.moonSignRelation.jupiterRelationToMoonLord,
      houseFromMoon: analysis.moonSignRelation.houseFromMoon,
      archetype: analysis.moonSignRelation.archetype,
      psycheEvolution: analysis.moonSignRelation.psycheEvolution,
    },
    jupiterNakshatraAnalysis: {
      nakshatra: analysis.jupiterNakshatraAnalysis.nakshatra,
      pada: analysis.jupiterNakshatraAnalysis.pada,
      lord: analysis.jupiterNakshatraAnalysis.lord,
      symbol: analysis.jupiterNakshatraAnalysis.symbol,
      deity: analysis.jupiterNakshatraAnalysis.deity,
      karmicTheme: analysis.jupiterNakshatraAnalysis.karmicTheme,
    },
    jupiterConjunctions: analysis.jupiterConjunctions,
    jupiterAshtakavarga: {
      bindus: analysis.jupiterAshtakavarga.bindus,
      total: analysis.jupiterAshtakavarga.total,
      currentGeminiPoints: analysis.jupiterAshtakavarga.currentGeminiPoints,
      cancerPoints: analysis.jupiterAshtakavarga.cancerPoints,
      natalHousePoints: analysis.jupiterAshtakavarga.natalHousePoints,
      matrix: analysis.jupiterAshtakavarga.matrix,
      interpretation: analysis.jupiterAshtakavarga.interpretation,
    },
    geminiTransit: analysis.geminiTransit,
    cancerTransit: analysis.cancerTransit,
    leoTransit: analysis.leoTransit,
    currentTransit: analysis.currentTransit,
    transitTimeline: analysis.transitTimeline,
    remedies: analysis.remedies,
    referenceDateIso: analysis.referenceDateIso,
  };
}
