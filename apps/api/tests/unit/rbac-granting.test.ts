/**
 * Owner decision of 2026-11-24: a staff member may grant only permissions they hold themselves;
 * super admins are unrestricted (modules/admin/rbac/grant-guard.ts, role.service.ts, staff.service.ts).
 * Prisma and the audit log writer are substituted; no database is used.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const { mockPrisma, logAction } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    mockPrisma: {
      user: { findUnique: fn(), findMany: fn(), create: fn(), update: fn(), updateMany: fn(), count: fn() },
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

import type { Permission } from '../../src/modules/admin/admin.permissions';
import { globalErrorHandler } from '../../src/errors/error-handler';
import { ALL_PERMISSION_KEYS } from '../../src/modules/admin/rbac/permission.catalog';
import {
  PermissionGrantNotAllowedError,
  assertCanChangePermissions,
  assertHoldsAll,
  permissionsNotHeldBy,
} from '../../src/modules/admin/rbac/grant-guard';
import { invalidateStaffAccessCache } from '../../src/modules/admin/rbac/rbac.resolver';
import { rbacRoutes } from '../../src/modules/admin/rbac/rbac.routes';
import { roleService } from '../../src/modules/admin/rbac/role.service';
import { staffService } from '../../src/modules/admin/rbac/staff.service';
import type { RbacActor } from '../../src/modules/admin/rbac/rbac.types';

const NOW = new Date('2026-11-24T10:00:00.000Z');
const STRONG_PASSWORD = 'Str0ng-Passphrase';
const REFUSED = { statusCode: 403, code: 'PERMISSION_GRANT_NOT_ALLOWED' };

function role(overrides: Record<string, unknown> = {}) {
  return {
    id: 'role-target',
    name: 'Content Editor',
    slug: 'content-editor',
    description: null,
    permissions: ['blogs:read', 'blogs:update'] as string[],
    isSuperAdmin: false,
    isSystem: false,
    legacyRole: 'SUPPORT',
    status: 'ACTIVE',
    createdById: null,
    legacyId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** A lead who manages roles and staff and also holds the blog keys, but nothing about payments or orders. */
const LEAD_KEYS: Permission[] = [
  'roles:read',
  'roles:create',
  'roles:update',
  'roles:delete',
  'staff:read',
  'staff:create',
  'staff:update',
  'staff:delete',
  'blogs:read',
  'blogs:update',
];
const LEAD_ROLE = role({ id: 'role-lead', name: 'Content Lead', slug: 'content-lead', permissions: LEAD_KEYS });
const LEAD: RbacActor = { id: 'lead-1', email: 'lead@example.test', isSuperAdmin: false, roleId: 'role-lead', permissions: LEAD_KEYS };
const SUPER: RbacActor = {
  id: 'super-1',
  email: 'super@example.test',
  isSuperAdmin: true,
  roleId: 'role-super',
  permissions: [...ALL_PERMISSION_KEYS],
};

const BLOG_ROLE = role();
const FINANCE_ROLE = role({ id: 'role-finance', name: 'Finance', slug: 'finance', permissions: ['blogs:read', 'payments:read'] });

function staffOn(targetRole: ReturnType<typeof role> | null, overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-2',
    userId: 'staff-2',
    roleId: targetRole?.id ?? null,
    status: 'ACTIVE',
    isDeleted: false,
    createdAt: NOW,
    updatedAt: NOW,
    lastLoginAt: null,
    user: { id: 'staff-2', email: 'operator@example.test', fullName: 'Operator' },
    role: targetRole,
    ...overrides,
  };
}

function resetMocks() {
  for (const group of [mockPrisma.user, mockPrisma.adminRole, mockPrisma.staffProfile, mockPrisma.refreshToken]) {
    for (const mock of Object.values(group)) mock.mockReset();
  }
  mockPrisma.$transaction.mockClear();
  logAction.mockClear();
  invalidateStaffAccessCache();
}

function expectNothingWritten() {
  expect(mockPrisma.adminRole.create).not.toHaveBeenCalled();
  expect(mockPrisma.adminRole.update).not.toHaveBeenCalled();
  expect(mockPrisma.user.create).not.toHaveBeenCalled();
  expect(mockPrisma.user.update).not.toHaveBeenCalled();
  expect(mockPrisma.staffProfile.update).not.toHaveBeenCalled();
  expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  expect(logAction).not.toHaveBeenCalled();
}

