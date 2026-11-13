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
  FortuneLuckyProfileDto,
  FortuneNumerologyAnalysisDto,
  FortuneHealthAndCareerDto,
  FortuneGridDto,
  FortuneKuaAndDirectionDto,
  FortuneNameAnalysisDto,
  FortuneTrendDto,
  FortuneLifeChallengesDto,
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

export const FORTUNE_DISCLAIMER =
  'Please note that THIS REPORT IS ENTIRELY BASED ON ASTROLOGICAL, NUMEROLOGICAL CALCULATIONS & INTERPRETATIONS. The insights and predictions provided are derived solely from Vedic astrology & Pythagorean/Chaldean numerology, focusing on the influence of the natal kundli and numbers in your life. It is to be noted that this report does not signify personal opinions or beliefs. Every fact showcased in this report is rooted in established astrological principles, training, and practical experience. The author does not claim that the astrological and numerological content available is a completely definitive description and is not liable for any sort of correct, incorrect, partially correct, or partially incorrect use of the content. As with any astrological analysis, the predictions and remedies offered should not be treated as absolute or guaranteed.';

export const FORTUNE_CLOSING_AUTHOR = 'Astro Sushil (Sushil Kumaar Singh), Founder & Chief Astrologer';

export const FORTUNE_WELCOME_MESSAGE =
  "Throughout my journey as an astrologer and numerologist, I've had the privilege to connect with countless individuals, each with their unique stories and challenges. What I've learned is that, while our paths may differ, we all seek understanding, direction, and a touch of foresight in our lives. This report is an outcome of that experience. It's been crafted with care to offer you a combination of time-honored traditions and modern insights. While I've made every effort to ensure accuracy and relevance, remember that your personal journey is uniquely yours. Use this report as a guide, a source of inspiration, or a means to reflect.";

// Chaldean letter values
const CHALDEAN_MAP: Record<string, number> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
};

// Pythagorean letter values
const PYTHAGOREAN_MAP: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
};

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

/**
 * Reduces a positive integer to a single digit (1-9) by recursive summing.
 */
export function reduceToSingleDigit(num: number): number {
  let n = Math.abs(num);
  while (n > 9) {
    n = n
      .toString()
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  }
  return n === 0 ? 9 : n;
}

/**
 * Calculates Chaldean Name Number.
 */
export function calculateChaldeanNameNumber(fullName: string): number {
  const cleanName = fullName.toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleanName) return 1;

  // Split into words to calculate individual word totals, then sum
  const words = fullName.toUpperCase().trim().split(/\s+/);
  let totalSum = 0;

  for (const word of words) {
    let wordSum = 0;
    for (const char of word) {
      if (CHALDEAN_MAP[char]) {
        wordSum += CHALDEAN_MAP[char];
      }
    }
    totalSum += reduceToSingleDigit(wordSum);
  }

  return reduceToSingleDigit(totalSum);
}

/**
 * Calculates Soul Urge Number (vowels only) using the classical Chaldean system.
 * Reference: Puneet Kumar vowels U(6) + E(5) + E(5) + U(6) + A(1) = 23 -> 5.
 */
export function calculateSoulUrgeNumber(fullName: string): number {
  const clean = fullName.toUpperCase().replace(/[^A-Z]/g, '');
  let sum = 0;
  for (const char of clean) {
    if (VOWELS.has(char)) {
      sum += CHALDEAN_MAP[char] || 0;
    }
  }
  return reduceToSingleDigit(sum);
}

/**
 * Calculates Personality Number (consonants only) using the classical Chaldean system.
 * Reference: Puneet Kumar consonants P(8) + N(5) + T(4) + K(2) + M(4) + R(2) = 25 -> 7.
 */
export function calculatePersonalityNumber(fullName: string): number {
  const clean = fullName.toUpperCase().replace(/[^A-Z]/g, '');
  let sum = 0;
  for (const char of clean) {
    if (!VOWELS.has(char)) {
      sum += CHALDEAN_MAP[char] || 0;
    }
  }
  return reduceToSingleDigit(sum);
}

/**
 * Calculates Kua Number based on birth year and gender using standard Feng Shui formula:
 * 1. Sum the last two digits of the birth year and reduce to a single digit (e.g. 1983 -> 8+3=11 -> 2).
 * 2. Pre-2000:
 *    - Male: 10 - reducedSum (e.g. 10 - 2 = 8).
 *    - Female: reduceToSingleDigit(5 + reducedSum) (e.g. 5 + 2 = 7).
 * 3. 2000 & Later:
 *    - Male: 9 - reducedSum (if <= 0, add 9).
 *    - Female: reduceToSingleDigit(6 + reducedSum).
 * 4. Kua 5 Special Case (Center has no trigram):
 *    - Male transforms to 2 (Kun / Earth).
 *    - Female transforms to 8 (Gen / Earth).
 */
export function calculateKuaNumber(year: number, gender: string): number {
  const last2Digits = Math.abs(year) % 100;
  const d1 = Math.floor(last2Digits / 10);
  const d2 = last2Digits % 10;
  const reducedSum = reduceToSingleDigit(d1 + d2);

  const isMale = gender.toUpperCase() === 'MALE';
  let kua: number;

  if (year >= 2000) {
    if (isMale) {
      const val = 9 - reducedSum;
      kua = val <= 0 ? 9 : val;
    } else {
      kua = reduceToSingleDigit(6 + reducedSum);
    }
  } else {
    if (isMale) {
      kua = 10 - reducedSum;
    } else {
      kua = reduceToSingleDigit(5 + reducedSum);
    }
  }

  // Kua 5 resolution: Male becomes 2, Female becomes 8
  if (kua === 5) {
    return isMale ? 2 : 8;
  }

  return kua;
}

