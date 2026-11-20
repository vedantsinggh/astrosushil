/**
 * Interpretation rule catalogue (proposal §8; methodology docs/report-system/decisions/interpretation.md).
 *
 * Every rule a pack result may cite is listed here with its status:
 *   - approved:       definitional classical category with a citation (house categories, the dignity
 *                     ladder, SAV vs 28, sign counts);
 *   - provisional:    a cited convention or an existing method decision (CAR-xxx), pending client review;
 *   - pending-client: no source. Evaluated in tests only (`includePendingClient`), never rendered.
 *
 * The factor lists of the career dimensions follow audit 05 §2 (a proposal, not a client decision), so
 * every dimension rule is provisional. No rule carries a weight: dimension classes come from set logic
 * over the cited conditions (decision 7).
 *
 * `rulesetVersion` hashes this catalogue (plus the conflict policy); any edit here is a reviewed change.
 */
import type { InterpretationRule } from '../types';
import { S1_CHART_VALIDATION_RULES } from '../stages/chart-validation';
import { S2_PLANET_CONDITION_RULES } from '../stages/planet-condition';
import { S3_HOUSE_LORDSHIP_RULES } from '../stages/house-lordship';
import { S5_DIVISIONAL_RULES } from '../stages/divisional';
import { S6_RULES } from '../stages/activation';
import { S4_RULES } from './yoga-rules';

const rule = (r: InterpretationRule): InterpretationRule => r;

// ---------------------------------------------------------------------------
// Career result rules over the stage outputs (proposal §8 IDs; all S8)
// ---------------------------------------------------------------------------

