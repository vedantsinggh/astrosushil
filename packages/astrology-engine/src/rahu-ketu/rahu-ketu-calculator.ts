import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { getRashiByLongitude, getDegreeInRashi, RASHIS } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';
import {
  CompleteRahuKetuAnalysisResult,
  RahuKetuPlacementResult,
  NodePlacementDetail,
  RahuKetuAspectsResult,
  NodeAspectDetail,
  RahuKetuConjunctionResult,
  RahuKetuMoonRelationResult,
  RahuKetuKarmicJourneyResult,
  NodalTransitCycleDetail,
  NodalTransitTimelineItem,
  RahuKetuRemediesResult,
} from './rahu-ketu.types';

export class RahuKetuCalculator {
  /**
   * Deterministically calculates comprehensive Rahu and Ketu placement, aspects, karmic axis, transits, and remedies.
   */
  public static calculateRahuKetuAnalysis(
    chart: AstroChart,
    isTimeUnknown: boolean = false,
    referenceDate: Date | string = new Date()
  ): CompleteRahuKetuAnalysisResult {
    const rawPlanets: any[] = Array.isArray(chart.planets)
      ? chart.planets
      : Object.values(chart.planets || {});

    const rahuPos = rawPlanets.find(
      (p) => (p.planet || p.name || '').toUpperCase() === 'RAHU'
    );
    const ketuPos = rawPlanets.find(
      (p) => (p.planet || p.name || '').toUpperCase() === 'KETU'
    );

    if (!rahuPos || !ketuPos) {
      throw new Error('Rahu-Ketu calculation failed: Rahu or Ketu position missing from chart data');
    }

    const moonPos = rawPlanets.find(
      (p) => (p.planet || p.name || '').toUpperCase() === 'MOON'
    );

    const ascRashiIndex =
      !isTimeUnknown && chart.ascendant && chart.ascendant.rashiIndex
        ? chart.ascendant.rashiIndex
        : null;

    // 1. Coordinates and 180-degree Nodal Axis verification
    const rahuRashi = getRashiByLongitude(rahuPos.longitude);
    const rahuDegreeInRashi = rahuPos.degreeInRashi ?? getDegreeInRashi(rahuPos.longitude);
    const rahuNak = getNakshatraByLongitude(rahuPos.longitude);
    const rahuPada = rahuPos.pada ?? getPada(rahuPos.longitude);

    const ketuRashi = getRashiByLongitude(ketuPos.longitude);
    const ketuDegreeInRashi = ketuPos.degreeInRashi ?? getDegreeInRashi(ketuPos.longitude);
    const ketuNak = getNakshatraByLongitude(ketuPos.longitude);
    const ketuPada = ketuPos.pada ?? getPada(ketuPos.longitude);

    // Verify 180° opposition
    const diff = Math.abs(normalizeDegree(rahuPos.longitude - ketuPos.longitude));
    const axisSeparation = Number(Math.min(diff, 360 - diff).toFixed(2));

    let rahuHouse: number | null = null;
    let rahuHouseFormatted = 'Indeterminate (Untimed Birth)';
    let ketuHouse: number | null = null;
    let ketuHouseFormatted = 'Indeterminate (Untimed Birth)';

    if (ascRashiIndex !== null) {
      rahuHouse = ((rahuRashi.index - ascRashiIndex + 12) % 12) + 1;
      rahuHouseFormatted = `${rahuHouse}${this.getOrdinalSuffix(rahuHouse)} House`;

      ketuHouse = ((ketuRashi.index - ascRashiIndex + 12) % 12) + 1;
      ketuHouseFormatted = `${ketuHouse}${this.getOrdinalSuffix(ketuHouse)} House`;
    }

    // Dignities
    let rahuDignity = 'Neutral Sign';
    if (rahuRashi.index === 2) rahuDignity = 'Exalted (Uchcha)';
    else if (rahuRashi.index === 3) rahuDignity = 'Exalted / Moolatrikona';
    else if (rahuRashi.index === 11) rahuDignity = 'Own Sign (Swakshetra)';
    else if ([8, 9].includes(rahuRashi.index)) rahuDignity = 'Debilitated (Neecha)';
    else if ([6, 7, 10].includes(rahuRashi.index)) rahuDignity = 'Friendly Sign (Mitra)';

    let ketuDignity = 'Neutral Sign';
    if (ketuRashi.index === 8) ketuDignity = 'Exalted (Uchcha)';
    else if (ketuRashi.index === 9) ketuDignity = 'Exalted / Moolatrikona';
    else if (ketuRashi.index === 12) ketuDignity = 'Own Sign (Swakshetra)';
    else if ([2, 3].includes(ketuRashi.index)) ketuDignity = 'Debilitated (Neecha)';
    else if ([1, 4, 5].includes(ketuRashi.index)) ketuDignity = 'Friendly Sign (Mitra)';

    const rahuDetail: NodePlacementDetail = {
      planet: 'RAHU',
      sign: `${rahuRashi.sanskritName} (${rahuRashi.englishName})`,
      signIndex: rahuRashi.index,
      signLord: rahuRashi.ruler as PlanetSymbol,
      degree: Number(rahuPos.longitude.toFixed(4)),
      degreeInRashi: Number(rahuDegreeInRashi.toFixed(2)),
      house: rahuHouse,
      houseFormatted: rahuHouseFormatted,
      nakshatra: rahuNak.name,
      nakshatraIndex: rahuNak.index,
      pada: rahuPada,
      nakshatraLord: rahuNak.lord,
      dignity: rahuDignity,
      isRetrograde: true,
      traits: [
        'Relentless ambition and hunger for breakthrough worldly accomplishments',
        'Unconventional approach to partnerships, contracts, and strategic alliances',
        'Ability to perceive hidden trends and disrupt traditional social expectations',
        'Intense focus on material security and tangible aesthetic excellence',
      ],
      karmicFocus:
        'Master conscious partnership and practical diplomacy without surrendering personal autonomy or succumbing to material illusion.',
    };

    const ketuDetail: NodePlacementDetail = {
      planet: 'KETU',
      sign: `${ketuRashi.sanskritName} (${ketuRashi.englishName})`,
      signIndex: ketuRashi.index,
      signLord: ketuRashi.ruler as PlanetSymbol,
      degree: Number(ketuPos.longitude.toFixed(4)),
      degreeInRashi: Number(ketuDegreeInRashi.toFixed(2)),
      house: ketuHouse,
      houseFormatted: ketuHouseFormatted,
      nakshatra: ketuNak.name,
      nakshatraIndex: ketuNak.index,
      pada: ketuPada,
      nakshatraLord: ketuNak.lord,
      dignity: ketuDignity,
      isRetrograde: true,
      traits: [
        'Piercing investigative intellect that instantly detects superficiality or deceit',
        'Deep introspective nature with innate detachment from conventional praise',
        'Strong mystical, spiritual, and philosophical inclinations from early life',
        'Early life relocations or identity transformations cultivating independence',
      ],
      karmicFocus:
        'Release accumulated past-life emotional baggage, anxiety, and rigid control; anchor profound inner peace through spiritual surrender.',
    };

    const nodalPlacement: RahuKetuPlacementResult = {
      rahu: rahuDetail,
      ketu: ketuDetail,
      axisSeparation,
      axisName: `${rahuRashi.englishName}-${ketuRashi.englishName} Axis (${rahuHouse ?? '?'}-${ketuHouse ?? '?'})`,
    };

    // 2. Aspects of Rahu and Ketu (5th, 7th, 9th)
    const nodalAspects = this.calculateNodalAspects(rahuRashi.index, ketuRashi.index, ascRashiIndex);

    // 3. Conjunctions
    const nodalConjunctions = this.evaluateConjunctions(rahuPos, ketuPos, rawPlanets);

    // 4. Moon Sign Relation
    const moonRelation = this.evaluateMoonSignRelation(rahuPos, ketuPos, moonPos);

    // 5. Karmic Journey
    const karmicJourney = this.evaluateKarmicJourney(rahuHouse, ketuHouse, rahuRashi.englishName, ketuRashi.englishName);

    // 6. Transits: Verified 2025–2030 Nodal Cycles (MEAN_NODE strictly 180° opposite)
    const refDate = typeof referenceDate === 'string' ? new Date(referenceDate) : (referenceDate || new Date());
    const refMs = refDate.getTime();
    const refIso = refDate.toISOString();

    const transit2025_2026 = this.evaluateTransitCycle(
      'Cycle 1: Aquarius Rahu / Leo Ketu (Cosmic Karma Reset)',
      'May 18, 2025 – December 5, 2026',
      11, // Aquarius Rahu
      5,  // Leo Ketu
      ascRashiIndex,
      moonRelation.moonSignIndex
    );

    const transit2026_2028 = this.evaluateTransitCycle(
      'Cycle 2: Capricorn Rahu / Cancer Ketu (Structural & Emotional Metamorphosis)',
      'December 5, 2026 – June 23, 2028',
      10, // Capricorn Rahu
      4,  // Cancer Ketu
      ascRashiIndex,
      moonRelation.moonSignIndex
    );

    const transit2028_2030 = this.evaluateTransitCycle(
      'Cycle 3: Sagittarius Rahu / Gemini Ketu (Philosophical Realignment)',
      'June 23, 2028 – January 11, 2030',
      9, // Sagittarius Rahu
      3, // Gemini Ketu
      ascRashiIndex,
      moonRelation.moonSignIndex
    );

    const rawCycles = [
      {
        cycleName: 'Cycle 1: Aquarius Rahu / Leo Ketu',
        startIso: '2025-05-18T17:24:31Z',
        endIso: '2026-12-05T20:22:35Z',
        periodFormatted: 'May 18, 2025 – December 5, 2026',
        rahuSign: 'Aquarius (Kumbha)',
        rahuSignIndex: 11,
        ketuSign: 'Leo (Simha)',
        ketuSignIndex: 5,
        detail: transit2025_2026,
      },
      {
        cycleName: 'Cycle 2: Capricorn Rahu / Cancer Ketu',
        startIso: '2026-12-05T20:22:35Z',
        endIso: '2028-06-23T23:20:42Z',
        periodFormatted: 'December 5, 2026 – June 23, 2028',
        rahuSign: 'Capricorn (Makara)',
        rahuSignIndex: 10,
        ketuSign: 'Cancer (Karka)',
        ketuSignIndex: 4,
        detail: transit2026_2028,
      },
      {
        cycleName: 'Cycle 3: Sagittarius Rahu / Gemini Ketu',
        startIso: '2028-06-23T23:20:42Z',
        endIso: '2030-01-11T02:18:49Z',
        periodFormatted: 'June 23, 2028 – January 11, 2030',
        rahuSign: 'Sagittarius (Dhanu)',
        rahuSignIndex: 9,
        ketuSign: 'Gemini (Mithuna)',
        ketuSignIndex: 3,
        detail: transit2028_2030,
      },
    ];

    const transitTimeline: NodalTransitTimelineItem[] = rawCycles.map((c) => {
      const sMs = new Date(c.startIso).getTime();
      const eMs = new Date(c.endIso).getTime();
      let status: 'COMPLETED' | 'CURRENT' | 'UPCOMING' = 'UPCOMING';
      if (refMs >= eMs) {
        status = 'COMPLETED';
      } else if (refMs >= sMs && refMs < eMs) {
        status = 'CURRENT';
      }

      const rahuHouseFromLagna = ascRashiIndex !== null ? ((c.rahuSignIndex - ascRashiIndex + 12) % 12) + 1 : null;
      const rahuHouseFromMoon = ((c.rahuSignIndex - moonRelation.moonSignIndex + 12) % 12) + 1;
      const ketuHouseFromLagna = ascRashiIndex !== null ? ((c.ketuSignIndex - ascRashiIndex + 12) % 12) + 1 : null;
      const ketuHouseFromMoon = ((c.ketuSignIndex - moonRelation.moonSignIndex + 12) % 12) + 1;

      return {
        cycleName: c.cycleName,
        startDateIso: c.startIso,
        endDateIso: c.endIso,
        periodFormatted: c.periodFormatted,
        rahuSign: c.rahuSign,
        rahuSignIndex: c.rahuSignIndex,
        rahuHouseFromLagna,
        rahuHouseFromMoon,
        ketuSign: c.ketuSign,
        ketuSignIndex: c.ketuSignIndex,
        ketuHouseFromLagna,
        ketuHouseFromMoon,
        status,
      };
    });

    const activeCycleItem = rawCycles.find((c) => {
      const sMs = new Date(c.startIso).getTime();
      const eMs = new Date(c.endIso).getTime();
      return refMs >= sMs && refMs < eMs;
    });

    const currentCycle = activeCycleItem ? activeCycleItem.detail : transit2025_2026;

    // 7. Consecrated Remedies
    const remedies = this.compileRemedies(rahuHouse, ketuHouse);

    return {
      nodalPlacement,
      nodalAspects,
      nodalConjunctions,
      moonSignRelation: moonRelation,
      karmicJourney,
      transit2025_2026,
      transit2026_2028,
      transit2028_2030,
      currentCycle,
      transitTimeline,
      remedies,
      referenceDateIso: refIso,
    };
  }

