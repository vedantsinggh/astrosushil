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
    it('calculates full Parashara Ashtakavarga (BAV, Prastara, SAV, Shodhana, Shodhya Pinda)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/ashtakavarga',
        payload: {
          birthDetails: validBirthDetails,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;

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
        expect(bav.totalPoints).toBe(expectedTotals[p]);

        let sSum = 0;
        for (let s = 1; s <= 12; s++) {
          sSum += bav.signs[s];
          expect(bav.signs[s]).toBe(bav.signList[s - 1]);
        }
        expect(sSum).toBe(expectedTotals[p]);

        // Prastara: 8 contributors (7 Grahas + Lagna) x 12 signs of 0/1 bindus
        expect(bav.prastara).toBeDefined();
        const rows = Object.values(bav.prastara) as number[][];
        expect(rows).toHaveLength(8);
        let prastaraTotal = 0;
        for (const row of rows) {
          expect(row).toHaveLength(12);
          for (const cell of row) {
            expect([0, 1]).toContain(cell);
            prastaraTotal += cell;
          }
        }
        expect(prastaraTotal).toBe(expectedTotals[p]);
      }

      // 2. Verify SAV
      expect(body.sav).toBeDefined();
      expect(body.sav.grandTotal).toBe(337);
      let savSignSum = 0;
      for (let s = 1; s <= 12; s++) {
        savSignSum += body.sav.signs[s];
        const perSign = planets.reduce((acc, p) => acc + body.bav[p].signs[s], 0);
        expect(body.sav.signs[s]).toBe(perSign);
      }
      expect(savSignSum).toBe(337);

      // 3. Verify Shodhana & Shodhya Pinda
      expect(body.shodhana).toBeDefined();
      expect(body.pinda).toBeDefined();
      for (const p of planets) {
        const sh = body.shodhana[p];
        expect(sh).toBeDefined();
        expect(sh.planet).toBe(p);
        expect(sh.trikonaReduced).toHaveLength(12);
        expect(sh.ekadhipatyaReduced).toHaveLength(12);
        expect(sh.totalTrikonaPoints).toBeLessThanOrEqual(expectedTotals[p]);
        expect(sh.totalEkadhipatyaPoints).toBeLessThanOrEqual(sh.totalTrikonaPoints);

        const pinda = body.pinda[p];
        expect(pinda).toBeDefined();
        expect(pinda.planet).toBe(p);
        expect(pinda.rashiPinda).toBeGreaterThanOrEqual(0);
        expect(pinda.grahaPinda).toBeGreaterThanOrEqual(0);
        expect(pinda.shodhyaPinda).toBe(pinda.rashiPinda + pinda.grahaPinda);
      }
      // Kakshya divisions are a transit (Gochara) concept in the engine; they are
      // verified in gochara.test.ts via gocharaKakshas.
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
      // No ASHTAKAVARGA entry exists in the engine ConventionRegistry yet (pending spec content).
      const body = JSON.parse(response.payload).data;
      expect(body.conventions.ashtakavarga).toBeDefined();
      expect(body.conventions.ashtakavarga.subsystem).toBe('Ashtakavarga Engine');
      expect(body.conventions.ashtakavarga.tradition).toBe('Brihat Parashara Hora Shastra');
      expect(body.conventions.ashtakavarga.specialRules.length).toBeGreaterThan(0);
    });
  });
});
