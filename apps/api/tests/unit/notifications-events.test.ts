/**
 * Website event notifications: typed events, the bridge from the notifications this
 * backend already raises, the consultation reminder sweep and the e-mail branch of
 * NotificationService. Prisma and the providers are substituted.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const db = vi.hoisted(() => {
  const outbound: Array<Record<string, unknown>> = [];
  return {
    outbound,
    prisma: {
      user: { findUnique: vi.fn() },
      notification: { findFirst: vi.fn(), create: vi.fn() },
      notificationPreference: { findUnique: vi.fn(), create: vi.fn() },
      deviceToken: { findMany: vi.fn(), update: vi.fn() },
      consultationBooking: { findUnique: vi.fn(), findMany: vi.fn() },
      order: { findUnique: vi.fn() },
      outboundMessage: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          if (outbound.some((r) => r.dedupeKey === data.dedupeKey)) {
            const { Prisma } = await import('@prisma/client');
            throw new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: 'test' });
          }
          outbound.push({ ...data, status: 'PENDING' });
          return data;
        }),
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => ({ count: 0 })),
        update: vi.fn(),
      },
    },
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: db.prisma }));

import { NotificationBridge } from '../../src/modules/notifications/notification.bridge';
import { ConsultationReminderSweep, istDateAndHour, addDaysIso, ReminderBooking } from '../../src/modules/notifications/consultation-reminder.sweep';
import { NotificationEvents, formatMinorAmount, toWebsiteDate } from '../../src/modules/notifications/notification.events';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import { OutboundRow, OutboxService, OutboxStore, StoredOutboundMessage } from '../../src/services/messaging/outbox.service';
import { setMessagingProviders } from '../../src/services/messaging/provider-registry';
import { FakeEmailProvider, FakeSmsProvider, FakeWhatsAppProvider } from '../../src/services/messaging/providers/fake.providers';

type Row = StoredOutboundMessage & { id: string; status: string; attempts: number };

class MemoryStore implements OutboxStore {
  public rows: Row[] = [];
  async insert(row: StoredOutboundMessage) {
    if (this.rows.some((r) => r.dedupeKey === row.dedupeKey)) return false;
    this.rows.push({ ...row, id: `m${this.rows.length + 1}`, status: 'PENDING', attempts: 0 });
    return true;
  }
  async findDue(now: Date, limit: number): Promise<OutboundRow[]> {
    return this.rows.filter((r) => r.status === 'PENDING' && r.notBefore <= now).slice(0, limit);
  }
  async claim(id: string) {
    const r = this.rows.find((x) => x.id === id);
    if (!r || r.status !== 'PENDING') return false;
    r.status = 'SENDING';
    r.attempts += 1;
    return true;
  }
  async markSent(id: string) { this.rows.find((x) => x.id === id)!.status = 'SENT'; }
  async markRetry(id: string) { this.rows.find((x) => x.id === id)!.status = 'PENDING'; }
  async markFailed(id: string) { this.rows.find((x) => x.id === id)!.status = 'FAILED'; }
  async failStale() { return 0; }
}

const ENV = ['ADMIN_EMAIL', 'ADMIN_PHONE', 'SUPPORT_PHONE', 'FRONTEND_URL', 'ADMIN_URL', 'REPORT_SEND_DELAY_HOURS', 'CONSULTATION_REMINDER_IST_HOUR', 'MESSAGING_INLINE_DISPATCH', 'NODE_ENV'];
let savedEnv: Record<string, string | undefined>;

let store: MemoryStore;
let sms: FakeSmsProvider;
let whatsapp: FakeWhatsAppProvider;
let email: FakeEmailProvider;
let clock: Date;
let outbox: OutboxService;
let prefs: { emailEnabled: boolean; reportAlerts: boolean } | null;
let events: NotificationEvents;

const customer = { userId: 'u1', name: 'Ravi', email: 'ravi@example.com', phone: '9876543210' };
const keys = () => store.rows.map((r) => r.dedupeKey).sort();
const row = (suffix: string) => store.rows.find((r) => r.dedupeKey.endsWith(suffix))!;
const emailOf = (suffix: string) => row(suffix).payload as { kind: 'email'; subject: string; html: string };
const smsOf = (suffix: string) => row(suffix).payload as { kind: 'sms'; text: string };
const waOf = (suffix: string) => row(suffix).payload as { kind: 'whatsapp'; template: string; variables: Record<string, string> };

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PHONE = '+919125000013';
  process.env.FRONTEND_URL = 'https://site.example';
  process.env.ADMIN_URL = 'https://admin.example';
  process.env.MESSAGING_INLINE_DISPATCH = 'false';
  delete process.env.REPORT_SEND_DELAY_HOURS;
  delete process.env.CONSULTATION_REMINDER_IST_HOUR;

  store = new MemoryStore();
  sms = new FakeSmsProvider();
  whatsapp = new FakeWhatsAppProvider();
  email = new FakeEmailProvider();
  setMessagingProviders({ sms, whatsapp, email });
  clock = new Date('2026-11-24T10:00:00Z');
  outbox = new OutboxService({ store, providers: () => ({ sms, whatsapp, email }), now: () => clock });
  prefs = null;
  events = new NotificationEvents({ outbox, loadPreferences: async () => prefs, now: () => clock });

  db.outbound.length = 0;
  vi.clearAllMocks();
});

afterEach(() => {
  setMessagingProviders(null);
  for (const k of ENV) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('helpers', () => {
  it('formats paise for display and dates the website way', () => {
    expect(formatMinorAmount(150000)).toBe('1500');
    expect(formatMinorAmount(149950)).toBe('1499.50');
    expect(formatMinorAmount(null)).toBe('0');
    expect(toWebsiteDate('2026-11-25')).toBe('25-11-2026');
    expect(toWebsiteDate('25-11-2026')).toBe('25-11-2026');
  });
});

describe('booking confirmed', () => {
  const event = {
    bookingId: 'b1', customer, consultationTitle: 'Career Guidance', includes: ['Kundli'], mode: 'video' as const,
    date: '25-11-2026', slot: '10:00-10:30', amountMinor: 150000,
  };

  it('queues customer e-mail, admin e-mail, WhatsApp, SMS and admin WhatsApp', async () => {
    const result = await events.bookingConfirmed(event);
    expect(keys()).toEqual([
      'booking-confirmed:b1:ADMIN:EMAIL',
      'booking-confirmed:b1:ADMIN:WHATSAPP',
      'booking-confirmed:b1:CUSTOMER:EMAIL',
      'booking-confirmed:b1:CUSTOMER:SMS',
      'booking-confirmed:b1:CUSTOMER:WHATSAPP',
    ]);
    expect(result.queued).toHaveLength(5);
    expect(row('CUSTOMER:SMS').recipient).toBe('+919876543210');
    expect(smsOf('CUSTOMER:SMS').text).toBe(
      'Hello Ravi, Your consultation has been booked. We look forward to connecting with you. Service Name: Career Guidance Date: 25-11-2026 Service Mode: video Time: 10:00-10:30 Amount: 1500 Thank you for choosing ASTRO SUSHIL PRIVATE LIMITED'
    );
    expect(waOf('CUSTOMER:WHATSAPP')).toMatchObject({ template: 'BOOKING_CONFIRMED' });
    expect(waOf('CUSTOMER:WHATSAPP').variables['templateVariable-ordervalue-6']).toBe('1500');
    expect(waOf('CUSTOMER:WHATSAPP').variables['templateVariable-ServiceMode-4']).toBe('Video');
    expect(row('ADMIN:WHATSAPP').recipient).toBe('+919125000013');
    expect(row('ADMIN:EMAIL').recipient).toBe('admin@example.com');
    expect(emailOf('CUSTOMER:EMAIL').subject).toBe('Booking Confirmed #b1 — Astro Sushil');
    expect(emailOf('CUSTOMER:EMAIL').html).toContain('₹1,500');
    expect(emailOf('ADMIN:EMAIL').subject).toBe('📅 New Booking #b1 — Career Guidance');
  });

  it('is idempotent: raising it again (retry, duplicate webhook) queues and sends nothing more', async () => {
    await events.bookingConfirmed(event);
    await outbox.processDue();
    const again = await events.bookingConfirmed(event);
    expect(again.queued).toEqual([]);
    expect(again.duplicates).toHaveLength(5);
    await outbox.processDue();
    expect(sms.sent).toHaveLength(1);
    expect(whatsapp.sent).toHaveLength(2);
    expect(email.sent).toHaveLength(2);
  });

  it('skips channels without a usable recipient and admin copies that are not configured', async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PHONE;
    const result = await events.bookingConfirmed({ ...event, customer: { name: 'Ravi', email: null, phone: 'not-a-phone' } });
    expect(keys()).toEqual([]);
    expect(result.skipped).toEqual([
      { channel: 'EMAIL', audience: 'CUSTOMER', reason: 'NO_RECIPIENT' },
      { channel: 'WHATSAPP', audience: 'CUSTOMER', reason: 'INVALID_RECIPIENT' },
      { channel: 'SMS', audience: 'CUSTOMER', reason: 'INVALID_RECIPIENT' },
    ]);
  });

  it('is transactional: sent even when the user switched e-mail and report alerts off', async () => {
    prefs = { emailEnabled: false, reportAlerts: false };
    await events.bookingConfirmed(event);
    expect(keys()).toHaveLength(5);
  });
});

describe('booking upgraded / rescheduled / reminder', () => {
  it('upgraded: customer e-mail and WhatsApp only; each change is its own event', async () => {
    const base = { bookingId: 'b1', customer, consultationTitle: 'Premium', mode: 'audio' as const, date: '25-11-2026', slot: '10:00-11:00', amountMinor: 300000 };
    await events.bookingUpgraded({ ...base, changeId: 'c1' });
    expect(keys()).toEqual(['booking-upgraded:b1:c1:CUSTOMER:EMAIL', 'booking-upgraded:b1:c1:CUSTOMER:WHATSAPP']);
    expect(emailOf(':c1:CUSTOMER:EMAIL').subject).toBe('Booking Updated #b1 — Astro Sushil');
    expect(waOf(':c1:CUSTOMER:WHATSAPP').template).toBe('BOOKING_UPDATED');
    await events.bookingUpgraded({ ...base, changeId: 'c1' });
    await events.bookingUpgraded({ ...base, changeId: 'c2' });
    expect(store.rows).toHaveLength(4);
  });

  it('rescheduled: customer e-mail, admin e-mail, WhatsApp, SMS; a later reschedule is sent again', async () => {
    const base = { bookingId: 'b1', customer, consultationTitle: 'Career', mode: 'video' as const, amountMinor: 150000, oldDate: '25-11-2026', oldSlot: '10:00-10:30' };
    await events.bookingRescheduled({ ...base, newDate: '26-11-2026', newSlot: '12:00-12:30' });
    expect(keys()).toEqual([
      'booking-rescheduled:b1:26-11-2026:12:00-12:30:ADMIN:EMAIL',
      'booking-rescheduled:b1:26-11-2026:12:00-12:30:CUSTOMER:EMAIL',
      'booking-rescheduled:b1:26-11-2026:12:00-12:30:CUSTOMER:SMS',
      'booking-rescheduled:b1:26-11-2026:12:00-12:30:CUSTOMER:WHATSAPP',
    ]);
    expect(smsOf('CUSTOMER:SMS').text).toBe(
      'Hello  Ravi, Your Consultation has been rescheduled. We look forward to connecting with you. Service Name:  Career Date:  26-11-2026 Service Mode:  video Time:  12:00-12:30 Amount: ₹ 1500 Thank you for choosing ASTRO SUSHIL PRIVATE LIMITED'
    );
    expect(waOf('CUSTOMER:WHATSAPP').template).toBe('CONSULTATION_RESCHEDULE');
    const html = emailOf('CUSTOMER:EMAIL').html;
    expect(html).toContain('25-11-2026 • 10:00-10:30');
    expect(html).toContain('26-11-2026 • 12:00-12:30');

    await events.bookingRescheduled({ ...base, newDate: '26-11-2026', newSlot: '12:00-12:30' });
    expect(store.rows).toHaveLength(4);
    await events.bookingRescheduled({ ...base, oldDate: '26-11-2026', oldSlot: '12:00-12:30', newDate: '27-11-2026', newSlot: '09:00-09:30' });
    expect(store.rows).toHaveLength(8);
  });

  it('reminder: e-mail and WhatsApp; the e-mail respects the e-mail preference', async () => {
    const event = { bookingId: 'b1', customer, consultationTitle: 'Career', mode: 'video' as const, date: '25-11-2026', slot: '10:00-10:30' };
    await events.consultationReminder(event);
    expect(keys()).toEqual(['consultation-reminder:b1:25-11-2026:CUSTOMER:EMAIL', 'consultation-reminder:b1:25-11-2026:CUSTOMER:WHATSAPP']);
    expect(emailOf('CUSTOMER:EMAIL').subject).toBe('Reminder: Consultation Tomorrow — #b1');
    expect(waOf('CUSTOMER:WHATSAPP').variables['templateVariable-Date-3']).toBe('25-11-2026 at 10:00-10:30');

    prefs = { emailEnabled: false, reportAlerts: true };
    const result = await events.consultationReminder({ ...event, bookingId: 'b2' });
    expect(store.rows.filter((r) => r.dedupeKey.includes(':b2:')).map((r) => r.channel)).toEqual(['WHATSAPP']);
    expect(result.skipped).toContainEqual({ channel: 'EMAIL', audience: 'CUSTOMER', reason: 'PREFERENCE_OFF' });
  });
});

describe('orders', () => {
  const order = {
    orderId: 'o1', customer, items: [{ name: 'Rudraksha Mala', quantity: 2, unitPriceMinor: 75000 }, { name: 'Yantra', quantity: 1, unitPriceMinor: 50000 }],
    subTotalMinor: 200000, totalMinor: 205000, shippingMinor: 5000,
  };

  it('physical order: customer e-mail, admin e-mail, WhatsApp order template, SMS', async () => {
    await events.orderConfirmed({ ...order, orderStatus: 'confirmed', orderType: 'physical', address: { addressLine1: '1 Road', city: 'Pune', state: 'MH', pincode: '411001' } });
    expect(keys()).toEqual([
      'order-confirmed:o1:confirmed:ADMIN:EMAIL',
      'order-confirmed:o1:confirmed:CUSTOMER:EMAIL',
      'order-confirmed:o1:confirmed:CUSTOMER:SMS',
      'order-confirmed:o1:confirmed:CUSTOMER:WHATSAPP',
    ]);
    expect(smsOf('CUSTOMER:SMS').text).toBe(
      'Hello Ravi, Your order update is here Order ID-o1 Product Name-Rudraksha Mala, YantraOrder Status-confirmed Thank for ordering. ASTRO SUSHIL PRIVATE LIMITED'
    );
    const wa = waOf('CUSTOMER:WHATSAPP');
    expect(wa.template).toBe('ORDER');
    expect(wa.variables['templateVariable-Invoicelink-5']).toBe('https://site.example/dashboard?tab=orders');
    const mail = emailOf('CUSTOMER:EMAIL');
    expect(mail.subject).toBe('Order confirmed #o1 — Astro Sushil');
    expect(mail.html).toContain('₹2,050');
    expect(mail.html).toContain('1 Road, Pune, MH – 411001');
    expect(emailOf('ADMIN:EMAIL').html).toContain('https://admin.example/orders');
  });

  it('each status change is a new event; the same status is not repeated', async () => {
    await events.orderConfirmed({ ...order, orderStatus: 'confirmed', orderType: 'physical' });
    await events.orderConfirmed({ ...order, orderStatus: 'confirmed', orderType: 'physical' });
    await events.orderConfirmed({ ...order, orderStatus: 'shipped', orderType: 'physical' });
    expect(store.rows).toHaveLength(8);
  });

  it('digital order: digital WhatsApp template with the downloads link, delivered status', async () => {
    await events.digitalOrderConfirmed({ ...order, items: [{ name: 'Wallpaper Pack', quantity: 1, unitPriceMinor: 9900 }], totalMinor: 9900 });
    const wa = waOf('CUSTOMER:WHATSAPP');
    expect(wa.template).toBe('DIGITAL_ORDER');
    expect(wa.variables['templateVariable-Downloadlink-6']).toBe('https://site.example/dashboard?tab=downloads');
    expect(wa.variables['templateVariable-OrderStatus-4']).toBe('delivered');
    expect(emailOf('CUSTOMER:EMAIL').html).toContain('Your Digital Products Are Ready');
    expect(row('CUSTOMER:SMS').dedupeKey).toBe('order-confirmed:o1:delivered:CUSTOMER:SMS');
  });
});

describe('reports', () => {
  it('report order confirmed: e-mail, WhatsApp, SMS with the "48 hours" wording', async () => {
    await events.reportOrderConfirmed({ reportOrderId: 'ro1', customer, reportName: 'Kundali Report' });
    expect(keys()).toEqual(['report-order-confirmed:ro1:CUSTOMER:EMAIL', 'report-order-confirmed:ro1:CUSTOMER:SMS', 'report-order-confirmed:ro1:CUSTOMER:WHATSAPP']);
    expect(smsOf('CUSTOMER:SMS').text).toContain('Hello RaviThank you for purchasing your Kundali Report with us 🙏');
    expect(smsOf('CUSTOMER:SMS').text).toContain('within the next 48 hours');
    expect(emailOf('CUSTOMER:EMAIL').subject).toBe('Your Kundali Report is Being Prepared — Astro Sushil');
    expect(waOf('CUSTOMER:WHATSAPP')).toEqual({ kind: 'whatsapp', template: 'REPORT_ORDER_CONFIRMED', variables: { 'templateVariable-User-Name-1': 'Ravi' } });
  });

  it('report ready: e-mail and WhatsApp, held for 24 hours after completion', async () => {
    const completedAt = new Date('2026-11-24T09:00:00Z');
    await events.reportReady({ reportId: 'r1', customer, reportName: 'Kundali Report', completedAt });
    expect(keys()).toEqual(['report-ready:r1:CUSTOMER:EMAIL', 'report-ready:r1:CUSTOMER:WHATSAPP']);
    expect(row('CUSTOMER:EMAIL').notBefore.toISOString()).toBe('2026-11-25T09:00:00.000Z');
    expect(waOf('CUSTOMER:WHATSAPP').variables).toEqual({
      'templateVariable-ReportName-1': 'Kundali Report',
      'templateVariable-Reportlink-2': 'https://site.example/dashboard?tab=reports',
      'templateVariable-Invoicelink-3': 'https://site.example/dashboard?tab=reports',
    });

    // The sweep sends nothing before the delay has passed...
    await outbox.processDue();
    clock = new Date('2026-11-25T08:59:59Z');
    await outbox.processDue();
    expect(email.sent).toHaveLength(0);
    expect(whatsapp.sent).toHaveLength(0);
    // ...and exactly once after it.
    clock = new Date('2026-11-25T09:00:00Z');
    await outbox.processDue();
    await outbox.processDue();
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].subject).toBe('Kundali Report — Your Report is Ready 🎯');
    expect(whatsapp.sent).toHaveLength(1);
  });

  it('report ready: the delay is configurable and the preferences are respected', async () => {
    process.env.REPORT_SEND_DELAY_HOURS = '2';
    await events.reportReady({ reportId: 'r2', customer });
    expect(row('r2:CUSTOMER:EMAIL').notBefore.toISOString()).toBe('2026-11-24T12:00:00.000Z');

    prefs = { emailEnabled: false, reportAlerts: true };
    await events.reportReady({ reportId: 'r3', customer });
    expect(store.rows.filter((r) => r.dedupeKey.includes(':r3:')).map((r) => r.channel)).toEqual(['WHATSAPP']);

    prefs = { emailEnabled: true, reportAlerts: false };
    const off = await events.reportReady({ reportId: 'r4', customer });
    expect(store.rows.some((r) => r.dedupeKey.includes(':r4:'))).toBe(false);
    expect(off.skipped).toHaveLength(2);
  });
});

describe('bridge from the notifications this backend already raises', () => {
  const user = { id: 'u1', email: 'ravi@example.com', phoneNumber: '+919876543210', fullName: 'Ravi Kumar' };
  let bridge: NotificationBridge;
  beforeEach(() => {
    bridge = new NotificationBridge(events);
    db.prisma.user.findUnique.mockResolvedValue(user);
  });

  it('BOOKING_CONFIRMED loads the booking and raises the website event', async () => {
    db.prisma.consultationBooking.findUnique.mockResolvedValue({
      id: 'b1', title: 'Career Guidance', mode: 'IN_PERSON', date: '2026-11-25', startTime: '14:00', endTime: '14:30', consultationId: 'consult-career',
      customerName: 'R', customerEmail: 'other@example.com', customerPhone: '9999999999',
      order: { amount: 250000, currency: 'INR', items: [{ itemType: 'REPORT', catalogId: 'x', totalAmount: 100000 }, { itemType: 'CONSULTATION', catalogId: 'consult-career', totalAmount: 150000 }] },
    });
    const outcome = await bridge.raise({ userId: 'u1', type: 'BOOKING_CONFIRMED', entityId: 'b1' });
    expect(outcome).toEqual({ handled: true, emailQueued: true });
    const wa = waOf('CUSTOMER:WHATSAPP');
    expect(wa.variables['templateVariable-Username-1']).toBe('Ravi Kumar');
    expect(wa.variables['templateVariable-Date-3']).toBe('25-11-2026');
    expect(wa.variables['templateVariable-ServiceMode-4']).toBe('In Person');
    expect(wa.variables['templateVariable-slot-5']).toBe('14:00');
    expect(wa.variables['templateVariable-ordervalue-6']).toBe('1500');
    // The account's own contact details win over the ones typed into the booking.
    expect(row('CUSTOMER:SMS').recipient).toBe('+919876543210');
    expect(row('CUSTOMER:EMAIL').recipient).toBe('ravi@example.com');
  });

  it('BOOKING_RESCHEDULED uses the previous schedule when the caller passes it', async () => {
    db.prisma.consultationBooking.findUnique.mockResolvedValue({
      id: 'b1', title: 'Career', mode: 'VIDEO', date: '2026-11-26', startTime: '12:00', endTime: '12:30', consultationId: 'c',
      customerName: 'R', customerEmail: null, customerPhone: null, order: null,
    });
    await bridge.raise({ userId: 'u1', type: 'BOOKING_RESCHEDULED', entityId: 'b1', templateData: { oldDate: '2026-11-25', oldStartTime: '10:00', oldEndTime: '10:30' } });
    expect(emailOf('CUSTOMER:EMAIL').html).toContain('25-11-2026 • 10:00-10:30');
    expect(row('CUSTOMER:SMS').dedupeKey).toBe('booking-rescheduled:b1:26-11-2026:12:00-12:30:CUSTOMER:SMS');
  });

  it('REPORT_READY queues the delayed website messages', async () => {
    const outcome = await bridge.raise({ userId: 'u1', type: 'REPORT_READY', entityId: 'r1', templateData: { reportName: 'KUNDLI_BASIC' } });
    expect(outcome.handled).toBe(true);
    expect(row('report-ready:r1:CUSTOMER:EMAIL').notBefore.toISOString()).toBe('2026-11-25T10:00:00.000Z');
    expect(waOf('report-ready:r1:CUSTOMER:WHATSAPP').variables['templateVariable-ReportName-1']).toBe('Kundli Basic');
  });

  it('PAYMENT_SUCCESS: report items -> report order confirmed; product items -> order confirmed', async () => {
    db.prisma.order.findUnique.mockResolvedValue({
      id: 'o1', amount: 249900, subtotal: 249900, shippingAmount: 0, currency: 'INR', shippingAddress: null,
      items: [{ itemType: 'REPORT', title: 'Kundali Report', quantity: 1, unitPrice: 199900, fulfillmentType: 'DIGITAL' }, { itemType: 'PRODUCT', title: 'Wallpaper', quantity: 1, unitPrice: 50000, fulfillmentType: 'DIGITAL' }],
    });
    expect(await bridge.raise({ userId: 'u1', type: 'PAYMENT_SUCCESS', entityId: 'o1' })).toEqual({ handled: true, emailQueued: true });
    expect(store.rows.filter((r) => r.event === 'report-order-confirmed')).toHaveLength(3);
    expect(waOf('order-confirmed:o1:delivered:CUSTOMER:WHATSAPP').template).toBe('DIGITAL_ORDER');
    expect(waOf('order-confirmed:o1:delivered:CUSTOMER:WHATSAPP').variables['templateVariable-ProductorServiceName-3']).toBe('Wallpaper');
  });

  it('PAYMENT_SUCCESS for a consultation-only order raises no website order message', async () => {
    db.prisma.order.findUnique.mockResolvedValue({
      id: 'o2', amount: 150000, subtotal: 150000, shippingAmount: 0, currency: 'INR', shippingAddress: null,
      items: [{ itemType: 'CONSULTATION', title: 'Career', quantity: 1, unitPrice: 150000, fulfillmentType: 'SERVICE' }],
    });
    expect(await bridge.raise({ userId: 'u1', type: 'PAYMENT_SUCCESS', entityId: 'o2' })).toEqual({ handled: false, emailQueued: false });
    expect(store.rows).toHaveLength(0);
  });

  it('does nothing for other types, when opted out, and never throws', async () => {
    expect((await bridge.raise({ userId: 'u1', type: 'REPORT_FAILED', entityId: 'r1' })).handled).toBe(false);
    expect((await bridge.raise({ userId: 'u1', type: 'REPORT_READY', entityId: 'r1', websiteChannels: false })).handled).toBe(false);
    db.prisma.user.findUnique.mockRejectedValue(new Error('db down'));
    expect((await bridge.raise({ userId: 'u1', type: 'REPORT_READY', entityId: 'r1' })).handled).toBe(false);
    expect(store.rows).toHaveLength(0);
  });
});

describe('consultation reminder sweep (daily)', () => {
  const booking = (id: string): ReminderBooking => ({
    id, userId: 'u1', title: 'Career', mode: 'VIDEO', date: '2026-11-25', startTime: '10:00', endTime: '10:30',
    customerName: 'Ravi', customerEmail: 'booking@example.com', customerPhone: '9876543210',
    user: { fullName: 'Ravi Kumar', email: 'ravi@example.com', phoneNumber: '+919876543210' },
  });

  it('computes IST dates', () => {
    expect(istDateAndHour(new Date('2026-11-24T02:29:00Z'))).toEqual({ date: '2026-11-24', hour: 7 });
    expect(istDateAndHour(new Date('2026-11-24T19:00:00Z'))).toEqual({ date: '2026-11-25', hour: 0 });
    expect(addDaysIso('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('waits for 08:00 IST, then reminds tomorrow\'s bookings once per day', async () => {
    const asked: string[] = [];
    let now = new Date('2026-11-24T02:00:00Z'); // 07:30 IST
    const sweep = new ConsultationReminderSweep({ events, now: () => now, findBookings: async (date) => { asked.push(date); return [booking('b1'), booking('b2')]; } });

    expect(await sweep.tick()).toEqual({ ran: false, bookings: 0 });
    now = new Date('2026-11-24T02:45:00Z'); // 08:15 IST
    expect(await sweep.tick()).toEqual({ ran: true, bookings: 2 });
    expect(asked).toEqual(['2026-11-25']);
    expect(store.rows).toHaveLength(4);
    expect(row('consultation-reminder:b1:25-11-2026:CUSTOMER:EMAIL').recipient).toBe('ravi@example.com');

    now = new Date('2026-11-24T09:00:00Z');
    expect((await sweep.tick()).ran).toBe(false);

    // A restarted worker runs the sweep again the same day: nothing new is queued.
    const restarted = new ConsultationReminderSweep({ events, now: () => now, findBookings: async () => [booking('b1'), booking('b2')] });
    expect((await restarted.tick()).ran).toBe(true);
    expect(store.rows).toHaveLength(4);
  });

  it('skips bookings without any contact detail', async () => {
    const b = { ...booking('b3'), customerEmail: null, customerPhone: null, user: { fullName: null, email: null, phoneNumber: null } };
    const sweep = new ConsultationReminderSweep({ events, now: () => new Date('2026-11-24T06:00:00Z'), findBookings: async () => [b] });
    await sweep.tick();
    expect(store.rows).toHaveLength(0);
  });
});

describe('NotificationService e-mail branch (was: log only, reported SENT)', () => {
  const service = new NotificationService();
  beforeEach(() => {
    db.prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'ravi@example.com', phoneNumber: '+919876543210', fullName: 'Ravi' });
    db.prisma.notification.findFirst.mockResolvedValue(null);
    db.prisma.notification.create.mockResolvedValue({ id: 'n1' });
    db.prisma.notificationPreference.findUnique.mockResolvedValue({ pushEnabled: true, emailEnabled: true, astrologyReminders: true, reportAlerts: true, promotions: false });
    db.prisma.deviceToken.findMany.mockResolvedValue([]);
  });

  it('queues the generic e-mail in the outbox and keeps in-app/push behaviour', async () => {
    const result = await service.sendNotification({ userId: 'u1', type: 'REPORT_FAILED', entityId: 'r1', idempotencyKey: 'report_failed:r1', templateData: { reportName: 'Career' } });
    expect(result.notificationId).toBe('n1');
    expect(result.channels.inApp).toEqual({ status: 'SENT' });
    expect(result.channels.push).toEqual({ status: 'SKIPPED', sentCount: 0, failedCount: 0 });
    expect(result.channels.email).toEqual({ status: 'QUEUED' });
    expect(db.outbound).toHaveLength(1);
    expect(db.outbound[0]).toMatchObject({ dedupeKey: 'notification:REPORT_FAILED:report_failed:r1:CUSTOMER:EMAIL', channel: 'EMAIL', recipient: 'ravi@example.com' });
  });

  it('respects the e-mail preference for non-transactional types', async () => {
    db.prisma.notificationPreference.findUnique.mockResolvedValue({ pushEnabled: true, emailEnabled: false, astrologyReminders: true, reportAlerts: true, promotions: false });
    const result = await service.sendNotification({ userId: 'u1', type: 'REPORT_FAILED', entityId: 'r1' });
    expect(result.channels.email).toEqual({ status: 'SKIPPED' });
    expect(db.outbound).toHaveLength(0);
  });

  it('reports FAILED, not SENT, when the provider cannot send', async () => {
    email.failNext({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false });
    const result = await service.sendNotification({ userId: 'u1', type: 'SECURITY_ALERT' });
    expect(result.channels.email).toEqual({ status: 'FAILED' });
    const ok = await service.sendNotification({ userId: 'u1', type: 'SECURITY_ALERT' });
    expect(ok.channels.email).toEqual({ status: 'SENT' });
    expect(email.sent).toHaveLength(1);
    // Inline e-mails (which may carry a code) are never written to the outbox table.
    expect(db.outbound).toHaveLength(0);
  });

  it('a bridged type gets the website e-mail instead of the generic one', async () => {
    const result = await service.sendNotification({ userId: 'u1', type: 'REPORT_READY', entityId: 'r9', idempotencyKey: 'report_ready:r9', templateData: { reportName: 'KUNDLI' } });
    expect(result.channels.inApp).toEqual({ status: 'SENT' });
    expect(result.channels.email).toEqual({ status: 'QUEUED' });
    expect(db.outbound.map((r) => r.dedupeKey).sort()).toEqual(['report-ready:r9:CUSTOMER:EMAIL', 'report-ready:r9:CUSTOMER:WHATSAPP']);
  });
});
