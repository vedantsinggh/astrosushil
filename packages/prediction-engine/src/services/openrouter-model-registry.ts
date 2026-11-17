/**
 * Astro Sushil - OpenRouter Dynamic Model Discovery & Health Probing Registry
 *
 * Implements:
 * 1. Dynamic OpenRouter model discovery from /api/v1/models
 * 2. Strict filtering for free models available to the configured account
 * 3. Actual model health probing (test completion ping)
 * 4. Resilient fallback between eligible free models
 * 5. In-memory caching with 1-hour TTL
 * 6. Hard safety guarantee: Never silently switches to paid models
 */

export interface DiscoveredModelInfo {
  id: string;
  name: string;
  contextLength: number;
  isFree: boolean;
  pricing: { prompt: string; completion: string };
}

export interface ModelProbeResult {
  modelId: string;
  isHealthy: boolean;
  latencyMs: number;
  httpStatus?: number;
  error?: string;
}

export interface AccountQuotaStatus {
  isQuotaExhausted: boolean;
  used: number;
  limit: number;
  remaining: number;
  remedyHint?: string;
}

export class OpenRouterModelRegistry {
  private static instance: OpenRouterModelRegistry;
  private cachedModels: string[] = [];
  private cacheTimestamp: number = 0;
  private quotaStatus: AccountQuotaStatus | null = null;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  private constructor() {}

  public static getInstance(): OpenRouterModelRegistry {
    if (!OpenRouterModelRegistry.instance) {
      OpenRouterModelRegistry.instance = new OpenRouterModelRegistry();
    }
    return OpenRouterModelRegistry.instance;
  }

