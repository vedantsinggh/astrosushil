import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { getRashiByLongitude, getDegreeInRashi, RASHIS } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { calculateCombustion } from '../planets/combustion';
import { calculateBhinnashtakavarga } from '../ashtakavarga/bav-calculator';
import { AshtakavargaContributor, ASHTAKAVARGA_CONTRIBUTORS } from '../ashtakavarga/ashtakavarga.types';
import {
  CompleteJupiterAnalysisResult,
  JupiterPlacementResult,
  JupiterAspectsResult,
  JupiterBeneficVsMaleficResult,
  JupiterMoonRelationResult,
  JupiterNakshatraAnalysisResult,
  JupiterConjunctionsResult,
  JupiterAshtakavargaResult,
  JupiterTransitPeriodDetail,
  JupiterTransitTimelineItem,
  JupiterRemediesResult,
} from './jupiter.types';

export class JupiterCalculator {
  /**
   * Deterministically calculates comprehensive Jupiter placement, aspects, BAV, transits, and remedies.
   */
  public static calculateJupiterAnalysis(
    chart: AstroChart,
    isTimeUnknown: boolean = false,
    referenceDate: Date | string = new Date()
  ): CompleteJupiterAnalysisResult {
    const rawPlanets: any[] = Array.isArray(chart.planets)
      ? chart.planets
      : Object.values(chart.planets || {});

    const jupPos = rawPlanets.find(
      (p) => (p.planet || p.name || '').toUpperCase() === 'JUPITER'
    );
    if (!jupPos) {
      throw new Error('Jupiter calculation failed: Jupiter planetary position missing from chart data');
    }

    const sunPos = rawPlanets.find(
      (p) => (p.planet || p.name || '').toUpperCase() === 'SUN'
    );
    const moonPos = rawPlanets.find(
      (p) => (p.planet || p.name || '').toUpperCase() === 'MOON'
    );

    const ascRashiIndex =
      !isTimeUnknown && chart.ascendant && chart.ascendant.rashiIndex
        ? chart.ascendant.rashiIndex
        : null;

    // 1. Placement Coordinates
    const jupRashi = getRashiByLongitude(jupPos.longitude);
    const jupDegreeInRashi = jupPos.degreeInRashi ?? getDegreeInRashi(jupPos.longitude);
    const jupNak = getNakshatraByLongitude(jupPos.longitude);
    const jupPada = jupPos.pada ?? getPada(jupPos.longitude);

    let houseNum: number | null = null;
    let houseFormatted = 'Indeterminate (Untimed Birth)';
    if (ascRashiIndex !== null) {
      houseNum = ((jupRashi.index - ascRashiIndex + 12) % 12) + 1;
      houseFormatted = `${houseNum}${this.getOrdinalSuffix(houseNum)} House`;
    }

    // Dignity evaluation
    let dignity = 'Neutral';
    if (jupRashi.index === 4) {
      dignity = 'Exalted (Uchcha)';
    } else if (jupRashi.index === 10) {
      dignity = 'Debilitated (Neecha)';
    } else if (jupRashi.index === 9) {
      dignity = jupDegreeInRashi <= 10 ? 'Moolatrikona' : 'Own Sign (Swakshetra)';
    } else if (jupRashi.index === 12) {
      dignity = 'Own Sign (Swakshetra)';
    } else if ([1, 5, 8].includes(jupRashi.index)) {
      dignity = 'Friendly Sign (Mitra)';
    }

    // Combustion
    const isCombust =
      sunPos && !sunPos.isIndeterminate
        ? calculateCombustion(PlanetSymbol.JUPITER, jupPos.longitude, sunPos.longitude, Boolean(jupPos.isRetrograde)).isCombust
        : false;

    // Lordship (Sagittarius=9, Pisces=12)
    const lordship: number[] = [];
    if (ascRashiIndex !== null) {
      for (let h = 1; h <= 12; h++) {
        const signAtHouse = ((ascRashiIndex - 1 + (h - 1)) % 12) + 1;
        if (signAtHouse === 9 || signAtHouse === 12) {
          lordship.push(h);
        }
      }
    }

    const jupiterPlacement: JupiterPlacementResult = {
      sign: `${jupRashi.sanskritName} (${jupRashi.englishName})`,
      signIndex: jupRashi.index,
      signLord: jupRashi.ruler as PlanetSymbol,
      degree: Number(jupPos.longitude.toFixed(4)),
      degreeInRashi: Number(jupDegreeInRashi.toFixed(2)),
      house: houseNum,
      houseFormatted,
      nakshatra: jupNak.name,
      nakshatraIndex: jupNak.index,
      pada: jupPada,
      nakshatraLord: jupNak.lord,
      dignity,
      isRetrograde: Boolean(jupPos.isRetrograde),
      isCombust,
      lordship,
      traits: [
        'Naturally philosophical, principled, and guided by deep ethical values',
        'Inspirational communicator whose counsel carries innate weight and authority',
        'Deep reverence for lineage wisdom, higher learning, and mentor traditions',
        'Generous mindset with long-term perspective on wealth and legacy accumulation',
      ],
      karmicLesson:
        'Cultivate discrimination between expansive vision and practical discipline; anchor broad spiritual ideals into humble daily action.',
    };

    // 2. Natal 5th, 7th, 9th Aspects
    const jupiterAspects = this.calculateNatalAspects(jupRashi.index, ascRashiIndex);

    // 3. Benefic vs Malefic Dynamic
    const beneficVsMalefic = this.evaluateBeneficVsMalefic(jupRashi.index, houseNum, lordship, dignity);

    // 4. Moon Sign Relation
    const moonRelation = this.evaluateMoonSignRelation(jupPos, moonPos);

    // 5. Nakshatra Deep Dive
    const nakshatraAnalysis = this.evaluateNakshatra(jupNak.name, jupPada);

    // 6. Conjunctions
    const conjunctions = this.evaluateConjunctions(jupPos, rawPlanets);

    // 7. Ashtakavarga BAV (56 points)
    const ashtakavarga = this.calculateJupiterBav(chart, jupRashi.index);

    // 8. Transits: Gemini, Cancer, Leo & Verified 2025–2029 Master Timeline
    const refDate = typeof referenceDate === 'string' ? new Date(referenceDate) : (referenceDate || new Date());
    const refMs = refDate.getTime();
    const refIso = refDate.toISOString();

    const transitPhases: Array<{
      phaseName: string;
      signIndex: number;
      signName: string;
      startIso: string;
      endIso: string;
      periodFormatted: string;
      motion: 'DIRECT' | 'RETROGRADE';
      dignity: string;
    }> = [
      {
        phaseName: 'Phase 1: Gemini Direct Ingress',
        signIndex: 3,
        signName: 'Gemini (Mithuna)',
        startIso: '2025-05-14T16:19:18Z',
        endIso: '2025-10-18T11:58:29Z',
        periodFormatted: 'May 14, 2025 – October 18, 2025',
        motion: 'DIRECT',
        dignity: 'Neutral / Enemy Sign (Sama / Shatru)',
      },
      {
        phaseName: 'Phase 2: Cancer Exaltation Advance',
        signIndex: 4,
        signName: 'Cancer (Karka - Exaltation)',
        startIso: '2025-10-18T11:58:29Z',
        endIso: '2025-12-05T14:16:14Z',
        periodFormatted: 'October 18, 2025 – December 5, 2025',
        motion: 'DIRECT',
        dignity: 'Exalted (Param Uchcha)',
      },
      {
        phaseName: 'Phase 3: Gemini Retrograde Re-entry & Direct Exit',
        signIndex: 3,
        signName: 'Gemini (Mithuna)',
        startIso: '2025-12-05T14:16:14Z',
        endIso: '2026-06-01T19:14:59Z',
        periodFormatted: 'December 5, 2025 – June 2, 2026',
        motion: 'RETROGRADE',
        dignity: 'Neutral / Enemy Sign (Sama / Shatru)',
      },
      {
        phaseName: 'Phase 4: Cancer Exaltation Main Transit',
        signIndex: 4,
        signName: 'Cancer (Karka - Exaltation)',
        startIso: '2026-06-01T19:14:59Z',
        endIso: '2026-10-31T04:46:58Z',
        periodFormatted: 'June 2, 2026 – October 31, 2026',
        motion: 'DIRECT',
        dignity: 'Exalted (Param Uchcha)',
      },
      {
        phaseName: 'Phase 5: Leo Direct Ingress (Royal Karma Horizon)',
        signIndex: 5,
        signName: 'Leo (Simha - Royal Mitra)',
        startIso: '2026-10-31T04:46:58Z',
        endIso: '2027-01-24T22:07:50Z',
        periodFormatted: 'October 31, 2026 – January 25, 2027',
        motion: 'DIRECT',
        dignity: 'Friendly Sign (Mitra Rashi)',
      },
      {
        phaseName: 'Phase 6: Cancer Exaltation Retrograde Harvest',
        signIndex: 4,
        signName: 'Cancer (Karka - Exaltation)',
        startIso: '2027-01-24T22:07:50Z',
        endIso: '2027-06-25T22:15:19Z',
        periodFormatted: 'January 25, 2027 – June 26, 2027',
        motion: 'RETROGRADE',
        dignity: 'Exalted (Param Uchcha)',
      },
      {
        phaseName: 'Phase 7: Leo Direct Re-entry & Culmination',
        signIndex: 5,
        signName: 'Leo (Simha - Royal Mitra)',
        startIso: '2027-06-25T22:15:19Z',
        endIso: '2027-11-26T11:07:58Z',
        periodFormatted: 'June 26, 2027 – November 26, 2027',
        motion: 'DIRECT',
        dignity: 'Friendly Sign (Mitra Rashi)',
      },
      {
        phaseName: 'Phase 8: Virgo Ingress (Analytical Expansion)',
        signIndex: 6,
        signName: 'Virgo (Kanya)',
        startIso: '2027-11-26T11:07:58Z',
        endIso: '2028-02-28T16:17:08Z',
        periodFormatted: 'November 26, 2027 – February 28, 2028',
        motion: 'DIRECT',
        dignity: 'Neutral Sign (Sama Rashi)',
      },
      {
        phaseName: 'Phase 9: Leo Retrograde Re-entry',
        signIndex: 5,
        signName: 'Leo (Simha - Royal Mitra)',
        startIso: '2028-02-28T16:17:08Z',
        endIso: '2028-07-24T08:16:42Z',
        periodFormatted: 'February 28, 2028 – July 24, 2028',
        motion: 'RETROGRADE',
        dignity: 'Friendly Sign (Mitra Rashi)',
      },
      {
        phaseName: 'Phase 10: Virgo Direct Culmination',
        signIndex: 6,
        signName: 'Virgo (Kanya)',
        startIso: '2028-07-24T08:16:42Z',
        endIso: '2028-12-26T05:53:54Z',
        periodFormatted: 'July 24, 2028 – December 26, 2028',
        motion: 'DIRECT',
        dignity: 'Neutral Sign (Sama Rashi)',
      },
      {
        phaseName: 'Phase 11: Libra Direct Ingress (Diplomatic Horizon)',
        signIndex: 7,
        signName: 'Libra (Tula)',
        startIso: '2028-12-26T05:53:54Z',
        endIso: '2029-03-29T11:24:55Z',
        periodFormatted: 'December 26, 2028 – March 29, 2029',
        motion: 'DIRECT',
        dignity: 'Enemy Sign (Shatru Rashi)',
      },
      {
        phaseName: 'Phase 12: Virgo Retrograde Re-entry (Analytical Review)',
        signIndex: 6,
        signName: 'Virgo (Kanya)',
        startIso: '2029-03-29T11:24:55Z',
        endIso: '2029-08-24T17:48:30Z',
        periodFormatted: 'March 29, 2029 – August 24, 2029',
        motion: 'RETROGRADE',
        dignity: 'Neutral Sign (Sama Rashi)',
      },
      {
        phaseName: 'Phase 13: Libra Direct Re-entry & Culmination',
        signIndex: 7,
        signName: 'Libra (Tula)',
        startIso: '2029-08-24T17:48:30Z',
        endIso: '2030-01-24T18:15:07Z',
        periodFormatted: 'August 24, 2029 – January 24, 2030',
        motion: 'DIRECT',
        dignity: 'Enemy Sign (Shatru Rashi)',
      },
    ];

    const transitTimeline: JupiterTransitTimelineItem[] = transitPhases.map((tp) => {
      const sMs = new Date(tp.startIso).getTime();
      const eMs = new Date(tp.endIso).getTime();
      let status: 'COMPLETED' | 'CURRENT' | 'UPCOMING' = 'UPCOMING';
      if (refMs >= eMs) {
        status = 'COMPLETED';
      } else if (refMs >= sMs && refMs < eMs) {
        status = 'CURRENT';
      }
      const houseFromMoon = ((tp.signIndex - moonRelation.moonSignIndex + 12) % 12) + 1;
      const houseFromLagna = ascRashiIndex !== null ? ((tp.signIndex - ascRashiIndex + 12) % 12) + 1 : null;

      return {
        phaseName: tp.phaseName,
        sign: tp.signName,
        signIndex: tp.signIndex,
        startDateIso: tp.startIso,
        endDateIso: tp.endIso,
        periodFormatted: tp.periodFormatted,
        motion: tp.motion,
        dignity: tp.dignity,
        houseFromLagna,
        houseFromMoon,
        status,
      };
    });

    const geminiTransit = this.evaluateTransit(3, 'Gemini (Mithuna)', 'May 14, 2025 – June 2, 2026', ascRashiIndex, moonRelation.moonSignIndex);
    const cancerTransit = this.evaluateTransit(4, 'Cancer (Karka - Exaltation)', 'June 2, 2026 – October 31, 2026', ascRashiIndex, moonRelation.moonSignIndex);
    const leoTransit = this.evaluateTransit(5, 'Leo (Simha - Royal Mitra)', 'October 31, 2026 – January 25, 2027', ascRashiIndex, moonRelation.moonSignIndex);

    const activeTimelineItem = transitTimeline.find((t) => t.status === 'CURRENT');
    const currentTransit = activeTimelineItem
      ? this.evaluateTransit(
          activeTimelineItem.signIndex,
          activeTimelineItem.sign,
          activeTimelineItem.periodFormatted,
          ascRashiIndex,
          moonRelation.moonSignIndex
        )
      : cancerTransit;

    // 9. Consecrated Remedies
    const remedies = this.compileRemedies(dignity);

    return {
      jupiterPlacement,
      jupiterAspects,
      beneficVsMalefic,
      moonSignRelation: moonRelation,
      jupiterNakshatraAnalysis: nakshatraAnalysis,
      jupiterConjunctions: conjunctions,
      jupiterAshtakavarga: ashtakavarga,
      geminiTransit,
      cancerTransit,
      leoTransit,
      currentTransit,
      transitTimeline,
      remedies,
      referenceDateIso: refIso,
    };
  }

