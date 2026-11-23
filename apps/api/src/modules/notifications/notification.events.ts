import { prisma } from '../../services/prisma.service';
import { logger } from '../../utils/logger';
import { messagingEnv } from '../../services/messaging/config';
import { NewOutboundMessage, OutboxService, outboxService } from '../../services/messaging/outbox.service';
import { isPlausibleEmail, toE164 } from '../../services/messaging/phone';
import { emailTemplates } from '../../services/messaging/templates/email.templates';
import type { EmailAddress, RenderedEmail } from '../../services/messaging/templates/email.types';
import { smsTemplates } from '../../services/messaging/templates/sms.templates';
import { whatsappTemplates, WhatsAppTemplatePayload } from '../../services/messaging/templates/whatsapp.templates';
import type { MessageChannel } from '../../services/messaging/types';

/**
 * Typed entry points for the website's customer events. Each function renders the
 * website's approved templates and puts one outbox row per channel and audience;
 * delivery, retries and idempotency are the outbox's job
 * (services/messaging/outbox.service.ts).
 *
 * Channels per event (identical to the website's notification worker):
 *
 *   order confirmed / status changed   customer e-mail, admin e-mail, WhatsApp, SMS
 *   digital order                      same, with the digital WhatsApp template + download link
 *   booking confirmed                  customer e-mail, admin e-mail, WhatsApp, SMS, admin WhatsApp
 *   booking upgraded / plan changed    customer e-mail, WhatsApp
 *   booking rescheduled                customer e-mail, admin e-mail, WhatsApp, SMS
 *   consultation reminder              customer e-mail, WhatsApp
 *   report order confirmed             customer e-mail, WhatsApp, SMS   ("within 48 hours")
 *   report ready                       customer e-mail, WhatsApp, after REPORT_SEND_DELAY_HOURS
 *
 * Calling a function twice for the same occurrence sends nothing the second time.
 * Money is passed in minor units (paise); the templates show major units.
 */

export interface EventCustomer {
  /** Our user id, when the customer has an account (used for notification preferences). */
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** The website's mode values; they are printed as-is in e-mail and SMS and capitalised in WhatsApp. */
export type EventConsultationMode = 'audio' | 'video' | 'in_person';

export interface EventSkip {
  channel: MessageChannel;
  audience: 'CUSTOMER' | 'ADMIN';
  reason: 'NO_RECIPIENT' | 'INVALID_RECIPIENT' | 'PREFERENCE_OFF';
}

export interface EventResult {
  event: string;
  queued: string[];
  duplicates: string[];
  skipped: EventSkip[];
}

export interface OrderEventLine {
  name: string;
  quantity: number;
  /** Unit price in minor units. */
  unitPriceMinor?: number;
}

export interface OrderConfirmedEvent {
  orderId: string;
  /**
   * The website's order status ("placed", "confirmed", "processing", "shipped",
   * "delivered", "cancelled", ...). The event is raised at payment AND at every
   * admin status change, so the status is part of the idempotency key.
   */
  orderStatus: string;
  customer: EventCustomer;
  items: OrderEventLine[];
  subTotalMinor?: number;
  totalMinor: number;
  shippingMinor?: number;
  currency?: string;
  orderType: 'physical' | 'digital';
  address?: EmailAddress | null;
}

export interface BookingEventBase {
  bookingId: string;
  customer: EventCustomer;
  consultationTitle?: string | null;
  includes?: string[];
  mode?: EventConsultationMode | null;
  amountMinor?: number | null;
  currency?: string;
}

export interface BookingConfirmedEvent extends BookingEventBase {
  /** As shown to the customer; the website uses DD-MM-YYYY. */
  date?: string | null;
  /** "HH:mm-HH:mm" */
  slot?: string | null;
}

export interface BookingUpgradedEvent extends BookingConfirmedEvent {
  /** Identifies this change (e.g. the new plan id or the audit entry id): a booking can be changed more than once. */
  changeId: string;
}

export interface BookingRescheduledEvent extends BookingEventBase {
  oldDate?: string | null;
  oldSlot?: string | null;
  newDate: string;
  newSlot: string;
}

export interface ConsultationReminderEvent {
  bookingId: string;
  customer: EventCustomer;
  consultationTitle?: string | null;
  mode?: EventConsultationMode | null;
  date: string;
  slot: string;
}

export interface ReportOrderConfirmedEvent {
  reportOrderId: string;
  customer: EventCustomer;
  reportName?: string | null;
}

export interface ReportReadyEvent {
  reportId: string;
  customer: EventCustomer;
  reportName?: string | null;
  /** Link placed in the e-mail button and the WhatsApp template. Default: the customer's reports dashboard (login required). */
  reportUrl?: string | null;
  /** When the report was completed; the message goes out REPORT_SEND_DELAY_HOURS later. Default: now. */
  completedAt?: Date;
}

export interface EventPreferences {
  emailEnabled: boolean;
  reportAlerts: boolean;
}

export interface NotificationEventsOptions {
  outbox?: OutboxService;
  /** Returns null when the user has no stored preferences (defaults apply: everything on). */
  loadPreferences?: (userId: string) => Promise<EventPreferences | null>;
  now?: () => Date;
}

/** "150000" paise -> "1500"; "149950" -> "1499.50". Display only. */
export const formatMinorAmount = (minor: number | null | undefined): string => {
  const value = Math.round(minor ?? 0);
  return value % 100 === 0 ? String(value / 100) : (value / 100).toFixed(2);
};

const toMajor = (minor: number | null | undefined): number | undefined =>
  minor === null || minor === undefined ? undefined : Math.round(minor) / 100;

/** "2026-11-25" -> "25-11-2026" (the website's booking date format). Other strings are returned unchanged. */
export const toWebsiteDate = (isoDate: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : isoDate;
};

const defaultLoadPreferences = async (userId: string): Promise<EventPreferences | null> => {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { emailEnabled: true, reportAlerts: true },
  });
  return pref;
};

