/**
 * Astro Sushil - OpenRouter AI Provider Implementation
 *
 * Implements the IAiProvider contract for OpenRouter Chat Completions API.
 * Supports primary model and dynamic free-tier failover.
 */

import {
  IAiProvider,
  AiGenerationOptions,
  AiGenerationResult,
  AiTokenUsage,
} from './ai-provider.interface';

export interface OpenRouterConfig {
  apiKey?: string;
  defaultModel?: string;
  fallbackModels?: string[];
  siteUrl?: string;
  siteName?: string;
  anonymizeClientData?: boolean;
}

export class OpenRouterAiProvider implements IAiProvider {
  public readonly providerId = 'openrouter';
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly fallbackModels: string[];
  private readonly siteUrl: string;
  private readonly siteName: string;
  private readonly anonymizeDefault: boolean;

  private totalRequests = 0;
  private totalTokens = 0;
  private lastUsedModel?: string;

  constructor(config?: OpenRouterConfig) {
    this.apiKey =
      config?.apiKey ||
      process.env.OPENROUTER_API_KEY ||
      '';
    this.defaultModel =
      config?.defaultModel ||
      process.env.OPENROUTER_MODEL ||
      'baidu/ernie-5.5-flash-preview:free';
    this.fallbackModels = config?.fallbackModels ||
      (process.env.OPENROUTER_FALLBACK_MODELS ||
        'recursive/flint-v1.0:free,particle-ai/particle-1:free,cohere/north-mini-code:free')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    this.siteUrl = config?.siteUrl || process.env.OPENROUTER_SITE_URL || 'https://astrosushil.com';
    this.siteName = config?.siteName || process.env.OPENROUTER_SITE_NAME || 'Astro Sushil';
    this.anonymizeDefault =
      config?.anonymizeClientData ??
      (process.env.AI_ANONYMIZE_PII === 'true' || process.env.NODE_ENV !== 'production');
  }

  public get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes('mock'));
  }

  public getAvailableModels(): string[] {
    return Array.from(new Set([this.defaultModel, ...this.fallbackModels]));
  }

  public getUsageMetadata() {
    return {
      totalRequests: this.totalRequests,
      totalTokens: this.totalTokens,
      lastUsedModel: this.lastUsedModel,
    };
  }

  private anonymizePrompt(prompt: string, clientName?: string): string {
    let sanitized = prompt;
    if (clientName && clientName.trim().length > 0) {
      const regex = new RegExp(clientName.trim(), 'gi');
      sanitized = sanitized.replace(regex, 'Client AP-1983-NATIVE');
    }
    sanitized = sanitized.replace(/\b\d{1,5}\s+[\w\s]{2,30}(?:Street|St|Road|Rd|Avenue|Ave|Nagar|Colony)\b/gi, '[Redacted Address]');
    return sanitized;
  }

  public async generate(prompt: string, options?: AiGenerationOptions): Promise<AiGenerationResult> {
    if (!this.isConfigured) {
      throw new Error(
        'OPENROUTER_CREDENTIALS_MISSING: OPENROUTER_API_KEY is not configured in the environment.'
      );
    }

    const candidateModels = options?.model
      ? [options.model]
      : Array.from(new Set([this.defaultModel, ...this.fallbackModels]));

    const shouldAnonymize = options?.anonymizeClient ?? this.anonymizeDefault;
    const effectivePrompt = shouldAnonymize ? this.anonymizePrompt(prompt) : prompt;

    let lastError: Error | null = null;
    const startTime = Date.now();

    for (const model of candidateModels) {
      try {
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
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 60000);

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.siteUrl,
            'X-OpenRouter-Title': this.siteName,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 429 && (errText.includes('free-models-per-day') || errText.includes('free_tier_daily'))) {
            throw new Error(`OPENROUTER_DAILY_QUOTA_EXHAUSTED: ${errText}`);
          }
          throw new Error(`OPENROUTER_HTTP_${res.status}: ${errText}`);
        }

        const responseData: any = await res.json();
        const message = responseData.choices?.[0]?.message;
        let outputText = message?.content || '';

        // Extract JSON if inside reasoning content
        if (!outputText && message?.reasoning) {
          const jsonMatch = message.reasoning.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            outputText = jsonMatch[1].trim();
          }
        }

        const finishReason = responseData.choices?.[0]?.finish_reason || 'stop';
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
            // Leave undefined, will be handled by generateStructured if needed
          }
        }

        return {
          text: outputText,
          parsedJson,
          provider: 'openrouter',
          model,
          tokens: usage,
          latencyMs,
          finishReason,
          provenance: {
            provider: 'openrouter',
            model,
            timestamp: new Date().toISOString(),
            isRealLlm: true,
            anonymized: shouldAnonymize,
          },
        };
      } catch (err: any) {
        lastError = err;
        if (err.message?.includes('OPENROUTER_DAILY_QUOTA_EXHAUSTED')) {
          // Break immediately, no point trying other free models if daily quota is reached
          throw err;
        }
        console.warn(`[OpenRouterAiProvider] Model ${model} failed: ${err.message}. Trying next candidate...`);
      }
    }

    throw lastError || new Error('All OpenRouter candidate models failed.');
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
      throw new Error(`OPENROUTER_STRUCTURED_PARSE_FAILED: Response could not be parsed as valid JSON: ${e.message}`);
    }
  }

  public async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    if (!this.isConfigured) {
      return {
        ok: false,
        message: 'OpenRouter API key is not configured in the environment.',
        latencyMs: 0,
      };
    }

    const start = Date.now();
    try {
      await this.generate('Say OK', {
        maxTokens: 5,
        temperature: 0,
        timeoutMs: 10000,
      });
      return {
        ok: true,
        message: 'OpenRouter API is healthy and reachable.',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: `OpenRouter health check failed: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }
}
