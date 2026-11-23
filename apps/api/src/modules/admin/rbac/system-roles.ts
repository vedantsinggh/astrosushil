import { getPermissionsForRole, type AdminRole as LegacyAdminRole, type Permission } from '../admin.permissions';

/**
 * The three seeded system roles. Each one stands for a value of the old `User.role` enum and is
 * seeded with exactly the permissions the static map in admin.permissions.ts gives that value, so
 * an admin who existed before roles moved to the database keeps the same access.
 */
export interface SystemRoleDefinition {
  slug: string;
  name: string;
  description: string;
  legacyRole: LegacyAdminRole;
  isSuperAdmin: boolean;
  defaultPermissions: readonly Permission[];
}

export const SUPER_ADMIN_ROLE_SLUG = 'super-admin';
export const ADMIN_ROLE_SLUG = 'admin';
export const SUPPORT_ROLE_SLUG = 'support';

export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
  {
    slug: SUPER_ADMIN_ROLE_SLUG,
    name: 'Super Admin',
    description:
      'Full unrestricted access. Automatically receives every permission, including ones created after this role.',
    legacyRole: 'SUPER_ADMIN',
    isSuperAdmin: true,
    defaultPermissions: getPermissionsForRole('SUPER_ADMIN'),
  },
  {
    slug: ADMIN_ROLE_SLUG,
    name: 'Admin',
    description: 'Full operational access. Cannot manage roles or staff accounts.',
    legacyRole: 'ADMIN',
    isSuperAdmin: false,
    defaultPermissions: getPermissionsForRole('ADMIN'),
  },
  {
    slug: SUPPORT_ROLE_SLUG,
    name: 'Support',
    description: 'Read-only support view.',
    legacyRole: 'SUPPORT',
    isSuperAdmin: false,
    defaultPermissions: getPermissionsForRole('SUPPORT'),
  },
];

const BY_LEGACY_ROLE = new Map<string, SystemRoleDefinition>(SYSTEM_ROLES.map((role) => [role.legacyRole, role]));

/** The system role that stands for an old `User.role` value, or undefined for USER and unknown values. */
export function systemRoleForLegacyRole(legacyRole: string): SystemRoleDefinition | undefined {
  return BY_LEGACY_ROLE.get(legacyRole);
}
