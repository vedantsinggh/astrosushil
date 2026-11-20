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

  // Ashtottari is served by the unified POST /api/v1/astrology/dasha endpoint
  // (dashaSystem: 'ASHTOTTARI'), which is what the mobile client calls. The legacy
  // /dashas/ashtottari path was consolidated and is not mounted.
  describe('POST /api/v1/astrology/dasha (dashaSystem: ASHTOTTARI)', () => {
    it('calculates Ashtottari Dasha timeline with 8 Mahadashas and sub-periods', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dasha',
        payload: {
          birthDetails: validBirthDetails,
          dashaSystem: 'ASHTOTTARI',
          maxLevel: 2,
          targetDate: '2026-09-24T00:00:00Z',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;

      expect(body.birthDetails).toBeDefined();
      expect(body.system).toBe('ASHTOTTARI');
      expect(body.totalSpanYears).toBe(108);

      const tree = body.tree;
      expect(tree.dashaSystem).toBe('ASHTOTTARI');
      expect(tree.totalCycleYears).toBe(108);
      expect(tree.birthLord).toBeDefined();
      expect(tree.balanceAtBirthYears).toBeGreaterThan(0);
      expect(tree.mahadashas).toBeDefined();
      expect(tree.mahadashas.length).toBe(8);
      expect(tree.mahadashas[0].lord).toBe(tree.birthLord);

      for (const md of tree.mahadashas) {
        expect(md.lord).toBeDefined();
        expect(md.startDateIso).toBeDefined();
        expect(md.endDateIso).toBeDefined();
        expect(md.durationYears).toBeGreaterThan(0);
        expect(md.subPeriods).toBeDefined();
        if (md.isBirthDasha) {
          // Antardashas elapsed before birth are clipped from the birth Mahadasha.
          expect(md.subPeriods.length).toBeGreaterThanOrEqual(1);
          expect(md.subPeriods.length).toBeLessThanOrEqual(8);
        } else {
          expect(md.subPeriods.length).toBe(8);
        }
      }

      expect(body.activePeriods).toBeDefined();
      expect(body.activePeriods.mahadasha).toBeDefined();
      expect(body.activePeriods.antardasha).toBeDefined();
      expect(typeof body.eligibility.isEligible).toBe('boolean');
      expect(body.eligibility.reason).toBeDefined();
    });

    it('returns 400 when invalid birth details are provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dasha',
        payload: {
          dashaSystem: 'ASHTOTTARI',
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
        url: '/api/v1/astrology/dasha',
        payload: { dashaSystem: 'ASHTOTTARI' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/astrology/conventions', () => {
    it('includes ASHTOTTARI in the implemented Dasha system registry', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/astrology/conventions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;
      const ashtottari = body.dashaSystems.implemented.find((d: any) => d.system === 'ASHTOTTARI');
      expect(ashtottari).toBeDefined();
      expect(ashtottari.status).toBe('IMPLEMENTED');
      expect(ashtottari.totalCycleYears).toBe(108);
      expect(ashtottari.isConditional).toBe(true);
    });
  });
});
