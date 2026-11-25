import { z } from 'zod/v3';

/** AUDIO | VIDEO | IN_PERSON, also accepted in the website's lower case. */
export const consultationModeSchema = z
  .enum(['AUDIO', 'VIDEO', 'IN_PERSON', 'audio', 'video', 'in_person'])
  .transform((value) => value.toUpperCase() as 'AUDIO' | 'VIDEO' | 'IN_PERSON');

const gstSchema = z.object({
  enabled: z.boolean().optional(),
  /** 1800 = 18%. */
  rateBasisPoints: z.number().int().min(0).max(10000).optional(),
  type: z
    .enum(['INCLUSIVE', 'EXCLUSIVE', 'inclusive', 'exclusive'])
    .transform((value) => value.toUpperCase() as 'INCLUSIVE' | 'EXCLUSIVE')
    .optional(),
});

const modeSchema = z.object({
  mode: consultationModeSchema,
  /** INR paise. The website's minimum is 1 rupee. */
  pricePaise: z.number().int().min(100).max(1_000_000_000).optional(),
  gst: gstSchema.optional(),
  /** On update: remove this mode from the consultation. */
  _delete: z.boolean().optional(),
});

const kindSchema = z
  .enum(['normal', 'special', 'NORMAL', 'SPECIAL'])
  .transform((value) => value.toLowerCase() as 'normal' | 'special');

const typeFields = {
  title: z.string().trim().min(2).max(200),
  type: kindSchema.optional(),
  description: z.string().max(10000).nullable().optional(),
  responseDays: z.number().int().min(0).max(365).optional(),
  includes: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  priceLabel: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  modes: z.array(modeSchema).min(1).max(3),
};

export const createConsultationTypeSchema = z.object(typeFields).strict();

export const updateConsultationTypeSchema = z.object(typeFields).partial().strict();

export const consultationTypeIdParamSchema = z.object({ id: z.string().uuid('Invalid consultation id') });

export const consultationTypeBlockDateSchema = z.object({
  date: z.string().min(8).max(10),
});

export const publicConsultationTypesQuerySchema = z.object({
  type: kindSchema.optional(),
});
