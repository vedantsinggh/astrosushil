import { z } from 'zod/v3';
import { RASHI_LANGUAGES } from './rashi-bhavishya.hindi';

/** Language of the narrative and of the reader-facing names; omitted means English (RB-014). */
const languageSchema = z.enum(RASHI_LANGUAGES, { errorMap: () => ({ message: 'language must be "en" or "hi"' }) }).optional();

export const rashiBhavishyaQuerySchema = z.object({
  rashi: z
    .string()
    .trim()
    .optional(),
  rashiIndex: z
    .coerce
    .number()
    .int()
    .min(1, 'rashiIndex must be between 1 and 12')
    .max(12, 'rashiIndex must be between 1 and 12')
    .optional(),
  /** A birth profile of the signed-in user; its Moon sign is used. */
  profileId: z.string().uuid('profileId must be a UUID').optional(),
  /** IST calendar date (defaults to today in IST). */
  date: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  language: languageSchema,
});

export type RashiBhavishyaQuery = z.infer<typeof rashiBhavishyaQuerySchema>;

export const rashiBhavishyaAllQuerySchema = rashiBhavishyaQuerySchema.pick({ date: true, language: true });
export type RashiBhavishyaAllQuery = z.infer<typeof rashiBhavishyaAllQuerySchema>;