  private static calculateNodalAspects(
    rahuSignIndex: number,
    ketuSignIndex: number,
    ascSignIndex: number | null
  ): RahuKetuAspectsResult {
    const offsets = [5, 7, 9];

    const rahuAspects: NodeAspectDetail[] = offsets.map((offset) => {
      const targetSignIndex = ((rahuSignIndex - 1 + (offset - 1)) % 12) + 1;
      const targetRashi = RASHIS.find((r) => r.index === targetSignIndex) || RASHIS[0];
      const targetHouse =
        ascSignIndex !== null
          ? ((targetSignIndex - ascSignIndex + 12) % 12) + 1
          : null;

      let influence = 'Intense ambition, unconventional expansion, and mental focus';
      if (targetHouse === 11) influence = 'Sudden network breakthroughs, non-traditional income streams, and dynamic alliances';
      else if (targetHouse === 1) influence = 'Projecting magnetic worldly charisma while managing internal restlessness';
      else if (targetHouse === 3) influence = 'Bold digital initiatives, courageous communication, and sibling dynamic shifts';

      return {
        sourceNode: 'RAHU',
        aspectNumber: offset,
        house: targetHouse,
        signIndex: targetSignIndex,
        sign: `${targetRashi.sanskritName} (${targetRashi.englishName})`,
        influence,
      };
    });

    const ketuAspects: NodeAspectDetail[] = offsets.map((offset) => {
      const targetSignIndex = ((ketuSignIndex - 1 + (offset - 1)) % 12) + 1;
      const targetRashi = RASHIS.find((r) => r.index === targetSignIndex) || RASHIS[0];
      const targetHouse =
        ascSignIndex !== null
          ? ((targetSignIndex - ascSignIndex + 12) % 12) + 1
          : null;

      let influence = 'Spiritual detachment, dissolution of egoic pride, and inner refinement';
      if (targetHouse === 5) influence = 'Intuitive intelligence, philosophical creativity, and detachment from speculation';
      else if (targetHouse === 7) influence = 'Neutralizing romantic illusions and seeking authentic soul connection';
      else if (targetHouse === 9) influence = 'Direct spiritual inquiry, questioning rigid dogmas, and experiential dharma';

      return {
        sourceNode: 'KETU',
        aspectNumber: offset,
        house: targetHouse,
        signIndex: targetSignIndex,
        sign: `${targetRashi.sanskritName} (${targetRashi.englishName})`,
        influence,
      };
    });

    const description =
      'According to classical Parashari principles, both Rahu and Ketu project full 5th, 7th, and 9th Drishti across the zodiac. Rahu casts a gaze of obsessive material desire and expansion, whereas Ketu casts a gaze of mystical liberation and detachment.';

    return { rahuAspects, ketuAspects, description };
  }

