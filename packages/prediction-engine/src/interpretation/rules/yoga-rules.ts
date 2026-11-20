/**
 * S4 yoga-assessment rule table (cited, data only).
 *
 * Every strength factor, modifier and cancellation the S4 stage emits comes from one row of
 * this file. A row carries its direction (support / weaken), its tier (major / minor), its
 * source and its approval status. Nothing here is a numeric weight: the class is decided by
 * the set logic in `YOGA_CLASS_PROCEDURE` (decision 7, audit 04 §5).
 *
 * Citations follow R. Santhanam's BPHS numbering. Anything marked "(verify)" must be checked
 * against the book before it is shown as a verse reference. All rows are `provisional`
 * (pending client review, ADR-016) unless the row says `pending-client`; pending-client rows
 * are evaluated and reported in `strengthFactors` but never decide a class and never become
 * a stage condition (decision 8).
 */
import type {
  ConditionCode,
  InterpretationRule,
  PlanetName,
  RuleRef,
  RuleStatus,
  YogaFactorKind,
} from '../types';

export const YOGA_RULES_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Sources (one string per citation; reused by the rows)
// ---------------------------------------------------------------------------

export const YOGA_SOURCES = {
  WEAK_YOGA_PLANETS:
    'Phaladeepika ch. 6 (closing verses: yogas formed by planets that are debilitated, combust, in enemy signs or in the 6th/8th/12th give meagre results; verify verse)',
  GAJAKESARI_BPHS:
    'BPHS ch. 36 Gajakesari: Jupiter not debilitated, not combust, not in an enemy sign (Santhanam numbering; verify verse)',
  DIGNITY_LADDER: 'BPHS ch. 3 (exaltation, moolatrikona, own sign; compound friendship)',
  SHADBALA_REQUIRED: 'BPHS ch. 27 (required Shadbala rupas: Sun 6.5, Moon 6, Mars 5, Mercury 7, Jupiter 6.5, Venus 5.5, Saturn 5)',
  VARGA_DIGNITY: 'BPHS ch. 7 (varga dignity; Navamsa own/exaltation and vargottama strengthen; verify verse)',
  PAKSHA: 'BPHS ch. 3 (waning Moon counted among malefics) and ch. 27 (Paksha Bala)',
  AVASTHA: 'BPHS ch. 45 (Baladi avasthas: a planet in Mrita avastha gives negligible results; verify verse)',
  COMBUSTION_ORB: 'Surya Siddhanta kalamsha combustion orbs (engine planets/combustion.ts; provisional)',
  BUDHA_ADITYA_COMBUST:
    'Raman, Three Hundred Important Combinations (Budha-Aditya); combustion of Mercury weakens the yoga (provisional default, audit 04 §6.2: threshold = full Surya Siddhanta orb, 14° direct / 12° retrograde)',
  RAJA_DILUTION:
    'BPHS ch. 34 and Laghu Parashari ch. 2: kendra/trikona lords that also own, or are joined with, the 8th or 11th lord do not give full Raja-yoga results (verify verses)',
  VIPARITA_CONDITIONAL:
    'Commentarial condition on Viparita Raja Yoga (Phaladeepika ch. 6 v. 63-68 and Uttara Kalamrita commentaries; verify): the dusthana lord must not own or join a kendra/trikona lord, and must itself be unafflicted',
  FLANK_VARIANT:
    'BPHS ch. 37 (Sunapha/Anapha/Durudhara) and ch. 38 (Vesi/Vasi/Ubhayachari): results differ for benefic (shubha) and malefic (papa) occupants (Saravali, verify)',
  KEMADRUMA_BHANGA:
    'BPHS ch. 37 and Phaladeepika ch. 6: Kemadruma is cancelled by a planet in a kendra from the Lagna or the Moon (verify verses)',
  MAHAPURUSHA_LUMINARY:
    'Saravali / Phaladeepika ch. 6 (verify): a Mahapurusha planet joined by the Sun or Moon gives reduced results (audit 04 §6.9, client question)',
  CLASS_PROCEDURE:
    'Audit 04 §5 net-class decision procedure (provisional – pending client review); decision 7: set logic only, no numeric weights',
  ACTIVATION:
    'BPHS ch. 34 and Laghu Parashari ch. 3-4: a yoga gives its results in the dasha/antardasha of the planets that form it (verify verses)',
} as const;

