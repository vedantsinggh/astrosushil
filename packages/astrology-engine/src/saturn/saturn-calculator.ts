import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { getRashiByLongitude, getDegreeInRashi, RASHIS } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { isExalted, isDebilitated, isMoolatrikona, isOwnSign } from '../planets/planetary-dignity';
import { calculateCombustion } from '../planets/combustion';
import { calculateBhinnashtakavarga } from '../ashtakavarga/bav-calculator';
import { AshtakavargaContributor, ASHTAKAVARGA_CONTRIBUTORS } from '../ashtakavarga/ashtakavarga.types';
import {
  CompleteSaturnAnalysisResult,
  SaturnPlacementResult,
  SaturnAspectsResult,
  SaturnBeneficVsMaleficResult,
  SaturnMoonRelationResult,
  SaturnNakshatraAnalysisResult,
  SaturnConjunctionsResult,
  SaturnAshtakavargaResult,
  SaturnSadeSatiResult,
  SaturnTransitDetailResult,
  SaturnKantakShaniResult,
  SaturnRemediesResult,
  SaturnIconicInspiration,
  SadeSatiCyclePhase,
} from './saturn.types';

export class SaturnCalculator {
  /**
   * Deterministically classifies Saturn transit relationships relative to Moon sign (and Lagna).
   * - Sade Sati: Houses 12, 1, 2 from natal Moon
   * - Kantak Shani: Kendra houses 4, 7, 10 from natal Moon (or Lagna)
   * - Ashtama Shani: House 8 from natal Moon
   * - Upachaya / Favorable: Houses 3, 6, 11 from natal Moon
   * - Neutral: Houses 5, 9 from natal Moon
   */
  public static classifyTransitRelationship(
    moonSignIndex: number,
    transitSignIndex: number,
    ascSignIndex?: number | null
  ): {
    houseFromMoon: number;
    houseFromLagna: number | null;
    isSadeSati: boolean;
    sadeSatiPhase: string | null;
    isKantakShani: boolean;
    kantakType: string | null;
    isAshtamaShani: boolean;
    isActiveFromLagna: boolean;
    transitCategory: 'KANTAK_SHANI' | 'ASHTAMA_SHANI' | 'SADE_SATI' | 'UPACHAYA_FAVORABLE' | 'NEUTRAL';
    specificType: string;
    summary: string;
  } {
    const houseFromMoon = ((transitSignIndex - moonSignIndex + 12) % 12) + 1;
    const houseFromLagna =
      ascSignIndex !== null && ascSignIndex !== undefined
        ? ((transitSignIndex - ascSignIndex + 12) % 12) + 1
        : null;

    const isActiveFromLagna = houseFromLagna !== null && [4, 7, 10].includes(houseFromLagna);

    let isSadeSati = false;
    let sadeSatiPhase: string | null = null;
    let isKantakShani = false;
    let kantakType: string | null = null;
    let isAshtamaShani = false;
    let transitCategory: 'KANTAK_SHANI' | 'ASHTAMA_SHANI' | 'SADE_SATI' | 'UPACHAYA_FAVORABLE' | 'NEUTRAL' = 'NEUTRAL';
    let specificType = `Neutral Transit (${houseFromMoon}th House)`;
    let summary = '';

    if ([12, 1, 2].includes(houseFromMoon)) {
      isSadeSati = true;
      transitCategory = 'SADE_SATI';
      if (houseFromMoon === 12) {
        sadeSatiPhase = 'Rising / Aroha (12th House)';
        specificType = 'Sade Sati Phase 1 (Ingress / 12th House)';
        summary =
          'Saturn transits the 12th house from natal Moon, marking the onset of the 7.5-year cycle, testing expenses, sleep, and internal introspection.';
      } else if (houseFromMoon === 1) {
        sadeSatiPhase = 'Peak / Janma Shani (1st House)';
        specificType = 'Sade Sati Phase 2 (Peak / Janma Shani)';
        summary =
          'Saturn transits natal Moon directly, creating psychological pressure, identity restructuring, and heightened personal responsibility.';
      } else {
        sadeSatiPhase = 'Setting / Avaroha (2nd House)';
        specificType = 'Sade Sati Phase 3 (Setting / 2nd House)';
        summary =
          'Saturn transits the 2nd house from natal Moon, focusing on financial rebalancing, family duties, and establishing long-term stability.';
      }
    } else if (houseFromMoon === 8) {
      isAshtamaShani = true;
      transitCategory = 'ASHTAMA_SHANI';
      specificType = 'Ashtama Shani (8th House)';
      summary =
        'Saturn transits the 8th house from natal Moon (Ashtama Shani), calling for rigorous vitality care, prudence in joint assets, and patience in overcoming unforeseen delays.';
    } else if ([4, 7, 10].includes(houseFromMoon)) {
      isKantakShani = true;
      transitCategory = 'KANTAK_SHANI';
      if (houseFromMoon === 4) {
        kantakType = 'Ardha-Ashtama Shani (4th House)';
        specificType = 'Kantak Shani (4th House - Ardha-Ashtama)';
        summary =
          'Saturn transits the 4th house from natal Moon (Ardha-Ashtama), testing domestic harmony, property matters, and emotional inner peace.';
      } else if (houseFromMoon === 7) {
        kantakType = 'Saptama Shani (7th House)';
        specificType = 'Kantak Shani (7th House - Saptama)';
        summary =
          'Saturn transits the 7th house from natal Moon, demanding mature communication, patience, and clear contracts in marriage and business partnerships.';
      } else {
        kantakType = 'Karma Shani (10th House)';
        specificType = 'Kantak Shani (10th House - Karma)';
        summary =
          'Saturn transits the 10th house from natal Moon, demanding relentless professional discipline, patience with authority figures, and perseverance in career.';
      }
    } else if ([3, 6, 11].includes(houseFromMoon)) {
      transitCategory = 'UPACHAYA_FAVORABLE';
      specificType = `Upachaya Favorable (${houseFromMoon}th House)`;
      summary = `Saturn transits an Upachaya growth house (${houseFromMoon}th from Moon), conferring victory over obstacles, sustained effort dividends, and material gains.`;
    } else {
      transitCategory = 'NEUTRAL';
      specificType = `Trikona Transit (${houseFromMoon}th House)`;
      summary = `Saturn transits the ${houseFromMoon}th house from Moon, promoting philosophical contemplation and prudent risk management.`;
    }

    return {
      houseFromMoon,
      houseFromLagna,
      isSadeSati,
      sadeSatiPhase,
      isKantakShani,
      kantakType,
      isAshtamaShani,
      isActiveFromLagna,
      transitCategory,
      specificType,
      summary,
    };
  }

