/**
 * The one place that decides whether a time on the astrologer's calendar is free, and takes it.
 *
 * One astrologer, one calendar: a time can belong to at most one booking, whatever the
 * consultation type, and whether it came from the app, the website or the admin.
 *
 * A time is taken by a row in `appointment_slots`:
 *   RESERVED  a customer has started paying; the hold lasts until `lockedUntil`
 *   BOOKED    a confirmed booking
 * (AVAILABLE rows are released slots kept for reuse; BLOCKED is legacy and still respected.)
 *
 * Three layers stop double booking:
 *   1. every claim runs in a transaction that first takes one advisory lock, so claims are
 *      serialised and the overlap check below cannot race;
 *   2. the overlap check itself (any consultation type, half-open intervals);
 *   3. database constraints: the unique key (practitionerId, date, startTime) and the exclusion
 *      constraint `appointment_slots_no_overlap` on the UTC range of RESERVED/BOOKED rows.
 *      A hold that has expired is released here before a new claim, so the constraint never
 *      rejects a time that is really free.
 */
import { BookingStatus, Prisma, SlotStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { ConflictError } from '../../errors/app-error';
import { istInstant, formatTimeOfDay, MinuteRange } from '../availability/availability.time';

export type Tx = Prisma.TransactionClient;

export const PRACTITIONER_ID = 'astro-sushil';
export const PRACTITIONER_NAME = 'Astro Sushil';

/** How long an unpaid reservation holds its slot. */
export const RESERVATION_HOLD_MINUTES = 15;

/** Bookings that occupy the calendar. */
export const OCCUPYING_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED];

export const SLOT_TAKEN_MESSAGE =
  'This consultation slot has already been reserved or booked. Please select another slot.';

/** Arbitrary constant identifying the calendar lock (pg_advisory_xact_lock key). */
const CALENDAR_LOCK_KEY = 7_302_611;

export interface UtcRange {
  startUtc: Date;
  endUtc: Date;
}

export function utcRangeOf(date: string, range: MinuteRange): UtcRange {
  return { startUtc: istInstant(date, range.startMinute), endUtc: istInstant(date, range.endMinute) };
}

