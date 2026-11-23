import { z } from 'zod';

const timeOfDay = z.string().regex(/^\d{1,2}:\d{2}$/, 'time must be HH:mm');
/** YYYY-MM-DD, or the website's DD-MM-YYYY. */
const calendarDate = z.string().regex(/^(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/, 'date must be YYYY-MM-DD');
const slot = z.union([
  z.string().min(3).max(11),
  z.object({ startTime: timeOfDay, endTime: timeOfDay.optional() }),
]);

/** Website `availabilityZod` (startTime, endTime, slotDuration, gap) plus the fields that keep this backend's former hours editable. */
export const setAvailabilitySchema = z
  .object({
    startTime: timeOfDay,
    endTime: timeOfDay,
    slotDuration: z.number().int().min(5).max(480),
    gap: z.number().int().min(0).max(240),
    breakStartTime: timeOfDay.nullable().optional(),
    breakEndTime: timeOfDay.nullable().optional(),
    blockedWeekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    bookingHorizonDays: z.number().int().min(1).max(730).nullable().optional(),
  })
  .strict();

export const dayBodySchema = z.object({ date: calendarDate });

export const dateRangeBodySchema = z.object({ from: calendarDate, to: calendarDate });

export const slotsBodySchema = z.object({
  date: calendarDate,
  slots: z.array(slot).min(1).max(200),
});

export const scheduleQuerySchema = z.object({ date: calendarDate });

export const blockedDatesQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const adminSlotsQuerySchema = z.object({
  date: calendarDate,
  /** A consultation type id or a mode's catalog id; its duration sets the slot length. */
  consultationId: z.string().min(1).max(200).optional(),
});
