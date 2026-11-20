import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';

describe('Phase 2C Shadbala & Bhava Bala API Integration Tests', () => {
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

  // Shadbala and Bhava Bala are served together by the unified POST /api/v1/astrology/strength
  // endpoint (what the mobile client calls). The legacy /shadbala and /bhava-bala paths were
  // consolidated and are not mounted.
  describe('POST /api/v1/astrology/strength (Shadbala)', () => {
    it('calculates six-fold Shadbala for all 7 physical Grahas with valid response structure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/strength',
        payload: {
          birthDetails: validBirthDetails,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;

      expect(body.birthDetails).toBeDefined();
      const shadbala = body.shadbala;
      expect(shadbala.planets).toBeDefined();
      // summary = planets ranked strongest -> weakest
      expect(shadbala.summary).toBeDefined();
      expect(shadbala.summary.length).toBe(7);
      expect(shadbala.summary.map((p: any) => p.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      for (let i = 1; i < shadbala.summary.length; i++) {
        expect(shadbala.summary[i - 1].ratio).toBeGreaterThanOrEqual(shadbala.summary[i].ratio);
      }

      const planets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
      for (const planet of planets) {
        const p = shadbala.planets[planet];
        expect(p).toBeDefined();
        expect(p.planet).toBe(planet);

        // All 6 Shadbala primary components
        expect(p.sthanaBala.total).toBeGreaterThanOrEqual(0);
        expect(p.digBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.total).toBeGreaterThanOrEqual(0);
        expect(p.cheshtaBala).toBeGreaterThanOrEqual(0);
        expect(p.naisargikaBala).toBeGreaterThan(0);
        expect(typeof p.drikBala).toBe('number');

        // Subcomponents of Sthana Bala
        expect(p.sthanaBala.uchchaBala).toBeGreaterThanOrEqual(0);
        expect(p.sthanaBala.saptavargajaBala).toBeGreaterThanOrEqual(0);
        expect(p.sthanaBala.ojhayugmaBala).toBeGreaterThanOrEqual(0);
        expect(p.sthanaBala.kendradiBala).toBeGreaterThanOrEqual(0);
        expect(p.sthanaBala.drekkanaBala).toBeGreaterThanOrEqual(0);

        // Subcomponents of Kala Bala
        expect(p.kalaBala.nathonnathaBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.pakshaBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.tribhagaBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.varaBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.horaBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.ayanaBala).toBeGreaterThanOrEqual(0);

        // Totals and thresholds (Shashtiamsas = Virupas; 60 Shashtiamsas = 1 Rupa)
        expect(p.totalShashtiamsas).toBeGreaterThan(0);
        expect(p.totalRupas).toBeGreaterThan(0);
        expect(p.totalRupas).toBeCloseTo(p.totalShashtiamsas / 60, 3);
        expect(p.minimumRequirementRupas).toBeGreaterThan(0);
        expect(p.ratio).toBeGreaterThan(0);
        expect(typeof p.isStrong).toBe('boolean');
        expect(p.isStrong).toBe(p.ratio >= 1);
        expect(p.rank).toBeGreaterThanOrEqual(1);
        expect(p.rank).toBeLessThanOrEqual(7);
      }
    });

    it('returns 400 when invalid birth details are provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/strength',
        payload: {
          birthDetails: {
            ...validBirthDetails,
            latitude: 195, // invalid latitude
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/astrology/strength (Bhava Bala)', () => {
    it('calculates Bhava Bala for all 12 houses with valid response structure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/strength',
        payload: {
          birthDetails: validBirthDetails,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;

      expect(body.birthDetails).toBeDefined();
      const houses = body.bhavaBala.houses;
      expect(houses).toBeDefined();
      expect(houses.length).toBe(12);
      expect([...houses.map((h: any) => h.rank)].sort((x: number, y: number) => x - y)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);

      for (let h = 1; h <= 12; h++) {
        const bhava = houses.find((item: any) => item.houseNumber === h);
        expect(bhava).toBeDefined();
        expect(bhava.houseNumber).toBe(h);
        expect(bhava.rashiIndex).toBeGreaterThanOrEqual(1);
        expect(bhava.rashiIndex).toBeLessThanOrEqual(12);
        expect(bhava.sign).toBeDefined();
        expect(bhava.lord).toBeDefined();

        expect(bhava.bhavadhipatiBala).toBeGreaterThan(0);
        expect(bhava.bhavaDigBala).toBeGreaterThanOrEqual(0);
        expect(typeof bhava.bhavaDrishtiBala).toBe('number');
        expect(typeof bhava.bhavaOccupantBala).toBe('number');

        expect(bhava.totalShashtiamsas).toBeGreaterThan(0);
        expect(bhava.totalRupas).toBeGreaterThan(0);
        expect(bhava.rank).toBeGreaterThanOrEqual(1);
        expect(bhava.rank).toBeLessThanOrEqual(12);
      }

      const strongest = houses.find((item: any) => item.rank === 1);
      const weakest = houses.find((item: any) => item.rank === 12);
      for (const bhava of houses) {
        expect(strongest.totalShashtiamsas).toBeGreaterThanOrEqual(bhava.totalShashtiamsas);
        expect(weakest.totalShashtiamsas).toBeLessThanOrEqual(bhava.totalShashtiamsas);
      }
    });

    it('returns 400 when neither birthProfileId nor birthDetails is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/strength',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/astrology/conventions', () => {
    it('exposes the Parashara convention that governs Shadbala in the registry response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/astrology/conventions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;
      const parashara = body.conventions.PARASHARA;
      expect(parashara).toBeDefined();
      expect(parashara.subsystem).toBe('Vedic Parashara Foundations');
      expect(parashara.tradition).toBe('Brihat Parashara Hora Shastra (BPHS)');
      expect(parashara.description).toContain('Shadbala');
      expect(parashara.authoritativeSources).toContain('Brihat Parashara Hora Shastra');
      expect(parashara.zodiac).toBe('SIDEREAL');
      expect(parashara.ayanamsa).toBe('LAHIRI');
    });
  });
});
