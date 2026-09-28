import { PlanetSymbol } from '../../planets/planet.types';
import { YogaChartContext, YogaResult, YogaCondition, YogaRelationshipEvidence } from '../yoga.types';
import { YogaPredicates } from '../yoga-predicates';

export function evaluateRajaAndDhanaYogas(ctx: YogaChartContext): YogaResult[] {
  const results: YogaResult[] = [];

  const lord1 = ctx.houseLords[1];
  const lord2 = ctx.houseLords[2];
  const lord4 = ctx.houseLords[4];
  const lord5 = ctx.houseLords[5];
  const lord7 = ctx.houseLords[7];
  const lord9 = ctx.houseLords[9];
  const lord10 = ctx.houseLords[10];
  const lord11 = ctx.houseLords[11];

  // Helper to check association between two house lords
  function checkLordAssociation(
    pA: PlanetSymbol,
    pB: PlanetSymbol,
    houseA: number,
    houseB: number
  ): { isAssociated: boolean; type?: 'CONJUNCTION' | 'MUTUAL_ASPECT'; description?: string } {
    if (pA === pB) {
      // Single planet ruling both Kendra & Trikona is a Raja Yoga Karaka (e.g. Saturn for Taurus/Libra Lagna, Mars for Cancer/Leo Lagna)
      return {
        isAssociated: true,
        type: 'CONJUNCTION',
        description: `${pA} is Yoga Karaka owning both House ${houseA} and House ${houseB}`,
      };
    }

    const isConjunct = ctx.planets[pA].rashiIndex === ctx.planets[pB].rashiIndex;
    if (isConjunct) {
      return {
        isAssociated: true,
        type: 'CONJUNCTION',
        description: `Lord of H${houseA} (${pA}) and Lord of H${houseB} (${pB}) conjunct in ${ctx.planets[pA].rashiName}`,
      };
    }

    const isMutualAspect = YogaPredicates.areInMutualAspect(pA, pB, ctx);
    if (isMutualAspect) {
      return {
        isAssociated: true,
        type: 'MUTUAL_ASPECT',
        description: `Lord of H${houseA} (${pA}) and Lord of H${houseB} (${pB}) in mutual aspect`,
      };
    }

    return { isAssociated: false };
  }

  // 1. DHARMA-KARMADHIPATI RAJA YOGA (9th + 10th lords)
  {
    const assoc = checkLordAssociation(lord9, lord10, 9, 10);
    const p9 = ctx.planets[lord9];
    const p10 = ctx.planets[lord10];

    const conditions: YogaCondition[] = [
      {
        id: 'DHARMA_KARMA_ASSOCIATION',
        description: `9th lord (${lord9}) and 10th lord (${lord10}) must associate via conjunction or mutual aspect`,
        satisfied: assoc.isAssociated,
        expected: 'Conjunction or Mutual Aspect',
        observed: assoc.description || 'No association',
      },
    ];

    const relationships: YogaRelationshipEvidence[] = assoc.isAssociated
      ? [
          {
            relationshipType: assoc.type || 'CONJUNCTION',
            planets: lord9 === lord10 ? [lord9] : [lord9, lord10],
            houses: [p9.house, p10.house],
            description: assoc.description || '',
          },
        ]
      : [];

    results.push({
      id: 'YOGA_DHARMA_KARMADHIPATI',
      canonicalName: 'Dharma-Karmadhipati Yoga',
      sanskritName: 'Dharma Karmadhipati Raja Yoga',
      category: 'RAJA',
      isDetected: assoc.isAssociated,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 34 & 35)',
      evidence: {
        conditions,
        involvedPlanets: lord9 === lord10 ? [p9] : [p9, p10],
        involvedHouses: [ctx.houses[9], ctx.houses[10]],
        relationships,
      },
    });
  }

  // 2. KENDRA-TRIKONA RAJA YOGA (1st + 5th / 1st + 9th / 4th + 5th / 4th + 9th / 7th + 9th / 10th + 5th)
  {
    const pairs: Array<{ hA: number; hB: number; label: string }> = [
      { hA: 1, hB: 5, label: 'Lagna Lord + 5th Lord' },
      { hA: 1, hB: 9, label: 'Lagna Lord + 9th Lord' },
      { hA: 4, hB: 5, label: '4th Lord + 5th Lord' },
      { hA: 4, hB: 9, label: '4th Lord + 9th Lord' },
      { hA: 7, hB: 9, label: '7th Lord + 9th Lord' },
      { hA: 10, hB: 5, label: '10th Lord + 5th Lord' },
    ];

    for (const pair of pairs) {
      const pA = ctx.houseLords[pair.hA];
      const pB = ctx.houseLords[pair.hB];
      const assoc = checkLordAssociation(pA, pB, pair.hA, pair.hB);

      if (assoc.isAssociated) {
        results.push({
          id: `YOGA_RAJA_H${pair.hA}_H${pair.hB}`,
          canonicalName: `Raja Yoga (${pair.label})`,
          sanskritName: `Kendra-Trikona Raja Yoga (H${pair.hA}-H${pair.hB})`,
          category: 'RAJA',
          isDetected: true,
          varga: ctx.varga,
          convention: 'Classical Parashari (BPHS Ch. 34)',
          evidence: {
            conditions: [
              {
                id: 'KENDRA_TRIKONA_ASSOCIATION',
                description: `Lord of H${pair.hA} (${pA}) and Lord of H${pair.hB} (${pB}) associate via conjunction/aspect`,
                satisfied: true,
                expected: 'Conjunction or Mutual Aspect',
                observed: assoc.description || '',
              },
            ],
            involvedPlanets: pA === pB ? [ctx.planets[pA]] : [ctx.planets[pA], ctx.planets[pB]],
            involvedHouses: [ctx.houses[pair.hA], ctx.houses[pair.hB]],
            relationships: [
              {
                relationshipType: assoc.type || 'CONJUNCTION',
                planets: pA === pB ? [pA] : [pA, pB],
                houses: [ctx.planets[pA].house, ctx.planets[pB].house],
                description: assoc.description || '',
              },
            ],
          },
        });
      }
    }
  }

  // 3. DHANA YOGAS (Wealth Combinations: 1+2, 2+11, 5+9, 1+11, 2+5, 2+9)
  {
    const dhanaPairs: Array<{ hA: number; hB: number; label: string }> = [
      { hA: 2, hB: 11, label: '2nd Lord (Dhana) + 11th Lord (Labha)' },
      { hA: 1, hB: 2, label: 'Lagna Lord + 2nd Lord' },
      { hA: 1, hB: 11, label: 'Lagna Lord + 11th Lord' },
      { hA: 5, hB: 9, label: '5th Lord (Lakshmi Sthana) + 9th Lord (Bhagya)' },
      { hA: 2, hB: 5, label: '2nd Lord + 5th Lord' },
      { hA: 2, hB: 9, label: '2nd Lord + 9th Lord' },
    ];

    for (const pair of dhanaPairs) {
      const pA = ctx.houseLords[pair.hA];
      const pB = ctx.houseLords[pair.hB];
      const assoc = checkLordAssociation(pA, pB, pair.hA, pair.hB);

      if (assoc.isAssociated) {
        results.push({
          id: `YOGA_DHANA_H${pair.hA}_H${pair.hB}`,
          canonicalName: `Dhana Yoga (${pair.label})`,
          sanskritName: `Dhana Yoga (H${pair.hA}-H${pair.hB})`,
          category: 'DHANA',
          isDetected: true,
          varga: ctx.varga,
          convention: 'Classical Parashari (BPHS Ch. 43)',
          evidence: {
            conditions: [
              {
                id: 'DHANA_HOUSES_ASSOCIATION',
                description: `Lord of H${pair.hA} (${pA}) and Lord of H${pair.hB} (${pB}) associate for wealth generation`,
                satisfied: true,
                expected: 'Conjunction or Mutual Aspect',
                observed: assoc.description || '',
              },
            ],
            involvedPlanets: pA === pB ? [ctx.planets[pA]] : [ctx.planets[pA], ctx.planets[pB]],
            involvedHouses: [ctx.houses[pair.hA], ctx.houses[pair.hB]],
            relationships: [
              {
                relationshipType: assoc.type || 'CONJUNCTION',
                planets: pA === pB ? [pA] : [pA, pB],
                houses: [ctx.planets[pA].house, ctx.planets[pB].house],
                description: assoc.description || '',
              },
            ],
          },
        });
      }
    }
  }

  // 4. LAKSHMI YOGA
  {
    const p9 = ctx.planets[lord9];
    const p1 = ctx.planets[lord1];

    const is9thLordInKendraOrTrikona =
      p9.house === 1 || p9.house === 4 || p9.house === 5 || p9.house === 7 || p9.house === 9 || p9.house === 10;
    const is9thLordStrong = p9.dignity === 'EXALTED' || p9.dignity === 'OWN_SIGN' || p9.dignity === 'MOOLATRIKONA';
    const isLagnaLordStrong =
      p1.house === 1 || p1.house === 4 || p1.house === 5 || p1.house === 7 || p1.house === 9 || p1.house === 10;

    const isDetected = is9thLordInKendraOrTrikona && is9thLordStrong && isLagnaLordStrong;

    const conditions: YogaCondition[] = [
      {
        id: '9TH_LORD_IN_KENDRA_OR_TRIKONA',
        description: `9th lord (${lord9}) must occupy Kendra or Trikona house`,
        satisfied: is9thLordInKendraOrTrikona,
        expected: '1, 4, 5, 7, 9, 10',
        observed: p9.house,
      },
      {
        id: '9TH_LORD_DIGNITY',
        description: `9th lord (${lord9}) must be exalted, moolatrikona, or in own sign`,
        satisfied: is9thLordStrong,
        expected: 'EXALTED | OWN_SIGN | MOOLATRIKONA',
        observed: p9.dignity,
      },
      {
        id: 'LAGNA_LORD_KENDRA_OR_TRIKONA',
        description: `Lagna lord (${lord1}) must be well placed in Kendra or Trikona`,
        satisfied: isLagnaLordStrong,
        expected: '1, 4, 5, 7, 9, 10',
        observed: p1.house,
      },
    ];

    results.push({
      id: 'YOGA_LAKSHMI',
      canonicalName: 'Lakshmi Yoga',
      sanskritName: 'Mahalakshmi Yoga',
      category: 'AUSPICIOUS',
      isDetected,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 36)',
      evidence: {
        conditions,
        involvedPlanets: [p9, p1],
        involvedHouses: [ctx.houses[9], ctx.houses[1]],
        relationships: [],
      },
    });
  }

  // 5. SARASWATI YOGA
  {
    const jup = ctx.planets[PlanetSymbol.JUPITER];
    const ven = ctx.planets[PlanetSymbol.VENUS];
    const merc = ctx.planets[PlanetSymbol.MERCURY];

    const eligibleHouses = [1, 2, 4, 5, 7, 9, 10]; // Kendra, Trikona, or 2nd house
    const isJupPlaced = eligibleHouses.includes(jup.house);
    const isVenPlaced = eligibleHouses.includes(ven.house);
    const isMercPlaced = eligibleHouses.includes(merc.house);
    const isJupDignified = jup.dignity !== 'DEBILITATED';

    const isDetected = isJupPlaced && isVenPlaced && isMercPlaced && isJupDignified;

    const conditions: YogaCondition[] = [
      {
        id: 'BENEFICS_IN_KENDRA_TRIKONA_OR_2ND',
        description: 'Jupiter, Venus, and Mercury must all occupy Kendra, Trikona, or 2nd house from Lagna',
        satisfied: isJupPlaced && isVenPlaced && isMercPlaced,
        expected: 'All in 1, 2, 4, 5, 7, 9, or 10',
        observed: `Jupiter: H${jup.house}, Venus: H${ven.house}, Mercury: H${merc.house}`,
      },
      {
        id: 'JUPITER_DIGNITY',
        description: 'Jupiter must not be debilitated',
        satisfied: isJupDignified,
        expected: 'Non-debilitated',
        observed: jup.dignity,
      },
    ];

    results.push({
      id: 'YOGA_SARASWATI',
      canonicalName: 'Saraswati Yoga',
      sanskritName: 'Saraswati Yoga',
      category: 'AUSPICIOUS',
      isDetected,
      varga: ctx.varga,
      convention: 'Classical Parashari & Phaladeepika',
      evidence: {
        conditions,
        involvedPlanets: [jup, ven, merc],
        involvedHouses: [ctx.houses[jup.house], ctx.houses[ven.house], ctx.houses[merc.house]],
        relationships: [],
      },
    });
  }

  return results;
}

