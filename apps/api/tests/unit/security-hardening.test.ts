import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { paymentService } from '../../src/services/payment.service';
import { otpService } from '../../src/modules/auth/otp.service';
import { ActionRegistry, AllowedJyotiAction } from '../../src/modules/jyoti/actions/action.registry';
import { config } from '../../src/config';

describe('Security Hardening Pass - Phase 3 Suite', () => {
  describe('1. Payment Signature Verification Hardening', () => {
    const orderId = 'order_test_12345';
    const paymentId = 'pay_test_67890';
    const secret = 'test_razorpay_secret_key_999';

    const generateValidSignature = (ordId: string, payId: string, sec: string) => {
      return crypto
        .createHmac('sha256', sec)
        .update(`${ordId}|${payId}`)
        .digest('hex');
    };

    beforeEach(() => {
      process.env.RAZORPAY_KEY_SECRET = secret;
    });

    it('should accept valid HMAC-SHA256 signature with configured secret', () => {
      const validSig = generateValidSignature(orderId, paymentId, secret);
      const isValid = paymentService.verifySignature(orderId, paymentId, validSig);
      expect(isValid).toBe(true);
    });

    it('should reject invalid payment signature', () => {
      const invalidSig = 'invalid_signature_hex_digest_value_12345';
      const isValid = paymentService.verifySignature(orderId, paymentId, invalidSig);
      expect(isValid).toBe(false);
    });

    it('should reject signature with mismatched secret', () => {
      const mismatchedSig = generateValidSignature(orderId, paymentId, 'wrong_secret_123');
      const isValid = paymentService.verifySignature(orderId, paymentId, mismatchedSig);
      expect(isValid).toBe(false);
    });

    it('should reject missing or empty signature parameters', () => {
      expect(paymentService.verifySignature('', paymentId, 'sig')).toBe(false);
      expect(paymentService.verifySignature(orderId, '', 'sig')).toBe(false);
      expect(paymentService.verifySignature(orderId, paymentId, '')).toBe(false);
    });

    it('CRITICAL: should STRICTLY REJECT mock_sig_* in production mode', () => {
      const originalNodeEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';

        const isValid = paymentService.verifySignature(orderId, paymentId, 'mock_sig_super_bypass');
        expect(isValid).toBe(false);
      } finally {
        (config as any).NODE_ENV = originalNodeEnv;
      }
    });

    it('should reject verification in production if RAZORPAY_KEY_SECRET is unset and signature is not real', () => {
      const originalNodeEnv = config.NODE_ENV;
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;
      try {
        (config as any).NODE_ENV = 'production';
        delete process.env.RAZORPAY_KEY_SECRET;

        const isValid = paymentService.verifySignature(orderId, paymentId, 'any_signature');
        expect(isValid).toBe(false);
      } finally {
        (config as any).NODE_ENV = originalNodeEnv;
        process.env.RAZORPAY_KEY_SECRET = originalSecret;
      }
    });
  });

  describe('2. Master OTP & Authentication Security', () => {
    it('CRITICAL: isDevMasterOtp MUST return false unconditionally in production environment', () => {
      const originalNodeEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        expect(otpService.isDevMasterOtp('4444')).toBe(false);
        expect(otpService.isDevMasterOtp('0000')).toBe(false);
      } finally {
        (config as any).NODE_ENV = originalNodeEnv;
      }
    });

    it('should generate 6-digit numeric OTPs with strong randomness', () => {
      for (let i = 0; i < 20; i++) {
        const otp = otpService.generateOtp();
        expect(otp).toMatch(/^\d{6}$/);
        const num = parseInt(otp, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it('should produce deterministic SHA-256 OTP hashes', () => {
      const hash1 = otpService.hashOtp('123456');
      const hash2 = otpService.hashOtp('123456');
      const hashDiff = otpService.hashOtp('654321');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashDiff);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('3. Jyoti Action Allowlist Validation', () => {
    it('should allow legitimate registered actions', () => {
      expect(ActionRegistry.isActionAllowed(AllowedJyotiAction.OPEN_BIRTH_CHART)).toBe(true);
      expect(ActionRegistry.isActionAllowed(AllowedJyotiAction.OPEN_HOME)).toBe(true);
      expect(ActionRegistry.isActionAllowed('OPEN_PLANETS')).toBe(true);
    });

    it('CRITICAL: should discard arbitrary, malicious, or unknown LLM action types', () => {
      const maliciousActions = [
        { type: 'EXECUTE_SYSTEM_COMMAND', buttonText: 'Run' },
        { type: 'NAVIGATE_ARBITRARY_URL', parameters: { url: 'https://attacker.com' } },
        { type: 'DELETE_DATABASE_RECORDS', buttonText: 'Delete' },
        { type: 'OPEN_BIRTH_CHART', buttonText: 'View Chart' },
      ];

      const validated = ActionRegistry.validateActions(maliciousActions as any);

      expect(validated).toHaveLength(1);
      expect(validated[0].type).toBe('OPEN_BIRTH_CHART');
    });

    it('should return empty array when actions are undefined or invalid', () => {
      expect(ActionRegistry.validateActions(undefined)).toEqual([]);
      expect(ActionRegistry.validateActions(null as any)).toEqual([]);
      expect(ActionRegistry.validateActions('not-an-array' as any)).toEqual([]);
    });
  });
});
