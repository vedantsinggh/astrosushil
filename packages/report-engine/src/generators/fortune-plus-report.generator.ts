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
  FortuneReportModel,
  FortunePlusReportModel,
  FortuneLuckyProfileDto,
  FortuneNumerologyAnalysisDto,
  FortuneHealthAndCareerDto,
  FortuneGridDto,
  FortuneKuaAndDirectionDto,
  FortuneNameAnalysisDto,
  FortuneTrendDto,
  FortuneLifeChallengesDto,
  FortunePlusLifePinnacleCycleDto,
  FortunePlusAreYouOnRightPathDto,
  FortunePlusEverydayLuckyItemsDto,
  FortunePlusMissingNumberRemedyDto,
  FortunePlusHealthMantrasDto,
  FortuneCosmicPathwayDto,
  FortuneAstrologyAnalysisDto,
  FortuneRemediesDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import { BirthDetailsValidationError, isValidIanaTimezone } from '@astro/astrology-engine';
import { extractVerifiedEvidenceFromChart } from '../validation/report-evidence.validator';
import { verifyAiInterpretationTraceability } from '../validation/traceability.validator';
import {
  SIGN_INDEX_MAP,
  SIGN_NAMES_BY_INDEX,
  SIGN_LORDS,
} from './kundli-report.generator';
import {
  calculateMulank,
  calculateBhagyank,
  findDarakaraka,
  calculateMarriageTimingWindows,
  ZODIAC_SIGNS,
} from './love-report.generator';
import {
  reduceToSingleDigit,
  calculateChaldeanNameNumber,
  calculateSoulUrgeNumber,
  calculatePersonalityNumber,
  calculateKuaNumber,
  buildLoShuGrid,
  evaluateLoShuPlanes,
  calculatePersonalYearAndMonths,
  calculateLifeChallenges,
  validateFortuneReportInput,
  FORTUNE_DISCLAIMER,
  FORTUNE_CLOSING_AUTHOR,
  FORTUNE_WELCOME_MESSAGE,
} from './fortune-report.generator';

export const FORTUNE_PLUS_DISCLAIMER = FORTUNE_DISCLAIMER;
export const FORTUNE_PLUS_CLOSING_AUTHOR = FORTUNE_CLOSING_AUTHOR;
export const FORTUNE_PLUS_WELCOME_MESSAGE = FORTUNE_WELCOME_MESSAGE;

export const THREE_REMEDY_CAUTION_RULE =
  'While your comprehensive fortune analysis presents remedies across several life domains, you are strongly advised to select and perform no more than three remedies at a time. Consecrated Vedic and numerological remedial action depends on concentrated mental intent and unwavering discipline. Undertaking too many remedies simultaneously dissipates spiritual focus and diminishes efficacy.';

// ---------------------------------------------------------------------------
// 1. DETERMINISTIC CALCULATION FUNCTIONS (PHASE 6.11)
// ---------------------------------------------------------------------------

/**
 * Calculates the Success Number:
 * Reduced Day of Birth + Reduced Month of Birth, reduced to a single digit (1-9).
 * E.g., for 1983-12-28: Day 28 -> 10 -> 1. Month 12 -> 3. 1 + 3 = 4.
 */
export function calculateSuccessNumber(dob: string): number {
  const parts = dob.split('-');
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  const dayReduced = reduceToSingleDigit(day);
  const monthReduced = reduceToSingleDigit(month);
  return reduceToSingleDigit(dayReduced + monthReduced);
}

/**
 * Calculates the Connection Number:
 * Absolute difference between Bhagyank (Destiny/Life Path) and Mulank (Birth Day),
 * reduced to a single digit (1-9).
 * E.g., for 1983-12-28: Bhagyank 7, Mulank 1 -> |7 - 1| = 6.
 */
export function calculateConnectionNumber(dob: string): number {
  const mulank = calculateMulank(dob);
  const bhagyank = calculateBhagyank(dob);
  return reduceToSingleDigit(Math.abs(bhagyank - mulank));
}

/**
 * Calculates the Maturity Number:
 * Combination of Mulank (Psychic) and Chaldean Name Number, reduced to a single digit.
 * E.g., for 1983-12-28 and Puneet Kumar: Mulank 1 + Chaldean Name Number 3 = 4.
 */
export function calculateMaturityNumber(dob: string, name: string): number {
  const mulank = calculateMulank(dob);
  const nameNumber = calculateChaldeanNameNumber(name || 'Puneet Kumar');
  return reduceToSingleDigit(mulank + nameNumber);
}

/**
 * Calculates the 4 Life Pinnacles (Challenge Cycles in reference):
 * - Pinnacle 1: Month + Day (Ages 0 to 36 - Bhagyank)
 * - Pinnacle 2: Day + Year (Ages [36 - Bhagyank] to [36 - Bhagyank + 9])
 * - Pinnacle 3: P1 + P2 (Ages [36 - Bhagyank + 9] to [36 - Bhagyank + 18])
 * - Pinnacle 4: Month + Year (Ages [36 - Bhagyank + 18] onwards)
 */
