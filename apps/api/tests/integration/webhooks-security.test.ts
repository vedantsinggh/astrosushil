import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { config } from '../../src/config';

describe('Webhooks Security Integration Suite', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('WhatsApp Webhook Challenge Verification', () => {
    it('should verify challenge successfully when verify_token matches configured token', async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'secret_webhook_verify_token_123';

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/whatsapp',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'secret_webhook_verify_token_123',
          'hub.challenge': 'challenge_code_98765',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('challenge_code_98765');
    });

    it('should reject challenge when verify_token does not match', async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'secret_webhook_verify_token_123';

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/whatsapp',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'challenge_code_98765',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject challenge when hub.mode is not subscribe', async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'secret_webhook_verify_token_123';

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/whatsapp',
        query: {
          'hub.mode': 'unsubscribe',
          'hub.verify_token': 'secret_webhook_verify_token_123',
          'hub.challenge': 'challenge_code_98765',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('CRITICAL: in production mode, challenge MUST fail if WHATSAPP_VERIFY_TOKEN is unset', async () => {
      const originalNodeEnv = config.NODE_ENV;
      const originalToken = process.env.WHATSAPP_VERIFY_TOKEN;
      try {
        (config as any).NODE_ENV = 'production';
        delete process.env.WHATSAPP_VERIFY_TOKEN;

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/webhooks/whatsapp',
          query: {
            'hub.mode': 'subscribe',
            'hub.verify_token': 'astro_verify_token',
            'hub.challenge': 'challenge_code_98765',
          },
        });

        expect(response.statusCode).toBe(403);
      } finally {
        (config as any).NODE_ENV = originalNodeEnv;
        process.env.WHATSAPP_VERIFY_TOKEN = originalToken;
      }
    });
  });
});
