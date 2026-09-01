import {
  NormalizedChart,
  NormalizedPlanet,
  NormalizedHouse,
  PlanetSymbol,
} from '@astro/astrology-engine';
import {
  CareerAnalysisInput,
  ChartFactSummary,
  CareerAxisEvidence,
  HouseLordRelationshipEvidence,
  IncomeEvidence,
  WorkEnvironmentEvidence,
  LeadershipEvidence,
  AnalyticalEvidence,
  CommunicationEvidence,
  CreativityEvidence,
  ResearchEvidence,
  EntrepreneurshipEvidence,
  InternationalEvidence,
  NetworkingEvidence,
  PlanetaryEvidenceItem,
  HouseEvidenceItem,
  YogaEvidence,
  EvidenceConflicts,
  TimingEvidence,
  DataConfidence,
  EvidenceStrength,
} from '../types/evidence.types';

export class CareerEvidenceEngine {
  /**
   * Evaluates a NormalizedChart and generates structured, deterministic CareerAnalysisInput evidence.
   * Does NOT perform natural language generation or call LLMs.
   */
  public buildCareerAnalysisInput(chart: NormalizedChart): CareerAnalysisInput {
    const confidence = this.evaluateDataConfidence(chart);
    const chartSummary = this.buildChartSummary(chart);

    const careerAxis = this.evaluateCareerAxis(chart);
    const incomeEvidence = this.evaluateIncomeEvidence(chart);
    const workEnvironmentEvidence = this.evaluateWorkEnvironmentEvidence(chart);
    const leadershipEvidence = this.evaluateLeadershipEvidence(chart);
    const analyticalEvidence = this.evaluateAnalyticalEvidence(chart);
    const communicationEvidence = this.evaluateCommunicationEvidence(chart);
    const creativityEvidence = this.evaluateCreativityEvidence(chart);
    const researchEvidence = this.evaluateResearchEvidence(chart);
    const entrepreneurshipEvidence = this.evaluateEntrepreneurshipEvidence(chart);
    const internationalEvidence = this.evaluateInternationalEvidence(chart);
    const networkingEvidence = this.evaluateNetworkingEvidence(chart);

    const planetaryEvidence = this.evaluatePlanetaryEvidence(chart);
    const houseEvidence = this.evaluateHouseEvidence(chart);
    const yogaEvidence = this.evaluateYogaEvidence(chart);
    const timingEvidence = this.evaluateTimingEvidence(chart);

    const evidenceConflicts = this.detectEvidenceConflicts(
      careerAxis,
      leadershipEvidence,
      workEnvironmentEvidence,
      entrepreneurshipEvidence,
      analyticalEvidence
    );

    return {
      confidence,
      chartSummary,
      careerAxis,
      incomeEvidence,
      workEnvironmentEvidence,
      leadershipEvidence,
      analyticalEvidence,
      communicationEvidence,
      creativityEvidence,
      researchEvidence,
      entrepreneurshipEvidence,
      internationalEvidence,
      networkingEvidence,
      planetaryEvidence,
      houseEvidence,
      yogaEvidence,
      evidenceConflicts,
      timingEvidence,
    };
  }

  // --------------------------------------------------------------------------
  // CONFIDENCE & SUMMARY
  // --------------------------------------------------------------------------

  private evaluateDataConfidence(chart: NormalizedChart): DataConfidence {
    if (
      !chart ||
      !chart.ascendant ||
      !chart.planets ||
      chart.planets.length < 9 ||
      !chart.houses ||
      chart.houses.length < 12
    ) {
      return 'INSUFFICIENT';
    }

    // Check if Dasha or advanced Varga info is missing
    const hasDasha = (chart as any).dasha || (chart as any).vimshottariDasha;
    if (!hasDasha) {
      return 'PARTIAL';
    }

    return 'COMPLETE';
  }

  private buildChartSummary(chart: NormalizedChart): ChartFactSummary {
    const sun = this.findPlanet(chart, 'SUN');
    const moon = this.findPlanet(chart, 'MOON');

    return {
      clientName: chart.birthDetails?.name || 'Client',
      dateOfBirth: chart.birthDetails?.dateOfBirth || 'Not supplied',
      timeOfBirth: chart.birthDetails?.timeOfBirth || 'Not supplied',
      birthPlace: chart.birthDetails?.placeName || 'Not supplied',
      ascendantSign: chart.ascendant?.sign || 'Unknown',
      ascendantLord: chart.ascendant?.lord || 'Unknown',
      moonSign: moon?.sign || 'Unknown',
      moonNakshatra: moon?.nakshatra || 'Unknown',
      sunSign: sun?.sign || 'Unknown',
      sunHouse: sun?.house || 0,
      totalPlanetsCount: chart.planets?.length || 0,
      totalHousesCount: chart.houses?.length || 0,
    };
  }

  // --------------------------------------------------------------------------
  // CAREER AXIS
  // --------------------------------------------------------------------------