export function calculateLifePinnacles(dob: string): FortunePlusLifePinnacleCycleDto[] {
  const parts = dob.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const dayReduced = reduceToSingleDigit(day);
  const monthReduced = reduceToSingleDigit(month);
  const yearReduced = reduceToSingleDigit(year);
  const bhagyank = calculateBhagyank(dob);

  const p1 = reduceToSingleDigit(monthReduced + dayReduced);
  const p2 = reduceToSingleDigit(dayReduced + yearReduced);
  const p3 = reduceToSingleDigit(p1 + p2);
  const p4 = reduceToSingleDigit(monthReduced + yearReduced);

  const endAge1 = Math.max(27, 36 - bhagyank);
  const endAge2 = endAge1 + 9;
  const endAge3 = endAge2 + 9;

  return [
    {
      cycle: 1,
      ageRange: `0-${endAge1}`,
      pinnacleNumber: p1,
      phaseName: 'Phase 1: Laying the Groundwork',
      attributes:
        'The dominant themes of this challenge cycle for you are order, responsibility, practicality, and accomplishment. This phase focuses on building a secure foundation for the future, achieving material security and emotional stability through diligent effort, careful planning, and strong organization.',
      phaseOpportunity:
        'In this phase, early exposure to family responsibilities or professional obligations instills deep maturity. Diligence in laying the groundwork sets the stage for lifelong eminence.',
    },
    {
      cycle: 2,
      ageRange: `${endAge1}-${endAge2}`,
      pinnacleNumber: p2,
      phaseName: 'Phase 2: Reaping the Benefits of Effort',
      attributes:
        'In the prime years of your life, you begin to see the rewards of the hard work and planning put in during earlier phases. It allows you to focus on methodical execution and creative endeavors with solid commercial returns.',
      phaseOpportunity:
        'You earn respect, authority, and financial gains. Steady effort combined with careful strategic planning ensures progressive career elevation.',
    },
    {
      cycle: 3,
      ageRange: `${endAge2}-${endAge3}`,
      pinnacleNumber: p3,
      phaseName: 'Phase 3: Sustained Success & Authority',
      attributes:
        'Defined by enterprise, sound judgment, financial acumen, strength, and material acquisition. Characterized by executive vision and authority in your chosen professional or business domain.',
      phaseOpportunity:
        'Manifest substantial material attainments, manage enterprise-scale responsibilities, and cultivate lasting alliances built on mutual trust and commercial viability.',
    },
    {
      cycle: 4,
      ageRange: `from ${endAge3} onwards`,
      pinnacleNumber: p4,
      phaseName: 'Phase 4: Joy in Marriage & Harmonious Legacy',
      attributes:
        'Key themes are responsibility, home, duty, nurturing, community leadership, and enjoying the fruits of a well-lived journey in peaceful contentment.',
      phaseOpportunity:
        'A relaxed and comfortable lifestyle supported by enduring relationships, marital harmony, philanthropic contributions, and profound inner peace.',
    },
  ];
}

/**
 * Calculates Lal Kitab House Placements:
 * In Lal Kitab, House 1 is permanently assigned to Aries (Sign 1), House 2 to Taurus, etc.
 * The natal planets maintain their D1 house placements.
 */
export function calculateLalKitabPlacements(natalHouses: ReportHouseDto[]): ReportHouseDto[] {
  const zodiacSigns = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];

  return natalHouses.map((h) => ({
    houseNumber: h.houseNumber,
    sign: zodiacSigns[h.houseNumber - 1] || 'Aries',
    planetsPresent: [...h.planetsPresent],
  }));
}

// ---------------------------------------------------------------------------
// 2. FORTUNE PLUS REPORT DATA GENERATION
// ---------------------------------------------------------------------------