beforeEach(resetMocks);

describe('grant guard', () => {
  it('reports the keys an actor does not hold, and nothing for a super admin', () => {
    expect(permissionsNotHeldBy(LEAD, ['blogs:read', 'payments:read', 'orders:read'])).toEqual(
      expect.arrayContaining(['payments:read', 'orders:read'])
    );
    expect(permissionsNotHeldBy(LEAD, ['blogs:read', 'payments:read', 'orders:read'])).toHaveLength(2);
    expect(permissionsNotHeldBy(LEAD, ['blogs:read', 'blogs:update'])).toEqual([]);
    expect(permissionsNotHeldBy(SUPER, [...ALL_PERMISSION_KEYS])).toEqual([]);
    // A super admin is unrestricted even if the key list on the actor object is empty.
    expect(permissionsNotHeldBy({ ...SUPER, permissions: [] }, ['payments:read'])).toEqual([]);
    // Keys that are no longer in the catalogue grant nothing and are ignored.
    expect(permissionsNotHeldBy(LEAD, ['no.longer:exists'])).toEqual([]);
  });

  it('refuses with 403 PERMISSION_GRANT_NOT_ALLOWED and never names a permission key', () => {
    let thrown: unknown;
    try {
      assertHoldsAll(LEAD, ['payments:read'], 'ASSIGN_ROLE');
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(PermissionGrantNotAllowedError);
    expect(thrown).toMatchObject(REFUSED);
    for (const refusal of ['ROLE_PERMISSIONS', 'ROLE_STATUS', 'ASSIGN_ROLE', 'MANAGE_STAFF'] as const) {
      const message = new PermissionGrantNotAllowedError(refusal).message;
      expect(message).not.toMatch(/[a-z_]+:[a-z_]+/);
      expect(message).not.toContain('payments');
    }
  });

  it('allows a change only when every key added or removed is held', () => {
    expect(() => assertCanChangePermissions(LEAD, ['blogs:read'], ['blogs:read', 'blogs:update'])).not.toThrow();
    expect(() => assertCanChangePermissions(LEAD, ['blogs:read', 'blogs:update'], [])).not.toThrow();
    // Keys the lead does not hold may stay where they are.
    expect(() => assertCanChangePermissions(LEAD, ['payments:read', 'blogs:read'], ['payments:read'])).not.toThrow();
    expect(() => assertCanChangePermissions(LEAD, ['blogs:read'], ['blogs:read', 'payments:read'])).toThrow(PermissionGrantNotAllowedError);
    expect(() => assertCanChangePermissions(LEAD, ['blogs:read', 'payments:read'], ['blogs:read'])).toThrow(PermissionGrantNotAllowedError);
    expect(() => assertCanChangePermissions(SUPER, [], [...ALL_PERMISSION_KEYS])).not.toThrow();
  });
});

describe('creating a role', () => {
  beforeEach(() => {
    mockPrisma.adminRole.findFirst.mockResolvedValue(null);
    mockPrisma.adminRole.findUnique.mockResolvedValue(null);
    mockPrisma.adminRole.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => role({ ...data, id: 'role-new' }));
  });

  it('accepts keys the acting staff member holds', async () => {
    const created = await roleService.createRole({ name: 'Blog Team', permissions: ['blogs:read', 'blogs:update'] }, LEAD);
    expect(created.permissions).toEqual(['blogs:read', 'blogs:update']);
    expect(logAction).toHaveBeenCalledTimes(1);
  });

  it('refuses a key the acting staff member does not hold, before anything is written', async () => {
    await expect(
      roleService.createRole({ name: 'Finance Team', permissions: ['blogs:read', 'payments:read'] }, LEAD)
    ).rejects.toMatchObject(REFUSED);
    expectNothingWritten();
  });

  it('lets a super admin put any key on a role', async () => {
    const created = await roleService.createRole({ name: 'Everything', permissions: [...ALL_PERMISSION_KEYS] }, SUPER);
    expect(created.permissions).toHaveLength(ALL_PERMISSION_KEYS.length);
  });
});

