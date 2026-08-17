import { z } from 'zod';

export const rashiBhavishyaQuerySchema = z.object({
  rashi: z
    .string()
    .trim()
    .optional(),
  rashiIndex: z
    .coerce
    .number()
    .min(1, 'rashiIndex must be between 1 and 12')
    .max(12, 'rashiIndex must be between 1 and 12')
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export type RashiBhavishyaQuery = z.infer<typeof rashiBhavishyaQuerySchema>;
