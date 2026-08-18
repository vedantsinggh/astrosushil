import { z } from 'zod';

export const generateNatalPredictionSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }),
  domain: z
    .enum(['ALL', 'CAREER', 'MARRIAGE', 'HEALTH', 'FINANCE', 'PROGENY'])
    .optional()
    .default('ALL'),
});

export const generateTransitPredictionSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'targetDate must be in YYYY-MM-DD format' })
    .optional(),
});

export type GenerateNatalPredictionInput = z.infer<typeof generateNatalPredictionSchema>;
export type GenerateTransitPredictionInput = z.infer<typeof generateTransitPredictionSchema>;
