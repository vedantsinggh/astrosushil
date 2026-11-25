/**
 * Astro Sushil Universal Report Platform — formal contracts.
 *
 * Every boundary that crosses a trust line (LLM output, persisted manifests,
 * report definitions) is validated at runtime with zod. TypeScript types are
 * inferred from the schemas so the two can never drift.
 */
import { z } from 'zod/v3';

export const PLATFORM_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/**
 * How a piece of report content came to exist. Never relabelled downstream.
 * - llm:                personalised narrative written by an LLM from verified evidence
 * - deterministic:      computed from the chart snapshot (tables, dates, lists)
 * - static-educational: fixed explanatory text identical for every client
 * - editorial:          brand copy (author note, philosophy, disclaimers)
 */
export const ContentProvenanceSchema = z.enum(['llm', 'deterministic', 'static-educational', 'editorial']);
export type ContentProvenance = z.infer<typeof ContentProvenanceSchema>;

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export const EvidenceValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);
export type EvidenceValue = z.infer<typeof EvidenceValueSchema>;

export const EvidenceItemSchema = z.object({
  /** Stable deterministic identifier, e.g. `planet.venus.d1.house`. */
  id: z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/),
  snapshotId: z.string().min(16),
  kind: z.string(),
  /** Human-readable statement of the fact, used in prompts. */
  label: z.string(),
  value: EvidenceValueSchema,
  /** Engine module that produced the value. */
  source: z.string(),
  engineVersion: z.string(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// ---------------------------------------------------------------------------
// Report definitions
// ---------------------------------------------------------------------------

export const TopicKindSchema = z.enum([
  'narrative', // LLM-written personalised interpretation
  'data', // deterministic table/chart/list rendered from the snapshot
  'educational', // static explanatory content
  'editorial', // author note, philosophy, disclaimer
]);
export type TopicKind = z.infer<typeof TopicKindSchema>;

/** Inclusive age window in completed years at the report date. */
export const AgeWindowSchema = z
  .object({ minAge: z.number().int().min(0).optional(), maxAge: z.number().int().min(0).optional() })
  .refine((w) => w.minAge !== undefined || w.maxAge !== undefined, 'an age window needs minAge or maxAge');
export type AgeWindow = z.infer<typeof AgeWindowSchema>;

export const TopicVariantSchema = z.object({
  /** Stable name recorded in prompts and tests, e.g. 'early-career'. */
  id: z.string().regex(/^[a-z0-9-]+$/),
  when: AgeWindowSchema,
  title: z.string().optional(),
  subtitle: z.string().optional(),
  objective: z.string().optional(),
  /** Appended to the (possibly replaced) objective. */
  objectiveAppend: z.string().optional(),
});
export type TopicVariant = z.infer<typeof TopicVariantSchema>;

export const ReportTopicSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  subtitle: z.string().optional(),
  kind: TopicKindSchema,
  /** What the topic must communicate (shown to the LLM and to reviewers). */
  objective: z.string(),
  /**
   * Evidence ID patterns (exact IDs or prefix wildcards ending in `*`) that the
   * topic is allowed to cite. Required patterns must resolve to ≥1 item.
   */
  requiredEvidence: z.array(z.string()).default([]),
  optionalEvidence: z.array(z.string()).default([]),
  /** Topic IDs whose generated content must exist first (for consistency context). */
  dependsOn: z.array(z.string()).default([]),
  /** Target depth for narrative topics. */
  depth: z
    .object({
      minParagraphs: z.number().int().min(0),
      maxParagraphs: z.number().int().min(1),
      bullets: z.number().int().min(0).default(0),
    })
    .optional(),
  /** Key of a deterministic block renderer (for `data` topics). */
  block: z.string().optional(),
  /** Reference coverage: page(s) in the reference PDF that this topic covers. */
  referencePages: z.string().optional(),
  /** True for topics we add beyond the reference. */
  bonus: z.boolean().default(false),
  /**
   * Interpretation opt-in: `interp.*` ID patterns (e.g. `interp.career.house-10.*`) whose
   * deterministic conclusions the topic must narrate. Empty = legacy behaviour (unchanged
   * evidence scope, prompt and cache key). Patterns without a trailing `*` are required citations.
   */
  interpretations: z.array(z.string()).default([]),
  /**
   * Life-stage variants (product defaults, not astrology): the first variant whose age window
   * contains the native's completed age at the report date replaces the topic's title,
   * subtitle and/or objective, or appends to the objective. Topics without variants are unchanged.
   */
  variants: z.array(TopicVariantSchema).default([]),
});
export type ReportTopic = z.infer<typeof ReportTopicSchema>;
export type ReportTopicInput = z.input<typeof ReportTopicSchema>;

