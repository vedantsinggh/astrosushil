import { z } from 'zod';
import { ReportType } from '@prisma/client';

export const orderItemInputSchema = z.object({
  catalogId: z.string().min(1, 'catalogId is required'),
  quantity: z.number().int().positive().default(1),
  metadata: z.record(z.any()).optional(),
});

export const createOrderSchema = z
  .object({
    // Unified multi-item order input
    items: z.array(orderItemInputSchema).min(1).optional(),
    // Legacy single report order input
    reportType: z.nativeEnum(ReportType).optional(),
    // Language of the report PDF for the legacy single-report input. In the unified input it is
    // `items[].metadata.language`. Chosen before payment and fixed for that purchase; default "en".
    language: z.enum(['en', 'hi']).optional(),
    idempotencyKey: z.string().min(4).max(128).optional(),
    notes: z.string().max(500).optional(),
    // Currency to charge (default INR). Validated against the supported list in the commerce layer;
    // the exchange rate is always looked up on the server and is not an input.
    currency: z.string().trim().min(3).max(3).optional(),
  })
  .refine(
    (data) => (data.items && data.items.length > 0) || !!data.reportType,
    { message: 'Either "items" array or legacy "reportType" must be specified' }
  );

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
});

export const refundOrderSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
  idempotencyKey: z.string().min(4).max(128).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RefundOrderInput = z.infer<typeof refundOrderSchema>;
