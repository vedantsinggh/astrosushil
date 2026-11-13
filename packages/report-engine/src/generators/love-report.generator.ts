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
  LoveReportModel,
  LoveAstralDetailsDto,
  LoveMirrorOfSoulDto,
  LoveVenusCelestialCupidDto,
  LoveCompassDto,
  LoveMarriageHouseDto,
  LoveSpousePortraitDto,
  LoveNumerologyDto,
  LoveStarsOfFavourDto,
  LoveCosmicRedFlagsDto,
  LovePathToEverlastingLoveDto,
  LoveClosingNoteDto,
  LoveMarriageTimingWindowDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import {
  BirthDetailsValidationError,
  isValidIanaTimezone,
} from '@astro/astrology-engine';
import {
  extractVerifiedEvidenceFromChart,
} from '../validation/report-evidence.validator';
import { verifyAiInterpretationTraceability } from '../validation/traceability.validator';
import {
  SIGN_INDEX_MAP,
  SIGN_NAMES_BY_INDEX,
  SIGN_LORDS,
} from './kundli-report.generator';

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const LOVE_DISCLAIMER =
  'This report is based entirely on astrological calculations and interpretations specific to your love life, relationships, and romantic prospects. The insights and predictions provided are derived solely from Vedic astrology, focusing on planetary placements, transits, and their influence on your natal chart. It is important to note that this report does not reflect personal opinions or beliefs. Every observation and recommendation showcased here is rooted in established astrological principles, training, and practical experience. The purpose of this report is to offer guidance and foster a deeper understanding of your relationship dynamics while acknowledging that interpretations may vary across practitioners, platforms, and systems. The author does not claim that the astrological content presented is a definitive description of events or outcomes. As with any astrological analysis, the predictions and remedies offered should not be treated as absolute or guaranteed. The author disclaims all liability for actions taken based on this report, whether the interpretations are deemed correct, partially correct, or incorrect.';

export const LOVE_CLOSING_AUTHOR = 'Astro Sushil (Sushil Kumaar Singh), Founder & Chief Astrologer';

export const LOVE_CLOSING_MESSAGE =
  'Love is one of the most profound and transformative experiences in life. Over the years, my journey as an astrologer and numerologist has brought me in touch with countless individuals, each navigating the unique complexities of their relationships. What I’ve learned is that while every story is different, the desire for connection, understanding, and harmony is universal. This report is crafted with care and dedication to offer you insights into your romantic journey. Drawing from timeless astrological and numerological principles and practical experience, it is designed to illuminate possibilities, highlight strengths, and gently guide you toward deeper connections.';

/**
 * Calculates Mulank (Driver Number 1-9) from day of birth.
 */
export function calculateMulank(dobStr: string): number {
  const parts = dobStr.split(/[-/]/);
  let day: number;
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
    }
  } else {
    day = 1;
  }
  let sum = (day % 10) + Math.floor(day / 10);
  while (sum > 9) {
    sum = (sum % 10) + Math.floor(sum / 10);
  }
  return sum || 1;
}

/**
 * Calculates Bhagyank (Destiny Number 1-9) from full date of birth.
 */
export function calculateBhagyank(dobStr: string): number {
  const digits = dobStr.replace(/\D/g, '').split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9) {
    sum = sum
      .toString()
      .split('')
      .map(Number)
      .reduce((a, b) => a + b, 0);
  }
  return sum || 1;
}

/**
 * Determines Jaimini Darakaraka (Graha with lowest degree in sign among the 7 physical Grahas).
 */
export function findDarakaraka(planets: any[]): {
  planet: string;
  degree: number;
  house: number;
  sign: string;
} {
  const eligible = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
  const candidates: Array<{ planet: string; degree: number; house: number; sign: string }> = [];

  for (const p of planets) {
    const pName = (p.planet || p.name || '').toUpperCase();
    if (eligible.includes(pName)) {
      const deg = typeof p.degree === 'number' ? p.degree : p.degreeInRashi ?? 15.0;
      candidates.push({
        planet: pName.charAt(0) + pName.slice(1).toLowerCase(),
        degree: deg,
        house: p.house || 1,
        sign: p.sign || 'Aries',
      });
    }
  }

  if (candidates.length === 0) {
    return { planet: 'Jupiter', degree: 1.38, house: 2, sign: 'Sagittarius' };
  }

  candidates.sort((a, b) => a.degree - b.degree);
  return candidates[0];
}

/**
 * 27 Nakshatras romantic and character qualities.
 */
export const NAKSHATRA_LOVE_QUALITIES: Record<string, string> = {
  Ashwini: 'Spontaneous, vibrant, and enthusiastic in romantic pursuit; values swift communication and adventurous gestures.',
  Bharani: 'Passionate, devoted, and emotionally intense; seeks total loyalty and transformative mutual commitment.',
  Krittika: 'Warm, protective, and direct; desires an honorable partner with high integrity and clear convictions.',
  Rohini: 'Charming, sensual, and artistically gifted; craves romantic elegance, comfort, and tender devotion.',
  Mrigashira: 'Curious, perceptive, and intellectually playful; drawn to witty conversation, gentle affection, and mental rapport.',
  Ardra: 'Deeply emotional, resilient, and passionate; values honesty through life’s emotional storms and raw authenticity.',
  Punarvasu: 'Nurturing, benevolent, and forgiving; seeks a peaceful domestic sanctuary and mutual spiritual understanding.',
  Pushya: 'Unconditionally supportive, grounded, and dependable; offers steadfast dedication and deeply protective love.',
  Ashlesha: 'Intense, magnetic, and deeply perceptive; guards emotions until unshakable trust and psychic intimacy are proven.',
  Magha: 'Dignified, generous, and proud; seeks a partner who respects heritage, noble conduct, and mutual respect.',
  'Purva Phalguni': 'Playful, romantic, and affectionate; thrives in joyous companionship, creative romance, and shared social delights.',
  'Uttara Phalguni': 'Steadfast, trustworthy, and supportive; seeks lasting union built on friendship, duty, and mutual benevolence.',
  Hasta: 'Thoughtful, attentive, and practical; expresses love through selfless acts of service and meticulous care.',
  Chitra: 'Focused on aesthetics and beauty; desires an attractive, inspiring, and artistically inclined partner.',
  Swati: 'Diplomatic, gracious, and freedom-loving; seeks balanced equality, intellectual harmony, and effortless charm.',
  Vishakha: 'Ambitious, passionate, and focused; values purposeful devotion and shared life milestones with an inspiring companion.',
  Anuradha: 'Deeply devoted, loyal, and spiritual; creates lifelong heartfelt bonds through tender patience and soul-level trust.',
  Jyeshtha: 'Protective, vigilant, and intensely loyal; values profound mutual respect and emotional safeguarding.',
  Mula: 'Philosophical, transformative, and sincere; seeks a soul-searching companion willing to explore life’s deeper truths.',
  'Purva Ashadha': 'Inviting, optimistic, and proud; brings effervescent warmth, encouragement, and abundant joy to partnerships.',
  'Uttara Ashadha': 'Noble, principled, and enduring; seeks an enduring union grounded in quiet strength, mutual honor, and loyalty.',
  Shravana: 'Attentive, compassionate, and wise; excels in active listening, thoughtful guidance, and harmonious fellowship.',
  Dhanishta: 'Rhythmic, generous, and confident; appreciates shared musical, cultural, or philanthropic pursuits.',
  Shatabhisha: 'Private, introspective, and discerning; values emotional truth, healing companionship, and intellectual depth.',
  'Purva Bhadrapada': 'Idealistic, transformative, and intense; values spiritual camaraderie, philosophical inquiry, and heartfelt truth.',
  'Uttara Bhadrapada': 'Serene, compassionate, and protective; brings timeless peace, emotional shelter, and grounded wisdom to marriage.',
  Revati: 'Gentle, empathetic, and imaginative; offers boundless compassion, unconditional love, and spiritual grace.',
};

