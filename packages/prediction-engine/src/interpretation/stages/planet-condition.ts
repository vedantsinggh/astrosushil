/**
 * S2 planet condition: one `PlanetCondition` per graha (Sun … Ketu, registry order).
 *
 * Everything is read from the engine (no table is duplicated) and labelled by definition:
 *   - D1 dignity: the engine's five-fold compound ladder (`dignity.d1.compound`, BPHS ch. 3);
 *   - D9 / D10 dignity: sign-based exalted / debilitated / own sign (`dignity.varga.sign`,
 *     CAR-002; Q-S-4 open);
 *   - combustion with the engine orbs (Surya Siddhanta kalamsha values; Q-S-3 open);
 *   - retrograde (context only; Q-CRP-5); vargottama (D1 sign = D9 sign); dispositor;
 *   - house category of the occupied whole-sign house (definitional);
 *   - functional nature and Yogakaraka by ownership (engine `getFunctionalNature`);
 *   - an engine-detected neecha bhanga (sourced routes only; enables CRP-001);
 *   - optional Shadbala vs the BPHS ch. 27 required rupas, only when the input carries it.
 *
 * Conditions are never collapsed: a planet in its own sign and combust carries BOTH codes
 * (`OWN_SIGN` supports, `COMBUST` challenges). The conflict policy decides what is shown.
 */
import { calculateCombustion, isDebilitated, isExalted, isOwnSign, type NormalizedPlanet, type PlanetaryDignity } from '@astro/astrology-engine';
import type { FactView, InterpretationInput } from '../input';
import type { RunS2PlanetCondition } from '../stages';
import {
  PLANET_NAMES,
  type CombustionState,
  type ConditionCode,
  type ConditionDirection,
  type ConditionEntry,
  type InterpretationRule,
  type PlanetCondition,
  type PlanetName,
  type ShadbalaState,
  type VargaDignity,
  type VargaSignDignity,
} from '../types';
import {
  houseCategoriesOf,
  pickFact,
  planetKey,
  planetNameOf,
  ruleRef,
  signLordName,
  signName,
  symbolOf,
  uniqueSorted,
  vargaHouse,
  vargaPlacement,
} from '../util/count';
import { RULE_S2_FUNCTIONAL_NATURE, functionalConditions, functionalNatureOf, toFunctionalNatureState } from './functional-nature';

// ---------------------------------------------------------------------------
// Stage rules (S2). A4 adds them to the pack's rule list.
// ---------------------------------------------------------------------------

export const RULE_S2_D1_DIGNITY: InterpretationRule = {
  id: 'INT-S2-001',
  version: '1.0.0',
  stage: 'S2',
  status: 'approved',
  sources: ['BPHS ch. 3 (exaltation, debilitation, moolatrikona, own sign, compound relationship)'],
  requiredFacts: ['planet.*.d1.dignity'],
  description:
    'D1 dignity from the engine five-fold compound ladder (dignity.d1.compound): exalted, moolatrikona, own, great friend, friend support; neutral is context; enemy, great enemy, debilitated challenge. Node dignity is context only (Q-G-2).',
};

export const RULE_S2_VARGA_DIGNITY: InterpretationRule = {
  id: 'INT-S2-002',
  version: '1.0.0',
  stage: 'S2',
  status: 'provisional',
  decisionRef: 'CAR-002',
  sources: ['BPHS ch. 3 and ch. 6-7 (dignity judged in each varga by the sign occupied)', 'CAR-002 (sign-based varga dignity)'],
  requiredFacts: ['planet.*.d9.sign', 'planet.*.d10.sign'],
  description:
    'D9 and D10 dignity by sign only (dignity.varga.sign): exalted and own sign support, debilitated challenges; nodes are not graded (Q-S-4).',
};

export const RULE_S2_COMBUSTION: InterpretationRule = {
  id: 'INT-S2-003',
  version: '1.0.0',
  stage: 'S2',
  status: 'provisional',
  sources: ['Surya Siddhanta kalamsha orbs as used by the engine (Moon 12, Mars 17, Mercury 14/12 R, Jupiter 11, Venus 10/8 R, Saturn 15)'],
  requiredFacts: ['planet.*.d1.combust'],
  description: 'A planet within the engine combustion orb of the Sun is combust (challenges). Orbs pending client review (Q-S-3).',
};

export const RULE_S2_RETROGRADE: InterpretationRule = {
  id: 'INT-S2-004',
  version: '1.0.0',
  stage: 'S2',
  status: 'provisional',
  sources: ['Ephemeris retrograde flag; interpretive role pending client review (Q-CRP-5)'],
  requiredFacts: ['planet.*.d1.retrograde'],
  description: 'Retrogression of Mars … Saturn recorded as context only. Rahu and Ketu are always retrograde (mean node) and get no code.',
};

