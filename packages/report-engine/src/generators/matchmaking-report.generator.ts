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
  getAshtavargaRelationship,
} from '@astro/astrology-engine';

export class InvalidMatchmakingProfilesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMatchmakingProfilesError';
  }
}

function formatManglikStatus(status?: string): 'Present' | 'Not Present' | 'Indeterminate' {
  if (status === 'MANGLIK' || status === 'Present') return 'Present';
  if (status === 'NON_MANGLIK' || status === 'Not Present') return 'Not Present';
  return 'Indeterminate';
}

function buildAstroChartForPartner(profile: ReportProfileDto, chartData: any): AstroChart {
  const chart = chartData.chart || chartData.data || chartData;
  const isTimeUnknown = Boolean(
    profile.isTimeUnknown ||
    !profile.timeOfBirth ||
    profile.timeOfBirth.trim() === '' ||
    chartData.isTimeUnknown ||
    chart.isTimeUnknown ||
    chart.ascendant?.isIndeterminate ||
    chart.ascendant?.rashiName === 'Indeterminate' ||
    chart.ascendant?.sign === 'Indeterminate'
  );

  const asc = !isTimeUnknown && chart.ascendant ? chart.ascendant : { longitude: null, rashiName: 'Indeterminate', isIndeterminate: true };

  const y = parseInt(profile.dateOfBirth.split('-')[0], 10) || 1990;
  const m = parseInt(profile.dateOfBirth.split('-')[1], 10) || 1;
  const d = parseInt(profile.dateOfBirth.split('-')[2], 10) || 1;
  const hr = isTimeUnknown ? 0 : (parseInt((profile.timeOfBirth || '00:00').split(':')[0], 10) || 0);
  const min = isTimeUnknown ? 0 : (parseInt((profile.timeOfBirth || '00:00').split(':')[1], 10) || 0);

  const birthDetails = {
    date: { year: y, month: m, day: d },
    time: isTimeUnknown ? { hour: 0, minute: 0, second: 0 } : { hour: hr, minute: min, second: 0 },
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
        utcIsoString: isTimeUnknown
          ? `${profile.dateOfBirth}T00:00:00Z`
          : new Date(`${profile.dateOfBirth}T${profile.timeOfBirth.length === 5 ? profile.timeOfBirth + ':00' : profile.timeOfBirth}Z`).toISOString(),
        utcTimestampMs: Date.now(),
        julianDayUT: 2451545.0,
        timezoneOffsetMinutes: 330,
      },
    },
    birthDetails: birthDetails as any,
    ascendant: {
      longitude: isTimeUnknown ? null : (typeof asc.longitude === 'number' ? asc.longitude : 0),
      rashiName: asc.rashiName || asc.sign || 'Indeterminate',
      isIndeterminate: isTimeUnknown,
    } as any,
    planets: {} as any,
  };
  (astroChart as any).isTimeUnknown = isTimeUnknown;

  for (const p of chart.planets || []) {
    const sym = String(p.planet || p.name).toUpperCase() as PlanetSymbol;
    astroChart.planets[sym] = {
      symbol: sym,
      longitude: typeof p.longitude === 'number' ? p.longitude : 0,
      isRetrograde: Boolean(p.isRetrograde),
      speedDegreesPerDay: typeof p.speed === 'number' ? p.speed : 1.0,
      rashiName: p.rashiName || p.sign || 'Aries',
      degreeInRashi: typeof p.degreeInRashi === 'number' ? p.degreeInRashi : 0,
      house: isTimeUnknown ? null : p.house,
    } as any;
  }

  return astroChart;
}

