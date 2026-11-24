import type { Prisma } from '@prisma/client';
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '../../../errors/app-error';
import { prisma } from '../../../services/prisma.service';
import { hashPassword, verifyPassword } from '../../../utils/hash';
import { adminService } from '../admin.service';
import { assertHoldsAll } from './grant-guard';
import { invalidateStaffAccessCache } from './rbac.resolver';
import type { CreateStaffInput, StaffQueryInput, UpdateStaffInput } from './rbac.schemas';
import { isUniqueViolation, type RbacActor, type RequestMeta } from './rbac.types';
import { effectiveLegacyRole } from './staff-link';

const STAFF_INCLUDE = {
  user: { select: { id: true, email: true, fullName: true } },
  role: { select: { id: true, name: true, slug: true, isSuperAdmin: true, status: true, legacyRole: true, permissions: true } },
} satisfies Prisma.StaffProfileInclude;

type StaffRecord = Prisma.StaffProfileGetPayload<{ include: typeof STAFF_INCLUDE }>;

const ROLE_FOR_ASSIGNMENT = {
  id: true,
  name: true,
  slug: true,
  isSuperAdmin: true,
  status: true,
  legacyRole: true,
  permissions: true,
} satisfies Prisma.AdminRoleSelect;

/** What the API returns for a staff account. Never includes the password hash or any token. */
function serializeStaff(staff: StaffRecord) {
  return {
    id: staff.userId,
    email: staff.user.email,
    fullName: staff.user.fullName,
    username: staff.username,
    phoneNumber: staff.phoneNumber,
    designation: staff.designation,
    website: staff.website,
    portfolioLink: staff.portfolioLink,
    profilePhoto: staff.profilePhoto,
    address: staff.address,
    city: staff.city,
    state: staff.state,
    postalCode: staff.postalCode,
    status: staff.status,
    role: staff.role
      ? {
          id: staff.role.id,
          name: staff.role.name,
          slug: staff.role.slug,
          isSuperAdmin: staff.role.isSuperAdmin,
          status: staff.role.status,
        }
      : null,
    lastLoginAt: staff.lastLoginAt ? staff.lastLoginAt.toISOString() : null,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  };
}

async function loadStaff(userId: string): Promise<StaffRecord> {
  const staff = await prisma.staffProfile.findFirst({ where: { userId, isDeleted: false }, include: STAFF_INCLUDE });
  if (!staff) throw new NotFoundError('Staff account not found');
  return staff;
}

function assertNotSelf(actor: RbacActor, targetUserId: string, verb: string): void {
  if (actor.id === targetUserId) {
    throw new ValidationError(`You cannot ${verb} your own account`);
  }
}

function assertCanTouchSuperAdmin(actor: RbacActor, target: StaffRecord): void {
  if (target.role?.isSuperAdmin && !actor.isSuperAdmin) {
    throw new AuthorizationError("Only a Super Admin can modify another Super Admin's account");
  }
}

function assertCanAssignRole(actor: RbacActor, role: { isSuperAdmin: boolean; permissions: readonly string[] }): void {
  if (role.isSuperAdmin && !actor.isSuperAdmin) {
    throw new AuthorizationError('Only a Super Admin can assign the Super Admin role');
  }
  // A staff member can hand out a role only if they hold every permission in it (see grant-guard.ts).
  assertHoldsAll(actor, role.permissions, 'ASSIGN_ROLE');
}

/**
 * Changing the access of an existing account (its role, its status, its password, its removal) is
 * refused when the account's current role holds a permission the acting staff member lacks.
 * An account without a role holds nothing, so anyone with the route's permission may manage it.
 */
function assertCanManageAccess(actor: RbacActor, target: StaffRecord): void {
  assertCanTouchSuperAdmin(actor, target);
  assertHoldsAll(actor, target.role?.permissions ?? [], 'MANAGE_STAFF');
}