export const RULE_S2_VARGOTTAMA: InterpretationRule = {
  id: 'INT-S2-005',
  version: '1.0.0',
  stage: 'S2',
  status: 'provisional',
  sources: ['BPHS ch. 6-7 (vargottama: same sign in the rasi and the navamsa); Phaladeepika ch. 3 (a vargottama planet is strengthened; verse to verify)'],
  requiredFacts: ['planet.*.d1.sign', 'planet.*.d9.sign'],
  description: 'A planet whose D1 sign equals its D9 sign is vargottama (supports).',
};

export const RULE_S2_HOUSE_CATEGORY: InterpretationRule = {
  id: 'INT-S2-006',
  version: '1.0.0',
  stage: 'S2',
  status: 'approved',
  sources: ['BPHS ch. 11 / Laghu Parashari ch. 1 (kendra 1-4-7-10, trikona 1-5-9, dusthana 6-8-12, upachaya 3-6-10-11)'],
  requiredFacts: ['planet.*.d1.house'],
  description: 'Category of the whole-sign house a planet occupies: kendra and trikona support, dusthana challenges, upachaya is context.',
};

export const RULE_S2_NEECHA_BHANGA: InterpretationRule = {
  id: 'INT-S2-008',
  version: '1.0.0',
  stage: 'S2',
  status: 'provisional',
  sources: ['Phaladeepika ch. 7 (neecha bhanga; verses to verify)', 'Raman, Three Hundred Important Combinations'],
  requiredFacts: ['yoga.neecha-bhanga-*'],
  description:
    'An engine-detected neecha bhanga (D1) for the planet, through a sourced route only (debilitation-sign or exaltation-sign lord in a kendra from the Lagna or the Moon), supports. The unsourced "conjunct an exalted planet" route alone is ignored.',
};

export const RULE_S2_SHADBALA: InterpretationRule = {
  id: 'INT-S2-009',
  version: '1.0.0',
  stage: 'S2',
  status: 'provisional',
  sources: ['BPHS ch. 27 (required rupas: Sun 6.5, Moon 6, Mars 5, Mercury 7, Jupiter 6.5, Venus 5.5, Saturn 5)'],
  requiredFacts: ['planet.*.shadbala'],
  description: 'Shadbala total vs the required rupas: meets (supports) or below (challenges). Emitted only when the input carries Shadbala (Q-S-1).',
};

export const S2_PLANET_CONDITION_RULES: readonly InterpretationRule[] = [
  RULE_S2_D1_DIGNITY,
  RULE_S2_VARGA_DIGNITY,
  RULE_S2_COMBUSTION,
  RULE_S2_RETROGRADE,
  RULE_S2_VARGOTTAMA,
  RULE_S2_HOUSE_CATEGORY,
  RULE_S2_FUNCTIONAL_NATURE,
  RULE_S2_NEECHA_BHANGA,
  RULE_S2_SHADBALA,
];

// ---------------------------------------------------------------------------
// Mappings
// ---------------------------------------------------------------------------

const D1_DIGNITY_CODES: Record<PlanetaryDignity, [ConditionCode, ConditionDirection]> = {
  EXALTED: ['EXALTED', 'supports'],
  MOOLATRIKONA: ['MOOLATRIKONA', 'supports'],
  OWN_SIGN: ['OWN_SIGN', 'supports'],
  GREAT_FRIEND: ['GREAT_FRIEND_SIGN', 'supports'],
  FRIEND: ['FRIEND_SIGN', 'supports'],
  NEUTRAL: ['NEUTRAL_SIGN', 'context'],
  ENEMY: ['ENEMY_SIGN', 'challenges'],
  GREAT_ENEMY: ['GREAT_ENEMY_SIGN', 'challenges'],
  DEBILITATED: ['DEBILITATED', 'challenges'],
};

const VARGA_DIGNITY_CODES: Record<'D9' | 'D10', Partial<Record<VargaSignDignity, [ConditionCode, ConditionDirection]>>> = {
  D9: { EXALTED: ['D9_EXALTED', 'supports'], OWN_SIGN: ['D9_OWN_SIGN', 'supports'], DEBILITATED: ['D9_DEBILITATED', 'challenges'] },
  D10: { EXALTED: ['D10_EXALTED', 'supports'], OWN_SIGN: ['D10_OWN_SIGN', 'supports'], DEBILITATED: ['D10_DEBILITATED', 'challenges'] },
};

