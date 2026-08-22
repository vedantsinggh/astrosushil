import { describe, it, expect, vi } from 'vitest';
import { ActionRegistry, AllowedJyotiAction } from '../../src/modules/jyoti/actions/action.registry';
import { GeminiProvider } from '../../src/modules/jyoti/providers/gemini.provider';
import { JyotiService } from '../../src/modules/jyoti/jyoti.service';

describe('Jyoti AI Assistant Unit Tests', () => {
  describe('ActionRegistry', () => {
    it('should validate allowed action types', () => {
      expect(ActionRegistry.isActionAllowed('OPEN_BIRTH_CHART')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_PLANETS')).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_VASTU')).toBe(true);
      expect(ActionRegistry.isActionAllowed('DELETE_DATABASE')).toBe(false);
      expect(ActionRegistry.isActionAllowed('EXECUTE_CODE')).toBe(false);
    });

    it('should filter out unauthorized actions from action payloads', () => {
      const actions = [
        { type: 'OPEN_BIRTH_CHART', title: 'Birth Chart' },
        { type: 'UNAUTHORIZED_ACTION', title: 'Hacked Action' },
      ];

      const validated = ActionRegistry.validateActions(actions);
      expect(validated.length).toBe(1);
      expect(validated[0].type).toBe('OPEN_BIRTH_CHART');
    });
  });

  describe('GeminiProvider', () => {
    it('should return a fallback response gracefully when API key is unconfigured', async () => {
      const provider = new GeminiProvider('mock-key-dev', 'gemini-3.6-flash');
      const response = await provider.generateResponse('What is my Moon sign?');

      expect(response).toBeDefined();
      expect(typeof response.message).toBe('string');
      expect(response.message.length).toBeGreaterThan(0);
    });

    it('should recommend OPEN_BIRTH_CHART for chart questions', async () => {
      const provider = new GeminiProvider('mock-key-dev', 'gemini-3.6-flash');
      const response = await provider.generateResponse('Generate my Kundli');

      expect(response.actions).toBeDefined();
      expect(response.actions?.[0].type).toBe(AllowedJyotiAction.OPEN_BIRTH_CHART);
    });
  });

  describe('JyotiService', () => {
    it('should process user chat query and return sanitized actions', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockResolvedValue({
          message: 'Sure, opening your birth chart.',
          actions: [{ type: 'OPEN_BIRTH_CHART', title: 'Open Chart' }],
        }),
      };

      const service = new JyotiService(mockLlmProvider);
      const result = await service.processChat('test-user-123', {
        message: 'Show my birth chart',
        context: { currentScreen: 'HOME' },
      });

      expect(result.message).toBe('Sure, opening your birth chart.');
      expect(result.actions?.length).toBe(1);
      expect(result.actions?.[0].type).toBe('OPEN_BIRTH_CHART');
    });

    it('should enforce rate limits per user', async () => {
      const mockLlmProvider = {
        generateResponse: vi.fn().mockResolvedValue({
          message: 'Response',
        }),
      };

      const service = new JyotiService(mockLlmProvider);
      const userId = 'rate-limit-user-123';

      // Send requests up to limit (20)
      for (let i = 0; i < 20; i++) {
        await service.processChat(userId, { message: `Message ${i}` });
      }

      // 21st request must trigger 429 rate limit exception
      await expect(
        service.processChat(userId, { message: 'Over limit message' })
      ).rejects.toThrow(/rate limit/i);
    });
  });
});
