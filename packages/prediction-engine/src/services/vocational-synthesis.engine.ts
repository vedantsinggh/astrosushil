/**
 * ASTRO SUSHIL — VOCATIONAL SYNTHESIS ENGINE
 *
 * Deterministic synthesis engine for career direction ranking, sector comparisons,
 * caution directions, strengths/challenges matrices, and employment vs. entrepreneurship.
 *
 * ============================================================================
 * ASTROLOGICAL RULEBOOK & METHODOLOGICAL DISTINCTION:
 * ============================================================================
 * 1. CLASSICAL FOUNDATIONS (Parashari & Jaimini Traditions):
 *    - Brihat Parashara Hora Shastra (BPHS) Ch. 42 / Phaladeepika Ch. 5:
 *      Karma Bhava (10th house), its sign, its ruler (10th lord), planets occupying
 *      the 10th, and planets aspecting the 10th are the primary determinants of profession.
 *    - Jaimini Upadesha Sutras 1.2:
 *      Amatyakaraka (AmK) is the natural significator of career, ministry, advisory roles,
 *      and livelihood execution.
 *    - Dashamsha (D10 Varga Chart):
 *      Dedicated divisional chart for career stature (Mahat Phala), public reputation,
 *      and institutional advancement.
 *    - Ashtakavarga (Sarvashtakavarga):
 *      Mathematical benchmark of Sarvashtakavarga is 337 / 12 = 28.0833 (28 bindus).
 *      Bindu totals above 28 in Houses 10 (karma), 11 (gains), 2 (savings), and 6 (daily service)
 *      indicate ease of milestone execution and material stability.
 *
 * 2. PROVISIONAL HEURISTIC PARAMETERS (Explicitly Documented):
 *    - Ancient Vedic texts describe classical archetypes (e.g. Mars as mechanics/fire/weapons,
 *      Mercury as trade/mathematics/writing, Jupiter as law/advisory/ministry).
 *    - Mapping these classical archetypes to contemporary professional sectors (e.g. software architecture,
 *      fintech risk modeling, quantitative strategy) is an interpretive synthesis heuristic, NOT an ancient
 *      scriptural verse.
 *    - The weights below are PROVISIONAL HEURISTIC PARAMETERS configured to establish relative vocational
 *      affinity. They do NOT represent empirically validated regression coefficients, divine absolutes,
 *      confidence levels, probabilities, or calibrated scores.
 *
 * 3. HANDLING CONTRADICTORY EVIDENCE (D1 vs D10):
 *    - D1 (Rashi) is the foundational chart of physical manifestation and primary vocational orientation (BPHS Ch. 11/42).
 *    - D10 (Dashamsha) is a secondary divisional chart representing professional fruition (Mahat Phala) and institutional hierarchy.
 *    - When D1 points to one domain and D10 points to another, each domain accumulates points solely from its genuine source.
 *      D1 retains foundational priority (weight 30 vs 16) in accordance with Parashari hierarchy.
 *    - We do NOT silently resolve conflicts by inventing ad-hoc penalty deductions or artificial modifiers.
 * ============================================================================
 */

import {
  NormalizedChart,
  NormalizedPlanet,
  PlanetSymbol,
  getAspectedHouses,
  RASHIS,
} from '@astro/astrology-engine';

/**
 * Provisional heuristic weights table.
 * Every weight has a documented rationale and scope boundary.
 */
export const PROVISIONAL_HEURISTIC_WEIGHTS = {
  // Primary classical Parashari significator of Karma Bhava (BPHS Ch. 42)
  TENTH_LORD_PRIMARY: 30,
  // Secondary supporting significator for modern domain
  TENTH_LORD_SUPPORTING: 15,
  // Dignity modifier for 10th lord (Exalted, Moolatrikona, Own Sign)
  TENTH_LORD_DIGNITY_BONUS: 8,
  // Dignity penalty for debilitated 10th lord (ensures unanchored debilitated lord alone does not breach recommendation threshold)
  TENTH_LORD_DEBILITATED_PENALTY: -12,
  // Rashi affinity with domain
  TENTH_HOUSE_FAVORABLE_SIGN: 6,
  // Planet physically tenanting 10th house (excluding 10th lord to prevent double counting)
  TENTH_HOUSE_OCCUPANT_PRIMARY: 20,
  // Supporting occupant in 10th house
  TENTH_HOUSE_OCCUPANT_SUPPORTING: 10,
  // Aspect cast on 10th house from another house (excluding occupants & 10th lord)
  TENTH_HOUSE_ASPECT_PRIMARY: 12,
  // Jaimini career significator (AmK)
  AMATYAKARAKA_PRIMARY: 25,
  AMATYAKARAKA_SUPPORTING: 12,
  // Dashamsha divisional career lord
  D10_TENTH_LORD: 16,
  // Dashamsha 10th house occupant
  D10_TENTH_OCCUPANT: 12,
  // Top Shadbala planet (overall operational capacity; provisional weighting to avoid overpowering dignity)
  SHADBALA_RANK_1: 14,
  SHADBALA_RANK_2: 8,
  SHADBALA_RANK_3: 4,
  // Classical Sarvashtakavarga: strictly > 28 bindus in relevant house (classical mathematical mean: 337 / 12 = 28.0833)
  // Missing SAV contributes exactly 0 points (neither positive nor negative).
  SAV_BENCHMARK_ABOVE: 8,
  SAV_BENCHMARK_SECONDARY: 7,
  // Active temporal window lord (subordinate to natal potential)
  DASHA_MAHADASHA: 8,
  DASHA_ANTARDASHA: 4,
};

export type CareerArchetypeKey =
  | 'ENGINEERING_TECH'
  | 'RESEARCH_SCIENCE'
  | 'MANAGEMENT_LEADERSHIP'
  | 'BUSINESS_ENTREPRENEURSHIP'
  | 'COMMUNICATION_EDUCATION'
  | 'CREATIVE_DESIGN'
  | 'PUBLIC_SERVICE'
  | 'FINANCE_ANALYTICS';

export interface VocationalArchetypeDefinition {
  key: CareerArchetypeKey;
  title: string;
  category: string;
  primarySignificators: string[];
  supportingSignificators: string[];
  primaryHouses: number[];
  favorableSigns: string[];
  relevantVargas: string;
  traditionalBasis: string;
  modernMapping: string;
  knownLimitations: string;
  requiredStrengths: string;
  potentialChallenges: string;
  optimalEnvironment: string;
  practicalExperiment: string;
  sectorName: string;
  opportunities: string;
  hazards: string;
  strategicGuidance: string;
}

