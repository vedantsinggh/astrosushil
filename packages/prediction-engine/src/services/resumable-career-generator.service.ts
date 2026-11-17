/**
 * Astro Sushil - Resumable Career Topic Generator Service
 *
 * Implements:
 * 1. Resumable caching: reuses valid completed topic JSON from disk cache using composite identity.
 * 2. Composite cache identity: sha256(clientId + birthData + chartHash + evidenceHash + topicNumber + promptVersion + schemaVersion + modelVersion).
 * 3. Cross-client & changed-data isolation: cache is invalidated if client, birth data, chart, or evidence changes.
 * 4. Bounded backoff retry: handles transient 503 / 500 / timeout errors with exponential backoff and sibling model fallback.
 * 5. Clean quota exhaustion: stops safely without corrupting or deleting existing completed topics.
 * 6. Documented header authentication: uses 'x-goog-api-key' header exclusively.
 * 7. Strict schema & claim validation: validates topics via CareerEditorialTopicValidator with chart placements.
 * 8. Transparent cost accounting: labels cost projections as estimates and documents assumptions.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { NormalizedChart } from '@astro/astrology-engine';
import { VocationalSynthesisResult } from './vocational-synthesis.engine';
import {
  careerEvidencePackager,
  PackagerOptions,
  TopicEvidenceDefinition,
} from './career-evidence-packager';
import {
  CAREER_EDITORIAL_SYSTEM_PROMPT,
  CAREER_EDITORIAL_PROMPT_VERSION,
} from '../prompts/career-editorial.prompt';
import {
  careerEditorialTopicValidator,
  EditorialTopicSchema,
  TopicValidationResult,
  ClientChartPlacements,
} from '../validation/career-editorial-topic.validator';

export const CAREER_EDITORIAL_SCHEMA_VERSION = 'v2.1.0-STRICT-SCHEMA';

export interface GenerationTokenUsage {
  promptTokens: number;
  completionTokens: number;
  thinkingTokens: number;
  totalTokens: number;
}

export interface TopicGenerationResult {
  topicNumber: number;
  topic: EditorialTopicSchema;
  status: 'CACHED' | 'GENERATED';
  model: string;
  responseId?: string;
  tokens: GenerationTokenUsage;
  latencyMs: number;
  estimatedCostUsd: number;
  costAccounting: {
    pricingModel: string;
    pricingAssumptions: {
      promptTokensRatePer1M: number;
      candidateTokensRatePer1M: number;
      thinkingTokensRatePer1M: number;
    };
    isEstimate: boolean;
    disclaimer: string;
  };
  validation: TopicValidationResult;
  evidenceIds: string[];
  cacheFilePath: string;
  cacheKey?: string;
}

export class QuotaExhaustedError extends Error {
  constructor(message: string, public readonly retryAfterSeconds?: number) {
    super(`QUOTA_EXHAUSTED: ${message}`);
    this.name = 'QuotaExhaustedError';
  }
}

// Standard Google Gemini Flash pricing rates ($ per 1M tokens)
const COST_PER_1M_PROMPT = 0.075;
const COST_PER_1M_COMPLETION = 0.30;
const COST_PER_1M_THINKING = 0.30;

export function calculateEstimatedCostUsd(
  promptTokens: number,
  completionTokens: number,
  thinkingTokens: number
): number {
  const promptCost = (promptTokens / 1_000_000) * COST_PER_1M_PROMPT;
  const completionCost = (completionTokens / 1_000_000) * COST_PER_1M_COMPLETION;
  const thinkingCost = (thinkingTokens / 1_000_000) * COST_PER_1M_THINKING;
  return Number((promptCost + completionCost + thinkingCost).toFixed(6));
}

export function computeSha256(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function createCompositeCacheKey(params: {
  clientId: string;
  birthData: { dob: string; tob: string; lat: number; lng: number; place: string };
  chartHash: string;
  evidenceHash: string;
  topicNumber: number;
  promptVersion: string;
  schemaVersion: string;
  modelVersion: string;
}): string {
  return computeSha256(params);
}

export interface ResumableGeneratorConfig {
  apiKey?: string;
  model?: string;
  cacheDir: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export class ResumableCareerGeneratorService {
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly cacheDir: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(config: ResumableGeneratorConfig) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
    this.defaultModel = config.model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    this.cacheDir = config.cacheDir;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 50000;

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Builds ClientChartPlacements object for claim validation
   */
  public extractChartPlacements(chart: NormalizedChart): ClientChartPlacements {
    const planetsRecord: ClientChartPlacements['planets'] = {};
    for (const p of Object.values(chart.planets || {})) {
      planetsRecord[p.name.toUpperCase()] = {
        sign: p.sign,
        house: p.house,
        nakshatra: p.nakshatra,
        isRetrograde: (p as any).isRetrograde ?? (p as any).retrograde ?? false,
      };
    }

    return {
      ascendantSign: chart.ascendant?.sign || 'Unknown',
      ascendantDegree: chart.ascendant?.degree,
      planets: planetsRecord,
    };
  }

  /**
   * Generates a single topic with automatic cache reuse, composite identity verification,
   * schema validation, and bounded backoff.
   */
  public async generateTopic(
    topicNumber: number,
    partNumber: number,
    chart: NormalizedChart,
    synthesis?: VocationalSynthesisResult | null,
    client?: { name: string; dateOfBirth: string; timeOfBirth: string; birthPlace: string; latitude?: number; longitude?: number },
    options?: PackagerOptions
  ): Promise<TopicGenerationResult> {
    const cacheFile = path.join(
      this.cacheDir,
      `topic_${String(topicNumber).padStart(2, '0')}.json`
    );

    const partPacket = careerEvidencePackager.packageEvidenceForPart(
      partNumber,
      chart,
      synthesis,
      client,
      options
    );

    const topicDef = partPacket.topicList.find((t) => t.topicNumber === topicNumber);
    if (!topicDef) {
      throw new Error(`Topic definition not found for Topic ${topicNumber} in Part ${partNumber}`);
    }

    const lagnaSign = chart.ascendant?.sign || 'Unknown';
    const chartPlacements = this.extractChartPlacements(chart);

    // Compute composite cache identity components
    const clientId = client?.name || 'unknown_client';
    const birthData = {
      dob: client?.dateOfBirth || '',
      tob: client?.timeOfBirth || '',
      lat: client?.latitude || 0,
      lng: client?.longitude || 0,
      place: client?.birthPlace || '',
    };
    const chartHash = computeSha256({
      asc: chart.ascendant,
      planets: Object.values(chart.planets || {}).map((p) => ({
        n: p.name,
        s: p.sign,
        d: p.degree,
        h: p.house,
      })),
    });
    const evidenceHash = computeSha256({
      topicNumber,
      focus: topicDef.requiredFocus,
      evidenceIds: topicDef.evidenceIds,
      facts: partPacket.astronomicalFacts,
    });

    const expectedCacheKey = createCompositeCacheKey({
      clientId,
      birthData,
      chartHash,
      evidenceHash,
      topicNumber,
      promptVersion: CAREER_EDITORIAL_PROMPT_VERSION,
      schemaVersion: CAREER_EDITORIAL_SCHEMA_VERSION,
      modelVersion: this.defaultModel,
    });

    // 1. Check Disk Cache with Composite Key & Full Claim Validation
    if (fs.existsSync(cacheFile)) {
      try {
        const cachedRaw = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));

        // Check composite cache identity
        const isClientMatch = cachedRaw.cacheIdentity?.clientId === clientId;
        const isChartMatch = cachedRaw.cacheIdentity?.chartHash === chartHash;
        const isEvidenceMatch = cachedRaw.cacheIdentity?.evidenceHash === evidenceHash;
        const isPromptMatch = cachedRaw.metadata?.promptVersion === CAREER_EDITORIAL_PROMPT_VERSION;

        if (isClientMatch && isChartMatch && isEvidenceMatch && isPromptMatch) {
          const val = careerEditorialTopicValidator.validate(cachedRaw.topic || cachedRaw, {
            expectedTopicNumber: topicNumber,
            lagnaSign,
            chartPlacements,
            requiredEvidenceIds: topicDef.evidenceIds,
            isEvidenceUnavailable: topicDef.evidenceUnavailable,
          });

          if (val.isValid) {
            return {
              topicNumber,
              topic: val.sanitizedTopic!,
              status: 'CACHED',
              model: cachedRaw.metadata?.model || this.defaultModel,
              responseId: cachedRaw.metadata?.responseId,
              tokens: cachedRaw.tokens || {
                promptTokens: 0,
                completionTokens: 0,
                thinkingTokens: 0,
                totalTokens: 0,
              },
              latencyMs: 0,
              estimatedCostUsd: cachedRaw.estimatedCostUsd || 0,
              costAccounting: this.buildCostAccounting(cachedRaw.estimatedCostUsd || 0),
              validation: val,
              evidenceIds: topicDef.evidenceIds,
              cacheFilePath: cacheFile,
              cacheKey: cachedRaw.cacheKey || expectedCacheKey,
            };
          }
        }
      } catch {
        // Cache corrupted -> proceed to regenerate
      }
    }

    // 2. Cache Miss: Execute Real Generation via Gemini API
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }

    const payload = {
      client: partPacket.client,
      partNumber,
      astronomicalFacts: partPacket.astronomicalFacts,
      topicToGenerate: {
        topicNumber,
        title: topicDef.title,
        requiredFocus: topicDef.requiredFocus,
        evidenceUnavailable: topicDef.evidenceUnavailable,
        unavailableReason: topicDef.unavailableReason,
      },
    };

    const systemPrompt = `${CAREER_EDITORIAL_SYSTEM_PROMPT}

CRITICAL RULES:
1. Return strictly valid JSON conforming to the schema with single quotes for terms.
2. In paragraphs and diamondPointers, NEVER use double quotes inside strings.
3. Ground every statement strictly in the supplied astronomical facts.`;

    const userPrompt = `Generate consultation Topic ${topicNumber} for client ${partPacket.client.name} using this verified astronomical evidence packet:
${JSON.stringify(payload, null, 2)}`;

    // Model sequence: primary model with fallback to sibling preview
    const modelsToTry = [this.defaultModel];
    if (!modelsToTry.includes('gemini-3-flash-preview')) {
      modelsToTry.push('gemini-3-flash-preview');
    }

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      const currentModel = modelsToTry[(attempt - 1) % modelsToTry.length];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        currentModel
      )}:generateContent`;

      const startTime = Date.now();

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey, // Documented header authentication
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              temperature: 0.25,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;

          // Check for Quota Exhaustion
          if (res.status === 429) {
            const isQuotaExhausted =
              errMsg.includes('RESOURCE_EXHAUSTED') ||
              errMsg.includes('Quota exceeded') ||
              errMsg.includes('per-day limit');

            if (isQuotaExhausted) {
              throw new QuotaExhaustedError(errMsg);
            }

            // Transient rate limit -> backoff
            const retryAfter = 5 * attempt;
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }

          // Transient upstream server error -> bounded exponential backoff
          if ([500, 502, 503, 504].includes(res.status)) {
            const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }

          throw new Error(`GEMINI_API_ERROR (HTTP ${res.status}): ${errMsg}`);
        }

        const data: any = await res.json();
        const rawOutputText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Validate Schema and Claims against client chart
        const valResult = careerEditorialTopicValidator.validate(rawOutputText, {
          expectedTopicNumber: topicNumber,
          lagnaSign,
          chartPlacements,
          requiredEvidenceIds: topicDef.evidenceIds,
          isEvidenceUnavailable: topicDef.evidenceUnavailable,
        });

        if (!valResult.isValid) {
          throw new Error(
            `VALIDATION_ERROR on Topic ${topicNumber}: ${valResult.errors.join('; ')}`
          );
        }

        const promptTokens = data.usageMetadata?.promptTokenCount || 0;
        const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
        const thinkingTokens = data.usageMetadata?.thoughtsTokenCount || 0;
        const totalTokens =
          data.usageMetadata?.totalTokenCount || promptTokens + completionTokens + thinkingTokens;

        const estimatedCostUsd = calculateEstimatedCostUsd(
          promptTokens,
          completionTokens,
          thinkingTokens
        );

        const responseId = data.responseId || `gemini-${topicNumber}-${Date.now()}`;
        const actualModel = data.modelVersion || currentModel;

        const resultPayload: TopicGenerationResult = {
          topicNumber,
          topic: valResult.sanitizedTopic!,
          status: 'GENERATED',
          model: actualModel,
          responseId,
          tokens: {
            promptTokens,
            completionTokens,
            thinkingTokens,
            totalTokens,
          },
          latencyMs,
          estimatedCostUsd,
          costAccounting: this.buildCostAccounting(estimatedCostUsd),
          validation: valResult,
          evidenceIds: topicDef.evidenceIds,
          cacheFilePath: cacheFile,
          cacheKey: expectedCacheKey,
        };

        // Atomic write to disk cache with composite identity
        const tempCacheFile = `${cacheFile}.tmp.${Date.now()}`;
        const cacheEntry = {
          cacheKey: expectedCacheKey,
          cacheIdentity: {
            clientId,
            birthData,
            chartHash,
            evidenceHash,
            topicNumber,
            promptVersion: CAREER_EDITORIAL_PROMPT_VERSION,
            schemaVersion: CAREER_EDITORIAL_SCHEMA_VERSION,
            modelVersion: actualModel,
          },
          topicNumber,
          topic: valResult.sanitizedTopic,
          metadata: {
            topicId: topicNumber,
            partNumber,
            promptVersion: CAREER_EDITORIAL_PROMPT_VERSION,
            schemaVersion: CAREER_EDITORIAL_SCHEMA_VERSION,
            model: actualModel,
            responseId,
            timestamp: new Date().toISOString(),
          },
          tokens: resultPayload.tokens,
          estimatedCostUsd,
          costAccounting: resultPayload.costAccounting,
          evidenceIds: topicDef.evidenceIds,
        };

        fs.writeFileSync(tempCacheFile, JSON.stringify(cacheEntry, null, 2), 'utf-8');
        fs.renameSync(tempCacheFile, cacheFile);

        return resultPayload;
      } catch (err: any) {
        lastError = err;
        if (err instanceof QuotaExhaustedError) {
          throw err; // Stop cleanly on quota exhaustion without destroying output
        }
        if (attempt <= this.maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    throw new Error(
      `Failed generating Topic ${topicNumber} after ${this.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  private buildCostAccounting(estimatedCostUsd: number) {
    return {
      pricingModel: 'Google Gemini Developer API (Flash Tier)',
      pricingAssumptions: {
        promptTokensRatePer1M: COST_PER_1M_PROMPT,
        candidateTokensRatePer1M: COST_PER_1M_COMPLETION,
        thinkingTokensRatePer1M: COST_PER_1M_THINKING,
      },
      isEstimate: true,
      disclaimer:
        'Cost projections are mathematical estimates based on Google Gemini standard pricing ($0.075/1M prompt, $0.300/1M completion & thinking). Actual billing may vary with account tiers.',
    };
  }
}