// ---------------------------------------------------------------------------
// Yoga families (engine YogaResult.id → rule family)
// ---------------------------------------------------------------------------

export type YogaFamily =
  | 'gajakesari'
  | 'budha-aditya'
  | 'solar-flank' // Vesi, Vasi (Vosi), Ubhayachari
  | 'lunar-flank' // Sunapha, Anapha, Durudhara
  | 'kemadruma'
  | 'viparita' // Harsha, Sarala, Vimala
  | 'raja' // kendra-trikona, Yogakaraka-by-ownership, Dharma-Karmadhipati
  | 'dhana'
  | 'mahapurusha'
  | 'amala' // a benefic in the 10th: house placement IS the formation
  | 'neecha-bhanga'
  | 'nabhasa'
  | 'other';

const MAHAPURUSHA_IDS = new Set(['YOGA_RUCHAKA', 'YOGA_BHADRA', 'YOGA_HAMSA', 'YOGA_MALAVYA', 'YOGA_SHASHA']);

/** Maps an engine yoga id to its rule family. Unknown ids fall back to 'other' (generic rows only). */
export function yogaFamily(yogaId: string): YogaFamily {
  if (yogaId === 'YOGA_GAJAKESARI') return 'gajakesari';
  if (yogaId === 'YOGA_BUDHA_ADITYA') return 'budha-aditya';
  if (yogaId === 'YOGA_VESI' || yogaId === 'YOGA_VOSI' || yogaId === 'YOGA_VASI' || yogaId === 'YOGA_UBHAYACHARI') return 'solar-flank';
  if (yogaId === 'YOGA_SUNAPHA' || yogaId === 'YOGA_ANAPHA' || yogaId === 'YOGA_DURUDHARA') return 'lunar-flank';
  if (yogaId === 'YOGA_KEMADRUMA') return 'kemadruma';
  if (yogaId === 'YOGA_HARSHA' || yogaId === 'YOGA_SARALA' || yogaId === 'YOGA_VIMALA') return 'viparita';
  if (yogaId === 'YOGA_DHARMA_KARMADHIPATI' || yogaId.startsWith('YOGA_RAJA_')) return 'raja';
  if (yogaId.startsWith('YOGA_DHANA_')) return 'dhana';
  if (MAHAPURUSHA_IDS.has(yogaId)) return 'mahapurusha';
  if (yogaId === 'YOGA_AMALA') return 'amala';
  if (yogaId.startsWith('YOGA_NEECHA_BHANGA')) return 'neecha-bhanga';
  if (yogaId.startsWith('YOGA_NABHASA_')) return 'nabhasa';
  return 'other';
}

/**
 * Families that get no planet-strength factors:
 * - nabhasa: a distribution pattern with no key planets;
 * - kemadruma: an inauspicious yoga; grading its "strength" from the Moon's condition would
 *   invert the meaning. Only formation and bhanga are reported (no-dosha stance; client question).
 */
export const FAMILIES_WITHOUT_FACTORS: ReadonlySet<YogaFamily> = new Set<YogaFamily>(['nabhasa', 'kemadruma']);

// ---------------------------------------------------------------------------
// Factor rows
// ---------------------------------------------------------------------------

