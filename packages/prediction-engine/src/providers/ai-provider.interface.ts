/**
 * Astro Sushil - Unified AI Provider Abstraction
 *
 * Defines the standard contract for all AI model providers (Gemini, OpenRouter, etc.)
 * supporting both raw text and schema-validated structured JSON generation,
 * model health checks, and provenance audit tracking.
 */

export interface AiGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
  timeoutMs?: number;
  /**
   * If true, anonymizes client PII (name, detailed location) to protect client privacy
   * on free-tier development endpoints while strictly preserving astrological coordinates.
   */
  anonymizeClient?: boolean;
  /**
   * Reasoning effort for models that "think" before answering. Thinking tokens are
   * billed as output tokens, so lower levels cut cost substantially for writing tasks.
   * Omitted = the provider/model default. Providers without the concept ignore it.
   */
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface AiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  thinkingTokens?: number;
}

export interface AiGenerationResult {
  text: string;
  parsedJson?: any;
  provider: string;
  model: string;
  tokens: AiTokenUsage;
  latencyMs: number;
  finishReason?: string;
  cached?: boolean;
  provenance: {
    provider: string;
    model: string;
    timestamp: string;
    isRealLlm: boolean;
    anonymized: boolean;
  };
}

export interface IAiProvider {
  readonly providerId: string;
  readonly isConfigured: boolean;

  /**
   * Generate raw text response from the configured model.
   */
  generate(prompt: string, options?: AiGenerationOptions): Promise<AiGenerationResult>;

  /**
   * Generate structured, validated JSON data conforming to type T.
   */
  generateStructured<T>(prompt: string, options?: AiGenerationOptions): Promise<{ data: T; result: AiGenerationResult }>;

  /**
   * List of supported models for this provider.
   */
  getAvailableModels(): string[];

  /**
   * Health check verifying API connectivity, credentials, and endpoint latency.
   */
  healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }>;

  /**
   * Cumulative session usage metadata for cost and token tracking.
   */
  getUsageMetadata(): { totalRequests: number; totalTokens: number; lastUsedModel?: string };
}
