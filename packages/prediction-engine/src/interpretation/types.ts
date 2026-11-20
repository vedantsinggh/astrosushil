/**
 * Interpretation layer contracts (Wave 0, frozen).
 *
 * Data flow (AGENTS.md §1.4, docs/report-spec.md): chart calculations → deterministic
 * interpretation results (this layer) → LLM natural-language formatting. Every conclusion
 * a reader sees comes from a rule with an ID, a citation and an approval status.
 *
 * Methodology: docs/report-system/decisions/interpretation.md. Strength classes come from
 * set logic over cited conditions, never from numeric weights or sums. Graded scales are
 * used only where a classical text defines the grade (the dignity ladder, SAV vs 28,
 * Shadbala vs required rupas).
 *
 * This file is types only. Zod schemas for the serialisable result types live in
 * `schema.ts`; the closed vocabularies below are exported as runtime arrays so the schemas
 * and the tests share one source.
 */
import type { PlanetaryDignity } from '@astro/astrology-engine';

export const INTERPRETATION_SCHEMA_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Closed vocabularies
// ---------------------------------------------------------------------------

/** Planet names as the evidence registry spells them (`planet.<lower>.…` in fact IDs). */
export const PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const;
export type PlanetName = (typeof PLANET_NAMES)[number];

/** Closed vocabulary; the validator's judgement lexicon maps words onto these. */
export const STRENGTH_CLASSES = [
  'supported', // only supporting conditions apply
  'challenged', // only contradicting conditions apply
  'mixed', // both apply and no cited precedence rule settles them
  'resolved-supported', // both applied; a cited precedence rule settled towards support
  'resolved-challenged', // both applied; a cited precedence rule settled towards challenge
  'neutral', // neither applies (e.g. empty house, no aspect)
  'not-assessed', // the rule makes a descriptive statement only (no strength claim)
] as const;
export type StrengthClass = (typeof STRENGTH_CLASSES)[number];

export const QUALIFICATION_CODES = [
  'BIRTH_TIME_SENSITIVE', // S1: Lagna/Moon/D10 asc near a boundary
  'PROVISIONAL_CONVENTION', // snapshot.conventionsProvisional
  'PROVISIONAL_RULE', // a contributing rule (or applied precedence rule) is provisional
  'MIXED_INDICATORS',
  'CANCELLATION_APPLIED', // e.g. neecha bhanga
  'PRACTITIONER_HEURISTIC', // e.g. CAR-006 6/7 and 10/11 comparison
] as const;
export type QualificationCode = (typeof QUALIFICATION_CODES)[number];

/** Approval lifecycle of every rule (interpretation rule or precedence rule). */
export const RULE_STATUSES = ['approved', 'provisional', 'pending-client'] as const;
/** `pending-client`: evaluated in tests only, never rendered to readers. */
export type RuleStatus = (typeof RULE_STATUSES)[number];

export const STAGES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] as const;
export type Stage = (typeof STAGES)[number];

/**
 * Closed set of condition codes a stage may attach to a fact. Adding a code is a contract
 * change: it goes through the main session (and the decisions doc), not an ad-hoc string.
 */
