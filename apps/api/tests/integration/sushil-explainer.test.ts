import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Sushil AI Explainer Integration Test Suite', () => {
  let app: FastifyInstance;
  let userToken: string;
  const userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const profileId = '11111111-1111-1111-1111-111111111111';

  beforeAll(async () => {
    vi.spyOn(prisma.birthProfile, 'findUnique').mockImplementation((async ({ where }: any) => {
      if (where.id === profileId) {
        return {
          id: profileId,
          userId,
          name: 'Explainer Test User',
          dateOfBirth: '1992-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
          placeName: 'New Delhi, India',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return null;
    }) as any);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  headline: 'Strong Leadership and Analytical Mind',
                  message: 'Your Ascendant in Leo gives you natural confidence and warmth. The Sun in the 10th house enhances career success.',
                  keyPoints: [
                    'Leo Ascendant gives charisma and natural leadership.',
                    'Sun in 10th House supports career achievements.',
                    'Maintain patience in daily communications.'
                  ],
                  disclaimer: 'AI Sushil Sir interpretation based on calculated chart data.',
                }),
              },
            },
          ],
        }),
      })
    );

    app = await buildApp();
    await app.ready();

    userToken = app.jwt.sign({ sub: userId, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('1. POST /api/v1/jyoti/explain requires authentication (401 for unauthenticated request)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      payload: {
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
        context: {
          astrologyData: { ascendant: { sign: 'Leo' } },
        },
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('2. POST /api/v1/jyoti/explain returns structured explanation for valid birth_chart payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
        purpose: 'Explain natal chart placements',
        context: {
          astrologyData: {
            ascendant: { sign: 'Leo', degree: 14.2 },
            planets: [
              { name: 'Sun', sign: 'Taurus', house: 10 },
              { name: 'Moon', sign: 'Capricorn', house: 6 },
            ],
          },
          importantValues: {
            lagna: 'Leo',
          },
          userProfileContext: {
            name: 'Explainer Test User',
          },
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(typeof body.data.headline).toBe('string');
    expect(typeof body.data.message).toBe('string');
    expect(Array.isArray(body.data.keyPoints)).toBe(true);
    expect(body.data.keyPoints.length).toBeGreaterThan(0);
    expect(body.data.disclaimer).toBeDefined();
  });

  it('3. POST /api/v1/jyoti/explain rejects unsupported feature with 400 validation error', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        feature: 'unsupported_magic_feature',
        screenTitle: 'Magic Feature',
        context: {
          astrologyData: { some: 'data' },
        },
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('4. POST /api/v1/jyoti/explain rejects missing context.astrologyData with 400 error', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        feature: 'shadbala',
        screenTitle: 'Planetary Strength',
        context: {},
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('5. POST /api/v1/jyoti/explain handles empty astrologyData object gracefully without crash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        feature: 'ashtakavarga',
        screenTitle: 'Ashtakavarga',
        context: {
          astrologyData: {},
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.data.headline).toContain('No Chart Data');
    expect(body.data.message).toContain("There isn't enough astrological information");
  });

  it('6. POST /api/v1/jyoti/explain handles vimshottari_dasha and shadbala features', async () => {
    const dashaRes = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        feature: 'vimshottari_dasha',
        screenTitle: 'Vimshottari Dasha',
        context: {
          astrologyData: {
            currentMahadasha: 'Jupiter',
            currentAntardasha: 'Saturn',
            startDate: '2023-01-01',
            endDate: '2025-06-01',
          },
        },
      },
    });

    expect(dashaRes.statusCode).toBe(200);
    const dashaBody = JSON.parse(dashaRes.payload);
    expect(dashaBody.data.headline).toBeDefined();

    const shadbalaRes = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        feature: 'shadbala',
        screenTitle: 'Planetary Strength',
        context: {
          astrologyData: {
            scores: { Sun: 6.2, Moon: 7.1, Mars: 5.8 },
          },
        },
      },
    });

    expect(shadbalaRes.statusCode).toBe(200);
    const shadbalaBody = JSON.parse(shadbalaRes.payload);
    expect(shadbalaBody.data.headline).toBeDefined();
  });

  it('7. POST /api/v1/jyoti/explain supports course lessons, consultation prep, and shop products', async () => {
    // A. Course Lesson
    const courseRes = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        feature: 'course_lesson',
        screenTitle: 'Lesson: Introduction of Astrology',
        context: {
          astrologyData: {
            courseTitle: 'Gupt Nadi Astrology',
            lessonTitle: 'Introduction of Astrology',
            keyConcepts: ['Zodiac wheel', 'Planetary energies', 'Nadi sutras'],
          },
        },
      },
    });
    expect(courseRes.statusCode).toBe(200);
    const courseBody = JSON.parse(courseRes.payload);
    expect(courseBody.data.headline).toBeDefined();

    // B. Consultation Prep
    const consultRes = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        feature: 'consultation_prep',
        screenTitle: 'Consultation Preparation Guidance',
        context: {
          astrologyData: {
            format: 'Video Call Consultation',
            advice: 'Keep exact birth time and top 3 questions ready',
          },
        },
      },
    });
    expect(consultRes.statusCode).toBe(200);

    // C. Shop Product
    const shopRes = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        feature: 'shop_product',
        screenTitle: 'Ancient Ramayana Era- Herb',
        context: {
          astrologyData: {
            title: 'Ancient Ramayana Era- Herb for Unlimited Wealth',
            category: 'PHYSICAL_HERB',
            energization: 'Consecrated during Ravi Pushya Nakshatra in Ayodhya',
          },
        },
      },
    });
    expect(shopRes.statusCode).toBe(200);
  });

  it('8. POST /api/v1/jyoti/explain supports adaptation modes (simple, detailed, practical, next_steps)', async () => {
    for (const mode of ['simple', 'detailed', 'practical', 'next_steps'] as const) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jyoti/explain',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          feature: 'birth_chart',
          screenTitle: 'Birth Chart',
          mode,
          context: {
            astrologyData: { ascendant: { sign: 'Leo' } },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.mode).toBe(mode);
    }
  });

  it('9. POST /api/v1/jyoti/explain supports Hindi language and returns localized fallbacks', async () => {
    // A. Empty data in Hindi
    const emptyHindiRes = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        feature: 'birth_chart',
        screenTitle: 'जन्म कुंडली',
        language: 'hi',
        context: {
          astrologyData: {},
        },
      },
    });

    expect(emptyHindiRes.statusCode).toBe(200);
    const emptyBody = JSON.parse(emptyHindiRes.payload);
    expect(emptyBody.data.language).toBe('hi');
    expect(emptyBody.data.headline).toContain('कोई कुंडली डेटा नहीं');
    expect(emptyBody.data.message).toContain('पर्याप्त ज्योतिषीय जानकारी उपलब्ध नहीं है');

    // B. Normal data in Hindi
    const validHindiRes = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        feature: 'planets',
        screenTitle: 'ग्रह स्थिति',
        language: 'hi',
        context: {
          astrologyData: { planets: [{ name: 'Sun', sign: 'Leo' }] },
        },
      },
    });

    expect(validHindiRes.statusCode).toBe(200);
    const validBody = JSON.parse(validHindiRes.payload);
    expect(validBody.data.language).toBe('hi');
  });

  it('10. POST /api/v1/jyoti/explain enforces profile ownership and rejects cross-user access (403)', async () => {
    const otherUserToken = app.jwt.sign({ sub: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role: 'USER' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/explain',
      headers: { authorization: `Bearer ${otherUserToken}` },
      payload: {
        feature: 'birth_chart',
        screenTitle: 'Birth Chart',
        birthProfileId: profileId, // Owned by userId 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        context: {
          astrologyData: { ascendant: { sign: 'Leo' } },
        },
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('FORBIDDEN');
  });
});