/** Serialise calendar changes for the rest of the transaction. */
export async function lockCalendar(tx: Tx): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CALENDAR_LOCK_KEY}::bigint)`;
}

/**
 * Release holds whose payment window has passed: the slot becomes free and the unpaid booking
 * is cancelled with reason RESERVATION_EXPIRED. Returns how many bookings were cancelled.
 * With `within`, only holds overlapping that range are touched.
 */
export async function releaseExpiredHolds(tx: Tx, now: Date = new Date(), within?: UtcRange): Promise<number> {
  const overlapBooking = within
    ? { slotStartTimeUtc: { lt: within.endUtc }, slotEndTimeUtc: { gt: within.startUtc } }
    : {};
  const overlapSlot = within ? { startTimeUtc: { lt: within.endUtc }, endTimeUtc: { gt: within.startUtc } } : {};

  const expired = await tx.consultationBooking.findMany({
    where: {
      status: BookingStatus.PENDING_PAYMENT,
      reservationExpiresAt: { lte: now },
      ...overlapBooking,
    },
    select: { id: true },
  });
  const expiredIds = expired.map((b) => b.id);

  await tx.appointmentSlot.updateMany({
    where: {
      status: SlotStatus.RESERVED,
      ...overlapSlot,
      OR: [
        { lockedUntil: null },
        { lockedUntil: { lte: now } },
        ...(expiredIds.length > 0 ? [{ bookingId: { in: expiredIds } }] : []),
      ],
    },
    data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
  });

  if (expiredIds.length === 0) return 0;

  await tx.consultationBooking.updateMany({
    where: { id: { in: expiredIds }, status: BookingStatus.PENDING_PAYMENT },
    data: { status: BookingStatus.CANCELLED, cancellationReason: 'RESERVATION_EXPIRED' },
  });
  return expiredIds.length;
}

/** Is any part of the range taken by a booking or a live hold other than `excludeBookingId`? */
export async function isRangeTaken(
  tx: Tx,
  range: UtcRange,
  now: Date = new Date(),
  excludeBookingId?: string
): Promise<boolean> {
  const slot = await tx.appointmentSlot.findFirst({
    where: {
      startTimeUtc: { lt: range.endUtc },
      endTimeUtc: { gt: range.startUtc },
      AND: [
        {
          OR: [
            { status: SlotStatus.BOOKED },
            { status: SlotStatus.BLOCKED },
            { status: SlotStatus.RESERVED, lockedUntil: { gt: now } },
          ],
        },
        // `bookingId <> x` is not true for NULL in SQL, so unowned rows are listed explicitly.
        ...(excludeBookingId ? [{ OR: [{ bookingId: null }, { bookingId: { not: excludeBookingId } }] }] : []),
      ],
    },
    select: { id: true },
  });
  if (slot) return true;

  // Bookings are checked directly as well, so a booking whose slot row is missing still counts.
  const booking = await tx.consultationBooking.findFirst({
    where: {
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      deletedAt: null,
      slotStartTimeUtc: { lt: range.endUtc },
      slotEndTimeUtc: { gt: range.startUtc },
      OR: [
        { status: { in: OCCUPYING_BOOKING_STATUSES } },
        { status: BookingStatus.PENDING_PAYMENT, reservationExpiresAt: { gt: now } },
      ],
    },
    select: { id: true },
  });
  return Boolean(booking);
}

function isSlotConstraintViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return true;
  const message = err instanceof Error ? err.message : '';
  return message.includes('appointment_slots_no_overlap') || message.includes('23P01');
}

export interface ClaimSlotInput {
  bookingId: string;
  date: string; // IST calendar date
  range: MinuteRange; // IST minutes
  status: 'RESERVED' | 'BOOKED';
  /** Required for RESERVED: when the hold lapses. */
  lockedUntil?: Date | null;
  now?: Date;
}

/**
 * Take a time for a booking, or throw ConflictError. Must run inside a transaction; the booking
 * row itself is written by the caller in the same transaction. Any slot the booking held before
 * (reschedule, plan change, re-confirmation) is released first.
 */
export async function claimSlot(tx: Tx, input: ClaimSlotInput): Promise<UtcRange> {
  const now = input.now ?? new Date();
  const range = utcRangeOf(input.date, input.range);
  const startTime = formatTimeOfDay(input.range.startMinute);
  const endTime = formatTimeOfDay(input.range.endMinute);

  await lockCalendar(tx);
  await releaseExpiredHolds(tx, now, range);

  if (await isRangeTaken(tx, range, now, input.bookingId)) {
    throw new ConflictError(SLOT_TAKEN_MESSAGE);
  }

  await tx.appointmentSlot.updateMany({
    where: { bookingId: input.bookingId },
    data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
  });

  const lockedUntil = input.status === 'RESERVED' ? input.lockedUntil ?? null : null;
  try {
    await tx.appointmentSlot.upsert({
      where: {
        practitionerId_date_startTime: { practitionerId: PRACTITIONER_ID, date: input.date, startTime },
      },
      create: {
        practitionerId: PRACTITIONER_ID,
        date: input.date,
        startTime,
        endTime,
        startTimeUtc: range.startUtc,
        endTimeUtc: range.endUtc,
        status: input.status,
        bookingId: input.bookingId,
        lockedUntil,
      },
      update: {
        endTime,
        startTimeUtc: range.startUtc,
        endTimeUtc: range.endUtc,
        status: input.status,
        bookingId: input.bookingId,
        lockedUntil,
      },
    });
  } catch (err) {
    if (isSlotConstraintViolation(err)) throw new ConflictError(SLOT_TAKEN_MESSAGE);
    throw err;
  }
  return range;
}

/** Give a booking's time back to the calendar. */
export async function releaseSlot(tx: Tx, bookingId: string): Promise<void> {
  await tx.appointmentSlot.updateMany({
    where: { bookingId },
    data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
  });
}

/** Release every expired hold (used before listing slots and by housekeeping). */
export async function releaseAllExpiredHolds(now: Date = new Date()): Promise<number> {
  const stale = await prisma.appointmentSlot.findFirst({
    where: { status: SlotStatus.RESERVED, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
    select: { id: true },
  });
  const expired = stale
    ? null
    : await prisma.consultationBooking.findFirst({
        where: { status: BookingStatus.PENDING_PAYMENT, reservationExpiresAt: { lte: now } },
        select: { id: true },
      });
  if (!stale && !expired) return 0;
  return prisma.$transaction((tx) => releaseExpiredHolds(tx, now));
}
