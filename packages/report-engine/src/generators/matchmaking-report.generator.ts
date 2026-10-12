import {
  MatchmakingReportModel,
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  KootaScoreDto,
  ReportSectionDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import {
  MatchmakingCalculator,
  AstroChart,
  AstrologyConfig,
  PlanetSymbol,
} from '@astro/astrology-engine';

export class InvalidMatchmakingProfilesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMatchmakingProfilesError';
  }
}

function buildAstroChartForPartner(profile: ReportProfileDto, chartData: any): AstroChart {
  const chart = chartData.chart || chartData.data || chartData;
  const asc = chart.ascendant || { longitude: 0, rashiName: 'Aries' };

  const y = parseInt(profile.dateOfBirth.split('-')[0], 10) || 1990;
  const m = parseInt(profile.dateOfBirth.split('-')[1], 10) || 1;
  const d = parseInt(profile.dateOfBirth.split('-')[2], 10) || 1;
  const hr = parseInt((profile.timeOfBirth || '12:00').split(':')[0], 10) || 12;
  const min = parseInt((profile.timeOfBirth || '12:00').split(':')[1], 10) || 0;

  const birthDetails = {
    date: { year: y, month: m, day: d },
    time: { hour: hr, minute: min, second: 0 },
    timezone: profile.timezone || 'Asia/Kolkata',
    latitude: profile.latitude || 28.6139,
    longitude: profile.longitude || 77.2090,
  };

  const astroChart: AstroChart = {
    metadata: {
      engineVersion: '1.0.0',
      calculationTimestampIso: new Date().toISOString(),
      providerName: 'AstrologyEngine',
      providerVersion: '1.0.0',
      config: {
        zodiacType: 'SIDEREAL',
        ayanamsa: 'LAHIRI',
        houseSystem: 'WHOLE_SIGN',
        nodeCalculation: 'MEAN_NODE',
      } as AstrologyConfig,
      normalizedTime: {
        originalDetails: birthDetails as any,
        utcIsoString: new Date(`${profile.dateOfBirth}T${profile.timeOfBirth || '12:00:00'}Z`).toISOString(),
        utcTimestampMs: Date.now(),
        julianDayUT: 2451545.0,
        timezoneOffsetMinutes: 330,
      },
    },
    birthDetails: birthDetails as any,
    ascendant: {
      longitude: typeof asc.longitude === 'number' ? asc.longitude : 0,
      rashiName: asc.rashiName || asc.sign || 'Aries',
    } as any,
    planets: {} as any,
  };

  for (const p of chart.planets || []) {
    const sym = String(p.planet || p.name).toUpperCase() as PlanetSymbol;
    astroChart.planets[sym] = {
      symbol: sym,
      longitude: typeof p.longitude === 'number' ? p.longitude : 0,
      isRetrograde: Boolean(p.isRetrograde),
      speedDegreesPerDay: typeof p.speed === 'number' ? p.speed : 1.0,
      rashiName: p.rashiName || p.sign || 'Aries',
      degreeInRashi: typeof p.degreeInRashi === 'number' ? p.degreeInRashi : 0,
    } as any;
  }

  return astroChart;
}

