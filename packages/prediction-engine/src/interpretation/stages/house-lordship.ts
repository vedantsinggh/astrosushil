/**
 * S3 house lordship: one `HouseAssessment` per whole-sign house 1–12. Facts plus condition codes only.
 *
 *   - the lord's placement category (kendra / trikona / dusthana / upachaya; definitional) and
 *     whether the lord is in its own house;
 *   - the lord's condition: a pointer to the S2 `PlanetCondition` (not duplicated);
 *   - occupants, and the functional nature of each occupant (from S2);
 *   - planets aspecting the house (engine `aspectsCast`: 7th for all; Mars 4/8, Jupiter 5/9,
 *     Saturn 3/10; Rahu/Ketu 5/9 by the engine's Phaladeepika convention);
 *   - Sarvashtakavarga bindus of the house sign vs the BPHS 28-bindu average (above/at/below);
 *   - the dispositor chain from the lord (lord → lord of its sign → … until a planet in its own
 *     sign or a repeat).
 */
import type { InterpretationInput } from '../input';
import type { RunS3HouseLordship } from '../stages';
import {
  type ConditionCode,
  type ConditionDirection,
  type ConditionEntry,
  type HouseAssessment,
  type HouseCategory,
  type InterpretationRule,
  type PlanetCondition,
  type PlanetName,
  type SavAssessment,
} from '../types';
import { byPlanetOrder, houseCategoriesOf, pickFact, planetKey, planetNameOf, ruleRef, signLordName, signName, uniqueSorted } from '../util/count';

export const RULE_S3_LORD_PLACEMENT: InterpretationRule = {
  id: 'INT-S3-001',
  version: '1.0.0',
  stage: 'S3',
  status: 'approved',
  sources: [
    'BPHS ch. 11 / Laghu Parashari ch. 1 (house categories)',
    'BPHS ch. 24 (effects of house lords placed in the houses; Santhanam numbering, verify)',
  ],
  requiredFacts: ['house.*.d1.lord', 'house.*.d1.lord-house'],
  description:
    'Category of the house occupied by a house lord: kendra, trikona and own house support; dusthana challenges; upachaya and other (2nd) are context.',
};

export const RULE_S3_OCCUPANTS: InterpretationRule = {
  id: 'INT-S3-002',
  version: '1.0.0',
  stage: 'S3',
  status: 'provisional',
  sources: ['BPHS ch. 34 / Laghu Parashari ch. 2 (functional nature of the occupant)'],
  requiredFacts: ['house.*.d1.occupants'],
  description: 'Occupants of a house and their functional nature (favourable/Yogakaraka support, challenging challenges); occupied/empty is context.',
};

export const RULE_S3_ASPECTS: InterpretationRule = {
  id: 'INT-S3-003',
  version: '1.0.0',
  stage: 'S3',
  status: 'provisional',
  sources: ['BPHS ch. 26 (graha drishti incl. special aspects of Mars, Jupiter, Saturn)', 'Phaladeepika (Rahu/Ketu 5th/9th; engine convention)'],
  requiredFacts: ['planet.*.d1.house'],
  description: 'Planets aspecting a house (engine aspectsCast) and their functional nature; aspected / not aspected is context.',
};

export const RULE_S3_SAV: InterpretationRule = {
  id: 'INT-S3-004',
  version: '1.0.0',
  stage: 'S3',
  status: 'approved',
  decisionRef: 'CAR-006',
  sources: ['BPHS Ashtakavarga chapters (SAV total 337; average 28 bindus per sign)', 'CAR-006 (28-bindu benchmark)'],
  requiredFacts: ['sav.house.*'],
  description: 'Natal Sarvashtakavarga bindus of the house sign vs 28: above supports, below challenges, at 28 is context.',
};

