import { z } from 'zod/v3';
import { consultationModeSchema } from '../consultations/consultation-types.schemas';

const timeOfDay = z.string().regex(/^\d{1,2}:\d{2}$/, 'time must be HH:mm');
/** YYYY-MM-DD, or the website's DD-MM-YYYY. */
const calendarDate = z.string().regex(/^(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/, 'date must be YYYY-MM-DD');
/** "HH:mm", the website's "HH:mm-HH:mm", or { startTime, endTime? }. */
const slot = z.union([
  z.string().min(3).max(11),
  z.object({ startTime: timeOfDay, endTime: timeOfDay.optional() }),
]);
const adminNote = z.string().trim().max(1000).optional();

export const bookingIdParamSchema = z.object({ id: z.string().uuid('Invalid booking id') });

/** Website `bookingZod`, admin half. Prices never come from the request. */
export const manualBookingSchema = z
  .object({
    consultationId: z.string().min(1).max(200),
    mode: consultationModeSchema.optional(),
    date: calendarDate,
    slot,
    userId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().min(6).max(20).optional(),
    email: z.string().trim().email().max(254).optional(),
    discountType: z.enum(['FLAT', 'PERCENTAGE']).optional(),
    /** FLAT: paise. PERCENTAGE: basis points (1250 = 12.5%). */
    discountValue: z.number().int().min(0).max(1_000_000_000).optional(),
    couponCode: z.string().trim().min(3).max(20).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((d) => d.discountType !== 'PERCENTAGE' || d.discountValue === undefined || d.discountValue <= 10000, {
    message: 'Percentage discount cannot exceed 100',
    path: ['discountValue'],
  })
  .refine((d) => Boolean(d.userId) || Boolean(d.name && d.phone), {
    message: 'Give an existing customer (userId) or a new customer (name and phone)',
    path: ['userId'],
  });

export const bookingQuoteSchema = z
  .object({
    consultationId: z.string().min(1).max(200),
    mode: consultationModeSchema.optional(),
    userId: z.string().uuid().optional(),
    discountType: z.enum(['FLAT', 'PERCENTAGE']).optional(),
    /** FLAT: paise. PERCENTAGE: basis points (1250 = 12.5%). */
    discountValue: z.number().int().min(0).max(1_000_000_000).optional(),
    couponCode: z.string().trim().min(3).max(20).optional(),
  })
  .strict()
  .refine((d) => d.discountType !== 'PERCENTAGE' || d.discountValue === undefined || d.discountValue <= 10000, {
    message: 'Percentage discount cannot exceed 100',
    path: ['discountValue'],
  });

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>;

export const adminRescheduleSchema = z.object({ date: calendarDate, slot, adminNote }).strict();

/** Payment conflict (paid, slot taken): staff give the customer another time. No charge is made. */
export const resolveConflictSlotSchema = z.object({ date: calendarDate, slot, adminNote }).strict();

/** Payment conflict: the fallback, a staff refund (see payments.admin.routes.ts for the refund itself). */
export const resolveConflictRefundSchema = z
  .object({
    /** INR paise; omitted = everything still refundable on the order. */
    amountPaise: z.number().int().positive().optional(),
    reason: z.string().trim().min(3, 'A reason is required').max(500),
    idempotencyKey: z.string().min(4).max(128).optional(),
    adminNote,
  })
  .strict();

export const changePlanSchema = z
  .object({
    consultationId: z.string().min(1).max(200),
    mode: consultationModeSchema.optional(),
    adminNote,
  })
  .strict();

export const addBookingNoteSchema = z.object({ note: z.string().trim().min(1).max(1000) }).strict();

const statusSchema = z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'REFUNDED']);

export const adminBookingListQuerySchema = z.object({
  tab: z.enum(['upcoming', 'past']).optional(),
  search: z.string().trim().max(100).optional(),
  fromDate: calendarDate.optional(),
  toDate: calendarDate.optional(),
  date: calendarDate.optional(),
  consultationTypeId: z.string().uuid().optional(),
  consultationId: z.string().min(1).max(200).optional(),
  mode: consultationModeSchema.optional(),
  source: z.enum(['USER', 'ADMIN']).optional(),
  /** Comma-separated. Default: the paid bookings (CONFIRMED, RESCHEDULED, COMPLETED, NO_SHOW). */
  status: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').map((s) => statusSchema.parse(s.trim())) : undefined)),
  sort: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const adminBookingExportQuerySchema = adminBookingListQuerySchema.extend({
  format: z.enum(['json', 'csv']).optional(),
});

export const bookingsByDateQuerySchema = z.object({ date: calendarDate });