class EventBuilder {
  public readonly messages: NewOutboundMessage[] = [];
  public readonly skipped: EventSkip[] = [];

  constructor(
    private readonly event: string,
    private readonly entityKey: string,
    private readonly entityId: string,
    private readonly userId: string | null | undefined,
    private readonly notBefore?: Date
  ) {}

  private base(channel: MessageChannel, audience: 'CUSTOMER' | 'ADMIN') {
    return {
      event: this.event,
      entityKey: this.entityKey,
      entityId: this.entityId,
      userId: audience === 'CUSTOMER' ? this.userId ?? undefined : undefined,
      audience,
      channel,
      notBefore: this.notBefore,
    };
  }

  public email(to: string | null | undefined, rendered: () => RenderedEmail, audience: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER'): void {
    if (!to) return void this.skipped.push({ channel: 'EMAIL', audience, reason: 'NO_RECIPIENT' });
    if (!isPlausibleEmail(to)) return void this.skipped.push({ channel: 'EMAIL', audience, reason: 'INVALID_RECIPIENT' });
    const { subject, html } = rendered();
    this.messages.push({ ...this.base('EMAIL', audience), recipient: to.trim(), payload: { kind: 'email', subject, html } });
  }

  public whatsapp(phone: string | null | undefined, payload: () => WhatsAppTemplatePayload, audience: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER'): void {
    if (!phone) return void this.skipped.push({ channel: 'WHATSAPP', audience, reason: 'NO_RECIPIENT' });
    const to = toE164(phone);
    if (!to) return void this.skipped.push({ channel: 'WHATSAPP', audience, reason: 'INVALID_RECIPIENT' });
    const p = payload();
    this.messages.push({
      ...this.base('WHATSAPP', audience),
      recipient: to,
      payload: { kind: 'whatsapp', template: p.template, variables: p.variables },
    });
  }

  public sms(phone: string | null | undefined, text: () => string): void {
    if (!phone) return void this.skipped.push({ channel: 'SMS', audience: 'CUSTOMER', reason: 'NO_RECIPIENT' });
    const to = toE164(phone);
    if (!to) return void this.skipped.push({ channel: 'SMS', audience: 'CUSTOMER', reason: 'INVALID_RECIPIENT' });
    this.messages.push({ ...this.base('SMS', 'CUSTOMER'), recipient: to, payload: { kind: 'sms', text: text() } });
  }

