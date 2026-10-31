import { z } from 'zod';

export const userProfileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['USER', 'ADMIN']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

export const deleteAccountSchema = z.object({
  confirmation: z.enum(['DELETE', 'DELETE_ACCOUNT']).or(z.literal(true)).optional(),
  password: z.string().optional(),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const deleteAccountResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedAt: z.string(),
});

export type DeleteAccountResponse = z.infer<typeof deleteAccountResponseSchema>;
