/**
 * Astro Sushil - Gemini AI Provider Implementation
 *
 * Implements the IAiProvider contract for Google AI Studio / Gemini Developer API.
 * Uses native fetch without heavy third-party SDK dependencies.
 *
 * Supported models:
 * - gemini-2.0-flash (default, high speed, structured outputs)
 * - gemini-1.5-flash
 * - gemini-1.5-pro
 */

import {
  IAiProvider,
  AiGenerationOptions,
  AiGenerationResult,
  AiTokenUsage,
} from './ai-provider.interface';

export interface GeminiConfig {
  apiKey?: string;
  defaultModel?: string;
  anonymizeClientData?: boolean;
}

/** True for Gemini 3 and later, which accept `thinkingConfig.thinkingLevel`. */
export function supportsThinkingLevel(model: string): boolean {
  const major = /^(?:models\/)?gemini-(\d+)/i.exec(model)?.[1];
  return major !== undefined && Number(major) >= 3;
}

export class GeminiAiProvider implements IAiProvider {
  public readonly providerId = 'gemini';
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly anonymizeDefault: boolean;

  private totalRequests = 0;
  private totalTokens = 0;
  private lastUsedModel?: string;

  constructor(config?: GeminiConfig) {
    this.apiKey =
      config?.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';
    this.defaultModel =
      config?.defaultModel ||
      process.env.GEMINI_MODEL ||
      process.env.AI_MODEL ||
      'gemini-3.1-flash-lite';
    this.anonymizeDefault =
      config?.anonymizeClientData ??
      (process.env.AI_ANONYMIZE_PII === 'true' || process.env.NODE_ENV !== 'production');
  }

  public get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes('mock'));
  }

  public getAvailableModels(): string[] {
    return ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];
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
    // Also protect typical street address patterns if present
    sanitized = sanitized.replace(/\b\d{1,5}\s+[\w\s]{2,30}(?:Street|St|Road|Rd|Avenue|Ave|Nagar|Colony)\b/gi, '[Redacted Address]');
    return sanitized;
  }

  public async generate(prompt: string, options?: AiGenerationOptions): Promise<AiGenerationResult> {
    if (!this.isConfigured) {
      throw new Error(
        'GEMINI_CREDENTIALS_MISSING: GEMINI_API_KEY (or GOOGLE_API_KEY) is not configured in the environment.'
      );
    }

    const model = options?.model || this.defaultModel;
    const shouldAnonymize = options?.anonymizeClient ?? this.anonymizeDefault;
    const effectivePrompt = shouldAnonymize ? this.anonymizePrompt(prompt) : prompt;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const startTime = Date.now();

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: effectivePrompt }],
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.25,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    };

    // thinkingLevel is a Gemini 3+ parameter; older models reject it with HTTP 400,
    // so it is only sent to models that support it (others keep their default).
    if (options?.thinkingLevel && supportsThinkingLevel(model)) {
      requestBody.generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };
    }

    if (options?.systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    if (options?.responseFormat === 'json') {
      requestBody.generationConfig.responseMimeType = 'application/json';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 60000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 429) {
          throw new Error(`GEMINI_RATE_LIMIT: Quota exceeded or rate limited (HTTP 429). ${errText}`);
        }
        throw new Error(`GEMINI_API_ERROR: HTTP ${response.status} from Gemini API. ${errText}`);
      }

      const responseData: any = await response.json();
      const candidate = responseData.candidates?.[0];
      const outputText = candidate?.content?.parts?.[0]?.text || '';
      const finishReason = candidate?.finishReason || 'STOP';

      const usage: AiTokenUsage = {
        promptTokens: responseData.usageMetadata?.promptTokenCount || 0,
        completionTokens: responseData.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: responseData.usageMetadata?.totalTokenCount || 0,
        thinkingTokens: responseData.usageMetadata?.thoughtsTokenCount || 0,
      };

      this.totalRequests++;
      this.totalTokens += usage.totalTokens;
      this.lastUsedModel = model;

      let parsedJson: any = undefined;
      if (options?.responseFormat === 'json' && outputText) {
        try {
          // Strip any unexpected markdown backticks if present
          let clean = outputText.trim();
          if (clean.startsWith('```json')) clean = clean.slice(7);
          if (clean.startsWith('```')) clean = clean.slice(3);
          if (clean.endsWith('```')) clean = clean.slice(0, -3);
          parsedJson = JSON.parse(clean.trim());
        } catch (jsonErr: any) {
          console.warn(`[GeminiAiProvider] Failed to parse JSON response:`, jsonErr.message);
        }
      }

      return {
        text: outputText,
        parsedJson,
        provider: 'gemini',
        model,
        tokens: usage,
        latencyMs,
        finishReason,
        provenance: {
          provider: 'gemini',
          model,
          timestamp: new Date().toISOString(),
          isRealLlm: true,
          anonymized: shouldAnonymize,
        },
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`GEMINI_TIMEOUT: Request timed out after ${options?.timeoutMs || 60000}ms.`);
      }
      throw err;
    }
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

    // Attempt repair of raw text if JSON wasn't parsed automatically
    try {
      let raw = result.text.trim();
      if (raw.startsWith('```json')) raw = raw.slice(7);
      if (raw.startsWith('```')) raw = raw.slice(3);
      if (raw.endsWith('```')) raw = raw.slice(0, -3);
      const parsed = JSON.parse(raw.trim()) as T;
      return { data: parsed, result };
    } catch (e: any) {
      throw new Error(`GEMINI_STRUCTURED_PARSE_FAILED: Response could not be parsed as valid JSON: ${e.message}`);
    }
  }

  public async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    if (!this.isConfigured) {
      return {
        ok: false,
        message: 'Gemini API key is not configured in the environment.',
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
        message: 'Gemini API is healthy and reachable.',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: `Gemini health check failed: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }
}
