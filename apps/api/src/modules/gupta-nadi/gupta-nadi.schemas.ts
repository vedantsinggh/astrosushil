import { z } from 'zod';

export const evaluateGuptaNadiSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }),
  transitDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'transitDate must be in canonical YYYY-MM-DD format' })
    .optional(),
  // No assumed default: gender changes the Jiva Karaka, so it must come from the user.
  gender: z.enum(['MALE', 'FEMALE']).optional(),
});

export type EvaluateGuptaNadiInput = z.infer<typeof evaluateGuptaNadiSchema>;
