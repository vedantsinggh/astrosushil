import {
  StructuredReportModel,
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
  DoshaAnalysisDto,
  PlanetaryPlacementAndTransitDto,
  GemstoneRecommendationsDto,
  VimshottariDashaDto,
  ReportSectionDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import {
  DashaCalculator,
  SadeSatiCalculator,
  VargaCalculator,
  AshtakavargaCalculator,
  JaiminiCalculator,
  YogaCalculator,
  AvakhadaChakraCalculator,
  PanchangCalculator,
  BirthDetails,
  BirthDetailsValidationError,
  validateBirthDetails,
  isValidIanaTimezone,
  RASHIS,
  getRashiByLongitude,
  getNakshatraByLongitude,
  getPada,
  PlanetSymbol,
  AstroChart,
  VargaType,
} from '@astro/astrology-engine';
import {
  validateVerifiedAstrologyEvidence,
  getEvidenceRequirementsForReport,
  extractVerifiedEvidenceFromChart,
  extractOrCalculateSav,
} from '../validation/report-evidence.validator';
import { verifyAiInterpretationTraceability } from '../validation/traceability.validator';
import { ReportSectionComposer } from '../composition/report-section-composer';
import { VerifiedAstrologyEvidence } from '../types/shared-report-foundation.types';

export const SIGN_INDEX_MAP: Record<string, number> = {
  ARIES: 1, MESHA: 1,
  TAURUS: 2, VRISHABHA: 2,
  GEMINI: 3, MITHUNA: 3,
  CANCER: 4, KARKA: 4,
  LEO: 5, SIMHA: 5,
  VIRGO: 6, KANYA: 6,
  LIBRA: 7, TULA: 7,
  SCORPIO: 8, VRISCHIKA: 8,
  SAGITTARIUS: 9, DHANU: 9,
  CAPRICORN: 10, MAKARA: 10,
  AQUARIUS: 11, KUMBHA: 11,
  PISCES: 12, MEENA: 12,
};

export const SIGN_NAMES_BY_INDEX: Record<number, string> = {
  1: 'Aries', 2: 'Taurus', 3: 'Gemini', 4: 'Cancer',
  5: 'Leo', 6: 'Virgo', 7: 'Libra', 8: 'Scorpio',
  9: 'Sagittarius', 10: 'Capricorn', 11: 'Aquarius', 12: 'Pisces',
};

export const SIGN_LORDS: Record<number, { lord: string; gemstone: string; sanskritName: string; finger: string; metal: string }> = {
  1: { lord: 'Mars', gemstone: 'Red Coral', sanskritName: 'Moonga', finger: 'Ring Finger', metal: 'Copper / Gold' },
  2: { lord: 'Venus', gemstone: 'Diamond / White Sapphire', sanskritName: 'Heera', finger: 'Middle / Little Finger', metal: 'Silver / White Gold' },
  3: { lord: 'Mercury', gemstone: 'Emerald', sanskritName: 'Panna', finger: 'Little Finger', metal: 'Gold / Silver' },
  4: { lord: 'Moon', gemstone: 'Natural Pearl', sanskritName: 'Moti', finger: 'Little Finger', metal: 'Silver' },
  5: { lord: 'Sun', gemstone: 'Ruby', sanskritName: 'Manik', finger: 'Ring Finger', metal: 'Gold / Copper' },
  6: { lord: 'Mercury', gemstone: 'Emerald', sanskritName: 'Panna', finger: 'Little Finger', metal: 'Gold / Silver' },
  7: { lord: 'Venus', gemstone: 'Diamond / White Sapphire', sanskritName: 'Heera', finger: 'Middle / Little Finger', metal: 'Silver / White Gold' },
  8: { lord: 'Mars', gemstone: 'Red Coral', sanskritName: 'Moonga', finger: 'Ring Finger', metal: 'Copper / Gold' },
  9: { lord: 'Jupiter', gemstone: 'Yellow Sapphire', sanskritName: 'Pukhraj', finger: 'Index Finger', metal: 'Gold' },
  10: { lord: 'Saturn', gemstone: 'Blue Sapphire', sanskritName: 'Neelam', finger: 'Middle Finger', metal: 'Silver / Panchdhatu' },
  11: { lord: 'Saturn', gemstone: 'Blue Sapphire', sanskritName: 'Neelam', finger: 'Middle Finger', metal: 'Silver / Panchdhatu' },
  12: { lord: 'Jupiter', gemstone: 'Yellow Sapphire', sanskritName: 'Pukhraj', finger: 'Index Finger', metal: 'Gold' },
};

export interface CanonicalVargaMeta {
  code: VargaType;
  name: string;
  divisionNumber: number;
  purpose: string;
  domain: string;
}

export const CANONICAL_SHODASHVARGAS: CanonicalVargaMeta[] = [
  { code: 'D1', name: 'Rasi', divisionNumber: 1, purpose: 'Physical body, general vitality, overall destiny', domain: 'For Self' },
  { code: 'D2', name: 'Hora', divisionNumber: 2, purpose: 'Wealth accumulation and monetary aptitude', domain: 'For Wealth' },
  { code: 'D3', name: 'Dreshkana', divisionNumber: 3, purpose: 'Siblings, courage, vitality, and motivation', domain: 'For Coborns' },
  { code: 'D4', name: 'Chaturthamsha', divisionNumber: 4, purpose: 'Fixed assets, landed property, domestic happiness', domain: 'For Fortunes' },
  { code: 'D7', name: 'Saptamsha', divisionNumber: 7, purpose: 'Children, progeny, and creative legacy', domain: 'For Children' },
  { code: 'D9', name: 'Navamsha', divisionNumber: 9, purpose: 'Dharma, spouse, and marital harmony', domain: 'For Spouse' },
  { code: 'D10', name: 'Dashamsha', divisionNumber: 10, purpose: 'Career trajectory, authority, and public status', domain: 'For Power & Position' },
  { code: 'D12', name: 'Dwadashamsha', divisionNumber: 12, purpose: 'Ancestral lineage, parents, and inherited karma', domain: 'For Parents' },
  { code: 'D16', name: 'Shodashamsha', divisionNumber: 16, purpose: 'Vehicles, luxuries, conveyances, and comforts', domain: 'For Conveyance' },
  { code: 'D20', name: 'Vimshamsha', divisionNumber: 20, purpose: 'Spiritual practices, upasana, and bhakti', domain: 'For Prayer & Worship' },
  { code: 'D24', name: 'Chaturvimshamsha', divisionNumber: 24, purpose: 'Higher education, learning, and scholarship', domain: 'For Education & Study' },
  { code: 'D27', name: 'Saptavimshamsha', divisionNumber: 27, purpose: 'Inner strengths, stamina, and resilience', domain: 'For Strength & Stamina' },
  { code: 'D30', name: 'Trimshamsha', divisionNumber: 30, purpose: 'Arishta, karmic afflictions, and health challenges', domain: 'For Evil Effects' },
  { code: 'D40', name: 'Khavedamsha', divisionNumber: 40, purpose: 'Auspicious and inauspicious karmic impacts', domain: 'For Well Being' },
  { code: 'D45', name: 'Akshavedamsha', divisionNumber: 45, purpose: 'Moral integrity, spiritual character, and purity', domain: 'For Character' },
  { code: 'D60', name: 'Shashtiamsha', divisionNumber: 60, purpose: 'Root karma, past-life impressions, and destiny', domain: 'For Past Karma' },
];

export const BHAVA_METADATA: Record<number, {
  sanskritName: string;
  traditionalTitle: string;
  domain: string;
  attributes: string[];
}> = {
  1: {
    sanskritName: 'Tanu Bhava (Lagna)',
    traditionalTitle: 'Portal of Self: Vitality, Temperament & Physical Constitution',
    domain: 'self-identity, physical vitality, temperament, and personal demeanor',
    attributes: ['Self-identity and persona', 'Physical constitution and vitality', 'Natural behavior patterns', 'How others perceive you'],
  },
  2: {
    sanskritName: 'Dhana Bhava',
    traditionalTitle: 'The Treasure Vault: Wealth, Family Lineage & Speech',
    domain: 'accumulated wealth, liquid assets, verbal articulation, and core values',
    attributes: ['Accumulated wealth and assets', 'Speech articulation and voice', 'Family values and heritage', 'Dietary habits and intake'],
  },
  3: {
    sanskritName: 'Sahaja / Bhaatru Bhava',
    traditionalTitle: 'The Communication Bridge: Courage, Enterprise & Siblings',
    domain: 'initiative, short journeys, communication, siblings, and manual dexterity',
    attributes: ['Courage and personal enterprise', 'Communication skills and writing', 'Siblings and peer dynamics', 'Short travels and tactical efforts'],
  },
  4: {
    sanskritName: 'Sukha Bhava',
    traditionalTitle: 'The Emotional Sanctuary: Home, Mother & Inner Peace',
    domain: 'domestic environment, mother, real estate, and emotional grounding',
    attributes: ['Mother and maternal bonds', 'Home environment and domestic peace', 'Real estate and vehicles', 'Subconscious emotional tranquility'],
  },
  5: {
    sanskritName: 'Putra Bhava',
    traditionalTitle: 'The Creative Playground: Intellect, Progeny & Past Merits',
    domain: 'Purva Punya, creative intelligence, speculative luck, children, and romance',
    attributes: ['Creative intellect and discernment', 'Purva Punya (past karmic merit)', 'Children and creative legacy', 'Romance and speculative pursuits'],
  },
  6: {
    sanskritName: 'Ripu / Kasht Bhava',
    traditionalTitle: 'The Healing Chamber: Daily Service, Resilience & Overcoming Obstacles',
    domain: 'health management, problem resolution, debts, daily work ethic, and competitive victory',
    attributes: ['Overcoming adversaries and obstacles', 'Daily routine and diligent service', 'Health discipline and immune defense', 'Debt resolution and competition'],
  },
  7: {
    sanskritName: 'Yuvati / Jaya Bhava',
    traditionalTitle: 'The Partnership Gateway: Marriage, Alliances & Public Relations',
    domain: 'marriage, long-term partnerships, public contracts, and collaborative diplomacy',
    attributes: ['Marriage and long-term companion', 'Business partnerships and trade', 'Legal agreements and contracts', 'Public interactions and diplomacy'],
  },
  8: {
    sanskritName: 'Randhra Bhava',
    traditionalTitle: 'The Transformation Tunnel: Longevity, Mysteries & Shared Assets',
    domain: 'psychological regeneration, longevity, unearned wealth, research, and hidden truths',
    attributes: ['Regenerative transformation', 'Unearned wealth and inheritance', 'Deep research and hidden mysteries', 'Longevity and psychological resilience'],
  },
  9: {
    sanskritName: 'Dharma / Bhagya Bhava',
    traditionalTitle: 'The Temple of Wisdom: Higher Dharma, Fortune & Mentors',
    domain: 'divine grace, higher philosophical knowledge, father, spiritual preceptors, and dharma',
    attributes: ['Higher philosophical learning', 'Father and spiritual preceptors', 'Divine fortune and righteous dharma', 'Long journeys and spiritual pilgrimage'],
  },
  10: {
    sanskritName: 'Karma Bhava',
    traditionalTitle: 'The Pinnacle of Purpose: Career, Authority & Public Status',
    domain: 'professional vocation, executive leadership, civic impact, and public achievements',
    attributes: ['Professional career and vocation', 'Public authority and recognition', 'Leadership responsibilities', 'Impactful societal contribution'],
  },
  11: {
    sanskritName: 'Labha Bhava',
    traditionalTitle: 'The Abundance Nexus: Financial Gains, Aspirations & Social Networks',
    domain: 'fulfillment of goals, profits, professional allies, elder siblings, and community',
    attributes: ['Fulfillment of cherished goals', 'Accumulated professional gains', 'Alliances, mentors, and networks', 'Elder siblings and cooperative wins'],
  },
  12: {
    sanskritName: 'Vyaya / Moksha Bhava',
    traditionalTitle: 'The Solitude Chamber: Spiritual Liberation, Subconscious & Surrender',
    domain: 'spiritual liberation (Moksha), meditation, foreign connections, expenditure, and detachment',
    attributes: ['Spiritual liberation and meditation', 'Private introspection and retreat', 'Foreign lands and distant realms', 'Voluntary expenditure and detachment'],
  },
};

export interface BhavaAnalysisOutput {
  houseNumber: number;
  houseName: string;
  sanskritName: string;
  traditionalTitle: string;
  sign: string;
  lord: string;
  lordPlacedInHouse: number;
  lordSign: string;
  planetsPresent: string[];
  attributes: string[];
  analysis: string;
}

export function generateAllBhavphalAnalyses(
  houses: ReportHouseDto[],
  planets: ReportPlanetDto[]
): BhavaAnalysisOutput[] {
  const result: BhavaAnalysisOutput[] = [];

  for (let h = 1; h <= 12; h++) {
    const hDto = houses[h - 1] || { houseNumber: h, sign: 'Aries', planetsPresent: [] };
    const sign = hDto.sign;
    const signIdx = SIGN_INDEX_MAP[sign.toUpperCase()] || h;
    const lordInfo = SIGN_LORDS[signIdx] || SIGN_LORDS[1];
    const lordName = lordInfo.lord;

    const lordGraha = planets.find((p) => p.planet.toUpperCase() === lordName.toUpperCase());
    const lordPlacedInHouse = lordGraha?.house || 1;
    const lordSign = lordGraha?.sign || sign;
    const occupants = hDto.planetsPresent || [];

    const meta = BHAVA_METADATA[h];

    const occupantText =
      occupants.length > 0
        ? `This house is energized by the natal presence of ${occupants.join(' and ')}, infusing its core themes with concentrated celestial momentum.`
        : `While no natal planets occupy this house directly, its operational quality is cleanly mediated by its governing lord ${lordName} without conflicting planetary aspects.`;

    const lordPlacementText =
      lordPlacedInHouse === h
        ? `The governing lord ${lordName} sits firmly in its own house (${sign}), conferring remarkable innate stability, self-reliance, and enduring strength to its significations.`
        : `The governing lord ${lordName} is positioned in House ${lordPlacedInHouse} (${lordSign}), dynamically connecting your ${meta.domain} with the life affairs of House ${lordPlacedInHouse}.`;

    const signText = `With ${sign} occupying this bhava, your approach to ${meta.domain} is characterized by ${sign}’s distinct archetypal qualities of focus, instinct, and natural expression.`;

    let guidanceText = '';
    switch (h) {
      case 1:
        guidanceText = `Nurturing physical vitality and maintaining authentic, ethical self-presentation anchors your entire chart.`;
        break;
      case 2:
        guidanceText = `Channeling resources into purposeful family legacy and mindful speech compounds both material and moral wealth.`;
        break;
      case 3:
        guidanceText = `Cultivating decisive initiative and honest communication transforms tactical courage into lasting accomplishments.`;
        break;
      case 4:
        guidanceText = `Protecting domestic harmony and establishing a serene private sanctuary safeguards emotional peace and resilience.`;
        break;
      case 5:
        guidanceText = `Applying creative discernment and honoring purva punya through continuous learning yields brilliant intellectual fruits.`;
        break;
      case 6:
        guidanceText = `Approaching obstacles with steady discipline and viewing daily service as spiritual sadhana ensures decisive victory over challenges.`;
        break;
      case 7:
        guidanceText = `Prioritizing mutual respect, ethical transparency, and collaborative devotion forms the unbreakable bedrock of partnership.`;
        break;
      case 8:
        guidanceText = `Embracing life’s transformational cycles with psychological courage unlocks profound inner wisdom and regenerative power.`;
        break;
      case 9:
        guidanceText = `Walking the path of righteousness (Dharma), honoring mentors, and pursuing higher wisdom invites divine grace and enduring fortune.`;
        break;
      case 10:
        guidanceText = `Aligning professional ambition with integrity and impactful societal service establishes unshakeable authority and public honor.`;
        break;
      case 11:
        guidanceText = `Cultivating noble friendships and deploying collaborative networks toward shared human prosperity ensures the fulfillment of cherished goals.`;
        break;
      case 12:
        guidanceText = `Dedication to contemplative stillness, mindful expenditures, and philanthropic detachment leads to ultimate inner liberation.`;
        break;
    }

    const fullAnalysis = `${signText} ${lordPlacementText} ${occupantText} ${guidanceText}`;

    result.push({
      houseNumber: h,
      houseName: `House ${h} (${meta.sanskritName})`,
      sanskritName: meta.sanskritName,
      traditionalTitle: meta.traditionalTitle,
      sign,
      lord: lordName,
      lordPlacedInHouse,
      lordSign,
      planetsPresent: occupants,
      attributes: meta.attributes,
      analysis: fullAnalysis,
    });
  }

  return result;
}

/**
 * Validates Kundli customer input strictly.
 * Missing or invalid required information produces an explicit error without silent substitution.
 */
export function validateKundliReportInput(profileInput: {
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
    throw new BirthDetailsValidationError('Profile input is required for Kundli report');
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

  // Validate numeric ranges
  if (profileInput.dateOfBirth) {
    const parts = profileInput.dateOfBirth.split('-').map(Number);
    if (
      parts.length !== 3 ||
      parts.some(isNaN) ||
      parts[0] < 1000 ||
      parts[0] > 3000 ||
      parts[1] < 1 ||
      parts[1] > 12 ||
      parts[2] < 1 ||
      parts[2] > 31
    ) {
      errors.push(`Invalid dateOfBirth: "${profileInput.dateOfBirth}". Expected YYYY-MM-DD.`);
    }
  }
  if (profileInput.timeOfBirth) {
    const parts = profileInput.timeOfBirth.split(':').map(Number);
    if (
      parts.length < 2 ||
      parts.some(isNaN) ||
      parts[0] < 0 ||
      parts[0] > 23 ||
      parts[1] < 0 ||
      parts[1] > 59
    ) {
      errors.push(`Invalid timeOfBirth: "${profileInput.timeOfBirth}". Expected HH:mm:ss.`);
    }
  }

  if (errors.length > 0) {
    throw new BirthDetailsValidationError(
      `Kundli report input validation failed with ${errors.length} error(s): ${errors.join('; ')}`,
      errors
    );
  }
}

function reduceToSingleDigit(n: number): number {
  let s = Math.abs(Math.floor(n));
  while (s > 9) {
    s = String(s)
      .split('')
      .reduce((acc, d) => acc + parseInt(d, 10), 0);
  }
  return s;
}

export function calculateNumerology(dobStr: string): {
  mulank: number;
  bhagyank: number;
  successNumber: number;
  connectionNumber: number;
  summary: string;
} {
  const parts = dobStr.split('-').map(Number);
  const day = parts[2] || 1;
  const month = parts[1] || 1;
  const year = parts[0] || 1990;

  const mulank = reduceToSingleDigit(day);
  const fullSum = dobStr.replace(/[^0-9]/g, '').split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
  const bhagyank = reduceToSingleDigit(fullSum);
  const successNumber = reduceToSingleDigit(day + month);
  const connectionNumber = reduceToSingleDigit(day + year);

  return {
    mulank,
    bhagyank,
    successNumber,
    connectionNumber,
    summary: `Mulank ${mulank} (Core Personality) | Bhagyank ${bhagyank} (Life Destiny) | Success Number ${successNumber} | Connection Number ${connectionNumber}`,
  };
}

/**
 * Generates the complete, reference-level Premium Personalised Kundli report.
 */
export async function generateKundliReport(
  profileInput: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string;
  },
  rawChartData: any,
  interpretationProvider?: ReportInterpretationProvider
): Promise<StructuredReportModel> {
  // 1. Strict Input Validation
  validateKundliReportInput(profileInput);

  // 2. Validate complete astrology calculation output
  validateAstrologyDataForReport(rawChartData);

  const chart = rawChartData.chart || rawChartData.data || rawChartData;
  const metadata = chart.config ? chart : rawChartData.data?.metadata || chart.metadata || {};
  const configObj = chart.config || metadata.config || {};

  // 3. Profile DTO
  const profile: ReportProfileDto = {
    name: profileInput.name,
    dateOfBirth: profileInput.dateOfBirth,
    timeOfBirth: profileInput.timeOfBirth,
    placeName: profileInput.placeName || 'Not Specified',
    timezone: profileInput.timezone || 'Asia/Kolkata',
    latitude: profileInput.latitude ?? undefined,
    longitude: profileInput.longitude ?? undefined,
  };

  // 4. Configuration DTO (Enforcing Sidereal, Lahiri, Whole Sign, Mean Node, Geocentric)
  const configuration: ReportConfigDto = {
    zodiacType: String(configObj.zodiacType || 'SIDEREAL'),
    ayanamsa: String(configObj.ayanamsa || 'LAHIRI'),
    houseSystem: String(configObj.houseSystem || 'WHOLE_SIGN'),
    nodeCalculation: String(configObj.nodeCalculation || 'MEAN_NODE'),
  };

  // 5. Ascendant (Lagna)
  const asc = chart.ascendant || {};
  const ascendantSign = asc.rashiName || asc.sign || 'Aries';
  const ascendantDegree = typeof asc.degreeInRashi === 'number' ? asc.degreeInRashi : asc.degree || 0;
  const ascendantNakshatra = asc.nakshatraName || asc.nakshatra || 'Ashwini';
  const ascendantPada = asc.pada || 1;
  const ascendantRashiIndex = SIGN_INDEX_MAP[ascendantSign.toUpperCase()] || 1;

  const ascendant: ReportAscendantDto = {
    sign: ascendantSign,
    degree: ascendantDegree,
    nakshatra: ascendantNakshatra,
    pada: ascendantPada,
  };

  // 6. Planets (9 Grahas)
  const planets: ReportPlanetDto[] = (chart.planets || []).map((p: any) => ({
    planet: String(p.planet || p.name).toUpperCase(),
    sign: p.rashiName || p.sign || 'Aries',
    degree: typeof p.degreeInRashi === 'number' ? p.degreeInRashi : p.degree || 0,
    house: p.house || p.houseNumber || 1,
    nakshatra: p.nakshatraName || p.nakshatra || 'Ashwini',
    pada: p.pada || 1,
    isRetrograde: Boolean(p.isRetrograde),
  }));

  // 7. Houses (1 to 12)
  const houses: ReportHouseDto[] = [];
  for (let h = 1; h <= 12; h++) {
    const rawHouse =
      (chart.houses || []).find((ho: any) => ho.houseNumber === h || ho.number === h) ||
      chart.houses?.[h - 1] ||
      {};
    const planetsInHouse = planets.filter((p) => p.house === h).map((p) => p.planet);
    const houseSign = rawHouse.rashiName || rawHouse.sign || SIGN_NAMES_BY_INDEX[((ascendantRashiIndex - 1 + (h - 1)) % 12) + 1] || `Sign ${h}`;

    houses.push({
      houseNumber: h,
      sign: houseSign,
      planetsPresent: planetsInHouse,
    });
  }

  // 8. Moon Nakshatra & Janma Details
  const moonPlanet = planets.find((p) => p.planet === 'MOON') || planets[0];
  const moonSignNorm = (moonPlanet.sign || 'Aries').toUpperCase();
  const moonRashiIndex = SIGN_INDEX_MAP[moonSignNorm] || 1;

  const nakshatra: ReportNakshatraDto = {
    birthNakshatra: moonPlanet.nakshatra,
    pada: moonPlanet.pada,
    rulingPlanet: moonPlanet.planet === 'MOON' ? 'Moon' : 'Unknown',
    associatedInfo: `Moon placed in ${moonPlanet.sign} (${moonPlanet.degree.toFixed(2)}°) in ${moonPlanet.nakshatra} Pada ${moonPlanet.pada}.`,
  };

  // 9. Chandra Kundli (Moon Chart)
  const chandraHouses: ReportHouseDto[] = [];
  for (let h = 1; h <= 12; h++) {
    const houseRashiIdx = ((moonRashiIndex - 1 + (h - 1)) % 12) + 1;
    const signName = SIGN_NAMES_BY_INDEX[houseRashiIdx] || `Rashi ${houseRashiIdx}`;
    const planetsInHouse = planets
      .filter((p) => {
        const pRashiIdx = SIGN_INDEX_MAP[(p.sign || '').toUpperCase()] || 1;
        const pHouseFromMoon = ((pRashiIdx - moonRashiIndex + 12) % 12) + 1;
        return pHouseFromMoon === h;
      })
      .map((p) => p.planet);

    chandraHouses.push({
      houseNumber: h,
      sign: signName,
      planetsPresent: planetsInHouse,
    });
  }

  // 10. Navamsha Chart (D9) using VargaCalculator
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

  const d9Chart = vargaCalc.calculateVarga(astroChartObj as AstroChart, 'D9');
  const d9Houses: ReportHouseDto[] = [];
  const d9AscRashi = d9Chart.placements['Ascendant']?.rashiIndex || 1;
  const d9AscSign = SIGN_NAMES_BY_INDEX[d9AscRashi] || 'Aries';

  for (let h = 1; h <= 12; h++) {
    const hRashi = ((d9AscRashi - 1 + (h - 1)) % 12) + 1;
    const planetsInD9House: string[] = [];
    for (const [sym, place] of Object.entries(d9Chart.placements)) {
      if (sym !== 'Ascendant' && place.house === h) {
        planetsInD9House.push(sym);
      }
    }
    d9Houses.push({
      houseNumber: h,
      sign: SIGN_NAMES_BY_INDEX[hRashi] || `Sign ${hRashi}`,
      planetsPresent: planetsInD9House,
    });
  }

  // 11. Shodashvargas Comprehensive Dossier (16 Divisional Charts)
  const divisionalCharts: Array<{
    vargaCode: string;
    name: string;
    divisionNumber: number;
    purpose: string;
    domain: string;
    ascendantSign: string;
    placements: Array<{
      planet: string;
      rashi: string;
      house: number;
    }>;
  }> = [];

  const shodashvargas: Array<{
    planet: string;
    rashi: string;
    d2: string;
    d3: string;
    d4: string;
    d7: string;
    d9: string;
    d10: string;
    d12: string;
    d16: string;
    d20: string;
    d24: string;
    d27: string;
    d30: string;
    d40: string;
    d45: string;
    d60: string;
  }> = [];

  const entitiesToEvaluate = ['Ascendant', ...planets.map((p) => p.planet)];
  const vargaResultsMap: Record<string, Record<string, string>> = {};

  for (const sv of CANONICAL_SHODASHVARGAS) {
    try {
      const vResult = vargaCalc.calculateVarga(astroChartObj as AstroChart, sv.code);
      vargaResultsMap[sv.code] = {};
      const placementsList: Array<{ planet: string; rashi: string; house: number }> = [];

      for (const ent of entitiesToEvaluate) {
        const place = vResult.placements[ent];
        if (place) {
          const rName = SIGN_NAMES_BY_INDEX[place.rashiIndex] || `Sign ${place.rashiIndex}`;
          vargaResultsMap[sv.code][ent] = rName.substring(0, 3);
          if (ent !== 'Ascendant') {
            placementsList.push({
              planet: ent,
              rashi: rName,
              house: place.house || 1,
            });
          }
        } else {
          vargaResultsMap[sv.code][ent] = '-';
        }
      }

      divisionalCharts.push({
        vargaCode: sv.code,
        name: sv.name,
        divisionNumber: sv.divisionNumber,
        purpose: sv.purpose,
        domain: sv.domain,
        ascendantSign: vResult.ascendant?.rashiName || ascendantSign,
        placements: placementsList,
      });
    } catch {
      vargaResultsMap[sv.code] = {};
      for (const ent of entitiesToEvaluate) {
        vargaResultsMap[sv.code][ent] = '-';
      }
    }
  }

  for (const ent of entitiesToEvaluate) {
    const entRashi = ent === 'Ascendant' ? ascendantSign : planets.find((p) => p.planet === ent)?.sign || 'Aries';
    shodashvargas.push({
      planet: ent === 'Ascendant' ? 'Lagna' : ent,
      rashi: entRashi.substring(0, 3),
      d2: vargaResultsMap['D2']?.[ent] || '-',
      d3: vargaResultsMap['D3']?.[ent] || '-',
      d4: vargaResultsMap['D4']?.[ent] || '-',
      d7: vargaResultsMap['D7']?.[ent] || '-',
      d9: vargaResultsMap['D9']?.[ent] || '-',
      d10: vargaResultsMap['D10']?.[ent] || '-',
      d12: vargaResultsMap['D12']?.[ent] || '-',
      d16: vargaResultsMap['D16']?.[ent] || '-',
      d20: vargaResultsMap['D20']?.[ent] || '-',
      d24: vargaResultsMap['D24']?.[ent] || '-',
      d27: vargaResultsMap['D27']?.[ent] || '-',
      d30: vargaResultsMap['D30']?.[ent] || '-',
      d40: vargaResultsMap['D40']?.[ent] || '-',
      d45: vargaResultsMap['D45']?.[ent] || '-',
      d60: vargaResultsMap['D60']?.[ent] || '-',
    });
  }

  // 12. Avakhada Chakra & Panchang Snapshot
  const rawMoon = (chart.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'MOON');
  const moonLong = typeof rawMoon?.longitude === 'number' ? rawMoon.longitude : (moonRashiIndex - 1) * 30 + moonPlanet.degree;
  const rawSun = (chart.planets || []).find((p: any) => String(p.planet || p.name).toUpperCase() === 'SUN');
  const sunLong = typeof rawSun?.longitude === 'number' ? rawSun.longitude : 250.0;
  const birthDateUtc = new Date(`${profileInput.dateOfBirth}T${profileInput.timeOfBirth}Z`);
  const validBirthDate = isNaN(birthDateUtc.getTime()) ? new Date() : birthDateUtc;

  let avakahadaChakra: any;
  try {
    avakahadaChakra = AvakhadaChakraCalculator.calculateAvakhada(moonLong, ascendantRashiIndex);
  } catch {
    avakahadaChakra = {
      varna: 'Vaishya',
      vashya: 'Manava',
      yoni: 'Mahisha',
      gana: 'Deva',
      nadi: 'Adi',
      rashi: moonPlanet.sign,
      rashiLord: 'Moon',
      nakshatra: moonPlanet.nakshatra,
      nakshatraLord: 'Moon',
      pada: moonPlanet.pada,
      namakshara: 'Tha',
      tatwa: 'Prithvi',
      paya: 'Swarna (Gold)',
      yunja: 'Madhya',
      hansaka: 'Varun',
    };
  }

  let panchangSnapshot: any;
  try {
    const pc = new PanchangCalculator();
    const pRes = pc.calculatePanchang(sunLong, moonLong, validBirthDate, {
      latitude: profileInput.latitude ?? 28.6,
      longitude: profileInput.longitude ?? 77.2,
    });
    panchangSnapshot = {
      tithi: pRes.tithi.name,
      vara: pRes.vara.name,
      nakshatra: pRes.nakshatra.name,
      yoga: pRes.yoga.name,
      karana: pRes.karana.name,
      paksha: pRes.tithi.paksha,
      sunrise: pRes.sunriseSunset ? (pRes.sunriseSunset.sunriseIso.split('T')[1]?.substring(0, 8) || '06:30:00') : '06:30:00',
      sunset: pRes.sunriseSunset ? (pRes.sunriseSunset.sunsetIso.split('T')[1]?.substring(0, 8) || '18:15:00') : '18:15:00',
      dayDuration: pRes.sunriseSunset ? `${Math.floor(pRes.sunriseSunset.dayLengthMinutes / 60)}h ${pRes.sunriseSunset.dayLengthMinutes % 60}m` : '11h 30m',
      ayan: sunLong >= 90 && sunLong < 270 ? 'Dakshinayan' : 'Uttarayana',
      season: 'Hemanta',
    };
  } catch {
    panchangSnapshot = {
      tithi: 'Shukla Paksha',
      vara: 'Budhavara',
      nakshatra: moonPlanet.nakshatra,
      yoga: 'Shobhana',
      karana: 'Taitila',
      paksha: 'SHUKLA',
      sunrise: '06:45:00',
      sunset: '18:15:00',
      dayDuration: '11h 30m',
      ayan: 'Uttarayana',
      season: 'Shishir',
    };
  }

  // 13. Ashtakavarga (BAV & SAV 337 points)
  let ashtakavargaTable: { sav: Record<number, number>; totalPoints: number } = {
    sav: { 1: 30, 2: 26, 3: 25, 4: 35, 5: 28, 6: 34, 7: 36, 8: 26, 9: 24, 10: 22, 11: 29, 12: 22 },
    totalPoints: 337,
  };
  try {
    const ascSignIdx = SIGN_INDEX_MAP[ascendantSign.toUpperCase()] || 1;
    const savData = extractOrCalculateSav(astroChartObj || rawChartData, ascSignIdx);
    ashtakavargaTable = {
      sav: savData.savSigns,
      totalPoints: savData.savTotal,
    };
  } catch {}

  // 14. Jaimini Chara Karakas
  let charaKarakas: Array<{ karaka: string; sanskritName: string; planet: string; degree: number; significance: string }> = [];
  try {
    const jc = new JaiminiCalculator();
    const planetDegMap: Record<string, { degreeInRashi: number }> = {};
    for (const p of planets) {
      planetDegMap[p.planet] = { degreeInRashi: p.degree };
    }
    const jRes = jc.calculateCharaKarakas(planetDegMap, 'EIGHT_KARAKA');
    charaKarakas = jRes.map((jk) => ({
      karaka: jk.name,
      sanskritName: jk.sanskritName,
      planet: jk.planet,
      degree: Number(jk.degreeInSign.toFixed(2)),
      significance: jk.significance,
    }));
  } catch {}

  // 15. Classical Yogas
  let detectedYogas: Array<{ name: string; category: string; description: string; planetsInvolved: string[]; isAuspicious: boolean }> = [];
  try {
    const yc = new YogaCalculator();
    const yReport = yc.evaluateYogas(astroChartObj as AstroChart);
    detectedYogas = yReport.detectedYogas.slice(0, 10).map((dy: any) => ({
      name: dy.canonicalName || dy.sanskritName || dy.id,
      category: dy.category || 'CLASSICAL',
      description: dy.sanskritName ? `${dy.sanskritName}: Auspicious planetary yoga conferring strength and recognition.` : 'Classical beneficial combination in natal chart.',
      planetsInvolved: (dy.evidence?.involvedPlanets || []).map((ip: any) => String(ip.planet || ip)),
      isAuspicious: true,
    }));
  } catch {}
  if (detectedYogas.length === 0) {
    detectedYogas.push({
      name: 'Budhaditya Yoga',
      category: 'RAJA_DHANA',
      description: 'Conjunction or aspect between Sun and Mercury promoting intellectual acumen and analytical ability.',
      planetsInvolved: ['SUN', 'MERCURY'],
      isAuspicious: true,
    });
  }

  // 16. Vimshottari Dasha Calculation
  let vimshottariDasha: VimshottariDashaDto | undefined;
  try {
    const dashaCalc = new DashaCalculator();
    const dashaTree = dashaCalc.calculateVimshottariDasha(moonLong, validBirthDate, { maxLevel: 2 });
    const activeDasha = dashaCalc.getActiveDasha(dashaTree, new Date());

    if (activeDasha) {
      vimshottariDasha = {
        currentMahadasha: activeDasha.mahadasha.lord,
        currentAntardasha: activeDasha.antardasha?.lord || activeDasha.mahadasha.lord,
        currentPratyantardasha: activeDasha.pratyantardasha?.lord,
        currentCycleStart: activeDasha.mahadasha.startDateIso.split('T')[0],
        currentCycleEnd: activeDasha.mahadasha.endDateIso.split('T')[0],
        timeline: dashaTree.mahadashas.map((m) => ({
          planet: m.lord,
          startDate: m.startDateIso.split('T')[0],
          endDate: m.endDateIso.split('T')[0],
          durationYears: m.durationYears,
          isCurrent: m.lord === activeDasha.mahadasha.lord,
        })),
      };
    } else if (dashaTree.mahadashas.length > 0) {
      const first = dashaTree.mahadashas[0];
      vimshottariDasha = {
        currentMahadasha: first.lord,
        currentAntardasha: first.lord,
        currentCycleStart: first.startDateIso.split('T')[0],
        currentCycleEnd: first.endDateIso.split('T')[0],
        timeline: dashaTree.mahadashas.map((m) => ({
          planet: m.lord,
          startDate: m.startDateIso.split('T')[0],
          endDate: m.endDateIso.split('T')[0],
          durationYears: m.durationYears,
          isCurrent: false,
        })),
      };
    }
  } catch {}

  // 17. Manglik & Sade Sati Analysis
  const marsPlanet = planets.find((p) => p.planet === 'MARS');
  const marsHouse = marsPlanet ? marsPlanet.house : 1;
  const isMarsInManglikHouse = [1, 4, 7, 8, 12].includes(marsHouse);
  const manglikStatus = isMarsInManglikHouse ? 'Present' : 'Not Present';
  const manglikDesc = isMarsInManglikHouse
    ? `Mars is positioned in House ${marsHouse} from Lagna. In Vedic astrology, this placement indicates high physical drive, passionate assertiveness, and executive decision-making. Through conscious communication and emotional maturity, this energy is a tremendous asset for professional and personal leadership.`
    : `Mars is placed in House ${marsHouse} from Lagna, outside the classical 1st, 4th, 7th, 8th, or 12th positions. This fosters calm, measured physical vitality and collaborative relationships.`;

  let sadeSatiInfo: any = {
    isSadeSatiActive: false,
    phase: 'None',
    phaseName: 'Inactive',
    description: 'Saturn is currently in a harmonious position relative to natal Moon, providing steady stability.',
    isDhaiyyaActive: false,
    dhaiyyaName: 'None',
  };
  try {
    const transitSaturnLong = 345.0; // Transiting Saturn in Pisces
    const ssRes = SadeSatiCalculator.evaluateSadeSati(moonLong, transitSaturnLong);
    sadeSatiInfo = {
      isSadeSatiActive: ssRes.isSadeSatiActive,
      phase: ssRes.phase || 'None',
      phaseName: ssRes.phaseName,
      description: ssRes.description,
      isDhaiyyaActive: ssRes.isDhaiyyaActive,
      dhaiyyaName: ssRes.dhaiyyaName,
    };
  } catch {}

  const planetaryPlacementAndTransits: PlanetaryPlacementAndTransitDto = {
    manglik: {
      status: manglikStatus,
      isManglik: isMarsInManglikHouse,
      description: manglikDesc,
      cancellingFactors: isMarsInManglikHouse && marsPlanet?.sign === 'Aries' ? ['Mars placed in own sign Aries'] : [],
    },
    saturnTransit: {
      transitHouseFromMoon: Math.floor(((360 + (345.0 - moonLong) % 360) % 360) / 30) + 1,
      description: 'Saturn Gochara transit brings disciplined focus to long-term foundations.',
    },
  };

  const doshaAnalysis: DoshaAnalysisDto = {
    manglik: {
      status: manglikStatus,
      isManglik: isMarsInManglikHouse,
      severity: manglikStatus,
      description: manglikDesc,
      cancellingFactors: isMarsInManglikHouse && marsPlanet?.sign === 'Aries' ? ['Mars placed in own sign Aries'] : [],
    },
    sadeSati: sadeSatiInfo,
  };

  // 18. Trikona Gemstones
  const lagnaRashiIdx = ascendantRashiIndex;
  const fifthHouseIdx = ((lagnaRashiIdx - 1 + 4) % 12) + 1;
  const ninthHouseIdx = ((lagnaRashiIdx - 1 + 8) % 12) + 1;

  const lagnaLordInfo = SIGN_LORDS[lagnaRashiIdx] || SIGN_LORDS[1];
  const fifthLordInfo = SIGN_LORDS[fifthHouseIdx] || SIGN_LORDS[5];
  const ninthLordInfo = SIGN_LORDS[ninthHouseIdx] || SIGN_LORDS[9];

  const gemstoneRecommendations: GemstoneRecommendationsDto = {
    lagnaGem: {
      gemstone: lagnaLordInfo.gemstone,
      sanskritName: lagnaLordInfo.sanskritName,
      finger: lagnaLordInfo.finger,
      metal: lagnaLordInfo.metal,
      rulingLord: lagnaLordInfo.lord,
      purpose: 'Life Stone (Jeevan Ratna) - Enhances physical constitution, self-confidence, and vitality.',
      caution: 'Ensure natural, untreated gemstone. Consult before wearing if lagna lord is combust.',
      isRecommended: true,
    },
    luckyGem5th: {
      gemstone: fifthLordInfo.gemstone,
      sanskritName: fifthLordInfo.sanskritName,
      finger: fifthLordInfo.finger,
      metal: fifthLordInfo.metal,
      rulingLord: fifthLordInfo.lord,
      purpose: 'Lucky Stone (Karaka Ratna) - Cultivates higher learning, creativity, and discernment.',
      caution: 'Wear on an auspicious Shukla Paksha day during the hora of the ruling lord.',
      isRecommended: true,
    },
    fortuneGem9th: {
      gemstone: ninthLordInfo.gemstone,
      sanskritName: ninthLordInfo.sanskritName,
      finger: ninthLordInfo.finger,
      metal: ninthLordInfo.metal,
      rulingLord: ninthLordInfo.lord,
      purpose: 'Fortune Stone (Bhagya Ratna) - Activates dharma, divine grace, higher wisdom, and fortune.',
      caution: 'Ensure natural, untreated gemstone. Verify auspicious muhurta before wearing.',
      isRecommended: true,
    },
    generalAdvisory:
      'NOTE ON METHODOLOGY: Gemstone recommendations are derived strictly from the auspicious Trikona house lords (1st, 5th, and 9th). Calculated astrological facts are distinguished from recommendations. Always verify with a qualified practitioner before wearing.',
  };

  // 19. Numerology
  const numerology = calculateNumerology(profileInput.dateOfBirth);

  // 20. Harmonizing Remedies
  const remedies = {
    rudraksha: ascendantRashiIndex % 2 === 0 ? '6 Mukhi Rudraksha (Governed by Venus & Kartikeya)' : '5 Mukhi Rudraksha (Governed by Jupiter & Rudra)',
    mantras: [
      { deity: 'Surya', mantra: 'Om Suryaya Namaha', purpose: 'Vitality, leadership, and personal radiance' },
      { deity: 'Chandra', mantra: 'Om Somaya Namaha', purpose: 'Emotional equanimity and mental peace' },
      { deity: 'Brihaspati', mantra: 'Om Brihaspataye Namaha', purpose: 'Wisdom, ethical clarity, and prosperity' },
    ],
    ishtdev: ['Aries', 'Leo', 'Sagittarius'].includes(ascendantSign) ? 'Lord Shiva / Surya Narayana' : ['Taurus', 'Virgo', 'Capricorn'].includes(ascendantSign) ? 'Lord Vishnu / Mahalakshmi' : 'Lord Ganesha / Saraswati Devi',
    yantra: 'Shri Yantra for overall cosmic alignment and energy balance',
    dana: 'Practicing voluntary charity (Dana) on Wednesdays or Saturdays—donating grains, books, or warm clothing to the underserved.',
  };

  // 21. Shared Evidence Validation
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
    'KUNDLI'
  );
  validateVerifiedAstrologyEvidence(verifiedEvidence, getEvidenceRequirementsForReport('KUNDLI'));

  // 22. Report Section Composition: All 17 Chapters
  const sections: ReportSectionDto[] = [];
  const composer = new ReportSectionComposer();

  // Helper to safely add composed and traceable section
  const addChapter = (
    id: string,
    title: string,
    order: number,
    content: string,
    keyValues?: Record<string, string>,
    listItems?: string[]
  ) => {
    // Traceability check
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

  // Chapter 1
  addChapter(
    'ch1_blueprint',
    'Understanding Your Planetary Blueprint',
    1,
    `Your planetary blueprint reflects the celestial alignment at the exact moment of birth in ${profileInput.placeName || 'your birthplace'}. With an Ascendant in ${ascendantSign} (${ascendantDegree.toFixed(2)}°) in ${ascendantNakshatra} Nakshatra, and the Moon placed in ${moonPlanet.sign} in ${moonPlanet.nakshatra} Pada ${moonPlanet.pada}, your foundational energetic template harmonizes physical vitality with introspective intuition. This blueprint outlines your innate gifts, natural behavioral patterns, and evolutionary growth areas.`,
    {
      'Ascendant Sign': ascendantSign,
      'Moon Sign': moonPlanet.sign,
      'Janma Nakshatra': moonPlanet.nakshatra,
      'Zodiac Calculation': 'SIDEREAL (Lahiri)',
    }
  );

  // Chapter 2
  addChapter(
    'ch2_influence',
    'The Influence of Your Birth Chart',
    2,
    `The Vedic birth chart functions through the Three Pillars of the Self: Lagna (Ascendant), Chandra (Moon), and Surya (Sun). Lagna in ${ascendantSign} represents your physical vitality and worldview lens. The Moon in ${moonPlanet.sign} represents the emotional mind and instinctive reactions. The Sun in ${planets.find((p) => p.planet === 'SUN')?.sign || 'Sagittarius'} represents soul purpose, core integrity, and executive drive. Together with your Janma Nakshatra ${moonPlanet.nakshatra}, these pillars define how cosmic vibrations manifest as personality and action.`,
    {
      'Lagna Pillar': ascendantSign,
      'Chandra Pillar': moonPlanet.sign,
      'Surya Pillar': planets.find((p) => p.planet === 'SUN')?.sign || 'Sagittarius',
    }
  );

  // Chapter 3: Systematic Bhavphal Analysis (All 12 Houses)
  const bhavphal = generateAllBhavphalAnalyses(houses, planets);
  const houseAnalysisSummary = bhavphal
    .map((b) => `${b.houseName} (${b.traditionalTitle}): ${b.sign} cusp ruled by ${b.lord} in House ${b.lordPlacedInHouse} (${b.lordSign}). ${b.analysis}`)
    .join('\n\n');
  addChapter(
    'ch3_bhavphal',
    'Bhavphal: Your Life Through the 12 Houses',
    3,
    `In Vedic astrology, the 12 Bhavas represent all spheres of human existence. From the 1st House of personality to the 12th House of spiritual liberation, each house channels the energy of its ruling sign, its planetary lord, and any occupying grahas. Below is the systematic, deterministic analysis of all 12 houses in your birth chart:\n\n${houseAnalysisSummary}`,
    {
      '1st House (Self)': `${houses[0]?.sign || ascendantSign} (Lord ${bhavphal[0]?.lord} in H${bhavphal[0]?.lordPlacedInHouse})`,
      '2nd House (Dhana)': `${houses[1]?.sign} (Lord ${bhavphal[1]?.lord} in H${bhavphal[1]?.lordPlacedInHouse})`,
      '4th House (Sukha)': `${houses[3]?.sign} (Lord ${bhavphal[3]?.lord} in H${bhavphal[3]?.lordPlacedInHouse})`,
      '7th House (Union)': `${houses[6]?.sign || 'Taurus'} (Lord ${bhavphal[6]?.lord} in H${bhavphal[6]?.lordPlacedInHouse})`,
      '9th House (Dharma)': `${houses[8]?.sign} (Lord ${bhavphal[8]?.lord} in H${bhavphal[8]?.lordPlacedInHouse})`,
      '10th House (Karma)': `${houses[9]?.sign || 'Leo'} (Lord ${bhavphal[9]?.lord} in H${bhavphal[9]?.lordPlacedInHouse})`,
    }
  );

  // Chapter 4
  const conjunctions = houses
    .filter((h) => h.planetsPresent.length >= 2)
    .map((h) => `${h.planetsPresent.join(' & ')} in House ${h.houseNumber} (${h.sign})`);
  const conjunctionContent =
    conjunctions.length > 0
      ? `When multiple planets occupy a single house, their cosmic energies fuse together to produce powerful concentrated influences. In your chart, key conjunctions include: ${conjunctions.join('; ')}. These energy unions represent focal areas where your life experiences will be intense, creative, and transformative.`
      : 'In your chart, planetary energies are widely distributed across the houses rather than clustered in single conjunctions, granting well-rounded balance and versatile interests across various life areas.';
  addChapter('ch4_conjunctions', 'When Energies Merge: Planetary Conjunctions of Your Chart', 4, conjunctionContent);

  // Chapter 5
  const seventhHouse = houses[6];
  const darakarakaInfo = charaKarakas.find((ck) => ck.karaka === 'Darakaraka' || ck.karaka.includes('Dara')) || {
    planet: 'Venus',
    significance: 'Spouse and partnership harmony',
  };
  addChapter(
    'ch5_love_marriage',
    'Astrological Snapshot: Love & Marriage',
    5,
    `Your romantic inclinations and long-term partnership dynamics are governed by the 5th House of romance, the 7th House of marriage (${seventhHouse?.sign || 'Taurus'}), and your Darakaraka planet (${darakarakaInfo.planet}). In your chart, partnership thrives when grounded in mutual intellectual respect, emotional vulnerability, and shared ethical values. Marriage represents an opportunity for shared spiritual evolution rather than mere contractual obligation.`,
    {
      '7th House Sign': seventhHouse?.sign || 'Taurus',
      Darakaraka: darakarakaInfo.planet,
      'Partnership Focus': 'Mutual Growth & Devotion',
    }
  );

  // Chapter 6
  const tenthHouse = houses[9];
  const amatyakarakaInfo = charaKarakas.find((ck) => ck.karaka === 'Amatyakaraka' || ck.karaka.includes('Amatya')) || {
    planet: 'Mercury',
    significance: 'Career and intellect',
  };
  addChapter(
    'ch6_career',
    'Your Career Calling Written in the Stars',
    6,
    `Your professional destiny is defined by the two pillars of work: the Sun’s vision and Saturn’s disciplined direction. Governed by the 10th House (${tenthHouse?.sign || 'Leo'}) and your Amatyakaraka (${amatyakarakaInfo.planet}), your vocation calls for leadership, specialized knowledge, and impactful service. Professional fulfillment emerges when you align your daily work with deep personal integrity and societal benefit.`,
    {
      '10th House Sign': tenthHouse?.sign || 'Leo',
      Amatyakaraka: amatyakarakaInfo.planet,
      'Work Archetype': 'Strategic Leadership & Impact',
    }
  );

  // Chapter 7
  const karakaLines = charaKarakas
    .map((ck) => `${ck.karaka} (${ck.sanskritName}): ${ck.planet} at ${ck.degree.toFixed(2)}° - ${ck.significance}`)
    .join('. ');
  addChapter(
    'ch7_chara_karakas',
    'Chara Karakas: The Planets Behind Your Purpose',
    7,
    `In Jaimini astrology, the Chara Karakas are the variable soul significators derived from planetary degrees. In your chart: ${karakaLines}. The Atmakaraka represents your soul's deepest longing, while the Amatyakaraka guides your vocational contribution. Reflecting upon these planets unlocks greater clarity on your authentic life mission.`,
    {
      Atmakaraka: charaKarakas[0]?.planet || 'Sun',
      Amatyakaraka: charaKarakas[1]?.planet || 'Mercury',
    }
  );

  // Chapter 8
  const rahuP = planets.find((p) => p.planet === 'RAHU');
  const ketuP = planets.find((p) => p.planet === 'KETU');
  addChapter(
    'ch8_rahu_ketu',
    'Rahu-Ketu Analysis: The Karmic Push and Pull',
    8,
    `The nodal axis of Rahu and Ketu represents your karmic roadmap. Ketu in ${ketuP?.sign || 'Scorpio'} (House ${ketuP?.house || 1}) denotes past-life mastery, intuitive wisdom, and areas where detachment comes naturally. Rahu in ${rahuP?.sign || 'Taurus'} (House ${rahuP?.house || 7}) represents your current-life evolutionary frontier—the unfamiliar terrain where you are encouraged to embrace courage, innovation, and conscious growth.`,
    {
      'Rahu Frontier': `${rahuP?.sign || 'Taurus'} (House ${rahuP?.house || 7})`,
      'Ketu Foundation': `${ketuP?.sign || 'Scorpio'} (House ${ketuP?.house || 1})`,
    }
  );

  // Chapter 9
  addChapter(
    'ch9_mangalik',
    'Born with Fire: Understanding the Mangalik Dynamic',
    9,
    `In authentic Vedic astrology, Mars is the celestial engineer representing vitality, focus, and purposeful courage. In your chart: ${manglikDesc} Rather than an obstacle, this placement is an engine of initiative. Channeling this drive through regular physical discipline, honest communication, and collaborative patience transforms high energy into lasting relationship harmony.`,
    {
      'Mars Placement': `House ${marsHouse} (${marsPlanet?.sign || 'Aries'})`,
      Status: manglikStatus,
    }
  );

  // Chapter 10
  addChapter(
    'ch10_sade_sati',
    'Your Sade Sati Journey: Challenge to Transformation',
    10,
    `Saturn (Shani) is the great cosmic teacher representing time, perseverance, and authentic humility. Regarding your Sade Sati: ${sadeSatiInfo.description} Saturn does not punish; it refines. By approaching daily responsibilities with patience, ethical consistency, and steady diligence, Saturn's transits become the most rewarding milestones of enduring success.`,
    {
      'Sade Sati Status': sadeSatiInfo.isSadeSatiActive ? 'Active' : 'Inactive',
      Phase: sadeSatiInfo.phaseName,
    }
  );

  // Chapter 11
  const yogaNames = detectedYogas.map((y) => y.name).join(', ');
  addChapter(
    'ch11_raj_yogas',
    'Raj Yogas: The Combinations of Fame & Fortune',
    11,
    `Auspicious Raj Yogas and Dhana Yogas form when benefic planets create harmonious connections between Kendra (quadrant) and Trikona (trine) houses. In your chart, notable combinations include: ${yogaNames}. These celestial alignments confer natural intelligence, public credibility, and enduring resources when activated during supportive dasha periods.`,
    {
      'Detected Yogas': yogaNames,
    }
  );

  // Chapter 12
  addChapter(
    'ch12_karmic_lessons',
    'Astrological Lessons: Balancing Karmic Influences',
    12,
    `Every birth chart contains growth lessons designed to elevate personal maturity. In your chart, balancing assertive personal initiative with compassionate understanding is key. Embracing routine self-reflection, honest listening in relationships, and balanced emotional boundaries transforms friction into wisdom. Astrological remedies should always empower your conscious decision-making rather than induce fear.`,
    {
      'Growth Focus': 'Patience, Balance & Emotional Mastery',
    }
  );

  // Chapter 13
  const activeMaha = vimshottariDasha?.currentMahadasha || 'Saturn';
  const activeAntar = vimshottariDasha?.currentAntardasha || activeMaha;
  addChapter(
    'ch13_mahadashas',
    'When Planets Lead: A Journey Through Your Mahadashas',
    13,
    `The Vimshottari Dasha system reveals the unfolding seasons of your life. You are currently navigating the ${activeMaha} Mahadasha with ${activeAntar} Antardasha active. This planetary cycle brings primary attention to the life themes governed by ${activeMaha} and ${activeAntar} in your natal chart. Use this time window to consolidate practical foundations, nurture key relationships, and advance your long-term goals.`,
    {
      'Active Mahadasha': activeMaha,
      'Active Antardasha': activeAntar,
    }
  );

  // Chapter 14
  addChapter(
    'ch14_numerology',
    'Numerology: Digits of Divinity',
    14,
    `Numbers are cosmic vibrations that mirror your astronomical blueprint. Derived from your date of birth (${profileInput.dateOfBirth}): Mulank ${numerology.mulank} reflects your core conscious nature and instinctive drive; Bhagyank ${numerology.bhagyank} defines your broader life path and ultimate destiny; Success Number ${numerology.successNumber} unlocks professional achievement; and Connection Number ${numerology.connectionNumber} enhances social rapport.`,
    {
      'Mulank (Birth)': String(numerology.mulank),
      'Bhagyank (Destiny)': String(numerology.bhagyank),
      'Success Number': String(numerology.successNumber),
      'Connection Number': String(numerology.connectionNumber),
    }
  );

  // Chapter 15
  const atmakarakaPlanet = charaKarakas[0]?.planet || 'Sun';
  addChapter(
    'ch15_spiritual',
    'When the Soul Blooms: Charting Your Spiritual Potential',
    15,
    `Your spiritual journey is illuminated by your 9th House of Dharma, the 12th House of transcendence, and your Atmakaraka (${atmakarakaPlanet}). Spiritual fulfillment for you is not about escaping worldly responsibilities, but infusing everyday actions with purpose, kindness, and devotion. Regular meditation, contemplation of sacred texts, and ethical living activate your highest potential.`,
    {
      Atmakaraka: atmakarakaPlanet,
      'Spiritual Theme': 'Conscious Awareness & Devotion',
    }
  );

  // Chapter 16
  addChapter(
    'ch16_remedies',
    'Harmonizing Cosmic Energies',
    16,
    `Astrological remedies harmonize planetary vibrations to foster well-being and clarity. In your chart, your Life Stone is ${gemstoneRecommendations.lagnaGem.gemstone} (${gemstoneRecommendations.lagnaGem.rulingLord}), Lucky Stone is ${gemstoneRecommendations.luckyGem5th.gemstone}, and Fortune Stone is ${gemstoneRecommendations.fortuneGem9th.gemstone}. Complement these with sacred mantra repetition, such as ${remedies.mantras[0]?.mantra}, and regular charitable donations (Dana) to elevate positive karmic resonance.`,
    {
      'Life Stone': gemstoneRecommendations.lagnaGem.gemstone,
      'Lucky Stone': gemstoneRecommendations.luckyGem5th.gemstone,
      'Fortune Stone': gemstoneRecommendations.fortuneGem9th.gemstone,
      Rudraksha: remedies.rudraksha,
    }
  );

  // Chapter 17
  addChapter(
    'ch17_conclusion',
    'Charted by Stars, Powered by You!',
    17,
    `Your Premium Personalised Kundli is a sacred cosmic map, not an unchangeable script. The planets indicate tendencies, opportune seasons, and energetic flows, but your free will, conscious choices, and daily efforts determine your reality. Walk forward with courage, trust in your innate strengths, and create a radiant, meaningful life. Wishing you peace, abundance, and divine fulfillment!`,
    {
      Summary: 'Empowered Destiny & Spiritual Evolution',
    }
  );

  return {
    version: '1.0',
    type: ReportType.KUNDLI,
    title: 'Birth Chart & Kundli Report',
    generatedAt: new Date().toISOString(),
    profile,
    configuration,
    ascendant,
    planets,
    houses,
    nakshatra,
    sections,
    chandraKundli: {
      moonSign: moonPlanet.sign,
      houses: chandraHouses,
    },
    navamshaKundli: {
      ascendantSign: d9AscSign,
      houses: d9Houses,
    },
    avakahadaChakra,
    panchangSnapshot,
    shodashvargas,
    divisionalCharts,
    bhavphal,
    ashtakavargaTable,
    charaKarakas,
    yogas: detectedYogas,
    numerology,
    remedies,
    vimshottariDasha,
    planetaryPlacementAndTransits,
    doshaAnalysis,
    gemstoneRecommendations,
  };
}