/** Closed set of predicates the stage knows how to evaluate (see stages/yoga-assessment.ts). */
export type YogaFactorTest =
  | 'D1_DEBILITATED' // debilitated in D1 with no engine neecha bhanga
  | 'D1_COMBUST'
  | 'D1_NOT_COMBUST'
  | 'D1_ENEMY_SIGN' // ENEMY or GREAT_ENEMY compound relationship
  | 'D1_FRIEND_SIGN' // FRIEND or GREAT_FRIEND
  | 'D1_OWN_EXALTED_MT' // EXALTED, MOOLATRIKONA or OWN_SIGN
  | 'IN_DUSTHANA' // 6, 8, 12 from the Lagna
  | 'IN_KENDRA_OR_TRIKONA'
  | 'SHADBALA_BELOW_REQUIRED'
  | 'SHADBALA_MEETS_REQUIRED'
  | 'D9_DEBILITATED'
  | 'D9_OWN_OR_EXALTED'
  | 'VARGOTTAMA'
  | 'MOON_WANING'
  | 'MOON_WAXING'
  | 'AVASTHA_MRITA'
  | 'OWNS_8TH_OR_11TH'
  | 'JOINED_WITH_8TH_OR_11TH_LORD' // same sign as another planet owning the 8th or 11th
  | 'DUSTHANA_LORD_OWNS_KENDRA_OR_TRIKONA'
  | 'DUSTHANA_LORD_JOINS_KENDRA_OR_TRIKONA_LORD'
  | 'JOINED_WITH_LUMINARY'; // same sign as the Sun or the Moon

export interface YogaFactorRule {
  /** 'INT-YF-001'. */
  id: string;
  version: string;
  test: YogaFactorTest;
  /** Families the row applies to; absent = every family that gets factors. */
  families?: readonly YogaFamily[];
  /** Families excluded from a generic row. */
  excludeFamilies?: readonly YogaFamily[];
  /** Only this key planet (e.g. Jupiter for Gajakesari); absent = every key planet. */
  planet?: PlanetName;
  kind: YogaFactorKind;
  direction: 'support' | 'weaken';
  tier: 'major' | 'minor';
  /** Condition code; `null` = derive from the observed value (dignity / D9 rows). */
  conditionCode: ConditionCode | null;
  source: string;
  status: RuleStatus;
  description: string;
}

const P: RuleStatus = 'provisional';

/**
 * Factor rows. When several rows have the same `test` for the same planet and yoga, only the
 * most specific one applies (planet-specific > family-specific > generic), so a family can
 * re-tier a generic factor (e.g. Jupiter's enemy sign is MAJOR for Gajakesari, minor elsewhere).
 */