export const ReportSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  kicker: z.string(),
  intro: z.string().optional(),
  topics: z.array(ReportTopicSchema).min(1),
});
export type ReportSection = z.infer<typeof ReportSectionSchema>;

export const ReportThemeSchema = z.object({
  /** Hex colours without '#'. */
  primary: z.string().regex(/^[0-9A-F]{6}$/i),
  accent: z.string().regex(/^[0-9A-F]{6}$/i),
  tint: z.string().regex(/^[0-9A-F]{6}$/i),
});

export const ReportDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Existing ReportType enum value this definition fulfils. */
  reportType: z.string(),
  /**
   * Further ReportType values served by exactly this definition (product
   * aliases, e.g. a catalogue SKU sold under a second ReportType). Each value
   * may be claimed by only one definition; the manifest records `reportType`.
   */
  additionalReportTypes: z.array(z.string()).default([]),
  specVersion: z.string(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  referenceFiles: z.array(z.string()),
  /** Which inputs the report needs. */
  requires: z.object({
    birthTime: z.boolean(),
    partner: z.boolean().default(false),
    /** Divisional charts to compute (D1 always included). */
    vargas: z.array(z.enum(['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'])).default(['D1', 'D9']),
    /** Years of Jupiter/Saturn sign periods to compute from the report date. */
    transitYears: z.number().int().min(1).max(100).default(12),
  }),
  /** Output language of narrative and fixed copy. */
  language: z.enum(['en', 'hi']).default('en'),
  theme: ReportThemeSchema,
  /** Report-specific writing rules appended to the shared system prompt. */
  writingGuidance: z.array(z.string()),
  sections: z.array(ReportSectionSchema).min(1),
});
export type ReportDefinition = z.infer<typeof ReportDefinitionSchema>;
export type ReportDefinitionInput = z.input<typeof ReportDefinitionSchema>;

// ---------------------------------------------------------------------------
// LLM output (untrusted — always parsed through these schemas)
// ---------------------------------------------------------------------------

export const InterpretationClaimSchema = z.object({
  /** The sentence (or clause) in the narrative that asserts a chart fact. */
  statement: z.string().min(3),
  /** Evidence IDs that support the statement. */
  evidenceIds: z.array(z.string()).min(1),
});
export type InterpretationClaim = z.infer<typeof InterpretationClaimSchema>;

export const GeneratedTopicPayloadSchema = z.object({
  topicId: z.string(),
  lead: z.string().min(10),
  paragraphs: z.array(z.string().min(20)).min(1),
  bullets: z.array(z.string().min(5)).default([]),
  takeaway: z.string().optional(),
  claims: z.array(InterpretationClaimSchema).default([]),
});
export type GeneratedTopicPayload = z.infer<typeof GeneratedTopicPayloadSchema>;

