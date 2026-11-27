import { z } from 'zod/v3';

export const getSlotsQuerySchema = z.object({
  consultationId: z.string().min(1, 'consultationId is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  timezone: z.string().optional().default('Asia/Kolkata'),
});

export const bookConsultationSchema = z.object({
  consultationId: z.string().min(1, 'consultationId is required'),
  mode: z.enum(['AUDIO', 'VIDEO', 'IN_PERSON', 'MESSAGE', 'audio', 'video', 'in_person', 'message']).transform((val) => {
    const upper = val.toUpperCase();
    if (upper === 'AUDIO') return 'AUDIO' as const;
    if (upper === 'VIDEO') return 'VIDEO' as const;
    if (upper === 'MESSAGE') return 'MESSAGE' as const;
    return 'IN_PERSON' as const;
  }),
  // A MESSAGE consultation (website "WhatsApp Message") has no date and no slot.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format').optional(),
  slot: z
    .union([
      z.string().min(3),
      z.object({
        startTime: z.string().min(3),
        endTime: z.string().min(3),
      }),
    ])
    .optional(),
  birthProfileId: z.string().uuid().optional(),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(6).max(20).optional(),
  dob: z.string().optional(),
  tob: z.string().optional(),
  pob: z.string().optional(),
  notes: z.string().max(1000).optional(),
  timezone: z.string().optional().default('Asia/Kolkata'),
  currency: z.string().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()).optional(),
  couponCode: z.string().trim().min(3).max(20).optional(),
}).superRefine((data, ctx) => {
  if (data.mode !== 'MESSAGE' && (!data.date || !data.slot)) {
    ctx.addIssue({ code: 'custom', path: ['date'], message: 'Date and slot are required for scheduled consultations' });
  }
});

export const verifyConsultationPaymentSchema = z.object({
  bookingId: z.string().uuid('Invalid bookingId UUID'),
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
});

export const rescheduleBookingSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'newDate must be in YYYY-MM-DD format'),
  newSlot: z.union([
    z.string().min(3),
    z.object({
      startTime: z.string().min(3),
      endTime: z.string().min(3),
    }),
  ]),
  reason: z.string().max(500).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const adminUpdateBookingSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'REFUNDED']).optional(),
  meetingLink: z.string().url().optional(),
  internalNotes: z.string().max(2000).optional(),
  locationAddress: z.string().max(500).optional(),
});
