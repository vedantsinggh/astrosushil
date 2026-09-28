import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';

describe('Phase 2D Ashtakavarga API Integration Tests', () => {
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

  describe('POST /api/v1/astrology/ashtakavarga', () => {
    it('calculates full Parashara Ashtakavarga (BAV, SAV, Shodhana, Shodhya Pinda, Kakshyas)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/ashtakavarga',
        payload: {
          birthDetails: validBirthDetails,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.totalSAVPoints).toBe(337);
      expect(body.convention).toBeDefined();

      // 1. Verify BAV
      expect(body.bav).toBeDefined();
      const planets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
      const expectedTotals: Record<string, number> = {
        SUN: 48,
        MOON: 49,
        MARS: 39,
        MERCURY: 54,
        JUPITER: 56,
        VENUS: 52,
        SATURN: 39,
      };

      for (const p of planets) {
        const bav = body.bav[p];
        expect(bav).toBeDefined();
        expect(bav.planet).toBe(p);
        expect(bav.totalBindus).toBe(expectedTotals[p]);

        let sSum = 0;
        for (let s = 1; s <= 12; s++) {
          sSum += bav.signBindus[s];
        }
        expect(sSum).toBe(expectedTotals[p]);

        expect(bav.prastara).toBeDefined();
        expect(bav.prastara.totalBindus).toBe(expectedTotals[p]);
      }

      // 2. Verify SAV
      expect(body.sav).toBeDefined();
      expect(body.sav.totalBindus).toBe(337);
      let savSignSum = 0;
      for (let s = 1; s <= 12; s++) {
        savSignSum += body.sav.signBindus[s];
      }
      expect(savSignSum).toBe(337);

      // 3. Verify Shodhana & Shodhya Pinda
      expect(body.shodhana).toBeDefined();
      for (const p of planets) {
        const sh = body.shodhana[p];
        expect(sh).toBeDefined();
        expect(sh.planet).toBe(p);
        expect(sh.shodhyaPinda).toBeDefined();
        expect(sh.shodhyaPinda.rashiPinda).toBeGreaterThanOrEqual(0);
        expect(sh.shodhyaPinda.grahaPinda).toBeGreaterThanOrEqual(0);
        expect(sh.shodhyaPinda.yogaPinda).toBe(
          sh.shodhyaPinda.rashiPinda + sh.shodhyaPinda.grahaPinda
        );
      }

      // 4. Verify Kakshyas
      expect(body.kakshyas).toBeDefined();
      for (const p of planets) {
        const kList = body.kakshyas[p];
        expect(kList).toBeDefined();
        expect(kList.length).toBe(12);
      }
    });

    it('returns 400 when invalid birth details are provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/ashtakavarga',
        payload: {
          birthDetails: {
            ...validBirthDetails,
            latitude: -100, // invalid latitude
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when neither birthProfileId nor birthDetails is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/ashtakavarga',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/astrology/conventions', () => {
    it('includes ashtakavarga convention in registry response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/astrology/conventions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.conventions.ashtakavarga).toBeDefined();
      expect(body.conventions.ashtakavarga.subsystem).toBe('Ashtakavarga Engine');
      expect(body.conventions.ashtakavarga.tradition).toBe('Brihat Parashara Hora Shastra');
      expect(body.conventions.ashtakavarga.specialRules.length).toBeGreaterThan(0);
    });
  });
});
