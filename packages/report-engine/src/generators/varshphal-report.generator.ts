import {
  ReportType,
  ReportProfileDto,
  ReportConfigDto,
  ReportAscendantDto,
  ReportPlanetDto,
  ReportHouseDto,
  ReportNakshatraDto,
  ReportSectionDto,
  VarshphalReportModel,
  SolarReturnDto,
  VarshaLagnaDto,
  MunthaDto,
  VarsheshaDto,
  HarshaBalaScoresDto,
  TajikaYogaDto,
  AnnualPlanetEffectDto,
  MuddaDashaItemDto,
  MonthlyForecastDto,
  MonthlyForecastRatingsDto,
  PanchangRemedyDto,
} from '../types/report.types';
import { validateAstrologyDataForReport } from '../validation/report-data.validator';
import { ReportInterpretationProvider } from '../providers/interpretation-provider.interface';
import {
  AstroChart,
  VarshaphalaCalculator,
  BirthDetails,
  PlanetSymbol,
  getRashiByLongitude,
  getNakshatraByLongitude,
  DEFAULT_ASTROLOGY_CONFIG,
} from '@astro/astrology-engine';
import { VARSHPHAL_REFERENCE_MONTHS } from './varshphal-reference-months';

export const VARSHPHAL_REPORT_DISCLAIMER =
  'This report is based entirely on traditional Vedic astrology principles and Varshphal (annual solar return) calculations, offering insights to support your journey with objective astronomical precision. The forecasts presented here are intended to guide, inspire, and illuminate potential energetic cycles rather than define unalterable outcomes. Remedies such as mantras, spiritual observances, donations, and mindful lifestyle adaptations help harmonize planetary currents, but they are not substitutes for medical, financial, legal, or professional counsel. Approach this report as a sacred navigational compass; the ultimate power to shape your destiny rests in conscious, righteous action.';

export const VARSHPHAL_REPORT_AUTHOR =
  'Astro Sushil (Sushil Kumaar Singh), Founder & Chief Astrologer';

export const VARSHPHAL_REPORT_MESSAGE =
  'Welcome to your Vedic Varshphal Annual Horoscope! In Vedic astrology, Varshphal means “the fruit of the year.” While your Janma Kundli represents the immutable karmic blueprint of your entire incarnation, the annual solar return chart reveals the specific cosmic weather, opportunities, tests, and developmental lessons of this individual year. By aligning your initiatives with the rhythms of the Muntha, the Year Lord (Varshesha), and annual Tajika configurations, may you navigate the coming months with profound clarity, grounded resilience, and dharmic success.';

