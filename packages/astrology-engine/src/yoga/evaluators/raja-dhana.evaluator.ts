import { PlanetSymbol } from '../../planets/planet.types';
import {
  YogaChartContext,
  YogaResult,
  YogaCondition,
  YogaRelationshipEvidence,
  YogaCancellationFlag,
} from '../yoga.types';
import { buildAssessment, lordRelation } from '../yoga-assessment';

const RAJA_SOURCE =
  'Classical Parashari: BPHS ch. 39 Raja yogas (Santhanam numbering; verify verses) — kendra and trikona lords related by conjunction, mutual aspect or sign exchange';
const YOGAKARAKA_SOURCE =
  'Classical Parashari: BPHS ch. 34 (Yogakaraka, Santhanam numbering) and Laghu Parashari ch. 2 — one planet owning a kendra and a trikona';
const DHANA_SOURCE =
  'Classical Parashari: BPHS ch. 41 Dhana yogas (Santhanam numbering; verify verses) — associations among the lords of 1, 2, 5, 9, 11';

const ORD = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const houseLabel = (h: number): string => (h === 1 ? 'Lagna Lord' : `${ORD(h)} Lord`);

/** Kendra (1, 4, 7, 10) × trikona (5, 9) lord pairs; 10 + 9 is Dharma-Karmadhipati. */
const KENDRA_TRIKONA_PAIRS: Array<{ hA: number; hB: number }> = [
  { hA: 1, hB: 5 },
  { hA: 1, hB: 9 },
  { hA: 4, hB: 5 },
  { hA: 4, hB: 9 },
  { hA: 7, hB: 5 },
  { hA: 7, hB: 9 },
  { hA: 10, hB: 5 },
];

const DHANA_PAIRS: Array<{ hA: number; hB: number; label: string }> = [
  { hA: 2, hB: 11, label: '2nd Lord (Dhana) + 11th Lord (Labha)' },
  { hA: 1, hB: 2, label: 'Lagna Lord + 2nd Lord' },
  { hA: 1, hB: 11, label: 'Lagna Lord + 11th Lord' },
  { hA: 5, hB: 9, label: '5th Lord (Lakshmi Sthana) + 9th Lord (Bhagya)' },
  { hA: 2, hB: 5, label: '2nd Lord + 5th Lord' },
  { hA: 2, hB: 9, label: '2nd Lord + 9th Lord' },
  { hA: 5, hB: 11, label: '5th Lord + 11th Lord (Labha)' },
  { hA: 9, hB: 11, label: '9th Lord (Bhagya) + 11th Lord (Labha)' },
];

/**
 * Qualifier facts for lord-association yogas (no verdicts). BPHS ch. 34 (verify): a kendra or
 * trikona lord that also owns the 8th or 11th does not give the full result. Reported only as a
 * fact, provisional – pending client review.
 */
function lordQualifiers(ctx: YogaChartContext, planets: PlanetSymbol[]): YogaCancellationFlag[] {
  return planets.map((p) => {
    const owns = (ctx.lordHouses[p] || []).filter((h) => h === 8 || h === 11);
    return {
      id: `LORD_ALSO_OWNS_8TH_OR_11TH_${p}`,
      description: `${p} also owns the 8th or 11th house`,
      satisfied: owns.length > 0,
      observed: `${p} owns houses ${(ctx.lordHouses[p] || []).join(', ') || 'none'}`,
      source: 'BPHS ch. 34 (Santhanam numbering; verify verse)',
      provisional: true,
    };
  });
}