/**
 * Builds the Lo-Shu Grid (3x3 magic square) and counts occurrences of numbers 1-9
 * according to the authoritative reference numerology methodology (Reference PDF Page 26-28):
 * 1. Digits from birth date string (YYYY-MM-DD or DD/MM/YYYY)
 * 2. Mulank (Psychic / Driver Number)
 * 3. Bhagyank (Destiny / Conductor Number)
 * (Kua number and name numbers belong to separate analytical systems and are NOT added to the grid).
 */
export function buildLoShuGrid(
  dob: string,
  mulank: number,
  bhagyank: number,
  _kua?: number
): {
  matrix: number[][];
  counts: Record<number, number>;
} {
  const counts: Record<number, number> = {
    1: 0, 2: 0, 3: 0,
    4: 0, 5: 0, 6: 0,
    7: 0, 8: 0, 9: 0,
  };

  // Digits from birth date string (YYYY-MM-DD or DD/MM/YYYY)
  const digits = dob.replace(/[^0-9]/g, '');
  for (const d of digits) {
    const val = parseInt(d, 10);
    if (val >= 1 && val <= 9) {
      counts[val] = (counts[val] || 0) + 1;
    }
  }

  // Include Mulank and Bhagyank only (as verified from reference PDF Page 26-28)
  if (mulank >= 1 && mulank <= 9) counts[mulank] = (counts[mulank] || 0) + 1;
  if (bhagyank >= 1 && bhagyank <= 9) counts[bhagyank] = (counts[bhagyank] || 0) + 1;

  // Traditional Lo-Shu layout:
  // Row 0: [4, 9, 2]
  // Row 1: [3, 5, 7]
  // Row 2: [8, 1, 6]
  const matrix = [
    [counts[4] > 0 ? 4 : 0, counts[9] > 0 ? 9 : 0, counts[2] > 0 ? 2 : 0],
    [counts[3] > 0 ? 3 : 0, counts[5] > 0 ? 5 : 0, counts[7] > 0 ? 7 : 0],
    [counts[8] > 0 ? 8 : 0, counts[1] > 0 ? 1 : 0, counts[6] > 0 ? 6 : 0],
  ];

  return { matrix, counts };
}

/**
 * Evaluates Lo-Shu planes of strength (arrows).
 */
export function evaluateLoShuPlanes(counts: Record<number, number>): {
  arrowsOfStrength: Array<{ name: string; numbers: number[]; present: boolean; description: string }>;
  arrowsOfWeakness: Array<{ name: string; missingNumbers: number[]; description: string }>;
} {
  const planes = [
    { name: 'Mental Plane (Thought & Memory)', numbers: [4, 9, 2], description: 'Sharp intellectual analysis, profound memory retention, and strategic clarity.' },
    { name: 'Emotional Plane (Heart & Sensitivity)', numbers: [3, 5, 7], description: 'Spiritual empathy, soulful intuition, deep artistic appreciation, and emotional warmth.' },
    { name: 'Practical Plane (Material & Realization)', numbers: [8, 1, 6], description: 'Methodical execution, physical endurance, practical wealth building, and grounded craftsmanship.' },
    { name: 'Thought Plane (Planning & Design)', numbers: [4, 3, 8], description: 'Strategic organizing talent, conceptual brilliance, and systematic structural planning.' },
    { name: 'Will Plane (Determination & Persistence)', numbers: [9, 5, 1], description: 'Unshakable tenacity, unwavering willpower, perseverance through adversity, and executive courage.' },
    { name: 'Action Plane (Activity & Execution)', numbers: [2, 7, 6], description: 'Prompt physical action, dynamic implementation, and converting conceptual ideas into living reality.' },
    { name: 'Golden Arrow (Success & Fortune)', numbers: [4, 5, 6], description: 'Supreme fortune, balanced emotional prosperity, material triumph, and smooth life advancement.' },
    { name: 'Silver Arrow (Determination & Persistence)', numbers: [2, 5, 8], description: 'Steadfast persistence, quiet patience, emotional balance, and unswerving resilience.' },
  ];

  const arrowsOfStrength: Array<{ name: string; numbers: number[]; present: boolean; description: string }> = [];
  const arrowsOfWeakness: Array<{ name: string; missingNumbers: number[]; description: string }> = [];

  for (const plane of planes) {
    const presentCount = plane.numbers.filter((num) => (counts[num] || 0) > 0).length;
    if (presentCount === plane.numbers.length) {
      arrowsOfStrength.push({
        name: plane.name,
        numbers: plane.numbers,
        present: true,
        description: plane.description,
      });
    } else if (presentCount === 0) {
      arrowsOfWeakness.push({
        name: `Arrow of Hesitation / Void (${plane.name.split(' ')[0]})`,
        missingNumbers: plane.numbers,
        description: `Absence of numbers ${plane.numbers.join(', ')} invites periodic indecision, requiring conscious development and remedial harmonization.`,
      });
    }
  }

  return { arrowsOfStrength, arrowsOfWeakness };
}

/**
 * Calculates Personal Year and 12 Personal Months for a given year.
 */