describe('updating a role', () => {
  it('lets a staff member add and remove keys they hold', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(role({ permissions: ['blogs:read'] }));
    mockPrisma.adminRole.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => role(data));

    await roleService.updateRole('role-target', { permissions: ['blogs:read', 'blogs:update'] }, LEAD);
    await roleService.updateRole('role-target', { permissions: [] }, LEAD);
    expect(mockPrisma.adminRole.update).toHaveBeenCalledTimes(2);
  });

  it('refuses to add a key the acting staff member does not hold', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(BLOG_ROLE);
    await expect(
      roleService.updateRole('role-target', { permissions: ['blogs:read', 'blogs:update', 'payments:read'] }, LEAD)
    ).rejects.toMatchObject(REFUSED);
    expectNothingWritten();
  });

  it('refuses to remove a key the acting staff member does not hold', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    await expect(roleService.updateRole('role-finance', { permissions: ['blogs:read'] }, LEAD)).rejects.toMatchObject(REFUSED);
    await expect(roleService.updateRole('role-finance', { permissions: [] }, LEAD)).rejects.toMatchObject(REFUSED);
    expectNothingWritten();
  });

  it('lets the keys the staff member holds be edited while the others stay as they are', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    mockPrisma.adminRole.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...FINANCE_ROLE, ...data }));

    const updated = await roleService.updateRole('role-finance', { permissions: ['payments:read', 'blogs:update'] }, LEAD);
    expect(updated.permissions).toEqual(expect.arrayContaining(['payments:read', 'blogs:update']));
    expect(updated.permissions).not.toContain('blogs:read');
  });

  it('cannot be used by a staff member to give their own role a key they lack', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(LEAD_ROLE);
    await expect(
      roleService.updateRole('role-lead', { permissions: [...LEAD_KEYS, 'payments:read'] }, LEAD)
    ).rejects.toMatchObject(REFUSED);
    expectNothingWritten();
  });

  it('still lets name and description be edited on a role with keys the staff member lacks', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    mockPrisma.adminRole.findFirst.mockResolvedValue(null);
    mockPrisma.adminRole.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...FINANCE_ROLE, ...data }));

    const updated = await roleService.updateRole('role-finance', { name: 'Accounts', description: 'Books' }, LEAD);
    expect(updated.name).toBe('Accounts');
    // Sending the unchanged key list back (what an edit form does) is not a change.
    await roleService.updateRole('role-finance', { permissions: ['payments:read', 'blogs:read'] }, LEAD);
  });

  it('refuses to switch a role on or off when it holds a key the staff member lacks', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    await expect(roleService.updateRoleStatus('role-finance', 'INACTIVE', LEAD)).rejects.toMatchObject(REFUSED);
    await expect(roleService.updateRole('role-finance', { status: 'INACTIVE' }, LEAD)).rejects.toMatchObject(REFUSED);

    mockPrisma.adminRole.findUnique.mockResolvedValue({ ...FINANCE_ROLE, status: 'INACTIVE' });
    await expect(roleService.updateRoleStatus('role-finance', 'ACTIVE', LEAD)).rejects.toMatchObject(REFUSED);
    await expect(roleService.updateRole('role-finance', { status: 'ACTIVE' }, LEAD)).rejects.toMatchObject(REFUSED);
    expectNothingWritten();
  });

  it('lets a staff member switch a role whose keys they all hold', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(BLOG_ROLE);
    mockPrisma.adminRole.update.mockResolvedValue({ ...BLOG_ROLE, status: 'INACTIVE' });
    const updated = await roleService.updateRoleStatus('role-target', 'INACTIVE', LEAD);
    expect(updated.status).toBe('INACTIVE');
  });

  it('does not restrict a super admin', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    mockPrisma.adminRole.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...FINANCE_ROLE, ...data }));

    const updated = await roleService.updateRole('role-finance', { permissions: ['orders:read', 'payments:read', 'users:read'] }, SUPER);
    expect(updated.permissions).toEqual(expect.arrayContaining(['orders:read', 'users:read']));
    await roleService.updateRoleStatus('role-finance', 'INACTIVE', SUPER);
    expect(mockPrisma.adminRole.update).toHaveBeenCalledTimes(2);
  });
});

