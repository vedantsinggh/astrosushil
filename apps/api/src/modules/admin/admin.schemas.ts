import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const paginationQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(25),
});

export const usersQuerySchema = paginationQuerySchema.extend({
  role: z.string().optional(),
  status: z.enum(['VERIFIED', 'UNVERIFIED', 'SUSPENDED', 'ALL']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const reportsQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  reportType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'duration', 'status']).optional().default('newest'),
});

export const subscriptionsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING', 'ALL']).optional(),
  plan: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const paymentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'ALL']).optional(),
  reportType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'SUPPORT']),
});

export const suspendUserSchema = z.object({
  reason: z.string().min(3, 'Suspension reason is required (minimum 3 characters)').max(500),
});

export const activateUserSchema = z.object({
  reason: z.string().optional(),
});

export const createAdminUserSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  fullName: z.string().min(1, 'Full name is required'),
  role: z.enum(['ADMIN', 'SUPPORT']),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const grantEntitlementSchema = z.object({
  feature: z.string().min(1, 'Feature identifier is required'),
  expiresInDays: z.coerce.number().min(1).max(365).default(30),
  reason: z.string().min(3, 'Grant reason is required (minimum 3 characters)').max(500),
});

export const revokeEntitlementSchema = z.object({
  reason: z.string().min(3, 'Revoke reason is required (minimum 3 characters)').max(500),
});

export const auditLogQuerySchema = paginationQuerySchema.extend({
  adminEmail: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const analyticsQuerySchema = z.object({
  period: z.enum(['today', '7d', '30d', '90d', '12m', 'custom']).optional().default('7d'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const analyticsExportQuerySchema = analyticsQuerySchema.extend({
  type: z.enum(['users', 'reports', 'revenue']),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ReportsQueryInput = z.infer<typeof reportsQuerySchema>;
export type UsersQueryInput = z.infer<typeof usersQuerySchema>;
export type SubscriptionsQueryInput = z.infer<typeof subscriptionsQuerySchema>;
export type PaymentsQueryInput = z.infer<typeof paymentsQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type ActivateUserInput = z.infer<typeof activateUserSchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type GrantEntitlementInput = z.infer<typeof grantEntitlementSchema>;
export type RevokeEntitlementInput = z.infer<typeof revokeEntitlementSchema>;
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type AnalyticsExportQueryInput = z.infer<typeof analyticsExportQuerySchema>;