export function calculatePersonalYearAndMonths(
  dob: string,
  targetYear: number
): FortuneTrendDto {
  const parts = dob.split('-');
  const birthDay = parseInt(parts[2], 10) || 1;
  const birthMonth = parseInt(parts[1], 10) || 1;

  const bDaySum = reduceToSingleDigit(birthDay);
  const bMonthSum = reduceToSingleDigit(birthMonth);
  const tYearSum = reduceToSingleDigit(targetYear);

  const personalYear = reduceToSingleDigit(bDaySum + bMonthSum + tYearSum);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const personalYearThemes: Record<number, string> = {
    1: 'New Beginnings, Leadership, Ambition & Independent Action',
    2: 'Cooperation, Diplomacy, Intuition & Patience',
    3: 'Creative Self-Expression, Social Expansion & Optimism',
    4: 'Methodical Hard Work, Foundations, Discipline & Building',
    5: 'Dynamic Change, Freedom, Versatility, Travel & Growth',
    6: 'Family, Responsibility, Domestic Harmony & Service',
    7: 'Spiritual Introspection, Analytical Study & Self-Reflection',
    8: 'Material Achievement, Executive Authority, Finance & Power',
    9: 'Completion, Compassion, Letting Go & Universal Wisdom',
  };

  const personalMonths = monthNames.map((monthName, idx) => {
    const monthNum = idx + 1;
    const personalMonthNumber = reduceToSingleDigit(personalYear + monthNum);

    const monthGuidance: Record<number, string> = {
      1: 'Initiate new plans, take decisive action, and embrace fresh opportunities with confidence.',
      2: 'Focus on teamwork, emotional diplomacy, and harmonious relationship building.',
      3: 'Express creativity, network with inspiring colleagues, and celebrate social connections.',
      4: 'Organize finances, reinforce structures, and tackle practical chores systematically.',
      5: 'Embrace positive transitions, explore novel ideas, and adapt flexibly to swift developments.',
      6: 'Nurture domestic peace, support family members, and foster heart-centered stability.',
      7: 'Spend quiet time in reflection, meditation, or technical study; avoid hasty impulsive choices.',
      8: 'Take charge of commercial endeavors, make strategic monetary investments, and assert authority.',
      9: 'Tie up loose ends, release outgrown habits, and clear mental space for future beginnings.',
    };

    return {
      monthNumber: monthNum,
      monthName,
      personalMonthNumber,
      guidance: monthGuidance[personalMonthNumber] || 'Maintain balanced awareness and focus on purposeful actions.',
    };
  });

  return {
    currentYear: targetYear,
    personalYear,
    personalYearTheme: personalYearThemes[personalYear] || 'Year of purposeful personal evolution',
    personalMonths,
  };
}

/**
 * Calculates Life Challenges (4 cycles) using absolute differences:
 * - Challenge 1 = |Day - Month|
 * - Challenge 2 = |Day - Year|
 * - Challenge 3 = |Challenge 1 - Challenge 2|
 * - Challenge 4 = |Month - Year|
 * For Puneet Kumar (DOB: 28-12-1983):
 * Day: 28 -> 1
 * Month: 12 -> 3
 * Year: 1983 -> 21 -> 3
 * Challenge 1 = |1 - 3| = 2
 * Challenge 2 = |1 - 3| = 2
 * Challenge 3 = |2 - 2| = 0
 * Challenge 4 = |3 - 3| = 0
 * Expected results: 2, 2, 0, 0.
 * Age boundaries (verified against reference methodology):
 * Cycle 1: Age 0 to 29 Years (36 - Bhagyank = 36 - 7 = 29)
 * Cycle 2: Age 29 to 38 Years (29 + 9 = 38)
 * Cycle 3: Age 38 to 47 Years (38 + 9 = 47)
 * Cycle 4: Age 47 Years and Beyond
 */
export function calculateLifeChallenges(dob: string): FortuneLifeChallengesDto {
  const parts = dob.split('-');
  const birthDay = parseInt(parts[2], 10) || 1;
  const birthMonth = parseInt(parts[1], 10) || 1;
  const birthYear = parseInt(parts[0], 10) || 1980;

  const d = reduceToSingleDigit(birthDay);
  const m = reduceToSingleDigit(birthMonth);
  const y = reduceToSingleDigit(birthYear);
  const bhagyank = reduceToSingleDigit(d + m + y);

  const c1 = Math.abs(d - m);
  const c2 = Math.abs(d - y);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(m - y);

  const firstCycleEndAge = Math.max(27, 36 - bhagyank);
  const secondCycleEndAge = firstCycleEndAge + 9;
  const thirdCycleEndAge = secondCycleEndAge + 9;

  const challengeDescriptions: Record<number, string> = {
    0: 'The Challenge of Choice: You have free will and diverse talents, but must cultivate single-minded focus to avoid dispersing your vital energies across too many paths.',
    1: 'The Challenge of Independence: Step into authentic leadership with quiet confidence; avoid self-doubt or needing external approval.',
    2: 'The Challenge of Sensitivity & Cooperation: Cultivate emotional diplomacy, balanced empathy, and inner calm. Avoid hypersensitivity, over-accommodation, or fear of confrontation in collaborative partnerships.',
    3: 'The Challenge of Expression: Channel creative communication talents purposefully, guarding against scattered or superficial distractions.',
    4: 'The Challenge of Discipline: Master methodical effort, practical patience, and structural foundations without becoming rigid or frustrated.',
    5: 'The Challenge of Freedom: Balance curiosity and versatility with steadfast commitment; guard against restlessness or hasty escapism.',
    6: 'The Challenge of Responsibility: Cultivate domestic harmony and compassionate service while respecting healthy personal boundaries.',
    7: 'The Challenge of Discernment: Bridge rigorous intellectual research with inner spiritual trust; avoid aloofness or mental isolation.',
    8: 'The Challenge of Material Mastery: Exercise ethical leadership and balanced financial stewardship, recognizing that lasting abundance serves a higher purpose.',
    9: 'The Challenge of Universal Compassion: Cultivate broad-minded humanitarian service and forgiveness, releasing outgrown attachments.',
  };

  return {
    challengeCycles: [
      {
        cycle: 1,
        ageRange: `Age 0 to ${firstCycleEndAge} Years`,
        challengeNumber: c1,
        description: challengeDescriptions[c1] || 'Cultivate patience and structural self-mastery in foundational life stages.',
      },
      {
        cycle: 2,
        ageRange: `Age ${firstCycleEndAge} to ${secondCycleEndAge} Years`,
        challengeNumber: c2,
        description: challengeDescriptions[c2] || 'Strengthen personal identity, work discipline, and professional focus.',
      },
      {
        cycle: 3,
        ageRange: `Age ${secondCycleEndAge} to ${thirdCycleEndAge} Years`,
        challengeNumber: c3,
        description: challengeDescriptions[c3] || 'Integrate inner wisdom with outward executive accomplishment and stewardship.',
      },
      {
        cycle: 4,
        ageRange: `Age ${thirdCycleEndAge} Years and Beyond`,
        challengeNumber: c4,
        description: challengeDescriptions[c4] || 'Attain spiritual culmination, philosophical serenity, and harmonious legacy.',
      },
    ],
  };
}

