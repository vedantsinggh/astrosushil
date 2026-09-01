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
    const ascLord = input.careerAxis.ascendantLord;
    const h10Sign = input.careerAxis.houseTenSign;
    const h10Lord = input.careerAxis.houseTenLord;

    const houseInterpretations: CareerAnalysisHouseInterpretation[] = input.houseEvidence.map((h) => {
      const occupantsStr = h.occupants.length > 0 ? h.occupants.join(', ') : 'No direct planetary occupants';
      const aspectsStr = h.aspects.length > 0 ? h.aspects.join(', ') : 'No major planetary aspects';
      return {
        houseNumber: h.houseNumber,
        houseMeaning: `House ${h.houseNumber} in ${h.sign} is ruled by ${h.lord}, positioned in House ${h.lordPlacement.house} (${h.lordPlacement.sign}). This house configuration establishes the structural framework for professional activity in this life sector. Occupants: ${occupantsStr}. Aspecting planets: ${aspectsStr}. The energy of ${h.sign} shapes how responsibilities are defined, prioritized, and delivered within workplace environments.\n\nWhen evaluating career direction, House ${h.houseNumber} provides core evidence regarding operational capacity, professional motivation, and team integration. Alignment between the house lord (${h.lord}) and the 10th house creates strong synergy between personal values and external vocational performance.`,
        careerRelevance: `House ${h.houseNumber} directly conditions professional outcomes by anchoring ${h.sign} qualities into daily operational routines. With ${h.lord} placed in House ${h.lordPlacement.house}, career growth is linked to mastering the specific domains of House ${h.lordPlacement.house}. Supporting factors: ${h.supportingFactors.join('; ') || 'Positive house alignment'}.\n\nThis placement highlights opportunities to take on specialized responsibilities, build domain credibility, and establish sustainable work habits that support long-term career progression.`,
        supportingEvidence: `Sign: ${h.sign}; Lord: ${h.lord} in House ${h.lordPlacement.house} (${h.lordPlacement.sign}); Occupants: ${occupantsStr}; Aspects: ${aspectsStr}; Evidence strength: ${h.strength}.`,
        constructiveExpression: `To maximize the potential of House ${h.houseNumber} in ${h.sign}, adopt structured processes, maintain high technical standards, and leverage the natural strengths of ${h.lord}. Focus on building documented workflows, delegating routine tasks cleanly, and aligning daily efforts with primary career milestones.\n\nIn practical terms, this means taking ownership of key deliverables, fostering transparent communication with stakeholders, and continuously refining technical or managerial skills associated with House ${h.houseNumber}.`,
        potentialChallenge: `Potential operational challenges for House ${h.houseNumber} stem from conflicting demands between rapid execution and procedural thoroughness. If ${h.lord} experiences pressure, caution is advised regarding perfectionism, scope creep, or misaligned expectations with team members.\n\nMitigate these challenges by setting explicit boundaries, establishing clear acceptance criteria for projects, and conducting periodic performance reviews to maintain alignment with broader organizational goals.`,
        practicalInterpretation: `Practical strategy for House ${h.houseNumber}: Systematically integrate the strengths of ${h.sign} into your professional role. Leverage Lord ${h.lord} in House ${h.lordPlacement.house} to drive high-impact initiatives, build strong peer alliances, and sustain operational excellence across changing workplace environments.`,
        evidenceIds: [`house-${h.houseNumber}`, `planet-${h.lord.toLowerCase()}`],
      };
    });

    const planetInterpretations: CareerAnalysisPlanetInterpretation[] = input.planetaryEvidence.map((p) => {
      const retroStr = p.retrograde ? ' (Retrograde - indicating internal reflection and non-linear problem solving)' : '';
      const combustStr = p.combustion ? ' (Combust - requiring conscious focus to prevent burn-out)' : '';
      return {
        planet: p.planet,
        placementSummary: `${p.planet} in ${p.sign} (House ${p.house}, ${p.dignity})${retroStr}${combustStr}`,
        careerSignificance: `${p.planet} in ${p.sign} (House ${p.house}) serves as a primary vocational significator, governing key responsibilities across houses ${p.relevantCareerHouses.join(', ') || '10 and 1'}. Placed in ${p.dignity} dignity, ${p.planet} injects specific behavioral drives into executive decision-making and workplace relationships.\n\nThis placement influences how authority is exercised, how technical challenges are approached, and how long-term goals are formulated. ${p.planet}'s relationship with the 10th house lord (${h10Lord}) determines the consistency and visibility of professional output.`,
        constructiveExpression: `Constructive utilization of ${p.planet} in ${p.sign} involves channeling its natural archetypal energy into strategic leadership, rigorous analysis, or commercial execution. Focus on projects where ${p.planet}'s inherent qualities—such as focus, innovation, or discipline—provide a distinct competitive advantage.\n\nBy establishing deliberate work habits and leveraging ${p.planet}'s strengths, you build long-term domain authority and earn the confidence of executive leadership.`,
        potentialPressure: `Potential pressure points for ${p.planet} arise when workplace demands exceed personal energy reserves or when organizational ambiguity hampers clear action.${p.retrograde ? ' Retrograde movement suggests periodic need to re-evaluate strategies before final implementation.' : ''}${p.combustion ? ' Combustion emphasizes the importance of managing stress and avoiding over-extension.' : ''}\n\nMaintain resilience by establishing clear scope limits, seeking mentor guidance during transitional phases, and maintaining physical and mental well-being.`,
        placementSpecificInterpretation: `${p.planet} placed in House ${p.house} (${p.sign}) grounds your vocational focus in the specific domain of House ${p.house}. Supporting career factors: ${p.supportingCareerFactors.join('; ') || 'Direct planetary dignity and house strength'}.\n\nThis placement supports progressive career advancement when aligned with structured organizational goals and objective performance metrics.`,
        practicalCareerImplication: `Practical advice for ${p.planet}: Align your daily routine to leverage ${p.planet} in ${p.sign} (House ${p.house}). Take ownership of core responsibilities tied to ${p.relevantCareerHouses.join(', ')} houses, refine your specialized skills, and maintain consistent execution standards.`,
        evidenceIds: [`planet-${p.planet.toLowerCase()}`],
      };
    });

    const recommendedFields: RecommendedCareerField[] = [
      {
        field: 'Systems Architecture & Technical Management',
        rank: 'PRIMARY',
        rationale: `Strongly supported by Lagna in ${ascSign}, 10th House in ${h10Sign} governed by ${h10Lord}, and analytical strength (${input.analyticalEvidence.strength}).`,
        supportingEvidence: input.analyticalEvidence.supportingFactors.join('; ') || 'High analytical rigor and structured systems thinking.',
        suitableFunctions: ['Systems Engineering', 'Technical Architecture', 'Operations Governance', 'Data Engineering'],
        suitableWorkMode: 'Structured Enterprise / Technology Leadership Environment',
        potentialChallenge: 'Balancing micro-level technical precision with macro-level organizational strategy.',
        timingRelevance: 'Current planetary cycles favor technical skill consolidation and systems ownership.',
        evidenceIds: ['career-axis-10th-house', 'analytical-evidence'],
      },
      {
        field: 'Strategic Operations & Institutional Governance',
        rank: 'SECONDARY',
        rationale: `Supported by leadership evidence (${input.leadershipEvidence.strength}) and strong operational discipline (${input.workEnvironmentEvidence.operationalDiscipline}).`,
        supportingEvidence: input.leadershipEvidence.supportingFactors.join('; ') || 'Proven leadership potential and institutional governance focus.',
        suitableFunctions: ['Operations Management', 'Strategic Planning', 'Program Leadership', 'Consulting'],
        suitableWorkMode: 'Corporate Headquarters / Institutional Management',
        potentialChallenge: 'Navigating organizational politics and multi-stakeholder consensus processes.',
        timingRelevance: 'Upcoming sub-periods open opportunities for expanded team leadership and operational control.',
        evidenceIds: ['leadership-evidence', 'work-environment-evidence'],
      },
      {
        field: 'Specialized Advisory & Domain Research',
        rank: 'EXPLORATORY',
        rationale: `Supported by research indicators (${input.researchEvidence.strength}) and high specialized study capacity.`,
        supportingEvidence: input.researchEvidence.supportingFactors.join('; ') || 'Deep investigation potential and analytical curiosity.',
        suitableFunctions: ['Industry Analysis', 'Domain Research', 'Technical Advisory', 'Policy Development'],
        suitableWorkMode: 'Specialized Advisory / Autonomous Research Institute',
        potentialChallenge: 'Ensuring research findings translate into actionable commercial or operational value.',
        timingRelevance: 'Long-term cycles support building published domain authority and principal advisory status.',
        evidenceIds: ['research-evidence'],
      },
    ];

    return {
      executiveCareerSummary: `The client's astrological blueprint presents a highly structured and purposeful vocational profile, defined by an Ascendant in ${ascSign} (ruled by ${ascLord}) and a 10th house in ${h10Sign} (ruled by ${h10Lord}). This foundational combination establishes a strong drive for tangible achievement, institutional credibility, and systematic execution.\n\nPlanetary evidence across the core career axis reveals exceptional capacity for analytical problem-solving, strategic leadership, and operational discipline. Evaluated at a confidence level of ${input.confidence}, the overall chart pattern demonstrates high alignment between intrinsic capabilities and professional expectations, supporting sustained long-term growth in structured technical and management environments.`,
      executiveDecisionThemes: `Primary executive decision themes center on strategic positioning, leadership transition, and resource optimization. The client is currently positioned at a key threshold where individual technical contribution must be integrated with broader organizational governance. Key choices involve balancing direct operational execution with delegative authority.\n\nTo maximize long-term career velocity, decision-making should prioritize roles that offer clear governance boundaries, merit-based advancement, and direct ownership of high-value systems. Avoid fragmented roles that lack structural authority or long-term strategic coherence.`,
      executiveRecommendations: `1. Institutional Positioning: Align current career progression with the ${h10Sign} 10th house mandate by pursuing formal leadership titles and direct ownership of organizational systems.\n\n2. Analytical & Technical Focus: Leverage high analytical aptitude (${input.analyticalEvidence.strength}) to establish domain authority, drive data-backed decision-making, and mentor emerging talent.\n\n3. Structured Transition Strategy: Implement low-risk, phased initiatives for major career moves, ensuring thorough validation of organizational culture, resource availability, and growth runway before full commitment.`,
      careerIdentity: `Anchored by an Ascendant in ${ascSign} with Lagna Lord ${ascLord} placed in House ${input.careerAxis.ascendantLordHouse} (${input.careerAxis.ascendantLordSign}), the client's professional identity is rooted in integrity, self-reliance, and objective purpose. Motivation stems from creating enduring structural value rather than superficial recognition.\n\nThis orientation shapes a working style that values clarity, systematic progress, and high standards of accountability. The client thrives when given clear autonomy within a well-defined mandate.`,
      professionalPersonality: `The workplace demeanor is characterized by emotional composure, logical clarity, and high professional standards. Analytical strength (${input.analyticalEvidence.strength}) and structured communication (${input.communicationEvidence.strength}) enable the client to bridge executive strategy with operational delivery.\n\nIn team settings, the client acts as a stabilizing force, resolving complex problems through calm evaluation and objective evidence. Peer interactions are built on mutual respect and shared technical rigor.`,
      naturalStrengths: `Core natural strengths include:\n- Systematic Analytical Rigor: Deep capacity for problem decomposition, technical evaluation, and process optimization.\n- Operational Discipline: High endurance and consistency in executing complex, multi-stage initiatives.\n- Strategic Clarity: Natural ability to align daily execution with long-term institutional goals.\n- Principled Leadership: Authority exercised through technical competence, fairness, and transparent expectations.`,
      professionalChallenges: `Key developmental areas and potential friction points include:\n- Perfectionist Tendencies: Risk of over-investing in minor operational details at the expense of strategic momentum.\n- Delegation Friction: Reluctance to hand over technical tasks until team members demonstrate complete mastery.\n- Scope Management: Managing tension between rapid initiative execution and formal corporate protocol.\n\nMitigate these challenges through explicit delegation frameworks, structured milestone reviews, and open feedback loops.`,
      careerDNAAnalysis: `Synthesis of core vocational drives reveals a balanced Career DNA profile:\n- Leadership Drive (${input.leadershipEvidence.strength}): Principled, outcome-oriented authority style.\n- Analytical Acumen (${input.analyticalEvidence.strength}): Outstanding capacity for systems thinking and logical decomposition.\n- Communication Quality (${input.communicationEvidence.strength}): Clear, structured, and persuasive interaction style.\n- Operational Discipline (${input.workEnvironmentEvidence.operationalDiscipline}): Excellent routine maintenance and goal alignment.\n\nThis DNA profile favors high-accountability technical management, corporate governance, or specialized advisory roles.`,
      planetarySynthesis: `The major planetary significators work in concert to drive professional evolution: Sun in House ${input.leadershipEvidence.sunPlacement.house} provides central vision and executive presence; Moon in ${input.creativityEvidence.moonPlacement.sign} provides adaptability and emotional resilience; Mars in House ${input.workEnvironmentEvidence.marsPlacement.house} supplies operational energy and execution drive.\n\nMercury's analytical placement enhances technical precision, while Saturn's influence installs long-term patience, structural discipline, and institutional respect.`,
      yogaAnalysis: input.yogaEvidence.status === 'AVAILABLE'
        ? `The chart features prominent planetary combinations (Yogas) supporting institutional elevation, financial stability, and professional reputation. These combinations reinforce the client's capacity to handle significant responsibility and achieve sustained career growth.`
        : `Baseline structural alignment between the Lagna Lord (${ascLord}) and 10th Lord (${h10Lord}) provides durable support for steady professional advancement, even during challenging transit cycles.`,
      employmentEntrepreneurshipAnalysis: `Evaluation of work mode fit demonstrates strong primary alignment with corporate employment and institutional management (${input.workEnvironmentEvidence.routineStructureStrength} routine stability score). The client excels within structured organizations that offer clear career pathways and substantial resources.\n\nSecondary entrepreneurial potential (${input.entrepreneurshipEvidence.strength}) is best expressed through intrapreneurial leadership within established companies or selective, low-leverage consulting partnerships.`,
      leadershipAnalysis: `Leadership style is grounded, transparent, and standards-driven. Key authority indicators include ${input.leadershipEvidence.authorityIndicators.join(', ') || 'clear goal setting, objective performance criteria, and supportive team mentorship'}.\n\nThe client leads by example, earning authority through technical competence and predictable decision-making rather than aggressive posturing. Teams under this leadership benefit from psychological safety and clear operational direction.`,
      technicalAnalyticalAptitude: `Analytical capability is rated at ${input.analyticalEvidence.strength}, supported by key logic indicators (${input.analyticalEvidence.logicIndicators.join(', ') || 'structured reasoning, data synthesis, and root-cause investigation'}).\n\nThe client possesses exceptional skill in breaking down complex technical problems, identifying hidden system vulnerabilities, and designing robust, scalable solutions.`,
      creativeCommunicationBusinessAptitude: `Communication style is articulate, precise, and business-focused. Strengths include ${input.communicationEvidence.commercialInteractionIndicators.join(', ') || 'effective stakeholder alignment, technical presentation, and structured writing'}.\n\nCreative potential is best channeled into innovative process design, commercial strategy, and clear architectural documentation.`,
      researchPotential: `Research aptitude scores as ${input.researchEvidence.strength}, backed by deep study indicators (${input.researchEvidence.deepStudyIndicators.join(', ') || 'methodical investigation, thorough literature/data review, and specialized domain mastery'}).\n\nThis potential supports advanced technical certifications, specialized whitepaper authoring, or leading specialized R&D initiatives within high-tech industries.`,
      sectorFit: `Optimal industry sectors include:\n1. Information Technology & Software Engineering Systems\n2. Corporate Strategy & Management Consulting\n3. Financial Technology & Quantitative Risk Management\n4. Institutional Governance & Public Policy Advisory\n\nThe 10th house in ${h10Sign} strongly favors environments with rigorous standards, meritocratic reward structures, and high public or market accountability.`,
      internationalCareer: `Global career indicators score as ${input.internationalEvidence.strength}. Key factors (${input.internationalEvidence.foreignConnectionIndicators.join(', ') || 'foreign collaboration links, global remote team management, and cross-border project oversight'}) support international exposure.\n\nThe client is well-suited for multinational corporate roles, cross-border technology transfers, or managing international remote teams.`,
      workEnvironment: `Ideal work environment requirements:\n- Clear Operational Structure: Defined reporting lines, transparent performance metrics, and well-documented processes.\n- Resource & Tooling Availability: Access to modern technology infrastructure and analytical tools.\n- Focused Work Blocks: Culture that respects deep focus time and minimizes unstructured meeting churn.\n- Ethical Integrity: Strong organizational compliance, fair treatment, and professional standards.`,
      careerFieldsAnalysis: `Detailed breakdown of recommended vocational domains:\n- Primary Direction: Systems Architecture, Engineering Management, and Enterprise Systems Governance.\n- Secondary Direction: Strategic Operations, Business Transformation, and Technical Consulting.\n- Exploratory Direction: Specialized Industry Research, Technical Writing, and Academic/Professional Advisory.`,
      topCareerDirections: `1. Principal Systems Architect / Director of Engineering\n2. Head of Strategic Operations / Enterprise Transformation Lead\n3. Principal Management Consultant / Technology Strategy Partner`,
      careerDirectionsCaution: `Avoid environments characterized by unstructured chaos, ambiguous performance criteria, lack of technical integrity, or continuous high-stress emergency modes without adequate recovery systems.`,
      moneyIncomePattern: `Financial accumulation pattern shows strong, steady growth governed by the 2nd house (${input.incomeEvidence.wealthHouseSign}) and 11th house (${input.incomeEvidence.gainsHouseSign}). Income scales predictably with specialized domain expertise, seniority, and systems ownership.\n\nWealth accumulation is optimized through disciplined savings, prudent investments, and long-term equity or performance incentive structures.`,
      relationshipsNetworking: `Networking strategy is built on professional credibility, technical excellence, and genuine mutual benefit rather than aggressive self-promotion. Visibility indicators (${input.networkingEvidence.visibilityIndicators.join(', ') || 'industry panel presentations, technical publications, and strategic internal alliances'}) support building high-value professional networks.\n\nFocus on cultivating relationships with executive sponsors, technical peers, and industry domain experts.`,
      teamDynamics: `In cross-functional teams, the client brings emotional stability, logical rigor, and high accountability. Roles are executed with precision, and team members are supported through clear documentation and collaborative problem-solving.\n\nTo maximize team harmony, ensure clear demarcation of responsibilities and maintain open channels for constructive feedback.`,
      sustainabilityAnalysis: `Career sustainability is backed by strong operational endurance (${input.workEnvironmentEvidence.operationalDiscipline}). Long-term vitality requires proactive stress management, regular physical rest, and clear boundaries between work and personal life.\n\nPrevent burnout by establishing dedicated personal time, practicing regular mindfulness or physical exercise, and periodically stepping back to review overall life balance.`,
      careerObstacles: `Identified career obstacles and mitigation strategies:\n- Challenge: ${input.evidenceConflicts.conflictingFactors[0] || 'Over-investment in technical detail leading to delayed delegation'}.\n- Countermeasure: Implement formal delegation frameworks with explicit checkpoints.\n- Challenge: Navigating slow institutional decision-making.\n- Countermeasure: Build strong cross-functional coalition support before formal project proposals.`,
      professionalGrowth: `Professional progression relies on compounding domain authority, taking direct ownership of core organizational platforms, and building a recognized track record of successful program delivery.\n\nInvest continuously in high-leverage skill development, executive leadership training, and strategic industry networking.`,
      recommendations: `Actionable recommendations for immediate implementation:\n1. Conduct a comprehensive 90-day skill and positioning audit to align current work with 10th house (${h10Sign}) goals.\n2. Initiate a strategic project ownership conversation with senior management to expand mandate.\n3. Establish structured daily deep-work routines to accelerate high-impact deliverables.`,
      professionalDevelopmentPriorities: `Prioritize the following core competencies:\n- Strategic Executive Presentation & Stakeholder Alignment\n- Advanced Systems Architecture & Enterprise Governance\n- Autonomous Team Mentorship & Delegation Frameworks\n- Financial & Operational Metric Optimization`,
      decisionGuidance: `Evaluate all future career opportunities against three core criteria:\n1. Does the role offer clear scope for systems ownership and strategic impact?\n2. Is the organizational culture aligned with high technical and ethical standards?\n3. Does the position support long-term skill compounding and institutional advancement?`,
      actionPlanSummary: `Phased Action Plan:\n- 30 Days: Complete internal audit, align current tasks with strategic priorities, and set key performance indicators.\n- 90 Days: Present a strategic operational initiative, expand cross-functional visibility, and establish mentorship goals.\n- 1 Year: Formalize expanded leadership title, take full ownership of a major system, and present at industry forums.\n- 3 Years: Achieve executive leadership status or principal advisory position with broad governance authority.`,
      finalSynthesis: `The client's birth chart reveals a powerful, highly capable vocational profile characterized by structural integrity, analytical depth, and clear leadership potential. By systematically aligning daily execution with core astrological strengths (${ascSign} Lagna, ${h10Sign} 10th House), long-term executive success and profound professional fulfillment are fully assured.`,
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
      ascendantInterpretation: `Ascendant in ${ascSign} ruled by ${ascLord} indicates high natural integrity, purposeful execution, and a clear self-directed career orientation.`,
      houseInterpretations,
      planetInterpretations,
      recommendedFields,
    };
  }
}
