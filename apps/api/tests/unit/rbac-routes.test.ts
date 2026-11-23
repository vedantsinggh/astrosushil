/**
 * Route-level checks for roles, permissions and staff: every route is behind a permission, the
 * permission is read from the database, and errors use the standard shape.
 * Prisma and the audit log writer are substituted; no database is used.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const { mockPrisma, logAction } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    mockPrisma: {
      user: { findUnique: fn(), create: fn(), update: fn(), updateMany: fn(), count: fn() },
      adminRole: { findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn(), update: fn(), delete: fn(), count: fn() },
      staffProfile: { findUnique: fn(), findFirst: fn(), findMany: fn(), update: fn(), upsert: fn(), count: fn(), groupBy: fn() },
      refreshToken: { updateMany: fn() },
      $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
    },
    logAction: vi.fn(async () => undefined),
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mockPrisma }));
vi.mock('../../src/modules/admin/admin.service', () => ({ adminService: { logAction } }));

import { globalErrorHandler } from '../../src/errors/error-handler';
import { rbacRoutes } from '../../src/modules/admin/rbac/rbac.routes';
import { invalidateStaffAccessCache } from '../../src/modules/admin/rbac/rbac.resolver';
import { ALL_PERMISSION_KEYS } from '../../src/modules/admin/rbac/permission.catalog';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '22222222-2222-4222-8222-222222222222';
const ROLE_ID = '33333333-3333-4333-8333-333333333333';
const NOW = new Date('2026-11-24T10:00:00.000Z');

function actorWith(permissions: string[], isSuperAdmin = false) {
  return {
    id: ACTOR_ID,
    email: 'actor@example.test',
    role: isSuperAdmin ? 'SUPER_ADMIN' : 'SUPPORT',
    staffProfile: {
      status: 'ACTIVE',
      isDeleted: false,
      role: { id: 'actor-role', name: 'Actor Role', slug: 'actor-role', isSuperAdmin, status: 'ACTIVE', permissions },
    },
  };
}

function signInAs(permissions: string[], isSuperAdmin = false) {
  invalidateStaffAccessCache();
  mockPrisma.user.findUnique.mockResolvedValue(actorWith(permissions, isSuperAdmin));
}

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(globalErrorHandler);
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (request) => {
    // Stands in for fastify.authenticate: the token only yields the user id and the coarse tier.
    (request as unknown as { user: { id: string; role: string } }).user = { id: ACTOR_ID, role: 'SUPPORT' };
  });
  await app.register(rbacRoutes, { prefix: '/api/v1/admin' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  for (const group of [mockPrisma.user, mockPrisma.adminRole, mockPrisma.staffProfile, mockPrisma.refreshToken]) {
    for (const mock of Object.values(group)) mock.mockReset();
  }
  mockPrisma.$transaction.mockClear();
  logAction.mockClear();
});

describe('rbac routes', () => {
  it('guards every roles, permissions and staff route with a permission', async () => {
    signInAs(['dashboard:read']);
    const routes: Array<['GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', string]> = [
      ['GET', '/roles'],
      ['GET', '/roles/options'],
      ['POST', '/roles'],
      ['GET', `/roles/${ROLE_ID}`],
      ['PUT', `/roles/${ROLE_ID}`],
      ['PATCH', `/roles/${ROLE_ID}/status`],
      ['DELETE', `/roles/${ROLE_ID}`],
      ['GET', '/permissions'],
      ['GET', '/staff'],
      ['POST', '/staff'],
      ['GET', `/staff/${TARGET_ID}`],
      ['PATCH', `/staff/${TARGET_ID}`],
      ['PATCH', `/staff/${TARGET_ID}/role`],
      ['PATCH', `/staff/${TARGET_ID}/status`],
      ['POST', `/staff/${TARGET_ID}/reset-password`],
      ['DELETE', `/staff/${TARGET_ID}`],
    ];
    for (const [method, path] of routes) {
      const response = await app.inject({ method, url: `/api/v1/admin${path}`, payload: method === 'GET' ? undefined : {} });
      expect(response.statusCode, `${method} ${path}`).toBe(403);
      expect(response.json().error.code).toBe('AUTHORIZATION_ERROR');
    }
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });

  it('returns the grouped permission matrix to someone who may edit roles', async () => {
    signInAs(['roles:update']);
    const grouped = await app.inject({ method: 'GET', url: '/api/v1/admin/permissions' });
    expect(grouped.statusCode).toBe(200);
    const keys = grouped
      .json()
      .groups.flatMap((g: { modules: Array<{ permissions: Array<{ key: string }> }> }) =>
        g.modules.flatMap((m) => m.permissions.map((p) => p.key))
      );
    expect(keys).toEqual([...ALL_PERMISSION_KEYS]);

    const flat = await app.inject({ method: 'GET', url: '/api/v1/admin/permissions?flat=true' });
    expect(flat.json().items).toHaveLength(ALL_PERMISSION_KEYS.length);
    expect(flat.json().items[0]).toMatchObject({ key: 'dashboard:read', group: 'Main', label: 'View Dashboard' });
  });

  it('serves role options to staff managers and does not read "options" as an id', async () => {
    signInAs(['staff:create']);
    mockPrisma.adminRole.findMany.mockResolvedValue([{ id: ROLE_ID, name: 'Admin', slug: 'admin', isSuperAdmin: false }]);
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/roles/options' });
    expect(response.statusCode).toBe(200);
    expect(response.json().items).toHaveLength(1);
    expect(mockPrisma.adminRole.findMany.mock.calls[0][0].where).toEqual({ status: 'ACTIVE' });
  });

  it('rejects a role body that tries to set protected fields, in the standard error shape', async () => {
    signInAs([], true);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      payload: { name: 'Sneaky', isSuperAdmin: true },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockPrisma.adminRole.create).not.toHaveBeenCalled();
  });

  it('does not let a staff manager suspend themselves, and audits a real suspension with the request details', async () => {
    signInAs(['staff:update']);
    const self = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/staff/${ACTOR_ID}/status`,
      payload: { status: 'SUSPENDED' },
    });
    expect(self.statusCode).toBe(400);
    expect(self.json().error.message).toBe('You cannot change the status of your own account');

    mockPrisma.staffProfile.findFirst.mockResolvedValue({
      userId: TARGET_ID,
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: NOW,
      updatedAt: NOW,
      lastLoginAt: null,
      user: { id: TARGET_ID, email: 'target@example.test', fullName: 'Target' },
      role: { id: ROLE_ID, name: 'Admin', slug: 'admin', isSuperAdmin: false, status: 'ACTIVE', legacyRole: 'ADMIN' },
    });
    const other = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/staff/${TARGET_ID}/status`,
      payload: { status: 'SUSPENDED' },
      headers: { 'user-agent': 'vitest-agent' },
    });
    expect(other.statusCode).toBe(200);
    expect(other.json()).not.toHaveProperty('passwordHash');
    const audit = (logAction.mock.calls as unknown as Array<[Record<string, string>]>)[0][0];
    expect(audit).toMatchObject({
      adminId: ACTOR_ID,
      adminEmail: 'actor@example.test',
      action: 'STAFF_SUSPENDED',
      resource: `User:${TARGET_ID}`,
      userAgent: 'vitest-agent',
    });
  });

  it('refuses a weak password on reset before touching the account', async () => {
    signInAs(['staff:update']);
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/staff/${TARGET_ID}/reset-password`,
      payload: { newPassword: 'password' },
    });
    expect(response.statusCode).toBe(400);
    expect(mockPrisma.staffProfile.findFirst).not.toHaveBeenCalled();
    expect(JSON.stringify(response.json())).not.toContain('"password"');
  });

  it('keeps suspended staff out of their own-account routes too', async () => {
    invalidateStaffAccessCache();
    mockPrisma.user.findUnique.mockResolvedValue({
      ...actorWith(['staff:update']),
      staffProfile: { status: 'SUSPENDED', isDeleted: false, role: null },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/change-password',
      payload: { oldPassword: 'Old-Passw0rd', newPassword: 'New-Passw0rd' },
    });
    expect(response.statusCode).toBe(403);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