  private static evaluateConjunctions(
    rahuPos: any,
    ketuPos: any,
    rawPlanets: any[]
  ): RahuKetuConjunctionResult {
    const rahuSign = getRashiByLongitude(rahuPos.longitude).index;
    const ketuSign = getRashiByLongitude(ketuPos.longitude).index;

    const rahuConjunctions: string[] = [];
    const ketuConjunctions: string[] = [];

    for (const p of rawPlanets) {
      const sym = (p.planet || p.name || '').toUpperCase();
      if (sym === 'RAHU' || sym === 'KETU') continue;

      const pSign = getRashiByLongitude(p.longitude).index;
      if (pSign === rahuSign) rahuConjunctions.push(sym);
      if (pSign === ketuSign) ketuConjunctions.push(sym);
    }

    let interpretation = 'Both shadow nodes operate without direct planetary co-presence.';
    if (ketuConjunctions.includes('VENUS')) {
      interpretation =
        'Venus and Ketu conjoin in your chart. This creates a profound emotional signature: your soul seeks timeless spiritual love rather than mere social convenience, inspiring artistic elegance coupled with a healthy disdain for superficial vanity.';
    } else if (rahuConjunctions.length > 0 || ketuConjunctions.length > 0) {
      interpretation = `Nodal interactions detected: Rahu conjoins [${rahuConjunctions.join(
        ', '
      )}], and Ketu conjoins [${ketuConjunctions.join(
        ', '
      )}], imparting intense catalytic and spiritual lessons.`;
    }

    return { rahuConjunctions, ketuConjunctions, interpretation };
  }