export const YOGA_FACTOR_RULES: readonly YogaFactorRule[] = [
  // --- Generic rows (every assessed family) -------------------------------
  { id: 'INT-YF-001', version: '1.0.0', test: 'D1_DEBILITATED', excludeFamilies: ['neecha-bhanga'], kind: 'dignity', direction: 'weaken', tier: 'major', conditionCode: 'DEBILITATED', source: YOGA_SOURCES.WEAK_YOGA_PLANETS, status: P, description: 'A key planet debilitated in D1 (without engine neecha bhanga) weakens the yoga.' },
  { id: 'INT-YF-002', version: '1.0.0', test: 'D1_COMBUST', kind: 'combustion', direction: 'weaken', tier: 'major', conditionCode: 'COMBUST', source: `${YOGA_SOURCES.WEAK_YOGA_PLANETS}; ${YOGA_SOURCES.COMBUSTION_ORB}`, status: P, description: 'A key planet within its combustion orb weakens the yoga.' },
  { id: 'INT-YF-003', version: '1.0.0', test: 'D1_ENEMY_SIGN', kind: 'dignity', direction: 'weaken', tier: 'minor', conditionCode: null, source: YOGA_SOURCES.WEAK_YOGA_PLANETS, status: P, description: 'A key planet in an enemy or great-enemy sign (compound) is a minor weakening.' },
  { id: 'INT-YF-004', version: '1.0.0', test: 'D1_FRIEND_SIGN', kind: 'dignity', direction: 'support', tier: 'minor', conditionCode: null, source: YOGA_SOURCES.DIGNITY_LADDER, status: P, description: 'A key planet in a friend or great-friend sign (compound) is a minor support.' },
  { id: 'INT-YF-005', version: '1.0.0', test: 'D1_OWN_EXALTED_MT', excludeFamilies: ['mahapurusha'], kind: 'dignity', direction: 'support', tier: 'major', conditionCode: null, source: YOGA_SOURCES.DIGNITY_LADDER, status: P, description: 'A key planet exalted, in moolatrikona or in its own sign is a major support.' },
  { id: 'INT-YF-006', version: '1.0.0', test: 'IN_DUSTHANA', excludeFamilies: ['viparita'], kind: 'house', direction: 'weaken', tier: 'major', conditionCode: 'IN_DUSTHANA', source: `${YOGA_SOURCES.WEAK_YOGA_PLANETS}; audit 04 §5 tier`, status: P, description: 'A key planet in the 6th, 8th or 12th from the Lagna weakens the yoga (not for Viparita yogas, whose formation is dusthana placement).' },
  { id: 'INT-YF-007', version: '1.0.0', test: 'IN_KENDRA_OR_TRIKONA', excludeFamilies: ['mahapurusha', 'amala'], kind: 'house', direction: 'support', tier: 'major', conditionCode: null, source: 'Audit 04 §5 tier (kendra/trikona placement as a major support); BPHS ch. 34 (verify)', status: P, description: 'A key planet in a kendra or trikona from the Lagna is a major support (not for yogas whose formation is that placement: Mahapurusha, Amala).' },
  { id: 'INT-YF-008', version: '1.0.0', test: 'SHADBALA_BELOW_REQUIRED', kind: 'shadbala-ratio', direction: 'weaken', tier: 'major', conditionCode: 'SHADBALA_BELOW_REQUIRED', source: `${YOGA_SOURCES.SHADBALA_REQUIRED}; tier per audit 04 §5 (engine Shadbala provisional)`, status: P, description: 'A key planet below its BPHS required Shadbala weakens the yoga.' },
  { id: 'INT-YF-009', version: '1.0.0', test: 'SHADBALA_MEETS_REQUIRED', kind: 'shadbala-ratio', direction: 'support', tier: 'minor', conditionCode: 'SHADBALA_MEETS_REQUIRED', source: YOGA_SOURCES.SHADBALA_REQUIRED, status: P, description: 'A key planet meeting its required Shadbala is a minor support (and a precondition of "strong").' },
  { id: 'INT-YF-010', version: '1.0.0', test: 'D9_DEBILITATED', kind: 'd9-dignity', direction: 'weaken', tier: 'minor', conditionCode: 'D9_DEBILITATED', source: YOGA_SOURCES.VARGA_DIGNITY, status: P, description: 'A key planet debilitated in the Navamsa is a minor weakening.' },
  { id: 'INT-YF-011', version: '1.0.0', test: 'D9_OWN_OR_EXALTED', kind: 'd9-dignity', direction: 'support', tier: 'major', conditionCode: null, source: `${YOGA_SOURCES.VARGA_DIGNITY}; tier per audit 04 §5`, status: P, description: 'A key planet in its own or exaltation sign in the Navamsa is a major support.' },
  { id: 'INT-YF-012', version: '1.0.0', test: 'VARGOTTAMA', kind: 'vargottama', direction: 'support', tier: 'major', conditionCode: 'VARGOTTAMA', source: `${YOGA_SOURCES.VARGA_DIGNITY}; tier per audit 04 §5`, status: P, description: 'A vargottama key planet (D1 sign = D9 sign) is a major support.' },
  { id: 'INT-YF-013', version: '1.0.0', test: 'MOON_WANING', planet: 'Moon', kind: 'paksha', direction: 'weaken', tier: 'minor', conditionCode: 'YOGA_KEY_PLANET_WEAKENED', source: YOGA_SOURCES.PAKSHA, status: P, description: 'A waning Moon (Krishna paksha) as a key planet is a minor weakening.' },
  { id: 'INT-YF-014', version: '1.0.0', test: 'MOON_WAXING', planet: 'Moon', kind: 'paksha', direction: 'support', tier: 'minor', conditionCode: 'YOGA_KEY_PLANET_SUPPORTED', source: YOGA_SOURCES.PAKSHA, status: P, description: 'A waxing Moon (Shukla paksha) as a key planet is a minor support.' },
  { id: 'INT-YF-015', version: '1.0.0', test: 'AVASTHA_MRITA', kind: 'avastha', direction: 'weaken', tier: 'minor', conditionCode: 'YOGA_KEY_PLANET_WEAKENED', source: YOGA_SOURCES.AVASTHA, status: P, description: 'A key planet in Mrita (Baladi) avastha is a minor weakening.' },

  // --- Gajakesari (BPHS ch. 36 qualifiers on Jupiter: MAJOR) ---------------
  { id: 'INT-YF-101', version: '1.0.0', test: 'D1_DEBILITATED', families: ['gajakesari'], planet: 'Jupiter', kind: 'dignity', direction: 'weaken', tier: 'major', conditionCode: 'DEBILITATED', source: YOGA_SOURCES.GAJAKESARI_BPHS, status: P, description: 'Gajakesari: Jupiter debilitated (BPHS qualifier).' },
  { id: 'INT-YF-102', version: '1.0.0', test: 'D1_COMBUST', families: ['gajakesari'], planet: 'Jupiter', kind: 'combustion', direction: 'weaken', tier: 'major', conditionCode: 'COMBUST', source: `${YOGA_SOURCES.GAJAKESARI_BPHS}; ${YOGA_SOURCES.COMBUSTION_ORB}`, status: P, description: 'Gajakesari: Jupiter combust (BPHS qualifier).' },
  { id: 'INT-YF-103', version: '1.0.0', test: 'D1_ENEMY_SIGN', families: ['gajakesari'], planet: 'Jupiter', kind: 'dignity', direction: 'weaken', tier: 'major', conditionCode: null, source: YOGA_SOURCES.GAJAKESARI_BPHS, status: P, description: 'Gajakesari: Jupiter in an enemy sign (BPHS qualifier) is MAJOR, not minor.' },

  // --- Budha-Aditya (Mercury combustion; client convention pending) --------
  { id: 'INT-YF-201', version: '1.0.0', test: 'D1_COMBUST', families: ['budha-aditya'], planet: 'Mercury', kind: 'combustion', direction: 'weaken', tier: 'major', conditionCode: 'COMBUST', source: `${YOGA_SOURCES.BUDHA_ADITYA_COMBUST}; ${YOGA_SOURCES.COMBUSTION_ORB}`, status: P, description: 'Budha-Aditya: Mercury within the full combustion orb (14° direct, 12° retrograde) weakens the yoga. Whether it cancels instead is a client question.' },
  { id: 'INT-YF-202', version: '1.0.0', test: 'D1_NOT_COMBUST', families: ['budha-aditya'], planet: 'Mercury', kind: 'combustion', direction: 'support', tier: 'minor', conditionCode: 'YOGA_KEY_PLANET_SUPPORTED', source: YOGA_SOURCES.BUDHA_ADITYA_COMBUST, status: P, description: 'Budha-Aditya: Mercury in the same sign as the Sun but outside its combustion orb.' },

  // --- Raja (BPHS ch. 34 / Laghu Parashari dilution) -----------------------
  { id: 'INT-YF-301', version: '1.0.0', test: 'OWNS_8TH_OR_11TH', families: ['raja'], kind: 'functional-nature', direction: 'weaken', tier: 'minor', conditionCode: null, source: YOGA_SOURCES.RAJA_DILUTION, status: P, description: 'Raja yoga: a forming lord that also owns the 8th or 11th dilutes the yoga.' },
  { id: 'INT-YF-302', version: '1.0.0', test: 'JOINED_WITH_8TH_OR_11TH_LORD', families: ['raja'], kind: 'nature-of-occupant', direction: 'weaken', tier: 'major', conditionCode: 'YOGA_DUSTHANA_LORD_ASSOCIATION', source: YOGA_SOURCES.RAJA_DILUTION, status: P, description: 'Raja yoga: a forming lord joined (same sign) with the 8th or 11th lord does not give full results (e.g. Mars with the 8th lord Saturn).' },

  // --- Viparita (commentarial conditions; results conditional) -------------
  { id: 'INT-YF-401', version: '1.0.0', test: 'DUSTHANA_LORD_OWNS_KENDRA_OR_TRIKONA', families: ['viparita'], kind: 'functional-nature', direction: 'weaken', tier: 'major', conditionCode: 'YOGA_DUAL_LORDSHIP', source: YOGA_SOURCES.VIPARITA_CONDITIONAL, status: P, description: 'Viparita: the dusthana lord also owns a kendra or trikona (e.g. Saturn as 7th and 8th lord for Cancer).' },
  { id: 'INT-YF-402', version: '1.0.0', test: 'DUSTHANA_LORD_JOINS_KENDRA_OR_TRIKONA_LORD', families: ['viparita'], kind: 'nature-of-occupant', direction: 'weaken', tier: 'major', conditionCode: 'YOGA_DUSTHANA_LORD_ASSOCIATION', source: YOGA_SOURCES.VIPARITA_CONDITIONAL, status: P, description: 'Viparita: the dusthana lord is associated with a kendra or trikona lord.' },

  // --- Mahapurusha (client question 9; not yet sourced well enough) --------
  { id: 'INT-YF-501', version: '1.0.0', test: 'JOINED_WITH_LUMINARY', families: ['mahapurusha'], kind: 'nature-of-occupant', direction: 'weaken', tier: 'minor', conditionCode: 'YOGA_KEY_PLANET_WEAKENED', source: YOGA_SOURCES.MAHAPURUSHA_LUMINARY, status: 'pending-client', description: 'Mahapurusha: the forming planet joined by the Sun or Moon (pending client; never decides the class).' },
];

