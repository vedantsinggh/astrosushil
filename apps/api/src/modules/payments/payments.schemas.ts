import { z } from 'zod';
import { ReportType } from '@prisma/client';

export const createOrderSchema = z.object({
  reportType: z.nativeEnum(ReportType, {
    errorMap: () => ({ message: 'Invalid reportType' }),
  }),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
