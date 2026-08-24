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

export const dashaRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  maxLevel: z.number().int().min(1).max(3).optional().default(3),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const panchangRequestSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD'),
  timeOfBirth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'timeOfBirth must be HH:mm or HH:mm:ss').optional().default('12:00:00'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1).optional().default('UTC'),
});

export const vargasRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  vargaTypes: z.array(z.enum(['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'])).optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const matchmakingProfileRefSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided for person',
});

export const matchmakingRequestSchema = z.object({
  boy: matchmakingProfileRefSchema,
  girl: matchmakingProfileRefSchema,
});

export type DirectBirthDetailsInput = z.infer<typeof directBirthDetailsSchema>;
export type CalculateChartInput = z.infer<typeof calculateChartSchema>;
export type DashaRequestInput = z.infer<typeof dashaRequestSchema>;
export type PanchangRequestInput = z.infer<typeof panchangRequestSchema>;
export type VargasRequestInput = z.infer<typeof vargasRequestSchema>;
export type MatchmakingRequestInput = z.infer<typeof matchmakingRequestSchema>;