/**
 * Refuses an action that would leave no usable super admin. `User.role` is SUPER_ADMIN exactly for
 * usable super admins (see effectiveLegacyRole), including ones created before roles moved to the
 * database, so the count runs on that column.
 */
async function assertNotLastSuperAdmin(target: StaffRecord): Promise<void> {
  if (!target.role?.isSuperAdmin || target.status !== 'ACTIVE') return;
  const others = await prisma.user.count({ where: { role: 'SUPER_ADMIN', id: { not: target.userId } } });
  if (others < 1) {
    throw new AuthorizationError('Cannot modify the last remaining Super Admin account');
  }
}

async function loadAssignableRole(roleId: string) {
  const role = await prisma.adminRole.findUnique({ where: { id: roleId }, select: ROLE_FOR_ASSIGNMENT });
  if (!role) throw new ValidationError('Invalid role');
  if (role.status !== 'ACTIVE') throw new ValidationError('Cannot assign an inactive role');
  return role;
}

function revokeRefreshTokens(userId: string) {
  return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

function profileData(input: UpdateStaffInput): Prisma.StaffProfileUpdateInput {
  return {
    ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber } : {}),
    ...(input.designation !== undefined ? { designation: input.designation } : {}),
    ...(input.website !== undefined ? { website: input.website } : {}),
    ...(input.portfolioLink !== undefined ? { portfolioLink: input.portfolioLink } : {}),
    ...(input.profilePhoto !== undefined ? { profilePhoto: input.profilePhoto } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.state !== undefined ? { state: input.state } : {}),
    ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
  };
}

function changedFields(input: UpdateStaffInput): string[] {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
}