export const CONDITION_CODES = [
  // --- S1 chart validation -------------------------------------------------
  'BIRTH_TIME_MISSING',
  'CONVENTIONS_PROVISIONAL',
  'VARGA_MISSING',
  'ASC_NEAR_SIGN_BOUNDARY',
  'ASC_NEAR_NAKSHATRA_BOUNDARY',
  'ASC_NEAR_D9_BOUNDARY',
  'ASC_NEAR_D10_BOUNDARY',
  'MOON_NEAR_NAKSHATRA_BOUNDARY',
  'MOON_NEAR_PADA_BOUNDARY',
  // --- S2 D1 dignity ladder (engine compound dignity; BPHS ch. 3) ---------
  'EXALTED',
  'MOOLATRIKONA',
  'OWN_SIGN',
  'GREAT_FRIEND_SIGN',
  'FRIEND_SIGN',
  'NEUTRAL_SIGN',
  'ENEMY_SIGN',
  'GREAT_ENEMY_SIGN',
  'DEBILITATED',
  'NEECHA_BHANGA', // engine-detected debility cancellation
  // --- S2 varga dignity (sign-based, CAR-002) -----------------------------
  'D9_EXALTED',
  'D9_OWN_SIGN',
  'D9_DEBILITATED',
  'D10_EXALTED',
  'D10_OWN_SIGN',
  'D10_DEBILITATED',
  'VARGOTTAMA', // D1 sign = D9 sign
  // --- S2 state -----------------------------------------------------------
  'COMBUST',
  'RETROGRADE',
  'SHADBALA_MEETS_REQUIRED', // BPHS ch. 27 required rupas
  'SHADBALA_BELOW_REQUIRED',
  // --- S2 placement (whole-sign house from the Lagna) ---------------------
  'IN_KENDRA',
  'IN_TRIKONA',
  'IN_DUSTHANA',
  'IN_UPACHAYA',
  // --- S2 functional nature (BPHS ch. 34; Laghu Parashari ch. 2) ----------
  'LAGNA_LORD',
  'LUMINARY', // Sun or Moon (context for CRP-003)
  'YOGAKARAKA_BY_OWNERSHIP', // one planet owns a kendra and a trikona
  'FUNCTIONAL_FAVOURABLE',
  'FUNCTIONAL_MIXED',
  'FUNCTIONAL_NEUTRAL',
  'FUNCTIONAL_CHALLENGING',
  // Ownership codes are non-overlapping: one code per owned house that matters.
  'OWNS_3RD',
  'OWNS_6TH',
  'OWNS_8TH',
  'OWNS_11TH',
  'OWNS_12TH',
  'OWNS_TRIKONA', // owns the 5th or 9th (supports; BPHS ch.34 trikona lords auspicious)
  'OWNS_KENDRA', // owns the 4th, 7th or 10th (context; kendradhipati handled via functional nature)
  'SHADOW_PLANET', // Rahu/Ketu: acts through its dispositor
  'NATURAL_BENEFIC',
  'NATURAL_MALEFIC',
  // --- S3 house lordship --------------------------------------------------
  'LORD_IN_KENDRA',
  'LORD_IN_TRIKONA',
  'LORD_IN_DUSTHANA',
  'LORD_IN_UPACHAYA',
  'LORD_IN_OTHER',
  'LORD_IN_OWN_HOUSE',
  'HOUSE_OCCUPIED',
  'HOUSE_EMPTY',
  'HOUSE_ASPECTED',
  'HOUSE_NOT_ASPECTED',
  'OCCUPANT_FUNCTIONAL_FAVOURABLE',
  'OCCUPANT_FUNCTIONAL_CHALLENGING',
  'ASPECT_FROM_FUNCTIONAL_FAVOURABLE',
  'ASPECT_FROM_FUNCTIONAL_CHALLENGING',
  'SAV_ABOVE_28', // BPHS Ashtakavarga: 28 = average bindus per sign
  'SAV_AT_28',
  'SAV_BELOW_28',
  // --- S4 yoga assessment -------------------------------------------------
  'YOGA_FORMED',
  'YOGA_CANCELLED', // a classical bhanga rule for that yoga is satisfied
  'YOGA_RELATION_CONJUNCTION',
  'YOGA_RELATION_MUTUAL_ASPECT',
  'YOGA_RELATION_EXCHANGE',
  'YOGA_RELATION_OWNERSHIP',
  'YOGA_KEY_PLANET_SUPPORTED',
  'YOGA_KEY_PLANET_WEAKENED',
  'YOGA_MALEFIC_OCCUPANT', // e.g. papa Vesi (BPHS ch. 38)
  'YOGA_BENEFIC_OCCUPANT',
  'YOGA_DUAL_LORDSHIP',
  'YOGA_DUSTHANA_LORD_ASSOCIATION',
  'YOGA_ACTIVE_MAHADASHA',
  'YOGA_ACTIVE_ANTARDASHA',
  // --- S5 divisional synthesis ---------------------------------------------
  'D10_LORD_IN_KENDRA',
  'D10_LORD_IN_TRIKONA',
  'D10_LORD_IN_DUSTHANA',
  'D10_LORD_IN_UPACHAYA',
  'D10_LORD_IN_OTHER',
  'SAME_LORD_D1_D10',
  'D1_D10_AGREE',
  'D1_D10_DIFFER',
  // --- S6 activation ------------------------------------------------------
  'MD_LORD',
  'AD_LORD',
  'PERIOD_LORD_RULES_HOUSE',
  'PERIOD_LORD_OCCUPIES_HOUSE',
  'PERIOD_LORD_ASPECTS_HOUSE',
  'PERIOD_LORD_D10_LINK',
  'MD_AD_MUTUAL_POSITION', // fact only; favourability is a client question
  'SATURN_12TH_FROM_MOON', // Sade Sati segment (neutral wording, D-006)
  'SATURN_OVER_MOON',
  'SATURN_2ND_FROM_MOON',
  'SATURN_4TH_FROM_MOON',
  'SATURN_8TH_FROM_MOON',
  'TRANSIT_OVER_NATAL_HOUSE',
  'TRANSIT_OVER_NATAL_LORD',
  'TRANSIT_OVER_NATAL_PLANET',
  'LIFE_STAGE_GATED', // topic content gated by age at asOf
] as const;
export type ConditionCode = (typeof CONDITION_CODES)[number];

