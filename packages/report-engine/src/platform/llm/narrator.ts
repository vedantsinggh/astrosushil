/**
 * LLM narrator.
 *
 * Writes personalised narrative for a batch of related topics from verified
 * evidence only. The LLM never sees the client's name, birth date, birth time
 * or place — only derived chart facts — and its output is parsed, validated
 * and either accepted, retried with feedback, or marked failed. There is no
 * silent fallback to canned text.
 */
import { randomUUID } from 'crypto';
import type { AiGenerationOptions, IAiProvider, InterpretationResult } from '@astro/prediction-engine';
import {
  EvidenceItem,
  GeneratedBatchPayloadSchema,
  GeneratedTopicPayload,
  ReportDefinition,
  ReportTopic,
  TopicValidationResult,
  ValidationIssue,
} from '../contracts';
import { EvidenceRegistry } from '../evidence/evidence-registry';
import { validateGeneratedTopic } from '../validation/claim-validator';
import { findNearDuplicatesAgainst, validateEditorial } from '../validation/editorial-validator';
import {
  interpretationView,
  isInterpretationTopic,
  topicInterpretationItems,
  topicInterpretationPatterns,
  validateInterpretationTopic,
} from '../validation/interpretation-validator';
import { CachedTopicEntry, TopicCacheKeyParts, TopicCacheStore, topicCacheKey } from './topic-cache';
import { countSentences, isRepairable, repairOnce } from './sentence-repair';
import { buildBatchPrompt, INTERPRETATION_PROMPT_VERSION, PROMPT_VERSION, SYSTEM_PROMPT } from './prompts';

export interface NarratorConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  /** Content attempts: re-asks after schema/validation failure (with feedback). */
  maxAttempts: number;
  /** Transport retries per content attempt for overload, rate limits and timeouts. */
  maxTransportRetries: number;
  /** Base delay for exponential backoff (ms). */
  backoffBaseMs: number;
  /** Models tried, in order, when the primary model is overloaded. */
  fallbackModels: string[];
  /**
   * Temperature for topics that opted in to interpretation results (they restate
   * deterministic conclusions, so less sampling variety is wanted). Legacy topics
   * always use `temperature`. Defaults to DEFAULT_INTERPRETATION_TEMPERATURE.
   */
  interpretationTemperature?: number;
  /**
   * Output-token cap for opted-in topics. Their prompts are longer (INTERPRETATIONS block,
   * glossary) and the model's thinking tokens count against the cap: the first real golden
   * career run (2026-11-20) lost 7 opted-in topics to JSON truncated mid-string with the
   * legacy 16000 cap. Legacy topics always use `maxOutputTokens`. Defaults to
   * DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS.
   */
  interpretationMaxOutputTokens?: number;
  /**
   * Model reasoning effort (Gemini 3+). Thinking tokens are billed as output and were
   * ~60% of output-side tokens in the 2026-11-20 career run; narration restates
   * verified evidence, so heavy reasoning buys little. Undefined = model default.
   * Not part of the topic cache key: cached payloads are re-validated on every read.
   */
  thinkingLevel?: ThinkingLevel;
  /**
   * Model for the final content attempt (the last re-ask of topics the primary model
   * could not write validly, even with feedback). Lets a cheap model write the report
   * while a stronger one is paid for only where it is needed. Undefined = keep using `model`.
   */
  retryModel?: string;
  /** Reasoning effort for `retryModel` calls (gemini-3.8-flash rejects "minimal"). Undefined = model default. */
  retryThinkingLevel?: ThinkingLevel;
  /**
   * Largest share of a topic's sentences that may be removed to make it pass validation
   * (see sentence-repair.ts) before the topic is sent back to the model instead. 0 disables repair.
   */
  maxRepairShare?: number;
}

/** One billed provider call, as reported by the provider's usage metadata. */
export interface LlmCallRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  atIso: string;
  topics: number;
  attempt: number;
}

type ThinkingLevel = NonNullable<AiGenerationOptions['thinkingLevel']>;
const THINKING_LEVELS: readonly ThinkingLevel[] = ['minimal', 'low', 'medium', 'high'];

