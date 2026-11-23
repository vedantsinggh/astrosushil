import { prisma } from '../../services/prisma.service';
import { logger } from '../../utils/logger';
import {
  EventConsultationMode,
  EventCustomer,
  NotificationEvents,
  notificationEvents,
  toWebsiteDate,
} from './notification.events';
import type { NotificationType, SendNotificationOptions } from './notification.types';

/**
 * Connects the notifications this backend ALREADY raises through
 * NotificationService.sendNotification to the website's SMS / WhatsApp / e-mail
 * events, without touching the modules that raise them:
 *
 *   REPORT_READY         -> reportReady          (delayed e-mail + WhatsApp)
 *   BOOKING_CONFIRMED    -> bookingConfirmed
 *   BOOKING_RESCHEDULED  -> bookingRescheduled
 *   PAYMENT_SUCCESS      -> reportOrderConfirmed (order has report items)
 *                           orderConfirmed       (order has product items)
 *
 * Push and in-app behaviour is unchanged; this only ADDS the website's channels.
 * A module that calls a typed event itself must pass `websiteChannels: false` to
 * sendNotification so the event is not raised twice with different data.
 */

export const BRIDGED_TYPES: ReadonlySet<NotificationType> = new Set<NotificationType>([
  'REPORT_READY',
  'BOOKING_CONFIRMED',
  'BOOKING_RESCHEDULED',
  'PAYMENT_SUCCESS',
]);

export interface BridgeOutcome {
  /** True when a website event was raised (its e-mail then replaces the generic notification e-mail). */
  handled: boolean;
  /** True when that event queued (or had already queued) a customer e-mail. */
  emailQueued: boolean;
}

interface BridgeUser {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  fullName: string | null;
}

const NOT_HANDLED: BridgeOutcome = { handled: false, emailQueued: false };

const modeOf = (mode: string | null | undefined): EventConsultationMode | null => {
  const m = (mode || '').toLowerCase();
  return m === 'audio' || m === 'video' || m === 'in_person' ? m : null;
};

/** "CAREER_PROSITY" -> "Career Prosity"; a display name passed by the caller is kept as it is. */
const reportDisplayName = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  if (!/^[A-Z0-9_]+$/.test(raw)) return raw;
  return raw
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

const emailQueuedIn = (result: { queued: string[]; duplicates: string[] }): boolean =>
  [...result.queued, ...result.duplicates].some((k) => k.endsWith(':CUSTOMER:EMAIL'));

export class NotificationBridge {
  constructor(private readonly events: NotificationEvents = notificationEvents) {}

  public async raise(options: SendNotificationOptions): Promise<BridgeOutcome> {
    if (options.websiteChannels === false || !BRIDGED_TYPES.has(options.type) || !options.entityId) return NOT_HANDLED;

    try {
      const user = await prisma.user.findUnique({
        where: { id: options.userId },
        select: { id: true, email: true, phoneNumber: true, fullName: true },
      });
      if (!user) return NOT_HANDLED;

      switch (options.type) {
        case 'REPORT_READY':
          return await this.reportReady(options, user);
        case 'BOOKING_CONFIRMED':
          return await this.bookingConfirmed(options.entityId, user, options.templateData);
        case 'BOOKING_RESCHEDULED':
          return await this.bookingRescheduled(options.entityId, user, options.templateData);
        case 'PAYMENT_SUCCESS':
          return await this.orderPaid(options.entityId, user);
        default:
          return NOT_HANDLED;
      }
    } catch (err) {
      // The website channels must never break the caller's flow (payment, booking, report worker).
      logger.error(
        { type: options.type, entityId: options.entityId, err: err instanceof Error ? err.message : String(err) },
        '[NotificationBridge] Could not raise the website event'
      );
      return NOT_HANDLED;
    }
  }

  private customerOf(user: BridgeUser, fallback?: { name?: string | null; email?: string | null; phone?: string | null }): EventCustomer {
    return {
      userId: user.id,
      name: user.fullName || fallback?.name || null,
      email: user.email || fallback?.email || null,
      phone: user.phoneNumber || fallback?.phone || null,
    };
  }

  private async reportReady(options: SendNotificationOptions, user: BridgeUser): Promise<BridgeOutcome> {
    const result = await this.events.reportReady({
      reportId: options.entityId as string,
      customer: this.customerOf(user),
      reportName: reportDisplayName(options.templateData?.reportName),
      reportUrl: strOrNull(options.templateData?.reportUrl),
    });
    return { handled: true, emailQueued: emailQueuedIn(result) };
  }