/** Whole-sign house categories (definitional; BPHS ch. 11 / Laghu Parashari ch. 1). */
export const HOUSE_CATEGORIES = ['kendra', 'trikona', 'dusthana', 'upachaya'] as const;
export type HouseCategory = (typeof HOUSE_CATEGORIES)[number];

export const FUNCTIONAL_NATURES = ['yogakaraka', 'favourable', 'mixed', 'neutral', 'challenging', 'shadow'] as const;
/** Same vocabulary as report-engine `_finance-couple-shared/functional-nature.ts`. */
export type FunctionalNature = (typeof FUNCTIONAL_NATURES)[number];

/** Role a condition plays in the conflict policy. `context` never counts as support or challenge. */
export const CONDITION_DIRECTIONS = ['supports', 'challenges', 'context'] as const;
export type ConditionDirection = (typeof CONDITION_DIRECTIONS)[number];

// ---------------------------------------------------------------------------
// §3 result schema
// ---------------------------------------------------------------------------

export interface EvidenceLink {
  /** Existing registry ID, e.g. 'planet.venus.d1.combust'. */
  factId: string;
  /** e.g. 'COMBUST', 'OWN_SIGN', 'SAV_BELOW_28', 'LORD_IN_DUSTHANA'. */
  conditionCode: ConditionCode;
  /** Rule that classified this fact. */
  ruleId: string;
}

/** An evidence link with its role for the conflict policy (stage output form). */
export interface ConditionEntry extends EvidenceLink {
  direction: ConditionDirection;
}

export type TimeRelevance =
  | { kind: 'natal' } // lifelong tendency
  | { kind: 'period'; startIso: string; endIso: string; activatedBy: string[] } // MD/AD/transit fact IDs
  | { kind: 'current'; asOfIso: string; activatedBy: string[] };

export interface AppliedPrecedence {
  precedenceRuleId: string;
  /** Condition code that wins. */
  overrides: ConditionCode;
  /** Condition code that is set aside. */
  overridden: ConditionCode;
  source: string;
}

export interface Resolution {
  /** `<policy.id>@<policy.version>`, e.g. 'CRP@1.0.0'. */
  policyId: string;
  applied: AppliedPrecedence[];
  /** Condition codes left standing on both sides → 'mixed'. Empty unless the class is 'mixed'. */
  unresolved: ConditionCode[];
}

export interface InterpretationConclusion {
  /** Code from the rule's closed set, e.g. 'LORD_IN_DUSTHANA'. */
  code: string;
  /** Rendered from a fixed template. */
  text: string;
}

