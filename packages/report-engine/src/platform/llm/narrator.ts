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
import type { IAiProvider } from '@astro/prediction-engine';
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
import { validateEditorial } from '../validation/editorial-validator';
import { CachedTopicEntry, TopicCacheStore, topicCacheKey } from './topic-cache';
import { buildBatchPrompt, PROMPT_VERSION, SYSTEM_PROMPT } from './prompts';

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
}

export const DEFAULT_NARRATOR_CONFIG: NarratorConfig = {
  model: process.env.REPORT_LLM_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  temperature: 0.55,
  maxOutputTokens: 16000,
  timeoutMs: 240000,
  maxAttempts: 2,
  maxTransportRetries: 6,
  backoffBaseMs: 5000,
  fallbackModels: (process.env.REPORT_LLM_FALLBACK_MODELS ?? '').split(',').map((m) => m.trim()).filter(Boolean),
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

  get model(): string {
    return this.config.model;
  }

  get providerId(): string {
    return this.provider.providerId;
  }

  allowedEvidence(topic: ReportTopic): string[] {
    return [...topic.requiredEvidence, ...topic.optionalEvidence];
  }

  private keyFor(ctx: BatchContext, topic: ReportTopic, evidence: EvidenceItem[]): string {
    return topicCacheKey({
      snapshotId: ctx.registry.snapshotId,
      subjectRef: ctx.subjectRef,
      definitionId: ctx.definition.id,
      specVersion: ctx.definition.specVersion,
      topicId: topic.id,
      promptVersion: PROMPT_VERSION,
      evidenceFingerprint: ctx.registry.fingerprint(evidence),
      model: this.config.model,
      generationConfig: { temperature: this.config.temperature, maxOutputTokens: this.config.maxOutputTokens },
    });
  }

  private check(ctx: BatchContext, topic: ReportTopic, payload: GeneratedTopicPayload) {
    const validation = validateGeneratedTopic(topic, payload, ctx.registry, {
      expectedSnapshotId: ctx.registry.snapshotId,
      allowedEvidence: this.allowedEvidence(topic),
    });
    const editorialIssues = validateEditorial(payload);
    const ok = validation.passed && !editorialIssues.some((i) => i.severity === 'error');
    return { validation, editorialIssues, ok };
  }

  /**
   * Call the provider with exponential backoff on transient failures and
   * optional fallback models. Every failure surfaces to the caller once retries
   * are exhausted — nothing is substituted.
   */
  private async callWithRetries(prompt: string) {
    const models = [this.config.model, ...this.config.fallbackModels];
    let lastError: unknown;
    for (const model of models) {
      for (let i = 0; i <= this.config.maxTransportRetries; i++) {
        try {
          const result = await this.provider.generate(prompt, {
            model,
            systemPrompt: SYSTEM_PROMPT,
            temperature: this.config.temperature,
            maxTokens: this.config.maxOutputTokens,
            responseFormat: 'json',
            timeoutMs: this.config.timeoutMs,
            anonymizeClient: false, // prompts never contain the client's identity
          });
          return { result, model };
        } catch (err) {
          lastError = err;
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
      await this.cache.delete(this.keyFor(ctx, topic, ctx.registry.resolve(this.allowedEvidence(topic))));
    }
  }

  /** Generate (or load from cache) every topic in the batch. */
  async generateBatch(ctx: BatchContext): Promise<TopicOutcome[]> {
    const outcomes = new Map<string, TopicOutcome>();
    const pending: Array<{ topic: ReportTopic; evidence: EvidenceItem[]; key: string }> = [];

    for (const topic of ctx.topics) {
      const required = topic.requiredEvidence.map((p) => ({ p, items: ctx.registry.resolve([p]) }));
      const missing = required.filter((r) => r.items.length === 0).map((r) => r.p);
      const evidence = ctx.registry.resolve(this.allowedEvidence(topic));
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
        const { validation, editorialIssues, ok } = this.check(ctx, topic, cached.payload);
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

    let feedback: string[] = [];
    for (let attempt = 1; attempt <= this.config.maxAttempts && pending.length > 0; attempt++) {
      const prompt = buildBatchPrompt({
        definition: ctx.definition,
        sectionTitle: ctx.sectionTitle,
        topics: pending.map((p) => ({ topic: p.topic, evidence: p.evidence })),
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
        const call = await this.callWithRetries(prompt);
        const res = call.result;
        usedModel = call.model;
        tokens = { input: res.tokens.promptTokens, output: res.tokens.completionTokens, thinking: res.tokens.thinkingTokens ?? 0 };
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
        const payload = parsed?.find((t) => t.topicId === p.topic.id);
        if (!payload) {
          outcomes.set(p.topic.id, {
            topic: p.topic, status: 'failed', editorialIssues: [], attempts: priorAttempts + 1, cacheKey: p.key,
            evidenceIds: p.evidence.map((e) => e.id), tokens: accTokens, latencyMs: (prev?.latencyMs ?? 0) + latencyMs,
            error: callError ?? 'Model omitted this topic',
          });
          stillPending.push(p);
          continue;
        }
        const { validation, editorialIssues, ok } = this.check(ctx, p.topic, payload);
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
            parts: {
              snapshotId: ctx.registry.snapshotId, subjectRef: ctx.subjectRef, definitionId: ctx.definition.id,
              specVersion: ctx.definition.specVersion, topicId: p.topic.id, promptVersion: PROMPT_VERSION,
              evidenceFingerprint: ctx.registry.fingerprint(p.evidence), model: this.config.model,
              generationConfig: { temperature: this.config.temperature, maxOutputTokens: this.config.maxOutputTokens },
            },
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
          feedback.push(`Topic ${p.topic.id}: ${problems.map((i) => `${i.code}: ${i.message}`).join(' | ').slice(0, 700)}`);
          stillPending.push(p);
        }
      }
      pending.splice(0, pending.length, ...stillPending);
    }

    return ctx.topics.map((t) => outcomes.get(t.id)!);
  }
}