/** REPORT_LLM_THINKING_LEVEL: minimal|low|medium|high, or "default" to let the model decide. */
export function resolveThinkingLevel(raw: string | undefined): ThinkingLevel | undefined {
  const v = (raw ?? 'minimal').trim().toLowerCase();
  if (v === 'default' || v === '') return undefined;
  if ((THINKING_LEVELS as readonly string[]).includes(v)) return v as ThinkingLevel;
  throw new Error(`REPORT_LLM_THINKING_LEVEL must be one of ${THINKING_LEVELS.join(', ')} or "default" (got "${raw}")`);
}

export const DEFAULT_INTERPRETATION_TEMPERATURE = 0.2;
export const DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS = 8000;

export const DEFAULT_NARRATOR_CONFIG: NarratorConfig = {
  model: process.env.REPORT_LLM_MODEL || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  temperature: 0.55,
  maxOutputTokens: 6000,
  timeoutMs: 240000,
  maxAttempts: 3,
  maxTransportRetries: 6,
  backoffBaseMs: 5000,
  fallbackModels: (process.env.REPORT_LLM_FALLBACK_MODELS ?? '').split(',').map((m) => m.trim()).filter(Boolean),
  thinkingLevel: resolveThinkingLevel(process.env.REPORT_LLM_THINKING_LEVEL),
  retryModel: (process.env.REPORT_LLM_RETRY_MODEL ?? 'gemini-3.8-flash').trim() || undefined,
  retryThinkingLevel: resolveThinkingLevel(process.env.REPORT_LLM_RETRY_THINKING_LEVEL ?? 'low'),
  maxRepairShare: Number(process.env.REPORT_LLM_MAX_REPAIR_SHARE ?? 0.3),
};

export interface TopicOutcome {
  topic: ReportTopic;
  payload?: GeneratedTopicPayload;
  validation?: TopicValidationResult;
  editorialIssues: ValidationIssue[];
  status: 'generated' | 'cached' | 'failed' | 'skipped-missing-evidence';
  cacheKey?: string;
  sourceGenerationId?: string;
  evidenceIds: string[];
  tokens?: { input: number; output: number; thinking: number };
  latencyMs?: number;
  attempts: number;
  /** Model that actually produced the payload (may be a fallback model). */
  model?: string;
  error?: string;
}

export interface BatchContext {
  definition: ReportDefinition;
  registry: EvidenceRegistry;
  subjectRef: string;
  topics: ReportTopic[];
  sectionTitle: string;
  /** Short summaries of already-written topics, for cross-topic consistency. */
  priorSummaries: string[];
  /**
   * Called once a topic is settled for good in this batch: served from cache,
   * skipped for missing evidence, or generated and validated. Progress reporting only.
   */
  onTopicSettled?: (topicId: string) => void;
  /**
   * Interpretation results of this report (the set registered in the registry).
   * Optional: when given, opted-in topics also receive the supporting and
   * contradicting facts of each result and may cite its chartRefs.
   */
  interpretationResults?: readonly InterpretationResult[];
  /**
   * Payloads of topics already accepted earlier in the report. Optional: when
   * given, opted-in topics are checked for near-duplicate sentences against them (error).
   */
  priorPayloads?: GeneratedTopicPayload[];
}