// ---------------------------------------------------------------------------
// Engine cancellation / qualifier flags → effect
// ---------------------------------------------------------------------------

/**
 * `bhanga`: a classical cancellation; a satisfied flag makes the class `cancelled`.
 * `qualifier`: reported in `cancellations` for transparency only; its substance is already
 * evaluated by a factor row above (so it is never counted twice).
 */
export type EngineFlagEffect = 'bhanga' | 'qualifier';

export interface EngineFlagRule {
  id: string;
  /** Engine `YogaCancellationFlag.id` prefix. */
  flagPrefix: string;
  effect: EngineFlagEffect;
  source: string;
  status: RuleStatus;
  description: string;
}

export const ENGINE_FLAG_RULES: readonly EngineFlagRule[] = [
  { id: 'INT-YC-001', flagPrefix: 'KEMADRUMA_BHANGA_', effect: 'bhanga', source: YOGA_SOURCES.KEMADRUMA_BHANGA, status: P, description: 'Kemadruma bhanga: a planet in a kendra from the Lagna or the Moon cancels Kemadruma.' },
  { id: 'INT-YC-002', flagPrefix: 'BPHS_JUPITER_', effect: 'qualifier', source: YOGA_SOURCES.GAJAKESARI_BPHS, status: P, description: 'Gajakesari BPHS qualifiers; evaluated as factor rows INT-YF-101..103.' },
  { id: 'INT-YC-003', flagPrefix: 'BPHS_KENDRA_FROM_LAGNA', effect: 'qualifier', source: YOGA_SOURCES.GAJAKESARI_BPHS, status: P, description: 'Gajakesari: Jupiter also in a kendra from the Lagna; evaluated as factor row INT-YF-007.' },
  { id: 'INT-YC-004', flagPrefix: 'MERCURY_COMBUST', effect: 'qualifier', source: YOGA_SOURCES.BUDHA_ADITYA_COMBUST, status: P, description: 'Budha-Aditya: Mercury combust; evaluated as factor row INT-YF-201.' },
  { id: 'INT-YC-005', flagPrefix: 'DUSTHANA_LORD_', effect: 'qualifier', source: YOGA_SOURCES.VIPARITA_CONDITIONAL, status: P, description: 'Viparita commentarial conditions; evaluated as factor rows INT-YF-401/402 and modifiers.' },
  { id: 'INT-YC-006', flagPrefix: 'LORD_ALSO_OWNS_8TH_OR_11TH_', effect: 'qualifier', source: YOGA_SOURCES.RAJA_DILUTION, status: P, description: 'Raja/Dhana: a lord also owns the 8th or 11th; evaluated as factor row INT-YF-301 (Raja only).' },
];

