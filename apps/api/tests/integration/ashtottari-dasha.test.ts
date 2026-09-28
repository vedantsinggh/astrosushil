import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';

describe('Phase 2F Ashtottari Dasha API Integration Tests', () => {
  let app: FastifyInstance;

  const validBirthDetails = {
    name: 'Standard Native',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/astrology/dashas/ashtottari', () => {
    it('calculates Ashtottari Dasha timeline with 8 Mahadashas and sub-periods', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/ashtottari',
        payload: {
          birthDetails: validBirthDetails,
          maxLevel: 2,
          targetDate: '2026-09-24T00:00:00Z',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.system).toBe('ASHTOTTARI');
      expect(body.totalYears).toBe(108);
      expect(body.startingLord).toBeDefined();
      expect(body.balanceAtBirthYears).toBeGreaterThan(0);
      expect(body.mahadashas).toBeDefined();
      expect(body.mahadashas.length).toBe(8);

      for (const md of body.mahadashas) {
        expect(md.lord).toBeDefined();
        expect(md.startDateIso).toBeDefined();
        expect(md.endDateIso).toBeDefined();
        expect(md.durationYears).toBeGreaterThan(0);
        expect(md.subPeriods).toBeDefined();
        expect(md.subPeriods.length).toBe(8);
      }

      expect(body.currentPeriod).toBeDefined();
      expect(body.currentPeriod.mahadasha).toBeDefined();
      expect(body.currentPeriod.antardasha).toBeDefined();
      expect(typeof body.isEligible).toBe('boolean');
      expect(body.eligibilityReason).toBeDefined();
    });

    it('returns 400 when invalid birth details are provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/ashtottari',
        payload: {
          birthDetails: {
            ...validBirthDetails,
            latitude: -95, // invalid latitude
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when neither birthProfileId nor birthDetails is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/ashtottari',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/astrology/conventions', () => {
    it('includes ashtottari_dasha in registry response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/astrology/conventions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.conventions.ashtottariDasha).toBeDefined();
      expect(body.conventions.ashtottariDasha.subsystem).toBe('Ashtottari Dasha Engine');
    });
  });
});