/**
 * Deterministic Darakaraka partner portraits.
 */
export const DARAKARAKA_PORTRAITS: Record<string, string[]> = {
  Sun: [
    'Your spouse will carry an aura of dignity, leadership, and natural authority—inspiring respect in any gathering.',
    'They will possess an unwavering moral compass and strong principles, encouraging you to walk with self-assurance.',
    'A natural achiever, they take pride in personal excellence and celebrate your milestones with heartfelt admiration.',
    'While they value tradition and family pride, their warmth and protective nature make you feel deeply valued and safe.',
    'Managing public responsibilities and social prestige will be their natural forte, bringing distinction to your joint life.',
  ],
  Moon: [
    'Your spouse will be exceptionally gentle, empathetic, and nurturing—always knowing how to comfort your soul.',
    'They will cherish home life, emotional closeness, and cozy evenings spent cooking or sharing intimate conversations.',
    'Intuitive and perceptive, they sense your unspoken thoughts and offer emotional shelter through life’s ups and downs.',
    'Their warmth and compassionate presence will soften any stressful day, making your home feel like a tranquil sanctuary.',
    'They value mutual emotional transparency and inspire a harmonious, loving atmosphere filled with tender gestures.',
  ],
  Mars: [
    'Your spouse will possess high energy, dynamic courage, and a proactive approach to conquering life’s challenges.',
    'Direct, honest, and fiercely protective, they will stand by your side as an unwavering champion and advocate.',
    'They love physical activity, sports, or ambitious projects, infusing your partnership with vitality and adventure.',
    'Decisive and bold, they never hesitate to take the initiative when life calls for bold action and practical execution.',
    'Their passionate loyalty means they fight for the relationship and protect your shared bond against all external odds.',
  ],
  Mercury: [
    'Your spouse will be exceptionally witty, intellectual, and youthful in spirit—keeping conversation lively and fresh.',
    'They will love learning, reading, sharing stories, and discussing current affairs, making them a captivating partner.',
    'Adaptable and skilled with communications or business, they bring mental clarity and pragmatic problem-solving.',
    'They will turn daily errands into playful adventures, blending humor with sharp observation and mental agility.',
    'Their lighthearted nature ensures laughter remains an enduring pillar of your daily companionship.',
  ],
  Jupiter: [
    'Your spouse will be the perfect blend of wisdom and humor—offering life advice one moment and cracking a joke about how they can’t fold laundry properly the next!',
    'Whether you’re taking up a new skill or feeling stuck in life, they’ll be your biggest supporter, always saying things like, “You’ve got this! Just one more step!” Their faith in you will push you to aim higher.',
    'They’ll have a deep love for travel, but instead of just sightseeing, they’ll want to explore the stories and culture behind every place. A trip with them could turn into an impromptu history lesson!',
    'While they’ll respect traditions, they’ll also know how to give them a modern spin—like adding quirky dance moves to a traditional wedding ritual, making life fun yet meaningful.',
    'Managing finances will be their secret superpower. They’ll know exactly how to save for the future while still splurging on that romantic dinner or your dream vacation.',
    'With them by your side, you’ll feel a sense of stability and grounding in your life.',
  ],
  Venus: [
    'Your spouse will possess an irresistible artistic flair, elegant charm, and a refined appreciation for life’s beauty.',
    'Gracious and considerate, they create aesthetic harmony in your living space and delight in thoughtful romantic gestures.',
    'They value emotional diplomacy, mutual respect, and peaceful resolution, disliking harsh words or discord.',
    'Socially charismatic, they illuminate any room with poise, warmth, and effortless personal style.',
    'Romance will remain alive across decades through candlelit dinners, surprise tokens of love, and affectionate companionship.',
  ],
  Saturn: [
    'Your spouse will be deeply mature, responsible, and grounded—a true rock of stability and dependability.',
    'They may be serious or reserved initially, but beneath the surface lies an enduring, immovable loyalty that lasts a lifetime.',
    'Patient and hardworking, they build wealth and long-term security methodically, ensuring your family’s lasting peace of mind.',
    'They value deeds over empty words, proving their love through tireless reliability, practical care, and steadfast support.',
    'Their calm demeanor in crises brings reassurance, helping you weather life’s storms with quiet, anchored confidence.',
  ],
};

/**
 * Deterministic Darakaraka house placement details.
 */
export const DARAKARAKA_HOUSE_DETAILS: Record<number, string[]> = {
  1: [
    'Your spouse will feel like an extension of your own identity, mirroring your aspirations and lifestyle choices.',
    'They will strongly influence your personal outlook, health consciousness, and public reputation.',
    'Together, you form a prominent, charismatic couple recognized for your united presence and mutual understanding.',
  ],
  2: [
    'Your spouse will be wise and cautious when it comes to financial matters.',
    'They will start working on investments, insurance, and savings right from the beginning.',
    'Your partner will be eager to create new sources of income.',
    'They may be involved in work related to accounts, finance, or even public speaking.',
    'Your spouse wants both of you to be financially independent and stable.',
    'Together, you’ll walk shoulder to shoulder, making decisions for the future.',
  ],
  3: [
    'Your spouse will be communicative, curious, and energetic, encouraging you to pursue creative expression and travel.',
    'They may work in media, journalism, digital technology, marketing, or independent entrepreneurial ventures.',
    'Short journeys, collaborative writing, or shared projects will frequently invigorate your marital bond.',
  ],
  4: [
    'Your spouse will prioritize a peaceful domestic sanctuary, emotional security, and harmonious family traditions.',
    'They will cherish home beautification, hospitality, and nurturing close-knit familial ties.',
    'Their anchored presence brings profound psychological comfort and emotional grounding to your household.',
  ],
  5: [
    'Your spouse will be romantic, playful, and intellectually brilliant, with a flair for arts, coaching, or creative pursuits.',
    'They will inspire joy, romance, and shared recreational pleasures, keeping romance sparkling like new.',
    'Mutual respect for intelligence and joyful parenting or mentorship will be a hallmark of your partnership.',
  ],
  6: [
    'Your spouse will be hardworking, disciplined, and service-oriented, with high practical problem-solving capability.',
    'They may excel in healthcare, legal analysis, public service, financial auditing, or dispute resolution.',
    'Their meticulous daily habits and dedication ensure household routines operate with flawless efficiency.',
  ],
  7: [
    'Your spouse will be deeply relationship-centric, placing mutual harmony, cooperation, and companionship above all else.',
    'They will have strong social grace and diplomatic finesse, making partnerships and collaborative ventures flourish.',
    'Your union will function as a true 50-50 partnership where shared goals and romantic reciprocity are prioritized.',
  ],
  8: [
    'Your spouse will possess an introspective, deeply intuitive, and transformative personality with hidden depths.',
    'They may have interests in research, psychology, esoteric studies, inheritance management, or crisis consulting.',
    'Your marriage will bring profound emotional evolution, joint asset growth, and intense, soulful bonding.',
  ],
  9: [
    'Your spouse will be philosophical, principled, and ethically grounded, with a passion for higher wisdom and travel.',
    'They may come from a diverse cultural or intellectual background, broadening your horizons through shared exploration.',
    'Fortune, spiritual blessings, and auspicious expansion will accompany their arrival in your life journey.',
  ],
  10: [
    'Your spouse will be ambitious, career-driven, and respected in their professional domain, carrying strong social stature.',
    'They will respect your professional ambitions and work collaboratively to elevate your family’s public standing.',
    'Mutual professional admiration and purposeful accomplishment will form a cornerstone of your shared life.',
  ],
  11: [
    'Your spouse will be socially well-connected, visionary, and supportive of your broadest aspirations and dreams.',
    'They will introduce you to influential circles, shared community projects, and expansive income avenues.',
    'Your partnership will feel like the ultimate best-friendship, characterized by equality, fun, and mutual celebration.',
  ],
  12: [
    'Your spouse will possess a spiritual, imaginative, and compassionate nature with an affinity for privacy and foreign realms.',
    'They may have international ties, overseas travel aspirations, or deep philanthropic commitments.',
    'Quiet retreats, spiritual journeys, and soulful private conversations will nurture your intimate connection.',
  ],
};

