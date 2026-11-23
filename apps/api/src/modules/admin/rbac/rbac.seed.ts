import type { PrismaClient } from '@prisma/client';
import { ALL_PERMISSION_KEYS, normalizePermissionKeys } from './permission.catalog';
import { SYSTEM_ROLES } from './system-roles';

/**
 * Seeds the system roles and backfills staff profiles. Idempotent: safe to run on every deploy.
 * It takes the Prisma client as an argument and imports nothing that reads configuration, so it
 * can be called from prisma/seed.ts or from a one-off script.
 *
 * 1. System roles (super-admin, admin, support): created with the permissions the static map in
 *    admin.permissions.ts gives SUPER_ADMIN / ADMIN / SUPPORT. An existing system role keeps the
 *    permissions an admin has given it since, unless `resetSystemRolePermissions` is set.
 * 2. Backfill: every user whose `User.role` is SUPER_ADMIN / ADMIN / SUPPORT and who has no staff
 *    profile gets one, linked to the matching system role, status ACTIVE.
 * 3. `prune`: removes keys that are no longer in the code catalogue from every role.
 */
export interface SeedRbacOptions {
  resetSystemRolePermissions?: boolean;
  prune?: boolean;
  log?: (message: string) => void;
}

export interface SeedRbacResult {
  rolesCreated: string[];
  rolesUpdated: string[];
  staffProfilesCreated: number;
  rolesPruned: number;
  activeSuperAdmins: number;
}

export async function seedRbac(client: PrismaClient, options: SeedRbacOptions = {}): Promise<SeedRbacResult> {
  const log = options.log ?? (() => undefined);
  const result: SeedRbacResult = {
    rolesCreated: [],
    rolesUpdated: [],
    staffProfilesCreated: 0,
    rolesPruned: 0,
    activeSuperAdmins: 0,
  };

  const roleIdByLegacyRole = new Map<string, string>();

  for (const definition of SYSTEM_ROLES) {
    const defaults = definition.isSuperAdmin
      ? [...ALL_PERMISSION_KEYS]
      : normalizePermissionKeys(definition.defaultPermissions);
    const existing = await client.adminRole.findUnique({ where: { slug: definition.slug } });

    if (!existing) {
      const created = await client.adminRole.create({
        data: {
          name: definition.name,
          slug: definition.slug,
          description: definition.description,
          permissions: defaults,
          isSuperAdmin: definition.isSuperAdmin,
          isSystem: true,
          legacyRole: definition.legacyRole,
          status: 'ACTIVE',
        },
      });
      roleIdByLegacyRole.set(definition.legacyRole, created.id);
      result.rolesCreated.push(definition.slug);
      log(`Role ${definition.slug}: created with ${defaults.length} permissions.`);
      continue;
    }

    const resetPermissions = definition.isSuperAdmin || options.resetSystemRolePermissions === true;
    await client.adminRole.update({
      where: { id: existing.id },
      data: {
        isSuperAdmin: definition.isSuperAdmin,
        isSystem: true,
        legacyRole: definition.legacyRole,
        // The super admin role can never be deactivated; the others keep the status an admin set.
        ...(definition.isSuperAdmin ? { status: 'ACTIVE' as const } : {}),
        ...(resetPermissions ? { permissions: defaults } : {}),
      },
    });
    roleIdByLegacyRole.set(definition.legacyRole, existing.id);
    result.rolesUpdated.push(definition.slug);
    log(`Role ${definition.slug}: already present${resetPermissions ? ', permissions reset to defaults' : ''}.`);
  }

  const legacyAdmins = await client.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] }, staffProfile: { is: null } },
    select: { id: true, role: true },
  });
  for (const admin of legacyAdmins) {
    const roleId = roleIdByLegacyRole.get(admin.role);
    if (!roleId) continue;
    await client.staffProfile.create({ data: { userId: admin.id, roleId, status: 'ACTIVE' } });
    result.staffProfilesCreated += 1;
  }
  log(`Staff profiles: ${result.staffProfilesCreated} created for existing admins.`);

  if (options.prune) {
    const roles = await client.adminRole.findMany({ select: { id: true, permissions: true } });
    for (const role of roles) {
      const kept = normalizePermissionKeys(role.permissions);
      if (kept.length !== role.permissions.length) {
        await client.adminRole.update({ where: { id: role.id }, data: { permissions: kept } });
        result.rolesPruned += 1;
      }
    }
    log(`Pruned out-of-catalogue permission keys from ${result.rolesPruned} role(s).`);
  }

  result.activeSuperAdmins = await client.user.count({ where: { role: 'SUPER_ADMIN' } });
  if (result.activeSuperAdmins === 0) {
    log('WARNING: no user holds the Super Admin role. Nobody can manage roles or staff until one is assigned.');
  }

  return result;
}