/** Fallback for an engine flag no row knows: reported only, never decides the class. */
export const UNKNOWN_FLAG_RULE: EngineFlagRule = {
  id: 'INT-YC-999',
  flagPrefix: '',
  effect: 'qualifier',
  source: 'Engine yoga flag without an S4 rule row (reported only)',
  status: 'pending-client',
  description: 'Unknown engine flag: listed, never applied.',
};

export function engineFlagRule(flagId: string): EngineFlagRule {
  return ENGINE_FLAG_RULES.find((r) => flagId.startsWith(r.flagPrefix)) ?? UNKNOWN_FLAG_RULE;
}

// ---------------------------------------------------------------------------
// Class procedure (set logic, documented)
// ---------------------------------------------------------------------------

/**
 * Decision procedure for `YogaAssessment.yogaClass` (provisional; audit 04 §5, decision 7).
 * Only factors from rows that are not `pending-client` take part. "MW" = the set of MAJOR
 * WEAKEN factors on key planets; "MS" = the set of MAJOR SUPPORT factors on key planets.
 *
 *   D1 cancelled : the engine reports `assessment.cancelled`, or a satisfied engine flag maps
 *                  to a `bhanga` row (ENGINE_FLAG_RULES).
 *   D2 weak      : |MW| ≥ 2 and MS = ∅.
 *   D3 strong    : MW = ∅, MS ≠ ∅, and every graha key planet has a known Shadbala that meets
 *                  its BPHS ch. 27 requirement (unknown Shadbala blocks "strong").
 *   D4 moderate  : anything else (including yogas without key planets or without a factor
 *                  table, which are formation-only).
 *
 * Modifiers (papa/shubha occupant, dual lordship, association) change the KIND of result and
 * never the class. "|MW| ≥ 2" is a set-cardinality threshold from the audit, not a weight.
 */