export const CAREER_TOPIC_RULES: readonly InterpretationRule[] = [
  rule({
    id: 'INT-H-001',
    version: '1.0.0',
    stage: 'S8',
    status: 'approved',
    sources: ['BPHS ch. 7 and 11 (kendra, trikona, dusthana, upachaya houses; verify verses)', 'Laghu Parashari ch. 1'],
    requiredFacts: ['house.*.d1.lord', 'house.*.d1.lord-house'],
    description: 'House lord placement category (kendra / trikona / dusthana / upachaya / other), whole-sign from the Lagna.',
  }),
  rule({
    id: 'INT-H-002',
    version: '1.0.0',
    stage: 'S8',
    status: 'approved',
    sources: ['BPHS ch. 3 (dignity order: exaltation, moolatrikona, own sign, friendly, neutral, enemy, debilitation)'],
    requiredFacts: ['planet.*.d1.dignity'],
    description: "House lord condition: the S2 condition of the lord (dignity ladder, combustion, varga dignity) resolved by the conflict policy.",
  }),
  rule({
    id: 'INT-H-003',
    version: '1.0.0',
    stage: 'S8',
    status: 'approved',
    decisionRef: 'CAR-006',
    sources: ['BPHS Ashtakavarga chapters (337 bindus / 12 = 28 per sign on average)', 'CAR-006'],
    requiredFacts: ['sav.house.*'],
    description: 'House Sarvashtakavarga compared with the 28-bindu average (above / at / below).',
  }),
  rule({
    id: 'INT-H-010',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    sources: ['BPHS ch. 34 (functional nature by lordship from the Lagna; verify verses)', 'Laghu Parashari ch. 2'],
    requiredFacts: ['house.*.d1.occupants'],
    description: 'Occupants of a house and their functional nature (S3 occupant conditions).',
  }),
  rule({
    id: 'INT-H-011',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-001',
    sources: ['BPHS ch. 26 (graha drishti)', 'BPHS ch. 34 (functional nature)', 'CAR-001'],
    requiredFacts: ['planet.*.d1.aspected-by'],
    description: 'Planets aspecting a house and their functional nature (S3 aspect conditions).',
  }),
  rule({
    id: 'INT-P-001',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    sources: ['BPHS ch. 3 (dignity order)', 'BPHS ch. 34 (functional nature; verify verses)', 'Surya Siddhanta (combustion orbs)'],
    requiredFacts: ['planet.*.d1.sign', 'planet.*.d1.dignity'],
    description: 'Planet condition: every S2 condition of one planet (dignity, varga dignity, state, placement, functional nature) resolved by the conflict policy.',
  }),
  rule({
    id: 'INT-CY-001',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-005',
    sources: ['CAR-005 (career-relevant engine yogas; BPHS / Phaladeepika rule set of the engine)'],
    requiredFacts: [],
    description: 'Career-relevant yogas: engine-detected only, filtered by category and id (CAR-005). No yoga is added by hand.',
  }),
  rule({
    id: 'INT-CY-002',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    sources: ['Audit 04 §5 yoga decision procedure (client question Q-Y-12)'],
    requiredFacts: [],
    description: "Yoga strength from the S4 conditions of its key planets and modifiers; the class is S4's set-logic class.",
  }),
  rule({
    id: 'INT-CY-003',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    sources: ['BPHS / Laghu Parashari: yogas fruit in the dashas of the planets forming them (verify; client question Q-T-2)'],
    requiredFacts: [],
    description: 'Yoga activation windows: the MD/AD of a key planet of the yoga.',
  }),
  rule({
    id: 'INT-D-001',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-002',
    sources: ['BPHS ch. 6-7 (Dashamsha)', 'CAR-002 (D10 dignity is sign-based)'],
    requiredFacts: ['planet.*.d10.sign'],
    description: "The D1 10th lord's D10 house category and D10 sign dignity.",
  }),
  rule({
    id: 'INT-D-002',
    version: '1.0.0',
    stage: 'S8',
    status: 'approved',
    sources: ['Vargottama: the same sign in the D1 and the D9 (BPHS ch. 6; Phaladeepika ch. 3; verify verses)'],
    requiredFacts: ['planet.*.d9.sign'],
    description: 'Planets that are vargottama (D1 sign = D9 sign). Descriptive.',
  }),
  rule({
    id: 'INT-D-003',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-002',
    sources: ['CAR-002 (D1 and D10 read together)'],
    requiredFacts: ['planet.*.d10.sign'],
    description: 'D1 ↔ D10 agreement facts (same lord, 10th lord placement). Descriptive: agreement is a fact, never a score.',
  }),
  rule({
    id: 'INT-D-004',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-002',
    sources: ['BPHS ch. 6-7 (Dashamsha)', 'CAR-002 (D10 lords of the 1st, 6th, 7th, 10th and 11th; sign-based dignity)'],
    requiredFacts: ['asc.d10.sign', 'planet.*.d10.sign'],
    description: 'Lord of a D10 house (1, 6, 7, 10, 11) and its D10 sign dignity.',
  }),
  rule({
    id: 'INT-T-001',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-015',
    sources: ['CAR-015 (a period lord gives the results of the houses it rules, occupies and aspects; Parashari dasha reading)'],
    requiredFacts: ['dasha.md.*'],
    description: 'Dasha period: the career links the period lord activates, read together with its natal condition.',
  }),
  rule({
    id: 'INT-T-002',
    version: '1.0.0',
    stage: 'S8',
    status: 'approved',
    sources: ['Sign count from the MD lord to the AD lord (definitional count)'],
    requiredFacts: ['dasha.current.md'],
    description: 'MD–AD mutual position as a fact only (no favourability; client question Q-T-1).',
  }),
  rule({
    id: 'INT-T-003',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-010',
    sources: [
      'CAR-010 (2nd lord = dhana, 11th lord = labha; BPHS)',
      'Working-age window 16–60 years: audit 05 F1 and user decision 2026-11-20 (never after 60); client question Q-G-3',
    ],
    requiredFacts: ['house.2.d1.lord', 'house.11.d1.lord'],
    description: 'Earnings window: the earliest MD/AD of the 2nd or 11th lord that overlaps the working-age window (age-gated).',
  }),
  rule({
    id: 'INT-T-010',
    version: '1.0.0',
    stage: 'S8',
    status: 'approved',
    decisionRef: 'CAR-007',
    sources: ['Ephemeris sign ingress (TransitIngressSolver); house counted whole-sign from the Lagna and the Moon (definitional)'],
    requiredFacts: ['transit.*'],
    description: 'Current Jupiter / Saturn transit sign and the natal house it occupies from the Ascendant and the Moon. Fact only.',
  }),
  rule({
    id: 'INT-T-011',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'D-006',
    sources: ['Saturn counted from the natal Moon sign (12th, 1st, 2nd = Sade Sati; 4th, 8th); user decision 2026-11-20 §4; D-006 neutral wording'],
    requiredFacts: ['planet.moon.d1.sign'],
    description: 'Saturn-from-Moon phase as a neutral fact (no dosha framing).',
  }),
];