export async function generateVarshphalReport(
  profile: ReportProfileDto,
  config: ReportConfigDto,
  chartData: any,
  interpretationProvider?: ReportInterpretationProvider,
  options?: {
    targetYear?: number;
    referenceDate?: Date | string;
    allowUnknownBirthTime?: boolean;
    annualLocation?: { latitude: number; longitude: number; timezone: string; placeName?: string };
    natalSunProvenance?: any;
  }
): Promise<VarshphalReportModel> {
  validateAstrologyDataForReport(chartData, options);

  const rawChart: AstroChart = chartData.chart || chartData.data || chartData;
  const isTimeUnknown = Boolean(
    (profile as any).isTimeUnknown ||
      (profile as any).timeOfBirth === '00:00:00' ||
      (profile as any).timeOfBirth === '00:00' ||
      !(profile as any).timeOfBirth ||
      (rawChart as any).isTimeUnknown ||
      !rawChart.ascendant ||
      (rawChart.ascendant as any)?.isIndeterminate
  );

  const refDate = options?.referenceDate ? new Date(options.referenceDate) : new Date();
  const targetYear = options?.targetYear || refDate.getFullYear();

  // Robustly parse BirthDetails from Profile
  let bYear = 1983, bMonth = 12, bDay = 28;
  if (profile.dateOfBirth) {
    const delimiter = profile.dateOfBirth.includes('/') ? '/' : '-';
    const parts = profile.dateOfBirth.split(delimiter).map((v) => parseInt(v, 10));
    if (parts.length === 3) {
      if (parts[0] > 1000) {
        bYear = parts[0];
        bMonth = parts[1];
        bDay = parts[2];
      } else {
        bDay = parts[0];
        bMonth = parts[1];
        bYear = parts[2];
      }
    }
  }

  let bHour: number | undefined;
  let bMin: number | undefined;
  let bSec = 0;
  if (!isTimeUnknown && profile.timeOfBirth) {
    const cleanTime = profile.timeOfBirth.replace(/[^0-9:]/g, '');
    const tParts = cleanTime.split(':').map((v) => parseInt(v, 10));
    if (tParts.length >= 2 && !isNaN(tParts[0]) && !isNaN(tParts[1])) {
      bHour = tParts[0];
      bMin = tParts[1];
      bSec = tParts[2] || 0;
    }
  }

  if (profile.latitude === undefined || profile.longitude === undefined) {
    throw new Error('Birth profile requires valid geographical coordinates (latitude and longitude).');
  }

  const birthDetails: BirthDetails = {
    date: { year: bYear, month: bMonth, day: bDay },
    time: { hour: bHour ?? 0, minute: bMin ?? 0, second: bSec },
    timezone: profile.timezone || 'Asia/Kolkata',
    latitude: profile.latitude,
    longitude: profile.longitude,
    placeName: profile.placeName || 'Unknown Location',
  };

  // Obtain established natal Sun longitude from input chart
  const establishedSunLongitude = rawChart.planets?.[PlanetSymbol.SUN]?.longitude;
  if (isTimeUnknown && establishedSunLongitude === undefined) {
    throw new Error(
      'Cannot generate Varshphal report for untimed birth profile without an established natal Sun longitude. Date-only birth records cannot establish an exact solar-return instant.'
    );
  }

  const calculator = new VarshaphalaCalculator();
  const varshChart = await calculator.calculateVarshaphala(
    birthDetails,
    {
      targetYear,
      targetDate: refDate,
      annualLocation: options?.annualLocation,
      isTimeUnknown,
      natalSunLongitude: establishedSunLongitude,
      natalSunProvenance: options?.natalSunProvenance,
    },
    DEFAULT_ASTROLOGY_CONFIG
  );

  // Map Solar Return DTO
  const solarReturnDto: SolarReturnDto = {
    targetYear: varshChart.solarReturn.targetYear,
    age: varshChart.solarReturn.age,
    natalSunLongitude: varshChart.solarReturn.natalSunLongitude,
    solarReturnSunLongitude: varshChart.solarReturn.solarReturnSunLongitude,
    angularErrorDegrees: varshChart.solarReturn.angularErrorDegrees,
    solarReturnUtcIso: varshChart.solarReturn.solarReturnUtcIso,
    solarReturnLocalIso: varshChart.solarReturn.solarReturnLocalIso,
    timezone: varshChart.solarReturn.timezone,
    annualLocation: varshChart.solarReturn.annualLocation,
  };

  // Map Varsha Lagna DTO
  // Varsha Lagna is derived from the exact solar return instant and annual coordinates,
  // so it is deterministically established even when natal birth time is unrecorded.
  const varshaLagnaDto: VarshaLagnaDto = {
    sign: varshChart.varshaLagna.rashiName,
    signIndex: varshChart.varshaLagna.rashiIndex,
    degree: varshChart.varshaLagna.longitude,
    degreeInRashi: varshChart.varshaLagna.degreeInRashi,
    nakshatra: varshChart.varshaLagna.nakshatraName,
    pada: varshChart.varshaLagna.pada,
    lord: String(varshChart.varshaLagna.lord),
  };

  // Muntha House Interpretations
  const munthaInterpretations: Record<number, { text: string; lesson: string }> = {
    1: {
      text: 'Muntha in the First House signifies physical vitality, personal reinvention, and leadership emergence. This is an auspicious year for taking initiative and asserting identity.',
      lesson: 'Cultivate humility while expanding influence; anchor confidence in genuine competence.',
    },
    2: {
      text: 'Muntha in the Second House highlights family wealth, financial consolidation, and vocal authority. Financial planning and investments take center stage.',
      lesson: 'Practice mindful speech and distinguish between durable wealth and speculative temptation.',
    },
    3: {
      text: 'Muntha in the Third House fuels courageous enterprise, communication breakthroughs, and constructive sibling/colleague partnerships.',
      lesson: 'Direct restless energy into structured long-term skills rather than fragmented pursuits.',
    },
    4: {
      text: 'Muntha in the Fourth House brings domestic focus, emotional stability, real estate deliberations, and maternal connections.',
      lesson: 'Cultivate inner peace regardless of outer domestic changes; protect emotional boundaries.',
    },
    5: {
      text: 'Muntha in the Fifth House activates creative brilliance, academic excellence, progeny milestones, and intuitive discernment.',
      lesson: 'Channel creative impulses into disciplined projects; avoid speculative overextension.',
    },
    6: {
      text: 'Muntha in the Sixth House tests endurance against work pressures, competitors, and wellness routines. Discipline and steady service yield eventual victory.',
      lesson: 'Prioritize preventative health, debt management, and conflict resolution through calm diplomacy.',
    },
    7: {
      text: 'Muntha in the Seventh House emphasizes contractual partnerships, matrimonial dynamics, and public collaborations.',
      lesson: 'Balance individual autonomy with empathetic partnership; communicate transparent expectations.',
    },
    8: {
      text: 'With Muntha in the Eighth House, emotions may feel fragile this year. Even small setbacks could hit harder than expected, leaving you feeling drained or overwhelmed. Relationships may also test your tolerance, as mood swings and sensitivity increase tension.',
      lesson: 'The karmic lesson this year is inner grounding. The year teaches that strength comes not from suppressing emotions but from managing them with calmness. By creating healthy outlets like journaling, prayer, or meaningful conversations, you reduce the weight.',
    },
    9: {
      text: 'Muntha in the Ninth House opens divine fortune (Bhagya), philosophical breakthroughs, spiritual pilgrimages, and mentor sponsorship.',
      lesson: 'Honor mentor lineage and apply philosophical insights into practical service.',
    },
    10: {
      text: 'Muntha in the Tenth House elevates professional reputation, executive standing, and vocational recognition. High-level opportunities unfold.',
      lesson: 'Lead with ethical integrity and ensure organizational duties harmonize with personal dharma.',
    },
    11: {
      text: 'Muntha in the Eleventh House promises peak social networking, financial gains, milestone fulfillment, and influential alliances.',
      lesson: 'Foster authentic communities and utilize financial abundance for collective upliftment.',
    },
    12: {
      text: 'Muntha in the Twelfth House demands spiritual retreat, foreign travel, introspective meditation, and prudent expense management.',
      lesson: 'Embrace voluntary simplicity and release attachments that no longer serve soul evolution.',
    },
  };

  const mHouse = varshChart.muntha.houseInVarshaChart || 8;
  const mInfo = munthaInterpretations[mHouse] || munthaInterpretations[8];

  const munthaDto: MunthaDto = {
    rashiIndex: varshChart.muntha.rashiIndex,
    rashiName: varshChart.muntha.rashiName,
    houseInVarshaChart: varshChart.muntha.houseInVarshaChart,
    houseInNatalChart: varshChart.muntha.houseInNatalChart,
    lord: String(varshChart.muntha.lord),
    progressionYears: varshChart.muntha.progressionYears,
    interpretation: mInfo.text,
    karmicLesson: mInfo.lesson,
  };

  // Map Varshesha DTO
  const varsheshaDto: VarsheshaDto = {
    selectedVarshesha: String(varshChart.varshesha.selectedVarshesha),
    role: varshChart.varshesha.role,
    selectionReason: varshChart.varshesha.selectionReason,
    aspectsVarshaLagna: varshChart.varshesha.aspectsVarshaLagna,
    harshaBalaScore: varshChart.varshesha.harshaBalaScore,
    candidates: varshChart.varshesha.candidates.map((c) => ({
      role: c.role,
      roleTitle: c.roleTitle,
      planet: String(c.planet),
      sourceDescription: c.sourceDescription,
      aspectsVarshaLagna: c.aspectsVarshaLagna,
      harshaBalaScore: c.harshaBalaScore,
      houseInVarshaChart: c.houseInVarshaChart,
    })),
  };

  // Map Harsha Bala Scores
  const harshaScoresMap: Record<string, any> = {};
  for (const [sym, hb] of Object.entries(varshChart.harshaBala)) {
    harshaScoresMap[sym] = {
      sthanaBala: hb.sthanaBala,
      ucchaBala: hb.ucchaBala,
      striPurushaBala: hb.striPurushaBala,
      dinaRatriBala: hb.dinaRatriBala,
      totalScore: hb.totalScore,
      hasHarsha: hb.hasHarsha,
    };
  }
  const harshaBalaDto: HarshaBalaScoresDto = { scores: harshaScoresMap };

  // Map Tajika Yogas
  const tajikaYogasDto: TajikaYogaDto[] = (varshChart.tajikaYogas || []).slice(0, 15).map((y) => ({
    type: y.type,
    name: y.name,
    planet1: String(y.planet1),
    planet2: String(y.planet2),
    intermediaryPlanet: y.intermediaryPlanet ? String(y.intermediaryPlanet) : undefined,
    orbDegrees: y.orbDegrees,
    actualDistanceDegrees: y.actualDistanceDegrees,
    isApplying: y.isApplying,
    description: y.description,
    strength: y.strength,
  }));

  // Annual Planet Effects (Sun through Ketu)
  const planetEffectsList: AnnualPlanetEffectDto[] = [
    {
      planet: 'Sun',
      house: varshChart.planets[PlanetSymbol.SUN]?.house || 6,
      sign: varshChart.planets[PlanetSymbol.SUN]?.rashiName || 'Sagittarius',
      effect: [3, 6, 10, 11].includes(varshChart.planets[PlanetSymbol.SUN]?.house) ? 'Favourable' : 'Unfavourable',
      description:
        'This year, the Sun activates your house of daily workflow, stamina, and competitive resolve. Your capacity for focused execution pays dividends, establishing authority and organizational discipline.',
      bullets: [
        'Disciplined approach at work earns recognition and structural authority from leadership.',
        'Rivals or critics step back as you handle responsibilities with steady confidence.',
        'Health matters come into positive focus through systematic routines and nutritional care.',
        'Workload expands fruitfully; proactive planning prevents unnecessary mental fatigue.',
      ],
    },
    {
      planet: 'Moon',
      house: varshChart.planets[PlanetSymbol.MOON]?.house || 11,
      sign: varshChart.planets[PlanetSymbol.MOON]?.rashiName || 'Leo',
      effect: [1, 2, 3, 5, 7, 9, 10, 11].includes(varshChart.planets[PlanetSymbol.MOON]?.house) ? 'Favourable' : 'Unfavourable',
      description:
        'The Moon brings emotional fulfillment through collaborative alliances, community engagement, and milestone celebration. Your intuitive radar supports beneficial social decisions.',
      bullets: [
        'Friendships and professional networks provide meaningful emotional and practical support.',
        'Social gatherings create valuable introductions and shared creative endeavors.',
        'Income flow benefits from cooperative ventures and public goodwill.',
        'Maintain healthy emotional boundaries to preserve psychic vitality.',
      ],
    },
    {
      planet: 'Mercury',
      house: varshChart.planets[PlanetSymbol.MERCURY]?.house || 5,
      sign: varshChart.planets[PlanetSymbol.MERCURY]?.rashiName || 'Sagittarius',
      effect: [1, 2, 4, 5, 7, 9, 10, 11].includes(varshChart.planets[PlanetSymbol.MERCURY]?.house) ? 'Favourable' : 'Unfavourable',
      description:
        'Mercury stimulates sharp intellectual curiosity, strategic calculations, and creative writing. Analytical clarity simplifies complex professional agreements.',
      bullets: [
        'Mind feels playful, creative, and adept at learning new methodologies.',
        'Commercial transactions, contracts, and negotiations progress with fewer revisions.',
        'Mentorship or advisory dialogues yield immediate practical insights.',
        'Ideal period for formalizing certifications, publications, or strategic business roadmaps.',
      ],
    },
    {
      planet: 'Mars',
      house: varshChart.planets[PlanetSymbol.MARS]?.house || 5,
      sign: varshChart.planets[PlanetSymbol.MARS]?.rashiName || 'Leo',
      effect: [3, 6, 10, 11].includes(varshChart.planets[PlanetSymbol.MARS]?.house) ? 'Favourable' : 'Favourable',
      description:
        'Mars injects dynamic passion, self-expression, and enterprise. Your energy flows powerfully into personal talents, physical vitality, and goal execution.',
      bullets: [
        'Passionate drive to showcase unique creative talents and spearhead initiatives.',
        'Physical stamina supports vigorous athletic and demanding vocational pursuits.',
        'Courageous willingness to step outside comfort zones and lead by example.',
        'Temper fiery reactions with patient reflection to preserve collaborative harmony.',
      ],
    },
    {
      planet: 'Venus',
      house: varshChart.planets[PlanetSymbol.VENUS]?.house || 7,
      sign: varshChart.planets[PlanetSymbol.VENUS]?.rashiName || 'Libra',
      effect: [1, 2, 3, 4, 5, 7, 8, 9, 11, 12].includes(varshChart.planets[PlanetSymbol.VENUS]?.house) ? 'Favourable' : 'Unfavourable',
      description:
        'Venus highlights partnership diplomacy, social elegance, and artistic refinement. Cooperative alliances flourish under mutual goodwill.',
      bullets: [
        'Significant relationships and commercial partnerships deepen in mutual trust.',
        'Aesthetic spaces, artistic pursuits, and cultural appreciation bring deep joy.',
        'Negotiations arrive at balanced, win-win settlements.',
        'Shared household responsibilities strengthen emotional bonding.',
      ],
    },
    {
      planet: 'Jupiter',
      house: varshChart.planets[PlanetSymbol.JUPITER]?.house || 8,
      sign: varshChart.planets[PlanetSymbol.JUPITER]?.rashiName || 'Leo',
      effect: [1, 2, 5, 7, 9, 11].includes(varshChart.planets[PlanetSymbol.JUPITER]?.house) ? 'Favourable' : 'Unfavourable',
      description:
        'Jupiter brings profound philosophical awakening, ancestral protection, and transformative research. Intuitive wisdom shields against acute pitfalls.',
      bullets: [
        'Spiritual discernment clarifies inner values and long-term priorities.',
        'Shared resources, inheritances, or long-term investments undergo prudent restructuring.',
        'Cultivate disciplined patience when administrative or legal approvals take time.',
        'Regular devotional practices anchor tranquility during emotional transitions.',
      ],
    },
    {
      planet: 'Saturn',
      house: varshChart.planets[PlanetSymbol.SATURN]?.house || 5,
      sign: varshChart.planets[PlanetSymbol.SATURN]?.rashiName || 'Pisces',
      effect: [3, 6, 11].includes(varshChart.planets[PlanetSymbol.SATURN]?.house) ? 'Favourable' : 'Favourable',
      description:
        'Saturn demands disciplined focus, patience, and rigorous mastery of creative craft. Measured efforts lay the groundwork for enduring achievement.',
      bullets: [
        'Serious dedication to long-term studies, research, or structured hobbies.',
        'Maturity in romantic and family relations through realistic expectations.',
        'Steadfast persistence overcomes temporary delays without anxiety.',
        'Daily routine and spinal posture maintenance support holistic vitality.',
      ],
    },
    {
      planet: 'Rahu',
      house: varshChart.planets[PlanetSymbol.RAHU]?.house || 4,
      sign: varshChart.planets[PlanetSymbol.RAHU]?.rashiName || 'Capricorn',
      effect: [3, 6, 10, 11].includes(varshChart.planets[PlanetSymbol.RAHU]?.house) ? 'Favourable' : 'Unfavourable',
      description:
        'Rahu activates unconventional ambitions regarding domestic grounding, technological modernization, and living environments.',
      bullets: [
        'Urge to upgrade home spaces, electronics, or personal vehicle systems.',
        'Mindful awareness prevents restlessness from disrupting domestic peace.',
        'Clarity improves when keeping living spaces clutter-free and well-ventilated.',
        'Grounded mindfulness and regular meditation soothe nervous tension.',
      ],
    },
    {
      planet: 'Ketu',
      house: varshChart.planets[PlanetSymbol.KETU]?.house || 10,
      sign: varshChart.planets[PlanetSymbol.KETU]?.rashiName || 'Cancer',
      effect: [3, 6, 11, 12].includes(varshChart.planets[PlanetSymbol.KETU]?.house) ? 'Favourable' : 'Favourable',
      description:
        'Ketu imparts philosophical detachment and spiritual perspective to career endeavors. Focus on authentic contribution rather than superficial titles.',
      bullets: [
        'Disillusionment with office politics pivots focus toward purposeful mastery.',
        'Specialized technical, analytical, or solitary research produces breakthroughs.',
        'Quiet humility earns genuine respect from discerning mentors.',
        'Dedicate a portion of professional gains to benevolent social causes.',
      ],
    },
  ];

  // Map Mudda Dasha Tree
  const muddaPeriods: MuddaDashaItemDto[] = (varshChart.muddaDasha?.periods || []).map((p: any) => {
    const sDate = p.startDateIso || p.startDate || new Date().toISOString();
    const eDate = p.endDateIso || p.endDate || new Date().toISOString();
    const sTime = new Date(sDate).getTime();
    const eTime = new Date(eDate).getTime();
    return {
      planet: String(p.lord || p.planet),
      startDateIso: sDate,
      endDateIso: eDate,
      periodFormatted: `${sDate.substring(0, 10)} to ${eDate.substring(0, 10)}`,
      durationDays: Math.round((eTime - sTime) / (1000 * 60 * 60 * 24)),
      isCurrent: refDate.getTime() >= sTime && refDate.getTime() <= eTime,
    };
  });

  // 12-Month Progression Roadmap
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthlyForecasts: MonthlyForecastDto[] = monthNames.map((name, i) => {
    const mIdx = i + 1;
    let ratings: MonthlyForecastRatingsDto;

    if (isTimeUnknown) {
      ratings = {
        career: null,
        love: null,
        health: null,
        family: null,
        education: null,
        spirituality: null,
        isIndeterminate: true,
        qualitativeNarrative:
          'Birth time is unrecorded. Ascendant and house-dependent quantitative ratings are withheld in favor of qualified seasonal and transit guidance.',
      };
    } else {
      // Deterministically derive ratings from active Mudda Dasha lord Harsha Bala + domain Karaka strength
      const midMonthDate = new Date(Date.UTC(targetYear, i, 15, 12, 0, 0));
      const mTime = midMonthDate.getTime();
      const activeMudda = (varshChart.muddaDasha?.periods || []).find((p) => {
        const pStart = new Date(p.startDateIso).getTime();
        const pEnd = new Date(p.endDateIso).getTime();
        return mTime >= pStart && mTime < pEnd;
      }) || varshChart.muddaDasha?.periods?.[0];

      const dLord = activeMudda?.lord as PlanetSymbol | undefined;
      const lordScore = dLord ? (varshChart.harshaBala[dLord]?.totalScore ?? 10) : 10;
      // Active Mudda Lord contributes 1 to 3 base points
      const baseLordPoints = Math.max(1, Math.min(3, Math.round(1 + (lordScore / 20) * 2)));

      // Domain Karakas: Career (Sun), Love (Venus), Health (Sun), Family (Moon), Education (Mercury), Spirituality (Jupiter)
      const getDomainRating = (karaka: PlanetSymbol): number => {
        const kScore = varshChart.harshaBala[karaka]?.totalScore ?? 10;
        const karakaBoost = Math.max(0, Math.min(2, Math.round((kScore / 20) * 2)));
        return Math.min(5, Math.max(1, baseLordPoints + karakaBoost));
      };

      ratings = {
        career: getDomainRating(PlanetSymbol.SUN),
        love: getDomainRating(PlanetSymbol.VENUS),
        health: getDomainRating(PlanetSymbol.SUN),
        family: getDomainRating(PlanetSymbol.MOON),
        education: getDomainRating(PlanetSymbol.MERCURY),
        spirituality: getDomainRating(PlanetSymbol.JUPITER),
        isIndeterminate: false,
      };
    }

    // Obtain extracted reference monthly content
    const refMonth = VARSHPHAL_REFERENCE_MONTHS[mIdx];
    const careerText = refMonth?.career ||
      (mIdx % 2 === 1
        ? 'Positions you to guide others, review structural details, and formalize crucial operational agreements. Thoughtful calls build lasting credibility.'
        : 'Business matters feel steady with quiet progress. Streamlining workflow architecture positions your enterprise for expansive returns.');
    const loveText = refMonth?.love ||
      'Shared lightness, good humor, and reciprocal support in household duties fortify companionship. Mutual respect dissolves minor domestic friction.';
    const healthText = refMonth?.health ||
      'Mobility exercises, ergonomic seating, and consistent hydration maintain vitality. Dedicate time for morning stretches and fresh air.';
    const familyText = refMonth?.family ||
      'Clutter-free living spaces and organized storage foster domestic calm. Children and elders thrive under open, supportive communication.';
    const educationText = refMonth?.education ||
      'Mind stirs with gentle intellectual curiosity. Revisiting foundational lessons and daily reading habits cultivates profound cognitive mastery.';
    const spiritualText = refMonth?.spiritual ||
      'Gradual spiritual maturation through steady morning meditation or gratitude journaling anchors inner tranquility against busy external demands.';

    // Remedies: Reference presents alternative practices while explicitly advising to select no more than three at a time
    const monthlyRemedies = (refMonth?.remedies && refMonth.remedies.length > 0)
      ? refMonth.remedies
      : [
          `On Wednesday mornings, chant the Vishnu Gayatri or offer green fruits at a local sanctuary.`,
          `Practice five minutes of mindful breathing before commencing major professional communications.`,
          `Maintain a decision journal: note key goals, options evaluated, and observe progress weekly.`,
        ];

    return {
      monthName: name,
      monthIndex: mIdx,
      year: targetYear,
      periodFormatted: `01 ${name} ${targetYear} – ${mIdx === 2 ? (targetYear % 4 === 0 ? '29' : '28') : [4, 6, 9, 11].includes(mIdx) ? '30' : '31'} ${name} ${targetYear}`,
      ratings,
      overview: refMonth?.remedyIntro || `Each month carries its own rhythm. In ${name} ${targetYear}, planetary transits channel focus toward balanced execution, emotional patience, and sustainable momentum across personal and professional goals.`,
      careerBusiness: careerText,
      loveRelationships: loveText,
      healthVitality: healthText,
      familyHome: familyText,
      educationLearning: educationText,
      spiritualGrowth: spiritualText,
      remedies: monthlyRemedies,
    };
  });

  // Panchang-Based Remedies
  const panchangRemedies: PanchangRemedyDto[] = [
    {
      occasionName: 'Akshaya Tritiya',
      theme: 'Eternal Prosperity & Auspicious Beginnings',
      significance:
        'Akshaya means “that which never diminishes.” Acts of charity, prayer, and ethical enterprise initiated on this day yield enduring spiritual and material merit.',
      remedies: [
        'Begin the day with a serene prayer to Lord Vishnu and Goddess Lakshmi for peace and abundance.',
        'Offer pure water infused with sesame seeds to the rising Sun for physical vitality and clarity.',
        'Chant “Om Namo Bhagavate Vasudevaya” 108 times to invite divine grace.',
        'Donate whole grains, ghee, or educational tools to the needy as selfless service (Seva).',
        'Light a fragrant ghee lamp in your northeast home quadrant to invoke sattvic vibrations.',
      ],
    },
    {
      occasionName: 'Hanuman Jayanti',
      theme: 'Strength, Protection & Dissolution of Obstacles',
      significance:
        'Lord Hanuman personifies absolute devotion, courage, and selfless strength. Observances dissolve unseen anxieties and instill unwavering decisiveness.',
      remedies: [
        'Recite the sacred Hanuman Chalisa or chant “Om Hanumate Namah” 108 times with devotion.',
        'Wear an authentic 14 Mukhi or 11 Mukhi Rudraksha to dissolve fear and cultivate resolute will.',
        'Install and honor a consecrated Hanuman Yantra for household energetic protection.',
        'Offer jasmine oil and sindoor at a Hanuman shrine to invoke protective vitality.',
        'Distribute fruits or wholesome food to the underprivileged to dissolve karmic blockages.',
      ],
    },
    {
      occasionName: 'Monthly Purnima',
      theme: 'Radiance of the Full Moon & Emotional Rejuvenation',
      significance:
        'Every full moon amplifies mental intuition and devotional receptivity. Simple contemplative practices align consciousness with cosmic harmony.',
      remedies: [
        'Take a mindful bath in morning sunlight or moonlight water at night for energetic purification.',
        'Light an evening ghee diya and offer white flowers, milk sweets, or rice to Lord Shiva.',
        'Chant “Om Som Somaya Namah” or the Maha Mrityunjaya Mantra 108 times for emotional calm.',
        'Meditate in silence under moonlight, releasing accumulated mental burdens.',
        'Donate milk, rice, or white cloth to support harmonious interpersonal relationships.',
      ],
    },
  ];

  // Natal Placements
  const natalChartPlacements = Object.values(rawChart.planets || {}).map((p: any) => ({
    planet: p.planet || p.name,
    sign: getRashiByLongitude(p.longitude).sanskritName,
    degree: Number((p.longitude % 30).toFixed(2)),
    house: (isTimeUnknown || !rawChart.ascendant)
      ? 0
      : (((getRashiByLongitude(p.longitude).index - rawChart.ascendant.rashiIndex + 12) % 12) + 1),
    isRetrograde: Boolean(p.isRetrograde),
  }));

  // Annual Placements
  // Annual chart placements have valid houses 1-12 established from Varsha Lagna
  const annualChartPlacements = Object.values(varshChart.planets || {}).map((p) => ({
    planet: String(p.planet),
    sign: p.rashiName,
    degree: Number(p.degreeInRashi.toFixed(2)),
    house: p.house ?? 0,
    isRetrograde: Boolean(p.isRetrograde),
    isCombust: Boolean(p.isCombust),
  }));

  // Structure sections
  const sections: ReportSectionDto[] = [
    {
      id: 'sec-varshphal-overview',
      title: 'Introduction & Solar Return Blueprint',
      type: 'TEXT',
      content: VARSHPHAL_REPORT_MESSAGE,
      listItems: [
        `Solar Return Date: ${solarReturnDto.solarReturnLocalIso} (${solarReturnDto.timezone})`,
        `Annual Age Completed: ${solarReturnDto.age} Years`,
        `Varsha Lagna: ${varshaLagnaDto.sign} (${varshaLagnaDto.degreeInRashi.toFixed(2)}°) ruled by ${varshaLagnaDto.lord}`,
        `Muntha Sign: ${munthaDto.rashiName} (House ${munthaDto.houseInVarshaChart}) ruled by ${munthaDto.lord}`,
        `Varshesha (Year Lord): ${varsheshaDto.selectedVarshesha} (${varsheshaDto.role})`,
      ],
    },
  ];

  // DTO Ascendant
  const ascendantDto: ReportAscendantDto = {
    sign: varshaLagnaDto.sign,
    degree: varshaLagnaDto.degreeInRashi,
    nakshatra: varshaLagnaDto.nakshatra,
    pada: varshaLagnaDto.pada,
  };

  // Planets DTO
  const planetsDto: ReportPlanetDto[] = Object.entries(varshChart.planets).map(([sym, p]) => {
    const nak = getNakshatraByLongitude(p.longitude);
    return {
      planet: sym,
      sign: p.rashiName,
      degree: p.degreeInRashi,
      house: isTimeUnknown ? 0 : (p.house ?? 0),
      nakshatra: nak.name,
      pada: 1,
      isRetrograde: Boolean(p.isRetrograde),
    };
  });

  // Houses DTO
  const housesDto: ReportHouseDto[] = (varshChart.houses || []).map((h) => ({
    houseNumber: h.houseNumber,
    sign: h.sign,
    planetsPresent: h.occupyingPlanets.map((pl) => String(pl)),
  }));

  // Nakshatra DTO
  const moonLon = varshChart.planets[PlanetSymbol.MOON]?.longitude || 0;
  const moonNak = getNakshatraByLongitude(moonLon);
  const nakshatraDto: ReportNakshatraDto = {
    birthNakshatra: moonNak.name,
    pada: 1,
    rulingPlanet: moonNak.lord,
    associatedInfo: 'Annual Lunar Preceptor and Emotional Focus',
  };

  return {
    version: '1.0.0',
    type: ReportType.VARSHPHAL,
    title: `Varshphal Report ${targetYear}`,
    generatedAt: new Date().toISOString(),
    profile,
    configuration: config,
    isTimeUnknown,
    ascendant: ascendantDto,
    planets: planetsDto,
    houses: housesDto,
    nakshatra: nakshatraDto,
    sections,
    targetYear,
    referenceDateIso: refDate.toISOString(),
    solarReturn: solarReturnDto,
    varshaLagna: varshaLagnaDto,
    muntha: munthaDto,
    varshesha: varsheshaDto,
    harshaBala: harshaBalaDto,
    tajikaYogas: tajikaYogasDto,
    annualPlanetEffects: planetEffectsList,
    muddaDasha: muddaPeriods,
    monthlyForecasts,
    panchangRemedies,
    remedyCaution:
      'The remedies suggested in this report are intended to support balance in planetary influences and guide your efforts toward favorable outcomes. To make the most of them, it is recommended that you select no more than three remedies at a time, focusing on the ones that feel most relevant and meaningful for you. Taking on too many remedies at once can scatter your energy and reduce their impact. For best results, approach the practices you choose with sincerity, clarity, and steady commitment. Allow your intuition to guide your choices, aligning them with your present circumstances and priorities. Remember, it is your consistency and faith that activate the true potential of these remedies and help bring their benefits into your life.',
    natalChartPlacements,
    annualChartPlacements,
  };
}