describe('creating a staff account', () => {
  const input = { fullName: 'New Person', email: 'new.person@example.test', password: STRONG_PASSWORD, roleId: 'role-target' };

  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 'staff-new' });
  });

  it('is allowed on a role whose keys the acting staff member all holds', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(BLOG_ROLE);
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(BLOG_ROLE, { userId: 'staff-new' }));
    const created = await staffService.createStaff(input, LEAD);
    expect(created.role?.id).toBe('role-target');
    expect(created.role).not.toHaveProperty('permissions');
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
  });

  it('is refused on a role with a key the acting staff member lacks', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    await expect(staffService.createStaff({ ...input, roleId: 'role-finance' }, LEAD)).rejects.toMatchObject(REFUSED);
    expectNothingWritten();
  });

  it('reads the keys of the role being assigned', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    await expect(staffService.createStaff({ ...input, roleId: 'role-finance' }, LEAD)).rejects.toMatchObject(REFUSED);
    expect(mockPrisma.adminRole.findUnique.mock.calls[0][0].select).toMatchObject({ permissions: true });
  });

  it('is unrestricted for a super admin', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(FINANCE_ROLE, { userId: 'staff-new' }));
    await staffService.createStaff({ ...input, roleId: 'role-finance' }, SUPER);
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
  });
});

describe('changing the role of a staff account', () => {
  it('is allowed between roles whose keys the acting staff member all holds', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(BLOG_ROLE));
    mockPrisma.adminRole.findUnique.mockResolvedValue(LEAD_ROLE);
    await staffService.updateStaffRole('staff-2', 'role-lead', LEAD);
    expect(mockPrisma.staffProfile.update).toHaveBeenCalledTimes(1);
  });

  it('is refused onto a role with a key the acting staff member lacks', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(BLOG_ROLE));
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    await expect(staffService.updateStaffRole('staff-2', 'role-finance', LEAD)).rejects.toMatchObject({
      ...REFUSED,
      message: 'You can only assign a role whose permissions your own role all holds',
    });
    expectNothingWritten();
  });

  it('is refused off a role with a key the acting staff member lacks', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(FINANCE_ROLE));
    mockPrisma.adminRole.findUnique.mockResolvedValue(BLOG_ROLE);
    await expect(staffService.updateStaffRole('staff-2', 'role-target', LEAD)).rejects.toMatchObject(REFUSED);
    expectNothingWritten();
  });

  it('is allowed for an account that has no role yet', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(null));
    mockPrisma.adminRole.findUnique.mockResolvedValue(BLOG_ROLE);
    await staffService.updateStaffRole('staff-2', 'role-target', LEAD);
    expect(mockPrisma.staffProfile.update).toHaveBeenCalledTimes(1);
  });

  it('is unrestricted for a super admin', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(FINANCE_ROLE));
    mockPrisma.adminRole.findUnique.mockResolvedValue(BLOG_ROLE);
    await staffService.updateStaffRole('staff-2', 'role-target', SUPER);
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(BLOG_ROLE));
    mockPrisma.adminRole.findUnique.mockResolvedValue(FINANCE_ROLE);
    await staffService.updateStaffRole('staff-2', 'role-finance', SUPER);
    expect(mockPrisma.staffProfile.update).toHaveBeenCalledTimes(2);
  });
});

describe('managing the access of an account on a role with keys the acting staff member lacks', () => {
  it('refuses a password reset, a status change and a removal', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(FINANCE_ROLE));
    await expect(staffService.resetStaffPassword('staff-2', STRONG_PASSWORD, LEAD)).rejects.toMatchObject(REFUSED);
    await expect(staffService.updateStaffStatus('staff-2', 'SUSPENDED', LEAD)).rejects.toMatchObject(REFUSED);
    await expect(staffService.deleteStaff('staff-2', LEAD)).rejects.toMatchObject(REFUSED);

    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(FINANCE_ROLE, { status: 'SUSPENDED' }));
    await expect(staffService.updateStaffStatus('staff-2', 'ACTIVE', LEAD)).rejects.toMatchObject(REFUSED);
    expectNothingWritten();
  });

  it('measures an inactive role by the keys it would grant again', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn({ ...FINANCE_ROLE, status: 'INACTIVE' }));
    await expect(staffService.resetStaffPassword('staff-2', STRONG_PASSWORD, LEAD)).rejects.toMatchObject(REFUSED);
  });

  it('still lets profile fields be edited (they carry no access)', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(FINANCE_ROLE));
    await staffService.updateStaff('staff-2', { city: 'Pune' }, LEAD);
    expect(mockPrisma.staffProfile.update).toHaveBeenCalledTimes(1);
  });

  it('allows all of it on an account whose role keys the acting staff member all holds', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(BLOG_ROLE));
    await staffService.resetStaffPassword('staff-2', STRONG_PASSWORD, LEAD);
    await staffService.updateStaffStatus('staff-2', 'SUSPENDED', LEAD);
    await staffService.deleteStaff('staff-2', LEAD);
    expect(logAction).toHaveBeenCalledTimes(3);
  });

  it('is unrestricted for a super admin', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffOn(FINANCE_ROLE));
    await staffService.resetStaffPassword('staff-2', STRONG_PASSWORD, SUPER);
    await staffService.updateStaffStatus('staff-2', 'SUSPENDED', SUPER);
    await staffService.deleteStaff('staff-2', SUPER);
    expect(logAction).toHaveBeenCalledTimes(3);
  });
});

