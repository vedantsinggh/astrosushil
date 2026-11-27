import { z } from 'zod/v3';

/** AUDIO | VIDEO | IN_PERSON | MESSAGE, also accepted in the website's lower case. */
export const consultationModeSchema = z
  .enum(['AUDIO', 'VIDEO', 'IN_PERSON', 'MESSAGE', 'audio', 'video', 'in_person', 'message'])
  .transform((value) => value.toUpperCase() as 'AUDIO' | 'VIDEO' | 'IN_PERSON' | 'MESSAGE');

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
  /** Minutes of a call or visit; not needed when the only mode is MESSAGE (stored as 0). */
  durationMinutes: z.number().int().min(5).max(480).optional(),
  priceLabel: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  modes: z.array(modeSchema).min(1).max(3),
};

/** Website rules: a call/visit needs a duration; a message consultation needs response days. */
export const createConsultationTypeSchema = z
  .object(typeFields)
  .strict()
  .superRefine((data, ctx) => {
    const scheduled = data.modes.some((m) => m.mode !== 'MESSAGE' && !m._delete);
    const message = data.modes.some((m) => m.mode === 'MESSAGE' && !m._delete);
    if (scheduled && !data.durationMinutes) {
      ctx.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'Duration is required for call and in-person consultations' });
    }
    if (message && (!data.responseDays || data.responseDays < 1)) {
      ctx.addIssue({ code: 'custom', path: ['responseDays'], message: 'Message consultations require at least one response day' });
    }
  });

export const updateConsultationTypeSchema = z.object(typeFields).partial().strict();

export const consultationTypeIdParamSchema = z.object({ id: z.string().uuid('Invalid consultation id') });

export const consultationTypeBlockDateSchema = z.object({
  date: z.string().min(8).max(10),
});

export const publicConsultationTypesQuerySchema = z.object({
  type: kindSchema.optional(),
});
