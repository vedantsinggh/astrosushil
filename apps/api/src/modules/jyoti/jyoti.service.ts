import { config } from '../../config';
import { AppError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { prisma } from '../../services/prisma.service';
import { ActionRegistry } from './actions/action.registry';
import { AstrologyContextBuilder } from './context/astrology-context.builder';
import { JyotiChatRequestDto, JyotiExplainRequestDto, SushilExplanationPayload } from './jyoti.schemas';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { LLMProvider, LLMResponse } from './providers/llm.provider';
import { SUSHIL_EXPLAINER_SYSTEM_PROMPT } from './prompts/sushil-explainer.prompt';

export class JyotiService {
  private readonly llmProvider: LLMProvider;

  // Simple in-memory rate limiter per user ID
  private readonly rateLimits = new Map<string, { count: number; resetAt: number }>();

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

    // 3. Assemble history into prompt string
    const historyText = payload.conversation && payload.conversation.length > 0
      ? payload.conversation
          .slice(-6)
          .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
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
      rawResponse = await this.llmProvider.generateResponse(fullPrompt);
    } catch (err: any) {
      const apiKey = config.OPENROUTER_API_KEY || '';
      const sanitizedErr = apiKey ? (err?.message || String(err)).replaceAll(apiKey, '[REDACTED]') : (err?.message || String(err));
      logger.error({ err: sanitizedErr }, '[JyotiService] Exception invoking LLM Provider. Returning controlled fallback response.');
      rawResponse = {
        message: "Jyoti is currently experiencing connection difficulty. Please try asking again in a moment.",
        actions: [],
      };
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

    // 4. Assemble prompt context
    const profileText = userProfileContext && Object.keys(userProfileContext).length > 0
      ? `USER PROFILE CONTEXT:\n${JSON.stringify(userProfileContext, null, 2)}`
      : 'USER PROFILE CONTEXT: Default Profile';

    const highlightsText = importantValues && Object.keys(importantValues).length > 0
      ? `KEY VALUES & HIGHLIGHTS:\n${JSON.stringify(importantValues, null, 2)}`
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
${JSON.stringify(astrologyData, null, 2)}

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
        maxOutputTokens: 1000,
      });
    } catch (err: any) {
      const apiKey = config.OPENROUTER_API_KEY || '';
      const sanitizedErr = apiKey ? (err?.message || String(err)).replaceAll(apiKey, '[REDACTED]') : (err?.message || String(err));
      logger.error({ err: sanitizedErr }, '[JyotiService] Exception invoking LLM Provider for explainer. Returning controlled fallback response.');
      if (language === 'hi') {
        return {
          headline: `${screenTitle} विश्लेषण`,
          message: "अस्थायी कनेक्शन विलंब के कारण सुशील सर अभी पूरा विवरण नहीं समझा सके। आपका चार्ट डेटा आपकी स्क्रीन पर सुरक्षित है।",
          keyPoints: [
            "आपकी कुंडली गणना पूरी तरह सुरक्षित है।",
            "विस्तृत व्याख्या के लिए कृपया कुछ क्षणों में पुनः प्रयास करें।",
          ],
          disclaimer: "एआई सुशील सर व्याख्या।",
          mode,
          language,
        };
      }
      return {
        headline: `${screenTitle} Insights`,
        message: "Sushil Sir couldn't complete the full explanation right now due to a temporary connection delay. Your chart data remains safely calculated on your screen.",
        keyPoints: [
          "Your chart placements are calculated deterministically.",
          "Please tap 'Try Again' in a moment for a full breakdown.",
        ],
        disclaimer: "AI Sushil Sir interpretation.",
        mode,
        language,
      };
    }

    // 6. Structure and validate response
    const headline = rawResponse.headline || `${screenTitle} Breakdown`;
    let message = rawResponse.message;

    if (message.includes("I'm having a little trouble understanding") && rawResponse.rawJson?.message) {
      message = String(rawResponse.rawJson.message);
    }

    const keyPoints = Array.isArray(rawResponse.keyPoints) && rawResponse.keyPoints.length > 0
      ? rawResponse.keyPoints
      : [
          language === 'hi' ? "आपकी गणना की गई वैदिक कुंडली पर आधारित।" : "Placements reflect your calculated Vedic chart.",
          language === 'hi' ? "इस स्क्रीन पर मुख्य ग्रहों के प्रभाव को समझें।" : "Review the core planetary influences on this screen.",
        ];

    return {
      headline,
      message,
      keyPoints,
      disclaimer: rawResponse.disclaimer || (language === 'hi' ? "गणना किए गए कुंडली डेटा पर आधारित एआई सुशील सर व्याख्या।" : "AI Sushil Sir interpretation based on calculated chart data."),
      mode,
      language,
    };
  }
}

export const jyotiService = new JyotiService();
