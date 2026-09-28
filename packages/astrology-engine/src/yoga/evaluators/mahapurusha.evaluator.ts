import { PlanetSymbol } from '../../planets/planet.types';
import { YogaChartContext, YogaResult, YogaCondition } from '../yoga.types';
import { YogaPredicates } from '../yoga-predicates';

export interface MahapurushaConfig {
  id: string;
  canonicalName: string;
  sanskritName: string;
  planet: PlanetSymbol;
}

const MAHAPURUSHA_YOGAS: MahapurushaConfig[] = [
  { id: 'YOGA_RUCHAKA', canonicalName: 'Ruchaka Yoga', sanskritName: 'Ruchaka Mahapurusha Yoga', planet: PlanetSymbol.MARS },
  { id: 'YOGA_BHADRA', canonicalName: 'Bhadra Yoga', sanskritName: 'Bhadra Mahapurusha Yoga', planet: PlanetSymbol.MERCURY },
  { id: 'YOGA_HAMSA', canonicalName: 'Hamsa Yoga', sanskritName: 'Hamsa Mahapurusha Yoga', planet: PlanetSymbol.JUPITER },
  { id: 'YOGA_MALAVYA', canonicalName: 'Malavya Yoga', sanskritName: 'Malavya Mahapurusha Yoga', planet: PlanetSymbol.VENUS },
  { id: 'YOGA_SHASHA', canonicalName: 'Shasha Yoga', sanskritName: 'Shasha Mahapurusha Yoga', planet: PlanetSymbol.SATURN },
];

export function evaluateMahapurushaYogas(ctx: YogaChartContext): YogaResult[] {
  return MAHAPURUSHA_YOGAS.map((cfg) => {
    const pEvidence = ctx.planets[cfg.planet];
    const isKendra = YogaPredicates.isPlanetInKendra(cfg.planet, ctx);
    const isOwnOrExalted = YogaPredicates.isPlanetInOwnOrExalted(cfg.planet, ctx);
    const isDetected = isKendra && isOwnOrExalted;

    const conditions: YogaCondition[] = [
      {
        id: 'PLANET_IN_KENDRA',
        description: `${cfg.planet} must occupy a Kendra house (1, 4, 7, 10) from Lagna`,
        satisfied: isKendra,
        expected: '1, 4, 7, or 10',
        observed: pEvidence.house,
      },
      {
        id: 'PLANET_IN_OWN_OR_EXALTED_SIGN',
        description: `${cfg.planet} must be in own sign, moolatrikona, or exaltation sign`,
        satisfied: isOwnOrExalted,
        expected: 'EXALTED | OWN_SIGN | MOOLATRIKONA',
        observed: pEvidence.dignity,
      },
    ];

    const strengthFactors: string[] = [];
    if (isDetected) {
      if (pEvidence.isCombust) strengthFactors.push('Planet is combust, weakening the manifestation of Mahapurusha Yoga.');
      if (pEvidence.isRetrograde) strengthFactors.push('Planet is retrograde (Cheshta Bala enhanced).');
      if (pEvidence.dignity === 'EXALTED') strengthFactors.push('Planet is exalted (highest Sthana Bala).');
    }

    const houseEvidence = ctx.houses[pEvidence.house];

    return {
      id: cfg.id,
      canonicalName: cfg.canonicalName,
      sanskritName: cfg.sanskritName,
      category: 'MAHAPURUSHA',
      isDetected,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 75)',
      evidence: {
        conditions,
        involvedPlanets: [pEvidence],
        involvedHouses: houseEvidence ? [houseEvidence] : [],
        relationships: [],
        strengthFactors,
      },
    };
  });
}

