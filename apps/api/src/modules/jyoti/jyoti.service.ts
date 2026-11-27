import crypto from 'node:crypto';
import { config } from '../../config';
import { AppError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { prisma } from '../../services/prisma.service';
import { ActionRegistry } from './actions/action.registry';
import { AstrologyContextBuilder } from './context/astrology-context.builder';
import { JyotiChatRequestDto, JyotiExplainRequestDto, SushilExplanationPayload } from './jyoti.schemas';
import { OpenRouterProvider, AiServiceUnavailableError, AiResponseInvalidError } from './providers/openrouter.provider';
import { LLMProvider, LLMResponse } from './providers/llm.provider';
import { SUSHIL_EXPLAINER_SYSTEM_PROMPT } from './prompts/sushil-explainer.prompt';

const JYOTI_CHAT_MAX_TOKENS = 1500;
const EXPLAINER_MAX_TOKENS = 2000;
const EXPLAINER_CACHE_TTL_MS = 15 * 60 * 1000;
const EXPLAINER_CACHE_MAX_ENTRIES = 500;
export const JYOTI_UNAVAILABLE_MESSAGE = 'Jyoti is unavailable right now. Please try again in a moment.';
export const SUSHIL_UNAVAILABLE_MESSAGE = 'Sushil Sir is unavailable right now. Please try again in a moment.';

function redactLlmError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const apiKey = config.OPENROUTER_API_KEY || '';
  return apiKey ? raw.replaceAll(apiKey, '[REDACTED]') : raw;
}

/**
 * Maps any provider failure to a friendly, feature-specific error while keeping the
 * machine-readable code/status (AI_SERVICE_UNAVAILABLE 503, AI_RESPONSE_INVALID 502).
 */
function toUserFacingAiError(err: unknown, message: string): AppError {
  if (err instanceof AiResponseInvalidError) return new AiResponseInvalidError(message);
  if (err instanceof AppError && err.code !== 'AI_SERVICE_UNAVAILABLE') return err;
  return new AiServiceUnavailableError(message);
}

const PERSONAL_KEYS = new Set(['id', 'name', 'fullname', 'firstname', 'lastname', 'email', 'phone', 'phonenumber', 'mobile', 'address', 'userid']);

function redactProfileContext(ctx: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!ctx) return ctx;
  return Object.fromEntries(Object.entries(ctx).filter(([key]) => !PERSONAL_KEYS.has(key.toLowerCase())));
}

export class JyotiService {
  private readonly llmProvider: LLMProvider;

  // Simple in-memory rate limiter per user ID
  private readonly rateLimits = new Map<string, { count: number; resetAt: number }>();
  private readonly explainerCache = new Map<string, { value: SushilExplanationPayload; expiresAt: number }>();

  constructor(llmProvider?: LLMProvider) {
    this.llmProvider = llmProvider || new OpenRouterProvider();
  }

  /**
   * Enforces backend rate limiting for Jyoti AI queries.
   */
  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxPerMinute = config.JYOTI_RATE_LIMIT_PER_MINUTE || 20;

    const current = this.rateLimits.get(userId);