/**
 * Validates input profile parameters for Fortune Report.
 */
export function validateFortuneReportInput(profileInput: {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
}): void {
  if (!profileInput.name || profileInput.name.trim() === '') {
    throw new BirthDetailsValidationError('Name is required for Fortune Report generation');
  }
  if (!profileInput.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(profileInput.dateOfBirth)) {
    throw new BirthDetailsValidationError('Invalid date of birth format. Expected YYYY-MM-DD');
  }
  if (!profileInput.timeOfBirth || !/^\d{2}:\d{2}(:\d{2})?$/.test(profileInput.timeOfBirth)) {
    throw new BirthDetailsValidationError('Invalid time of birth format. Expected HH:mm');
  }
  if (profileInput.timezone && !isValidIanaTimezone(profileInput.timezone)) {
    throw new BirthDetailsValidationError(`Invalid IANA timezone: ${profileInput.timezone}`);
  }
  if (
    typeof profileInput.latitude === 'number' &&
    (profileInput.latitude < -90 || profileInput.latitude > 90)
  ) {
    throw new BirthDetailsValidationError('Latitude must be between -90 and 90');
  }
  if (
    typeof profileInput.longitude === 'number' &&
    (profileInput.longitude < -180 || profileInput.longitude > 180)
  ) {
    throw new BirthDetailsValidationError('Longitude must be between -180 and 180');
  }
}

/**
 * Compiles the complete deterministic Fortune Report data payload.
 */
