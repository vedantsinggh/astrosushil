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

  describe('POST /api/v1/astrology/shadbala', () => {
    it('calculates six-fold Shadbala for all 7 physical Grahas with valid response structure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/shadbala',
        payload: {
          birthDetails: validBirthDetails,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.planets).toBeDefined();
      expect(body.rankedPlanets).toBeDefined();
      expect(body.rankedPlanets.length).toBe(7);
      expect(body.strongestPlanet).toBeDefined();
      expect(body.weakestPlanet).toBeDefined();

      const planets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
      for (const planet of planets) {
        const p = body.planets[planet];
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
        expect(p.sthanaBala.ucchaBala).toBeGreaterThanOrEqual(0);
        expect(p.sthanaBala.saptavargajaBala).toBeGreaterThanOrEqual(0);
        expect(p.sthanaBala.ojayugmarashiamshaBala).toBeGreaterThanOrEqual(0);
        expect(p.sthanaBala.kendraBala).toBeGreaterThanOrEqual(0);
        expect(p.sthanaBala.drekkanaBala).toBeGreaterThanOrEqual(0);

        // Subcomponents of Kala Bala
        expect(p.kalaBala.natonnathaBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.pakshaBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.tribhagaBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.varshaMasaDinaHoraBala).toBeGreaterThanOrEqual(0);
        expect(p.kalaBala.ayanaBala).toBeGreaterThanOrEqual(0);

        // Totals and thresholds
        expect(p.totalVirupas).toBeGreaterThan(0);
        expect(p.totalRupas).toBeGreaterThan(0);
        expect(p.minimumRequiredRupas).toBeGreaterThan(0);
        expect(p.shadbalaRatio).toBeGreaterThan(0);
        expect(typeof p.isStrong).toBe('boolean');
        expect(p.rank).toBeGreaterThanOrEqual(1);
        expect(p.rank).toBeLessThanOrEqual(7);
      }
    });

    it('returns 400 when invalid birth details are provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/shadbala',
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

  describe('POST /api/v1/astrology/bhava-bala', () => {
    it('calculates Bhava Bala for all 12 houses with valid response structure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/bhava-bala',
        payload: {
          birthDetails: validBirthDetails,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.houses).toBeDefined();
      expect(body.houses.length).toBe(12);
      expect(body.strongestHouse).toBeGreaterThanOrEqual(1);
      expect(body.strongestHouse).toBeLessThanOrEqual(12);
      expect(body.weakestHouse).toBeGreaterThanOrEqual(1);
      expect(body.weakestHouse).toBeLessThanOrEqual(12);

      for (let h = 1; h <= 12; h++) {
        const bhava = body.houses.find((item: any) => item.houseNumber === h);
        expect(bhava).toBeDefined();
        expect(bhava.houseNumber).toBe(h);
        expect(bhava.rashiIndex).toBeGreaterThanOrEqual(1);
        expect(bhava.rashiIndex).toBeLessThanOrEqual(12);
        expect(bhava.sign).toBeDefined();
        expect(bhava.lord).toBeDefined();

        expect(bhava.bhavaadhipatiBala).toBeGreaterThan(0);
        expect(bhava.bhavaDigBala).toBeGreaterThanOrEqual(0);
        expect(typeof bhava.bhavaDrishtiBala).toBe('number');
        expect(typeof bhava.bhavaOccupantBala).toBe('number');

        expect(bhava.totalVirupas).toBeGreaterThan(0);
        expect(bhava.totalRupas).toBeGreaterThan(0);
        expect(bhava.rank).toBeGreaterThanOrEqual(1);
        expect(bhava.rank).toBeLessThanOrEqual(12);
      }
    });

    it('returns 400 when neither birthProfileId nor birthDetails is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/bhava-bala',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/astrology/conventions', () => {
    it('includes shadbala_bhavabala convention in registry response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/astrology/conventions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.conventions.shadbalaBhavabala).toBeDefined();
      expect(body.conventions.shadbalaBhavabala.subsystem).toBe('Shadbala and Bhava Bala Strength Engine');
      expect(body.conventions.shadbalaBhavabala.tradition).toBe('Brihat Parashara Hora Shastra');
      expect(body.conventions.shadbalaBhavabala.specialRules.length).toBeGreaterThan(0);
    });
  });
});