  public preferenceOff(channel: MessageChannel): void {
    this.skipped.push({ channel, audience: 'CUSTOMER', reason: 'PREFERENCE_OFF' });
  }
}

export class NotificationEvents {
  private readonly outbox: OutboxService;
  private readonly loadPreferences: (userId: string) => Promise<EventPreferences | null>;
  private readonly now: () => Date;

  constructor(options: NotificationEventsOptions = {}) {
    this.outbox = options.outbox ?? outboxService;
    this.loadPreferences = options.loadPreferences ?? defaultLoadPreferences;
    this.now = options.now ?? (() => new Date());
  }

  // ---- orders ---------------------------------------------------------------

  /** Order confirmed, or its status changed. Transactional: always sent. */
  public async orderConfirmed(e: OrderConfirmedEvent): Promise<EventResult> {
    const env = messagingEnv();
    const currency = e.currency || 'INR';
    const downloadLink = e.orderType === 'digital' ? `${env.frontendUrl}/dashboard?tab=downloads` : null;
    const products = e.items.map((i) => ({ name: i.name, quantity: i.quantity, price: toMajor(i.unitPriceMinor) }));
    const productNames = e.items.length ? e.items.map((i) => i.name).join(', ') : 'No Products';
    const userName = e.customer.name || 'Customer';

    const b = new EventBuilder('order-confirmed', `${e.orderId}:${e.orderStatus}`, e.orderId, e.customer.userId);
    b.email(e.customer.email, () =>
      emailTemplates.ORDER_CONFIRMED_USER({
        userName,
        orderStatus: e.orderStatus,
        orderId: e.orderId,
        products,
        subTotal: toMajor(e.subTotalMinor),
        totalAmount: toMajor(e.totalMinor) ?? 0,
        shipping: toMajor(e.shippingMinor) ?? 0,
        address: e.address ?? null,
        orderType: e.orderType,
        currency,
        downloadLink,
      })
    );
    if (env.adminEmail) {
      b.email(
        env.adminEmail,
        () =>
          emailTemplates.ORDER_UPDATED_ADMIN({
            userName,
            orderStatus: e.orderStatus,
            userEmail: e.customer.email,
            userPhone: e.customer.phone,
            orderId: e.orderId,
            products,
            totalAmount: toMajor(e.totalMinor) ?? 0,
            currency,
          }),
        'ADMIN'
      );
    }
    b.whatsapp(e.customer.phone, () =>
      whatsappTemplates.ORDER({ name: userName, orderId: e.orderId, productName: productNames, status: e.orderStatus, downloadLink })
    );
    b.sms(e.customer.phone, () =>
      smsTemplates.ORDER_UPDATE({ userName, orderId: e.orderId, productName: productNames, orderStatus: e.orderStatus })
    );
    return this.finish('order-confirmed', b);
  }

  /** A paid digital order: delivered at once, with the download link (digital WhatsApp template). */
  public digitalOrderConfirmed(e: Omit<OrderConfirmedEvent, 'orderType' | 'orderStatus'> & { orderStatus?: string }): Promise<EventResult> {
    return this.orderConfirmed({ ...e, orderType: 'digital', orderStatus: e.orderStatus ?? 'delivered' });
  }

  // ---- bookings -------------------------------------------------------------

  /** Booking confirmed (paid). Transactional: always sent. */
  public async bookingConfirmed(e: BookingConfirmedEvent): Promise<EventResult> {
    const env = messagingEnv();
    const ctx = this.bookingContext(e, e.date, e.slot);
    const b = new EventBuilder('booking-confirmed', e.bookingId, e.bookingId, e.customer.userId);

    b.email(e.customer.email, () => emailTemplates.BOOKING_CONFIRMED_USER(ctx.email));
    if (env.adminEmail) {
      b.email(
        env.adminEmail,
        () => emailTemplates.BOOKING_CONFIRMED_ADMIN({ ...ctx.email, userEmail: e.customer.email, userPhone: e.customer.phone }),
        'ADMIN'
      );
    }
    b.whatsapp(e.customer.phone, () => whatsappTemplates.BOOKING_CONFIRMED(ctx.whatsapp));
    b.sms(e.customer.phone, () => smsTemplates.BOOKING_CONFIRMED(ctx.sms));
    if (env.adminPhone) b.whatsapp(env.adminPhone, () => whatsappTemplates.BOOKING_CONFIRMED(ctx.whatsapp), 'ADMIN');
    return this.finish('booking-confirmed', b);
  }

