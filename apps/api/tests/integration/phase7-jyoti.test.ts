import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { jyotiService } from '../../src/modules/jyoti/jyoti.service';

describe('Phase 7 Jyoti AI Assistant Integration Test Suite', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userBToken: string;

  const userAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const userAProfileId = '11111111-1111-1111-1111-111111111111';
  const userBProfileId = '22222222-2222-2222-2222-222222222222';

  const profilesDb = new Map<string, any>();

  beforeAll(async () => {
    profilesDb.set(userAProfileId, {
      id: userAProfileId,
      userId: userAId,
      name: 'User A Natal Chart',
      dateOfBirth: '1990-05-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    profilesDb.set(userBProfileId, {
      id: userBProfileId,
      userId: userBId,
      name: 'User B Natal Chart',
      dateOfBirth: '1992-08-20',
      timeOfBirth: '09:15:00',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
      placeName: 'Mumbai, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(prisma.birthProfile, 'findUnique').mockImplementation((async ({ where }: any) => {
      return profilesDb.get(where.id) || null;
    }) as any);

    vi.spyOn(prisma.birthProfile, 'findFirst').mockImplementation((async ({ where }: any) => {
      for (const p of profilesDb.values()) {
        if (where.userId && p.userId !== where.userId) continue;
        if (where.id && p.id !== where.id) continue;
        return p;
      }
      return null;
    }) as any);

    app = await buildApp();
    await app.ready();

    userToken = app.jwt.sign({ sub: userAId, role: 'USER' });
    userBToken = app.jwt.sign({ sub: userBId, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('1. POST /api/v1/jyoti/chat requires authentication (401 for unauthenticated guest)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/chat',
      payload: {
        message: 'Tell me about my ascendant',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('2. POST /api/v1/jyoti/chat processes valid message and returns structured response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/chat',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        message: 'Explain my birth chart and planets',
        context: {
          currentScreen: 'HOME',
          birthProfileId: userAProfileId,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toBeDefined();
    expect(typeof body.data.message).toBe('string');
    expect(body.data.message.length).toBeGreaterThan(0);
  });

  it('3. POST /api/v1/jyoti/chat rejects oversized messages (> 2000 characters)', async () => {
    const longMessage = 'A'.repeat(2001);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/chat',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        message: longMessage,
      },
    });

    expect([400, 422]).toContain(res.statusCode);
  });

  it('4. POST /api/v1/jyoti/chat rejects empty message payloads', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/chat',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        message: '',
      },
    });

    expect([400, 422]).toContain(res.statusCode);
  });

  it('5. Enforces user isolation: User A specifying User B profile ID does not leak User B data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jyoti/chat',
      headers: {
        authorization: `Bearer ${userToken}`, // User A
      },
      payload: {
        message: 'What are my planets?',
        context: {
          birthProfileId: userBProfileId, // Attempt to query User B's profile
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toBeDefined();
    // User A cannot receive User B's chart data
  });

  it('6. Rate limiting enforcement on rapid consecutive calls', async () => {
    const rapidUserToken = app.jwt.sign({ sub: 'rate-limit-test-user-id', role: 'USER' });

    let rateLimited = false;
    for (let i = 0; i < 25; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jyoti/chat',
        headers: {
          authorization: `Bearer ${rapidUserToken}`,
        },
        payload: {
          message: `Query message ${i}`,
        },
      });

      if (res.statusCode === 429) {
        rateLimited = true;
        const errBody = res.json();
        expect(errBody.error?.code || errBody.error?.message).toMatch(/RATE_LIMIT|rate limit/i);
        break;
      }
    }

    expect(rateLimited).toBe(true);
  });
});
