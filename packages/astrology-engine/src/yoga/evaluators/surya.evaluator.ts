import { PlanetSymbol } from '../../planets/planet.types';
import { YogaChartContext, YogaResult, YogaCondition } from '../yoga.types';

const ELIGIBLE_SOLAR_PLANETS = [
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

export function evaluateSuryaYogas(ctx: YogaChartContext): YogaResult[] {
  const results: YogaResult[] = [];
  const sun = ctx.sunPlanet;
  const sunRashi = sun.rashiIndex;

  // 1. BUDHA-ADITYA YOGA
  {
    const mercury = ctx.planets[PlanetSymbol.MERCURY];
    const isConjunct = mercury.rashiIndex === sunRashi;

    const conditions: YogaCondition[] = [
      {
        id: 'SUN_MERCURY_CONJUNCTION',
        description: 'Sun and Mercury must be conjunct in the same sign',
        satisfied: isConjunct,
        expected: 'Sun and Mercury in the same Rashi',
        observed: isConjunct
          ? `Conjunct in ${sun.rashiName} (House ${sun.house})`
          : `Sun in ${sun.rashiName}, Mercury in ${mercury.rashiName}`,
      },
    ];

    const strengthFactors: string[] = [];
    if (isConjunct) {
      if (mercury.isCombust) {
        strengthFactors.push('Mercury is combust by the Sun (within combustion orb).');
      } else {
        strengthFactors.push('Mercury is outside deep combustion degree.');
      }
    }

    results.push({
      id: 'YOGA_BUDHA_ADITYA',
      canonicalName: 'Budha-Aditya Yoga',
      sanskritName: 'Budhaditya Yoga',
      category: 'SURYA',
      isDetected: isConjunct,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 38)',
      evidence: {
        conditions,
        involvedPlanets: [sun, mercury],
        involvedHouses: [ctx.houses[sun.house]],
        relationships: isConjunct
          ? [
              {
                relationshipType: 'CONJUNCTION',
                planets: [PlanetSymbol.SUN, PlanetSymbol.MERCURY],
                houses: [sun.house],
                description: 'Sun and Mercury conjunct in same sign',
              },
            ]
          : [],
        strengthFactors,
      },
    });
  }

  // 2. VESI, VOSI, UBHAYACHARI YOGAS
  {
    const secondFromSunRashi = (sunRashi % 12) + 1;
    const twelfthFromSunRashi = ((sunRashi - 2 + 12) % 12) + 1;

    const planetsIn2nd = ELIGIBLE_SOLAR_PLANETS.filter(
      (p) => ctx.planets[p].rashiIndex === secondFromSunRashi
    );
    const planetsIn12th = ELIGIBLE_SOLAR_PLANETS.filter(
      (p) => ctx.planets[p].rashiIndex === twelfthFromSunRashi
    );

    const has2nd = planetsIn2nd.length > 0;
    const has12th = planetsIn12th.length > 0;

    const isVesi = has2nd && !has12th;
    const isVosi = has12th && !has2nd;
    const isUbhayachari = has2nd && has12th;

    // Vesi
    results.push({
      id: 'YOGA_VESI',
      canonicalName: 'Vesi Yoga',
      sanskritName: 'Vesi Yoga',
      category: 'SURYA',
      isDetected: isVesi,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 38)',
      evidence: {
        conditions: [
          {
            id: 'PLANET_IN_2ND_FROM_SUN',
            description: 'Planets other than Moon/Rahu/Ketu in 2nd house from Sun',
            satisfied: has2nd,
            expected: 'At least one eligible planet in 2nd from Sun',
            observed: planetsIn2nd.join(', ') || 'None',
          },
          {
            id: '12TH_FROM_SUN_EMPTY',
            description: '12th house from Sun must be vacant of eligible planets',
            satisfied: !has12th,
            expected: '0 eligible planets in 12th from Sun',
            observed: planetsIn12th.length,
          },
        ],
        involvedPlanets: [sun, ...planetsIn2nd.map((p) => ctx.planets[p])],
        involvedHouses: [ctx.houses[sun.house]],
        relationships: [],
      },
    });

    // Vosi
    results.push({
      id: 'YOGA_VOSI',
      canonicalName: 'Vosi Yoga',
      sanskritName: 'Vosi Yoga',
      category: 'SURYA',
      isDetected: isVosi,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 38)',
      evidence: {
        conditions: [
          {
            id: 'PLANET_IN_12TH_FROM_SUN',
            description: 'Planets other than Moon/Rahu/Ketu in 12th house from Sun',
            satisfied: has12th,
            expected: 'At least one eligible planet in 12th from Sun',
            observed: planetsIn12th.join(', ') || 'None',
          },
          {
            id: '2ND_FROM_SUN_EMPTY',
            description: '2nd house from Sun must be vacant of eligible planets',
            satisfied: !has2nd,
            expected: '0 eligible planets in 2nd from Sun',
            observed: planetsIn2nd.length,
          },
        ],
        involvedPlanets: [sun, ...planetsIn12th.map((p) => ctx.planets[p])],
        involvedHouses: [ctx.houses[sun.house]],
        relationships: [],
      },
    });

    // Ubhayachari
    results.push({
      id: 'YOGA_UBHAYACHARI',
      canonicalName: 'Ubhayachari Yoga',
      sanskritName: 'Ubhayachari Yoga',
      category: 'SURYA',
      isDetected: isUbhayachari,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 38)',
      evidence: {
        conditions: [
          {
            id: 'PLANETS_IN_BOTH_2ND_AND_12TH_FROM_SUN',
            description: 'Eligible planets in both 2nd and 12th houses from Sun',
            satisfied: isUbhayachari,
            expected: 'Eligible planets in both 2nd and 12th from Sun',
            observed: `2nd: [${planetsIn2nd.join(', ')}], 12th: [${planetsIn12th.join(', ')}]`,
          },
        ],
        involvedPlanets: [sun, ...[...planetsIn2nd, ...planetsIn12th].map((p) => ctx.planets[p])],
        involvedHouses: [ctx.houses[sun.house]],
        relationships: [],
      },
    });
  }

  return results;
}