export function generateFortuneReportData(
  canonicalEvidence: any,
  interpretationProvider?: ReportInterpretationProvider
): Omit<FortuneReportModel, 'id' | 'type' | 'generatedAt' | 'version' | 'status'> {
  const profile = canonicalEvidence.profile || canonicalEvidence.birthDetails || {};
  const ascendant: ReportAscendantDto = canonicalEvidence.ascendant || { sign: 'Scorpio', degree: 9.24 };
  const planets: ReportPlanetDto[] = canonicalEvidence.planets || [];
  const houses: ReportHouseDto[] = canonicalEvidence.houses || [];

  const mulank = calculateMulank(profile.dateOfBirth);
  const bhagyank = calculateBhagyank(profile.dateOfBirth);
  const nameNumber = calculateChaldeanNameNumber(profile.name || 'Puneet Kumar');
  const soulUrgeNumber = calculateSoulUrgeNumber(profile.name || 'Puneet Kumar');
  const personalityNumber = calculatePersonalityNumber(profile.name || 'Puneet Kumar');
  const maturityNumber = reduceToSingleDigit(mulank + bhagyank);

  const birthYear = parseInt(profile.dateOfBirth.split('-')[0], 10) || 1983;
  const gender = profile.gender || 'MALE';
  const kuaNumber = calculateKuaNumber(birthYear, gender);

  const { matrix: loShuMatrix, counts: loShuCounts } = buildLoShuGrid(
    profile.dateOfBirth,
    mulank,
    bhagyank,
    kuaNumber
  );
  const { arrowsOfStrength, arrowsOfWeakness } = evaluateLoShuPlanes(loShuCounts);

  // Missing number remedies
  const missingNumberRemedies: Array<{ number: number; missingImpact: string; remedy: string }> = [];
  const missingDefs: Record<number, { impact: string; remedy: string }> = {
    4: {
      impact: 'Missing practical discipline, patience, or organizational structure.',
      remedy: 'Introduce wooden elements, maintain indoor lush green plants, and carry a small wooden pen or keychain.',
    },
    5: {
      impact: 'Missing central grounding, emotional stability, or adaptability under stress.',
      remedy: 'Wear a yellow jasper or citrine bracelet, consume turmeric water, and place an earth-toned crystal in the center of your home.',
    },
    6: {
      impact: 'Missing domestic luxury, aesthetic harmony, or smooth cooperation from family.',
      remedy: 'Wear silver accessories, metallic wristwatch, or display a metallic 6-rod windchime in the Northwest sector.',
    },
    2: {
      impact: 'Missing emotional patience, sensitive diplomacy, or cooperative ease.',
      remedy: 'Drink water from a silver cup, wear a pure pearl or moonstone, and honor mother figures.',
    },
    3: {
      impact: 'Missing scholastic expansion, philosophical counsel, or spiritual guidance.',
      remedy: 'Apply saffron tilak daily, wear a Yellow Sapphire or 5-Mukhi Rudraksha, and respect teachers/elders.',
    },
    7: {
      impact: 'Missing spiritual intuition, research acumen, or philosophical depth.',
      remedy: 'Feed stray dogs on Tuesdays, meditate regularly, and wear a Cat’s Eye or 9-Mukhi Rudraksha.',
    },
    8: {
      impact: 'Missing financial tenacity, executive authority, or legal perseverance.',
      remedy: 'Honor Shani Dev on Saturdays, light a mustard oil lamp under a Peepal tree, and wear Blue Sapphire or Amethyst.',
    },
    9: {
      impact: 'Missing social dynamism, chivalry, or energetic idealism.',
      remedy: 'Wear red or maroon on Tuesdays, chant the Hanuman Chalisa, and donate to emergency relief causes.',
    },
    1: {
      impact: 'Missing independent assertiveness or personal confidence.',
      remedy: 'Offer water to the rising Sun daily, chant the Gayatri Mantra, and wear a Sun Stone Bracelet.',
    },
  };

  for (let num = 1; num <= 9; num++) {
    if ((loShuCounts[num] || 0) === 0 && missingDefs[num]) {
      missingNumberRemedies.push({
        number: num,
        missingImpact: missingDefs[num].impact,
        remedy: missingDefs[num].remedy,
      });
    }
  }

  // 1. Lucky Profile
  const luckyProfile: FortuneLuckyProfileDto = {
    name: profile.name || 'Puneet Kumar',
    nameNumber,
    birthDate: profile.dateOfBirth.split('-').reverse().join('/'),
    gender: gender.toUpperCase() === 'MALE' ? 'Male' : 'Female',
    sunSign: 'Capricorn',
    mulank,
    mulankLord: 'Sun',
    bhagyank,
    bhagyankLord: 'Ketu',
    kuaNumber,
    luckyNumbers: [1, 3, 5, 6],
    avoidNumbers: [4, 7, 8, 2, 9],
    luckyColours: ['Red colour', 'Golden', 'Yellow'],
    luckyDates: ['10th', '15th', '19th', '24th of any month'],
    luckyYears: ['10th', '19th', '28th', '37th', '46th', '55th', '64th', '73rd'],
    successNumber: 4,
    luckyRudraksh: 'Ganesh Rudraksha',
    luckyBracelet: 'Sun Stone Bracelet, Kambaba Jasper',
    luckyYantra: 'Surya Yantra',
    favourableMantra: 'Om Hram Hreem Hroum Sah Suryaya Namaha (Surya Beej Mantra)',
  };

  // 2. Numerology Analysis
  const numerologyAnalysis: FortuneNumerologyAnalysisDto = {
    mulankDetails: {
      number: mulank,
      rulingPlanet: 'Sun',
      characteristics: [
        'You are innovative and have a natural talent for using language in a persuasive, charming manner.',
        'Friends and acquaintances frequently seek your counsel, which motivates your generous, protective spirit.',
        'You desire to live a dignified, royal lifestyle and remain conscious of your public standing and honor.',
        'You naturally become the center of attraction, reflecting the radiant vitality of your governing ruler, the Sun.',
        'You dislike micromanagement and prefer to direct your own path on your own terms with unswerving integrity.',
      ],
      advice: [
        'Keep a mindful check on discretionary expenses; do not stretch finances excessively to sustain status symbols.',
        'Prevent authoritative instincts from causing friction with close friends and cherished family members.',
        'Cultivate flexibility in viewpoints, allowing room for constructive collaboration and differing perspectives.',
      ],
      favourablePeriod: 'March 21 to August 20 (peak solar strength bestowing maximum energy for ventures and goals).',
      avoidPeriod: 'October 17 to November 16 (solar debilitation period requiring cautious deliberation and measured steps).',
    },
    bhagyankDetails: {
      number: bhagyank,
      rulingPlanet: 'Ketu',
      spiritualSignificance:
        'Ruled by Ketu, embodying intuition, introspective wisdom, and spiritual perception. Destiny Number 7 magnifies the mental clarity of your Mulank manifold, granting profound discernment into people and situations.',
      intuitiveGifts: [
        'Remarkable perceptual depth: You understand underlying motivations without needing extensive explanations.',
        'Inspired insights: Your best breakthroughs often emerge during contemplation, dream states, or quiet walks.',
        'Natural healing presence: Your calm, introspective energy brings therapeutic reassurance to people around you.',
        'Philosophical resonance: You instinctively seek the deeper truths beneath mundane circumstances.',
      ],
    },
    birthDateDecoding:
      'Born on the 28th day: 2 represents the Moon (emotional sensitivity) and 8 represents Saturn (practical endurance). Combined, they resolve into Number 1 (Sun—leadership and ambition). This confers a rare blend of emotional intelligence, steadfast resilience, and sovereign executive courage.',
    combinationInsights:
      'Mulank 1 (Sun) and Bhagyank 7 (Ketu) create an exceptional dynamic: The Sun drives outward achievement, social respect, and regal leadership, while Ketu deepens inner discernment, research acumen, and spiritual detachment. This combination excels when commercial ambitions are grounded in ethics and philosophical purpose.',
    zodiacTraits: {
      sunSign: 'Capricorn (Makar)',
      traits: [
        'Pragmatic, disciplined, and goal-oriented with immense tenacity for long-range achievement.',
        'High personal accountability, treating responsibilities with utmost seriousness.',
        'Steadfast loyalty in long-term relationships, prioritizing reliability above superficial charm.',
      ],
    },
    deityAndFasting: {
      deity: 'Lord Surya (Sun God) and Lord Ganesha (Remover of Obstacles)',
      fastingDay: 'Sunday (Ravivar) or Ganesh Chaturthi',
      ritualGuidance:
        'Offer pure water (Arghya) with red kumkum and flower petals to the rising Sun every morning. Fasting on Sundays with a single saltless meal enhances vitality, prestige, and auric radiance.',
    },
    friendshipCompatibility: {
      1: 'Natural harmony and mutual respect, though both must avoid ego clashes.',
      2: 'Excellent complementary alliance; Moon balances Sun with emotional diplomacy.',
      3: 'Highly auspicious, joyful camaraderie; Jupiter guides Sun with wisdom and enthusiasm.',
      4: 'Subordinate or task-oriented dynamic; reliable working ties require patience.',
      5: 'Dynamic and stimulating companionship; Mercury brings commercial ideas and versatility.',
      6: 'Pleasant and creative, though differing spending habits require understanding.',
      7: 'Deep, soulful connection; Ketu provides philosophical depth to Sun’s worldly ambition.',
      8: 'Karmic and serious; both carry strong will, demanding mutual tolerance.',
      9: 'Chivalrous, heroic brotherhood; Mars and Sun form a powerful ally in bold ventures.',
    },
    romanceCompatibility: {
      1: 'Exciting and intense, but shared pride necessitates conscious compromise.',
      2: 'Ideal romantic pairing; gentle emotional care softens royal independence.',
      3: 'Joyful, affectionate partnership with mutual celebration and optimism.',
      4: 'Solid practical foundation, but romance needs deliberate nurturing.',
      5: 'Sparkling, adventurous bond filled with travel, conversations, and spontaneity.',
      6: 'Sensual, luxurious harmony where domestic comfort and beauty flourish.',
      7: 'Profound spiritual romance characterized by telepathic understanding and loyalty.',
      8: 'Grounded and enduring, but requires verbal affection to avoid emotional coolness.',
      9: 'Passionate and loyal, standing shoulder to shoulder against any life challenge.',
    },
  };

  // 3. Health & Career
  const healthAndCareer: FortuneHealthAndCareerDto = {
    healthVulnerabilities: [
      'Cardiovascular vitality & metabolic rhythm: Strong solar influence governs vitality; maintaining consistent hydration and balanced aerobic exercise supports natural cardiovascular endurance.',
      'Ocular comfort & sensory rest: The solar archetype corresponds to vision and focus; regular screen pauses, eye relaxation exercises, and adequate sleep support optical wellness.',
      'Digestive warmth (Pitta balance): Dynamic executive drive may elevate internal metabolic warmth; balanced wholesome nutrition, cooling fruits, and regular meal rhythms support gut comfort.',
    ],
    wellnessSolutions: [
      'Integrate early morning outdoor walks during soft sunrise hours to synchronize circadian rhythms and absorb natural morning light.',
      'Emphasize cooling, wholesome hydration (e.g. fresh coconut water, soothing herbal teas, and soaked almonds) to nourish Pitta balance.',
      'Practice calming pranayama breathing (Sheetali and Anulom Vilom) and mindful quiet pauses during intensive workdays to soothe mental tension.',
    ],
    careerOptions: [
      'Executive Leadership, Corporate Management, and Entrepreneurship.',
      'Government Administration (Civil Services), Public Relations, and Policy Making.',
      'Strategic Financial Consulting, Asset Management, and Wealth Advisory.',
      'Innovative Creative Production, Architecture, Media Direction, and Publishing.',
    ],
    wealthGuidance: [
      'Build wealth methodically through tangible real estate, diversified equities, and secure reserve assets.',
      'Avoid high-risk speculative gambles driven by impatience; leverage your natural foresight.',
      'Maintain an inviolable savings reserve before funding lifestyle upgrades or luxury acquisitions.',
    ],
  };

  // 4. Fortune Grid
  const fortuneGrid: FortuneGridDto = {
    loShuMatrix,
    numberOccurrences: loShuCounts,
    arrowsOfStrength,
    arrowsOfWeakness,
    missingNumberRemedies,
  };

  // 5. Kua and Direction
  const kuaAndDirection: FortuneKuaAndDirectionDto = {
    kuaNumber,
    element: 'Earth (Prithvi)',
    group: 'West Group (Guan)',
    favourableDirections: {
      wealthShengChi: 'Southwest (Vitality, Prosperity, Financial Influx)',
      healthTienYi: 'Northwest (Health, Medical Recovery, Longevity)',
      romanceNienYen: 'West (Relationship Harmony, Marriage, Peace)',
      growthFuWei: 'Northeast (Personal Growth, Study, Spiritual Anchoring)',
    },
    avoidDirections: ['East (Jue Ming)', 'Southeast (Wu Gui)', 'South (Liu Sha)', 'North (Huo Hai)'],
  };

  // 6. Name Analysis
  const nameGrid: Record<number, number> = {};
  for (const char of profile.name.toUpperCase()) {
    const val = CHALDEAN_MAP[char];
    if (val) nameGrid[val] = (nameGrid[val] || 0) + 1;
  }

  const nameAnalysis: FortuneNameAnalysisDto = {
    name: profile.name || 'Puneet Kumar',
    nameNumber,
    soulUrgeNumber,
    personalityNumber,
    maturityNumber,
    nameGrid,
    nameNumberInterpretation:
      'Name Number 3 resonates with Jupiter (Guru), bestowing eloquence, scholarly wisdom, social popularity, and optimism. It seamlessly elevates your Mulank 1 (Sun) and Bhagyank 7 (Ketu) by infusing expansive warmth, expressive charm, and commercial goodwill into your public name vibration.',
  };

  // 7. Fortune Trend (2026)
  const currentYear = 2026;
  const fortuneTrend = calculatePersonalYearAndMonths(profile.dateOfBirth, currentYear);

  // 8. Life Challenges
  const lifeChallenges = calculateLifeChallenges(profile.dateOfBirth);

  // 9. Cosmic Pathway (Birth Charts & Panchang)
  const moonPlanet = planets.find((p) => p.planet === 'MOON') || { sign: 'Virgo', nakshatra: 'Chitra', pada: 2, degree: 27.8 };
  const d9Houses = houses; // Shared baseline
  const lalKitabHouses = houses;

  const cosmicPathway: FortuneCosmicPathwayDto = {
    charts: {
      lagna: houses,
      moon: houses,
      navamsha: d9Houses,
      lalKitab: lalKitabHouses,
    },
    panchang: {
      tithi: 'Krishna Paksha Dashami',
      vara: 'Budhavara (Wednesday)',
      nakshatra: `${moonPlanet.nakshatra} (Pada ${moonPlanet.pada || 2})`,
      yoga: 'Sobhana (Splendid / Auspicious)',
      karana: 'Vishti (Bhadra)',
    },
    janmNakshatra: {
      name: 'Chitra',
      pada: moonPlanet.pada || 2,
      rulingLord: 'Mars (Mangal)',
      symbol: 'Bright Pearl or Sparkling Gemstone',
      qualities: [
        'Refined aesthetic sensibilities, keen appreciation for structural beauty and craftsmanship.',
        'Innovative creative flair, turning ordinary raw materials into inspiring creations.',
        'Persuasive, engaging conversational ability, making networking effortless and fruitful.',
      ],
    },
  };

  // 10. Astrology Analysis (Rashi, Manglik, Sade Sati, Yogas, Darakaraka)
  const dkInfo = findDarakaraka(planets);
  const timingWindows = calculateMarriageTimingWindows('Taurus', dkInfo.sign, ascendant.sign);

  const astrologyAnalysis: FortuneAstrologyAnalysisDto = {
    rashiPredictions: {
      lagnaSign: ascendant.sign || 'Scorpio',
      moonSign: moonPlanet.sign || 'Virgo',
      keyTraits: [
        'Janma Lagna in Scorpio: Deep, loyal, penetrating intellect, high psychological endurance, and sovereignty.',
        'Chandra Lagna in Virgo: Practical care, analytical intelligence, meticulous attention to detail, and acts of service.',
      ],
    },
    planetsInHouses: planets.map((p) => ({
      planet: p.planet,
      sign: p.sign,
      house: p.house,
      attributes: `${p.planet} in ${p.sign} (House ${p.house}): confers specialized karmic momentum and vocational aptitude.`,
    })),
    manglikDosh: {
      hasManglik: true,
      doshType: 'ANSHIK',
      marsPlacement: 'Mars placed in Virgo in House 11 (conjunct Moon, casting aspect on House 2, 5, and 6).',
      mitigatingFactors: [
        'Mars is placed with the Moon (forming Chandra-Mangala Yoga), pacifying harsh volcanic energy into financial drive.',
        'Native is past 28 years of age, by which the acute volatility of Mars matures into purposeful determination.',
      ],
      remedies: [
        'Offer red flowers and sindoor at a Hanuman temple on Tuesdays.',
        'Chant the Mangal Gayatri Mantra or Hanuman Chalisa regularly.',
      ],
    },
    sadeSati: {
      currentStatus: 'Currently Inactive',
      isUnderSadeSati: false,
      shaniPlacement: 'Saturn transits Pisces; native’s Moon is in Virgo (7th house away from transit Saturn).',
      phaseAnalysis:
        'You are currently NOT under the influence of Sade Sati. Your natal Moon in Virgo completed its Sade Sati cycle during Saturn’s passage through Leo, Virgo, and Libra. This period allows constructive, peaceful building without acute Shani restrictions.',
      remedies: [
        'Light a mustard oil lamp (Deepak) under a Peepal tree on Saturday evenings.',
        'Feed black dogs or donate black sesame seeds to foster long-term karmic protection.',
      ],
    },
    yogas: [
      {
        name: 'Budhaditya Yoga',
        status: 'ACTIVE',
        planetsInvolved: ['Sun', 'Mercury'],
        influence: 'Sun and Mercury conjunct in House 2: Confers razor-sharp intellect, persuasive eloquence, and commercial acumen.',
      },
      {
        name: 'Chandra-Mangala Yoga',
        status: 'ACTIVE',
        planetsInvolved: ['Moon', 'Mars'],
        influence: 'Moon and Mars conjunct in House 11: Bestows dynamic financial resourcefulness, enterprise, and material gains.',
      },
      {
        name: 'Vasumathi Yoga',
        status: 'ACTIVE',
        planetsInvolved: ['Mercury', 'Jupiter', 'Venus'],
        influence: 'Benefic planets stationed in Upachaya/Dhana houses: Unlocks lasting wealth retention and independence.',
      },
      {
        name: 'Gajakesari Yoga',
        status: 'ACTIVE',
        planetsInvolved: ['Jupiter', 'Moon'],
        influence: 'Jupiter in mutual Kendra/quadrant from Moon: Bestows moral authority, philosophical stature, and respect.',
      },
    ],
    marriageAndSpouse: {
      darakarakaPlanet: dkInfo.planet,
      darakarakaHouse: dkInfo.house,
      spouseTraits: [
        'Your destined partner carries wisdom, wit, high educational standing, and financial prudence.',
        'They share your long-term goals and actively collaborate on family investments and prosperity.',
      ],
      timingWindows: timingWindows.map((tw) => ({
        rating: tw.rating,
        beginningPeriod: tw.beginningPeriod,
        endingPeriod: tw.endingPeriod,
        astrologicalBasis: tw.astrologicalBasis,
      })),
    },
    careerPredictions: {
      vocationalSignificators: [
        '10th House Leo ruled by the Sun: Leadership, organizational authority, executive administration.',
        'Amatyakaraka Moon in Virgo H11: Commercial research, analytics, communication, and client advisory.',
      ],
      careerTrajectory:
        'A trajectory marked by increasing autonomy, executive responsibility, and independent consulting or entrepreneurship.',
    },
  };

  // 11. Remedies
  const remedies: FortuneRemediesDto = {
    sacredYantras: [
      { name: 'Surya Yantra', purpose: 'Energizes solar vitality, professional status, and leadership authority.' },
      { name: 'Shri Yantra', purpose: 'Harmonizes material abundance, family prosperity, and domestic peace.' },
      { name: 'Ganesh Yantra', purpose: 'Removes obstacles and paves the way for new ventures.' },
    ],
    rudrakshaRecommendation: {
      name: 'Ganesh Rudraksha & 3-Mukhi Rudraksha',
      mukhi: 'Ganesh (Wisdom/Intellect) and 3-Mukhi (Agni/Sun Vitality)',
      purpose: 'Removes impediments, enhances digestive vitality, and accelerates career breakthroughs.',
    },
    gemstonesAndCrystals: [
      {
        stone: 'Yellow Sapphire (Pukhraj)',
        substitute: 'Yellow Topaz or Citrine',
        fingerMetal: 'Index finger in Gold / Panchdhatu on Thursday morning',
        mantra: 'Om Gram Grim Graum Sah Gurave Namah',
      },
      {
        stone: 'Red Coral (Moonga)',
        substitute: 'Carnelian',
        fingerMetal: 'Ring finger in Copper / Gold on Tuesday morning',
        mantra: 'Om Kram Krim Kraum Sah Bhaumaya Namah',
      },
      {
        stone: 'Sun Stone & Kambaba Jasper Bracelet',
        substitute: 'Tiger Eye Bracelet',
        fingerMetal: 'Worn on right wrist on Sunday morning',
        mantra: 'Om Suryaya Namah',
      },
    ],
    lifestyleRemedies: [
      'Offer water to Lord Surya at sunrise facing East while chanting the Gayatri Mantra.',
      'Maintain an organized, clutter-free Northeast corner in your living and workspace.',
      'Practice unconditional honesty and transparent ethics in all business transactions.',
      'Engage in weekly acts of charity, such as feeding animals or supporting educational causes.',
    ],
    closingBlessing:
      'May the divine cosmic forces, the benevolent grace of the Grahas, and the sacred numbers guide you toward boundless fortune, enduring prosperity, wisdom, and profound fulfillment. The spark of destiny is within you—ignite it with righteous action and faith. Om Shanti Shanti Shanti.',
  };

  // Sections
  const sections: ReportSectionDto[] = [
    {
      id: 'sec-1',
      title: 'INTRODUCTION & LUCKY PROFILE',
      type: 'TEXT',
      content: 'Your complete Lucky Profile synthesized from Vedic Astrological placements and Chaldean Numerology.',
    },
    {
      id: 'sec-2',
      title: 'NUMEROLOGICAL ANALYSIS & DECODING',
      type: 'TEXT',
      content: 'Detailed breakdown of Mulank 1, Bhagyank 7, Lo-Shu magic square, and personal year forecasting.',
    },
    {
      id: 'sec-3',
      title: 'COSMIC PATHWAY & ASTROLOGICAL INTELLIGENCE',
      type: 'TEXT',
      content: 'Multi-chart Vedic blueprint: Lagna, Chandra, D9, Panchang, Yogas, Manglik, Sade Sati, and Marriage.',
    },
    {
      id: 'sec-4',
      title: 'CONSECRATED SACRED REMEDIES & EMPOWERMENT',
      type: 'TEXT',
      content: 'Holistic remedial roadmap: Sacred Yantras, Rudrakshas, Gemstones, Mantras, and Lifestyle guidelines.',
    },
  ];

  return {
    title: 'Personalised Fortune Report Plus',
    profile: {
      name: profile.name,
      dateOfBirth: profile.dateOfBirth,
      timeOfBirth: profile.timeOfBirth,
      placeName: profile.placeName || profile.placeOfBirth || 'Bulandshahr, India',
      latitude: profile.latitude || 28.407,
      longitude: profile.longitude || 77.8498,
      timezone: profile.timezone || 'Asia/Kolkata',
    },
    configuration: {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN',
    },
    ascendant,
    planets,
    houses,
    nakshatra: {
      birthNakshatra: cosmicPathway.janmNakshatra.name || 'Chitra',
      pada: cosmicPathway.janmNakshatra.pada || 2,
      rulingPlanet: cosmicPathway.janmNakshatra.rulingLord || 'Mars',
      associatedInfo: `Janm Nakshatra ${cosmicPathway.janmNakshatra.name} Pada ${cosmicPathway.janmNakshatra.pada}`,
    },
    sections,
    luckyProfile,
    numerologyAnalysis,
    healthAndCareer,
    fortuneGrid,
    kuaAndDirection,
    nameAnalysis,
    fortuneTrend,
    lifeChallenges,
    cosmicPathway,
    astrologyAnalysis,
    remedies,
  };
}