  /** Booking upgraded / plan changed by an admin. Transactional: always sent. */
  public async bookingUpgraded(e: BookingUpgradedEvent): Promise<EventResult> {
    const ctx = this.bookingContext(e, e.date, e.slot);
    const b = new EventBuilder('booking-upgraded', `${e.bookingId}:${e.changeId}`, e.bookingId, e.customer.userId);
    b.email(e.customer.email, () => emailTemplates.BOOKING_UPGRADED_USER(ctx.email));
    b.whatsapp(e.customer.phone, () => whatsappTemplates.BOOKING_UPDATED(ctx.whatsapp));
    return this.finish('booking-upgraded', b);
  }

  /** Booking moved to another date/slot. Transactional: always sent. */
  public async bookingRescheduled(e: BookingRescheduledEvent): Promise<EventResult> {
    const env = messagingEnv();
    const ctx = this.bookingContext(e, e.newDate, e.newSlot);
    const reschedule = {
      userName: ctx.email.userName,
      bookingId: e.bookingId,
      consultationTitle: ctx.email.consultationTitle,
      mode: ctx.email.mode,
      oldDate: e.oldDate || '-',
      oldSlot: e.oldSlot || '-',
      newDate: e.newDate || '-',
      newSlot: e.newSlot || '-',
      amount: ctx.email.amount,
      currency: ctx.email.currency,
    };
    // The new date and slot are part of the key: a booking can be rescheduled again later.
    const b = new EventBuilder('booking-rescheduled', `${e.bookingId}:${e.newDate}:${e.newSlot}`, e.bookingId, e.customer.userId);
    b.email(e.customer.email, () => emailTemplates.BOOKING_RESCHEDULE_USER(reschedule));
    if (env.adminEmail) {
      b.email(
        env.adminEmail,
        () => emailTemplates.BOOKING_RESCHEDULE_ADMIN({ ...reschedule, userEmail: e.customer.email, userPhone: e.customer.phone }),
        'ADMIN'
      );
    }
    b.whatsapp(e.customer.phone, () => whatsappTemplates.CONSULTATION_RESCHEDULE(ctx.whatsapp));
    b.sms(e.customer.phone, () => smsTemplates.BOOKING_RESCHEDULED(ctx.sms));
    return this.finish('booking-rescheduled', b);
  }

  /**
   * Reminder the day before a consultation (raised by the daily sweep).
   * Not a payment/booking confirmation, so the e-mail respects `emailEnabled`.
   */
  public async consultationReminder(e: ConsultationReminderEvent): Promise<EventResult> {
    const prefs = await this.preferencesOf(e.customer);
    const userName = e.customer.name || 'User';
    const consultationTitle = e.consultationTitle || 'Consultation';
    const mode = e.mode || '-';
    const b = new EventBuilder('consultation-reminder', `${e.bookingId}:${e.date}`, e.bookingId, e.customer.userId);

    if (prefs.emailEnabled) {
      b.email(e.customer.email, () =>
        emailTemplates.BOOKING_REMINDER_USER({
          userName,
          bookingId: e.bookingId,
          consultationTitle,
          mode,
          date: e.date || '-',
          slot: e.slot || '-',
        })
      );
    } else b.preferenceOff('EMAIL');
    b.whatsapp(e.customer.phone, () =>
      whatsappTemplates.CONSULTATION_REMINDER({ userName, consultationTitle, date: e.date || '-', slot: e.slot || '-', mode })
    );
    return this.finish('consultation-reminder', b);
  }

  // ---- reports --------------------------------------------------------------