export interface InterpretationResult {
  /** 'interp.career.house-10.lord-placement' (registry-ID grammar; see ids.ts). */
  id: string;
  /** Interpretation topic key, e.g. 'career.house-10'; many report topics may use one result. */
  topic: string;
  /** 'Where does the 10th lord direct professional energy?' */
  question: string;
  conclusion: InterpretationConclusion;
  /** All supporting links, including any a precedence rule set aside (see `resolution`). */
  supporting: EvidenceLink[];
  /** All contradicting links, including any a precedence rule set aside (see `resolution`). */
  contradicting: EvidenceLink[];
  /** Every rule that contributed (stage rules + pack rule). */
  ruleIds: string[];
  /** Union of factIds (all must resolve in the registry). */
  chartRefs: string[];
  strengthClass: StrengthClass;
  timeRelevance: TimeRelevance;
  qualification: QualificationCode[];
  /** Deterministic, template-built "because" sentence the LLM may paraphrase. */
  explanation: string;
  resolution?: Resolution;
  provisional: boolean;
  /** Citations, e.g. 'BPHS 34.9', 'CAR-006'. */
  sources: string[];
}

export interface InterpretationRule {
  /** 'INT-CAR-010'. */
  id: string;
  version: string;
  stage: Stage;
  /** pending-client: tests only, never rendered. */
  status: RuleStatus;
  /** 'CAR-006'. */
  decisionRef?: string;
  sources: string[];
  /** Fact-ID patterns (registry globs); the contract test checks they resolve. */
  requiredFacts: string[];
  description: string;
}

export interface RejectedRule {
  ruleId: string;
  reason: string;
}

export interface InterpretationSet {
  schemaVersion: string;
  /** Hash of the enabled rules and the policy (ids.ts `computeRulesetVersion`). */
  rulesetVersion: string;
  snapshotId: string;
  results: InterpretationResult[];
  /** Rules skipped (missing facts, pending-client). */
  rejected: RejectedRule[];
}

// ---------------------------------------------------------------------------
// Shared rule reference (stage outputs)
// ---------------------------------------------------------------------------

export interface RuleRef {
  ruleId: string;
  source: string;
  status: RuleStatus;
}

// ---------------------------------------------------------------------------
// S1 chart validation
// ---------------------------------------------------------------------------

export interface BoundarySensitivity {
  /** Which factor is near a boundary. */
  point: 'asc-sign' | 'asc-nakshatra' | 'asc-d9' | 'asc-d10' | 'moon-nakshatra' | 'moon-pada';
  /** Minutes of birth-time change that would cross the nearest boundary (null when not computed). */
  minutesToBoundary: number | null;
  /** Threshold used (a provisional convention; recorded with its source). */
  thresholdMinutes: number;
  conditionCode: ConditionCode;
  factIds: string[];
  rule: RuleRef;
}

export interface ChartValidation {
  birthTimePresent: boolean;
  conventions: Record<string, string>;
  conventionsProvisional: boolean;
  /** Vargas the stages need but the input lacks. */
  missingVargas: string[];
  boundaries: BoundarySensitivity[];
  /** Qualifications every result inherits (e.g. BIRTH_TIME_SENSITIVE, PROVISIONAL_CONVENTION). */
  qualification: QualificationCode[];
  conditions: ConditionEntry[];
}

// ---------------------------------------------------------------------------
// S2 planet condition
// ---------------------------------------------------------------------------

/** Sign-based dignity in a varga (CAR-002: exalted / debilitated / own sign; no moolatrikona). */
export type VargaSignDignity = 'EXALTED' | 'DEBILITATED' | 'OWN_SIGN' | 'NONE';

export interface D1Dignity {
  value: PlanetaryDignity;
  /** Always 'dignity.d1.compound': the engine's five-fold compound dignity ladder. */
  definition: 'dignity.d1.compound';
  factId: string;
}

export interface VargaDignity {
  varga: 'D9' | 'D10';
  sign: string;
  house: number | null;
  value: VargaSignDignity;
  /** Always 'dignity.varga.sign': sign-based dignity only (CAR-002). */
  definition: 'dignity.varga.sign';
  factIds: string[];
}

