/**
 * Interpretation pipeline (proposal §2, S1–S8).
 *
 *   S1 chart validation → S2 planet condition → S3 house lordship → S4 yoga assessment
 *   → S5 divisional synthesis → S6 activation → S7/S8 pack builders (conflict policy via
 *   `ctx.resolve`) → schema validation.
 *
 * Pure: same input, same output; no wall-clock time; result IDs come from content.
 *
 * Rule handling (decision 8, interpretation.md §5):
 *   - a rule is known when the pack lists it (the catalogue) or a stage output carries its
 *     `RuleRef`; a condition citing an unknown rule ID is treated as pending-client (unsourced);
 *   - pending-client rules are left out of `ctx.rules`, listed in `rejected`, and any result that
 *     still cites one is dropped, unless `includePendingClient` is set (tests only);
 *   - a pack (S8) rule whose `requiredFacts` do not resolve in the fact view is rejected the same way;
 *   - a result citing a provisional rule is marked `provisional` with `PROVISIONAL_RULE`.
 *
 * `rulesetVersion` = `computeRulesetVersion(enabled pack rules, policy)`.
 */
import { runConflictResolution, sortQualifications } from './conflict/resolve';
import { buildInterpretationId, computeRulesetVersion } from './ids';
import { deriveLifeStage, type FactView, type InterpretationInput } from './input';
import { InterpretationRuleSchema, InterpretationSetSchema } from './schema';
import type {
  InterpretationPack,
  PackBuildContext,
  RunInterpretation,
  RunInterpretationOptions,
  RunS1ChartValidation,
  RunS2PlanetCondition,
  RunS3HouseLordship,
  RunS4YogaAssessment,
  RunS5DivisionalSynthesis,
  RunS6Activation,
} from './stages';
import { runS1ChartValidation } from './stages/chart-validation';
import { runS2PlanetCondition } from './stages/planet-condition';
import { runS3HouseLordship } from './stages/house-lordship';
import { runS4YogaAssessment } from './stages/yoga-assessment';
import { runS5DivisionalSynthesis } from './stages/divisional';
import { runS6Activation } from './stages/activation';
import type {
  ConditionEntry,
  ConflictPolicy,
  InterpretationResult,
  InterpretationRule,
  InterpretationSet,
  RejectedRule,
  RuleRef,
  RuleStatus,
  Stage,
  StageOutputs,
} from './types';
import { INTERPRETATION_SCHEMA_VERSION } from './types';

/** The six stage functions. Injectable so the pipeline can be tested against fixture stages. */
export interface InterpretationStages {
  s1: RunS1ChartValidation;
  s2: RunS2PlanetCondition;
  s3: RunS3HouseLordship;
  s4: RunS4YogaAssessment;
  s5: RunS5DivisionalSynthesis;
  s6: RunS6Activation;
}

export const DEFAULT_INTERPRETATION_STAGES: InterpretationStages = {
  s1: runS1ChartValidation,
  s2: runS2PlanetCondition,
  s3: runS3HouseLordship,
  s4: runS4YogaAssessment,
  s5: runS5DivisionalSynthesis,
  s6: runS6Activation,
};

export class InterpretationPipelineError extends Error {
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
  }
}

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const STATUS_RANK: Record<RuleStatus, number> = { approved: 0, provisional: 1, 'pending-client': 2 };
const stricter = (a: RuleStatus, b: RuleStatus): RuleStatus => (STATUS_RANK[a] >= STATUS_RANK[b] ? a : b);

interface KnownRule {
  status: RuleStatus;
  source: string;
  stage: Stage;
  /** Present when the pack (catalogue) lists the rule. */
  catalogued?: InterpretationRule;
}