  /** Report purchase received ("within the next 48 hours"). Transactional: always sent. */
  public async reportOrderConfirmed(e: ReportOrderConfirmedEvent): Promise<EventResult> {
    const userName = e.customer.name || 'User';
    const b = new EventBuilder('report-order-confirmed', e.reportOrderId, e.reportOrderId, e.customer.userId);
    b.email(e.customer.email, () =>
      emailTemplates.REPORT_ORDER_CONFIRMED_USER({ userName, reportName: e.reportName || 'Kundali Report' })
    );
    b.whatsapp(e.customer.phone, () => whatsappTemplates.REPORT_ORDER_CONFIRMED({ userName }));
    b.sms(e.customer.phone, () => smsTemplates.REPORT_PURCHASE({ userName }));
    return this.finish('report-order-confirmed', b);
  }

  /**
   * Report ready. Owner decision: keep the website's delayed delivery, so the
   * messages are queued with notBefore = completion + REPORT_SEND_DELAY_HOURS
   * (default 24) and go out with the outbox sweep that first runs after that time.
   * Respects `reportAlerts` (both channels) and `emailEnabled` (e-mail).
   */
  public async reportReady(e: ReportReadyEvent): Promise<EventResult> {
    const env = messagingEnv();
    const prefs = await this.preferencesOf(e.customer);
    const name = e.customer.name || 'User';
    const reportName = e.reportName || 'Report';
    const reportUrl = e.reportUrl || `${env.frontendUrl}/dashboard?tab=reports`;
    const completedAt = e.completedAt ?? this.now();
    const notBefore = new Date(completedAt.getTime() + env.reportSendDelayHours * 60 * 60 * 1000);

    const b = new EventBuilder('report-ready', e.reportId, e.reportId, e.customer.userId, notBefore);
    if (!prefs.reportAlerts) {
      b.preferenceOff('EMAIL');
      b.preferenceOff('WHATSAPP');
      return this.finish('report-ready', b);
    }
    if (prefs.emailEnabled) b.email(e.customer.email, () => emailTemplates.REPORT_READY_USER({ name, reportName, reportUrl }));
    else b.preferenceOff('EMAIL');
    b.whatsapp(e.customer.phone, () => whatsappTemplates.REPORT_READY({ reportName, reportUrl }));
    return this.finish('report-ready', b);
  }

  // ---- internals ------------------------------------------------------------

  private bookingContext(e: BookingEventBase, date: string | null | undefined, slot: string | null | undefined) {
    const userName = e.customer.name || 'User';
    const consultationTitle = e.consultationTitle || 'Consultation';
    const mode = e.mode || '-';
    const includes = e.includes ?? [];
    const amountText = formatMinorAmount(e.amountMinor);
    return {
      email: {
        userName,
        bookingId: e.bookingId,
        consultationTitle,
        includes,
        mode,
        date: date || '-',
        slot: slot || '-',
        amount: toMajor(e.amountMinor) ?? 0,
        currency: e.currency || 'INR',
      },
      whatsapp: { userName, consultationTitle, date: date || '-', mode, slot: slot || '-', amount: amountText, includes },
      sms: { userName, consultationTitle, date: date || '-', mode, slot: slot || '-', amount: amountText },
    };
  }

  private async preferencesOf(customer: EventCustomer): Promise<EventPreferences> {
    const defaults: EventPreferences = { emailEnabled: true, reportAlerts: true };
    if (!customer.userId) return defaults;
    try {
      return (await this.loadPreferences(customer.userId)) ?? defaults;
    } catch (err) {
      logger.warn({ userId: customer.userId, err: err instanceof Error ? err.message : String(err) }, '[NotificationEvents] Could not load preferences; using defaults');
      return defaults;
    }
  }

  private async finish(event: string, b: EventBuilder): Promise<EventResult> {
    const { queued, duplicates } = await this.outbox.enqueue(b.messages);
    if (queued.length) this.outbox.kick();
    logger.info(
      { event, queued: queued.length, duplicates: duplicates.length, skipped: b.skipped.map((s) => `${s.audience}:${s.channel}:${s.reason}`) },
      '[NotificationEvents] Event messages queued'
    );
    return { event, queued, duplicates, skipped: b.skipped };
  }
}

export const notificationEvents = new NotificationEvents();