const NODES: readonly PlanetName[] = ['Rahu', 'Ketu'];

/** Sign-based varga dignity (CAR-002): nodes are not graded. */
export function vargaSignDignity(planet: PlanetName, rashiIndex: number): VargaSignDignity {
  if (NODES.includes(planet)) return 'NONE';
  const s = symbolOf(planet);
  if (isExalted(s, rashiIndex)) return 'EXALTED';
  if (isDebilitated(s, rashiIndex)) return 'DEBILITATED';
  if (isOwnSign(s, rashiIndex)) return 'OWN_SIGN';
  return 'NONE';
}

/** Registry fact ID of a planet's varga dignity (core ID first, career fallback for D10). */
export function vargaDignityFactId(facts: FactView, planet: PlanetName, varga: 'D9' | 'D10'): string {
  const k = planetKey(planet);
  const v = varga.toLowerCase();
  return varga === 'D10' ? pickFact(facts, `planet.${k}.d10.dignity`, `career.d10.${k}.dignity`) : pickFact(facts, `planet.${k}.${v}.dignity`);
}

/** Varga dignity of one planet; undefined when the varga (or the planet in it) is missing. */
export function vargaDignityOf(input: InterpretationInput, facts: FactView, planet: PlanetName, varga: 'D9' | 'D10'): VargaDignity | undefined {
  const chart = input.vargas[varga];
  const pl = vargaPlacement(chart, planet);
  if (!chart || !pl) return undefined;
  const k = planetKey(planet);
  const v = varga.toLowerCase();
  const house = vargaHouse(chart, pl);
  return {
    varga,
    sign: signName(pl.rashiIndex),
    house,
    value: vargaSignDignity(planet, pl.rashiIndex),
    definition: 'dignity.varga.sign',
    factIds: uniqueSorted([
      vargaDignityFactId(facts, planet, varga),
      `planet.${k}.${v}.sign`,
      ...(house !== null ? [`planet.${k}.${v}.house`] : []),
    ]),
  };
}

/** Sourced neecha bhanga routes (engine condition IDs); the unsourced exalted-conjunction route is excluded. */
const SOURCED_NB_ROUTES = ['DEB_SIGN_LORD_KENDRA_LAGNA', 'DEB_SIGN_LORD_KENDRA_MOON', 'EX_SIGN_LORD_KENDRA_LAGNA', 'EX_SIGN_LORD_KENDRA_MOON'];

function neechaBhangaFactId(input: InterpretationInput, planet: PlanetName): string | null {
  const y = input.yogas.find((r) => r.id === `YOGA_NEECHA_BHANGA_${symbolOf(planet)}` && r.varga === 'D1' && r.isDetected);
  if (!y) return null;
  const sourced = y.evidence.conditions.some((c) => c.satisfied && SOURCED_NB_ROUTES.includes(c.id));
  return sourced ? `yoga.neecha-bhanga-${planetKey(planet)}` : null;
}

function findPlanet(input: InterpretationInput, planet: PlanetName): NormalizedPlanet {
  const p = input.natal.planets.find((x) => planetNameOf(x.name) === planet);
  if (!p) throw new Error(`INTERPRETATION_INPUT_INVALID: natal chart has no ${planet}`);
  return p;
}

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