/** Every rule reference a stage output carries, with the stage it came from. */
export function collectStageRuleRefs(stages: StageOutputs): Array<{ stage: Stage; ref: RuleRef }> {
  const out: Array<{ stage: Stage; ref: RuleRef }> = [];
  const push = (stage: Stage, ref: RuleRef | undefined) => {
    if (ref) out.push({ stage, ref });
  };
  for (const b of stages.s1.boundaries) push('S1', b.rule);
  for (const p of stages.s2) {
    push('S2', p.functionalNature.rule);
    push('S2', p.shadbala?.rule);
  }
  for (const h of stages.s3) push('S3', h.sav?.rule);
  for (const y of stages.s4) {
    push('S4', y.formation.rule);
    for (const f of y.strengthFactors) push('S4', f.rule);
    for (const m of y.modifiers) push('S4', m.rule);
    for (const c of y.cancellations) push('S4', c.rule);
    for (const a of y.activations) push('S4', a.rule);
  }
  for (const l of stages.s5) push('S5', l.rule);
  for (const a of stages.s6) push('S6', a.rule);
  return out;
}

/** Every condition entry in the stage outputs, with its stage. */
export function collectStageConditions(stages: StageOutputs): Array<{ stage: Stage; entry: ConditionEntry }> {
  const out: Array<{ stage: Stage; entry: ConditionEntry }> = [];
  const push = (stage: Stage, entries: readonly ConditionEntry[]) => {
    for (const entry of entries) out.push({ stage, entry });
  };
  push('S1', stages.s1.conditions);
  for (const p of stages.s2) push('S2', p.conditions);
  for (const h of stages.s3) push('S3', h.conditions);
  for (const y of stages.s4) push('S4', y.conditions);
  for (const l of stages.s5) push('S5', l.conditions);
  for (const a of stages.s6) push('S6', a.conditions);
  return out;
}

function buildRuleTable(pack: InterpretationPack, stages: StageOutputs): Map<string, KnownRule> {
  const table = new Map<string, KnownRule>();
  for (const r of pack.rules) {
    InterpretationRuleSchema.parse(r);
    if (table.has(r.id)) throw new InterpretationPipelineError('INTERPRETATION_RULE_DUPLICATE', r.id);
    table.set(r.id, { status: r.status, source: r.sources.join('; '), stage: r.stage, catalogued: r });
  }
  for (const { stage, ref } of collectStageRuleRefs(stages)) {
    const known = table.get(ref.ruleId);
    if (known) known.status = stricter(known.status, ref.status);
    else table.set(ref.ruleId, { status: ref.status, source: ref.source, stage });
  }
  // A condition whose rule no stage and no catalogue entry describes is unsourced.
  for (const { stage, entry } of collectStageConditions(stages)) {
    if (!table.has(entry.ruleId)) {
      table.set(entry.ruleId, { status: 'pending-client', source: 'uncatalogued stage rule', stage });
    }
  }
  return table;
}

/** Stage rule record for `ctx.rules` when the catalogue does not list the rule. */
function syntheticRule(id: string, known: KnownRule): InterpretationRule {
  return {
    id,
    version: '0.0.0',
    stage: known.stage,
    status: known.status,
    sources: [known.source],
    requiredFacts: [],
    description: `Stage rule ${id} (from the stage output; not in the pack catalogue).`,
  };
}

/** The stage outputs for one input. Exported for tests and for the golden fixture. */
export function runInterpretationStages(
  input: InterpretationInput,
  facts: FactView,
  stages: InterpretationStages = DEFAULT_INTERPRETATION_STAGES,
): StageOutputs {
  const lifeStage = deriveLifeStage(input);
  const s1 = stages.s1(input, facts);
  const s2 = stages.s2(input, facts);
  const s3 = stages.s3(input, facts, { planets: s2 });
  const s4 = stages.s4(input, facts, { planets: s2 });
  const s5 = stages.s5(input, facts, { planets: s2 });
  const s6 = stages.s6(input, facts, { planets: s2, yogas: s4, lifeStage });
  return { s1, s2, s3, s4, s5, s6 };
}

/**
 * Builds `runInterpretation` over a given set of stage functions (the internal seam used by the
 * pipeline tests). Production code uses `runInterpretation`.
 */
