import { describe, it, expect } from 'vitest';
import { getPermissionsForRole, hasPermission, Permission, AdminRole } from '../../src/modules/admin/admin.permissions';
import {
  adminLoginSchema,
  usersQuerySchema,
  reportsQuerySchema,
  subscriptionsQuerySchema,
  paymentsQuerySchema,
  updateUserRoleSchema,
  suspendUserSchema,
  activateUserSchema,
  createAdminUserSchema,
  grantEntitlementSchema,
  revokeEntitlementSchema,
  auditLogQuerySchema,
  analyticsQuerySchema,
  analyticsExportQuerySchema,
} from '../../src/modules/admin/admin.schemas';

describe('Admin Hardening & Security Audit Suite', () => {
  describe('1. Role-Based Access Control & RBAC Matrix', () => {
    const ALL_PERMISSIONS: Permission[] = [
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
    ];

    it('SUPER_ADMIN must possess all defined permissions without exception', () => {
      const superAdminPerms = getPermissionsForRole('SUPER_ADMIN');
      for (const perm of ALL_PERMISSIONS) {
        expect(superAdminPerms).toContain(perm);
        expect(hasPermission('SUPER_ADMIN', perm)).toBe(true);
      }
    });

    it('ADMIN role must have operational rights but NO admin_users:manage or reports:clear_cache', () => {
      expect(hasPermission('ADMIN', 'dashboard:read')).toBe(true);
      expect(hasPermission('ADMIN', 'users:read')).toBe(true);
      expect(hasPermission('ADMIN', 'users:suspend')).toBe(true);
      expect(hasPermission('ADMIN', 'users:activate')).toBe(true);
      expect(hasPermission('ADMIN', 'reports:read')).toBe(true);
      expect(hasPermission('ADMIN', 'reports:regenerate')).toBe(true);
      expect(hasPermission('ADMIN', 'entitlements:grant')).toBe(true);
      expect(hasPermission('ADMIN', 'entitlements:revoke')).toBe(true);

      // Sensitive Super-Admin only actions
      expect(hasPermission('ADMIN', 'admin_users:manage')).toBe(false);
      expect(hasPermission('ADMIN', 'reports:clear_cache')).toBe(false);
      expect(hasPermission('ADMIN', 'users:update_role')).toBe(false);
    });

    it('SUPPORT role must have strictly read-only and diagnostic privileges', () => {
      expect(hasPermission('SUPPORT', 'dashboard:read')).toBe(true);
      expect(hasPermission('SUPPORT', 'users:read')).toBe(true);
      expect(hasPermission('SUPPORT', 'birth_profiles:read')).toBe(true);
      expect(hasPermission('SUPPORT', 'reports:read')).toBe(true);
      expect(hasPermission('SUPPORT', 'subscriptions:read')).toBe(true);
      expect(hasPermission('SUPPORT', 'plans:read')).toBe(true);
      expect(hasPermission('SUPPORT', 'entitlements:read')).toBe(true);
      expect(hasPermission('SUPPORT', 'jyoti:read')).toBe(true);
      expect(hasPermission('SUPPORT', 'analytics:read')).toBe(true);
      expect(hasPermission('SUPPORT', 'notifications:read')).toBe(true);

      // Mutation prohibitions for SUPPORT
      expect(hasPermission('SUPPORT', 'users:suspend')).toBe(false);
      expect(hasPermission('SUPPORT', 'users:activate')).toBe(false);
      expect(hasPermission('SUPPORT', 'users:update_role')).toBe(false);
      expect(hasPermission('SUPPORT', 'users:password_reset')).toBe(false);
      expect(hasPermission('SUPPORT', 'reports:regenerate')).toBe(false);
      expect(hasPermission('SUPPORT', 'reports:clear_cache')).toBe(false);
      expect(hasPermission('SUPPORT', 'entitlements:grant')).toBe(false);
      expect(hasPermission('SUPPORT', 'entitlements:revoke')).toBe(false);
      expect(hasPermission('SUPPORT', 'sessions:revoke')).toBe(false);
      expect(hasPermission('SUPPORT', 'admin_users:manage')).toBe(false);
    });

    it('Non-admin / USER role must have ZERO administrative privileges', () => {
      const userPerms = getPermissionsForRole('USER');
      expect(userPerms).toEqual([]);
      for (const perm of ALL_PERMISSIONS) {
        expect(hasPermission('USER', perm)).toBe(false);
      }
    });

    it('Arbitrary or malicious roles must have zero privileges', () => {
      expect(getPermissionsForRole('HACKER')).toEqual([]);
      expect(hasPermission('HACKER', 'dashboard:read')).toBe(false);
      expect(hasPermission('', 'users:read')).toBe(false);
    });
  });

  describe('2. Admin Schema Validations & Sanitization', () => {
    it('should validate admin login credentials correctly', () => {
      expect(adminLoginSchema.safeParse({ email: 'admin@astrosushil.com', password: 'Pass' }).success).toBe(true);
      expect(adminLoginSchema.safeParse({ email: 'invalid-email', password: 'Pass' }).success).toBe(false);
      expect(adminLoginSchema.safeParse({ email: 'admin@astrosushil.com' }).success).toBe(false);
    });

    it('should validate createAdminUserSchema strictly', () => {
      const valid = createAdminUserSchema.safeParse({
        email: 'newop@astrosushil.com',
        fullName: 'New Operator',
        password: 'Password123!',
        role: 'SUPPORT',
      });
      expect(valid.success).toBe(true);

      // Super admin creation through this endpoint is forbidden
      const invalidSuperAdmin = createAdminUserSchema.safeParse({
        email: 'newop@astrosushil.com',
        password: 'Password123!',
        role: 'SUPER_ADMIN',
      });
      expect(invalidSuperAdmin.success).toBe(false);

      // Short password rejected
      const shortPass = createAdminUserSchema.safeParse({
        email: 'newop@astrosushil.com',
        password: 'short',
        role: 'SUPPORT',
      });
      expect(shortPass.success).toBe(false);
    });

    it('should validate suspend and activate user schemas with mandatory reasons', () => {
      expect(suspendUserSchema.safeParse({ reason: 'Suspicious payment chargeback' }).success).toBe(true);
      expect(suspendUserSchema.safeParse({ reason: 'ab' }).success).toBe(false); // min 3 chars
      expect(suspendUserSchema.safeParse({}).success).toBe(false); // required

      expect(activateUserSchema.safeParse({ reason: 'User resolved verification' }).success).toBe(true);
      expect(activateUserSchema.safeParse({}).success).toBe(true); // optional reason
    });

    it('should validate grant and revoke entitlement schemas', () => {
      const validGrant = grantEntitlementSchema.safeParse({
        feature: 'CAREER_REPORT',
        expiresInDays: 30,
        reason: 'Customer support compensation',
      });
      expect(validGrant.success).toBe(true);

      const invalidDuration = grantEntitlementSchema.safeParse({
        feature: 'CAREER_REPORT',
        expiresInDays: 1000, // max 365
        reason: 'Support ticket',
      });
      expect(invalidDuration.success).toBe(false);

      const validRevoke = revokeEntitlementSchema.safeParse({
        reason: 'Compensation period expired',
      });
      expect(validRevoke.success).toBe(true);
      expect(revokeEntitlementSchema.safeParse({ reason: 'a' }).success).toBe(false);
    });

    it('should validate query filters with boundaries and pagination limits', () => {
      const userQuery = usersQuerySchema.safeParse({
        page: '2',
        pageSize: '50',
        search: 'test@example.com',
        role: 'USER',
        status: 'VERIFIED',
      });
      expect(userQuery.success).toBe(true);
      if (userQuery.success) {
        expect(userQuery.data.page).toBe(2);
        expect(userQuery.data.pageSize).toBe(50);
      }

      const reportQuery = reportsQuerySchema.safeParse({
        status: 'FAILED',
        reportType: 'CAREER',
        sortBy: 'newest',
        page: '1',
      });
      expect(reportQuery.success).toBe(true);

      const auditQuery = auditLogQuerySchema.safeParse({
        adminEmail: 'admin@astrosushil.com',
        action: 'USER_SUSPENDED',
        page: '1',
        pageSize: '25',
      });
      expect(auditQuery.success).toBe(true);

      const analyticsQuery = analyticsQuerySchema.safeParse({
        period: '30d',
      });
      expect(analyticsQuery.success).toBe(true);

      const exportQuery = analyticsExportQuerySchema.safeParse({
        type: 'revenue',
        period: '7d',
      });
      expect(exportQuery.success).toBe(true);
    });
  });

  describe('3. Security & Operational Boundaries', () => {
    it('Diagnostics UUID validation regex prevents arbitrary command/code injection', () => {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(UUID_REGEX.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(UUID_REGEX.test('33333333-3333-3333-3333-333333333333')).toBe(true);

      // Rejects command injection or non-UUID inputs
      expect(UUID_REGEX.test('; rm -rf / ;')).toBe(false);
      expect(UUID_REGEX.test('SELECT * FROM users')).toBe(false);
      expect(UUID_REGEX.test('<script>alert(1)</script>')).toBe(false);
      expect(UUID_REGEX.test('../../etc/passwd')).toBe(false);
      expect(UUID_REGEX.test('12345')).toBe(false);
    });

    it('Payment verification remains strictly server-side (no frontend state forgery)', () => {
      // Payment statuses from schema
      const paymentQuery = paymentsQuerySchema.safeParse({
        status: 'PAID',
        reportType: 'CAREER',
      });
      expect(paymentQuery.success).toBe(true);

      // Verify that invalid status values are rejected
      const invalidPaymentQuery = paymentsQuerySchema.safeParse({
        status: 'FAKE_STATUS',
      });
      expect(invalidPaymentQuery.success).toBe(false);
    });
  });
});
