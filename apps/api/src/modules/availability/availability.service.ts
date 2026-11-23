/**
 * Availability: the astrologer's working hours, blocked days, blocked slots and the slot list
 * (website module `availability`). One astrologer, one calendar.
 *
 * Times are IST wall-clock values; see availability.time.ts for the timezone rule.
 */
import { BookingStatus, SlotStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { calendarDaysBetween, istDateOf } from '../../utils/business-time';
import { OCCUPYING_BOOKING_STATUSES, releaseAllExpiredHolds } from '../bookings/slot-hold';
import {
  calendarDateToDb,
  calendarDatesBetween,
  dbToCalendarDate,
  formatTimeOfDay,
  generateDaySlots,
  istInstant,
  MinuteRange,
  normaliseCalendarDate,
  parseSlotInput,
  parseTimeOfDay,
  rangesOverlap,
  slotLabel,
  SlotInterval,
  toSlotInterval,
  WEEKDAY_NAMES,
  weekdayOf,
} from './availability.time';

export interface AvailabilitySettings {
  startMinute: number;
  endMinute: number;
  slotDurationMinutes: number;
  gapMinutes: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
  blockedWeekdays: number[];
  bookingHorizonDays: number | null;
}

export interface AvailabilityView {
  startTime: string;
  endTime: string;
  slotDuration: number;
  gap: number;
  breakStartTime: string | null;
  breakEndTime: string | null;
  blockedWeekdays: number[];
  bookingHorizonDays: number | null;
}

export interface AvailabilityInput {
  startTime: string;
  endTime: string;
  slotDuration: number;
  gap: number;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  blockedWeekdays?: number[];
  bookingHorizonDays?: number | null;
}

export interface ScheduleView {
  date: string;
  isBlocked: boolean;
  /** "HH:mm-HH:mm", as on the website. */
  blockedSlots: string[];
}

export interface CustomerSlotsResult {
  available: boolean;
  date: string;
  slots: SlotInterval[];
  message?: string;
}

export interface AdminSlot extends SlotInterval {
  /** "HH:mm-HH:mm", as on the website. */
  slot: string;
  /** booked: a confirmed booking overlaps. held: a customer is paying for it right now. */
  status: 'available' | 'booked' | 'held';
  /** The day or this slot is blocked for customers. Staff may still book it. */
  blocked: boolean;
}

/** What a consultation type contributes to the slot rules. */
export interface SlotOffering {
  title: string;
  durationMinutes: number;
  responseDays: number;
  unavailableDates: string[];
}

/**
 * The hours this backend had hard-coded before they became editable: 11:00-14:00 and
 * 15:00-19:00 IST, Sundays off, bookable up to 60 days ahead. Used to create the settings row.
 */
export const DEFAULT_AVAILABILITY: AvailabilitySettings = {
  startMinute: 11 * 60,
  endMinute: 19 * 60,
  slotDurationMinutes: 30,
  gapMinutes: 0,
  breakStartMinute: 14 * 60,
  breakEndMinute: 15 * 60,
  blockedWeekdays: [0],
  bookingHorizonDays: 60,
};

const SETTINGS_ID = 'default';
const SETTINGS_TTL_MS = 30_000;
const RETRY_AFTER_FAILURE_MS = 5_000;

function toView(s: AvailabilitySettings): AvailabilityView {
  return {
    startTime: formatTimeOfDay(s.startMinute),
    endTime: formatTimeOfDay(s.endMinute),
    slotDuration: s.slotDurationMinutes,
    gap: s.gapMinutes,
    breakStartTime: s.breakStartMinute === null ? null : formatTimeOfDay(s.breakStartMinute),
    breakEndTime: s.breakEndMinute === null ? null : formatTimeOfDay(s.breakEndMinute),
    blockedWeekdays: s.blockedWeekdays,
    bookingHorizonDays: s.bookingHorizonDays,
  };
}

function safeRange(startTime: string, endTime: string): MinuteRange | null {
  try {
    const startMinute = parseTimeOfDay(startTime);
    const endMinute = parseTimeOfDay(endTime);
    return endMinute > startMinute ? { startMinute, endMinute } : null;
  } catch {
    return null;
  }
}

export class AvailabilityService {
  private cached: AvailabilitySettings = DEFAULT_AVAILABILITY;
  private nextRefreshAt = 0;

  // ---------------------------------------------------------------------------
  // Working hours
  // ---------------------------------------------------------------------------

  /**
   * Current working hours. Read from the database at most every 30 s. Without `force`, a failed
   * read keeps the last known hours (logged); with `force` it throws.
   */
  public async getSettings(options: { force?: boolean } = {}): Promise<AvailabilitySettings> {
    if (!options.force && Date.now() < this.nextRefreshAt) return this.cached;
    try {
      const row = await prisma.availabilitySetting.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, ...DEFAULT_AVAILABILITY },
        update: {},
      });
      this.cached = {
        startMinute: row.startMinute,
        endMinute: row.endMinute,
        slotDurationMinutes: row.slotDurationMinutes,
        gapMinutes: row.gapMinutes,
        breakStartMinute: row.breakStartMinute,
        breakEndMinute: row.breakEndMinute,
        blockedWeekdays: row.blockedWeekdays,
        bookingHorizonDays: row.bookingHorizonDays,
      };
      this.nextRefreshAt = Date.now() + SETTINGS_TTL_MS;
    } catch (err) {
      if (options.force) throw err;
      this.nextRefreshAt = Date.now() + RETRY_AFTER_FAILURE_MS;
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        '[Availability] Could not read working hours; keeping the last known hours'
      );
    }
    return this.cached;
  }

  public async getAvailability(): Promise<AvailabilityView> {
    return toView(await this.getSettings({ force: true }));
  }

  public async setAvailability(input: AvailabilityInput, adminId?: string): Promise<AvailabilityView> {
    const current = await this.getSettings({ force: true });
    const startMinute = parseTimeOfDay(input.startTime);
    const endMinute = parseTimeOfDay(input.endTime);
    if (endMinute <= startMinute) {
      throw new ValidationError('End time must be after start time');
    }
    if (input.slotDuration > endMinute - startMinute) {
      throw new ValidationError('Slot duration is longer than the working window');
    }

    let breakStartMinute = current.breakStartMinute;
    let breakEndMinute = current.breakEndMinute;
    if (input.breakStartTime !== undefined || input.breakEndTime !== undefined) {
      const bothCleared = !input.breakStartTime && !input.breakEndTime;
      if (bothCleared) {
        breakStartMinute = null;
        breakEndMinute = null;
      } else {
        if (!input.breakStartTime || !input.breakEndTime) {
          throw new ValidationError('Give both the break start and the break end, or neither');
        }
        breakStartMinute = parseTimeOfDay(input.breakStartTime);
        breakEndMinute = parseTimeOfDay(input.breakEndTime);
      }
    }
    if (breakStartMinute !== null && breakEndMinute !== null) {
      if (breakEndMinute <= breakStartMinute) {
        throw new ValidationError('Break end must be after break start');
      }
      if (breakStartMinute < startMinute || breakEndMinute > endMinute) {
        // A break left over from earlier hours no longer fits: drop it when it was not part of
        // this request, reject it when it was.
        if (input.breakStartTime !== undefined || input.breakEndTime !== undefined) {
          throw new ValidationError('The break must lie inside the working window');
        }
        breakStartMinute = null;
        breakEndMinute = null;
      }
    }

    const data = {
      startMinute,
      endMinute,
      slotDurationMinutes: input.slotDuration,
      gapMinutes: input.gap,
      breakStartMinute,
      breakEndMinute,
      blockedWeekdays:
        input.blockedWeekdays !== undefined
          ? [...new Set(input.blockedWeekdays)].sort((a, b) => a - b)
          : current.blockedWeekdays,
      bookingHorizonDays:
        input.bookingHorizonDays !== undefined ? input.bookingHorizonDays : current.bookingHorizonDays,
      updatedById: adminId ?? null,
    };

    await prisma.availabilitySetting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
    return toView(await this.getSettings({ force: true }));
  }

  // ---------------------------------------------------------------------------
  // Blocked days and blocked slots
  // ---------------------------------------------------------------------------

  /** Block a whole day. As on the website, this also clears the day's individual blocked slots. */
  public async blockDay(date: string): Promise<ScheduleView> {
    const [view] = await this.blockRange(date, date);
    return view;
  }

  public async unblockDay(date: string): Promise<ScheduleView> {
    const [view] = await this.unblockRange(date, date);
    return view;
  }

  /** Block every day from `from` to `to` inclusive (the calendar page's range selection). */
  public async blockRange(from: string, to: string): Promise<ScheduleView[]> {
    const dates = this.rangeDates(from, to);
    await prisma.$transaction(async (tx) => {
      for (const date of dates) {
        const day = await tx.scheduleDay.upsert({
          where: { date: calendarDateToDb(date) },
          create: { date: calendarDateToDb(date), isBlocked: true },
          update: { isBlocked: true },
        });
        await tx.scheduleBlockedSlot.deleteMany({ where: { dayId: day.id } });
      }
    });
    return dates.map((date) => ({ date, isBlocked: true, blockedSlots: [] }));
  }

  public async unblockRange(from: string, to: string): Promise<ScheduleView[]> {
    const dates = this.rangeDates(from, to);
    await prisma.scheduleDay.updateMany({
      where: { date: { in: dates.map(calendarDateToDb) } },
      data: { isBlocked: false },
    });
    return Promise.all(dates.map((date) => this.getSchedule(date)));
  }

  public async blockSlots(date: string, slots: Array<string | { startTime: string; endTime?: string }>): Promise<ScheduleView> {
    const day = normaliseCalendarDate(date);
    const ranges = await this.parseSlots(slots);
    await prisma.$transaction(async (tx) => {
      const row = await tx.scheduleDay.upsert({
        where: { date: calendarDateToDb(day) },
        create: { date: calendarDateToDb(day) },
        update: {},
      });
      await tx.scheduleBlockedSlot.createMany({
        data: ranges.map((r) => ({ dayId: row.id, startMinute: r.startMinute, endMinute: r.endMinute })),
        skipDuplicates: true,
      });
    });
    return this.getSchedule(day);
  }

  public async unblockSlots(date: string, slots: Array<string | { startTime: string; endTime?: string }>): Promise<ScheduleView> {
    const day = normaliseCalendarDate(date);
    const ranges = await this.parseSlots(slots);
    const row = await prisma.scheduleDay.findUnique({ where: { date: calendarDateToDb(day) }, select: { id: true } });
    if (row) {
      await prisma.scheduleBlockedSlot.deleteMany({
        where: {
          dayId: row.id,
          OR: ranges.map((r) => ({ startMinute: r.startMinute, endMinute: r.endMinute })),
        },
      });
    }
    return this.getSchedule(day);
  }

  public async getSchedule(date: string): Promise<ScheduleView> {
    const day = normaliseCalendarDate(date);
    const row = await prisma.scheduleDay.findUnique({
      where: { date: calendarDateToDb(day) },
      include: { blockedSlots: { orderBy: { startMinute: 'asc' } } },
    });
    return {
      date: day,
      isBlocked: row?.isBlocked ?? false,
      blockedSlots: (row?.blockedSlots ?? []).map(slotLabel),
    };
  }

  /**
   * Fully blocked dates of one month (YYYY-MM-DD), for the calendars.
   * The website compared "DD-MM-YYYY" strings, which also matched other months; this is a real
   * date range.
   */
  public async getBlockedDates(month: number, year: number): Promise<string[]> {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0));
    const rows = await prisma.scheduleDay.findMany({
      where: { isBlocked: true, date: { gte: from, lte: to } },
      select: { date: true },
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => dbToCalendarDate(r.date));
  }

  // ---------------------------------------------------------------------------
  // Slots
  // ---------------------------------------------------------------------------

  /**
   * Slots a customer can book for a consultation type on a date: generated from the working
   * hours with the type's own duration, minus blocked days and slots, minus anything that
   * overlaps a booking or a live payment hold of ANY consultation type, and not before the
   * type's minimum notice.
   */
  public async listCustomerSlots(offering: SlotOffering, date: string, now: Date = new Date()): Promise<CustomerSlotsResult> {
    const day = normaliseCalendarDate(date);
    // The notice period needs nothing but the type, so it is answered before any read.
    const tooSoon = this.noticeRefusal(offering, day, now);
    if (tooSoon) return { available: false, date: day, slots: [], message: tooSoon };
    const settings = await this.getSettings();
    const refusal = this.dayRefusal(offering, day, settings, now);
    if (refusal) return { available: false, date: day, slots: [], message: refusal };

    await releaseAllExpiredHolds(now);

    const schedule = await this.getSchedule(day);
    if (schedule.isBlocked) {
      return { available: false, date: day, slots: [], message: 'This day is blocked.' };
    }

    const blocked = this.blockedRanges(schedule);
    const occupied = await this.occupiedRanges(day, now);
    const taken = [...occupied.booked, ...occupied.held];

    const slots = generateDaySlots(settings, offering.durationMinutes).filter(
      (slot) =>
        istInstant(day, slot.startMinute).getTime() > now.getTime() &&
        !blocked.some((b) => rangesOverlap(slot, b)) &&
        !taken.some((t) => rangesOverlap(slot, t))
    );

    return {
      available: slots.length > 0,
      date: day,
      slots: slots.map(toSlotInterval),
      message: slots.length > 0 ? 'Slots fetched' : 'All slots on this date are fully booked',
    };
  }

  /**
   * Every generated slot of a date with its state, for staff. Blocked days, blocked slots and
   * the notice period do not hide anything here (staff may book over them), as on the website.
   */
  public async listAdminSlots(date: string, offering?: Pick<SlotOffering, 'durationMinutes'>, now: Date = new Date()): Promise<AdminSlot[]> {
    const day = normaliseCalendarDate(date);
    const settings = await this.getSettings({ force: true });
    await releaseAllExpiredHolds(now);
    const schedule = await this.getSchedule(day);
    const blocked = this.blockedRanges(schedule);
    const occupied = await this.occupiedRanges(day, now);

    return generateDaySlots(settings, offering?.durationMinutes ?? settings.slotDurationMinutes).map((slot) => {
      const isBooked = occupied.booked.some((b) => rangesOverlap(slot, b));
      const isHeld = occupied.held.some((h) => rangesOverlap(slot, h));
      return {
        slot: slotLabel(slot),
        ...toSlotInterval(slot),
        status: isBooked ? 'booked' : isHeld ? 'held' : 'available',
        blocked: schedule.isBlocked || blocked.some((b) => rangesOverlap(slot, b)),
      };
    });
  }

  /**
   * Reject a customer's choice of date and slot unless it is one of the slots the customer
   * would be offered (the overlap with other bookings is checked when the slot is claimed).
   */
  public async assertCustomerCanBook(offering: SlotOffering, date: string, slot: MinuteRange, now: Date = new Date()): Promise<void> {
    const day = normaliseCalendarDate(date);
    const settings = await this.getSettings({ force: true });
    const refusal = this.dayRefusal(offering, day, settings, now);
    if (refusal) throw new ValidationError(refusal);

    if (istInstant(day, slot.startMinute).getTime() <= now.getTime()) {
      throw new ValidationError('This slot is in the past');
    }
    const offered = generateDaySlots(settings, offering.durationMinutes).some(
      (s) => s.startMinute === slot.startMinute && s.endMinute === slot.endMinute
    );
    if (!offered) {
      throw new ValidationError('This slot is not offered. Please choose one of the available slots.');
    }

    const schedule = await this.getSchedule(day);
    if (schedule.isBlocked) throw new ValidationError('This day is not available');
    if (this.blockedRanges(schedule).some((b) => rangesOverlap(slot, b))) {
      throw new ValidationError('This slot is blocked');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Why a customer cannot book this type on this date at all, or null. No database access. */
  private noticeRefusal(offering: SlotOffering, day: string, now: Date): string | null {
    // Notice is counted in IST calendar days from today's IST date, as on the website.
    const daysAhead = calendarDaysBetween(istDateOf(now), day);
    if (daysAhead < offering.responseDays) {
      return `This day is blocked. Minimum booking notice for ${offering.title} is ${offering.responseDays} day(s).`;
    }
    return null;
  }

  private dayRefusal(offering: SlotOffering, day: string, settings: AvailabilitySettings, now: Date): string | null {
    const tooSoon = this.noticeRefusal(offering, day, now);
    if (tooSoon) return tooSoon;
    const daysAhead = calendarDaysBetween(istDateOf(now), day);
    if (settings.bookingHorizonDays !== null && daysAhead > settings.bookingHorizonDays) {
      return `This day is blocked. Booking horizon is up to ${settings.bookingHorizonDays} days in advance.`;
    }
    const weekday = weekdayOf(day);
    if (settings.blockedWeekdays.includes(weekday)) {
      return `This day is blocked. ${WEEKDAY_NAMES[weekday]} is a weekly day off.`;
    }
    if (offering.unavailableDates.includes(day)) {
      return `This day is blocked for ${offering.title}.`;
    }
    return null;
  }

  private blockedRanges(schedule: ScheduleView): MinuteRange[] {
    return schedule.blockedSlots.map((label) => parseSlotInput(label, 0));
  }

  /** Times of a date taken by bookings (booked) and by live payment holds (held), any type. */
  private async occupiedRanges(day: string, now: Date): Promise<{ booked: MinuteRange[]; held: MinuteRange[] }> {
    const [slotRows, bookingRows] = await Promise.all([
      prisma.appointmentSlot.findMany({
        where: {
          date: day,
          OR: [
            { status: SlotStatus.BOOKED },
            { status: SlotStatus.BLOCKED },
            { status: SlotStatus.RESERVED, lockedUntil: { gt: now } },
          ],
        },
        select: { startTime: true, endTime: true, status: true },
      }),
      prisma.consultationBooking.findMany({
        where: {
          date: day,
          deletedAt: null,
          OR: [
            { status: { in: OCCUPYING_BOOKING_STATUSES } },
            { status: BookingStatus.PENDING_PAYMENT, reservationExpiresAt: { gt: now } },
          ],
        },
        select: { startTime: true, endTime: true, status: true },
      }),
    ]);

    const booked: MinuteRange[] = [];
    const held: MinuteRange[] = [];
    for (const row of slotRows) {
      const range = safeRange(row.startTime, row.endTime);
      if (range) (row.status === SlotStatus.RESERVED ? held : booked).push(range);
    }
    for (const row of bookingRows) {
      const range = safeRange(row.startTime, row.endTime);
      if (range) (row.status === BookingStatus.PENDING_PAYMENT ? held : booked).push(range);
    }
    return { booked, held };
  }

  private rangeDates(from: string, to: string): string[] {
    const dates = calendarDatesBetween(normaliseCalendarDate(from), normaliseCalendarDate(to));
    if (dates.length > 366) throw new ValidationError('A date range can cover at most one year');
    return dates;
  }

  private async parseSlots(slots: Array<string | { startTime: string; endTime?: string }>): Promise<MinuteRange[]> {
    if (!slots || slots.length === 0) throw new ValidationError('Date & slots required');
    const settings = await this.getSettings({ force: true });
    return slots.map((s) => parseSlotInput(s, settings.slotDurationMinutes));
  }
}

export const availabilityService = new AvailabilityService();
