/**
 * Zod schemas for the serialisable interpretation contracts (proposal §3 and §4).
 *
 * Each schema is annotated with its TypeScript interface from `types.ts`, so the compiler
 * rejects any drift between the two. Schemas are strict: unknown keys fail, because results
 * are registered as evidence and cached, and a silent extra field would escape review.
 */
import { z } from 'zod';
import {
  CONDITION_CODES,
  PRECEDENCE_OUTCOMES,
  QUALIFICATION_CODES,
  RULE_STATUSES,
  STAGES,
  STRENGTH_CLASSES,
  type AppliedPrecedence,
  type ConflictPolicy,
  type EvidenceLink,
  type InterpretationConclusion,
  type InterpretationResult,
  type InterpretationRule,
  type InterpretationSet,
  type PrecedenceRule,
  type RejectedRule,
  type Resolution,
  type TimeRelevance,
} from './types';
import { REGISTRY_ID_PATTERN } from './ids';

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

export const StrengthClassSchema = z.enum(STRENGTH_CLASSES);
export const QualificationCodeSchema = z.enum(QUALIFICATION_CODES);
export const ConditionCodeSchema = z.enum(CONDITION_CODES);
export const RuleStatusSchema = z.enum(RULE_STATUSES);
export const StageSchema = z.enum(STAGES);

const RegistryIdSchema = z.string().regex(REGISTRY_ID_PATTERN);
const IsoSchema = z.string().regex(ISO_INSTANT);

export const EvidenceLinkSchema: z.ZodType<EvidenceLink> = z
  .object({
    factId: RegistryIdSchema,
    conditionCode: ConditionCodeSchema,
    ruleId: z.string().min(1),
  })
  .strict();

export const TimeRelevanceSchema: z.ZodType<TimeRelevance> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('natal') }).strict(),
  z
    .object({
      kind: z.literal('period'),
      startIso: IsoSchema,
      endIso: IsoSchema,
      activatedBy: z.array(RegistryIdSchema),
    })
    .strict(),
  z
    .object({
      kind: z.literal('current'),
      asOfIso: IsoSchema,
      activatedBy: z.array(RegistryIdSchema),
    })
    .strict(),
]);

export const AppliedPrecedenceSchema: z.ZodType<AppliedPrecedence> = z
  .object({
    precedenceRuleId: z.string().min(1),
    overrides: ConditionCodeSchema,
    overridden: ConditionCodeSchema,
    source: z.string().min(1),
  })
  .strict();

export const ResolutionSchema: z.ZodType<Resolution> = z
  .object({
    policyId: z.string().min(1),
    applied: z.array(AppliedPrecedenceSchema),
    unresolved: z.array(ConditionCodeSchema),
  })
  .strict();

export const InterpretationConclusionSchema: z.ZodType<InterpretationConclusion> = z
  .object({
    code: z.string().regex(/^[A-Z0-9_]+$/),
    text: z.string().min(1),
  })
  .strict();

export const InterpretationResultSchema: z.ZodType<InterpretationResult> = z
  .object({
    id: RegistryIdSchema.refine((id) => id.startsWith('interp.'), 'result IDs start with "interp."'),
    topic: z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)*$/),
    question: z.string().min(1),
    conclusion: InterpretationConclusionSchema,
    supporting: z.array(EvidenceLinkSchema),
    contradicting: z.array(EvidenceLinkSchema),
    ruleIds: z.array(z.string().min(1)).min(1),
    chartRefs: z.array(RegistryIdSchema),
    strengthClass: StrengthClassSchema,
    timeRelevance: TimeRelevanceSchema,
    qualification: z.array(QualificationCodeSchema),
    explanation: z.string().min(1),
    resolution: ResolutionSchema.optional(),
    provisional: z.boolean(),
    sources: z.array(z.string().min(1)),
  })
  .strict()
  .superRefine((r, ctx) => {
    // Every linked fact must be listed in chartRefs.
    const refs = new Set(r.chartRefs);
    for (const l of [...r.supporting, ...r.contradicting]) {
      if (!refs.has(l.factId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `chartRefs is missing ${l.factId}` });
      }
    }
    if (r.strengthClass === 'mixed' && !r.qualification.includes('MIXED_INDICATORS')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "a 'mixed' result must carry MIXED_INDICATORS" });
    }
    if (r.qualification.includes('PROVISIONAL_RULE') && !r.provisional) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PROVISIONAL_RULE requires provisional: true' });
    }
  });

export const InterpretationRuleSchema: z.ZodType<InterpretationRule> = z
  .object({
    id: z.string().regex(/^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    stage: StageSchema,
    status: RuleStatusSchema,
    decisionRef: z.string().min(1).optional(),
    sources: z.array(z.string().min(1)).min(1),
    requiredFacts: z.array(z.string().min(1)),
    description: z.string().min(1),
  })
  .strict();

export const RejectedRuleSchema: z.ZodType<RejectedRule> = z
  .object({ ruleId: z.string().min(1), reason: z.string().min(1) })
  .strict();

export const InterpretationSetSchema: z.ZodType<InterpretationSet> = z
  .object({
    schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    rulesetVersion: z.string().regex(/^[0-9a-f]{12}$/),
    snapshotId: z.string().min(1),
    results: z.array(InterpretationResultSchema),
    rejected: z.array(RejectedRuleSchema),
  })
  .strict()
  .superRefine((s, ctx) => {
    const seen = new Set<string>();
    for (const r of s.results) {
      if (seen.has(r.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate result id ${r.id}` });
      seen.add(r.id);
    }
  });

export const PrecedenceRuleSchema: z.ZodType<PrecedenceRule> = z
  .object({
    id: z.string().regex(/^CRP-\d{3}$/),
    when: z
      .object({
        a: ConditionCodeSchema,
        b: z.array(ConditionCodeSchema).min(1),
        sameSubject: z.literal(true),
      })
      .strict(),
    outcome: z.enum(PRECEDENCE_OUTCOMES),
    adds: z.array(QualificationCodeSchema),
    source: z.string().min(1),
    status: RuleStatusSchema,
    description: z.string().min(1),
  })
  .strict();

export const ConflictPolicySchema: z.ZodType<ConflictPolicy> = z
  .object({
    id: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    rules: z.array(PrecedenceRuleSchema),
  })
  .strict();
