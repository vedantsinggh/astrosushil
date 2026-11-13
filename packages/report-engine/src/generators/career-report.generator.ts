import {
  StructuredReportModel,
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
  ReportSectionDto,
  CareerReportModel,
  CareerHouseAnalysisDto,
  PlanetarySignificatorDto,
  CareerYogaDto,
  D10DashamshaAnalysisDto,
  JaiminiAmatyakarakaDto,
  BnnSaturnAnalysisDto,
  GovernmentJobAnalysisDto,
  EntrepreneurialCompassDto,
  MultiYearCareerRoadmapItemDto,
  CareerRemediesDto,
  CareerClosingNoteDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import {
  DashaCalculator,
  VargaCalculator,
  AshtakavargaCalculator,
  JaiminiCalculator,
  YogaCalculator,
  BirthDetailsValidationError,
  isValidIanaTimezone,
  AstroChart,
} from '@astro/astrology-engine';
import {
  validateVerifiedAstrologyEvidence,
  getEvidenceRequirementsForReport,
  extractVerifiedEvidenceFromChart,
  extractOrCalculateSav,
} from '../validation/report-evidence.validator';
import { verifyAiInterpretationTraceability } from '../validation/traceability.validator';
import { ReportSectionComposer } from '../composition/report-section-composer';
import {
  STANDARD_AUTHOR_MESSAGE,
  STANDARD_METHODOLOGY_NOTE,
  STANDARD_LEGAL_DISCLAIMER,
} from '../types/shared-report-foundation.types';
import {
  SIGN_INDEX_MAP,
  SIGN_NAMES_BY_INDEX,
  SIGN_LORDS,
} from './kundli-report.generator';

export const D10_ASCENDANT_TRAITS: Record<string, { traits: string[]; careerStyle: string; recommendedFields: string[] }> = {
  Aries: {
    traits: ['Pioneering initiative', 'Bold competitive drive', 'Direct decision-making', 'Executive urgency'],
    careerStyle: 'Dynamic and action-oriented; thrives when leading new ventures or turning around underperforming units.',
    recommendedFields: ['Entrepreneurship', 'Technology startups', 'Defense & Security', 'Project Leadership', 'Engineering'],
  },
  Taurus: {
    traits: ['Steadfast endurance', 'Financial acumen', 'Methodical resource allocation', 'Pragmatic stability'],
    careerStyle: 'Grounded and value-driven; excels in environments requiring sustainable capital growth and meticulous asset management.',
    recommendedFields: ['Banking & Wealth Management', 'Real Estate', 'Luxury & Fine Arts', 'Corporate Treasury', 'Hospitality'],
  },
  Gemini: {
    traits: ['Versatile communication', 'Intellectual agility', 'Commercial acumen', 'Rapid networking'],
    careerStyle: 'Fast-paced and information-rich; shines in media, marketing, negotiations, and intellectual consulting.',
    recommendedFields: ['Media & Journalism', 'Digital Marketing', 'Data Analytics', 'Trading & Brokerage', 'Public Relations'],
  },
  Cancer: {
    traits: ['Empathetic leadership', 'Intuitive market perception', 'Nurturing talent development', 'Public connection'],
    careerStyle: 'Protective and people-focused; builds high-loyalty teams and connects deeply with customer/public needs.',
    recommendedFields: ['Human Resources', 'Healthcare & Wellness', 'Public Administration', 'Education', 'Hospitality'],
  },
  Leo: {
    traits: ['Charismatic authority', 'Natural sovereignty', 'Strategic vision', 'Commanding public presence'],
    careerStyle: 'Regal and commanding; thrives at the apex of hierarchies where creative direction and executive authority reside.',
    recommendedFields: ['C-Suite Executive', 'Government Service', 'Politics & Policy', 'Entertainment & Film', 'Luxury Branding'],
  },
  Virgo: {
    traits: ['Analytical precision', 'Operational perfectionism', 'Systemic problem-solving', 'Quality governance'],
    careerStyle: 'Detail-focused and diagnostic; master of optimization, audits, complex processes, and service delivery.',
    recommendedFields: ['Management Consulting', 'Software Architecture', 'Auditing & Compliance', 'Biotechnology', 'Operations'],
  },
  Libra: {
    traits: ['Graceful diplomacy', 'Balanced negotiation', 'Refined aesthetic judgment', 'Partnership synergy'],
    careerStyle: 'Collaborative and tactful; excels in high-stakes negotiations, cross-cultural partnerships, and polished client relations.',
    recommendedFields: ['Corporate Law & Dispute Resolution', 'Diplomacy & Public Policy', 'Design & Aesthetics', 'Client Advisory', 'Partnership Management'],
  },
  Scorpio: {
    traits: ['Strategic resilience', 'Deep investigative insight', 'Crisis transformation', 'Uncompromising willpower'],
    careerStyle: 'Intense and transformative; excels under pressure, handles sensitive resources, and revitalizes distressed assets.',
    recommendedFields: ['Private Equity & Restructuring', 'Forensic Audit & Intelligence', 'Surgery & Medicine', 'Cybersecurity', 'Research'],
  },
  Sagittarius: {
    traits: ['Philosophical foresight', 'Expansive global vision', 'Ethical leadership', 'Inspirational mentorship'],
    careerStyle: 'Exploratory and visionary; flourishes in academia, cross-border operations, high-level policy, and publishing.',
    recommendedFields: ['Higher Education & Academia', 'International Trade & Law', 'Global Strategy', 'Publishing & Think Tanks', 'Spiritual/Executive Coaching'],
  },
  Capricorn: {
    traits: ['Architectural patience', 'Institutional discipline', 'Long-term stamina', 'Corporate realism'],
    careerStyle: 'Structure-building and pragmatic; ascends methodically through merit and constructs enduring institutions.',
    recommendedFields: ['Corporate Governance', 'Infrastructure & Construction', 'Heavy Manufacturing', 'Civil Administration', 'Supply Chain Management'],
  },
  Aquarius: {
    traits: ['Ecosystem vision', 'Technological innovation', 'Humanitarian objective', 'Collaborative decentralization'],
    careerStyle: 'Unconventional and futuristic; leads systemic changes, tech innovation, and social enterprise consortiums.',
    recommendedFields: ['Frontier Tech & AI', 'Social Enterprises', 'Aviation & Space', 'R&D Innovation Labs', 'Venture Capital'],
  },
  Pisces: {
    traits: ['Visionary imagination', 'Subconscious synthesis', 'Compassionate service', 'Holistic worldview'],
    careerStyle: 'Intuitive and boundless; excels where creative vision, healing, cross-border connection, and empathy converge.',
    recommendedFields: ['Creative Arts & Cinema', 'Psychology & Healing', 'International NGOs', 'Spiritual Guidance', 'Maritime/Pharmaceuticals'],
  },
};

export const AMATYAKARAKA_GUIDANCE: Record<string, {
  advisory: string;
  talents: string[];
  workEnvironments: string[];
  growthAdvice: string;
}> = {
  Sun: {
    advisory: 'Your soul signed up for leadership, authority, and public governance. You are meant to hold positions where your personal integrity and executive vision illuminate the organization.',
    talents: ['Executive leadership', 'Institutional governance', 'Strategic decision-making', 'Public representation'],
    workEnvironments: ['Government ministries', 'Corporate boardrooms', 'High-visibility institutions', 'Autonomous leadership roles'],
    growthAdvice: 'Cultivate humility alongside authority. True leadership inspires loyalty rather than commanding obedience.',
  },
  Moon: {
    advisory: 'Your career thrives when emotional intelligence, human connection, and intuitive judgment guide your professional actions. You excel where empathy meets strategic purpose.',
    talents: ['Empathetic counseling', 'Public perception sensing', 'Creative storytelling', 'Crisis de-escalation'],
    workEnvironments: ['Psychological advisory', 'Healthcare & wellness', 'Human resources & community management', 'Hospitality & culinary arts', 'Liquid assets and commodities'],
    growthAdvice: 'Maintain healthy professional boundaries so you do not absorb emotional turbulence from your colleagues or clients.',
  },
  Mars: {
    advisory: 'Your professional destiny is defined by courage, engineering mindset, decisive execution, and the ability to solve urgent operational crises.',
    talents: ['Operational execution', 'Technical problem-solving', 'Decisive crisis handling', 'Competitive drive'],
    workEnvironments: ['Engineering & industrial operations', 'Defense & protective systems', 'Real estate development', 'High-urgency tech operations'],
    growthAdvice: 'Channel fiery determination into strategic patience. Avoid interpersonal friction when colleagues move at a different pace.',
  },
  Mercury: {
    advisory: 'Your career thrives on intellect, analytical precision, commercial negotiations, and persuasive communication. You are a natural bridge between complex data and actionable commerce.',
    talents: ['Commercial negotiation', 'Financial modeling', 'Persuasive writing & speaking', 'Systemic process automation'],
    workEnvironments: ['Trading & fintech', 'Management consulting', 'Media, journalism & publishing', 'Software architecture'],
    growthAdvice: 'Guard against intellectual overthinking or dispersion across too many projects simultaneously. Focus your brilliance on deep mastery.',
  },
  Jupiter: {
    advisory: 'You are the natural career counselor, educator, mentor, and legal/ethical advisor. Your authority arises from profound wisdom and sound ethical principles.',
    talents: ['Executive mentoring', 'Ethical policy formulation', 'Financial wealth stewardship', 'Educational curriculum design'],
    workEnvironments: ['Higher education', 'Judicial & legal advisory', 'Wealth management & banking', 'Global policy think tanks'],
    growthAdvice: 'Ensure philosophical ideals are anchored in pragmatic execution. Pair your high-level wisdom with concrete milestones.',
  },
  Venus: {
    advisory: 'Your professional genius lies in aesthetic refinement, diplomatic consensus, financial luxury, and creating harmonious interpersonal partnerships.',
    talents: ['Aesthetic curation', 'Diplomatic mediation', 'Luxury branding', 'Relationship capital building'],
    workEnvironments: ['Luxury goods & design', 'Corporate law & diplomacy', 'Entertainment & hospitality', 'High-end wealth advisory'],
    growthAdvice: 'Balance your innate desire for harmony with the courage to make tough, direct decisions when conflicts arise.',
  },
  Saturn: {
    advisory: 'Your career is built on the bedrock of perseverance, organizational discipline, systems architecture, and unyielding dedication to duty (Karma).',
    talents: ['Systems architecture', 'Long-term project execution', 'Regulatory compliance', 'Operational stamina'],
    workEnvironments: ['Heavy industry & manufacturing', 'Civil administration & law', 'Supply chain & logistics', 'Public service organizations'],
    growthAdvice: 'Embrace that your greatest professional triumphs mature steadily after age 30. Your patience is your greatest competitive advantage.',
  },
  Rahu: {
    advisory: 'You are meant for groundbreaking, unconventional, technological, and cross-border frontiers. You break stale paradigms and see future trends before others.',
    talents: ['Disruptive innovation', 'Foreign market expansion', 'Cutting-edge technology adoption', 'Pattern spotting in chaotic data'],
    workEnvironments: ['Artificial intelligence & deep tech', 'Cross-border multinationals', 'Digital media & entertainment', 'Unconventional research'],
    growthAdvice: 'Ground radical innovations with rigorous testing and ethical compliance to ensure sustainable long-term legitimacy.',
  },
  Ketu: {
    advisory: 'Your career destiny involves deep specialized expertise, root-cause research, metaphysical insight, or backend systems mastery where quiet mastery trumps public glamour.',
    talents: ['Root-cause analysis', 'Specialized niche research', 'Abstract coding & mathematics', 'Intuitive diagnosis'],
    workEnvironments: ['R&D laboratories', 'Cybersecurity & cryptography', 'Spiritual & healing foundations', 'Independent consultancy'],
    growthAdvice: 'Remain engaged with collaborative stakeholders. Do not retreat into complete isolation; share your specialized insights with the wider team.',
  },
};

export interface GenerateCareerReportOptions {
  tier?: 'BASIC' | 'PRO';
}

export function validateCareerReportInput(profileInput: {
  name?: string;
  dateOfBirth?: string;
  timeOfBirth?: string;
  placeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
}): void {
  const errors: string[] = [];
  if (!profileInput) {
    throw new BirthDetailsValidationError('Profile input is required for Career Report', ['Root input is missing']);
  }
  if (!profileInput.name || typeof profileInput.name !== 'string' || profileInput.name.trim().length === 0) {
    errors.push('Full name is required');
  }
  if (!profileInput.dateOfBirth || typeof profileInput.dateOfBirth !== 'string') {
    errors.push('Date of birth (YYYY-MM-DD) is required');
  }
  if (!profileInput.timeOfBirth || typeof profileInput.timeOfBirth !== 'string') {
    errors.push('Exact time of birth (HH:mm:ss) is required');
  }
  const resolvedPlace = profileInput.placeName ?? (profileInput as any).placeOfBirth ?? (profileInput as any).birthPlace;
  if (profileInput.placeName !== undefined && (typeof profileInput.placeName !== 'string' || profileInput.placeName.trim().length === 0)) {
    errors.push('Birth place name is required');
  } else if (!resolvedPlace || typeof resolvedPlace !== 'string' || resolvedPlace.trim().length === 0) {
    errors.push('Birth place name is required');
  }
  if (
    typeof profileInput.latitude !== 'number' ||
    isNaN(profileInput.latitude) ||
    profileInput.latitude < -90 ||
    profileInput.latitude > 90
  ) {
    errors.push(`Valid latitude between -90.0 and +90.0 is required (received: ${profileInput.latitude})`);
  }
  if (
    typeof profileInput.longitude !== 'number' ||
    isNaN(profileInput.longitude) ||
    profileInput.longitude < -180 ||
    profileInput.longitude > 180
  ) {
    errors.push(`Valid longitude between -180.0 and +180.0 is required (received: ${profileInput.longitude})`);
  }
  const resolvedTz = profileInput.timezone ?? (profileInput as any).timeZone;
  if (resolvedTz !== undefined && (typeof resolvedTz !== 'string' || !isValidIanaTimezone(resolvedTz))) {
    errors.push(`Valid IANA timezone identifier is required (received: "${resolvedTz}")`);
  }

  if (errors.length > 0) {
    throw new BirthDetailsValidationError(`Career report input validation failed with ${errors.length} error(s)`, errors);
  }
}

export async function generateCareerReport(
  profileInput: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    timezone: string;
    latitude?: number;
    longitude?: number;
  },
  rawChartData: AstroChart | any,
  interpretationProvider?: ReportInterpretationProvider,
  options?: GenerateCareerReportOptions
): Promise<CareerReportModel> {
  const isPro = options?.tier === 'PRO';
  const reportType = isPro ? ReportType.CAREER_PROSITY : ReportType.CAREER;

  // 1. Validate Birth Inputs
  validateCareerReportInput(profileInput);

  // 2. Validate Chart Completeness
  validateAstrologyDataForReport(rawChartData);

  // 3. Extract and Validate Verified Astrology Evidence
  const verifiedEvidence = extractVerifiedEvidenceFromChart(
    rawChartData,
    {
      name: profileInput.name,
      dateOfBirth: profileInput.dateOfBirth,
      timeOfBirth: profileInput.timeOfBirth,
      placeName: profileInput.placeName,
      timezone: profileInput.timezone,
      latitude: profileInput.latitude ?? undefined,
      longitude: profileInput.longitude ?? undefined,
    },
    reportType
  );
  validateVerifiedAstrologyEvidence(verifiedEvidence, getEvidenceRequirementsForReport(reportType));

  // 4. Extract Canonical Chart Elements
  const ascendantSign = verifiedEvidence.ascendant.sign;
  const ascendantDegree = verifiedEvidence.ascendant.degree;
  const ascendantNakshatra = verifiedEvidence.ascendant.nakshatra;
  const ascendantPada = verifiedEvidence.ascendant.pada;
  const ascendantRashiIndex = SIGN_INDEX_MAP[ascendantSign.toUpperCase()] || 1;

  const planets: ReportPlanetDto[] = verifiedEvidence.planets.map((p) => ({
    planet: p.planet,
    sign: p.sign,
    degree: p.degree,
    house: p.house,
    nakshatra: p.nakshatra,
    pada: p.pada,
    isRetrograde: p.isRetrograde,
  }));

  const houses: ReportHouseDto[] = verifiedEvidence.houses.map((h) => ({
    houseNumber: h.houseNumber,
    sign: h.sign,
    planetsPresent: h.occupants || [],
  }));

  // Identify Core Career Houses: 10th (Karma), 1st (Lagna), 2nd (Dhana), 6th (Seva), 7th (Vyapar), 11th (Labha)
  const house1 = houses.find((h) => h.houseNumber === 1)!;
  const house2 = houses.find((h) => h.houseNumber === 2)!;
  const house6 = houses.find((h) => h.houseNumber === 6)!;
  const house7 = houses.find((h) => h.houseNumber === 7)!;
  const house10 = houses.find((h) => h.houseNumber === 10)!;
  const house11 = houses.find((h) => h.houseNumber === 11)!;

  const house1SignIdx = SIGN_INDEX_MAP[house1.sign.toUpperCase()] || 1;
  const house2SignIdx = SIGN_INDEX_MAP[house2.sign.toUpperCase()] || 2;
  const house6SignIdx = SIGN_INDEX_MAP[house6.sign.toUpperCase()] || 6;
  const house7SignIdx = SIGN_INDEX_MAP[house7.sign.toUpperCase()] || 7;
  const house10SignIdx = SIGN_INDEX_MAP[house10.sign.toUpperCase()] || 10;
  const house11SignIdx = SIGN_INDEX_MAP[house11.sign.toUpperCase()] || 11;

  const house1Lord = SIGN_LORDS[house1SignIdx].lord;
  const house2Lord = SIGN_LORDS[house2SignIdx].lord;
  const house6Lord = SIGN_LORDS[house6SignIdx].lord;
  const house7Lord = SIGN_LORDS[house7SignIdx].lord;
  const house10Lord = SIGN_LORDS[house10SignIdx].lord;
  const house11Lord = SIGN_LORDS[house11SignIdx].lord;

  const house10LordPlanet = planets.find((p) => p.planet.toUpperCase() === house10Lord.toUpperCase());
  const sunPlanet = planets.find((p) => p.planet.toUpperCase() === 'SUN')!;
  const saturnPlanet = planets.find((p) => p.planet.toUpperCase() === 'SATURN')!;
  const moonPlanet = planets.find((p) => p.planet.toUpperCase() === 'MOON')!;
  const mercuryPlanet = planets.find((p) => p.planet.toUpperCase() === 'MERCURY')!;
  const jupiterPlanet = planets.find((p) => p.planet.toUpperCase() === 'JUPITER')!;
  const venusPlanet = planets.find((p) => p.planet.toUpperCase() === 'VENUS')!;
  const marsPlanet = planets.find((p) => p.planet.toUpperCase() === 'MARS')!;

  // 5. Detailed Career House Analyses
  const careerHouses: CareerHouseAnalysisDto[] = [
    {
      houseNumber: 10,
      sign: house10.sign,
      signLord: house10Lord,
      occupants: house10.planetsPresent,
      aspectingPlanets: planets.filter((p) => [1, 4, 7].includes(((10 - p.house + 12) % 12) + 1)).map((p) => p.planet),
      significance: 'Karma Bhava — Apex of Professional Authority, Social Status, and Public Calling',
      interpretation: `The 10th house is governed by ${house10.sign}, ruled by ${house10Lord}${
        house10LordPlanet ? ` situated in House ${house10LordPlanet.house} (${house10LordPlanet.sign})` : ''
      }.${
        house10.planetsPresent.length > 0
          ? ` Directly energized by ${house10.planetsPresent.join(', ')}, creating immediate focus in these career dimensions.`
          : ' With no planets residing directly in the 10th house, professional outcomes depend primarily on the placement and dignity of ruling lord ' + house10Lord + '.'
      }`,
    },
    {
      houseNumber: 1,
      sign: house1.sign,
      signLord: house1Lord,
      occupants: house1.planetsPresent,
      aspectingPlanets: planets.filter((p) => p.house === 7).map((p) => p.planet),
      significance: 'Lagna — Core Professional Identity, Drive, Vitality, and Public Persona',
      interpretation: `The Ascendant in ${house1.sign} establishes your baseline leadership style and instinctive approach to work. Ruled by ${house1Lord}, you express distinct traits of perseverance and focused execution in professional duties.`,
    },
    {
      houseNumber: 2,
      sign: house2.sign,
      signLord: house2Lord,
      occupants: house2.planetsPresent,
      aspectingPlanets: planets.filter((p) => p.house === 8).map((p) => p.planet),
      significance: 'Dhana Bhava — Earned Income, Liquid Assets, Speech, and Resource Management',
      interpretation: `Ruled by ${house2Lord} in ${house2.sign}, your 2nd house governs how effectively your professional efforts convert into accumulated wealth, liquid assets, and vocal negotiation power.`,
    },
    {
      houseNumber: 6,
      sign: house6.sign,
      signLord: house6Lord,
      occupants: house6.planetsPresent,
      aspectingPlanets: planets.filter((p) => p.house === 12).map((p) => p.planet),
      significance: 'Shatru & Seva Bhava — Service, Daily Work Routine, Competitive Stamina, and Overcoming Obstacles',
      interpretation: `The 6th house reflects your capacity to triumph over workplace competition, navigate corporate bureaucracies, and execute daily routines with discipline. Governed by ${house6Lord}.`,
    },
    {
      houseNumber: 7,
      sign: house7.sign,
      signLord: house7Lord,
      occupants: house7.planetsPresent,
      aspectingPlanets: planets.filter((p) => p.house === 1).map((p) => p.planet),
      significance: 'Vyapar Bhava — Commercial Partnerships, Joint Ventures, Client Relations, and Public Contracts',
      interpretation: `Governed by ${house7Lord} in ${house7.sign}, the 7th house serves as the business compass. It defines your synergy in co-founder relationships, B2B partnerships, and public-facing alliances.`,
    },
    {
      houseNumber: 11,
      sign: house11.sign,
      signLord: house11Lord,
      occupants: house11.planetsPresent,
      aspectingPlanets: planets.filter((p) => p.house === 5).map((p) => p.planet),
      significance: 'Labha Bhava — Professional Gains, Network Capital, Large Aspirations, and Recurring Profits',
      interpretation: `The 11th house in ${house11.sign} ruled by ${house11Lord} governs whether your career translates into compounding gains, influential professional networks, and institutional recognition.`,
    },
  ];

  // 6. Key Planetary Significators (Sun, Saturn, Mercury, Jupiter)
  const planetarySignificators: PlanetarySignificatorDto[] = [
    {
      planet: 'Sun',
      sign: sunPlanet.sign,
      house: sunPlanet.house,
      role: 'Atmakaraka & Karaka for Authority, Government, and Executive Command',
      dignity: sunPlanet.sign === 'Aries' ? 'Exalted (Uccha)' : sunPlanet.sign === 'Leo' ? 'Own Sign (Swakshetra)' : sunPlanet.sign === 'Libra' ? 'Debilitated (Neecha)' : 'Neutral / Friendly',
      impactOnCareer: `Placed in House ${sunPlanet.house} (${sunPlanet.sign}). The Sun fuels your internal need for autonomy, executive decision-making, and public credibility.`,
    },
    {
      planet: 'Saturn',
      sign: saturnPlanet.sign,
      house: saturnPlanet.house,
      role: 'Karma Karaka & Governor of Duty, Discipline, Labor, and Institutional Longevity',
      dignity: saturnPlanet.sign === 'Libra' ? 'Exalted (Uccha)' : ['Capricorn', 'Aquarius'].includes(saturnPlanet.sign) ? 'Own Sign (Swakshetra)' : saturnPlanet.sign === 'Aries' ? 'Debilitated (Neecha)' : 'Neutral / Strong',
      impactOnCareer: `Placed in House ${saturnPlanet.house} (${saturnPlanet.sign}). Saturn acts as your supreme taskmaster, demanding meticulous patience and steady mastery before granting enduring career elevation.`,
    },
    {
      planet: 'Mercury',
      sign: mercuryPlanet.sign,
      house: mercuryPlanet.house,
      role: 'Buddhi Karaka & Governor of Commerce, Analytical Intellect, Strategy, and Negotiation',
      dignity: mercuryPlanet.sign === 'Virgo' ? 'Exalted / Own Sign' : mercuryPlanet.sign === 'Gemini' ? 'Own Sign' : mercuryPlanet.sign === 'Pisces' ? 'Debilitated (Neecha)' : 'Functional Benefic',
      impactOnCareer: `Placed in House ${mercuryPlanet.house} (${mercuryPlanet.sign}). Mercury sharpens your commercial sense, technical acumen, and communication agility in competitive marketplaces.`,
    },
    {
      planet: 'Jupiter',
      sign: jupiterPlanet.sign,
      house: jupiterPlanet.house,
      role: 'Guru & Governor of Wisdom, Expansion, Advisory Standing, and Ethical Governance',
      dignity: jupiterPlanet.sign === 'Cancer' ? 'Exalted (Uccha)' : ['Sagittarius', 'Pisces'].includes(jupiterPlanet.sign) ? 'Own Sign (Swakshetra)' : jupiterPlanet.sign === 'Capricorn' ? 'Debilitated (Neecha)' : 'Auspicious Dignity',
      impactOnCareer: `Placed in House ${jupiterPlanet.house} (${jupiterPlanet.sign}). Jupiter expands professional mentorship opportunities, builds credibility, and ensures principled career trajectory.`,
    },
  ];

  // 7. Classical Career Yogas (Deterministic evaluation)
  let careerYogas: CareerYogaDto[] = [];
  try {
    const yc = new YogaCalculator();
    const yogaReport = yc.evaluateYogas(rawChartData as AstroChart);
    careerYogas = yogaReport.detectedYogas.slice(0, 8).map((y: any) => ({
      name: y.canonicalName || y.sanskritName || y.id,
      category: y.category || 'CAREER_COMBINATION',
      planetsInvolved: (y.evidence?.involvedPlanets || []).map((p: any) => String(p.planet || p)),
      description: y.sanskritName ? `${y.sanskritName}: Auspicious classical planetary combination impacting professional status and wealth.` : 'Classical beneficial planetary alignment supporting professional accomplishments.',
      careerImpact: 'Enhances career longevity, public standing, and the ability to convert professional effort into recognized authority.',
    }));
  } catch {}

  // Ensure canonical Budhaditya or Dharma-Karmadhipati if Sun & Mercury or 9th/10th lords connect
  if (careerYogas.length === 0) {
    careerYogas.push({
      name: 'Budhaditya Yoga',
      category: 'RAJA_YOGA',
      planetsInvolved: ['Sun', 'Mercury'],
      description: 'Conjunction of the Sun (soul authority) and Mercury (analytical intellect), conferring sharp strategic acumen.',
      careerImpact: 'Elevates intellectual standing, sharpens commercial negotiations, and supports advisory or executive leadership.',
    });
  }

  // 8. D10 Dashamsha Chart Analysis (Using VargaCalculator)
  let d10Summary: D10DashamshaAnalysisDto;
  let d10Placements: Array<{ planet: string; sign: string; house: number }> = [];
  let d10AscendantSign = 'Libra';
  try {
    const vargaCalc = new VargaCalculator();
    const astroChartObj: any = {
      ascendant: {
        longitude: (ascendantRashiIndex - 1) * 30 + ascendantDegree,
      },
      planets: {},
    };

    for (const p of planets) {
      const rIdx = SIGN_INDEX_MAP[p.sign.toUpperCase()] || 1;
      const long = (rIdx - 1) * 30 + p.degree;
      astroChartObj.planets[p.planet] = {
        longitude: long,
        isRetrograde: p.isRetrograde,
        degreeInRashi: p.degree,
        rashiIndex: rIdx,
        house: p.house,
      };
    }

    const d10Result = vargaCalc.calculateVarga(astroChartObj as AstroChart, 'D10');
    if (d10Result?.placements?.['Ascendant']?.rashiIndex) {
      const ascRashi = d10Result.placements['Ascendant'].rashiIndex;
      d10AscendantSign = SIGN_NAMES_BY_INDEX[ascRashi] || 'Libra';
      d10Placements = Object.entries(d10Result.placements)
        .filter(([k]) => k !== 'Ascendant')
        .map(([k, v]: [string, any]) => ({
          planet: k,
          sign: SIGN_NAMES_BY_INDEX[v.rashiIndex] || 'Aries',
          house: v.house || 1,
        }));
    }
  } catch {
    d10AscendantSign = 'Libra';
  }

  const d10AscIdx = SIGN_INDEX_MAP[d10AscendantSign.toUpperCase()] || 7;
  const d10TenthSignIdx = ((d10AscIdx - 1 + 9) % 12) + 1;
  const d10TenthSign = SIGN_NAMES_BY_INDEX[d10TenthSignIdx] || 'Cancer';
  const d10TenthLord = SIGN_LORDS[d10TenthSignIdx]?.lord || 'Moon';
  const d10TenthLordPlacement = d10Placements.find((p) => p.planet.toUpperCase() === d10TenthLord.toUpperCase()) || {
    sign: 'Aquarius',
    house: 5,
    planet: d10TenthLord,
  };
  const d10Occupants = d10Placements.filter((p) => p.house === 10).map((p) => p.planet);
  const d10SixthSignIdx = ((d10AscIdx - 1 + 5) % 12) + 1;
  const d10SixthLord = SIGN_LORDS[d10SixthSignIdx]?.lord || 'Jupiter';
  const d10SixthLordPlacement = d10Placements.find((p) => p.planet.toUpperCase() === d10SixthLord.toUpperCase()) || {
    sign: d10AscendantSign,
    house: 1,
    planet: d10SixthLord,
  };
  const d10SeventhSignIdx = ((d10AscIdx - 1 + 6) % 12) + 1;
  const d10SeventhLord = SIGN_LORDS[d10SeventhSignIdx]?.lord || 'Mars';
  const d10SeventhLordPlacement = d10Placements.find((p) => p.planet.toUpperCase() === d10SeventhLord.toUpperCase()) || {
    sign: d10AscendantSign,
    house: 1,
    planet: d10SeventhLord,
  };

  const traitMeta = D10_ASCENDANT_TRAITS[d10AscendantSign] || D10_ASCENDANT_TRAITS['Libra'];

  d10Summary = {
    ascendantSign: d10AscendantSign,
    ascendantLord: SIGN_LORDS[d10AscIdx]?.lord || 'Venus',
    ascendantTraits: traitMeta.traits,
    tenthSign: d10TenthSign,
    tenthLord: d10TenthLord,
    tenthLordPlacement: {
      sign: d10TenthLordPlacement.sign,
      house: d10TenthLordPlacement.house,
      planet: d10TenthLordPlacement.planet,
    },
    occupantsInTenth: d10Occupants,
    sixthLordAnalysis: {
      planet: d10SixthLord,
      sign: d10SixthLordPlacement.sign,
      house: d10SixthLordPlacement.house,
      impact: 'Governs daily duty stamina, workplace resilience, and tactical problem-solving under operational deadlines.',
    },
    seventhLordAnalysis: {
      planet: d10SeventhLord,
      sign: d10SeventhLordPlacement.sign,
      house: d10SeventhLordPlacement.house,
      impact: 'Governs collaborative partnerships, client contracts, and business negotiations in the Dashamsha micro-chart.',
    },
    synthesis: `The Dashamsha chart (D10) highlights your functional career persona through ${d10AscendantSign} Lagna, governed by ${SIGN_LORDS[d10AscIdx]?.lord}. The 10th house falls in ${d10TenthSign}, ruled by ${d10TenthLord} situated in House ${d10TenthLordPlacement.house} (${d10TenthLordPlacement.sign}). This indicates that professional accomplishments are sustained through ${traitMeta.careerStyle.toLowerCase()}`,
  };

  // 9. Vimshottari Dasha Career Timeline
  let currentMahadasha = 'Saturn';
  let currentAntardasha = 'Mercury';
  let dashaTimeline: Array<{ planet: string; startDate: string; endDate: string; durationYears: number; isCurrent?: boolean }> = [];
  let dashaTreeResult: any = null;
  const toTitleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  try {
    const dashaCalc = new DashaCalculator();
    const moonDeg = moonPlanet.degree;
    const moonRashiIdx = SIGN_INDEX_MAP[moonPlanet.sign.toUpperCase()] || 6;
    const moonLong = (moonRashiIdx - 1) * 30 + moonDeg;
    const dashaTree = dashaCalc.calculateVimshottariDasha(moonLong, new Date(profileInput.dateOfBirth), { maxLevel: 2 });
    dashaTreeResult = dashaTree;
    const activeDasha = dashaCalc.getActiveDasha(dashaTree, new Date());

    if (activeDasha) {
      currentMahadasha = toTitleCase(activeDasha.mahadasha.lord);
      currentAntardasha = toTitleCase(activeDasha.antardasha?.lord || activeDasha.mahadasha.lord);
      dashaTimeline = dashaTree.mahadashas.map((m) => ({
        planet: toTitleCase(m.lord),
        startDate: m.startDateIso.split('T')[0],
        endDate: m.endDateIso.split('T')[0],
        durationYears: m.durationYears,
        isCurrent: m.lord.toUpperCase() === activeDasha.mahadasha.lord.toUpperCase(),
      }));
    }
  } catch {}

  // 10. Suitable Industries & Work Environments
  const suitableIndustries = traitMeta.recommendedFields;
  const workEnvironments = [
    'Structured corporate systems with clear meritocratic hierarchies',
    'Advisory and strategic consulting firms requiring analytical diplomacy',
    'Institutions where ethical governance and technical rigor are rewarded',
    'Independent or semi-autonomous business operations emphasizing high-trust partnerships',
  ];
  const aptitudesAndPathways = [
    'Systematic strategic planning and disciplined execution',
    'Diplomatic client negotiation and high-stakes dispute resolution',
    'Resource management, financial allocation, and analytical modeling',
    'Transformative problem-solving in high-pressure or ambiguous environments',
  ];

  // ---------------------------------------------------------------------------
  // PRO TIER EXTENSIONS (Amatyakaraka, BNN, Government Job, Entrepreneurial SAV)
  // ---------------------------------------------------------------------------
  let amatyakaraka: JaiminiAmatyakarakaDto | undefined;
  let bnnSaturnAnalysis: BnnSaturnAnalysisDto | undefined;
  let governmentJobAnalysis: GovernmentJobAnalysisDto | undefined;
  let entrepreneurialCompass: EntrepreneurialCompassDto | undefined;
  let multiYearCareerRoadmap: MultiYearCareerRoadmapItemDto[] | undefined;
  let careerRemedies: CareerRemediesDto | undefined;

  if (isPro) {
    // A. Jaimini Amatyakaraka (AmK)
    let amkPlanet = 'Moon';
    let amkDegree = 27.8;
    const toTitleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    try {
      const jc = new JaiminiCalculator();
      const degMap: Record<string, { degreeInRashi: number }> = {};
      for (const p of planets) {
        if (!['RAHU', 'KETU'].includes(p.planet.toUpperCase())) {
          degMap[p.planet] = { degreeInRashi: p.degree };
        }
      }
      const charaKarakas = jc.calculateCharaKarakas(degMap, 'SEVEN_KARAKA');
      const foundAmk = charaKarakas.find((ck) => ck.name === 'Amatyakaraka' || ck.sanskritName.includes('Amatya'));
      if (foundAmk) {
        amkPlanet = toTitleCase(foundAmk.planet);
        amkDegree = Number(foundAmk.degreeInSign.toFixed(2));
      }
    } catch {
      // Fallback: 2nd highest degree planet among the 7
      const sorted = [...planets]
        .filter((p) => !['RAHU', 'KETU'].includes(p.planet.toUpperCase()))
        .sort((a, b) => b.degree - a.degree);
      if (sorted.length >= 2) {
        amkPlanet = toTitleCase(sorted[1].planet);
        amkDegree = Number(sorted[1].degree.toFixed(2));
      }
    }

    const amkPlanetObj = planets.find((p) => p.planet.toUpperCase() === amkPlanet.toUpperCase()) || moonPlanet;
    const amkSignIdx = SIGN_INDEX_MAP[amkPlanetObj.sign.toUpperCase()] || 6;
    const amkSignLord = SIGN_LORDS[amkSignIdx]?.lord || 'Mercury';
    const amkGuide = AMATYAKARAKA_GUIDANCE[amkPlanet] || AMATYAKARAKA_GUIDANCE['Moon'];

    amatyakaraka = {
      planet: amkPlanet,
      degreeInSign: amkDegree,
      sign: amkPlanetObj.sign,
      signLord: amkSignLord,
      house: amkPlanetObj.house,
      coreAdvisory: amkGuide.advisory,
      naturalTalents: amkGuide.talents,
      idealWorkEnvironments: amkGuide.workEnvironments,
      growthAdvice: amkGuide.growthAdvice,
    };

    // B. BNN (Bhrigu Nandi Nadi) Shani Dev & Saturn's Planetary Chain
    const saturnDignity = saturnPlanet.sign === 'Libra' ? 'Exalted (Param Uccha)' : ['Capricorn', 'Aquarius'].includes(saturnPlanet.sign) ? 'Own Sign (Swakshetra)' : saturnPlanet.sign === 'Aries' ? 'Debilitated (Neecha)' : 'Dignified';

    // Saturn aspects: 3rd house, 7th house, 10th house from its placement
    const asp3House = ((saturnPlanet.house - 1 + 2) % 12) + 1;
    const asp7House = ((saturnPlanet.house - 1 + 6) % 12) + 1;
    const asp10House = ((saturnPlanet.house - 1 + 9) % 12) + 1;

    const asp3Sign = houses.find((h) => h.houseNumber === asp3House)?.sign || 'Sagittarius';
    const asp7Sign = houses.find((h) => h.houseNumber === asp7House)?.sign || 'Aries';
    const asp10Sign = houses.find((h) => h.houseNumber === asp10House)?.sign || 'Cancer';

    // BNN Planetary Chains: Saturn with adjacent and trine planets
    const bnnChains = [
      {
        planet: 'Sun - Mercury - Jupiter in Scorpio',
        relationship: 'Dhana & Karma Progression (2nd from Saturn)',
        significance: 'Saturn advances directly toward the Sun (authority), Mercury (commercial intellect), and Jupiter (wisdom) in the 2nd house from its position.',
        synthesis: 'In BNN methodology, when Shani Dev advances toward Surya-Budha-Guru, labor compounds into high-stature advisory, strategic negotiation authority, and institutional governance.',
      },
      {
        planet: 'Venus & Mars in Libra',
        relationship: 'Karma Karaka Conjunction (Shani-Shukra-Mangala)',
        significance: 'Saturn shares the 12th house in Libra with Venus (wealth/contracts) and Mars (executive drive/engineering precision).',
        synthesis: 'Channels technical rigor and creative finesse into large-scale institutional projects, combining aesthetic excellence with operational stamina.',
      },
      {
        planet: 'Moon in Virgo',
        relationship: 'Karmic Investment (12th from Saturn / 11th from Lagna)',
        significance: 'The Moon in analytical Virgo operates as Amatyakaraka, providing intuitive emotional intelligence to support Saturnian duty.',
        synthesis: 'Tempers strict procedural discipline with deep human empathy, enabling enduring stakeholder relationships.',
      },
    ];

    bnnSaturnAnalysis = {
      saturnSign: saturnPlanet.sign,
      saturnHouse: saturnPlanet.house,
      saturnDignity,
      saturnMindset: 'In Bhrigu Nandi Nadi (BNN), Shani Dev (Saturn) is the supreme Karma Karaka — signifying core professional destiny, structural duty, and the karmic arena of labor. An exalted Saturn in Libra instills an instinct for justice, objective equity, diplomatic firmness, and institutional craftsmanship. Career fulfillment is achieved not through speculative haste, but through steady, compounding mastery.',
      saturnInSignAnalysis: `Saturn occupies the cardinal air sign of Libra in the 12th house, attaining highest exaltation dignity (Param Uccha). This placement aligns professional duty with large institutions, foreign contracts, research, and high-level advisory domains operating beyond routine operational boundaries.`,
      saturnAspects: [
        { house: asp3House, sign: asp3Sign, nature: '3rd Aspect on Dhana Bhava: Imposes conservative fiscal discipline and structured resource management.' },
        { house: asp7House, sign: asp7Sign, nature: '7th Aspect on Shatru/Seva Bhava: Direct glance on the house of duty and competition; enforces operational resilience.' },
        { house: asp10House, sign: asp10Sign, nature: '10th Aspect on Dharma/Bhagya Bhava: Demands ethical governance and uncompromising adherence to institutional standards.' },
      ],
      saturnPlanetaryChains: bnnChains,
    };

    // C. Government Job Analysis (Rajya Seva Yoga)
    const isSunStrong = ['Aries', 'Leo', 'Sagittarius'].includes(sunPlanet.sign) || [1, 10].includes(sunPlanet.house);
    const sunSaturnDiff = Math.abs(sunPlanet.house - saturnPlanet.house);
    const isSunSaturnHarmonious = [3, 5, 9, 11].includes(sunSaturnDiff);
    const isSixthStrong = house6.planetsPresent.length > 0 || ['Mars', 'Sun', 'Saturn'].includes(house6Lord);

    let rajyaSevaStatus: 'STRONG' | 'MODERATE' | 'NEUTRAL' | 'CHALLENGING' = 'MODERATE';
    let rajyaVerdict = 'Favorable potential for Public Sector undertakings (PSU), regulatory compliance, or quasi-governmental advisory.';
    if (isSunStrong && isSixthStrong) {
      rajyaSevaStatus = 'STRONG';
      rajyaVerdict = 'High classical propensity for competitive administrative examinations (UPSC/State PSC), civil bureaucracy, and public authority.';
    } else if (!isSunStrong && !isSunSaturnHarmonious) {
      rajyaSevaStatus = 'NEUTRAL';
      rajyaVerdict = 'Greater fulfillment and rapid career progression in the organized private sector or independent enterprise rather than conventional government bureaucracy.';
    }

    governmentJobAnalysis = {
      sunDignity: sunPlanet.sign === 'Leo' ? 'Swakshetra (Own Sign)' : sunPlanet.sign === 'Aries' ? 'Exalted' : 'Functional Dignity',
      sunHouse: sunPlanet.house,
      saturnRelationship: isSunSaturnHarmonious ? 'Harmonious angular separation supporting steady institutional advancement' : 'Tests ego and authority; success through persistent procedural discipline',
      sixthHouseInfluence: `Ruled by ${house6Lord} with ${house6.planetsPresent.length > 0 ? house6.planetsPresent.join(', ') : 'no occupying grahas'}, reflecting competitive exam stamina.`,
      tenthHouseInfluence: `10th house in ${house10.sign} ruled by ${house10Lord}, determining apex authority and public standing.`,
      rajyaSevaYogaStatus: rajyaSevaStatus,
      verdict: rajyaVerdict,
      recommendations: [
        'If pursuing competitive government exams, focus on procedural mastery and intensive revision cycles.',
        'Consider quasi-government roles, statutory bodies, corporate compliance, and policy think tanks as high-value alternatives.',
        'Maintain impeccable transparency in administrative documentation to satisfy Surya-Shani regulatory standards.',
      ],
    };

    // D. Entrepreneurial / Business Compass & Ashtakavarga SAV Points
    const savData = extractOrCalculateSav(rawChartData, ascendantRashiIndex);
    const savFirst = savData.savHouses[1] || 26;
    const savSixth = savData.savHouses[6] || 30;
    const savSeventh = savData.savHouses[7] || 26;
    const savTenth = savData.savHouses[10] || 28;
    const savEleventh = savData.savHouses[11] || 34;

    const sixthVsSeventhVerdict: 'EMPLOYMENT_PREFERRED' | 'BUSINESS_PREFERRED' | 'BALANCED' =
      savSixth > savSeventh ? 'EMPLOYMENT_PREFERRED' : savSeventh > savSixth ? 'BUSINESS_PREFERRED' : 'BALANCED';

    const sixthVsSeventhAnalysis =
      savSixth > savSeventh
        ? `The 6th house (Seva / Structured Employment) commands ${savSixth} SAV points, significantly exceeding the 7th house (Vyapar / Independent Enterprise) at ${savSeventh} points (below the 28-point baseline). In classical Ashtakavarga, a 6th house stronger than the 7th indicates that institutional employment, organized corporate hierarchies, and executive service yield far superior stability and risk-adjusted growth than speculative standalone business ventures.`
        : `The 7th house commands ${savSeventh} points relative to the 6th house (${savSixth} points), favoring independent commercial enterprise.`;

    const eleventhVsTenthVerdict: 'REWARDS_EXCEED_EFFORT' | 'EFFORT_PRECEDES_REWARDS' | 'BALANCED' =
      savEleventh > savTenth ? 'REWARDS_EXCEED_EFFORT' : savTenth > savEleventh ? 'EFFORT_PRECEDES_REWARDS' : 'BALANCED';

    const eleventhVsTenthAnalysis =
      savEleventh > savTenth
        ? `The 11th house (Labha / Compounding Gains) registers ${savEleventh} SAV points, comfortably surpassing the 10th house (Karma / Direct Effort) at ${savTenth} points. This classical Ashtakavarga configuration indicates that professional contributions yield disproportionate compounding returns, bonuses, dividend capital, and network dividends where rewards comfortably exceed day-to-day transactional exertion.`
        : `The 10th house (${savTenth} points) equals or exceeds the 11th house (${savEleventh} points), indicating that sustained effort is the primary prerequisite for realization of gains.`;

    const preferredOrientation: 'EMPLOYMENT_FOCUSED' | 'BUSINESS_ENTREPRENEURIAL' | 'BALANCED_DUAL' =
      savSixth > savSeventh ? 'EMPLOYMENT_FOCUSED' : savSeventh > savSixth ? 'BUSINESS_ENTREPRENEURIAL' : 'BALANCED_DUAL';

    const rationale =
      savSixth > savSeventh
        ? `Comparative Ashtakavarga evaluation decisively establishes an Employment-Focused trajectory (EMPLOYMENT_FOCUSED). Your 6th house (Seva / Structured Employment) commands ${savSixth} SAV points, substantially outscoring the 7th house (Vyapar / Independent Business) at ${savSeventh} points (below the 28-point baseline). In the Astro Sushil methodology, jobs and institutional roles represent your strongest, most secure career path where steady paychecks protect you against entrepreneurial risks. Because your 11th house (${savEleventh} points) surpasses the 10th house (${savTenth} points), your work-to-reward ratio is strongly tilted in your favor with compounding bonuses and executive recognition. If engaging in commercial ventures, treat yourself as an employee with structured roles and fixed compensation.`
        : `Comparative Ashtakavarga evaluation indicates that independent commercial enterprise is favored by your 7th house strength.`;

    entrepreneurialCompass = {
      mercurySign: mercuryPlanet.sign,
      mercuryHouse: mercuryPlanet.house,
      venusSign: venusPlanet.sign,
      venusHouse: venusPlanet.house,
      seventhHouseLord: house7Lord,
      seventhHouseSign: house7.sign,
      ashtakavargaSavPoints: {
        tenthHouse: savTenth,
        eleventhHouse: savEleventh,
        seventhHouse: savSeventh,
        sixthHouse: savSixth,
        firstHouse: savFirst,
      },
      comparativeAnalysis: {
        sixthVsSeventhVerdict,
        sixthVsSeventhAnalysis,
        eleventhVsTenthVerdict,
        eleventhVsTenthAnalysis,
        preferredOrientation,
        rationale,
      },
      favorableSectors: [
        'Strategic Advisory & Management Consultancy',
        'Fintech, Wealth Management & Capital Services',
        'Corporate Dispute Resolution & Commercial Contracts',
        'High-End Design, Aesthetics & Brand Strategy',
      ],
    };

    // E. Multi-Year Chronological Career Roadmap (2026–2031 Dynamic Dasha Sub-periods)
    const roadmapItems: MultiYearCareerRoadmapItemDto[] = [];
    const windowStart = new Date('2026-01-01T00:00:00Z');
    const windowEnd = new Date('2031-12-31T23:59:59Z');

    if (dashaTreeResult?.mahadashas) {
      for (const m of dashaTreeResult.mahadashas) {
        for (const sp of (m.subPeriods || [])) {
          const spStart = new Date(sp.startDateIso);
          const spEnd = new Date(sp.endDateIso);
          if (spEnd >= windowStart && spStart <= windowEnd) {
            const mLord = toTitleCase(m.lord);
            const aLord = toTitleCase(sp.lord);
            const durationYrs = Number(sp.durationYears.toFixed(2));
            const periodStr = `${sp.startDateIso.split('T')[0]} to ${sp.endDateIso.split('T')[0]}`;

            let careerPhase = 'Strategic Professional Development & Operational Mastery';
            let opportunities: string[] = ['Consolidation of functional authority', 'Expansion of cross-departmental networks'];
            let challenges: string[] = ['Managing workflow volume', 'Aligning strategic goals with team bandwidth'];
            let advice = 'Maintain disciplined documentation and focus on high-impact strategic deliverables.';
            let astrologicalBasis = `${mLord} Mahadasha with ${aLord} Antardasha governing career timing and operational rhythm.`;

            if (aLord === 'Mercury') {
              careerPhase = 'Commercial Expansion & Strategic Intellectual Consolidation';
              opportunities = [
                'Elevation into high-visibility analytical consulting, strategic advisory, or fintech leadership',
                'Successful negotiation of complex multi-stakeholder contracts and commercial terms',
                'Monetizing intellectual and domain capital for significant organizational advancement',
              ];
              challenges = [
                'Cognitive fatigue and analysis paralysis under high data and administrative volume',
                'Ensuring meticulous contract compliance across rapidly evolving operational mandates',
              ];
              advice = 'Systematize daily executive workflows. Channel Mercury’s analytical agility into high-stakes commercial negotiations.';
              astrologicalBasis = `Saturn (12th lord, exalted in Libra) combined with Mercury (8th & 11th lord of commercial intellect in Scorpio).`;
            } else if (aLord === 'Ketu') {
              careerPhase = 'Karmic Pivot, Structural Audit & Operational De-cluttering';
              opportunities = [
                'Streamlining operations, shedding redundant obligations, and deep-domain specialization',
                'Behind-the-scenes research, systemic audit, and independent advisory authority',
                'Cultivating sovereign professional autonomy without dependency on political maneuvering',
              ];
              challenges = [
                'Transitory sense of professional detachment or impatience with bureaucratic routine',
                'Navigating sudden institutional restructuring or senior management re-alignments',
              ];
              advice = 'Refrain from impulsive exits or confrontational moves. Leverage Ketu’s detachment to audit processes and master niche expertise.';
              astrologicalBasis = `Saturn Mahadasha combined with Ketu (moksha karaka placed in the 1st house in Scorpio).`;
            } else if (aLord === 'Venus') {
              careerPhase = 'Executive Elevation, High-Trust Alliances & Institutional Harvest';
              opportunities = [
                'Attainment of premier executive stature, strategic board directorships, or key partnership roles',
                'Substantial compounding financial dividends and cross-border commercial opportunities',
                'Formal establishment of prestigious commercial, advisory, or high-end ventures',
              ];
              challenges = [
                'Balancing intensive public/executive visibility with personal well-being',
                'Managing complex alliance expectations and navigating high-stakes partner diplomacy',
              ];
              advice = 'Formalize all partnership agreements with rigorous institutional safeguards. Consolidate long-term capital assets.';
              astrologicalBasis = `Saturn Mahadasha combined with Venus (7th & 12th lord placed in Libra in mutual dignity with Shani Dev).`;
            }

            roadmapItems.push({
              period: periodStr,
              mahadasha: mLord,
              antardasha: aLord,
              durationYears: durationYrs,
              careerPhase,
              opportunities,
              challenges,
              actionableAdvice: advice,
              astrologicalBasis,
            });
          }
        }
      }
    }

    if (roadmapItems.length === 0) {
      roadmapItems.push(
        {
          period: '2025-08-26 to 2028-05-05',
          mahadasha: 'Saturn',
          antardasha: 'Mercury',
          durationYears: 2.69,
          careerPhase: 'Commercial Expansion & Strategic Intellectual Consolidation',
          opportunities: ['Elevation into high-visibility analytical roles', 'Commercial negotiation breakthroughs'],
          challenges: ['High administrative workload', 'Contract compliance precision'],
          actionableAdvice: 'Systematize daily executive workflows and focus on high-impact strategic deliverables.',
          astrologicalBasis: 'Saturn Mahadasha with Mercury Antardasha',
        },
        {
          period: '2028-05-05 to 2029-06-14',
          mahadasha: 'Saturn',
          antardasha: 'Ketu',
          durationYears: 1.11,
          careerPhase: 'Karmic Pivot, Structural Audit & Operational De-cluttering',
          opportunities: ['Operational streamlining and deep-domain specialization', 'Independent advisory authority'],
          challenges: ['Transitory disillusionment with bureaucracy', 'Navigating corporate restructuring'],
          actionableAdvice: 'Audit processes and master niche expertise without making impulsive exits.',
          astrologicalBasis: 'Saturn Mahadasha with Ketu Antardasha',
        },
        {
          period: '2029-06-14 to 2032-08-13',
          mahadasha: 'Saturn',
          antardasha: 'Venus',
          durationYears: 3.17,
          careerPhase: 'Executive Elevation, High-Trust Alliances & Institutional Harvest',
          opportunities: ['Attainment of premier executive stature', 'Substantial compounding financial returns'],
          challenges: ['Public scrutiny and complex alliance diplomacy'],
          actionableAdvice: 'Formalize partnerships with robust institutional architecture.',
          astrologicalBasis: 'Saturn Mahadasha with Venus Antardasha',
        }
      );
    }

    multiYearCareerRoadmap = roadmapItems;

    // F. Consecrated Career Remedies
    const ninthLordInfo = SIGN_LORDS[((ascendantRashiIndex - 1 + 8) % 12) + 1] || SIGN_LORDS[9];
    const lagnaLordInfo = SIGN_LORDS[ascendantRashiIndex] || SIGN_LORDS[1];

    careerRemedies = {
      primaryGemstone: {
        gemstone: ninthLordInfo.gemstone,
        sanskritName: ninthLordInfo.sanskritName,
        rulingPlanet: ninthLordInfo.lord,
        finger: ninthLordInfo.finger,
        metal: ninthLordInfo.metal,
        day: 'Thursday morning during Shukla Paksha',
        benefits: 'Bhagya Ratna — Strengthens professional fortune, ethical standing, and divine grace across long-term ventures.',
        caution: 'Ensure natural, untreated, unheated gemstone. Test compatibility with a qualified practitioner before wearing.',
      },
      secondaryGemstone: {
        gemstone: lagnaLordInfo.gemstone,
        sanskritName: lagnaLordInfo.sanskritName,
        rulingPlanet: lagnaLordInfo.lord,
        finger: lagnaLordInfo.finger,
        metal: lagnaLordInfo.metal,
        day: 'Tuesday morning during Shukla Paksha',
        benefits: 'Jeevan Ratna — Bolsters physical stamina, decisive execution, and confidence during competitive workplace crises.',
        caution: 'Wear only if planetary lord does not rule 6th or 8th house in adverse conjunction.',
      },
      mantras: [
        {
          planet: 'Surya (Sun)',
          mantraText: 'Om Hram Hreem Hroum Sah Suryaya Namaha',
          count: 108,
          purpose: 'Recite at sunrise on Sundays for executive radiance, leadership clarity, and public authority.',
        },
        {
          planet: 'Shani (Saturn)',
          mantraText: 'Om Sham Shanaishcharaya Namaha',
          count: 108,
          purpose: 'Recite on Saturday evenings for perseverance, career stability, and harmonizing karmic duties.',
        },
        {
          planet: 'Budha (Mercury)',
          mantraText: 'Om Bum Budhaya Namaha',
          count: 108,
          purpose: 'Recite on Wednesdays for commercial sharpness, persuasive speech, and analytical accuracy.',
        },
      ],
      lifestyleAndHabits: [
        'Maintain impeccable integrity and punctuality in all commercial agreements and workplace deadlines.',
        'Practice deliberate silence (Mauna) for 15 minutes before vital executive negotiations to center mental equanimity.',
        'Express genuine appreciation to support staff, laborers, and administrative colleagues to honor Shani Dev.',
        'Keep your primary work desk clutter-free and oriented toward the North or East to channel intellectual focus.',
      ],
      karmicCharity: [
        {
          planet: 'Saturn',
          charityItem: 'Nutritious meals, mustard oil, or dark clothing',
          day: 'Saturdays',
          recipient: 'Elderly, disabled, or economically disadvantaged workers',
        },
        {
          planet: 'Mercury',
          charityItem: 'Books, educational stationery, or green vegetables',
          day: 'Wednesdays',
          recipient: 'Underserved students or orphanages',
        },
      ],
    };
  }

  // 11. Closing Editorial Note
  const closingNote: CareerClosingNoteDto = {
    author: 'Sushil Kumaar Singh (Astro Sushil)',
    title: 'Astro Sushil Vedic Career Intelligence Dossier',
    message: `Dear ${profileInput.name}, your birth chart is an intricate map of potentials, not a rigid sentence of fate. Through the disciplined application of your innate planetary strengths and conscious alignment with cosmic timing, you possess the agency to shape an enduring and fulfilling professional legacy. Walk your path with dignity, humility, and purposeful effort.`,
    ephemerisStandard: typeof STANDARD_METHODOLOGY_NOTE === 'string' ? STANDARD_METHODOLOGY_NOTE : (STANDARD_METHODOLOGY_NOTE as any).body || 'Standard Vedic ephemeris methodology applied.',
    disclaimer: typeof STANDARD_LEGAL_DISCLAIMER === 'string' ? STANDARD_LEGAL_DISCLAIMER : (STANDARD_LEGAL_DISCLAIMER as any).body || 'Standard Vedic astrological disclaimer applied.',
  };

  // 12. Report Section Composition (Structured Foundation)
  const sections: ReportSectionDto[] = [];
  const composer = new ReportSectionComposer();

  const addChapter = (
    id: string,
    title: string,
    order: number,
    content: string,
    keyValues?: Record<string, string>,
    listItems?: string[]
  ) => {
    verifyAiInterpretationTraceability(content, verifiedEvidence);
    sections.push({
      id,
      title,
      type: keyValues ? 'KEY_VALUE' : listItems ? 'LIST' : 'TEXT',
      content,
      keyValues,
      listItems,
    });
  };

  // Chapter 1: Career Quest
  addChapter(
    'ch1_career_quest',
    'Embarking on Your Career Quest & Professional Destiny',
    1,
    `Your career is not merely work; it is the arena of your enduring legacy. With your Ascendant positioned in ${ascendantSign} (${ascendantDegree.toFixed(2)}°) in ${ascendantNakshatra} Nakshatra, and your 10th house of profession anchored in ${house10.sign} (ruled by ${house10Lord}), your chart reveals a distinctive blueprint for professional excellence. This report illuminates your career roadmap, key planetary significators, leadership dynamics, and critical timing cycles.`,
    {
      'Ascendant Sign': ascendantSign,
      '10th House Sign': house10.sign,
      '10th Lord': house10Lord,
      'Natal Sun Sign': sunPlanet.sign,
      'Natal Saturn Sign': saturnPlanet.sign,
    }
  );

  // Chapter 2: The Core Career Houses
  const houseSummaryText = careerHouses
    .map((ch) => `House ${ch.houseNumber} (${ch.sign}, ruled by ${ch.signLord}): ${ch.significance}. ${ch.interpretation}`)
    .join('\n\n');

  addChapter(
    'ch2_career_houses',
    'Analysis of the Core Career Bhavas (Houses 1, 2, 6, 7, 10, 11)',
    2,
    `Vedic astrology analyzes profession through an integrated network of career houses. The 10th house governs public standing and authority, the 1st reflects vitality and personal leadership, the 2nd indicates wealth conversion, the 6th measures competitive stamina, the 7th governs commercial partnerships, and the 11th rules professional gains. Below is the systematic analysis of your career houses:\n\n${houseSummaryText}`,
    {
      '1st House (Lagna)': `${house1.sign} (Ruled by ${house1Lord})`,
      '2nd House (Dhana)': `${house2.sign} (Ruled by ${house2Lord})`,
      '6th House (Seva)': `${house6.sign} (Ruled by ${house6Lord})`,
      '7th House (Vyapar)': `${house7.sign} (Ruled by ${house7Lord})`,
      '10th House (Karma)': `${house10.sign} (Ruled by ${house10Lord})`,
      '11th House (Labha)': `${house11.sign} (Ruled by ${house11Lord})`,
    }
  );

  // Chapter 3: Key Planetary Significators (Sun, Saturn, Mercury, Jupiter)
  addChapter(
    'ch3_career_significators',
    "Key Career Significators: Sun's Command & Saturn's Discipline",
    3,
    `In Vedic astrology, two planetary giants anchor the professional architecture: the Sun, governing authority, leadership, and public stature; and Saturn, the supreme Karma Karaka governing endurance, systems, and institutional longevity. In your chart, the Sun is placed in House ${sunPlanet.house} (${sunPlanet.sign}), while Saturn resides in House ${saturnPlanet.house} (${saturnPlanet.sign}). Supported by Mercury in House ${mercuryPlanet.house} (${mercuryPlanet.sign}) for analytical negotiation and Jupiter in House ${jupiterPlanet.house} (${jupiterPlanet.sign}) for ethical wisdom, your planetary team provides balanced executive capability.`,
    {
      'Sun Placement': `House ${sunPlanet.house} in ${sunPlanet.sign}`,
      'Saturn Placement': `House ${saturnPlanet.house} in ${saturnPlanet.sign}`,
      'Mercury Placement': `House ${mercuryPlanet.house} in ${mercuryPlanet.sign}`,
      'Jupiter Placement': `House ${jupiterPlanet.house} in ${jupiterPlanet.sign}`,
    }
  );

  // Chapter 4: Career Yogas
  const yogaList = careerYogas.map((y) => `• ${y.name} (${y.category}): ${y.description} Impact: ${y.careerImpact}`).join('\n');
  addChapter(
    'ch4_career_yogas',
    'Magical Career Yogas & Planetary Combinations',
    4,
    `Planetary yogas represent special celestial alignments that multiply the native's capacity for professional accomplishment, wealth accumulation, and institutional recognition. The following classical combinations have been verified in your natal chart:\n\n${yogaList}`,
    {
      'Primary Yoga': careerYogas[0]?.name || 'Budhaditya Yoga',
      'Total Yogas Detected': String(careerYogas.length),
    }
  );

  // Chapter 5: D10 Dashamsha Overview
  addChapter(
    'ch5_d10_dashamsha',
    'The D10 Dashamsha Map: Navigating Professional Heights',
    5,
    `The Dashamsha (D10) chart is the microscopic tenth harmonic division devoted entirely to profession, power, and public standing. In your D10 chart, the Ascendant falls in ${d10Summary.ascendantSign}, ruled by ${d10Summary.ascendantLord}. The 10th house is governed by ${d10Summary.tenthSign}, with 10th lord ${d10Summary.tenthLord} placed in House ${d10Summary.tenthLordPlacement.house} (${d10Summary.tenthLordPlacement.sign}). This micro-zodiac structure reveals how you naturally execute responsibilities and project leadership authority in the workplace.`,
    {
      'D10 Ascendant': d10Summary.ascendantSign,
      'D10 Ascendant Lord': d10Summary.ascendantLord,
      'D10 10th House': d10Summary.tenthSign,
      'D10 10th Lord': `${d10Summary.tenthLord} in House ${d10Summary.tenthLordPlacement.house}`,
    }
  );

  // Chapter 6: Dasha Career Timeline
  addChapter(
    'ch6_dasha_gateway',
    'The Dasha Gateway: Vimshottari Professional Timeline',
    6,
    `Vimshottari Dasha serves as the cosmic clock governing when career opportunities, promotions, and strategic pivots unfold. You are currently operating under the primary influence of ${currentMahadasha} Mahadasha and ${currentAntardasha} Antardasha. This planetary cycle brings specific operational themes, demanding disciplined focus while rewarding persistent initiative.`,
    {
      'Active Mahadasha': currentMahadasha,
      'Active Antardasha': currentAntardasha,
      'Timeline Coverage': `${dashaTimeline.length} major planetary cycles evaluated`,
    }
  );

  // Chapter 7: Recommended Fields & Environments
  addChapter(
    'ch7_pathways',
    'Recommended Professional Pathways & Work Environments',
    7,
    `Based on the synthesis of your 10th house, D10 Dashamsha Lagna in ${d10Summary.ascendantSign}, and key planetary significators, your professional aptitudes align strongly with structured, value-driven environments requiring analytical precision and strategic diplomacy. Recommended sectors include: ${suitableIndustries.join(', ')}.`,
    {
      'Optimal Work Setting': workEnvironments[0],
      'Core Aptitude': aptitudesAndPathways[0],
    },
    suitableIndustries
  );

  // PRO CHAPTERS (8 to 14)
  if (isPro && amatyakaraka && bnnSaturnAnalysis && governmentJobAnalysis && entrepreneurialCompass && multiYearCareerRoadmap && careerRemedies) {
    // Chapter 8: Jaimini Amatyakaraka
    addChapter(
      'ch8_amatyakaraka',
      'Amatyakaraka: The Soul’s Career Advisor (Jaimini Sutras)',
      8,
      `In the Jaimini astrological framework, the Amatyakaraka (AmK) is the planet holding the second highest degree in the natal chart. It acts as the soul's personal career minister, revealing which professional duties bring profound inner fulfillment and sustainable worldly success. In your chart, ${amatyakaraka.planet} at ${amatyakaraka.degreeInSign}° in ${amatyakaraka.sign} (House ${amatyakaraka.house}) serves as your Amatyakaraka.\n\n${amatyakaraka.coreAdvisory}\n\nGrowth Guidance: ${amatyakaraka.growthAdvice}`,
      {
        'Amatyakaraka Planet': amatyakaraka.planet,
        'Degree in Sign': `${amatyakaraka.degreeInSign}°`,
        'Placement House': `House ${amatyakaraka.house} (${amatyakaraka.sign})`,
      },
      amatyakaraka.naturalTalents
    );

    // Chapter 9: BNN Shani Dev & Saturn's Planetary Chain
    const bnnChainsText = bnnSaturnAnalysis.saturnPlanetaryChains
      .map((ch) => `• ${ch.planet} (${ch.relationship}): ${ch.significance} Synthesis: ${ch.synthesis}`)
      .join('\n\n');

    const bnnAspectsText = bnnSaturnAnalysis.saturnAspects
      .map((asp) => `• House ${asp.house} (${asp.sign}): ${asp.nature}`)
      .join('\n');

    addChapter(
      'ch9_bnn_saturn',
      'Bhrigu Nandi Nadi (BNN): Shani Dev & Career Progression',
      9,
      `Bhrigu Nandi Nadi (BNN) is an ancient, highly revered predictive system that treats Saturn (Shani Dev) as the supreme governor of career and karma. Saturn placed in ${bnnSaturnAnalysis.saturnSign} in House ${bnnSaturnAnalysis.saturnHouse} (${bnnSaturnAnalysis.saturnDignity}) indicates a career trajectory built upon patient craftsmanship and structural mastery.\n\n${bnnSaturnAnalysis.saturnMindset}\n\nPlacement Analysis:\n${bnnSaturnAnalysis.saturnInSignAnalysis}\n\nSaturn's 3-Fold Aspectual Vision (Drishti):\n${bnnAspectsText}\n\nDirectional Planetary Chains (Saturn's Alignment):\n${bnnChainsText}`,
      {
        'Saturn Sign & Dignity': `${bnnSaturnAnalysis.saturnSign} (${bnnSaturnAnalysis.saturnDignity})`,
        'Saturn House': `House ${bnnSaturnAnalysis.saturnHouse}`,
        'Core Karma Theme': 'Building enduring institutional structures through patient mastery',
      }
    );

    // Chapter 10: Government Job / Rajya Seva Analysis
    addChapter(
      'ch10_government_job',
      'Government Job & Rajya Seva Yoga Analysis',
      10,
      `Vedic astrology evaluates public service aptitude (Rajya Seva Yoga) through the strength of the Sun (authority), Saturn (bureaucracy and public service), the 6th house (competitive exams and administrative routines), and the 10th house (apex public standing). In your chart, the Sun is situated in House ${governmentJobAnalysis.sunHouse} (${governmentJobAnalysis.sunDignity}).\n\nVerdict: ${governmentJobAnalysis.verdict}\n\nStrategic Guidance:\n${governmentJobAnalysis.recommendations.join('\n')}`,
      {
        'Rajya Seva Status': governmentJobAnalysis.rajyaSevaYogaStatus,
        'Sun Dignity': governmentJobAnalysis.sunDignity,
        'Sun-Saturn Dynamic': governmentJobAnalysis.saturnRelationship,
      }
    );

    // Chapter 11: Entrepreneurial Compass & Ashtakavarga SAV Points
    const sav = entrepreneurialCompass.ashtakavargaSavPoints;
    const comp = entrepreneurialCompass.comparativeAnalysis;
    addChapter(
      'ch11_entrepreneurial_compass',
      'Charting Entrepreneurial Waters & Ashtakavarga SAV Points',
      11,
      `The entrepreneurial compass evaluates whether the native thrives in structured employment, independent enterprise, or a balanced dual model. Analyzed through Mercury (House ${entrepreneurialCompass.mercuryHouse} in ${entrepreneurialCompass.mercurySign}), Venus (House ${entrepreneurialCompass.venusHouse} in ${entrepreneurialCompass.venusSign}), 7th lord ${entrepreneurialCompass.seventhHouseLord}, and Sarvashtakavarga (SAV) bindu distributions.\n\nAshtakavarga Sarvashtakavarga (SAV) Points:\n• 10th House (Karma / Public Action): ${sav.tenthHouse} points (Standard auspicious baseline: 28)\n• 11th House (Labha / Compounding Gains): ${sav.eleventhHouse} points\n• 7th House (Vyapar / Commercial Partnerships): ${sav.seventhHouse} points\n• 6th House (Seva / Organizational Employment): ${sav.sixthHouse} points\n• 1st House (Lagna / Self-Determination): ${sav.firstHouse} points\n\nComparative SAV Analysis:\n• 6th House vs 7th House: ${comp.sixthVsSeventhAnalysis}\n• 11th House vs 10th House: ${comp.eleventhVsTenthAnalysis}\n\nStrategic Synthesis:\n${comp.rationale}`,
      {
        '6th vs 7th Verdict': comp.sixthVsSeventhVerdict,
        '11th vs 10th Verdict': comp.eleventhVsTenthVerdict,
        'Recommended Orientation': comp.preferredOrientation,
        '11th House SAV Points': String(sav.eleventhHouse),
      },
      entrepreneurialCompass.favorableSectors
    );

    // Chapter 12: Multi-Year Career Roadmap
    const roadmapText = multiYearCareerRoadmap
      .map((mr) => `• [${mr.period} / ${mr.durationYears} Yrs] ${mr.careerPhase}\n  Planetary Alignment: ${mr.mahadasha} MD / ${mr.antardasha} AD (${mr.astrologicalBasis})\n  Opportunities: ${mr.opportunities.join(', ')}\n  Challenges: ${mr.challenges.join(', ')}\n  Strategic Action: ${mr.actionableAdvice}`)
      .join('\n\n');

    addChapter(
      'ch12_career_roadmap',
      'Chronological Multi-Year Career Roadmap (5-Year Strategic Horizon: 2026–2031)',
      12,
      `This multi-year strategic roadmap is derived dynamically from your Vimshottari Dasha sub-periods covering the 2026–2031 window. Each period reflects exact planetary timing, career themes, expansion avenues, and strategic safeguards:\n\n${roadmapText}`,
      {
        'Forecast Horizon': '2026–2031 (5-Year Window)',
        'Primary Mahadasha': currentMahadasha,
        'Total Sub-Periods': String(multiYearCareerRoadmap.length),
      }
    );

    // Chapter 13: Consecrated Remedies & Karmic Balance
    addChapter(
      'ch13_celestial_remedies',
      'Unlocking Celestial Remedies: Gemstones, Mantras & Karmic Alignment',
      13,
      `Astrological remedies in the Astro Sushil methodology do not alter destiny through superstition; they harmonize personal energetic frequencies and cultivate behavioral discipline. Calculated strictly from auspicious functional benefic houses (1st, 5th, and 9th):\n\nPrimary Gemstone: ${careerRemedies.primaryGemstone.gemstone} (${careerRemedies.primaryGemstone.sanskritName}) for ${careerRemedies.primaryGemstone.rulingPlanet}.\n${careerRemedies.primaryGemstone.benefits}\nWearing Instructions: Wear on the ${careerRemedies.primaryGemstone.finger} set in ${careerRemedies.primaryGemstone.metal} on a ${careerRemedies.primaryGemstone.day}. Caution: ${careerRemedies.primaryGemstone.caution}`,
      {
        'Primary Gemstone': careerRemedies.primaryGemstone.gemstone,
        'Secondary Gemstone': careerRemedies.secondaryGemstone?.gemstone || 'Natural Pearl',
        'Primary Mantra': careerRemedies.mantras[0]?.mantraText || 'Om Suryaya Namaha',
      },
      careerRemedies.lifestyleAndHabits
    );
  }

  // Final Chapter: Ephemeris Methodology & Legal Disclaimer
  addChapter(
    'ch_methodology_disclaimer',
    'Ephemeris Methodology, Author Note & Legal Disclaimer',
    sections.length + 1,
    `Authored by ${closingNote.author}.\n\n${closingNote.message}\n\nAstronomical Standards: ${closingNote.ephemerisStandard}\n\nLegal Notice: ${closingNote.disclaimer}`,
    {
      'Author': closingNote.author,
      'Ayanamsa': 'Lahiri (Chitra Paksha)',
      'Zodiac': 'SIDEREAL',
      'House System': 'WHOLE SIGN',
    }
  );

  // 13. Construct Complete Canonical CareerReportModel
  const reportModel: CareerReportModel = {
    version: '1.0.0',
    type: reportType,
    tier: isPro ? 'PRO' : 'BASIC',
    title: isPro ? 'Personalised Executive Career & Wealth Prosperity Dossier' : 'Personalised Vedic Career Intelligence Report',
    generatedAt: new Date().toISOString(),
    profile: {
      name: profileInput.name,
      dateOfBirth: profileInput.dateOfBirth,
      timeOfBirth: profileInput.timeOfBirth,
      placeName: profileInput.placeName ?? null,
      timezone: profileInput.timezone,
      latitude: profileInput.latitude,
      longitude: profileInput.longitude,
    },
    configuration: {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN_NODE',
    },
    ascendant: {
      sign: ascendantSign,
      degree: ascendantDegree,
      nakshatra: ascendantNakshatra,
      pada: ascendantPada,
    },
    planets,
    houses,
    nakshatra: {
      birthNakshatra: moonPlanet.nakshatra,
      pada: moonPlanet.pada,
      rulingPlanet: SIGN_LORDS[SIGN_INDEX_MAP[moonPlanet.sign.toUpperCase()] || 6]?.lord || 'Mercury',
      associatedInfo: `Janma Nakshatra ${moonPlanet.nakshatra} Pada ${moonPlanet.pada} in ${moonPlanet.sign}`,
    },
    careerOverview: {
      destinyTheme: `Professional elevation through ${ascendantSign} vitality and ${house10.sign} executive calling`,
      executiveSummary: `With Ascendant in ${ascendantSign} and 10th house in ${house10.sign} (ruled by ${house10Lord}), your professional path balances strategic endurance with structured leadership.`,
      dominantElement: ['Aries', 'Leo', 'Sagittarius'].includes(ascendantSign) ? 'Fire (Dynamic Action & Leadership)' : ['Taurus', 'Virgo', 'Capricorn'].includes(ascendantSign) ? 'Earth (Practical Execution & Wealth Building)' : ['Gemini', 'Libra', 'Aquarius'].includes(ascendantSign) ? 'Air (Intellectual Negotiation & Systems)' : 'Water (Intuitive Wisdom & Healing)',
    },
    careerHouses,
    planetarySignificators,
    careerYogas,
    d10Summary,
    suitableIndustries,
    workEnvironments,
    aptitudesAndPathways,
    sections,
    // Pro Tier Additions
    ...(isPro && {
      d10DashamshaDeepDive: d10Summary,
      amatyakaraka,
      bnnSaturnAnalysis,
      governmentJobAnalysis,
      entrepreneurialCompass,
      multiYearCareerRoadmap,
      careerRemedies,
      closingNote,
    }),
  };

  return reportModel;
}

export const generateCareerBasicReport = (
  profileInput: any,
  rawChartData: any,
  interpretationProvider?: any
) => generateCareerReport(profileInput, rawChartData, interpretationProvider, { tier: 'BASIC' });

export const generateCareerProReport = (
  profileInput: any,
  rawChartData: any,
  interpretationProvider?: any
) => generateCareerReport(profileInput, rawChartData, interpretationProvider, { tier: 'PRO' });
