import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';

describe('Phase 2N, 2O, 2P Additional Dashas API Integration Tests', () => {
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

  describe('POST /api/v1/astrology/dashas/yogini', () => {
    it('calculates 36-year Yogini Dasha timeline with 8 Mahadashas and sub-periods', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/yogini',
        payload: {
          birthDetails: validBirthDetails,
          maxLevel: 3,
          targetDate: '2020-01-01T00:00:00Z',
          cycles: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.system).toBe('YOGINI');
      expect(body.totalCycleYears).toBe(36);
      expect(body.startingYogini).toBeDefined();
      expect(body.startingLord).toBeDefined();
      expect(body.balanceAtBirthYears).toBeGreaterThan(0);
      expect(body.mahadashas).toBeDefined();
      expect(body.mahadashas.length).toBe(8);

      for (const md of body.mahadashas) {
        expect(md.yoginiName).toBeDefined();
        expect(md.lord).toBeDefined();
        expect(md.durationYears).toBeGreaterThan(0);
        expect(md.subPeriods).toBeDefined();
        expect(md.subPeriods.length).toBe(8);
      }

      expect(body.currentPeriod).toBeDefined();
      expect(body.currentPeriod.mahadasha).toBeDefined();
      expect(body.currentPeriod.antardasha).toBeDefined();
      expect(body.currentPeriod.pratyantardasha).toBeDefined();
    });

    it('returns 400 when invalid birth details are provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/yogini',
        payload: {
          birthDetails: {
            ...validBirthDetails,
            latitude: 100, // Invalid latitude
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/astrology/dashas/chara', () => {
    it('calculates Jaimini Chara Dasha sign-based timeline with Antardashas', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/chara',
        payload: {
          birthDetails: validBirthDetails,
          maxLevel: 2,
          targetDate: '2026-09-24T00:00:00Z',
          cycles: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.system).toBe('CHARA');
      expect(body.startingSign).toBeGreaterThanOrEqual(1);
      expect(body.startingSign).toBeLessThanOrEqual(12);
      expect(['FORWARD', 'REVERSE']).toContain(body.direction);
      expect(body.periods).toBeDefined();
      expect(body.periods.length).toBe(12);

      for (const p of body.periods) {
        expect(p.signIndex).toBeGreaterThanOrEqual(1);
        expect(p.signIndex).toBeLessThanOrEqual(12);
        expect(p.durationYears).toBeGreaterThanOrEqual(1);
        expect(p.durationYears).toBeLessThanOrEqual(12);
        expect(p.lord).toBeDefined();
        expect(p.subPeriods).toBeDefined();
        expect(p.subPeriods.length).toBe(12);
      }

      expect(body.currentPeriod).toBeDefined();
      expect(body.currentPeriod.mahadasha).toBeDefined();
    });
  });

  describe('POST /api/v1/astrology/dashas/narayana', () => {
    it('calculates Narayana Dasha sign-based timeline with progression type and Antardashas', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/narayana',
        payload: {
          birthDetails: validBirthDetails,
          maxLevel: 2,
          targetDate: '2026-09-24T00:00:00Z',
          cycles: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.system).toBe('NARAYANA');
      expect(body.startingSign).toBeGreaterThanOrEqual(1);
      expect(body.startingSign).toBeLessThanOrEqual(12);
      expect(['MOVABLE_REGULAR', 'FIXED_SIXTH', 'DUAL_TRINE']).toContain(body.progressionType);
      expect(body.periods).toBeDefined();
      expect(body.periods.length).toBe(12);

      for (const p of body.periods) {
        expect(p.signIndex).toBeGreaterThanOrEqual(1);
        expect(p.signIndex).toBeLessThanOrEqual(12);
        expect(p.durationYears).toBeGreaterThanOrEqual(1);
        expect(p.durationYears).toBeLessThanOrEqual(12);
        expect(p.lord).toBeDefined();
        expect(p.subPeriods).toBeDefined();
        expect(p.subPeriods.length).toBe(12);
      }

      expect(body.currentPeriod).toBeDefined();
      expect(body.currentPeriod.mahadasha).toBeDefined();
    });
  });

  describe('POST /api/v1/astrology/dashas/kalachakra', () => {
    it('calculates Kalachakra Dasha 108-Pada timeline with Savya/Apasavya, Deha/Jeeva signs, and Antardashas', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/kalachakra',
        payload: {
          birthDetails: validBirthDetails,
          maxLevel: 2,
          targetDate: '2020-01-01T00:00:00Z',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.system).toBe('KALACHAKRA');
      expect(['SAVYA', 'APASAVYA']).toContain(body.directionType);
      expect(body.nakshatraIndex).toBeGreaterThanOrEqual(1);
      expect(body.nakshatraIndex).toBeLessThanOrEqual(27);
      expect(body.pada).toBeGreaterThanOrEqual(1);
      expect(body.pada).toBeLessThanOrEqual(4);
      expect(body.dehaRashi).toBeDefined();
      expect(body.jeevaRashi).toBeDefined();
      expect(body.totalPadaYears).toBeGreaterThan(0);
      expect(body.balanceAtBirthYears).toBeGreaterThan(0);
      expect(body.mahadashas).toBeDefined();
      expect(body.mahadashas.length).toBe(9);

      for (const md of body.mahadashas) {
        expect(md.signIndex).toBeGreaterThanOrEqual(1);
        expect(md.signIndex).toBeLessThanOrEqual(12);
        expect(md.durationYears).toBeGreaterThan(0);
        expect(md.subPeriods).toBeDefined();
        expect(md.subPeriods.length).toBe(9);
      }
    });
  });

  describe('POST /api/v1/astrology/dashas/conditional', () => {
    it('calculates Dwisaptati Sama Dasha (72 years) with eligibility and Antardashas', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/conditional',
        payload: {
          birthDetails: validBirthDetails,
          systemType: 'DWISAPTATI_SAMA',
          maxLevel: 2,
          targetDate: '2020-01-01T00:00:00Z',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.system).toBe('DWISAPTATI_SAMA');
      expect(body.totalYears).toBe(72);
      expect(typeof body.isEligible).toBe('boolean');
      expect(body.eligibilityReason).toBeDefined();
      expect(body.startingLord).toBeDefined();
      expect(body.balanceAtBirthYears).toBeGreaterThan(0);
      expect(body.mahadashas).toBeDefined();
      expect(body.mahadashas.length).toBe(8);

      for (const md of body.mahadashas) {
        expect(md.lord).toBeDefined();
        expect(md.durationYears).toBe(9);
        expect(md.subPeriods).toBeDefined();
        expect(md.subPeriods.length).toBe(8);
      }
    });
  });

  describe('GET /api/v1/astrology/conventions', () => {
    it('includes Yogini, Chara, Narayana, Kalachakra, and Conditional Dashas in conventions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/astrology/conventions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.conventions.yoginiDasha).toBeDefined();
      expect(body.conventions.yoginiDasha.subsystem).toBe('Yogini Dasha Engine');
      expect(body.conventions.charaDasha).toBeDefined();
      expect(body.conventions.charaDasha.subsystem).toBe('Jaimini Chara Dasha Engine');
      expect(body.conventions.narayanaDasha).toBeDefined();
      expect(body.conventions.narayanaDasha.subsystem).toBe('Narayana Dasha Engine');
      expect(body.conventions.kalachakraDasha).toBeDefined();
      expect(body.conventions.kalachakraDasha.subsystem).toBe('Kalachakra Dasha Engine');
      expect(body.conventions.conditionalDashas).toBeDefined();
      expect(body.conventions.conditionalDashas.subsystem).toBe('Parashara Conditional Dashas Engine');
    });
  });
});