export function evaluateRajaAndDhanaYogas(ctx: YogaChartContext): YogaResult[] {
  const results: YogaResult[] = [];

  const lord1 = ctx.houseLords[1];
  const lord9 = ctx.houseLords[9];
  const lord10 = ctx.houseLords[10];

  // 1. DHARMA-KARMADHIPATI RAJA YOGA (9th + 10th lords)
  {
    const rel = lordRelation(ctx, lord9, lord10, 9, 10);
    const p9 = ctx.planets[lord9];
    const p10 = ctx.planets[lord10];

    const conditions: YogaCondition[] = [
      {
        id: 'DHARMA_KARMA_ASSOCIATION',
        description: `9th lord (${lord9}) and 10th lord (${lord10}) must be related by conjunction, mutual aspect or sign exchange, or be the same planet`,
        satisfied: rel.isAssociated,
        expected: 'Conjunction, Mutual Aspect, Sign Exchange or single-planet ownership',
        observed: rel.description,
      },
    ];

    const relationships: YogaRelationshipEvidence[] = rel.primary && (rel.isAssociated || rel.primary === 'ONE_WAY_ASPECT')
      ? [
          {
            relationshipType: rel.primary,
            planets: lord9 === lord10 ? [lord9] : [lord9, lord10],
            houses: [p9.house, p10.house],
            description: rel.description,
          },
        ]
      : [];

    results.push({
      id: 'YOGA_DHARMA_KARMADHIPATI',
      canonicalName: 'Dharma-Karmadhipati Yoga',
      sanskritName: 'Dharma Karmadhipati Raja Yoga',
      category: 'RAJA',
      isDetected: rel.isAssociated,
      varga: ctx.varga,
      convention: RAJA_SOURCE,
      evidence: {
        conditions,
        involvedPlanets: lord9 === lord10 ? [p9] : [p9, p10],
        involvedHouses: [ctx.houses[9], ctx.houses[10]],
        relationships,
      },
      assessment: buildAssessment(ctx, {
        formed: rel.isAssociated,
        keyPlanets: lord9 === lord10 ? [lord9] : [lord9, lord10],
        relations: rel.primary ? (rel.isAssociated ? rel.relations : ['ONE_WAY_ASPECT']) : [],
        oneWayAspects: rel.oneWayAspects,
        cancellations: lordQualifiers(ctx, lord9 === lord10 ? [lord9] : [lord9, lord10]),
        source: RAJA_SOURCE,
      }),
    });
  }

  // 2. KENDRA-TRIKONA RAJA YOGAS: every kendra lord (1, 4, 7, 10) with every trikona lord (5, 9).
  //    The 10th + 9th pair is reported as Dharma-Karmadhipati above. A single planet owning both
  //    houses is reported as a Yogakaraka (relation OWNERSHIP), never as an association.
  {
    for (const pair of KENDRA_TRIKONA_PAIRS) {
      const pA = ctx.houseLords[pair.hA];
      const pB = ctx.houseLords[pair.hB];
      const rel = lordRelation(ctx, pA, pB, pair.hA, pair.hB);
      if (!rel.isAssociated && rel.primary !== 'ONE_WAY_ASPECT') continue;

      const isOwnership = rel.primary === 'OWNERSHIP';
      const label = `${houseLabel(pair.hA)} + ${houseLabel(pair.hB)}`;
      const keyPlanets = pA === pB ? [pA] : [pA, pB];

      results.push({
        id: `YOGA_RAJA_H${pair.hA}_H${pair.hB}`,
        canonicalName: isOwnership ? `Raja Yoga (Yogakaraka ${pA}: ${label})` : `Raja Yoga (${label})`,
        sanskritName: isOwnership
          ? `Yogakaraka Raja Yoga (H${pair.hA}-H${pair.hB})`
          : `Kendra-Trikona Raja Yoga (H${pair.hA}-H${pair.hB})`,
        category: 'RAJA',
        isDetected: rel.isAssociated,
        varga: ctx.varga,
        convention: isOwnership ? YOGAKARAKA_SOURCE : RAJA_SOURCE,
        evidence: {
          conditions: [
            isOwnership
              ? {
                  id: 'KENDRA_TRIKONA_OWNERSHIP',
                  description: rel.description,
                  satisfied: true,
                  expected: 'One planet owning a kendra and a trikona',
                  observed: rel.description,
                }
              : {
                  id: 'KENDRA_TRIKONA_ASSOCIATION',
                  description: `Lord of H${pair.hA} (${pA}) and Lord of H${pair.hB} (${pB}) related by conjunction, mutual aspect or sign exchange`,
                  satisfied: rel.isAssociated,
                  expected: 'Conjunction, Mutual Aspect or Sign Exchange',
                  observed: rel.description,
                },
          ],
          involvedPlanets: pA === pB ? [ctx.planets[pA]] : [ctx.planets[pA], ctx.planets[pB]],
          involvedHouses: [ctx.houses[pair.hA], ctx.houses[pair.hB]],
          relationships: [
            {
              relationshipType: rel.primary ?? 'CONJUNCTION',
              planets: keyPlanets,
              houses: [ctx.planets[pA].house, ctx.planets[pB].house],
              description: rel.description,
            },
          ],
        },
        assessment: buildAssessment(ctx, {
          formed: rel.isAssociated,
          keyPlanets,
          relations: rel.isAssociated ? rel.relations : ['ONE_WAY_ASPECT'],
          oneWayAspects: rel.oneWayAspects,
          cancellations: lordQualifiers(ctx, keyPlanets),
          source: isOwnership ? YOGAKARAKA_SOURCE : RAJA_SOURCE,
        }),
      });
    }
  }

  // 3. DHANA YOGAS: associations among the lords of 1, 2, 5, 9 and 11 (pairs below).
  //    Single-planet ownership of two dhana houses is NOT reported (no cited source; removed in
  //    the 2026-11 engine fixes, audit 04 §0.5).
  {
    for (const pair of DHANA_PAIRS) {
      const pA = ctx.houseLords[pair.hA];
      const pB = ctx.houseLords[pair.hB];
      if (pA === pB) continue;
      const rel = lordRelation(ctx, pA, pB, pair.hA, pair.hB);
      if (!rel.isAssociated && rel.primary !== 'ONE_WAY_ASPECT') continue;

      results.push({
        id: `YOGA_DHANA_H${pair.hA}_H${pair.hB}`,
        canonicalName: `Dhana Yoga (${pair.label})`,
        sanskritName: `Dhana Yoga (H${pair.hA}-H${pair.hB})`,
        category: 'DHANA',
        isDetected: rel.isAssociated,
        varga: ctx.varga,
        convention: DHANA_SOURCE,
        evidence: {
          conditions: [
            {
              id: 'DHANA_HOUSES_ASSOCIATION',
              description: `Lord of H${pair.hA} (${pA}) and Lord of H${pair.hB} (${pB}) related by conjunction, mutual aspect or sign exchange`,
              satisfied: rel.isAssociated,
              expected: 'Conjunction, Mutual Aspect or Sign Exchange',
              observed: rel.description,
            },
          ],
          involvedPlanets: [ctx.planets[pA], ctx.planets[pB]],
          involvedHouses: [ctx.houses[pair.hA], ctx.houses[pair.hB]],
          relationships: [
            {
              relationshipType: rel.primary ?? 'CONJUNCTION',
              planets: [pA, pB],
              houses: [ctx.planets[pA].house, ctx.planets[pB].house],
              description: rel.description,
            },
          ],
        },
        assessment: buildAssessment(ctx, {
          formed: rel.isAssociated,
          keyPlanets: [pA, pB],
          relations: rel.isAssociated ? rel.relations : ['ONE_WAY_ASPECT'],
          oneWayAspects: rel.oneWayAspects,
          cancellations: lordQualifiers(ctx, [pA, pB]),
          source: DHANA_SOURCE,
        }),
      });
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
      convention: 'Phaladeepika ch. 6 (verify verse); Raman, Three Hundred Important Combinations',
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

