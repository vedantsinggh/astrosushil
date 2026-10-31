import { z } from 'zod';

export const locationSearchQuerySchema = z.object({
  q: z
    .string({ required_error: 'Search query "q" is required' })
    .trim()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must not exceed 100 characters'),
  limit: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10),
});

export type LocationSearchQuery = z.infer<typeof locationSearchQuerySchema>;