export const VOCATIONAL_ARCHETYPES: Record<CareerArchetypeKey, VocationalArchetypeDefinition> = {
  ENGINEERING_TECH: {
    key: 'ENGINEERING_TECH',
    title: 'Technology & Systems Engineering / Technical Architecture',
    category: 'Technology & Engineering',
    primarySignificators: ['MARS', 'MERCURY'],
    supportingSignificators: ['SATURN', 'KETU'],
    primaryHouses: [10, 5, 8, 3],
    favorableSigns: ['Aries', 'Scorpio', 'Virgo', 'Gemini', 'Capricorn', 'Aquarius'],
    relevantVargas: 'D1, D10, D24',
    traditionalBasis: 'Classical Parashari principles (BPHS Ch. 42 / Brihat Jataka Ch. 10) directly associate Mars with fire (Agni), tools/weapons (Shastra), metallurgy, and mechanical execution, while Mercury rules calculation (Ganita), precision measurement, and analytical discernment.',
    modernMapping: 'Modern occupational extrapolation: Software engineering, cloud architecture, robotics, artificial intelligence (AI), distributed data infrastructure, and digital hardware engineering.',
    knownLimitations: 'Classical Vedic texts had no concept of digital computation, semiconductors, software engineering, or AI. Mapping Martian-Mercurial signatures to computer systems is entirely a modern heuristic extrapolation based on elemental archetypes (logic/fire/mechanics).',
    requiredStrengths: 'Architectural clarity, algorithmic reasoning, systems decomposition, and delivery rigor.',
    potentialChallenges: 'Balancing technical perfectionism with organizational delegation and managing tool fatigue.',
    optimalEnvironment: 'Fast-paced technology enterprise, high-growth systems firm, or technical architecture practice.',
    practicalExperiment: 'Lead a focused architectural modernization sprint with measurable latency and stability targets.',
    sectorName: 'Enterprise Technology & Systems',
    opportunities: 'Technical architecture leadership, distributed systems engineering, and data infrastructure.',
    hazards: 'Rapid technology obsolescence cycles requiring continuous domain reskilling.',
    strategicGuidance: 'Focus on high-leverage architectural patterns and cultivate engineering mentorship.',
  },
  RESEARCH_SCIENCE: {
    key: 'RESEARCH_SCIENCE',
    title: 'Scientific Research, Deep Analysis & Advanced Investigation',
    category: 'Research & Scientific Systems',
    primarySignificators: ['KETU', 'SATURN'],
    supportingSignificators: ['MERCURY', 'JUPITER', 'MARS'],
    primaryHouses: [8, 9, 5, 12, 10],
    favorableSigns: ['Scorpio', 'Aquarius', 'Pisces', 'Virgo', 'Cancer'],
    relevantVargas: 'D1, D10, D20, D24',
    traditionalBasis: 'Classical Parashari principles (BPHS Ch. 18 & 42 / Saravali Ch. 22) attribute subtle, unseen root phenomena (Guhya) to Ketu, methodical empirical investigation and patience under isolation to Saturn, and systemic discernment to Mercury.',
    modernMapping: 'Modern occupational extrapolation: Empirical laboratory science, pharmaceutical discovery, data science analytics, statistical modeling, genomics, and academic research.',
    knownLimitations: 'Classical sources describe mineral exploration, occult sciences, and philosophical hermit inquiry. Contemporary institutional laboratory science and large-scale computational research are modern extrapolations requiring careful 8th/9th house differentiation.',
    requiredStrengths: 'Empirical rigor, hypothesis formulation, root-cause depth, and meticulous documentation.',
    potentialChallenges: 'Academic or institutional isolation and prolonged investigation cycles before commercial validation.',
    optimalEnvironment: 'Advanced research institute, corporate R&D laboratory, deep-tech research group, or academic faculty.',
    practicalExperiment: 'Execute a structured 6-week literature and empirical investigation to test a core technical hypothesis.',
    sectorName: 'Scientific Research & Advanced Analytics',
    opportunities: 'Principal investigator roles, patent development, deep data research, and scientific advisory.',
    hazards: 'Funding dependencies and bureaucratic friction in large research institutions.',
    strategicGuidance: 'Pair deep methodological discovery with clear business translation for executive sponsors.',
  },
  MANAGEMENT_LEADERSHIP: {
    key: 'MANAGEMENT_LEADERSHIP',
    title: 'Executive Management, Corporate Governance & Operational Strategy',
    category: 'Strategy & Leadership',
    primarySignificators: ['SUN', 'JUPITER'],
    supportingSignificators: ['MARS', 'SATURN'],
    primaryHouses: [1, 10, 9, 6],
    favorableSigns: ['Leo', 'Aries', 'Sagittarius', 'Capricorn'],
    relevantVargas: 'D1, D9, D10',
    traditionalBasis: 'Classical Parashari texts (BPHS Ch. 11 & 42 / Jaimini Upadesha Sutras 1.2) associate the Sun with sovereign authority (Raja-yoga), royal patronage, and governance, while Jupiter signifies ministerial council (Mantri), ethical administration, and institutional wisdom.',
    modernMapping: 'Modern occupational extrapolation: C-suite executive management (CEO/COO), corporate board governance, general management, and enterprise strategy consulting.',
    knownLimitations: 'Classical literature assumed monarchical courts and ministerial councils; translating these indications into modern multi-layered corporate matrix organizations is an interpretive institutional heuristic.',
    requiredStrengths: 'Executive decision-making, organizational vision, cross-functional orchestration, and high accountability.',
    potentialChallenges: 'Navigating matrix politics, managing organizational inertia, and guarding against executive isolation.',
    optimalEnvironment: 'Corporate headquarters, institutional management board, strategic business unit, or global operations center.',
    practicalExperiment: 'Spearhead an operational transformation program targeting a measurable improvement in process velocity.',
    sectorName: 'Corporate Strategy & Management Consulting',
    opportunities: 'General management, enterprise restructuring, board-level advisory, and strategic business transformation.',
    hazards: 'Complex corporate politics and high travel or stakeholder demands.',
    strategicGuidance: 'Anchor strategic mandates on verifiable performance metrics and clear stakeholder consensus.',
  },
  BUSINESS_ENTREPRENEURSHIP: {
    key: 'BUSINESS_ENTREPRENEURSHIP',
    title: 'Venture Founding, Commercial Expansion & Enterprise Development',
    category: 'Commerce & Entrepreneurship',
    primarySignificators: ['MERCURY', 'MARS'],
    supportingSignificators: ['RAHU', 'JUPITER', 'VENUS'],
    primaryHouses: [3, 7, 10, 11],
    favorableSigns: ['Gemini', 'Taurus', 'Libra', 'Aries', 'Aquarius'],
    relevantVargas: 'D1, D3, D10',
    traditionalBasis: 'Classical authorities (BPHS Ch. 18 & 42 / Brihat Jataka Ch. 10 / Jaimini Sutras 1.2) directly identify Mercury as the significator of trade, commercial exchange (Vanika/Vyapar), and transactional fluency, while Mars (3rd house Parakrama) provides initiative and calculated risk tolerance.',
    modernMapping: 'Modern occupational extrapolation: Startup venture founding, corporate business development, commercial scaling, e-commerce enterprise, and boutique advisory practices.',
    knownLimitations: 'Classical trade centered on physical commodities and merchant caravans. High-growth venture capital, equity financing, and digital commerce platforms represent modern occupational extensions.',
    requiredStrengths: 'Commercial negotiation, enterprise risk evaluation, commercial pipeline development, and tactical agility.',
    potentialChallenges: 'Early cash flow volatility, resource constraints during capitalization cycles, and personal risk exposure.',
    optimalEnvironment: 'Independent venture, venture-backed scaleup, boutique consultancy, or commercial trading firm.',
    practicalExperiment: 'Conduct a targeted commercial validation pilot to secure early customer commitments within 60 days.',
    sectorName: 'Independent Advisory & Venture Founding',
    opportunities: 'Commercial enterprise ownership, equity growth, market disruption, and specialized advisory founding.',
    hazards: 'Capital volatility and prolonged business development overhead during initial launch stages.',
    strategicGuidance: 'Build verified revenue pipeline and operational reserves before scaling commercial overhead.',
  },
  COMMUNICATION_EDUCATION: {
    key: 'COMMUNICATION_EDUCATION',
    title: 'Educational Leadership, Strategic Media & Knowledge Transmission',
    category: 'Communication & Education',
    primarySignificators: ['MERCURY', 'JUPITER'],
    supportingSignificators: ['MOON', 'VENUS'],
    primaryHouses: [2, 3, 5, 9, 10],
    favorableSigns: ['Gemini', 'Virgo', 'Sagittarius', 'Pisces', 'Cancer'],
    relevantVargas: 'D1, D10, D24',
    traditionalBasis: 'Classical Parashari texts (BPHS Ch. 18 & 42 / Phaladeepika Ch. 5) directly govern the spoken and written word (Vak/Lekhana/Grantha) through Mercury, while Jupiter represents pedagogical mastery, preceptor roles (Guru/Acharya), and sacred/higher knowledge.',
    modernMapping: 'Modern occupational extrapolation: University faculty, corporate executive education, digital journalism, media broadcasting, publishing, and curriculum architecture.',
    knownLimitations: 'Classical scriptural focus was on oral tradition, scribes, and Vedic instruction. Mass digital broadcasting, content streaming platforms, and social media channels are modern heuristic extrapolations.',
    requiredStrengths: 'Pedagogical clarity, persuasive writing, curriculum architecture, and empathetic public engagement.',
    potentialChallenges: 'Audience fatigue, balancing academic depth with commercial brevity, and evolving delivery channels.',
    optimalEnvironment: 'Higher education institution, executive training academy, corporate communications bureau, or digital media group.',
    practicalExperiment: 'Design and deliver an executive learning masterclass or authored white paper, monitoring adoption metrics.',
    sectorName: 'Education, Media & Knowledge Systems',
    opportunities: 'Curriculum direction, specialized executive coaching, industry publications, and institutional education.',
    hazards: 'Shifting media platform algorithms and commercial pressure on educational standards.',
    strategicGuidance: 'Develop proprietary intellectual property and establish direct distribution relationships.',
  },
  CREATIVE_DESIGN: {
    key: 'CREATIVE_DESIGN',
    title: 'Creative Direction, Visual Design & Aesthetic Brand Architecture',
    category: 'Creative Arts & Design',
    primarySignificators: ['VENUS', 'MOON'],
    supportingSignificators: ['MERCURY', 'RAHU'],
    primaryHouses: [5, 3, 7, 10],
    favorableSigns: ['Taurus', 'Libra', 'Pisces', 'Cancer', 'Leo'],
    relevantVargas: 'D1, D10, D16',
    traditionalBasis: 'Classical authorities (BPHS Ch. 42 / Brihat Jataka Ch. 10 / Saravali Ch. 22) explicitly link Venus to poetry, drama, decorative ornamentation, luxury, and fine craftsmanship (Kavya/Kala/Shilpa), while the Moon governs imaginative sensibility and sensory resonance.',
    modernMapping: 'Modern occupational extrapolation: Digital UI/UX design, visual brand architecture, multimedia arts, digital animation, creative agency direction, and spatial/interior design.',
    knownLimitations: 'Classical texts referred to court artisans, poets, and sculptors. Digital interface engineering, user-experience (UI/UX) wireframing, and commercial media branding are modern technical extrapolations.',
    requiredStrengths: 'Aesthetic discernment, creative storytelling, sensory nuance, and user-centric brand conception.',
    potentialChallenges: 'Subjective stakeholder critiques, commercial constraints on artistic expression, and creative burnout.',
    optimalEnvironment: 'Design consultancy, digital media agency, brand atelier, architecture studio, or creative production house.',
    practicalExperiment: 'Create a comprehensive brand visual identity or digital UX framework for a flagship enterprise initiative.',
    sectorName: 'Creative Arts, Digital Design & Media Production',
    opportunities: 'Chief design officer roles, creative brand direction, digital product design, and architectural aesthetics.',
    hazards: 'Client subjectivity, scope creep, and irregular creative delivery cycles.',
    strategicGuidance: 'Ground creative proposals in functional utility and measurable user engagement metrics.',
  },
  PUBLIC_SERVICE: {
    key: 'PUBLIC_SERVICE',
    title: 'Civil Governance, Public Policy & Institutional Administration',
    category: 'Public Service & Governance',
    primarySignificators: ['SUN', 'SATURN'],
    supportingSignificators: ['MOON', 'JUPITER', 'MARS'],
    primaryHouses: [6, 10, 9, 1],
    favorableSigns: ['Leo', 'Capricorn', 'Aquarius', 'Sagittarius', 'Libra'],
    relevantVargas: 'D1, D9, D10',
    traditionalBasis: 'Classical Parashari texts (BPHS Ch. 11, 18 & 42) associate the Sun with state bureaucracy and royal service (Raja-seva), while Saturn governs the populace (Praja), civil duty, and institutional labor (Seva). The 6th house classically governs public duty and service.',
    modernMapping: 'Modern occupational extrapolation: Civil service bureaucracy, diplomatic missions, regulatory commissions, judicial administration, and multilateral civic institutions.',
    knownLimitations: 'Classical models assumed dynastic rulership and state tax collectors. Modern constitutional public governance, competitive civil service exams, and regulatory agencies are modern institutional adaptations.',
    requiredStrengths: 'Administrative integrity, regulatory compliance, public interest advocacy, and institutional stewardship.',
    potentialChallenges: 'Navigating bureaucratic inertia, slow legislative timelines, and conflicting public interests.',
    optimalEnvironment: 'Public sector agency, multilateral development institution, regulatory commission, or public healthcare system.',
    practicalExperiment: 'Conduct a compliance review and administrative workflow audit to identify operational streamlining opportunities.',
    sectorName: 'Public Administration & Civil Institutions',
    opportunities: 'Public policy leadership, regulatory oversight, international development administration, and civic institutions.',
    hazards: 'Bureaucratic friction and vulnerability to political leadership changes.',
    strategicGuidance: 'Cultivate strong institutional memory and build broad cross-departmental administrative consensus.',
  },
  FINANCE_ANALYTICS: {
    key: 'FINANCE_ANALYTICS',
    title: 'Quantitative Finance, Treasury Strategy & Risk Architecture',
    category: 'Finance & Risk Management',
    primarySignificators: ['MERCURY', 'JUPITER'],
    supportingSignificators: ['VENUS', 'SATURN', 'MOON'],
    primaryHouses: [2, 11, 5, 8, 10],
    favorableSigns: ['Taurus', 'Virgo', 'Gemini', 'Capricorn', 'Sagittarius'],
    relevantVargas: 'D1, D2, D10',
    traditionalBasis: 'Classical Parashari principles (BPHS Ch. 11, 18 & 42 / Jaimini Sutras 1.2) define Jupiter as Dhana-karaka (significator of treasury, wealth, and banking) and Mercury as ruler of accounting, ledgers, and arithmetic commerce (Ganita/Lekha), supported by the 2nd (treasury) and 11th (gains) houses.',
    modernMapping: 'Modern occupational extrapolation: Quantitative finance, investment banking, derivatives risk architecture, corporate treasury, and actuarial analysis.',
    knownLimitations: 'Classical finance dealt with agricultural commodities, coinage, and merchant lending. High-frequency algorithmic trading, quantitative derivatives modeling, and fintech risk architecture are modern mathematical extrapolations.',
    requiredStrengths: 'Financial modeling, capital risk governance, quantitative arithmetic precision, and commercial prudence.',
    potentialChallenges: 'Managing market cycle volatility stress, strict regulatory audit exposure, and model over-fitting risks.',
    optimalEnvironment: 'Investment bank, corporate treasury group, private equity/venture fund, or fintech risk management.',
    practicalExperiment: 'Build an automated multi-scenario cash flow sensitivity and capital allocation model for executive review.',
    sectorName: 'Financial Services & Investment Operations',
    opportunities: 'Portfolio risk management, corporate treasury, quantitative financial advisory, and wealth capital governance.',
    hazards: 'Strict regulatory overhead, market shocks, and rigorous compliance scrutiny.',
    strategicGuidance: 'Prioritize risk-hedging frameworks and maintain rigorous compliance audit trails.',
  },
};

