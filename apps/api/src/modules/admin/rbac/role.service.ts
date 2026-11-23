import type { AdminRole, Prisma } from '@prisma/client';
import { AuthorizationError, NotFoundError, ValidationError } from '../../../errors/app-error';
import { prisma } from '../../../services/prisma.service';
import { adminService } from '../admin.service';
import type { Permission } from '../admin.permissions';
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_CATALOGUE,
  buildPermissionMatrix,
  findUnknownPermissionKeys,
  normalizePermissionKeys,
} from './permission.catalog';
import { invalidateStaffAccessCache } from './rbac.resolver';
import type { CreateRoleInput, RolesQueryInput, UpdateRoleInput } from './rbac.schemas';
import { isUniqueViolation, type RbacActor, type RequestMeta } from './rbac.types';

/** The permissions a non-super-admin must keep on their own role, so they cannot lock themselves out of role management. */
const OWN_ROLE_REQUIRED_PERMISSIONS: readonly Permission[] = ['roles:read', 'roles:update'];

/** Lowercase letters and digits joined by single hyphens (what the website's slugify produced for Latin names). */
export function slugifyRoleName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function serializeRole(role: AdminRole, staffCount?: number) {
  const permissions = role.isSuperAdmin ? [...ALL_PERMISSION_KEYS] : normalizePermissionKeys(role.permissions);
  return {
    id: role.id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    permissions,
    permissionCount: permissions.length,
    isSuperAdmin: role.isSuperAdmin,
    isSystem: role.isSystem,
    status: role.status,
    ...(staffCount === undefined ? {} : { staffCount }),
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

function assertCatalogueKeys(keys: readonly string[]): void {
  const unknown = findUnknownPermissionKeys(keys);
  if (unknown.length > 0) {
    throw new ValidationError('One or more permissions are invalid', [
      { field: 'permissions', message: `Unknown permission keys: ${unknown.slice(0, 20).join(', ')}` },
    ]);
  }
}

async function assertNameFree(name: string, exceptId?: string): Promise<void> {
  const existing = await prisma.adminRole.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new ValidationError('A role with this name already exists');
}

/**
 * Writes the coarse `User.role` tier of every usable member of a role after the role's status
 * changed: USER while the role is inactive, the role's `legacyRole` once it is active again.
 */
function memberTierUpdate(role: Pick<AdminRole, 'id' | 'legacyRole'>, status: 'ACTIVE' | 'INACTIVE') {
  return prisma.user.updateMany({
    where: { staffProfile: { roleId: role.id, status: 'ACTIVE', isDeleted: false } },
    data: { role: status === 'ACTIVE' ? role.legacyRole : 'USER' },
  });
}

export class RoleService {
  public async listRoles(query: RolesQueryInput) {
    const where: Prisma.AdminRoleWhereInput = {
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [roles, total] = await Promise.all([
      prisma.adminRole.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.adminRole.count({ where }),
    ]);

    const counts = roles.length
      ? await prisma.staffProfile.groupBy({
          by: ['roleId'],
          where: { roleId: { in: roles.map((role) => role.id) }, isDeleted: false },
          _count: { _all: true },
        })
      : [];
    const countByRole = new Map(counts.map((row) => [row.roleId, row._count._all]));

    return {
      items: roles.map((role) => serializeRole(role, countByRole.get(role.id) ?? 0)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize) || 1,
      },
    };
  }

  /** Active roles for the role picker of the staff form. */
  public async listRoleOptions() {
    const roles = await prisma.adminRole.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, isSuperAdmin: true },
    });
    return { items: roles };
  }

  public async getRole(id: string) {
    const role = await prisma.adminRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');
    const staffCount = await prisma.staffProfile.count({ where: { roleId: id, isDeleted: false } });
    return serializeRole(role, staffCount);
  }

  /** The permission catalogue: grouped for the role matrix, or flat. */
  public getPermissions(flat: boolean) {
    return flat ? { items: PERMISSION_CATALOGUE } : { groups: buildPermissionMatrix() };
  }

  public async createRole(input: CreateRoleInput, actor: RbacActor, meta?: RequestMeta) {
    assertCatalogueKeys(input.permissions);
    await assertNameFree(input.name);

    const slug = slugifyRoleName(input.name);
    if (!slug) throw new ValidationError('The role name must contain letters or digits');
    const slugTaken = await prisma.adminRole.findUnique({ where: { slug }, select: { id: true } });
    if (slugTaken) throw new ValidationError('A role with a similar name already exists');

    let role: AdminRole;
    try {
      role = await prisma.adminRole.create({
        data: {
          name: input.name,
          slug,
          description: input.description || null,
          permissions: normalizePermissionKeys(input.permissions),
          status: input.status ?? 'ACTIVE',
          isSuperAdmin: false,
          isSystem: false,
          legacyRole: 'SUPPORT',
          createdById: actor.id,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ValidationError('A role with this name already exists');
      throw err;
    }

    invalidateStaffAccessCache();
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'ROLE_CREATED',
      resource: `AdminRole:${role.id}`,
      details: JSON.stringify({ name: role.name, slug: role.slug, status: role.status, permissions: role.permissions }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return serializeRole(role, 0);
  }

  public async updateRole(id: string, input: UpdateRoleInput, actor: RbacActor, meta?: RequestMeta) {
    const role = await prisma.adminRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');

    if (role.isSuperAdmin) throw new AuthorizationError('The Super Admin role cannot be modified');

    const renamed = input.name !== undefined && input.name !== role.name;
    if (renamed && role.isSystem) throw new AuthorizationError('System role cannot be renamed');
    if (renamed && input.name) await assertNameFree(input.name, id);

    const isOwnRole = actor.roleId === role.id;

    let nextPermissions: Permission[] | undefined;
    if (input.permissions !== undefined) {
      assertCatalogueKeys(input.permissions);
      nextPermissions = normalizePermissionKeys(input.permissions);
      if (isOwnRole && !actor.isSuperAdmin) {
        const kept = new Set<string>(nextPermissions);
        if (OWN_ROLE_REQUIRED_PERMISSIONS.some((key) => !kept.has(key))) {
          throw new ValidationError('You cannot remove Role Management permissions from your own role');
        }
      }
    }

    const statusChanged = input.status !== undefined && input.status !== role.status;
    if (statusChanged && isOwnRole && input.status !== 'ACTIVE') {
      throw new ValidationError('You cannot deactivate your own role');
    }

    const data: Prisma.AdminRoleUpdateInput = {
      ...(renamed && input.name ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(nextPermissions ? { permissions: nextPermissions } : {}),
      ...(statusChanged && input.status ? { status: input.status } : {}),
    };

    let updated: AdminRole;
    try {
      if (statusChanged && input.status) {
        const [row] = await prisma.$transaction([
          prisma.adminRole.update({ where: { id }, data }),
          memberTierUpdate(role, input.status),
        ]);
        updated = row;
      } else {
        updated = await prisma.adminRole.update({ where: { id }, data });
      }
    } catch (err) {
      if (isUniqueViolation(err)) throw new ValidationError('A role with this name already exists');
      throw err;
    }

    invalidateStaffAccessCache();

    const before = new Set(normalizePermissionKeys(role.permissions));
    const after = new Set(normalizePermissionKeys(updated.permissions));
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'ROLE_UPDATED',
      resource: `AdminRole:${id}`,
      details: JSON.stringify({
        name: updated.name,
        ...(renamed ? { previousName: role.name } : {}),
        ...(statusChanged ? { previousStatus: role.status, status: updated.status } : {}),
        permissionsAdded: [...after].filter((key) => !before.has(key)),
        permissionsRemoved: [...before].filter((key) => !after.has(key)),
      }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return serializeRole(updated);
  }

  public async updateRoleStatus(id: string, status: 'ACTIVE' | 'INACTIVE', actor: RbacActor, meta?: RequestMeta) {
    const role = await prisma.adminRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');

    if (role.isSuperAdmin) throw new AuthorizationError('The Super Admin role cannot be modified');
    if (actor.roleId === role.id && status !== 'ACTIVE') {
      throw new ValidationError('You cannot deactivate your own role');
    }

    const [updated] = await prisma.$transaction([
      prisma.adminRole.update({ where: { id }, data: { status } }),
      memberTierUpdate(role, status),
    ]);

    invalidateStaffAccessCache();
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'ROLE_STATUS_CHANGED',
      resource: `AdminRole:${id}`,
      details: JSON.stringify({ name: role.name, previousStatus: role.status, status }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return serializeRole(updated);
  }

  public async deleteRole(id: string, actor: RbacActor, meta?: RequestMeta) {
    const role = await prisma.adminRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');

    if (role.isSuperAdmin || role.isSystem) throw new AuthorizationError('This role cannot be deleted');
    if (actor.roleId === role.id) throw new ValidationError('You cannot delete your own role');

    const inUse = await prisma.staffProfile.count({ where: { roleId: id, isDeleted: false } });
    if (inUse > 0) {
      throw new ValidationError(
        `Cannot delete this role: it is assigned to ${inUse} staff account(s). Reassign them first.`
      );
    }

    // Removed staff accounts that still point at the role lose the link (the relation is SET NULL).
    await prisma.adminRole.delete({ where: { id } });

    invalidateStaffAccessCache();
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'ROLE_DELETED',
      resource: `AdminRole:${id}`,
      details: JSON.stringify({ name: role.name, slug: role.slug, permissions: normalizePermissionKeys(role.permissions) }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { message: 'Role deleted successfully', id };
  }
}

export const roleService = new RoleService();
