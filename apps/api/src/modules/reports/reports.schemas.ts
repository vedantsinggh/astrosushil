import { z } from 'zod';

/**
 * Language of the report PDF. Omitted means English. Whether the requested report has
 * that edition is checked against the report registry when the job is created.
 */
export const reportLanguageSchema = z.enum(['en', 'hi'], {
  errorMap: () => ({ message: 'language must be "en" or "hi"' }),
});

export const createReportSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }),
  reportType: z.enum([
    'KUNDLI',
    'PLANETARY_SUMMARY',
    'CAREER',
    'CAREER_PROSITY',
    'MARRIAGE_COMPATIBILITY',
    'GUPTA_NADI_DOSSIER',
    'CHILDBIRTH_FAMILY',
    'HOROSCOPE',
    'FINANCE',
    'LOVE',
    'FORTUNE',
    'SATURN',
    'JUPITER_TRANSIT',
    'RAHU_KETU_TRANSIT',
    'VARSHPHAL',
    'FORTUNE_PLUS',
  ], {
    errorMap: () => ({ message: 'Invalid reportType' }),
  }),
  orderId: z.string().uuid().optional(),
  partnerProfileId: z.string().uuid({ message: 'partnerProfileId must be a valid UUID' }).optional(),
  forceRegenerate: z.boolean().optional(),
  language: reportLanguageSchema.optional(),
  async: z.boolean().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const createCareerReportSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }),
  forceRegenerate: z.boolean().optional(),
  orderId: z.string().uuid().optional(),
  language: reportLanguageSchema.optional(),
});

export type CreateCareerReportInput = z.infer<typeof createCareerReportSchema>;
