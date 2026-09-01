import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { notificationService } from '../../src/modules/notifications/notification.service';
import { renderNotificationTemplate } from '../../src/modules/notifications/notification.templates';

describe('Phase 9 End-to-End Product Integration Test Suite', () => {
  let app: FastifyInstance;

  // In-memory data store for isolated mock testing
  const usersMap = new Map<string, any>();
  const profilesMap = new Map<string, any>();
  const ordersMap = new Map<string, any>();
  const notificationsMap = new Map<string, any>();
  const preferencesMap = new Map<string, any>();

  const userAId = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
  const userBId = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';
  const adminUserId = '99999999-9999-9999-9999-999999999999';

  let userAToken: string;
  let userBToken: string;
  let adminToken: string;

  const profileAId = 'p1111111-1111-1111-1111-p11111111111';

  beforeAll(async () => {
    // 1. Seed mock users
    usersMap.set(userAId, {
      id: userAId,
      email: 'usera@astrosushil.com',
      fullName: 'User Alpha',
      role: 'USER',
      emailVerified: true,
      createdAt: new Date(),
    });

    usersMap.set(userBId, {
      id: userBId,
      email: 'userb@astrosushil.com',
      fullName: 'User Beta',
      role: 'USER',
      emailVerified: true,
      createdAt: new Date(),
    });

    usersMap.set(adminUserId, {
      id: adminUserId,
      email: 'admin@astrosushil.com',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      createdAt: new Date(),
    });

    // 2. Seed mock birth profile for User A
    profilesMap.set(profileAId, {
      id: profileAId,
      userId: userAId,
      name: 'Alpha Kundli Profile',
      dateOfBirth: '1990-05-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
      gender: 'MALE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Setup Prisma mocks for isolated execution
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.id) return usersMap.get(where.id) || null;
      if (where.email) {
        return Array.from(usersMap.values()).find((u) => u.email === where.email) || null;
      }
      return null;
    });

    vi.spyOn(prisma.birthProfile, 'findUnique').mockImplementation(async ({ where }: any) => {
      return profilesMap.get(where.id) || null;
    });

    vi.spyOn(prisma.birthProfile, 'findMany').mockImplementation(async ({ where }: any) => {
      return Array.from(profilesMap.values()).filter((p) => p.userId === where.userId);
    });

    vi.spyOn(prisma.notification, 'findMany').mockImplementation(async ({ where }: any) => {
      return Array.from(notificationsMap.values()).filter((n) => n.userId === where?.userId);
    });

    vi.spyOn(prisma.notification, 'count').mockImplementation(async ({ where }: any) => {
      if (!where) return notificationsMap.size;
      return Array.from(notificationsMap.values()).filter((n) => {
        if (where.userId && n.userId !== where.userId) return false;
        if (where.readAt === null && n.readAt !== null) return false;
        return true;
      }).length;
    });

    vi.spyOn(prisma.notification, 'create').mockImplementation(async ({ data }: any) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const notif = { id, ...data, createdAt: new Date(), readAt: null };
      notificationsMap.set(id, notif);
      return notif;
    });

    vi.spyOn(prisma.deviceToken, 'findMany').mockImplementation(async ({ where }: any) => {
      return [];
    });

    vi.spyOn(prisma.deviceToken, 'count').mockImplementation(async ({ where }: any) => {
      return 0;
    });

    vi.spyOn(prisma.notificationPreference, 'findUnique').mockImplementation(async ({ where }: any) => {
      return preferencesMap.get(where.userId) || {
        userId: where.userId,
        pushEnabled: true,
        emailEnabled: true,
        astrologyReminders: true,
        reportAlerts: true,
        promotions: false,
      };
    });

    app = buildApp();
    await app.ready();

    userAToken = (app as any).jwt.sign({ sub: userAId, role: 'USER' });
    userBToken = (app as any).jwt.sign({ sub: userBId, role: 'USER' });
    adminToken = (app as any).jwt.sign({ sub: adminUserId, role: 'SUPER_ADMIN', email: 'admin@astrosushil.com' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // FLOW A: Guest User & Unauthenticated Security Isolation
  describe('FLOW A — Guest User & Access Isolation', () => {
    it('should return 401 for unauthenticated access to protected user routes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/birth-profiles',
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should allow public access to health check endpoint', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
    });
  });

  // FLOW D & E: Birth Profile & Deterministic Kundli Output Verification
  describe('FLOW D & E — Birth Profile & Astrology Engine Contract', () => {
    it('User A can access their own birth profile', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/birth-profiles/${profileAId}`,
        headers: { authorization: `Bearer ${userAToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.profile.id).toBe(profileAId);
    });

    it('User B cannot access User A birth profile (Cross-User Isolation Guard)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/birth-profiles/${profileAId}`,
        headers: { authorization: `Bearer ${userBToken}` },
      });
      expect(res.statusCode).toBe(404); // Ownership guard: 404 to prevent ID enumeration
    });

    it('Calculates complete, deterministic Kundli chart without empty objects', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: { birthProfileId: profileAId },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.chart).toBeDefined();

      // Assert non-empty array data
      expect(Array.isArray(body.chart.planets)).toBe(true);
      expect(body.chart.planets.length).toBeGreaterThanOrEqual(9);

      // Verify Sun attributes
      const sun = body.chart.planets.find((p: any) => p.planet === 'SUN');
      expect(sun).toBeDefined();
      expect(sun.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(sun.rashiIndex).toBeLessThanOrEqual(12);
      expect(sun.nakshatraIndex).toBeGreaterThanOrEqual(1);
      expect(sun.pada).toBeGreaterThanOrEqual(1);

      // Verify Houses array is present and non-empty
      expect(Array.isArray(body.chart.houses)).toBe(true);
      expect(body.chart.houses.length).toBe(12);
    });
  });

  // FLOW J: Notification Service Dispatch & Preferences
  describe('FLOW J — Notifications Infrastructure & In-App List', () => {
    it('Dispatches in-app notification cleanly to user record', async () => {
      const dispatchRes = await notificationService.sendNotification({
        userId: userAId,
        type: 'REPORT_READY',
        entityId: 'rep-999',
        templateData: { reportName: 'Career Intelligence Report', reportId: 'rep-999' },
        channels: ['IN_APP'],
      });

      expect(dispatchRes.channels.inApp?.status).toBe('SENT');
      expect(dispatchRes.notificationId).toBeDefined();
    });

    it('User A can retrieve their in-app notifications via API', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.notifications).toBeDefined();
      expect(body.notifications.length).toBeGreaterThan(0);
      expect(body.unreadCount).toBeGreaterThan(0);
    });

    it('User A can fetch and update notification preferences', async () => {
      const resGet = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/preferences',
        headers: { authorization: `Bearer ${userAToken}` },
      });
      expect(resGet.statusCode).toBe(200);

      const resPut = await app.inject({
        method: 'PUT',
        url: '/api/v1/notifications/preferences',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: { promotions: true, pushEnabled: true },
      });
      expect(resPut.statusCode).toBe(200);
    });
  });

  // FLOW L & M: Admin Diagnostics & RBAC
  describe('FLOW L & M — Admin Panel RBAC & Diagnostics', () => {
    it('Normal user A cannot access admin notifications endpoint (403 Forbidden)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/notifications',
        headers: { authorization: `Bearer ${userAToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Super Admin can access admin notification diagnostics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/notifications',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.stats).toBeDefined();
      expect(body.recentNotifications).toBeDefined();
    });

    it('Super Admin can trigger safe test push notification', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/notifications/test-send',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { title: 'Integration Test Push', body: 'Testing admin endpoint' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('successfully');
    });
  });
});