export interface CombustionState {
  combust: boolean;
  /** Angular distance from the Sun in degrees (null when not computable). */
  distanceDeg: number | null;
  /** Orb applied by the engine (Surya Siddhanta kalamsha values; provisional). */
  orbDeg: number | null;
  factId: string;
}

export interface FunctionalNatureState {
  value: FunctionalNature;
  /** Houses (from the Lagna) the planet rules. */
  lordships: number[];
  reason: string;
  rule: RuleRef;
}

export interface ShadbalaState {
  totalRupas: number;
  /** BPHS ch. 27 minimum: Sun 6.5, Moon 6, Mars 5, Mercury 7, Jupiter 6.5, Venus 5.5, Saturn 5. */
  requiredRupas: number;
  ratio: number;
  meetsRequired: boolean;
  /** Engine Shadbala has open defects (audit 04 §0.7); always provisional until fixed and signed off. */
  provisional: true;
  rule: RuleRef;
}

export interface PlanetCondition {
  planet: PlanetName;
  sign: string;
  house: number;
  degree: number;
  dignity: D1Dignity;
  vargaDignity: { d9?: VargaDignity; d10?: VargaDignity };
  /** Null for the Sun, Rahu and Ketu. */
  combustion: CombustionState | null;
  retrograde: boolean;
  /** D1 sign = D9 sign. */
  vargottama: boolean;
  functionalNature: FunctionalNatureState;
  /** True only by ownership (kendra + trikona lord); labelled as such, never as an association. */
  yogakaraka: { value: boolean; basis: 'ownership' };
  /** Categories of the occupied house; empty for the 2nd (and other non-categorised houses). */
  houseCategories: HouseCategory[];
  /** Lord of the occupied sign. */
  dispositor: PlanetName;
  shadbala?: ShadbalaState;
  conditions: ConditionEntry[];
  factIds: string[];
}

// ---------------------------------------------------------------------------
// S3 house lordship
// ---------------------------------------------------------------------------

export interface SavAssessment {
  bindus: number;
  benchmark: 28;
  comparison: 'above' | 'at' | 'below';
  factId: string;
  rule: RuleRef;
}

export interface HouseAssessment {
  house: number;
  sign: string;
  lord: PlanetName;
  lordHouse: number;
  lordPlacementCategories: HouseCategory[];
  /** Points at `PlanetCondition.planet` of the lord (S2 output); not duplicated. */
  lordCondition: PlanetName;
  occupants: PlanetName[];
  aspectedBy: PlanetName[];
  sav: SavAssessment | null;
  /** Lord → its dispositor → … until a planet in own sign or a repeat (facts only). */
  dispositorChain: PlanetName[];
  conditions: ConditionEntry[];
  factIds: string[];
}

// ---------------------------------------------------------------------------
// S4 yoga assessment (audit 04 §5; ordinal, never summed)
// ---------------------------------------------------------------------------

export type YogaRelation =
  | 'conjunction'
  | 'mutual-aspect'
  | 'one-way-aspect'
  | 'exchange'
  | 'ownership' // Yogakaraka by ownership
  | 'placement'
  | 'distribution';

export interface YogaFormationEvidence {
  /** Engine YogaResult condition descriptions that were satisfied. */
  satisfiedConditions: string[];
  relation: YogaRelation;
  /** Planets whose condition decides the yoga. */
  keyPlanets: PlanetName[];
  rule: RuleRef;
}

export type YogaFactorKind =
  | 'dignity'
  | 'house'
  | 'functional-nature'
  | 'combustion'
  | 'retrogression'
  | 'shadbala-ratio'
  | 'd9-dignity'
  | 'vargottama'
  | 'dispositor'
  | 'avastha'
  | 'paksha'
  | 'nature-of-occupant';