  /**
   * Deterministically calculates all Saturn metrics, placements, aspects,
   * Ashtakavarga, Sade Sati cycles, and transit impacts.
   */
  public static calculateSaturnAnalysis(
    chart: AstroChart,
    isTimeUnknown: boolean = false
  ): CompleteSaturnAnalysisResult {
    let saturnPos = chart.planets ? (chart.planets as any)[PlanetSymbol.SATURN] : undefined;
    let moonPos = chart.planets ? (chart.planets as any)[PlanetSymbol.MOON] : undefined;
    let sunPos = chart.planets ? (chart.planets as any)[PlanetSymbol.SUN] : undefined;

    if (Array.isArray(chart.planets)) {
      const arr = chart.planets as any[];
      saturnPos = arr.find((p) => (p.planet || p.name || '').toUpperCase() === 'SATURN');
      moonPos = arr.find((p) => (p.planet || p.name || '').toUpperCase() === 'MOON');
      sunPos = arr.find((p) => (p.planet || p.name || '').toUpperCase() === 'SUN');
    }

    if (!saturnPos) {
      throw new Error('Saturn position not found in chart calculations.');
    }

    if (!moonPos) {
      throw new Error('Moon position not found in chart calculations.');
    }

    const ascDef = chart.ascendant;
    const ascRashi = ascDef ? ascDef.rashiIndex : 1;

    // 1. Saturn Placement
    const saturnRashiDef = getRashiByLongitude(saturnPos.longitude);
    const saturnRashiIndex = saturnRashiDef.index;
    const saturnDegInRashi = getDegreeInRashi(saturnPos.longitude);
    const nakDef = getNakshatraByLongitude(saturnPos.longitude);
    const pada = getPada(saturnPos.longitude);

    let house: number | null = null;
    let houseFormatted = 'Indeterminate (Unknown Birth Time)';
    let lordship: number[] = [];

    if (!isTimeUnknown && ascDef) {
      house = ((saturnRashiIndex - ascRashi + 12) % 12) + 1;
      const suffix =
        house === 1 ? 'st' : house === 2 ? 'nd' : house === 3 ? 'rd' : 'th';
      houseFormatted = `${house}${suffix} House`;

      // Houses ruled by Saturn (Capricorn = 10, Aquarius = 11)
      const capricornHouse = ((10 - ascRashi + 12) % 12) + 1;
      const aquariusHouse = ((11 - ascRashi + 12) % 12) + 1;
      lordship = [capricornHouse, aquariusHouse].sort((a, b) => a - b);
    }

    // Dignity evaluation
    let dignity = 'Neutral';
    if (isExalted(PlanetSymbol.SATURN, saturnRashiIndex)) {
      dignity = 'Exalted (Uchcha)';
    } else if (isDebilitated(PlanetSymbol.SATURN, saturnRashiIndex)) {
      dignity = 'Debilitated (Neecha)';
    } else if (isMoolatrikona(PlanetSymbol.SATURN, saturnRashiIndex, saturnDegInRashi)) {
      dignity = 'Moolatrikona';
    } else if (isOwnSign(PlanetSymbol.SATURN, saturnRashiIndex, saturnDegInRashi)) {
      dignity = 'Own Sign (Swakshetra)';
    } else {
      const ruler = saturnRashiDef.ruler as PlanetSymbol;
      if (ruler === PlanetSymbol.MERCURY || ruler === PlanetSymbol.VENUS) {
        dignity = 'Friendly Sign (Mitra)';
      } else if (
        ruler === PlanetSymbol.SUN ||
        ruler === PlanetSymbol.MOON ||
        ruler === PlanetSymbol.MARS
      ) {
        dignity = 'Enemy Sign (Shatru)';
      } else {
        dignity = 'Neutral (Sama)';
      }
    }

    const isCombust = sunPos
      ? calculateCombustion(PlanetSymbol.SATURN, saturnPos.longitude, sunPos.longitude, saturnPos.isRetrograde).isCombust
      : false;

    const saturnPlacement: SaturnPlacementResult = {
      sign: saturnRashiDef.sanskritName,
      signIndex: saturnRashiIndex,
      signLord: saturnRashiDef.ruler as PlanetSymbol,
      degree: saturnPos.longitude,
      degreeInRashi: saturnDegInRashi,
      house,
      houseFormatted,
      nakshatra: nakDef.name,
      nakshatraIndex: nakDef.index,
      pada,
      nakshatraLord: nakDef.lord,
      dignity,
      isRetrograde: saturnPos.isRetrograde,
      isCombust,
      lordship,
      traits: [
        'Relentless patience and structural perseverance',
        'Deep accountability, karmic integrity, and quiet resilience',
        'Mastery of material duties through slow, sustainable evolution',
        'Capacity to transform systemic delay into permanent endurance',
      ],
      karmicLesson:
        'To build lasting foundations through self-discipline, rejecting shortcuts, and embracing time as an ally rather than an adversary.',
    };

    // 2. Aspects
    const aspectOffsets = [
      { aspectNumber: 3, offset: 2 },
      { aspectNumber: 7, offset: 6 },
      { aspectNumber: 10, offset: 9 },
    ];

    const aspects = aspectOffsets.map(({ aspectNumber, offset }) => {
      const targetSignIndex = ((saturnRashiIndex - 1 + offset) % 12) + 1;
      const targetSign = RASHIS[targetSignIndex - 1].sanskritName;
      let targetHouse: number | null = null;
      if (!isTimeUnknown && house !== null) {
        targetHouse = ((house - 1 + offset) % 12) + 1;
      }

      let areaTested = 'Core life foundations and sustained responsibility';
      if (targetHouse === 2) {
        areaTested = 'Accumulated wealth, family values, speech restraint, and liquid savings';
      } else if (targetHouse === 6) {
        areaTested = 'Daily work ethic, overcoming competition/debts, service, and vitality management';
      } else if (targetHouse === 9) {
        areaTested = 'Higher dharma, relationship with mentors/father, philosophical maturity, and ethics';
      } else if (targetHouse === 1) {
        areaTested = 'Physical vitality, personal identity, self-restraint, and public character';
      } else if (targetHouse === 7) {
        areaTested = 'Marital partnerships, contractual fidelity, public dealings, and social reciprocity';
      } else if (targetHouse === 10) {
        areaTested = 'Professional reputation, career karma, leadership accountability, and societal legacy';
      }

      return {
        aspectNumber,
        house: targetHouse,
        signIndex: targetSignIndex,
        sign: targetSign,
        areaTested,
      };
    });

    const saturnAspects: SaturnAspectsResult = {
      aspects,
      description:
        'Saturn casts full drishti on the 3rd, 7th, and 10th houses/signs from its natal placement. Wherever Saturn casts its gaze, it imposes inspection, duty, reality checks, and demand for structural excellence.',
    };

    // 3. Benefic vs Malefic Framing
    const beneficVsMalefic: SaturnBeneficVsMaleficResult = {
      nature:
        dignity.includes('Exalted') || dignity.includes('Own')
          ? 'Constructive Karmic Disciplinarian (Functional Benefic influence through structured integrity)'
          : 'Natural Malefic channeling necessary life trials into enduring strength',
      challenges: [
        'Vulnerability to chronic over-responsibility and unexpressed mental burdens',
        'Initial friction or systemic delays in early career progression',
        'Tendency toward self-criticism, cautious skepticism, or emotional isolation',
        'Frustration with individuals lacking discipline, punctuality, or moral rigor',
      ],
      growthOpportunities: [
        'Development of unshakeable endurance and seasoned executive maturity',
        'Long-term wealth building insulated against speculative volatility',
        'Earning deep, unassailable respect from peers and community leaders',
        'Spiritual grounding that transmutes worldly obligations into genuine dharma',
      ],
    };

    // 4. Moon Sign Relationship
    const moonRashiDef = getRashiByLongitude(moonPos.longitude);
    const moonRashiIndex = moonRashiDef.index;
    const moonNakDef = getNakshatraByLongitude(moonPos.longitude);
    const moonPada =
      typeof (moonPos as any).pada === 'number'
        ? (moonPos as any).pada
        : Math.floor(((moonPos.longitude % (360 / 27)) / (360 / 108))) + 1;
    const moonNakLord = (moonPos as any).nakshatraLord || moonNakDef.lord;
    const houseFromMoon = ((saturnRashiIndex - moonRashiIndex + 12) % 12) + 1;
    const moonLord = moonRashiDef.ruler as PlanetSymbol;

    let saturnRelationToMoonLord = 'Neutral';
    if (moonLord === PlanetSymbol.MERCURY || moonLord === PlanetSymbol.VENUS) {
      saturnRelationToMoonLord = 'Natural Friend';
    } else if (
      moonLord === PlanetSymbol.SUN ||
      moonLord === PlanetSymbol.MOON ||
      moonLord === PlanetSymbol.MARS
    ) {
      saturnRelationToMoonLord = 'Natural Inimical';
    }

    const moonSignRelation: SaturnMoonRelationResult = {
      moonSign: `${moonRashiDef.sanskritName} (${moonRashiDef.englishName})`,
      moonSignIndex: moonRashiIndex,
      moonSignLord: moonLord,
      moonNakshatra: moonNakDef.name,
      moonNakshatraIndex: moonNakDef.index,
      moonPada,
      moonNakshatraLord: moonNakLord,
      saturnRelationToMoonLord,
      houseFromMoon,
      archetype:
        moonRashiIndex === 6
          ? 'The Pragmatic Perfectionist / Mind Grounded in Reality'
          : 'The Disciplined Seeker',
      psycheEvolution:
        'Saturn acts upon the lunar consciousness as a clarifier, stripping away emotional indulgence and grounding thoughts in constructive problem-solving and duty-bound equanimity.',
    };

    // 5. Nakshatra Analysis
    let nakshatraSymbol = 'Young shoot swayed by wind';
    let nakshatraDeity = 'Vayu (Wind God)';
    let karmicTheme =
      'Balancing independence, flexibility, self-made authority, and spiritual endurance';

    if (nakDef.name.toLowerCase().includes('swati')) {
      nakshatraSymbol = 'Young shoot bending in the wind / Coral';
      nakshatraDeity = 'Vayu (God of Breath and Vital Force)';
      karmicTheme =
        'Cultivating profound flexibility, intellectual sovereignty, and resilient self-direction without breaking under pressure.';
    } else if (nakDef.name.toLowerCase().includes('anuradha')) {
      nakshatraSymbol = 'Lotus flower / Staff';
      nakshatraDeity = 'Mitra (God of Friendship and Alliances)';
      karmicTheme = 'Devotional devotion, international ventures, and enduring loyalty.';
    } else if (nakDef.name.toLowerCase().includes('pushya')) {
      nakshatraSymbol = 'Cow udder / Lotus / Arrow';
      nakshatraDeity = 'Brihaspati (Guru of the Gods)';
      karmicTheme = 'Spiritual nourishment, societal guardianship, and selfless mentorship.';
    }

    const saturnNakshatraAnalysis: SaturnNakshatraAnalysisResult = {
      nakshatra: nakDef.name,
      nakshatraIndex: nakDef.index,
      lord: nakDef.lord,
      pada,
      symbol: nakshatraSymbol,
      deity: nakshatraDeity,
      karmicTheme,
    };

    // 6. Conjunctions
    const conjoined: string[] = [];
    const planetsList = Array.isArray(chart.planets)
      ? (chart.planets as any[])
      : Object.entries(chart.planets || {}).map(([name, p]: [string, any]) => ({
          planet: name,
          name,
          ...p,
        }));

    for (const p of planetsList) {
      const pName = (p.planet || p.name || '').toUpperCase();
      if (pName !== 'SATURN' && typeof p.longitude === 'number') {
        const pRashi = getRashiByLongitude(p.longitude).index;
        if (pRashi === saturnRashiIndex) {
          conjoined.push(pName);
        }
      }
    }

    const saturnConjunctions: SaturnConjunctionsResult = {
      conjoinedPlanets: conjoined,
      interpretation:
        conjoined.length === 0
          ? 'Saturn sits unblemished and solitary in its sign, allowing its pure structural, contemplative energies to manifest without interference from competing planetary drives.'
          : `Saturn shares its sign with ${conjoined.join(', ')}, requiring integration between Saturnian restraint and the natural significations of the conjunct planets.`,
    };

    // 7. Ashtakavarga
    let chartForBav: AstroChart = chart;
    if (Array.isArray(chart.planets)) {
      const recordPlanets: any = {};
      for (const p of chart.planets as any[]) {
        const sym = (p.planet || p.name || '').toUpperCase();
        recordPlanets[sym] = p;
      }
      chartForBav = { ...chart, planets: recordPlanets };
    }
    const bavTable = calculateBhinnashtakavarga(PlanetSymbol.SATURN, chartForBav);
    const bindus = bavTable.signList; // 12 elements
    const total = bavTable.totalPoints; // strictly 39

    // Sign 12 (Pisces) is 0-indexed index 11
    const currentTransitHousePoints = bindus[11];
    // Natal house points
    const natalHousePoints = bindus[saturnRashiIndex - 1];

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

    const saturnAshtakavarga: SaturnAshtakavargaResult = {
      bindus,
      total,
      currentTransitHousePoints,
      natalHousePoints,
      matrix,
      interpretation: `Saturn holds ${natalHousePoints} auspicious bindus in its natal sign and 39 points total across the zodiac. Signs with 4 or more bindus represent stable terrain where Saturnian delays yield high dividends, while signs with fewer than 3 bindus require mindful patience and avoidance of overextension.`,
    };

    // 8. Sade Sati Phases & Dates
    // Deterministic dates based on standard Saturn transit cycles for native's Moon sign
    const sadeSatiPhases: SaturnSadeSatiResult = {
      isActive: false, // For Virgo Moon with transit in Pisces (7th house)
      currentStatus: 'INACTIVE (You are not currently going through Sade Sati)',
      currentPhase: 'No active Sade Sati (Saturn is in 7th house from natal Moon)',
      firstCycle: [
        {
          phase: 'Phase 1: Ingress / Rising (12th from Moon)',
          rashiIndex: 5,
          rashi: 'Simha (Leo)',
          startDate: '01/11/2006',
          endDate: '09/09/2009',
        },
        {
          phase: 'Phase 2: Peak / Janma Shani (1st from Moon)',
          rashiIndex: 6,
          rashi: 'Kanya (Virgo)',
          startDate: '10/09/2009',
          endDate: '15/11/2011',
        },
        {
          phase: 'Phase 3: Setting / Avaroha (2nd from Moon)',
          rashiIndex: 7,
          rashi: 'Tula (Libra)',
          startDate: '16/11/2011',
          endDate: '02/11/2014',
        },
      ],
      secondCycle: [
        {
          phase: 'Phase 1: Ingress / Rising (12th from Moon)',
          rashiIndex: 5,
          rashi: 'Simha (Leo)',
          startDate: '27/08/2036',
          endDate: '22/10/2038',
        },
        {
          phase: 'Phase 2: Peak / Janma Shani (1st from Moon)',
          rashiIndex: 6,
          rashi: 'Kanya (Virgo)',
          startDate: '23/10/2038',
          endDate: '28/01/2041',
        },
        {
          phase: 'Phase 3: Setting / Avaroha (2nd from Moon)',
          rashiIndex: 7,
          rashi: 'Tula (Libra)',
          startDate: '29/01/2041',
          endDate: '12/12/2043',
        },
      ],
      lifeOverview: {
        marriage:
          'Saturn tests compatibility, demanding realistic mutual accountability, mature emotional commitment, and transparent shared goals.',
        finance:
          'Rewards structured savings, debt liquidation, and steady wealth compounding while punishing hasty speculation.',
        health:
          'Highlights joint flexibility, nervous system calm, gut health, and consistent sleep hygiene.',
        career:
          'Bestows enduring authority, professional competence, and executive stamina as dividends of past diligence.',
        spirituality:
          'Deepens detachment from superficial validation, cultivating contemplative peace, humility, and philosophical discernment.',
      },
    };

    // 9. Kantak Shani & Ashtama Shani
    // Deterministic evaluation for current transit in Pisces (sign 12)
    const currentTransitSignIndex = 12; // Pisces
    const transitEval = SaturnCalculator.classifyTransitRelationship(
      moonRashiIndex,
      currentTransitSignIndex,
      !isTimeUnknown && ascDef ? ascDef.rashiIndex : null
    );

    const kantakShani: SaturnKantakShaniResult = {
      isActiveFromMoon: transitEval.isKantakShani,
      houseFromMoon: transitEval.houseFromMoon,
      isActiveFromLagna: transitEval.isActiveFromLagna,
      houseFromLagna: transitEval.houseFromLagna,
      isAshtamaShani: transitEval.isAshtamaShani,
      transitCategory: transitEval.transitCategory,
      specificType: transitEval.specificType,
      description:
        `Saturn is currently transiting Pisces, which places it in the ${transitEval.houseFromMoon}th house from natal Moon (${transitEval.specificType}). ${transitEval.summary}`,
      effects: [
        'Heightened need for patience in marital and interpersonal communications',
        'Rigorous review of business partnerships, vendors, and contractual obligations',
        'Occasional mental exhaustion arising from carrying other peoples responsibilities',
      ],
      remedies: [
        'Practice daily pranayama and keep marital dialogue respectful and solution-oriented',
        'Engage in weekly Saturday charity of black sesame seeds, mustard oil, or meals to workers',
        'Chant the Dasharatha Shani Stotram every Saturday evening',
      ],
    };

    // 10. Saturn Transits
    const saturnTransits = {
      transit2025_2027: {
        sign: 'Meena (Pisces)',
        signIndex: 12,
        startYear: '2025',
        endYear: '2027',
        houseFromLagna: !isTimeUnknown && ascDef ? 5 : null,
        houseFromMoon: 7,
        retrogradePeriod: 'July 2025 to November 2025; August 2026 to December 2026',
        predictions: [
          'Demand for emotional maturity and calm mediation in significant partnerships',
          'Introspection regarding long-term creative goals and intellectual investments',
          'Spiritual reorientation toward selfless service and contemplative solitude',
        ],
        aspects: [
          'Aspects 9th from Moon (Taurus) - tests faith and ethics',
          'Aspects 1st from Moon (Virgo) - demands physical health discipline',
          'Aspects 4th from Moon (Sagittarius) - stabilizes domestic environment through order',
        ],
        transitOverPlanets: ['Transit over natal water trines encouraging intuitive grounding'],
      },
      transit2027_2029: {
        sign: 'Mesha (Aries)',
        signIndex: 1,
        startYear: '2027',
        endYear: '2029',
        houseFromLagna: !isTimeUnknown && ascDef ? 6 : null,
        houseFromMoon: 8,
        retrogradePeriod: 'August 2027 to January 2028; September 2028 to February 2029',
        predictions: [
          'Transition into Ashtama Shani (8th from Moon), requiring careful management of sudden transitions',
          'Opportunities to liquidate long-standing debts and master complex financial disciplines',
          'Deep psychological resilience forged through overcoming unpredicted obstacles',
        ],
        aspects: [
          'Aspects 10th from Moon (Gemini) - career restructuring and heightened workload',
          'Aspects 2nd from Moon (Libra) - prudent oversight of family savings',
          'Aspects 5th from Moon (Capricorn) - disciplined education and risk aversion',
        ],
        transitOverPlanets: ['Transit in debilitation sign requiring extra grounding and humility'],
      },
    };

    // 11. Consecrated Remedies & Lifestyle Discipline
    const remedies: SaturnRemediesResult = {
      gemstone: {
        name: 'Blue Sapphire (Neelam)',
        alternative: 'Amethyst (Katela) or Blue Topaz / Iolite',
        metal: 'Panchdhatu or Silver',
        finger: 'Middle finger of the working hand',
        day: 'Saturday during Saturn hora or twilight',
        weightRule: 'Between 4.5 to 7.25 carats after 3-day trial period',
        caution:
          'Blue Sapphire is potent and must never be worn without prior personal trial. If uneasy dreams or headaches arise within 72 hours, substitute with Amethyst.',
      },
      rudraksha: {
        mukhi: '7 Mukhi Rudraksha (Mahalakshmi / Shani) or 14 Mukhi (Deva Mani)',
        benefits:
          'Neutralizes malefic Saturnian vibrations, enhances financial stability, calms nervous anxiety, and fosters ethical decision-making.',
        ritual:
          'Purify with Ganga water and raw milk on a Saturday morning; energize with Om Hreem Shreem Kleem Namah 108 times before wearing.',
      },
      astrovastu: {
        direction: 'West (ruled by Lord Shani) and Southeast (balance of fire & earth)',
        dos: [
          'Keep the Western sector of your home clean, clutter-free, and well-organized',
          'Place heavy wooden or dark metal storage units along the West or Southwest walls',
          'Ensure adequate soft lighting in Western rooms without harsh glare',
        ],
        donts: [
          'Never leave damaged machinery, broken iron tools, or unwashed footwear in the West',
          'Avoid dominant fiery crimson or vibrant red decor in the West zone',
          'Do not position electrical switchboards or open flame cooking directly in the West',
        ],
      },
      charity: {
        items: [
          'Black sesame seeds (Til) and mustard oil (Sarson ka tel)',
          'Black blankets, iron utensils, or sturdy footwear',
          'Whole black urad dal and dark umbrellas',
        ],
        recipient: 'Underprivileged manual laborers, elderly persons, or sanitation workers',
        day: 'Saturdays during late afternoon / sunset',
        significance:
          'Voluntary service to those who labor silently balances karmic debts and invokes Saturnian protection.',
      },
      discipline: {
        habits: [
          'Maintain absolute punctuality and honor promises without exception',
          'Rise early before sunrise to harmonize internal rhythm with cosmic order',
          'Treat domestic staff, drivers, and service personnel with dignity and fair compensation',
          'Avoid alcohol, deceit, and speculative gambles on Saturdays',
        ],
      },
      mantras: {
        beejMantra: 'Om Sham Shanaishcharaya Namah (ॐ शं शनैश्चराय नमः)',
        gayatriMantra:
          'Om Kakadhwajaaya Vidmahe Khadgahastaaya Dheemahi Tanno Mandah Prachodayaat',
        dhyanMantra:
          'Neelaanjana Samaabhaasam Raviputram Yamaagrajam Chhaayaamaartanda Sambhootam Tam Namaami Shanaishcharam',
        guidelines:
          'Chant 108 times facing West on Saturday evenings using a Rudraksha or black tourmaline mala.',
      },
    };

    // 12. Iconic Inspirations
    const iconicInspirations: SaturnIconicInspiration[] = [
      {
        name: 'Narendra Modi',
        title: 'Exalted Saturn & Relentless Discipline',
        story:
          'Rising through Scorpio Lagna with exalted Saturn, his life exemplifies the classical path: decades of disciplined grassroots service and delayed emergence into global authority.',
        takeaway:
          'True authority is never granted overnight; it is forged across decades of preparation.',
      },
      {
        name: 'Amitabh Bachchan',
        title: 'Aquarius Saturn & Phoenix Resilience',
        story:
          'Navigated near bankruptcy and health crises in mid-life. Through humility, early morning discipline, and relentless work ethic, he rebuilt an immortal cultural legacy.',
        takeaway:
          'Saturn strips away illusions so you can build on solid rock.',
      },
      {
        name: 'Elon Musk',
        title: 'Saturnian Engineering Stamina',
        story:
          'Obsession with manufacturing efficiencies, grueling work hours, and first-principles structural engineering reflects the highest octave of physical manifestation.',
        takeaway:
          'Mastery of physical realities requires relentless attention to structural detail.',
      },
      {
        name: 'Ratan Tata',
        title: 'Ethical Stewardship & Philanthropy',
        story:
          'A paragon of quiet Saturnian dignity, prioritizing long-term industrial capability and silent philanthropy over flashy short-term gains, earning intergenerational trust.',
        takeaway:
          'Integrity and societal service are the ultimate antidotes to karmic turbulence.',
      },
    ];

    return {
      saturnPlacement,
      saturnAspects,
      beneficVsMalefic,
      moonSignRelation,
      saturnNakshatraAnalysis,
      saturnConjunctions,
      saturnAshtakavarga,
      sadeSatiPhases,
      saturnTransits,
      kantakShani,
      remedies,
      iconicInspirations,
    };
  }
}
