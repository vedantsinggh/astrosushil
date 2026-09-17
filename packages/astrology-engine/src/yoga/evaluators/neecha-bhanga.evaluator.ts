import { PlanetSymbol } from '../../planets/planet.types';
import { RASHIS } from '../../zodiac/rashi';
import { YogaChartContext, YogaResult, YogaCondition } from '../yoga.types';
import { YogaPredicates } from '../yoga-predicates';

interface DebilitationRule {
  planet: PlanetSymbol;
  debilitationRashi: number;
  exaltationRashi: number;
}

const DEBILITATION_RULES: DebilitationRule[] = [
  { planet: PlanetSymbol.SUN, debilitationRashi: 7, exaltationRashi: 1 },
  { planet: PlanetSymbol.MOON, debilitationRashi: 8, exaltationRashi: 2 },
  { planet: PlanetSymbol.MARS, debilitationRashi: 4, exaltationRashi: 10 },
  { planet: PlanetSymbol.MERCURY, debilitationRashi: 12, exaltationRashi: 6 },
  { planet: PlanetSymbol.JUPITER, debilitationRashi: 10, exaltationRashi: 4 },
  { planet: PlanetSymbol.VENUS, debilitationRashi: 6, exaltationRashi: 12 },
  { planet: PlanetSymbol.SATURN, debilitationRashi: 1, exaltationRashi: 7 },
];

export function evaluateNeechaBhangaYogas(ctx: YogaChartContext): YogaResult[] {
  const results: YogaResult[] = [];

  for (const rule of DEBILITATION_RULES) {
    const pEvidence = ctx.planets[rule.planet];
    const isDebilitated = pEvidence.rashiIndex === rule.debilitationRashi;

    // Even if not debilitated, we evaluate the conditions deterministically
    const debSignLord = RASHIS[rule.debilitationRashi - 1].ruler as PlanetSymbol;
    const exSignLord = RASHIS[rule.exaltationRashi - 1].ruler as PlanetSymbol;

    const debLordEvidence = ctx.planets[debSignLord];
    const exLordEvidence = ctx.planets[exSignLord];

    // Condition 1: Lord of debilitation sign in Kendra from Lagna
    const isDebLordInLagnaKendra = YogaPredicates.isPlanetInKendra(debSignLord, ctx);

    // Condition 2: Lord of debilitation sign in Kendra from Moon
    const isDebLordInMoonKendra = YogaPredicates.isKendraFromMoon(debSignLord, ctx);

    // Condition 3: Lord of planet's exaltation sign in Kendra from Lagna
    const isExLordInLagnaKendra = YogaPredicates.isPlanetInKendra(exSignLord, ctx);

    // Condition 4: Lord of planet's exaltation sign in Kendra from Moon
    const isExLordInMoonKendra = YogaPredicates.isKendraFromMoon(exSignLord, ctx);

    // Condition 5: Debilitated planet conjunct an exalted planet
    const conjunctPlanets = ctx.conjunctions.get(rule.planet) || [];
    const hasExaltedConjunct = conjunctPlanets.some((cp) => ctx.planets[cp]?.dignity === 'EXALTED');

    const hasAnyCancellation =
      isDebLordInLagnaKendra ||
      isDebLordInMoonKendra ||
      isExLordInLagnaKendra ||
      isExLordInMoonKendra ||
      hasExaltedConjunct;

    const isDetected = isDebilitated && hasAnyCancellation;

    const conditions: YogaCondition[] = [
      {
        id: 'PLANET_DEBILITATED',
        description: `${rule.planet} is situated in its debilitation sign (${RASHIS[rule.debilitationRashi - 1].englishName})`,
        satisfied: isDebilitated,
        expected: `Rashi ${rule.debilitationRashi} (${RASHIS[rule.debilitationRashi - 1].englishName})`,
        observed: `Rashi ${pEvidence.rashiIndex} (${pEvidence.rashiName})`,
      },
      {
        id: 'DEB_SIGN_LORD_KENDRA_LAGNA',
        description: `Lord of debilitation sign (${debSignLord}) is in Kendra from Lagna`,
        satisfied: isDebLordInLagnaKendra,
        expected: '1, 4, 7, 10 from Lagna',
        observed: debLordEvidence.house,
      },
      {
        id: 'DEB_SIGN_LORD_KENDRA_MOON',
        description: `Lord of debilitation sign (${debSignLord}) is in Kendra from Moon`,
        satisfied: isDebLordInMoonKendra,
        expected: '1, 4, 7, 10 from Moon',
        observed: YogaPredicates.getHouseFromMoon(debSignLord, ctx),
      },
      {
        id: 'EX_SIGN_LORD_KENDRA_LAGNA',
        description: `Lord of exaltation sign (${exSignLord}) is in Kendra from Lagna`,
        satisfied: isExLordInLagnaKendra,
        expected: '1, 4, 7, 10 from Lagna',
        observed: exLordEvidence.house,
      },
      {
        id: 'EX_SIGN_LORD_KENDRA_MOON',
        description: `Lord of exaltation sign (${exSignLord}) is in Kendra from Moon`,
        satisfied: isExLordInMoonKendra,
        expected: '1, 4, 7, 10 from Moon',
        observed: YogaPredicates.getHouseFromMoon(exSignLord, ctx),
      },
      {
        id: 'CONJUNCT_EXALTED_PLANET',
        description: `${rule.planet} is conjunct an exalted planet`,
        satisfied: hasExaltedConjunct,
        expected: 'Conjunct exalted planet',
        observed: conjunctPlanets.map((p) => `${p} (${ctx.planets[p].dignity})`).join(', ') || 'None',
      },
    ];

    const strengthFactors: string[] = [];
    if (isDetected) {
      if (isDebLordInLagnaKendra || isExLordInLagnaKendra) {
        strengthFactors.push('Cancellation via Lagna Kendra creates primary Neecha Bhanga Raja Yoga.');
      }
      if (isDebLordInMoonKendra || isExLordInMoonKendra) {
        strengthFactors.push('Cancellation via Chandra Lagna Kendra strengthens royal/prosperous indications.');
      }
    }

    results.push({
      id: `YOGA_NEECHA_BHANGA_${rule.planet}`,
      canonicalName: `Neecha Bhanga Raja Yoga (${rule.planet})`,
      sanskritName: `Neecha Bhanga Raja Yoga - ${rule.planet}`,
      category: 'NEECHA_BHANGA',
      isDetected,
      varga: ctx.varga,
      convention: 'Classical Parashari & Phaladeepika (BPHS Ch. 41)',
      evidence: {
        conditions,
        involvedPlanets: [pEvidence, debLordEvidence, exLordEvidence],
        involvedHouses: [
          ctx.houses[pEvidence.house],
          ctx.houses[debLordEvidence.house],
          ctx.houses[exLordEvidence.house],
        ],
        relationships: [],
        strengthFactors,
      },
    });
  }

  return results;
}

