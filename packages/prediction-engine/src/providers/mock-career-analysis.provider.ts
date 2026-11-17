import {
  CareerAnalysis,
  CareerAnalysisInput,
  CareerAnalysisProvider,
  CareerAnalysisHouseInterpretation,
  CareerAnalysisPlanetInterpretation,
  RecommendedCareerField,
} from '../types/evidence.types';

const HOUSE_THEMES: Record<number, { domain: string; constructive: string; challenge: string; practical: string }> = {
  1: {
    domain: 'Tanu Bhava (core executive presence, personal agency, physical vitality, and professional identity)',
    constructive: 'Establish authentic executive presence through transparent leadership, decisive initiative, and high personal accountability.',
    challenge: 'Over-identifying personally with institutional outcomes, leading to exhaustion during corporate friction.',
    practical: 'Focus on setting personal performance standards and building a recognizable executive brand centered on integrity and delivery.',
  },
  2: {
    domain: 'Dhana Bhava (accumulated resources, liquidity reserves, commercial negotiation, and financial stewardship)',
    constructive: 'Deploy conservative capital allocation, negotiate clear commercial contracts, and build durable asset reserves.',
    challenge: 'Risk aversion that delays necessary enterprise investments, or friction around resource distribution.',
    practical: 'Maintain diversified liquidity reserves and align remuneration models with tangible delivery milestones.',
  },
  3: {
    domain: 'Sahaja Bhava (initiative, tactical communication, enterprise drive, peer collaboration, and operational agility)',
    constructive: 'Drive cross-functional project momentum, author clear technical documentation, and foster agile peer collaboration.',
    challenge: 'Fragmenting mental energy across too many parallel tactical tasks without strategic prioritization.',
    practical: 'Channel enterprise drive into 2-3 high-leverage initiatives with structured project milestones and regular stakeholder updates.',
  },
  4: {
    domain: 'Bandhu Bhava (foundational infrastructure, corporate assets, workplace security, and organizational stability)',
    constructive: 'Build resilient institutional foundations, secure workplace infrastructure, and establish predictable operational environments.',
    challenge: 'Resistance to operational restructuring due to attachment to established workplace comfort zones.',
    practical: 'Optimize back-office infrastructure and ensure team workflows have stable, documented operational baselines.',
  },
  5: {
    domain: 'Putra Bhava (creative intelligence, strategic foresight, intellectual discernment, and advisory counsel)',
    constructive: 'Pioneer novel product solutions, apply analytical foresight to complex systems, and provide high-value advisory counsel.',
    challenge: 'Over-analyzing theoretical possibilities at the expense of pragmatic execution timelines.',
    practical: 'Structure innovation sprints with rapid prototyping and validate strategic models against real-world feedback.',
  },
  6: {
    domain: 'Shatru Bhava (daily service routines, operational optimization, competitive endurance, and crisis handling)',
    constructive: 'Streamline operational workflows, resolve complex organizational bottlenecks, and maintain high competitive stamina.',
    challenge: 'Burnout from internalizing daily micro-conflicts or taking on disproportionate troubleshooting burdens.',
    practical: 'Implement systematic triage protocols for operational escalations and delegate routine maintenance cleanly.',
  },
  7: {
    domain: 'Kalatra Bhava (commercial partnerships, client contracts, bilateral negotiations, and public enterprise agreements)',
    constructive: 'Structure equitable joint ventures, master high-stakes client negotiations, and sustain high-trust commercial partnerships.',
    challenge: 'Disputes arising from ambiguous contractual terms or asymmetric commitment between partners.',
    practical: 'Formalize all collaborative ventures with clear legal frameworks, performance criteria, and exit mechanisms.',
  },
  8: {
    domain: 'Randhra Bhava (turnaround management, hidden organizational risks, deep research, and transformative restructuring)',
    constructive: 'Navigate complex institutional transitions, unearth root-cause vulnerabilities, and lead strategic turnarounds.',
    challenge: 'Sudden organizational disruptions, political volatility, or intense operational friction during restructuring.',
    practical: 'Develop proactive risk mitigation protocols and maintain calm, data-backed neutrality during corporate crises.',
  },
  9: {
    domain: 'Bhagya Bhava (executive mentorship, institutional ethics, higher wisdom, global expansion, and strategic vision)',
    constructive: 'Cultivate alliances with senior institutional sponsors, uphold constitutional ethics, and guide long-term strategy.',
    challenge: 'Ethical compromises within the corporate hierarchy or misalignment with institutional leadership values.',
    practical: 'Actively engage senior domain mentors, pursue advanced certifications, and align career moves with ethical principles.',
  },
  10: {
    domain: 'Karma Bhava (primary career mandate, executive authority, institutional reputation, and public accomplishments)',
    constructive: 'Command high-visibility programs, accept direct ownership of key business units, and establish lasting domain authority.',
    challenge: 'Public scrutiny, organizational politics, and the heavy burden of executive accountability during down-cycles.',
    practical: 'Prioritize strategic outcomes that create tangible organizational value, protecting institutional credibility above short-term prestige.',
  },
  11: {
    domain: 'Labha Bhava (enterprise scale, professional networks, regular revenue gains, and high-level industry alliances)',
    constructive: 'Monetize specialized expertise at scale, cultivate powerful industry networks, and capture enterprise upside.',
    challenge: 'Relying on superficial professional connections that fail to deliver meaningful strategic support.',
    practical: 'Cultivate a focused circle of high-caliber peers and align compensation models with long-term enterprise growth.',
  },
  12: {
    domain: 'Vyaya Bhava (global/remote operations, international markets, back-office infrastructure, and strategic discretion)',
    constructive: 'Lead cross-border initiatives, orchestrate remote enterprise systems, and operate effectively in global contexts.',
    challenge: 'Operating in isolation, hidden expenditures, or communication barriers across international timezones.',
    practical: 'Establish clear communication cadences for remote stakeholders and implement disciplined oversight on international projects.',
  },
};