  /**
   * Checks the OpenRouter account free tier quota via /api/v1/auth/key.
   */
  public async checkAccountQuota(apiKey: string): Promise<AccountQuotaStatus> {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const json: any = await res.json();
        const daily = json?.data?.free_model_daily_requests;
        if (daily) {
          const used = daily.used ?? 0;
          const limit = daily.limit ?? 50;
          const remaining = daily.remaining ?? 0;
          this.quotaStatus = {
            isQuotaExhausted: remaining <= 0,
            used,
            limit,
            remaining,
            remedyHint:
              remaining <= 0
                ? 'OpenRouter free-tier daily request quota exhausted (50/50 used). Daily reset required or credits must be added.'
                : undefined,
          };
          return this.quotaStatus;
        }
      }
    } catch (_) {
      // Non-critical, ignore auth check failure and proceed to probes
    }

    this.quotaStatus = {
      isQuotaExhausted: false,
      used: 0,
      limit: 50,
      remaining: 50,
    };
    return this.quotaStatus;
  }

  public getCachedQuotaStatus(): AccountQuotaStatus | null {
    return this.quotaStatus;
  }

  /**
   * Discovers and returns active, probed, responsive free models from OpenRouter.
   * If cached models exist and are within TTL, returns the cached list unless forceRefresh is true.
   */
  public async getHealthyFreeModels(
    apiKey: string,
    options?: { forceRefresh?: boolean; siteUrl?: string; siteName?: string }
  ): Promise<string[]> {
    const now = Date.now();
    if (
      !options?.forceRefresh &&
      this.cachedModels.length > 0 &&
      now - this.cacheTimestamp < this.CACHE_TTL_MS
    ) {
      return [...this.cachedModels];
    }

    if (!apiKey || apiKey.trim().length === 0 || apiKey === 'mock-key-dev') {
      throw new Error('AI_CREDENTIALS_MISSING: OpenRouter API key is required for model discovery.');
    }

    // Check account daily free tier quota first
    const quota = await this.checkAccountQuota(apiKey);
    if (quota.isQuotaExhausted) {
      throw new Error(
        `OPENROUTER_QUOTA_EXHAUSTED: Account daily free tier limit reached (${quota.used}/${quota.limit} used, ${quota.remaining} remaining). ${quota.remedyHint}`
      );
    }

    // 1. Fetch available models from OpenRouter
    const discovered = await this.discoverFreeModels(apiKey, options?.siteUrl, options?.siteName);
    if (discovered.length === 0) {
      throw new Error(
        'NO_FREE_MODELS_DISCOVERED: OpenRouter returned no models matching free tier criteria (pricing=0 or :free).'
      );
    }

    // Prioritize models known for fast, reliable JSON formatting and responsive content
    const preferredOrder = [
      'baidu/ernie-5.5-flash-preview:free',
      'particle-ai/particle-1:free',
      'liquid/lfm-3-1.7b:free',
      'dots-studio/dots-3-note-preview:free',
      'openrouter/free',
      'cohere/north-mini-code:free',
      'inclusionai/ling-3.2-flash:free',
      'nvidia/nemotron-3.5-lightning:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
    ];

    const sortedDiscovered = [...discovered].sort((a, b) => {
      const idxA = preferredOrder.indexOf(a.id);
      const idxB = preferredOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.contextLength - a.contextLength;
    });

    // 2. Health probe candidates until we have verified healthy models
    const healthyModels: string[] = [];
    const probeErrors: string[] = [];

    for (const model of sortedDiscovered) {
      if (healthyModels.length >= 4) break; // We only need top 3-4 healthy fallbacks
      const probe = await this.probeModel(apiKey, model.id, options?.siteUrl, options?.siteName);
      if (probe.isHealthy) {
        healthyModels.push(model.id);
        console.log(
          `[OpenRouterModelRegistry] Verified healthy free model: ${model.id} (${probe.latencyMs}ms)`
        );
      } else {
        probeErrors.push(`${model.id}: ${probe.error || `HTTP ${probe.httpStatus}`}`);
      }
    }

    if (healthyModels.length === 0) {
      throw new Error(
        `NO_HEALTHY_FREE_MODELS: Probed ${sortedDiscovered.length} free models but none passed health checks. Probe errors:\n${probeErrors.join('\n')}`
      );
    }

    this.cachedModels = healthyModels;
    this.cacheTimestamp = Date.now();
    return [...this.cachedModels];
  }

  /**
   * Fetches the complete list of models from OpenRouter and filters strictly for free-tier models.
   */
  public async discoverFreeModels(
    apiKey: string,
    siteUrl?: string,
    siteName?: string
  ): Promise<DiscoveredModelInfo[]> {
    const url = 'https://openrouter.ai/api/v1/models';
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    if (siteUrl) headers['HTTP-Referer'] = siteUrl;
    if (siteName) headers['X-OpenRouter-Title'] = siteName;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter model discovery failed (HTTP ${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    const rawList: any[] = Array.isArray(data?.data) ? data.data : [];

    const freeModels: DiscoveredModelInfo[] = [];

    for (const m of rawList) {
      const id = String(m.id || '');
      const pricing = m.pricing || {};
      const promptCost = parseFloat(pricing.prompt ?? '1');
      const completionCost = parseFloat(pricing.completion ?? '1');
      const isZeroCost = promptCost === 0 && completionCost === 0;
      const hasFreeId = id.endsWith(':free') || id === 'openrouter/free';

      // Strict free tier enforcement: zero prompt cost and zero completion cost, or explicit free tag
      if (isZeroCost || hasFreeId) {
        const contextLength = parseInt(m.context_length || '0', 10);
        // Ensure reasonable context window (minimum 16k tokens)
        if (contextLength >= 16384) {
          freeModels.push({
            id,
            name: m.name || id,
            contextLength,
            isFree: true,
            pricing: {
              prompt: String(pricing.prompt ?? '0'),
              completion: String(pricing.completion ?? '0'),
            },
          });
        }
      }
    }

    return freeModels;
  }

  /**
   * Actively probes a model with a minimal test message.
   */
  public async probeModel(
    apiKey: string,
    modelId: string,
    siteUrl?: string,
    siteName?: string,
    timeoutMs: number = 8000
  ): Promise<ModelProbeResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (siteUrl) headers['HTTP-Referer'] = siteUrl;
    if (siteName) headers['X-OpenRouter-Title'] = siteName;

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 50,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          modelId,
          isHealthy: false,
          latencyMs,
          httpStatus: res.status,
          error: `HTTP ${res.status}`,
        };
      }

      const json: any = await res.json();
      const firstChoice = json?.choices?.[0];
      const finishReason = firstChoice?.finish_reason;
      const content = firstChoice?.message?.content;

      // Model is healthy if it returned a choice and actually emitted non-empty text content
      const isHealthy = Boolean(firstChoice && typeof content === 'string' && content.trim().length > 0);

      return {
        modelId,
        isHealthy,
        latencyMs,
        httpStatus: res.status,
      };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        modelId,
        isHealthy: false,
        latencyMs: Date.now() - start,
        error: err.name === 'AbortError' ? 'Probe timed out' : err.message,
      };
    }
  }

  /**
   * Clears the cached models, forcing re-discovery on next query.
   */
  public clearCache(): void {
    this.cachedModels = [];
    this.cacheTimestamp = 0;
  }
}

export const openRouterModelRegistry = OpenRouterModelRegistry.getInstance();
