/**
 * Hooks between modules: the daily consultation reminder reads and records through the bookings
 * module, contact inquiries send the website's two e-mails through the outbox, invoice seller
 * details come from site settings with the environment as fallback, the older consultation admin
 * endpoints accept the website's booking permissions, and the unused e-mail templates are gone.
 * prisma and the e-mail provider are substituted; nothing is sent.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const h = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    prisma: {
      consultationBooking: { findMany: fn(), updateMany: fn() },
      siteSetting: { findUnique: fn() },
      user: { findUnique: fn() },
      adminRole: { findUnique: fn() },
      notificationPreference: { findUnique: fn() },
    },
    consultations: {
      adminListBookings: vi.fn(async () => ({ bookings: [] })),
      getBookingById: vi.fn(async () => ({ id: 'bk-1' })),
      adminStartLiveSession: vi.fn(async () => ({ id: 'session-1' })),
      rescheduleBooking: vi.fn(async () => ({ id: 'bk-1' })),
      cancelBooking: vi.fn(async () => ({ id: 'bk-1' })),
    },
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: h.prisma }));
vi.mock('../../src/services/feature-access.service', () => ({ featureAccessService: { isUserSuspended: vi.fn(async () => false) } }));
vi.mock('../../src/modules/consultations/consultations.service', () => ({ consultationsService: h.consultations }));

import { ConsultationReminderSweep, ReminderBooking } from '../../src/modules/notifications/consultation-reminder.sweep';
import { NotificationEvents } from '../../src/modules/notifications/notification.events';
import { OutboundRow, OutboxService, OutboxStore, StoredOutboundMessage } from '../../src/services/messaging/outbox.service';
import { setMessagingProviders } from '../../src/services/messaging/provider-registry';
import { FakeEmailProvider, FakeSmsProvider, FakeWhatsAppProvider } from '../../src/services/messaging/providers/fake.providers';
import { createContactInquiryNotifier, registerContactInquiryNotifier } from '../../src/modules/content/contact-inquiry.notifier';
import { ContactInquiryNotice, notifyContactInquiry, resetContactInquiryNotifier } from '../../src/modules/content/content.ports';
import { normalizeSettings, toPublicSettings } from '../../src/modules/content/settings.service';
import { getSellerDetails, resetSellerDetailsProvider } from '../../src/modules/invoices/seller';
import {
  registerSiteSettingsSellerDetails,
  sellerFieldsFromSettings,
  SiteSettingsSellerDetailsProvider,
} from '../../src/modules/invoices/site-settings-seller.provider';
import { adminRoutes } from '../../src/modules/admin/admin.routes';
import { invalidateStaffAccessCache } from '../../src/modules/admin/rbac/rbac.resolver';
import { registerJwt } from '../../src/plugins/jwt';
import { globalErrorHandler } from '../../src/errors/error-handler';

const { prisma } = h;

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
  async markSent(id: string) { (this.rows.find((x) => x.id === id) as Row).status = 'SENT'; }
  async markRetry(id: string) { (this.rows.find((x) => x.id === id) as Row).status = 'PENDING'; }
  async markFailed(id: string) { (this.rows.find((x) => x.id === id) as Row).status = 'FAILED'; }
  async failStale() { return 0; }
}

const ENV_KEYS = [
  'ADMIN_EMAIL', 'MESSAGING_INLINE_DISPATCH', 'CONSULTATION_REMINDER_IST_HOUR',
  'INVOICE_SELLER_NAME', 'INVOICE_SELLER_TAGLINE', 'INVOICE_SELLER_ADDRESS', 'INVOICE_SELLER_GSTIN',
  'INVOICE_SELLER_STATE', 'INVOICE_SELLER_EMAIL', 'INVOICE_SELLER_PHONE', 'INVOICE_SELLER_WEBSITE',
];
let savedEnv: Record<string, string | undefined>;
let store: MemoryStore;
let outbox: OutboxService;
let events: NotificationEvents;
let email: FakeEmailProvider;

beforeEach(() => {
  vi.clearAllMocks();
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.ADMIN_EMAIL = 'office@example.test';
  // Messages are sent only when a test asks the outbox to.
  process.env.MESSAGING_INLINE_DISPATCH = 'false';

  email = new FakeEmailProvider();
  setMessagingProviders({ sms: new FakeSmsProvider(), whatsapp: new FakeWhatsAppProvider(), email });
  store = new MemoryStore();
  outbox = new OutboxService({ store });
  events = new NotificationEvents({ outbox, loadPreferences: async () => null });
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  setMessagingProviders(null);
  resetContactInquiryNotifier();
  resetSellerDetailsProvider();
});

// ---------------------------------------------------------------------------
// 2. Daily consultation reminder
// ---------------------------------------------------------------------------

describe('consultation reminder sweep reads and records through the bookings module', () => {
  const booking = (id: string): ReminderBooking => ({
    id, userId: 'u1', title: 'Career', mode: 'VIDEO', date: '2026-11-25', startTime: '10:00', endTime: '10:30',
    customerName: 'Ravi', customerEmail: 'booking@example.test', customerPhone: '9876543210',
    user: { fullName: 'Ravi Kumar', email: 'ravi@example.test', phoneNumber: '+919876543210' },
  });
  const AT_0815_IST = new Date('2026-11-24T02:45:00Z');

  it('by default asks the bookings module, whose query leaves out bookings deleted by staff and ones already reminded', async () => {
    prisma.consultationBooking.findMany.mockResolvedValue([booking('b1')]);
    prisma.consultationBooking.updateMany.mockResolvedValue({ count: 1 });
    const sweep = new ConsultationReminderSweep({ events, now: () => AT_0815_IST });

    expect(await sweep.tick()).toEqual({ ran: true, bookings: 1 });

    expect(prisma.consultationBooking.findMany).toHaveBeenCalledTimes(1);
    const where = prisma.consultationBooking.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      deletedAt: null,
      reminderSentAt: null,
      status: { in: ['CONFIRMED', 'RESCHEDULED'] },
      // Tomorrow, 25 Nov 2026, as an IST day.
      slotStartTimeUtc: { gte: new Date('2026-11-24T18:30:00.000Z'), lte: new Date('2026-11-25T18:29:59.999Z') },
    });
    expect(store.rows.map((r) => r.dedupeKey).sort()).toEqual([
      'consultation-reminder:b1:25-11-2026:CUSTOMER:EMAIL',
      'consultation-reminder:b1:25-11-2026:CUSTOMER:WHATSAPP',
    ]);
  });

  it('records the reminder on the booking (markReminded) after it is in the outbox', async () => {
    prisma.consultationBooking.findMany.mockResolvedValue([booking('b1'), booking('b2')]);
    prisma.consultationBooking.updateMany.mockResolvedValue({ count: 1 });
    await new ConsultationReminderSweep({ events, now: () => AT_0815_IST }).tick();

    expect(prisma.consultationBooking.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.consultationBooking.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'b1', reminderSentAt: null, deletedAt: null },
      data: { reminderSentAt: expect.any(Date) },
    });
    expect(store.rows).toHaveLength(4);
  });

  it('a booking without contact details is neither reminded nor marked', async () => {
    const silent = { ...booking('b3'), customerEmail: null, customerPhone: null, user: { fullName: null, email: null, phoneNumber: null } };
    prisma.consultationBooking.findMany.mockResolvedValue([silent]);
    await new ConsultationReminderSweep({ events, now: () => AT_0815_IST }).tick();
    expect(store.rows).toHaveLength(0);
    expect(prisma.consultationBooking.updateMany).not.toHaveBeenCalled();
  });

  it('when recording fails the sweep runs again on the next tick and sends nothing twice', async () => {
    prisma.consultationBooking.findMany.mockResolvedValue([booking('b1')]);
    prisma.consultationBooking.updateMany.mockRejectedValueOnce(new Error('db down')).mockResolvedValue({ count: 1 });
    const sweep = new ConsultationReminderSweep({ events, now: () => AT_0815_IST });

    expect((await sweep.tick()).ran).toBe(true);
    expect(store.rows).toHaveLength(2);
    // Not finished for the day: the next tick retries, the outbox key stops a second message.
    expect((await sweep.tick()).ran).toBe(true);
    expect(store.rows).toHaveLength(2);
    expect(prisma.consultationBooking.updateMany).toHaveBeenCalledTimes(2);
    // Now complete for the day.
    expect((await sweep.tick()).ran).toBe(false);
  });

  it('a caller that supplies its own query decides for itself whether anything is recorded', async () => {
    const markReminded = vi.fn(async () => true);
    await new ConsultationReminderSweep({ events, now: () => AT_0815_IST, findBookings: async () => [booking('b1')] }).tick();
    expect(prisma.consultationBooking.updateMany).not.toHaveBeenCalled();

    await new ConsultationReminderSweep({ events, now: () => AT_0815_IST, findBookings: async () => [booking('b2')], markReminded }).tick();
    expect(markReminded).toHaveBeenCalledWith('b2');
    expect(prisma.consultationBooking.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Contact inquiries
// ---------------------------------------------------------------------------

describe('contact inquiry e-mails', () => {
  const inquiry = (overrides: Partial<ContactInquiryNotice> = {}): ContactInquiryNotice => ({
    id: 'inq-1', name: 'Meera', email: 'meera@example.test', phone: '9876543210', subject: 'Gemstone advice',
    message: 'Which stone suits me? <script>alert(1)</script>', createdAt: new Date('2026-11-24T10:00:00Z'),
    ...overrides,
  });

  it('queues CONTACT_ADMIN for the admin address and CONTACT_USER for the sender', async () => {
    await createContactInquiryNotifier(events).notifyInquiryReceived(inquiry());

    expect(store.rows.map((r) => r.dedupeKey).sort()).toEqual(['contact-inquiry:inq-1:ADMIN:EMAIL', 'contact-inquiry:inq-1:CUSTOMER:EMAIL']);
    const admin = store.rows.find((r) => r.audience === 'ADMIN') as Row;
    const sender = store.rows.find((r) => r.audience === 'CUSTOMER') as Row;
    expect(admin).toMatchObject({ recipient: 'office@example.test', channel: 'EMAIL', event: 'contact-inquiry', entityId: 'inq-1', userId: null });
    expect(sender).toMatchObject({ recipient: 'meera@example.test', channel: 'EMAIL', userId: null });

    const adminMail = admin.payload as { kind: string; subject: string; html: string };
    expect(adminMail.kind).toBe('email');
    expect(adminMail.subject).toContain('New Contact');
    expect(adminMail.subject).toContain('Gemstone advice');
    expect(adminMail.html).toContain('New Contact Form Submission');
    expect(adminMail.html).toContain('meera@example.test');
    expect(adminMail.html).toContain('9876543210');
    // The visitor's text is escaped in both e-mails.
    expect(adminMail.html).not.toContain('<script>');

    const senderMail = sender.payload as { subject: string; html: string };
    expect(senderMail.subject).toBe("We've received your message — Astro Sushil");
    expect(senderMail.html).toContain('We got your message, Meera!');
    expect(senderMail.html).not.toContain('<script>');
  });

  it('sends only the admin e-mail when the sender left no address', async () => {
    await createContactInquiryNotifier(events).notifyInquiryReceived(inquiry({ email: '' }));
    expect(store.rows.map((r) => r.dedupeKey)).toEqual(['contact-inquiry:inq-1:ADMIN:EMAIL']);
  });

  it('is idempotent per inquiry: raising it again queues nothing, another inquiry gets its own pair', async () => {
    const notifier = createContactInquiryNotifier(events);
    await notifier.notifyInquiryReceived(inquiry());
    await notifier.notifyInquiryReceived(inquiry());
    expect(store.rows).toHaveLength(2);

    await notifier.notifyInquiryReceived(inquiry({ id: 'inq-2' }));
    expect(store.rows).toHaveLength(4);
  });

  it('goes out through the messaging e-mail provider, once each', async () => {
    await createContactInquiryNotifier(events).notifyInquiryReceived(inquiry());
    await outbox.processDue();
    await outbox.processDue();

    expect(email.sent.map((m) => m.to).sort()).toEqual(['meera@example.test', 'office@example.test']);
    expect(store.rows.every((r) => r.status === 'SENT')).toBe(true);
  });

  it('without ADMIN_EMAIL the sender is still answered and the missing admin recipient is reported', async () => {
    delete process.env.ADMIN_EMAIL;
    const result = await events.contactInquiryReceived({ inquiryId: 'inq-3', name: 'Meera', email: 'meera@example.test', message: 'Hello there' });
    expect(result.queued).toEqual(['contact-inquiry:inq-3:CUSTOMER:EMAIL']);
    expect(result.skipped).toEqual([{ channel: 'EMAIL', audience: 'ADMIN', reason: 'NO_RECIPIENT' }]);
  });

  it('once registered, the content module\'s notify call reaches the outbox and never rejects', async () => {
    registerContactInquiryNotifier(events);
    await notifyContactInquiry(inquiry({ id: 'inq-4' }));
    expect(store.rows.map((r) => r.dedupeKey).sort()).toEqual(['contact-inquiry:inq-4:ADMIN:EMAIL', 'contact-inquiry:inq-4:CUSTOMER:EMAIL']);

    const failing = new NotificationEvents({
      outbox: new OutboxService({ store: { ...store, insert: async () => { throw new Error('db down'); } } as unknown as OutboxStore }),
    });
    registerContactInquiryNotifier(failing);
    await expect(notifyContactInquiry(inquiry({ id: 'inq-5' }))).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Invoice seller details from site settings
// ---------------------------------------------------------------------------

describe('invoice seller details: site settings first, environment as fallback', () => {
  const ENV_SELLER = {
    INVOICE_SELLER_NAME: 'Env Seller Private Limited',
    INVOICE_SELLER_ADDRESS: '1 Env Road, Env City',
    INVOICE_SELLER_GSTIN: '00AAAAA0000A0Z0',
    INVOICE_SELLER_STATE: 'Example State',
    INVOICE_SELLER_EMAIL: 'billing@example.test',
  } as NodeJS.ProcessEnv;

  const settingsWith = (business: Record<string, string>, contact: Record<string, string> = {}) =>
    normalizeSettings({ business, contact });

  const providerFor = (settings: ReturnType<typeof normalizeSettings>, env: NodeJS.ProcessEnv = ENV_SELLER) =>
    new SiteSettingsSellerDetailsProvider({ loadSettings: async () => settings, env: () => env });

  it('uses the company name, GSTIN and address from settings and the rest from the environment', async () => {
    const provider = providerFor(
      settingsWith({ companyName: 'Settings Seller LLP', gstNumber: '11bbbbb1111b1z1', panNumber: 'BBBBB1111B' }, { address: '9 Settings Street, Settings Town' })
    );
    await provider.refresh();

    expect(provider.get()).toEqual({
      legalName: 'Settings Seller LLP',
      tagline: null,
      address: '9 Settings Street, Settings Town',
      gstin: '11BBBBB1111B1Z1',
      state: 'Example State',
      email: 'billing@example.test',
      phone: null,
      website: null,
    });
  });

  it('falls back to the environment field by field when a settings value is blank', async () => {
    const provider = providerFor(settingsWith({ companyName: 'Settings Seller LLP', gstNumber: '   ' }));
    await provider.refresh();
    expect(provider.get()).toMatchObject({
      legalName: 'Settings Seller LLP',
      gstin: '00AAAAA0000A0Z0',
      address: '1 Env Road, Env City',
    });
  });

  it('ignores a GST number that is not shaped like a GSTIN', async () => {
    expect(sellerFieldsFromSettings(settingsWith({ gstNumber: 'not-a-gstin' }))).toEqual({});
    const provider = providerFor(settingsWith({ gstNumber: 'not-a-gstin' }));
    await provider.refresh();
    expect(provider.get().gstin).toBe('00AAAAA0000A0Z0');
  });

  it('answers from the environment before the first load and when settings cannot be read', async () => {
    const provider = new SiteSettingsSellerDetailsProvider({
      loadSettings: async () => { throw new Error('db down'); },
      env: () => ENV_SELLER,
    });
    expect(provider.get().legalName).toBe('Env Seller Private Limited');
    expect(await provider.refresh()).toBe(false);
    expect(provider.get().legalName).toBe('Env Seller Private Limited');
  });

  it('keeps the last good settings when a later read fails, and picks up an edit on the next read', async () => {
    let current: ReturnType<typeof normalizeSettings> | Error = settingsWith({ companyName: 'First Name LLP' });
    const provider = new SiteSettingsSellerDetailsProvider({
      loadSettings: async () => { if (current instanceof Error) throw current; return current; },
      env: () => ENV_SELLER,
    });
    await provider.refresh();
    expect(provider.get().legalName).toBe('First Name LLP');

    current = new Error('db down');
    await provider.refresh();
    expect(provider.get().legalName).toBe('First Name LLP');

    current = settingsWith({ companyName: 'Second Name LLP' });
    await provider.refresh();
    expect(provider.get().legalName).toBe('Second Name LLP');

    // Cleared in the admin: back to the environment value.
    current = settingsWith({ companyName: '' });
    await provider.refresh();
    expect(provider.get().legalName).toBe('Env Seller Private Limited');
  });

  it('settings can complete what the environment lacks; the state of registration must still be configured', async () => {
    const settings = settingsWith({ companyName: 'Settings Seller LLP', gstNumber: '11BBBBB1111B1Z1' }, { address: '9 Settings Street' });
    const withState = providerFor(settings, { INVOICE_SELLER_STATE: 'Example State' } as NodeJS.ProcessEnv);
    await withState.refresh();
    expect(withState.get()).toMatchObject({ legalName: 'Settings Seller LLP', state: 'Example State' });

    const withoutState = providerFor(settings, {} as NodeJS.ProcessEnv);
    await withoutState.refresh();
    expect(() => withoutState.get()).toThrowError(
      expect.objectContaining({ code: 'INVOICE_SELLER_UNCONFIGURED', statusCode: 503, message: expect.stringContaining('INVOICE_SELLER_STATE') })
    );
  });

  it('registration makes getSellerDetails() answer from the stored settings row', async () => {
    Object.assign(process.env, ENV_SELLER);
    prisma.siteSetting.findUnique.mockResolvedValue({
      id: 'site', updatedById: null, updatedAt: new Date(),
      data: { business: { companyName: 'Stored Seller LLP', gstNumber: '22CCCCC2222C2Z2', panNumber: 'CCCCC2222C' }, contact: { address: '5 Stored Lane' } },
    });
    const provider = new SiteSettingsSellerDetailsProvider({ refreshMs: 60_000 });
    try {
      await registerSiteSettingsSellerDetails(provider);
      expect(getSellerDetails()).toMatchObject({
        legalName: 'Stored Seller LLP', gstin: '22CCCCC2222C2Z2', address: '5 Stored Lane', state: 'Example State',
      });
    } finally {
      provider.stop();
    }
  });

  it('re-reads the settings on its timer', async () => {
    vi.useFakeTimers();
    let name = 'First Name LLP';
    const provider = new SiteSettingsSellerDetailsProvider({
      loadSettings: async () => settingsWith({ companyName: name }),
      env: () => ENV_SELLER,
      refreshMs: 30_000,
    });
    try {
      await provider.start();
      expect(provider.get().legalName).toBe('First Name LLP');
      name = 'Second Name LLP';
      await vi.advanceTimersByTimeAsync(29_000);
      expect(provider.get().legalName).toBe('First Name LLP');
      await vi.advanceTimersByTimeAsync(1_000);
      expect(provider.get().legalName).toBe('Second Name LLP');
    } finally {
      provider.stop();
      vi.useRealTimers();
    }
  });

  it('the public settings still carry no GSTIN and no PAN', () => {
    const publicView = toPublicSettings(
      settingsWith({ companyName: 'Settings Seller LLP', gstNumber: '11BBBBB1111B1Z1', panNumber: 'BBBBB1111B' }, { address: '9 Settings Street' })
    );
    const text = JSON.stringify(publicView);
    expect(publicView.business).toEqual({ companyName: 'Settings Seller LLP' });
    expect(text).not.toContain('11BBBBB1111B1Z1');
    expect(text).not.toContain('BBBBB1111B');
    expect(text).not.toMatch(/gstNumber|panNumber/);
  });
});

// ---------------------------------------------------------------------------
// 6. Older /admin/consultations endpoints accept the website's booking permissions
// ---------------------------------------------------------------------------

describe('older /admin/consultations endpoints: live_sessions:* or bookings:*', () => {
  const STAFF_ID = '11111111-1111-4111-8111-111111111111';
  const BOOKING = '22222222-2222-4222-8222-222222222222';
  let app: FastifyInstance;
  let token: string;

  const READ: Array<['GET' | 'POST', string]> = [
    ['GET', '/admin/consultations'],
    ['GET', `/admin/consultations/${BOOKING}`],
  ];
  const WRITE: Array<['GET' | 'POST', string]> = [
    ['POST', `/admin/consultations/${BOOKING}/start-session`],
    ['POST', `/admin/consultations/${BOOKING}/reschedule`],
    ['POST', `/admin/consultations/${BOOKING}/cancel`],
  ];

  function signInWith(permissions: string[]) {
    invalidateStaffAccessCache();
    prisma.user.findUnique.mockResolvedValue({
      id: STAFF_ID,
      email: 'staff@example.test',
      role: 'SUPPORT',
      staffProfile: {
        status: 'ACTIVE',
        isDeleted: false,
        role: { id: 'role-1', name: 'Website Role', slug: 'website-role', isSuperAdmin: false, status: 'ACTIVE', permissions },
      },
    });
  }

  const call = (method: 'GET' | 'POST', url: string) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload: method === 'POST' ? {} : undefined });

  beforeAll(async () => {
    app = Fastify();
    app.setErrorHandler(globalErrorHandler);
    await app.register(registerJwt);
    await app.register(adminRoutes, { prefix: '/admin' });
    await app.ready();
    token = app.jwt.sign({ sub: STAFF_ID, role: 'SUPPORT' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('a website-style role (bookings:read, bookings:update) may use all five', async () => {
    signInWith(['bookings:read', 'bookings:update']);
    for (const [method, url] of [...READ, ...WRITE]) {
      const response = await call(method, url);
      expect(response.statusCode, `${method} ${url}`).toBeLessThan(300);
    }
    expect(h.consultations.adminListBookings).toHaveBeenCalledTimes(1);
    expect(h.consultations.cancelBooking).toHaveBeenCalledTimes(1);
  });

  it('the old keys keep working', async () => {
    signInWith(['live_sessions:read', 'live_sessions:write']);
    for (const [method, url] of [...READ, ...WRITE]) {
      expect((await call(method, url)).statusCode, `${method} ${url}`).toBeLessThan(300);
    }
  });

  it('read-only booking access cannot start, reschedule or cancel', async () => {
    signInWith(['bookings:read']);
    for (const [method, url] of READ) expect((await call(method, url)).statusCode).toBe(200);
    for (const [method, url] of WRITE) {
      const response = await call(method, url);
      expect(response.statusCode, `${method} ${url}`).toBe(403);
      expect(response.json().error.code).toBe('AUTHORIZATION_ERROR');
    }
    expect(h.consultations.adminStartLiveSession).not.toHaveBeenCalled();
    expect(h.consultations.rescheduleBooking).not.toHaveBeenCalled();
    expect(h.consultations.cancelBooking).not.toHaveBeenCalled();
  });

  it('unrelated permissions, including consultation-type ones, open none of them', async () => {
    signInWith(['consultations:read', 'consultations:update', 'orders:read', 'bookings:delete']);
    for (const [method, url] of [...READ, ...WRITE]) {
      expect((await call(method, url)).statusCode, `${method} ${url}`).toBe(403);
    }
    expect(h.consultations.adminListBookings).not.toHaveBeenCalled();
  });

  it('the live-session endpoints themselves still need live_sessions:*', async () => {
    signInWith(['bookings:read', 'bookings:update']);
    expect((await call('GET', '/admin/live-sessions')).statusCode).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 7. Unused e-mail templates
// ---------------------------------------------------------------------------

describe('old OTP e-mail templates', () => {
  it('are removed (OTP e-mails are rendered by services/messaging/templates)', () => {
    const emailsDir = join(__dirname, '../../src/services/emails');
    expect(existsSync(join(emailsDir, 'verification.ts'))).toBe(false);
    expect(existsSync(join(emailsDir, 'password-reset.ts'))).toBe(false);
  });
});