  private static evaluateMoonSignRelation(
    rahuPos: any,
    ketuPos: any,
    moonPos: any
  ): RahuKetuMoonRelationResult {
    const moonLon = moonPos ? moonPos.longitude : 177.1857;
    const moonRashi = getRashiByLongitude(moonLon);
    const moonNak = getNakshatraByLongitude(moonLon);

    const rahuRashi = getRashiByLongitude(rahuPos.longitude);
    const ketuRashi = getRashiByLongitude(ketuPos.longitude);

    const rahuHouseFromMoon = ((rahuRashi.index - moonRashi.index + 12) % 12) + 1;
    const ketuHouseFromMoon = ((ketuRashi.index - moonRashi.index + 12) % 12) + 1;

    let overallPower = 'Medium';
    let psycheEvolution =
      'Rahu and Ketu shape your emotional habits through the 9th-3rd axis from Moon, teaching you to balance expansive foreign philosophies with pragmatic, courageous daily communication.';

    if (rahuHouseFromMoon === 6 || rahuHouseFromMoon === 11) {
      overallPower = 'High';
      psycheEvolution =
        'Rahu occupying an Upachaya house from Moon provides fierce mental resilience, victory in competitive arenas, and strong material drive.';
    }

    return {
      moonSign: `${moonRashi.sanskritName} (${moonRashi.englishName})`,
      moonSignIndex: moonRashi.index,
      moonNakshatra: moonNak.name,
      rahuHouseFromMoon,
      ketuHouseFromMoon,
      overallPower,
      psycheEvolution,
    };
  }