export const GeneratedBatchPayloadSchema = z.object({
  topics: z.array(GeneratedTopicPayloadSchema).min(1),
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const ClaimStatusSchema = z.enum(['verified', 'rejected', 'unverifiable']);

export const ClaimValidationSchema = z.object({
  statement: z.string(),
  evidenceIds: z.array(z.string()),
  status: ClaimStatusSchema,
  reasons: z.array(z.string()),
});
export type ClaimValidation = z.infer<typeof ClaimValidationSchema>;

export const ValidationIssueSchema = z.object({
  severity: z.enum(['error', 'warning']),
  code: z.string(),
  message: z.string(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const TopicValidationResultSchema = z.object({
  topicId: z.string(),
  passed: z.boolean(),
  claims: z.array(ClaimValidationSchema),
  issues: z.array(ValidationIssueSchema),
  verifiedEvidenceIds: z.array(z.string()),
});
export type TopicValidationResult = z.infer<typeof TopicValidationResultSchema>;

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const TopicManifestEntrySchema = z.object({
  topicId: z.string(),
  sectionId: z.string(),
  provenance: ContentProvenanceSchema,
  status: z.enum(['generated', 'cached', 'deterministic', 'static', 'failed', 'skipped-missing-evidence']),
  provider: z.string().optional(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
  cacheKey: z.string().optional(),
  cacheHit: z.boolean().optional(),
  /** Generation ID of the call that originally produced cached content. */
  sourceGenerationId: z.string().optional(),
  evidenceIds: z.array(z.string()),
  verifiedEvidenceIds: z.array(z.string()),
  claimCounts: z
    .object({ verified: z.number(), rejected: z.number(), unverifiable: z.number() })
    .optional(),
  issues: z.array(ValidationIssueSchema),
  /** Tokens/latency of the live call; zero/absent for cache hits and non-LLM topics. */
  tokens: z.object({ input: z.number(), output: z.number(), thinking: z.number() }).optional(),
  latencyMs: z.number().optional(),
  attempts: z.number().optional(),
  error: z.string().optional(),
  /** Life-stage variant applied to the topic, when one matched. */
  variant: z.string().optional(),
  /** Interpretation traceability per verified claim (opted-in topics only). */
  trace: z
    .array(z.object({ statement: z.string(), evidenceIds: z.array(z.string()), interpretationIds: z.array(z.string()), ruleIds: z.array(z.string()) }))
    .optional(),
});
export type TopicManifestEntry = z.infer<typeof TopicManifestEntrySchema>;

export const ReportManifestSchema = z.object({
  platformVersion: z.string(),
  reportId: z.string(),
  subjectRef: z.string(),
  definitionId: z.string(),
  reportType: z.string(),
  specVersion: z.string(),
  generatedAtIso: z.string(),
  status: z.enum(['completed', 'partial', 'failed']),
  chart: z.object({
    snapshotId: z.string(),
    engineVersion: z.string(),
    conventions: z.record(z.string()),
    conventionsProvisional: z.boolean(),
    evidenceCount: z.number(),
  }),
  /** Present when the module declares an interpretation pack. */
  interpretation: z.object({ schemaVersion: z.string(), rulesetVersion: z.string(), resultCount: z.number() }).optional(),
  topics: z.array(TopicManifestEntrySchema),
  usage: z.object({
    liveCalls: z.number(),
    cachedCalls: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    thinkingTokens: z.number(),
    /** Always an estimate from published list prices; never provider billing. */
    estimatedCostUsd: z.number(),
    costBasis: z.string(),
    /** Per-model breakdown of the live calls of this run (includes rejected attempts). */
    byModel: z
      .array(z.object({
        model: z.string(), calls: z.number(), inputTokens: z.number(), outputTokens: z.number(),
        thinkingTokens: z.number(), estimatedCostUsd: z.number(),
      }))
      .optional(),
    /** UTC window of the live calls, for matching against the provider's billing report. */
    firstCallAtIso: z.string().optional(),
    lastCallAtIso: z.string().optional(),
  }),
  pdf: z
    .object({
      pageCount: z.number(),
      bytes: z.number(),
      sha256: z.string(),
      qaPassed: z.boolean(),
      qaIssues: z.array(ValidationIssueSchema),
    })
    .optional(),
});
export type ReportManifest = z.infer<typeof ReportManifestSchema>;
