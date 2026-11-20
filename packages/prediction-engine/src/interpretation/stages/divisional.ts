/**
 * S5 divisional synthesis: D1 ↔ D10 (and D9) links. Agreement is a fact, never a score.
 *
 * Links (deterministic IDs via `stageItemId('S5', …)`):
 *   - `vargottama` (D9), one per planet: D1 sign = D9 sign → agreement true + VARGOTTAMA;
 *   - `tenth-lord-d10-house` (D10): the D1 10th lord's D10 house category, and whether it
 *     occupies the same house number in D1 and D10 (D1_D10_AGREE / D1_D10_DIFFER, context);
 *   - `tenth-lord-d10-dignity` (D10): the D1 10th lord's sign-based D10 dignity;
 *   - `same-lord-d1-d10` (D10), for the 1st and 10th houses: is the house lord the same planet
 *     in D1 and in D10 (SAME_LORD_D1_D10 when true; agreement false otherwise);
 *   - `d10-ascendant-lord` (D10): the D10 Lagna lord's D10 house category and dignity;
 *   - `planet-d10-dignity` (D10), one per key career planet: sign-based D10 dignity.
 * Key career planets: the D1 10th lord, the D10 Lagna lord, the D10 10th lord, the Amatyakaraka,
 * the Sun, Saturn and Jupiter (CAR decisions: 10th lord, AmK, Sun–Saturn, D10; Jupiter as the
 * karaka of guidance and advancement topics). Provisional.
 */
import type { FactView, InterpretationInput } from '../input';
import type { RunS5DivisionalSynthesis } from '../stages';
import { stageItemId } from '../ids';
import {
  PLANET_NAMES,
  type ConditionCode,
  type ConditionDirection,
  type ConditionEntry,
  type DivisionalLink,
  type DivisionalLinkKind,
  type HouseCategory,
  type InterpretationRule,
  type PlanetCondition,
  type PlanetName,
  type VargaSignDignity,
} from '../types';
import { byPlanetOrder, houseCategoriesOf, pickFact, planetKey, planetNameOf, ruleRef, signFrom, signLordName, signName, uniqueSorted, vargaHouse, vargaPlacement } from '../util/count';
import { vargaDignityFactId, vargaSignDignity } from './planet-condition';

export const RULE_S5_VARGOTTAMA: InterpretationRule = {
  id: 'INT-S5-001',
  version: '1.0.0',
  stage: 'S5',
  status: 'provisional',
  sources: ['BPHS ch. 6-7 (vargottama: same sign in the rasi and the navamsa); Phaladeepika ch. 3 (verse to verify)'],
  requiredFacts: ['planet.*.d1.sign', 'planet.*.d9.sign'],
  description: 'Per planet: D1 sign equals D9 sign (vargottama).',
};

export const RULE_S5_D10_LORDS: InterpretationRule = {
  id: 'INT-S5-002',
  version: '1.0.0',
  stage: 'S5',
  status: 'provisional',
  decisionRef: 'CAR-002',
  sources: [
    'BPHS ch. 6 (Dasamsa; houses counted from the D10 ascendant, whole sign)',
    'BPHS ch. 11 (house categories)',
    'CAR-002 (sign-based varga dignity)',
  ],
  requiredFacts: ['house.10.d1.lord', 'asc.d10.sign', 'planet.*.d10.sign', 'planet.*.d10.house'],
  description:
    'D1 10th lord and D10 Lagna lord: D10 house category (kendra/trikona support, dusthana challenges, upachaya/other context), sign-based D10 dignity, same house in D1 and D10 (context).',
};

export const RULE_S5_SAME_LORD: InterpretationRule = {
  id: 'INT-S5-003',
  version: '1.0.0',
  stage: 'S5',
  status: 'provisional',
  sources: ['BPHS ch. 6 (Dasamsa); D1–D10 confirmation as used in CAR decisions (provisional – pending client review)'],
  requiredFacts: ['house.1.d1.lord', 'house.10.d1.lord', 'asc.d10.sign'],
  description: 'For the 1st and 10th houses: the same planet rules the house in D1 and in D10 (context fact).',
};