export interface ScoredArchetype {
  archetype: VocationalArchetypeDefinition;
  totalScore: number;
  breakdown: {
    tenthLordScore: number;
    tenthOccupantsScore: number;
    tenthAspectsScore: number;
    amkScore: number;
    d10Score: number;
    shadbalaScore: number;
    savScore: number;
    dashaScore: number;
  };
  evidenceSummary: string;
}

export interface VocationalSynthesisInput {
  chart: NormalizedChart;
  d10Placements?: Array<{ planet: string; sign: string; house: number; isRetrograde?: boolean }>;
  d10AscendantSign?: string;
  d10TenthHouseSign?: string;
  d10TenthHouseLord?: string;
  amatyakarakaPlanet?: string;
  atmakarakaPlanet?: string;
  shadbalaSummary?: Array<{ planet: string; totalRupas: number; ratio: number; rank: number }>;
  savBindus?: Record<number, number>;
  currentMahadasha?: string;
  currentAntardasha?: string;
}

export interface VocationalSynthesisResult {
  rankedArchetypes: ScoredArchetype[];
  primaryArchetype: ScoredArchetype;
  secondaryArchetype: ScoredArchetype;
  tertiaryArchetype: ScoredArchetype;
  cautionArchetypes: ScoredArchetype[];
  careerDirections: Array<{
    rank: number;
    title: string;
    category: string;
    whySupported: string;
    astrologicalEvidence: string;
    relevantHouses: string;
    relevantPlanets: string;
    relevantVargas: string;
    requiredStrengths: string;
    potentialChallenges: string;
    optimalEnvironment: string;
    practicalExperiment: string;
  }>;
  cautionCareerDirections: Array<{
    title: string;
    reason: string;
    evidence: string;
    risk: string;
  }>;
  sectorComparisons: Array<{
    sectorName: string;
    fitLevel: RelativeFitLevel;
    astrologicalBasis: string;
    opportunities: string;
    hazards: string;
    strategicGuidance: string;
  }>;
  employmentVsEntrepreneurship: {
    employmentSupport: string;
    employmentStrengths: string;
    employmentRisks: string;
    employmentEnvironment: string;
    entrepreneurshipSupport: string;
    entrepreneurshipStrengths: string;
    entrepreneurshipRisks: string;
    entrepreneurshipModel: string;
    synthesisConclusion: string;
  };
  strengthMatrixDimensions: Array<{
    dimension: string;
    scoreLabel: string;
    indicatorLevel: 'HIGH' | 'MODERATE' | 'DEVELOPING';
    astrologicalEvidence: string;
    professionalManifestation: string;
  }>;
  challengeMatrixDimensions: Array<{
    challenge: string;
    astrologicalBasis: string;
    manifestation: string;
    mitigation: string;
  }>;
  careerObstacles: Array<{
    obstacle: string;
    evidence: string;
    manifestation: string;
    mitigation: string;
    practicalResponse: string;
  }>;
  roadmaps: {
    roadmapThirtyDay: {
      focus: string;
      skills: string;
      immediateActions: string;
      experiments: string;
      risks: string;
      metrics: string;
    };
    roadmapNinetyDay: {
      focus: string;
      skills: string;
      immediateActions: string;
      experiments: string;
      risks: string;
      metrics: string;
    };
    roadmapOneYear: {
      focus: string;
      skills: string;
      immediateActions: string;
      experiments: string;
      risks: string;
      metrics: string;
    };
    roadmapThreeYear: {
      focus: string;
      skills: string;
      immediateActions: string;
      experiments: string;
      risks: string;
      metrics: string;
    };
  };
}