export interface YogaStrengthFactor {
  planet: PlanetName;
  kind: YogaFactorKind;
  /** e.g. separation 12.6, ratio 0.92, 'DEBILITATED'. */
  observed: string | number | boolean;
  direction: 'support' | 'weaken';
  /** From a cited per-yoga rule table, never computed. */
  tier: 'major' | 'minor';
  conditionCode: ConditionCode;
  factIds: string[];
  rule: RuleRef;
}

/** Changes the kind of result, not its strength (e.g. papa Vesi, dual lordship). */
export interface YogaModifier {
  code: ConditionCode;
  description: string;
  rule: RuleRef;
}

export interface YogaCancellation {
  /** e.g. 'KEMADRUMA_BHANGA_KENDRA_FROM_MOON'. */
  id: string;
  satisfied: boolean;
  observed: string;
  rule: RuleRef;
}

export interface YogaActivationWindow {
  planet: PlanetName;
  level: 'mahadasha' | 'antardasha';
  startIso: string;
  endIso: string;
  isCurrent: boolean;
  factIds: string[];
  rule: RuleRef;
}

/** Set-logic class (audit 04 §5 decision procedure; provisional until client review). */
export type YogaClass = 'strong' | 'moderate' | 'weak' | 'cancelled';

export interface YogaAssessment {
  /** Engine YogaResult.id, e.g. 'YOGA_GAJAKESARI'. */
  yogaId: string;
  /** Registry fact ID, e.g. 'yoga.gajakesari'. */
  factId: string;
  name: string;
  /** == YogaResult.isDetected (unchanged meaning). */
  formed: boolean;
  formation: YogaFormationEvidence;
  strengthFactors: YogaStrengthFactor[];
  modifiers: YogaModifier[];
  cancellations: YogaCancellation[];
  yogaClass: YogaClass;
  /** Which decision step fired, human-readable, in order. */
  classTrace: string[];
  activations: YogaActivationWindow[];
  conditions: ConditionEntry[];
  /** Until the client signs off the rule tables. */
  provisional: true;
}

// ---------------------------------------------------------------------------
// S5 divisional synthesis (agreement is a fact, never a score)
// ---------------------------------------------------------------------------

export type DivisionalLinkKind =
  | 'vargottama'
  | 'tenth-lord-d10-house'
  | 'tenth-lord-d10-dignity'
  | 'same-lord-d1-d10'
  | 'd10-ascendant-lord'
  | 'planet-d10-dignity'; // D10 dignity of a key career planet (e.g. Jupiter debilitated in D10)

export interface DivisionalLink {
  /** Deterministic stage ID (ids.ts `stageItemId`). */
  id: string;
  kind: DivisionalLinkKind;
  planet?: PlanetName;
  varga: 'D9' | 'D10';
  d1: { sign: string; house: number } | null;
  divisional: { sign: string; house: number | null; dignity?: VargaSignDignity } | null;
  /** True/false when the link states agreement; null when purely descriptive. */
  agreement: boolean | null;
  conditions: ConditionEntry[];
  factIds: string[];
  rule: RuleRef;
}

// ---------------------------------------------------------------------------
// S6 activation
// ---------------------------------------------------------------------------

interface ActivationBase {
  /** Deterministic stage ID (ids.ts `stageItemId`). */
  id: string;
  startIso: string;
  endIso: string;
  /** Contains asOf. */
  isCurrent: boolean;
  conditions: ConditionEntry[];
  factIds: string[];
  rule: RuleRef;
}

export interface DashaActivation extends ActivationBase {
  kind: 'dasha';
  level: 'mahadasha' | 'antardasha';
  lord: PlanetName;
  /** Mahadasha lord for an antardasha. */
  parentLord?: PlanetName;
  housesRuled: number[];
  houseOccupied: number;
  housesAspected: number[];
  d10House: number | null;
  /** YogaAssessment.yogaId values whose key planets include this lord. */
  yogasActivated: string[];
  /** Completed years at start and end (age gating; e.g. never "first earnings" after 60). */
  ageAtStart: number;
  ageAtEnd: number;
}

