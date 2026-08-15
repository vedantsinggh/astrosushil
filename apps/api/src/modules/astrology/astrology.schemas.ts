import { z } from 'zod';

export const calculateChartSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }),
});

export type CalculateChartInput = z.infer<typeof calculateChartSchema>;
