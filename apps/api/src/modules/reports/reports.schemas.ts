import { z } from 'zod';
import { ReportType } from '@prisma/client';

export const createReportSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }),
  reportType: z.nativeEnum(ReportType, {
    errorMap: () => ({ message: 'Invalid reportType' }),
  }),
  orderId: z.string().uuid().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