export const RULE_S3_DISPOSITOR: InterpretationRule = {
  id: 'INT-S3-005',
  version: '1.0.0',
  stage: 'S3',
  status: 'approved',
  sources: ['Definitional: the dispositor is the lord of the sign a planet occupies (BPHS ch. 3 sign rulers)'],
  requiredFacts: ['planet.*.d1.sign'],
  description: 'Dispositor chain from the house lord (fact only, no condition).',
};

export const S3_HOUSE_LORDSHIP_RULES: readonly InterpretationRule[] = [
  RULE_S3_LORD_PLACEMENT,
  RULE_S3_OCCUPANTS,
  RULE_S3_ASPECTS,
  RULE_S3_SAV,
  RULE_S3_DISPOSITOR,
];

/** BPHS average bindus per sign (337 / 12 ≈ 28). */
export const SAV_BENCHMARK = 28 as const;

const LORD_CATEGORY_CODES: Record<HouseCategory, [ConditionCode, ConditionDirection]> = {
  kendra: ['LORD_IN_KENDRA', 'supports'],
  trikona: ['LORD_IN_TRIKONA', 'supports'],
  dusthana: ['LORD_IN_DUSTHANA', 'challenges'],
  upachaya: ['LORD_IN_UPACHAYA', 'context'],
};

/** Dispositor chain: `start` → lord of its sign → … until own sign or a repeat (repeat not included). */
export function dispositorChain(start: PlanetName, dispositorOf: (p: PlanetName) => PlanetName): PlanetName[] {
  const chain: PlanetName[] = [start];
  let cur = start;
  for (;;) {
    const next = dispositorOf(cur);
    if (next === cur || chain.includes(next)) return chain;
    chain.push(next);
    cur = next;
  }
}

/** SAV comparison vs 28 for one sign; null when the table lacks the sign. */
export function savAssessmentFor(input: InterpretationInput, house: number, rashiIndex: number): SavAssessment | null {
  const bindus = (input.ashtakavarga.sav.signs as Record<number, number | undefined>)[rashiIndex];
  if (typeof bindus !== 'number') return null;
  return {
    bindus,
    benchmark: SAV_BENCHMARK,
    comparison: bindus > SAV_BENCHMARK ? 'above' : bindus < SAV_BENCHMARK ? 'below' : 'at',
    factId: `sav.house.${house}`,
    rule: ruleRef(RULE_S3_SAV),
  };
}