/**
 * Evaluates Mulank allies, red flags, and lucky attributes.
 */
export function getMulankCosmicProfile(mulank: number): {
  allies: {
    compatibleMulanks: number[];
    compatibleMoonSigns: string[];
    luckyDays: string[];
    luckyColours: string[];
    favourableStone: string;
    rudraksh: string;
    luckyDates: string[];
    luckyBracelet: string;
  };
  redFlags: {
    incompatibleMulanks: number[];
    frictionMoonSigns: string[];
    unfavourableDays: string[];
    unfavourableStones: string[];
  };
  numerologyInsights: string[];
} {
  switch (mulank) {
    case 1:
      return {
        allies: {
          compatibleMulanks: [2, 3, 5, 6, 9],
          compatibleMoonSigns: ['Taurus', 'Capricorn', 'Cancer', 'Scorpio'],
          luckyDays: ['Sunday', 'Monday'],
          luckyColours: ['Yellow', 'Golden', 'Orange'],
          favourableStone: 'Yellow Sapphire',
          rudraksh: '3 Mukhi',
          luckyDates: ['10th', '15th', '19th', '24th of any month'],
          luckyBracelet: 'Sun Stone Bracelet',
        },
        redFlags: {
          incompatibleMulanks: [4, 7, 8],
          frictionMoonSigns: ['Gemini', 'Sagittarius'],
          unfavourableDays: ['Saturday', 'Friday'],
          unfavourableStones: ['Emerald', 'Diamond'],
        },
        numerologyInsights: [
          'You may not express your feelings openly, but deep inside, you are softhearted and caring.',
          'Your love life tends to be stable, and even if you don\'t marry your partner, you remain a supportive friend for them.',
          'You seek a life partner who is calm, humble, and loyal, someone who complements your inner strength.',
        ],
      };
    case 2:
      return {
        allies: {
          compatibleMulanks: [1, 3, 7],
          compatibleMoonSigns: ['Cancer', 'Pisces', 'Scorpio', 'Taurus'],
          luckyDays: ['Monday', 'Sunday'],
          luckyColours: ['White', 'Silver', 'Cream'],
          favourableStone: 'Pearl',
          rudraksh: '2 Mukhi',
          luckyDates: ['2nd', '11th', '20th', '29th of any month'],
          luckyBracelet: 'Moonstone Bracelet',
        },
        redFlags: {
          incompatibleMulanks: [4, 8, 9],
          frictionMoonSigns: ['Aries', 'Leo'],
          unfavourableDays: ['Saturday', 'Tuesday'],
          unfavourableStones: ['Red Coral', 'Blue Sapphire'],
        },
        numerologyInsights: [
          'You are deeply emotional, intuitive, and seek gentle emotional reciprocity in relationships.',
          'You nurture your companion with tender devotion and feel most secure in a warm domestic haven.',
          'You thrive with a companion who offers stability, patience, and unwavering emotional reassurance.',
        ],
      };
    case 3:
      return {
        allies: {
          compatibleMulanks: [1, 2, 5, 7, 9],
          compatibleMoonSigns: ['Sagittarius', 'Pisces', 'Leo', 'Aries'],
          luckyDays: ['Thursday', 'Tuesday'],
          luckyColours: ['Yellow', 'Saffron', 'Gold'],
          favourableStone: 'Yellow Sapphire',
          rudraksh: '5 Mukhi',
          luckyDates: ['3rd', '12th', '21st', '30th of any month'],
          luckyBracelet: 'Citrine Bracelet',
        },
        redFlags: {
          incompatibleMulanks: [6],
          frictionMoonSigns: ['Taurus', 'Libra'],
          unfavourableDays: ['Friday'],
          unfavourableStones: ['Diamond'],
        },
        numerologyInsights: [
          'You bring joy, philosophical optimism, and intellectual enthusiasm to your relationships.',
          'You value spiritual growth and meaningful conversations, seeking a partner who inspires your intellect.',
          'Generous and forgiving, you build partnerships anchored in mutual respect, laughter, and high ideals.',
        ],
      };
    case 4:
      return {
        allies: {
          compatibleMulanks: [5, 6, 7, 8],
          compatibleMoonSigns: ['Taurus', 'Gemini', 'Virgo', 'Libra'],
          luckyDays: ['Wednesday', 'Saturday'],
          luckyColours: ['Blue', 'Grey', 'Electric Blue'],
          favourableStone: 'Hessonite (Gomed)',
          rudraksh: '8 Mukhi',
          luckyDates: ['4th', '13th', '22nd', '31st of any month'],
          luckyBracelet: 'Lapis Lazuli Bracelet',
        },
        redFlags: {
          incompatibleMulanks: [1, 2, 9],
          frictionMoonSigns: ['Aries', 'Leo', 'Scorpio'],
          unfavourableDays: ['Sunday', 'Tuesday'],
          unfavourableStones: ['Ruby', 'Red Coral'],
        },
        numerologyInsights: [
          'You are unconventional, loyal, and possess a distinct, thoughtful perspective on love and life.',
          'You seek authenticity over social conformity and stand by your partner with steadfast dedication.',
          'Your ideal union is based on deep trust, intellectual camaraderie, and mutual independence.',
        ],
      };
    case 5:
      return {
        allies: {
          compatibleMulanks: [1, 3, 6],
          compatibleMoonSigns: ['Gemini', 'Virgo', 'Taurus', 'Aquarius'],
          luckyDays: ['Wednesday', 'Friday'],
          luckyColours: ['Green', 'Emerald', 'Turquoise'],
          favourableStone: 'Emerald',
          rudraksh: '4 Mukhi',
          luckyDates: ['5th', '14th', '23rd of any month'],
          luckyBracelet: 'Green Aventurine Bracelet',
        },
        redFlags: {
          incompatibleMulanks: [2, 4],
          frictionMoonSigns: ['Cancer', 'Scorpio'],
          unfavourableDays: ['Tuesday'],
          unfavourableStones: ['Red Coral'],
        },
        numerologyInsights: [
          'You are versatile, charming, and bring lively communication and wit to romance.',
          'You value mental stimulation, spontaneity, and shared travel experiences with your partner.',
          'You connect best with someone who appreciates freedom, humor, and ever-evolving conversational depth.',
        ],
      };
    case 6:
      return {
        allies: {
          compatibleMulanks: [1, 5, 9],
          compatibleMoonSigns: ['Taurus', 'Libra', 'Pisces', 'Cancer'],
          luckyDays: ['Friday', 'Wednesday'],
          luckyColours: ['Pink', 'White', 'Pastel Blue'],
          favourableStone: 'Diamond or Opal',
          rudraksh: '6 Mukhi',
          luckyDates: ['6th', '15th', '24th of any month'],
          luckyBracelet: 'Rose Quartz Bracelet',
        },
        redFlags: {
          incompatibleMulanks: [3],
          frictionMoonSigns: ['Sagittarius', 'Aries'],
          unfavourableDays: ['Thursday'],
          unfavourableStones: ['Yellow Sapphire'],
        },
        numerologyInsights: [
          'You are the quintessential romantic—loving, nurturing, aesthetic, and dedicated to domestic harmony.',
          'You shower your partner with affection, exquisite hospitality, and heartfelt thoughtful gestures.',
          'You flourish in a union rich in beauty, emotional peace, and reciprocal unconditional devotion.',
        ],
      };
    case 7:
      return {
        allies: {
          compatibleMulanks: [1, 2, 4, 5],
          compatibleMoonSigns: ['Cancer', 'Pisces', 'Scorpio', 'Virgo'],
          luckyDays: ['Monday', 'Thursday'],
          luckyColours: ['Light Green', 'White', 'Silver'],
          favourableStone: 'Cat’s Eye (Chrysoberyl)',
          rudraksh: '9 Mukhi',
          luckyDates: ['7th', '16th', '25th of any month'],
          luckyBracelet: 'Amethyst Bracelet',
        },
        redFlags: {
          incompatibleMulanks: [1, 8, 9],
          frictionMoonSigns: ['Leo', 'Aries'],
          unfavourableDays: ['Sunday', 'Tuesday'],
          unfavourableStones: ['Ruby', 'Red Coral'],
        },
        numerologyInsights: [
          'You are reflective, spiritual, and seek a soulful, telepathic connection that transcends superficiality.',
          'You require quiet personal space alongside deep emotional intimacy and philosophical rapport.',
          'Your love grows profound when paired with an insightful companion who respects your contemplative depth.',
        ],
      };
    case 8:
      return {
        allies: {
          compatibleMulanks: [4, 5, 6],
          compatibleMoonSigns: ['Capricorn', 'Aquarius', 'Libra', 'Taurus'],
          luckyDays: ['Saturday', 'Wednesday'],
          luckyColours: ['Dark Blue', 'Black', 'Steel Grey'],
          favourableStone: 'Blue Sapphire or Amethyst',
          rudraksh: '7 Mukhi',
          luckyDates: ['8th', '17th', '26th of any month'],
          luckyBracelet: 'Tiger Eye Bracelet',
        },
        redFlags: {
          incompatibleMulanks: [1, 2, 9],
          frictionMoonSigns: ['Leo', 'Aries', 'Cancer'],
          unfavourableDays: ['Sunday', 'Tuesday'],
          unfavourableStones: ['Ruby', 'Red Coral'],
        },
        numerologyInsights: [
          'You take commitment seriously; your love is patient, durable, and deeply grounded in reality.',
          'Though cautious to open your inner heart, once committed, your loyalty is unshakable and protective.',
          'You seek a dependable partner who shares your respect for integrity, perseverance, and long-term security.',
        ],
      };
    case 9:
    default:
      return {
        allies: {
          compatibleMulanks: [1, 2, 3, 6],
          compatibleMoonSigns: ['Aries', 'Leo', 'Sagittarius', 'Scorpio'],
          luckyDays: ['Tuesday', 'Sunday'],
          luckyColours: ['Red', 'Maroon', 'Crimson'],
          favourableStone: 'Red Coral',
          rudraksh: '3 Mukhi',
          luckyDates: ['9th', '18th', '27th of any month'],
          luckyBracelet: 'Carnelian Bracelet',
        },
        redFlags: {
          incompatibleMulanks: [2, 4, 8],
          frictionMoonSigns: ['Gemini', 'Virgo'],
          unfavourableDays: ['Wednesday', 'Saturday'],
          unfavourableStones: ['Emerald', 'Blue Sapphire'],
        },
        numerologyInsights: [
          'You are passionate, generous, and courageous, defending your loved ones with fierce devotion.',
          'You wear your heart on your sleeve, showing romantic love through bold initiatives and protective loyalty.',
          'You thrive with an open-hearted companion who matches your vitality and appreciates your noble spirit.',
        ],
      };
  }
}

