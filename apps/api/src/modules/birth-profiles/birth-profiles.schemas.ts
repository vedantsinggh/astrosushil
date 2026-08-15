import { z } from 'zod';

export const createBirthProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters').trim(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date of birth must be in YYYY-MM-DD format'),
  timeOfBirth: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time of birth must be in HH:mm or HH:mm:ss (24-hour) format'),
  latitude: z
    .number({ required_error: 'Latitude is required' })
    .min(-90, 'Latitude must be >= -90.0 degrees')
    .max(90, 'Latitude must be <= 90.0 degrees'),
  longitude: z
    .number({ required_error: 'Longitude is required' })
    .min(-180, 'Longitude must be >= -180.0 degrees')
    .max(180, 'Longitude must be <= 180.0 degrees'),
  timezone: z
    .string()
    .min(1, 'Timezone is required')
    .refine((tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, { message: 'Invalid IANA timezone string (e.g. "Asia/Kolkata")' }),
  placeName: z.string().max(200, 'Place name must not exceed 200 characters').optional().nullable(),
});

export const updateBirthProfileSchema = createBirthProfileSchema.partial();

export const birthProfileParamsSchema = z.object({
  id: z.string().uuid('Invalid birth profile ID format'),
});

export type CreateBirthProfileInput = z.infer<typeof createBirthProfileSchema>;
export type UpdateBirthProfileInput = z.infer<typeof updateBirthProfileSchema>;
export type BirthProfileParams = z.infer<typeof birthProfileParamsSchema>;