  private evaluateCareerAxis(chart: NormalizedChart): CareerAxisEvidence {
    const asc = chart.ascendant;
    const ascLordPlanet = this.findPlanet(chart, asc.lord);
    const houseTen = this.findHouse(chart, 10);

    const houseTenLord = houseTen.lord;
    const houseTenLordPlanet = this.findPlanet(chart, houseTenLord);

    const relationships: HouseLordRelationshipEvidence[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];

    // Ascendant Lord details
    const ascLordHouse = ascLordPlanet?.house || 1;
    const ascLordSign = ascLordPlanet?.sign || asc.sign;
    const ascLordDignity = ascLordPlanet?.dignity || 'NEUTRAL';

    // 10th Lord details
    const houseTenLordHouse = houseTenLordPlanet?.house || 10;
    const houseTenLordSign = houseTenLordPlanet?.sign || houseTen.sign;

    supportingFactors.push(`Ascendant in ${asc.sign} ruled by ${asc.lord}`);
    supportingFactors.push(`10th House in ${houseTen.sign} ruled by ${houseTenLord}`);
    supportingFactors.push(`10th Lord ${houseTenLord} placed in House ${houseTenLordHouse} (${houseTenLordSign})`);

    // Relationships between 10th Lord and key houses
    const keyTargetHouses = [1, 2, 5, 6, 7, 9, 11, 12];
    for (const targetHouseNumber of keyTargetHouses) {
      if (houseTenLordHouse === targetHouseNumber) {
        const link: HouseLordRelationshipEvidence = {
          fromHouse: 10,
          toHouse: targetHouseNumber,
          lord: houseTenLord,
          lordPlacementHouse: houseTenLordHouse,
          lordPlacementSign: houseTenLordSign,
          relationshipName: `10th Lord placed in House ${targetHouseNumber}`,
          isDirectLink: true,
          aspectLink: false,
          supportingNote: `Connects professional career agenda directly with House ${targetHouseNumber} themes`,
        };
        relationships.push(link);
        supportingFactors.push(`10th Lord ${houseTenLord} occupies House ${targetHouseNumber}`);
      }
    }

    // Ascendant Lord ↔ 10th Lord relationship
    if (asc.lord === houseTenLord) {
      supportingFactors.push(`Ascendant Lord and 10th Lord are the same planet (${asc.lord}), creating strong personal focus on career`);
    } else if (ascLordPlanet && houseTenLordPlanet && ascLordPlanet.house === houseTenLordPlanet.house) {
      supportingFactors.push(`Ascendant Lord (${asc.lord}) and 10th Lord (${houseTenLord}) are conjunct in House ${ascLordPlanet.house}`);
    }

    // Occupants and aspects in 10th house
    if (houseTen.occupants.length > 0) {
      supportingFactors.push(`10th House occupied by: ${houseTen.occupants.join(', ')}`);
    }

    let strength: EvidenceStrength = 'SUPPORTIVE';
    if (supportingFactors.length >= 4) strength = 'STRONG';
    else if (supportingFactors.length >= 2) strength = 'MODERATE';

    return {
      ascendantSign: asc.sign,
      ascendantDegree: asc.degree,
      ascendantNakshatra: asc.nakshatra,
      ascendantLord: asc.lord,
      ascendantLordSign: ascLordSign,
      ascendantLordHouse: ascLordHouse,
      ascendantLordDignity: ascLordDignity,
      houseTenSign: houseTen.sign,
      houseTenLord: houseTenLord,
      houseTenLordHouse: houseTenLordHouse,
      houseTenLordSign: houseTenLordSign,
      houseTenOccupants: houseTen.occupants,
      houseTenAspects: [],
      relationships,
      supportingFactors,
      conflictingFactors,
      strength,
    };
  }

  // --------------------------------------------------------------------------
  // INCOME / FINANCIAL EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateIncomeEvidence(chart: NormalizedChart): IncomeEvidence {
    const h2 = this.findHouse(chart, 2);
    const h11 = this.findHouse(chart, 11);
    const h10 = this.findHouse(chart, 10);