export function createInterpretationRunner(stageFns: InterpretationStages): RunInterpretation {
  return (
    input: InterpretationInput,
    facts: FactView,
    pack: InterpretationPack,
    policy: ConflictPolicy,
    options: RunInterpretationOptions = {},
  ): InterpretationSet => {
    const includePending = options.includePendingClient === true;
    const lifeStage = deriveLifeStage(input);
    const stages = runInterpretationStages(input, facts, stageFns);
    const table = buildRuleTable(pack, stages);

    // --- enabled / rejected rules --------------------------------------------------------
    const rejected = new Map<string, string>();
    const enabled = new Map<string, InterpretationRule>();
    for (const [id, known] of [...table.entries()].sort((a, b) => byString(a[0], b[0]))) {
      const record = known.catalogued ? { ...known.catalogued, status: known.status } : syntheticRule(id, known);
      if (known.status === 'pending-client' && !includePending) {
        rejected.set(id, 'pending-client: evaluated in tests only, never rendered');
        continue;
      }
      // Only S8 (pack result) rules gate on their facts; stage rules describe conditional
      // conditions (e.g. Shadbala, neecha bhanga) whose facts are legitimately absent.
      if (known.catalogued && known.catalogued.stage === 'S8' && known.catalogued.requiredFacts.length > 0) {
        const missing = known.catalogued.requiredFacts.filter((p) => facts.resolve([p]).length === 0);
        if (missing.length > 0) {
          rejected.set(id, `missing facts: ${missing.join(', ')}`);
          continue;
        }
      }
      enabled.set(id, record);
    }
    const rules: Record<string, InterpretationRule> = Object.fromEntries(enabled);
    const ctx: PackBuildContext = {
      input,
      facts,
      lifeStage,
      stages,
      policy,
      rules,
      resolve: (i) => runConflictResolution(i, policy),
    };

    // --- S7/S8: pack builders -----------------------------------------------------------
    const policyRuleIds = new Set(policy.rules.map((r) => r.id));
    const results: InterpretationResult[] = [];
    for (const key of Object.keys(pack.topics).sort(byString)) {
      const topic = pack.topics[key];
      if (topic.ruleIds.some((id) => !enabled.has(id))) continue; // dependency rejected above
      const prefix = buildInterpretationId(topic.topic);
      for (const raw of topic.build(ctx)) {
        if (raw.topic !== topic.topic || (raw.id !== prefix && !raw.id.startsWith(`${prefix}.`))) {
          throw new InterpretationPipelineError('INTERPRETATION_TOPIC_MISMATCH', `${raw.id} is not under ${prefix}`);
        }
        const cited = new Set([...raw.ruleIds, ...raw.supporting.map((l) => l.ruleId), ...raw.contradicting.map((l) => l.ruleId)]);
        const disabled = [...cited].filter((id) => !enabled.has(id) && !policyRuleIds.has(id));
        if (disabled.length > 0) {
          for (const id of disabled) if (!rejected.has(id)) rejected.set(id, 'not enabled for this run');
          continue;
        }
        for (const ref of raw.chartRefs) {
          if (!facts.has(ref)) throw new InterpretationPipelineError('INTERPRETATION_UNKNOWN_FACT', `${raw.id} cites ${ref}`);
        }
        const provisional =
          raw.provisional || [...cited].some((id) => enabled.get(id)?.status === 'provisional');
        results.push({
          ...raw,
          ruleIds: [...new Set(raw.ruleIds)].sort(byString),
          chartRefs: [...new Set(raw.chartRefs)].sort(byString),
          sources: [...new Set(raw.sources)].sort(byString),
          qualification: sortQualifications([
            ...stages.s1.qualification,
            ...raw.qualification,
            ...(provisional ? (['PROVISIONAL_RULE'] as const) : []),
          ]),
          provisional,
        });
      }
    }
    results.sort((a, b) => byString(a.id, b.id));

    const rejectedList: RejectedRule[] = [...rejected.entries()]
      .sort((a, b) => byString(a[0], b[0]))
      .map(([ruleId, reason]) => ({ ruleId, reason }));
    const packRulesEnabled = pack.rules.filter((r) => enabled.has(r.id)).map((r) => enabled.get(r.id)!);
    const set: InterpretationSet = {
      schemaVersion: INTERPRETATION_SCHEMA_VERSION,
      rulesetVersion: computeRulesetVersion(packRulesEnabled, policy),
      snapshotId: input.snapshotId,
      results,
      rejected: rejectedList,
    };
    return InterpretationSetSchema.parse(set);
  };
}

/** S1–S8 over the production stages. */
export const runInterpretation: RunInterpretation = createInterpretationRunner(DEFAULT_INTERPRETATION_STAGES);