export async function generateMatchmakingReport(
  profile1Input: {
    id?: string;
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  },
  profile2Input: {
    id?: string;
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  },
  chart1Data: any,
  chart2Data: any,
  interpretationProvider: ReportInterpretationProvider
): Promise<MatchmakingReportModel> {
  // 1. Strict Validation: Profiles must be distinct and complete
  if (profile1Input.id && profile2Input.id && profile1Input.id === profile2Input.id) {
    throw new InvalidMatchmakingProfilesError(
      'Both partner profiles must be distinct individuals. Self-matchmaking with identical profile ID is prohibited.'
    );
  }

  if (
    profile1Input.name.trim().toLowerCase() === profile2Input.name.trim().toLowerCase() &&
    profile1Input.dateOfBirth === profile2Input.dateOfBirth &&
    profile1Input.timeOfBirth === profile2Input.timeOfBirth
  ) {
    throw new InvalidMatchmakingProfilesError(
      'Duplicate partner birth data detected. Both profiles cannot have identical name, date of birth, and time of birth.'
    );
  }

  if (!profile1Input.dateOfBirth || !profile2Input.dateOfBirth) {
    throw new InvalidMatchmakingProfilesError(
      'Both partner birth profiles must have valid, complete date of birth records.'
    );
  }

  // 2. Validate astrology data for both charts
  validateAstrologyDataForReport(chart1Data);
  validateAstrologyDataForReport(chart2Data);

  const profile1: ReportProfileDto = {
    name: profile1Input.name || 'Partner A (Groom)',
    dateOfBirth: profile1Input.dateOfBirth,
    timeOfBirth: profile1Input.timeOfBirth,
    placeName: profile1Input.placeName || null,
    timezone: profile1Input.timezone || 'Asia/Kolkata',
    latitude: profile1Input.latitude,
    longitude: profile1Input.longitude,
  };

  const profile2: ReportProfileDto = {
    name: profile2Input.name || 'Partner B (Bride)',
    dateOfBirth: profile2Input.dateOfBirth,
    timeOfBirth: profile2Input.timeOfBirth,
    placeName: profile2Input.placeName || null,
    timezone: profile2Input.timezone || 'Asia/Kolkata',
    latitude: profile2Input.latitude,
    longitude: profile2Input.longitude,
  };

  const configuration: ReportConfigDto = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'WHOLE_SIGN',
    nodeCalculation: 'MEAN_NODE',
  };

  // 3. Build AstroChart structures
  const chartA = buildAstroChartForPartner(profile1, chart1Data);
  const chartB = buildAstroChartForPartner(profile2, chart2Data);

  // 4. Run Deterministic Ashtakoota Matchmaking Engine
  const mmCalc = new MatchmakingCalculator();
  const compatibilityResult = mmCalc.evaluateCompatibility(chartA, chartB, {
    personALabel: profile1.name,
    personBLabel: profile2.name,
  });

  const ashtakoota = compatibilityResult.ashtakoota;
  const kootasMap = ashtakoota.kootas;
  const kootas: KootaScoreDto[] = [
    {
      name: 'Varna',
      sanskritName: 'Varna (Spiritual Compatibility)',
      maxPoints: 1,
      obtainedPoints: kootasMap.varna.obtainedPoints,
      status: kootasMap.varna.obtainedPoints === 1 ? 'EXCELLENT' : 'DEFICIENT',
      description: kootasMap.varna.description,
      boyDetail: `Boy Varna: ${kootasMap.varna.evidence?.boyVarna || 'Normal'}`,
      girlDetail: `Girl Varna: ${kootasMap.varna.evidence?.girlVarna || 'Normal'}`,
    },
    {
      name: 'Vashya',
      sanskritName: 'Vashya (Mutual Attraction & Control)',
      maxPoints: 2,
      obtainedPoints: kootasMap.vashya.obtainedPoints,
      status: kootasMap.vashya.obtainedPoints >= 1.5 ? 'EXCELLENT' : kootasMap.vashya.obtainedPoints > 0 ? 'AVERAGE' : 'DEFICIENT',
      description: kootasMap.vashya.description,
      boyDetail: `Boy Vashya: ${kootasMap.vashya.evidence?.boyVashya || 'Normal'}`,
      girlDetail: `Girl Vashya: ${kootasMap.vashya.evidence?.girlVashya || 'Normal'}`,
    },
    {
      name: 'Tara',
      sanskritName: 'Tara / Dina (Destiny & Longevity)',
      maxPoints: 3,
      obtainedPoints: kootasMap.tara.obtainedPoints,
      status: kootasMap.tara.obtainedPoints >= 2 ? 'EXCELLENT' : kootasMap.tara.obtainedPoints > 0 ? 'AVERAGE' : 'DEFICIENT',
      description: kootasMap.tara.description,
      boyDetail: `Boy Tara: ${kootasMap.tara.evidence?.boyTaraCategory || 'Normal'}`,
      girlDetail: `Girl Tara: ${kootasMap.tara.evidence?.girlTaraCategory || 'Normal'}`,
    },
    {
      name: 'Yoni',
      sanskritName: 'Yoni (Intimacy & Biological Harmony)',
      maxPoints: 4,
      obtainedPoints: kootasMap.yoni.obtainedPoints,
      status: kootasMap.yoni.obtainedPoints >= 3 ? 'EXCELLENT' : kootasMap.yoni.obtainedPoints >= 1 ? 'AVERAGE' : 'DEFICIENT',
      description: kootasMap.yoni.description,
      boyDetail: `Boy Yoni: ${kootasMap.yoni.evidence?.boyYoniAnimal || 'Normal'}`,
      girlDetail: `Girl Yoni: ${kootasMap.yoni.evidence?.girlYoniAnimal || 'Normal'}`,
    },
    {
      name: 'Graha Maitri',
      sanskritName: 'Graha Maitri (Psychological & Intellectual Rapport)',
      maxPoints: 5,
      obtainedPoints: kootasMap.grahaMaitri.obtainedPoints,
      status: kootasMap.grahaMaitri.obtainedPoints >= 4 ? 'EXCELLENT' : kootasMap.grahaMaitri.obtainedPoints >= 1 ? 'AVERAGE' : 'DEFICIENT',
      description: kootasMap.grahaMaitri.description,
      boyDetail: `Boy Rashi Lord: ${kootasMap.grahaMaitri.evidence?.boyRashiLord || 'Normal'}`,
      girlDetail: `Girl Rashi Lord: ${kootasMap.grahaMaitri.evidence?.girlRashiLord || 'Normal'}`,
    },
    {
      name: 'Gana',
      sanskritName: 'Gana (Temperament & Social Outlook)',
      maxPoints: 6,
      obtainedPoints: kootasMap.gana.obtainedPoints,
      status: kootasMap.gana.obtainedPoints >= 5 ? 'EXCELLENT' : kootasMap.gana.obtainedPoints > 0 ? 'AVERAGE' : 'DOSHA',
      description: kootasMap.gana.description,
      boyDetail: `Boy Gana: ${kootasMap.gana.evidence?.boyGana || 'Normal'}`,
      girlDetail: `Girl Gana: ${kootasMap.gana.evidence?.girlGana || 'Normal'}`,
    },
    {
      name: 'Bhakoot',
      sanskritName: 'Bhakoot (Emotional Fulfillment & Prosperity)',
      maxPoints: 7,
      obtainedPoints: kootasMap.bhakoot.obtainedPoints,
      status: kootasMap.bhakoot.obtainedPoints === 7 ? 'EXCELLENT' : 'DOSHA',
      description: kootasMap.bhakoot.description,
      boyDetail: `Rashi Relationship: ${kootasMap.bhakoot.evidence?.distance || 'Normal'}`,
      girlDetail: `Condition: ${kootasMap.bhakoot.evidence?.condition || 'Normal'}`,
    },
    {
      name: 'Nadi',
      sanskritName: 'Nadi (Genetics, Health & Heredity)',
      maxPoints: 8,
      obtainedPoints: kootasMap.nadi.obtainedPoints,
      status: kootasMap.nadi.obtainedPoints === 8 ? 'EXCELLENT' : 'DOSHA',
      description: kootasMap.nadi.description,
      boyDetail: `Boy Nadi: ${kootasMap.nadi.evidence?.boyNadi || 'Normal'}`,
      girlDetail: `Girl Nadi: ${kootasMap.nadi.evidence?.girlNadi || 'Normal'}`,
    },
  ];

  const totalScore = ashtakoota.totalObtainedPoints;
  let verdict = 'MADHYAMA (MODERATE / ACCEPTABLE)';
  let verdictDescription = 'A balanced score above 18 points indicating viable marital compatibility with mutual adaptability.';

  if (totalScore >= 28) {
    verdict = 'UTTAM (HIGHLY AUSPICIOUS / EXCELLENT)';
    verdictDescription = 'Exceptional alignment across temperaments, mind, and biological vitality according to Shastric Guna Milan.';
  } else if (totalScore >= 21) {
    verdict = 'SHUBHA (GOOD / AUSPICIOUS)';
    verdictDescription = 'Strong overall compatibility score. Foundation for harmonious and enduring partnership.';
  } else if (totalScore < 18) {
    verdict = 'ALPA (BELOW THRESHOLD / REQUIRING REMEDIES)';
    verdictDescription = 'Score is under classical 18-point threshold. Astrological consultation and compatibility remedies advised.';
  }

  // 5. Manglik Evaluation
  const mangalComp = compatibilityResult.manglikComparison;
  const isPersonAManglik = mangalComp.personA.isManglik;
  const isPersonBManglik = mangalComp.personB.isManglik;

  let manglikVerdictStr = 'HARMONIOUS MANGLIK BALANCE';
  let manglikExplanation = 'Both charts exhibit balanced Kuja / Mangal energy, neutralizing potential marital friction.';

  if (isPersonAManglik && !isPersonBManglik) {
    manglikVerdictStr = `${profile1.name.toUpperCase()} IS MANGLIK; ${profile2.name.toUpperCase()} IS NON-MANGLIK`;
    manglikExplanation = 'One partner has Kuja dosha while the other does not. Classical Vedic astrology recommends Kumbha Vivaha or mutual propitiation remedies.';
  } else if (!isPersonAManglik && isPersonBManglik) {
    manglikVerdictStr = `${profile2.name.toUpperCase()} IS MANGLIK; ${profile1.name.toUpperCase()} IS NON-MANGLIK`;
    manglikExplanation = 'One partner has Kuja dosha while the other does not. Classical propitiation remedies are recommended.';
  } else if (!isPersonAManglik && !isPersonBManglik) {
    manglikVerdictStr = 'BOTH PARTNERS NON-MANGLIK';
    manglikExplanation = 'Neither partner has Kuja / Mangal Dosha. Highly auspicious natural alignment.';
  } else {
    manglikVerdictStr = 'BOTH PARTNERS MANGLIK (DOSHA CANCELLED)';
    manglikExplanation = 'Classical Parashari rule applies: When both charts possess Manglik placement, mutual dosha cancellation occurs naturally.';
  }

  // 6. Synthesis
  const synthesis = {
    mentalHarmony: kootasMap.grahaMaitri.obtainedPoints >= 3
      ? 'Strong mutual friendship and mental synchronization between Moon rashi rulers.'
      : 'Different intellectual dispositions; open communication will enhance understanding.',
    emotionalHarmony: kootasMap.bhakoot.obtainedPoints === 7
      ? 'Auspicious Bhakoot placement ensures warm emotional bond and sustained marital joy.'
      : 'Bhakoot dosha present; developing active empathy and shared financial transparency is recommended.',
    healthAndProgeny: kootasMap.nadi.obtainedPoints === 8
      ? 'Different Nadis guarantee physiological diversity, strong genetic vitality, and healthy progeny.'
      : 'Same Nadi identified. Consultation with a qualified physician and Vedic Nadi Shanti is advised.',
    remediesOrGuidance: `Overall Ashtakoota Milan achieves ${totalScore} / 36 points. ${verdictDescription}`,
  };

  // 7. Interpretations
  const sections = await interpretationProvider.generateInterpretations(
    ReportType.MARRIAGE_COMPATIBILITY,
    chart1Data
  );

  return {
    version: '1.0',
    type: ReportType.MARRIAGE_COMPATIBILITY,
    title: 'Marriage & Relationship Compatibility Report',
    generatedAt: new Date().toISOString(),
    profile1,
    profile2,
    configuration,
    gunaMilan: {
      totalScore,
      maxScore: 36,
      verdict,
      verdictDescription,
      kootas,
    },
    manglikComparison: {
      personA: {
        name: profile1.name,
        isManglik: isPersonAManglik,
        severity: mangalComp.personA.severity,
        factors: mangalComp.personA.cancellationFactors,
      },
      personB: {
        name: profile2.name,
        isManglik: isPersonBManglik,
        severity: mangalComp.personB.severity,
        factors: mangalComp.personB.cancellationFactors,
      },
      verdict: manglikVerdictStr,
      explanation: manglikExplanation,
    },
    synthesis,
    sections,
  };
}