export class StaffService {
  public async listStaff(query: StaffQueryInput) {
    const where: Prisma.StaffProfileWhereInput = {
      isDeleted: false,
      ...(query.role ? { roleId: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' } },
              { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [staff, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where,
        include: STAFF_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.staffProfile.count({ where }),
    ]);

    return {
      items: staff.map(serializeStaff),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize) || 1,
      },
    };
  }

  public async getStaff(userId: string) {
    return serializeStaff(await loadStaff(userId));
  }

  public async createStaff(input: CreateStaffInput, actor: RbacActor, meta?: RequestMeta) {
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existingEmail) throw new ValidationError('An account with this email already exists');

    if (input.username) {
      const existingUsername = await prisma.staffProfile.findUnique({
        where: { username: input.username },
        select: { id: true },
      });
      if (existingUsername) throw new ValidationError('This username is already taken');
    }

    const role = await loadAssignableRole(input.roleId);
    assertCanAssignRole(actor, role);

    const status = input.status ?? 'ACTIVE';
    const passwordHash = await hashPassword(input.password);

    let userId: string;
    try {
      const user = await prisma.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          passwordHash,
          role: effectiveLegacyRole({ status, isDeleted: false }, role),
          emailVerifiedAt: new Date(),
          staffProfile: {
            create: {
              roleId: role.id,
              status,
              username: input.username ?? null,
              phoneNumber: input.phoneNumber ?? null,
              designation: input.designation ?? null,
              createdById: actor.id,
            },
          },
        },
        select: { id: true },
      });
      userId = user.id;
    } catch (err) {
      if (isUniqueViolation(err)) throw new ValidationError('An account with this email or username already exists');
      throw err;
    }

    invalidateStaffAccessCache(userId);
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'STAFF_CREATED',
      resource: `User:${userId}`,
      details: JSON.stringify({ email: input.email, role: role.name, roleId: role.id, status }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return serializeStaff(await loadStaff(userId));
  }

  public async updateStaff(userId: string, input: UpdateStaffInput, actor: RbacActor, meta?: RequestMeta) {
    const staff = await loadStaff(userId);
    assertCanTouchSuperAdmin(actor, staff);

    await prisma.$transaction([
      prisma.staffProfile.update({ where: { userId }, data: profileData(input) }),
      ...(input.fullName !== undefined
        ? [prisma.user.update({ where: { id: userId }, data: { fullName: input.fullName } })]
        : []),
    ]);

    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'STAFF_UPDATED',
      resource: `User:${userId}`,
      details: JSON.stringify({ email: staff.user.email, fields: changedFields(input) }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return serializeStaff(await loadStaff(userId));
  }

  public async updateStaffRole(userId: string, roleId: string, actor: RbacActor, meta?: RequestMeta) {
    assertNotSelf(actor, userId, 'change the role of');

    const staff = await loadStaff(userId);
    assertCanManageAccess(actor, staff);

    const role = await loadAssignableRole(roleId);
    assertCanAssignRole(actor, role);

    if (!role.isSuperAdmin) await assertNotLastSuperAdmin(staff);

    await prisma.$transaction([
      prisma.staffProfile.update({ where: { userId }, data: { role: { connect: { id: role.id } } } }),
      prisma.user.update({ where: { id: userId }, data: { role: effectiveLegacyRole(staff, role) } }),
    ]);

    invalidateStaffAccessCache(userId);
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'STAFF_ROLE_CHANGED',
      resource: `User:${userId}`,
      details: JSON.stringify({
        email: staff.user.email,
        previousRole: staff.role?.name ?? null,
        previousRoleId: staff.role?.id ?? null,
        role: role.name,
        roleId: role.id,
      }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return serializeStaff(await loadStaff(userId));
  }

  public async updateStaffStatus(
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    actor: RbacActor,
    meta?: RequestMeta
  ) {
    assertNotSelf(actor, userId, 'change the status of');

    const staff = await loadStaff(userId);
    assertCanManageAccess(actor, staff);
    if (status === 'SUSPENDED') await assertNotLastSuperAdmin(staff);

    await prisma.$transaction([
      prisma.staffProfile.update({ where: { userId }, data: { status } }),
      prisma.user.update({
        where: { id: userId },
        data: { role: effectiveLegacyRole({ status, isDeleted: false }, staff.role) },
      }),
      ...(status === 'SUSPENDED' ? [revokeRefreshTokens(userId)] : []),
    ]);

    invalidateStaffAccessCache(userId);
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: status === 'SUSPENDED' ? 'STAFF_SUSPENDED' : 'STAFF_ACTIVATED',
      resource: `User:${userId}`,
      details: JSON.stringify({ email: staff.user.email, previousStatus: staff.status, status }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return serializeStaff(await loadStaff(userId));
  }

  /**
   * Sets a new password chosen by the acting admin (the website's behaviour). The password is
   * hashed, never returned and never written to a log or the audit trail; every session of the
   * account is signed out.
   */
  public async resetStaffPassword(userId: string, newPassword: string, actor: RbacActor, meta?: RequestMeta) {
    const staff = await loadStaff(userId);
    assertCanManageAccess(actor, staff);

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      revokeRefreshTokens(userId),
    ]);

    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'STAFF_PASSWORD_RESET',
      resource: `User:${userId}`,
      details: JSON.stringify({ email: staff.user.email, sessionsRevoked: true }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { message: 'Password reset successfully' };
  }

  /** Soft delete: the row stays, flagged removed and suspended, and can no longer sign in to the admin. */
  public async deleteStaff(userId: string, actor: RbacActor, meta?: RequestMeta) {
    assertNotSelf(actor, userId, 'delete');

    const staff = await loadStaff(userId);
    assertCanManageAccess(actor, staff);
    await assertNotLastSuperAdmin(staff);

    await prisma.$transaction([
      prisma.staffProfile.update({
        where: { userId },
        data: { isDeleted: true, deletedAt: new Date(), status: 'SUSPENDED' },
      }),
      prisma.user.update({ where: { id: userId }, data: { role: 'USER' } }),
      revokeRefreshTokens(userId),
    ]);

    invalidateStaffAccessCache(userId);
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'STAFF_DELETED',
      resource: `User:${userId}`,
      details: JSON.stringify({ email: staff.user.email, role: staff.role?.name ?? null, softDelete: true }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { message: 'Staff account deleted successfully', id: userId };
  }

  // ---- The signed-in staff member's own account ---------------------------------------------------

  public async getOwnProfile(actor: RbacActor) {
    const staff = await prisma.staffProfile.findFirst({
      where: { userId: actor.id, isDeleted: false },
      include: STAFF_INCLUDE,
    });
    if (!staff) throw new NotFoundError('Staff profile not found');
    return serializeStaff(staff);
  }

  /** Creates the profile on first use for an admin who predates staff profiles. */
  public async updateOwnProfile(input: UpdateStaffInput, actor: RbacActor, meta?: RequestMeta) {
    const fields = profileData(input);
    if (!actor.roleId) {
      // Without a role row to attach, a new profile would have no role and the account would lose access.
      const existing = await prisma.staffProfile.findUnique({ where: { userId: actor.id }, select: { id: true } });
      if (!existing) throw new NotFoundError('Staff profile not found. Staff roles are not set up for this account yet.');
    }
    await prisma.$transaction([
      prisma.staffProfile.upsert({
        where: { userId: actor.id },
        update: fields,
        create: {
          user: { connect: { id: actor.id } },
          ...(actor.roleId ? { role: { connect: { id: actor.roleId } } } : {}),
          phoneNumber: input.phoneNumber ?? null,
          designation: input.designation ?? null,
          website: input.website ?? null,
          portfolioLink: input.portfolioLink ?? null,
          profilePhoto: input.profilePhoto ?? null,
          address: input.address ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          postalCode: input.postalCode ?? null,
        },
      }),
      ...(input.fullName !== undefined
        ? [prisma.user.update({ where: { id: actor.id }, data: { fullName: input.fullName } })]
        : []),
    ]);

    invalidateStaffAccessCache(actor.id);
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'ADMIN_PROFILE_UPDATED',
      resource: `User:${actor.id}`,
      details: JSON.stringify({ fields: changedFields(input) }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.getOwnProfile(actor);
  }

  public async changeOwnPassword(oldPassword: string, newPassword: string, actor: RbacActor, meta?: RequestMeta) {
    const user = await prisma.user.findUnique({ where: { id: actor.id }, select: { passwordHash: true } });
    if (!user || !user.passwordHash) throw new AuthenticationError('Current password is incorrect');

    const matches = await verifyPassword(oldPassword, user.passwordHash);
    if (!matches) throw new ValidationError('Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: actor.id }, data: { passwordHash } }),
      revokeRefreshTokens(actor.id),
    ]);

    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'ADMIN_PASSWORD_CHANGED',
      resource: `User:${actor.id}`,
      details: JSON.stringify({ sessionsRevoked: true }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { message: 'Password changed successfully' };
  }

  public async updateStaffPhoto(staffUserId: string, photoUrl: string | null, actor: RbacActor, meta?: RequestMeta) {
    const staff = await loadStaff(staffUserId);
    assertCanTouchSuperAdmin(actor, staff);
    await prisma.staffProfile.update({
      where: { userId: staffUserId },
      data: { profilePhoto: photoUrl },
    });
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'STAFF_PHOTO_UPDATED',
      resource: `Staff:${staffUserId}`,
      details: photoUrl ? `Photo updated to ${photoUrl}` : 'Photo removed',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return this.getStaff(staffUserId);
  }

  public async updateOwnPhoto(photoUrl: string | null, actor: RbacActor, meta?: RequestMeta) {
    await prisma.staffProfile.update({
      where: { userId: actor.id },
      data: { profilePhoto: photoUrl },
    });
    await adminService.logAction({
      adminId: actor.id,
      adminEmail: actor.email,
      action: 'ADMIN_PHOTO_UPDATED',
      resource: `Staff:${actor.id}`,
      details: photoUrl ? `Photo updated to ${photoUrl}` : 'Photo removed',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return this.getOwnProfile(actor);
  }
}

export const staffService = new StaffService();