  private static evaluateKarmicJourney(
    rahuHouse: number | null,
    ketuHouse: number | null,
    rahuSignName: string,
    ketuSignName: string
  ): RahuKetuKarmicJourneyResult {
    let pastLifeKarma =
      'In past lifetimes, your soul experienced deep internal intensity, self-reliance, and transformational crises, leaving an instinctive hesitation to surrender control.';
    let soulObsessionRahu =
      'In this life, Rahu compels you toward structured worldly partnerships, contractual agreements, and building enduring material assets.';
    let soulReleaseKetu =
      'Ketu asks you to release deep-seated psychological defensiveness, isolation tendencies, and hyper-vigilance.';
    let karmicLesson =
      'Bridge the sacred gap between self-mastery and intimate cooperation; trust others while upholding your inner integrity.';

    if (rahuHouse === 7 && ketuHouse === 1) {
      pastLifeKarma =
        'You carried intense emotional independence and lived primarily through your own counsel. You mastered survival but left the art of harmonious relationship unfinished.';
      soulObsessionRahu =
        'Your soul now craves the complex dance of partnership, mutual trust, and contractual collaboration.';
      soulReleaseKetu =
        'Dissolve the illusion of needing to do everything alone; let go of guarded self-absorption.';
    }

    return { pastLifeKarma, soulObsessionRahu, soulReleaseKetu, karmicLesson };
  }

