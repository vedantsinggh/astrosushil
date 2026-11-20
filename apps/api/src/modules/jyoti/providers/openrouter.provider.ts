import { config } from '../../../config';
import { JYOTI_SYSTEM_PROMPT } from '../prompts/jyoti.prompt';
import { LLMProvider, LLMProviderOptions, LLMResponse } from './llm.provider';
import { logger } from '../../../utils/logger';
import { AppError } from '../../../errors/app-error';

/** Raised when the AI provider is unconfigured, unreachable, or returns unusable output. */
export class AiServiceUnavailableError extends AppError {
  constructor(message: string = 'The AI assistant is temporarily unavailable. Please try again in a moment.') {
    super(message, 503, 'AI_SERVICE_UNAVAILABLE');
  }
}

/** Raised when the AI provider returned output that could not be parsed into a usable answer. */
export class AiResponseInvalidError extends AppError {
  constructor(message: string = 'The AI assistant returned an unusable response. Please try again.') {
    super(message, 502, 'AI_RESPONSE_INVALID');
  }
}

// Mobile clients wait 60s; keep the server-side budget comfortably below that.
const DEFAULT_TOTAL_BUDGET_MS = 50000;
const PER_ATTEMPT_TIMEOUT_MS = 40000;
const MIN_ATTEMPT_MS = 5000;
const DEFAULT_MAX_TOKENS = 4000;
const MAX_TOKENS_CAP = 8000;

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenRouterProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly siteUrl: string;
  private readonly siteName: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey !== undefined ? apiKey : (process.env.OPENROUTER_API_KEY || config.OPENROUTER_API_KEY || '');
    this.model = model || process.env.OPENROUTER_MODEL || config.OPENROUTER_MODEL;
    this.siteUrl = process.env.OPENROUTER_SITE_URL || 'https://astrosushil.com';
    this.siteName = process.env.OPENROUTER_SITE_NAME || 'Astro Sushil';
  }

  private logLlmStatus(params: {
    status: number;
    latency: number;
    error: string;
    parser: 'success' | 'failure';
  }) {
    const logLine = `[JYOTI][LLM] provider=openrouter model=${this.model} status=${params.status} latency=${params.latency}ms error=${params.error} parser=${params.parser}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log(logLine);
    }
    logger.info(
      {
        provider: 'openrouter',
        model: this.model,
        status: params.status,
        latency: params.latency,
        error: params.error,
        parser: params.parser,
      },
      '[JYOTI][LLM] OpenRouter execution result'
    );
  }

  public async generateResponse(prompt: string, options?: LLMProviderOptions): Promise<LLMResponse> {
    const isApiKeyConfigured = Boolean(
      this.apiKey && this.apiKey.trim().length > 0 && this.apiKey !== 'mock-key-dev'
    );

    if (!isApiKeyConfigured) {
      this.logLlmStatus({
        status: 0,
        latency: 0,
        error: 'OPENROUTER_API_KEY is missing or unconfigured',
        parser: 'failure',
      });
      throw new AiServiceUnavailableError('AI assistant is not configured on this server.');
    }

    const systemPrompt = options?.systemInstruction || JYOTI_SYSTEM_PROMPT;
    const maxAttempts = 3;
    // Overall wall-clock budget across all attempts. It must stay below the mobile client's
    // 60s receive timeout so the app always gets a clean JSON error instead of a dropped socket.
    const totalBudgetMs = options?.totalTimeoutMs ?? readPositiveInt(process.env.JYOTI_LLM_TOTAL_TIMEOUT_MS, DEFAULT_TOTAL_BUDGET_MS);
    const deadline = Date.now() + totalBudgetMs;
    // Reasoning ("thinking") models spend completion tokens on hidden reasoning before writing
    // the answer. With a small max_tokens the whole budget can be consumed by reasoning, leaving
    // `content` empty (finish_reason=length). Keep reasoning effort low and the budget generous.
    let maxTokens = options?.maxOutputTokens ?? DEFAULT_MAX_TOKENS;
    const reasoningEffort = process.env.OPENROUTER_REASONING_EFFORT || 'low';

    const fallbackList = (process.env.OPENROUTER_FALLBACK_MODELS || '')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    // OpenRouter accepts at most 3 entries in `models`; the first is the primary model.
    const candidateModels = Array.from(new Set([this.model, ...fallbackList])).slice(0, 3);

    let attempt = 0;
    let lastError: Error | null = null;
    let lastStatus = 0;
    let lastLatency = 0;

    while (attempt < maxAttempts) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < MIN_ATTEMPT_MS) break;
      attempt++;
      const attemptTimeoutMs = Math.min(PER_ATTEMPT_TIMEOUT_MS, remainingMs);
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);

      try {
        const url = 'https://openrouter.ai/api/v1/chat/completions';
        const requestHeaders: Record<string, string> = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.siteUrl,
          'X-OpenRouter-Title': this.siteName,
        };

        const requestBody: Record<string, unknown> = {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: options?.temperature ?? 0.3,
          max_tokens: maxTokens,
          reasoning: { effort: reasoningEffort, exclude: true },
        };
        if (candidateModels.length > 1) {
          requestBody.models = candidateModels;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        // NOTE: the abort timer stays armed until the body has been read; the body of a
        // non-streaming completion only arrives once generation finishes.
        const latencyToHeaders = Date.now() - startTime;
        lastStatus = response.status;

        if (!response.ok) {
          const rawErr = await response.text();
          clearTimeout(timeoutId);
          const latency = Date.now() - startTime;
          lastLatency = latency;
          const redactedErr = this.apiKey ? rawErr.replaceAll(this.apiKey, '[REDACTED]') : rawErr;

          if (response.status === 401 || response.status === 403) {
            this.logLlmStatus({
              status: response.status,
              latency,
              error: `Authentication Error (${response.status}): ${redactedErr}`,
              parser: 'failure',
            });
            lastError = new Error(`OpenRouter Authentication Error (${response.status})`);
            break; // Retrying cannot fix a bad key.
          }

          if (response.status === 429 || response.status >= 500) {
            lastError = new Error(`OpenRouter transient error ${response.status}: ${redactedErr}`);
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
            logger.warn(
              { status: response.status, attempt, backoffMs },
              '[OpenRouterProvider] Transient error encountered. Retrying with backoff...'
            );
            if (attempt < maxAttempts && deadline - Date.now() > backoffMs + MIN_ATTEMPT_MS) {
              await sleep(backoffMs);
            }
            continue;
          }

          this.logLlmStatus({
            status: response.status,
            latency,
            error: `API error ${response.status}: ${redactedErr}`,
            parser: 'failure',
          });
          lastError = new Error(`OpenRouter API error ${response.status}`);
          break; // 4xx (bad request / bad model id) is not transient.
        }

        const json: any = await response.json();
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        lastLatency = latency;
        logger.debug({ latencyToHeaders, latency, attempt }, '[OpenRouterProvider] Completion received');
        const rawText = json?.choices?.[0]?.message?.content;
        const finishReason = json?.choices?.[0]?.finish_reason;

        if (typeof rawText !== 'string' || !rawText.trim()) {
          this.logLlmStatus({
            status: 200,
            latency,
            error: `Empty response content from OpenRouter (finish_reason=${finishReason ?? 'unknown'}, served_by=${json?.model ?? 'unknown'}, completion_tokens=${json?.usage?.completion_tokens ?? '?'}, reasoning_tokens=${json?.usage?.completion_tokens_details?.reasoning_tokens ?? '?'})`,
            parser: 'failure',
          });
          lastError = new AiResponseInvalidError();
          if (finishReason === 'length') {
            // Token budget exhausted (typically by hidden reasoning): retry with more room.
            maxTokens = Math.min(maxTokens * 2, MAX_TOKENS_CAP);
          }
          continue;
        }

        try {
          return this.parseJsonResponse(rawText, latency);
        } catch (parseErr) {
          // A truncated or malformed answer: one more attempt may produce a clean one.
          lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
          logger.warn(
            { attempt, finishReason, contentLength: rawText.length },
            '[OpenRouterProvider] Completion could not be parsed. Retrying...'
          );
          if (finishReason === 'length') {
            maxTokens = Math.min(maxTokens * 2, MAX_TOKENS_CAP);
          }
          continue;
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastLatency = Date.now() - startTime;
        lastError = err instanceof Error ? err : new Error(String(err));

        if (err?.name === 'AbortError') {
          lastStatus = 408;
          lastError = new Error(`OpenRouter API request timed out after ${attemptTimeoutMs}ms`);
        }

        const sanitizedMsg = this.apiKey ? lastError.message.replaceAll(this.apiKey, '[REDACTED]') : lastError.message;
        this.logLlmStatus({
          status: lastStatus || 500,
          latency: lastLatency,
          error: sanitizedMsg,
          parser: 'failure',
        });

        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        if (attempt < maxAttempts && err?.name !== 'AbortError' && deadline - Date.now() > backoffMs + MIN_ATTEMPT_MS) {
          await sleep(backoffMs);
        }
      }
    }

    const redactedMsg = this.apiKey ? lastError?.message.replaceAll(this.apiKey, '[REDACTED]') : lastError?.message;
    logger.error({ err: redactedMsg, status: lastStatus, latency: lastLatency, attempts: attempt }, '[OpenRouterProvider] Retries exhausted or API error encountered.');
    throw new AiServiceUnavailableError();
  }

  private sanitizeMessageText(input: any): string {
    if (typeof input !== 'string') {
      return '';
    }

    let text = input.trim();

    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const nested = JSON.parse(text);
        if (nested && typeof nested.message === 'string') {
          text = nested.message.trim();
        }
      } catch (_) {}
    }

    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      text = text.substring(1, text.length - 1).trim();
    }

    text = text.replace(/\\n/g, '\n');

    if (text.toLowerCase().startsWith('message:')) {
      text = text.substring(8).trim();
    }

    return text;
  }

  public parseJsonResponse(rawText: string, latencyMs = 0): LLMResponse {
    if (!rawText || !rawText.trim()) {
      this.logLlmStatus({
        status: 200,
        latency: latencyMs,
        error: 'Empty response text passed to parser',
        parser: 'failure',
      });
      throw new AiResponseInvalidError();
    }

    let cleaned = rawText.trim();

    // 1. Try extracting content inside markdown code fences ```json ... ``` or ``` ... ```
    const codeFenceMatch = cleaned.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
    let targetText = codeFenceMatch ? codeFenceMatch[1].trim() : cleaned;

    // 2. Direct JSON parse
    try {
      let parsed = JSON.parse(targetText);

      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {}
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const messageText = this.sanitizeMessageText(parsed.message || (typeof targetText === 'string' && !targetText.startsWith('{') ? targetText : rawText));
        this.logLlmStatus({
          status: 200,
          latency: latencyMs,
          error: 'none',
          parser: 'success',
        });
        return {
          message: messageText,
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
          explanation: typeof parsed.explanation === 'object' && parsed.explanation !== null ? parsed.explanation : undefined,
          headline: typeof parsed.headline === 'string' ? parsed.headline.trim() : undefined,
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.filter((k: any) => typeof k === 'string').map((k: string) => k.trim()) : undefined,
          disclaimer: typeof parsed.disclaimer === 'string' ? parsed.disclaimer.trim() : undefined,
          rawJson: parsed,
        };
      }
    } catch (_) {
      // 3. Extract embedded JSON object {...} via regex if direct parse fails
      const jsonMatch = targetText.match(/\{[\s\S]*\}/) || cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          let parsed = JSON.parse(jsonMatch[0]);
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch (_) {}
          }
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const messageText = this.sanitizeMessageText(parsed.message || rawText);
            this.logLlmStatus({
              status: 200,
              latency: latencyMs,
              error: 'none',
              parser: 'success',
            });
            return {
              message: messageText,
              actions: Array.isArray(parsed.actions) ? parsed.actions : [],
              explanation: typeof parsed.explanation === 'object' && parsed.explanation !== null ? parsed.explanation : undefined,
              headline: typeof parsed.headline === 'string' ? parsed.headline.trim() : undefined,
              keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.filter((k: any) => typeof k === 'string').map((k: string) => k.trim()) : undefined,
              disclaimer: typeof parsed.disclaimer === 'string' ? parsed.disclaimer.trim() : undefined,
              rawJson: parsed,
            };
          }
        } catch (_) {}
      }
    }

    // 4. Plain text fallback if raw text is clean conversational text without raw JSON delimiters
    const sanitizedText = this.sanitizeMessageText(cleaned);
    if (sanitizedText && sanitizedText.length > 0 && !sanitizedText.includes('{') && !sanitizedText.includes('```')) {
      this.logLlmStatus({
        status: 200,
        latency: latencyMs,
        error: 'none',
        parser: 'success',
      });
      return {
        message: sanitizedText,
        actions: [],
      };
    }

    // 5. Parsing failed completely: surface an explicit error instead of canned text
    this.logLlmStatus({
      status: 200,
      latency: latencyMs,
      error: 'Malformed JSON or invalid response structure',
      parser: 'failure',
    });
    throw new AiResponseInvalidError();
  }
}
