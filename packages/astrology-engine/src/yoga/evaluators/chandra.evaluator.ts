import { PlanetSymbol } from '../../planets/planet.types';
import { YogaChartContext, YogaResult, YogaCondition, YogaRelationshipEvidence } from '../yoga.types';
import { YogaPredicates } from '../yoga-predicates';
import { buildAssessment, occupantVariant } from '../yoga-assessment';

const GAJAKESARI_SOURCE =
  'Phaladeepika ch. 6 and Raman, Three Hundred Important Combinations: Jupiter in a kendra from the Moon. ' +
  'BPHS ch. 36 qualifiers (Santhanam numbering; verify verses) reported as flags, not applied';
const LUNAR_SOURCE = 'Classical Parashari (BPHS ch. 37, Santhanam numbering)';

const ELIGIBLE_LUNAR_PLANETS = [
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

export function evaluateChandraYogas(ctx: YogaChartContext): YogaResult[] {
  const results: YogaResult[] = [];
  const moon = ctx.moonPlanet;
  const moonRashi = moon.rashiIndex;

  // 1. GAJAKESARI YOGA
  {
    const jupiter = ctx.planets[PlanetSymbol.JUPITER];
    const jupHouseFromMoon = YogaPredicates.getHouseFromMoon(PlanetSymbol.JUPITER, ctx);
    const isKendraFromMoon = jupHouseFromMoon === 1 || jupHouseFromMoon === 4 || jupHouseFromMoon === 7 || jupHouseFromMoon === 10;

    const conditions: YogaCondition[] = [
      {
        id: 'JUPITER_KENDRA_FROM_MOON',
        description: 'Jupiter must be in a Kendra house (1, 4, 7, 10) from the natal Moon',
        satisfied: isKendraFromMoon,
        expected: '1, 4, 7, or 10',
        observed: jupHouseFromMoon,
      },
    ];

    const relationships: YogaRelationshipEvidence[] = isKendraFromMoon
      ? [
          {
            relationshipType: 'KENDRA_RELATION',
            planets: [PlanetSymbol.MOON, PlanetSymbol.JUPITER],
            houses: [moon.house, jupiter.house],
            description: `Jupiter in ${jupHouseFromMoon}th house from Moon`,
          },
        ]
      : [];

    results.push({
      id: 'YOGA_GAJAKESARI',
      canonicalName: 'Gajakesari Yoga',
      sanskritName: 'Gaja Kesari Yoga',
      category: 'CHANDRA',
      isDetected: isKendraFromMoon,
      varga: ctx.varga,
      convention: GAJAKESARI_SOURCE,
      evidence: {
        conditions,
        involvedPlanets: [moon, jupiter],
        involvedHouses: [ctx.houses[moon.house], ctx.houses[jupiter.house]],
        relationships,
      },
      assessment: buildAssessment(ctx, {
        formed: isKendraFromMoon,
        keyPlanets: [PlanetSymbol.MOON, PlanetSymbol.JUPITER],
        cancellations: [
          {
            id: 'BPHS_JUPITER_DEBILITATED',
            description: 'Jupiter debilitated (BPHS qualifier: the yoga requires Jupiter not debilitated)',
            satisfied: jupiter.dignity === 'DEBILITATED',
            observed: jupiter.dignity,
            source: 'BPHS ch. 36 (Santhanam numbering; verify verse)',
            provisional: true,
          },
          {
            id: 'BPHS_JUPITER_COMBUST',
            description: 'Jupiter combust (BPHS qualifier: the yoga requires Jupiter not combust)',
            satisfied: jupiter.isCombust,
            observed: jupiter.isCombust ? 'combust' : 'not combust',
            source: 'BPHS ch. 36 (Santhanam numbering; verify verse)',
            provisional: true,
          },
          {
            id: 'BPHS_JUPITER_ENEMY_SIGN',
            description: "Jupiter in an enemy's sign (BPHS qualifier: the yoga requires Jupiter not in an enemy sign); compound relationship with the sign lord",
            satisfied: jupiter.dignity === 'ENEMY' || jupiter.dignity === 'GREAT_ENEMY',
            observed: jupiter.dignity,
            source: 'BPHS ch. 36 (Santhanam numbering; verify verse)',
            provisional: true,
          },
          {
            id: 'BPHS_KENDRA_FROM_LAGNA',
            description: 'Jupiter also in a kendra from the Lagna (BPHS form allows Lagna or Moon as reference)',
            satisfied: YogaPredicates.isPlanetInKendra(PlanetSymbol.JUPITER, ctx),
            observed: `Jupiter in house ${jupiter.house} from the Lagna`,
            source: 'BPHS ch. 36 (Santhanam numbering; verify verse)',
            provisional: true,
          },
        ],
        notes: [
          'The three BPHS qualifiers are disqualifying conditions when satisfied; they are reported, not applied to isDetected (pending client choice of the BPHS or Phaladeepika form).',
        ],
        source: GAJAKESARI_SOURCE,
      }),
    });
  }

  // 2. SUNAPHA, ANAPHA, DURUDHARA YOGAS
  {
    const secondFromMoonRashi = ((moonRashi) % 12) + 1;
    const twelfthFromMoonRashi = ((moonRashi - 2 + 12) % 12) + 1;

    const planetsIn2nd = ELIGIBLE_LUNAR_PLANETS.filter(
      (p) => ctx.planets[p].rashiIndex === secondFromMoonRashi
    );
    const planetsIn12th = ELIGIBLE_LUNAR_PLANETS.filter(
      (p) => ctx.planets[p].rashiIndex === twelfthFromMoonRashi
    );

    const has2nd = planetsIn2nd.length > 0;
    const has12th = planetsIn12th.length > 0;

    const isSunapha = has2nd && !has12th;
    const isAnapha = has12th && !has2nd;
    const isDurudhara = has2nd && has12th;

    // Sunapha
    results.push({
      id: 'YOGA_SUNAPHA',
      canonicalName: 'Sunapha Yoga',
      sanskritName: 'Sunapha Yoga',
      category: 'CHANDRA',
      isDetected: isSunapha,
      varga: ctx.varga,
      convention: LUNAR_SOURCE,
      evidence: {
        conditions: [
          {
            id: 'PLANET_IN_2ND_FROM_MOON',
            description: 'Planets other than Sun/Rahu/Ketu in 2nd house from Moon',
            satisfied: has2nd,
            expected: 'At least one eligible planet in 2nd from Moon',
            observed: planetsIn2nd.join(', ') || 'None',
          },
          {
            id: '12TH_FROM_MOON_EMPTY',
            description: '12th house from Moon must be vacant of eligible planets',
            satisfied: !has12th,
            expected: '0 eligible planets in 12th from Moon',
            observed: planetsIn12th.length,
          },
        ],
        involvedPlanets: [moon, ...planetsIn2nd.map((p) => ctx.planets[p])],
        involvedHouses: [ctx.houses[moon.house]],
        relationships: [],
      },
      assessment: buildAssessment(ctx, {
        formed: isSunapha,
        keyPlanets: [PlanetSymbol.MOON, ...planetsIn2nd],
        variant: occupantVariant(planetsIn2nd),
        notes: ['variant: natural benefics Jupiter, Venus, Mercury vs malefics Mars, Saturn among the occupants (BPHS ch. 37; Saravali, verify)'],
        source: LUNAR_SOURCE,
      }),
    });

    // Anapha
    results.push({
      id: 'YOGA_ANAPHA',
      canonicalName: 'Anapha Yoga',
      sanskritName: 'Anapha Yoga',
      category: 'CHANDRA',
      isDetected: isAnapha,
      varga: ctx.varga,
      convention: LUNAR_SOURCE,
      evidence: {
        conditions: [
          {
            id: 'PLANET_IN_12TH_FROM_MOON',
            description: 'Planets other than Sun/Rahu/Ketu in 12th house from Moon',
            satisfied: has12th,
            expected: 'At least one eligible planet in 12th from Moon',
            observed: planetsIn12th.join(', ') || 'None',
          },
          {
            id: '2ND_FROM_MOON_EMPTY',
            description: '2nd house from Moon must be vacant of eligible planets',
            satisfied: !has2nd,
            expected: '0 eligible planets in 2nd from Moon',
            observed: planetsIn2nd.length,
          },
        ],
        involvedPlanets: [moon, ...planetsIn12th.map((p) => ctx.planets[p])],
        involvedHouses: [ctx.houses[moon.house]],
        relationships: [],
      },
      assessment: buildAssessment(ctx, {
        formed: isAnapha,
        keyPlanets: [PlanetSymbol.MOON, ...planetsIn12th],
        variant: occupantVariant(planetsIn12th),
        notes: ['variant: natural benefics Jupiter, Venus, Mercury vs malefics Mars, Saturn among the occupants (BPHS ch. 37; Saravali, verify)'],
        source: LUNAR_SOURCE,
      }),
    });

    // Durudhara
    results.push({
      id: 'YOGA_DURUDHARA',
      canonicalName: 'Durudhara Yoga',
      sanskritName: 'Durudhara Yoga',
      category: 'CHANDRA',
      isDetected: isDurudhara,
      varga: ctx.varga,
      convention: LUNAR_SOURCE,
      evidence: {
        conditions: [
          {
            id: 'PLANETS_IN_BOTH_2ND_AND_12TH',
            description: 'Eligible planets in both 2nd and 12th houses from Moon',
            satisfied: isDurudhara,
            expected: 'Eligible planets in both 2nd and 12th from Moon',
            observed: `2nd: [${planetsIn2nd.join(', ')}], 12th: [${planetsIn12th.join(', ')}]`,
          },
        ],
        involvedPlanets: [moon, ...[...planetsIn2nd, ...planetsIn12th].map((p) => ctx.planets[p])],
        involvedHouses: [ctx.houses[moon.house]],
        relationships: [],
      },
      assessment: buildAssessment(ctx, {
        formed: isDurudhara,
        keyPlanets: [PlanetSymbol.MOON, ...[...planetsIn2nd, ...planetsIn12th]],
        variant: occupantVariant([...planetsIn2nd, ...planetsIn12th]),
        notes: ['variant: natural benefics Jupiter, Venus, Mercury vs malefics Mars, Saturn among the occupants (BPHS ch. 37; Saravali, verify)'],
        source: LUNAR_SOURCE,
      }),
    });
  }

  // 3. KEMADRUMA YOGA & CANCELLATION
  {
    const secondFromMoonRashi = ((moonRashi) % 12) + 1;
    const twelfthFromMoonRashi = ((moonRashi - 2 + 12) % 12) + 1;

    const planetsIn2nd = ELIGIBLE_LUNAR_PLANETS.filter(
      (p) => ctx.planets[p].rashiIndex === secondFromMoonRashi
    );
    const planetsIn12th = ELIGIBLE_LUNAR_PLANETS.filter(
      (p) => ctx.planets[p].rashiIndex === twelfthFromMoonRashi
    );
    const planetsConjunctMoon = ELIGIBLE_LUNAR_PLANETS.filter(
      (p) => ctx.planets[p].rashiIndex === moonRashi
    );

    const baseConditionSatisfied =
      planetsIn2nd.length === 0 &&
      planetsIn12th.length === 0 &&
      planetsConjunctMoon.length === 0;

    // Cancellations:
    // 1. Any planet in Kendra from Lagna
    const planetsInLagnaKendra = ELIGIBLE_LUNAR_PLANETS.filter((p) =>
      YogaPredicates.isPlanetInKendra(p, ctx)
    );
    // 2. Any planet in Kendra from Moon
    const planetsInMoonKendra = ELIGIBLE_LUNAR_PLANETS.filter((p) =>
      YogaPredicates.isKendraFromMoon(p, ctx)
    );

    const isCancelled = planetsInLagnaKendra.length > 0 || planetsInMoonKendra.length > 0;
    const isDetected = baseConditionSatisfied && !isCancelled;

    const conditions: YogaCondition[] = [
      {
        id: 'NO_PLANETS_2ND_OR_12TH_OR_CONJUNCT',
        description: 'No eligible planets (excluding Sun/Rahu/Ketu) in 2nd, 12th, or conjunct Moon',
        satisfied: baseConditionSatisfied,
        expected: '0 planets in 2nd, 12th, or conjunct Moon',
        observed: `2nd: ${planetsIn2nd.length}, 12th: ${planetsIn12th.length}, Conjunct: ${planetsConjunctMoon.length}`,
      },
      {
        id: 'KEMADRUMA_CANCELLATION',
        description: 'Kemadruma Bhanga (cancellation): a planet occupies a kendra from the Lagna or from the Moon. satisfied = cancellation holds',
        satisfied: isCancelled,
        expected: 'At least one planet (Mars..Saturn) in a kendra from the Lagna or from the Moon',
        observed: isCancelled
          ? `Cancelled by: Lagna Kendras [${planetsInLagnaKendra.join(', ')}], Moon Kendras [${planetsInMoonKendra.join(', ')}]`
          : 'No cancellation',
      },
    ];

    results.push({
      id: 'YOGA_KEMADRUMA',
      canonicalName: 'Kemadruma Yoga',
      sanskritName: 'Kemadruma Yoga',
      category: 'CHANDRA',
      isDetected,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS ch. 37, Santhanam numbering) with Kemadruma Bhanga (Phaladeepika ch. 6)',
      evidence: {
        conditions,
        involvedPlanets: [moon],
        involvedHouses: [ctx.houses[moon.house]],
        relationships: [],
        strengthFactors: isCancelled ? ['Kemadruma is cancelled (Kemadruma Bhanga).'] : [],
      },
      assessment: buildAssessment(ctx, {
        formed: baseConditionSatisfied,
        cancelled: baseConditionSatisfied && isCancelled,
        keyPlanets: [PlanetSymbol.MOON],
        cancellations: [
          {
            id: 'KEMADRUMA_BHANGA_KENDRA_FROM_LAGNA',
            description: 'A planet (Mars..Saturn) in a kendra from the Lagna',
            satisfied: planetsInLagnaKendra.length > 0,
            observed: planetsInLagnaKendra.join(', ') || 'None',
            source: 'Phaladeepika ch. 6; BPHS ch. 37 (Santhanam numbering; verify verse)',
            provisional: true,
          },
          {
            id: 'KEMADRUMA_BHANGA_KENDRA_FROM_MOON',
            description: 'A planet (Mars..Saturn) in a kendra from the Moon',
            satisfied: planetsInMoonKendra.length > 0,
            observed: planetsInMoonKendra.join(', ') || 'None',
            source: 'Phaladeepika ch. 6; BPHS ch. 37 (Santhanam numbering; verify verse)',
            provisional: true,
          },
        ],
        notes: [
          'isDetected is false when the yoga is cancelled; a formed-but-cancelled Kemadruma is listed in YogaEvaluationReport.formedButCancelledYogas.',
        ],
        source: LUNAR_SOURCE,
      }),
    });
  }

  // 4. ADHI YOGA (CHANDRADHI YOGA)
  {
    const h6Rashi = ((moonRashi + 5) % 12) + 1;
    const h7Rashi = ((moonRashi + 6) % 12) + 1;
    const h8Rashi = ((moonRashi + 7) % 12) + 1;

    const benefics = [PlanetSymbol.MERCURY, PlanetSymbol.VENUS, PlanetSymbol.JUPITER];
    const beneficsIn6 = benefics.filter((b) => ctx.planets[b].rashiIndex === h6Rashi);
    const beneficsIn7 = benefics.filter((b) => ctx.planets[b].rashiIndex === h7Rashi);
    const beneficsIn8 = benefics.filter((b) => ctx.planets[b].rashiIndex === h8Rashi);

    const totalBeneficsIn678 = [...beneficsIn6, ...beneficsIn7, ...beneficsIn8];
    const isDetected = totalBeneficsIn678.length >= 2; // Classical requirement: multiple benefics in 6, 7, 8 from Moon

    results.push({
      id: 'YOGA_CHANDRADHI',
      canonicalName: 'Adhi Yoga (Chandradhi)',
      sanskritName: 'Chandradhi Yoga',
      category: 'CHANDRA',
      isDetected,
      varga: ctx.varga,
      convention: 'Phaladeepika ch. 6 and Raman, Three Hundred Important Combinations; BPHS ch. 37 (verify). Threshold of 2+ benefics is a provisional convention',
      evidence: {
        conditions: [
          {
            id: 'BENEFICS_IN_6_7_8_FROM_MOON',
            description: 'Natural benefics (Jupiter, Venus, Mercury) situated in 6th, 7th, or 8th houses from Moon',
            satisfied: isDetected,
            expected: 'Benefics in 6, 7, 8 from Moon',
            observed: `6th: [${beneficsIn6.join(', ')}], 7th: [${beneficsIn7.join(', ')}], 8th: [${beneficsIn8.join(', ')}]`,
          },
        ],
        involvedPlanets: [moon, ...totalBeneficsIn678.map((p) => ctx.planets[p])],
        involvedHouses: [ctx.houses[moon.house]],
        relationships: [],
      },
    });
  }

  // 5. CHANDRA-MANGALA YOGA
  {
    const isConjunctMars = ctx.planets[PlanetSymbol.MARS].rashiIndex === moonRashi;
    results.push({
      id: 'YOGA_CHANDRA_MANGALA',
      canonicalName: 'Chandra-Mangala Yoga',
      sanskritName: 'Chandra Mangala Yoga',
      category: 'CHANDRA',
      isDetected: isConjunctMars,
      varga: ctx.varga,
      convention: 'Raman, Three Hundred Important Combinations (Chandra-Mangala: Moon conjoined with Mars)',
      evidence: {
        conditions: [
          {
            id: 'MOON_MARS_CONJUNCTION',
            description: 'Moon and Mars must be conjunct in the same sign',
            satisfied: isConjunctMars,
            expected: 'Moon and Mars in identical sign',
            observed: isConjunctMars
              ? `Conjunct in ${moon.rashiName}`
              : `Moon in ${moon.rashiName}, Mars in ${ctx.planets[PlanetSymbol.MARS].rashiName}`,
          },
        ],
        involvedPlanets: [moon, ctx.planets[PlanetSymbol.MARS]],
        involvedHouses: [ctx.houses[moon.house]],
        relationships: isConjunctMars
          ? [
              {
                relationshipType: 'CONJUNCTION',
                planets: [PlanetSymbol.MOON, PlanetSymbol.MARS],
                houses: [moon.house],
                description: 'Moon and Mars conjunct in the same sign',
              },
            ]
          : [],
      },
    });
  }

  // 6. AMALA YOGA (from Moon or Lagna)
  {
    const h10FromLagna = ctx.houses[10];
    const h10FromMoonRashi = ((moonRashi + 9) % 12) + 1;
    const benefics = [PlanetSymbol.JUPITER, PlanetSymbol.VENUS, PlanetSymbol.MERCURY];

    const beneficsIn10FromLagna = benefics.filter((b) => ctx.planets[b].house === 10);
    const beneficsIn10FromMoon = benefics.filter((b) => ctx.planets[b].rashiIndex === h10FromMoonRashi);

    const isDetected = beneficsIn10FromLagna.length > 0 || beneficsIn10FromMoon.length > 0;

    results.push({
      id: 'YOGA_AMALA',
      canonicalName: 'Amala Yoga',
      sanskritName: 'Amala Yoga',
      category: 'CHANDRA',
      isDetected,
      varga: ctx.varga,
      convention: 'Phaladeepika ch. 6; BPHS ch. 36 (Santhanam numbering; verify verse)',
      evidence: {
        conditions: [
          {
            id: 'BENEFIC_IN_10TH_FROM_LAGNA_OR_MOON',
            description: 'Natural benefic (Jupiter, Venus, Mercury) occupying the 10th house from Lagna or Moon',
            satisfied: isDetected,
            expected: 'At least one benefic in 10th house from Lagna or Moon',
            observed: `From Lagna: [${beneficsIn10FromLagna.join(', ')}], From Moon: [${beneficsIn10FromMoon.join(', ')}]`,
          },
        ],
        involvedPlanets: [
          ...beneficsIn10FromLagna.map((p) => ctx.planets[p]),
          ...beneficsIn10FromMoon.map((p) => ctx.planets[p]),
        ],
        involvedHouses: [h10FromLagna],
        relationships: [],
      },
    });
  }

  return results;
}