export const YOGA_CLASS_PROCEDURE = {
  id: 'INT-Y-002',
  steps: ['D1 cancelled', 'D2 weak', 'D3 strong', 'D4 moderate'],
  weakMinMajorWeaken: 2,
  source: YOGA_SOURCES.CLASS_PROCEDURE,
} as const;

// ---------------------------------------------------------------------------
// Stage rules (InterpretationRule form, for packs and computeRulesetVersion)
// ---------------------------------------------------------------------------

export const S4_RULE_IDS = {
  FORMATION: 'INT-Y-001',
  CLASS: 'INT-Y-002',
  MODIFIER_VARIANT: 'INT-Y-003',
  MODIFIER_VIPARITA: 'INT-Y-004',
  ACTIVATION: 'INT-Y-005',
} as const;

export const S4_RULES: readonly InterpretationRule[] = [
  { id: S4_RULE_IDS.FORMATION, version: '1.0.0', stage: 'S4', status: P, sources: ['Engine yoga evaluators (convention string per yoga); audit 04 §1'], requiredFacts: ['yoga.*'], description: 'Formation evidence: engine YogaResult conditions, relation and key planets.' },
  { id: S4_RULE_IDS.CLASS, version: '1.0.0', stage: 'S4', status: P, sources: [YOGA_SOURCES.CLASS_PROCEDURE], requiredFacts: ['yoga.*', 'planet.*.d1.dignity', 'planet.*.d1.house'], description: 'Set-logic yoga class (cancelled / weak / strong / moderate) from cited factor rows.' },
  { id: S4_RULE_IDS.MODIFIER_VARIANT, version: '1.0.0', stage: 'S4', status: P, sources: [YOGA_SOURCES.FLANK_VARIANT], requiredFacts: ['yoga.*'], description: 'Benefic/malefic occupant variant of Vesi/Vasi/Ubhayachari and Sunapha/Anapha/Durudhara.' },
  { id: S4_RULE_IDS.MODIFIER_VIPARITA, version: '1.0.0', stage: 'S4', status: P, sources: [YOGA_SOURCES.VIPARITA_CONDITIONAL], requiredFacts: ['yoga.*', 'planet.*.d1.lordship'], description: 'Viparita results are conditional on the dusthana lord (dual lordship, association).' },
  { id: S4_RULE_IDS.ACTIVATION, version: '1.0.0', stage: 'S4', status: P, sources: [YOGA_SOURCES.ACTIVATION], requiredFacts: ['dasha.md.*'], description: 'A yoga is active in the Vimshottari MD/AD of its key planets.' },
  ...YOGA_FACTOR_RULES.map((r): InterpretationRule => ({
    id: r.id, version: r.version, stage: 'S4', status: r.status, sources: [r.source], requiredFacts: ['planet.*.d1.dignity'], description: r.description,
  })),
  ...[...ENGINE_FLAG_RULES, UNKNOWN_FLAG_RULE].map((r): InterpretationRule => ({
    id: r.id, version: '1.0.0', stage: 'S4', status: r.status, sources: [r.source], requiredFacts: ['yoga.*'], description: r.description,
  })),
];