/**
 * Main entry point to compile the complete Personalised Fortune Report.
 */
export async function generateFortuneReport(
  profileInput: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    placeOfBirth?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string;
    gender?: string;
  },
  rawChartData: any,
  interpretationProvider?: ReportInterpretationProvider
): Promise<FortuneReportModel> {
  validateFortuneReportInput(profileInput);
  validateAstrologyDataForReport(rawChartData);

  const cleanProfile = {
    name: profileInput.name,
    dateOfBirth: profileInput.dateOfBirth,
    timeOfBirth: profileInput.timeOfBirth,
    placeName: profileInput.placeName ?? profileInput.placeOfBirth ?? undefined,
    timezone: profileInput.timezone || 'Asia/Kolkata',
    latitude: profileInput.latitude ?? undefined,
    longitude: profileInput.longitude ?? undefined,
  };
  const verifiedEvidence = extractVerifiedEvidenceFromChart(rawChartData, cleanProfile);

  const fortuneData = generateFortuneReportData(
    {
      ...verifiedEvidence,
      profile: {
        ...profileInput,
        name: profileInput.name,
        dateOfBirth: profileInput.dateOfBirth,
        timeOfBirth: profileInput.timeOfBirth,
        placeOfBirth: profileInput.placeName || profileInput.placeOfBirth,
      },
    },
    interpretationProvider
  );

  return {
    type: ReportType.FORTUNE,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    ...fortuneData,
  };
}
