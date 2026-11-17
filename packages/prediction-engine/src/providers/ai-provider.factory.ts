/**
 * Astro Sushil - AI Provider Factory & Multi-Provider Resilience Orchestrator
 *
 * Implements:
 * 1. Automatic provider resolution from environment (GEMINI_API_KEY vs OPENROUTER_API_KEY)
 * 2. FallbackAiProvider: Primary -> Secondary -> Graceful fallback
 * 3. Transparent provenance and model audit logging
 */

export {
  IAiProvider,
  AiGenerationOptions,
  AiGenerationResult,
} from './ai-provider.interface';
import {
  IAiProvider,
  AiGenerationOptions,
  AiGenerationResult,
} from './ai-provider.interface';
import { GroqAiProvider } from './groq-ai.provider';
import { GeminiAiProvider } from './gemini-ai.provider';
import { OpenRouterAiProvider } from './openrouter-ai.provider';

export { GroqAiProvider } from './groq-ai.provider';
export { GeminiAiProvider } from './gemini-ai.provider';
export { OpenRouterAiProvider } from './openrouter-ai.provider';

export interface AiProviderConfig {
  preferredProvider?: 'groq' | 'openrouter' | 'gemini';
  groqApiKey?: string;
  groqModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  anonymizeClientData?: boolean;
}

export class FallbackAiProvider implements IAiProvider {
  public readonly providerId = 'resilient-composite';
  private primaryProvider: IAiProvider;
  private secondaryProvider?: IAiProvider;

  constructor(primary: IAiProvider, secondary?: IAiProvider) {
    this.primaryProvider = primary;
    this.secondaryProvider = secondary;
  }

  public get isConfigured(): boolean {
    return this.primaryProvider.isConfigured || (this.secondaryProvider?.isConfigured ?? false);
  }

  public getAvailableModels(): string[] {
    const models = [...this.primaryProvider.getAvailableModels()];
    if (this.secondaryProvider) {
      models.push(...this.secondaryProvider.getAvailableModels());
    }
    return Array.from(new Set(models));
  }

  public getUsageMetadata() {
    const primaryUsage = this.primaryProvider.getUsageMetadata();
    const secondaryUsage = this.secondaryProvider?.getUsageMetadata() || {
      totalRequests: 0,
      totalTokens: 0,
    };
    return {
      totalRequests: primaryUsage.totalRequests + secondaryUsage.totalRequests,
      totalTokens: primaryUsage.totalTokens + secondaryUsage.totalTokens,
      lastUsedModel: primaryUsage.lastUsedModel || secondaryUsage.lastUsedModel,
    };
  }

  public async generate(prompt: string, options?: AiGenerationOptions): Promise<AiGenerationResult> {
    if (this.primaryProvider.isConfigured) {
      try {
        return await this.primaryProvider.generate(prompt, options);
      } catch (err: any) {
        console.warn(
          `[FallbackAiProvider] Primary provider (${this.primaryProvider.providerId}) failed: ${err.message}. Trying secondary...`
        );
      }
    }

    if (this.secondaryProvider && this.secondaryProvider.isConfigured) {
      try {
        return await this.secondaryProvider.generate(prompt, options);
      } catch (secErr: any) {
        console.warn(
          `[FallbackAiProvider] Secondary provider (${this.secondaryProvider.providerId}) failed: ${secErr.message}.`
        );
        throw secErr;
      }
    }

    throw new Error(
      `NO_ACTIVE_AI_PROVIDER: Neither primary (${this.primaryProvider.providerId}) nor secondary provider is configured with valid credentials.`
    );
  }

  public async generateStructured<T>(
    prompt: string,
    options?: AiGenerationOptions
  ): Promise<{ data: T; result: AiGenerationResult }> {
    if (this.primaryProvider.isConfigured) {
      try {
        return await this.primaryProvider.generateStructured<T>(prompt, options);
      } catch (err: any) {
        console.warn(
          `[FallbackAiProvider] Primary provider (${this.primaryProvider.providerId}) structured generation failed: ${err.message}. Trying secondary...`
        );
      }
    }

    if (this.secondaryProvider && this.secondaryProvider.isConfigured) {
      return await this.secondaryProvider.generateStructured<T>(prompt, options);
    }

    throw new Error(
      `NO_ACTIVE_AI_PROVIDER: Structured generation failed because no configured AI provider succeeded.`
    );
  }

  public async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    if (this.primaryProvider.isConfigured) {
      const primaryHealth = await this.primaryProvider.healthCheck();
      if (primaryHealth.ok) return primaryHealth;
    }

    if (this.secondaryProvider && this.secondaryProvider.isConfigured) {
      return await this.secondaryProvider.healthCheck();
    }

    return {
      ok: false,
      message: 'No AI provider is configured in this environment.',
      latencyMs: 0,
    };
  }
}

/**
 * Factory function creating the appropriate IAiProvider based on environment or configuration.
 */
export function getAiProvider(config?: AiProviderConfig): IAiProvider {
  const preferred =
    config?.preferredProvider ||
    (process.env.AI_PROVIDER as 'groq' | 'openrouter' | 'gemini') ||
    (process.env.LLM_PROVIDER as 'groq' | 'openrouter' | 'gemini') ||
    (process.env.GEMINI_API_KEY ? 'gemini' : (process.env.GROQ_API_KEY ? 'groq' : 'openrouter'));

  const groq = new GroqAiProvider({
    apiKey: config?.groqApiKey,
    defaultModel: config?.groqModel,
    anonymizeClientData: config?.anonymizeClientData,
  });

  const openrouter = new OpenRouterAiProvider({
    apiKey: config?.openrouterApiKey,
    defaultModel: config?.openrouterModel,
    anonymizeClientData: config?.anonymizeClientData,
  });

  const gemini = new GeminiAiProvider({
    apiKey: config?.geminiApiKey,
    defaultModel: config?.geminiModel,
    anonymizeClientData: config?.anonymizeClientData,
  });

  if (preferred === 'gemini') {
    // Gemini is primary; Groq is secondary fallback if configured
    return groq.isConfigured ? new FallbackAiProvider(gemini, groq) : gemini;
  } else if (preferred === 'groq') {
    return openrouter.isConfigured ? new FallbackAiProvider(groq, openrouter) : groq;
  } else {
    return groq.isConfigured ? new FallbackAiProvider(openrouter, groq) : openrouter;
  }
}