export type RelativeFitLevel =
  | 'Strong relative heuristic fit'
  | 'Moderate relative heuristic fit'
  | 'Limited relative heuristic fit'
  | 'Insufficient evidence';

/**
 * Maps a numerical provisional heuristic score into a relative fit presentation label.
 * These labels express relative chart alignment based on provisional heuristic thresholds.
 * They do NOT represent probabilities, confidence levels, calibrated scores, or measures of predictive accuracy.
 */
export function getRelativeFitLevel(score: number): RelativeFitLevel {
  if (score >= 70) return 'Strong relative heuristic fit';
  if (score >= 45) return 'Moderate relative heuristic fit';
  if (score >= 25) return 'Limited relative heuristic fit';
  return 'Insufficient evidence';
}

export class VocationalSynthesisEngine {
  /**
   * Deterministically evaluates chart data against the 8 vocational archetypes
   * using auditable astrological evidence rules and modern heuristic scoring.
   */
  public synthesize(input: VocationalSynthesisInput): VocationalSynthesisResult {
    const { chart } = input;
    const h10 = chart.houses.find((h) => h.number === 10) || chart.houses[9];
    const h10Sign = h10?.sign || 'Capricorn';
    const h10Lord = (h10?.lord || 'Saturn').toUpperCase();

    // Find 10th lord placement in D1
    const tenthLordPlanet = chart.planets.find((p) => p.name.toUpperCase() === h10Lord);
    const tenthLordHouse = tenthLordPlanet?.house || 10;
    const tenthLordSign = tenthLordPlanet?.sign || h10Sign;
    const tenthLordDignity = tenthLordPlanet?.dignity || 'NEUTRAL';

    // 10th house occupants:
    // IMPORTANT: Exclude the 10th lord itself from the occupants list to prevent double counting.
    // The 10th lord's presence in the 10th house is already captured by tenthLordDignity (OWN_SIGN/MOOLATRIKONA).
    const rawOccupants = (h10?.occupants || chart.planets.filter((p) => p.house === 10).map((p) => p.name)).map(
      (p) => p.toUpperCase()
    );
    const distinctOccupants = rawOccupants.filter((occ) => occ !== h10Lord);

    // 10th house aspects:
    // Filter out planets that are already occupying the 10th house or are the 10th lord itself,
    // ensuring aspect evidence is distinct from placement evidence.
    const h10Aspects: string[] = [];
    for (const p of chart.planets) {
      if (typeof p.house === 'number') {
        const pName = p.name.toUpperCase();
        if (pName !== h10Lord && !rawOccupants.includes(pName)) {
          const aspected = getAspectedHouses(p.name as PlanetSymbol, p.house);
          if (aspected.some((a) => a.house === 10)) {
            h10Aspects.push(pName);
          }
        }
      }
    }

    // AmK & AK from Jaimini (graceful fallback if missing)
    const amk = (input.amatyakarakaPlanet || '').toUpperCase();
    const ak = (input.atmakarakaPlanet || '').toUpperCase();

    // D10 Dashamsha factors (graceful fallback if missing)
    const d10H10Lord = (input.d10TenthHouseLord || '').toUpperCase();
    const d10H10Occupants = (input.d10Placements || [])
      .filter((p) => p.house === 10)
      .map((p) => p.planet.toUpperCase());

    // Top Shadbala planets (graceful fallback if missing)
    const topShadbalaPlanets = (input.shadbalaSummary || [])
      .slice(0, 3)
      .map((s) => s.planet.toUpperCase());

    // Sarvashtakavarga (SAV) bindus:
    // Classical benchmark is strictly > 28 bindus (mean across 12 signs = 337 / 12 = 28.0833).
    // Missing SAV data is represented explicitly as null (unavailable).
    // Missing SAV contributes neither positive nor negative points (0 points),
    // and is never presented downstream as a measured value.
    const sav = input.savBindus;
    const sav10: number | null = sav && typeof sav[10] === 'number' ? sav[10] : null;
    const sav11: number | null = sav && typeof sav[11] === 'number' ? sav[11] : null;
    const sav2: number | null = sav && typeof sav[2] === 'number' ? sav[2] : null;
    const sav6: number | null = sav && typeof sav[6] === 'number' ? sav[6] : null;
    const sav3: number | null = sav && typeof sav[3] === 'number' ? sav[3] : null;

    // Vimshottari Dasha (graceful fallback if missing)
    const activeMaha = (input.currentMahadasha || '').toUpperCase();
    const activeAntar = (input.currentAntardasha || '').toUpperCase();

    const W = PROVISIONAL_HEURISTIC_WEIGHTS;

    // Score all 8 archetypes
    const scoredArchetypes: ScoredArchetype[] = Object.values(VOCATIONAL_ARCHETYPES).map(
      (archetype) => {
        let tenthLordScore = 0;
        let tenthOccupantsScore = 0;
        let tenthAspectsScore = 0;
        let amkScore = 0;
        let d10Score = 0;
        let shadbalaScore = 0;
        let savScore = 0;
        let dashaScore = 0;
        const evidencePieces: string[] = [`10th House in ${h10Sign}`];

        // 1. D1 10th Lord Alignment (Classical BPHS Ch. 42)
        if (archetype.primarySignificators.includes(h10Lord)) {
          tenthLordScore += W.TENTH_LORD_PRIMARY;
          evidencePieces.push(`10th Lord ${h10Lord} is primary significator for ${archetype.category}`);
        } else if (archetype.supportingSignificators.includes(h10Lord)) {
          tenthLordScore += W.TENTH_LORD_SUPPORTING;
          evidencePieces.push(`10th Lord ${h10Lord} supports ${archetype.category}`);
        }

        // Dignity modifier for 10th lord (Uchcha / Sva-kshetra vs Neecha)
        if (tenthLordDignity === 'EXALTED' || tenthLordDignity === 'OWN_SIGN' || tenthLordDignity === 'MOOLATRIKONA') {
          if (archetype.primarySignificators.includes(h10Lord) || archetype.supportingSignificators.includes(h10Lord)) {
            tenthLordScore += W.TENTH_LORD_DIGNITY_BONUS;
            evidencePieces.push(`10th Lord in strong dignity (${tenthLordDignity}) in House ${tenthLordHouse}`);
          }
        } else if (tenthLordDignity === 'DEBILITATED') {
          if (archetype.primarySignificators.includes(h10Lord)) {
            tenthLordScore += W.TENTH_LORD_DEBILITATED_PENALTY;
            evidencePieces.push(`10th Lord debilitated in ${tenthLordSign}`);
          }
        }

        // 10th House Sign favorable
        if (archetype.favorableSigns.map((s) => s.toLowerCase()).includes(h10Sign.toLowerCase())) {
          tenthLordScore += W.TENTH_HOUSE_FAVORABLE_SIGN;
        }

        // 2. D1 10th House Occupants (distinct from 10th lord)
        for (const occ of distinctOccupants) {
          if (archetype.primarySignificators.includes(occ)) {
            tenthOccupantsScore += W.TENTH_HOUSE_OCCUPANT_PRIMARY;
            evidencePieces.push(`${occ} occupies 10th House directly`);
          } else if (archetype.supportingSignificators.includes(occ)) {
            tenthOccupantsScore += W.TENTH_HOUSE_OCCUPANT_SUPPORTING;
            evidencePieces.push(`${occ} occupies 10th House as supporting significator`);
          }
        }

        // 3. D1 10th House Aspects (distinct from occupants & 10th lord)
        for (const asp of h10Aspects) {
          if (archetype.primarySignificators.includes(asp)) {
            tenthAspectsScore += W.TENTH_HOUSE_ASPECT_PRIMARY;
            evidencePieces.push(`${asp} casts aspect on 10th House`);
          }
        }

        // 4. Jaimini Amatyakaraka (AmK)
        if (amk && archetype.primarySignificators.includes(amk)) {
          amkScore += W.AMATYAKARAKA_PRIMARY;
          evidencePieces.push(`Jaimini Amatyakaraka (AmK) is ${amk}`);
        } else if (amk && archetype.supportingSignificators.includes(amk)) {
          amkScore += W.AMATYAKARAKA_SUPPORTING;
          evidencePieces.push(`Jaimini AmK ${amk} supports archetype`);
        }

        // 5. D10 Dashamsha Alignment (only if D10 data is present)
        if (d10H10Lord && archetype.primarySignificators.includes(d10H10Lord)) {
          d10Score += W.D10_TENTH_LORD;
          evidencePieces.push(`D10 10th Lord ${d10H10Lord} reinforces archetype`);
        }
        for (const occ of d10H10Occupants) {
          if (archetype.primarySignificators.includes(occ)) {
            d10Score += W.D10_TENTH_OCCUPANT;
            evidencePieces.push(`${occ} occupies 10th House in D10`);
          }
        }

        // 6. Shadbala Ranking (provisional weighting to avoid overpowering dignity)
        if (topShadbalaPlanets[0] && archetype.primarySignificators.includes(topShadbalaPlanets[0])) {
          shadbalaScore += W.SHADBALA_RANK_1;
          evidencePieces.push(`Rank 1 planet in Shadbala is ${topShadbalaPlanets[0]}`);
        } else if (topShadbalaPlanets[1] && archetype.primarySignificators.includes(topShadbalaPlanets[1])) {
          shadbalaScore += W.SHADBALA_RANK_2;
        } else if (topShadbalaPlanets[2] && archetype.primarySignificators.includes(topShadbalaPlanets[2])) {
          shadbalaScore += W.SHADBALA_RANK_3;
        }

        // 7. Ashtakavarga SAV Bindus in Relevant Houses (Classical mean: 337 / 12 = 28.0833)
        // Strictly > 28 bindus receives the above-average heuristic bonus.
        // Actual SAV = 28 receives 0 bonus points (neutral equilibrium benchmark).
        // Missing SAV (null) receives 0 points (neither positive nor negative) and records no measured bindus.
        if (archetype.key === 'FINANCE_ANALYTICS') {
          if (sav2 !== null && sav2 > 28) { savScore += W.SAV_BENCHMARK_ABOVE; evidencePieces.push(`2nd House SAV ${sav2} > 28 benchmark`); }
          if (sav11 !== null && sav11 > 28) { savScore += W.SAV_BENCHMARK_SECONDARY; evidencePieces.push(`11th House SAV ${sav11} > 28 benchmark`); }
        } else if (archetype.key === 'BUSINESS_ENTREPRENEURSHIP') {
          if (sav3 !== null && sav3 > 28) { savScore += W.SAV_BENCHMARK_ABOVE; evidencePieces.push(`3rd House SAV ${sav3} > 28 benchmark`); }
          if (sav11 !== null && sav11 > 28) { savScore += W.SAV_BENCHMARK_SECONDARY; evidencePieces.push(`11th House SAV ${sav11} > 28 benchmark`); }
        } else if (archetype.key === 'PUBLIC_SERVICE') {
          if (sav6 !== null && sav6 > 28) { savScore += W.SAV_BENCHMARK_ABOVE; evidencePieces.push(`6th House SAV ${sav6} > 28 benchmark`); }
          if (sav10 !== null && sav10 > 28) { savScore += W.SAV_BENCHMARK_SECONDARY; }
        } else if (archetype.key === 'MANAGEMENT_LEADERSHIP') {
          if (sav10 !== null && sav10 > 28) { savScore += W.SAV_BENCHMARK_ABOVE; evidencePieces.push(`10th House SAV ${sav10} > 28 benchmark`); }
          if (sav11 !== null && sav11 > 28) { savScore += W.SAV_BENCHMARK_SECONDARY; }
        } else {
          if (sav10 !== null && sav10 > 28) { savScore += 5; }
        }

        // 8. Dasha Period Context (strictly temporal modifier; subordinate to natal potential)
        if (activeMaha && archetype.primarySignificators.includes(activeMaha)) {
          dashaScore += W.DASHA_MAHADASHA;
          evidencePieces.push(`Active Mahadasha Lord is ${activeMaha}`);
        }
        if (activeAntar && archetype.primarySignificators.includes(activeAntar)) {
          dashaScore += W.DASHA_ANTARDASHA;
        }

        const totalScore =
          tenthLordScore +
          tenthOccupantsScore +
          tenthAspectsScore +
          amkScore +
          d10Score +
          shadbalaScore +
          savScore +
          dashaScore;

        const evidenceSummary =
          evidencePieces.length > 0
            ? evidencePieces.join('; ')
            : `General chart affinity with 10th house in ${h10Sign}.`;

        return {
          archetype,
          totalScore,
          breakdown: {
            tenthLordScore,
            tenthOccupantsScore,
            tenthAspectsScore,
            amkScore,
            d10Score,
            shadbalaScore,
            savScore,
            dashaScore,
          },
          evidenceSummary,
        };
      }
    );

    // Deterministic Sort with Strict Tie-Breaking Hierarchy:
    // 1. Total score descending
    // 2. D1 10th Lord alignment
    // 3. Jaimini Amatyakaraka (AmK) alignment
    // 4. Alphabetical key order (guarantees 100% determinism)
    scoredArchetypes.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      const aLord = a.archetype.primarySignificators.includes(h10Lord)
        ? 2
        : a.archetype.supportingSignificators.includes(h10Lord)
        ? 1
        : 0;
      const bLord = b.archetype.primarySignificators.includes(h10Lord)
        ? 2
        : b.archetype.supportingSignificators.includes(h10Lord)
        ? 1
        : 0;
      if (bLord !== aLord) return bLord - aLord;

      const aAmk = amk && a.archetype.primarySignificators.includes(amk)
        ? 2
        : amk && a.archetype.supportingSignificators.includes(amk)
        ? 1
        : 0;
      const bAmk = amk && b.archetype.primarySignificators.includes(amk)
        ? 2
        : amk && b.archetype.supportingSignificators.includes(amk)
        ? 1
        : 0;
      if (bAmk !== aAmk) return bAmk - aAmk;

      return a.archetype.key.localeCompare(b.archetype.key);
    });

    const primaryArchetype = scoredArchetypes[0];
    const secondaryArchetype = scoredArchetypes[1];
    const tertiaryArchetype = scoredArchetypes[2];
    const cautionArchetypes = scoredArchetypes.slice(-2);

    // Build Career Directions:
    // Only archetypes meeting the provisional positive heuristic threshold (totalScore >= 25,
    // i.e., exceeding 'Insufficient evidence') qualify for career direction recommendations.
    // Do NOT artificially force three recommendations when evidence does not justify them.
    const qualifyingArchetypes = scoredArchetypes.filter((sa) => sa.totalScore >= 25);
    const careerDirections = qualifyingArchetypes.slice(0, 3).map(
      (sa, idx) => {
        const arch = sa.archetype;
        const rank = idx + 1;
        const whySupported =
          rank === 1
            ? `Primary alignment with 10th House (${h10Sign}), 10th Lord ${h10Lord}, and key planetary significators (${arch.primarySignificators.join(', ')}).`
            : rank === 2
            ? `Adjacent vocational domain backed by supporting dignities and complementary significators.`
            : `Supporting specialization providing functional breadth and strategic flexibility.`;

        const astrologicalEvidence = `${sa.evidenceSummary} (Provisional synthesis score: ${sa.totalScore} pts).`;

        return {
          rank,
          title: arch.title,
          category: arch.category,
          whySupported,
          astrologicalEvidence,
          relevantHouses: arch.primaryHouses.map((h) => `${h}th`).join(', '),
          relevantPlanets: [...arch.primarySignificators, ...arch.supportingSignificators.slice(0, 1)].join(', '),
          relevantVargas: arch.relevantVargas,
          requiredStrengths: arch.requiredStrengths,
          potentialChallenges: arch.potentialChallenges,
          optimalEnvironment: arch.optimalEnvironment,
          practicalExperiment: arch.practicalExperiment,
        };
      }
    );

    // Build Caution Career Directions (dynamically chosen from bottom archetypes)
    const cautionCareerDirections = cautionArchetypes.map((sa) => {
      const arch = sa.archetype;
      return {
        title: `${arch.title} without Structural Safeguards`,
        reason: `Subordinate score (${sa.totalScore} pts) indicating lack of natural planetary anchors for this domain in the natal configuration.`,
        evidence: `Primary significators (${arch.primarySignificators.join(', ')}) lack strong 10th house or Amatyakaraka linkages in this birth chart.`,
        risk: 'Higher friction, prolonged execution drag, and potential misalignment with intrinsic motivations.',
      };
    });

    // Build Sector Comparisons (4 representative sectors)
    // Fit levels are evaluated against provisional heuristic score thresholds, not assumed automatically.
    const sectorComparisons = [
      {
        sectorName: primaryArchetype.archetype.sectorName,
        fitLevel: getRelativeFitLevel(primaryArchetype.totalScore),
        astrologicalBasis: `10th Lord ${h10Lord} in ${tenthLordSign} (House ${tenthLordHouse}) with ${primaryArchetype.totalScore} synthesis pts. Relative heuristic affinity; not a statistical probability or outcome guarantee.`,
        opportunities: primaryArchetype.archetype.opportunities,
        hazards: primaryArchetype.archetype.hazards,
        strategicGuidance: primaryArchetype.archetype.strategicGuidance,
      },
      {
        sectorName: secondaryArchetype.archetype.sectorName,
        fitLevel: getRelativeFitLevel(secondaryArchetype.totalScore),
        astrologicalBasis: `Secondary synthesis strength (${secondaryArchetype.totalScore} pts) reinforced by supporting significators. Relative heuristic affinity.`,
        opportunities: secondaryArchetype.archetype.opportunities,
        hazards: secondaryArchetype.archetype.hazards,
        strategicGuidance: secondaryArchetype.archetype.strategicGuidance,
      },
      {
        sectorName: tertiaryArchetype.archetype.sectorName,
        fitLevel: getRelativeFitLevel(tertiaryArchetype.totalScore),
        astrologicalBasis: `Supporting alignment (${tertiaryArchetype.totalScore} pts) with tertiary significators. Relative heuristic affinity.`,
        opportunities: tertiaryArchetype.archetype.opportunities,
        hazards: tertiaryArchetype.archetype.hazards,
        strategicGuidance: tertiaryArchetype.archetype.strategicGuidance,
      },
      {
        sectorName: cautionArchetypes[0].archetype.sectorName,
        fitLevel: getRelativeFitLevel(cautionArchetypes[0].totalScore),
        astrologicalBasis: `Minimal planetary anchor in vocational axis (${cautionArchetypes[0].totalScore} pts). Heuristic indication of limited structural alignment.`,
        opportunities: cautionArchetypes[0].archetype.opportunities,
        hazards: cautionArchetypes[0].archetype.hazards,
        strategicGuidance: 'Approach this sector only in collaboration with complementary domain specialists.',
      },
    ];

    // Dynamic Employment vs Entrepreneurship
    const serviceScore = (sav6 !== null ? (sav6 > 28 ? 15 : 5) : 8) + (h10Lord === 'SATURN' || h10Lord === 'SUN' ? 15 : 8);
    const enterpriseScore = (sav3 !== null ? (sav3 > 28 ? 12 : 5) : 7) + (sav11 !== null ? (sav11 > 28 ? 12 : 5) : 7) + (h10Lord === 'MARS' || h10Lord === 'MERCURY' ? 15 : 8);

    const isEnterpriseFavored = enterpriseScore > serviceScore + 5;
    const isServiceFavored = serviceScore > enterpriseScore + 5;

    const employmentSupport = isServiceFavored
      ? `Strongly supported. High organizational stamina and 6th/10th house governance favor executive leadership in structured institutional or enterprise environments.`
      : `Moderately supported. Effective as a platform for building executive credibility and domain mastery prior to autonomous ventures.`;

    const employmentStrengths =
      `Institutional scale, access to enterprise capital, defined organizational mandate, and predictable advancement architecture.`;

    const employmentRisks =
      `Bureaucratic friction, slow consensus cycles, and constraints on individual strategic autonomy.`;

    const employmentEnvironment =
      `Tier-1 Enterprise, Corporate Headquarters, Global Consultancies, or Public Governance Institutions.`;

    const entrepreneurshipSupport = isEnterpriseFavored
      ? `Strongly supported. Dynamic 3rd/11th house axis and commercial acumen favor autonomous enterprise founding or specialized boutique practice.`
      : `Conditionally viable. Optimal when structured as specialized advisory, professional partnership, or equity-backed spin-off after achieving senior executive stature.`;

    const entrepreneurshipStrengths =
      `Direct monetization of domain mastery, complete strategic autonomy, and uncapped enterprise equity upside.`;

    const entrepreneurshipRisks =
      `Early cash flow volatility, client pipeline acquisition burden, and operational overhead.`;

    const entrepreneurshipModel =
      `B2B Strategic Advisory, Specialized Domain Consultancy, or Technology/Product Enterprise.`;

    const synthesisConclusion = isEnterpriseFavored
      ? `Chart favors progressive transition toward independent enterprise ownership or equity-backed venture leadership, leveraging early corporate experience as commercial capital.`
      : isServiceFavored
      ? `Chart favors long-term executive stewardship within major enterprise institutions, where organizational scale amplifies the native’s strategic impact.`
      : `Balanced architecture: corporate executive leadership in earlier career phases, followed by selective advisory, board appointments, or boutique venture participation.`;

    const employmentVsEntrepreneurship = {
      employmentSupport,
      employmentStrengths,
      employmentRisks,
      employmentEnvironment,
      entrepreneurshipSupport,
      entrepreneurshipStrengths,
      entrepreneurshipRisks,
      entrepreneurshipModel,
      synthesisConclusion,
    };

    // Dynamic Strength Matrix Dimensions
    const strengthMatrixDimensions = [
      {
        dimension: 'Strategic Leadership & Executive Mandate',
        scoreLabel: primaryArchetype.totalScore >= 70 ? 'Very High' : 'High',
        indicatorLevel: primaryArchetype.totalScore >= 70 ? ('HIGH' as const) : ('MODERATE' as const),
        astrologicalEvidence: `10th House in ${h10Sign} governed by ${h10Lord} placed in House ${tenthLordHouse}.`,
        professionalManifestation: 'Decisive mandate establishment, organizational vision, and strategic accountability.',
      },
      {
        dimension: 'Technical & Analytical Systems Modeling',
        scoreLabel: topShadbalaPlanets.includes('MERCURY') || h10Lord === 'MERCURY' || h10Lord === 'MARS' ? 'Very High' : 'High',
        indicatorLevel: 'HIGH' as const,
        astrologicalEvidence: `Mercury and Mars configurations in intellectual and operational sectors.`,
        professionalManifestation: 'Mastery over complex systems, analytical decomposition, and structured execution.',
      },
      {
        dimension: 'Operational Discipline & Delivery Stamina',
        scoreLabel: sav6 !== null && sav6 > 28 ? 'Very High' : 'Moderate to High',
        indicatorLevel: sav6 !== null && sav6 > 28 ? ('HIGH' as const) : ('MODERATE' as const),
        astrologicalEvidence: sav6 !== null
          ? `6th House with ${sav6} SAV bindus (Benchmark: 28) and Saturn governance indicators.`
          : `6th House operational indicators and Saturn governance factors (Sarvashtakavarga bindus unavailable).`,
        professionalManifestation: 'Reliable execution, meticulous attention to standards, and persistence under delivery pressure.',
      },
      {
        dimension: 'Commercial Acumen & Revenue Optimization',
        scoreLabel: sav11 !== null && sav11 > 28 ? 'High' : 'Moderate',
        indicatorLevel: sav11 !== null && sav11 > 28 ? ('HIGH' as const) : ('MODERATE' as const),
        astrologicalEvidence: sav11 !== null
          ? `11th House of gains supported by ${sav11} SAV bindus (Benchmark: 28).`
          : `11th House indicators and revenue governance factors (Sarvashtakavarga bindus unavailable).`,
        professionalManifestation: 'Sound revenue structuring, resource allocation, and value-focused negotiation.',
      },
      {
        dimension: 'Stakeholder Diplomacy & Governance',
        scoreLabel: 'Moderate to High',
        indicatorLevel: 'MODERATE' as const,
        astrologicalEvidence: `7th house alignments and Jaimini Darakaraka indicators.`,
        professionalManifestation: 'Effective cross-functional negotiation and productive institutional alignment.',
      },
      {
        dimension: 'Research Depth & Strategic Foresight',
        scoreLabel: 'High',
        indicatorLevel: 'HIGH' as const,
        astrologicalEvidence: `8th/9th house axis and nodal configurations governing investigation.`,
        professionalManifestation: 'Anticipation of industry shifts and methodical root-cause problem solving.',
      },
    ];

    // Dynamic Challenge Matrix Dimensions
    const challengeMatrixDimensions = [
      {
        challenge: 'Delegation vs Quality Control Bottlenecks',
        astrologicalBasis: `High perfectionism markers associated with ${h10Lord} in House ${tenthLordHouse}.`,
        manifestation: 'Reluctance to delegate critical technical or strategic deliverables to junior colleagues.',
        mitigation: 'Implement objective QA frameworks and structured weekly milestone review gates.',
      },
      {
        challenge: 'Managing Complex Institutional Inertia',
        astrologicalBasis: `Direct execution style clashing with slow matrix-organization consensus cycles.`,
        manifestation: 'Impatience with prolonged committee reviews or ambiguous corporate governance.',
        mitigation: 'Cultivate senior executive sponsors and anchor proposals on verifiable data models.',
      },
      {
        challenge: 'Sustainable Work-Life Boundaries',
        astrologicalBasis: `Intensive 10th and 6th house engagement creating extended operational immersion.`,
        manifestation: 'Neglecting physical restoration during multi-quarter delivery sprints.',
        mitigation: 'Establish non-negotiable personal wellness intervals and protect focused offline time.',
      },
    ];

    // Dynamic Career Obstacles
    const careerObstacles = [
      {
        obstacle: 'Organizational Bureaucracy & Decision Latency',
        evidence: `Direct Martian/Mercurial execution drive encountering institutional governance delays.`,
        manifestation: 'Friction when navigating multi-layered approval chains in large enterprises.',
        mitigation: 'Build early cross-departmental alignment and present concise, data-backed business cases.',
        practicalResponse: 'Establish clear decision gates with pre-agreed escalation protocols.',
      },
      {
        obstacle: 'Execution Bottlenecks Caused by Over-Engineering',
        evidence: `Analytical scrutiny in vocational sectors prompting excessive iteration before delivery.`,
        manifestation: 'Postponing deployment to achieve absolute theoretical perfection.',
        mitigation: 'Adopt phased release milestones with defined acceptable threshold criteria.',
        practicalResponse: 'Focus on 80/20 delivery velocity with planned post-launch optimization sprints.',
      },
    ];

    // Dynamic Roadmaps (30-day, 90-day, 1-year, 3-year)
    // Strictly qualified, realistic milestones without guaranteed prediction tropes or arbitrary percentages (Principle 1 & 2)
    const roadmaps = {
      roadmapThirtyDay: {
        focus: `Audit Core Commitments & Align Priorities with ${primaryArchetype.archetype.category}`,
        skills: `Executive prioritization, systems architecture audit, and stakeholder communication.`,
        immediateActions: `Review active initiatives; eliminate low-leverage tasks to protect dedicated deep-work blocks.`,
        experiments: `Implement a 2-hour daily uninterrupted focus block for core strategic deliverables.`,
        risks: `Allowing ad-hoc urgent requests to displace strategic focus.`,
        metrics: `Execution of self-directed operational audit and establishment of dedicated deep-work focus intervals.`,
      },
      roadmapNinetyDay: {
        focus: `Execute Flagship Project & Deepen Stakeholder Sponsorship in ${primaryArchetype.archetype.sectorName}`,
        skills: `Cross-functional leadership, quantitative business modeling, and strategic presentation.`,
        immediateActions: `Deliver a measurable milestone on primary strategic initiative and present results to leadership.`,
        experiments: `Establish regular quarterly alignment reviews with key executive sponsors.`,
        risks: `Scope creep and unmanaged stakeholder expectation drift.`,
        metrics: `Milestone delivery on chosen flagship initiative with documented stakeholder feedback.`,
      },
      roadmapOneYear: {
        focus: `Consolidate Domain Authority & Formalize Strategic Scope Expansion`,
        skills: `Enterprise systems governance, executive delegation, and strategic team development.`,
        immediateActions: `Formalize broader portfolio mandate and establish high-accountability team review cadence.`,
        experiments: `Author a domain perspective or lead a cross-organizational capability-building workshop.`,
        risks: `Over-commitment to parallel initiatives without adequate organizational staffing.`,
        metrics: `Demonstrated portfolio capability expansion with verified institutional sponsor endorsement.`,
      },
      roadmapThreeYear: {
        focus: `Achieve Senior Executive Mandate or Independent Enterprise Leadership`,
        skills: `Corporate governance, capital allocation, organizational culture stewardship, and industry thought leadership.`,
        immediateActions: `Transition into senior governance appointment, board advisory, or autonomous venture founding.`,
        experiments: `Explore selective strategic advisory roles or commercial venture development.`,
        risks: `Market shifts affecting domain demand without proactive capability adaptation.`,
        metrics: `Substantive progress toward senior executive mandate, specialized practice, or enterprise autonomy.`,
      },
    };

    return {
      rankedArchetypes: scoredArchetypes,
      primaryArchetype,
      secondaryArchetype,
      tertiaryArchetype,
      cautionArchetypes,
      careerDirections,
      cautionCareerDirections,
      sectorComparisons,
      employmentVsEntrepreneurship,
      strengthMatrixDimensions,
      challengeMatrixDimensions,
      careerObstacles,
      roadmaps,
    };
  }
}
