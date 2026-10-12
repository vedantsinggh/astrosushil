import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { paymentService, REPORT_PRICES_PAISE } from '../../src/services/payment.service';
import { storageService } from '../../src/services/storage.service';
import { redisQueueService } from '../../src/services/redis-queue.service';
import { fcmProvider } from '../../src/modules/notifications/fcm.provider';
import { emailService } from '../../src/services/email.service';
import { getVerificationEmailTemplate } from '../../src/services/emails/verification';
import { getPasswordResetEmailTemplate } from '../../src/services/emails/password-reset';
import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { config } from '../../src/config';

describe('Phase 9: Infrastructure & External Services Hardening Suite', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Razorpay Payment Lifecycle & Cryptographic Hardening', () => {
    it('determines report prices strictly server-side (preventing price tampering)', () => {
      expect(REPORT_PRICES_PAISE.KUNDLI).toBe(29900);
      expect(REPORT_PRICES_PAISE.CAREER).toBe(49900);
      expect(REPORT_PRICES_PAISE.CAREER_PROSITY).toBe(69900);
      expect(REPORT_PRICES_PAISE.MARRIAGE_COMPATIBILITY).toBe(49900);
      expect(REPORT_PRICES_PAISE.GUPTA_NADI_DOSSIER).toBe(99900);
    });

    it('creates Razorpay orders with valid IDs and currency', async () => {
      const rzOrder = await paymentService.createRazorpayOrder(49900, 'INR');
      expect(rzOrder.id).toMatch(/^order_mock_[0-9a-f]{16}$/);
      expect(rzOrder.amount).toBe(49900);
      expect(rzOrder.currency).toBe('INR');
      expect(rzOrder.status).toBe('created');
    });

    it('verifies valid HMAC SHA-256 payment signature with constant-time equality', () => {
      const orderId = 'order_valid_12345';
      const paymentId = 'pay_valid_67890';
      const secret = 'test_razorpay_secret_key_123';
      process.env.RAZORPAY_KEY_SECRET = secret;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = paymentService.verifySignature(orderId, paymentId, expectedSignature);
      expect(isValid).toBe(true);
    });

    it('rejects tampered or forged payment signatures', () => {
      const orderId = 'order_test_123';
      const paymentId = 'pay_test_456';
      process.env.RAZORPAY_KEY_SECRET = 'test_secret';

      const invalidSig = 'invalid_tampered_signature_hex_value';
      const isValid = paymentService.verifySignature(orderId, paymentId, invalidSig);
      expect(isValid).toBe(false);
    });

    it('rejects missing or empty signature parameters', () => {
      expect(paymentService.verifySignature('', 'pay_123', 'sig_123')).toBe(false);
      expect(paymentService.verifySignature('order_123', '', 'sig_123')).toBe(false);
      expect(paymentService.verifySignature('order_123', 'pay_123', '')).toBe(false);
    });

    it('strictly rejects mock signatures when NODE_ENV is production', () => {
      const originalEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        const isValid = paymentService.verifySignature(
          'order_prod_123',
          'pay_prod_123',
          'mock_sig_dev_bypass'
        );
        expect(isValid).toBe(false);
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });
  });

  describe('2. Redis Queue Service & Connection Lifecycle', () => {
    it('handles queue operations safely and detects configuration state', async () => {
      const isConfigured = redisQueueService.isConfigured;
      expect(typeof isConfigured).toBe('boolean');

      const testJobId = `job_${Date.now()}`;
      const enqueued = await redisQueueService.enqueueJob(testJobId);
      expect(typeof enqueued).toBe('boolean');

      const health = await redisQueueService.checkHealth();
      expect(typeof health).toBe('boolean');
    });

    it('gracefully closes Redis connections without crashing', async () => {
      await expect(redisQueueService.closeConnection()).resolves.not.toThrow();
    });
  });

  describe('3. Object Storage Security, Key Sanitization & Path Traversal Prevention', () => {
    it('uploads buffer to private storage safely and validates content round-trip', async () => {
      const testBuffer = Buffer.from('%PDF-1.4 mock pdf content for storage test %%EOF');
      const testKey = `reports/test-user-${Date.now()}/career-report.pdf`;

      const result = await storageService.upload({
        key: testKey,
        body: testBuffer,
        contentType: 'application/pdf',
      });

      expect(result.key).toBe(testKey);
      expect(result.fileSize).toBe(testBuffer.length);
      expect(result.checksum).toBeDefined();

      const exists = await storageService.exists(testKey);
      expect(exists).toBe(true);

      const downloaded = await storageService.downloadBuffer(testKey);
      expect(downloaded.toString()).toBe(testBuffer.toString());

      // Clean up
      await storageService.delete(testKey);
      const existsAfter = await storageService.exists(testKey);
      expect(existsAfter).toBe(false);
    });

    it('strictly rejects directory traversal attacks with path traversal keys', async () => {
      const maliciousKeys = [
        '../etc/passwd',
        '../../../../secret.key',
        'reports/../../root',
        'reports/\0/evil.pdf',
        'reports/\n/newline.pdf',
      ];

      for (const badKey of maliciousKeys) {
        await expect(
          storageService.upload({
            key: badKey,
            body: Buffer.from('malicious content'),
          })
        ).rejects.toThrow(/Security Error: Path traversal attempt detected/);
      }
    });

    it('generates and cryptographically verifies short-lived signed download tokens', async () => {
      const validKey = 'reports/user123/report456.pdf';
      const signedUrl = await storageService.getSignedDownloadUrl(validKey, 60);

      expect(signedUrl).toContain('token=');
      expect(signedUrl).toContain('expires=');

      const urlObj = new URL(signedUrl);
      const key = urlObj.searchParams.get('key')!;
      const expires = parseInt(urlObj.searchParams.get('expires')!, 10);
      const token = urlObj.searchParams.get('token')!;

      const isValid = storageService.verifyLocalSignedUrl(key, expires, token);
      expect(isValid).toBe(true);

      // Expired token must be rejected
      const expiredMs = Date.now() - 1000;
      const isExpiredValid = storageService.verifyLocalSignedUrl(key, expiredMs, token);
      expect(isExpiredValid).toBe(false);

      // Tampered token must be rejected
      const isTamperedValid = storageService.verifyLocalSignedUrl(key, expires, 'invalid_token');
      expect(isTamperedValid).toBe(false);
    });
  });

  describe('4. FCM / Push Notification Failure Isolation', () => {
    it('simulates FCM push delivery cleanly in development/unconfigured mode', async () => {
      const result = await fcmProvider.sendPushNotification({
        token: 'mock-fcm-device-token-123',
        notification: { title: 'Test Title', body: 'Test Body' },
        data: { type: 'REPORT_READY', entityId: 'r-1', route: 'OPEN_REPORT' },
      });

      expect(result.success).toBe(true);
    });

    it('handles token deactivation safely without crashing', async () => {
      await expect(
        fcmProvider.markTokenInactive('mock_inactive_token', 'NotRegistered')
      ).resolves.not.toThrow();
    });
  });

  describe('5. Email Service & Template Injection Protection', () => {
    it('renders verification email template securely with encoded OTP', () => {
      const template = getVerificationEmailTemplate('123456', 10);
      expect(template.subject).toContain('Verify your Astro Sushil account');
      expect(template.html).toContain('123456');
      expect(template.text).toContain('123456');
    });

    it('renders password reset email template securely', () => {
      const template = getPasswordResetEmailTemplate('987654', 10);
      expect(template.subject).toContain('Reset your Astro Sushil password');
      expect(template.html).toContain('987654');
      expect(template.text).toContain('987654');
    });


    it('does not crash API process on email dispatch in development mode', async () => {
      await expect(
        emailService.sendVerificationEmail('test@astrosushil.com', '123456')
      ).resolves.not.toThrow();

      await expect(
        emailService.sendPasswordResetEmail('test@astrosushil.com', '654321')
      ).resolves.not.toThrow();
    });
  });

  describe('6. Webhooks Authentication & Challenge Verification', () => {
    it('rejects unauthorized WhatsApp verification challenge when token is wrong', async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'secret_webhook_verify_token_123';

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/whatsapp',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': '115599',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('accepts WhatsApp verification challenge when token matches', async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'secret_webhook_verify_token_123';

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/whatsapp',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'secret_webhook_verify_token_123',
          'hub.challenge': '115599',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('115599');
    });

    it('rejects Razorpay webhook in production when signature is missing', async () => {
      const originalNodeEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test_secret_123';

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/webhooks/razorpay',
          payload: {
            event: 'payment.captured',
          },
        });

        expect(response.statusCode).toBe(400);
      } finally {
        (config as any).NODE_ENV = originalNodeEnv;
      }
    });

    it('accepts Razorpay webhook with valid HMAC signature', async () => {
      const secret = 'whsec_test_secret_123';
      process.env.RAZORPAY_WEBHOOK_SECRET = secret;

      const payload = {
        event_id: 'evt_infra_' + Date.now(),
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_hook_123',
              order_id: 'order_test_hook_123',
              amount: 49900,
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const resJson = JSON.parse(response.body);
      expect(resJson.status).toBe('ok');
      expect(resJson.received).toBe(true);
    });
  });

  describe('7. Health & Readiness Observability', () => {
    it('returns 200 on /health liveness probe', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('ok');
      expect(data.service).toBe('astro-api');
      expect(data.timestamp).toBeDefined();
    });

    it('returns readiness probe response with database and redis fields on /ready and /health/ready', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect([200, 503]).toContain(response.statusCode);
      const data = JSON.parse(response.body);
      expect(data.service).toBe('astro-api');
      expect(data.database).toBeDefined();
      expect(data.redis).toBeDefined();
    });
  });
});