export const RULE_S5_KEY_PLANET_D10: InterpretationRule = {
  id: 'INT-S5-004',
  version: '1.0.0',
  stage: 'S5',
  status: 'provisional',
  decisionRef: 'CAR-002',
  sources: ['BPHS ch. 3 and ch. 6-7 (dignity in each varga by sign)', 'CAR-002 (sign-based varga dignity)'],
  requiredFacts: ['planet.*.d10.sign'],
  description:
    'Sign-based D10 dignity of the key career planets (D1 10th lord, D10 Lagna lord, D10 10th lord, Amatyakaraka, Sun, Saturn, Jupiter): exalted/own support, debilitated challenges.',
};

export const S5_DIVISIONAL_RULES: readonly InterpretationRule[] = [RULE_S5_VARGOTTAMA, RULE_S5_D10_LORDS, RULE_S5_SAME_LORD, RULE_S5_KEY_PLANET_D10];

const D10_CATEGORY_CODES: Record<HouseCategory, [ConditionCode, ConditionDirection]> = {
  kendra: ['D10_LORD_IN_KENDRA', 'supports'],
  trikona: ['D10_LORD_IN_TRIKONA', 'supports'],
  dusthana: ['D10_LORD_IN_DUSTHANA', 'challenges'],
  upachaya: ['D10_LORD_IN_UPACHAYA', 'context'],
};

const D10_DIGNITY_CODES: Partial<Record<VargaSignDignity, [ConditionCode, ConditionDirection]>> = {
  EXALTED: ['D10_EXALTED', 'supports'],
  OWN_SIGN: ['D10_OWN_SIGN', 'supports'],
  DEBILITATED: ['D10_DEBILITATED', 'challenges'],
};

interface D10Position {
  sign: string;
  rashiIndex: number;
  house: number | null;
  dignity: VargaSignDignity;
}

function d10Position(input: InterpretationInput, planet: PlanetName): D10Position | null {
  const chart = input.vargas.D10;
  const pl = vargaPlacement(chart, planet);
  if (!chart || !pl) return null;
  return { sign: signName(pl.rashiIndex), rashiIndex: pl.rashiIndex, house: vargaHouse(chart, pl), dignity: vargaSignDignity(planet, pl.rashiIndex) };
}

function d10FactIds(facts: FactView, planet: PlanetName, pos: D10Position): string[] {
  const k = planetKey(planet);
  return [`planet.${k}.d10.sign`, ...(pos.house !== null ? [`planet.${k}.d10.house`] : []), vargaDignityFactId(facts, planet, 'D10')];
}

function categoryConditions(houseFact: string, house: number | null, ruleId: string): ConditionEntry[] {
  if (house === null) return [];
  const cats = houseCategoriesOf(house);
  if (cats.length === 0) return [{ factId: houseFact, conditionCode: 'D10_LORD_IN_OTHER', ruleId, direction: 'context' }];
  return cats.map((c) => ({ factId: houseFact, conditionCode: D10_CATEGORY_CODES[c][0], ruleId, direction: D10_CATEGORY_CODES[c][1] }));
}

function dignityConditions(facts: FactView, planet: PlanetName, dignity: VargaSignDignity, ruleId: string): ConditionEntry[] {
  const mapped = D10_DIGNITY_CODES[dignity];
  return mapped ? [{ factId: vargaDignityFactId(facts, planet, 'D10'), conditionCode: mapped[0], ruleId, direction: mapped[1] }] : [];
}

