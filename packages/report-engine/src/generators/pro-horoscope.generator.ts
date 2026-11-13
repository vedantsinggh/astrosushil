import {
  ProHoroscopeModel,
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  VargaSummaryDto,
  ShadbalaItemDto,
  BhavaBalaItemDto,
  ReportSectionDto,
  HoroscopeMoonSignDetailsDto,
  HoroscopeYearlyOverviewDto,
  HoroscopeLifeDomainDto,
  HoroscopePlanetaryInfluenceDto,
  HoroscopeFavorableUnfavorableDto,
  HoroscopeGemstonesDto,
  HoroscopeEmpoweredPathwaysDto,
  HoroscopeNumerologyForecastDto,
  HoroscopeAffirmationDto,
  HoroscopeQuarterlyForecastDto,
  HoroscopeMonthlyMatrixItemDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import {
  VargaCalculator,
  VargaType,
  ShadbalaCalculator,
  calculateBhavaBala,
  PlanetSymbol,
  AstroChart,
  AstrologyConfig,
  SHADBALA_MINIMUM_REQUIREMENTS,
  ShadbalaPlanet,
  RASHIS,
  getRashiIndex,
  normalizeBirthTime,
  BirthDetails,
  BirthDetailsValidationError,
  isValidIanaTimezone,
} from '@astro/astrology-engine';
import {
  validateVerifiedAstrologyEvidence,
  getEvidenceRequirementsForReport,
  extractVerifiedEvidenceFromChart,
} from '../validation/report-evidence.validator';
import { verifyAiInterpretationTraceability } from '../validation/traceability.validator';
import { ReportSectionComposer } from '../composition/report-section-composer';

// -----------------------------------------------------------------------------
// CONSTANTS & CANONICAL METADATA FOR 12 MOON SIGNS
// -----------------------------------------------------------------------------

export interface MoonSignMeta {
  index: number;
  englishName: string;
  sanskritName: string;
  lord: string;
  element: string;
  modality: string;
  symbol: string;
  syllables: string;
  favorableColors: Array<{ color: string; reason: string }>;
  unfavorableColors: Array<{ color: string; reason: string }>;
  luckyDates: Array<{ dates: string; reason: string; tip: string }>;
  unluckyDates: Array<{ dates: string; reason: string; tip: string }>;
  primaryGem: {
    name: string;
    sanskritName: string;
    rulingPlanet: string;
    benefits: string;
    wearingInstructions: {
      finger: string;
      metal: string;
      day: string;
      time: string;
      mantra: string;
    };
  };
  secondaryGem: {
    name: string;
    sanskritName: string;
    rulingPlanet: string;
    benefits: string;
    wearingInstructions: {
      finger: string;
      metal: string;
      day: string;
      time: string;
      mantra: string;
    };
  };
  personalityTraits: Array<{ name: string; description: string }>;
}

export const MOON_SIGN_CATALOG: Record<number, MoonSignMeta> = {
  1: {
    index: 1,
    englishName: 'Aries',
    sanskritName: 'Mesha',
    lord: 'Mars',
    element: 'Fire',
    modality: 'Cardinal (Movable)',
    symbol: 'The Ram',
    syllables: 'Chu, Che, Cho, La, Lee, Loo, Le, Lo, A',
    favorableColors: [
      { color: 'Crimson Red', reason: 'Directly energizes Mars, your planetary ruler, amplifying confidence and vitality.' },
      { color: 'Coral Orange', reason: 'Stimulates pioneering ambition and courage in professional challenges.' },
      { color: 'Golden Yellow', reason: 'Connects with friendly Jupiter to attract auspicious educational and spiritual opportunities.' },
    ],
    unfavorableColors: [
      { color: 'Jet Black', reason: 'Associated with Saturn, dampening fiery enthusiasm and slowing progress.' },
      { color: 'Dull Grey', reason: 'Creates psychological sluggishness and indecision.' },
    ],
    luckyDates: [
      { dates: '9th, 18th, 27th', reason: 'Resonates with Martian number 9.', tip: 'Schedule product launches, competitive trials, and critical negotiations on these dates.' },
    ],
    unluckyDates: [
      { dates: '8th, 17th, 26th', reason: 'Saturnian vibrations clash with Mars.', tip: 'Avoid rash actions or confrontations on these dates. Practice patience.' },
    ],
    primaryGem: {
      name: 'Red Coral',
      sanskritName: 'Moonga',
      rulingPlanet: 'Mars',
      benefits: 'Fortifies physical vitality, sharpens leadership acumen, and shields against psychic fatigue.',
      wearingInstructions: {
        finger: 'Ring Finger',
        metal: 'Copper or Gold',
        day: 'Tuesday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Kraam Kreem Kroum Sah Bhaumaya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Yellow Sapphire',
      sanskritName: 'Pukhraj',
      rulingPlanet: 'Jupiter',
      benefits: 'Enhances divine wisdom, higher knowledge, and commercial expansion as 9th lord significator.',
      wearingInstructions: {
        finger: 'Index Finger',
        metal: 'Gold or Panchdhatu',
        day: 'Thursday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Graam Greem Groum Sah Gurave Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Pioneering Spirit', description: 'Natural trailblazer driven by instinct, initiative, and courage to conquer unexplored frontiers.' },
      { name: 'Dynamic Decisiveness', description: 'Acts swiftly on opportunities without being paralyzed by overthinking.' },
      { name: 'Resilient Tenacity', description: 'Rebounds quickly from setbacks with renewed optimism and warrior focus.' },
      { name: 'Honest Directness', description: 'Communicates authentically without pretense, valuing transparency above diplomatic evasiveness.' },
    ],
  },
  2: {
    index: 2,
    englishName: 'Taurus',
    sanskritName: 'Vrishabha',
    lord: 'Venus',
    element: 'Earth',
    modality: 'Fixed',
    symbol: 'The Bull',
    syllables: 'I, U, E, O, Va, Vee, Vu, Ve, Vo',
    favorableColors: [
      { color: 'Pure White', reason: 'Embodies Venusian refinement, promoting serene focus and peace of mind.' },
      { color: 'Cream / Pastel Pink', reason: 'Attracts harmonious relationship dynamics and social charm.' },
      { color: 'Sky Blue', reason: 'Connects with friendly Saturn, fostering stable long-term career growth.' },
    ],
    unfavorableColors: [
      { color: 'Fiery Red', reason: 'Overstimulates calm earthly temperament, leading to avoidable stubbornness.' },
      { color: 'Bright Orange', reason: 'Clashes with Venusian aesthetics, causing sensory restlessness.' },
    ],
    luckyDates: [
      { dates: '6th, 15th, 24th', reason: 'Resonates with Venusian number 6.', tip: 'Ideal for artistic creation, signing financial contracts, and celebrating milestones.' },
    ],
    unluckyDates: [
      { dates: '9th, 18th, 27th', reason: 'Martian friction with Venusian harmony.', tip: 'Avoid stubborn arguments with loved ones or impulsive large expenditures.' },
    ],
    primaryGem: {
      name: 'Diamond or White Sapphire',
      sanskritName: 'Heera / Safed Pukhraj',
      rulingPlanet: 'Venus',
      benefits: 'Amplifies magnetism, artistic sophistication, material prosperity, and marital joy.',
      wearingInstructions: {
        finger: 'Middle or Little Finger',
        metal: 'Silver, Platinum, or White Gold',
        day: 'Friday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Draam Dreem Droum Sah Shukraya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Blue Sapphire',
      sanskritName: 'Neelam',
      rulingPlanet: 'Saturn',
      benefits: 'As your Yogakaraka planet (ruling 9th and 10th houses), confers tremendous status and professional fortune.',
      wearingInstructions: {
        finger: 'Middle Finger',
        metal: 'Silver or Panchdhatu',
        day: 'Saturday evening during Shukla Paksha',
        time: 'During twilight after trial period',
        mantra: 'Om Praam Preem Proum Sah Shanicharaya Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Steadfast Reliability', description: 'Rock-solid dependability and persistence that ensures every undertaking is completed with excellence.' },
      { name: 'Sensory Appreciation', description: 'Refined eye for quality, beauty, culinary delight, and luxurious harmony.' },
      { name: 'Financial Prudence', description: 'Natural acumen for building sustainable wealth and tangible asset foundations.' },
      { name: 'Patient Loyalty', description: 'Deeply devoted to friends and family with unwavering emotional constancy.' },
    ],
  },
  3: {
    index: 3,
    englishName: 'Gemini',
    sanskritName: 'Mithuna',
    lord: 'Mercury',
    element: 'Air',
    modality: 'Mutable',
    symbol: 'The Twins',
    syllables: 'Ka, Kee, Ku, Gha, Chha, Ke, Ko, Ha',
    favorableColors: [
      { color: 'Emerald Green', reason: 'Harmonizes with Mercury, elevating analytical precision and communication flair.' },
      { color: 'Light Yellow', reason: 'Energizes intellect and enhances learning retention.' },
      { color: 'Ivory', reason: 'Brings mental calmness and soothes nervous agitation.' },
    ],
    unfavorableColors: [
      { color: 'Dark Red', reason: 'Injects abrasive aggression into subtle intellectual pursuits.' },
      { color: 'Dull Charcoal', reason: 'Inhibits communicative versatility and spontaneous wit.' },
    ],
    luckyDates: [
      { dates: '5th, 14th, 23rd', reason: 'Resonates with Mercurial number 5.', tip: 'Schedule presentations, writing deliverables, and commercial trade deals.' },
    ],
    unluckyDates: [
      { dates: '9th, 18th, 27th', reason: 'Martian tension with Mercury.', tip: 'Exercise restraint in debates; avoid hasty verbal commitments.' },
    ],
    primaryGem: {
      name: 'Emerald',
      sanskritName: 'Panna',
      rulingPlanet: 'Mercury',
      benefits: 'Sharpens intellectual agility, articulates persuasive speech, and dissolves mental fog.',
      wearingInstructions: {
        finger: 'Little Finger',
        metal: 'Gold, Silver, or Bronze',
        day: 'Wednesday morning during Shukla Paksha',
        time: 'Within two hours of sunrise',
        mantra: 'Om Braam Breem Broum Sah Budhaya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Diamond or Peridot',
      sanskritName: 'Heera / Zeberjad',
      rulingPlanet: 'Venus / Mercury',
      benefits: 'Soothes nervous system strain and unlocks creative linguistic innovation.',
      wearingInstructions: {
        finger: 'Middle or Little Finger',
        metal: 'Silver or Platinum',
        day: 'Wednesday or Friday morning',
        time: 'During early morning',
        mantra: 'Om Budhaya Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Intellectual Versatility', description: 'Exceptional curiosity that absorbs diverse domains of knowledge with effortless speed.' },
      { name: 'Articulate Eloquence', description: 'Mastery over written and spoken dialogue, connecting disparate people and ideas.' },
      { name: 'Adaptive Agility', description: 'Pivots smoothly amidst fluctuating circumstances, thriving in dynamic environments.' },
      { name: 'Youthful Inquisitiveness', description: 'Perpetually fresh perspective that injects humor and optimism into complex problems.' },
    ],
  },
  4: {
    index: 4,
    englishName: 'Cancer',
    sanskritName: 'Karka',
    lord: 'Moon',
    element: 'Water',
    modality: 'Cardinal (Movable)',
    symbol: 'The Crab',
    syllables: 'Hee, Hoo, He, Ho, Da, Dee, Doo, De, Do',
    favorableColors: [
      { color: 'Pearl White', reason: 'Pure reflection of lunar energy, cultivating peace and emotional clarity.' },
      { color: 'Silver', reason: 'Strengthens intuitive receptivity and psychic balance.' },
      { color: 'Sea Green', reason: 'Soothes the heart chakra and grounds fluctuating emotional tides.' },
    ],
    unfavorableColors: [
      { color: 'Jet Black', reason: 'Creates emotional heaviness and vulnerability to melancholic moods.' },
      { color: 'Dark Brown', reason: 'Stagnates natural intuitive flow and domestic warmth.' },
    ],
    luckyDates: [
      { dates: '2nd, 11th, 20th, 29th', reason: 'Resonates with Lunar number 2.', tip: 'Ideal for domestic celebrations, creative introspection, and nurturing alliances.' },
    ],
    unluckyDates: [
      { dates: '8th, 17th, 26th', reason: 'Saturnian constraint on lunar sensitivity.', tip: 'Avoid emotional isolation. Do not dwell on past grievances.' },
    ],
    primaryGem: {
      name: 'Natural Pearl',
      sanskritName: 'Moti',
      rulingPlanet: 'Moon',
      benefits: 'Bestows deep mental serenity, emotional poise, harmonious domestic life, and inner calmness.',
      wearingInstructions: {
        finger: 'Little Finger',
        metal: 'Pure Silver',
        day: 'Monday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Shraam Shreem Shroum Sah Chandraya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Red Coral',
      sanskritName: 'Moonga',
      rulingPlanet: 'Mars',
      benefits: 'As your Yogakaraka (ruling 5th and 10th houses), confers courage, professional eminence, and scholastic victory.',
      wearingInstructions: {
        finger: 'Ring Finger',
        metal: 'Copper or Gold',
        day: 'Tuesday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Bhaumaya Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Profound Empathy', description: 'Remarkable intuitive compass that senses unseen emotional currents and nurtures others selflessly.' },
      { name: 'Protective Loyalty', description: 'Fiercely defends home, heritage, and loved ones with unmatched devotion.' },
      { name: 'Imaginative Depth', description: 'Rich subconscious reservoir that inspires artistic, poetic, and creative breakthroughs.' },
      { name: 'Tenacious Memory', description: 'Treasures meaningful memories and learns deeply from life experiences.' },
    ],
  },
  5: {
    index: 5,
    englishName: 'Leo',
    sanskritName: 'Simha',
    lord: 'Sun',
    element: 'Fire',
    modality: 'Fixed',
    symbol: 'The Lion',
    syllables: 'Ma, Mee, Moo, Me, Mo, Ta, Tee, Too, Te',
    favorableColors: [
      { color: 'Solar Gold', reason: 'Channels the radiant majesty of the Sun, elevating charisma and authority.' },
      { color: 'Ruby Red', reason: 'Amplifies core vitality, self-confidence, and executive presence.' },
      { color: 'Saffron', reason: 'Fosters spiritual nobility, righteousness, and generous leadership.' },
    ],
    unfavorableColors: [
      { color: 'Dark Blue / Black', reason: 'Opposing Saturnian shades that shroud solar brilliance in gloom.' },
      { color: 'Dull Grey', reason: 'Diminishes natural optimism and creative self-expression.' },
    ],
    luckyDates: [
      { dates: '1st, 10th, 19th, 28th', reason: 'Resonates with Solar number 1.', tip: 'Take command of important initiatives, pitch to investors, and address leadership forums.' },
    ],
    unluckyDates: [
      { dates: '8th, 17th, 26th', reason: 'Saturnian conflict with the Sun.', tip: 'Temper ego in administrative matters. Practice humility with subordinates.' },
    ],
    primaryGem: {
      name: 'Ruby',
      sanskritName: 'Manik',
      rulingPlanet: 'Sun',
      benefits: 'Bestows commanding authority, noble self-confidence, stellar reputation, and dignified executive presence.',
      wearingInstructions: {
        finger: 'Ring Finger',
        metal: 'Gold or Copper',
        day: 'Sunday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Hraam Hreem Hroum Sah Suryaya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Yellow Sapphire',
      sanskritName: 'Pukhraj',
      rulingPlanet: 'Jupiter',
      benefits: 'Rules 5th house of intellect and Dharma, fostering scholarly success, progeny blessing, and spiritual wisdom.',
      wearingInstructions: {
        finger: 'Index Finger',
        metal: 'Gold',
        day: 'Thursday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Gurave Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Magnetic Charisma', description: 'Naturally commands admiration and respect, radiating warmth, generosity, and confidence.' },
      { name: 'Unwavering Honor', description: 'Upholds personal principles with dignity, scorning pettiness and underhanded tactics.' },
      { name: 'Creative Generosity', description: 'Brings grandiose creative visions to fruition and shares rewards lavishly with allies.' },
      { name: 'Natural Leadership', description: 'Inspires collective confidence during crises with courage and authoritative calm.' },
    ],
  },
  6: {
    index: 6,
    englishName: 'Virgo',
    sanskritName: 'Kanya',
    lord: 'Mercury',
    element: 'Earth',
    modality: 'Mutable',
    symbol: 'The Maiden',
    syllables: 'To, Pa, Pee, Poo, Sha, Tha, Pe, Po',
    favorableColors: [
      { color: 'Green', reason: 'Your signature color connecting with Mercury; enhances analytical acumen and mental calm.' },
      { color: 'Light Yellow', reason: 'Stimulates intellectual prowess, memory retention, and communicative dexterity.' },
      { color: 'Pristine White', reason: 'Amplifies precision, peace of mind, and methodical clarity.' },
    ],
    unfavorableColors: [
      { color: 'Bright Red', reason: 'Overstimulates your naturally calm analytical nervous system, causing restlessness.' },
      { color: 'Deep Purple', reason: 'Inhibits practical groundedness and creates unnecessary mental heaviness.' },
    ],
    luckyDates: [
      { dates: '5th, 14th, 23rd', reason: 'Resonates with Mercury\'s number 5.', tip: 'Schedule high-stakes meetings, technical deliverables, and health audits on these dates.' },
    ],
    unluckyDates: [
      { dates: '8th, 17th, 26th', reason: 'Periods of energetic friction where Mercury\'s quickness is restrained.', tip: 'Use for quiet organization and refining existing plans; avoid major gambles.' },
    ],
    primaryGem: {
      name: 'Emerald',
      sanskritName: 'Panna',
      rulingPlanet: 'Mercury',
      benefits: 'Directly optimizes Mercury, bringing razor-sharp intellectual focus, persuasive speech, and emotional equilibrium.',
      wearingInstructions: {
        finger: 'Little Finger',
        metal: 'Gold, Silver, or Bronze',
        day: 'Wednesday morning during Shukla Paksha',
        time: 'Within two hours of sunrise',
        mantra: 'Om Braam Breem Broum Sah Budhaya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Peridot',
      sanskritName: 'Zeberjad',
      rulingPlanet: 'Mercury',
      benefits: 'Soothes nervous tension, dissipates restless distractions, and clears intellectual clutter.',
      wearingInstructions: {
        finger: 'Little Finger or as a Pendant over Heart',
        metal: 'Silver or White Gold',
        day: 'Wednesday morning during Shukla Paksha',
        time: 'During early morning hours',
        mantra: 'Om Budhaya Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Practical & Grounded', description: 'Approaches life with a realistic mindset, making decisions grounded in logic, efficiency, and verifiable evidence.' },
      { name: 'Highly Organized & Detail-Oriented', description: 'Excels at structuring order from chaos, noticing subtle nuances and quality discrepancies others overlook.' },
      { name: 'Intellectually Inquisitive', description: 'Driven by an insatiable quest for mastery, constantly analyzing processes to optimize outcomes.' },
      { name: 'Devoted to Service', description: 'Genuinely invested in solving problems for others, offering practical support and selfless reliability.' },
      { name: 'Pursuit of Excellence', description: 'Holds self and work to exacting standards, continually refining skills toward perfection.' },
    ],
  },
  7: {
    index: 7,
    englishName: 'Libra',
    sanskritName: 'Tula',
    lord: 'Venus',
    element: 'Air',
    modality: 'Cardinal (Movable)',
    symbol: 'The Scales',
    syllables: 'Ra, Ree, Roo, Re, Ro, Taa, Tee, Too, Te',
    favorableColors: [
      { color: 'Pure White', reason: 'Embodies perfect equilibrium, peace, and aesthetic beauty.' },
      { color: 'Pastel Blue', reason: 'Cultivates diplomatic composure, clear communication, and judicial fairness.' },
      { color: 'Rose Pink', reason: 'Enhances relationship harmony, social grace, and romantic magnetism.' },
    ],
    unfavorableColors: [
      { color: 'Harsh Red', reason: 'Disrupts psychological balance and introduces abrasive friction into social dynamics.' },
      { color: 'Mustard Yellow', reason: 'Creates indecision and weakens aesthetic Venusian instincts.' },
    ],
    luckyDates: [
      { dates: '6th, 15th, 24th', reason: 'Resonates with Venusian number 6.', tip: 'Conclude partnership agreements, host diplomatic gatherings, and launch creative ventures.' },
    ],
    unluckyDates: [
      { dates: '9th, 18th, 27th', reason: 'Martian impatience clashes with balanced deliberation.', tip: 'Avoid reactive confrontations. Weigh consequences carefully.' },
    ],
    primaryGem: {
      name: 'Diamond or White Zircon',
      sanskritName: 'Heera / Zircon',
      rulingPlanet: 'Venus',
      benefits: 'Magnifies elegance, partnership harmony, commercial diplomacy, and social prosperity.',
      wearingInstructions: {
        finger: 'Middle or Little Finger',
        metal: 'Platinum, White Gold, or Silver',
        day: 'Friday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Draam Dreem Droum Sah Shukraya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Blue Sapphire',
      sanskritName: 'Neelam',
      rulingPlanet: 'Saturn',
      benefits: 'As your supreme Yogakaraka (ruling 4th and 5th houses), unlocks tremendous intellectual authority, property, and fortune.',
      wearingInstructions: {
        finger: 'Middle Finger',
        metal: 'Silver or Panchdhatu',
        day: 'Saturday evening after sunset',
        time: 'During twilight hours',
        mantra: 'Om Shanicharaya Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Diplomatic Fairness', description: 'Possesses an innate compass for justice, negotiating win-win consensus amidst fierce conflict.' },
      { name: 'Aesthetic Sophistication', description: 'Curates harmony, elegance, and beauty in surroundings and relationships.' },
      { name: 'Collaborative Synergy', description: 'Believes in the power of partnership, excelling in teamwork and social alliances.' },
      { name: 'Charming Persuasion', description: 'Wins hearts through gentle charm, intellectual tact, and respectful dialogue.' },
    ],
  },
  8: {
    index: 8,
    englishName: 'Scorpio',
    sanskritName: 'Vrischika',
    lord: 'Mars',
    element: 'Water',
    modality: 'Fixed',
    symbol: 'The Scorpion',
    syllables: 'To, Na, Nee, Noo, Ne, No, Yaa, Yee, Yoo',
    favorableColors: [
      { color: 'Deep Crimson', reason: 'Channels the concentrated transformative power of internal Mars.' },
      { color: 'Rust Orange', reason: 'Stimulates courageous regeneration and sharpens strategic focus.' },
      { color: 'Golden Amber', reason: 'Connects with friendly Jupiter to illuminate spiritual mysteries and higher wisdom.' },
    ],
    unfavorableColors: [
      { color: 'Stark White', reason: 'Dissipates intense emotional focus and weakens protective psychological barriers.' },
      { color: 'Light Green', reason: 'Creates conflicting analytical noise against deep gut intuition.' },
    ],
    luckyDates: [
      { dates: '9th, 18th, 27th', reason: 'Resonates with Martian number 9.', tip: 'Execute confidential research, surgical moves, and decisive financial transitions.' },
    ],
    unluckyDates: [
      { dates: '5th, 14th, 23rd', reason: 'Superficial Mercurial energy irritates Scorpio\'s depth.', tip: 'Avoid gossiping circles or unvetted commercial contracts.' },
    ],
    primaryGem: {
      name: 'Red Coral',
      sanskritName: 'Moonga',
      rulingPlanet: 'Mars',
      benefits: 'Bestows invincible mental resilience, protective vitality, mastery over fear, and strategic victory.',
      wearingInstructions: {
        finger: 'Ring Finger',
        metal: 'Copper or Gold',
        day: 'Tuesday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Kraam Kreem Kroum Sah Bhaumaya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Yellow Sapphire',
      sanskritName: 'Pukhraj',
      rulingPlanet: 'Jupiter',
      benefits: 'Rules the 2nd and 5th houses, expanding family wealth, scholastic success, and divine intuition.',
      wearingInstructions: {
        finger: 'Index Finger',
        metal: 'Gold',
        day: 'Thursday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Gurave Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Penetrating Intuition', description: 'Sees through illusions and pretense effortlessly, perceiving hidden motives and core truths.' },
      { name: 'Transformative Resilience', description: 'Possesses Phoenix-like ability to regenerate stronger and wiser from life\'s trials.' },
      { name: 'Laser-Like Focus', description: 'Commits passionately to goals with unwavering concentration until total mastery is achieved.' },
      { name: 'Sacred Loyalty', description: 'Protects confidential trust with absolute honor, standing by true allies through everything.' },
    ],
  },
  9: {
    index: 9,
    englishName: 'Sagittarius',
    sanskritName: 'Dhanu',
    lord: 'Jupiter',
    element: 'Fire',
    modality: 'Mutable',
    symbol: 'The Archer',
    syllables: 'Ye, Yo, Bha, Bhee, Bhoo, Dha, Pha, Dhad, Bhe',
    favorableColors: [
      { color: 'Golden Yellow', reason: 'Pure conduit of Jupiterian wisdom, higher truth, and spiritual abundance.' },
      { color: 'Saffron', reason: 'Inspires philosophical idealism, ethical clarity, and righteous ambition.' },
      { color: 'Royal Purple', reason: 'Enhances expansive vision, dignifying leadership with scholarly grace.' },
    ],
    unfavorableColors: [
      { color: 'Navy Blue / Black', reason: 'Contracts Jupiter\'s expansive optimism and causes uncharacteristic cynicism.' },
      { color: 'Dull Grey', reason: 'Dampens natural spiritual joy and adventurous vigor.' },
    ],
    luckyDates: [
      { dates: '3rd, 12th, 21st, 30th', reason: 'Resonates with Jupiter\'s holy number 3.', tip: 'Initiate higher education, foreign travel, legal filings, and spiritual pilgrimages.' },
    ],
    unluckyDates: [
      { dates: '6th, 15th, 24th', reason: 'Venusian indulgence distracts from philosophical Dharma.', tip: 'Avoid overspending on luxury or taking uncalculated speculative bets.' },
    ],
    primaryGem: {
      name: 'Yellow Sapphire',
      sanskritName: 'Pukhraj',
      rulingPlanet: 'Jupiter',
      benefits: 'Bestows boundless fortune, scholarly renown, divine protection, and moral authority.',
      wearingInstructions: {
        finger: 'Index Finger',
        metal: 'Gold or Panchdhatu',
        day: 'Thursday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Graam Greem Groum Sah Gurave Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Ruby',
      sanskritName: 'Manik',
      rulingPlanet: 'Sun',
      benefits: 'As ruler of the 9th house of fortune (Bhagya), unlocks immense luck, father\'s blessings, and international stature.',
      wearingInstructions: {
        finger: 'Ring Finger',
        metal: 'Gold or Copper',
        day: 'Sunday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Suryaya Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Philosophical Vision', description: 'Sees the broad overarching meaning of life, constantly pursuing truth, ethics, and higher horizons.' },
      { name: 'Unbounded Optimism', description: 'Maintains faith in divine providence, inspiring others with infectious cheer and enthusiasm.' },
      { name: 'Intellectual Freedom', description: 'Cherishes liberty of thought and movement, rebelling against dogmatic limitations.' },
      { name: 'Noble Generosity', description: 'Stands up courageously for justice, mentoring seekers with open-hearted wisdom.' },
    ],
  },
  10: {
    index: 10,
    englishName: 'Capricorn',
    sanskritName: 'Makara',
    lord: 'Saturn',
    element: 'Earth',
    modality: 'Cardinal (Movable)',
    symbol: 'The Mountain Goat',
    syllables: 'Bho, Ja, Jee, Khee, Khoo, Khe, Kho, Ga, Gee',
    favorableColors: [
      { color: 'Navy Blue', reason: 'Aligns with Saturn\'s sober discipline, fostering structured focus and public authority.' },
      { color: 'Charcoal Grey', reason: 'Anchors patience, emotional endurance, and pragmatic realism.' },
      { color: 'Olive Green', reason: 'Connects with friendly Mercury, stimulating commercial acumen and financial precision.' },
    ],
    unfavorableColors: [
      { color: 'Fiery Red', reason: 'Clashes with Saturnian deliberate pacing, provoking rash mistakes.' },
      { color: 'Neon Yellow', reason: 'Creates sensory irritation and disrupts concentrated professional planning.' },
    ],
    luckyDates: [
      { dates: '8th, 17th, 26th', reason: 'Resonates with Saturnian number 8.', tip: 'Submit master plans, execute long-term capital investments, and restructure operations.' },
    ],
    unluckyDates: [
      { dates: '1st, 10th, 19th, 28th', reason: 'Solar ego clashes with Saturnian humility.', tip: 'Do not lock horns with state authorities or senior executive bodies.' },
    ],
    primaryGem: {
      name: 'Blue Sapphire',
      sanskritName: 'Neelam',
      rulingPlanet: 'Saturn',
      benefits: 'Bestows monumental endurance, professional elevation, organizational mastery, and karmic protection.',
      wearingInstructions: {
        finger: 'Middle Finger',
        metal: 'Silver, White Gold, or Panchdhatu',
        day: 'Saturday evening after sunset',
        time: 'During twilight hours after mandatory 3-day trial',
        mantra: 'Om Praam Preem Proum Sah Shanicharaya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Emerald',
      sanskritName: 'Panna',
      rulingPlanet: 'Mercury',
      benefits: 'As ruler of the 9th house of fortune, confers extraordinary commercial intelligence and luck.',
      wearingInstructions: {
        finger: 'Little Finger',
        metal: 'Gold or Silver',
        day: 'Wednesday morning during Shukla Paksha',
        time: 'Within two hours of sunrise',
        mantra: 'Om Budhaya Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Enduring Tenacity', description: 'Climbs steadily toward monumental summits, overcoming every obstacle through unmatched patience.' },
      { name: 'Masterful Strategy', description: 'Plans multiple steps ahead, constructing robust systems designed to outlast generations.' },
      { name: 'High Integrity', description: 'Takes commitments seriously, prizing accountability and hard-earned respect above instant gratification.' },
      { name: 'Pragmatic Wisdom', description: 'Evaluates life through the lens of concrete results, avoiding frivolous waste.' },
    ],
  },
  11: {
    index: 11,
    englishName: 'Aquarius',
    sanskritName: 'Kumbha',
    lord: 'Saturn',
    element: 'Air',
    modality: 'Fixed',
    symbol: 'The Water Bearer',
    syllables: 'Goo, Ge, Go, Sa, See, Soo, Se, So, Da',
    favorableColors: [
      { color: 'Electric Blue', reason: 'Channels futuristic innovation, higher consciousness, and intellectual brilliance.' },
      { color: 'Midnight Blue', reason: 'Harmonizes with Saturnian depth, grounding revolutionary ideas into practical systems.' },
      { color: 'Violet', reason: 'Stimulates humanitarian idealism and expansive collective vision.' },
    ],
    unfavorableColors: [
      { color: 'Fiery Orange', reason: 'Overheats airy objectivity and induces emotional volatility.' },
      { color: 'Blood Red', reason: 'Creates aggressive confrontation where detached diplomacy is required.' },
    ],
    luckyDates: [
      { dates: '8th, 17th, 26th', reason: 'Resonates with Saturnian number 8.', tip: 'Organize community movements, launch tech systems, and coordinate large network initiatives.' },
    ],
    unluckyDates: [
      { dates: '1st, 10th, 19th, 28th', reason: 'Solar friction against collective egalitarian values.', tip: 'Avoid authoritarian posturing; foster democratic consensus.' },
    ],
    primaryGem: {
      name: 'Blue Sapphire',
      sanskritName: 'Neelam',
      rulingPlanet: 'Saturn',
      benefits: 'Ignites visionary breakthroughs, protects public status, stabilizes mental clarity, and attracts influential networks.',
      wearingInstructions: {
        finger: 'Middle Finger',
        metal: 'Silver, Platinum, or Panchdhatu',
        day: 'Saturday evening after sunset',
        time: 'During twilight hours after trial',
        mantra: 'Om Praam Preem Proum Sah Shanicharaya Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Diamond or Emerald',
      sanskritName: 'Heera / Panna',
      rulingPlanet: 'Venus / Mercury',
      benefits: 'Rules 4th and 9th houses, establishing domestic peace, higher learning, and creative genius.',
      wearingInstructions: {
        finger: 'Middle or Little Finger',
        metal: 'Silver or Platinum',
        day: 'Friday or Wednesday morning',
        time: 'During early morning',
        mantra: 'Om Shukraya Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Visionary Innovation', description: 'Anticipates future societal and technological trends years before they enter mainstream awareness.' },
      { name: 'Humanitarian Ideals', description: 'Deeply dedicated to collective welfare, justice, and the betterment of humanity.' },
      { name: 'Objective Detachment', description: 'Analyzes complex problems with rational impartiality, unswayed by emotional biases.' },
      { name: 'Authentic Individuality', description: 'Celebrates original uniqueness, refusing to conform to outdated dogmas.' },
    ],
  },
  12: {
    index: 12,
    englishName: 'Pisces',
    sanskritName: 'Meena',
    lord: 'Jupiter',
    element: 'Water',
    modality: 'Mutable',
    symbol: 'The Fishes',
    syllables: 'Dee, Doo, Tha, Jha, Jna, De, Do, Cha, Chee',
    favorableColors: [
      { color: 'Lemon Yellow', reason: 'Conduit of divine Jupiterian wisdom, spiritual peace, and gentle abundance.' },
      { color: 'Sea Green', reason: 'Harmonizes water element, soothing deep subconscious currents.' },
      { color: 'Lavender', reason: 'Elevates spiritual intuition, dream recall, and meditative tranquility.' },
    ],
    unfavorableColors: [
      { color: 'Jet Black', reason: 'Drags sensitive psychic energy down into ungrounded anxiety.' },
      { color: 'Dark Brown', reason: 'Stifles artistic and spiritual transcendence.' },
    ],
    luckyDates: [
      { dates: '3rd, 12th, 21st, 30th', reason: 'Resonates with Jupiterian number 3.', tip: 'Engage in spiritual retreats, philanthropic ventures, creative writing, and healing.' },
    ],
    unluckyDates: [
      { dates: '6th, 15th, 24th', reason: 'Venusian sensory lure can confuse Pisces\' spiritual boundaries.', tip: 'Maintain clear personal boundaries; avoid escapist behaviors.' },
    ],
    primaryGem: {
      name: 'Yellow Sapphire',
      sanskritName: 'Pukhraj',
      rulingPlanet: 'Jupiter',
      benefits: 'Bestows spiritual illumination, divine fortune, mental clarity, and auspicious prosperity.',
      wearingInstructions: {
        finger: 'Index Finger',
        metal: 'Gold or Panchdhatu',
        day: 'Thursday morning during Shukla Paksha',
        time: 'Within one hour of sunrise',
        mantra: 'Om Graam Greem Groum Sah Gurave Namaha (108 times)',
      },
    },
    secondaryGem: {
      name: 'Natural Pearl or Red Coral',
      sanskritName: 'Moti / Moonga',
      rulingPlanet: 'Moon / Mars',
      benefits: 'Rules 5th and 9th houses, fortifying emotional serenity, divine fortune, and scholastic success.',
      wearingInstructions: {
        finger: 'Little or Ring Finger',
        metal: 'Silver or Copper',
        day: 'Monday or Tuesday morning',
        time: 'Within one hour of sunrise',
        mantra: 'Om Chandraya Namaha (108 times)',
      },
    },
    personalityTraits: [
      { name: 'Spiritual Intuition', description: 'Possesses direct access to subtle realms of awareness, perceiving emotional truths beyond words.' },
      { name: 'Universal Compassion', description: 'Feels deep oneness with all living beings, offering forgiveness and healing unconditionally.' },
      { name: 'Creative Imagination', description: 'Channels profound poetic, musical, and visual beauty from the infinite ocean of consciousness.' },
      { name: 'Mystical Wisdom', description: 'Naturally understands the impermanence of material forms, trusting in divine surrender.' },
    ],
  },
};

// -----------------------------------------------------------------------------
// STRICT INPUT VALIDATION
// -----------------------------------------------------------------------------

export function validateHoroscopeReportInput(profileInput: {
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
    throw new BirthDetailsValidationError('Profile input is required for Personalised Horoscope report');
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
  } else if (resolvedPlace !== undefined && (typeof resolvedPlace !== 'string' || resolvedPlace.trim().length === 0)) {
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

  // Validate numeric ranges for DOB and TOB
  if (profileInput.dateOfBirth) {
    const parts = profileInput.dateOfBirth.split('-').map(Number);
    if (
      parts.length !== 3 ||
      parts[0] < 1800 || parts[0] > 2200 ||
      parts[1] < 1 || parts[1] > 12 ||
      parts[2] < 1 || parts[2] > 31
    ) {
      errors.push(`Invalid date of birth format or values: ${profileInput.dateOfBirth}`);
    }
  }

  if (profileInput.timeOfBirth) {
    const tParts = profileInput.timeOfBirth.split(':').map(Number);
    if (
      tParts.length < 2 ||
      tParts[0] < 0 || tParts[0] > 23 ||
      tParts[1] < 0 || tParts[1] > 59
    ) {
      errors.push(`Invalid time of birth format or values: ${profileInput.timeOfBirth}`);
    }
  }

  if (errors.length > 0) {
    throw new BirthDetailsValidationError(errors.join('; '));
  }
}

// -----------------------------------------------------------------------------
// MAIN GENERATOR: PERSONALISED HOROSCOPE 2026
// -----------------------------------------------------------------------------

export async function generateProHoroscopeReport(
  profileInput: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string | null;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  },
  rawChartData: any,
  interpretationProvider?: ReportInterpretationProvider
): Promise<ProHoroscopeModel> {
  // 1. Validate Input Strictly
  validateHoroscopeReportInput(profileInput);

  // 2. Validate Astrological Calculation Evidence
  validateAstrologyDataForReport(rawChartData);

  const chart = rawChartData.chart || rawChartData.data || rawChartData;
  const metadata = chart.config ? chart : (rawChartData.data?.metadata || chart.metadata || {});
  const configObj = chart.config || metadata.config || {};

  // 3. Assemble Scoped Verified Evidence & Assert Scoped Foundation Constraints
  const verifiedEvidence = extractVerifiedEvidenceFromChart(
    rawChartData,
    profileInput,
    'CAREER_PROSITY'
  );
  validateVerifiedAstrologyEvidence(
    verifiedEvidence,
    getEvidenceRequirementsForReport('CAREER_PROSITY')
  );

  // 4. Construct Profile DTO
  const profile: ReportProfileDto = {
    name: profileInput.name || 'Valued Native',
    dateOfBirth: profileInput.dateOfBirth,
    timeOfBirth: profileInput.timeOfBirth,
    placeName: profileInput.placeName || null,
    timezone: profileInput.timezone || 'Asia/Kolkata',
    latitude: profileInput.latitude,
    longitude: profileInput.longitude,
  };

  // 5. Construct Configuration DTO
  const configuration: ReportConfigDto = {
    zodiacType: String(configObj.zodiacType || 'SIDEREAL'),
    ayanamsa: String(configObj.ayanamsa || 'LAHIRI'),
    houseSystem: String(configObj.houseSystem || 'WHOLE_SIGN'),
    nodeCalculation: String(configObj.nodeCalculation || 'MEAN_NODE'),
  };

  // 6. Ascendant DTO
  const asc = chart.ascendant || {};
  const ascLongitude = typeof asc.longitude === 'number'
    ? asc.longitude
    : (typeof asc.absoluteDegree === 'number' ? asc.absoluteDegree : 0);

  let ascRashiIndex = typeof asc.rashiIndex === 'number' && asc.rashiIndex >= 1 && asc.rashiIndex <= 12
    ? asc.rashiIndex
    : getRashiIndex(ascLongitude);

  const ascSignName = asc.rashiName || asc.sign;
  if ((!asc.rashiIndex || ascRashiIndex < 1 || ascRashiIndex > 12) && ascSignName) {
    const match = RASHIS.find(
      (r) => r.englishName.toLowerCase() === ascSignName.toLowerCase() ||
             r.sanskritName.toLowerCase() === ascSignName.toLowerCase()
    );
    if (match) {
      ascRashiIndex = match.index;
    }
  }

  const ascRashiDef = RASHIS[ascRashiIndex - 1] || RASHIS[0];
  const ascSign = asc.sign || ascRashiDef.englishName;
  const ascDegreeInRashi = typeof asc.degreeInRashi === 'number'
    ? asc.degreeInRashi
    : (typeof asc.degree === 'number' ? asc.degree : ascLongitude % 30);

  const ascendant: ReportAscendantDto = {
    sign: ascSign,
    degree: ascDegreeInRashi,
    nakshatra: asc.nakshatraName || asc.nakshatra || 'Ashwini',
    pada: asc.pada || 1,
  };

  // 7. Planets DTO
  const planets: ReportPlanetDto[] = (chart.planets || []).map((p: any) => ({
    planet: String(p.planet || p.name).toUpperCase(),
    sign: p.rashiName || p.sign || 'Aries',
    degree: typeof p.degreeInRashi === 'number' ? p.degreeInRashi : (p.degree || 0),
    house: p.house || p.houseNumber || 1,
    nakshatra: p.nakshatraName || p.nakshatra || 'Ashwini',
    pada: p.pada || 1,
    isRetrograde: Boolean(p.isRetrograde),
  }));

  // 8. Houses DTO (Whole Sign 1..12)
  const houses: ReportHouseDto[] = [];
  for (let h = 1; h <= 12; h++) {
    const houseRashiIndex = ((ascRashiIndex - 1 + (h - 1)) % 12) + 1;
    const houseRashiDef = RASHIS[houseRashiIndex - 1];
    const planetsInHouse = planets
      .filter((p) => p.house === h)
      .map((p) => p.planet);

    houses.push({
      houseNumber: h,
      sign: houseRashiDef.englishName,
      planetsPresent: planetsInHouse,
    });
  }

  // 9. Moon Sign (Chandra Lagna) Anchor Calculation
  const moonPlanet = planets.find((p) => p.planet === 'MOON') || {
    planet: 'MOON',
    sign: 'Virgo',
    degree: 15.0,
    house: 1,
    nakshatra: 'Hasta',
    pada: 1,
    isRetrograde: false,
  };

  const moonSignName = moonPlanet.sign;
  let moonSignIndex = 6; // default Virgo
  const matchedRashi = RASHIS.find(
    (r) => r.englishName.toLowerCase() === moonSignName.toLowerCase() ||
           r.sanskritName.toLowerCase() === moonSignName.toLowerCase()
  );
  if (matchedRashi) {
    moonSignIndex = matchedRashi.index;
  }

  const moonMeta = MOON_SIGN_CATALOG[moonSignIndex] || MOON_SIGN_CATALOG[6];

  const moonSignDetails: HoroscopeMoonSignDetailsDto = {
    sign: moonMeta.englishName,
    sanskritSign: moonMeta.sanskritName,
    signLord: moonMeta.lord,
    nakshatra: moonPlanet.nakshatra,
    pada: moonPlanet.pada,
    element: moonMeta.element,
    modality: moonMeta.modality,
    symbol: moonMeta.symbol,
    syllables: moonMeta.syllables,
  };

  // 10. Annual Transits (Gochara 2026) Calculation relative to Moon Sign
  // In 2026:
  // Saturn: Pisces (12)
  // Jupiter: Gemini (3) first half, Cancer (4) second half
  // Rahu: Aquarius (11)
  // Ketu: Leo (5)
  const getHouseFromMoon = (transitSignIndex: number): number => {
    return ((transitSignIndex - moonSignIndex + 12) % 12) + 1;
  };

  const saturnHouseFromMoon = getHouseFromMoon(12); // Pisces
  const jupiterGeminiHouseFromMoon = getHouseFromMoon(3); // Gemini
  const jupiterCancerHouseFromMoon = getHouseFromMoon(4); // Cancer
  const rahuHouseFromMoon = getHouseFromMoon(11); // Aquarius
  const ketuHouseFromMoon = getHouseFromMoon(5); // Leo

  const planetaryInfluences: HoroscopePlanetaryInfluenceDto[] = [
    {
      planet: 'SATURN',
      transitSign: 'Pisces',
      houseFromMoon: saturnHouseFromMoon,
      status: 'Annual Residency in Pisces (Retrograde Cycle)',
      period: 'Throughout 2026 (Continuous Pisces residency: 331°57\' to 350°32\'; Retrograde July 26/27 – December 10/11)',
      impact: `Saturn occupies Pisces (Meena) continuously throughout the entire calendar year 2026 within the 330°00' to 360°00' boundaries of the sign, crossing zero sign boundaries. Transiting your ${saturnHouseFromMoon}${getOrdinalSuffix(saturnHouseFromMoon)} house from the Moon, it establishes the structural endurance, psychological maturity, and patient discipline necessary for long-term mastery.`,
      guidance: 'Embrace steady discipline. Resist shortcuts, honor commitments, and structure your daily routine methodically.',
    },
    {
      planet: 'JUPITER',
      transitSign: 'Gemini / Cancer',
      houseFromMoon: jupiterCancerHouseFromMoon,
      status: 'Direct / Exalted Transition',
      period: 'Gemini (Jan 1 – June 2, 2026), Exalted Cancer (June 2 – Dec 31, 2026; Ingress June 1 at 19:15 UTC / June 2 at 00:45 IST)',
      impact: `Jupiter activates your ${jupiterGeminiHouseFromMoon}${getOrdinalSuffix(jupiterGeminiHouseFromMoon)} house in early 2026, then transitions triumphantly into its sidereal exaltation in Cancer (crossing 90°00' on June 1 at 19:15 UTC / June 2 at 00:45 IST per Sidereal Lahiri Ephemeris) in your ${jupiterCancerHouseFromMoon}${getOrdinalSuffix(jupiterCancerHouseFromMoon)} house, releasing expansive optimism, financial gains, and divine recognition.`,
      guidance: 'Capitalize on collaborative alliances and educational advancement. The latter half of 2026 brings maximum auspicious harvest.',
    },
    {
      planet: 'RAHU',
      transitSign: 'Aquarius',
      houseFromMoon: rahuHouseFromMoon,
      status: 'Retrograde Ingress',
      period: 'Aquarius (Jan 1 – Dec 5, 2026), Capricorn Ingress (Dec 5, 2026 at ~20:23 UTC / Dec 6 at 01:53 IST; Date-level: Dec 5/6, 2026)',
      impact: `Rahu occupies Aquarius in your ${rahuHouseFromMoon}${getOrdinalSuffix(rahuHouseFromMoon)} house from the Moon through early December 2026, before its retrograde ingress across 300°00' into Capricorn on December 5/6, 2026. This drives innovative problem-solving, crushing competition, and unlocking unorthodox avenues of professional expansion.`,
      guidance: 'Guard against nervous restlessness or hidden adversaries. Maintain transparent documentation in all official transactions.',
    },
    {
      planet: 'KETU',
      transitSign: 'Leo',
      houseFromMoon: ketuHouseFromMoon,
      status: 'Retrograde Ingress',
      period: 'Leo (Jan 1 – Dec 5, 2026), Cancer Ingress (Dec 5, 2026 at ~20:23 UTC / Dec 6 at 01:53 IST; Date-level: Dec 5/6, 2026)',
      impact: `Ketu transits Leo in your ${ketuHouseFromMoon}${getOrdinalSuffix(ketuHouseFromMoon)} house from the Moon before crossing 120°00' into Cancer on December 5/6, 2026, awakening subtle spiritual intuition, philosophical detachment, and internal karmic cleansing.`,
      guidance: 'Dedicate time to meditation, charitable acts (Dana), and releasing outdated emotional attachments.',
    },
  ];

  // 11. Numerology (Mulank, Bhagyank, Universal Year 2026)
  const dobParts = profileInput.dateOfBirth.split('-').map(Number);
  const birthDay = dobParts[2] || 1;
  const mulank = reduceToSingleDigit(birthDay);

  let totalDobSum = 0;
  for (const digitChar of profileInput.dateOfBirth.replace(/-/g, '')) {
    totalDobSum += parseInt(digitChar, 10) || 0;
  }
  const bhagyank = reduceToSingleDigit(totalDobSum);
  const universalYear = 1; // 2026: 2 + 0 + 2 + 6 = 10 -> 1

  const numerologyForecast: HoroscopeNumerologyForecastDto = {
    universalYear,
    universalYearMeaning: 'Universal Year 1 signals a potent cosmic cycle of fresh beginnings, pioneering leadership, authentic individuality, and dynamic initiative.',
    moonSignResonance: `Under Universal Year 1, your ${moonMeta.englishName} Moon sign (ruled by ${moonMeta.lord}) is empowered to lead with intellectual precision, clear discernment, and organized mastery.`,
    mulank,
    bhagyank,
    coreAlignmentAdvice: `Your Mulank ${mulank} and Bhagyank ${bhagyank} align with Universal Year 1 to reward proactive planning and decisive execution. Avoid self-doubt; step forward with unwavering faith in your unique competencies.`,
  };

  // 12. Yearly Overview DTO
  const yearlyOverview: HoroscopeYearlyOverviewDto = {
    year: 2026,
    universalYearNumber: universalYear,
    significanceTitle: `Significance of the ${moonMeta.englishName} Moon Sign in 2026`,
    cosmicTheme: `A Transformative Year of Structured Growth, Strategic Mastery, and Auspicious Recognition.`,
    opportunities: [
      `Jupiter's exaltation in the second half of 2026 surges financial expansion and network gains.`,
      `Saturn's anchoring in the ${saturnHouseFromMoon}${getOrdinalSuffix(saturnHouseFromMoon)} house transforms diligent persistent effort into lasting professional authority.`,
      `Rahu in the ${rahuHouseFromMoon}${getOrdinalSuffix(rahuHouseFromMoon)} house empowers you to outmaneuver competitors and excel in complex technical challenges.`,
    ],
    cautions: [
      `Avoid premature expenditures or speculative gambles during temporary retrogressions.`,
      `Prioritize sleep and nervous system relaxation during Q1 to preempt fatigue.`,
      `Maintain transparent communication in domestic partnerships to avert minor misinterpretations.`,
    ],
    summary: `In 2026, the astrological landscape presents a harmonious synthesis of Saturnian discipline and Jupiterian benevolence. By aligning your natural ${moonMeta.englishName} gifts of ${moonMeta.personalityTraits[0].name.toLowerCase()} and ${moonMeta.personalityTraits[1].name.toLowerCase()}, 2026 becomes a landmark chapter of enduring fulfillment.`,
  };

  // 13. Life Domain Forecasts DTO (6 Domains)
  const lifeDomainForecasts: HoroscopeLifeDomainDto[] = [
    {
      domain: 'CAREER',
      title: 'Career & Professional Trajectory',
      outlook: `2026 provides dynamic momentum for your professional sphere. Saturn's steady gaze rewards your accumulated expertise, while Jupiter and Rahu stimulate new vocational pathways, promotions, and lucrative responsibilities.`,
      timeline: 'Q1-Q2 foundational consolidation; Q3-Q4 accelerated promotion, executive recognition, and milestone achievements.',
      keyGuidance: 'Document your contributions, demonstrate calm leadership under pressure, and seek strategic mentorship.',
      highlights: [
        'Strategic promotions and public validation of technical mastery.',
        'Successful navigation of corporate reorganizations into higher authority.',
        'Thriving in specialized projects requiring meticulous analytical clarity.',
      ],
    },
    {
      domain: 'FINANCE',
      title: 'Financial Insights & Wealth Flow',
      outlook: `Financial prospects brighten considerably as the year progresses. While the early months call for prudent liquidity management, the mid-year transition of Jupiter unleashes lucrative gains, appreciation of previous investments, and multiple income streams.`,
      timeline: 'Consolidate budgets during January–April; experience accelerated monetary windfalls from July onwards.',
      keyGuidance: 'Channel increased revenues into tangible long-term assets and debt reduction rather than ephemeral indulgences.',
      highlights: [
        'Substantial returns on long-term investments and ancestral assets.',
        'New income streams through consulting, advisory, or specialized ventures.',
        'Strengthened financial resilience and enhanced savings capacity.',
      ],
    },
    {
      domain: 'EDUCATION',
      title: 'Education & Intellectual Pursuits',
      outlook: `Jupiter's divine illumination sharpens intellectual absorption, analytical memory, and scholastic performance. Students, researchers, and professionals pursuing advanced certifications will find 2026 exceptionally auspicious.`,
      timeline: 'Peak examination and certification success concentrated in May–November.',
      keyGuidance: 'Establish a quiet, distraction-free study environment and practice daily retention techniques.',
      highlights: [
        'Breakthrough performance in competitive examinations and scholarship applications.',
        'Seamless mastery of intricate technical and philosophical curriculums.',
        'Mentorship from revered teachers and domain thought-leaders.',
      ],
    },
    {
      domain: 'LOVE_RELATIONSHIPS',
      title: 'Love & Relationship Dynamics',
      outlook: `Relationships evolve with greater maturity and mutual respect. After navigating minor communicative tensions early in the year, emotional trust deepens as partners prioritize shared values, transparent expectations, and domestic harmony.`,
      timeline: 'Early recalibration during Q1; blossoming romantic warmth, stability, and commitment from May onward.',
      keyGuidance: 'Practice attentive active listening. Express gratitude openly rather than focusing on minor flaws.',
      highlights: [
        'Strengthening of long-term marital bonds through deepened mutual respect.',
        'For unattached natives, meeting a grounded, intellectually compatible partner.',
        'Harmonious joint decisions regarding travel, home upgrades, and future milestones.',
      ],
    },
    {
      domain: 'FAMILY',
      title: 'Family Life & Domestic Harmony',
      outlook: `Domestic life experiences an uplifting transition toward peaceful collaboration. Gentle planetary benevolence dissolves past household frictions, fostering deeper bonds with parents, siblings, and extended family members.`,
      timeline: 'Steady improvement across the first half; blissful family reunions and celebrations in Q3 and Q4.',
      keyGuidance: 'Be the patient anchor of the household. Create warm family rituals and offer calm reassurance.',
      highlights: [
        'Resolution of longstanding property or inheritance discussions with cordial consensus.',
        'Auspicious family ceremonies, festivities, and welcoming of joyful news.',
        'Enriched connection with elders and blessings from paternal/maternal lineages.',
      ],
    },
    {
      domain: 'HEALTH',
      title: 'Health, Vitality & Well-Being',
      outlook: `Overall vitality remains resilient, supported by favorable celestial transits. Minor seasonal fluctuations in energy during the early quarters serve as gentle reminders to honor your body\'s natural rhythms through proper nourishment and restorative rest.`,
      timeline: 'Focus on nervous system rest in Q1; enjoy peak vitality, stamina, and mental poise from June onward.',
      keyGuidance: 'Integrate gentle yoga, daily morning walks in nature, and a clean, seasonal, sattvic diet.',
      highlights: [
        'Successful recovery from lingering fatigue through disciplined lifestyle routines.',
        'Heightened mental serenity and reduction of stress-induced digestive sensitivities.',
        'Renewed physical endurance, restful sleep cycles, and vibrant radiant energy.',
      ],
    },
  ];

  // 14. Favorable & Unfavorable Influences DTO
  const favorableUnfavorable: HoroscopeFavorableUnfavorableDto = {
    favorableColors: moonMeta.favorableColors,
    unfavorableColors: moonMeta.unfavorableColors,
    luckyDates: moonMeta.luckyDates,
    unluckyDates: moonMeta.unluckyDates,
  };

  // 15. Gemstones DTO
  const gemstones: HoroscopeGemstonesDto = {
    primaryGem: moonMeta.primaryGem,
    secondaryGem: moonMeta.secondaryGem,
    generalCaution:
      'Ensure all gemstones are 100% natural, unheated, untreated, and consecrated with Vedic mantras during an auspicious Muhurta before initial wearing. Never wear cracked or flawed gems. Traditional Vedic Remedial Notice: Astrological gemstones, vratas, and spiritual sadhanas represent traditional contemplative disciplines; they do not constitute medical, psychological, or guaranteed financial interventions.',
  };

  // 16. Empowered Pathways (Do\'s, Don\'ts & Spiritual Practices)
  const empoweredPathways: HoroscopeEmpoweredPathwaysDto = {
    dos: [
      `Embrace your natural ${moonMeta.englishName} methodical strengths; break complex yearly goals into clear weekly milestones.`,
      'Maintain an active gratitude journal to train your mind to celebrate incremental progress.',
      'Invest systematically in high-quality skill enhancements and wellness routines.',
      'Cultivate transparent, respectful communication with professional peers and loved ones.',
      'Practice regular charitable contributions (Dana) on auspicious planetary days.',
    ],
    donts: [
      'Do not allow perfectionism to paralyze timely decision-making or project delivery.',
      'Avoid harboring unexpressed resentment; address misunderstandings calmly and immediately.',
      'Refrain from speculative financial gambles or signing unvetted contracts during planetary retrogressions.',
      'Do not neglect physical sleep and hydration in pursuit of workaholism.',
      'Avoid harsh or overly critical speech when offering well-intentioned feedback.',
    ],
    spiritualPractices: [
      {
        practice: 'Thursday Jupiter Blessing Sadhana',
        day: 'Every Thursday morning',
        deity: 'Lord Brihaspati / Lord Vishnu',
        description: 'Wear yellow or cream attire, offer yellow flowers or bananas to the needy, and chant the Guru Stotram to amplify wisdom and prosperity.',
      },
      {
        practice: 'Friday Venus Harmony Practice',
        day: 'Every Friday morning',
        deity: 'Goddess Mahalakshmi',
        description: 'Light a pure ghee lamp, wear white or pastel clothing, and chant Shri Suktam to attract relationship harmony and graceful abundance.',
      },
      {
        practice: 'Saturday Shani Shanti Sadhana',
        day: 'Every Saturday evening',
        deity: 'Lord Shani Dev / Lord Hanuman',
        description: 'Light a mustard oil lamp under a Peepal tree, feed black sesame or roti to birds/animals, and recite Hanuman Chalisa to cultivate mental resilience and dissolve obstacles.',
      },
      {
        practice: 'Wednesday Budha Clarity Sadhana',
        day: 'Every Wednesday morning',
        deity: 'Lord Ganesha / Lord Budha',
        description: 'Offer Durva grass to Lord Ganesha and chant Om Gam Ganapataye Namaha to dissolve intellectual confusion and sharpen verbal persuasion.',
      },
    ],
    fastsAndVrats: [
      {
        name: 'Ekadashi Vrat',
        frequency: 'Twice monthly (Shukla & Krishna Ekadashi)',
        procedure: 'Abstain from grains, consume light fruits and water, and engage in sacred meditation to purify physiological and karmic channels.',
      },
      {
        name: 'Pradosh Vrat',
        frequency: 'Trayodashi Tithi (twice monthly)',
        procedure: 'Observe twilight fasting and perform Shiva Abhishekam to dispel lingering ancestral debts and mental anxieties.',
      },
    ],
  };

  // 17. Affirmations for 2026
  const affirmations: HoroscopeAffirmationDto[] = [
    {
      focusArea: 'Expansive Abundance & Purposeful Vision',
      planet: 'JUPITER',
      affirmationText: 'I trust that divine wisdom guides me toward prosperous opportunities that align with my highest purpose and serve the greater good.',
      scientificInsight: 'Conscious focus on constructive growth channels mental discipline, reinforcing positive intention and intentional goal achievement.',
    },
    {
      focusArea: 'Grounded Discipline & Enduring Mastery',
      planet: 'SATURN',
      affirmationText: 'I embrace patient discipline, knowing that every focused effort I invest today builds an unshakeable foundation for lasting success.',
      scientificInsight: 'Cultivates thoughtful self-restraint and conscious composure, supporting deliberate decision-making during high-pressure situations.',
    },
    {
      focusArea: 'Intellectual Clarity & Authentic Direction',
      planet: moonMeta.lord.toUpperCase(),
      affirmationText: `My mind is calm, clear, and focused. I communicate with authentic grace and make decisions with absolute confidence and discernment.`,
      scientificInsight: 'Promotes meditative tranquility and emotional poise, encouraging a centered perspective during complex life transitions.',
    },
  ];

  // 18. Classical Gochara Transit Scoring Engine for 2026 (Monthly & Quarterly Ratings)
  // Evaluates real-time planetary transits relative to native's natal Moon sign (Chandra Lagna).
  // Grounded in classical Phaladeepika (Ch. 26) and Brihat Samhita Gochara principles.
  const monthsData = [
    { month: 'January', quarter: 'Q1' as const, sunSign: 10, sunDignity: 'NEUTRAL', jupSign: 3, satSign: 12, satRetrograde: false, rahuSign: 11, ketuSign: 5 },
    { month: 'February', quarter: 'Q1' as const, sunSign: 11, sunDignity: 'NEUTRAL', jupSign: 3, satSign: 12, satRetrograde: false, rahuSign: 11, ketuSign: 5 },
    { month: 'March', quarter: 'Q1' as const, sunSign: 12, sunDignity: 'NEUTRAL', jupSign: 3, satSign: 12, satRetrograde: false, rahuSign: 11, ketuSign: 5 },
    { month: 'April', quarter: 'Q2' as const, sunSign: 1, sunDignity: 'EXALTED', jupSign: 3, satSign: 12, satRetrograde: false, rahuSign: 11, ketuSign: 5 },
    { month: 'May', quarter: 'Q2' as const, sunSign: 2, sunDignity: 'NEUTRAL', jupSign: 3, satSign: 12, satRetrograde: false, rahuSign: 11, ketuSign: 5 },
    { month: 'June', quarter: 'Q2' as const, sunSign: 3, sunDignity: 'NEUTRAL', jupSign: 4, satSign: 12, satRetrograde: false, rahuSign: 11, ketuSign: 5 },
    { month: 'July', quarter: 'Q3' as const, sunSign: 4, sunDignity: 'NEUTRAL', jupSign: 4, satSign: 12, satRetrograde: true, rahuSign: 11, ketuSign: 5 },
    { month: 'August', quarter: 'Q3' as const, sunSign: 5, sunDignity: 'OWN', jupSign: 4, satSign: 12, satRetrograde: true, rahuSign: 11, ketuSign: 5 },
    { month: 'September', quarter: 'Q3' as const, sunSign: 6, sunDignity: 'NEUTRAL', jupSign: 4, satSign: 12, satRetrograde: true, rahuSign: 11, ketuSign: 5 },
    { month: 'October', quarter: 'Q4' as const, sunSign: 7, sunDignity: 'DEBILITATED', jupSign: 4, satSign: 12, satRetrograde: true, rahuSign: 11, ketuSign: 5 },
    { month: 'November', quarter: 'Q4' as const, sunSign: 8, sunDignity: 'NEUTRAL', jupSign: 5, satSign: 12, satRetrograde: true, rahuSign: 11, ketuSign: 5 },
    { month: 'December', quarter: 'Q4' as const, sunSign: 9, sunDignity: 'NEUTRAL', jupSign: 5, satSign: 12, satRetrograde: false, rahuSign: 10, ketuSign: 4 },
  ];

  const monthlyForecastMatrix: HoroscopeMonthlyMatrixItemDto[] = monthsData.map((m) => {
    const hSun = ((m.sunSign - moonSignIndex + 12) % 12) + 1;
    const hJup = ((m.jupSign - moonSignIndex + 12) % 12) + 1;
    const hSat = ((m.satSign - moonSignIndex + 12) % 12) + 1;
    const hRahu = ((m.rahuSign - moonSignIndex + 12) % 12) + 1;
    const hKetu = ((m.ketuSign - moonSignIndex + 12) % 12) + 1;

    // Career Score (scale 2-5): Weighted by Sun (authority), Saturn (stability), Jupiter (dharma/growth)
    let career = 3;
    if ([3, 6, 10, 11].includes(hSun)) career += 1;
    if (hSun === 10) career += 1;
    if (m.sunDignity === 'EXALTED') career += 1;
    if (m.sunDignity === 'DEBILITATED') career -= 1;
    if ([2, 5, 9, 10, 11].includes(hJup)) career += 1;
    if ([3, 6, 11].includes(hSat)) career += 1;
    if ([1, 8, 12].includes(hSat) && m.satRetrograde) career -= 1;
    career = Math.max(2, Math.min(5, career));

    // Finance Score (scale 2-5): Weighted by 2nd/11th houses, Jupiter dignity, Rahu upachaya
    let finance = 3;
    if ([2, 5, 9, 11].includes(hJup)) finance += 1;
    if (m.jupSign === 4) finance += 1; // Jupiter exalted
    if ([3, 6, 11].includes(hRahu)) finance += 1;
    if ([12, 1, 2].includes(hSat)) finance -= 1; // Sade Sati financial friction
    if ([2, 11].includes(hSun)) finance += 1;
    finance = Math.max(2, Math.min(5, finance));

    // Health Score (scale 2-5): Weighted by Sun vitality, Saturn pressure, Jupiter trinal protection
    let health = 4;
    if ([6, 8, 12].includes(hSun)) health -= 1;
    if (m.sunDignity === 'EXALTED') health += 1;
    if (m.sunDignity === 'DEBILITATED') health -= 1;
    if ([1, 8].includes(hSat) && m.satRetrograde) health -= 1;
    if ([1, 5, 9].includes(hJup)) health += 1;
    health = Math.max(2, Math.min(5, health));

    // Relationship Score (scale 2-5): Weighted by 5th/7th houses, Jupiter benevolence, malefic aspects
    let relationship = 4;
    if ([1, 5, 7, 9, 11].includes(hJup)) relationship += 1;
    if (hSat === 7) relationship -= 1;
    if (hRahu === 7 || hKetu === 7) relationship -= 1;
    if (m.sunDignity === 'DEBILITATED') relationship -= 1;
    relationship = Math.max(2, Math.min(5, relationship));

    const composite = (career + finance + health + relationship) / 4;

    const summary =
      composite >= 4.25
        ? `Sun activates your ${hSun}${getOrdinalSuffix(hSun)} house while Jupiter enriches your ${hJup}${getOrdinalSuffix(hJup)} house; high auspicious momentum across professional initiatives and family life.`
        : composite >= 3.5
        ? `Sun transits your ${hSun}${getOrdinalSuffix(hSun)} house; steady productive rhythm across key responsibilities. Methodical execution produces dependable gains.`
        : `Sun in your ${hSun}${getOrdinalSuffix(hSun)} house and Saturn in your ${hSat}${getOrdinalSuffix(hSat)} house counsel disciplined patience; consolidate existing commitments and prioritize physiological rest.`;

    return {
      month: m.month,
      careerRating: career,
      financeRating: finance,
      healthRating: health,
      relationshipRating: relationship,
      summary,
    };
  });

  const quartersList: ('Q1' | 'Q2' | 'Q3' | 'Q4')[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const quarterlyForecasts: HoroscopeQuarterlyForecastDto[] = quartersList.map((q, idx) => {
    const qMonthsIndices = [idx * 3, idx * 3 + 1, idx * 3 + 2];
    const qMonthlyItems = qMonthsIndices.map((i) => monthlyForecastMatrix[i]);

    // Average composite across the 3 constituent months
    const monthlyComposites = qMonthlyItems.map(
      (m) => (m.careerRating + m.financeRating + m.healthRating + m.relationshipRating) / 4
    );
    const avgScore = monthlyComposites.reduce((sum, c) => sum + c, 0) / monthlyComposites.length;
    const roundedRating = Math.max(1, Math.min(5, Math.round(avgScore)));

    let qualitativeRating = 'Productive Advancement & Stability';
    if (avgScore >= 4.5) qualitativeRating = 'Exceptional Momentum & Expansion';
    else if (avgScore >= 4.0) qualitativeRating = 'High Opportunity & Auspicious Growth';
    else if (avgScore >= 3.5) qualitativeRating = 'Progressive Advancement & Favorable Execution';
    else if (avgScore >= 3.0) qualitativeRating = 'Steady Restructuring & Balanced Consolidation';
    else qualitativeRating = 'Prudent Caution & Remedial Focus';

    const periods: Record<string, string> = {
      Q1: 'January – March 2026',
      Q2: 'April – June 2026',
      Q3: 'July – September 2026',
      Q4: 'October – December 2026',
    };

    const focuses: Record<string, string> = {
      Q1: 'Foundational Planning, Strategy Formulation & Restructuring',
      Q2: 'Strategic Execution, Relationship Blossoming & Skill Upgrades',
      Q3: 'Peak Momentum, Financial Optimization & Auspicious Ingress',
      Q4: 'Harvest, Consolidating Gains & Milestone Celebrations',
    };

    const opportunities: Record<string, string> = {
      Q1: 'Excellent period for refining business models, organizing finances, and initiating disciplined lifestyle routines.',
      Q2: 'Accelerated team cooperation, successful mandates, and fruitful creative and commercial initiatives.',
      Q3: 'Jupiter activation unlocks favorable monetary flow, executive recognition, and social celebration.',
      Q4: 'Culmination of cherished yearly milestones, joyous family gatherings, and robust financial consolidation.',
    };

    const challenges: Record<string, string> = {
      Q1: 'Requires patience and meticulous double-checking during planetary transitions.',
      Q2: 'Balancing demanding professional duties with domestic expectations; maintain clear boundaries.',
      Q3: 'Avoid overcommitting or becoming complacent; sustain methodical discipline.',
      Q4: 'Maintain grounded humility and plan forward-looking investments for the subsequent cycle.',
    };

    return {
      quarter: q,
      period: periods[q],
      rating: roundedRating,
      compositeScore: Number(avgScore.toFixed(2)),
      qualitativeRating,
      focus: focuses[q],
      opportunities: opportunities[q],
      challenges: challenges[q],
    };
  });

  // 19. Classical Technical Calculations: Shodashvargas & Shadbala (Retained for Depth & Complete Compatibility)
  const y = parseInt(profileInput.dateOfBirth.split('-')[0], 10) || 1990;
  const m = parseInt(profileInput.dateOfBirth.split('-')[1], 10) || 1;
  const d = parseInt(profileInput.dateOfBirth.split('-')[2], 10) || 1;
  const hr = parseInt((profileInput.timeOfBirth || '12:00').split(':')[0], 10) || 12;
  const min = parseInt((profileInput.timeOfBirth || '12:00').split(':')[1], 10) || 0;

  const bDetails: BirthDetails = {
    date: { year: y, month: m, day: d },
    time: { hour: hr, minute: min, second: 0 },
    timezone: profileInput.timezone || (profileInput as any).timeZone || 'UTC',
    latitude: profileInput.latitude ?? 28.6139,
    longitude: profileInput.longitude ?? 77.2090,
    disambiguation: (profileInput as any).disambiguation,
    utcDateTime: (profileInput as any).utcDateTime || (profileInput as any).resolvedUtc,
    timezoneOffsetSeconds: (profileInput as any).timezoneOffsetSeconds,
  };

  const rawNormTime =
    chart.normalizedTime ||
    chart.metadata?.normalizedTime ||
    metadata?.normalizedTime ||
    rawChartData.normalizedChart?.calculation?.normalizedTime ||
    rawChartData.calculation?.normalizedTime;

  const normalizedTime =
    rawNormTime && rawNormTime.utcIsoString && rawNormTime.julianDayUT
      ? rawNormTime
      : normalizeBirthTime(bDetails);

  const astroChart: AstroChart = {
    metadata: {
      engineVersion: '1.0.0',
      calculationTimestampIso: new Date().toISOString(),
      providerName: 'AstrologyEngine',
      providerVersion: '1.0.0',
      config: {
        zodiacType: 'SIDEREAL',
        ayanamsa: 'LAHIRI',
        houseSystem: 'WHOLE_SIGN',
        nodeCalculation: 'MEAN_NODE',
      } as AstrologyConfig,
      normalizedTime: {
        originalDetails: bDetails as any,
        utcIsoString: normalizedTime.utcIsoString,
        utcTimestampMs: normalizedTime.utcTimestampMs || new Date(normalizedTime.utcIsoString).getTime(),
        julianDayUT: normalizedTime.julianDayUT,
        timezoneOffsetMinutes:
          normalizedTime.timezoneOffsetMinutes ??
          (normalizedTime.timezoneOffsetSeconds !== undefined ? normalizedTime.timezoneOffsetSeconds / 60 : 0),
        timezoneOffsetSeconds: normalizedTime.timezoneOffsetSeconds,
        isDaylightSaving: normalizedTime.isDaylightSaving,
      },
    },
    birthDetails: bDetails as any,
    ascendant: {
      longitude: ascLongitude,
      rashiName: ascRashiDef.sanskritName,
      rashiIndex: ascRashiIndex,
      degreeInRashi: ascDegreeInRashi,
    } as any,
    planets: {} as any,
    houses: houses.map((h) => {
      const houseRashiIndex = ((ascRashiIndex - 1 + (h.houseNumber - 1)) % 12) + 1;
      const houseRashiDef = RASHIS[houseRashiIndex - 1];
      const startLongitude = (houseRashiIndex - 1) * 30;
      const endLongitude = houseRashiIndex * 30;
      return {
        houseNumber: h.houseNumber,
        cuspLongitude: startLongitude,
        startLongitude,
        endLongitude,
        rashiIndex: houseRashiIndex,
        rashiName: houseRashiDef.sanskritName,
        planetsInHouse: h.planetsPresent as any,
      };
    }) as any,
  };

  for (const p of chart.planets || []) {
    const sym = String(p.planet || p.name).toUpperCase() as PlanetSymbol;
    astroChart.planets[sym] = {
      symbol: sym,
      longitude: typeof p.longitude === 'number' ? p.longitude : ((p.house - 1) * 30 + (p.degree || 0)),
      isRetrograde: Boolean(p.isRetrograde),
      speedDegreesPerDay: typeof p.speed === 'number' ? p.speed : 1.0,
      rashiName: p.rashiName || p.sign || 'Aries',
      degreeInRashi: typeof p.degreeInRashi === 'number' ? p.degreeInRashi : (p.degree || 0),
    } as any;
  }

  const vargaDefinitions: Array<{ code: VargaType; name: string; focus: string }> = [
    { code: 'D1', name: 'Rashi', focus: 'Physical Constitution, General Life & Vitality' },
    { code: 'D9', name: 'Navamsha', focus: 'Soul Dharma, Inner Potential, Marriage & Destiny' },
    { code: 'D10', name: 'Dashamsha', focus: 'Vocational Eminence, Professional Status & Power' },
    { code: 'D7', name: 'Saptamsha', focus: 'Creative Offspring, Progeny, Legacy & Partnerships' },
    { code: 'D12', name: 'Dwadashamsha', focus: 'Ancestral Lineage, Parents & Karmic Roots' },
  ];

  const vargaCalculator = new VargaCalculator();
  const vargas: VargaSummaryDto[] = [];
  for (const vDef of vargaDefinitions) {
    try {
      const vChart = vargaCalculator.calculateVarga(astroChart, vDef.code);
      const vAscSign = vChart.placements['Ascendant']?.rashiName || ascSign;
      const vPlacements: VargaSummaryDto['placements'] = [];
      for (const [sym, pl] of Object.entries(vChart.placements)) {
        if (sym === 'Ascendant') continue;
        vPlacements.push({
          planet: sym,
          sign: pl.rashiName,
          house: pl.house ?? 1,
          isRetrograde: pl.isRetrograde,
        });
      }
      vargas.push({
        vargaCode: vDef.code,
        vargaName: vDef.name,
        focusArea: vDef.focus,
        ascendantSign: vAscSign,
        placements: vPlacements,
      });
    } catch (_err) {
      vargas.push({
        vargaCode: vDef.code,
        vargaName: vDef.name,
        focusArea: vDef.focus,
        ascendantSign: ascSign,
        placements: planets.map((p) => ({
          planet: p.planet,
          sign: p.sign,
          house: p.house,
          isRetrograde: p.isRetrograde,
        })),
      });
    }
  }

  const shadbalaItems: ShadbalaItemDto[] = [];
  try {
    const shadbalaCalc = new ShadbalaCalculator(vargaCalculator);
    const shadbalaReport = shadbalaCalc.calculate(astroChart);
    for (const [planetSym, pData] of Object.entries(shadbalaReport.planets)) {
      if (!pData) continue;
      const reqRupas = (SHADBALA_MINIMUM_REQUIREMENTS[planetSym as ShadbalaPlanet] || 360.0) / 60.0;
      const totalRupas = pData.totalRupas;
      const isStrong = totalRupas >= reqRupas;
      shadbalaItems.push({
        planet: planetSym,
        sthanaBala: parseFloat((pData.sthanaBala?.total || 0).toFixed(1)),
        digBala: parseFloat((pData.digBala || 0).toFixed(1)),
        kalaBala: parseFloat((pData.kalaBala?.total || 0).toFixed(1)),
        cheshtaBala: parseFloat((pData.cheshtaBala || 0).toFixed(1)),
        naisargikaBala: parseFloat((pData.naisargikaBala || 0).toFixed(1)),
        drikBala: parseFloat((pData.drikBala || 0).toFixed(1)),
        totalShashtiamsas: parseFloat((pData.totalShashtiamsas || 0).toFixed(1)),
        totalRupas: parseFloat(totalRupas.toFixed(2)),
        requiredRupas: parseFloat(reqRupas.toFixed(2)),
        relativeRank: pData.rank,
        isStrong,
      });
    }
  } catch (err: any) {
    throw new Error(`SHADBALA_CALCULATION_FAILED: Failed to calculate planetary Shadbala strengths: ${err?.message || 'unknown error'}`);
  }

  const bhavaBalaItems: BhavaBalaItemDto[] = [];
  try {
    const shadbalaReport = new ShadbalaCalculator(vargaCalculator).calculate(astroChart);
    const bhavaBalaReport = calculateBhavaBala(astroChart, shadbalaReport);
    for (const hData of bhavaBalaReport.houses) {
      bhavaBalaItems.push({
        houseNumber: hData.houseNumber,
        sign: hData.sign || `House ${hData.houseNumber}`,
        lord: String(hData.lord),
        bhavadhipatiBala: parseFloat((hData.bhavadhipatiBala || 0).toFixed(1)),
        bhavaDigBala: parseFloat((hData.bhavaDigBala || 0).toFixed(1)),
        bhavaDrishtiBala: parseFloat((hData.bhavaDrishtiBala || 0).toFixed(1)),
        totalRupas: parseFloat((hData.totalRupas || 0).toFixed(2)),
        relativeRank: hData.rank,
      });
    }
  } catch (err: any) {
    throw new Error(`BHAVA_BALA_CALCULATION_FAILED: Failed to calculate house Bhava Bala strengths: ${err?.message || 'unknown error'}`);
  }

  // 20. Grounded Remedies Array
  const remedies: ProHoroscopeModel['remedies'] = [
    {
      type: 'MANTRA',
      title: `${moonMeta.lord.toUpperCase()} Vedic Stotra & Chanting Sadhana`,
      description: `Daily recitation to awaken intellectual serenity and align your conscious intent with cosmic harmony.`,
      mantraText: moonMeta.primaryGem.wearingInstructions.mantra,
    },
    {
      type: 'CHARITY',
      title: 'Charitable Service (Dana)',
      description: `Support students, provide green fodder or grains to animals, and offer seasonal fruits to elders on Wednesdays and Thursdays.`,
    },
    {
      type: 'BEHAVIORAL',
      title: 'Methodical Reflection & Grounding',
      description: `Engage in daily evening journaling and structured planning. Avoid perfectionistic paralysis by celebrating incremental milestones.`,
    },
  ];

  // 21. Report Section Composition: All 8 Chapters via ReportSectionComposer
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
    // Assert AI interpretation traceability against verified evidence
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

  // Chapter 1: Overview of Moon Sign & 2026 Cosmic Significance
  addChapter(
    'ch1_overview',
    `1. Overview of ${moonMeta.englishName} Moon Sign & 2026 Cosmic Significance`,
    1,
    `This Yearly Horoscope 2026 is anchored firmly in your Moon Sign (Chandra Lagna), which serves as the foundational mirror of your emotional temperament, subconscious mind, and psychological responses. In sidereal Vedic astrology, while the Ascendant indicates external vitality, the Moon Sign reveals how you experience life, process challenges, and manifest opportunities. With your natal Moon placed in ${moonMeta.englishName} (${moonMeta.sanskritName}) in ${moonPlanet.nakshatra} Nakshatra Pada ${moonPlanet.pada}, 2026 unfolds as a transformative chapter of structured accomplishment, mental clarity, and auspicious personal evolution. Major celestial movements throughout the year create a dynamic environment for substantial expansion and mastery.`,
    {
      'Moon Sign': `${moonMeta.englishName} (${moonMeta.sanskritName})`,
      'Ruling Lord': moonMeta.lord,
      'Nakshatra': `${moonPlanet.nakshatra} (Pada ${moonPlanet.pada})`,
      'Cosmic Element': moonMeta.element,
      'Year Theme': yearlyOverview.cosmicTheme,
    }
  );

  // Chapter 2: Your Personality and Natal Traits
  addChapter(
    'ch2_personality',
    `2. Your Personality and Natal Traits (${moonMeta.englishName} Moon Sign)`,
    2,
    `Ruled by ${moonMeta.lord}, your core personality radiates ${moonMeta.personalityTraits.map((t) => t.name.toLowerCase()).join(', ')}. You approach life with realistic logic and methodical discernment, seeking efficient and elegant solutions rather than relying on ungrounded impulse. Your exceptional attention to detail allows you to bring order to complex chaos, while your genuine devotion to service makes you a loyal anchor for friends, colleagues, and family. In 2026, combining this analytical precision with unshakeable self-confidence allows you to step into your authentic authority without being held back by self-criticism.`,
    undefined,
    moonMeta.personalityTraits.map((t) => `${t.name}: ${t.description}`)
  );

  // Chapter 3: Personal Horoscope 2026: Life Domains
  addChapter(
    'ch3_life_domains',
    '3. Personal Horoscope 2026: Life Domain Forecasts',
    3,
    `Throughout 2026, the cosmic landscape influences every sphere of your existence. In Career, Saturn's steady discipline rewards your dedication with public recognition and promotion. In Finance, initial budgeting gives way to lucrative gains as Jupiter expands wealth opportunities. Education and learning receive tremendous divine clarity, while Love and Family relationships deepen in mutual respect and emotional warmth. Health remains resilient when supported by clean lifestyle habits, balanced exercise, and stress management.`,
    undefined,
    lifeDomainForecasts.map((d) => `${d.title} (${d.timeline}): ${d.outlook}`)
  );

  // Chapter 4: Planetary Influence & Predictions 2026
  addChapter(
    'ch4_planetary_influence',
    '4. Planetary Influence, Transits & Predictions 2026',
    4,
    `The major celestial architects of 2026—Saturn, Jupiter, Rahu, and Ketu—coordinate to reshape your personal and professional landscape. Saturn\'s placement provides the foundational endurance required for monumental achievement. Jupiter\'s graceful transition expands fortune, higher learning, and joyful gains, while Rahu and Ketu stimulate innovative courage and spiritual detachment. Aligning with your favorable colors, lucky dates, and consecrated gemstones optimizes these planetary currents in your daily life.`,
    {
      'Favorable Colors': favorableUnfavorable.favorableColors.map((c) => c.color).join(', '),
      'Colors to Avoid': favorableUnfavorable.unfavorableColors.map((c) => c.color).join(', '),
      'Lucky Dates': favorableUnfavorable.luckyDates.map((d) => d.dates).join(' | '),
      'Primary Gemstone': `${gemstones.primaryGem.name} (${gemstones.primaryGem.wearingInstructions.metal}, ${gemstones.primaryGem.wearingInstructions.finger})`,
    }
  );

  // Chapter 5: Empowered Pathways: Remedies & Spiritual Practices
  addChapter(
    'ch5_empowered_pathways',
    '5. Empowered Pathways: Do\'s, Don\'ts & Spiritual Practices',
    5,
    `Astrology is an empowering science of conscious navigation rather than fatalistic resignation. By aligning with specific weekly sadhanas, ethical principles, and targeted Vedic remedies, you harmonize cosmic currents and dissolve karmic friction. Engaging in Thursday Jupiter prayers, Friday Venus gratitude rituals, and Saturday disciplined service builds tremendous positive momentum throughout 2026.`,
    undefined,
    empoweredPathways.dos.map((d) => `DO: ${d}`).concat(empoweredPathways.donts.map((d) => `DON'T: ${d}`))
  );

  // Chapter 6: Numerology 2026 for Moon Sign & Daily Affirmations
  addChapter(
    'ch6_numerology_affirmations',
    '6. Numerology 2026 for Moon Sign & Daily Affirmations',
    6,
    `Under Universal Year 1 (2 + 0 + 2 + 6 = 10 → 1), the universe vibrates with the energy of bold leadership, authentic individuality, and fresh beginnings. For your ${moonMeta.englishName} Moon sign, this universal vibration harmonizes with your Mulank ${mulank} and Bhagyank ${bhagyank} to reward calculated decisive initiative. Practicing daily mindful affirmations encourages intentional focus, clarity of purpose, and structured cognitive grounding towards your goals.`,
    {
      'Universal Year': '1 (Pioneering Leadership & Fresh Beginnings)',
      'Native Mulank': String(mulank),
      'Native Bhagyank': String(bhagyank),
      'Key Affirmation Focus': 'Expansive Abundance, Grounded Discipline & Mental Poise',
    }
  );

  // Chapter 7: Quarterly Forecasts & 12-Month Matrix
  addChapter(
    'ch7_quarterly_monthly',
    '7. Quarterly Forecasts & 12-Month Matrix (January – December 2026)',
    7,
    `The quarterly trajectory of 2026 demonstrates steady acceleration: Q1 consolidates strategic planning, Q2 executes dynamic initiatives, Q3 yields maximum planetary harvest, and Q4 celebrates milestone achievements. Reviewing your monthly matrix empowers you to schedule critical meetings, investments, wellness retreats, and celebrations during peak auspicious windows.`,
    undefined,
    quarterlyForecasts.map((q) => `${q.quarter} (${q.period}) [Rating: ${q.rating}/5]: ${q.focus} — ${q.opportunities}`)
  );

  // Chapter 8: Conclusion & Personal Message
  addChapter(
    'ch8_closing',
    '8. Conclusion, Personal Message from Sushil Kumaar Singh & Ephemeris Standards',
    8,
    `As you step forward into 2026, remember that the universe has aligned this year for you to express your highest wisdom, conquer lingering self-doubt, and claim the respected recognition you have diligently earned. Every challenge encountered is simply refining your competencies for lasting success. Walk with confidence, stay anchored in integrity, and know that when you align your conscious actions with cosmic wisdom, the universe unfailingly opens the path to fulfillment.`,
    {
      'Astrological Mentor': 'Sushil Kumaar Singh (Astro Sushil)',
      'Zodiac & Ayanamsa': 'Sidereal Zodiac, Lahiri Ayanamsha (Chitra Paksha)',
      'House System': 'Whole Sign House System (BPHS Canonical)',
      'Lunar Nodes': 'Mean Node Calculation',
      'Integrity Assurance': '100% Deterministic Rule-Based Calculation Engine',
    }
  );

  return {
    version: '1.0',
    type: ReportType.HOROSCOPE,
    title: 'Personalised Horoscope & Yearly Transit Dossier 2026',
    generatedAt: new Date().toISOString(),
    profile,
    configuration,
    ascendant,
    planets,
    houses,
    vargas,
    shadbala: shadbalaItems,
    bhavaBala: bhavaBalaItems,
    remedies,
    moonSignDetails,
    yearlyOverview,
    personalityTraits: {
      coreIdentity: `${moonMeta.englishName} Moon sign ruled by ${moonMeta.lord}`,
      traits: moonMeta.personalityTraits,
    },
    lifeDomainForecasts,
    planetaryInfluences,
    favorableUnfavorable,
    gemstones,
    empoweredPathways,
    numerologyForecast,
    affirmations,
    quarterlyForecasts,
    monthlyForecastMatrix,
    closingNote: {
      author: 'Sushil Kumaar Singh',
      message: 'When you align your conscious actions with the cosmos, the cosmos aligns with you.',
      ephemerisStandard: 'Sidereal Zodiac, Lahiri Ayanamsha, Whole Sign Houses, Mean Node',
      disclaimer: 'Astrological interpretations are provided for self-discovery and guidance.',
    },
    normalizedTime: astroChart.metadata?.normalizedTime || normalizedTime,
    sections,
  };
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function reduceToSingleDigit(num: number): number {
  let val = Math.abs(num);
  while (val > 9) {
    let sum = 0;
    while (val > 0) {
      sum += val % 10;
      val = Math.floor(val / 10);
    }
    val = sum;
  }
  return val === 0 ? 9 : val;
}

function getOrdinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export const generatePersonalisedHoroscopeReport = generateProHoroscopeReport;
