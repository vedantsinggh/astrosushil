import { logger } from '../../utils/logger';
import { messagingEnv } from '../../services/messaging/config';
import { bookingsService } from '../bookings/bookings.service';
import { EventConsultationMode, NotificationEvents, notificationEvents, toWebsiteDate } from './notification.events';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Date (YYYY-MM-DD) and hour of an instant in IST. */
export function istDateAndHour(instant: Date): { date: string; hour: number } {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS).toISOString();
  return { date: shifted.slice(0, 10), hour: Number(shifted.slice(11, 13)) };
}

export function addDaysIso(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export interface ReminderBooking {
  id: string;
  userId: string;
  title: string;
  mode: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  user: { fullName: string | null; email: string | null; phoneNumber: string | null } | null;
}

export interface ConsultationReminderSweepOptions {
  events?: NotificationEvents;
  /** Default: `bookingsService.findReminderBookings` (the bookings module's one definition of "due for a reminder"). */
  findBookings?: (date: string) => Promise<ReminderBooking[]>;
  /**
   * Records on the booking that its reminder has been handed to the outbox.
   * Default: `bookingsService.markReminded` when the default `findBookings` is used; none otherwise.
   */
  markReminded?: (bookingId: string) => Promise<unknown>;
  now?: () => Date;
}

/**
 * Which bookings are due is the bookings module's decision, in one place: live (confirmed or
 * rescheduled), not deleted by staff, not yet reminded, on that IST day.
 */
const defaultFindBookings = (date: string): Promise<ReminderBooking[]> => bookingsService.findReminderBookings(date);
const defaultMarkReminded = (bookingId: string): Promise<boolean> => bookingsService.markReminded(bookingId);

/**
 * The website's daily consultation reminder: once a day, from
 * CONSULTATION_REMINDER_IST_HOUR (default 08:00 IST), every confirmed booking whose
 * date is TOMORROW (IST) gets a reminder by e-mail and WhatsApp.
 *
 * Two records, with different jobs:
 *  - the outbox's unique key (booking id + date) is what makes a reminder go out at most
 *    once: a restart, a second worker or a retried tick cannot send it again;
 *  - `ConsultationBooking.reminderSentAt` (the website's `reminderSent` flag) is set through
 *    `bookingsService.markReminded` once the reminder is in the outbox, so staff see it on the
 *    booking and the next run does not select the booking again. A reschedule clears it; a
 *    booking moved to another day is then reminded for its new date.
 */
export class ConsultationReminderSweep {
  private readonly events: NotificationEvents;
  private readonly findBookings: (date: string) => Promise<ReminderBooking[]>;
  private readonly markReminded: ((bookingId: string) => Promise<unknown>) | null;
  private readonly now: () => Date;
  /** IST date on which the sweep last completed in this process. */
  private lastRunDate: string | null = null;

  constructor(options: ConsultationReminderSweepOptions = {}) {
    this.events = options.events ?? notificationEvents;
    this.findBookings = options.findBookings ?? defaultFindBookings;
    this.markReminded = options.markReminded ?? (options.findBookings ? null : defaultMarkReminded);
    this.now = options.now ?? (() => new Date());
  }

  /** Called on every scheduler tick; does the work at most once per IST day. */
  public async tick(): Promise<{ ran: boolean; bookings: number }> {
    const { date: today, hour } = istDateAndHour(this.now());
    if (hour < messagingEnv().consultationReminderIstHour || this.lastRunDate === today) return { ran: false, bookings: 0 };

    const tomorrow = addDaysIso(today, 1);
    const bookings = await this.findBookings(tomorrow);
    let failures = 0;
    for (const booking of bookings) {
      const email = booking.user?.email || booking.customerEmail;
      const phone = booking.user?.phoneNumber || booking.customerPhone;
      if (!email && !phone) continue;
      const mode = booking.mode.toLowerCase();
      try {
        await this.events.consultationReminder({
          bookingId: booking.id,
          customer: { userId: booking.userId, name: booking.user?.fullName || booking.customerName || 'User', email, phone },
          consultationTitle: booking.title || 'Consultation',
          mode: mode === 'audio' || mode === 'video' || mode === 'in_person' ? (mode as EventConsultationMode) : null,
          date: toWebsiteDate(booking.date),
          slot: `${booking.startTime}-${booking.endTime}`,
        });
        // After the outbox has it (queued now, or already there from an earlier run).
        if (this.markReminded) await this.markReminded(booking.id);
      } catch (err) {
        failures += 1;
        logger.error(
          { bookingId: booking.id, err: err instanceof Error ? err.message : String(err) },
          '[ConsultationReminderSweep] Could not queue or record a reminder'
        );
      }
    }

    // After a failure the sweep runs again on the next tick; bookings already queued are skipped by their key.
    if (failures === 0) this.lastRunDate = today;
    logger.info({ date: tomorrow, bookings: bookings.length, failures }, '[ConsultationReminderSweep] Reminders queued for tomorrow');
    return { ran: true, bookings: bookings.length };
  }
}

export const consultationReminderSweep = new ConsultationReminderSweep();