    if (!current || now > current.resetAt) {
      this.rateLimits.set(userId, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (current.count >= maxPerMinute) {
      throw new AppError(
        'Jyoti rate limit exceeded. Please wait a moment before sending another message.',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    current.count += 1;
  }

  /**
   * Process incoming chat request from an authenticated user.
   */
  public async processChat(
    userId: string,
    payload: JyotiChatRequestDto
  ): Promise<LLMResponse> {
    // 1. Rate limit check
    this.checkRateLimit(userId);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[JYOTI DEBUG] request received');
      console.log(`[JYOTI DEBUG] currentScreen = ${payload.context?.currentScreen || 'NONE'}`);
      console.log(`[JYOTI DEBUG] conversationMessages count = ${payload.conversation?.length || 0}`);
    }

    // 2. Build astrology & screen context
    const astrologyContext = await AstrologyContextBuilder.buildContext({
      userId,
      birthProfileId: payload.context?.birthProfileId,
      currentScreen: payload.context?.currentScreen,
    });

    // 3. Assemble history into prompt string (bounded to save tokens)
    const historyText = payload.conversation && payload.conversation.length > 0
      ? payload.conversation
          .slice(-4)
          .map((msg) => `${msg.role.toUpperCase()}: ${msg.content.slice(0, 500)}`)
          .join('\n')
      : 'No previous conversation.';

    const fullPrompt = `
${astrologyContext}

RECENT CONVERSATION HISTORY:
${historyText}

USER QUESTION:
${payload.message}
`.trim();

    // 4. Invoke LLM Provider with error protection
    let rawResponse: LLMResponse;
    try {
      rawResponse = await this.llmProvider.generateResponse(fullPrompt, {
        maxOutputTokens: JYOTI_CHAT_MAX_TOKENS,
      });
    } catch (err: any) {
      logger.error({ err: redactLlmError(err) }, '[JyotiService] Exception invoking LLM Provider.');
      throw toUserFacingAiError(err, JYOTI_UNAVAILABLE_MESSAGE);
    }

    if (!rawResponse?.message || !rawResponse.message.trim()) {
      throw new AiResponseInvalidError(JYOTI_UNAVAILABLE_MESSAGE);
    }

    // 5. Validate & sanitize action allowlist
    const validatedActions = ActionRegistry.validateActions(rawResponse.actions);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[JYOTI DEBUG] actions validated: ${validatedActions.map((a) => a.type).join(', ') || 'none'}`);
    }

    return {
      message: rawResponse.message,
      actions: validatedActions,
      explanation: rawResponse.explanation,
    };
  }

  /**
   * Process one-shot contextual explanation for a screen with deterministic astrology data.
   */
  public async processExplain(
    userId: string,
    payload: JyotiExplainRequestDto
  ): Promise<SushilExplanationPayload> {
    // 1. Rate limit check
    this.checkRateLimit(userId);

    const { feature, screenTitle, purpose, context } = payload;
    const { astrologyData, importantValues, availableSections, userProfileContext } = context;
    const mode = payload.mode || 'standard';
    const language = payload.language || 'en';

    // 2. Profile ownership check (IDOR protection)
    const profileId = payload.birthProfileId || (userProfileContext?.id as string | undefined);
    if (profileId) {
      const profile = await prisma.birthProfile.findUnique({
        where: { id: profileId },
      });
      if (profile && profile.userId !== userId) {
        throw new AppError(
          'Unauthorized: You do not own this birth profile.',
          403,
          'FORBIDDEN'
        );
      }
    }

    // 3. Check if astrologyData is empty or missing
    const hasData = astrologyData && Object.keys(astrologyData).length > 0;
    if (!hasData) {
      if (language === 'hi') {
        return {
          headline: `${screenTitle} - कोई कुंडली डेटा नहीं`,
          message: "इस स्क्रीन पर अभी पर्याप्त ज्योतिषीय जानकारी उपलब्ध नहीं है। कृपया पहले अपनी जन्म कुंडली चुनें या गणना करें।",
          keyPoints: [
            "कोई सक्रिय ग्रह या कुंडली डेटा प्राप्त नहीं हुआ।",
            "सुनिश्चित करें कि जन्म विवरण (तिथि, समय, स्थान) चुना गया है।",
            "डेटा लोड होते ही सुशील सर इसका विश्लेषण समझाएंगे।"
          ],
          disclaimer: "गणना किए गए कुंडली डेटा पर आधारित एआई सुशील सर व्याख्या।",
          mode,
          language,
        };
      }
      return {
        headline: `${screenTitle} - No Chart Data`,
        message: "There isn't enough astrological information available on this screen yet to provide an explanation. Please select or calculate a birth profile first.",
        keyPoints: [
          "No active planetary or chart data was detected.",
          "Ensure birth details (date, time, location) are selected.",
          "Once loaded, Sushil Sir can break down your placements."
        ],
        disclaimer: "AI Sushil Sir interpretation based on calculated chart data.",
        mode,
        language,
      };
    }

    // 4. Assemble prompt context (compact JSON to minimize input tokens)
    // Strip personal identifiers before anything is sent to the third-party LLM (docs/jyoti.md).
    const safeProfileContext = redactProfileContext(userProfileContext);
    const cacheKey = crypto
      .createHash('sha256')
      .update(JSON.stringify({ feature, screenTitle, mode, language, safeProfileContext, importantValues, astrologyData }))
      .digest('hex');
    const cached = this.explainerCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const profileText = safeProfileContext && Object.keys(safeProfileContext).length > 0
      ? `USER PROFILE CONTEXT:\n${JSON.stringify(safeProfileContext)}`
      : 'USER PROFILE CONTEXT: Default Profile';

    const highlightsText = importantValues && Object.keys(importantValues).length > 0
      ? `KEY VALUES & HIGHLIGHTS:\n${JSON.stringify(importantValues)}`
      : 'KEY VALUES & HIGHLIGHTS: Standard chart view';

    const prompt = `
SCREEN TITLE: ${screenTitle}
FEATURE IDENTIFIER: ${feature}
EXPLANATION MODE: ${mode}
LANGUAGE: ${language}
PURPOSE: ${purpose || `Explain what the user is currently seeing on the ${screenTitle} screen`}
AVAILABLE SECTIONS: ${availableSections ? availableSections.join(', ') : 'All screen sections'}

${profileText}

${highlightsText}

ASTROLOGY DATA (Deterministic Calculation Engine Output):
${JSON.stringify(astrologyData)}

INSTRUCTION:
Explain this screen and its astrology data clearly and simply as AI Sushil Sir.
Mode: ${mode}
Language: ${language}
Follow the formula: TERM -> SIMPLE MEANING -> WHY IT MATTERS.
Return valid JSON with headline, message, keyPoints, and disclaimer.
`.trim();

    // 5. Call LLM provider with Sushil Explainer system instruction
    let rawResponse: LLMResponse;
    try {
      rawResponse = await this.llmProvider.generateResponse(prompt, {
        systemInstruction: SUSHIL_EXPLAINER_SYSTEM_PROMPT,
        temperature: 0.25,
        // Hindi (Devanagari) output and reasoning models both need a generous token budget;
        // 1000 tokens was fully consumed by hidden reasoning, leaving an empty answer.
        maxOutputTokens: EXPLAINER_MAX_TOKENS,
      });
    } catch (err: any) {
      logger.error({ err: redactLlmError(err) }, '[JyotiService] Exception invoking LLM Provider for explainer.');
      throw toUserFacingAiError(err, SUSHIL_UNAVAILABLE_MESSAGE);
    }

    // 6. Structure and validate response
    const headline = rawResponse.headline || `${screenTitle} Breakdown`;
    const message = rawResponse?.message;
    if (!message || !message.trim()) {
      throw new AiResponseInvalidError(SUSHIL_UNAVAILABLE_MESSAGE);
    }

    // Only genuine model-produced key points are returned; no generic filler is injected.
    const keyPoints = Array.isArray(rawResponse.keyPoints) ? rawResponse.keyPoints : [];

    const result: SushilExplanationPayload = {
      headline,
      message,
      keyPoints,
      disclaimer: rawResponse.disclaimer || (language === 'hi' ? "गणना किए गए कुंडली डेटा पर आधारित एआई सुशील सर व्याख्या।" : "AI Sushil Sir interpretation based on calculated chart data."),
      mode,
      language,
    };
    if (this.explainerCache.size >= EXPLAINER_CACHE_MAX_ENTRIES) {
      const oldestKey = this.explainerCache.keys().next().value;
      if (oldestKey) this.explainerCache.delete(oldestKey);
    }
    this.explainerCache.set(cacheKey, { value: result, expiresAt: Date.now() + EXPLAINER_CACHE_TTL_MS });
    return result;
  }
}

export const jyotiService = new JyotiService();
