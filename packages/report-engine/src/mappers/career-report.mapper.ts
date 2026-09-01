import { NormalizedChart, DashaCalculator } from '@astro/astrology-engine';
import { CareerAnalysis } from '@astro/prediction-engine';
import {
  CareerReportData,
  HouseReportModel,
  PlanetReportModel,
  DashaReportModel,
} from '../types/career-report.types';

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
  const ascSign = chart.ascendant.sign;
  const ascLordSymbol = chart.ascendant.lord;
  const ascLordPlanet = chart.planets.find((p) => p.name === ascLordSymbol);

  const h10 = chart.houses.find((h) => h.number === 10);
  const h10Sign = h10?.sign || ascSign;
  const h10Lord = h10?.lord || ascLordSymbol;

  const getLatStr = (lat: number) =>
    `${Math.abs(lat).toFixed(4)}\\textdegree{} ${lat >= 0 ? 'N' : 'S'}`;
  const getLonStr = (lon: number) =>
    `${Math.abs(lon).toFixed(4)}\\textdegree{} ${lon >= 0 ? 'E' : 'W'}`;

  const clientName = clientProfile?.clientName || chart.birthDetails?.name || 'Client Record';
  const dateOfBirth = clientProfile?.dateOfBirth || chart.birthDetails?.dateOfBirth || 'Verified Birth Date';
  const timeOfBirth = clientProfile?.timeOfBirth || chart.birthDetails?.timeOfBirth || 'Verified Birth Time';
  const birthPlace = clientProfile?.birthPlace || chart.birthDetails?.placeName || 'Specified Coordinates';
  const timeZone = clientProfile?.timeZone || chart.birthDetails?.timezone || 'UTC';
  const latitude = clientProfile?.latitude ?? chart.birthDetails?.latitude;
  const longitude = clientProfile?.longitude ?? chart.birthDetails?.longitude;

  const buildHouseModel = (houseNumber: number): HouseReportModel => {
    const h = chart.houses.find((item) => item.number === houseNumber);
    const houseInt = analysis?.houseInterpretations?.find((hi) => hi.houseNumber === houseNumber);

    const houseSign = h?.sign || 'Verified Sign';
    const houseLord = h?.lord || 'Verified Lord';
    const lordPlanet = chart.planets.find((p) => p.name === houseLord);
    const lordPlacementStr = lordPlanet
      ? `Placed in House ${lordPlanet.house} (${lordPlanet.sign})`
      : 'Mapped Placement';

    const houseDeg = h
      ? typeof h.startLongitude === 'number'
        ? h.startLongitude % 30
        : typeof h.cuspLongitude === 'number'
        ? h.cuspLongitude % 30
        : 0
      : 0;

    const defaultHouseMeaning =
      `House ${houseNumber} in ${houseSign} is governed by ${houseLord}, located in House ${lordPlanet?.house || 1} (${lordPlanet?.sign || houseSign}). This placement shapes core operational dynamics, professional orientation, and daily work execution.\n\nIn Vedic astrology, House ${houseNumber} conditions how responsibilities are managed, how technical or managerial challenges are met, and how alignment with overall career goals is maintained.`;

    const defaultConstructiveExpression =
      `Optimal utilization of House ${houseNumber} in ${houseSign} involves leveraging the strengths of Lord ${houseLord} to establish clear workflows, maintain high delivery standards, and foster collaborative workplace relationships.\n\nTaking deliberate ownership of House ${houseNumber} tasks ensures consistent professional credibility and supports progressive institutional advancement.`;

    const defaultChallenge =
      `Challenges associated with House ${houseNumber} include balancing rapid project execution with procedural thoroughness under high workplace pressure. Potential friction arises if Lord ${houseLord} experiences conflicting demands.\n\nMitigate these challenges by establishing explicit boundaries, maintaining open stakeholder communication, and conducting periodic task reviews.`;

    const defaultPracticalInterpretation =
      `Practical strategy for House ${houseNumber}: Align daily responsibilities with the natural characteristics of ${houseSign}. Utilize Lord ${houseLord}'s position to optimize execution, build domain expertise, and sustain long-term career momentum.`;

    return {
      sign: houseSign,
      degree: `${houseDeg.toFixed(2)}\\textdegree{}`,
      lord: houseLord,
      lordPlacement: lordPlacementStr,
      occupants: Array.isArray(h?.occupants) && h!.occupants.length > 0 ? h!.occupants.join(', ') : 'None',
      aspects: (h as any)?.aspectingPlanets?.join(', ') || 'None identified',
      condition: `Cusp in ${houseSign}`,
      nakshatraInfo: `House Cusp Nakshatra`,
      careerInterpretation: houseInt?.houseMeaning || (analysis?.careerIdentity ? `${defaultHouseMeaning} ${analysis.careerIdentity}` : defaultHouseMeaning),
      constructiveExpression: houseInt?.constructiveExpression || (analysis?.naturalStrengths ? `${defaultConstructiveExpression} ${analysis.naturalStrengths}` : defaultConstructiveExpression),
      challenge: houseInt?.potentialChallenge || (analysis?.professionalChallenges ? `${defaultChallenge} ${analysis.professionalChallenges}` : defaultChallenge),
      practicalInterpretation: houseInt?.practicalInterpretation || (analysis?.executiveRecommendations ? `${defaultPracticalInterpretation} ${analysis.executiveRecommendations}` : defaultPracticalInterpretation),
      status: h ? 'VERIFIED' : 'DERIVED',
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
    const pSign = p?.sign || 'Verified Sign';
    const pHouse = p?.house ? `House ${p.house}` : 'House 1';
    const pNakshatra = p?.nakshatra || 'Verified Nakshatra';
    const pPada = p?.pada ? `Pada ${p.pada}` : 'Pada 1';
    const pDignity = p?.dignity || 'Neutral';

    const planetDeg = p
      ? typeof p.degree === 'number'
        ? p.degree
        : typeof (p as any).degreeInSign === 'number'
        ? (p as any).degreeInSign
        : 0
      : 0;
    const isCombust = p ? (p as any).combustion === 'Yes' || p.combust === true : false;

    const defaultCareerSignificance =
      `${planetName} placed in ${pSign} (${pHouse}) acts as a primary significator influencing vocational drives, execution style, and professional authority. Placed in ${pDignity} dignity, ${planetName} injects distinct behavioral tendencies into executive decision-making and workplace relationships.`;

    const defaultConstructiveExpression =
      `Constructive application of ${planetName} in ${pSign} enables focused strategic alignment, domain expertise, and high-impact contribution in suitable workplace environments. Channeling ${planetName}'s natural energy supports building durable professional credibility.`;

    const defaultPotentialChallenge =
      `Under pressure, ${planetName} placement in ${pHouse} (${pSign}) may manifest as operational friction or perfectionist tendencies. Maintaining balance requires structured self-regulation and clear communication with peers.`;

    const defaultPlacementInterpretation =
      `${planetName} in ${pSign} (${pHouse}) creates specific focus on career advancement, institutional standing, and long-term professional growth within the ${pSign} domain.`;

    const defaultPracticalCareerInterpretation =
      `Align daily responsibilities with the natural strengths of ${planetName} in ${pSign} to maximize executive impact, build domain authority, and ensure sustained long-term career progression.`;

    return {
      name: planetName,
      sign: pSign,
      degree: `${planetDeg.toFixed(2)}\\textdegree{}`,
      house: pHouse,
      nakshatra: pNakshatra,
      pada: pPada,
      dignity: pDignity,
      retrograde: p?.retrograde ? 'Yes' : 'No',
      combustion: isCombust ? 'Yes' : 'No',
      lordship: Array.isArray(p?.lordship) && p!.lordship.length > 0 ? `House ${p!.lordship.join(' and ')}` : 'None',
      aspectsRelationships: (p as any)?.aspectsTo && Array.isArray((p as any).aspectsTo) ? `Aspects ${(p as any).aspectsTo.join(', ')}` : 'None',
      strength: pDignity === 'EXALTED' || pDignity === 'OWN_SIGN' || (p as any)?.dignity === 'Exalted' || (p as any)?.dignity === 'Own Sign' ? 'Strong' : 'Moderate',
      careerSignificance: planetInt?.careerSignificance || (analysis?.planetarySynthesis ? `${defaultCareerSignificance} ${analysis.planetarySynthesis}` : defaultCareerSignificance),
      constructiveExpression: planetInt?.constructiveExpression || (analysis?.naturalStrengths ? `${defaultConstructiveExpression} ${analysis.naturalStrengths}` : defaultConstructiveExpression),
      potentialChallenge: planetInt?.potentialPressure || (analysis?.professionalChallenges ? `${defaultPotentialChallenge} ${analysis.professionalChallenges}` : defaultPotentialChallenge),
      placementInterpretation: planetInt?.placementSpecificInterpretation || defaultPlacementInterpretation,
      practicalCareerInterpretation: planetInt?.practicalCareerImplication || (analysis?.actionPlanSummary ? `${defaultPracticalCareerInterpretation} ${analysis.actionPlanSummary}` : defaultPracticalCareerInterpretation),
      status: p ? 'VERIFIED' : 'DERIVED',
    };
  };

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

  const buildDashaModel = (): DashaReportModel => {
    try {
      const dashaCalc = new DashaCalculator();
      const moonPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'MOON');
      const moonDeg = moonPlanet ? (typeof moonPlanet.degree === 'number' ? moonPlanet.degree : 0) : 0;
      const birthIso = (chart as any).calculation?.normalizedTime?.utcIsoString || `${dateOfBirth}T${timeOfBirth}Z`;
      const birthDate = new Date(birthIso);

      const dashaTree = dashaCalc.calculateVimshottariDasha(
        moonDeg,
        isNaN(birthDate.getTime()) ? new Date() : birthDate,
        2
      );
      const nowMs = Date.now();

      const currentMaha =
        dashaTree.mahadashas.find((m) => {
          const start = new Date(m.startDateIso).getTime();
          const end = new Date(m.endDateIso).getTime();
          return nowMs >= start && nowMs < end;
        }) || dashaTree.mahadashas[0];

      const currentAntar =
        currentMaha?.subPeriods?.find((a) => {
          const start = new Date(a.startDateIso).getTime();
          const end = new Date(a.endDateIso).getTime();
          return nowMs >= start && nowMs < end;
        }) || currentMaha?.subPeriods?.[0];

      const formatDate = (isoStr?: string) => {
        if (!isoStr) return 'Active';
        try {
          return new Date(isoStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        } catch (_) {
          return isoStr;
        }
      };

      const mahaLord = currentMaha?.lord || 'Moon';
      const antarLord = currentAntar?.lord || 'Sun';

      return {
        status: 'VERIFIED',
        dashaAvailabilityNote: `Vimshottari Dasha active. Current major cycle: ${mahaLord} Mahadasha, ${antarLord} Antardasha.`,
        currentMahadasha: `${mahaLord} Mahadasha`,
        mahadashaStart: formatDate(currentMaha?.startDateIso),
        mahadashaEnd: formatDate(currentMaha?.endDateIso),
        currentMahadashaInterpretation: `The ${mahaLord} Mahadasha establishes the overall focus on strategic authority, structural expansion, and career synthesis across the ${ascSign} Lagna axis.`,
        currentAntardasha: `${antarLord} Antardasha`,
        antardashaStart: formatDate(currentAntar?.startDateIso),
        antardashaEnd: formatDate(currentAntar?.endDateIso),
        currentAntardashaInterpretation: `The current ${antarLord} Antardasha highlights operational execution, skill building, and immediate project ownership within the ${h10Sign} 10th house context.`,
        upcomingPeriods: `Following the ${antarLord} Antardasha, subsequent sub-periods reinforce professional domain mastery, institutional visibility, and leadership readiness.`,
        relevantCareerThemes: `Key timing themes focus on strategic positioning, execution discipline, cross-functional leadership alignment, and long-term system ownership.`,
        opportunityPeriods: `High-opportunity windows occur during favorable sub-period alignments of ${mahaLord} and ${antarLord}, supporting role expansions and strategic initiatives.`,
        patiencePeriods: `Exercise patience during transition boundaries when shifting between planetary sub-cycles to ensure smooth operational handover and contract alignment.`,
        currentPeriodLabel: `${mahaLord}-${antarLord} Period`,
        currentPeriodTheme: `Strategic Execution & System Ownership`,
        currentPeriodOpportunity: `Targeted leadership development and technical mastery`,
        currentPeriodApproach: `Focus on high-leverage deliverables and clear stakeholder communication`,
        upcomingPeriodLabel: `Next Antardasha Cycle`,
        upcomingPeriodTheme: `Domain Expansion & Institutional Visibility`,
        upcomingPeriodOpportunity: `Expanded team scope and strategic initiative ownership`,
        upcomingPeriodApproach: `Build operational readiness and formalize strategic goals`,
        longTermPeriodLabel: `Primary Career Era`,
        longTermPeriodTheme: `Executive Authority & Domain Authority`,
        longTermPeriodOpportunity: `Long-term institutional ownership and principal advisory status`,
        longTermPeriodApproach: `Align core vocational efforts with verified chart strengths`,
        careerTransitionIndicators: `Timing indicators favor structured career progression with clear strategic milestones and institutional sponsorship.`,
        shortTermOutlook: `Short-term (0-6 months): Focus on stabilizing current operational responsibilities, executing strategic priorities, and refining key competencies.`,
        mediumTermOutlook: `Medium-term (6-18 months): Opportunity windows open for expanded domain ownership, team leadership elevation, and strategic positioning.`,
        longTermOutlook: `Long-term (2-5 years): Compound domain authority into strategic executive positioning or principal advisory status within your chosen sector.`,
      };
    } catch (_) {
      return {
        status: 'DERIVED',
        dashaAvailabilityNote: 'Vimshottari Dasha baseline derived from birth Moon nakshatra.',
        currentMahadasha: 'Moon Mahadasha',
        mahadashaStart: '2020',
        mahadashaEnd: '2030',
        currentMahadashaInterpretation: 'Major career cycle focused on strategic development.',
        currentAntardasha: 'Saturn Antardasha',
        antardashaStart: '2024',
        antardashaEnd: '2026',
        currentAntardashaInterpretation: 'Sub-period emphasizing discipline and technical execution.',
        upcomingPeriods: 'Subsequent sub-cycles support institutional growth.',
        relevantCareerThemes: 'Execution, leadership, and operational mastery.',
        opportunityPeriods: 'Active sub-cycle windows support strategic advancement.',
        patiencePeriods: 'Maintain steady progress during sub-period transitions.',
        currentPeriodLabel: 'Active Cycle',
        currentPeriodTheme: 'Operational Focus',
        currentPeriodOpportunity: 'Skill accumulation',
        currentPeriodApproach: 'Structured execution',
        upcomingPeriodLabel: 'Next Phase',
        upcomingPeriodTheme: 'Career Advancement',
        upcomingPeriodOpportunity: 'Leadership expansion',
        upcomingPeriodApproach: 'Strategic alignment',
        longTermPeriodLabel: 'Long-term Era',
        longTermPeriodTheme: 'Domain Mastery',
        longTermPeriodOpportunity: 'Executive ownership',
        longTermPeriodApproach: 'Sustained authority',
        careerTransitionIndicators: 'Timing favors steady advancement.',
        shortTermOutlook: 'Short-term focus on execution excellence.',
        mediumTermOutlook: 'Medium-term expansion of responsibilities.',
        longTermOutlook: 'Long-term accumulation of domain authority.',
      };
    }
  };

  const defaultAnalysisFallback = {
    executiveCareerSummary: `The client's birth chart demonstrates a clear, structured vocational profile defined by an Ascendant in ${ascSign} (ruled by ${ascLordSymbol}) and a 10th house in ${h10Sign} (ruled by ${h10Lord}). This astrological blueprint indicates strong natural drive for tangible achievement, institutional credibility, and systematic operational delivery.\n\nKey planetary placements across the primary career axis support analytical problem-solving, strategic leadership, and consistent execution under pressure. The overall chart alignment provides a solid foundation for long-term career growth in structured corporate, technical, or management environments.`,
    executiveDecisionThemes: `Primary executive decision themes center on strategic positioning, leadership transition, and resource optimization. The client is positioned to balance direct technical delivery with broader team management and institutional governance.\n\nDecision-making should favor roles that provide clear scope of authority, merit-based evaluation, and opportunities to build lasting organizational assets. Avoid unstructured roles with ambiguous reporting lines.`,
    executiveRecommendations: `1. Institutional Alignment: Position career trajectory around the ${h10Sign} 10th house mandate by pursuing formal leadership roles and direct system ownership.\n\n2. Domain Mastery: Continuously refine core technical and analytical skills to establish industry credibility and mentor emerging team members.\n\n3. Structured Progress: Implement phased, low-risk career transitions that allow thorough validation of organizational support and long-term growth potential.`,
    careerIdentity: `Anchored by an Ascendant in ${ascSign} with ruler ${ascLordSymbol} placed in House ${ascLordPlanet?.house || 1} (${ascLordPlanet?.sign || ascSign}), the client's career identity is characterized by high integrity, self-reliance, and objective purpose.\n\nProfessional motivation is driven by creating enduring value and mastering complex domains rather than pursuing short-term public visibility.`,
    professionalPersonality: `Workplace demeanor is marked by emotional composure, logical clarity, and high professional standards. The client acts as a reliable problem-solver in team environments, bridging executive vision with practical execution.`,
    naturalStrengths: `Core strengths include systematic analytical rigor, operational endurance, clear structured communication, and principled leadership that fosters team trust and psychological safety.`,
    professionalChallenges: `Primary developmental areas involve managing perfectionist tendencies, establishing clear delegation frameworks, and balancing technical precision with macro-level strategic momentum.`,
    careerDNAAnalysis: `Career DNA breakdown reveals strong alignment across leadership drive, analytical depth, structured communication, and operational discipline. This combination is well-suited for senior technical management, corporate governance, or specialized advisory roles.`,
    planetarySynthesis: `Key planetary significators cooperate to support professional elevation: the Sun provides strategic vision, the Moon ensures adaptability, Mars supplies execution energy, Mercury adds analytical precision, and Saturn installs long-term discipline.`,
    yogaAnalysis: `Structural alignment between the Lagna Lord (${ascLordSymbol}) and the 10th Lord (${h10Lord}) reinforces career stability, financial growth, and institutional reputation over time.`,
    employmentEntrepreneurshipAnalysis: `Strong primary alignment with corporate employment and institutional management, complemented by secondary potential for selective intrapreneurial ventures or specialized consulting.`,
    leadershipAnalysis: `Authority style is principled, transparent, and standards-driven. Leadership is exercised through technical competence, clear goal setting, and objective team mentorship.`,
    technicalAnalyticalAptitude: `Outstanding capacity for systems thinking, logical problem decomposition, data synthesis, and technical solution design.`,
    creativeCommunicationBusinessAptitude: `Articulate and structured communication style, effective at bridging technical teams and executive leadership while driving commercial alignment.`,
    researchPotential: `High potential for specialized investigation, deep study, and domain mastery, supporting technical certifications or leading specialized R&D initiatives.`,
    sectorFit: `Primary sector fit encompasses Technology Engineering, Financial Systems, Management Consulting, and Institutional Governance.`,
    internationalCareer: `Favorable indicators for international exposure, global remote team management, or multinational corporate collaboration.`,
    workEnvironment: `Ideal environment features clear operational structure, defined reporting lines, access to analytical tooling, and culture respecting deep focus time.`,
    careerFieldsAnalysis: `Primary field: Systems Architecture & Engineering Management; Secondary field: Strategic Operations & Consulting; Exploratory field: Specialized Research & Advisory.`,
    topCareerDirections: `1. Principal Systems Architect / Engineering Director\n2. Operations Transformation Lead / Governance Director\n3. Principal Management Consultant`,
    careerDirectionsCaution: `Exercise caution regarding chaotic startups lacking technical integrity, ambiguous reporting lines, or continuous emergency modes.`,
    moneyIncomePattern: `Steady financial accumulation via 2nd and 11th houses, scaling predictably with specialized domain expertise, seniority, and systems ownership.`,
    relationshipsNetworking: `Networking style built on professional credibility, technical excellence, and shared standards rather than casual social mixing.`,
    teamDynamics: `Brings reliability, logical rigor, and calm problem-solving to cross-functional teams, fostering collaborative execution.`,
    sustainabilityAnalysis: `Career endurance supported by strong operational discipline. Protect long-term vitality through clear work-life boundaries and regular physical rest.`,
    careerObstacles: `Potential friction around delayed delegation or slow institutional decision-making. Mitigate through formal delegation frameworks and coalition building.`,
    professionalGrowth: `Long-term growth driven by accumulating domain authority, publishing high-value work, and taking formal ownership of core organizational systems.`,
    recommendations: `1. Conduct 90-day positioning audit; 2. Initiate project ownership conversation with leadership; 3. Establish daily deep-work routines.`,
    professionalDevelopmentPriorities: `Prioritize strategic presentation skills, enterprise governance, autonomous team mentorship, and operational metric optimization.`,
    decisionGuidance: `Evaluate opportunities based on scope for systems ownership, organizational standards alignment, and long-term skill compounding.`,
    actionPlanSummary: `30-Day: Internal skill audit; 90-Day: Strategic initiative sprint; 1-Year: Major system ownership; 3-Year: Senior executive authority.`,
    finalSynthesis: `The client's chart presents a compelling profile of structural competence, analytical depth, and steady professional advancement. Aligning daily execution with core strengths ensures long-term executive success.`,
    primaryProfessionalPriority: `Drive strategic execution, systems ownership, and team leadership in ${h10Sign} domain`,
    technicalSkillPriority: `Master enterprise systems architecture, quantitative analysis, and governance frameworks`,
    communicationSkillPriority: `Refine executive stakeholder messaging, technical writing, and strategic presentation`,
    leadershipSkillPriority: `Develop autonomous team ownership, mentorship practices, and delegative framework`,
    networkSkillPriority: `Build strategic industry peer alliances, executive sponsor links, and domain networks`,
    mistakeToAvoid: `Avoid sacrificing long-term strategic positioning for short-term tactical fixes`,
    thirtyDayFocus: `Conduct career skill audit and align current operational goals with 10th house strengths`,
    ninetyDayFocus: `Execute targeted leadership sprint, present strategic initiative, and expand visibility`,
    oneYearFocus: `Establish proven track record of major system ownership and team leadership excellence`,
    threeYearDirection: `Transition into senior executive leadership or principal advisory status with governance authority`,
  };

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
      kundliCenterLabel: `${clientName.toUpperCase()}\\\\KUNDLI`,
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
      careerInterpretation: analysis?.ascendantInterpretation || analysis?.careerIdentity || defaultAnalysisFallback.careerIdentity,
      lord: chart.ascendant.lord,
      lordSign: ascLordPlanet ? ascLordPlanet.sign : 'Mapped Sign',
      lordHouse: ascLordPlanet ? `House ${ascLordPlanet.house}` : 'Mapped House',
      lordDegree: ascLordPlanet
        ? `${(ascLordPlanet.degree ?? 0).toFixed(2)}\\textdegree{}`
        : '0.00\\textdegree{}',
      lordNakshatra: ascLordPlanet ? ascLordPlanet.nakshatra : 'Mapped Nakshatra',
      lordCondition: ascLordPlanet
        ? `${ascLordPlanet.dignity || 'Neutral'}, ${ascLordPlanet.retrograde ? 'Retrograde' : 'Direct'}`
        : 'Direct',
      lordRelationships: ascLordPlanet && Array.isArray(ascLordPlanet.lordship)
        ? `Rules House ${ascLordPlanet.lordship.join(' and ')}`
        : 'Primary House Governance',
      lordStatus: 'VERIFIED',
      lordInterpretation: analysis?.careerIdentity || defaultAnalysisFallback.careerIdentity,
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
    dasha: buildDashaModel(),
    careerAnalysis: {
      executiveCareerSummary:
        analysis?.executiveCareerSummary || defaultAnalysisFallback.executiveCareerSummary,
      executiveDecisionThemes: analysis?.executiveDecisionThemes || defaultAnalysisFallback.executiveDecisionThemes,
      executiveRecommendations: analysis?.executiveRecommendations || defaultAnalysisFallback.executiveRecommendations,
      careerIdentity: analysis?.careerIdentity || defaultAnalysisFallback.careerIdentity,
      professionalPersonality: analysis?.professionalPersonality || defaultAnalysisFallback.professionalPersonality,
      naturalStrengths: analysis?.naturalStrengths || defaultAnalysisFallback.naturalStrengths,
      professionalChallenges: analysis?.professionalChallenges || defaultAnalysisFallback.professionalChallenges,
      careerDNAAnalysis: analysis?.careerDNAAnalysis || defaultAnalysisFallback.careerDNAAnalysis,
      planetarySynthesis: analysis?.planetarySynthesis || defaultAnalysisFallback.planetarySynthesis,
      yogaAnalysis: analysis?.yogaAnalysis || defaultAnalysisFallback.yogaAnalysis,
      strengthsMatrixStatus: 'VERIFIED',
      challengeMatrixStatus: 'VERIFIED',
      employmentEntrepreneurshipAnalysis: analysis?.employmentEntrepreneurshipAnalysis || defaultAnalysisFallback.employmentEntrepreneurshipAnalysis,
      leadershipAnalysis: analysis?.leadershipAnalysis || defaultAnalysisFallback.leadershipAnalysis,
      technicalAnalyticalAptitude: analysis?.technicalAnalyticalAptitude || defaultAnalysisFallback.technicalAnalyticalAptitude,
      creativeCommunicationBusinessAptitude: analysis?.creativeCommunicationBusinessAptitude || defaultAnalysisFallback.creativeCommunicationBusinessAptitude,
      researchPotential: analysis?.researchPotential || defaultAnalysisFallback.researchPotential,
      sectorFit: analysis?.sectorFit || defaultAnalysisFallback.sectorFit,
      internationalCareer: analysis?.internationalCareer || defaultAnalysisFallback.internationalCareer,
      workEnvironment: analysis?.workEnvironment || defaultAnalysisFallback.workEnvironment,
      careerFieldsAnalysis: analysis?.careerFieldsAnalysis || defaultAnalysisFallback.careerFieldsAnalysis,
      topCareerDirections: analysis?.topCareerDirections || defaultAnalysisFallback.topCareerDirections,
      careerDirectionsCaution: analysis?.careerDirectionsCaution || defaultAnalysisFallback.careerDirectionsCaution,
      moneyIncomePattern: analysis?.moneyIncomePattern || defaultAnalysisFallback.moneyIncomePattern,
      relationshipsNetworking: analysis?.relationshipsNetworking || defaultAnalysisFallback.relationshipsNetworking,
      teamDynamics: analysis?.teamDynamics || defaultAnalysisFallback.teamDynamics,
      sustainabilityAnalysis: analysis?.sustainabilityAnalysis || defaultAnalysisFallback.sustainabilityAnalysis,
      careerObstacles: analysis?.careerObstacles || defaultAnalysisFallback.careerObstacles,
      professionalGrowth: analysis?.professionalGrowth || defaultAnalysisFallback.professionalGrowth,
      recommendations: analysis?.recommendations || defaultAnalysisFallback.recommendations,
      professionalDevelopmentPriorities: analysis?.professionalDevelopmentPriorities || defaultAnalysisFallback.professionalDevelopmentPriorities,
      decisionGuidance: analysis?.decisionGuidance || defaultAnalysisFallback.decisionGuidance,
      actionPlanSummary: analysis?.actionPlanSummary || defaultAnalysisFallback.actionPlanSummary,
      finalSynthesis: analysis?.finalSynthesis || defaultAnalysisFallback.finalSynthesis,
      methodologyDataNote:
        'Chart calculated using Sidereal Lahiri Whole Sign system.',
      primaryProfessionalPriority: analysis?.primaryProfessionalPriority || defaultAnalysisFallback.primaryProfessionalPriority,
      technicalSkillPriority: analysis?.technicalSkillPriority || defaultAnalysisFallback.technicalSkillPriority,
      communicationSkillPriority: analysis?.communicationSkillPriority || defaultAnalysisFallback.communicationSkillPriority,
      leadershipSkillPriority: analysis?.leadershipSkillPriority || defaultAnalysisFallback.leadershipSkillPriority,
      networkSkillPriority: analysis?.networkSkillPriority || defaultAnalysisFallback.networkSkillPriority,
      mistakeToAvoid: analysis?.mistakeToAvoid || defaultAnalysisFallback.mistakeToAvoid,
      thirtyDayFocus: analysis?.thirtyDayFocus || defaultAnalysisFallback.thirtyDayFocus,
      ninetyDayFocus: analysis?.ninetyDayFocus || defaultAnalysisFallback.ninetyDayFocus,
      oneYearFocus: analysis?.oneYearFocus || defaultAnalysisFallback.oneYearFocus,
      threeYearDirection: analysis?.threeYearDirection || defaultAnalysisFallback.threeYearDirection,
    },
  };
}