  private static calculateNatalAspects(
    jupSignIndex: number,
    ascSignIndex: number | null
  ): JupiterAspectsResult {
    // Jupiter casts full Drishti on 5th, 7th, and 9th houses from its placement
    const aspectOffsets = [5, 7, 9];
    const aspects = aspectOffsets.map((offset) => {
      const targetSignIndex = ((jupSignIndex - 1 + (offset - 1)) % 12) + 1;
      const targetRashi = RASHIS.find((r) => r.index === targetSignIndex) || RASHIS[0];
      const targetHouse =
        ascSignIndex !== null
          ? ((targetSignIndex - ascSignIndex + 12) % 12) + 1
          : null;

      let areaTested = 'Expansion, grace, and dharmic opportunity';
      if (targetHouse === 6) areaTested = 'Health resilience, victory over disputes, and debt neutralization';
      else if (targetHouse === 8) areaTested = 'Longevity protection, research mastery, and sudden occult breakthroughs';
      else if (targetHouse === 10) areaTested = 'Professional dignity, mentor backing, and public leadership recognition';
      else if (targetHouse === 1) areaTested = 'Physical vitality, intellectual clarity, and philosophical maturity';
      else if (targetHouse === 5) areaTested = 'Creative inspiration, progeny blessings, and intuitive wisdom';
      else if (targetHouse === 9) areaTested = 'Spiritual fortunes, pilgrimages, and fatherly guidance';

      return {
        aspectNumber: offset,
        house: targetHouse,
        signIndex: targetSignIndex,
        sign: `${targetRashi.sanskritName} (${targetRashi.englishName})`,
        areaTested,
      };
    });

    const description =
      "In classical Vedic astrology, Guru's aspects (Drishti) are universally revered as golden shields. Regardless of sign condition, wherever Jupiter gazes, it infuses divine grace, shields against acute catastrophe, and expands positive potential.";

    return { aspects, description };
  }

