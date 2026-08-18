import { z } from 'zod';

export const directBirthDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD'),
  timeOfBirth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'timeOfBirth must be HH:mm or HH:mm:ss'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1, 'timezone is required'),
  placeName: z.string().optional(),
});

export const calculateChartSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }).optional(),
  birthDetails: directBirthDetailsSchema.optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export type DirectBirthDetailsInput = z.infer<typeof directBirthDetailsSchema>;
export type CalculateChartInput = z.infer<typeof calculateChartSchema>;
