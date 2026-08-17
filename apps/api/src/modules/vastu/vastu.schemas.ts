import { z } from 'zod';

export const vastuGuidanceQuerySchema = z.object({
  category: z
    .string()
    .trim()
    .optional(),
  categoryId: z
    .coerce
    .number()
    .min(1)
    .optional(),
});

export type VastuGuidanceQuery = z.infer<typeof vastuGuidanceQuerySchema>;