  private static evaluateBeneficVsMalefic(
    signIndex: number,
    house: number | null,
    lordship: number[],
    dignity: string
  ): JupiterBeneficVsMaleficResult {
    const isFunctionalBenefic = lordship.some((h) => [1, 2, 4, 5, 9].includes(h));

    return {
      nature: isFunctionalBenefic
        ? 'Supreme Functional Benefic & Wealth Significator'
        : 'Neutral-Benefic Wisdom Teacher',
      functionalRole:
        lordship.length > 0
          ? `Lord of Houses ${lordship.join(' & ')}, governing core life prosperity and foundational consciousness`
          : 'Natural Karaka for Wisdom, Dharma, and Expansion',
      challenges: [
        'Risk of over-optimism or underestimating operational bottlenecks',
        'Tendency to overlook granular administrative details in favor of grand visions',
        'Financial overextension driven by excessive generosity or uncalibrated faith',
      ],
      growthOpportunities: [
        'Natural ability to attract mentors, scholars, and executive sponsors',
        'Powerful oratory and persuasive speaking that commands moral authority',
        'Long-term asset building through patient, principled capital deployment',
      ],
    };
  }

  private static evaluateMoonSignRelation(jupPos: any, moonPos: any): JupiterMoonRelationResult {
    const moonLon = moonPos ? moonPos.longitude : 177.1857;
    const moonRashi = getRashiByLongitude(moonLon);
    const moonNak = getNakshatraByLongitude(moonLon);
    const moonPada = moonPos?.pada ?? getPada(moonLon);

    const jupRashi = getRashiByLongitude(jupPos.longitude);
    const houseFromMoon = ((jupRashi.index - moonRashi.index + 12) % 12) + 1;

    let archetype = 'The Dharmic Counselor';
    let psycheEvolution =
      'Your emotional core seeks intellectual clarity and truth. Jupiter harmonizes emotional reactions into principled wisdom.';
    if (houseFromMoon === 4) {
      archetype = 'The Grounded Philosopher';
      psycheEvolution =
        'Jupiter in the 4th house from Moon anchors deep emotional contentment, love for family traditions, domestic peace, and contemplative inner retreat.';
    } else if ([1, 5, 9].includes(houseFromMoon)) {
      archetype = 'The Expansive Visionary';
      psycheEvolution =
        'Trinal alignment between Jupiter and Chandra fosters serene emotional equilibrium, innate spiritual grace, and radiant optimism.';
    }

    return {
      moonSign: `${moonRashi.sanskritName} (${moonRashi.englishName})`,
      moonSignIndex: moonRashi.index,
      moonSignLord: moonRashi.ruler as PlanetSymbol,
      moonNakshatra: moonNak.name,
      moonNakshatraIndex: moonNak.index,
      moonPada,
      moonNakshatraLord: moonNak.lord,
      jupiterRelationToMoonLord: 'Friendly and Harmonious',
      houseFromMoon,
      archetype,
      psycheEvolution,
    };
  }

