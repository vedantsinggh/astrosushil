import { z } from 'zod';
import { resetPasswordSchema } from '../../auth/auth.schemas';

/**
 * Request schemas for roles, permissions and staff. Every body schema is `.strict()`: a request
 * that carries `isSuperAdmin`, `isSystem`, `slug`, `legacyRole` or any other unknown field is
 * rejected, so those can never be set from a request.
 */

const uuid = z.string().uuid('Invalid id');

/** The platform's existing password policy (the same rule as the staff password reset by e-mailed code). */
export const staffPasswordSchema = resetPasswordSchema.shape.newPassword;

const trimmedOptional = (max: number) => z.string().trim().max(max).optional();

export const roleIdParamSchema = z.object({ id: uuid });
export const staffIdParamSchema = z.object({ id: uuid });

// ---- Roles -------------------------------------------------------------------------------------

export const rolesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

const permissionKeys = z.array(z.string().min(1).max(100)).max(500);

export const createRoleSchema = z
  .object({
    name: z.string().trim().min(2).max(50),
    description: z.string().trim().max(300).optional(),
    permissions: permissionKeys.default([]),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .strict();

export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(2).max(50).optional(),
    description: z.string().trim().max(300).optional(),
    permissions: permissionKeys.optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .strict();

export const updateRoleStatusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).strict();

export const permissionsQuerySchema = z.object({
  flat: z.enum(['true', 'false']).optional(),
});

// ---- Staff -------------------------------------------------------------------------------------

export const staffQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: uuid.optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

const username = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores and hyphens');

export const createStaffSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80),
    email: z.string().email('Invalid email address format').toLowerCase().trim(),
    username: username.optional(),
    password: staffPasswordSchema,
    phoneNumber: z.string().trim().min(10).max(15).optional(),
    designation: trimmedOptional(80),
    roleId: uuid,
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  })
  .strict();

const staffProfileFields = {
  fullName: z.string().trim().min(2).max(80).optional(),
  phoneNumber: z.string().trim().min(10).max(15).optional(),
  designation: trimmedOptional(80),
  website: z.string().trim().url().max(300).optional(),
  portfolioLink: z.string().trim().url().max(300).optional(),
  address: trimmedOptional(300),
  city: trimmedOptional(80),
  state: trimmedOptional(80),
  postalCode: trimmedOptional(20),
};

export const updateStaffSchema = z.object(staffProfileFields).strict();

/** A staff member editing their own profile: the same fields as a staff update. */
export const updateOwnProfileSchema = z.object(staffProfileFields).strict();

export const updateStaffRoleSchema = z.object({ roleId: uuid }).strict();

export const updateStaffStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }).strict();

export const resetStaffPasswordSchema = z.object({ newPassword: staffPasswordSchema }).strict();

export const changeOwnPasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required').max(100),
    newPassword: staffPasswordSchema,
  })
  .strict();

export type RolesQueryInput = z.infer<typeof rolesQuerySchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type StaffQueryInput = z.infer<typeof staffQuerySchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