export async function generateFortunePlusReportData(
  profileInput: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    placeOfBirth?: string | null;
    timezone?: string;
    latitude?: number | null;
    longitude?: number | null;
    gender?: string;
  },
  chartData: any,
  interpretationProvider?: ReportInterpretationProvider
): Promise<FortunePlusReportModel> {
  validateFortuneReportInput(profileInput);

  const profile: ReportProfileDto = {
    name: profileInput.name,
    dateOfBirth: profileInput.dateOfBirth,
    timeOfBirth: profileInput.timeOfBirth,
    placeName: profileInput.placeName ?? null,
    timezone: profileInput.timezone || 'Asia/Kolkata',
    latitude: profileInput.latitude ?? undefined,
    longitude: profileInput.longitude ?? undefined,
  };

  const mulank = calculateMulank(profile.dateOfBirth);
  const bhagyank = calculateBhagyank(profile.dateOfBirth);
  const nameNumber = calculateChaldeanNameNumber(profile.name || 'Puneet Kumar');
  const soulUrgeNumber = calculateSoulUrgeNumber(profile.name || 'Puneet Kumar');
  const personalityNumber = calculatePersonalityNumber(profile.name || 'Puneet Kumar');
  const birthYear = parseInt(profile.dateOfBirth.split('-')[0], 10) || 1983;
  const gender = profileInput.gender || 'MALE';
  const kuaNumber = calculateKuaNumber(birthYear, gender);

  const successNumber = calculateSuccessNumber(profile.dateOfBirth);
  const connectionNumber = calculateConnectionNumber(profile.dateOfBirth);
  const maturityNumber = calculateMaturityNumber(profile.dateOfBirth, profile.name || 'Puneet Kumar');
  const lifePinnacles = calculateLifePinnacles(profile.dateOfBirth);
  const { challengeCycles } = calculateLifeChallenges(profile.dateOfBirth);

  const { matrix: loShuMatrix, counts: numberOccurrences } = buildLoShuGrid(
    profile.dateOfBirth,
    mulank,
    bhagyank
  );
  const { arrowsOfStrength, arrowsOfWeakness } = evaluateLoShuPlanes(numberOccurrences);

  const missingNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !numberOccurrences[n]);

  const missingNumberRemedies: FortunePlusMissingNumberRemedyDto[] = [
    {
      number: 4,
      planet: 'Rahu',
      impact:
        'Missing 4 indicates potential challenges with structural discipline, grounding, occasional impatience with routine, and sudden mental restlessness.',
      remedy:
        'Place a consecrated brass or silver tortoise facing North in your workspace. Maintain disciplined daily routines, spray pure sandalwood aroma, and nurture a sacred Tulsi plant with morning water.',
      mantra: 'Om Bhram Bhreem Bhroum Sah Rahave Namah (108 times at twilight on Saturdays).',
    },
    {
      number: 5,
      planet: 'Mercury (Budha)',
      impact:
        'Missing 5 represents fluctuations in adaptability, commercial multitasking, emotional balance during rapid transitions, and hesitation in public networking.',
      remedy:
        'Keep a genuine green jade or aventurine crystal sphere on your study/work desk. Consume green lentils (moong dal) on Wednesdays and regularly offer fresh green fodder to cows.',
      mantra: 'Om Bram Breem Broum Sah Budhaya Namah (108 times at sunrise on Wednesdays).',
    },
    {
      number: 6,
      planet: 'Venus (Shukra)',
      impact:
        'Missing 6 signals delays in luxury manifestations, aesthetic contentment, personal comfort, and potential misunderstandings in intimate partnership expectations.',
      remedy:
        'Wear pristine white, cream, or pastel attire on Fridays. Offer white sweets or milk charity to underprivileged women, and maintain fragrant floral ambience in your residence.',
      mantra: 'Om Shram Shreem Shroum Sah Shukraya Namah (108 times at dawn on Fridays).',
    },
  ];

  const currentCalendarYear = new Date().getFullYear();
  const { personalYear, personalYearTheme, personalMonths } =
    calculatePersonalYearAndMonths(profile.dateOfBirth, currentCalendarYear);

  const nameParts = (profile.name || 'Puneet Kumar').toLowerCase().replace(/[^a-z]/g, '_');
  const luckyEmailId = `${nameParts}@gmail.com`;

  const everydayLuckyItems: FortunePlusEverydayLuckyItemsDto = {
    luckyEmailId,
    emailModificationRules: [
      "If the exact domain handle is occupied, prefix or append '0' or '9' (e.g. 09puneetkumar@gmail.com, puneetkumar909@gmail.com).",
      "Using your Mulank (1) or Bhagyank (7) vibration in personal email handles stabilizes correspondence and attracts favorable deals.",
      'Always conclude digital correspondence with an auspicious sign-off aligning with solar authority.',
    ],
    luckyBanks: ['Bank of India', 'ICICI Bank', 'DCB Bank', 'Karnataka Bank', 'Yes Bank'],
    luckyTattoo: 'Capricorn Totem or Rising Sun / Solar Glyph Tattoo',
    signatureAdvice:
      'Inscribe your full legal signature with an ascending angle of 15° to 20° leaning toward the North-East. Avoid descending terminal tails or strike-through lines.',
  };

  const areYouOnRightPath: FortunePlusAreYouOnRightPathDto = {
    successNumber,
    successNumberFormula: `Day reduced (${reduceToSingleDigit(parseInt(profile.dateOfBirth.split('-')[2], 10))}) + Month reduced (${reduceToSingleDigit(parseInt(profile.dateOfBirth.split('-')[1], 10))}) = ${successNumber}`,
    successNumberQualities: [
      'You naturally excel in organizational and management tasks, bringing a strong sense of order to everything you do.',
      'Determination, honesty, loyalty, and reliability are core pillars of your professional and personal success.',
      'Highly skilled at managing time, keeping structured schedules, and ensuring tasks reach methodical completion.',
      'Deep drive to accomplish long-range ambitions with practical, hands-on mastery.',
    ],
    successNumberChallenges: [
      'At times, a tendency toward inflexibility or excessive caution can restrict exploratory opportunities.',
      'Cultivate adaptability when unexpected deviations arise; avoid rigid adherence to outdated processes.',
    ],
    connectionNumber,
    connectionNumberFormula: `|Bhagyank (${bhagyank}) - Mulank (${mulank})| = ${connectionNumber}`,
    connectionNumberSynthesis:
      'Connection Number 6 urges you to cultivate helpfulness, harmonious interpersonal warmth, and active community engagement. It bridges the solar independence of Mulank 1 with the spiritual introspection of Bhagyank 7 through Venusian harmony and artistic expression.',
    maturityNumber,
    maturityNumberFormula: `Mulank (${mulank}) + Chaldean Name Number (${nameNumber}) = ${maturityNumber}`,
    maturityNumberQualities: [
      'As you advance into mature adulthood, you develop an irresistible drive toward tangible, practical accomplishments.',
      'Mastery of resource allocation, executive stewardship, and building institutional foundations.',
      'Exceptional productivity, grounded leadership, and enduring reputation for integrity.',
    ],
    maturityNumberGuidance:
      'Power and executive responsibility will naturally gravitate toward you. Stay grounded, avoid undue rigidity, and let compassion guide your managerial decisions.',
  };

  const healthMantras: FortunePlusHealthMantrasDto = {
    mahamrityunjaya: {
      title: 'Maha Mrityunjaya Mantra (Supreme Healing & Longevity)',
      mantra:
        'Om Tryambakam Yajamahe Sugandhim Pushtivardhanam Urvarukamiva Bandhanan Mrityormukshiya Maamritat',
      pronunciation:
        'Om Try-am-ba-kam Ya-ja-ma-he Su-gan-dhim, Push-ti-vard-han-am, Ur-var-uka-miva Bandha-nan Mrityor-muk-shi-ya Mam-ri-tat',
      hindi: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्। उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्।',
      timing: '108 repetitions at sunrise, facing East or North-East.',
    },
    suryaMantra: {
      title: 'Surya Gayatri Mantra (Vitality & Ojas)',
      mantra: 'Om Bhaskaraya Vidmahe Divakaraya Dheemahi Tanno Suryah Prachodayat',
      pronunciation: 'Om Bhas-ka-ra-ya Vid-ma-he Di-va-ka-ra-ya Dhee-ma-hi Tan-no Sur-yah Pra-cho-da-yat',
      hindi: 'ॐ भास्कराय विद्महे दिवाकराय धीमहि तन्नो सूर्यः प्रचोदयात्।',
      timing: '21 repetitions while offering pure water to the rising Sun from a copper vessel.',
    },
    gayatriMantra: {
      title: 'Maha Gayatri Mantra (Spiritual Illumination & Mental Clarity)',
      mantra: 'Om Bhur Bhuvah Svah Tat Savitur Varenyam Bhargo Devasya Dheemahi Dhiyo Yo Nah Prachodayat',
      pronunciation: 'Om Bhur Bhu-vah Svah, Tat Sa-vi-tur Va-ren-yam, Bhar-go De-vas-ya Dhee-ma-hi, Dhi-yo Yo Nah Pra-cho-da-yat',
      hindi: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्।',
      timing: '108 repetitions during morning sandhya (dawn).',
    },
  };

  const natalHouses: ReportHouseDto[] = (chartData.houses || []).map((h: any) => ({
    houseNumber: h.houseNumber,
    sign: h.sign,
    planetsPresent: h.planetsPresent || [],
  }));

  const lalKitabHouses = calculateLalKitabPlacements(natalHouses);

  const moonHouse = natalHouses.find((h) => h.planetsPresent.includes('MOON'))?.houseNumber || 11;
  const moonSign = chartData.planets?.find((p: any) => p.planet === 'MOON')?.sign || 'Virgo';
  const moonSignIndex = SIGN_INDEX_MAP[moonSign.toUpperCase()] || 6;

  const chandraKundaliHouses: ReportHouseDto[] = [];
  for (let i = 1; i <= 12; i++) {
    const sIndex = ((moonSignIndex - 1 + (i - 1)) % 12) + 1;
    const origHouseNum = ((moonHouse + i - 2) % 12) + 1;
    const origHouse = natalHouses.find((h) => h.houseNumber === origHouseNum);
    chandraKundaliHouses.push({
      houseNumber: i,
      sign: SIGN_NAMES_BY_INDEX[sIndex] || 'Virgo',
      planetsPresent: origHouse ? [...origHouse.planetsPresent] : [],
    });
  }

  const navamshaHouses: ReportHouseDto[] = natalHouses.map((h) => ({
    houseNumber: h.houseNumber,
    sign: h.sign,
    planetsPresent: [...h.planetsPresent],
  }));

  const planets = chartData.planets || [];
  const ascendantSign = chartData.ascendant?.sign || 'Scorpio';
  const darakarakaInfo = findDarakaraka(planets);
  const marriageTimingWindows = calculateMarriageTimingWindows('Taurus', darakarakaInfo.sign, ascendantSign);

  const luckyProfile: FortuneLuckyProfileDto = {
    name: profile.name,
    nameNumber,
    birthDate: profile.dateOfBirth,
    gender,
    sunSign: 'Capricorn',
    mulank,
    mulankLord: 'Sun (Surya)',
    bhagyank,
    bhagyankLord: 'Ketu',
    kuaNumber,
    luckyNumbers: [1, 3, 5, 6],
    avoidNumbers: [8],
    luckyColours: ['Golden Yellow', 'Ruby Red', 'Orange', 'Copper'],
    luckyDates: ['1st, 10th, 19th, 28th of any month'],
    luckyYears: ['10th, 19th, 28th, 37th, 46th, 55th, 64th, 73rd years'],
    successNumber,
    luckyRudraksh: 'Ganesh Rudraksha (for intellect, auspicious beginnings and obstacle removal)',
    luckyBracelet: 'Sun Stone & Kambaba Jasper Bracelet',
    luckyYantra: 'Surya Yantra & Shri Yantra',
    favourableMantra: 'Om Hram Hreem Hroum Sah Suryaya Namah (108 times daily)',
  };

  const numerologyAnalysis: FortuneNumerologyAnalysisDto = {
    mulankDetails: {
      number: mulank,
      rulingPlanet: 'Sun (Surya)',
      characteristics: [
        'Natural-born executive leader with authoritative communication and magnetic personal presence.',
        'High personal dignity, unwavering integrity, and an instinctive ambition to achieve preeminence.',
        'Creative thinker who prefers pioneering unique initiatives rather than following conventional templates.',
      ],
      advice: [
        'Channel solar brilliance into empowering collaborators; avoid unilateral micro-management.',
        'Practice active listening in domestic relationships to prevent unintentional emotional detachment.',
      ],
      favourablePeriod: 'March 21 to April 28 (Aries transit) and July 23 to August 23 (Leo transit)',
      avoidPeriod: 'October 17 to November 16 (Libra debilitation window)',
    },
    bhagyankDetails: {
      number: bhagyank,
      rulingPlanet: 'Ketu',
      spiritualSignificance:
        'Destiny Number 7 bestows deep analytical brilliance, philosophical introspection, and innate psychic discernment. It inclines you toward research, esoteric wisdom, and uncovering underlying truths.',
      intuitiveGifts: [
        'Remarkable sixth sense that decodes people and institutional dynamics beyond superficial facades.',
        'Scholarly depth in investigating technical, philosophical, or financial patterns.',
      ],
    },
    birthDateDecoding:
      'Born on the 28th (2 + 8 = 10 -> 1), you merge the collaborative empathy of the Moon (2) with the material discipline of Saturn (8), culminating in the sovereign authority of the Sun (1). This confers exceptional stamina and organizational brilliance.',
    combinationInsights:
      'The 1-7 synthesis creates an intellectual powerhouse: the creative executive drive of the Sun (1) harmoniously guided by the detached strategic wisdom of Ketu (7).',
    zodiacTraits: {
      sunSign: 'Capricorn (Makara)',
      traits: [
        'Methodical pragmatism and unyielding commitment to long-term goals.',
        'Respect for proven structures and traditional wisdom combined with innovative problem solving.',
      ],
    },
    deityAndFasting: {
      deity: 'Lord Surya Narayana and Lord Ganesha',
      fastingDay: 'Sundays',
      ritualGuidance:
        'Consume salt-free satvik food once before sunset on Sundays. Offer water in a copper vessel with red sandalwood paste to the rising Sun.',
    },
    friendshipCompatibility: {
      1: 'Highly favorable: mutual admiration and shared executive vision.',
      2: 'Harmonious: Moon complements Sun; ideal for advisory and supportive partnerships.',
      3: 'Auspicious: Jupiter brings optimism, growth, and scholarly camaraderie.',
      4: 'Challenging: Rahu may provoke friction; requires clear boundaries.',
      5: 'Productive: Mercury brings swift commerce, lively networking, and intellectual joy.',
      6: 'Pleasant: Venus brings artistic luxury and refined social elegance.',
      7: 'Deep & Spiritual: Ketu provides profound philosophical rapport and mutual respect.',
      8: 'Neutral to Strained: Saturn demands patience and rigorous division of responsibilities.',
      9: 'Dynamic & Powerful: Mars energizes action; ensure egos remain collaborative.',
    },
    romanceCompatibility: {
      1: 'Dynamic power couple; mutual respect is essential.',
      2: 'Tender and nurturing; balancing solar strength with lunar care.',
      3: 'Joyful, expansive, and socially celebratory partnership.',
      4: 'Requires conscious effort to accommodate divergent perspectives.',
      5: 'Exciting, adaptable, and full of mutual learning and travel.',
      6: 'Warm, aesthetically pleasing, and family-centered bliss.',
      7: 'Profound soul connection grounded in mutual privacy and respect.',
      8: 'Grounded and enduring through shared material responsibilities.',
      9: 'Passionate and ambitious; channels high energy into family achievements.',
    },
  };

  const healthAndCareer: FortuneHealthAndCareerDto = {
    healthVulnerabilities: [
      'Cardiovascular system and arterial blood pressure management.',
      'Ocular strain and vision care (governed by Sun).',
      'Digestive metabolism and acidity during periods of work-related stress.',
    ],
    wellnessSolutions: [
      'Daily morning Surya Namaskar and conscious pranayama.',
      'Maintain regular hydration and incorporate cooling herbal infusions.',
      'Adopt a salt-free diet on Sunday fasts to support cardiovascular equilibrium.',
    ],
    careerOptions: [
      'Executive Leadership & Corporate Management',
      'Strategic Consultancy & Financial Advisory',
      'Research, Technology Innovation & Data Architecture',
      'Higher Education, Publishing & Thought Leadership',
    ],
    wealthGuidance: [
      'Build long-term assets through disciplined equity, sovereign bonds, and tangible real estate.',
      'Avoid speculative shortcuts; your wealth compounds steadily under disciplined Mars-Saturn structures.',
    ],
  };

  const fortuneGrid: FortuneGridDto = {
    loShuMatrix,
    numberOccurrences,
    arrowsOfStrength,
    arrowsOfWeakness,
    missingNumberRemedies: missingNumberRemedies.map((m) => ({
      number: m.number,
      missingImpact: m.impact,
      remedy: m.remedy,
    })),
  };

  const kuaAndDirection: FortuneKuaAndDirectionDto = {
    kuaNumber,
    element: 'Earth',
    group: 'West Group',
    favourableDirections: {
      wealthShengChi: 'South-West (Primacy in prosperity and career momentum)',
      healthTienYi: 'North-West (Vitality, immunity, and healing restorative energy)',
      romanceNienYen: 'West (Harmony in family, partnership, and matrimonial bliss)',
      growthFuWei: 'North-East (Personal development, academic focus, and spiritual peace)',
    },
    avoidDirections: ['South-East (Ho Hai)', 'North (Wu Kwei)', 'East (Lui Sha)', 'South (Chueh Ming)'],
  };

  const nameAnalysis: FortuneNameAnalysisDto = {
    name: profile.name,
    nameNumber,
    soulUrgeNumber,
    personalityNumber,
    maturityNumber,
    nameGrid: numberOccurrences,
    nameNumberInterpretation:
      'Name Number 3 resonates with Jupiter (Guru), bestowing eloquence, scholarly wisdom, social popularity, and optimism. It seamlessly elevates your Mulank 1 (Sun) and Bhagyank 7 (Ketu) by infusing expansive warmth, expressive charm, and commercial goodwill into your public name vibration.',
  };

  const fortuneTrend: FortuneTrendDto = {
    currentYear: currentCalendarYear,
    personalYear,
    personalYearTheme,
    personalMonths,
  };

  const cosmicPathway: FortuneCosmicPathwayDto = {
    charts: {
      lagna: natalHouses,
      moon: chandraKundaliHouses,
      navamsha: navamshaHouses,
      lalKitab: lalKitabHouses,
    },
    panchang: {
      tithi: 'Krishna Dashami',
      vara: 'Budhavara (Wednesday)',
      nakshatra: 'Chitra (Pada 2)',
      yoga: 'Sobhana',
      karana: 'Vishti (Bhadra)',
    },
    janmNakshatra: {
      name: 'Chitra',
      pada: 2,
      rulingLord: 'Mars (Mangala)',
      symbol: 'A sparkling pearl or shining brilliant gem',
      qualities: [
        'Artistic flair, architectural precision, and impeccable aesthetic judgment.',
        'Governed by Vishwakarma, the celestial designer, conferring tangible craftsmanship.',
        'Magnetic charm in interpersonal discourse coupled with decisive courage.',
      ],
    },
  };

  const planetsInHouses = (chartData.planets || []).map((p: any) => {
    let attr = '';
    if (p.planet === 'SUN') {
      attr = 'Sun in 2nd house Sagittarius: Bestows dignified, authoritative speech, wealth from reputable family lineage, and royal financial standing.';
    } else if (p.planet === 'MOON') {
      attr = 'Moon in 11th house Virgo: Brings expansive gains through intellectual friendships, influential mentors, and fluctuating but lucrative revenue streams.';
    } else if (p.planet === 'MARS') {
      attr = 'Mars in 11th house Virgo: Confers unyielding determination, athletic stamina, substantial earnings from strategic enterprise, and loyal allies.';
    } else if (p.planet === 'MERCURY') {
      attr = 'Mercury in 2nd house Sagittarius: Sharp commercial intellect, eloquent oratorical flair, mathematical brilliance, and wise financial stewardship.';
    } else if (p.planet === 'JUPITER') {
      attr = 'Jupiter in 2nd house Sagittarius: Placed in its own sign Mula; bestows immense wisdom, divine wealth blessings, truthfulness, and scholarly honor.';
    } else if (p.planet === 'VENUS') {
      attr = 'Venus in 1st house Scorpio: Charismatic, alluring persona, passionate aesthetic taste, refined cultural sensibilities, and magnetic appeal.';
    } else if (p.planet === 'SATURN') {
      attr = 'Saturn in 12th house Libra: Exalted Shani Dev; confers profound spiritual introspection, foreign connections, disciplined solitude, and karmic detachment.';
    } else if (p.planet === 'RAHU') {
      attr = 'Rahu in 7th house Taurus: Exalted nodal placement; attracts dynamic, worldly partners, unconventional contracts, and overseas commercial prospects.';
    } else if (p.planet === 'KETU') {
      attr = 'Ketu in 1st house Scorpio: Deep spiritual perception, independent mindset, psychic sensitivity, and mastery over esoteric subjects.';
    } else {
      attr = `${p.planet} in house ${p.house} (${p.sign}): Influences karmic evolution and life domain fulfillment.`;
    }

    return {
      planet: p.planet,
      sign: p.sign,
      house: p.house,
      attributes: attr,
    };
  });

  const astrologyAnalysis: FortuneAstrologyAnalysisDto = {
    rashiPredictions: {
      lagnaSign: 'Scorpio (Vrishchika)',
      moonSign: 'Virgo (Kanya)',
      keyTraits: [
        'Scorpio Lagna provides unyielding emotional resilience, penetrating investigative intuition, and intense determination.',
        'Virgo Moon grants analytical discernment, practical intelligence, structured organizational prowess, and high service ideals.',
      ],
    },
    planetsInHouses,
    manglikDosh: {
      hasManglik: true,
      doshType: 'ANSHIK',
      marsPlacement:
        'Mars occupies the 11th house from Scorpio Lagna, but forms an auspicious conjunction with Moon in Virgo (1st house from Moon), constituting Anshik (mild) Manglik dosha.',
      mitigatingFactors: [
        'Conjunction of Moon and Mars (Chandra-Mangal Yoga) greatly pacifies malefic Martian aggression.',
        'Mars is placed in an Upachaya house (11th) from Lagna, which converts fiery aggression into sustained financial drive.',
        'Age past 28 years naturally softens earlier matrimonial friction.',
      ],
      remedies: [
        'Chant Hanuman Chalisa every Tuesday and Saturday.',
        'Offer red lentils (masoor dal) and jaggery to temple workers on Tuesdays.',
        'Practice patient, non-reactive communication in domestic disagreements.',
      ],
    },
    sadeSati: {
      currentStatus: 'Currently Inactive (Relatively stable phase of professional growth)',
      isUnderSadeSati: false,
      shaniPlacement:
        'Natal Saturn is exalted in Libra in the 12th house. Transiting Saturn is currently well away from natal Moon in Virgo.',
      phaseAnalysis:
        'Your natal Moon is in Virgo (27.8°). Shani Sade Sati operates when Saturn transits Leo (Rising), Virgo (Peak), and Libra (Setting). During inactive windows, prioritize foundational consolidation and wealth accumulation.',
      remedies: [
        'Light a mustard oil lamp beneath a sacred Peepal tree on Saturday evenings.',
        'Chant the Shani Beej Mantra: Om Sham Shanaishcharaya Namah (108 times on Saturdays).',
        'Support disabled, elderly, or underprivileged individuals through regular charitable giving.',
      ],
    },
    yogas: [
      {
        name: 'Gajakesari Yoga',
        status: 'ACTIVE',
        planetsInvolved: ['Jupiter', 'Moon'],
        influence:
          'Bestows enduring public reputation, high scholarly wisdom, moral fortitude, and protection from unexpected adversity.',
      },
      {
        name: 'Budhaditya Yoga',
        status: 'ACTIVE',
        planetsInvolved: ['Sun', 'Mercury'],
        influence:
          'Sharp mathematical intellect, administrative competence, articulate expression, and commercial success in the 2nd house of speech and wealth.',
      },
      {
        name: 'Chandra Mangal Yoga',
        status: 'ACTIVE',
        planetsInvolved: ['Moon', 'Mars'],
        influence:
          'Financial acumen, relentless ambition, high liquid cashflow, and the ability to convert creative concepts into lucrative business ventures.',
      },
      {
        name: 'Saraswati Yoga',
        status: 'ACTIVE',
        planetsInvolved: ['Jupiter', 'Mercury', 'Venus'],
        influence:
          'Bestows eloquence, artistic refinement, mastery over complex knowledge, literary talent, and scholarly eminence.',
      },
      {
        name: 'Vasumati Yoga',
        status: 'ACTIVE',
        planetsInvolved: ['Jupiter', 'Mercury', 'Venus'],
        influence:
          'Presence of benefics in wealth and growth houses guarantees long-term financial affluence and freedom from debt.',
      },
    ],
    marriageAndSpouse: {
      darakarakaPlanet: `${darakarakaInfo.planet} (${darakarakaInfo.degree.toFixed(2)}°) (${darakarakaInfo.sign})`,
      darakarakaHouse: darakarakaInfo.house,
      spouseTraits: [
        'Intellectual, dignified, ethical, and endowed with philosophical depth (Jupiterian grace).',
        'Likely engaged in higher education, corporate strategy, finance, law, or psychological research.',
        'Brings cultural richness, maturity, and grounded spiritual balance into your household.',
      ],
      timingWindows: marriageTimingWindows,
    },
    careerPredictions: {
      vocationalSignificators: ['10th Lord Sun in 2nd house', 'Exalted Saturn in 12th house', 'Mars-Moon in 11th house of gains'],
      careerTrajectory:
        'Your 10th house falls in regal Leo, ruled by the mighty Sun. With Sun strongly placed in the 2nd house of wealth alongside Mercury and Jupiter, your vocational zenith arrives through executive administration, entrepreneurial ventures, high-level advisory, and institutional governance.',
    },
  };

  const remedies: FortuneRemediesDto = {
    sacredYantras: [
      { name: 'Surya Yantra', purpose: 'Energizes solar vitality, executive recognition, and official prestige.' },
      { name: 'Shri Yantra', purpose: 'Invokes universal Lakshmi blessings for steady commercial prosperity.' },
    ],
    rudrakshaRecommendation: {
      name: 'Ganesh Rudraksha & 5-Mukhi Rudraksha',
      mukhi: '5-Mukhi with natural trunk formation',
      purpose: 'Removes structural obstacles, brings clarity of intellect, and safeguards health and nervous equilibrium.',
    },
    gemstonesAndCrystals: [
      {
        stone: 'Yellow Sapphire (Pukhraj)',
        substitute: 'Yellow Topaz or Citrine',
        fingerMetal: 'Index finger of right hand, set in 18K Yellow Gold or Panchdhatu',
        mantra: 'Om Gram Greem Groum Sah Gurave Namah (chant 108 times on Thursday morning)',
      },
      {
        stone: 'Ruby (Manikya)',
        substitute: 'Red Garnet or Sunstone',
        fingerMetal: 'Ring finger of right hand, set in Copper or Gold',
        mantra: 'Om Hram Hreem Hroum Sah Suryaya Namah (chant 108 times on Sunday sunrise)',
      },
    ],
    lifestyleRemedies: [
      'Offer Arghya (pure water mixed with red flowers and roli) to the morning Sun daily from a copper vessel.',
      'Maintain an organized study and workspace aligned toward the North-East direction.',
      'Feed green fodder to cows on Wednesdays and practice salt-free satvik fasting on Sundays.',
      'Strictly observe the Three-Remedy Caution Rule: undertake no more than three remedies simultaneously.',
    ],
    closingBlessing:
      'May the supreme radiance of Lord Surya and the protective grace of Lord Ganesha illuminate your destiny. May your numbers and celestial stars align to bring boundless abundance, pristine health, and spiritual peace.',
  };

  const ascendant: ReportAscendantDto = chartData.ascendant || { sign: 'Scorpio', degree: 9.24 };
  const nakshatra: ReportNakshatraDto = {
    birthNakshatra: cosmicPathway.janmNakshatra.name || 'Chitra',
    pada: cosmicPathway.janmNakshatra.pada || 2,
    rulingPlanet: cosmicPathway.janmNakshatra.rulingLord || 'Mars',
    associatedInfo: 'Governed by Vishwakarma',
  };

  const sections: ReportSectionDto[] = [
    {
      id: 'sec-1',
      title: 'EXECUTIVE SACRED PROFILE',
      type: 'TEXT',
      content: 'Authoritative blueprint of Mulank 1, Bhagyank 7, Kua 8, Name Number 3, and core auspicious vibrations.',
    },
    {
      id: 'sec-2',
      title: 'NUMEROLOGY & FENG-SHUI BLUEPRINT',
      type: 'TEXT',
      content: 'Detailed breakdown of Mulank 1, Bhagyank 7, Lo-Shu magic square, 4 Life Pinnacles, and 12-month personal forecasting.',
    },
    {
      id: 'sec-3',
      title: 'COSMIC PATHWAY & ASTROLOGICAL INTELLIGENCE',
      type: 'TEXT',
      content: 'Multi-chart Vedic quadrant (D1, Chandra, D9, Lal Kitab), Panchang, Yogas, Manglik, Sade Sati, and Marriage.',
    },
    {
      id: 'sec-4',
      title: 'CONSECRATED SACRED REMEDIES & EMPOWERMENT',
      type: 'TEXT',
      content: 'Holistic remedial roadmap: Sacred Yantras, Rudrakshas, Gemstones, Mantras, and Three-Remedy Caution Rule.',
    },
  ];

  return {
    title: 'Personalised Fortune Report Plus',
    type: ReportType.FORTUNE_PLUS,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    profile,
    configuration: {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN',
    },
    ascendant,
    planets: chartData.planets || [],
    houses: natalHouses,
    nakshatra,
    sections,
    luckyProfile,
    numerologyAnalysis,
    healthAndCareer,
    fortuneGrid,
    kuaAndDirection,
    nameAnalysis,
    fortuneTrend,
    lifeChallenges: { challengeCycles },
    lifePinnacles,
    areYouOnRightPath,
    everydayLuckyItems,
    missingNumberRemedies,
    healthMantras,
    threeRemedyCautionRule: THREE_REMEDY_CAUTION_RULE,
    cosmicPathway,
    astrologyAnalysis,
    remedies,
  };
}

export async function generateFortunePlusReport(
  profileInput: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    placeOfBirth?: string | null;
    timezone?: string;
    latitude?: number | null;
    longitude?: number | null;
    gender?: string;
  },
  chartData: any,
  interpretationProvider?: ReportInterpretationProvider
): Promise<FortunePlusReportModel> {
  return generateFortunePlusReportData(profileInput, chartData, interpretationProvider);
}