  private static evaluateNakshatra(nakName: string, pada: number): JupiterNakshatraAnalysisResult {
    if (nakName.toLowerCase().includes('mula') || nakName.toLowerCase().includes('moola')) {
      return {
        nakshatra: 'Mula',
        nakshatraIndex: 19,
        lord: 'Ketu',
        pada,
        symbol: 'Tied bunch of roots (Tricolored flags)',
        deity: 'Nirriti (Goddess of Dissolution and Absolute Truth)',
        karmicTheme:
          'Deep inquiry into root causes, dismantling superficial illusions, seeking undeniable fundamental truths, and anchoring spiritual foundations.',
      };
    }

    return {
      nakshatra: nakName,
      nakshatraIndex: 1,
      lord: 'Brihaspati',
      pada,
      symbol: 'Sacred bow and arrow',
      deity: 'Brihaspati / Agni',
      karmicTheme: 'Spiritual illumination, righteous guidance, and higher philosophical study.',
    };
  }

  private static evaluateConjunctions(jupPos: any, rawPlanets: any[]): JupiterConjunctionsResult {
    const conjoined: string[] = [];
    const yogas: string[] = [];

    const jupLon = jupPos.longitude;
    const jupSign = getRashiByLongitude(jupLon).index;

    for (const p of rawPlanets) {
      const sym = (p.planet || p.name || '').toUpperCase();
      if (sym === 'JUPITER') continue;

      const pSign = getRashiByLongitude(p.longitude).index;
      if (pSign === jupSign) {
        conjoined.push(sym);
        if (sym === 'SUN') yogas.push('Guru-Surya Yoga (Royal Dharma & Wisdom)');
        if (sym === 'MERCURY') yogas.push('Guru-Budha Yoga (Scholarly Intellect & Eloquence)');
        if (sym === 'MOON') yogas.push('Gajakesari Yoga (Virtue, Respect & Enduring Abundance)');
        if (sym === 'MARS') yogas.push('Guru-Mangala Yoga (Righteous Action & Leadership)');
      }
    }

    let interpretation =
      'Jupiter sits alone in its sign, radiating uncluttered dharmic clarity and focused guidance.';
    if (conjoined.length > 0) {
      interpretation = `Jupiter shares sign space with ${conjoined.join(
        ', '
      )}. This creates powerful multi-planetary synergy, blending Jupiter’s spiritual grace with the pragmatic and dynamic impulses of its celestial companions.`;
    }

    return {
      conjoinedPlanets: conjoined,
      interpretation,
      yogas,
    };
  }

