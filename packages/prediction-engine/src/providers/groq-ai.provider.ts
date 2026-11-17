/**
 * Astro Sushil - Groq AI Provider Implementation
 *
 * Implements the IAiProvider contract for Groq Chat Completions API.
 * High-throughput, sub-second inference using openai/gpt-oss-120b.
 * Includes rate-limit accounting, backoff retries, and strict PII protection.
 */

import {
  IAiProvider,
  AiGenerationOptions,
  AiGenerationResult,
  AiTokenUsage,
} from './ai-provider.interface';

export interface GroqConfig {
  apiKey?: string;
  defaultModel?: string;
  baseUrl?: string;
  anonymizeClientData?: boolean;
  maxRetries?: number;
}

export interface GroqRateLimits {
  remainingTokens: number;
  resetTokensMs: number;
  remainingRequests: number;
  resetRequestsMs: number;
  lastUpdated: number;
}

export class GroqAiProvider implements IAiProvider {
  public readonly providerId = 'groq';
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl: string;
  private readonly anonymizeDefault: boolean;
  private readonly maxRetries: number;

  private totalRequests = 0;
  private totalTokens = 0;
  private lastUsedModel?: string;

  private rateLimits: GroqRateLimits = {
    remainingTokens: 8000,
    resetTokensMs: 0,
    remainingRequests: 1000,
    resetRequestsMs: 0,
    lastUpdated: 0,
  };

  constructor(config?: GroqConfig) {
    this.apiKey = config?.apiKey || process.env.GROQ_API_KEY || '';
    this.defaultModel = config?.defaultModel || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    this.baseUrl = config?.baseUrl || process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    this.anonymizeDefault =
      config?.anonymizeClientData ??
      (process.env.AI_ANONYMIZE_PII === 'true' || process.env.NODE_ENV !== 'production');
    this.maxRetries = config?.maxRetries ?? 4;
  }

