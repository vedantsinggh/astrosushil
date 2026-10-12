import { z } from 'zod';

export const createReportSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }),
  reportType: z.enum([
    'KUNDLI',
    'PLANETARY_SUMMARY',
    'CAREER',
    'CAREER_PROSITY',
    'MARRIAGE_COMPATIBILITY',
    'GUPTA_NADI_DOSSIER',
  ], {
    errorMap: () => ({ message: 'Invalid reportType' }),
  }),
  orderId: z.string().uuid().optional(),
  partnerProfileId: z.string().uuid({ message: 'partnerProfileId must be a valid UUID' }).optional(),
  forceRegenerate: z.boolean().optional(),
  async: z.boolean().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