// ---------------------------------------------------------------------------
// Career pack rules (S8)
// ---------------------------------------------------------------------------

const DIMENSION_NOTE = 'Factor list from audit 05 §2 (pending client review); class by set logic only, no weights.';

export const CAREER_PACK_RULES: readonly InterpretationRule[] = [
  rule({
    id: 'INT-C-001',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-016',
    sources: ['CAR-016 (Sun = state and authority, Saturn = service; BPHS karakatvas)'],
    requiredFacts: [],
    description:
      'Sun–Saturn link and Sun–10th link (CAR-016) shown as context of the service result. The absence of a link is "no specific indicator", never a negative verdict (audit 05 F15).',
  }),
  rule({
    id: 'INT-C-002',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-006',
    sources: ['CAR-006 (6th vs 7th SAV: a widely used practitioner heuristic, labelled as such)'],
    requiredFacts: [],
    description: 'SAV of the 6th vs the 7th: context only, carries PRACTITIONER_HEURISTIC, never decides a result.',
  }),
  rule({
    id: 'INT-C-003',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-006',
    sources: ['CAR-006 (10th vs 11th SAV: a widely used practitioner heuristic, labelled as such)'],
    requiredFacts: [],
    description: 'SAV of the 10th vs the 11th: context only, carries PRACTITIONER_HEURISTIC, never decides a result.',
  }),
  rule({
    id: 'INT-CAR-001',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-016',
    sources: ['Phaladeepika ch. 1 (6th house: service; verify verse)', 'BPHS karakatvas (Saturn: servants and service)', 'CAR-002', 'CAR-016'],
    requiredFacts: ['house.6.d1.lord', 'sav.house.6'],
    description: `Employment / service dimension: 6th lord condition and placement, 6th house SAV vs 28, Saturn's condition, the D10 6th lord's D10 dignity. ${DIMENSION_NOTE}`,
  }),
  rule({
    id: 'INT-CAR-002',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    sources: ['Phaladeepika ch. 1 (7th house: trade and partnership; verify verse)', 'BPHS karakatvas (Mercury: commerce)', 'CAR-002'],
    requiredFacts: ['house.7.d1.lord', 'sav.house.7'],
    description: `Business / enterprise dimension: 7th lord condition and placement, 7th house SAV vs 28, Mercury's condition, the D10 7th lord's D10 dignity. ${DIMENSION_NOTE}`,
  }),
  rule({
    id: 'INT-CAR-003',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    sources: ['BPHS karakatvas (Sun: authority)', 'BPHS (10th house: karma and status; Lagna lord: the self)', 'CAR-005 (engine raja yogas)'],
    requiredFacts: ['house.10.d1.lord', 'asc.d1.lord'],
    description: `Leadership / authority dimension (style, not rank): the Sun's, the 10th lord's and the Lagna lord's condition, and engine raja yogas with their S4 conditions. ${DIMENSION_NOTE}`,
  }),
  rule({
    id: 'INT-CAR-004',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-012',
    sources: ['BPHS karakatvas (Mercury: intellect, learning)', 'CAR-012 (5th house: buddhi)'],
    requiredFacts: ['house.5.d1.lord'],
    description: `Technical / analytical dimension: Mercury's condition and the 5th lord's condition and placement. ${DIMENSION_NOTE}`,
  }),
  rule({
    id: 'INT-CAR-005',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-010',
    sources: ['CAR-010 (2nd = dhana, 11th = labha; BPHS)', 'BPHS karakatvas (Jupiter: wealth)', 'CAR-005 (engine dhana yogas)'],
    requiredFacts: ['house.2.d1.lord', 'house.11.d1.lord', 'sav.house.2', 'sav.house.11'],
    description: `Financial growth dimension (pace of accumulation, never amounts): 2nd and 11th lords' condition, 2nd and 11th SAV vs 28, Jupiter's condition, engine dhana yogas. ${DIMENSION_NOTE}`,
  }),
  rule({
    id: 'INT-CAR-006',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    sources: ['BPHS (10th house: status and honour)', 'CAR-001 (aspects)', 'CAR-002 (D10)'],
    requiredFacts: ['house.10.d1.lord', 'sav.house.10'],
    description: `Recognition dimension (kind of recognition, never titles): 10th lord condition, 10th SAV vs 28, 10th occupants and aspects, the D10 10th lord's D10 dignity. ${DIMENSION_NOTE}`,
  }),
  rule({
    id: 'INT-CAR-007',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-011',
    sources: ['CAR-011 (4th lord: rest and security)', 'BPHS (10th lord placement)'],
    requiredFacts: ['house.10.d1.lord-house', 'house.4.d1.lord', 'sav.house.10'],
    description: `Stability dimension: 10th lord placement category, 10th SAV vs 28, 4th lord condition. ${DIMENSION_NOTE}`,
  }),
  rule({
    id: 'INT-CAR-008',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'D-006',
    sources: ['BPHS (6th, 8th, 12th: dusthanas)', 'D-006 (effort areas, never afflictions)', 'CAR-002 (D10)'],
    requiredFacts: ['house.10.d1.lord'],
    description: `Obstacles dimension, framed as effort areas: 10th lord placement and condition, functionally challenging occupants of / aspects on the 10th, the D10 1st and 10th lords' D10 dignity. ${DIMENSION_NOTE}`,
  }),
  rule({
    id: 'INT-CAR-009',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-009',
    sources: ['CAR-009 (bhavat bhavam: 5th = 8th from the 10th, 9th = 12th from the 10th)', 'BPHS (8th house: change)'],
    requiredFacts: ['house.5.d1.lord', 'house.8.d1.lord', 'house.9.d1.lord'],
    description: `Transitions dimension (modes of change): condition of the 5th, 8th and 9th lords. ${DIMENSION_NOTE}`,
  }),
  rule({
    id: 'INT-F-001',
    version: '1.0.0',
    stage: 'S8',
    status: 'provisional',
    decisionRef: 'CAR-018',
    sources: ['CAR-018 (trikona lords as purpose-giving lords; BPHS)'],
    requiredFacts: ['house.1.d1.lord', 'house.5.d1.lord', 'house.9.d1.lord'],
    description: 'Fields of opportunity: condition of each trine lord (1st, 5th, 9th).',
  }),
  // --- pending-client: no source. Evaluated in tests only, never rendered. ---
  rule({
    id: 'INT-CAR-041',
    version: '1.0.0',
    stage: 'S8',
    status: 'pending-client',
    sources: ['Unsourced: Mars–Saturn association read as technical / engineering work (audit 05 §2 proposal)'],
    requiredFacts: ['career.bnn.conjunct'],
    description: 'Adds the Mars–Saturn sign association as context of the technical / analytical result.',
  }),
  rule({
    id: 'INT-CAR-061',
    version: '1.0.0',
    stage: 'S8',
    status: 'pending-client',
    sources: ['Unsourced: Rahu in the 10th read as unconventional visibility (audit 05 §2 proposal)'],
    requiredFacts: ['planet.rahu.d1.house'],
    description: "Adds Rahu's occupation of the 10th as context of the recognition result.",
  }),
  rule({
    id: 'INT-CAR-071',
    version: '1.0.0',
    stage: 'S8',
    status: 'pending-client',
    sources: ['Unsourced: fixed / movable sign quality read as career stability (audit 05 §2 proposal; CAR-014 is descriptive only)'],
    requiredFacts: ['career.vocation.house10.quality'],
    description: 'Adds the sign quality of the 10th house and the 10th lord as context of the stability result.',
  }),
];

/** Stage rules (owned by the stage files; listed here so `rulesetVersion` covers them). */
export const STAGE_RULES: readonly InterpretationRule[] = [
  ...S1_CHART_VALIDATION_RULES,
  ...S2_PLANET_CONDITION_RULES,
  ...S3_HOUSE_LORDSHIP_RULES,
  ...S4_RULES,
  ...S5_DIVISIONAL_RULES,
  ...S6_RULES,
];

/** Every rule of the career pack: stage rules, career result rules and S8 dimension rules. */
export const CAREER_RULE_CATALOGUE: readonly InterpretationRule[] = [...STAGE_RULES, ...CAREER_TOPIC_RULES, ...CAREER_PACK_RULES];

/** Catalogue lookup by ID. */
export function catalogueById(rules: readonly InterpretationRule[] = CAREER_RULE_CATALOGUE): Record<string, InterpretationRule> {
  const out: Record<string, InterpretationRule> = {};
  for (const r of rules) {
    if (out[r.id]) throw new Error(`INTERPRETATION_RULE_DUPLICATE: ${r.id}`);
    out[r.id] = r;
  }
  return out;
}
