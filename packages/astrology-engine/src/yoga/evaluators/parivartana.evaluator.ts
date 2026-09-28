import { YogaChartContext, YogaResult, YogaCondition, YogaRelationshipEvidence } from '../yoga.types';

export function evaluateParivartanaYogas(ctx: YogaChartContext): YogaResult[] {
  const results: YogaResult[] = [];

  for (const ex of ctx.signExchanges) {
    const pA = ctx.planets[ex.planetA];
    const pB = ctx.planets[ex.planetB];

    const isMaha = ex.exchangeType === 'MAHA';
    const isDainya = ex.exchangeType === 'DAINYA';
    const isKhala = ex.exchangeType === 'KHALA';

    let yogaId = `YOGA_PARIVARTANA_${ex.planetA}_${ex.planetB}`;
    let canonicalName = `Parivartana Yoga (${ex.planetA}-${ex.planetB})`;
    let sanskritName = `Parivartana Yoga (${ex.exchangeType})`;

    if (isMaha) {
      yogaId = `YOGA_MAHA_PARIVARTANA_${ex.planetA}_${ex.planetB}`;
      canonicalName = `Maha Parivartana Yoga (${ex.planetA}-${ex.planetB})`;
      sanskritName = `Maha Yoga (House ${ex.houseA} & House ${ex.houseB})`;
    } else if (isDainya) {
      yogaId = `YOGA_DAINYA_PARIVARTANA_${ex.planetA}_${ex.planetB}`;
      canonicalName = `Dainya Parivartana Yoga (${ex.planetA}-${ex.planetB})`;
      sanskritName = `Dainya Yoga (House ${ex.houseA} & House ${ex.houseB})`;
    } else if (isKhala) {
      yogaId = `YOGA_KHALA_PARIVARTANA_${ex.planetA}_${ex.planetB}`;
      canonicalName = `Khala Parivartana Yoga (${ex.planetA}-${ex.planetB})`;
      sanskritName = `Khala Yoga (House ${ex.houseA} & House ${ex.houseB})`;
    }

    const conditions: YogaCondition[] = [
      {
        id: 'SIGN_EXCHANGE',
        description: `${ex.planetA} occupies sign of ${ex.planetB} and ${ex.planetB} occupies sign of ${ex.planetA}`,
        satisfied: true,
        expected: 'Mutual planetary sign ruler exchange',
        observed: `${ex.planetA} in ${pA.rashiName} (ruled by ${ex.planetB}), ${ex.planetB} in ${pB.rashiName} (ruled by ${ex.planetA})`,
      },
      {
        id: 'EXCHANGE_TYPE_CLASSIFICATION',
        description: `Exchange between House ${ex.houseA} and House ${ex.houseB} classified as ${ex.exchangeType} Yoga`,
        satisfied: true,
        expected: ex.exchangeType,
        observed: `House ${ex.houseA} <-> House ${ex.houseB}`,
      },
    ];

    const relationships: YogaRelationshipEvidence[] = [
      {
        relationshipType: 'SIGN_EXCHANGE',
        planets: [ex.planetA, ex.planetB],
        houses: [ex.houseA, ex.houseB],
        description: `Sign exchange between ${ex.planetA} (in H${ex.houseA}) and ${ex.planetB} (in H${ex.houseB})`,
      },
    ];

    results.push({
      id: yogaId,
      canonicalName,
      sanskritName,
      category: 'PARIVARTANA',
      isDetected: true,
      varga: ctx.varga,
      convention: 'Classical Parashari & Phaladeepika (Ch. 6)',
      evidence: {
        conditions,
        involvedPlanets: [pA, pB],
        involvedHouses: [ctx.houses[ex.houseA], ctx.houses[ex.houseB]],
        relationships,
      },
    });
  }

  // If no exchanges exist, emit a generic undetected archetype for inspection
  if (results.length === 0) {
    results.push({
      id: 'YOGA_PARIVARTANA_GENERIC',
      canonicalName: 'Parivartana Yoga',
      sanskritName: 'Parivartana Yoga',
      category: 'PARIVARTANA',
      isDetected: false,
      varga: ctx.varga,
      convention: 'Classical Parashari & Phaladeepika (Ch. 6)',
      evidence: {
        conditions: [
          {
            id: 'SIGN_EXCHANGE',
            description: 'Mutual sign exchange between two planets',
            satisfied: false,
            expected: 'Mutual sign exchange',
            observed: 'No planetary sign exchanges detected',
          },
        ],
        involvedPlanets: [],
        involvedHouses: [],
        relationships: [],
      },
    });
  }

  return results;
}