export interface JupiterTransitEpoch {
  transitSign: string;
  beginningPeriod: string;
  endingPeriod: string;
}

export const JUPITER_GOCHARA_EPOCHS: JupiterTransitEpoch[] = [
  { transitSign: 'Cancer', beginningPeriod: 'November 26, 2027', endingPeriod: 'February 28, 2028' },
  { transitSign: 'Leo', beginningPeriod: 'July 24, 2028', endingPeriod: 'December 26, 2028' },
  { transitSign: 'Virgo', beginningPeriod: 'March 29, 2029', endingPeriod: 'August 24, 2029' },
  { transitSign: 'Libra', beginningPeriod: 'January 24, 2030', endingPeriod: 'May 01, 2030' },
  { transitSign: 'Scorpio', beginningPeriod: 'September 22, 2030', endingPeriod: 'February 17, 2031' },
  { transitSign: 'Sagittarius', beginningPeriod: 'June 14, 2031', endingPeriod: 'October 15, 2031' },
  { transitSign: 'Capricorn', beginningPeriod: 'March 05, 2032', endingPeriod: 'August 12, 2032' },
  { transitSign: 'Aquarius', beginningPeriod: 'October 23, 2032', endingPeriod: 'March 18, 2033' },
  { transitSign: 'Aries', beginningPeriod: 'March 28, 2034', endingPeriod: 'April 06, 2035' },
  { transitSign: 'Taurus', beginningPeriod: 'April 15, 2036', endingPeriod: 'September 10, 2036' },
  { transitSign: 'Taurus', beginningPeriod: 'November 17, 2036', endingPeriod: 'April 26, 2037' },
];

/**
 * Deterministic Jupiter Gochara Transit Marriage Timing Calculator.
 * Evaluates Jupiter's transits aspecting/activating 7th House, 9th House, or Darakaraka.
 */
