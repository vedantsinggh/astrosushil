import { config } from '../../../config';
import { JYOTI_SYSTEM_PROMPT } from '../prompts/jyoti.prompt';
import { LLMProvider, LLMProviderOptions, LLMResponse } from './llm.provider';
import { logger } from '../../../utils/logger';

export class OpenRouterProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly siteUrl: string;
  private readonly siteName: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || config.OPENROUTER_API_KEY || '';
    this.model = model || process.env.OPENROUTER_MODEL || config.OPENROUTER_MODEL || 'minimax/minimax-m3:free';
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
      return {
        message: "Jyoti AI Assistant is currently unconfigured. Please set OPENROUTER_API_KEY in your environment.",
        actions: [],
      };
    }

    const systemPrompt = options?.systemInstruction || JYOTI_SYSTEM_PROMPT;
    const maxRetries = 2;
    let attempt = 0;
    let lastError: Error | null = null;
    let lastStatus = 0;
    let lastLatency = 0;

    while (attempt <= maxRetries) {
      attempt++;
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      try {
        const url = 'https://openrouter.ai/api/v1/chat/completions';
        const requestHeaders: Record<string, string> = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.siteUrl,
          'X-OpenRouter-Title': this.siteName,
        };

        const fallbackList = (process.env.OPENROUTER_FALLBACK_MODELS || '')
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean);

        const candidateModels = Array.from(
          new Set([
            this.model,
            ...fallbackList,
            'nvidia/nemotron-3.5-lightning:free',
            'qwen/qwen3.8-27b:free',
          ])
        ).slice(0, 3);

        const requestBody = {
          model: this.model,
          models: candidateModels,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxOutputTokens ?? 1000,
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        lastLatency = latency;
        lastStatus = response.status;

        if (!response.ok) {
          const rawErr = await response.text();
          const redactedErr = this.apiKey ? rawErr.replaceAll(this.apiKey, '[REDACTED]') : rawErr;

          if (response.status === 401 || response.status === 403) {
            this.logLlmStatus({
              status: response.status,
              latency,
              error: `Authentication Error (${response.status}): ${redactedErr}`,
              parser: 'failure',
            });
            throw new Error(`OpenRouter Authentication Error (${response.status}): ${redactedErr}`);
          }

          if ((response.status === 429 || response.status >= 500) && attempt <= maxRetries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            logger.warn(
              { status: response.status, attempt, backoffMs },
              '[OpenRouterProvider] Transient error encountered. Retrying with backoff...'
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          this.logLlmStatus({
            status: response.status,
            latency,
            error: `API error ${response.status}: ${redactedErr}`,
            parser: 'failure',
          });
          throw new Error(`OpenRouter API error ${response.status}: ${redactedErr}`);
        }

        const json: any = await response.json();
        const rawText = json?.choices?.[0]?.message?.content;

        if (!rawText || !rawText.trim()) {
          this.logLlmStatus({
            status: 200,
            latency,
            error: 'Empty response content from OpenRouter',
            parser: 'failure',
          });
          return {
            message: "I'm having a little trouble understanding that response right now. Please try again.",
            actions: [],
          };
        }

        return this.parseJsonResponse(rawText, latency);
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastLatency = Date.now() - startTime;
        lastError = err instanceof Error ? err : new Error(String(err));

        if (err.name === 'AbortError') {
          lastStatus = 408;
          lastError = new Error('OpenRouter API request timed out after 45000ms');
        }

        const sanitizedMsg = this.apiKey ? lastError.message.replaceAll(this.apiKey, '[REDACTED]') : lastError.message;

        if (lastError.message.includes('Authentication Error') || attempt > maxRetries || err.name === 'AbortError') {
          this.logLlmStatus({
            status: lastStatus || 500,
            latency: lastLatency,
            error: sanitizedMsg,
            parser: 'failure',
          });
          break;
        }

        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logger.warn({ attempt, backoffMs, err: sanitizedMsg }, '[OpenRouterProvider] Exception occurred. Retrying...');
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    const redactedMsg = this.apiKey ? lastError?.message.replaceAll(this.apiKey, '[REDACTED]') : lastError?.message;
    logger.error({ err: redactedMsg, status: lastStatus, latency: lastLatency }, '[OpenRouterProvider] Retries exhausted or API error encountered.');
    return {
      message: "Jyoti is experiencing temporary connection difficulty. Please try asking your question again in a moment.",
      actions: [],
    };
  }

  private sanitizeMessageText(input: any): string {
    if (typeof input !== 'string') {
      return "I'm having a little trouble understanding that response right now. Please try again.";
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
      return {
        message: "I'm having a little trouble understanding that response right now. Please try again.",
        actions: [],
      };
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
        const messageText = this.sanitizeMessageText(parsed.message || (typeof targetText === 'string' ? targetText : rawText));
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
            };
          }
        } catch (_) {}
      }
    }

    // 4. Plain text fallback if raw text is clean conversational text without raw JSON delimiters
    const sanitizedText = this.sanitizeMessageText(cleaned);
    if (sanitizedText && sanitizedText.length > 0 && !sanitizedText.startsWith('{') && !sanitizedText.includes('```')) {
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

    // 5. Controlled fallback if parsing fails completely
    this.logLlmStatus({
      status: 200,
      latency: latencyMs,
      error: 'Malformed JSON or invalid response structure',
      parser: 'failure',
    });
    return {
      message: "I'm having a little trouble understanding that response right now. Please try again.",
      actions: [],
    };
  }
}
