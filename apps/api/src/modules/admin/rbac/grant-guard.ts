import { AppError } from '../../../errors/app-error';
import { normalizePermissionKeys } from './permission.catalog';
import type { RbacActor } from './rbac.types';

/**
 * Owner decision of 2026-11-24: a staff member may grant only permissions they hold themselves;
 * super admins are unrestricted. (The website lets anyone who can edit roles or staff hand out
 * any permission short of the super admin role.)
 *
 * The rule applied here is symmetric: a staff member who is not a super admin cannot change, in
 * either direction, a permission they do not hold. That covers
 *  - the keys put on a new role, and the keys added to or removed from an existing role;
 *  - switching a role on or off (it gives or takes every key of the role for all its members);
 *  - placing an account on a role, and moving it off the role it is on;
 *  - suspending, reactivating, removing, or resetting the password of an account whose role holds
 *    a key the acting staff member lacks (a password reset would otherwise be a way to sign in as
 *    that account and use the permissions the rule withholds).
 *
 * A role is measured by its stored catalogue keys whether it is active or not: an inactive role
 * grants them again the moment it is reactivated.
 */

export type GrantRefusal =
  | 'ROLE_PERMISSIONS'
  | 'ROLE_STATUS'
  | 'ASSIGN_ROLE'
  | 'MANAGE_STAFF';

const MESSAGES: Record<GrantRefusal, string> = {
  ROLE_PERMISSIONS: 'You can only add or remove permissions that your own role holds',
  ROLE_STATUS: 'You can only activate or deactivate a role whose permissions your own role all holds',
  ASSIGN_ROLE: 'You can only assign a role whose permissions your own role all holds',
  MANAGE_STAFF: 'You can only manage the access of staff whose role has no permission beyond your own',
};

/**
 * 403 in the standard error shape. The message never names the permission keys involved: someone
 * who may create staff is not necessarily allowed to read what a role contains.
 */
export class PermissionGrantNotAllowedError extends AppError {
  constructor(refusal: GrantRefusal) {
    super(MESSAGES[refusal], 403, 'PERMISSION_GRANT_NOT_ALLOWED');
  }
}

/** The catalogue keys of `keys` that the acting staff member does not hold. Empty for a super admin. */
export function permissionsNotHeldBy(actor: RbacActor, keys: readonly string[]): string[] {
  if (actor.isSuperAdmin) return [];
  const held = new Set<string>(actor.permissions);
  return normalizePermissionKeys(keys).filter((key) => !held.has(key));
}

/** Refuses unless the acting staff member holds every key in `keys` (or is a super admin). */
export function assertHoldsAll(actor: RbacActor, keys: readonly string[], refusal: GrantRefusal): void {
  if (permissionsNotHeldBy(actor, keys).length > 0) throw new PermissionGrantNotAllowedError(refusal);
}

/** Refuses a change to a role's key list that adds or removes a key the acting staff member does not hold. */
export function assertCanChangePermissions(actor: RbacActor, before: readonly string[], after: readonly string[]): void {
  if (actor.isSuperAdmin) return;
  const previous = new Set<string>(normalizePermissionKeys(before));
  const next = new Set<string>(normalizePermissionKeys(after));
  const changed = [...next].filter((key) => !previous.has(key)).concat([...previous].filter((key) => !next.has(key)));
  assertHoldsAll(actor, changed, 'ROLE_PERMISSIONS');
}
