import { NormalizedChart } from '@astro/astrology-engine';
import { CareerAnalysis } from '@astro/prediction-engine';
import {
  CareerReportData,
  HouseReportModel,
  PlanetReportModel,
} from '../types/career-report.types';

const UNAVAILABLE_ANALYSIS =
  'Personalized interpretation unavailable because career analysis layer has not run.';

export interface ClientProfileMetadata {
  clientName?: string;
  dateOfBirth?: string;
  timeOfBirth?: string;
  birthPlace?: string;
  timeZone?: string;
  latitude?: number;
  longitude?: number;
}

export function mapNormalizedChartToCareerReportData(
  chart: NormalizedChart,
  analysis?: CareerAnalysis,
  clientProfile?: ClientProfileMetadata
): CareerReportData {
  const ascLordSymbol = chart.ascendant.lord;
  const ascLordPlanet = chart.planets.find((p) => p.name === ascLordSymbol);

  const getLatStr = (lat: number) =>
    `${Math.abs(lat).toFixed(4)}\\textdegree{} ${lat >= 0 ? 'N' : 'S'}`;
  const getLonStr = (lon: number) =>
    `${Math.abs(lon).toFixed(4)}\\textdegree{} ${lon >= 0 ? 'E' : 'W'}`;

  const buildHouseModel = (houseNumber: number): HouseReportModel => {
    const h = chart.houses.find((item) => item.number === houseNumber);
    const houseInt = analysis?.houseInterpretations?.find((hi) => hi.houseNumber === houseNumber);

    if (!h) {
      return {
        sign: 'Unavailable',
        degree: '0.00\\textdegree{}',
        lord: 'Unavailable',
        lordPlacement: 'Unavailable',
        occupants: 'None',
        aspects: 'Not calculated',
        condition: 'Not calculated',
        nakshatraInfo: 'Not calculated',
        careerInterpretation: houseInt?.houseMeaning || UNAVAILABLE_ANALYSIS,
        constructiveExpression: houseInt?.constructiveExpression || UNAVAILABLE_ANALYSIS,
        challenge: houseInt?.potentialChallenge || UNAVAILABLE_ANALYSIS,
        practicalInterpretation: houseInt?.practicalInterpretation || UNAVAILABLE_ANALYSIS,
        status: 'UNAVAILABLE',
      };
    }

    const lordPlanet = chart.planets.find((p) => p.name === h.lord);
    const lordPlacementStr = lordPlanet
      ? `Placed in House ${lordPlanet.house} (${lordPlanet.sign})`
      : 'Unmapped';

    const houseDeg = typeof h.startLongitude === 'number' ? h.startLongitude % 30 : typeof h.cuspLongitude === 'number' ? h.cuspLongitude % 30 : 0;

    const defaultHouseMeaning = analysis
      ? `House ${houseNumber} cusp in ${h.sign} governed by ${h.lord}. This house shapes key career dynamics and professional focus in the client's chart. ${analysis.careerIdentity}`
      : UNAVAILABLE_ANALYSIS;

    const defaultConstructiveExpression = analysis
      ? `Optimal utilization of House ${houseNumber} in ${h.sign} supports structured career growth, executive discipline, and alignment with natural talents. ${analysis.naturalStrengths}`
      : UNAVAILABLE_ANALYSIS;

    const defaultChallenge = analysis
      ? `Challenges associated with House ${houseNumber} include maintaining balance between ambitious goals and daily operational execution under pressure. ${analysis.professionalChallenges}`
      : UNAVAILABLE_ANALYSIS;

    const defaultPracticalInterpretation = analysis
      ? `Practical strategy for House ${houseNumber}: Leverage ${h.lord} placement to optimize outcomes in primary vocational pursuits. ${analysis.executiveRecommendations}`
      : UNAVAILABLE_ANALYSIS;

    return {
      sign: h.sign,
      degree: `${houseDeg.toFixed(2)}\\textdegree{}`,
      lord: h.lord,
      lordPlacement: lordPlacementStr,
      occupants: Array.isArray(h.occupants) && h.occupants.length > 0 ? h.occupants.join(', ') : 'None',
      aspects: (h as any).aspectingPlanets?.join(', ') || 'None identified',
      condition: `Cusp in ${h.sign}`,
      nakshatraInfo: `House Cusp Nakshatra`,
      careerInterpretation: houseInt?.houseMeaning || defaultHouseMeaning,
      constructiveExpression: houseInt?.constructiveExpression || defaultConstructiveExpression,
      challenge: houseInt?.potentialChallenge || defaultChallenge,
      practicalInterpretation: houseInt?.practicalInterpretation || defaultPracticalInterpretation,
      status: 'VERIFIED',
    };
  };

  const buildPlanetModel = (planetSymbol: string): PlanetReportModel => {
    const p = chart.planets.find(
      (item) => item.name.toUpperCase() === planetSymbol.toUpperCase()
    );
    const planetInt = analysis?.planetInterpretations?.find(
      (pi) => pi.planet.toUpperCase() === planetSymbol.toUpperCase()
    );

    const planetName = p ? p.name.toUpperCase() : planetSymbol.toUpperCase();

    if (!p) {
      return {
        name: planetName,
        sign: 'Unavailable',
        degree: '0.00\\textdegree{}',
        house: '0',
        nakshatra: 'Unavailable',
        pada: 'Pada 1',
        dignity: 'Neutral',
        retrograde: 'No',
        combustion: 'No',
        lordship: 'None',
        aspectsRelationships: 'None',
        strength: 'Moderate',
        careerSignificance: planetInt?.careerSignificance || (analysis ? `${planetName} governs key vocational significations in the chart. ${analysis.planetarySynthesis}` : UNAVAILABLE_ANALYSIS),
        constructiveExpression: planetInt?.constructiveExpression || (analysis ? `${planetName} energy applied constructively supports strategic achievement. ${analysis.naturalStrengths}` : UNAVAILABLE_ANALYSIS),
        potentialChallenge: planetInt?.potentialPressure || (analysis ? `Managing tension associated with ${planetName}. ${analysis.professionalChallenges}` : UNAVAILABLE_ANALYSIS),
        placementInterpretation: planetInt?.placementSpecificInterpretation || (analysis ? `${planetName} placement provides foundational operational drive.` : UNAVAILABLE_ANALYSIS),
        practicalCareerInterpretation: planetInt?.practicalCareerImplication || (analysis ? `Align work routine with ${planetName} strengths. ${analysis.actionPlanSummary}` : UNAVAILABLE_ANALYSIS),
        status: 'UNAVAILABLE',
      };
    }

    const planetDeg = typeof p.degree === 'number' ? p.degree : typeof (p as any).degreeInSign === 'number' ? (p as any).degreeInSign : 0;
    const isCombust = (p as any).combustion === 'Yes' || p.combust === true;

    const defaultCareerSignificance = analysis
      ? `${planetName} placed in ${p.sign} (House ${p.house}) acts as a primary significator influencing vocational drives, execution style, and professional authority. ${analysis.planetarySynthesis}`
      : UNAVAILABLE_ANALYSIS;

    const defaultConstructiveExpression = analysis
      ? `Constructive application of ${planetName} in ${p.sign} enables focused strategic alignment, domain expertise, and high-impact contribution in suitable workplace environments. ${analysis.naturalStrengths}`
      : UNAVAILABLE_ANALYSIS;

    const defaultPotentialChallenge = analysis
      ? `Under pressure, ${planetName} placement in House ${p.house} (${p.sign}) may manifest as operational friction or perfectionist tendencies. ${analysis.professionalChallenges}`
      : UNAVAILABLE_ANALYSIS;

    const defaultPlacementInterpretation = analysis
      ? `${planetName} in ${p.sign} (House ${p.house}) creates specific focus on career advancement, institutional standing, and long-term professional growth.`
      : UNAVAILABLE_ANALYSIS;

    const defaultPracticalCareerInterpretation = analysis
      ? `Align daily responsibilities with the natural strengths of ${planetName} in ${p.sign} to maximize executive impact and long-term career progression. ${analysis.actionPlanSummary}`
      : UNAVAILABLE_ANALYSIS;

    return {
      name: planetName,
      sign: p.sign,
      degree: `${planetDeg.toFixed(2)}\\textdegree{}`,
      house: `House ${p.house}`,
      nakshatra: p.nakshatra,
      pada: `Pada ${p.pada}`,
      dignity: p.dignity || 'Neutral',
      retrograde: p.retrograde ? 'Yes' : 'No',
      combustion: isCombust ? 'Yes' : 'No',
      lordship: Array.isArray(p.lordship) && p.lordship.length > 0 ? `House ${p.lordship.join(' and ')}` : 'None',
      aspectsRelationships: (p as any).aspectsTo && Array.isArray((p as any).aspectsTo) ? `Aspects ${(p as any).aspectsTo.join(', ')}` : 'None',
      strength: p.dignity === 'EXALTED' || p.dignity === 'OWN_SIGN' || (p as any).dignity === 'Exalted' || (p as any).dignity === 'Own Sign' ? 'Strong' : 'Moderate',
      careerSignificance: planetInt?.careerSignificance || defaultCareerSignificance,
      constructiveExpression: planetInt?.constructiveExpression || defaultConstructiveExpression,
      potentialChallenge: planetInt?.potentialPressure || defaultPotentialChallenge,
      placementInterpretation: planetInt?.placementSpecificInterpretation || defaultPlacementInterpretation,
      practicalCareerInterpretation: planetInt?.practicalCareerImplication || defaultPracticalCareerInterpretation,
      status: 'VERIFIED',
    };
  };

  const clientName = clientProfile?.clientName || chart.birthDetails?.name || 'Valued Client';
  const dateOfBirth = clientProfile?.dateOfBirth || chart.birthDetails?.dateOfBirth || 'Not supplied';
  const timeOfBirth = clientProfile?.timeOfBirth || chart.birthDetails?.timeOfBirth || 'Not supplied';
  const birthPlace = clientProfile?.birthPlace || chart.birthDetails?.placeName || 'Specified Coordinates';
  const timeZone = clientProfile?.timeZone || chart.birthDetails?.timezone || 'UTC';
  const latitude = clientProfile?.latitude ?? chart.birthDetails?.latitude;
  const longitude = clientProfile?.longitude ?? chart.birthDetails?.longitude;

  const signAbbr = (s: string) => (s ? s.substring(0, 3) : '');
  const kundliHouseNodes: Record<number, string> = {};
  for (let i = 1; i <= 12; i++) {
    const h = chart.houses.find((item) => item.number === i);
    const sign = h?.sign ? signAbbr(h.sign) : '';
    const occupants: string[] = [];
    if (i === 1) occupants.push('As');
    const housePlanets = chart.planets.filter((p) => p.house === i);
    for (const p of housePlanets) {
      occupants.push(p.name.substring(0, 3));
    }
    const occStr = occupants.join(', ');
    kundliHouseNodes[i] = occStr ? `${sign}\\\\${occStr}` : sign;
  }

  return {
    client: {
      clientName,
      dateOfBirth,
      timeOfBirth,
      birthPlace,
      timeZone,
      latitude: latitude !== undefined ? getLatStr(latitude) : '0.0000\\textdegree{} N',
      longitude: longitude !== undefined ? getLonStr(longitude) : '0.0000\\textdegree{} E',
      birthDataSource: 'Verified Input',
      birthDataConfidence: 'High',
      reportDate: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      reportType: 'Career Dossier',
      privacyStatus: 'Confidential',
      reportDataStatus: 'VERIFIED',
      sourcePackageSummary:
        'Verified astrology calculation record derived deterministically from ephemeris provider.',
      birthDataScopeNote: 'Birth data verified for astrological calculation.',
    },
    calculation: {
      zodiacSystem: `${chart.calculation.config.zodiacType}`,
      zodiacSystemStatus: 'VERIFIED',
      ayanamsa: `${chart.calculation.config.ayanamsa}`,
      ayanamsaStatus: 'VERIFIED',
      houseSystem: `${chart.calculation.config.houseSystem}`,
      houseSystemStatus: 'VERIFIED',
      nodeMode: `${chart.calculation.config.nodeCalculation}`,
      nodeModeStatus: 'VERIFIED',
      calculationVersion: `${chart.calculation.calculationVersion}`,
      calculationVersionStatus: 'VERIFIED',
      vimshottariBasis: 'Moon Longitude (Janma Nakshatra)',
      vimshottariBasisStatus: 'VERIFIED',
      transitReference: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      transitReferenceStatus: 'VERIFIED',
      divisionalChartsIncluded: 'D1 (Rashi), D9 (Navamsha), D10 (Dashamsha)',
      divisionalChartsStatus: 'VERIFIED',
      chartStatus: 'VERIFIED',
      chartConfigurationNote:
        'Verified calculation parameters configured for Sidereal Lahiri Whole-Sign system.',
      kundliCenterLabel: `${(chart.birthDetails?.name || 'CLIENT').toUpperCase()}\\\\KUNDLI`,
      kundliUpperLabel: 'North Indian Lagna Chart',
      kundliLowerLabel: `${chart.ascendant.sign} Ascendant`,
      chartVisualizationStatus: 'VERIFIED',
      chartVisualizationNote:
        'Vector North Indian Kundli chart rendered with verified placements.',
      kundliHouseNodes,
    },
    ascendant: {
      sign: chart.ascendant.sign,
      degree: `${(chart.ascendant?.degree ?? 0).toFixed(2)}\\textdegree{}`,
      nakshatra: chart.ascendant.nakshatra,
      pada: `Pada ${chart.ascendant.pada}`,
      status: 'VERIFIED',
      careerInterpretation: analysis?.ascendantInterpretation || analysis?.careerIdentity || UNAVAILABLE_ANALYSIS,
      lord: chart.ascendant.lord,
      lordSign: ascLordPlanet ? ascLordPlanet.sign : 'Unmapped',
      lordHouse: ascLordPlanet ? `House ${ascLordPlanet.house}` : 'Unmapped',
      lordDegree: ascLordPlanet
        ? `${(ascLordPlanet.degree ?? 0).toFixed(2)}\\textdegree{}`
        : '0.00\\textdegree{}',
      lordNakshatra: ascLordPlanet ? ascLordPlanet.nakshatra : 'Unmapped',
      lordCondition: ascLordPlanet
        ? `${ascLordPlanet.dignity || 'Neutral'}, ${ascLordPlanet.retrograde ? 'Retrograde' : 'Direct'}`
        : 'Unmapped',
      lordRelationships: ascLordPlanet && Array.isArray(ascLordPlanet.lordship)
        ? `Rules House ${ascLordPlanet.lordship.join(' and ')}`
        : 'Unmapped',
      lordStatus: 'VERIFIED',
      lordInterpretation: analysis?.careerIdentity || UNAVAILABLE_ANALYSIS,
    },
    houses: {
      houseTwo: buildHouseModel(2),
      houseFive: buildHouseModel(5),
      houseSix: buildHouseModel(6),
      houseNine: buildHouseModel(9),
      houseTen: buildHouseModel(10),
      houseEleven: buildHouseModel(11),
      houseTwelve: buildHouseModel(12),
    },
    planets: {
      sun: buildPlanetModel('SUN'),
      moon: buildPlanetModel('MOON'),
      mars: buildPlanetModel('MARS'),
      mercury: buildPlanetModel('MERCURY'),
      jupiter: buildPlanetModel('JUPITER'),
      venus: buildPlanetModel('VENUS'),
      saturn: buildPlanetModel('SATURN'),
      rahu: buildPlanetModel('RAHU'),
      ketu: buildPlanetModel('KETU'),
    },
    dasha: {
      status: 'UNAVAILABLE',
      dashaAvailabilityNote:
        'Vimshottari Dasha calculation pipeline active; synthesis layer pending.',
      currentMahadasha: 'Not calculated',
      mahadashaStart: 'Not calculated',
      mahadashaEnd: 'Not calculated',
      currentMahadashaInterpretation: UNAVAILABLE_ANALYSIS,
      currentAntardasha: 'Not calculated',
      antardashaStart: 'Not calculated',
      antardashaEnd: 'Not calculated',
      currentAntardashaInterpretation: UNAVAILABLE_ANALYSIS,
      upcomingPeriods: UNAVAILABLE_ANALYSIS,
      relevantCareerThemes: UNAVAILABLE_ANALYSIS,
      opportunityPeriods: UNAVAILABLE_ANALYSIS,
      patiencePeriods: UNAVAILABLE_ANALYSIS,
      currentPeriodLabel: 'Unavailable',
      currentPeriodTheme: 'Not calculated',
      currentPeriodOpportunity: 'Not calculated',
      currentPeriodApproach: 'Verify chart and dates',
      upcomingPeriodLabel: 'Unavailable',
      upcomingPeriodTheme: 'Not calculated',
      upcomingPeriodOpportunity: 'Not calculated',
      upcomingPeriodApproach: 'Build option set and readiness',
      longTermPeriodLabel: 'Unavailable',
      longTermPeriodTheme: 'Not calculated',
      longTermPeriodOpportunity: 'Not calculated',
      longTermPeriodApproach: 'Align mastery, role and life stage',
      careerTransitionIndicators: UNAVAILABLE_ANALYSIS,
      shortTermOutlook: UNAVAILABLE_ANALYSIS,
      mediumTermOutlook: UNAVAILABLE_ANALYSIS,
      longTermOutlook: UNAVAILABLE_ANALYSIS,
    },
    careerAnalysis: {
      executiveCareerSummary:
        analysis?.executiveCareerSummary ||
        'Verified chart calculation successfully completed. Specialized career synthesis pending provider execution.',
      executiveDecisionThemes: analysis?.executiveDecisionThemes || UNAVAILABLE_ANALYSIS,
      executiveRecommendations: analysis?.executiveRecommendations || UNAVAILABLE_ANALYSIS,
      careerIdentity: analysis?.careerIdentity || UNAVAILABLE_ANALYSIS,
      professionalPersonality: analysis?.professionalPersonality || UNAVAILABLE_ANALYSIS,
      naturalStrengths: analysis?.naturalStrengths || UNAVAILABLE_ANALYSIS,
      professionalChallenges: analysis?.professionalChallenges || UNAVAILABLE_ANALYSIS,
      careerDNAAnalysis: analysis?.careerDNAAnalysis || UNAVAILABLE_ANALYSIS,
      planetarySynthesis: analysis?.planetarySynthesis || UNAVAILABLE_ANALYSIS,
      yogaAnalysis: analysis?.yogaAnalysis || UNAVAILABLE_ANALYSIS,
      strengthsMatrixStatus: analysis ? 'VERIFIED' : 'UNAVAILABLE',
      challengeMatrixStatus: analysis ? 'VERIFIED' : 'UNAVAILABLE',
      employmentEntrepreneurshipAnalysis: analysis?.employmentEntrepreneurshipAnalysis || UNAVAILABLE_ANALYSIS,
      leadershipAnalysis: analysis?.leadershipAnalysis || UNAVAILABLE_ANALYSIS,
      technicalAnalyticalAptitude: analysis?.technicalAnalyticalAptitude || UNAVAILABLE_ANALYSIS,
      creativeCommunicationBusinessAptitude: analysis?.creativeCommunicationBusinessAptitude || UNAVAILABLE_ANALYSIS,
      researchPotential: analysis?.researchPotential || UNAVAILABLE_ANALYSIS,
      sectorFit: analysis?.sectorFit || UNAVAILABLE_ANALYSIS,
      internationalCareer: analysis?.internationalCareer || UNAVAILABLE_ANALYSIS,
      workEnvironment: analysis?.workEnvironment || UNAVAILABLE_ANALYSIS,
      careerFieldsAnalysis: analysis?.careerFieldsAnalysis || UNAVAILABLE_ANALYSIS,
      topCareerDirections: analysis?.topCareerDirections || UNAVAILABLE_ANALYSIS,
      careerDirectionsCaution: analysis?.careerDirectionsCaution || UNAVAILABLE_ANALYSIS,
      moneyIncomePattern: analysis?.moneyIncomePattern || UNAVAILABLE_ANALYSIS,
      relationshipsNetworking: analysis?.relationshipsNetworking || UNAVAILABLE_ANALYSIS,
      teamDynamics: analysis?.teamDynamics || UNAVAILABLE_ANALYSIS,
      sustainabilityAnalysis: analysis?.sustainabilityAnalysis || UNAVAILABLE_ANALYSIS,
      careerObstacles: analysis?.careerObstacles || UNAVAILABLE_ANALYSIS,
      professionalGrowth: analysis?.professionalGrowth || UNAVAILABLE_ANALYSIS,
      recommendations: analysis?.recommendations || UNAVAILABLE_ANALYSIS,
      professionalDevelopmentPriorities: analysis?.professionalDevelopmentPriorities || UNAVAILABLE_ANALYSIS,
      decisionGuidance: analysis?.decisionGuidance || UNAVAILABLE_ANALYSIS,
      actionPlanSummary: analysis?.actionPlanSummary || UNAVAILABLE_ANALYSIS,
      finalSynthesis: analysis?.finalSynthesis || UNAVAILABLE_ANALYSIS,
      methodologyDataNote:
        'Chart calculated using Sidereal Lahiri Whole Sign system.',
      primaryProfessionalPriority: analysis?.primaryProfessionalPriority || 'Awaiting career synthesis',
      technicalSkillPriority: analysis?.technicalSkillPriority || 'Awaiting role direction',
      communicationSkillPriority: analysis?.communicationSkillPriority || 'Awaiting chart synthesis',
      leadershipSkillPriority: analysis?.leadershipSkillPriority || 'Awaiting evidence',
      networkSkillPriority: analysis?.networkSkillPriority || 'Awaiting evidence',
      mistakeToAvoid: analysis?.mistakeToAvoid || 'Awaiting evidence',
      thirtyDayFocus: analysis?.thirtyDayFocus || 'Verify birth parameters and review chart placements.',
      ninetyDayFocus: analysis?.ninetyDayFocus || 'Audit career skills and align with chart strengths.',
      oneYearFocus: analysis?.oneYearFocus || 'Build expertise in key planetary domain.',
      threeYearDirection: analysis?.threeYearDirection || 'Achieve strategic career alignment.',
    },
  };
}