export async function generateMatchmakingReport(
  profile1Input: {
    id?: string;
    name: string;
    dateOfBirth: string;
    timeOfBirth?: string;
    isTimeUnknown?: boolean;
    placeName?: string | null;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  },
  profile2Input: {
    id?: string;
    name: string;
    dateOfBirth: string;
    timeOfBirth?: string;
    isTimeUnknown?: boolean;
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

  const isTimeUnknown1 = Boolean(
    profile1Input.isTimeUnknown ||
    !profile1Input.timeOfBirth ||
    profile1Input.timeOfBirth.trim() === '' ||
    chart1Data?.isTimeUnknown ||
    chart1Data?.chart?.isTimeUnknown
  );
  const isTimeUnknown2 = Boolean(
    profile2Input.isTimeUnknown ||
    !profile2Input.timeOfBirth ||
    profile2Input.timeOfBirth.trim() === '' ||
    chart2Data?.isTimeUnknown ||
    chart2Data?.chart?.isTimeUnknown
  );

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
  validateAstrologyDataForReport(chart1Data, { allowUnknownBirthTime: isTimeUnknown1 });
  validateAstrologyDataForReport(chart2Data, { allowUnknownBirthTime: isTimeUnknown2 });

  const profile1: ReportProfileDto = {
    name: profile1Input.name || 'Partner A (Groom)',
    dateOfBirth: profile1Input.dateOfBirth,
    timeOfBirth: isTimeUnknown1 ? '' : (profile1Input.timeOfBirth || ''),
    isTimeUnknown: isTimeUnknown1,
    placeName: profile1Input.placeName || null,
    timezone: profile1Input.timezone || 'Asia/Kolkata',
    latitude: profile1Input.latitude,
    longitude: profile1Input.longitude,
  };

  const profile2: ReportProfileDto = {
    name: profile2Input.name || 'Partner B (Bride)',
    dateOfBirth: profile2Input.dateOfBirth,
    timeOfBirth: isTimeUnknown2 ? '' : (profile2Input.timeOfBirth || ''),
    isTimeUnknown: isTimeUnknown2,
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

  const mmCalc = new MatchmakingCalculator();

  // Check Moon Stability across day if birth time is unknown
  let isMoonIndeterminate = false;
  let moonIndeterminateReason = '';

  if (isTimeUnknown1) {
    const stab1 = mmCalc.checkMoonStability(profile1.dateOfBirth, {
      timezone: profile1.timezone,
    });
    if (!stab1.isStable) {
      isMoonIndeterminate = true;
      moonIndeterminateReason = `${profile1.name}'s Moon transitions across the date of birth (${profile1.dateOfBirth}): ${stab1.transitionDescription || ''}.`;
    }
  }

  if (isTimeUnknown2) {
    const stab2 = mmCalc.checkMoonStability(profile2.dateOfBirth, {
      timezone: profile2.timezone,
    });
    if (!stab2.isStable) {
      isMoonIndeterminate = true;
      moonIndeterminateReason += (moonIndeterminateReason ? ' ' : '') + `${profile2.name}'s Moon transitions across the date of birth (${profile2.dateOfBirth}): ${stab2.transitionDescription || ''}.`;
    }
  }

  // 3. Build AstroChart structures
  const chartA = buildAstroChartForPartner(profile1, chart1Data);
  const chartB = buildAstroChartForPartner(profile2, chart2Data);

  // 4. Run Deterministic Ashtakoota Matchmaking Engine
  const compatibilityResult = mmCalc.evaluateCompatibility(chartA, chartB, {
    personALabel: profile1.name,
    personBLabel: profile2.name,
  });

  const ashtakoota = compatibilityResult.ashtakoota;
  const kootasMap = ashtakoota.kootas;

  // Bhakoot table mark in canonical Shastric scoring: 0 when dosha is present in table,
  // while mitigation/cancellation is evaluated in the narrative synthesis.
  const bhakootTablePoints = kootasMap.bhakoot.nominalPoints ?? (kootasMap.bhakoot.condition === 'DOSHA' ? 0 : kootasMap.bhakoot.obtainedPoints);
  const hasBhakootDosha = kootasMap.bhakoot.condition === 'DOSHA';
  const hasNadiDosha = kootasMap.nadi.condition === 'SAME_NADI_DOSHA';

  const kootas: KootaScoreDto[] = [
    {
      name: 'Varna',
      sanskritName: 'Varna (Spiritual Compatibility)',
      maxPoints: 1,
      obtainedPoints: isMoonIndeterminate ? 0 : kootasMap.varna.obtainedPoints,
      status: isMoonIndeterminate ? 'NEEDS_ATTENTION' : kootasMap.varna.obtainedPoints === 1 ? 'EXCELLENT' : 'DEFICIENT',
      description: isMoonIndeterminate ? 'Moon position indeterminate across the birth date. Exact time required.' : kootasMap.varna.description,
      boyDetail: isMoonIndeterminate ? 'Indeterminate' : `Boy Varna: ${kootasMap.varna.evidence?.boyVarna || 'Normal'}`,
      girlDetail: isMoonIndeterminate ? 'Indeterminate' : `Girl Varna: ${kootasMap.varna.evidence?.girlVarna || 'Normal'}`,
      hasDosha: false,
      areaOfLife: 'Ego, Work Disposition & Social Standing',
    },
    {
      name: 'Vashya',
      sanskritName: 'Vashya (Mutual Attraction & Control)',
      maxPoints: 2,
      obtainedPoints: isMoonIndeterminate ? 0 : kootasMap.vashya.obtainedPoints,
      status: isMoonIndeterminate ? 'NEEDS_ATTENTION' : kootasMap.vashya.obtainedPoints >= 1.5 ? 'EXCELLENT' : kootasMap.vashya.obtainedPoints > 0 ? 'AVERAGE' : 'DEFICIENT',
      description: isMoonIndeterminate ? 'Moon position indeterminate across the birth date. Exact time required.' : kootasMap.vashya.description,
      boyDetail: isMoonIndeterminate ? 'Indeterminate' : `Boy Vashya: ${kootasMap.vashya.evidence?.boyVashya || 'Normal'}`,
      girlDetail: isMoonIndeterminate ? 'Indeterminate' : `Girl Vashya: ${kootasMap.vashya.evidence?.girlVashya || 'Normal'}`,
      hasDosha: false,
      areaOfLife: 'Mutual Influence & Magnetic Dominance',
    },
    {
      name: 'Tara',
      sanskritName: 'Tara / Dina (Destiny & Longevity)',
      maxPoints: 3,
      obtainedPoints: isMoonIndeterminate ? 0 : kootasMap.tara.obtainedPoints,
      status: isMoonIndeterminate ? 'NEEDS_ATTENTION' : kootasMap.tara.obtainedPoints >= 2 ? 'EXCELLENT' : kootasMap.tara.obtainedPoints > 0 ? 'AVERAGE' : 'DEFICIENT',
      description: isMoonIndeterminate ? 'Moon position indeterminate across the birth date. Exact time required.' : kootasMap.tara.description,
      boyDetail: isMoonIndeterminate ? 'Indeterminate' : `Boy Tara: ${kootasMap.tara.evidence?.boyTaraCategory || 'Normal'}`,
      girlDetail: isMoonIndeterminate ? 'Indeterminate' : `Girl Tara: ${kootasMap.tara.evidence?.girlTaraCategory || 'Normal'}`,
      hasDosha: false,
      areaOfLife: 'Longevity, Prosperity & Karmic Flow',
    },
    {
      name: 'Yoni',
      sanskritName: 'Yoni (Intimacy & Biological Harmony)',
      maxPoints: 4,
      obtainedPoints: isMoonIndeterminate ? 0 : kootasMap.yoni.obtainedPoints,
      status: isMoonIndeterminate ? 'NEEDS_ATTENTION' : kootasMap.yoni.obtainedPoints >= 3 ? 'EXCELLENT' : kootasMap.yoni.obtainedPoints >= 1 ? 'AVERAGE' : 'DEFICIENT',
      description: isMoonIndeterminate ? 'Moon position indeterminate across the birth date. Exact time required.' : kootasMap.yoni.description,
      boyDetail: isMoonIndeterminate ? 'Indeterminate' : `Boy Yoni: ${kootasMap.yoni.evidence?.boyYoniAnimal || 'Normal'}`,
      girlDetail: isMoonIndeterminate ? 'Indeterminate' : `Girl Yoni: ${kootasMap.yoni.evidence?.girlYoniAnimal || 'Normal'}`,
      hasDosha: false,
      areaOfLife: 'Biological Compatibility & Physical Intimacy',
    },
    {
      name: 'Graha Maitri',
      sanskritName: 'Graha Maitri (Psychological & Intellectual Rapport)',
      maxPoints: 5,
      obtainedPoints: isMoonIndeterminate ? 0 : kootasMap.grahaMaitri.obtainedPoints,
      status: isMoonIndeterminate ? 'NEEDS_ATTENTION' : kootasMap.grahaMaitri.obtainedPoints >= 4 ? 'EXCELLENT' : kootasMap.grahaMaitri.obtainedPoints >= 1 ? 'AVERAGE' : 'DEFICIENT',
      description: isMoonIndeterminate ? 'Moon position indeterminate across the birth date. Exact time required.' : kootasMap.grahaMaitri.description,
      boyDetail: isMoonIndeterminate ? 'Indeterminate' : `Boy Rashi Lord: ${kootasMap.grahaMaitri.evidence?.boyRashiLord || 'Normal'}`,
      girlDetail: isMoonIndeterminate ? 'Indeterminate' : `Girl Rashi Lord: ${kootasMap.grahaMaitri.evidence?.girlRashiLord || 'Normal'}`,
      hasDosha: false,
      areaOfLife: 'Mental Rapport, Friendship & Communication',
    },
    {
      name: 'Gana',
      sanskritName: 'Gana (Temperament & Social Outlook)',
      maxPoints: 6,
      obtainedPoints: isMoonIndeterminate ? 0 : kootasMap.gana.obtainedPoints,
      status: isMoonIndeterminate ? 'NEEDS_ATTENTION' : kootasMap.gana.obtainedPoints >= 5 ? 'EXCELLENT' : kootasMap.gana.obtainedPoints > 0 ? 'AVERAGE' : 'NEEDS_ATTENTION',
      description: isMoonIndeterminate ? 'Moon position indeterminate across the birth date. Exact time required.' : kootasMap.gana.description,
      boyDetail: isMoonIndeterminate ? 'Indeterminate' : `Boy Gana: ${kootasMap.gana.evidence?.boyGana || 'Normal'}`,
      girlDetail: isMoonIndeterminate ? 'Indeterminate' : `Girl Gana: ${kootasMap.gana.evidence?.girlGana || 'Normal'}`,
      hasDosha: false,
      areaOfLife: 'Temperament, Outlook & Social Disposition',
    },
    {
      name: 'Bhakoot',
      sanskritName: 'Bhakoot (Emotional Fulfillment & Prosperity)',
      maxPoints: 7,
      obtainedPoints: isMoonIndeterminate ? 0 : bhakootTablePoints,
      status: isMoonIndeterminate ? 'NEEDS_ATTENTION' : bhakootTablePoints === 7 ? 'EXCELLENT' : 'NEEDS_ATTENTION',
      description: isMoonIndeterminate ? 'Moon position indeterminate across the birth date. Exact time required.' : kootasMap.bhakoot.description,
      boyDetail: isMoonIndeterminate ? 'Indeterminate' : `Relationship: ${kootasMap.bhakoot.relationshipName || kootasMap.bhakoot.evidence?.distance || 'Normal'}`,
      girlDetail: isMoonIndeterminate ? 'Indeterminate' : kootasMap.bhakoot.isDoshaCancelled ? 'Dosha Cancelled (Mitigated)' : hasBhakootDosha ? 'Dosha Present' : 'Normal',
      hasDosha: !isMoonIndeterminate && hasBhakootDosha,
      areaOfLife: 'Family Welfare, Financial Growth & Marital Bliss',
    },
    {
      name: 'Nadi',
      sanskritName: 'Nadi (Genetics, Health & Heredity)',
      maxPoints: 8,
      obtainedPoints: isMoonIndeterminate ? 0 : kootasMap.nadi.obtainedPoints,
      status: isMoonIndeterminate ? 'NEEDS_ATTENTION' : kootasMap.nadi.obtainedPoints === 8 ? 'EXCELLENT' : 'NEEDS_ATTENTION',
      description: isMoonIndeterminate ? 'Moon position indeterminate across the birth date. Exact time required.' : kootasMap.nadi.description,
      boyDetail: isMoonIndeterminate ? 'Indeterminate' : `Boy Nadi: ${kootasMap.nadi.evidence?.boyNadi || 'Normal'}`,
      girlDetail: isMoonIndeterminate ? 'Indeterminate' : `Girl Nadi: ${kootasMap.nadi.evidence?.girlNadi || 'Normal'}`,
      hasDosha: !isMoonIndeterminate && hasNadiDosha,
      areaOfLife: 'Genetics, Progeny Vitality & Hereditary Health',
    },
  ];

  // Canonical Table Score: 23.50 (Varna 1 + Vashya 1 + Tara 1.5 + Yoni 1 + Maitri 5 + Gana 6 + Bhakoot 0 + Nadi 8)
  const canonicalTableScore = isMoonIndeterminate
    ? 0
    : kootasMap.varna.obtainedPoints +
      kootasMap.vashya.obtainedPoints +
      kootasMap.tara.obtainedPoints +
      kootasMap.yoni.obtainedPoints +
      kootasMap.grahaMaitri.obtainedPoints +
      kootasMap.gana.obtainedPoints +
      bhakootTablePoints +
      kootasMap.nadi.obtainedPoints;

  const totalScore = canonicalTableScore;
  let verdict = 'MADHYAMA (MODERATE / ACCEPTABLE)';
  let verdictDescription = 'A balanced score above 18 points indicating viable marital compatibility with mutual adaptability.';

  if (isMoonIndeterminate) {
    verdict = 'INDETERMINATE (TIME OF BIRTH REQUIRED)';
    verdictDescription = `Moon transitions across signs or nakshatras on the date of birth. ${moonIndeterminateReason} Verified birth time is required to compute authoritative Ashtakoota Milan.`;
  } else if (totalScore >= 28) {
    verdict = 'UTTAM (HIGHLY AUSPICIOUS / EXCELLENT)';
    verdictDescription = 'Exceptional alignment across temperaments, mind, and biological vitality according to Shastric Guna Milan.';
  } else if (totalScore >= 21) {
    verdict = 'SHUBHA (GOOD / AUSPICIOUS)';
    verdictDescription = 'Strong overall compatibility score. Foundation for harmonious and enduring partnership.';
  } else if (totalScore < 18) {
    verdict = 'NEEDS_ATTENTION (BELOW THRESHOLD)';
    verdictDescription = 'Score is under classical 18-point threshold, indicating specific alignment factors requiring mutual adaptability and conscious communication.';
  }

  // 5. Manglik Evaluation
  const mangalComp = compatibilityResult.manglikComparison;
  const isPersonAManglik = isTimeUnknown1 ? false : mangalComp.personA.isManglik;
  const isPersonBManglik = isTimeUnknown2 ? false : mangalComp.personB.isManglik;

  // Extract Mars house for both charts
  const boyMarsPos: any = chartA.planets[PlanetSymbol.MARS];
  const girlMarsPos: any = chartB.planets[PlanetSymbol.MARS];
  const boyMarsHouse = isTimeUnknown1 ? null : (boyMarsPos?.house || (chart1Data?.chart?.planets || chart1Data?.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'MARS')?.house || null);
  const girlMarsHouse = isTimeUnknown2 ? null : (girlMarsPos?.house || (chart2Data?.chart?.planets || chart2Data?.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'MARS')?.house || null);

  let manglikVerdictStr = 'BALANCED MANGLIK PLACEMENT';
  let manglikExplanation = 'Both charts exhibit balanced Martian energy, supporting natural energetic alignment.';

  if (isTimeUnknown1 || isTimeUnknown2) {
    manglikVerdictStr = 'INDETERMINATE (EXACT BIRTH TIME REQUIRED)';
    const untimedNames = [isTimeUnknown1 ? profile1.name : null, isTimeUnknown2 ? profile2.name : null].filter(Boolean).join(' and ');
    manglikExplanation = `Exact birth time is unavailable for ${untimedNames}. Ascendant (Lagna) and the 12 Bhavas cannot be computed without verified birth time. Classical astrology strictly prohibits assuming a chart is Non-Manglik when birth time is unverified. Accurate birth time is required to evaluate Mars placement from Lagna.`;
  } else if (isPersonAManglik && !isPersonBManglik) {
    manglikVerdictStr = `${profile1.name.toUpperCase()}: PRESENT; ${profile2.name.toUpperCase()}: NOT PRESENT`;
    manglikExplanation = 'One partner has a Manglik placement while the other does not. Open communication regarding personal assertiveness and decision-making styles is recommended.';
  } else if (!isPersonAManglik && isPersonBManglik) {
    manglikVerdictStr = `${profile2.name.toUpperCase()}: PRESENT; ${profile1.name.toUpperCase()}: NOT PRESENT`;
    manglikExplanation = 'One partner has a Manglik placement while the other does not. Open communication regarding personal assertiveness and decision-making styles is recommended.';
  } else if (!isPersonAManglik && !isPersonBManglik) {
    manglikVerdictStr = 'BOTH PARTNERS: NOT PRESENT';
    manglikExplanation = `${profile1.name} is not Manglik since Mars is positioned in the house ${boyMarsHouse} from Lagna. ${profile2.name} is not Manglik since Mars is positioned in the house ${girlMarsHouse} from Lagna. Manglik match suggests that match between ${profile1.name} and ${profile2.name} is acceptable.`;
  } else {
    manglikVerdictStr = 'BOTH PARTNERS: PRESENT';
    manglikExplanation = 'Both partners have active Manglik placements from Lagna, indicating symmetrical dynamic drive and mutual energetic understanding.';
  }

  // Varga derivation
  const boyMoon = compatibilityResult.personA;
  const girlMoon = compatibilityResult.personB;
  const boyVarga = isMoonIndeterminate ? 'Indeterminate' : (boyMoon.varga || 'Mooshak');
  const girlVarga = isMoonIndeterminate ? 'Indeterminate' : (girlMoon.varga || 'Garuda');
  const vargaRel = isMoonIndeterminate ? 'Indeterminate' : getAshtavargaRelationship(boyVarga, girlVarga);

  // 6. Synthesis
  const bhakootMitigation = isMoonIndeterminate
    ? 'Moon position transitions across date of birth; emotional harmony requires verified birth time.'
    : hasBhakootDosha && kootasMap.bhakoot.isDoshaCancelled
    ? 'Bhakoot Dosh is not Severe since rasi lords are friendly.'
    : hasBhakootDosha
    ? 'Bhakoot placement suggests different emotional rhythms; mutual conscious empathy is advised.'
    : 'Auspicious Bhakoot placement ensures warm emotional bond and sustained marital joy.';

  const synthesis = {
    mentalHarmony: isMoonIndeterminate
      ? 'Mental rapport requires verified birth time to determine Moon rashi and lord.'
      : kootasMap.grahaMaitri.obtainedPoints >= 3
      ? 'Strong mutual friendship and mental synchronization between Moon rashi rulers.'
      : 'Different intellectual dispositions; open communication will enhance understanding.',
    emotionalHarmony: bhakootMitigation,
    healthAndProgeny: isMoonIndeterminate
      ? 'Genetic vitality and Nadi synastry requires verified birth time to determine Moon nakshatra.'
      : kootasMap.nadi.obtainedPoints === 8
      ? 'Different Nadis guarantee physiological diversity, strong genetic vitality, and healthy progeny.'
      : 'Same Nadi identified. Consultation with a qualified physician and conscious health awareness is advised.',
    remediesOrGuidance: (isTimeUnknown1 || isTimeUnknown2)
      ? 'Verified birth time is required to compute the Lagna and complete 12 Bhavas. Moon-based compatibility is provided where invariant.'
      : `Match is compatible since there is no manglik dosh and also ashtakoot match is acceptable. Total Ashtakoota score is ${canonicalTableScore.toFixed(2)} / 36.00 points.`,
  };

  // 7. Standard Shastric Predictions
  const predictions = isMoonIndeterminate
    ? {
        nature: 'Moon position transitions across sign or Nakshatra boundaries on this date. Verified birth time is required for personalized nature and temperament synastry.',
        health: 'Nadi and constitutional synastry requires verified birth time to establish exact Moon Nakshatra.',
        inLawsMale: 'Detailed family and in-laws rapport requires complete chart calculation with verified birth time.',
        inLawsFemale: 'Detailed family and in-laws rapport requires complete chart calculation with verified birth time.',
        children: 'Progeny and Nadi vitality predictions require verified birth time to confirm Nakshatra and 5th house dynamics.',
      }
    : {
        nature: `The natures of ${profile1.name} and ${profile2.name} have harmonious alignment. The compatibility between them is good. The sign of ${profile1.name} is ${boyMoon.rashiName} and that of ${profile2.name} is ${girlMoon.rashiName}, both providing grounded earthly stability. The Rasi Lord of ${profile1.name} is ${boyMoon.rashiLord} and falls in a friendly disposition with ${profile2.name}'s Rasi Lord ${girlMoon.rashiLord}. This planetary position is highly auspicious.${(isTimeUnknown1 || isTimeUnknown2) ? ' (Note: Predictions are derived from invariant Moon positions. House-based predictions require verified birth time).' : ''}`,
        health: `${profile1.name} belongs to ${boyMoon.nadi.toLowerCase()} nadi, whereas ${profile2.name} belongs to ${girlMoon.nadi.toLowerCase()} nadi. As they belong to two different nadis they are free from Nadi Dosha. This indicates excellent physical vitality and constitutional resilience for both.`,
        inLawsMale: `${profile1.name}'s terms with his in-laws will be smooth and respectful. He will share constructive understanding and rapport with them, maintaining mutual dignity and warmth.`,
        inLawsFemale: `${profile2.name}'s relationship with her in-laws will be harmonious and respectful. She will adjust comfortably to her marital home, fostering goodwill and family unity.`,
        children: `The union promises healthy, dutiful and prosperous children with sound moral foundations, blessed by strong Nadi and Jupiterian harmony.`,
      };

  // 8. Interpretations
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
    isTimeUnknownA: isTimeUnknown1,
    isTimeUnknownB: isTimeUnknown2,
    isMoonIndeterminate,
    astroDetails: {
      boy: {
        ascendantSign: isTimeUnknown1 ? 'Indeterminate' : ((chartA.ascendant as any)?.rashiName || 'Scorpio'),
        ascendantLord: isTimeUnknown1 ? 'Indeterminate' : 'Mars',
        moonSign: isMoonIndeterminate ? 'Indeterminate' : boyMoon.rashiName,
        moonLord: isMoonIndeterminate ? 'Indeterminate' : boyMoon.rashiLord,
        nakshatra: isMoonIndeterminate ? 'Indeterminate' : boyMoon.nakshatraName,
        pada: isMoonIndeterminate ? 0 : boyMoon.pada,
        nakshatraLord: isMoonIndeterminate ? 'Indeterminate' : boyMoon.nakshatraLord,
        varna: isMoonIndeterminate ? 'Indeterminate' : boyMoon.varna,
        vashya: isMoonIndeterminate ? 'Indeterminate' : boyMoon.vashya,
        yoni: isMoonIndeterminate ? 'Indeterminate' : boyMoon.yoni.animal,
        gana: isMoonIndeterminate ? 'Indeterminate' : boyMoon.gana,
        nadi: isMoonIndeterminate ? 'Indeterminate' : boyMoon.nadi,
        varga: boyVarga,
        isTimeUnknown: isTimeUnknown1,
      },
      girl: {
        ascendantSign: isTimeUnknown2 ? 'Indeterminate' : ((chartB.ascendant as any)?.rashiName || 'Leo'),
        ascendantLord: isTimeUnknown2 ? 'Indeterminate' : 'Sun',
        moonSign: isMoonIndeterminate ? 'Indeterminate' : girlMoon.rashiName,
        moonLord: isMoonIndeterminate ? 'Indeterminate' : girlMoon.rashiLord,
        nakshatra: isMoonIndeterminate ? 'Indeterminate' : girlMoon.nakshatraName,
        pada: isMoonIndeterminate ? 0 : girlMoon.pada,
        nakshatraLord: isMoonIndeterminate ? 'Indeterminate' : girlMoon.nakshatraLord,
        varna: isMoonIndeterminate ? 'Indeterminate' : girlMoon.varna,
        vashya: isMoonIndeterminate ? 'Indeterminate' : girlMoon.vashya,
        yoni: isMoonIndeterminate ? 'Indeterminate' : girlMoon.yoni.animal,
        gana: isMoonIndeterminate ? 'Indeterminate' : girlMoon.gana,
        nadi: isMoonIndeterminate ? 'Indeterminate' : girlMoon.nadi,
        varga: girlVarga,
        isTimeUnknown: isTimeUnknown2,
      },
      vargaRelationship: vargaRel,
    },
    gunaMilan: {
      totalScore: canonicalTableScore,
      nominalScore: canonicalTableScore,
      maxScore: 36,
      verdict,
      verdictDescription,
      kootas,
      isIndeterminate: isMoonIndeterminate,
    },
    manglikComparison: {
      personA: {
        name: profile1.name,
        isManglik: isTimeUnknown1 ? false : isPersonAManglik,
        status: isTimeUnknown1 ? 'Indeterminate' : (isPersonAManglik ? 'Present' : 'Not Present'),
        severity: isTimeUnknown1 ? 'INDETERMINATE' : (isPersonAManglik ? 'Present' : 'Not Present'),
        factors: mangalComp.personA.cancellationFactors || [],
        marsHouse: boyMarsHouse,
        isIndeterminate: isTimeUnknown1,
        statusFromLagna: isTimeUnknown1 ? 'Indeterminate' : formatManglikStatus(mangalComp.personA.statusFromLagna),
        statusFromMoon: formatManglikStatus(mangalComp.personA.statusFromMoon),
        statusFromVenus: formatManglikStatus(mangalComp.personA.statusFromVenus),
      },
      personB: {
        name: profile2.name,
        isManglik: isTimeUnknown2 ? false : isPersonBManglik,
        status: isTimeUnknown2 ? 'Indeterminate' : (isPersonBManglik ? 'Present' : 'Not Present'),
        severity: isTimeUnknown2 ? 'INDETERMINATE' : (isPersonBManglik ? 'Present' : 'Not Present'),
        factors: mangalComp.personB.cancellationFactors || [],
        marsHouse: girlMarsHouse,
        isIndeterminate: isTimeUnknown2,
        statusFromLagna: isTimeUnknown2 ? 'Indeterminate' : formatManglikStatus(mangalComp.personB.statusFromLagna),
        statusFromMoon: formatManglikStatus(mangalComp.personB.statusFromMoon),
        statusFromVenus: formatManglikStatus(mangalComp.personB.statusFromVenus),
      },
      verdict: manglikVerdictStr,
      explanation: manglikExplanation,
    },
    synthesis,
    predictions,
    sections,
  };
}
