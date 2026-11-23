import { describe, it, expect, vi, afterEach } from 'vitest';
import { LocationService } from '../../src/modules/locations/locations.service';
import { EmailProvider } from '../../src/modules/notifications/email.provider';
import { emailService } from '../../src/services/email.service';
import { getRazorpayPublicKeyId } from '../../src/modules/payments/razorpay-public-key';
import { GuptaNadiService } from '../../src/modules/gupta-nadi/gupta-nadi.service';
import { evaluateGuptaNadiSchema } from '../../src/modules/gupta-nadi/gupta-nadi.schemas';
import { PredictionsService } from '../../src/modules/predictions/predictions.service';
import { panchangRequestSchema } from '../../src/modules/astrology/astrology.schemas';
import { prisma } from '../../src/services/prisma.service';
import { AstrologyService } from '../../src/modules/astrology/astrology.service';

describe('No fabricated fallbacks in user-facing modules', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('LocationService', () => {
    it('returns 503 GEOCODING_UNAVAILABLE when the provider fails and no verified catalog city matches', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
      const service = new LocationService();
      await expect(service.searchPlaces('Bulandshahr')).rejects.toMatchObject({
        code: 'GEOCODING_UNAVAILABLE',
        statusCode: 503,
      });
    });

    it('still serves verified catalog cities when the provider fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
      const service = new LocationService();
      const results = await service.searchPlaces('Mumbai');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].timezone).toBe('Asia/Kolkata');
    });

    it('drops provider results whose timezone cannot be verified instead of guessing UTC/IST', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                // Kathmandu lies inside the old "India bounding box" heuristic but is NOT Asia/Kolkata
                { id: 1, name: 'Kathmandu', country: 'Nepal', country_code: 'NP', latitude: 27.7172, longitude: 85.324 },
                { id: 2, name: 'Pune', country: 'India', country_code: 'IN', latitude: 18.5204, longitude: 73.8567 },
                { id: 3, name: 'Paris', country: 'France', country_code: 'FR', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
              ],
            }),
        })
      );
      const service = new LocationService();
      const results = await service.searchPlaces('test-tz-query');
      expect(results.map((r) => r.name)).toEqual(['Pune', 'Paris']);
      expect(results[0].timezone).toBe('Asia/Kolkata');
      expect(results[1].timezone).toBe('Europe/Paris');
    });

    it('resolveTimezoneFallback never guesses', () => {
      const service = new LocationService();
      expect(service.resolveTimezoneFallback(27.7, 85.3, 'NP')).toBeNull();
      expect(service.resolveTimezoneFallback(40, -74, 'US')).toBeNull();
      expect(service.resolveTimezoneFallback(28.6, 77.2, 'IN')).toBe('Asia/Kolkata');
    });
  });

  describe('EmailProvider', () => {
    it('never sends a substitute verification email with a fake OTP', async () => {
      const verificationSpy = vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue();
      const provider = new EmailProvider();
      const result = await provider.sendEmail({ toEmail: 'a@example.com', subject: 's', text: 't', html: '<p>t</p>' });
      // The provider now sends the given message through the e-mail transport (simulated outside
      // production when SMTP is not configured). It must still never substitute a verification e-mail.
      expect(verificationSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Razorpay public key', () => {
    it('throws PAYMENT_GATEWAY_UNCONFIGURED instead of returning a placeholder key', () => {
      const original = process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_ID;
      try {
        expect(() => getRazorpayPublicKeyId()).toThrow(
          expect.objectContaining({ code: 'PAYMENT_GATEWAY_UNCONFIGURED', statusCode: 503 })
        );
        process.env.RAZORPAY_KEY_ID = 'rzp_test_real_key';
        expect(getRazorpayPublicKeyId()).toBe('rzp_test_real_key');
      } finally {
        if (original === undefined) delete process.env.RAZORPAY_KEY_ID;
        else process.env.RAZORPAY_KEY_ID = original;
      }
    });
  });

  describe('Gupta Nadi and predictions stubs', () => {
    const owner = { id: 'owner-1', role: 'USER' };
    const profileId = '123e4567-e89b-12d3-a456-426614174000';

    it('Gupta Nadi evaluation returns 501 instead of stub rules that fire for every chart', async () => {
      vi.spyOn(prisma.birthProfile, 'findUnique').mockResolvedValue({ id: profileId, userId: owner.id } as any);
      await expect(
        new GuptaNadiService().evaluateForProfile({ birthProfileId: profileId }, owner)
      ).rejects.toMatchObject({ code: 'GUPTA_NADI_ENGINE_NOT_IMPLEMENTED', statusCode: 501 });
      expect(new GuptaNadiService().getAvailableRules()).toEqual([]);
    });

    it('Gupta Nadi still enforces ownership (404) before reporting unavailability', async () => {
      vi.spyOn(prisma.birthProfile, 'findUnique').mockResolvedValue({ id: profileId, userId: 'someone-else' } as any);
      await expect(
        new GuptaNadiService().evaluateForProfile({ birthProfileId: profileId }, owner)
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('Gupta Nadi schema no longer assumes MALE gender', () => {
      const parsed = evaluateGuptaNadiSchema.parse({ birthProfileId: profileId });
      expect(parsed.gender).toBeUndefined();
    });

    it('natal and transit predictions return 501 instead of hard-coded scores and transits', async () => {
      vi.spyOn(prisma.birthProfile, 'findUnique').mockResolvedValue({ id: profileId, userId: owner.id } as any);
      const service = new PredictionsService();
      await expect(service.generateNatalPrediction({ birthProfileId: profileId } as any, owner)).rejects.toMatchObject({
        code: 'PREDICTION_ENGINE_NOT_IMPLEMENTED',
        statusCode: 501,
      });
      await expect(service.generateTransitPrediction({ birthProfileId: profileId } as any, owner)).rejects.toMatchObject({
        code: 'PREDICTION_ENGINE_NOT_IMPLEMENTED',
      });
    });
  });

  describe('Panchang request', () => {
    it('requires a timezone instead of defaulting to UTC', () => {
      const result = panchangRequestSchema.safeParse({
        dateOfBirth: '1990-05-15',
        timeOfBirth: '14:30:00',
        latitude: 28.6139,
        longitude: 77.209,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Avakhada calculation', () => {
    it('fails with ASTRONOMY_CALCULATION_ERROR when the ascendant is missing instead of assuming Mesha', async () => {
      const calculator = {
        calculateChart: vi.fn().mockResolvedValue({
          planets: { MOON: { longitude: 45.2, rashiIndex: 2, nakshatraIndex: 4 } },
          ascendant: undefined,
        }),
      } as any;
      const service = new AstrologyService(calculator);
      vi.spyOn(service as any, 'resolveBirthDetails').mockResolvedValue({} as any);
      await expect(
        service.calculateAvakhada({ birthDetails: {} as any })
      ).rejects.toMatchObject({ code: 'ASTRONOMY_CALCULATION_ERROR', statusCode: 500 });
    });
  });
});
