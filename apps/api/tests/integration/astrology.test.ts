import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Astrology API Endpoints Integration Tests (Phase 3)', () => {
  let app: FastifyInstance;

  // In-memory profiles mock database
  const profilesDb = new Map<string, any>();

  const user1Id = '11111111-1111-1111-1111-111111111111';
  const user2Id = '22222222-2222-2222-2222-222222222222';
  let user1Token: string;
  let user2Token: string;

  const user1ProfileId = '33333333-3333-3333-3333-333333333333';
  const user2ProfileId = '44444444-4444-4444-4444-444444444444';

  beforeAll(async () => {
    // Populate mock DB
    profilesDb.set(user1ProfileId, {
      id: user1ProfileId,
      userId: user1Id,
      name: 'User 1 Profile',
      dateOfBirth: '1990-05-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    profilesDb.set(user2ProfileId, {
      id: user2ProfileId,
      userId: user2Id,
      name: 'User 2 Profile',
      dateOfBirth: '1992-08-20',
      timeOfBirth: '09:15:00',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
      placeName: 'Mumbai, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (vi.spyOn(prisma.birthProfile, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return profilesDb.get(where.id) || null;
    });

    app = buildApp();
    await app.ready();

    user1Token = (app as any).jwt.sign({ sub: user1Id, role: 'USER' });
    user2Token = (app as any).jwt.sign({ sub: user2Id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // 1. AUTHENTICATION & AUTHORIZATION TESTS
  it('POST /api/v1/astrology/chart should return 401 when request is unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      payload: { birthProfileId: user1ProfileId },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('POST /api/v1/astrology/chart should DENY User 2 from calculating chart for User 1 birth profile (404 NOT_FOUND)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user2Token}` },
      payload: { birthProfileId: user1ProfileId },
    });

    expect(response.statusCode).toBe(404); // Ownership guard: 404 to prevent ID enumeration
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Birth profile not found');
  });

  // 2. REQUEST VALIDATION TESTS
  it('POST /api/v1/astrology/chart should return 400 VALIDATION_ERROR for missing birthProfileId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/astrology/chart should return 400 VALIDATION_ERROR for malformed non-UUID birthProfileId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: 'invalid-non-uuid-string' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/astrology/chart should return 404 NOT_FOUND for nonexistent birthProfileId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: '99999999-9999-9999-9999-999999999999' },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // 3. CALCULATION & CONTRACT INTEGRATION TESTS
  it('POST /api/v1/astrology/chart should calculate AstroChart for authenticated user owner', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: user1ProfileId },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    expect(body.chart).toBeDefined();
    expect(body.chart.calculationVersion).toBe('0.1.0');
    expect(body.chart.providerName).toBeDefined();

    // Verify Contract Integrity & Accuracy:
    // User 1 birth profile (1990-05-15 14:30:00 Asia/Kolkata) -> 1990-05-15T09:00:00.000Z UTC
    expect(body.chart.normalizedTime.utcIsoString).toBe('1990-05-15T09:00:00.000Z');
    expect(body.chart.normalizedTime.timezoneOffsetMinutes).toBe(330);
    expect(body.chart.normalizedTime.julianDayUT).toBeCloseTo(2448026.875, 4);

    // Verify Config Metadata
    expect(body.chart.config.zodiacType).toBe('SIDEREAL');
    expect(body.chart.config.ayanamsa).toBe('LAHIRI');
    expect(body.chart.config.houseSystem).toBe('WHOLE_SIGN');

    // Verify Planets Array Data Vector
    expect(Array.isArray(body.chart.planets)).toBe(true);
    expect(body.chart.planets.length).toBeGreaterThanOrEqual(9);

    const sun = body.chart.planets.find((p: any) => p.planet === 'SUN');
    expect(sun).toBeDefined();
    expect(sun.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(sun.rashiIndex).toBeLessThanOrEqual(12);
    expect(sun.nakshatraIndex).toBeGreaterThanOrEqual(1);
    expect(sun.nakshatraIndex).toBeLessThanOrEqual(27);
    expect(sun.pada).toBeGreaterThanOrEqual(1);
    expect(sun.pada).toBeLessThanOrEqual(4);
  });

  // 4. DASHA ENDPOINT TEST
  it('POST /api/v1/astrology/dasha should calculate Vimshottari Dasha tree', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/dasha',
      payload: {
        birthDetails: {
          name: 'Aarav',
          dateOfBirth: '1995-08-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.2090,
          timezone: 'Asia/Kolkata',
        },
        maxLevel: 2,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.dashaTree).toBeDefined();
    expect(body.data.dashaTree.mahadashas).toHaveLength(9);
    // Mahadasha 0 is birth Dasha (partially elapsed with remaining active subPeriods)
    expect(body.data.dashaTree.mahadashas[0].subPeriods.length).toBeGreaterThan(0);
    // Subsequent full Mahadasha has all 9 subPeriods
    expect(body.data.dashaTree.mahadashas[1].subPeriods).toHaveLength(9);
  });

  it('POST /api/v1/astrology/dasha should calculate Ashtottari Dasha tree', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/dasha',
      payload: {
        birthDetails: {
          name: 'Aarav',
          dateOfBirth: '1995-08-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.2090,
          timezone: 'Asia/Kolkata',
        },
        dashaSystem: 'ASHTOTTARI',
        maxLevel: 2,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.dashaTree).toBeDefined();
    expect(body.data.dashaTree.dashaSystem).toBe('ASHTOTTARI');
    expect(body.data.dashaTree.eligibility).toBeDefined();
    expect(typeof body.data.dashaTree.eligibility.isEligible).toBe('boolean');
    if (body.data.dashaTree.eligibility.isEligible) {
      expect(body.data.dashaTree.totalCycleYears).toBe(108);
      expect(body.data.dashaTree.mahadashas).toHaveLength(8);
    }
  });

  it('POST /api/v1/astrology/dashas should calculate Dasha periods via plural alias', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/dashas',
      payload: {
        birthDetails: {
          name: 'Aarav',
          dateOfBirth: '1995-08-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.2090,
          timezone: 'Asia/Kolkata',
        },
        dashaSystem: 'VIMSHOTTARI',
        maxLevel: 1,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.dashaTree).toBeDefined();
    expect(body.data.dashaTree.dashaSystem).toBe('VIMSHOTTARI');
    expect(body.data.dashaTree.mahadashas).toHaveLength(9);
  });

  // 5. PANCHANG ENDPOINT TEST
  it('POST /api/v1/astrology/panchang should calculate daily Panchang elements', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/panchang',
      payload: {
        dateOfBirth: '2026-08-24',
        timeOfBirth: '12:00:00',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.panchang).toBeDefined();
    expect(body.data.panchang.tithi).toBeDefined();
    expect(body.data.panchang.vara).toBeDefined();
    expect(body.data.panchang.nakshatra).toBeDefined();
    expect(body.data.panchang.yoga).toBeDefined();
    expect(body.data.panchang.karana).toBeDefined();
  });

  // 6. VARGAS ENDPOINT TEST
  it('POST /api/v1/astrology/vargas should calculate Divisional Charts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/vargas',
      payload: {
        birthDetails: {
          name: 'Aarav',
          dateOfBirth: '1995-08-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.2090,
          timezone: 'Asia/Kolkata',
        },
        vargaTypes: ['D1', 'D9', 'D10'],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.vargas).toHaveLength(3);
    expect(body.data.vargas[0].vargaType).toBe('D1');
    expect(body.data.vargas[1].vargaType).toBe('D9');
    expect(body.data.vargas[2].vargaType).toBe('D10');
  });

  // 7. MATCHMAKING ENDPOINT TEST
  it('POST /api/v1/astrology/matchmaking should evaluate Ashtakoota score and Manglik status', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/matchmaking',
      payload: {
        boy: {
          birthDetails: {
            name: 'Boy',
            dateOfBirth: '1992-05-10',
            timeOfBirth: '10:00:00',
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: 'Asia/Kolkata',
          },
        },
        girl: {
          birthDetails: {
            name: 'Girl',
            dateOfBirth: '1994-08-20',
            timeOfBirth: '18:30:00',
            latitude: 19.0760,
            longitude: 72.8777,
            timezone: 'Asia/Kolkata',
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.compatibility).toBeDefined();
    expect(body.data.compatibility.ashtakoota.totalMaxPoints).toBe(36);
    expect(body.data.compatibility.ashtakoota.kootas.varna).toBeDefined();
    expect(body.data.compatibility.ashtakoota.kootas.vashya).toBeDefined();
    expect(body.data.compatibility.ashtakoota.kootas.tara).toBeDefined();
    expect(body.data.compatibility.ashtakoota.kootas.yoni).toBeDefined();
    expect(body.data.compatibility.ashtakoota.kootas.grahaMaitri).toBeDefined();
    expect(body.data.compatibility.ashtakoota.kootas.gana).toBeDefined();
    expect(body.data.compatibility.ashtakoota.kootas.bhakoot).toBeDefined();
    expect(body.data.compatibility.ashtakoota.kootas.nadi).toBeDefined();
    expect(body.data.compatibility.manglikComparison).toBeDefined();
  });

  // 8. COMPATIBILITY ENDPOINT TEST
  it('POST /api/v1/astrology/compatibility should evaluate deterministic compatibility with full Ashtakoota and Mangal comparison', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/compatibility',
      payload: {
        personA: {
          birthDetails: {
            name: 'Aarav (Person A)',
            dateOfBirth: '1990-05-15',
            timeOfBirth: '14:30:00',
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: 'Asia/Kolkata',
          },
        },
        personB: {
          birthDetails: {
            name: 'Priya (Person B)',
            dateOfBirth: '1992-08-20',
            timeOfBirth: '09:15:00',
            latitude: 19.0760,
            longitude: 72.8777,
            timezone: 'Asia/Kolkata',
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.personA).toBeDefined();
    expect(body.data.personB).toBeDefined();
    expect(body.data.compatibility).toBeDefined();
    expect(body.data.compatibility.convention.name).toBe('Classical Parashari Ashtakoota Milan');
    expect(body.data.compatibility.convention.totalMaxScore).toBe(36);
    expect(body.data.compatibility.ashtakoota.totalMaxPoints).toBe(36);
    expect(body.data.compatibility.ashtakoota.totalObtainedPoints).toBeGreaterThanOrEqual(0);
    expect(body.data.compatibility.ashtakoota.totalObtainedPoints).toBeLessThanOrEqual(36);
    expect(body.data.compatibility.manglikComparison).toBeDefined();
  });

  // 9. GOCHARA (TRANSIT SNAPSHOT) ENDPOINT TEST
  it('POST /api/v1/astrology/gochara should return deterministic transit snapshot with houses, aspects, and natal relationships', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/gochara',
      payload: {
        timestamp: '2026-03-20T12:00:00Z',
        timezone: 'Asia/Kolkata',
        location: {
          latitude: 28.6139,
          longitude: 77.209,
          placeName: 'New Delhi, India',
        },
        birthDetails: {
          name: 'Natal Subject',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
        vargas: ['D1', 'D9'],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.calculationVersion).toBeDefined();
    expect(body.data.transitChart).toBeDefined();
    expect(body.data.transitChart.ascendant).toBeDefined();
    expect(body.data.transitChart.planets).toBeDefined();
    expect(Object.keys(body.data.transitChart.planets).length).toBe(9);
    expect(body.data.transitChart.houses).toHaveLength(12);
    expect(body.data.transitToLagna).toBeDefined();
    expect(body.data.transitToLagna.length).toBe(9);
    expect(body.data.transitToMoon).toBeDefined();
    expect(body.data.transitToMoon.length).toBe(9);
    expect(body.data.ashtakavargaTransit).toBeDefined();
  });

  // 10. GOCHARA TIMELINE ENDPOINT TEST
  it('POST /api/v1/astrology/gochara/timeline should calculate chronological transit events over date range', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/gochara/timeline',
      payload: {
        startDate: '2026-03-01',
        endDate: '2026-04-15',
        timezone: 'Asia/Kolkata',
        planets: ['SUN', 'MARS'],
        eventTypes: ['SIGN_INGRESS', 'NAKSHATRA_INGRESS'],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.startDateIso).toBe('2026-03-01T00:00:00.000Z');
    expect(body.data.endDateIso).toBe('2026-04-15T00:00:00.000Z');
    expect(body.data.eventCount).toBeGreaterThan(0);
    expect(Array.isArray(body.data.events)).toBe(true);
    expect(body.data.events[0].planet).toBeDefined();
    expect(body.data.events[0].eventType).toBeDefined();
  });

  // 11. YOGAS ENDPOINT TEST
  it('POST /api/v1/astrology/yogas should evaluate deterministic classical Yogas with condition evidence', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/yogas',
      payload: {
        birthDetails: {
          name: 'Yoga Integration Test',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
        varga: 'D1',
        includeUndetected: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.calculationVersion).toBe('0.1.0');
    expect(body.data.varga).toBe('D1');
    expect(body.data.totalEvaluated).toBeGreaterThan(0);
    expect(typeof body.data.detectedCount).toBe('number');
    expect(Array.isArray(body.data.detectedYogas)).toBe(true);
    expect(body.data.detectedYogas.length).toBe(body.data.detectedCount);
  });

  // 12. SPECIAL POINTS ENDPOINT TEST
  it('POST /api/v1/astrology/special-points should calculate Upagrahas, Special Lagnas, and Arishta points', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/special-points',
      payload: {
        birthDetails: {
          name: 'Special Points Test',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.upagrahas).toBeDefined();
    expect(body.data.specialLagnas).toBeDefined();
    expect(body.data.arishtaPoints).toBeDefined();
    expect(body.data.yogiPoints).toBeDefined();
    expect(body.data.mrityuBhaga).toBeDefined();
  });

  // 13. JAIMINI ENDPOINT TEST
  it('POST /api/v1/astrology/jaimini should calculate Chara Karakas, Arudhas, and Karakamsha', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/jaimini',
      payload: {
        birthDetails: {
          name: 'Jaimini Test',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
        scheme: 'SEVEN_KARAKA',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.charaKarakas).toHaveLength(7);
    expect(body.data.arudhaPadas).toHaveLength(12);
    expect(body.data.karakamsha).toBeDefined();
  });

  // 14. KP ENDPOINT TEST
  it('POST /api/v1/astrology/kp should calculate KP Cusps, 4-tier lords, and Significators', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/kp',
      payload: {
        birthDetails: {
          name: 'KP Test',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.cusps).toHaveLength(12);
    expect(body.data.houseSignificators).toHaveLength(12);
    expect(body.data.rulingPlanets).toBeDefined();
    expect(body.data.parsFortuna).toBeDefined();
  });

  // 15. SADE SATI ENDPOINT TEST
  it('POST /api/v1/astrology/sade-sati should evaluate Sade Sati and Dhaiyya status', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/sade-sati',
      payload: {
        birthDetails: {
          name: 'Sade Sati Test',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
        transitSaturnLongitude: 310.0,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(typeof body.data.isSadeSatiActive).toBe('boolean');
    expect(typeof body.data.phase).toBe('string');
  });

  // 16. CHART VARIANTS ENDPOINT TEST
  it('POST /api/v1/astrology/chart-variants should calculate derived chart variants', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart-variants',
      payload: {
        birthDetails: {
          name: 'Variants Test',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.rashi).toBeDefined();
    expect(body.data.sunChart).toBeDefined();
    expect(body.data.moonChart).toBeDefined();
    expect(body.data.karakamshaChart).toBeDefined();
  });

  // 17. AVAKHADA ENDPOINT TEST
  it('POST /api/v1/astrology/avakhada should calculate Avakhada, Ghat, and Tara Chakras', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/avakhada',
      payload: {
        birthDetails: {
          name: 'Avakhada Test',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.avakhada).toBeDefined();
    expect(body.data.ghat).toBeDefined();
    expect(body.data.tara).toBeDefined();
  });

  // 18. VIMSHOPAKA ENDPOINT TEST
  it('POST /api/v1/astrology/vimshopaka should calculate Vimshopaka Bala and Rashmis', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/vimshopaka',
      payload: {
        birthDetails: {
          name: 'Vimshopaka Test',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.planets).toBeDefined();
    expect(body.data.rashmis).toBeDefined();
    expect(body.data.totalChartRays).toBeDefined();
  });
});

