import { prisma } from '../../../services/prisma.service';
import { getPermissionsForRole, type Permission } from '../admin.permissions';
import { ALL_PERMISSION_KEYS, normalizePermissionKeys } from './permission.catalog';
import { systemRoleForLegacyRole } from './system-roles';

/**
 * Resolves what a staff member may do, from the database.
 *
 * Order of resolution for a user id:
 *  1. The user has a StaffProfile: a removed or suspended profile has no access; otherwise the
 *     profile's role decides (super admin = every catalogue key, inactive role = nothing).
 *  2. No StaffProfile but `User.role` is SUPER_ADMIN / ADMIN / SUPPORT (an admin created before
 *     roles moved to the database and not yet backfilled): the seeded system role for that value
 *     decides, so an edit to the system role applies to these users as well.
 *  3. As 2, but the system role row does not exist (roles not seeded yet): the static map in
 *     admin.permissions.ts decides, which is exactly what applied before.
 *  4. Anything else has no admin access.
 *
 * Results are cached per user for a few seconds in this process. Every role and staff write calls
 * `invalidateStaffAccessCache`, so a change is immediate on the instance that made it and reaches
 * any other API instance within the TTL.
 */

export const STAFF_ACCESS_CACHE_TTL_MS = 10_000;
const CACHE_MAX_ENTRIES = 5_000;

export type StaffDenyReason = 'NOT_STAFF' | 'ACCOUNT_REMOVED' | 'ACCOUNT_SUSPENDED' | 'NO_ROLE' | 'ROLE_INACTIVE';

export interface StaffRoleSummary {
  id: string | null;
  name: string;
  slug: string;
  isSuperAdmin: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface StaffAccess {
  userId: string;
  email: string | null;
  /** The value of `User.role` (the coarse tier carried by the access token). */
  legacyRole: string;
  isSuperAdmin: boolean;
  permissions: Permission[];
  role: StaffRoleSummary | null;
  /** Why the account has no admin access at all, or null when it has a usable role. */
  denyReason: StaffDenyReason | null;
  source: 'staff-profile' | 'system-role' | 'static-default' | 'none';
}

interface RoleRow {
  id: string;
  name: string;
  slug: string;
  isSuperAdmin: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  permissions: string[];
}

const ROLE_SELECT = { id: true, name: true, slug: true, isSuperAdmin: true, status: true, permissions: true } as const;

const cache = new Map<string, { expiresAt: number; access: StaffAccess }>();

/** Drops the cached access of one user, or of everyone when no id is given. */
export function invalidateStaffAccessCache(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

function noAccess(
  userId: string,
  email: string | null,
  legacyRole: string,
  denyReason: StaffDenyReason,
  role: StaffRoleSummary | null = null
): StaffAccess {
  return { userId, email, legacyRole, isSuperAdmin: false, permissions: [], role, denyReason, source: 'none' };
}

function summarize(role: RoleRow): StaffRoleSummary {
  return { id: role.id, name: role.name, slug: role.slug, isSuperAdmin: role.isSuperAdmin, status: role.status };
}

/** The permissions a role row grants. A super admin role is never read for its key list. */
export function permissionsOfRole(role: {
  isSuperAdmin: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  permissions: readonly string[];
}): Permission[] {
  if (role.isSuperAdmin) return [...ALL_PERMISSION_KEYS];
  if (role.status !== 'ACTIVE') return [];
  return normalizePermissionKeys(role.permissions);
}

function accessFromRole(
  userId: string,
  email: string | null,
  legacyRole: string,
  role: RoleRow,
  source: StaffAccess['source']
): StaffAccess {
  const inactive = !role.isSuperAdmin && role.status !== 'ACTIVE';
  return {
    userId,
    email,
    legacyRole,
    isSuperAdmin: role.isSuperAdmin,
    permissions: permissionsOfRole(role),
    role: summarize(role),
    denyReason: inactive ? 'ROLE_INACTIVE' : null,
    source,
  };
}

async function loadStaffAccess(userId: string): Promise<StaffAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      staffProfile: { select: { status: true, isDeleted: true, role: { select: ROLE_SELECT } } },
    },
  });

  if (!user) return noAccess(userId, null, 'USER', 'NOT_STAFF');

  const legacyRole: string = user.role;
  const profile = user.staffProfile;

  if (profile) {
    const roleSummary = profile.role ? summarize(profile.role) : null;
    if (profile.isDeleted) return noAccess(userId, user.email, legacyRole, 'ACCOUNT_REMOVED', roleSummary);
    if (profile.status !== 'ACTIVE') return noAccess(userId, user.email, legacyRole, 'ACCOUNT_SUSPENDED', roleSummary);
    if (!profile.role) return noAccess(userId, user.email, legacyRole, 'NO_ROLE');
    return accessFromRole(userId, user.email, legacyRole, profile.role, 'staff-profile');
  }

  const systemRole = systemRoleForLegacyRole(legacyRole);
  if (!systemRole) return noAccess(userId, user.email, legacyRole, 'NOT_STAFF');

  const seeded = await prisma.adminRole.findUnique({ where: { slug: systemRole.slug }, select: ROLE_SELECT });
  if (seeded) return accessFromRole(userId, user.email, legacyRole, seeded, 'system-role');

  return {
    userId,
    email: user.email,
    legacyRole,
    isSuperAdmin: systemRole.isSuperAdmin,
    permissions: systemRole.isSuperAdmin ? [...ALL_PERMISSION_KEYS] : normalizePermissionKeys(getPermissionsForRole(legacyRole)),
    role: { id: null, name: systemRole.name, slug: systemRole.slug, isSuperAdmin: systemRole.isSuperAdmin, status: 'ACTIVE' },
    denyReason: null,
    source: 'static-default',
  };
}

/**
 * The acting user's role and permissions. `fresh` skips the cache (used at login).
 * A database error is not caught here: a permission check that cannot read the role fails closed.
 */
export async function resolveStaffAccess(userId: string, options: { fresh?: boolean } = {}): Promise<StaffAccess> {
  const now = Date.now();
  if (!options.fresh) {
    const hit = cache.get(userId);
    if (hit && hit.expiresAt > now) return hit.access;
  }

  const access = await loadStaffAccess(userId);

  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(userId, { expiresAt: now + STAFF_ACCESS_CACHE_TTL_MS, access });
  return access;
}

export function accessHasAnyPermission(access: StaffAccess, required: readonly Permission[]): boolean {
  if (access.isSuperAdmin) return true;
  return required.some((permission) => access.permissions.includes(permission));
}