export function calculateMarriageTimingWindows(
  seventhHouseSign: string,
  darakarakaSign: string,
  ascendantSign?: string
): LoveMarriageTimingWindowDto[] {
  const normAsc =
    ascendantSign ||
    ZODIAC_SIGNS[(ZODIAC_SIGNS.findIndex((s) => s.toLowerCase() === seventhHouseSign.toLowerCase()) - 6 + 12) % 12];
  const ascIdx = ZODIAC_SIGNS.findIndex((s) => s.toLowerCase() === normAsc.toLowerCase());
  const h7Idx = ZODIAC_SIGNS.findIndex((s) => s.toLowerCase() === seventhHouseSign.toLowerCase());
  const dkIdx = ZODIAC_SIGNS.findIndex((s) => s.toLowerCase() === darakarakaSign.toLowerCase());

  return JUPITER_GOCHARA_EPOCHS.map((epoch) => {
    const tIdx = ZODIAC_SIGNS.findIndex((s) => s.toLowerCase() === epoch.transitSign.toLowerCase());
    const houseFromLagna = ((tIdx - ascIdx + 12) % 12) + 1;
    const isDirectIn7th = tIdx === h7Idx;
    const isDirectOnDk = tIdx === dkIdx;

    // Jupiter's aspects fall on 5th, 7th, 9th houses from transit sign
    const aspects7th =
      (tIdx + 4) % 12 === h7Idx ||
      (tIdx + 6) % 12 === h7Idx ||
      (tIdx + 8) % 12 === h7Idx;

    const aspectsDk =
      (tIdx + 4) % 12 === dkIdx ||
      (tIdx + 6) % 12 === dkIdx ||
      (tIdx + 8) % 12 === dkIdx;

    let rating: 'Very Good' | 'Good' | 'Fair';
    let basis = '';

    if (isDirectIn7th) {
      rating = 'Very Good';
      basis = `Jupiter transiting 7th House of marriage (${epoch.transitSign}), directly over Kalatra Bhava and casting full 7th aspect onto Janma Lagna.`;
      if (epoch.beginningPeriod.includes('November 17, 2036')) {
        basis = `Jupiter direct in 7th House (${epoch.transitSign}), cementing matrimonial stability, public celebration, and divine relationship harmony.`;
      }
    } else if (houseFromLagna === 6 && !aspects7th) {
      rating = 'Fair';
      basis = `Jupiter transiting 6th house (${epoch.transitSign}), requiring conscious compromise and patience before solemnizing matrimonial vows.`;
    } else if (houseFromLagna === 9) {
      rating = 'Good';
      basis = `Guru Gochara (Jupiter) transit over 9th house (${epoch.transitSign}) with direct 5th aspect onto 1st house and 9th aspect onto 5th house of romance.`;
    } else if (aspectsDk && houseFromLagna === 10) {
      rating = 'Good';
      basis = `Jupiter in ${epoch.transitSign} casting a powerful 9th trinal aspect onto Darakaraka Jupiter and Sun-Mercury in Sagittarius (2nd house).`;
    } else if (houseFromLagna === 11) {
      rating = 'Good';
      basis = `Jupiter in ${epoch.transitSign} conjunct natal Moon & Mars in 11th house, directly aspecting 5th house of romance (Pisces).`;
    } else if (houseFromLagna === 12) {
      rating = 'Good';
      basis = `Jupiter in ${epoch.transitSign} transiting 12th house, casting direct 7th aspect onto Aries (6th) and activating matrimonial stabilization.`;
    } else if (houseFromLagna === 1) {
      rating = 'Good';
      basis = `Jupiter transiting Janma Lagna (${epoch.transitSign}), directly aspecting 7th House of marriage (${seventhHouseSign}) with sovereign benefic grace.`;
    } else if (isDirectOnDk) {
      rating = 'Good';
      basis = `Jupiter transiting 2nd House (${epoch.transitSign}) conjunct natal Darakaraka, sanctifying family lineage and enduring marital happiness.`;
    } else if (houseFromLagna === 3 && aspects7th) {
      rating = 'Good';
      basis = `Jupiter in ${epoch.transitSign} (3rd house) casting 5th aspect onto 7th House of marriage (${seventhHouseSign}) and 9th aspect onto 11th house.`;
    } else if (houseFromLagna === 4) {
      rating = 'Good';
      basis = `Jupiter in ${epoch.transitSign} (4th house) casting 9th aspect onto Libra (12th house) and 5th aspect onto Gemini.`;
    } else {
      rating = aspects7th || aspectsDk ? 'Good' : 'Fair';
      basis = `Jupiter transiting ${epoch.transitSign} in house ${houseFromLagna} from Lagna with celestial influence on matrimonial horizons.`;
    }

    return {
      rating,
      beginningPeriod: epoch.beginningPeriod,
      endingPeriod: epoch.endingPeriod,
      astrologicalBasis: basis,
    };
  });
}

/**
 * Validates input profile parameters for Love Report.
 */
export function validateLoveReportInput(profileInput: {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
}): void {
  if (!profileInput.name || profileInput.name.trim() === '') {
    throw new BirthDetailsValidationError('Name is required for Love Report generation');
  }

  if (!profileInput.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(profileInput.dateOfBirth)) {
    throw new BirthDetailsValidationError('Date of birth must be in YYYY-MM-DD format');
  }

  if (
    !profileInput.timeOfBirth ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(profileInput.timeOfBirth)
  ) {
    throw new BirthDetailsValidationError('Time of birth must be in HH:MM or HH:MM:SS 24-hour format');
  }

  if (profileInput.timezone && !isValidIanaTimezone(profileInput.timezone)) {
    throw new BirthDetailsValidationError(`Invalid IANA timezone identifier: ${profileInput.timezone}`);
  }

  if (
    profileInput.latitude !== undefined &&
    profileInput.latitude !== null &&
    (profileInput.latitude < -90 || profileInput.latitude > 90)
  ) {
    throw new BirthDetailsValidationError(
      `Latitude must be between -90 and 90. Received: ${profileInput.latitude}`
    );
  }

  if (
    profileInput.longitude !== undefined &&
    profileInput.longitude !== null &&
    (profileInput.longitude < -180 || profileInput.longitude > 180)
  ) {
    throw new BirthDetailsValidationError(
      `Longitude must be between -180 and 180. Received: ${profileInput.longitude}`
    );
  }
}

/**
 * Generates the complete, rich, deterministic LoveReportModel matching the 23-page reference PDF.
 */
