import type { Role } from '@prisma/client';
import { ValidationError } from '../../../errors/app-error';
import { prisma } from '../../../services/prisma.service';
import { logger } from '../../../utils/logger';
import { invalidateStaffAccessCache } from './rbac.resolver';
import { systemRoleForLegacyRole } from './system-roles';

/**
 * Keeps the old `User.role` column and the previous Admin Staff endpoints in step with
 * database-backed roles. This file must not import admin.service (admin.service imports it).
 */

/**
 * The value `User.role` must hold for a staff account. The rest of the API (and the access token)
 * still reads this coarse tier, so it is USER whenever the staff account is not usable: removed,
 * suspended, without a role, or on an inactive role. Otherwise it is the role's `legacyRole`
 * (SUPER_ADMIN for the super admin role, ADMIN for the seeded Admin role, SUPPORT for every other role).
 */
export function effectiveLegacyRole(
  profile: { status: 'ACTIVE' | 'SUSPENDED'; isDeleted: boolean },
  role: { isSuperAdmin: boolean; status: 'ACTIVE' | 'INACTIVE'; legacyRole: Role } | null
): Role {
  if (profile.isDeleted || profile.status !== 'ACTIVE' || !role) return 'USER';
  if (role.isSuperAdmin) return 'SUPER_ADMIN';
  if (role.status !== 'ACTIVE') return 'USER';
  return role.legacyRole === 'USER' ? 'SUPPORT' : role.legacyRole;
}

/**
 * Called by the previous Admin Staff endpoints (create admin, change role) after they have written
 * `User.role`: gives the user a StaffProfile on the matching system role, or moves an existing
 * profile to it. Does nothing when the system roles are not seeded yet; the permission check then
 * falls back to `User.role` (see rbac.resolver.ts).
 */
export async function linkUserToSystemRole(userId: string, legacyRole: string, actorId?: string): Promise<void> {
  const definition = systemRoleForLegacyRole(legacyRole);
  if (!definition) return;
  try {
    const role = await prisma.adminRole.findUnique({ where: { slug: definition.slug }, select: { id: true } });
    if (role) {
      await prisma.staffProfile.upsert({
        where: { userId },
        create: { userId, roleId: role.id, createdById: actorId ?? null },
        update: { roleId: role.id },
      });
    }
  } catch (err) {
    logger.error(
      { userId, err: err instanceof Error ? err.message : String(err) },
      '[rbac] Could not link the user to a system role'
    );
    throw err;
  } finally {
    invalidateStaffAccessCache(userId);
  }
}

/**
 * Guard for the previous change-role endpoint: it writes `User.role` directly, which must not bring
 * back a staff account that was removed or suspended through the staff endpoints.
 */
export async function assertStaffAccountUsable(userId: string): Promise<void> {
  const profile = await prisma.staffProfile.findUnique({
    where: { userId },
    select: { status: true, isDeleted: true },
  });
  if (!profile) return;
  if (profile.isDeleted) {
    throw new ValidationError('This staff account has been removed and its role cannot be changed');
  }
  if (profile.status !== 'ACTIVE') {
    throw new ValidationError('This staff account is suspended. Activate it before changing its role');
  }
}

/** Stamps the staff profile's last admin login. Best effort: a failure never blocks a login. */
export async function recordStaffLogin(userId: string): Promise<void> {
  try {
    await prisma.staffProfile.updateMany({ where: { userId }, data: { lastLoginAt: new Date() } });
  } catch (err) {
    logger.warn(
      { userId, err: err instanceof Error ? err.message : String(err) },
      '[rbac] Could not record the staff login time'
    );
  }
}