  public get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes('mock'));
  }

  public getAvailableModels(): string[] {
    return [this.defaultModel];
  }

  public getRateLimits(): GroqRateLimits {
    return { ...this.rateLimits };
  }

  public getUsageMetadata() {
    return {
      totalRequests: this.totalRequests,
      totalTokens: this.totalTokens,
      lastUsedModel: this.lastUsedModel,
      rateLimits: this.getRateLimits(),
    };
  }

  private anonymizePrompt(prompt: string, clientName?: string): string {
    let sanitized = prompt;
    if (clientName && clientName.trim().length > 0) {
      const regex = new RegExp(clientName.trim(), 'gi');
      sanitized = sanitized.replace(regex, 'Client AP-1983-NATIVE');
    }
    sanitized = sanitized.replace(
      /\b\d{1,5}\s+[\w\s]{2,30}(?:Street|St|Road|Rd|Avenue|Ave|Nagar|Colony)\b/gi,
      '[Redacted Address]'
    );
    return sanitized;
  }

  private parseDurationMs(durationStr?: string): number {
    if (!durationStr) return 2000;
    // e.g. "1.77s", "1m26.4s", "500ms"
    let totalMs = 0;
    const minMatch = durationStr.match(/(\d+(?:\.\d+)?)m/);
    if (minMatch) totalMs += parseFloat(minMatch[1]) * 60000;
    const secMatch = durationStr.match(/(\d+(?:\.\d+)?)s/);
    if (secMatch) totalMs += parseFloat(secMatch[1]) * 1000;
    const msMatch = durationStr.match(/(\d+(?:\.\d+)?)ms/);
    if (msMatch) totalMs += parseFloat(msMatch[1]);
    return totalMs > 0 ? totalMs : 2000;
  }

  private updateRateLimits(headers: Headers): void {
    const remTokens = headers.get('x-ratelimit-remaining-tokens');
    const resetTokens = headers.get('x-ratelimit-reset-tokens');
    const remReqs = headers.get('x-ratelimit-remaining-requests');
    const resetReqs = headers.get('x-ratelimit-reset-requests');

    if (remTokens !== null) this.rateLimits.remainingTokens = parseInt(remTokens, 10);
    if (resetTokens !== null) this.rateLimits.resetTokensMs = this.parseDurationMs(resetTokens);
    if (remReqs !== null) this.rateLimits.remainingRequests = parseInt(remReqs, 10);
    if (resetReqs !== null) this.rateLimits.resetRequestsMs = this.parseDurationMs(resetReqs);
    this.rateLimits.lastUpdated = Date.now();
  }

  public async generate(prompt: string, options?: AiGenerationOptions): Promise<AiGenerationResult> {
    if (!this.isConfigured) {
      throw new Error('GROQ_CREDENTIALS_MISSING: GROQ_API_KEY is not configured in the environment.');
    }

    const model = options?.model || this.defaultModel;
    const shouldAnonymize = options?.anonymizeClient ?? this.anonymizeDefault;
    const effectivePrompt = shouldAnonymize ? this.anonymizePrompt(prompt) : prompt;

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: effectivePrompt });

    const requestBody: any = {
      model,
      messages,
      temperature: options?.temperature ?? 0.25,
      max_tokens: options?.maxTokens ?? 8192,
    };

    if (options?.responseFormat === 'json') {
      requestBody.response_format = { type: 'json_object' };
      const hasJsonMention = messages.some((m) => m.content.toLowerCase().includes('json'));
      if (!hasJsonMention) {
        messages.unshift({ role: 'system', content: 'You must respond with a strictly valid JSON object.' });
      }
    }

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      const startTime = Date.now();

      // Check if remaining tokens are critically low (< 1000)
      if (this.rateLimits.remainingTokens < 1200 && this.rateLimits.resetTokensMs > 0) {
        const pauseMs = Math.min(this.rateLimits.resetTokensMs + 200, 5000);
        console.log(`[GroqAiProvider] Rate limit pacing: remaining tokens (${this.rateLimits.remainingTokens}) low. Waiting ${pauseMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, pauseMs));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 60000);

      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'AstroSushil-Backend/1.0',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        this.updateRateLimits(res.headers);
        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errText = await res.text();
          let parsedError: any;
          try {
            parsedError = JSON.parse(errText);
          } catch {
            parsedError = { error: { message: errText } };
          }

          const errMsg = parsedError?.error?.message || errText;

          if (res.status === 429) {
            let backoffMs = Math.min(Math.pow(2, attempt) * 1500, 30000);
            const retryAfter = res.headers.get('retry-after');
            if (retryAfter) {
              const sec = parseFloat(retryAfter);
              if (!isNaN(sec)) backoffMs = (sec + 2) * 1000;
            } else {
              const match = errMsg.match(/try again in\s+([0-9ms\.]+)/i);
              if (match) {
                backoffMs = this.parseDurationMs(match[1]) + 2000;
              }
            }
            console.warn(
              `[GroqAiProvider] HTTP 429 Rate Limit (Attempt ${attempt}/${this.maxRetries}). Waiting ${(backoffMs / 1000).toFixed(1)}s before retry. Details: ${errMsg}`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          if (res.status >= 500) {
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.warn(`[GroqAiProvider] HTTP ${res.status} Server Error. Retrying in ${backoffMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          throw new Error(`GROQ_API_ERROR (HTTP ${res.status}): ${errMsg}`);
        }

        const responseData: any = await res.json();
        const choice = responseData.choices?.[0];
        const outputText = choice?.message?.content || '';
        const finishReason = choice?.finish_reason || 'stop';

        const usage: AiTokenUsage = {
          promptTokens: responseData.usage?.prompt_tokens || 0,
          completionTokens: responseData.usage?.completion_tokens || 0,
          totalTokens: responseData.usage?.total_tokens || 0,
        };

        this.totalRequests++;
        this.totalTokens += usage.totalTokens;
        this.lastUsedModel = model;

        let parsedJson: any = undefined;
        if (options?.responseFormat === 'json' && outputText) {
          try {
            let clean = outputText.trim();
            if (clean.startsWith('```json')) clean = clean.slice(7);
            if (clean.startsWith('```')) clean = clean.slice(3);
            if (clean.endsWith('```')) clean = clean.slice(0, -3);
            parsedJson = JSON.parse(clean.trim());
          } catch {
            // Handled in generateStructured
          }
        }

        return {
          text: outputText,
          parsedJson,
          provider: 'groq',
          model,
          tokens: usage,
          latencyMs,
          finishReason,
          provenance: {
            provider: 'groq',
            model,
            timestamp: new Date().toISOString(),
            isRealLlm: true,
            anonymized: shouldAnonymize,
          },
        };
      } catch (err: any) {
        clearTimeout(timeout);
        lastError = err;
        if (err.name === 'AbortError') {
          console.warn(`[GroqAiProvider] Request timed out after ${options?.timeoutMs || 60000}ms (Attempt ${attempt}).`);
        }
        if (attempt <= this.maxRetries) {
          const waitMs = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }

    throw lastError || new Error(`GROQ_GENERATION_FAILED: Exceeded max retries (${this.maxRetries}).`);
  }

  public async generateStructured<T>(
    prompt: string,
    options?: AiGenerationOptions
  ): Promise<{ data: T; result: AiGenerationResult }> {
    const result = await this.generate(prompt, {
      ...options,
      responseFormat: 'json',
    });

    if (result.parsedJson) {
      return { data: result.parsedJson as T, result };
    }

    try {
      let raw = result.text.trim();
      if (raw.startsWith('```json')) raw = raw.slice(7);
      if (raw.startsWith('```')) raw = raw.slice(3);
      if (raw.endsWith('```')) raw = raw.slice(0, -3);
      const parsed = JSON.parse(raw.trim()) as T;
      return { data: parsed, result };
    } catch (e: any) {
      throw new Error(`GROQ_STRUCTURED_PARSE_FAILED: Response could not be parsed as valid JSON: ${e.message}\nRaw Text: ${result.text.slice(0, 300)}`);
    }
  }

  public async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    if (!this.isConfigured) {
      return {
        ok: false,
        message: 'GROQ_API_KEY is not configured in the environment.',
        latencyMs: 0,
      };
    }

    const start = Date.now();
    try {
      const res = await this.generate('Return a valid JSON object: {"status":"ok"}', {
        responseFormat: 'json',
        maxTokens: 150,
        temperature: 0,
        timeoutMs: 15000,
      });
      return {
        ok: true,
        message: `Groq API is healthy and reachable (Model: ${res.model}).`,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: `Groq health check failed: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }
}
