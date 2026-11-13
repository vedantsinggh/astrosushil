import {
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
  ReportSectionDto,
  RahuKetuReportModel,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import { AstroChart, RahuKetuCalculator, getRashiByLongitude, getNakshatraByLongitude } from '@astro/astrology-engine';

export const RAHU_KETU_REPORT_DISCLAIMER =
  'This Rahu-Ketu Transit Report is based on the classical principles of Vedic astrology and Gochara transit analysis. Rahu and Ketu are mathematical shadow nodes (Chhaya Grahas) representing the karmic axis of human desire and spiritual liberation. The interpretations provided are educational and reflective; they do not predict unavoidable doom or guaranteed material windfalls. Astrological cycles reflect consciousness inclinations; ethical actions, conscious self-awareness, and personal responsibility remain supreme. The author and platform accept no liability for personal, commercial, or life choices made based on this document.';

export const RAHU_KETU_REPORT_AUTHOR =
  'Astro Sushil (Sushil Kumaar Singh), Founder & Chief Astrologer';

export const RAHU_KETU_REPORT_MESSAGE =
  'Rahu and Ketu represent the eternal cosmic tension between material hunger and spiritual liberation. Where Rahu creates intense fascination and unfamiliar evolutionary challenges, Ketu dissolves attachments and invites deep inner surrender. Far from being purely malevolent, the nodes are the ultimate catalysts of soul evolution. By understanding where Rahu asks you to build and where Ketu asks you to let go, you can master your karmic destiny with fearlessness, discernment, and peace.';

export async function generateRahuKetuReport(
  profile: ReportProfileDto,
  config: ReportConfigDto,
  chartData: any,
  interpretationProvider?: ReportInterpretationProvider,
  options?: { allowUnknownBirthTime?: boolean; referenceDate?: Date | string }
): Promise<RahuKetuReportModel> {
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

  const analysis = RahuKetuCalculator.calculateRahuKetuAnalysis(
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
      id: 'sec-rk-axis',
      title: 'The Nodal Axis: Natal Placement of Rahu & Ketu',
      type: 'TEXT',
      content: `Rahu in ${analysis.nodalPlacement.rahu.sign} (${analysis.nodalPlacement.rahu.houseFormatted}) & Ketu in ${analysis.nodalPlacement.ketu.sign} (${analysis.nodalPlacement.ketu.houseFormatted}).\n\nStrict 180° opposition verified.`,
      listItems: [analysis.karmicJourney.karmicLesson],
    },
    {
      id: 'sec-rk-aspects',
      title: "Rahu & Ketu Aspects (5th, 7th, 9th Drishti)",
      type: 'TEXT',
      content: analysis.nodalAspects.description,
      listItems: [
        ...analysis.nodalAspects.rahuAspects.map(
          (a) => `Rahu Aspect ${a.aspectNumber} on ${a.sign}: ${a.influence}`
        ),
        ...analysis.nodalAspects.ketuAspects.map(
          (a) => `Ketu Aspect ${a.aspectNumber} on ${a.sign}: ${a.influence}`
        ),
      ],
    },
    {
      id: 'sec-rk-transit-1',
      title: 'Transit Cycle 2025–2026 (Aquarius Rahu / Leo Ketu)',
      type: 'TEXT',
      content: `${analysis.transit2025_2026.cycleName} (${analysis.transit2025_2026.period}). Rahu in ${analysis.transit2025_2026.rahuSign}, Ketu in ${analysis.transit2025_2026.ketuSign}.`,
      listItems: analysis.transit2025_2026.rahuPredictions,
    },
    {
      id: 'sec-rk-transit-2',
      title: 'Transit Cycle 2026–2028 (Capricorn Rahu / Cancer Ketu)',
      type: 'TEXT',
      content: `${analysis.transit2026_2028.cycleName} (${analysis.transit2026_2028.period}). Rahu in ${analysis.transit2026_2028.rahuSign}, Ketu in ${analysis.transit2026_2028.ketuSign}.`,
      listItems: analysis.transit2026_2028.rahuPredictions,
    },
  ];

  return {
    version: '1.0.0',
    type: ReportType.RAHU_KETU_TRANSIT,
    title: 'Rahu Ketu Transit Report',
    generatedAt: new Date().toISOString(),
    profile,
    configuration: config,
    ascendant: ascendantDto,
    planets: planetsDto,
    houses: housesDto,
    nakshatra: nakshatraDto,
    sections,
    nodalPlacement: {
      rahu: {
        planet: 'RAHU',
        sign: analysis.nodalPlacement.rahu.sign,
        signIndex: analysis.nodalPlacement.rahu.signIndex,
        degree: analysis.nodalPlacement.rahu.degree,
        degreeInRashi: analysis.nodalPlacement.rahu.degreeInRashi,
        house: analysis.nodalPlacement.rahu.house,
        houseFormatted: analysis.nodalPlacement.rahu.houseFormatted,
        nakshatra: analysis.nodalPlacement.rahu.nakshatra,
        pada: analysis.nodalPlacement.rahu.pada,
        dignity: analysis.nodalPlacement.rahu.dignity,
        isRetrograde: analysis.nodalPlacement.rahu.isRetrograde,
        traits: analysis.nodalPlacement.rahu.traits,
        karmicFocus: analysis.nodalPlacement.rahu.karmicFocus,
      },
      ketu: {
        planet: 'KETU',
        sign: analysis.nodalPlacement.ketu.sign,
        signIndex: analysis.nodalPlacement.ketu.signIndex,
        degree: analysis.nodalPlacement.ketu.degree,
        degreeInRashi: analysis.nodalPlacement.ketu.degreeInRashi,
        house: analysis.nodalPlacement.ketu.house,
        houseFormatted: analysis.nodalPlacement.ketu.houseFormatted,
        nakshatra: analysis.nodalPlacement.ketu.nakshatra,
        pada: analysis.nodalPlacement.ketu.pada,
        dignity: analysis.nodalPlacement.ketu.dignity,
        isRetrograde: analysis.nodalPlacement.ketu.isRetrograde,
        traits: analysis.nodalPlacement.ketu.traits,
        karmicFocus: analysis.nodalPlacement.ketu.karmicFocus,
      },
      axisSeparation: analysis.nodalPlacement.axisSeparation,
      axisName: analysis.nodalPlacement.axisName,
    },
    nodalAspects: {
      rahuAspects: analysis.nodalAspects.rahuAspects.map((a) => ({
        aspectNumber: a.aspectNumber,
        house: a.house,
        sign: a.sign,
        influence: a.influence,
      })),
      ketuAspects: analysis.nodalAspects.ketuAspects.map((a) => ({
        aspectNumber: a.aspectNumber,
        house: a.house,
        sign: a.sign,
        influence: a.influence,
      })),
      description: analysis.nodalAspects.description,
    },
    nodalConjunctions: analysis.nodalConjunctions,
    moonSignRelation: {
      moonSign: analysis.moonSignRelation.moonSign,
      moonNakshatra: analysis.moonSignRelation.moonNakshatra,
      rahuHouseFromMoon: analysis.moonSignRelation.rahuHouseFromMoon,
      ketuHouseFromMoon: analysis.moonSignRelation.ketuHouseFromMoon,
      overallPower: analysis.moonSignRelation.overallPower,
      psycheEvolution: analysis.moonSignRelation.psycheEvolution,
    },
    karmicJourney: analysis.karmicJourney,
    transit2025_2026: analysis.transit2025_2026,
    transit2026_2028: analysis.transit2026_2028,
    transit2028_2030: analysis.transit2028_2030,
    currentCycle: analysis.currentCycle,
    transitTimeline: analysis.transitTimeline,
    remedies: analysis.remedies,
    referenceDateIso: analysis.referenceDateIso,
  };
}