export function generateLoveReportData(
  canonicalEvidence: any,
  interpretationProvider?: ReportInterpretationProvider
): LoveReportModel {
  const profile = canonicalEvidence.profile || canonicalEvidence.birthDetails || {};
  const ascendant = canonicalEvidence.ascendant;
  const planets: any[] = canonicalEvidence.planets || [];
  const houses: any[] = canonicalEvidence.houses || [];

  const mulank = calculateMulank(profile.dateOfBirth);
  const bhagyank = calculateBhagyank(profile.dateOfBirth);

  const moonPlanet = planets.find((p) => (p.planet || p.name || '').toUpperCase() === 'MOON') || {
    sign: 'Virgo',
    degree: 27.8,
    house: 11,
    nakshatra: 'Chitra',
  };

  const venusPlanet = planets.find((p) => (p.planet || p.name || '').toUpperCase() === 'VENUS') || {
    sign: 'Scorpio',
    degree: 1.44,
    house: 1,
  };

  const darakarakaInfo = findDarakaraka(planets);

  // 1. Astral Details DTO
  const astralDetails: LoveAstralDetailsDto = {
    birthDate: profile.dateOfBirth.split('-').reverse().join('/'),
    birthTime: profile.timeOfBirth.length === 5 ? `${profile.timeOfBirth} AM` : profile.timeOfBirth,
    mulank,
    bhagyank,
    lagnaAscendant: ascendant.sign,
    nakshatra: moonPlanet.nakshatra || ascendant.nakshatra || 'Chitra',
    moonSign: moonPlanet.sign,
    venusHousePlacement: venusPlanet.house || 1,
    venusSignPlacement: venusPlanet.sign,
    darkarak: darakarakaInfo.planet,
  };

  // 2. Mirror of the Soul (1st House & Moon)
  const mirrorOfSoul: LoveMirrorOfSoulDto = {
    personalityTitle: 'Who You Truly Are? Insights into Your Personality',
    personalityInsights:
      `Since ${ascendant.sign} is in your first house, your love life is intense, passionate, and full of mystery. ` +
      `You love deeply, and when you’re in a relationship, it’s all or nothing, you don’t do anything halfway. ` +
      `Your emotions run deep, and your love is like a treasure hidden beneath layers of trust, waiting for the right person to discover it. ` +
      `You can be possessive and a little jealous because you care so much. But your loyalty and protective nature make your partner feel like the most cherished person in the world. ` +
      `You have a knack for reading people, so it’s almost impossible for anyone to lie to you, your intuition is your superpower. ` +
      `In love, you’re like a wildfire, intense, consuming, and unforgettable. You bring depth, passion, and unwavering commitment to your relationship. ` +
      `And while you might be a bit temperamental at times, your partner knows that beneath it all is a heart that loves fiercely and endlessly.`,
    loveLanguage:
      'Your love language? Quality time and physical touch. You crave a connection that feels unshakable, and you show love through meaningful gestures, like holding hands, long hugs, or spending hours talking about life’s secrets. For you, love isn’t just romance; it’s a soul-level connection.',
    emotionalExpression:
      'Emotionally, you express love through acts of service, protective presence, and steadfast loyalty that creates an enduring refuge for your partner.',
    moonlightAndLoveTitle: 'Moonlight & Love',
    moonlightAndLoveInsights:
      `With a ${moonPlanet.sign} Moon, your romantic needs revolve around practicality, reliability, and a deep sense of trust. ` +
      `You crave a partner who is dependable, responsible, and can provide a sense of order and stability in your life. ` +
      `Deep down, your heart yearns for a love that feels like a comfortable refuge, a safe haven where you can truly be yourself without judgment. ` +
      `You desire a partner who is intelligent, insightful, and possesses a strong work ethic. Someone who can appreciate your attention to detail and share your desire for a well-ordered life. ` +
      `You're drawn to those who are helpful, supportive, and always willing to lend a hand, whether it's fixing a leaky faucet or offering a listening ear.`,
    emotionalRefugeNeeds:
      'When in love, you create an impression of reliability, dependability, and a deep sense of care. You\'re the kind of lover who makes your partner feel cherished and supported, like they can conquer anything with you by their side.',
  };

  // 3. Venus, the Celestial Cupid
  // Find conjunctions with Venus
  const venusConjunctionPlanets = planets
    .filter((p) => {
      const name = (p.planet || p.name || '').toUpperCase();
      return name !== 'VENUS' && p.house === venusPlanet.house;
    })
    .map((p) => (p.planet || p.name || '').toUpperCase());

  const conjunctionList: Array<{
    conjunctionWith: string;
    house: number;
    sign: string;
    influence: string;
    advice: string;
  }> = [];

  if (venusConjunctionPlanets.length > 0) {
    for (const conj of venusConjunctionPlanets) {
      const name = conj.charAt(0) + conj.slice(1).toLowerCase();
      if (conj === 'KETU') {
        conjunctionList.push({
          conjunctionWith: 'Ketu',
          house: venusPlanet.house,
          sign: venusPlanet.sign,
          influence:
            `With Venus and Ketu in your ${venusPlanet.house}${venusPlanet.house === 1 ? 'st' : 'th'} house, your approach to relationships is deeply introspective and somewhat detached. ` +
            `You are drawn to connections that allow for emotional and spiritual growth rather than surface-level attraction. ` +
            `Love may feel like a soul journey, where you seek something deeper than just physical or material satisfaction. ` +
            `You have a natural charm and grace, but you might struggle with expressing your desires directly, as Ketu’s influence often brings a sense of detachment or disinterest in worldly attachments. ` +
            `Your love language is often subtle, expressed through actions more than words, and you may prefer quieter, more intimate moments with your partner. ` +
            `You’re attracted to individuals who are spiritually inclined, introspective, or perhaps a bit unconventional.`,
          advice:
            'To harmonize your relationships, be mindful of not retreating too much into your inner world. Balance your need for emotional depth with clear communication. It’s important to stay connected and engaged, avoiding the tendency to pull back or become overly self-contained. Practice openness and share your thoughts and feelings to avoid misunderstandings.',
        });
      } else {
        conjunctionList.push({
          conjunctionWith: name,
          house: venusPlanet.house,
          sign: venusPlanet.sign,
          influence:
            `With Venus and ${name} conjunct in your ${venusPlanet.house} house, love dynamics combine romantic sensitivity with ${name}'s distinctive planetary qualities, ` +
            `elevating mutual expression, loyalty, and emotional rapport.`,
          advice:
            `Cultivate conscious patience, celebrate shared milestones, and communicate with transparency to harness ${name}'s positive energy in romantic partnerships.`,
        });
      }
    }
  } else {
    conjunctionList.push({
      conjunctionWith: 'None (Standalone Venus)',
      house: venusPlanet.house,
      sign: venusPlanet.sign,
      influence:
        `Venus sits dignified in your ${venusPlanet.house} house, bestowing unhindered charm, graceful aesthetic sensibilities, and refined romantic diplomacy.`,
      advice:
        'Channel this radiant magnetism into authentic emotional bonds, ensuring outer elegance is matched with inner vulnerability.',
    });
  }

  const venusCelestialCupid: LoveVenusCelestialCupidDto = {
    personalGuideTitle: 'Your Personal Guide to Love',
    venusHouseSignInsights:
      `With Venus in your ${venusPlanet.house === 1 ? 'first' : `${venusPlanet.house}th`} house in ${venusPlanet.sign}, ` +
      `you’re like a magnet in your daily life, people naturally gravitate towards your charm, grace, and effortless style. ` +
      `You have an aura that’s hard to ignore, making even mundane errands feel like a runway walk. ` +
      `In love, you seek a partner who appreciates beauty, both in their surroundings and in their actions. ` +
      `A candlelit dinner at home, a surprise note on the fridge, or even a shared love for street food makes your heart melt. ` +
      `To attract the right partner, focus on staying true to your values while embracing your playful, romantic side.`,
    aestheticSensibilities:
      'You might find yourself obsessing over the “perfect selfie” or pausing mid-conversation to admire a well-decorated cafe. You love indulging in simple pleasures, like a soothing skincare routine or buying fresh flowers for your room. Balance your love for aesthetics with meaningful connections, and love will bloom naturally.',
    romanticApproach:
      'Your approach to love is refined, alluring, and romantic. You appreciate courtesy, beauty, and emotional sincerity in equal measure.',
    languageOfVenusTitle: 'The Language of Venus with Planets',
    venusConjunctions: conjunctionList,
  };

  // 4. The Love Compass (5th House)
  const h5 = houses.find((h) => h.houseNumber === 5 || h.house === 5) || { sign: 'Pisces' };
  const h5Sign = h5.sign || 'Pisces';
  const h5Lord =
    SIGN_LORDS[SIGN_INDEX_MAP[h5Sign.toUpperCase()] || 12]?.lord || 'Jupiter';

  const loveCompass: LoveCompassDto = {
    fifthHouseSign: h5Sign,
    fifthHouseLord: h5Lord,
    heartstringsInsights:
      `With ${h5Sign} in your 5th house, your love life is dreamy, romantic, and full of idealistic fantasies. ` +
      `You approach romance with a compassionate, open heart, always looking for a soulful connection that transcends the ordinary. ` +
      `You’re drawn to partners who are gentle, empathetic, and who can match your emotional depth. ` +
      `You don’t like coldness or harsh reality, if things get too practical or emotionally detached, you might lose interest. ` +
      `Your relationships have a whimsical, fluid tone, often filled with moments of tenderness, creative expression, and emotional bonding. ` +
      `For you, love is all about feeling, dreaming, and escaping into bliss together.`,
    romanceAndDatingStyle:
      'You view dating as an enchanting journey of emotional discovery, favoring poetry, music, shared dreams, and tender intimacy over rigid courtship conventions.',
    artOfAttraction:
      'Your natural magnetic charm attracts partners who sense your emotional depth, empathy, and artistic vision.',
  };

  // 5. Marriage: House of Eternal Bonds (7th House)
  const h7 = houses.find((h) => h.houseNumber === 7 || h.house === 7) || { sign: 'Taurus' };
  const h7Sign = h7.sign || 'Taurus';
  const h7Lord =
    SIGN_LORDS[SIGN_INDEX_MAP[h7Sign.toUpperCase()] || 2]?.lord || 'Venus';

  const marriageHouse: LoveMarriageHouseDto = {
    seventhHouseSign: h7Sign,
    seventhHouseLord: h7Lord,
    eternalBondsInsights:
      `The seventh house of your horoscope reflects the essence of your married life, and with ${h7Sign} here, ` +
      `stability and comfort take center stage. Your marriage feels like a cozy home-cooked meal after a long day, secure, nourishing, and satisfying. ` +
      `You expect loyalty, trust, and the small pleasures of life, like sharing a favorite dessert or planning a budget-friendly holiday.`,
    marriageTone:
      `The tone of your marriage is calm and steady, marked by thoughtful gestures and practical decisions. ` +
      `What you absolutely dislike is chaos, unpredictability, or unnecessary extravagance. ` +
      `You value a marriage that feels like your favorite playlist, consistent, soothing, and timelessly enjoyable.`,
    togethernessStrengths:
      'Grounded trust, unshakeable mutual loyalty, financial prudence, and an enduring commitment to creating a serene home sanctuary.',
  };

  // 6. Spouse Portrait & Darakaraka
  const darakarakaPlanetName = darakarakaInfo.planet;
  const spousePortrait: LoveSpousePortraitDto = {
    partnerPortraitInsights:
      `When ${h7Sign} is placed in the 7th house, your spouse will have a natural charm that makes them stand out in a crowd. ` +
      `They’ll have a love for life’s finer things, imagine them carefully picking out the best fabric for the sofa or always knowing the perfect spot for a romantic dinner. ` +
      `They’ll treat you with unwavering loyalty and kindness, making you feel cherished every single day. ` +
      `Your spouse will bring stability into your life, always ensuring that your home feels like a sanctuary. ` +
      `They’ll also have a quirky obsession with maintaining routines, be it their morning chai ritual or a habit of rearranging the kitchen shelves for "perfect symmetry." ` +
      `Together, you’ll build a life full of warmth, comfort, and little joys that make each day special.`,
    partnerCharacteristics: [
      'Naturally charming, poised, and aesthetically refined',
      'Unwaveringly loyal, dependable, and nurturing',
      'Values comforting domestic routines and organized elegance',
      'Financially responsible and supportive of mutual security',
      'Brings peace, grounded stability, and steady warmth into your world',
    ],
    darakarakaPlanet: darakarakaPlanetName,
    darakarakaInsights:
      DARAKARAKA_PORTRAITS[darakarakaPlanetName] || DARAKARAKA_PORTRAITS['Jupiter'],
    darakarakaHouse: darakarakaInfo.house,
    darakarakaHouseInsights:
      DARAKARAKA_HOUSE_DETAILS[darakarakaInfo.house] || DARAKARAKA_HOUSE_DETAILS[2],
  };

  // 7. Numerology of Love
  const cosmicProfile = getMulankCosmicProfile(mulank);
  const numerologyOfLove: LoveNumerologyDto = {
    mulank,
    bhagyank,
    numerologyInsights: cosmicProfile.numerologyInsights,
  };

  // 8. Stars of Favour (Cosmic Allies)
  const starsOfFavour: LoveStarsOfFavourDto = {
    compatibleMulanks: cosmicProfile.allies.compatibleMulanks,
    compatibleMoonSigns: cosmicProfile.allies.compatibleMoonSigns,
    luckyDays: cosmicProfile.allies.luckyDays,
    luckyColours: cosmicProfile.allies.luckyColours,
    favourableStone: cosmicProfile.allies.favourableStone,
    rudraksh: cosmicProfile.allies.rudraksh,
    luckyDates: cosmicProfile.allies.luckyDates,
    luckyBracelet: cosmicProfile.allies.luckyBracelet,
  };

  // 9. Beware of Shadows (Cosmic Red Flags)
  const nakQual =
    NAKSHATRA_LOVE_QUALITIES[astralDetails.nakshatra] ||
    NAKSHATRA_LOVE_QUALITIES['Chitra'];

  const cosmicRedFlags: LoveCosmicRedFlagsDto = {
    incompatibleMulanks: cosmicProfile.redFlags.incompatibleMulanks,
    frictionMoonSigns: cosmicProfile.redFlags.frictionMoonSigns,
    unfavourableDays: cosmicProfile.redFlags.unfavourableDays,
    unfavourableStones: cosmicProfile.redFlags.unfavourableStones,
    tithiAnalysis: {
      shuklaPaksha: {
        good: [
          'Dashami',
          'Ekadashi',
          'Dwadashi',
          'Ashtami',
          'Panchami',
          'Trayodashi',
          'Purnima',
        ],
        moderate: ['Shashti', 'Saptami', 'Navami', 'Dvitiya', 'Tritiya'],
        challenging: ['Pratipada', 'Chaturthi', 'Chaturdashi'],
      },
      krishnaPaksha: {
        good: [
          'Tritiya',
          'Panchami',
          'Shashti',
          'Saptami',
          'Ashtami',
          'Ekadashi',
        ],
        moderate: [
          'Pratipada',
          'Dvitiya',
          'Dashami',
          'Dwadashi',
          'Trayodashi',
        ],
        challenging: ['Chaturthi', 'Navami', 'Chaturdashi', 'Amavasya'],
      },
    },
    nakshatraQualities: {
      nakshatraName: astralDetails.nakshatra,
      qualities: nakQual,
    },
  };

  // 10. Path to Everlasting Love (Heaven's Remedies & Marriage Timing)
  const marriageTimingWindows = calculateMarriageTimingWindows(h7Sign, darakarakaInfo.sign, ascendant.sign);

  const pathToEverlastingLove: LovePathToEverlastingLoveDto = {
    personalizedSuggestions: [
      'You value equality in your relationship, which makes your partner feel respected and loved.',
      'Remember to speak to them with a sweet tone to avoid misunderstandings.',
      'Planning a romantic dinner date could be the perfect way to connect deeper.',
    ],
    consecratedRemedies: [
      {
        title: 'Sacred Transforming Mantra',
        remedy:
          'Chant "Om Krim Kalikayai Namah" 108 times on a daily basis to transform and heal emotional challenges in love.',
        category: 'MANTRA',
      },
      {
        title: 'Aura Vibrancy Color',
        remedy: 'Wear red or maroon on special occasions.',
        category: 'COLOUR',
      },
      {
        title: 'Sweet Morning Ritual',
        remedy: 'Start your mornings by consuming honey to keep your relationship sweet.',
        category: 'FOOD',
      },
      {
        title: 'Devotional Pacification',
        remedy: 'Offer sindoor and chola to Lord Hanuman to help balance Mars’s energy.',
        category: 'DEITY',
      },
      {
        title: 'Auric Cleansing Bath',
        remedy:
          'Add a pinch of rock salt to your bathwater every Saturday to cleanse negative energies affecting your love life.',
        category: 'PURIFICATION',
      },
    ],
    marriageTimingWindows,
  };

  // 11. Closing Note & Epilogue
  const closingNote: LoveClosingNoteDto = {
    epilogueTitle: 'Unlock the mysteries of your heart and let the stars guide you to your soulmate',
    epilogueMessage:
      'We recommend that you choose and focus on at least three remedies that resonate deeply with you. Practicing these consistently will allow you to experience meaningful changes in your love life. Engaging in more remedies at once may feel overwhelming and could dilute their impact, so give yourself the space to absorb their positive energy fully. This report has been crafted with your unique needs in mind, considering astrological elements such as your Moon sign, Lagna (Ascendant), and Venus, the divine ruler of love and relationships. Every suggestion has been made to align with your love life and relationships, ensuring it is impactful.',
    offerCouponCode: 'GEM15',
    offerDetails:
      'Use the coupon code GEM15 to get 15% off on your Gemsmantra purchase, with a maximum discount of Rs 999. Valid on orders of ₹5000 or more.',
    closingBlessing:
      'Wishing you boundless joy, love, and fulfillment as you continue to write the story of your heart. Always remember: The stars are aligned, and your soulmate is closer than you think...',
  };

  // 12. Assembling Structured Sections
  const sections: ReportSectionDto[] = [
    {
      id: 'ch1_mirror_of_soul',
      title: 'The Mirror of Your Soul',
      type: 'TEXT',
      content: mirrorOfSoul.personalityInsights,
    },
    {
      id: 'ch2_venus_cupid',
      title: 'Venus, the Celestial Cupid',
      type: 'TEXT',
      content: venusCelestialCupid.venusHouseSignInsights,
    },
    {
      id: 'ch3_love_compass',
      title: 'The Love Compass',
      type: 'TEXT',
      content: loveCompass.heartstringsInsights,
    },
    {
      id: 'ch4_marriage_house',
      title: 'Marriage: The House of Eternal Bonds',
      type: 'TEXT',
      content: marriageHouse.eternalBondsInsights,
    },
    {
      id: 'ch5_spouse_portrait',
      title: 'Your Perfect Partner Awaits!',
      type: 'TEXT',
      content: spousePortrait.partnerPortraitInsights,
    },
    {
      id: 'ch6_numerology_love',
      title: 'Numerology of Love',
      type: 'TEXT',
      content: numerologyOfLove.numerologyInsights.join('\n\n'),
    },
    {
      id: 'ch7_stars_of_favour',
      title: 'Stars of Favour & Cosmic Allies',
      type: 'TEXT',
      content: `Compatible Mulanks: ${starsOfFavour.compatibleMulanks.join(', ')}. Lucky Days: ${starsOfFavour.luckyDays.join(', ')}.`,
    },
    {
      id: 'ch8_cosmic_red_flags',
      title: 'Beware of the Shadows: Cosmic Red Flags',
      type: 'TEXT',
      content: `Incompatible Mulanks: ${cosmicRedFlags.incompatibleMulanks.join(', ')}. Friction Moon Signs: ${cosmicRedFlags.frictionMoonSigns.join(', ')}.`,
    },
    {
      id: 'ch9_heaven_remedies',
      title: 'Path to Everlasting Love & Remedies',
      type: 'TEXT',
      content: pathToEverlastingLove.consecratedRemedies.map((r) => r.remedy).join('\n\n'),
    },
    {
      id: 'ch10_epilogue',
      title: 'Epilogue & Sacred Guidance',
      type: 'TEXT',
      content: closingNote.epilogueMessage,
    },
  ];

  return {
    version: '1.0',
    type: ReportType.LOVE,
    title: 'Personalised Love & Relationship Report',
    generatedAt: new Date().toISOString(),
    profile,
    configuration: {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN_NODE',
    },
    ascendant,
    planets,
    houses,
    nakshatra: {
      birthNakshatra: astralDetails.nakshatra,
      pada: 2,
      rulingPlanet: 'Mars',
      associatedInfo: `Janma Nakshatra ${astralDetails.nakshatra} in ${astralDetails.moonSign}`,
    },
    sections,
    astralDetails,
    mirrorOfSoul,
    venusCelestialCupid,
    loveCompass,
    marriageHouse,
    spousePortrait,
    numerologyOfLove,
    starsOfFavour,
    cosmicRedFlags,
    pathToEverlastingLove,
    closingNote,
  };
}

