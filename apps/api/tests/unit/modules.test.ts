import { describe, it, expect } from 'vitest';
import { evaluateGuptaNadiSchema } from '../../src/modules/gupta-nadi/gupta-nadi.schemas';
import { generateNatalPredictionSchema } from '../../src/modules/predictions/predictions.schemas';
import { createOrderSchema, verifyPaymentSchema } from '../../src/modules/payments/payments.schemas';
import { createReportSchema } from '../../src/modules/reports/reports.schemas';

describe('API Modules Validation Schemas', () => {
  describe('Gupta Nadi Schemas', () => {
    it('should validate valid evaluateGuptaNadi payload', () => {
      const result = evaluateGuptaNadiSchema.safeParse({
        birthProfileId: '123e4567-e89b-12d3-a456-426614174000',
        gender: 'FEMALE',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender).toBe('FEMALE');
      }
    });

    it('should fail invalid birthProfileId UUID', () => {
      const result = evaluateGuptaNadiSchema.safeParse({
        birthProfileId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Predictions Schemas', () => {
    it('should validate generateNatalPrediction payload', () => {
      const result = generateNatalPredictionSchema.safeParse({
        birthProfileId: '123e4567-e89b-12d3-a456-426614174000',
        domain: 'CAREER',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Payments Schemas', () => {
    it('should validate createOrder payload', () => {
      const result = createOrderSchema.safeParse({
        reportType: 'GUPTA_NADI_DOSSIER',
      });
      expect(result.success).toBe(true);
    });

    it('should validate verifyPayment payload', () => {
      const result = verifyPaymentSchema.safeParse({
        razorpayOrderId: 'order_mock_123',
        razorpayPaymentId: 'pay_mock_123',
        razorpaySignature: 'mock_sig_123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Reports Schemas', () => {
    it('should validate createReport payload', () => {
      const result = createReportSchema.safeParse({
        birthProfileId: '123e4567-e89b-12d3-a456-426614174000',
        reportType: 'MARRIAGE_COMPATIBILITY',
      });
      expect(result.success).toBe(true);
    });
  });
});
