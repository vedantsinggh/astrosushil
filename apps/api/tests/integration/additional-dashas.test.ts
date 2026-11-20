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

  // Conditional Parashari Dashas are served by the unified POST /api/v1/astrology/dasha
  // endpoint (dashaSystem: 'DWISAPTATI_SAMA', ...). Eligibility is enforced by the engine:
  // an ineligible chart returns evidence instead of a fabricated timeline.
  describe('POST /api/v1/astrology/dasha (dashaSystem: DWISAPTATI_SAMA)', () => {
    // Same date/place, 23:30 IST: Capricorn Lagna with 7th lord Moon in Lagna -> eligible.
    const eligibleBirthDetails = { ...validBirthDetails, timeOfBirth: '23:30:00' };

    it('calculates Dwisaptati Sama Dasha (72 years) with eligibility and Antardashas', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dasha',
        payload: {
          birthDetails: eligibleBirthDetails,
          dashaSystem: 'DWISAPTATI_SAMA',
          maxLevel: 2,
          targetDate: '2020-01-01T00:00:00Z',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;

      expect(body.birthDetails).toBeDefined();
      expect(body.system).toBe('DWISAPTATI_SAMA');
      expect(body.totalSpanYears).toBe(72);
      expect(body.eligibility.isEligible).toBe(true);
      expect(body.eligibility.eligibilityMethod).toBe('LAGNA_LORD_IN_7TH_OR_7TH_LORD_IN_1ST');
      expect(body.eligibility.reason).toContain('7th Lord (MOON) is in the 1st house');

      const tree = body.tree;
      expect(tree.totalCycleYears).toBe(72);
      expect(tree.birthLord).toBeDefined();
      expect(tree.balanceAtBirthYears).toBeGreaterThan(0);
      // 9 Grahas x 8 years = 72 years
      expect(tree.mahadashas.length).toBe(9);
      expect(tree.mahadashas[0].lord).toBe(tree.birthLord);

      for (const md of tree.mahadashas) {
        expect(md.lord).toBeDefined();
        expect(md.nominalYears).toBe(8);
        expect(md.subPeriods).toBeDefined();
        if (md.isBirthDasha) {
          expect(md.subPeriods.length).toBeGreaterThanOrEqual(1);
          expect(md.subPeriods.length).toBeLessThanOrEqual(9);
        } else {
          expect(md.durationYears).toBeCloseTo(8, 6);
          expect(md.subPeriods.length).toBe(9);
        }
      }
    });

    it('returns eligibility evidence and no timeline for an ineligible chart', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dasha',
        payload: {
          birthDetails: validBirthDetails,
          dashaSystem: 'DWISAPTATI_SAMA',
          maxLevel: 2,
          targetDate: '2020-01-01T00:00:00Z',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;
      expect(body.system).toBe('DWISAPTATI_SAMA');
      expect(body.eligibility.isEligible).toBe(false);
      expect(body.eligibility.criteria.lagnaLord).toBe('MERCURY');
      expect(body.eligibility.criteria.lagnaLordHouse).toBe(8);
      expect(body.eligibility.criteria.seventhLord).toBe('JUPITER');
      expect(body.eligibility.criteria.seventhLordHouse).toBe(10);
      expect(body.tree.isEligible).toBe(false);
      expect(body.tree.mahadashas).toBeUndefined();
    });
  });

  describe('GET /api/v1/astrology/conventions', () => {
    // Yogini, Chara, Narayana and Kalachakra moved from PENDING to IMPLEMENTED on 2026-11-18
    // (docs/report-system/decisions/engine-extensions.md). Chara/Narayana cycle length is
    // chart-dependent; the registry reports the 144-year maximum (12 signs x 12 years).
    it('lists Yogini, Chara, Narayana, Kalachakra and Conditional Dashas as implemented', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/astrology/conventions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;
      const pending = body.dashaSystems.pending;
      const implemented = body.dashaSystems.implemented;

      const expectedImplemented: Record<string, number> = { YOGINI: 36, CHARA: 144, NARAYANA: 144, KALACHAKRA: 100 };
      for (const [system, years] of Object.entries(expectedImplemented)) {
        const meta = implemented.find((d: any) => d.system === system);
        expect(meta).toBeDefined();
        expect(meta.status).toBe('IMPLEMENTED');
        expect(meta.isConditional).toBe(false);
        expect(meta.totalCycleYears).toBe(years);
        expect(pending.find((d: any) => d.system === system)).toBeUndefined();
      }

      const dwisaptati = implemented.find((d: any) => d.system === 'DWISAPTATI_SAMA');
      expect(dwisaptati).toBeDefined();
      expect(dwisaptati.status).toBe('IMPLEMENTED');
      expect(dwisaptati.isConditional).toBe(true);
      expect(dwisaptati.totalCycleYears).toBe(72);
    });
  });
});