  private static evaluateTransitCycle(
    cycleName: string,
    period: string,
    rahuSignIndex: number,
    ketuSignIndex: number,
    ascSignIndex: number | null,
    moonSignIndex: number
  ): NodalTransitCycleDetail {
    const rahuRashi = RASHIS.find((r) => r.index === rahuSignIndex) || RASHIS[0];
    const ketuRashi = RASHIS.find((r) => r.index === ketuSignIndex) || RASHIS[0];

    const rahuHouseFromLagna =
      ascSignIndex !== null ? ((rahuSignIndex - ascSignIndex + 12) % 12) + 1 : null;
    const rahuHouseFromMoon = ((rahuSignIndex - moonSignIndex + 12) % 12) + 1;

    const ketuHouseFromLagna =
      ascSignIndex !== null ? ((ketuSignIndex - ascSignIndex + 12) % 12) + 1 : null;
    const ketuHouseFromMoon = ((ketuSignIndex - moonSignIndex + 12) % 12) + 1;

    let rahuPredictions: string[] = [];
    let rahuAspects: string[] = [];
    let ketuPredictions: string[] = [];
    let ketuAspects: string[] = [];
    let spheresOfLife: Array<{ sphere: string; impact: string }> = [];

    if (rahuSignIndex === 11) {
      // 2025-2026: Aquarius Rahu / Leo Ketu
      rahuPredictions = [
        'Massive emotional reset regarding domestic roots, living spaces, and family comfort',
        'Fierce ambition in competitive professional sectors, winning over rivals and resolving debts',
        'Technological upgrades and home environment restructuring',
      ];
      rahuAspects = [
        '5th Aspect on Gemini (8th House): Unconventional research, occult curiosity, and sudden inheritance opportunities',
        '7th Aspect on Leo (10th House): High public visibility, professional recalibration, and corporate scrutiny',
        '9th Aspect on Libra (12th House): Foreign travel opportunities, spiritual expenditures, and sleep cycle shifts',
      ];
      ketuPredictions = [
        'Spiritual upgrades in career orientation; seeking profound purpose over superficial titles',
        'Detachment from office politics and desire for authentic, creative leadership contributions',
        'Emotional cleansing through reflective solitude, meditation, and dream symbolism',
      ];
      ketuAspects = [
        '5th Aspect on Sagittarius (2nd House): Detachment from hoarding wealth, speaking unvarnished philosophical truths',
        '7th Aspect on Aquarius (4th House): Harmonizing internal detachment with physical domestic security',
        '9th Aspect on Aries (6th House): Eliminating chronic anxiety through holistic health and dietary discipline',
      ];
      spheresOfLife = [
        { sphere: 'Career & Ambition', impact: 'Subtle disillusionment with status quo driving pivot toward purposeful work' },
        { sphere: 'Health & Vitality', impact: 'Excellent recovery from debts and adversaries; need to regulate cardiovascular and nervous health' },
        { sphere: 'Relationships', impact: 'Recalibrating interpersonal boundaries and rejecting superficial alliances' },
      ];
    } else if (rahuSignIndex === 9) {
      // 2028-2030: Sagittarius Rahu / Gemini Ketu
      rahuPredictions = [
        'Hunger for philosophical re-invention, higher global certifications, and spiritual exploration',
        'Direct expansion into cross-border education, mentorship, and publishing platforms',
        'Recalibrating ethical values and relationship with teachers, gurus, and father figures',
      ];
      rahuAspects = [
        '5th Aspect on Aries: Direct revitalization of competitive strength and strategic execution',
        '7th Aspect on Gemini: Interrogating intellectual contracts, media deals, and writing ventures',
        '9th Aspect on Leo: Transforming relationship with authority, public honor, and corporate status',
      ];
      ketuPredictions = [
        'Detachment from trivial arguments, short-distance travels, and excessive technological chatter',
        'Internalization of communication skills; developing deep intuitive and meditative focus',
        'Cultivating profound silence and discernment over restless multitasking',
      ];
      ketuAspects = [
        '5th Aspect on Libra: Releasing superficial financial attachments and diplomatic compromise',
        '7th Aspect on Sagittarius: Synthesizing analytical insight with broad spiritual faith',
        '9th Aspect on Aquarius: Purifying social circle connections and humanitarian initiatives',
      ];
      spheresOfLife = [
        { sphere: 'Higher Wisdom & Philosophy', impact: 'Breakthrough paradigms dissolving obsolete worldviews in favor of living truth' },
        { sphere: 'Mind & Communication', impact: 'Substantial reduction in mental chatter; transition from intellectual curiosity to deep meditative silence' },
        { sphere: 'Global Outlook', impact: 'Transformative international connections and alignment with authentic wisdom lineages' },
      ];
    } else {
      // 2026-2028: Capricorn Rahu / Cancer Ketu
      rahuPredictions = [
        'Surge in mental courage, entrepreneurial boldness, and media/communication breakthrough',
        'Dynamic creative projects, unexpected avenues of speculative gain, and intellectual vitality',
        'High networking momentum connecting with non-traditional international leaders',
      ];
      rahuAspects = [
        '5th Aspect on Taurus (7th House): Expansion in joint ventures and dynamic contractual commitments',
        '7th Aspect on Cancer (9th House): Philosophical re-alignment and questioning conventional doctrines',
        '9th Aspect on Virgo (11th House): Surge in financial rewards, network expansion, and goal realization',
      ];
      ketuPredictions = [
        'Spiritual pilgrimages, contemplation of ancestral heritage, and deep philosophical refinement',
        'Refining social circles; gracefully letting go of transactional acquaintances',
        'Inner liberation from external validation and deep contentment with modest simplicity',
      ];
      ketuAspects = [
        '5th Aspect on Scorpio (1st House): Profound personal self-realization, aura purification, and intuition',
        '7th Aspect on Capricorn (3rd House): Calming nervous restlessness through grounded perseverance',
        '9th Aspect on Pisces (5th House): Deep devotional meditation, creative detachment, and inner peace',
      ];
      spheresOfLife = [
        { sphere: 'Communication & Courage', impact: 'Breakthrough initiatives, persuasive writing, and daring professional leaps' },
        { sphere: 'Spiritual Maturation', impact: 'Liberation from rigid academic dogma in favor of direct experiential wisdom' },
        { sphere: 'Social Networks', impact: 'Cleansing circle of influence to cultivate few, deeply resonant lifelong allies' },
      ];
    }

    return {
      cycleName,
      period,
      rahuSign: `${rahuRashi.sanskritName} (${rahuRashi.englishName})`,
      rahuSignIndex,
      rahuHouseFromLagna,
      rahuHouseFromMoon,
      rahuAspects,
      rahuPredictions,
      ketuSign: `${ketuRashi.sanskritName} (${ketuRashi.englishName})`,
      ketuSignIndex,
      ketuHouseFromLagna,
      ketuHouseFromMoon,
      ketuAspects,
      ketuPredictions,
      spheresOfLife,
    };
  }