describe('over HTTP', () => {
  const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
  const TARGET_ID = '22222222-2222-4222-8222-222222222222';
  const ROLE_ID = '33333333-3333-4333-8333-333333333333';
  let app: FastifyInstance;

  function signInAs(permissions: string[], isSuperAdmin = false) {
    invalidateStaffAccessCache();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: ACTOR_ID,
      email: 'actor@example.test',
      role: isSuperAdmin ? 'SUPER_ADMIN' : 'SUPPORT',
      staffProfile: {
        status: 'ACTIVE',
        isDeleted: false,
        role: { id: 'actor-role', name: 'Actor Role', slug: 'actor-role', isSuperAdmin, status: 'ACTIVE', permissions },
      },
    });
  }

  beforeAll(async () => {
    app = Fastify();
    app.setErrorHandler(globalErrorHandler);
    app.decorateRequest('user', null);
    app.addHook('onRequest', async (request) => {
      (request as unknown as { user: { id: string; role: string } }).user = { id: ACTOR_ID, role: 'SUPPORT' };
    });
    await app.register(rbacRoutes, { prefix: '/api/v1/admin' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 403 PERMISSION_GRANT_NOT_ALLOWED in the standard shape, from the role read in the database', async () => {
    signInAs(['roles:create', 'blogs:read']);
    mockPrisma.adminRole.findFirst.mockResolvedValue(null);

    const refused = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      payload: { name: 'Finance Team', permissions: ['blogs:read', 'payments:read'] },
    });
    expect(refused.statusCode).toBe(403);
    const body = refused.json();
    expect(Object.keys(body)).toEqual(['error']);
    expect(body.error).toMatchObject({ code: 'PERMISSION_GRANT_NOT_ALLOWED' });
    expect(typeof body.error.requestId).toBe('string');
    expect(refused.body).not.toContain('payments');
    expect(mockPrisma.adminRole.create).not.toHaveBeenCalled();
  });

  it('refuses a role change onto a role with more keys, and lets a super admin do it', async () => {
    const target = {
      userId: TARGET_ID,
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: NOW,
      updatedAt: NOW,
      lastLoginAt: null,
      user: { id: TARGET_ID, email: 'target@example.test', fullName: 'Target' },
      role: { id: 'old-role', name: 'Blog', slug: 'blog', isSuperAdmin: false, status: 'ACTIVE', legacyRole: 'SUPPORT', permissions: ['blogs:read'] },
    };
    const finance = { id: ROLE_ID, name: 'Finance', slug: 'finance', isSuperAdmin: false, status: 'ACTIVE', legacyRole: 'SUPPORT', permissions: ['payments:read'] };
    mockPrisma.staffProfile.findFirst.mockResolvedValue(target);
    mockPrisma.adminRole.findUnique.mockResolvedValue(finance);

    signInAs(['staff:update', 'blogs:read']);
    const refused = await app.inject({ method: 'PATCH', url: `/api/v1/admin/staff/${TARGET_ID}/role`, payload: { roleId: ROLE_ID } });
    expect(refused.statusCode).toBe(403);
    expect(refused.json().error.code).toBe('PERMISSION_GRANT_NOT_ALLOWED');
    expect(mockPrisma.staffProfile.update).not.toHaveBeenCalled();

    signInAs([], true);
    const allowed = await app.inject({ method: 'PATCH', url: `/api/v1/admin/staff/${TARGET_ID}/role`, payload: { roleId: ROLE_ID } });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.body).not.toContain('payments:read');
    expect(mockPrisma.staffProfile.update).toHaveBeenCalledTimes(1);
  });
});
