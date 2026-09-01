import { config } from '../../../config';
import { JYOTI_SYSTEM_PROMPT } from '../prompts/jyoti.prompt';
import { LLMProvider, LLMProviderOptions, LLMResponse } from './llm.provider';
import { logger } from '../../../utils/logger';

export class GeminiProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? config.GEMINI_API_KEY ?? '';
    this.model = model ?? config.GEMINI_MODEL ?? 'gemini-3.6-flash';
  }

  public async generateResponse(prompt: string, options?: LLMProviderOptions): Promise<LLMResponse> {
    const isApiKeyConfigured = Boolean(this.apiKey && this.apiKey.trim().length > 0 && this.apiKey !== 'mock-key-dev');

    if (!isApiKeyConfigured) {
      logger.warn('[GeminiProvider] GEMINI_API_KEY is not configured or is set to mock.');
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemPrompt = options?.systemInstruction || JYOTI_SYSTEM_PROMPT;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: options?.temperature ?? 0.3,
          maxOutputTokens: options?.maxOutputTokens ?? 1000,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const rawErr = await response.text();
        const redactedErr = this.apiKey ? rawErr.replaceAll(this.apiKey, '[REDACTED]') : rawErr;
        logger.error({ status: response.status, err: redactedErr }, '[GeminiProvider] Gemini API error response');
        throw new Error(`Gemini API error ${response.status}: ${redactedErr}`);
      }

      const json: any = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        logger.warn('[GeminiProvider] Empty response candidate received from Gemini');
        throw new Error('Empty response candidate from Gemini');
      }

      return this.parseJsonResponse(rawText);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const redactedMsg = this.apiKey ? errMsg.replaceAll(this.apiKey, '[REDACTED]') : errMsg;
      logger.error({ err: redactedMsg }, '[GeminiProvider] Exception during Gemini response generation');
      throw new Error(redactedMsg);
    }
  }

  private sanitizeMessageText(input: any): string {
    if (typeof input !== 'string') {
      return "I'm having a little trouble understanding that response right now. Please try again.";
    }

    let text = input.trim();

    // If message itself is a stringified JSON object, unwrap inner message property
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const nested = JSON.parse(text);
        if (nested && typeof nested.message === 'string') {
          text = nested.message.trim();
        }
      } catch (_) {}
    }

    // Strip wrapping quotation marks if present
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      text = text.substring(1, text.length - 1).trim();
    }

    // Un-escape literal '\n' sequences to actual newline characters
    text = text.replace(/\\n/g, '\n');

    // Strip accidental leading 'message:' label
    if (text.toLowerCase().startsWith('message:')) {
      text = text.substring(8).trim();
    }

    return text;
  }

  private parseJsonResponse(rawText: string): LLMResponse {
    if (!rawText || !rawText.trim()) {
      return {
        message: "I'm having a little trouble understanding that response right now. Please try again.",
      };
    }

    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    // 1. Direct JSON parsing attempt
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object') {
        const messageText = this.sanitizeMessageText(parsed.message || rawText);
        return {
          message: messageText,
          actions: Array.isArray(parsed.actions) ? parsed.actions : undefined,
          explanation: typeof parsed.explanation === 'object' && parsed.explanation !== null ? parsed.explanation : undefined,
        };
      }
    } catch (_) {
      // 2. Extract embedded JSON object {...} via regex if direct parse fails
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed && typeof parsed === 'object') {
            const messageText = this.sanitizeMessageText(parsed.message || rawText);
            return {
              message: messageText,
              actions: Array.isArray(parsed.actions) ? parsed.actions : undefined,
              explanation: typeof parsed.explanation === 'object' && parsed.explanation !== null ? parsed.explanation : undefined,
            };
          }
        } catch (_) {}
      }
    }

    // 3. Fallback: If Gemini responded in plain text, sanitize and return text directly
    const sanitizedText = this.sanitizeMessageText(cleaned);
    if (sanitizedText && sanitizedText.length > 0) {
      return {
        message: sanitizedText,
      };
    }

    return {
      message: "I'm having a little trouble understanding that response right now. Please try again.",
    };
  }
}