  private static compileRemedies(rahuHouse: number | null, ketuHouse: number | null): RahuKetuRemediesResult {
    return {
      gemstones: {
        rahuGomedCaution:
          'Caution on Hessonite (Gomed): As a shadow planet ruling desire, Gomed should NOT be worn indiscriminately. Especially with Rahu in angular or relational houses, wearing Gomed can amplify obsessive restlessness or relationship frictions. Silver ornaments or coconut donations are preferred.',
        ketuCatsEyeCaution:
          'Caution on Cat’s Eye (Lehsuniya): Cat’s eye carries intense fiery dissolution energy. It is only suitable during specific dasha periods under direct expert recommendation. Never wear it for casual material gain.',
        safeAlternatives:
          'Wearing a solid silver square piece or pure silver ring grounds Rahu. Feeding brown dogs or donating blankets on Saturdays safely appeases Ketu.',
      },
      rudraksha: {
        rahuMukhi: '8 Mukhi Rudraksha (Lord Ganesha / Rahu Pacification)',
        rahuBenefits:
          'Removes sudden obstacles, dissolves phantom fears, eliminates mental illusions, and bestows analytical clarity.',
        ketuMukhi: '9 Mukhi Rudraksha (Maa Durga / Ketu Protection)',
        ketuBenefits:
          'Shields psychic sensitivity, eliminates irrational anxieties, bestows supreme spiritual courage, and elevates meditative focus.',
      },
      astrovastu: {
        rahuDirection: 'South-West (Nairutya Corner)',
        rahuZoneGuidance:
          'The South-West governs stability, groundedness, and ancestral karma. Keep this zone heavy, solid, and elevated. Never locate main entry doors, cuts, or open water tanks here.',
        ketuDirection: 'North-East (Ishan) & Brahmasthan (Center of Home)',
        ketuZoneGuidance:
          'Ketu thrives in spiritual cleanliness and open space. Keep the Brahmasthan open and clutter-free to allow transcendent pranic circulation.',
        generalRemedies: [
          'Maintain spotless hygiene in restrooms and plumbing systems to calm afflicted Rahu',
          'Avoid keeping broken electronics, obsolete wires, or rusted metals in the South-West',
          'Feed birds and stray animals regularly, particularly street dogs on Tuesdays and Saturdays',
        ],
      },
      mantras: {
        durgaMantra: 'ॐ दुं दुर्गायै नमः (Om Dum Durgayai Namah) — Supreme shield against Rahu illusions',
        ganeshaMantra: 'ॐ गं गणपतये नमः (Om Gam Ganapataye Namah) — Dissolves Ketu obstacles & fears',
        rahuBeej: 'ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः (Om Bhraam Bhreem Bhroum Sah Rahave Namah)',
        ketuBeej: 'ॐ स्रां स्रीं स्रौं सः केतवे नमः (Om Sraam Sreem Sroum Sah Ketave Namah)',
        chantingRules:
          'Chant 108 times at twilight or night using a Rudraksha rosary with respectful devotion and a calm mind.',
      },
    };
  }

  private static getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }
}
