export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';

export type Permission =
  | 'dashboard:read'
  | 'users:read'
  | 'users:suspend'
  | 'users:activate'
  | 'users:update_role'
  | 'users:password_reset'
  | 'birth_profiles:read'
  | 'reports:read'
  | 'reports:regenerate'
  | 'reports:clear_cache'
  | 'subscriptions:read'
  | 'plans:read'
  | 'payments:read'
  | 'entitlements:read'
  | 'entitlements:grant'
  | 'entitlements:revoke'
  | 'sessions:revoke'
  | 'admin_users:manage'
  | 'jyoti:read'
  | 'system:read'
  | 'audit_log:read'
  | 'analytics:read'
  | 'analytics:export'
  | 'notifications:read'
  | 'notifications:test';

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: [
    'dashboard:read',
    'users:read',
    'users:suspend',
    'users:activate',
    'users:update_role',
    'users:password_reset',
    'birth_profiles:read',
    'reports:read',
    'reports:regenerate',
    'reports:clear_cache',
    'subscriptions:read',
    'plans:read',
    'payments:read',
    'entitlements:read',
    'entitlements:grant',
    'entitlements:revoke',
    'sessions:revoke',
    'admin_users:manage',
    'jyoti:read',
    'system:read',
    'audit_log:read',
    'analytics:read',
    'analytics:export',
    'notifications:read',
    'notifications:test',
  ],
  ADMIN: [
    'dashboard:read',
    'users:read',
    'users:suspend',
    'users:activate',
    'users:password_reset',
    'birth_profiles:read',
    'reports:read',
    'reports:regenerate',
    'subscriptions:read',
    'plans:read',
    'payments:read',
    'entitlements:read',
    'entitlements:grant',
    'entitlements:revoke',
    'sessions:revoke',
    'jyoti:read',
    'system:read',
    'audit_log:read',
    'analytics:read',
    'analytics:export',
    'notifications:read',
    'notifications:test',
  ],
  SUPPORT: [
    'dashboard:read',
    'users:read',
    'birth_profiles:read',
    'reports:read',
    'subscriptions:read',
    'plans:read',
    'entitlements:read',
    'jyoti:read',
    'analytics:read',
    'notifications:read',
  ],
};

export function getPermissionsForRole(role: string): Permission[] {
  if (role in ROLE_PERMISSIONS) {
    return ROLE_PERMISSIONS[role as AdminRole];
  }
  return [];
}

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}
