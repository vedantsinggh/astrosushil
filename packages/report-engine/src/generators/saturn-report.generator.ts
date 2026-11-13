import {
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
  ReportSectionDto,
  SaturnReportModel,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import { AstroChart, SaturnCalculator, getRashiByLongitude, getNakshatraByLongitude } from '@astro/astrology-engine';

export const SATURN_REPORT_DISCLAIMER =
  'This report is based entirely on classical Vedic astrological calculations and interpretations specific to the placement, aspects, Ashtakavarga, and transits of Saturn (Lord Shani) in your birth chart. The insights and predictions provided are derived deterministically from classical principles (Brihat Parashara Hora Shastra, Phaladeepika, and Jaimini Sutras). It is important to note that this report offers strategic life guidance and philosophical perspective; it does not constitute deterministic claims or absolute outcomes. Planetary vibrations suggest inclinations and cycles of accountability, while conscious free will, ethical choices, and diligent action remain paramount. The author and publisher disclaim all legal liability for personal decisions or actions taken based on the information provided herein.';

export const SATURN_REPORT_AUTHOR =
  'Astro Sushil (Sushil Kumaar Singh), Founder & Chief Astrologer';

export const SATURN_REPORT_MESSAGE =
  'Saturn is universally misunderstood as a punitive force, yet in classical Vedic philosophy, Lord Shani is the supreme Karmic Teacher (Karma Karaka) and the great stabilizer of human destiny. While Jupiter expands and Venus enchants, it is Saturn alone that builds structures capable of surviving the storms of time. Wherever Saturn sits and gazes in your chart, it demands truth, patient discipline, humility, and flawless accountability. May this report guide you not in fear of Shani, but in reverent mastery of time, duty, and self-restraint.';

export async function generateSaturnReport(
  profile: ReportProfileDto,
  config: ReportConfigDto,
  chartData: any,
  interpretationProvider?: ReportInterpretationProvider,
  options?: { allowUnknownBirthTime?: boolean }
): Promise<SaturnReportModel> {
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

  const analysis = SaturnCalculator.calculateSaturnAnalysis(rawChart, isTimeUnknown);

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
  const planetsDto: ReportPlanetDto[] = Object.entries(rawChart.planets || {}).map(
    ([name, pos]: [string, any]) => {
      const pRashi = getRashiByLongitude(pos.longitude);
      const pNak = getNakshatraByLongitude(pos.longitude);
      const houseNum = isTimeUnknown || !rawChart.ascendant
        ? 1
        : ((pRashi.index - rawChart.ascendant.rashiIndex + 12) % 12) + 1;

      return {
        planet: name.toUpperCase(),
        sign: pRashi.sanskritName,
        degree: pos.degreeInRashi ?? 0,
        house: houseNum,
        nakshatra: pNak.name,
        pada: pos.pada ?? 1,
        isRetrograde: Boolean(pos.isRetrograde),
      };
    }
  );

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

  // Moon Nakshatra details
  const moonPlanet = planetsDto.find((p) => p.planet === 'MOON') || planetsDto[0];
  const nakshatraDto: ReportNakshatraDto = {
    birthNakshatra: moonPlanet.nakshatra,
    pada: moonPlanet.pada,
    rulingPlanet: (rawChart.planets as any)?.MOON?.nakshatraLord || (rawChart.planets as any)?.moon?.nakshatraLord || analysis.moonSignRelation.moonNakshatraLord || 'Mars',
    associatedInfo: `Natal Moon placed in ${moonPlanet.sign} (${moonPlanet.degree.toFixed(2)}°) in ${moonPlanet.nakshatra} Pada ${moonPlanet.pada}.`,
  };

  // Standard report sections for API compatibility
  const sections: ReportSectionDto[] = [
    {
      id: 'sec-saturn-placement',
      title: 'Natal Saturn Placement & Dignity',
      type: 'TEXT',
      content: `${analysis.saturnPlacement.dignity} in ${analysis.saturnPlacement.sign} (${analysis.saturnPlacement.houseFormatted})\n\n${analysis.saturnPlacement.traits.join('\n')}`,
      listItems: [analysis.saturnPlacement.karmicLesson],
    },
    {
      id: 'sec-saturn-aspects',
      title: 'Aspects of Saturn (3rd, 7th, 10th Drishti)',
      type: 'TEXT',
      content: analysis.saturnAspects.description,
      listItems: analysis.saturnAspects.aspects.map(
        (a) =>
          `Aspect ${a.aspectNumber} on ${a.sign}${
            a.house ? ` (House ${a.house})` : ''
          }: ${a.areaTested}`
      ),
    },
    {
      id: 'sec-saturn-moon',
      title: 'Moon Sign Dynamic & Psyche Evolution',
      type: 'TEXT',
      content: `Saturn relative to ${analysis.moonSignRelation.moonSign}\n\n${analysis.moonSignRelation.psycheEvolution}`,
      listItems: [analysis.moonSignRelation.archetype],
    },
    {
      id: 'sec-saturn-bav',
      title: 'Saturn Ashtakavarga Evaluation',
      type: 'TEXT',
      content: `Total 39 points across zodiac | ${analysis.saturnAshtakavarga.currentTransitHousePoints} bindus in transit.\n\n${analysis.saturnAshtakavarga.interpretation}`,
      listItems: [
        `Natal Saturn sign holds ${analysis.saturnAshtakavarga.natalHousePoints ?? 'N/A'} bindus`,
      ],
    },
    {
      id: 'sec-saturn-sade-sati',
      title: 'Sade Sati & Kantak Shani Status',
      type: 'TEXT',
      content: `${analysis.sadeSatiPhases.currentStatus}\n\n${analysis.kantakShani.description}`,
      listItems: analysis.kantakShani.remedies,
    },
  ];

  return {
    version: '1.0.0',
    type: ReportType.SATURN,
    title: 'Saturn in Your Birth Chart Report',
    generatedAt: new Date().toISOString(),
    profile,
    configuration: config,
    ascendant: ascendantDto,
    planets: planetsDto,
    houses: housesDto,
    nakshatra: nakshatraDto,
    sections,
    saturnPlacement: {
      sign: analysis.saturnPlacement.sign,
      signIndex: analysis.saturnPlacement.signIndex,
      degree: analysis.saturnPlacement.degree,
      degreeInRashi: analysis.saturnPlacement.degreeInRashi,
      house: analysis.saturnPlacement.house,
      houseFormatted: analysis.saturnPlacement.houseFormatted,
      nakshatra: analysis.saturnPlacement.nakshatra,
      pada: analysis.saturnPlacement.pada,
      nakshatraLord: analysis.saturnPlacement.nakshatraLord,
      dignity: analysis.saturnPlacement.dignity,
      isRetrograde: analysis.saturnPlacement.isRetrograde,
      isCombust: analysis.saturnPlacement.isCombust,
      lordship: analysis.saturnPlacement.lordship,
      traits: analysis.saturnPlacement.traits,
      karmicLesson: analysis.saturnPlacement.karmicLesson,
    },
    saturnAspects: {
      aspects: analysis.saturnAspects.aspects.map((a) => ({
        aspectNumber: a.aspectNumber,
        house: a.house,
        sign: a.sign,
        areaTested: a.areaTested,
      })),
      description: analysis.saturnAspects.description,
    },
    beneficVsMalefic: analysis.beneficVsMalefic,
    moonSignRelation: {
      moonSign: analysis.moonSignRelation.moonSign,
      moonNakshatra: analysis.moonSignRelation.moonNakshatra,
      moonPada: analysis.moonSignRelation.moonPada,
      moonNakshatraLord: analysis.moonSignRelation.moonNakshatraLord,
      saturnRelationToMoonLord: analysis.moonSignRelation.saturnRelationToMoonLord,
      houseFromMoon: analysis.moonSignRelation.houseFromMoon,
      archetype: analysis.moonSignRelation.archetype,
      psycheEvolution: analysis.moonSignRelation.psycheEvolution,
    },
    saturnNakshatraAnalysis: {
      nakshatra: analysis.saturnNakshatraAnalysis.nakshatra,
      pada: analysis.saturnNakshatraAnalysis.pada,
      lord: analysis.saturnNakshatraAnalysis.lord,
      symbol: analysis.saturnNakshatraAnalysis.symbol,
      deity: analysis.saturnNakshatraAnalysis.deity,
      karmicTheme: analysis.saturnNakshatraAnalysis.karmicTheme,
    },
    saturnConjunctions: analysis.saturnConjunctions,
    saturnAshtakavarga: {
      bindus: analysis.saturnAshtakavarga.bindus,
      total: analysis.saturnAshtakavarga.total,
      currentTransitHousePoints: analysis.saturnAshtakavarga.currentTransitHousePoints,
      natalHousePoints: analysis.saturnAshtakavarga.natalHousePoints,
      matrix: analysis.saturnAshtakavarga.matrix,
      interpretation: analysis.saturnAshtakavarga.interpretation,
    },
    sadeSatiPhases: {
      isActive: analysis.sadeSatiPhases.isActive,
      currentStatus: analysis.sadeSatiPhases.currentStatus,
      currentPhase: analysis.sadeSatiPhases.currentPhase,
      firstCycle: analysis.sadeSatiPhases.firstCycle,
      secondCycle: analysis.sadeSatiPhases.secondCycle,
      lifeOverview: analysis.sadeSatiPhases.lifeOverview,
    },
    saturnTransits: analysis.saturnTransits,
    kantakShani: analysis.kantakShani,
    remedies: analysis.remedies,
    iconicInspirations: analysis.iconicInspirations,
  };
}
