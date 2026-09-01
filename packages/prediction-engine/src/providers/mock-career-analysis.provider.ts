import {
  CareerAnalysis,
  CareerAnalysisInput,
  CareerAnalysisProvider,
  CareerAnalysisHouseInterpretation,
  CareerAnalysisPlanetInterpretation,
  RecommendedCareerField,
} from '../types/evidence.types';

/**
 * Deterministic Mock Provider for offline testing and fallback execution.
 * Populates full structured CareerAnalysis payload matching evidence traceability contract.
 */
export class MockCareerAnalysisProvider implements CareerAnalysisProvider {
  async analyze(input: CareerAnalysisInput): Promise<CareerAnalysis> {
    const ascSign = input.careerAxis.ascendantSign;
    const h10Sign = input.careerAxis.houseTenSign;
    const h10Lord = input.careerAxis.houseTenLord;

    const houseInterpretations: CareerAnalysisHouseInterpretation[] = input.houseEvidence.map((h) => ({
      houseNumber: h.houseNumber,
      houseMeaning: `House ${h.houseNumber} (${h.sign}) rules core operational dynamics for ${h.lord}.`,
      careerRelevance: `Directly influences professional expression through Lord ${h.lord} placement in House ${h.lordPlacement.house}.`,
      supportingEvidence: h.supportingFactors.join('; '),
      constructiveExpression: `Leverage House ${h.houseNumber} sign qualities in structured work.`,
      potentialChallenge: `Managing tension associated with House ${h.houseNumber} lord placement.`,
      practicalInterpretation: `Align daily routine with House ${h.houseNumber} sign indicators.`,
      evidenceIds: [`house-${h.houseNumber}`],
    }));

    const planetInterpretations: CareerAnalysisPlanetInterpretation[] = input.planetaryEvidence.map((p) => ({
      planet: p.planet,
      placementSummary: `${p.planet} in ${p.sign} (House ${p.house}, ${p.dignity})`,
      careerSignificance: `${p.planet} acts as a key career significator for houses ${p.relevantCareerHouses.join(', ')}.`,
      constructiveExpression: `Express ${p.planet} qualities constructively in analytical and operational contexts.`,
      potentialPressure: p.retrograde ? `${p.planet} retrograde rhythm requires iterative execution.` : 'Standard operational rhythm.',
      placementSpecificInterpretation: `${p.planet} placement in House ${p.house} (${p.sign}) provides foundational drive.`,
      practicalCareerImplication: `Focus on mastering ${p.planet} themes within professional routines.`,
      evidenceIds: [`planet-${p.planet.toLowerCase()}`],
    }));

    const recommendedFields: RecommendedCareerField[] = [
      {
        field: 'Systems Architecture & Technical Management',
        rank: 'PRIMARY',
        rationale: `Supported by exalted Mercury in Virgo and Saturn in 10th house.`,
        supportingEvidence: input.analyticalEvidence.supportingFactors.join('; '),
        suitableFunctions: ['engineering', 'analysis', 'management'],
        suitableWorkMode: 'Structured Technical Environment',
        potentialChallenge: 'Balancing detailed analytical focus with long-term strategy.',
        timingRelevance: 'Current planetary alignment supports technical leadership.',
        evidenceIds: ['career-axis-10th-house', 'analytical-evidence', 'planet-mercury'],
      },
      {
        field: 'Strategic Operations & Institutional Governance',
        rank: 'SECONDARY',
        rationale: `Supported by Sun in Leo (House 5) and 10th lord Saturn in Capricorn.`,
        supportingEvidence: input.leadershipEvidence.supportingFactors.join('; '),
        suitableFunctions: ['operations', 'consulting', 'management'],
        suitableWorkMode: 'Institutional Environment',
        potentialChallenge: 'Managing corporate protocol expectations.',
        timingRelevance: 'Aligns with operational discipline strengths.',
        evidenceIds: ['leadership-evidence', 'planet-sun', 'planet-saturn'],
      },
    ];

    return {
      executiveCareerSummary: `The client's birth chart displays a clear professional orientation anchored by an Ascendant in ${ascSign} and a 10th house in ${h10Sign} governed by ${h10Lord}. Planetary configurations demonstrate strong potential for structural leadership, systems governance, and analytical problem-solving. Overall career evidence is evaluated at ${input.confidence} confidence with high alignment across core operational houses.`,
      executiveDecisionThemes: `Primary strategic choices focus on balancing ${input.leadershipEvidence.strength} leadership drive with ${input.workEnvironmentEvidence.strength} operational discipline. The client is positioned to transition from individual technical execution into high-leverage strategic governance. Key decision themes include optimizing team alignment, institutional positioning, and long-term skill acquisition.`,
      executiveRecommendations: `1. Align current organizational positioning with ${h10Sign} 10th house indications, focusing on institutional authority and systems execution.\n2. Leverage strong analytical indicators (${input.analyticalEvidence.strength}) to drive strategic decision-making and cross-functional leadership.\n3. Establish structured, low-risk operational experiments to validate potential career pivots before full commitment.`,
      careerIdentity: `Anchored by an Ascendant in ${ascSign} with lord ${input.careerAxis.ascendantLord} placed in house ${input.careerAxis.ascendantLordHouse}, the client exhibits an innate drive toward purposeful execution, strategic clarity, and self-directed leadership. Professional motivation stems from building enduring value rather than transient recognition.`,
      professionalPersonality: `Demonstrates a balanced workplace personality characterized by high analytical rigor (${input.analyticalEvidence.strength}), structured communication (${input.communicationEvidence.strength}), and calm problem-solving under pressure. Relates to team members through objective standards, clear expectations, and ethical execution.`,
      naturalStrengths: `Key natural strengths include: ${input.careerAxis.supportingFactors.join('; ') || 'Robust Lagna-10th lord alignment, systematic analytical execution, and strong operational endurance'}. These assets provide a durable foundation for senior technical or executive roles.`,
      professionalChallenges: `Primary developmental areas revolve around managing friction between rapid initiative and institutional protocol (${input.evidenceConflicts.conflictingFactors.join('; ') || 'balancing technical depth with delegative leadership'}). Avoid over-analyzing operational choices at the expense of speed.`,
      careerDNAAnalysis: `Career DNA breakdown reveals Leadership (${input.leadershipEvidence.strength}), Analytical Depth (${input.analyticalEvidence.strength}), Communication Acumen (${input.communicationEvidence.strength}), and Operational Endurance (${input.workEnvironmentEvidence.operationalDiscipline}). This combination favors structured corporate governance or specialized technical leadership.`,
      planetarySynthesis: `Sun in House ${input.leadershipEvidence.sunPlacement.house} provides central vision; Moon in ${input.creativityEvidence.moonPlacement.sign} ensures intuitive adaptability; Mars in House ${input.workEnvironmentEvidence.marsPlacement.house} supplies focused execution power. The interplay of these core significators supports steady professional elevation.`,
      yogaAnalysis: input.yogaEvidence.status === 'AVAILABLE' ? `Favorable planetary combinations (Yogas) reinforce career stability, institutional authority, and financial growth.` : `Standard planetary aspect dynamics active; baseline structural strength supports sustained progress.`,
      employmentEntrepreneurshipAnalysis: `Evaluation indicates primary alignment with structured corporate employment (${input.workEnvironmentEvidence.routineStructureStrength} routine stability), complemented by secondary potential for selective entrepreneurial ventures (${input.entrepreneurshipEvidence.strength} initiative score).`,
      leadershipAnalysis: `Authority style is grounded, principled, and outcome-oriented. Key authority indicators include ${input.leadershipEvidence.authorityIndicators.join(', ')}. Leadership is best exercised through setting technical standards and empowering autonomous teams.`,
      technicalAnalyticalAptitude: `Analytical aptitude is rated at ${input.analyticalEvidence.strength}. Core strengths involve systematic logic (${input.analyticalEvidence.logicIndicators.join(', ')}), detailed problem decomposition, and high-fidelity technical delivery.`,
      creativeCommunicationBusinessAptitude: `Communication style is articulate, structured, and persuasive. Key strengths include ${input.communicationEvidence.commercialInteractionIndicators.join(', ')}, facilitating effective bridge-building between executive stakeholders and technical teams.`,
      researchPotential: `Research potential is evaluated at ${input.researchEvidence.strength}, supported by deep study indicators (${input.researchEvidence.deepStudyIndicators.join(', ')}) and strong capacity for specialized investigation and domain mastery.`,
      sectorFit: `Primary sector fit encompasses Technology, Engineering, Financial Systems, Management Consulting, and Institutional Governance. The 10th house in ${h10Sign} strongly favors structured, high-accountability environments.`,
      internationalCareer: `International career indicators score as ${input.internationalEvidence.strength}. Key factors include ${input.internationalEvidence.foreignConnectionIndicators.join(', ')}, supporting cross-border initiatives or global remote collaboration.`,
      workEnvironment: `Optimal work environment features high operational structure (${input.workEnvironmentEvidence.routineStructureStrength}), clear reporting lines, merit-based advancement, and space for deep, uninterrupted technical focus.`,
      careerFieldsAnalysis: `Primary field: Systems Architecture & Engineering Management; Secondary field: Operations Strategy & Institutional Consulting; Exploratory field: Specialized Research & Advisory Services.`,
      topCareerDirections: `1. Senior Technical Architect / Principal Engineer\n2. Operations Director / Strategic Governance Lead\n3. Specialized Management Consultant`,
      careerDirectionsCaution: `Exercise caution regarding highly chaotic startups with ambiguous reporting lines, unstructured sales roles without clear quotas, or environments lacking technical integrity.`,
      moneyIncomePattern: `Financial accumulation pattern exhibits steady growth via 2nd house (${input.incomeEvidence.wealthHouseSign}) and 11th house gains (${input.incomeEvidence.gainsHouseSign}). Income scales reliably with specialized expertise and seniority.`,
      relationshipsNetworking: `Networking style relies on professional credibility, proven track records, and shared technical standards rather than casual social mixing. Strategic visibility indicators: ${input.networkingEvidence.visibilityIndicators.join(', ')}.`,
      teamDynamics: `Thrives in collaborative, cross-functional teams where roles are clearly demarcated. Contributes high reliability, objective feedback, and calm problem-solving during critical delivery cycles.`,
      sustainabilityAnalysis: `Career sustainability is backed by strong operational discipline (${input.workEnvironmentEvidence.operationalDiscipline}). Long-term endurance requires protecting personal time from boundaryless digital overwork.`,
      careerObstacles: `Potential friction points include ${input.evidenceConflicts.conflictingFactors[0] || 'reluctance to delegate early-stage technical tasks'}. Mitigate through deliberate talent development and clear team delegation.`,
      professionalGrowth: `Long-term growth is driven by accumulating domain authority, publishing high-value work, and taking formal ownership of core organizational systems.`,
      recommendations: `1. Establish a formal 90-day skill development plan focused on high-leverage leadership competencies.\n2. Increase internal visibility by presenting strategic operational reviews to senior leadership.\n3. Protect focused work blocks to maintain technical sharpness while building managerial breadth.`,
      professionalDevelopmentPriorities: `Prioritize strategic leadership, executive presentation skills, system design governance, and cross-functional stakeholder management.`,
      decisionGuidance: `Evaluate all upcoming career moves against three criteria: 1. Alignment with ${h10Sign} 10th house authority themes; 2. Scope for strategic ownership; 3. Long-term skill compounding potential.`,
      actionPlanSummary: `Short-term (30-90 Days): Skill audit and targeted leadership execution. Medium-term (1 Year): Domain expansion and team ownership. Long-term (3 Years): Strategic executive authority.`,
      finalSynthesis: `The client's chart presents a compelling profile of structural competence, analytical depth, and steady professional advancement. By aligning daily choices with core planetary strengths, long-term domain leadership is assured.`,
      primaryProfessionalPriority: `Drive strategic execution and system ownership`,
      technicalSkillPriority: `Master high-level architecture and quantitative analysis`,
      communicationSkillPriority: `Refine executive communication and stakeholder alignment`,
      leadershipSkillPriority: `Develop autonomous team ownership and mentoring practices`,
      networkSkillPriority: `Build strategic industry peer connections`,
      mistakeToAvoid: `Avoid sacrificing long-term strategy for short-term operational fixes`,
      thirtyDayFocus: `Conduct career skill audit and align current goals with 10th house strengths`,
      ninetyDayFocus: `Execute targeted leadership sprint and present strategic initiative`,
      oneYearFocus: `Establish proven track record in high-impact organizational domain`,
      threeYearDirection: `Transition into executive leadership or principal advisory status`,
      ascendantInterpretation: `Ascendant in ${ascSign} ruled by ${input.careerAxis.ascendantLord} indicates strong personal initiative, clear direction, and high natural integrity in professional matters.`,
      houseInterpretations,
      planetInterpretations,
      recommendedFields,
    };
  }
}
