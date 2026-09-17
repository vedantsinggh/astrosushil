import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionRegistry, AllowedJyotiAction } from '../../src/modules/jyoti/actions/action.registry';
import { OpenRouterProvider } from '../../src/modules/jyoti/providers/openrouter.provider';
import { JyotiService } from '../../src/modules/jyoti/jyoti.service';

describe('Jyoti AI Assistant & OpenRouter Provider Tests', () => {
  describe('ActionRegistry', () => {
    it('should validate allowed action types', () => {
      expect(ActionRegistry.isActionAllowed('OPEN_HOME')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_BIRTH_CHART')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_PLANETS')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_HOUSES')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_NAKSHATRA')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_RASHI_BHAVISHYA')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_VASTU')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_PROFILE')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_SETTINGS')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_REPORTS')).toBe(true);
      expect(ActionRegistry.isActionAllowed('GENERATE_CAREER_REPORT')).toBe(true);
      expect(ActionRegistry.isActionAllowed('CONFIRM_LOGOUT')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_LOGIN')).toBe(true);

      // Unauthorized actions
      expect(ActionRegistry.isActionAllowed('DELETE_DATABASE')).toBe(false);
      expect(ActionRegistry.isActionAllowed('EXECUTE_CODE')).toBe(false);
      expect(ActionRegistry.isActionAllowed('INVENTED_ACTION')).toBe(false);
    });

    it('should filter out unauthorized actions from action payloads', () => {
      const actions = [
        { type: 'OPEN_BIRTH_CHART', title: 'Birth Chart' },
        { type: 'GENERATE_CAREER_REPORT', title: 'Career Report' },
        { type: 'UNAUTHORIZED_ACTION', title: 'Hacked Action' },
      ];

      const validated = ActionRegistry.validateActions(actions);
      expect(validated.length).toBe(2);
      expect(validated[0].type).toBe('OPEN_BIRTH_CHART');
      expect(validated[1].type).toBe('GENERATE_CAREER_REPORT');
    });
  });

  describe('OpenRouterProvider JSON Parsing & Formatting', () => {
    const provider = new OpenRouterProvider('mock-key', 'minimax/minimax-m3:free');

    it('4. Should parse JSON inside markdown code fences', () => {
      const markdownJson = `\`\`\`json
{
  "message": "Here is your planetary summary.",
  "actions": [{"type": "OPEN_PLANETS", "title": "View Planets"}]
}
\`\`\``;
      const res = provider.parseJsonResponse(markdownJson);
      expect(res.message).toBe('Here is your planetary summary.');
      expect(res.actions?.[0].type).toBe('OPEN_PLANETS');
    });

    it('5. Should parse JSON surrounded by explanatory text', () => {
      const textSurrounded = `Sure, I can help with that!
{
  "message": "You are currently in Jupiter Dasha.",
  "actions": [{"type": "OPEN_BIRTH_CHART"}]
}
Hope this helps!`;
      const res = provider.parseJsonResponse(textSurrounded);
      expect(res.message).toBe('You are currently in Jupiter Dasha.');
      expect(res.actions?.[0].type).toBe('OPEN_BIRTH_CHART');
    });

    it('6. Should handle malformed model response gracefully without crashing', () => {
      const malformed = 'Not valid JSON { message: broken content';
      const res = provider.parseJsonResponse(malformed);
      expect(res).toBeDefined();
      expect(typeof res.message).toBe('string');
      expect(res.message).not.toContain('{');
      expect(res.message.length).toBeGreaterThan(0);
    });
  });

  describe('OpenRouterProvider API & Error Scenarios', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('7. Should handle OpenRouter 429 rate limit with retries and eventual controlled fallback', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      });
      vi.stubGlobal('fetch', fetchMock);

      const provider = new OpenRouterProvider('test-key', 'minimax/minimax-m3:free');
      const res = await provider.generateResponse('Hello');
      expect(res).toBeDefined();
      expect(res.message).toContain('connection difficulty');
      expect(res.actions).toEqual([]);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('8. Should handle OpenRouter timeout (AbortError) with controlled fallback', async () => {
      const fetchMock = vi.fn().mockImplementation(() => {
        const err: any = new Error('The operation was aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      });
      vi.stubGlobal('fetch', fetchMock);

      const provider = new OpenRouterProvider('test-key', 'minimax/minimax-m3:free');
      const res = await provider.generateResponse('Hello');
      expect(res).toBeDefined();
      expect(res.message).toContain('connection difficulty');
      expect(res.actions).toEqual([]);
    });

    it('9. Should return controlled fallback when API key is missing', async () => {
      const provider = new OpenRouterProvider('', 'minimax/minimax-m3:free');
      const res = await provider.generateResponse('Hello');
      expect(res).toBeDefined();
      expect(res.message).toContain('unconfigured');
      expect(res.actions).toEqual([]);
    });

    it('10. Should fail immediately on HTTP 401 Invalid API key and return controlled fallback', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Invalid API key'),
      });
      vi.stubGlobal('fetch', fetchMock);

      const provider = new OpenRouterProvider('invalid-key', 'minimax/minimax-m3:free');
      const res = await provider.generateResponse('Hello');
      expect(res).toBeDefined();
      expect(res.message).toContain('connection difficulty');
      expect(res.actions).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1); // Fails immediately, no retry loop
    });
  });

  describe('JyotiService End-to-End Chat Flow', () => {
    it('1. Normal question handling', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockResolvedValue({
          message: 'Hello! I am Jyoti, your Vedic astrology companion.',
        }),
      };

      const service = new JyotiService(mockLlmProvider);
      const result = await service.processChat('user-1', {
        message: 'Hello Jyoti',
      });

      expect(result.message).toBe('Hello! I am Jyoti, your Vedic astrology companion.');
      expect(result.actions).toEqual([]);
    });

    it('2. Astrology question using deterministic context', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockResolvedValue({
          message: 'Your Ascendant is Aries and Sun is in the 10th House.',
        }),
      };

      const service = new JyotiService(mockLlmProvider);
      const result = await service.processChat('user-1', {
        message: 'Tell me about my planetary positions',
        context: { currentScreen: 'OPEN_PLANETS' },
      });

      expect(mockLlmProvider.generateResponse).toHaveBeenCalled();
      const promptPassed = mockLlmProvider.generateResponse.mock.calls[0][0];
      expect(promptPassed).toContain('USER QUESTION');
      expect(result.message).toContain('Ascendant is Aries');
    });

    it('3. Navigation request handling with valid action payload', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockResolvedValue({
          message: 'Opening your birth chart now.',
          actions: [{ type: 'OPEN_BIRTH_CHART', title: 'Birth Chart' }],
        }),
      };

      const service = new JyotiService(mockLlmProvider);
      const result = await service.processChat('user-1', {
        message: 'Show my Kundli',
      });

      expect(result.message).toBe('Opening your birth chart now.');
      expect(result.actions?.length).toBe(1);
      expect(result.actions?.[0].type).toBe('OPEN_BIRTH_CHART');
    });

    it('4. Gracefully catches LLM provider failure and returns controlled application response', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockRejectedValue(new Error('OpenRouter API timeout')),
      };

      const service = new JyotiService(mockLlmProvider);
      const result = await service.processChat('user-1', {
        message: 'Explain 7th house dynamics',
      });

      expect(result).toBeDefined();
      expect(result.message).toContain('connection difficulty');
      expect(result.actions).toEqual([]);
    });

    it('Enforces rate limit per user ID', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockResolvedValue({
          message: 'Response',
        }),
      };

      const service = new JyotiService(mockLlmProvider);
      const userId = 'rate-limit-test-user';

      for (let i = 0; i < 20; i++) {
        await service.processChat(userId, { message: `Msg ${i}` });
      }

      await expect(
        service.processChat(userId, { message: '21st message' })
      ).rejects.toThrow(/rate limit/i);
    });
  });
});
