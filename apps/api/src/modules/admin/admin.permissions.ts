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
  | 'payments:refund'
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
  | 'notifications:test'
  | 'notifications:send'
  | 'live_sessions:read'
  | 'live_sessions:write'
  | 'live_sessions:delete'
  | 'orders:read'
  | 'orders:fulfill'
  | 'products:manage'
  // Website integration (docs/integration/website-integration-plan.md): one key per action of the
  // website admin's permission catalogue, in this file's module:action style.
  | 'banners:read'
  | 'banners:create'
  | 'banners:update'
  | 'banners:delete'
  | 'categories:read'
  | 'categories:create'
  | 'categories:update'
  | 'categories:delete'
  | 'courses:read'
  | 'courses:create'
  | 'courses:update'
  | 'courses:delete'
  | 'consultations:read'
  | 'consultations:create'
  | 'consultations:update'
  | 'consultations:delete'
  | 'bookings:read'
  | 'bookings:create'
  | 'bookings:update'
  | 'bookings:delete'
  | 'coupons:read'
  | 'coupons:create'
  | 'coupons:update'
  | 'coupons:delete'
  | 'blogs:read'
  | 'blogs:create'
  | 'blogs:update'
  | 'blogs:delete'
  | 'faqs:read'
  | 'faqs:create'
  | 'faqs:update'
  | 'faqs:delete'
  | 'testimonials:read'
  | 'testimonials:create'
  | 'testimonials:update'
  | 'testimonials:delete'
  | 'pdf_reports:read'
  | 'pdf_reports:create'
  | 'pdf_reports:update'
  | 'pdf_reports:delete'
  | 'media:read'
  | 'media:create'
  | 'media:update'
  | 'media:delete'
  | 'seo:read'
  | 'seo:create'
  | 'seo:update'
  | 'seo:delete'
  | 'roles:read'
  | 'roles:create'
  | 'roles:update'
  | 'roles:delete'
  | 'staff:read'
  | 'staff:create'
  | 'staff:update'
  | 'staff:delete'
  | 'products:read'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'orders:update'
  | 'orders:export'
  | 'report_orders:read'
  | 'report_orders:update'
  | 'transactions:read'
  | 'transactions:export'
  | 'gst_report:read'
  | 'gst_report:export'
  | 'customers:read'
  | 'customers:update'
  | 'customers:delete'
  | 'contacts:read'
  | 'contacts:update'
  | 'contacts:delete'
  | 'availability:read'
  | 'availability:update'
  | 'settings:read'
  | 'settings:update'
  | 'permissions:read'
  | 'uploads:create';

/**
 * Default permissions of the three seeded system roles (docs/integration/modules/rbac.md).
 *
 * Roles are editable in the database now: `checkPermission` (./rbac/check-permission.ts) resolves
 * the acting user's role from there, and this map is no longer consulted on a request once the
 * roles are seeded. It is still the source of (a) the permissions the system roles are seeded with
 * and (b) the fallback for an admin whose role row does not exist yet.
 *
 * A new key must be added to the `Permission` union above, to the catalogue in
 * ./rbac/permission.catalog.ts (label and group; the build fails until both agree) and to
 * SUPER_ADMIN below (a unit test checks SUPER_ADMIN lists every catalogue key).
 */
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
    'payments:refund',
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
    'notifications:send',
    'live_sessions:read',
    'live_sessions:write',
    'live_sessions:delete',
    'orders:read',
    'orders:fulfill',
    'products:manage',
    // Website integration.
    'banners:read',
    'banners:create',
    'banners:update',
    'banners:delete',
    'categories:read',
    'categories:create',
    'categories:update',
    'categories:delete',
    'courses:read',
    'courses:create',
    'courses:update',
    'courses:delete',
    'consultations:read',
    'consultations:create',
    'consultations:update',
    'consultations:delete',
    'bookings:read',
    'bookings:create',
    'bookings:update',
    'bookings:delete',
    'coupons:read',
    'coupons:create',
    'coupons:update',
    'coupons:delete',
    'blogs:read',
    'blogs:create',
    'blogs:update',
    'blogs:delete',
    'faqs:read',
    'faqs:create',
    'faqs:update',
    'faqs:delete',
    'testimonials:read',
    'testimonials:create',
    'testimonials:update',
    'testimonials:delete',
    'pdf_reports:read',
    'pdf_reports:create',
    'pdf_reports:update',
    'pdf_reports:delete',
    'media:read',
    'media:create',
    'media:update',
    'media:delete',
    'seo:read',
    'seo:create',
    'seo:update',
    'seo:delete',
    'roles:read',
    'roles:create',
    'roles:update',
    'roles:delete',
    'staff:read',
    'staff:create',
    'staff:update',
    'staff:delete',
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'orders:update',
    'orders:export',
    'report_orders:read',
    'report_orders:update',
    'transactions:read',
    'transactions:export',
    'gst_report:read',
    'gst_report:export',
    'customers:read',
    'customers:update',
    'customers:delete',
    'contacts:read',
    'contacts:update',
    'contacts:delete',
    'availability:read',
    'availability:update',
    'settings:read',
    'settings:update',
    'permissions:read',
    'uploads:create',
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
    'payments:refund',
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
    'notifications:send',
    'live_sessions:read',
    'live_sessions:write',
    'live_sessions:delete',
    'orders:read',
    'orders:fulfill',
    'products:manage',
    // Website integration: everything except roles, permissions and staff (as the website seeds its Admin role).
    'banners:read',
    'banners:create',
    'banners:update',
    'banners:delete',
    'categories:read',
    'categories:create',
    'categories:update',
    'categories:delete',
    'courses:read',
    'courses:create',
    'courses:update',
    'courses:delete',
    'consultations:read',
    'consultations:create',
    'consultations:update',
    'consultations:delete',
    'bookings:read',
    'bookings:create',
    'bookings:update',
    'bookings:delete',
    'coupons:read',
    'coupons:create',
    'coupons:update',
    'coupons:delete',
    'blogs:read',
    'blogs:create',
    'blogs:update',
    'blogs:delete',
    'faqs:read',
    'faqs:create',
    'faqs:update',
    'faqs:delete',
    'testimonials:read',
    'testimonials:create',
    'testimonials:update',
    'testimonials:delete',
    'pdf_reports:read',
    'pdf_reports:create',
    'pdf_reports:update',
    'pdf_reports:delete',
    'media:read',
    'media:create',
    'media:update',
    'media:delete',
    'seo:read',
    'seo:create',
    'seo:update',
    'seo:delete',
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'orders:update',
    'orders:export',
    'report_orders:read',
    'report_orders:update',
    'transactions:read',
    'transactions:export',
    'gst_report:read',
    'gst_report:export',
    'customers:read',
    'customers:update',
    'customers:delete',
    'contacts:read',
    'contacts:update',
    'contacts:delete',
    'availability:read',
    'availability:update',
    'settings:read',
    'settings:update',
    'uploads:create',
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
    'live_sessions:read',
    'orders:read',
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