  private async loadBooking(bookingId: string) {
    const booking = await prisma.consultationBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        title: true,
        mode: true,
        date: true,
        startTime: true,
        endTime: true,
        consultationId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        order: {
          select: {
            amount: true,
            currency: true,
            items: { select: { itemType: true, catalogId: true, totalAmount: true } },
          },
        },
      },
    });
    if (!booking) return null;

    // The booking's own line when the order has several; otherwise the order total.
    const line = booking.order?.items.find((i) => i.itemType === 'CONSULTATION' && i.catalogId === booking.consultationId);
    const amountMinor = line?.totalAmount ?? booking.order?.amount ?? null;
    return { booking, amountMinor, currency: booking.order?.currency || 'INR' };
  }

  private async bookingConfirmed(bookingId: string, user: BridgeUser, data?: Record<string, unknown>): Promise<BridgeOutcome> {
    const loaded = await this.loadBooking(bookingId);
    if (!loaded) return NOT_HANDLED;
    const { booking, amountMinor, currency } = loaded;
    const result = await this.events.bookingConfirmed({
      bookingId: booking.id,
      customer: this.customerOf(user, { name: booking.customerName, email: booking.customerEmail, phone: booking.customerPhone }),
      consultationTitle: booking.title,
      includes: Array.isArray(data?.includes) ? (data.includes as unknown[]).filter((x): x is string => typeof x === 'string') : [],
      mode: modeOf(booking.mode),
      date: toWebsiteDate(booking.date),
      slot: `${booking.startTime}-${booking.endTime}`,
      amountMinor,
      currency,
    });
    return { handled: true, emailQueued: emailQueuedIn(result) };
  }

  private async bookingRescheduled(bookingId: string, user: BridgeUser, data?: Record<string, unknown>): Promise<BridgeOutcome> {
    const loaded = await this.loadBooking(bookingId);
    if (!loaded) return NOT_HANDLED;
    const { booking, amountMinor, currency } = loaded;

    // The caller knows the previous schedule; the booking row already holds the new one.
    const oldDate = strOrNull(data?.oldDate);
    const oldStart = strOrNull(data?.oldStartTime);
    const oldEnd = strOrNull(data?.oldEndTime);
    const result = await this.events.bookingRescheduled({
      bookingId: booking.id,
      customer: this.customerOf(user, { name: booking.customerName, email: booking.customerEmail, phone: booking.customerPhone }),
      consultationTitle: booking.title,
      includes: Array.isArray(data?.includes) ? (data.includes as unknown[]).filter((x): x is string => typeof x === 'string') : [],
      mode: modeOf(booking.mode),
      oldDate: oldDate ? toWebsiteDate(oldDate) : null,
      oldSlot: oldStart ? (oldEnd ? `${oldStart}-${oldEnd}` : oldStart) : null,
      newDate: toWebsiteDate(booking.date),
      newSlot: `${booking.startTime}-${booking.endTime}`,
      amountMinor,
      currency,
    });
    return { handled: true, emailQueued: emailQueuedIn(result) };
  }

  private async orderPaid(orderId: string, user: BridgeUser): Promise<BridgeOutcome> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        amount: true,
        subtotal: true,
        shippingAmount: true,
        currency: true,
        shippingAddress: { select: { addressLine1: true, city: true, state: true, postalCode: true } },
        items: { select: { itemType: true, title: true, quantity: true, unitPrice: true, fulfillmentType: true } },
      },
    });
    if (!order) return NOT_HANDLED;

    const customer = this.customerOf(user);
    const reportItems = order.items.filter((i) => i.itemType === 'REPORT');
    const productItems = order.items.filter((i) => i.itemType === 'PRODUCT');
    let handled = false;
    let emailQueued = false;

    if (reportItems.length > 0) {
      const result = await this.events.reportOrderConfirmed({
        reportOrderId: order.id,
        customer,
        reportName: reportItems[0].title,
      });
      handled = true;
      emailQueued = emailQueued || emailQueuedIn(result);
    }

    if (productItems.length > 0) {
      const digital = productItems.every((i) => i.fulfillmentType === 'DIGITAL');
      const address = order.shippingAddress;
      const result = await this.events.orderConfirmed({
        orderId: order.id,
        // The website marks a paid digital order "delivered" at once and a physical one "confirmed".
        orderStatus: digital ? 'delivered' : 'confirmed',
        customer,
        items: productItems.map((i) => ({ name: i.title, quantity: i.quantity, unitPriceMinor: i.unitPrice })),
        subTotalMinor: order.subtotal ?? undefined,
        totalMinor: order.amount,
        shippingMinor: order.shippingAmount ?? 0,
        currency: order.currency,
        orderType: digital ? 'digital' : 'physical',
        address:
          !digital && address
            ? { addressLine1: address.addressLine1, city: address.city, state: address.state, pincode: address.postalCode }
            : null,
      });
      handled = true;
      emailQueued = emailQueued || emailQueuedIn(result);
    }

    // Consultation- or course-only orders have no website "order" message: the booking
    // confirmation is raised separately, and the generic payment e-mail still applies.
    return { handled, emailQueued };
  }
}

export const notificationBridge = new NotificationBridge();