    const h2LordPlanet = this.findPlanet(chart, h2.lord);
    const h11LordPlanet = this.findPlanet(chart, h11.lord);
    const jupiter = this.findPlanet(chart, 'JUPITER');
    const venus = this.findPlanet(chart, 'VENUS');

    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];
    const relevantPlanets: string[] = [h2.lord, h11.lord];

    if (jupiter) relevantPlanets.push('JUPITER');
    if (venus) relevantPlanets.push('VENUS');

    // 2nd House Analysis
    supportingFactors.push(`2nd House (Wealth) in ${h2.sign} ruled by ${h2.lord}`);
    supportingFactors.push(`2nd Lord ${h2.lord} placed in House ${h2LordPlanet?.house || 2}`);
    if (h2.occupants.length > 0) {
      supportingFactors.push(`2nd House occupied by ${h2.occupants.join(', ')}`);
    }

    // 11th House Analysis
    supportingFactors.push(`11th House (Gains) in ${h11.sign} ruled by ${h11.lord}`);
    supportingFactors.push(`11th Lord ${h11.lord} placed in House ${h11LordPlanet?.house || 11}`);
    if (h11.occupants.length > 0) {
      supportingFactors.push(`11th House occupied by ${h11.occupants.join(', ')}`);
    }

    // Link between 10th Lord and 2nd/11th Houses
    const h10Lord = h10.lord;
    const h10LordPlanet = this.findPlanet(chart, h10Lord);
    if (h10LordPlanet?.house === 2 || h10LordPlanet?.house === 11) {
      supportingFactors.push(`10th Lord ${h10Lord} placed directly in Dhana/Gains House ${h10LordPlanet.house}`);
    }

    const wealthHouseStrength: EvidenceStrength = h2LordPlanet?.dignity === 'EXALTED' || h2LordPlanet?.dignity === 'OWN_SIGN' ? 'STRONG' : 'SUPPORTIVE';
    const gainsHouseStrength: EvidenceStrength = h11LordPlanet?.dignity === 'EXALTED' || h11LordPlanet?.dignity === 'OWN_SIGN' ? 'STRONG' : 'SUPPORTIVE';

    let overallStrength: EvidenceStrength = 'SUPPORTIVE';
    if (wealthHouseStrength === 'STRONG' || gainsHouseStrength === 'STRONG') overallStrength = 'STRONG';

    return {
      wealthHouseNumber: 2,
      wealthHouseSign: h2.sign,
      wealthHouseLord: h2.lord,
      wealthHouseLordPlacement: { house: h2LordPlanet?.house || 2, sign: h2LordPlanet?.sign || h2.sign },
      wealthHouseOccupants: h2.occupants,
      gainsHouseNumber: 11,
      gainsHouseSign: h11.sign,
      gainsHouseLord: h11.lord,
      gainsHouseLordPlacement: { house: h11LordPlanet?.house || 11, sign: h11LordPlanet?.sign || h11.sign },
      gainsHouseOccupants: h11.occupants,
      wealthHouseStrength,
      gainsHouseStrength,
      relevantPlanets,
      lordRelationships: [
        `2nd Lord ${h2.lord} in House ${h2LordPlanet?.house || 2}`,
        `11th Lord ${h11.lord} in House ${h11LordPlanet?.house || 11}`,
      ],
      supportingFactors,
      conflictingFactors,
      overallStrength,
    };
  }

  // --------------------------------------------------------------------------
  // WORK / SERVICE EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateWorkEnvironmentEvidence(chart: NormalizedChart): WorkEnvironmentEvidence {
    const h6 = this.findHouse(chart, 6);
    const h6LordPlanet = this.findPlanet(chart, h6.lord);
    const saturn = this.findPlanet(chart, 'SATURN');
    const mars = this.findPlanet(chart, 'MARS');

    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];
    const structuredWorkIndicators: string[] = [];
    const serviceIndicators: string[] = [];
    const competitionIndicators: string[] = [];

    structuredWorkIndicators.push(`6th House in ${h6.sign} ruled by ${h6.lord}`);
    if (saturn) {
      structuredWorkIndicators.push(`Saturn (discipline significator) placed in House ${saturn.house} (${saturn.sign})`);
      if (saturn.dignity === 'OWN_SIGN' || saturn.dignity === 'EXALTED') {
        structuredWorkIndicators.push(`Saturn in dignified placement (${saturn.dignity}) reinforces operational structure`);
      }
    }

    if (h6.occupants.length > 0) {
      serviceIndicators.push(`6th House occupied by ${h6.occupants.join(', ')}`);
    }

    if (mars) {
      competitionIndicators.push(`Mars (action/competition) placed in House ${mars.house} (${mars.sign})`);
    }

    supportingFactors.push(...structuredWorkIndicators, ...serviceIndicators, ...competitionIndicators);

    return {
      houseSixSign: h6.sign,
      houseSixLord: h6.lord,
      houseSixLordPlacement: { house: h6LordPlanet?.house || 6, sign: h6LordPlanet?.sign || h6.sign },
      houseSixOccupants: h6.occupants,
      saturnPlacement: {
        house: saturn?.house || 0,
        sign: saturn?.sign || 'Unknown',
        dignity: saturn?.dignity || 'NEUTRAL',
        retrograde: saturn?.retrograde || false,
      },
      marsPlacement: {
        house: mars?.house || 0,
        sign: mars?.sign || 'Unknown',
        dignity: mars?.dignity || 'NEUTRAL',
        retrograde: mars?.retrograde || false,
      },
      structuredWorkIndicators,
      serviceIndicators,
      competitionIndicators,
      operationalDiscipline: saturn?.dignity === 'EXALTED' || saturn?.dignity === 'OWN_SIGN' ? 'STRONG' : 'MODERATE',
      routineStructureStrength: h6.occupants.length > 0 || saturn?.house === 6 || saturn?.house === 10 ? 'STRONG' : 'SUPPORTIVE',
      supportingFactors,
      conflictingFactors,
      strength: 'SUPPORTIVE',
    };
  }

  // --------------------------------------------------------------------------
  // LEADERSHIP EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateLeadershipEvidence(chart: NormalizedChart): LeadershipEvidence {
    const sun = this.findPlanet(chart, 'SUN');
    const mars = this.findPlanet(chart, 'MARS');
    const saturn = this.findPlanet(chart, 'SATURN');

    const asc = chart.ascendant;
    const ascLordPlanet = this.findPlanet(chart, asc.lord);
    const h10 = this.findHouse(chart, 10);
    const h10LordPlanet = this.findPlanet(chart, h10.lord);
    const h11 = this.findHouse(chart, 11);
    const h11LordPlanet = this.findPlanet(chart, h11.lord);

    const authorityIndicators: string[] = [];
    const initiativeIndicators: string[] = [];
    const responsibilityIndicators: string[] = [];
    const persistenceIndicators: string[] = [];
    const publicVisibilityIndicators: string[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];

    if (sun) {
      authorityIndicators.push(`Sun (authority significator) placed in House ${sun.house} (${sun.sign}, ${sun.dignity})`);
      if (sun.house === 10 || sun.house === 1 || sun.house === 5) {
        publicVisibilityIndicators.push(`Sun in high-visibility kendra/kona House ${sun.house}`);
      }
    }

    if (mars) {
      initiativeIndicators.push(`Mars (initiative) placed in House ${mars.house} (${mars.sign}, ${mars.dignity})`);
    }

    if (saturn) {
      responsibilityIndicators.push(`Saturn (responsibility) placed in House ${saturn.house} (${saturn.sign}, ${saturn.dignity})`);
      persistenceIndicators.push(`Saturn durability in House ${saturn.house}`);
    }

    supportingFactors.push(...authorityIndicators, ...initiativeIndicators, ...responsibilityIndicators);

    let strength: EvidenceStrength = 'SUPPORTIVE';
    if (sun?.dignity === 'OWN_SIGN' || sun?.dignity === 'EXALTED' || sun?.house === 10) {
      strength = 'STRONG';
    }

    return {
      sunPlacement: { house: sun?.house || 0, sign: sun?.sign || 'Unknown', dignity: sun?.dignity || 'NEUTRAL' },
      marsPlacement: { house: mars?.house || 0, sign: mars?.sign || 'Unknown', dignity: mars?.dignity || 'NEUTRAL' },
      saturnPlacement: { house: saturn?.house || 0, sign: saturn?.sign || 'Unknown', dignity: saturn?.dignity || 'NEUTRAL' },
      ascendantLordPlacement: { house: ascLordPlanet?.house || 1, sign: ascLordPlanet?.sign || asc.sign },
      houseTenLordPlacement: { house: h10LordPlanet?.house || 10, sign: h10LordPlanet?.sign || h10.sign },
      houseElevenLordPlacement: { house: h11LordPlanet?.house || 11, sign: h11LordPlanet?.sign || h11.sign },
      authorityIndicators,
      initiativeIndicators,
      responsibilityIndicators,
      persistenceIndicators,
      publicVisibilityIndicators,
      supportingFactors,
      conflictingFactors,
      strength,
    };
  }

  // --------------------------------------------------------------------------
  // ANALYTICAL / TECHNICAL EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateAnalyticalEvidence(chart: NormalizedChart): AnalyticalEvidence {
    const mercury = this.findPlanet(chart, 'MERCURY');
    const mars = this.findPlanet(chart, 'MARS');
    const h5 = this.findHouse(chart, 5);
    const h5LordPlanet = this.findPlanet(chart, h5.lord);
    const h6 = this.findHouse(chart, 6);
    const h8 = this.findHouse(chart, 8);

    const analysisIndicators: string[] = [];
    const logicIndicators: string[] = [];
    const systemsThinkingIndicators: string[] = [];
    const problemSolvingIndicators: string[] = [];
    const technicalDepthIndicators: string[] = [];
    const detailOrientationIndicators: string[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];

    if (mercury) {
      analysisIndicators.push(`Mercury (intellect significator) placed in House ${mercury.house} (${mercury.sign}, ${mercury.dignity})`);
      systemsThinkingIndicators.push(`Mercury in ${mercury.sign} Rashi`);
      if (mercury.dignity === 'EXALTED' || mercury.dignity === 'OWN_SIGN') {
        technicalDepthIndicators.push(`Mercury in strong dignity (${mercury.dignity}) supporting rigorous analytical systems`);
      }
    }

    logicIndicators.push(`5th House (Intelligence) in ${h5.sign} ruled by ${h5.lord}`);
    problemSolvingIndicators.push(`6th House (Problem solving) in ${h6.sign} ruled by ${h6.lord}`);

    supportingFactors.push(...analysisIndicators, ...logicIndicators, ...systemsThinkingIndicators);

    let strength: EvidenceStrength = 'SUPPORTIVE';
    if (mercury?.dignity === 'EXALTED' || mercury?.dignity === 'OWN_SIGN' || mercury?.house === 5) {
      strength = 'STRONG';
    }

    return {
      mercuryPlacement: {
        house: mercury?.house || 0,
        sign: mercury?.sign || 'Unknown',
        dignity: mercury?.dignity || 'NEUTRAL',
        retrograde: mercury?.retrograde || false,
      },
      marsPlacement: { house: mars?.house || 0, sign: mars?.sign || 'Unknown', dignity: mars?.dignity || 'NEUTRAL' },
      houseFiveSign: h5.sign,
      houseFiveLord: h5.lord,
      houseFiveLordPlacement: { house: h5LordPlanet?.house || 5, sign: h5LordPlanet?.sign || h5.sign },
      houseSixSign: h6.sign,
      houseEightSign: h8.sign,
      analysisIndicators,
      logicIndicators,
      systemsThinkingIndicators,
      problemSolvingIndicators,
      technicalDepthIndicators,
      detailOrientationIndicators,
      supportingFactors,
      conflictingFactors,
      strength,
    };
  }

  // --------------------------------------------------------------------------
  // COMMUNICATION / BUSINESS EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateCommunicationEvidence(chart: NormalizedChart): CommunicationEvidence {
    const mercury = this.findPlanet(chart, 'MERCURY');
    const venus = this.findPlanet(chart, 'VENUS');
    const h2 = this.findHouse(chart, 2);
    const h3 = this.findHouse(chart, 3);
    const h5 = this.findHouse(chart, 5);
    const h7 = this.findHouse(chart, 7);
    const h10 = this.findHouse(chart, 10);
    const h11 = this.findHouse(chart, 11);

    const communicationIndicators: string[] = [];
    const persuasionIndicators: string[] = [];
    const negotiationIndicators: string[] = [];
    const teachingIndicators: string[] = [];
    const writingIndicators: string[] = [];
    const commercialInteractionIndicators: string[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];

    if (mercury) {
      communicationIndicators.push(`Mercury in House ${mercury.house} (${mercury.sign})`);
    }
    if (venus) {
      negotiationIndicators.push(`Venus (diplomacy significator) in House ${venus.house} (${venus.sign})`);
    }

    commercialInteractionIndicators.push(`2nd House (Speech/Value) in ${h2.sign}; 7th House (Trade) in ${h7.sign}`);

    supportingFactors.push(...communicationIndicators, ...commercialInteractionIndicators);

    return {
      mercuryPlacement: { house: mercury?.house || 0, sign: mercury?.sign || 'Unknown', dignity: mercury?.dignity || 'NEUTRAL' },
      venusPlacement: { house: venus?.house || 0, sign: venus?.sign || 'Unknown', dignity: venus?.dignity || 'NEUTRAL' },
      houseTwoSign: h2.sign,
      houseThreeSign: h3?.sign,
      houseFiveSign: h5.sign,
      houseSevenSign: h7.sign,
      houseTenSign: h10.sign,
      houseElevenSign: h11.sign,
      communicationIndicators,
      persuasionIndicators,
      negotiationIndicators,
      teachingIndicators,
      writingIndicators,
      commercialInteractionIndicators,
      supportingFactors,
      conflictingFactors,
      strength: 'SUPPORTIVE',
    };
  }

  // --------------------------------------------------------------------------
  // CREATIVE EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateCreativityEvidence(chart: NormalizedChart): CreativityEvidence {
    const venus = this.findPlanet(chart, 'VENUS');
    const moon = this.findPlanet(chart, 'MOON');
    const mercury = this.findPlanet(chart, 'MERCURY');
    const h5 = this.findHouse(chart, 5);

    const creativeExpressionIndicators: string[] = [];
    const aestheticsIndicators: string[] = [];
    const imaginationIndicators: string[] = [];
    const designIndicators: string[] = [];
    const storytellingIndicators: string[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];

    if (venus) {
      aestheticsIndicators.push(`Venus (aesthetics significator) in House ${venus.house} (${venus.sign}, ${venus.dignity})`);
    }
    if (moon) {
      imaginationIndicators.push(`Moon (imagination significator) in House ${moon.house} (${moon.sign})`);
    }
    creativeExpressionIndicators.push(`5th House (Creativity) in ${h5.sign} ruled by ${h5.lord}`);

    supportingFactors.push(...creativeExpressionIndicators, ...aestheticsIndicators, ...imaginationIndicators);

    return {
      venusPlacement: { house: venus?.house || 0, sign: venus?.sign || 'Unknown', dignity: venus?.dignity || 'NEUTRAL' },
      moonPlacement: { house: moon?.house || 0, sign: moon?.sign || 'Unknown', dignity: moon?.dignity || 'NEUTRAL' },
      mercuryPlacement: { house: mercury?.house || 0, sign: mercury?.sign || 'Unknown', dignity: mercury?.dignity || 'NEUTRAL' },
      houseFiveSign: h5.sign,
      houseFiveLord: h5.lord,
      creativeExpressionIndicators,
      aestheticsIndicators,
      imaginationIndicators,
      designIndicators,
      storytellingIndicators,
      supportingFactors,
      conflictingFactors,
      strength: venus?.dignity === 'EXALTED' || venus?.dignity === 'OWN_SIGN' ? 'STRONG' : 'SUPPORTIVE',
    };
  }

  // --------------------------------------------------------------------------
  // RESEARCH EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateResearchEvidence(chart: NormalizedChart): ResearchEvidence {
    const h5 = this.findHouse(chart, 5);
    const h8 = this.findHouse(chart, 8);
    const h9 = this.findHouse(chart, 9);
    const h12 = this.findHouse(chart, 12);

    const mercury = this.findPlanet(chart, 'MERCURY');
    const saturn = this.findPlanet(chart, 'SATURN');
    const rahu = this.findPlanet(chart, 'RAHU');

    const investigationIndicators: string[] = [];
    const deepStudyIndicators: string[] = [];
    const specializationIndicators: string[] = [];
    const hiddenSystemsIndicators: string[] = [];
    const researchEnvironmentIndicators: string[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];

    investigationIndicators.push(`8th House (Research/Depth) in ${h8.sign}`);
    deepStudyIndicators.push(`9th House (Higher Knowledge) in ${h9.sign}`);

    if (rahu) {
      hiddenSystemsIndicators.push(`Rahu placed in House ${rahu.house} (${rahu.sign})`);
    }

    supportingFactors.push(...investigationIndicators, ...deepStudyIndicators);

    return {
      houseFiveSign: h5.sign,
      houseEightSign: h8.sign,
      houseNineSign: h9.sign,
      houseTwelveSign: h12.sign,
      mercuryPlacement: { house: mercury?.house || 0, sign: mercury?.sign || 'Unknown' },
      saturnPlacement: { house: saturn?.house || 0, sign: saturn?.sign || 'Unknown' },
      rahuPlacement: { house: rahu?.house || 0, sign: rahu?.sign || 'Unknown' },
      investigationIndicators,
      deepStudyIndicators,
      specializationIndicators,
      hiddenSystemsIndicators,
      researchEnvironmentIndicators,
      supportingFactors,
      conflictingFactors,
      strength: 'SUPPORTIVE',
    };
  }

  // --------------------------------------------------------------------------
  // ENTREPRENEURSHIP EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateEntrepreneurshipEvidence(chart: NormalizedChart): EntrepreneurshipEvidence {
    const h3 = this.findHouse(chart, 3);
    const h5 = this.findHouse(chart, 5);
    const h7 = this.findHouse(chart, 7);
    const h10 = this.findHouse(chart, 10);
    const h11 = this.findHouse(chart, 11);

    const mars = this.findPlanet(chart, 'MARS');
    const mercury = this.findPlanet(chart, 'MERCURY');
    const rahu = this.findPlanet(chart, 'RAHU');

    const initiativeIndicators: string[] = [];
    const independenceIndicators: string[] = [];
    const commercialOrientationIndicators: string[] = [];
    const riskIndicators: string[] = [];
    const partnershipIndicators: string[] = [];
    const executionIndicators: string[] = [];
    const gainsIndicators: string[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];

    if (mars) initiativeIndicators.push(`Mars in House ${mars.house} (${mars.sign})`);
    if (rahu) riskIndicators.push(`Rahu in House ${rahu.house} (${rahu.sign})`);

    commercialOrientationIndicators.push(`7th House in ${h7.sign}; 11th House in ${h11.sign}`);

    supportingFactors.push(...initiativeIndicators, ...commercialOrientationIndicators);

    return {
      houseThreeSign: h3?.sign,
      houseFiveSign: h5.sign,
      houseSevenSign: h7.sign,
      houseTenSign: h10.sign,
      houseElevenSign: h11.sign,
      marsPlacement: { house: mars?.house || 0, sign: mars?.sign || 'Unknown' },
      mercuryPlacement: { house: mercury?.house || 0, sign: mercury?.sign || 'Unknown' },
      rahuPlacement: { house: rahu?.house || 0, sign: rahu?.sign || 'Unknown' },
      initiativeIndicators,
      independenceIndicators,
      commercialOrientationIndicators,
      riskIndicators,
      partnershipIndicators,
      executionIndicators,
      gainsIndicators,
      supportingFactors,
      conflictingFactors,
      strength: 'MODERATE',
    };
  }

  // --------------------------------------------------------------------------
  // INTERNATIONAL EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateInternationalEvidence(chart: NormalizedChart): InternationalEvidence {
    const h9 = this.findHouse(chart, 9);
    const h12 = this.findHouse(chart, 12);
    const rahu = this.findPlanet(chart, 'RAHU');

    const foreignConnectionIndicators: string[] = [];
    const multinationalEnvironmentIndicators: string[] = [];
    const remoteWorkIndicators: string[] = [];
    const relocationIndicators: string[] = [];
    const crossCulturalIndicators: string[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];

    foreignConnectionIndicators.push(`9th House in ${h9.sign} ruled by ${h9.lord}`);
    foreignConnectionIndicators.push(`12th House in ${h12.sign} ruled by ${h12.lord}`);

    if (rahu) {
      crossCulturalIndicators.push(`Rahu (foreign significator) in House ${rahu.house} (${rahu.sign})`);
    }

    supportingFactors.push(...foreignConnectionIndicators);

    return {
      houseNineSign: h9.sign,
      houseNineLord: h9.lord,
      houseTwelveSign: h12.sign,
      houseTwelveLord: h12.lord,
      rahuPlacement: { house: rahu?.house || 0, sign: rahu?.sign || 'Unknown' },
      foreignConnectionIndicators,
      multinationalEnvironmentIndicators,
      remoteWorkIndicators,
      relocationIndicators,
      crossCulturalIndicators,
      supportingFactors,
      conflictingFactors,
      strength: 'SUPPORTIVE',
    };
  }

  // --------------------------------------------------------------------------
  // NETWORKING EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateNetworkingEvidence(chart: NormalizedChart): NetworkingEvidence {
    const h10 = this.findHouse(chart, 10);
    const h11 = this.findHouse(chart, 11);
    const h7 = this.findHouse(chart, 7);

    const sun = this.findPlanet(chart, 'SUN');
    const venus = this.findPlanet(chart, 'VENUS');
    const mercury = this.findPlanet(chart, 'MERCURY');

    const visibilityIndicators: string[] = [];
    const networkReachIndicators: string[] = [];
    const collaborationIndicators: string[] = [];
    const publicFacingIndicators: string[] = [];
    const audienceIndicators: string[] = [];
    const institutionalIndicators: string[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];

    networkReachIndicators.push(`11th House (Gains/Networks) in ${h11.sign} ruled by ${h11.lord}`);
    collaborationIndicators.push(`7th House (Partnerships) in ${h7.sign}`);

    supportingFactors.push(...networkReachIndicators, ...collaborationIndicators);

    return {
      houseTenSign: h10.sign,
      houseElevenSign: h11.sign,
      houseSevenSign: h7.sign,
      sunPlacement: { house: sun?.house || 0, sign: sun?.sign || 'Unknown' },
      venusPlacement: { house: venus?.house || 0, sign: venus?.sign || 'Unknown' },
      mercuryPlacement: { house: mercury?.house || 0, sign: mercury?.sign || 'Unknown' },
      visibilityIndicators,
      networkReachIndicators,
      collaborationIndicators,
      publicFacingIndicators,
      audienceIndicators,
      institutionalIndicators,
      supportingFactors,
      conflictingFactors,
      strength: 'SUPPORTIVE',
    };
  }

  // --------------------------------------------------------------------------
  // PLANETARY & HOUSE EVIDENCE ARRAYS
  // --------------------------------------------------------------------------

  private evaluatePlanetaryEvidence(chart: NormalizedChart): PlanetaryEvidenceItem[] {
    return chart.planets.map((planet) => {
      const supportingCareerFactors: string[] = [
        `${planet.name} in ${planet.sign} (House ${planet.house})`,
        `Dignity: ${planet.dignity}`,
      ];
      const conflictingCareerFactors: string[] = [];

      if (planet.retrograde) {
        conflictingCareerFactors.push(`${planet.name} is Retrograde, indicating unconventional execution rhythm`);
      }
      if (planet.combust) {
        conflictingCareerFactors.push(`${planet.name} is Combust, indicating solar pressure`);
      }

      return {
        planet: planet.name,
        sign: planet.sign,
        house: planet.house,
        dignity: planet.dignity,
        strength: planet.dignity === 'EXALTED' || planet.dignity === 'OWN_SIGN' ? 'STRONG' : 'SUPPORTIVE',
        retrograde: planet.retrograde,
        combustion: planet.combust,
        lordship: planet.lordship || [],
        aspects: [],
        relevantCareerHouses: [2, 5, 6, 9, 10, 11, 12].filter((h) => planet.lordship?.includes(h) || planet.house === h),
        supportingCareerFactors,
        conflictingCareerFactors,
      };
    });
  }

  private evaluateHouseEvidence(chart: NormalizedChart): HouseEvidenceItem[] {
    const targetHouses = [2, 5, 6, 9, 10, 11, 12];

    return targetHouses.map((houseNum) => {
      const house = this.findHouse(chart, houseNum);
      const lordPlanet = this.findPlanet(chart, house.lord);

      return {
        houseNumber: houseNum,
        sign: house.sign,
        lord: house.lord,
        lordPlacement: { house: lordPlanet?.house || houseNum, sign: lordPlanet?.sign || house.sign },
        occupants: house.occupants || [],
        aspects: [],
        relevantPlanets: [house.lord, ...(house.occupants || [])],
        supportingFactors: [`House ${houseNum} in ${house.sign} ruled by ${house.lord}`],
        conflictingFactors: [],
        strength: lordPlanet?.dignity === 'EXALTED' || lordPlanet?.dignity === 'OWN_SIGN' ? 'STRONG' : 'SUPPORTIVE',
      };
    });
  }

  // --------------------------------------------------------------------------
  // YOGA & TIMING EVIDENCE
  // --------------------------------------------------------------------------

  private evaluateYogaEvidence(chart: NormalizedChart): YogaEvidence {
    // Inspect if chart object contains pre-calculated yogas
    const existingYogas = (chart as any).yogas;

    if (existingYogas && Array.isArray(existingYogas) && existingYogas.length > 0) {
      return {
        status: 'AVAILABLE',
        supportedYogas: existingYogas.map((y: any) => ({
          name: y.name || 'Yoga',
          description: y.description || '',
          planetsInvolved: y.planetsInvolved || [],
          housesInvolved: y.housesInvolved || [],
          strength: 'STRONG',
        })),
        unsupportedYogas: [],
        note: 'Yoga evaluation engine integrated.',
      };
    }

    return {
      status: 'UNAVAILABLE',
      supportedYogas: [],
      unsupportedYogas: [
        'Gaja Kesari Yoga',
        'Dhana Yoga',
        'Raja Yoga',
        'Pancha Mahapurusha Yogas',
        'Karmadhipati-Dharmadhipati Yoga',
      ],
      note: 'Yoga evaluation engine is pending integration with gupta-nadi-engine.',
    };
  }

  private evaluateTimingEvidence(chart: NormalizedChart): TimingEvidence {
    const dasha = (chart as any).dasha || (chart as any).vimshottariDasha;

    if (dasha && dasha.currentMahadasha) {
      return {
        status: 'AVAILABLE',
        currentMahadasha: dasha.currentMahadasha,
        currentAntardasha: dasha.currentAntardasha,
        start: dasha.start,
        end: dasha.end,
        relevantPlanetaryThemes: dasha.themes || [],
        careerHouseActivations: dasha.careerHouses || [10, 11],
      };
    }

    return {
      status: 'UNAVAILABLE',
      note: 'Vimshottari Dasha schedule was not supplied in normalized chart payload.',
      relevantPlanetaryThemes: [],
      careerHouseActivations: [],
    };
  }

  // --------------------------------------------------------------------------
  // CONFLICT DETECTION
  // --------------------------------------------------------------------------

  private detectEvidenceConflicts(
    axis: CareerAxisEvidence,
    leadership: LeadershipEvidence,
    workEnv: WorkEnvironmentEvidence,
    entrepreneurship: EntrepreneurshipEvidence,
    analytical: AnalyticalEvidence
  ): EvidenceConflicts {
    const competingFactors: any[] = [];
    const supportingFactors: string[] = [];
    const conflictingFactors: string[] = [];
    const unresolvedFactors: string[] = [];

    // Check conflict: Strong independence vs strong structured routine
    if (
      entrepreneurship.initiativeIndicators.length > 0 &&
      workEnv.structuredWorkIndicators.length > 0
    ) {
      competingFactors.push({
        domainA: 'Entrepreneurship / Independence',
        factorA: entrepreneurship.initiativeIndicators[0],
        domainB: 'Work Environment / Structure',
        factorB: workEnv.structuredWorkIndicators[0],
        description: 'Independent drive competes with institutional routine structure requirements.',
      });
      conflictingFactors.push('Independent drive vs institutional structure requirement');
    }

    // Check conflict: High authority indicators vs collaborative focus
    if (leadership.strength === 'STRONG' && workEnv.serviceIndicators.length > 0) {
      conflictingFactors.push('Strong leadership authority indicators competing with service/subordinate house emphasis');
    }

    return {
      competingFactors,
      supportingFactors,
      conflictingFactors,
      unresolvedFactors,
    };
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  private findPlanet(chart: NormalizedChart, symbol: PlanetSymbol | string): NormalizedPlanet | undefined {
    return chart.planets.find(
      (p) => p.name.toUpperCase() === symbol.toUpperCase()
    );
  }

  private findHouse(chart: NormalizedChart, houseNumber: number): NormalizedHouse {
    const house = chart.houses.find((h) => h.number === houseNumber);
    if (!house) {
      throw new Error(`House ${houseNumber} missing from NormalizedChart`);
    }
    return house;
  }
}

export const careerEvidenceEngine = new CareerEvidenceEngine();