export const runS2PlanetCondition: RunS2PlanetCondition = (input, facts) => {
  const lagnaSign = input.natal.ascendant.rashiIndex;
  const sun = findPlanet(input, 'Sun');

  return PLANET_NAMES.map((planet): PlanetCondition => {
    const p = findPlanet(input, planet);
    const k = planetKey(planet);
    const base = `planet.${k}.d1`;
    const conditions: ConditionEntry[] = [];
    const add = (factId: string, conditionCode: ConditionCode, direction: ConditionDirection, rule: InterpretationRule) =>
      conditions.push({ factId, conditionCode, ruleId: rule.id, direction });

    // D1 dignity (nodes: context only, Q-G-2).
    const [dCode, dDir] = D1_DIGNITY_CODES[p.dignity];
    add(`${base}.dignity`, dCode, NODES.includes(planet) ? 'context' : dDir, RULE_S2_D1_DIGNITY);

    // Neecha bhanga (CRP-001 sets the DEBILITATED code aside).
    const nb = p.dignity === 'DEBILITATED' ? neechaBhangaFactId(input, planet) : null;
    if (nb) add(nb, 'NEECHA_BHANGA', 'supports', RULE_S2_NEECHA_BHANGA);

    // Varga dignity.
    const d9 = vargaDignityOf(input, facts, planet, 'D9');
    const d10 = vargaDignityOf(input, facts, planet, 'D10');
    for (const vd of [d9, d10]) {
      if (!vd) continue;
      const mapped = VARGA_DIGNITY_CODES[vd.varga][vd.value];
      if (mapped) add(vargaDignityFactId(facts, planet, vd.varga), mapped[0], mapped[1], RULE_S2_VARGA_DIGNITY);
    }

    // Combustion (not for the Sun or the nodes).
    let combustion: CombustionState | null = null;
    if (planet !== 'Sun' && !NODES.includes(planet)) {
      const c = calculateCombustion(symbolOf(planet), p.absoluteDegree, sun.absoluteDegree, p.retrograde);
      combustion = { combust: p.combust, distanceDeg: c.angularSeparation, orbDeg: c.threshold, factId: `${base}.combust` };
      if (p.combust) add(`${base}.combust`, 'COMBUST', 'challenges', RULE_S2_COMBUSTION);
    }

    // Retrograde (context; nodes excluded).
    if (p.retrograde && !NODES.includes(planet)) add(`${base}.retrograde`, 'RETROGRADE', 'context', RULE_S2_RETROGRADE);

    // Vargottama.
    const d9Pl = vargaPlacement(input.vargas.D9, planet);
    const vargottama = d9Pl !== undefined && d9Pl.rashiIndex === p.rashiIndex;
    if (vargottama) add(pickFact(facts, `planet.${k}.vargottama`, `planet.${k}.d9.sign`), 'VARGOTTAMA', 'supports', RULE_S2_VARGOTTAMA);

    // House category.
    const houseCategories = houseCategoriesOf(p.house);
    const catCodes: Record<string, [ConditionCode, ConditionDirection]> = {
      kendra: ['IN_KENDRA', 'supports'],
      trikona: ['IN_TRIKONA', 'supports'],
      dusthana: ['IN_DUSTHANA', 'challenges'],
      upachaya: ['IN_UPACHAYA', 'context'],
    };
    for (const cat of houseCategories) add(`${base}.house`, catCodes[cat][0], catCodes[cat][1], RULE_S2_HOUSE_CATEGORY);

    // Functional nature.
    const fn = functionalNatureOf(lagnaSign, planet);
    const fnFact = pickFact(facts, `${base}.functional-nature`, `${base}.lordship`);
    const lagnaLordFact = 'asc.d1.lord';
    for (const fc of functionalConditions(planet, fn)) {
      add(fc.code === 'LAGNA_LORD' ? lagnaLordFact : fnFact, fc.code, fc.direction, RULE_S2_FUNCTIONAL_NATURE);
    }

    // Shadbala (optional input; provisional).
    let shadbala: ShadbalaState | undefined;
    const sb = input.shadbala?.[planet];
    if (sb && sb.requiredRupas > 0) {
      const ratio = sb.totalRupas / sb.requiredRupas;
      shadbala = {
        totalRupas: sb.totalRupas,
        requiredRupas: sb.requiredRupas,
        ratio,
        meetsRequired: ratio >= 1,
        provisional: true,
        rule: ruleRef(RULE_S2_SHADBALA),
      };
      add(`planet.${k}.shadbala`, ratio >= 1 ? 'SHADBALA_MEETS_REQUIRED' : 'SHADBALA_BELOW_REQUIRED', ratio >= 1 ? 'supports' : 'challenges', RULE_S2_SHADBALA);
    }

    const dispositor = signLordName(p.rashiIndex);
    const dispositorFact = pickFact(facts, `${base}.dispositor`, `${base}.sign`);

    const factIds = uniqueSorted([
      `${base}.sign`,
      `${base}.house`,
      `${base}.degree`,
      `${base}.dignity`,
      dispositorFact,
      ...(combustion ? [combustion.factId] : []),
      `${base}.retrograde`,
      ...(d9?.factIds ?? []),
      ...(d10?.factIds ?? []),
      ...conditions.map((c) => c.factId),
    ]);

    return {
      planet,
      sign: p.sign,
      house: p.house,
      degree: p.degree,
      dignity: { value: p.dignity, definition: 'dignity.d1.compound', factId: `${base}.dignity` },
      vargaDignity: { ...(d9 ? { d9 } : {}), ...(d10 ? { d10 } : {}) },
      combustion,
      retrograde: p.retrograde,
      vargottama,
      functionalNature: toFunctionalNatureState(fn),
      yogakaraka: { value: fn.isYogakaraka, basis: 'ownership' },
      houseCategories,
      dispositor,
      ...(shadbala ? { shadbala } : {}),
      conditions,
      factIds,
    };
  });
};
