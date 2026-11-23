/**
 * Database-backed staff roles and permissions (modules/admin/rbac).
 * Prisma and the audit log writer are substituted; no database is used.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockPrisma, logAction } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    mockPrisma: {
      user: { findUnique: fn(), findMany: fn(), create: fn(), update: fn(), updateMany: fn(), count: fn() },
      adminRole: {
        findUnique: fn(),
        findFirst: fn(),
        findMany: fn(),
        create: fn(),
        update: fn(),
        delete: fn(),
        count: fn(),
      },
      staffProfile: {
        findUnique: fn(),
        findFirst: fn(),
        findMany: fn(),
        create: fn(),
        update: fn(),
        updateMany: fn(),
        upsert: fn(),
        count: fn(),
        groupBy: fn(),
      },
      refreshToken: { updateMany: fn() },
      $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
    },
    logAction: vi.fn(async () => undefined),
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mockPrisma }));
vi.mock('../../src/modules/admin/admin.service', () => ({ adminService: { logAction } }));

import { getPermissionsForRole, hasPermission, type Permission } from '../../src/modules/admin/admin.permissions';
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_CATALOGUE,
  PERMISSION_GROUP_ORDER,
  buildPermissionMatrix,
  findUnknownPermissionKeys,
  normalizePermissionKeys,
} from '../../src/modules/admin/rbac/permission.catalog';
import { SYSTEM_ROLES } from '../../src/modules/admin/rbac/system-roles';
import {
  STAFF_ACCESS_CACHE_TTL_MS,
  invalidateStaffAccessCache,
  resolveStaffAccess,
} from '../../src/modules/admin/rbac/rbac.resolver';
import { checkPermission } from '../../src/modules/admin/rbac/check-permission';
import { effectiveLegacyRole, linkUserToSystemRole } from '../../src/modules/admin/rbac/staff-link';
import { roleService, slugifyRoleName } from '../../src/modules/admin/rbac/role.service';
import { staffService } from '../../src/modules/admin/rbac/staff.service';
import { seedRbac } from '../../src/modules/admin/rbac/rbac.seed';
import {
  createRoleSchema,
  createStaffSchema,
  resetStaffPasswordSchema,
  updateRoleSchema,
  updateStaffRoleSchema,
} from '../../src/modules/admin/rbac/rbac.schemas';
import type { RbacActor } from '../../src/modules/admin/rbac/rbac.types';

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

const NOW = new Date('2026-11-24T10:00:00.000Z');

type RoleFixture = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSuperAdmin: boolean;
  isSystem: boolean;
  legacyRole: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
  status: 'ACTIVE' | 'INACTIVE';
  createdById: string | null;
  legacyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function role(overrides: Partial<RoleFixture> = {}): RoleFixture {
  return {
    id: 'role-custom',
    name: 'Content Editor',
    slug: 'content-editor',
    description: null,
    permissions: ['blogs:read', 'blogs:update'],
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

const SUPER_ROLE = role({
  id: 'role-super',
  name: 'Super Admin',
  slug: 'super-admin',
  permissions: [],
  isSuperAdmin: true,
  isSystem: true,
  legacyRole: 'SUPER_ADMIN',
});
const ADMIN_ROLE = role({
  id: 'role-admin',
  name: 'Admin',
  slug: 'admin',
  permissions: [...getPermissionsForRole('ADMIN')],
  isSystem: true,
  legacyRole: 'ADMIN',
});
const SUPPORT_ROLE = role({
  id: 'role-support',
  name: 'Support',
  slug: 'support',
  permissions: [...getPermissionsForRole('SUPPORT')],
  isSystem: true,
  legacyRole: 'SUPPORT',
});

function userRow(
  legacyRole: string,
  profile: { status?: 'ACTIVE' | 'SUSPENDED'; isDeleted?: boolean; role: RoleFixture | null } | null,
  id = 'user-1'
) {
  return {
    id,
    email: `${id}@example.test`,
    role: legacyRole,
    staffProfile: profile
      ? { status: profile.status ?? 'ACTIVE', isDeleted: profile.isDeleted ?? false, role: profile.role }
      : null,
  };
}

function staffRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-2',
    userId: 'staff-2',
    roleId: ADMIN_ROLE.id,
    status: 'ACTIVE',
    isDeleted: false,
    deletedAt: null,
    username: 'operator',
    phoneNumber: null,
    designation: null,
    website: null,
    portfolioLink: null,
    profilePhoto: null,
    address: null,
    city: null,
    state: null,
    postalCode: null,
    lastLoginAt: null,
    createdById: null,
    legacyId: null,
    createdAt: NOW,
    updatedAt: NOW,
    user: { id: 'staff-2', email: 'operator@example.test', fullName: 'Operator' },
    role: ADMIN_ROLE,
    ...overrides,
  };
}

const SUPER_ACTOR: RbacActor = {
  id: 'super-1',
  email: 'super@example.test',
  isSuperAdmin: true,
  roleId: SUPER_ROLE.id,
  permissions: [...ALL_PERMISSION_KEYS],
};
const MANAGER_ROLE = role({
  id: 'role-manager',
  name: 'Staff Manager',
  slug: 'staff-manager',
  permissions: ['roles:read', 'roles:create', 'roles:update', 'roles:delete', 'staff:read', 'staff:create', 'staff:update', 'staff:delete'],
});
const MANAGER_ACTOR: RbacActor = {
  id: 'manager-1',
  email: 'manager@example.test',
  isSuperAdmin: false,
  roleId: MANAGER_ROLE.id,
  permissions: MANAGER_ROLE.permissions as Permission[],
};

const META = { ipAddress: '203.0.113.9', userAgent: 'vitest' };
const STRONG_PASSWORD = 'Str0ng-Passphrase';

function request(userId = 'user-1', legacyRole = 'ADMIN') {
  return { user: { id: userId, role: legacyRole } } as never;
}

function lastAudit() {
  const calls = logAction.mock.calls as unknown as Array<[Record<string, string>]>;
  return calls[calls.length - 1][0];
}

function resetMocks() {
  const groups = [mockPrisma.user, mockPrisma.adminRole, mockPrisma.staffProfile, mockPrisma.refreshToken];
  for (const group of groups) {
    for (const mock of Object.values(group)) mock.mockReset();
  }
  mockPrisma.$transaction.mockClear();
  logAction.mockClear();
  invalidateStaffAccessCache();
}

beforeEach(resetMocks);
afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------------------------

describe('permission catalogue', () => {
  it('lists every key exactly once, each with a label, a module and a known group', () => {
    expect(new Set(ALL_PERMISSION_KEYS).size).toBe(ALL_PERMISSION_KEYS.length);
    for (const entry of PERMISSION_CATALOGUE) {
      expect(entry.key).toBe(`${entry.module}:${entry.action}`);
      expect(entry.label.length).toBeGreaterThan(2);
      expect(entry.moduleLabel.length).toBeGreaterThan(1);
      expect(PERMISSION_GROUP_ORDER).toContain(entry.group);
    }
    const orders = PERMISSION_CATALOGUE.map((entry) => entry.sortOrder);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('holds exactly the keys of the static SUPER_ADMIN list in admin.permissions.ts', () => {
    expect([...ALL_PERMISSION_KEYS].sort()).toEqual([...getPermissionsForRole('SUPER_ADMIN')].sort());
  });

  it('covers every permission of the website catalogue under its new key', () => {
    const websiteKeys: Permission[] = [
      'dashboard:read',
      'banners:read', 'banners:create', 'banners:update', 'banners:delete',
      'categories:read', 'categories:create', 'categories:update', 'categories:delete',
      'courses:read', 'courses:create', 'courses:update', 'courses:delete',
      'products:read', 'products:create', 'products:update', 'products:delete',
      'consultations:read', 'consultations:create', 'consultations:update', 'consultations:delete',
      'orders:read', 'orders:update', 'orders:export',
      'report_orders:read', 'report_orders:update',
      'transactions:read', 'transactions:export',
      'gst_report:read', 'gst_report:export',
      'bookings:read', 'bookings:create', 'bookings:update', 'bookings:delete',
      'coupons:read', 'coupons:create', 'coupons:update', 'coupons:delete',
      'customers:read', 'customers:update', 'customers:delete',
      'contacts:read', 'contacts:update', 'contacts:delete',
      'blogs:read', 'blogs:create', 'blogs:update', 'blogs:delete',
      'faqs:read', 'faqs:create', 'faqs:update', 'faqs:delete',
      'testimonials:read', 'testimonials:create', 'testimonials:update', 'testimonials:delete',
      'pdf_reports:read', 'pdf_reports:create', 'pdf_reports:update', 'pdf_reports:delete',
      'media:read', 'media:create', 'media:update', 'media:delete',
      'availability:read', 'availability:update',
      'settings:read', 'settings:update',
      'seo:read', 'seo:create', 'seo:update', 'seo:delete',
      'roles:read', 'roles:create', 'roles:update', 'roles:delete',
      'permissions:read',
      'staff:read', 'staff:create', 'staff:update', 'staff:delete',
    ];
    expect(websiteKeys).toHaveLength(81);
    for (const key of websiteKeys) expect(ALL_PERMISSION_KEYS).toContain(key);
  });

  it('builds the grouped matrix in group order without losing a key', () => {
    const matrix = buildPermissionMatrix();
    const groupNames = matrix.map((group) => group.group);
    expect(groupNames).toEqual(PERMISSION_GROUP_ORDER.filter((group) => groupNames.includes(group)));
    const keys = matrix.flatMap((group) => group.modules.flatMap((m) => m.permissions.map((p) => p.key)));
    expect(keys).toEqual([...ALL_PERMISSION_KEYS]);
    const administration = matrix.find((group) => group.group === 'Administration');
    expect(administration?.modules.map((m) => m.module)).toEqual(
      expect.arrayContaining(['roles', 'permissions', 'staff', 'admin_users'])
    );
  });

  it('normalizes key lists and reports unknown keys', () => {
    expect(normalizePermissionKeys(['staff:read', 'nope:read', 'dashboard:read', 'staff:read'])).toEqual([
      'dashboard:read',
      'staff:read',
    ]);
    expect(findUnknownPermissionKeys(['staff:read', 'nope:read', 'roles.view'])).toEqual(['nope:read', 'roles.view']);
  });

  it('seeds each system role with exactly the static permissions of its old role value', () => {
    expect(SYSTEM_ROLES.map((r) => [r.slug, r.legacyRole, r.isSuperAdmin])).toEqual([
      ['super-admin', 'SUPER_ADMIN', true],
      ['admin', 'ADMIN', false],
      ['support', 'SUPPORT', false],
    ]);
    for (const definition of SYSTEM_ROLES) {
      expect([...definition.defaultPermissions]).toEqual(getPermissionsForRole(definition.legacyRole));
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------------------------

describe('resolveStaffAccess', () => {
  it('gives an admin without a staff profile the static permissions when roles are not seeded', async () => {
    for (const legacyRole of ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] as const) {
      invalidateStaffAccessCache();
      mockPrisma.user.findUnique.mockResolvedValue(userRow(legacyRole, null));
      mockPrisma.adminRole.findUnique.mockResolvedValue(null);
      const access = await resolveStaffAccess('user-1');
      expect(access.source).toBe('static-default');
      expect(access.denyReason).toBeNull();
      expect(access.isSuperAdmin).toBe(legacyRole === 'SUPER_ADMIN');
      expect([...access.permissions].sort()).toEqual([...getPermissionsForRole(legacyRole)].sort());
    }
  });

  it('uses the seeded system role for an admin without a staff profile, including later edits to it', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRow('SUPPORT', null));
    mockPrisma.adminRole.findUnique.mockResolvedValue({ ...SUPPORT_ROLE, permissions: ['dashboard:read', 'blogs:read'] });
    const access = await resolveStaffAccess('user-1');
    expect(mockPrisma.adminRole.findUnique.mock.calls[0][0].where).toEqual({ slug: 'support' });
    expect(access.source).toBe('system-role');
    expect(access.permissions).toEqual(['dashboard:read', 'blogs:read']);
    expect(access.role?.id).toBe(SUPPORT_ROLE.id);
  });

  it('reads a custom role from the staff profile and ignores keys that are not in the catalogue', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      userRow('SUPPORT', { role: role({ permissions: ['blogs:update', 'retired:key', 'blogs:read'] }) })
    );
    const access = await resolveStaffAccess('user-1');
    expect(access.source).toBe('staff-profile');
    expect(access.permissions).toEqual(['blogs:read', 'blogs:update']);
    expect(access.isSuperAdmin).toBe(false);
    expect(mockPrisma.adminRole.findUnique).not.toHaveBeenCalled();
  });

  it('gives a super admin role every catalogue key without reading its key list', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRow('SUPER_ADMIN', { role: SUPER_ROLE }));
    const access = await resolveStaffAccess('user-1');
    expect(access.isSuperAdmin).toBe(true);
    expect(access.permissions).toEqual([...ALL_PERMISSION_KEYS]);
  });

  it('gives an inactive role no permissions', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRow('USER', { role: role({ status: 'INACTIVE' }) }));
    const access = await resolveStaffAccess('user-1');
    expect(access.permissions).toEqual([]);
    expect(access.denyReason).toBe('ROLE_INACTIVE');
  });

  it('denies removed, suspended, role-less and non-staff accounts', async () => {
    const cases: Array<[ReturnType<typeof userRow> | null, string]> = [
      [userRow('USER', { isDeleted: true, status: 'SUSPENDED', role: ADMIN_ROLE }), 'ACCOUNT_REMOVED'],
      [userRow('ADMIN', { status: 'SUSPENDED', role: ADMIN_ROLE }), 'ACCOUNT_SUSPENDED'],
      [userRow('SUPER_ADMIN', { status: 'SUSPENDED', role: SUPER_ROLE }), 'ACCOUNT_SUSPENDED'],
      [userRow('SUPPORT', { role: null }), 'NO_ROLE'],
      [userRow('USER', null), 'NOT_STAFF'],
      [null, 'NOT_STAFF'],
    ];
    for (const [row, reason] of cases) {
      invalidateStaffAccessCache();
      mockPrisma.user.findUnique.mockResolvedValue(row);
      const access = await resolveStaffAccess('user-1');
      expect(access.denyReason).toBe(reason);
      expect(access.permissions).toEqual([]);
      expect(access.isSuperAdmin).toBe(false);
    }
  });

  it('caches per user, re-reads after invalidation, after the TTL and when asked for a fresh read', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockPrisma.user.findUnique.mockResolvedValue(userRow('SUPPORT', { role: role() }));

    await resolveStaffAccess('user-1');
    await resolveStaffAccess('user-1');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);

    mockPrisma.user.findUnique.mockResolvedValue(userRow('SUPPORT', { role: role({ permissions: ['faqs:read'] }) }));
    expect((await resolveStaffAccess('user-1')).permissions).toEqual(['blogs:read', 'blogs:update']);

    invalidateStaffAccessCache();
    expect((await resolveStaffAccess('user-1')).permissions).toEqual(['faqs:read']);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date(NOW.getTime() + STAFF_ACCESS_CACHE_TTL_MS + 1));
    await resolveStaffAccess('user-1');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(3);

    await resolveStaffAccess('user-1', { fresh: true });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(4);
    expect(STAFF_ACCESS_CACHE_TTL_MS).toBeLessThanOrEqual(30_000);
  });

  it('fails closed when the role cannot be read', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('database unavailable'));
    await expect(resolveStaffAccess('user-1')).rejects.toThrow('database unavailable');
  });
});

// ---------------------------------------------------------------------------------------------
// checkPermission
// ---------------------------------------------------------------------------------------------

describe('checkPermission', () => {
  it('behaves for the three seeded roles exactly as the static map did, for every key', async () => {
    const seeded: Array<['SUPER_ADMIN' | 'ADMIN' | 'SUPPORT', RoleFixture]> = [
      ['SUPER_ADMIN', SUPER_ROLE],
      ['ADMIN', ADMIN_ROLE],
      ['SUPPORT', SUPPORT_ROLE],
    ];
    for (const [legacyRole, seededRole] of seeded) {
      invalidateStaffAccessCache();
      mockPrisma.user.findUnique.mockResolvedValue(userRow(legacyRole, { role: seededRole }));
      for (const key of ALL_PERMISSION_KEYS) {
        const allowedBefore = hasPermission(legacyRole, key);
        const check = checkPermission(key)(request('user-1', legacyRole));
        if (allowedBefore) await expect(check).resolves.toBeUndefined();
        else await expect(check).rejects.toMatchObject({ statusCode: 403, code: 'AUTHORIZATION_ERROR' });
      }
    }
  });

  it('reads the role from the database, not from the token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRow('SUPPORT', { role: role() }));
    // The token claims SUPER_ADMIN; the stored role only allows blog editing.
    await expect(checkPermission('staff:delete')(request('user-1', 'SUPER_ADMIN'))).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(checkPermission('blogs:update')(request('user-1', 'SUPER_ADMIN'))).resolves.toBeUndefined();
  });

  it('accepts any one of several keys', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRow('SUPPORT', { role: role({ permissions: ['staff:create'] }) }));
    await expect(
      checkPermission('roles:read', 'staff:create', 'staff:update')(request())
    ).resolves.toBeUndefined();
    await expect(checkPermission('roles:read', 'roles:update')(request())).rejects.toThrow(
      "Role 'Content Editor' lacks 'roles:read' or 'roles:update' permission"
    );
  });

  it('refuses suspended and removed staff and members of an inactive role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRow('ADMIN', { status: 'SUSPENDED', role: ADMIN_ROLE }));
    await expect(checkPermission('dashboard:read')(request())).rejects.toThrow('Your account is suspended');

    invalidateStaffAccessCache();
    mockPrisma.user.findUnique.mockResolvedValue(userRow('USER', { isDeleted: true, role: ADMIN_ROLE }));
    await expect(checkPermission('dashboard:read')(request())).rejects.toThrow('This account has been removed');

    invalidateStaffAccessCache();
    mockPrisma.user.findUnique.mockResolvedValue(userRow('USER', { role: { ...ADMIN_ROLE, status: 'INACTIVE' } }));
    await expect(checkPermission('dashboard:read')(request())).rejects.toThrow('Your role is inactive');
  });

  it('requires an authenticated request', async () => {
    await expect(checkPermission('dashboard:read')({} as never)).rejects.toThrow('Authentication required');
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------------------------
// User.role tier
// ---------------------------------------------------------------------------------------------

describe('effectiveLegacyRole', () => {
  const active = { status: 'ACTIVE' as const, isDeleted: false };

  it('maps a usable staff account to the tier of its role', () => {
    expect(effectiveLegacyRole(active, SUPER_ROLE)).toBe('SUPER_ADMIN');
    expect(effectiveLegacyRole(active, ADMIN_ROLE)).toBe('ADMIN');
    expect(effectiveLegacyRole(active, SUPPORT_ROLE)).toBe('SUPPORT');
    expect(effectiveLegacyRole(active, role())).toBe('SUPPORT');
  });

  it('is USER whenever the account is not usable', () => {
    expect(effectiveLegacyRole({ status: 'SUSPENDED', isDeleted: false }, ADMIN_ROLE)).toBe('USER');
    expect(effectiveLegacyRole({ status: 'ACTIVE', isDeleted: true }, SUPER_ROLE)).toBe('USER');
    expect(effectiveLegacyRole(active, null)).toBe('USER');
    expect(effectiveLegacyRole(active, { ...ADMIN_ROLE, status: 'INACTIVE' })).toBe('USER');
  });
});

describe('linkUserToSystemRole (previous Admin Staff endpoints)', () => {
  it('puts the user on the matching system role', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue({ id: SUPPORT_ROLE.id });
    await linkUserToSystemRole('user-9', 'SUPPORT', 'super-1');
    expect(mockPrisma.adminRole.findUnique.mock.calls[0][0].where).toEqual({ slug: 'support' });
    expect(mockPrisma.staffProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-9' },
      create: { userId: 'user-9', roleId: SUPPORT_ROLE.id, createdById: 'super-1' },
      update: { roleId: SUPPORT_ROLE.id },
    });
  });

  it('does nothing when roles are not seeded or the value is not a staff role', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(null);
    await linkUserToSystemRole('user-9', 'ADMIN');
    await linkUserToSystemRole('user-9', 'USER');
    expect(mockPrisma.staffProfile.upsert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------------------------

describe('role schemas', () => {
  it('reject protected fields in a request body', () => {
    expect(createRoleSchema.safeParse({ name: 'Editors', isSuperAdmin: true }).success).toBe(false);
    expect(createRoleSchema.safeParse({ name: 'Editors', isSystem: true }).success).toBe(false);
    expect(updateRoleSchema.safeParse({ slug: 'super-admin' }).success).toBe(false);
    expect(updateRoleSchema.safeParse({ legacyRole: 'ADMIN' }).success).toBe(false);
    expect(createRoleSchema.parse({ name: '  Editors  ' })).toEqual({ name: 'Editors', permissions: [] });
  });

  it('slugifies role names', () => {
    expect(slugifyRoleName('Content  Editor & QA')).toBe('content-editor-qa');
    expect(slugifyRoleName('संपादक')).toBe('');
  });
});

describe('roleService', () => {
  it('creates a role with catalogue keys only, never as a super admin or system role', async () => {
    mockPrisma.adminRole.findFirst.mockResolvedValue(null);
    mockPrisma.adminRole.findUnique.mockResolvedValue(null);
    mockPrisma.adminRole.create.mockImplementation(async ({ data }: { data: Partial<RoleFixture> }) =>
      role({ ...data, id: 'role-new' })
    );

    const created = await roleService.createRole(
      { name: 'Blog Team', permissions: ['blogs:update', 'blogs:read', 'blogs:read'] },
      MANAGER_ACTOR,
      META
    );

    const data = mockPrisma.adminRole.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: 'Blog Team',
      slug: 'blog-team',
      permissions: ['blogs:read', 'blogs:update'],
      isSuperAdmin: false,
      isSystem: false,
      legacyRole: 'SUPPORT',
      createdById: MANAGER_ACTOR.id,
    });
    expect(created.permissions).toEqual(['blogs:read', 'blogs:update']);
    expect(lastAudit()).toMatchObject({
      adminId: MANAGER_ACTOR.id,
      action: 'ROLE_CREATED',
      resource: 'AdminRole:role-new',
      ipAddress: META.ipAddress,
    });
  });

  it('refuses keys that are not in the catalogue and duplicate names', async () => {
    await expect(
      roleService.createRole({ name: 'Blog Team', permissions: ['blogs:read', 'roles.view'] }, SUPER_ACTOR)
    ).rejects.toMatchObject({ statusCode: 400, message: 'One or more permissions are invalid' });

    mockPrisma.adminRole.findFirst.mockResolvedValue({ id: 'other' });
    await expect(roleService.createRole({ name: 'admin', permissions: [] }, SUPER_ACTOR)).rejects.toThrow(
      'A role with this name already exists'
    );
    expect(mockPrisma.adminRole.create).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });

  it('never modifies the super admin role and never renames a system role', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(SUPER_ROLE);
    await expect(roleService.updateRole(SUPER_ROLE.id, { permissions: [] }, SUPER_ACTOR)).rejects.toMatchObject({
      statusCode: 403,
      message: 'The Super Admin role cannot be modified',
    });
    await expect(roleService.updateRoleStatus(SUPER_ROLE.id, 'INACTIVE', SUPER_ACTOR)).rejects.toMatchObject({
      statusCode: 403,
    });

    mockPrisma.adminRole.findUnique.mockResolvedValue(ADMIN_ROLE);
    await expect(roleService.updateRole(ADMIN_ROLE.id, { name: 'Operators' }, SUPER_ACTOR)).rejects.toThrow(
      'System role cannot be renamed'
    );
    expect(mockPrisma.adminRole.update).not.toHaveBeenCalled();
  });

  it('lets the permissions of a system role be edited and records what changed', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(SUPPORT_ROLE);
    const next = [...SUPPORT_ROLE.permissions, 'blogs:read'].filter((key) => key !== 'jyoti:read');
    mockPrisma.adminRole.update.mockResolvedValue({ ...SUPPORT_ROLE, permissions: next });

    await roleService.updateRole(SUPPORT_ROLE.id, { permissions: next }, SUPER_ACTOR, META);

    const details = JSON.parse(lastAudit().details);
    expect(lastAudit().action).toBe('ROLE_UPDATED');
    expect(details.permissionsAdded).toEqual(['blogs:read']);
    expect(details.permissionsRemoved).toEqual(['jyoti:read']);
  });

  it('stops a non-super-admin from removing role management from, or deactivating, their own role', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(MANAGER_ROLE);
    await expect(
      roleService.updateRole(MANAGER_ROLE.id, { permissions: ['roles:read', 'staff:read'] }, MANAGER_ACTOR)
    ).rejects.toThrow('You cannot remove Role Management permissions from your own role');
    await expect(roleService.updateRoleStatus(MANAGER_ROLE.id, 'INACTIVE', MANAGER_ACTOR)).rejects.toThrow(
      'You cannot deactivate your own role'
    );
    await expect(roleService.updateRole(MANAGER_ROLE.id, { status: 'INACTIVE' }, MANAGER_ACTOR)).rejects.toThrow(
      'You cannot deactivate your own role'
    );
    expect(mockPrisma.adminRole.update).not.toHaveBeenCalled();
  });

  it('deactivating a role drops its members to the USER tier and reactivating restores it', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(ADMIN_ROLE);
    mockPrisma.adminRole.update.mockResolvedValue({ ...ADMIN_ROLE, status: 'INACTIVE' });
    await roleService.updateRoleStatus(ADMIN_ROLE.id, 'INACTIVE', SUPER_ACTOR, META);
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { staffProfile: { roleId: ADMIN_ROLE.id, status: 'ACTIVE', isDeleted: false } },
      data: { role: 'USER' },
    });
    expect(lastAudit().action).toBe('ROLE_STATUS_CHANGED');

    mockPrisma.adminRole.findUnique.mockResolvedValue({ ...ADMIN_ROLE, status: 'INACTIVE' });
    mockPrisma.adminRole.update.mockResolvedValue(ADMIN_ROLE);
    await roleService.updateRoleStatus(ADMIN_ROLE.id, 'ACTIVE', SUPER_ACTOR, META);
    expect(mockPrisma.user.updateMany.mock.calls[1][0].data).toEqual({ role: 'ADMIN' });
  });

  it('refuses to delete system roles, the caller’s own role and roles still in use', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(SUPPORT_ROLE);
    await expect(roleService.deleteRole(SUPPORT_ROLE.id, SUPER_ACTOR)).rejects.toMatchObject({
      statusCode: 403,
      message: 'This role cannot be deleted',
    });

    mockPrisma.adminRole.findUnique.mockResolvedValue(MANAGER_ROLE);
    await expect(roleService.deleteRole(MANAGER_ROLE.id, MANAGER_ACTOR)).rejects.toThrow(
      'You cannot delete your own role'
    );

    mockPrisma.adminRole.findUnique.mockResolvedValue(role());
    mockPrisma.staffProfile.count.mockResolvedValue(2);
    await expect(roleService.deleteRole('role-custom', SUPER_ACTOR)).rejects.toThrow('assigned to 2 staff account(s)');
    expect(mockPrisma.adminRole.delete).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });

  it('deletes an unused custom role and audits it', async () => {
    mockPrisma.adminRole.findUnique.mockResolvedValue(role());
    mockPrisma.staffProfile.count.mockResolvedValue(0);
    await roleService.deleteRole('role-custom', SUPER_ACTOR, META);
    expect(mockPrisma.staffProfile.count).toHaveBeenCalledWith({ where: { roleId: 'role-custom', isDeleted: false } });
    expect(mockPrisma.adminRole.delete).toHaveBeenCalledWith({ where: { id: 'role-custom' } });
    expect(lastAudit()).toMatchObject({ action: 'ROLE_DELETED', resource: 'AdminRole:role-custom' });
  });

  it('returns the catalogue grouped or flat', () => {
    expect(roleService.getPermissions(false)).toEqual({ groups: buildPermissionMatrix() });
    expect(roleService.getPermissions(true)).toEqual({ items: PERMISSION_CATALOGUE });
  });
});

// ---------------------------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------------------------

describe('staff schemas', () => {
  const valid = {
    fullName: 'New Person',
    email: 'New.Person@Example.Test',
    password: STRONG_PASSWORD,
    roleId: '7f9c2b1e-5a44-4d0e-9d8a-3f6b2c1d4e5f',
  };

  it('apply the platform password policy and normalise the email', () => {
    expect(createStaffSchema.parse(valid).email).toBe('new.person@example.test');
    expect(createStaffSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
    expect(createStaffSchema.safeParse({ ...valid, password: 'alllowercase' }).success).toBe(false);
    expect(resetStaffPasswordSchema.safeParse({ newPassword: 'password' }).success).toBe(false);
    expect(resetStaffPasswordSchema.safeParse({ newPassword: STRONG_PASSWORD }).success).toBe(true);
  });

  it('reject unknown fields and malformed ids', () => {
    expect(createStaffSchema.safeParse({ ...valid, isSuperAdmin: true }).success).toBe(false);
    expect(createStaffSchema.safeParse({ ...valid, role: 'SUPER_ADMIN' }).success).toBe(false);
    expect(updateStaffRoleSchema.safeParse({ roleId: 'super-admin' }).success).toBe(false);
  });
});

describe('staffService', () => {
  const input = {
    fullName: 'New Person',
    email: 'new.person@example.test',
    password: STRONG_PASSWORD,
    roleId: ADMIN_ROLE.id,
  };

  it('creates a staff account with a hashed password that is never returned or audited', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.adminRole.findUnique.mockResolvedValue(ADMIN_ROLE);
    mockPrisma.user.create.mockResolvedValue({ id: 'staff-new' });
    mockPrisma.staffProfile.findFirst.mockResolvedValue(
      staffRecord({ userId: 'staff-new', user: { id: 'staff-new', email: input.email, fullName: input.fullName } })
    );

    const created = await staffService.createStaff(input, SUPER_ACTOR, META);

    const data = mockPrisma.user.create.mock.calls[0][0].data;
    expect(data.passwordHash).not.toBe(STRONG_PASSWORD);
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(data.role).toBe('ADMIN');
    expect(data.staffProfile.create).toMatchObject({ roleId: ADMIN_ROLE.id, status: 'ACTIVE', createdById: 'super-1' });

    const everythingReturnedOrLogged = JSON.stringify([created, logAction.mock.calls]);
    expect(everythingReturnedOrLogged).not.toContain(STRONG_PASSWORD);
    expect(everythingReturnedOrLogged).not.toContain(data.passwordHash);
    expect(created).not.toHaveProperty('passwordHash');
    expect(lastAudit()).toMatchObject({ action: 'STAFF_CREATED', resource: 'User:staff-new' });
  });

  it('refuses an email already in use, an unknown role and an inactive role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'someone' });
    await expect(staffService.createStaff(input, SUPER_ACTOR)).rejects.toThrow(
      'An account with this email already exists'
    );

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.adminRole.findUnique.mockResolvedValue(null);
    await expect(staffService.createStaff(input, SUPER_ACTOR)).rejects.toThrow('Invalid role');

    mockPrisma.adminRole.findUnique.mockResolvedValue({ ...ADMIN_ROLE, status: 'INACTIVE' });
    await expect(staffService.createStaff(input, SUPER_ACTOR)).rejects.toThrow('Cannot assign an inactive role');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('lets only a super admin assign the super admin role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.adminRole.findUnique.mockResolvedValue(SUPER_ROLE);
    await expect(staffService.createStaff({ ...input, roleId: SUPER_ROLE.id }, MANAGER_ACTOR)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Only a Super Admin can assign the Super Admin role',
    });

    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffRecord());
    await expect(staffService.updateStaffRole('staff-2', SUPER_ROLE.id, MANAGER_ACTOR)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.staffProfile.update).not.toHaveBeenCalled();
  });

  it('lets only a super admin modify a super admin account', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffRecord({ role: SUPER_ROLE, roleId: SUPER_ROLE.id }));
    const message = "Only a Super Admin can modify another Super Admin's account";
    await expect(staffService.updateStaff('staff-2', { city: 'Pune' }, MANAGER_ACTOR)).rejects.toThrow(message);
    await expect(staffService.updateStaffRole('staff-2', ADMIN_ROLE.id, MANAGER_ACTOR)).rejects.toThrow(message);
    await expect(staffService.updateStaffStatus('staff-2', 'SUSPENDED', MANAGER_ACTOR)).rejects.toThrow(message);
    await expect(staffService.resetStaffPassword('staff-2', STRONG_PASSWORD, MANAGER_ACTOR)).rejects.toThrow(message);
    await expect(staffService.deleteStaff('staff-2', MANAGER_ACTOR)).rejects.toThrow(message);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('never lets a staff member change their own role or status, or delete themselves', async () => {
    const self = SUPER_ACTOR.id;
    await expect(staffService.updateStaffRole(self, ADMIN_ROLE.id, SUPER_ACTOR)).rejects.toThrow(
      'You cannot change the role of your own account'
    );
    await expect(staffService.updateStaffStatus(self, 'SUSPENDED', SUPER_ACTOR)).rejects.toThrow(
      'You cannot change the status of your own account'
    );
    await expect(staffService.deleteStaff(self, SUPER_ACTOR)).rejects.toThrow('You cannot delete your own account');
    expect(mockPrisma.staffProfile.findFirst).not.toHaveBeenCalled();
  });

  it('never demotes, suspends or removes the last usable super admin', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffRecord({ role: SUPER_ROLE, roleId: SUPER_ROLE.id }));
    mockPrisma.adminRole.findUnique.mockResolvedValue(ADMIN_ROLE);
    mockPrisma.user.count.mockResolvedValue(0);
    const message = 'Cannot modify the last remaining Super Admin account';

    await expect(staffService.updateStaffRole('staff-2', ADMIN_ROLE.id, SUPER_ACTOR)).rejects.toThrow(message);
    await expect(staffService.updateStaffStatus('staff-2', 'SUSPENDED', SUPER_ACTOR)).rejects.toThrow(message);
    await expect(staffService.deleteStaff('staff-2', SUPER_ACTOR)).rejects.toThrow(message);
    expect(mockPrisma.user.count).toHaveBeenCalledWith({ where: { role: 'SUPER_ADMIN', id: { not: 'staff-2' } } });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();

    mockPrisma.user.count.mockResolvedValue(1);
    await staffService.updateStaffStatus('staff-2', 'SUSPENDED', SUPER_ACTOR, META);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('changes a role, moving the User.role tier with it', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffRecord());
    mockPrisma.adminRole.findUnique.mockResolvedValue(role());

    await staffService.updateStaffRole('staff-2', 'role-custom', MANAGER_ACTOR, META);

    expect(mockPrisma.staffProfile.update).toHaveBeenCalledWith({
      where: { userId: 'staff-2' },
      data: { role: { connect: { id: 'role-custom' } } },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'staff-2' }, data: { role: 'SUPPORT' } });
    expect(lastAudit().action).toBe('STAFF_ROLE_CHANGED');
    expect(JSON.parse(lastAudit().details)).toMatchObject({ previousRole: 'Admin', role: 'Content Editor' });
  });

  it('suspends: USER tier, sessions revoked, audited; activation restores the tier', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffRecord());
    await staffService.updateStaffStatus('staff-2', 'SUSPENDED', SUPER_ACTOR, META);

    expect(mockPrisma.staffProfile.update).toHaveBeenCalledWith({ where: { userId: 'staff-2' }, data: { status: 'SUSPENDED' } });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'staff-2' }, data: { role: 'USER' } });
    expect(mockPrisma.refreshToken.updateMany.mock.calls[0][0].where).toEqual({ userId: 'staff-2', revokedAt: null });
    expect(lastAudit().action).toBe('STAFF_SUSPENDED');

    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffRecord({ status: 'SUSPENDED' }));
    await staffService.updateStaffStatus('staff-2', 'ACTIVE', SUPER_ACTOR, META);
    expect(mockPrisma.user.update.mock.calls[1][0].data).toEqual({ role: 'ADMIN' });
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    expect(lastAudit().action).toBe('STAFF_ACTIVATED');
  });

  it('resets a password without returning or logging it, and signs the account out', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffRecord());
    const result = await staffService.resetStaffPassword('staff-2', STRONG_PASSWORD, SUPER_ACTOR, META);

    const hash = mockPrisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(result).toEqual({ message: 'Password reset successfully' });
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(logAction.mock.calls);
    expect(logged).not.toContain(STRONG_PASSWORD);
    expect(logged).not.toContain(hash);
    expect(lastAudit().action).toBe('STAFF_PASSWORD_RESET');
  });

  it('deletes softly: the row is flagged, suspended, dropped to USER and signed out', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(staffRecord());
    await staffService.deleteStaff('staff-2', SUPER_ACTOR, META);

    const data = mockPrisma.staffProfile.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ isDeleted: true, status: 'SUSPENDED' });
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'staff-2' }, data: { role: 'USER' } });
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    expect(lastAudit()).toMatchObject({ action: 'STAFF_DELETED', resource: 'User:staff-2' });
  });

  it('treats a removed account as not found', async () => {
    mockPrisma.staffProfile.findFirst.mockResolvedValue(null);
    await expect(staffService.getStaff('staff-2')).rejects.toMatchObject({ statusCode: 404 });
    expect(mockPrisma.staffProfile.findFirst.mock.calls[0][0].where).toEqual({ userId: 'staff-2', isDeleted: false });
  });

  it('changes the caller’s own password only with the current one', async () => {
    const bcrypt = await import('bcryptjs');
    const current = await bcrypt.default.hash('Curr3nt-Passphrase', 4);
    mockPrisma.user.findUnique.mockResolvedValue({ passwordHash: current });

    await expect(staffService.changeOwnPassword('wrong', STRONG_PASSWORD, MANAGER_ACTOR)).rejects.toThrow(
      'Current password is incorrect'
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();

    await staffService.changeOwnPassword('Curr3nt-Passphrase', STRONG_PASSWORD, MANAGER_ACTOR, META);
    expect(mockPrisma.user.update.mock.calls[0][0].where).toEqual({ id: MANAGER_ACTOR.id });
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    expect(lastAudit().action).toBe('ADMIN_PASSWORD_CHANGED');
    expect(JSON.stringify(logAction.mock.calls)).not.toContain(STRONG_PASSWORD);
  });
});

// ---------------------------------------------------------------------------------------------
// Seed and backfill
// ---------------------------------------------------------------------------------------------

describe('seedRbac', () => {
  function fakeClient(existingAdmins: Array<{ id: string; role: string }>) {
    const roles: RoleFixture[] = [];
    const profiles: Array<{ userId: string; roleId: string; status: string }> = [];
    const client = {
      adminRole: {
        findUnique: vi.fn(async ({ where }: { where: { slug: string } }) => roles.find((r) => r.slug === where.slug) ?? null),
        create: vi.fn(async ({ data }: { data: Partial<RoleFixture> }) => {
          const created = role({ ...data, id: `id-${data.slug}` });
          roles.push(created);
          return created;
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<RoleFixture> }) => {
          const found = roles.find((r) => r.id === where.id) as RoleFixture;
          Object.assign(found, data);
          return found;
        }),
        findMany: vi.fn(async () => roles),
      },
      user: {
        findMany: vi.fn(async () => existingAdmins.filter((u) => !profiles.some((p) => p.userId === u.id))),
        count: vi.fn(async () => existingAdmins.filter((u) => u.role === 'SUPER_ADMIN').length),
      },
      staffProfile: {
        create: vi.fn(async ({ data }: { data: { userId: string; roleId: string; status: string } }) => {
          profiles.push(data);
          return data;
        }),
      },
    };
    return { client, roles, profiles };
  }

  it('creates the three system roles with the static permissions and links every existing admin', async () => {
    const { client, roles, profiles } = fakeClient([
      { id: 'u-super', role: 'SUPER_ADMIN' },
      { id: 'u-admin', role: 'ADMIN' },
      { id: 'u-support', role: 'SUPPORT' },
    ]);

    const result = await seedRbac(client as never);

    expect(result.rolesCreated).toEqual(['super-admin', 'admin', 'support']);
    expect(result.staffProfilesCreated).toBe(3);
    expect(result.activeSuperAdmins).toBe(1);
    for (const legacyRole of ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] as const) {
      const seeded = roles.find((r) => r.legacyRole === legacyRole) as RoleFixture;
      expect(seeded.isSystem).toBe(true);
      expect(seeded.isSuperAdmin).toBe(legacyRole === 'SUPER_ADMIN');
      expect([...seeded.permissions].sort()).toEqual([...getPermissionsForRole(legacyRole)].sort());
    }
    expect(profiles).toEqual([
      { userId: 'u-super', roleId: 'id-super-admin', status: 'ACTIVE' },
      { userId: 'u-admin', roleId: 'id-admin', status: 'ACTIVE' },
      { userId: 'u-support', roleId: 'id-support', status: 'ACTIVE' },
    ]);
    expect(client.user.findMany.mock.calls[0][0].where).toEqual({
      role: { in: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
      staffProfile: { is: null },
    });
  });

  it('is repeatable and keeps edits made to a system role unless asked to reset them', async () => {
    const { client, roles, profiles } = fakeClient([{ id: 'u-admin', role: 'ADMIN' }]);
    await seedRbac(client as never);

    const support = roles.find((r) => r.slug === 'support') as RoleFixture;
    support.permissions = ['dashboard:read', 'retired:key'];
    support.status = 'INACTIVE';

    const second = await seedRbac(client as never);
    expect(second.rolesCreated).toEqual([]);
    expect(second.staffProfilesCreated).toBe(0);
    expect(profiles).toHaveLength(1);
    expect(support.permissions).toEqual(['dashboard:read', 'retired:key']);
    expect(support.status).toBe('INACTIVE');
    expect(second.activeSuperAdmins).toBe(0);

    const pruned = await seedRbac(client as never, { prune: true });
    expect(pruned.rolesPruned).toBe(1);
    expect(support.permissions).toEqual(['dashboard:read']);

    await seedRbac(client as never, { resetSystemRolePermissions: true });
    expect([...support.permissions].sort()).toEqual([...getPermissionsForRole('SUPPORT')].sort());
  });
});
