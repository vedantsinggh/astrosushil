import { config } from '../../config';
import { AppError } from '../../errors/app-error';
import { ActionRegistry } from './actions/action.registry';
import { AstrologyContextBuilder } from './context/astrology-context.builder';
import { JyotiChatRequestDto } from './jyoti.schemas';
import { GeminiProvider } from './providers/gemini.provider';
import { LLMProvider, LLMResponse } from './providers/llm.provider';

export class JyotiService {
  private readonly llmProvider: LLMProvider;

  // Simple in-memory rate limiter per user ID
  private readonly rateLimits = new Map<string, { count: number; resetAt: number }>();

  constructor(llmProvider?: LLMProvider) {
    this.llmProvider = llmProvider || new GeminiProvider();
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
    console.log('[JYOTI TRACE 4] Jyoti service entered');
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
    console.log('[JYOTI TRACE 5] Context built');

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

    // 4. Invoke LLM Provider
    const rawResponse = await this.llmProvider.generateResponse(fullPrompt);

    // 5. Validate & sanitize action allowlist
    const validatedActions = ActionRegistry.validateActions(rawResponse.actions);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[JYOTI DEBUG] actions validated: ${validatedActions.map((a) => a.type).join(', ') || 'none'}`);
    }

    return {
      message: rawResponse.message,
      actions: validatedActions.length > 0 ? validatedActions : undefined,
      explanation: rawResponse.explanation,
    };
  }
}

export const jyotiService = new JyotiService();
