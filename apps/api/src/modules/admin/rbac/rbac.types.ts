import type { Permission } from '../admin.permissions';

/** The staff member performing an action, as resolved from the database for the request. */
export interface RbacActor {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  /** The id of the actor's own role row, or null when it could not be tied to one. */
  roleId: string | null;
  permissions: Permission[];
}

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}