export function s4RuleRef(ruleId: string): RuleRef {
  const r = S4_RULES.find((x) => x.id === ruleId);
  if (!r) throw new Error(`Unknown S4 rule ${ruleId}`);
  return { ruleId: r.id, source: r.sources[0], status: r.status };
}

export function factorRuleRef(rule: YogaFactorRule): RuleRef {
  return { ruleId: rule.id, source: rule.source, status: rule.status };
}

/**
 * Most specific applicable row for (family, planet, test), or undefined.
 * Specificity: planet-specific (2) + family-specific (1).
 */
export function applicableFactorRule(family: YogaFamily, planet: PlanetName, test: YogaFactorTest): YogaFactorRule | undefined {
  let best: YogaFactorRule | undefined;
  let bestScore = -1;
  for (const r of YOGA_FACTOR_RULES) {
    if (r.test !== test) continue;
    if (r.families && !r.families.includes(family)) continue;
    if (r.excludeFamilies && r.excludeFamilies.includes(family)) continue;
    if (r.planet && r.planet !== planet) continue;
    const score = (r.planet ? 2 : 0) + (r.families ? 1 : 0);
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}

/** All factor tests in a stable evaluation order. */
export const YOGA_FACTOR_TESTS: readonly YogaFactorTest[] = [
  'D1_DEBILITATED', 'D1_COMBUST', 'D1_NOT_COMBUST', 'D1_ENEMY_SIGN', 'D1_FRIEND_SIGN', 'D1_OWN_EXALTED_MT',
  'IN_DUSTHANA', 'IN_KENDRA_OR_TRIKONA', 'SHADBALA_BELOW_REQUIRED', 'SHADBALA_MEETS_REQUIRED',
  'D9_DEBILITATED', 'D9_OWN_OR_EXALTED', 'VARGOTTAMA', 'MOON_WANING', 'MOON_WAXING', 'AVASTHA_MRITA',
  'OWNS_8TH_OR_11TH', 'JOINED_WITH_8TH_OR_11TH_LORD', 'DUSTHANA_LORD_OWNS_KENDRA_OR_TRIKONA',
  'DUSTHANA_LORD_JOINS_KENDRA_OR_TRIKONA_LORD', 'JOINED_WITH_LUMINARY',
];