export const runS3HouseLordship: RunS3HouseLordship = (input, facts, deps) => {
  const byName = new Map<PlanetName, PlanetCondition>(deps.planets.map((p) => [p.planet, p]));
  const cond = (planet: PlanetName): PlanetCondition => {
    const c = byName.get(planet);
    if (!c) throw new Error(`INTERPRETATION_INPUT_INVALID: S3 needs the S2 condition of ${planet}`);
    return c;
  };
  const functionalFact = (planet: PlanetName) =>
    pickFact(facts, `planet.${planetKey(planet)}.d1.functional-nature`, `planet.${planetKey(planet)}.d1.lordship`);
  const isFavourable = (p: PlanetCondition) => p.functionalNature.value === 'favourable' || p.functionalNature.value === 'yogakaraka';
  const isChallenging = (p: PlanetCondition) => p.functionalNature.value === 'challenging';

  const aspectsOn = new Map<number, PlanetName[]>();
  for (const p of input.natal.planets) {
    const name = planetNameOf(p.name);
    for (const h of p.aspectsCast ?? []) aspectsOn.set(h, [...(aspectsOn.get(h) ?? []), name]);
  }

  return [...input.natal.houses]
    .sort((a, b) => a.number - b.number)
    .map((h): HouseAssessment => {
      const n = h.number;
      const base = `house.${n}.d1`;
      const lord = signLordName(h.rashiIndex);
      const lordCond = cond(lord);
      const lordHouse = lordCond.house;
      const lordPlacementCategories = houseCategoriesOf(lordHouse);
      const conditions: ConditionEntry[] = [];
      const add = (factId: string, conditionCode: ConditionCode, direction: ConditionDirection, rule: InterpretationRule) => {
        if (!conditions.some((c) => c.factId === factId && c.conditionCode === conditionCode)) {
          conditions.push({ factId, conditionCode, ruleId: rule.id, direction });
        }
      };

      // Lord placement.
      for (const cat of lordPlacementCategories) {
        const [code, dir] = LORD_CATEGORY_CODES[cat];
        add(`${base}.lord-house`, code, dir, RULE_S3_LORD_PLACEMENT);
      }
      if (lordPlacementCategories.length === 0) add(`${base}.lord-house`, 'LORD_IN_OTHER', 'context', RULE_S3_LORD_PLACEMENT);
      if (lordHouse === n) add(`${base}.lord-house`, 'LORD_IN_OWN_HOUSE', 'supports', RULE_S3_LORD_PLACEMENT);

      // Occupants.
      const occupants = h.occupants.map((o) => planetNameOf(o)).sort(byPlanetOrder);
      add(`${base}.occupants`, occupants.length ? 'HOUSE_OCCUPIED' : 'HOUSE_EMPTY', 'context', RULE_S3_OCCUPANTS);
      for (const o of occupants) {
        const oc = cond(o);
        if (isFavourable(oc)) add(functionalFact(o), 'OCCUPANT_FUNCTIONAL_FAVOURABLE', 'supports', RULE_S3_OCCUPANTS);
        if (isChallenging(oc)) add(functionalFact(o), 'OCCUPANT_FUNCTIONAL_CHALLENGING', 'challenges', RULE_S3_OCCUPANTS);
      }

      // Aspects.
      const aspectedBy = [...new Set(aspectsOn.get(n) ?? [])].sort(byPlanetOrder);
      const aspectFact = pickFact(facts, `${base}.aspected-by`, `career.house.${n}.aspected-by`);
      add(aspectFact, aspectedBy.length ? 'HOUSE_ASPECTED' : 'HOUSE_NOT_ASPECTED', 'context', RULE_S3_ASPECTS);
      for (const a of aspectedBy) {
        const ac = cond(a);
        if (isFavourable(ac)) add(functionalFact(a), 'ASPECT_FROM_FUNCTIONAL_FAVOURABLE', 'supports', RULE_S3_ASPECTS);
        if (isChallenging(ac)) add(functionalFact(a), 'ASPECT_FROM_FUNCTIONAL_CHALLENGING', 'challenges', RULE_S3_ASPECTS);
      }

      // SAV vs 28.
      const sav = savAssessmentFor(input, n, h.rashiIndex);
      if (sav) {
        const code: ConditionCode = sav.comparison === 'above' ? 'SAV_ABOVE_28' : sav.comparison === 'below' ? 'SAV_BELOW_28' : 'SAV_AT_28';
        const dir: ConditionDirection = sav.comparison === 'above' ? 'supports' : sav.comparison === 'below' ? 'challenges' : 'context';
        add(sav.factId, code, dir, RULE_S3_SAV);
      }

      // Dispositor chain (facts only).
      const chain = dispositorChain(lord, (p) => cond(p).dispositor);
      const chainFacts = chain.map((p) => pickFact(facts, `planet.${planetKey(p)}.d1.dispositor`, `planet.${planetKey(p)}.d1.sign`));

      return {
        house: n,
        sign: signName(h.rashiIndex),
        lord,
        lordHouse,
        lordPlacementCategories,
        lordCondition: lord,
        occupants,
        aspectedBy,
        sav,
        dispositorChain: chain,
        conditions,
        factIds: uniqueSorted([`${base}.sign`, `${base}.lord`, `${base}.lord-house`, `${base}.occupants`, aspectFact, ...(sav ? [sav.factId] : []), ...chainFacts, ...conditions.map((c) => c.factId)]),
      };
    });
};