export const runS5DivisionalSynthesis: RunS5DivisionalSynthesis = (input, facts, deps) => {
  const links: DivisionalLink[] = [];
  const byName = new Map<PlanetName, PlanetCondition>(deps.planets.map((p) => [p.planet, p]));
  const d1 = (planet: PlanetName): { sign: string; house: number } | null => {
    const c = byName.get(planet);
    return c ? { sign: c.sign, house: c.house } : null;
  };
  const link = (
    kind: DivisionalLinkKind,
    idParts: string[],
    fields: Omit<DivisionalLink, 'id' | 'kind' | 'factIds' | 'rule'>,
    rule: InterpretationRule,
    extraFacts: string[],
  ) => {
    links.push({
      id: stageItemId('S5', kind, ...idParts),
      kind,
      ...fields,
      factIds: uniqueSorted([...extraFacts, ...fields.conditions.map((c) => c.factId)]),
      rule: ruleRef(rule),
    });
  };

  // --- Vargottama (D9), one per planet ------------------------------------
  const d9 = input.vargas.D9;
  if (d9) {
    for (const planet of PLANET_NAMES) {
      const c = byName.get(planet);
      const pl = vargaPlacement(d9, planet);
      if (!c || !pl) continue;
      const k = planetKey(planet);
      const same = signName(pl.rashiIndex) === c.sign;
      const conditions: ConditionEntry[] = same
        ? [{ factId: pickFact(facts, `planet.${k}.vargottama`, `planet.${k}.d9.sign`), conditionCode: 'VARGOTTAMA', ruleId: RULE_S5_VARGOTTAMA.id, direction: 'supports' }]
        : [];
      link(
        'vargottama',
        [k],
        { planet, varga: 'D9', d1: d1(planet), divisional: { sign: signName(pl.rashiIndex), house: vargaHouse(d9, pl) }, agreement: same, conditions },
        RULE_S5_VARGOTTAMA,
        [`planet.${k}.d1.sign`, `planet.${k}.d9.sign`],
      );
    }
  }

  const d10 = input.vargas.D10;
  if (!d10) return links;

  // --- D1 10th lord in D10 --------------------------------------------------
  const tenthD1 = input.natal.houses.find((h) => h.number === 10);
  if (tenthD1) {
    const lord = signLordName(tenthD1.rashiIndex);
    const pos = d10Position(input, lord);
    const lordD1 = d1(lord);
    if (pos) {
      const k = planetKey(lord);
      const houseFact = pos.house !== null ? `planet.${k}.d10.house` : `planet.${k}.d10.sign`;
      const sameHouse = lordD1 !== null && pos.house !== null ? lordD1.house === pos.house : null;
      const conditions = [
        ...categoryConditions(houseFact, pos.house, RULE_S5_D10_LORDS.id),
        ...(sameHouse === null
          ? []
          : [{ factId: houseFact, conditionCode: (sameHouse ? 'D1_D10_AGREE' : 'D1_D10_DIFFER') as ConditionCode, ruleId: RULE_S5_D10_LORDS.id, direction: 'context' as const }]),
      ];
      link(
        'tenth-lord-d10-house',
        [k],
        { planet: lord, varga: 'D10', d1: lordD1, divisional: { sign: pos.sign, house: pos.house }, agreement: sameHouse, conditions },
        RULE_S5_D10_LORDS,
        ['house.10.d1.lord', `planet.${k}.d1.house`, ...d10FactIds(facts, lord, pos).slice(0, 2)],
      );
      link(
        'tenth-lord-d10-dignity',
        [k],
        {
          planet: lord,
          varga: 'D10',
          d1: lordD1,
          divisional: { sign: pos.sign, house: pos.house, dignity: pos.dignity },
          agreement: null,
          conditions: dignityConditions(facts, lord, pos.dignity, RULE_S5_D10_LORDS.id),
        },
        RULE_S5_D10_LORDS,
        ['house.10.d1.lord', ...d10FactIds(facts, lord, pos)],
      );
    }
  }

  // --- Same lord of the 1st and 10th in D1 and D10 ---------------------------
  const d10Asc = d10.ascendant?.rashiIndex;
  if (d10Asc !== undefined) {
    for (const house of [1, 10]) {
      const hD1 = input.natal.houses.find((h) => h.number === house);
      if (!hD1) continue;
      const lordD1 = signLordName(hD1.rashiIndex);
      const d10Sign = signFrom(d10Asc, house);
      const lordD10 = signLordName(d10Sign);
      const same = lordD1 === lordD10;
      link(
        'same-lord-d1-d10',
        [`house-${house}`],
        {
          planet: lordD1,
          varga: 'D10',
          d1: { sign: signName(hD1.rashiIndex), house },
          divisional: { sign: signName(d10Sign), house },
          agreement: same,
          conditions: same ? [{ factId: `house.${house}.d1.lord`, conditionCode: 'SAME_LORD_D1_D10', ruleId: RULE_S5_SAME_LORD.id, direction: 'context' }] : [],
        },
        RULE_S5_SAME_LORD,
        [`house.${house}.d1.lord`, 'asc.d10.sign', ...(house === 10 && facts.has('career.d10.house.10.lord') ? ['career.d10.house.10.lord'] : [])],
      );
    }

    // --- D10 Lagna lord ---------------------------------------------------------
    const ascLord = signLordName(d10Asc);
    const pos = d10Position(input, ascLord);
    if (pos) {
      const k = planetKey(ascLord);
      const houseFact = pos.house !== null ? `planet.${k}.d10.house` : `planet.${k}.d10.sign`;
      link(
        'd10-ascendant-lord',
        [k],
        {
          planet: ascLord,
          varga: 'D10',
          d1: d1(ascLord),
          divisional: { sign: pos.sign, house: pos.house, dignity: pos.dignity },
          agreement: null,
          conditions: [...categoryConditions(houseFact, pos.house, RULE_S5_D10_LORDS.id), ...dignityConditions(facts, ascLord, pos.dignity, RULE_S5_D10_LORDS.id)],
        },
        RULE_S5_D10_LORDS,
        ['asc.d10.sign', ...d10FactIds(facts, ascLord, pos)],
      );
    }
  }

  // --- D10 dignity of key career planets --------------------------------------
  for (const planet of keyCareerPlanets(input)) {
    const pos = d10Position(input, planet);
    if (!pos) continue;
    link(
      'planet-d10-dignity',
      [planetKey(planet)],
      {
        planet,
        varga: 'D10',
        d1: d1(planet),
        divisional: { sign: pos.sign, house: pos.house, dignity: pos.dignity },
        agreement: null,
        conditions: dignityConditions(facts, planet, pos.dignity, RULE_S5_KEY_PLANET_D10.id),
      },
      RULE_S5_KEY_PLANET_D10,
      d10FactIds(facts, planet, pos),
    );
  }

  return links;
};

/**
 * Key career planets (registry order): D1 10th lord, D10 Lagna lord, D10 10th lord,
 * Amatyakaraka (when the chart carries chara karakas), Sun, Saturn, Jupiter.
 */
export function keyCareerPlanets(input: InterpretationInput): PlanetName[] {
  const out = new Set<PlanetName>(['Sun', 'Saturn', 'Jupiter']);
  const tenth = input.natal.houses.find((h) => h.number === 10);
  if (tenth) out.add(signLordName(tenth.rashiIndex));
  const d10Asc = input.vargas.D10?.ascendant?.rashiIndex;
  if (d10Asc !== undefined) {
    out.add(signLordName(d10Asc));
    out.add(signLordName(signFrom(d10Asc, 10)));
  }
  const amk = input.natal.planets.find((p) => (p.charaKaraka ?? '').toUpperCase() === 'AMK');
  if (amk) out.add(planetNameOf(amk.name));
  return [...out].sort(byPlanetOrder);
}

