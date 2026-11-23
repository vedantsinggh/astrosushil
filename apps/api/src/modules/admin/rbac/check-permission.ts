import type { FastifyRequest } from 'fastify';
import { AuthorizationError } from '../../../errors/app-error';
import type { Permission } from '../admin.permissions';
import { accessHasAnyPermission, resolveStaffAccess, type StaffAccess, type StaffDenyReason } from './rbac.resolver';

const accessByRequest = new WeakMap<FastifyRequest, StaffAccess>();

const DENY_MESSAGES: Record<StaffDenyReason, string> = {
  NOT_STAFF: 'You do not have permission to access this resource',
  ACCOUNT_REMOVED: 'This account has been removed',
  ACCOUNT_SUSPENDED: 'Your account is suspended',
  NO_ROLE: 'No role assigned to your account. Contact a Super Admin.',
  ROLE_INACTIVE: 'Your role is inactive. Contact a Super Admin.',
};

export function denyMessage(reason: StaffDenyReason): string {
  return DENY_MESSAGES[reason];
}

/**
 * Permission gate for admin routes, used as `preHandler: [checkPermission('module:action')]` after
 * `fastify.authenticate`. The acting user's role is read from the database (short cache, see
 * rbac.resolver.ts), never from the access token. A super admin passes every check. Several keys
 * may be given; any one of them is enough.
 */
export const checkPermission = (...required: [Permission, ...Permission[]]) => {
  return async (request: FastifyRequest): Promise<void> => {
    if (!request.user || !request.user.id || !request.user.role) {
      throw new AuthorizationError('Authentication required');
    }

    const access = await resolveStaffAccess(request.user.id);
    accessByRequest.set(request, access);

    if (access.denyReason && !access.isSuperAdmin) {
      throw new AuthorizationError(DENY_MESSAGES[access.denyReason]);
    }

    if (!accessHasAnyPermission(access, required)) {
      const roleName = access.role?.name ?? access.legacyRole;
      throw new AuthorizationError(`Role '${roleName}' lacks '${required.join("' or '")}' permission`);
    }
  };
};

/** The access resolved by `checkPermission` for this request, resolving it if no check ran. */
export async function getRequestStaffAccess(request: FastifyRequest): Promise<StaffAccess> {
  const known = accessByRequest.get(request);
  if (known) return known;
  const access = await resolveStaffAccess(request.user.id);
  accessByRequest.set(request, access);
  return access;
}