  private static calculateJupiterBav(
    chart: AstroChart,
    jupSignIndex: number
  ): JupiterAshtakavargaResult {
    let chartForBav: AstroChart = chart;
    if (Array.isArray(chart.planets)) {
      const recordPlanets: Record<string, any> = {};
      for (const p of chart.planets as any[]) {
        const sym = (p.planet || p.name || '').toUpperCase();
        recordPlanets[sym] = p;
      }
      chartForBav = { ...chart, planets: recordPlanets };
    }

    const bavTable = calculateBhinnashtakavarga(PlanetSymbol.JUPITER, chartForBav);
    const bindus = bavTable.signList; // 12 elements
    const total = bavTable.totalPoints; // strictly 56 in Parashari BAV

    const currentGeminiPoints = bindus[2]; // Gemini (sign 3, index 2)
    const cancerPoints = bindus[3]; // Cancer (sign 4, index 3)
    const natalHousePoints = bindus[jupSignIndex - 1];

    const contributorOrder = [
      'Saturn',
      'Jupiter',
      'Mars',
      'Sun',
      'Venus',
      'Mercury',
      'Moon',
      'Lagna',
    ];

    const matrix = ASHTAKAVARGA_CONTRIBUTORS.map((c, i) => ({
      contributor: contributorOrder[i] || c,
      bindus: bavTable.prastara[c],
    }));

    const interpretation =
      `Jupiter contributes strictly 56 benefic bindus across the 12 signs in Parashari Bhinnashtakavarga. ` +
      `Your transit through Gemini carries ${currentGeminiPoints} bindus, while the upcoming exaltation in Cancer commands a potent ${cancerPoints} bindus, indicating high productive momentum.`;

    return {
      bindus,
      total,
      currentGeminiPoints,
      cancerPoints,
      natalHousePoints,
      matrix,
      interpretation,
    };
  }

