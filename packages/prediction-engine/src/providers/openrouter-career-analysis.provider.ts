import { getOpenRouterCareerConfig, OpenRouterCareerConfig } from '../config/openrouter-career.config';
import { CAREER_ANALYST_SYSTEM_PROMPT } from '../prompts/career-analyst.prompt';
import { CareerAnalysis, CareerAnalysisInput, CareerAnalysisProvider } from '../types/evidence.types';
import { careerAnalysisValidator } from '../validation/career-analysis.validator';
import { MockCareerAnalysisProvider } from './mock-career-analysis.provider';

export class OpenRouterCareerAnalysisProvider implements CareerAnalysisProvider {
  private readonly config: OpenRouterCareerConfig;
  private readonly siteUrl: string;
  private readonly siteName: string;

  constructor(customConfig?: Partial<OpenRouterCareerConfig>) {
    this.config = {
      ...getOpenRouterCareerConfig(),
      ...customConfig,
    };
    this.siteUrl = process.env.OPENROUTER_SITE_URL || 'https://astrosushil.com';
    this.siteName = process.env.OPENROUTER_SITE_NAME || 'Astro Sushil';
  }

  public async analyze(input: CareerAnalysisInput): Promise<CareerAnalysis> {
    const analysisExecutionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isApiKeyValid = Boolean(
      this.config.apiKey &&
        this.config.apiKey.trim().length > 0 &&
        this.config.apiKey !== 'mock-key-dev'
    );

    if (!isApiKeyValid) {
      console.warn('[OpenRouterCareerAnalysisProvider] OPENROUTER_API_KEY not set. Using MockCareerAnalysisProvider.');
      return new MockCareerAnalysisProvider().analyze(input);
    }

    console.log('[CAREER_ANALYSIS_INPUT_CREATED]', {
      analysisExecutionId,
      provider: 'openrouter',
      model: this.config.model,
      fallbackModels: this.config.fallbackModels,
      careerAxis: `${input.careerAxis.ascendantSign} Lagna, 10th House ${input.careerAxis.houseTenSign}`,
      timingStatus: input.timingEvidence.status,
      planetaryEvidenceCount: input.planetaryEvidence.length,
      houseEvidenceCount: input.houseEvidence.length,
    });

    let attempt = 0;
    let lastError: Error | null = null;
    let correctionPrompt: string | null = null;

    while (attempt < this.config.maxRetries) {
      attempt++;
      console.log(`[OpenRouterCareerAnalysisProvider] Starting Request Attempt ${attempt} of ${this.config.maxRetries} (ExecutionId: ${analysisExecutionId})`);
      try {
        const { rawJsonText, finishReason, completionTokens, reasoningTokens, httpStatus, actualModel } = await this.callOpenRouterApi(
          input,
          correctionPrompt,
          analysisExecutionId,
          attempt
        );

        if (finishReason === 'length') {
          console.warn(`[CAREER_ANALYSIS] Output truncated (finishReason=length). Attempt ${attempt} of ${this.config.maxRetries}.`);
          if (attempt < this.config.maxRetries) {
            correctionPrompt = 'Your previous output was truncated because it exceeded max token limits. Please be more concise (40-60 words per field) and output strictly valid compact JSON without extra explanations.';
            continue;
          }
          const truncErr = new Error(
            `INCOMPLETE_MODEL_OUTPUT: Completion output truncated because finishReason=length (requested max_tokens=${this.config.maxOutputTokens}, completionTokens=${completionTokens}).`
          );
          console.error(`[CAREER_ANALYSIS] reportId=${input.reportId || 'N/A'} executionId=${analysisExecutionId} attempt=${attempt} requestedModel=${this.config.model} actualModel=${actualModel} httpStatus=${httpStatus} finishReason=${finishReason} requestedMaxTokens=${this.config.maxOutputTokens} completionTokens=${completionTokens} reasoningTokens=${reasoningTokens} responseFormatUsed=json_object contentPresent=true contentLength=${rawJsonText.length} jsonParseSucceeded=false schemaValidationSucceeded=false parseStatus=TRUNCATED_LENGTH_ERROR`);
          throw truncErr;
        }

        const parsed = this.parseJsonContent(rawJsonText, analysisExecutionId, attempt);
        const validation = careerAnalysisValidator.validate(parsed, input);

        if (validation.isValid && validation.sanitizedAnalysis) {
          const a = validation.sanitizedAnalysis;
          console.log(`[CAREER_ANALYSIS] reportId=${input.reportId || 'N/A'} executionId=${analysisExecutionId} attempt=${attempt} requestedModel=${this.config.model} actualModel=${actualModel} httpStatus=${httpStatus} finishReason=${finishReason} requestedMaxTokens=${this.config.maxOutputTokens} completionTokens=${completionTokens} reasoningTokens=${reasoningTokens} responseFormatUsed=json_object contentPresent=true contentLength=${rawJsonText.length} jsonParseSucceeded=true schemaValidationSucceeded=true parseStatus=SUCCESS_VALIDATED`);
          return a;
        }

        const validationErr = `Validation failed: ${validation.errors.join('; ')}`;
        console.warn(`[CAREER_ANALYSIS] reportId=${input.reportId || 'N/A'} executionId=${analysisExecutionId} attempt=${attempt} requestedModel=${this.config.model} actualModel=${actualModel} httpStatus=${httpStatus} finishReason=${finishReason} requestedMaxTokens=${this.config.maxOutputTokens} completionTokens=${completionTokens} reasoningTokens=${reasoningTokens} responseFormatUsed=json_object contentPresent=true contentLength=${rawJsonText.length} jsonParseSucceeded=true schemaValidationSucceeded=false parseStatus=SCHEMA_VALIDATION_ERROR`);

        if (attempt < this.config.maxRetries) {
          correctionPrompt = `Your previous JSON response had validation errors: ${validationErr}. Please fix these errors and return valid JSON adhering strictly to the schema.`;
        } else {
          throw new Error(`INVALID_MODEL_OUTPUT: ${validationErr}`);
        }
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const isTransient = this.isTransientError(lastError);

        console.error(
          `[OpenRouterCareerAnalysisProvider] Attempt ${attempt} error (ExecutionId: ${analysisExecutionId}, transient: ${isTransient}):`,
          lastError.message
        );

        if (!isTransient) {
          console.warn(
            `[OpenRouterCareerAnalysisProvider] Non-transient error detected (${lastError.message.substring(0, 120)}). Aborting retries.`
          );
          break;
        }

        if (attempt < this.config.maxRetries) {
          const is429 = lastError.message.includes('429');
          const backoffMs = is429
            ? Math.min(2000 * Math.pow(2, attempt - 1), 10000)
            : Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(
            `[OpenRouterCareerAnalysisProvider] Transient error on attempt ${attempt}. Backing off ${backoffMs}ms before retry... (ExecutionId: ${analysisExecutionId})`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    const allowMockFallback =
      process.env.ALLOW_MOCK_FALLBACK === 'true' ||
      process.env.NODE_ENV !== 'production' ||
      process.env.LLM_PROVIDER === 'mock';

    if (allowMockFallback) {
      console.warn(`[OpenRouterCareerAnalysisProvider] Retries exhausted or length error encountered. Falling back to deterministic MockCareerAnalysisProvider.`);
      return new MockCareerAnalysisProvider().analyze(input);
    }

    throw new Error(
      `OPENROUTER_ANALYSIS_FAILED: OpenRouter AI analysis failed after ${attempt} total attempt(s) (${lastError?.message || 'unknown error'}).`
    );
  }

  private isTransientError(err: Error): boolean {
    const msg = err.message || '';
    if (err.name === 'AbortError' || msg.includes('timed out')) return true;
    if (msg.includes('fetch failed') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) return true;
    if (msg.includes('INCOMPLETE_MODEL_OUTPUT') || msg.includes('finishReason=length') || msg.includes('truncated')) return true;
    
    const statusMatch = msg.match(/HTTP Error (\d{3})/i);
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10);
      return [429, 500, 502, 503, 504].includes(statusCode);
    }
    return false;
  }

  private async callOpenRouterApi(
    input: CareerAnalysisInput,
    correctionMessage?: string | null,
    executionId?: string,
    attemptNumber?: number
  ): Promise<{
    rawJsonText: string;
    finishReason: string;
    completionTokens: number;
    reasoningTokens: number;
    httpStatus: number;
    actualModel: string;
  }> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    const userPrompt = `
Synthesize the following deterministic CareerAnalysisInput object into a structured CareerAnalysis JSON response.

CAREER ANALYSIS INPUT:
${JSON.stringify(input, null, 2)}

${correctionMessage ? `CORRECTION INSTRUCTIONS:\n${correctionMessage}` : ''}
`.trim();

    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.siteUrl,
      'X-OpenRouter-Title': this.siteName,
    };

    const requestBody: any = {
      model: this.config.model,
      models: this.config.fallbackModels.slice(0, 3),
      messages: [
        { role: 'system', content: CAREER_ANALYST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxOutputTokens,
      response_format: { type: 'json_object' },
    };

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        const redactedErr = this.config.apiKey ? errText.replaceAll(this.config.apiKey, '[REDACTED]') : errText;
        throw new Error(`OpenRouter API HTTP Error ${response.status}: ${redactedErr}`);
      }

      const json: any = await response.json();
      const firstChoice = json?.choices?.[0];
      const rawText = firstChoice?.message?.content;
      const usage = json?.usage;
      const finishReason = firstChoice?.finish_reason || 'unknown';
      const completionTokens = usage?.completion_tokens || 0;
      const reasoningTokens = usage?.reasoning_tokens || usage?.completion_tokens_details?.reasoning_tokens || 0;
      const actualModel = json?.model || this.config.model;
      const contentPresent = Boolean(rawText && rawText.trim().length > 0);
      const contentLength = rawText ? rawText.length : 0;

      console.log(`[OpenRouterCareerAnalysisProvider] Safe Response Metadata:`, {
        executionId,
        attempt: attemptNumber,
        requestedModel: this.config.model,
        actualModel,
        httpStatus: response.status,
        finishReason,
        requestedMaxTokens: this.config.maxOutputTokens,
        completionTokens,
        reasoningTokens,
        responseFormatUsed: 'json_object',
        contentPresent,
        contentLength,
        approxPromptLengthChars: CAREER_ANALYST_SYSTEM_PROMPT.length + userPrompt.length,
        hasChoices: Array.isArray(json?.choices) && json.choices.length > 0,
        hasMessage: Boolean(firstChoice?.message),
        latencyMs: latency,
      });

      if (!rawText || !rawText.trim()) {
        throw new Error(
          `OpenRouter API returned empty completion content (finishReason: ${finishReason}).`
        );
      }

      return {
        rawJsonText: rawText,
        finishReason,
        completionTokens,
        reasoningTokens,
        httpStatus: response.status,
        actualModel,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`OpenRouter API request timed out after ${this.config.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  private parseJsonContent(rawText: string, executionId?: string, attemptNumber?: number): any {
    let cleaned = rawText.trim();

    // 1. Remove markdown code fence blocks if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }

    // 2. Extract outermost JSON object if surrounded by explanatory commentary
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    // 3. First-pass standard parse
    try {
      let parsed = JSON.parse(cleaned);
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {}
      }
      return parsed;
    } catch (_e1) {
      // 4. Defensive repair pass: clean trailing commas & unescaped control characters
      try {
        const sanitized = cleaned
          // Remove trailing commas before closing braces/brackets
          .replace(/,\s*([\}\]])/g, '$1')
          // Escape raw unescaped newlines/tabs inside string literals or replace control characters
          .replace(/[\u0000-\u001F]/g, (char) => {
            if (char === '\n') return '\\n';
            if (char === '\r') return '\\r';
            if (char === '\t') return '\\t';
            return '';
          });

        let parsed = JSON.parse(sanitized);
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (_) {}
        }
        return parsed;
      } catch (_e2) {
        console.warn(
          `[OpenRouterCareerAnalysisProvider] JSON Parse Failure (ExecutionId: ${executionId}, Attempt: ${attemptNumber}). Output snippet:\nStart: "${cleaned.substring(0, 150)}"\nEnd: "${cleaned.substring(Math.max(0, cleaned.length - 150))}"`
        );
        throw new Error('INVALID_JSON_RESPONSE: Failed to parse response as JSON');
      }
    }
  }
}

// Backward compatibility alias
export const GeminiCareerAnalysisProvider = OpenRouterCareerAnalysisProvider;
