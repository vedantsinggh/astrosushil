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

    it('6. Should raise AI_RESPONSE_INVALID for malformed model output instead of canned text', () => {
      const malformed = 'Not valid JSON { message: broken content';
      expect(() => provider.parseJsonResponse(malformed)).toThrow(
        expect.objectContaining({ code: 'AI_RESPONSE_INVALID', statusCode: 502 })
      );
      expect(() => provider.parseJsonResponse('   ')).toThrow(
        expect.objectContaining({ code: 'AI_RESPONSE_INVALID' })
      );
    });

    it('7. Should parse Sushil Explainer structured JSON with headline and keyPoints', () => {
      const explainerJson = `\`\`\`json
{
  "headline": "Dynamic Career Drive and Emotional Focus",
  "message": "Your Moon in Capricorn in the 10th House indicates a practical approach to goals.\\n\\nSaturn strengthens your perseverance.",
  "keyPoints": [
    "Moon in 10th house brings disciplined work ethic.",
    "Mars in Aries provides leadership energy.",
    "Favorable time for structured career planning."
  ],
  "disclaimer": "AI Sushil Sir interpretation based on calculated chart data."
}
\`\`\``;
      const res = provider.parseJsonResponse(explainerJson);
      expect(res.headline).toBe('Dynamic Career Drive and Emotional Focus');
      expect(res.message).toContain('Moon in Capricorn');
      expect(res.keyPoints).toHaveLength(3);
      expect(res.keyPoints?.[0]).toContain('Moon in 10th house');
      expect(res.disclaimer).toContain('AI Sushil Sir');
    });
  });

  describe('OpenRouterProvider API & Error Scenarios', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('8. Should handle OpenRouter 429 rate limit with retries and then raise AI_SERVICE_UNAVAILABLE', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      });
      vi.stubGlobal('fetch', fetchMock);

      const provider = new OpenRouterProvider('test-key', 'minimax/minimax-m3:free');
      await expect(provider.generateResponse('Hello')).rejects.toMatchObject({ code: 'AI_SERVICE_UNAVAILABLE', statusCode: 503 });
      expect(fetchMock).toHaveBeenCalled();
    });

    it('9. Should raise AI_SERVICE_UNAVAILABLE on OpenRouter timeout (AbortError)', async () => {
      const fetchMock = vi.fn().mockImplementation(() => {
        const err: any = new Error('The operation was aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      });
      vi.stubGlobal('fetch', fetchMock);

      const provider = new OpenRouterProvider('test-key', 'minimax/minimax-m3:free');
      await expect(provider.generateResponse('Hello')).rejects.toMatchObject({ code: 'AI_SERVICE_UNAVAILABLE' });
    });

    it('10. Should raise AI_SERVICE_UNAVAILABLE when API key is missing', async () => {
      const provider = new OpenRouterProvider('', 'minimax/minimax-m3:free');
      await expect(provider.generateResponse('Hello')).rejects.toMatchObject({ code: 'AI_SERVICE_UNAVAILABLE', statusCode: 503 });
    });

    it('11. Should fail immediately on HTTP 401 Invalid API key and raise AI_SERVICE_UNAVAILABLE', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Invalid API key'),
      });
      vi.stubGlobal('fetch', fetchMock);

      const provider = new OpenRouterProvider('invalid-key', 'minimax/minimax-m3:free');
      await expect(provider.generateResponse('Hello')).rejects.toMatchObject({ code: 'AI_SERVICE_UNAVAILABLE' });
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

    it('4. Surfaces LLM provider failure as AI_SERVICE_UNAVAILABLE instead of canned chat text', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockRejectedValue(new Error('OpenRouter API timeout')),
      };

      const service = new JyotiService(mockLlmProvider);
      await expect(
        service.processChat('user-1', {
          message: 'Explain 7th house dynamics',
        })
      ).rejects.toMatchObject({ code: 'AI_SERVICE_UNAVAILABLE', statusCode: 503 });
    });

    it('5. Enforces rate limit per user ID', async () => {
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

  describe('JyotiService Sushil Explainer One-Shot Flow', () => {
    it('1. Successfully processes structured explanation context', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockResolvedValue({
          headline: 'Strong Leadership and Analytical Mind',
          message: 'Your Ascendant in Leo gives you natural confidence and warmth. The Sun in the 10th house enhances career success.',
          keyPoints: [
            'Leo Ascendant gives charisma and natural leadership.',
            'Sun in 10th House supports career achievements.',
            'Maintain patience in daily communications.'
          ],
          disclaimer: 'AI Sushil Sir interpretation based on calculated chart data.',
        }),
      };

      const service = new JyotiService(mockLlmProvider);
      const result = await service.processExplain('user-explainer-1', {
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
        purpose: 'Explain natal chart placements',
        context: {
          astrologyData: {
            ascendant: { sign: 'Leo', degree: 14.5 },
            planets: [{ name: 'Sun', sign: 'Taurus', house: 10 }],
          },
          importantValues: {
            lagna: 'Leo',
            currentDasha: 'Sun-Mars',
          },
        },
      });

      expect(result).toBeDefined();
      expect(result.headline).toBe('Strong Leadership and Analytical Mind');
      expect(result.message).toContain('Ascendant in Leo');
      expect(result.keyPoints).toHaveLength(3);
      expect(result.disclaimer).toContain('AI Sushil Sir');
      expect(mockLlmProvider.generateResponse).toHaveBeenCalled();
    });

    it('2. Handles empty astrology data gracefully without fabricating', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn(),
      };

      const service = new JyotiService(mockLlmProvider);
      const result = await service.processExplain('user-explainer-2', {
        feature: 'shadbala',
        screenTitle: 'Planetary Strength',
        context: {
          astrologyData: {},
        },
      });

      expect(result).toBeDefined();
      expect(result.headline).toContain('No Chart Data');
      expect(result.message).toContain("There isn't enough astrological information");
      expect(mockLlmProvider.generateResponse).not.toHaveBeenCalled();
    });

    it('3. Surfaces LLM provider failure during explanation as AI_SERVICE_UNAVAILABLE', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockRejectedValue(new Error('LLM Provider connection timeout')),
      };

      const service = new JyotiService(mockLlmProvider);
      await expect(
        service.processExplain('user-explainer-3', {
          feature: 'vimshottari_dasha',
          screenTitle: 'Vimshottari Dasha',
          context: {
            astrologyData: {
              currentMahadasha: 'Jupiter',
              currentAntardasha: 'Saturn',
            },
          },
        })
      ).rejects.toMatchObject({ code: 'AI_SERVICE_UNAVAILABLE', statusCode: 503 });
    });

    it('4. Does not inject generic filler key points when the model returns none', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockResolvedValue({ message: 'Your Jupiter Mahadasha emphasises learning.' }),
      };
      const service = new JyotiService(mockLlmProvider);
      const result = await service.processExplain('user-explainer-4', {
        feature: 'vimshottari_dasha',
        screenTitle: 'Vimshottari Dasha',
        context: { astrologyData: { currentMahadasha: 'Jupiter' } },
      });
      expect(result.message).toContain('Jupiter Mahadasha');
      expect(result.keyPoints).toEqual([]);
    });
  });
});
