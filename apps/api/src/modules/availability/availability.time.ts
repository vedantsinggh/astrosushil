/**
 * Pure time arithmetic for the booking calendar.
 *
 * TIMEZONE RULE (fixed): the astrologer's calendar is kept in Indian Standard Time
 * (Asia/Kolkata, UTC+05:30, no DST), exactly as the website generates its slots.
 *   - a calendar date is an IST date, written YYYY-MM-DD;
 *   - a time of day is minutes since 00:00 IST (shown as "HH:mm");
 *   - an instant is `istStartOfDay(date) + minutes`, stored in UTC.
 * Nothing here reads the server's local timezone.
 */
import { ValidationError } from '../../errors/app-error';
import { isCalendarDate, istStartOfDay } from '../../utils/business-time';

export const MINUTES_PER_DAY = 24 * 60;

export interface MinuteRange {
  startMinute: number;
  endMinute: number;
}

export interface SlotInterval {
  startTime: string; // HH:mm (IST)
  endTime: string; // HH:mm (IST)
}

export interface WorkingHours {
  startMinute: number;
  endMinute: number;
  gapMinutes: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
}

const TIME_RE = /^(\d{1,2}):(\d{2})$/;
const WEBSITE_DATE_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

/** "HH:mm" (or "H:mm") to minutes since midnight. "24:00" is accepted as the end of the day. */
export function parseTimeOfDay(value: string): number {
  const match = TIME_RE.exec(String(value).trim());
  if (!match) throw new ValidationError(`Invalid time "${value}". Expected HH:mm`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const total = hours * 60 + minutes;
  if (minutes > 59 || total > MINUTES_PER_DAY) {
    throw new ValidationError(`Invalid time "${value}". Expected HH:mm`);
  }
  return total;
}

export function formatTimeOfDay(minute: number): string {
  const h = String(Math.floor(minute / 60)).padStart(2, '0');
  const m = String(minute % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function toSlotInterval(range: MinuteRange): SlotInterval {
  return { startTime: formatTimeOfDay(range.startMinute), endTime: formatTimeOfDay(range.endMinute) };
}

/** Website slot label, "HH:mm-HH:mm". */
export function slotLabel(range: MinuteRange): string {
  return `${formatTimeOfDay(range.startMinute)}-${formatTimeOfDay(range.endMinute)}`;
}

/** Half-open overlap: [a.start, a.end) and [b.start, b.end). Touching slots do not overlap. */
export function rangesOverlap(a: MinuteRange, b: MinuteRange): boolean {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

/**
 * A slot as clients send it: "HH:mm" (start only), the website's "HH:mm-HH:mm", or
 * { startTime, endTime? }. When the end is missing it is start + durationMinutes.
 */
export function parseSlotInput(
  slot: string | { startTime: string; endTime?: string },
  durationMinutes: number
): MinuteRange {
  let startText: string;
  let endText: string | undefined;
  if (typeof slot === 'string') {
    const parts = slot.replace(/\s+/g, '').split('-');
    if (parts.length > 2) throw new ValidationError(`Invalid slot "${slot}"`);
    startText = parts[0];
    endText = parts[1];
  } else {
    startText = slot.startTime;
    endText = slot.endTime;
  }
  const startMinute = parseTimeOfDay(startText);
  const endMinute = endText ? parseTimeOfDay(endText) : startMinute + durationMinutes;
  if (endMinute <= startMinute) throw new ValidationError('Slot end time must be after its start time');
  if (endMinute > MINUTES_PER_DAY) throw new ValidationError('Slot must end on the same day it starts');
  return { startMinute, endMinute };
}

/** YYYY-MM-DD, or the website's DD-MM-YYYY, to YYYY-MM-DD. */
export function normaliseCalendarDate(value: string): string {
  const text = String(value).trim();
  const website = WEBSITE_DATE_RE.exec(text);
  const iso = website ? `${website[3]}-${website[2]}-${website[1]}` : text;
  if (!isCalendarDate(iso)) {
    throw new ValidationError('Invalid date format. Expected YYYY-MM-DD');
  }
  return iso;
}

/** The UTC instant of a time of day on an IST calendar date. */
export function istInstant(date: string, minute: number): Date {
  return new Date(istStartOfDay(date).getTime() + minute * 60 * 1000);
}

/** 0 = Sunday ... 6 = Saturday, for a calendar date. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Value for a Prisma `@db.Date` column. */
export function calendarDateToDb(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** A Prisma `@db.Date` value back to YYYY-MM-DD. */
export function dbToCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Every calendar date from `from` to `to`, inclusive (either order). */
export function calendarDatesBetween(from: string, to: string): string[] {
  const a = calendarDateToDb(from).getTime();
  const b = calendarDateToDb(to).getTime();
  const [start, end] = a <= b ? [a, b] : [b, a];
  const dates: string[] = [];
  for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * The slots of one working day, as the website generates them: back to back from the start of
 * the working window, each `durationMinutes` long and `gapMinutes` apart; a slot is kept only
 * if it ends by the end of the window. With a daily break, each side of the break is filled
 * separately, so no slot overlaps the break.
 */
export function generateDaySlots(hours: WorkingHours, durationMinutes: number): MinuteRange[] {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new RangeError('durationMinutes must be a positive integer');
  }
  const segments: MinuteRange[] = [];
  const hasBreak =
    hours.breakStartMinute !== null &&
    hours.breakEndMinute !== null &&
    hours.breakEndMinute > hours.breakStartMinute &&
    hours.breakStartMinute < hours.endMinute &&
    hours.breakEndMinute > hours.startMinute;

  if (hasBreak) {
    segments.push({ startMinute: hours.startMinute, endMinute: hours.breakStartMinute as number });
    segments.push({ startMinute: hours.breakEndMinute as number, endMinute: hours.endMinute });
  } else {
    segments.push({ startMinute: hours.startMinute, endMinute: hours.endMinute });
  }

  const slots: MinuteRange[] = [];
  for (const segment of segments) {
    let cursor = segment.startMinute;
    while (cursor + durationMinutes <= segment.endMinute) {
      slots.push({ startMinute: cursor, endMinute: cursor + durationMinutes });
      cursor += durationMinutes + hours.gapMinutes;
    }
  }
  return slots;
}