export interface MdAdPositionActivation extends ActivationBase {
  kind: 'md-ad-position';
  mdLord: PlanetName;
  adLord: PlanetName;
  /** Sign count from the MD lord to the AD lord (1–12) and back. Fact only. */
  adFromMd: number;
  mdFromAd: number;
}

/** Saturn's sign counted from the natal Moon sign. Neutral wording (D-006). */
export type SaturnFromMoonPhase = 'twelfth' | 'over-moon' | 'second' | 'fourth' | 'eighth';

export interface SaturnFromMoonActivation extends ActivationBase {
  kind: 'saturn-from-moon';
  phase: SaturnFromMoonPhase;
  /** 12, 1, 2 = Sade Sati segments. */
  houseFromMoon: 12 | 1 | 2 | 4 | 8;
  isSadeSati: boolean;
  saturnSign: string;
}

export interface TransitOverNatalActivation extends ActivationBase {
  kind: 'transit-over-natal';
  planet: 'Jupiter' | 'Saturn';
  sign: string;
  houseFromAsc: number;
  houseFromMoon: number;
  /** Natal houses whose lord occupies the transited sign. */
  overLordOf: number[];
  /** Natal planets in the transited sign. */
  overPlanets: PlanetName[];
  enteredRetrograde: boolean;
}

export type Activation = DashaActivation | MdAdPositionActivation | SaturnFromMoonActivation | TransitOverNatalActivation;

// ---------------------------------------------------------------------------
// Stage bundle
// ---------------------------------------------------------------------------

export interface StageOutputs {
  s1: ChartValidation;
  s2: PlanetCondition[];
  s3: HouseAssessment[];
  s4: YogaAssessment[];
  s5: DivisionalLink[];
  s6: Activation[];
}

// ---------------------------------------------------------------------------
// §4 conflict policy (data, not code)
// ---------------------------------------------------------------------------

export const PRECEDENCE_OUTCOMES = ['a-overrides-b', 'present-both'] as const;
export type PrecedenceOutcome = (typeof PRECEDENCE_OUTCOMES)[number];

export interface PrecedenceRule {
  /** 'CRP-001'. */
  id: string;
  /**
   * `a` must be standing on one side (supporting, contradicting, or a `context` condition);
   * each code in `b` that is present on the opposite side (or on either side when `a` is
   * context) is set aside. The resolver is always called for one subject, so `sameSubject`
   * is true by construction.
   */
  when: { a: ConditionCode; b: ConditionCode[]; sameSubject: true };
  outcome: PrecedenceOutcome;
  /** Qualifications added when the rule is applied (e.g. CANCELLATION_APPLIED). */
  adds: QualificationCode[];
  source: string;
  /** approved / provisional rules apply; pending-client rules never apply. */
  status: RuleStatus;
  description: string;
}

export interface ConflictPolicy {
  id: string;
  version: string;
  rules: PrecedenceRule[];
}

/** Conditions about one subject (planet, house, yoga, period…). */
export interface ConflictInput {
  /** e.g. 'planet.venus', 'house.10', 'yoga.gajakesari'. */
  subject: string;
  supporting: EvidenceLink[];
  contradicting: EvidenceLink[];
  /** Neutral facts that can trigger a precedence rule but never count as support or challenge. */
  context?: EvidenceLink[];
  /** False for descriptive rules: the class is 'not-assessed' and no policy is applied. */
  assess?: boolean;
}

export interface ConflictOutcome {
  subject: string;
  strengthClass: StrengthClass;
  /** Links still standing after precedence rules. */
  standingSupporting: EvidenceLink[];
  standingContradicting: EvidenceLink[];
  /** Links set aside by an applied precedence rule. */
  overridden: EvidenceLink[];
  resolution: Resolution;
  /** MIXED_INDICATORS, PROVISIONAL_RULE, plus each applied rule's `adds`; sorted, unique. */
  qualification: QualificationCode[];
  /** Precedence rule IDs applied (sorted); callers add them to `InterpretationResult.ruleIds`. */
  ruleIds: string[];
  /** Citations of the applied precedence rules (sorted, unique). */
  sources: string[];
}