export function classifyError(err: unknown): { transient: boolean; contentRetryable: boolean; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  const transient = /RATE_LIMIT|TIMEOUT|HTTP 5\d\d|HTTP 429|ECONNRESET|ETIMEDOUT|fetch failed|socket hang up/i.test(message);
  const contentRetryable = /PARSE|SCHEMA|JSON/i.test(message);
  return { transient, contentRetryable, message };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class LlmNarrator {
  constructor(
    private readonly provider: IAiProvider,
    private readonly cache: TopicCacheStore,
    private readonly config: NarratorConfig = DEFAULT_NARRATOR_CONFIG
  ) {}

  /** Every provider call that returned usage, in order (the basis for cost reporting). */
  readonly calls: LlmCallRecord[] = [];
  /** Topics rejected on an attempt, with the error codes (diagnostics for prompt and validator tuning). */
  readonly rejections: Array<{ topicId: string; attempt: number; model: string; codes: string[] }> = [];

  get model(): string {
    return this.config.model;
  }

  get providerId(): string {
    return this.provider.providerId;
  }

  /**
   * Evidence patterns a topic may cite. Legacy topics: required ∪ optional (unchanged).
   * Opted-in topics add their interpretation patterns and, when the results are
   * known, the chartRefs of the matched results (proposal §5).
   */
  allowedEvidence(topic: ReportTopic, ctx?: Pick<BatchContext, 'registry' | 'interpretationResults'>): string[] {
    const base = [...topic.requiredEvidence, ...topic.optionalEvidence];
    if (!isInterpretationTopic(topic)) return base;
    const patterns = topicInterpretationPatterns(topic);
    const chartRefs = ctx
      ? (ctx.interpretationResults ?? [])
          .filter((r) => ctx.registry.has(r.id) && patterns.some((p) => EvidenceRegistry.matches(r.id, [p])))
          .flatMap((r) => r.chartRefs)
      : [];
    return [...new Set([...base, ...patterns, ...chartRefs])];
  }

  private temperatureFor(topic: ReportTopic): number {
    return isInterpretationTopic(topic) ? this.config.interpretationTemperature ?? DEFAULT_INTERPRETATION_TEMPERATURE : this.config.temperature;
  }

  private maxOutputTokensFor(topic: ReportTopic): number {
    return isInterpretationTopic(topic)
      ? this.config.interpretationMaxOutputTokens ?? DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS
      : this.config.maxOutputTokens;
  }

  /** Cache key parts. Legacy topics get exactly the historical fields (no interpretation keys). */
  private keyParts(ctx: BatchContext, topic: ReportTopic, evidence: EvidenceItem[]): TopicCacheKeyParts {
    const parts: TopicCacheKeyParts = {
      snapshotId: ctx.registry.snapshotId,
      subjectRef: ctx.subjectRef,
      definitionId: ctx.definition.id,
      specVersion: ctx.definition.specVersion,
      topicId: topic.id,
      promptVersion: PROMPT_VERSION,
      evidenceFingerprint: ctx.registry.fingerprint(evidence),
      model: this.config.model,
      generationConfig: { temperature: this.temperatureFor(topic), maxOutputTokens: this.maxOutputTokensFor(topic) },
    };
    if (ctx.definition.language !== 'en') parts.language = ctx.definition.language;
    if (isInterpretationTopic(topic)) {
      parts.interpretationFingerprint = ctx.registry.fingerprint(topicInterpretationItems(topic, ctx.registry));
      parts.interpretationPromptVersion = INTERPRETATION_PROMPT_VERSION;
    }
    return parts;
  }

  private keyFor(ctx: BatchContext, topic: ReportTopic, evidence: EvidenceItem[]): string {
    return topicCacheKey(this.keyParts(ctx, topic, evidence));
  }

  private check(ctx: BatchContext, topic: ReportTopic, payload: GeneratedTopicPayload, earlier: GeneratedTopicPayload[] = []) {
    const allowedEvidence = this.allowedEvidence(topic, ctx);
    const optedIn = isInterpretationTopic(topic);
    const validation = validateGeneratedTopic(topic, payload, ctx.registry, {
      expectedSnapshotId: ctx.registry.snapshotId,
      allowedEvidence,
    });
    const extra = validateInterpretationTopic(topic, payload, ctx.registry, validation, {
      allowedEvidence, results: ctx.interpretationResults,
    });
    if (optedIn) {
      // Near-duplicate sentences of earlier topics are errors for opted-in topics (warnings for legacy, report-level).
      for (const d of findNearDuplicatesAgainst(payload, [...(ctx.priorPayloads ?? []), ...earlier])) {
        extra.push({
          severity: 'error', code: 'NEAR_DUPLICATE_ACROSS_TOPICS',
          message: `Repeats topic ${d.otherTopicId} (similarity ${d.similarity}): "${d.sentence.slice(0, 120)}"`,
        });
      }
    }
    if (extra.length) {
      validation.issues.push(...extra);
      validation.passed = !validation.issues.some((i) => i.severity === 'error');
    }
    const editorialIssues = validateEditorial(payload, { interpretationTopic: optedIn, language: ctx.definition.language });
    const ok = validation.passed && !editorialIssues.some((i) => i.severity === 'error');
    return { validation, editorialIssues, ok };
  }

  /**
   * Validate a fresh payload; when it fails only on individual sentences or claims, remove
   * exactly those and validate again (no model call). The removed sentences are recorded as
   * warnings on the result. Falls back to the original failure when repair is not possible.
   */
  private checkWithRepair(ctx: BatchContext, topic: ReportTopic, payload: GeneratedTopicPayload, earlier: GeneratedTopicPayload[]) {
    const first = this.check(ctx, topic, payload, earlier);
    const share = this.config.maxRepairShare ?? 0;
    if (first.ok || share <= 0) return { ...first, payload, repair: undefined as string | undefined };
    const budget = Math.max(2, Math.floor(countSentences(payload) * share));
    const removed: string[] = [];
    let droppedClaims = 0;
    let current = payload;
    let result = first;
    for (let round = 0; round < 6 && !result.ok; round++) {
      const errors = [...result.validation.issues, ...result.editorialIssues];
      if (!isRepairable(errors)) return { ...first, payload, repair: round ? 'left-unrepairable-errors' : undefined };
      const step = repairOnce(current, result.validation, errors);
      if (!step) return { ...first, payload, repair: 'sentence-not-removable' };
      removed.push(...step.removedSentences);
      droppedClaims += step.removedClaims;
      if (removed.length > budget) return { ...first, payload, repair: 'too-many-sentences' };
      current = step.payload;
      result = this.check(ctx, topic, current, earlier);
    }
    if (!result.ok) return { ...first, payload, repair: 'not-converged' };
    for (const s of removed) {
      result.validation.issues.push({ severity: 'warning', code: 'UNVERIFIED_SENTENCE_REMOVED', message: `Removed before publication (failed validation): "${s.slice(0, 160)}"` });
    }
    if (droppedClaims) {
      result.validation.issues.push({ severity: 'warning', code: 'UNVERIFIED_CLAIM_DROPPED', message: `${droppedClaims} claim(s) that did not verify were dropped; the text was re-validated without them` });
    }
    return { ...result, payload: current, repair: undefined };
  }

  /** Interpretation views for the prompt (opted-in topics only; undefined keeps the legacy prompt). */
  private interpretationsFor(ctx: BatchContext, topic: ReportTopic) {
    if (!isInterpretationTopic(topic)) return undefined;
    const byId = new Map((ctx.interpretationResults ?? []).map((r) => [r.id, r] as const));
    return topicInterpretationItems(topic, ctx.registry).map((item) => interpretationView(item, byId.get(item.id)));
  }

  /**
   * Call the provider with exponential backoff on transient failures and
   * optional fallback models. Every failure surfaces to the caller once retries
   * are exhausted — nothing is substituted.
   */
  private async callWithRetries(prompt: string, temperature: number, maxTokens: number = this.config.maxOutputTokens, primary: string = this.config.model, thinkingLevel: ThinkingLevel | undefined = this.config.thinkingLevel) {
    const models = [...new Set([primary, ...this.config.fallbackModels])];
    let lastError: unknown;
    for (const model of models) {
      // Not every model accepts every thinking level (gemini-3.8-flash rejects "minimal").
      let level = thinkingLevel;
      for (let i = 0; i <= this.config.maxTransportRetries; i++) {
        try {
          const result = await this.provider.generate(prompt, {
            model,
            systemPrompt: SYSTEM_PROMPT,
            temperature,
            maxTokens,
            responseFormat: 'json',
            timeoutMs: this.config.timeoutMs,
            anonymizeClient: false, // prompts never contain the client's identity
            ...(level ? { thinkingLevel: level } : {}),
          });
          return { result, model };
        } catch (err) {
          lastError = err;
          if (level === 'minimal' && /thinking level/i.test(classifyError(err).message)) {
            level = 'low';
            i--; // the rejected request was not a transport failure
            continue;
          }
          const { transient } = classifyError(err);
          if (!transient) throw err;
          if (i < this.config.maxTransportRetries) {
            const delay = Math.min(this.config.backoffBaseMs * 2 ** i, 90000) * (0.75 + Math.random() * 0.5);
            await sleep(delay);
          }
        }
      }
    }
    throw lastError;
  }

  /** Remove cached narrative for the given topics so the next run regenerates them. */
  async invalidate(ctx: BatchContext, topicIds: string[]): Promise<void> {
    for (const topic of ctx.topics.filter((t) => topicIds.includes(t.id))) {
      await this.cache.delete(this.keyFor(ctx, topic, ctx.registry.resolve(this.allowedEvidence(topic, ctx))));
    }
  }

  /** Generate (or load from cache) every topic in the batch. */
  async generateBatch(ctx: BatchContext): Promise<TopicOutcome[]> {
    const outcomes = new Map<string, TopicOutcome>();
    const pending: Array<{ topic: ReportTopic; evidence: EvidenceItem[]; key: string }> = [];

    for (const topic of ctx.topics) {
      const required = topic.requiredEvidence.map((p) => ({ p, items: ctx.registry.resolve([p]) }));
      const missing = required.filter((r) => r.items.length === 0).map((r) => r.p);
      const evidence = ctx.registry.resolve(this.allowedEvidence(topic, ctx));
      if (missing.length) {
        outcomes.set(topic.id, {
          topic, status: 'skipped-missing-evidence', editorialIssues: [], attempts: 0,
          evidenceIds: evidence.map((e) => e.id), error: `Missing required evidence: ${missing.join(', ')}`,
        });
        ctx.onTopicSettled?.(topic.id);
        continue;
      }
      const key = this.keyFor(ctx, topic, evidence);
      const cached = await this.cache.get(key);
      if (cached) {
        const earlierCached = ctx.topics
          .slice(0, ctx.topics.indexOf(topic))
          .map((t) => outcomes.get(t.id)?.payload)
          .filter((p): p is GeneratedTopicPayload => p !== undefined);
        const { validation, editorialIssues, ok } = this.check(ctx, topic, cached.payload, earlierCached);
        if (ok) {
          outcomes.set(topic.id, {
            topic, payload: cached.payload, validation, editorialIssues, status: 'cached', cacheKey: key,
            sourceGenerationId: cached.generationId, evidenceIds: evidence.map((e) => e.id), attempts: 0,
          });
          ctx.onTopicSettled?.(topic.id);
          continue;
        }
        await this.cache.delete(key); // cached content no longer passes current validators
      }
      pending.push({ topic, evidence, key });
    }

    // Legacy topics run exactly as before; opted-in topics run as their own group
    // (their own prompt blocks and temperature). Without opted-in topics there is one group.
    const legacy = pending.filter((p) => !isInterpretationTopic(p.topic));
    const interp = pending.filter((p) => isInterpretationTopic(p.topic));
    if (legacy.length) await this.runGroup(ctx, legacy, outcomes, this.config.temperature, this.config.maxOutputTokens);
    if (interp.length) {
      await this.runGroup(
        ctx, interp, outcomes,
        this.config.interpretationTemperature ?? DEFAULT_INTERPRETATION_TEMPERATURE,
        this.config.interpretationMaxOutputTokens ?? DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS
      );
    }

    return ctx.topics.map((t) => outcomes.get(t.id)!);
  }

  /** Content attempts for one group of pending topics (shared prompt, one temperature). */
  private async runGroup(
    ctx: BatchContext,
    pending: Array<{ topic: ReportTopic; evidence: EvidenceItem[]; key: string }>,
    outcomes: Map<string, TopicOutcome>,
    temperature: number,
    maxTokens: number
  ): Promise<void> {
    let feedback: string[] = [];
    for (let attempt = 1; attempt <= this.config.maxAttempts && pending.length > 0; attempt++) {
      const prompt = buildBatchPrompt({
        definition: ctx.definition,
        sectionTitle: ctx.sectionTitle,
        topics: pending.map((p) => {
          const interpretations = this.interpretationsFor(ctx, p.topic);
          return interpretations ? { topic: p.topic, evidence: p.evidence, interpretations } : { topic: p.topic, evidence: p.evidence };
        }),
        priorSummaries: ctx.priorSummaries,
        feedback,
      });
      const generationId = `gen_${randomUUID()}`;
      let parsed: GeneratedTopicPayload[] | undefined;
      let tokens = { input: 0, output: 0, thinking: 0 };
      let latencyMs = 0;
      let callError: string | undefined;
      let usedModel = this.config.model;
      try {
        const escalate = attempt > 1 && attempt === this.config.maxAttempts && this.config.retryModel !== undefined;
        const call = escalate
          ? await this.callWithRetries(prompt, temperature, maxTokens, this.config.retryModel, this.config.retryThinkingLevel)
          : await this.callWithRetries(prompt, temperature, maxTokens);
        const res = call.result;
        usedModel = call.model;
        tokens = { input: res.tokens.promptTokens, output: res.tokens.completionTokens, thinking: res.tokens.thinkingTokens ?? 0 };
        this.calls.push({
          model: usedModel, inputTokens: tokens.input, outputTokens: tokens.output, thinkingTokens: tokens.thinking,
          atIso: new Date().toISOString(), topics: pending.length, attempt,
        });
        latencyMs = res.latencyMs;
        const json = res.parsedJson ?? JSON.parse(res.text.replace(/^```(?:json)?|```$/g, '').trim());
        const batch = GeneratedBatchPayloadSchema.safeParse(json);
        if (!batch.success) throw new Error(`SCHEMA_INVALID: ${batch.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
        parsed = batch.data.topics;
      } catch (err) {
        const { contentRetryable, message } = classifyError(err);
        callError = message.slice(0, 500);
        if (!contentRetryable) attempt = this.config.maxAttempts; // transport already retried; stop
      }

      const share = pending.length || 1;
      const perTopicTokens = {
        input: Math.round(tokens.input / share),
        output: Math.round(tokens.output / share),
        thinking: Math.round(tokens.thinking / share),
      };
      feedback = [];
      const stillPending: typeof pending = [];
      for (const p of pending) {
        const prev = outcomes.get(p.topic.id);
        const priorAttempts = prev?.attempts ?? 0;
        const accTokens = prev?.tokens
          ? { input: prev.tokens.input + perTopicTokens.input, output: prev.tokens.output + perTopicTokens.output, thinking: prev.tokens.thinking + perTopicTokens.thinking }
          : perTopicTokens;
        const rawPayload = parsed?.find((t) => t.topicId === p.topic.id);
        if (!rawPayload) {
          outcomes.set(p.topic.id, {
            topic: p.topic, status: 'failed', editorialIssues: [], attempts: priorAttempts + 1, cacheKey: p.key,
            evidenceIds: p.evidence.map((e) => e.id), tokens: accTokens, latencyMs: (prev?.latencyMs ?? 0) + latencyMs,
            error: callError ?? 'Model omitted this topic',
          });
          stillPending.push(p);
          continue;
        }
        const earlier = ctx.topics
          .slice(0, ctx.topics.indexOf(p.topic))
          .map((t) => outcomes.get(t.id))
          .filter((o): o is TopicOutcome => o !== undefined && (o.status === 'generated' || o.status === 'cached') && o.payload !== undefined)
          .map((o) => o.payload!);
        const { validation, editorialIssues, ok, payload, repair } = this.checkWithRepair(ctx, p.topic, rawPayload, earlier);
        const outcome: TopicOutcome = {
          topic: p.topic, payload, validation, editorialIssues, status: ok ? 'generated' : 'failed',
          cacheKey: p.key, sourceGenerationId: generationId, evidenceIds: p.evidence.map((e) => e.id),
          tokens: accTokens, latencyMs: (prev?.latencyMs ?? 0) + latencyMs, attempts: priorAttempts + 1,
          model: usedModel, error: ok ? undefined : 'Validation failed',
        };
        outcomes.set(p.topic.id, outcome);
        if (ok) {
          const entry: CachedTopicEntry = {
            key: p.key,
            parts: this.keyParts(ctx, p.topic, p.evidence),
            payload, generationId, provider: this.provider.providerId, model: usedModel,
            createdAtIso: new Date().toISOString(), tokens: perTopicTokens, latencyMs,
          };
          await this.cache.set(entry);
          ctx.onTopicSettled?.(p.topic.id);
        } else {
          const problems = [
            ...validation.issues.filter((i) => i.severity === 'error'),
            ...editorialIssues.filter((i) => i.severity === 'error'),
            ...validation.claims.filter((c) => c.status !== 'verified').map((c) => ({ code: 'CLAIM', message: `"${c.statement.slice(0, 90)}" → ${c.reasons.join(',')}` })),
          ];
          this.rejections.push({ topicId: p.topic.id, attempt, model: usedModel, codes: [...new Set(problems.map((i) => i.code)), ...(repair ? [`repair:${repair}`] : [])] });
          feedback.push(`Topic ${p.topic.id}: ${problems.map((i) => `${i.code}: ${i.message}`).join(' | ').slice(0, 700)}`);
          stillPending.push(p);
        }
      }
      pending.splice(0, pending.length, ...stillPending);
    }
  }
}