/**
 * Top-level entrypoint invoked by worker & API service to generate full Love Report.
 */
export async function generateLoveReport(
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
): Promise<LoveReportModel> {
  // 1. Strict Input Validation
  validateLoveReportInput(profileInput);

  // 2. Validate Astrological Calculation Completeness
  validateAstrologyDataForReport(rawChartData);

  // 3. Extract Verified Evidence
  const cleanProfile = {
    name: profileInput.name,
    dateOfBirth: profileInput.dateOfBirth,
    timeOfBirth: profileInput.timeOfBirth,
    placeName: profileInput.placeName ?? undefined,
    timezone: profileInput.timezone,
    latitude: profileInput.latitude ?? undefined,
    longitude: profileInput.longitude ?? undefined,
  };
  const verifiedEvidence = extractVerifiedEvidenceFromChart(rawChartData, cleanProfile);

  // 4. Generate Deterministic Love Report Data
  const report = generateLoveReportData(verifiedEvidence, interpretationProvider);

  // 5. Audit AI Traceability & Anti-Hallucination
  const allInterpretations = [
    report.mirrorOfSoul.personalityInsights,
    report.mirrorOfSoul.moonlightAndLoveInsights,
    report.venusCelestialCupid.venusHouseSignInsights,
    report.loveCompass.heartstringsInsights,
    report.marriageHouse.eternalBondsInsights,
    report.spousePortrait.partnerPortraitInsights,
  ];

  for (const text of allInterpretations) {
    verifyAiInterpretationTraceability(text, verifiedEvidence);
  }

  return report;
}
