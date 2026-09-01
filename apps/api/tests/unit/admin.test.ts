import { describe, it, expect } from 'vitest';
import { getPermissionsForRole, hasPermission } from '../../src/modules/admin/admin.permissions';
import {
  adminLoginSchema,
  usersQuerySchema,
  reportsQuerySchema,
  subscriptionsQuerySchema,
  paymentsQuerySchema,
  updateUserRoleSchema,
} from '../../src/modules/admin/admin.schemas';

describe('Admin Module Permissions & Validation Tests', () => {
  describe('Role-Based Permissions Matrix', () => {
    it('SUPER_ADMIN should have users:update_role and subscriptions permissions', () => {
      const permissions = getPermissionsForRole('SUPER_ADMIN');
      expect(permissions).toContain('dashboard:read');
      expect(permissions).toContain('users:read');
      expect(permissions).toContain('users:update_role');
      expect(permissions).toContain('birth_profiles:read');
      expect(permissions).toContain('reports:read');
      expect(permissions).toContain('reports:regenerate');
      expect(permissions).toContain('reports:clear_cache');
      expect(permissions).toContain('subscriptions:read');
      expect(permissions).toContain('plans:read');
      expect(permissions).toContain('payments:read');
      expect(permissions).toContain('entitlements:read');
      expect(permissions).toContain('jyoti:read');
      expect(permissions).toContain('system:read');
      expect(permissions).toContain('audit_log:read');
      expect(hasPermission('SUPER_ADMIN', 'users:update_role')).toBe(true);
    });

    it('ADMIN should have subscriptions and payments permissions but NOT users:update_role', () => {
      const permissions = getPermissionsForRole('ADMIN');
      expect(permissions).toContain('users:read');
      expect(permissions).toContain('subscriptions:read');
      expect(permissions).toContain('payments:read');
      expect(permissions).not.toContain('users:update_role');
      expect(hasPermission('ADMIN', 'users:update_role')).toBe(false);
    });

    it('SUPPORT should have subscriptions:read, plans:read, entitlements:read', () => {
      const permissions = getPermissionsForRole('SUPPORT');
      expect(permissions).toContain('users:read');
      expect(permissions).toContain('subscriptions:read');
      expect(permissions).toContain('plans:read');
      expect(permissions).toContain('entitlements:read');
      expect(permissions).not.toContain('users:update_role');
      expect(hasPermission('SUPPORT', 'users:update_role')).toBe(false);
    });

    it('USER role should have zero administrative permissions', () => {
      const permissions = getPermissionsForRole('USER');
      expect(permissions).toHaveLength(0);
      expect(hasPermission('USER', 'users:read')).toBe(false);
      expect(hasPermission('USER', 'subscriptions:read')).toBe(false);
    });
  });

  describe('Admin Schemas Validation', () => {
    it('should validate valid admin login payload', () => {
      const result = adminLoginSchema.safeParse({
        email: 'admin@astrosushil.com',
        password: 'AdminPass123!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format in login', () => {
      const result = adminLoginSchema.safeParse({
        email: 'not-an-email',
        password: 'AdminPass123!',
      });
      expect(result.success).toBe(false);
    });

    it('should parse user query with status filter and page size options (25, 50, 100)', () => {
      const result = usersQuerySchema.safeParse({
        search: 'john',
        role: 'USER',
        status: 'VERIFIED',
        page: '1',
        pageSize: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(50);
        expect(result.data.status).toBe('VERIFIED');
      }
    });

    it('should validate subscriptions and payments query schemas', () => {
      const subResult = subscriptionsQuerySchema.safeParse({
        status: 'ACTIVE',
        plan: 'CAREER',
        page: '1',
        pageSize: '25',
      });
      expect(subResult.success).toBe(true);

      const payResult = paymentsQuerySchema.safeParse({
        status: 'PAID',
        reportType: 'CAREER',
        page: '1',
        pageSize: '25',
      });
      expect(payResult.success).toBe(true);
    });

    it('should validate role update schema', () => {
      const validAdmin = updateUserRoleSchema.safeParse({ role: 'ADMIN' });
      const validSupport = updateUserRoleSchema.safeParse({ role: 'SUPPORT' });
      const invalidRole = updateUserRoleSchema.safeParse({ role: 'SUPER_ADMIN' });

      expect(validAdmin.success).toBe(true);
      expect(validSupport.success).toBe(true);
      expect(invalidRole.success).toBe(false);
    });
  });
});