const PLANET_THEMES: Record<string, { karakattva: string; constructive: string; pressure: string; practical: string }> = {
  SUN: {
    karakattva: 'executive vision, sovereign authority, institutional credibility, and government/regulatory alignment',
    constructive: 'Command authority with integrity, provide clear strategic direction, and inspire confidence among senior stakeholders.',
    pressure: 'Ego friction with rival leaders or frustration when operating under bureaucratic micro-management.',
    practical: 'Pursue roles with clear governance mandates, lead high-visibility initiatives, and mentor emerging leaders.',
  },
  MOON: {
    karakattva: 'cognitive adaptability, emotional composure, public rapport, and intuitive stakeholder perception',
    constructive: 'Foster psychological safety within teams, gauge market sentiment accurately, and adapt smoothly to changing workplace conditions.',
    pressure: 'Internalizing workplace stress and fluctuating motivation during prolonged periods of organizational ambiguity.',
    practical: 'Maintain disciplined daily routines to protect mental clarity and schedule offline recovery intervals between major delivery sprints.',
  },
  MARS: {
    karakattva: 'tactical execution, technical problem-solving, engineering discipline, and decisive crisis resolution',
    constructive: 'Execute complex programs with speed, cut through bureaucratic hesitation, and resolve operational crises decisively.',
    pressure: 'Impatience with slow consensus-building, leading to interpersonal friction with risk-averse stakeholders.',
    practical: 'Channel drive into structured engineering sprints, establish measurable delivery milestones, and communicate with deliberate tact.',
  },
  MERCURY: {
    karakattva: 'analytical systems, commercial acumen, data modeling, process documentation, and communication clarity',
    constructive: 'Deconstruct complex data flows, negotiate advantageous commercial contracts, and build elegant, repeatable processes.',
    pressure: 'Analysis paralysis, over-optimizing minor technical details, and nervous strain from managing concurrent data streams.',
    practical: 'Prioritize actionable data insights over exhaustive theoretical perfection and standardize written communication protocols.',
  },
  JUPITER: {
    karakattva: 'strategic wisdom, corporate governance, ethical leadership, advisory council, and executive mentorship',
    constructive: 'Provide wise counsel on long-term institutional strategy, mentor high-potential talent, and uphold corporate ethics.',
    pressure: 'Over-promising scope due to optimism, or friction with environments that prioritize short-term profit over integrity.',
    practical: 'Anchor strategic vision to concrete feasibility studies and serve as an executive sponsor for key governance committees.',
  },
  VENUS: {
    karakattva: 'commercial value creation, diplomacy, design sensibility, stakeholder negotiation, and partnership harmony',
    constructive: 'Design elegant stakeholder experiences, negotiate win-win commercial agreements, and build cross-functional harmony.',
    pressure: 'Conflict avoidance that delays necessary confrontations, or over-spending on aesthetic presentation over core function.',
    practical: 'Leverage diplomatic skills in high-stakes negotiations while maintaining firm contractual boundaries on project scope.',
  },
  SATURN: {
    karakattva: 'operational discipline, organizational stamina, long-term persistence, systems reliability, and regulatory compliance',
    constructive: 'Build enduring enterprise architecture, withstand prolonged operational pressures, and deliver reliable long-term results.',
    pressure: 'Pessimism, excessive rigidity, and the burden of unrewarded labor during early developmental phases.',
    practical: 'Embrace incremental compounding, implement automated quality controls, and maintain steady persistence through bureaucratic delays.',
  },
  RAHU: {
    karakattva: 'technological innovation, market disruption, unconventional scaling, foreign alliances, and frontier domains',
    constructive: 'Identify emerging industry trends ahead of the curve, leverage unconventional technologies, and scale enterprise reach globally.',
    pressure: 'Imposter syndrome, over-speculation on untested technologies, and reputational volatility from excessive risk-taking.',
    practical: 'Anchor breakthrough innovation to proven engineering baselines and vet new technologies through rigorous pilot projects.',
  },
  KETU: {
    karakattva: 'root-cause diagnostics, specialized R&D, technical abstraction, independent research, and system deconstruction',
    constructive: 'Deconstruct obscure system failures, conduct breakthrough specialized research, and operate with autonomous intellectual rigor.',
    pressure: 'Alienation from corporate politics, disinterest in routine administration, and abrupt desire to detach from ongoing projects.',
    practical: 'Carve out autonomous advisory or R&D roles where deep individual technical contribution is valued over political consensus.',
  },
};

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
      const occupantsStr = h.occupants.length > 0 ? h.occupants.join(', ') : 'No direct occupants';
      const aspectsStr = h.aspects.length > 0 ? h.aspects.join(', ') : 'No major planetary aspects';
      const theme = HOUSE_THEMES[h.houseNumber] || {
        domain: `House ${h.houseNumber} affairs`,
        constructive: 'Maintain steady operational focus and alignment with organizational deliverables.',
        challenge: 'Navigating shifting priorities and maintaining execution consistency.',
        practical: 'Align daily efforts with structured project milestones.',
      };

      return {
        houseNumber: h.houseNumber,
        houseMeaning: `House ${h.houseNumber} in ${h.sign} is ruled by ${h.lord}, positioned in House ${h.lordPlacement.house} (${h.lordPlacement.sign}). In classical Vedic analysis, this house governs ${theme.domain}. Occupants: ${occupantsStr}. Aspecting planets: ${aspectsStr}. The qualities of ${h.sign} condition how responsibilities and challenges in this domain are approached and resolved.`,
        careerRelevance: `House ${h.houseNumber} directly influences professional performance by anchoring ${h.sign} energy into ${theme.domain.toLowerCase()}. With Lord ${h.lord} placed in House ${h.lordPlacement.house}, execution in this sphere is closely linked to affairs of House ${h.lordPlacement.house}. Supporting factors: ${h.supportingFactors.join('; ') || 'Direct house alignment'}.`,
        supportingEvidence: `Sign: ${h.sign}; Lord: ${h.lord} in House ${h.lordPlacement.house} (${h.lordPlacement.sign}); Occupants: ${occupantsStr}; Aspects: ${aspectsStr}; Evidence strength: ${h.strength}.`,
        constructiveExpression: theme.constructive,
        potentialChallenge: theme.challenge,
        practicalInterpretation: theme.practical,
        evidenceIds: [`house-${h.houseNumber}`],
      };
    });

    const planetInterpretations: CareerAnalysisPlanetInterpretation[] = input.planetaryEvidence.map((p) => {
      const retroStr = p.retrograde ? ' (Retrograde — indicates reflective, non-linear strategic processing)' : '';
      const combustStr = p.combustion ? ' (Combust — indicates high mental intensity requiring stress moderation)' : '';
      const aspectSummaryStr =
        p.aspectRecords && p.aspectRecords.length > 0
          ? `Casts Parashari aspects: ${p.aspectRecords.map((a) => {
              const ord = a.aspectOrdinal === 1 ? '1st' : a.aspectOrdinal === 2 ? '2nd' : a.aspectOrdinal === 3 ? '3rd' : `${a.aspectOrdinal}th`;
              return `${ord} aspect on House ${a.targetHouse} (${a.targetSign})`;
            }).join(', ')}.`
          : 'Casts no special planetary aspects.';
      const pSym = p.planet.toUpperCase();
      const theme = PLANET_THEMES[pSym] || {
        karakattva: `${p.planet} vocational energies`,
        constructive: 'Channel innate strengths into consistent professional execution.',
        pressure: 'Workplace friction arising from misaligned scope expectations.',
        practical: 'Establish clear boundaries and documented workflows.',
      };

      return {
        planet: p.planet,
        placementSummary: `${p.planet} in ${p.sign} (House ${p.house}, ${p.dignity})${retroStr}${combustStr}`,
        careerSignificance: `${p.planet} in ${p.sign} (House ${p.house}) serves as a key vocational significator governing ${theme.karakattva}. Placed in ${p.dignity} dignity, it conditions how professional challenges are addressed across houses ${p.relevantCareerHouses.join(', ') || '10 and 1'}. ${aspectSummaryStr}`,
        constructiveExpression: theme.constructive,
        potentialPressure: `${theme.pressure}${p.retrograde ? ' Retrograde motion calls for periodic strategy validation before major execution.' : ''}`,
        placementSpecificInterpretation: `${p.planet} placed in House ${p.house} (${p.sign}) directs its core significations into the affairs of House ${p.house}. Supporting factors: ${p.supportingCareerFactors.join('; ') || 'Planetary dignity and house position'}.`,
        practicalCareerImplication: theme.practical,
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
      moneyIncomePattern: `Financial accumulation pattern shows strong, steady growth governed by the 2nd house of accumulated reserves (Dhana Bhava, in ${input.incomeEvidence.wealthHouseSign}) and the 11th house of enterprise gains (Labha Bhava, in ${input.incomeEvidence.gainsHouseSign}). Income scales predictably with specialized domain expertise, seniority, and systems ownership.\n\nWealth accumulation is optimized through disciplined savings, prudent investments, and long-term equity or performance incentive structures.`,
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
      ascendantInterpretation: `Ascendant (Lagna) in ${ascSign} ruled by Lagna Lord ${ascLord} indicates high natural integrity, purposeful execution, and a clear self-directed career orientation.`,
      houseInterpretations,
      planetInterpretations,
      recommendedFields,
    };
  }
}