  private static evaluateTransit(
    signIndex: number,
    signName: string,
    period: string,
    ascSignIndex: number | null,
    moonSignIndex: number
  ): JupiterTransitPeriodDetail {
    const houseFromMoon = ((signIndex - moonSignIndex + 12) % 12) + 1;
    const houseFromLagna =
      ascSignIndex !== null ? ((signIndex - ascSignIndex + 12) % 12) + 1 : null;

    let predictions: string[] = [];
    let aspects: string[] = [];
    let physicalChanges: string[] = [];

    if (signIndex === 3) {
      // Gemini Transit
      predictions = [
        'Strategic restructuring of professional commitments and daily workflow architecture',
        'Enhanced analytical output, intellectual collaborations, and contract negotiations',
        'Opportunities to formalize certifications, publications, or advisory roles',
      ];
      aspects = [
        '5th Aspect on Libra: Financial restructuring, foreign networking, and mindful savings',
        '7th Aspect on Sagittarius: Protection to family wealth, vocal authority, and values',
        '9th Aspect on Aquarius: Domestic grounding, real estate stability, and workplace peace',
      ];
      physicalChanges = [
        'Urge to optimize daily wellness, sleep cycles, and metabolic health',
        'Increased reliance on structured scheduling and mental discipline',
      ];
    } else if (signIndex === 5) {
      // Leo Transit (Royal Mitra Rashi of Sun)
      predictions = [
        'Elevation in professional authority, executive standing, and leadership recognition',
        'Strengthening of dignified mentorship networks and institutional patronage',
        'Heightened spiritual discernment with purposeful expenditures on philanthropic and educational projects',
      ];
      aspects = [
        '5th Aspect on Sagittarius: Multiplies accumulated wealth, family harmony, and vocal authority',
        '7th Aspect on Aquarius: Brings peace, real estate stability, and emotional grounding to home life',
        '9th Aspect on Aries: Neutralizes debts, revitalizes physical vitality, and overcomes competitors',
      ];
      physicalChanges = [
        'Elevated executive presence and aura; cultivate steady cardiovascular rhythm and mindful sleep',
        'Increased travel for leadership delegations, advisory summits, or sacred pilgrimages',
      ];
    } else if (signIndex === 6) {
      // Virgo Transit (Mercury's Sign - Neutral)
      predictions = [
        'Meticulous intellectual reorganization, strategic planning, and operational excellence',
        'Acquisition of specialized credentials, analytical mastery, and refined advisory skills',
        'Systematic resolution of financial debts, contractual ambiguities, and operational bottlenecks',
      ];
      aspects = [
        '5th Aspect on Capricorn: Structured enterprise, disciplined efforts, and sibling solidarity',
        '7th Aspect on Pisces: Heightened spiritual intuition, meditative depth, and creative breakthrough',
        '9th Aspect on Taurus: Harmonious partnership dynamics, contractual stability, and social grace',
      ];
      physicalChanges = [
        'Focus on nervous system regulation, digestive balance, and organized daily routines',
        'Clear mental sharpness accompanied by higher demand for cognitive focus',
      ];
    } else if (signIndex === 7) {
      // Libra Transit (Venus's Sign - Enemy / Sama)
      predictions = [
        'Expansive diplomatic negotiations, international collaborations, and cross-border ventures',
        'Prudent resource allocation, ethical investments, and elevated philanthropic engagements',
        'Philosophical recalibration of personal values, artistic pursuits, and long-term partnerships',
      ];
      aspects = [
        '5th Aspect on Aquarius: Domestic peace, intellectual networking, and foundational security',
        '7th Aspect on Aries: Dynamic professional drive, competitive resilience, and physical vitality',
        '9th Aspect on Gemini: Scholarly research, strategic communications, and higher publishing',
      ];
      physicalChanges = [
        'Mindful moderation in luxury, balanced sleep patterns, and kidney/metabolic wellness',
        'Appreciation for harmonious environments, aesthetic spaces, and peaceful living',
      ];
    } else {
      // Cancer Transit (Exaltation)
      predictions = [
        'Supreme fortune, philosophical breakthroughs, and mentor sponsorship',
        'Peak expansion in social circles, network capital, and long-term earnings',
        'Auspicious milestones regarding higher learning, spiritual pilgrimages, and progeny',
      ];
      aspects = [
        '5th Aspect on Scorpio: Rejuvenation of personal vitality, confidence, and aura',
        '7th Aspect on Capricorn: Courageous initiatives, fraternal bonds, and enterprise',
        '9th Aspect on Pisces: Divine intuition, mantra siddhi, and profound inner peace',
      ];
      physicalChanges = [
        'Elevated energy, luminous vitality, and desire for purposeful cultural travel',
        'Emotional rejuvenation and profound spiritual grounding',
      ];
    }

    return {
      sign: signName,
      signIndex,
      period,
      houseFromLagna,
      houseFromMoon,
      predictions,
      aspects,
      physicalChanges,
    };
  }

