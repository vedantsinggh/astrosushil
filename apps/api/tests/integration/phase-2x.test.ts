import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Phase 2X Advanced Astrological Subsystems Integration Tests', () => {
  let app: FastifyInstance;

  const validBirthDetails = {
    name: 'Rohit Sharma',
    dateOfBirth: '1987-04-30',
    timeOfBirth: '12:00:00',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    placeName: 'Mumbai, India',
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/astrology/chart-variants returns valid variant and special lagnas', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart-variants',
      payload: {
        birthDetails: validBirthDetails,
        variantType: 'SUN_CHART',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.variant).toBeDefined();
    expect(body.variant.variantType).toBe('SUN_CHART');
    expect(body.specialLagnas.BHAVA_LAGNA).toBeDefined();
    expect(body.specialLagnas.HORA_LAGNA).toBeDefined();
    expect(body.specialLagnas.GHATIKA_LAGNA).toBeDefined();
    expect(body.specialLagnas.INDU_LAGNA).toBeDefined();
  });

  it('POST /api/v1/astrology/jaimini returns Chara Karakas, Arudhas, and Rashi Drishti', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/jaimini',
      payload: {
        birthDetails: validBirthDetails,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.jaimini.charaKarakas7.length).toBe(7);
    expect(body.jaimini.charaKarakas8.length).toBe(8);
    expect(body.jaimini.atmakaraka).toBeDefined();
    expect(body.jaimini.darakaraka).toBeDefined();
    expect(body.jaimini.arudhaPadas.length).toBe(12);
    expect(body.jaimini.rashiDrishti.length).toBe(12);
  });

  it('POST /api/v1/astrology/kp returns Star/Sub/Sub-sub lords, 4-Level Significators, and Ruling planets', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/kp',
      payload: {
        birthDetails: validBirthDetails,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.kp.planets.SUN.subLord).toBeDefined();
    expect(body.kp.cusps.length).toBe(12);
    expect(body.kp.significators.length).toBe(12);
    expect(body.kp.rulingPlanets.dayLord).toBeDefined();
  });

  it('POST /api/v1/astrology/varshaphala returns Muntha, Varshesha, and Panchadhikari', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/varshaphala',
      payload: {
        birthDetails: validBirthDetails,
        targetYear: 2026,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.varshaphala.targetYear).toBe(2026);
    expect(body.varshaphala.munthaRashiIndex).toBeGreaterThanOrEqual(1);
    expect(body.varshaphala.munthaRashiIndex).toBeLessThanOrEqual(12);
    expect(body.varshaphala.panchadhikari.munthaLord).toBeDefined();
    expect(body.varshaphala.varshesha).toBeDefined();
  });

  it('POST /api/v1/astrology/prashna returns horary chart, Karya Lord, and Tajika aspects', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/prashna',
      payload: {
        birthDetails: validBirthDetails,
        questionDomain: 'CAREER',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.prashna.questionDomain).toBe('CAREER');
    expect(body.prashna.karyaHouseNumber).toBe(10);
    expect(body.prashna.lagnaLord).toBeDefined();
    expect(body.prashna.karyaLord).toBeDefined();
  });

  it('POST /api/v1/astrology/planetary-intelligence returns Avasthas, Argala, Rays, and Sensitive points', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/planetary-intelligence',
      payload: {
        birthDetails: validBirthDetails,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.planetaryIntelligence.avasthas.SUN.baladiAvastha).toBeDefined();
    expect(body.planetaryIntelligence.argalaList.length).toBeGreaterThan(0);
    expect(body.planetaryIntelligence.totalRays).toBeGreaterThan(0);
    expect(body.planetaryIntelligence.mrityuBhagaList.length).toBeGreaterThan(0);
    expect(body.planetaryIntelligence.sensitivePoints.sixtyFourthNavamsha).toBeDefined();
    expect(body.planetaryIntelligence.sensitivePoints.twentySecondDrekkana).toBeDefined();
  });

  it('POST /api/v1/astrology/chakras returns 9 Navataras, Avakhada, Ghat, Rahu Kala, and Sade Sati', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chakras',
      payload: {
        birthDetails: validBirthDetails,
        transitSaturnRashiIndex: 11,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.chakras.taraChakra.length).toBe(27);
    expect(body.chakras.avakhadaChakra.varna).toBeDefined();
    expect(body.chakras.ghatChakra.ghatakRashi).toBeDefined();
    expect(body.chakras.rahuKala.startLocalTime).toBeDefined();
    expect(body.chakras.sadeSati.status).toBeDefined();
  });

  it('POST /api/v1/astrology/special-points returns Aprakash Grahas, Upagrahas, Yogi/Avyogi, and Outer Planets', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/special-points',
      payload: {
        birthDetails: validBirthDetails,
        dayOfWeek: 4, // Thursday
        isDaytime: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.specialPoints.aprakashGrahas.dhuma.name).toBe('Dhuma');
    expect(body.specialPoints.aprakashGrahas.vyatipata.name).toBe('Vyatipata');
    expect(body.specialPoints.aprakashGrahas.parivesha.name).toBe('Parivesha');
    expect(body.specialPoints.aprakashGrahas.indrachapa.name).toBe('Indrachapa');
    expect(body.specialPoints.aprakashGrahas.upaketu.name).toBe('Upaketu');

    expect(body.specialPoints.upagrahas.gulika.name).toBe('Gulika');
    expect(body.specialPoints.upagrahas.mandi.name).toBe('Mandi');
    expect(body.specialPoints.yogiAvyogi.yogiLongitude).toBeGreaterThanOrEqual(0);
    expect(body.specialPoints.yogiAvyogi.avyogiLongitude).toBeGreaterThanOrEqual(0);
  });

  it('POST /api/v1/astrology/vimshopaka-bala returns 4 classical schemes', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/vimshopaka-bala',
      payload: {
        birthDetails: validBirthDetails,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.vimshopakaBala.SUN.scores.shodashvarga).toBeGreaterThanOrEqual(0);
    expect(body.vimshopakaBala.SUN.scores.shodashvarga).toBeLessThanOrEqual(20);
  });

  it('GET /api/v1/astrology/conventions returns central metadata registry', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/conventions',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.conventions.canonicalChart.tradition).toBeDefined();
    expect(body.conventions.vargaEngine.tradition).toBeDefined();
    expect(body.conventions.jaiminiEngine.tradition).toBeDefined();
    expect(body.conventions.kpEngine.tradition).toBeDefined();
    expect(body.conventions.varshaphalaPrashna.tradition).toBeDefined();
  });

  it('Serialization & Determinism Audit: no NaN, no null keys, 100% deterministic identical outputs', async () => {
    // Run twice with identical input
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/jaimini',
      payload: { birthDetails: validBirthDetails },
    });
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/jaimini',
      payload: { birthDetails: validBirthDetails },
    });

    expect(res1.payload).toBe(res2.payload);
    expect(res1.payload).not.toContain('NaN');
    expect(res1.payload).not.toContain('null:');
    expect(res1.payload).not.toContain('undefined');
  });
});
