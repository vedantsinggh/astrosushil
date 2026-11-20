/**
 * Functional (lordship-based) nature for the interpretation stages.
 *
 * Thin adapter over the engine's single implementation
 * (`@astro/astrology-engine` `getFunctionalNature`, `planets/functional-nature.ts`: BPHS ch. 34,
 * Laghu Parashari ch. 2). No rule is re-implemented here; this file only maps the engine result
 * to the interpretation contract (`FunctionalNatureState`) and to condition codes.
 *
 * Condition codes (directions recorded for the conflict policy):
 *   - `LAGNA_LORD` supports (classifier rule 1; enables CRP-002);
 *   - `LUMINARY` context for the Sun and the Moon (enables CRP-003);
 *   - `YOGAKARAKA_BY_OWNERSHIP` supports (one planet owns a kendra and a trikona; labelled as
 *     ownership, never as an association);
 *   - `FUNCTIONAL_FAVOURABLE` supports, `FUNCTIONAL_CHALLENGING` challenges,
 *     `FUNCTIONAL_MIXED` / `FUNCTIONAL_NEUTRAL` context (the verdict of the classifier);
 *   - ownership components: `OWNS_TRIKONA` supports (5th/9th, not for the Lagna lord),
 *     `OWNS_KENDRA` context (4th/7th/10th), `OWNS_3RD` / `OWNS_6TH` / `OWNS_8TH` / `OWNS_11TH`
 *     challenge (classifier rule 4), `OWNS_12TH` context (2nd/12th lords act by association,
 *     Laghu Parashari 2.4; the engine classifies them neutral);
 *   - `SHADOW_PLANET` context for Rahu and Ketu (no lordship; act through their dispositor).
 * A trikona lord that also owns a hard house therefore carries both `OWNS_TRIKONA` and e.g.
 * `OWNS_6TH`, and the conflict policy reports it as mixed (Q-F-1 stays open).
 */
import { FUNCTIONAL_NATURE_SOURCE, getFunctionalNature, type FunctionalNatureResult } from '@astro/astrology-engine';
import type { ConditionCode, ConditionDirection, FunctionalNatureState, InterpretationRule, PlanetName } from '../types';
import { ruleRef, symbolOf } from '../util/count';

/** S2 functional-nature rule (provisional until the client reviews Q-F-1…Q-F-4). */
export const RULE_S2_FUNCTIONAL_NATURE: InterpretationRule = {
  id: 'INT-S2-007',
  version: '1.0.0',
  stage: 'S2',
  status: 'provisional',
  sources: [FUNCTIONAL_NATURE_SOURCE, 'Laghu Parashari 2.4 (2nd/12th lords act by association)'],
  requiredFacts: ['asc.d1.lord', 'planet.*.d1.lordship'],
  description:
    'Functional nature by lordship from the Lagna (engine getFunctionalNature): Lagna lord, Yogakaraka by ownership, trikona / kendra / 3-6-8-11 / 12th ownership, luminaries and shadow planets.',
};

/** Engine classification for one planet (registry name) and a Lagna sign (1–12). */
export function functionalNatureOf(lagnaSign: number, planet: PlanetName): FunctionalNatureResult {
  return getFunctionalNature(lagnaSign, symbolOf(planet));
}

export function toFunctionalNatureState(result: FunctionalNatureResult): FunctionalNatureState {
  return {
    value: result.nature,
    lordships: [...result.lordships],
    reason: result.reason,
    rule: ruleRef(RULE_S2_FUNCTIONAL_NATURE),
  };
}

export interface FunctionalCondition {
  code: ConditionCode;
  direction: ConditionDirection;
}

const OWNERSHIP_CODES: ReadonlyArray<[number, ConditionCode, ConditionDirection]> = [
  [3, 'OWNS_3RD', 'challenges'],
  [6, 'OWNS_6TH', 'challenges'],
  [8, 'OWNS_8TH', 'challenges'],
  [11, 'OWNS_11TH', 'challenges'],
  [12, 'OWNS_12TH', 'context'],
];

/**
 * Condition codes for a planet's functional nature, in a fixed order: identity codes
 * (LAGNA_LORD, LUMINARY, SHADOW_PLANET), the verdict, then ownership components.
 */
export function functionalConditions(planet: PlanetName, result: FunctionalNatureResult): FunctionalCondition[] {
  const out: FunctionalCondition[] = [];
  const ls = result.lordships;
  const isLagnaLord = ls.includes(1);
  if (isLagnaLord) out.push({ code: 'LAGNA_LORD', direction: 'supports' });
  if (planet === 'Sun' || planet === 'Moon') out.push({ code: 'LUMINARY', direction: 'context' });

  switch (result.nature) {
    case 'shadow':
      out.push({ code: 'SHADOW_PLANET', direction: 'context' });
      return out;
    case 'yogakaraka':
      out.push({ code: 'YOGAKARAKA_BY_OWNERSHIP', direction: 'supports' });
      break;
    case 'favourable':
      out.push({ code: 'FUNCTIONAL_FAVOURABLE', direction: 'supports' });
      break;
    case 'mixed':
      out.push({ code: 'FUNCTIONAL_MIXED', direction: 'context' });
      break;
    case 'neutral':
      out.push({ code: 'FUNCTIONAL_NEUTRAL', direction: 'context' });
      break;
    case 'challenging':
      out.push({ code: 'FUNCTIONAL_CHALLENGING', direction: 'challenges' });
      break;
  }

  if (!isLagnaLord && (ls.includes(5) || ls.includes(9))) out.push({ code: 'OWNS_TRIKONA', direction: 'supports' });
  if (ls.includes(4) || ls.includes(7) || ls.includes(10)) out.push({ code: 'OWNS_KENDRA', direction: 'context' });
  for (const [house, code, direction] of OWNERSHIP_CODES) if (ls.includes(house)) out.push({ code, direction });
  return out;
}