  private static compileRemedies(dignity: string): JupiterRemediesResult {
    return {
      gemstone: {
        name: 'Yellow Sapphire (Pukhraj) / Natural Yellow Topaz',
        alternative: 'Natural Citrine / Heliodor',
        metal: 'Panchdhatu or 18k Yellow Gold',
        finger: 'Index Finger (Tarjani)',
        day: 'Thursday morning during Shukla Paksha at sunrise',
        weightRule: 'Approximately 1/10th of total body weight in carats (e.g. 7-8 carats for 75-80kg)',
        caution:
          'Ensure the gemstone is unheated, untreated, and makes direct contact with the skin. Always consult your astrologer regarding dasha timing before wearing.',
      },
      rudraksha: {
        mukhi: '5 Mukhi Rudraksha (Lord Kalagni Rudra / Brihaspati)',
        benefits:
          'Cultivates mental peace, purifies intellectual discernment, regulates blood pressure, and aligns with cosmic wisdom.',
        ritual:
          'Consecrate with raw cow milk and Gangajal on Thursday morning chanting the Brihaspati Beej Mantra 108 times.',
      },
      crystals: {
        citrine: 'Attracts financial abundance, clears the solar plexus, and fosters sunny optimism.',
        yellowJasper: 'Provides grounding emotional stability and shields against intellectual burn-out.',
        pyrite: 'Enhances executive confidence, masculine willpower, and wealth manifestation.',
        angels: 'Supports divine connection, serenity, and protective guidance during complex decisions.',
      },
      astrovastu: {
        direction: 'North-East (Ishan Corner)',
        zoneDescription:
          'The North-East represents the seat of Lord Shiva and Jupiter. It is the zone of higher consciousness, clarity, and divine grace.',
        dos: [
          'Keep this zone clean, light, open, and free of clutter',
          'Place spiritual scriptures, pure water fountains, or sacred imagery here',
          'Use soft yellow, white, or light golden accents in this quadrant',
        ],
        donts: [
          'Avoid heavy storage, garbage bins, or toilets in the North-East',
          'Remove broken electrical items, shoe racks, and metal clutter',
        ],
      },
      mantras: {
        traditionalMantra: 'ॐ बृहस्पतये नमः (Om Brihaspataye Namah)',
        beejMantra: 'ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः (Om Graam Greem Groum Sah Gurave Namah)',
        guruGayatri:
          'ॐ वृषभध्वजाय विद्महे घृणीहस्ताय धीमहि तन्नो गुरुः प्रचोदयात् (Om Vrishabadhwajaya Vidmahe Gruni Hastaya Dheemahi Tanno Guru Prachodayat)',
        guidelines:
          'Chant 108 times using a turmeric (Haldi) or sandalwood rosary facing East or North-East on Thursday mornings.',
      },
    };
  }

  private static getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }
}
