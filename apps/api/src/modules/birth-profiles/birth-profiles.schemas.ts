import { z } from 'zod';

export const createBirthProfileSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  dateOfBirth: z
    .string({ required_error: 'Date of birth is required' })
    .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date of birth must be in YYYY-MM-DD format')
    .refine((dateStr) => {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return false;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(Date.UTC(year, month, day));
      return (
        dateObj.getUTCFullYear() === year &&
        dateObj.getUTCMonth() === month &&
        dateObj.getUTCDate() === day
      );
    }, { message: 'Date of birth must be a valid calendar date in YYYY-MM-DD format' }),
  timeOfBirth: z
    .string({ required_error: 'Time of birth is required' })
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
    .string({ required_error: 'Timezone is required' })
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
  country: z.string().max(100, 'Country must not exceed 100 characters').optional().nullable(),
  countryCode: z.string().max(10, 'Country code must not exceed 10 characters').optional().nullable(),
  state: z.string().max(100, 'State must not exceed 100 characters').optional().nullable(),
  isResolved: z.boolean().optional(),
});

export const updateBirthProfileSchema = createBirthProfileSchema.partial().refine(
  (data) => {
    // If updating placeName or latitude or longitude, ensure coordinates and timezone remain consistent
    const hasLat = data.latitude !== undefined;
    const hasLng = data.longitude !== undefined;
    if (hasLat !== hasLng) {
      return false;
    }
    return true;
  },
  {
    message: 'Latitude and longitude must both be provided together when updating location coordinates',
  }
);

export const birthProfileParamsSchema = z.object({
  id: z.string().uuid('Invalid birth profile ID format'),
});

export type CreateBirthProfileInput = z.infer<typeof createBirthProfileSchema>;
export type UpdateBirthProfileInput = z.infer<typeof updateBirthProfileSchema>;
export type BirthProfileParams = z.infer<typeof birthProfileParamsSchema>;
