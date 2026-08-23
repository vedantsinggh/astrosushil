import { z } from 'zod';

export const evaluateGuptaNadiSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }),
  transitDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'transitDate must be in canonical YYYY-MM-DD format' })
    .optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional().default('MALE'),
});

export type EvaluateGuptaNadiInput = z.infer<typeof evaluateGuptaNadiSchema>;
