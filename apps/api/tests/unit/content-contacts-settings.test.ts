import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/services/prisma.service', async () => {
  const { fakePrisma } = await import('./content-test-helpers');
  return { prisma: fakePrisma };
});
vi.mock('../../src/modules/admin/admin.service', () => ({ adminService: { logAction: vi.fn() } }));
vi.mock('../../src/services/storage/storage-refs', () => ({
  validateUploadedRef: vi.fn(),
  deleteUploadedObject: vi.fn(),
}));
vi.mock('../../src/services/redis-client', () => ({
  nativeRedisClient: { isConfigured: false, get: vi.fn(), del: vi.fn(), eval: vi.fn() },
}));

import { adminService } from '../../src/modules/admin/admin.service';
import { deleteUploadedObject, validateUploadedRef } from '../../src/services/storage/storage-refs';
import { ContentCache } from '../../src/modules/content/content.cache';
import { CONTACT_SUBMIT_MAX, CONTACT_SUBMIT_WINDOW_MS, ContactsService } from '../../src/modules/content/contacts.service';
import {
  ContactInquiryNotice,
  resetContactInquiryNotifier,
  setContactInquiryNotifier,
} from '../../src/modules/content/content.ports';
import {
  adminContactQuerySchema,
  contactRemarksSchema,
  SETTINGS_DEFAULTS,
  submitContactSchema,
  updateSettingsSchema,
} from '../../src/modules/content/content.schemas';
import {
  mergeSettings,
  normalizeSettings,
  SettingsService,
  toPublicSettings,
} from '../../src/modules/content/settings.service';
import { ConflictError, NotFoundError, RateLimitError } from '../../src/errors/app-error';
import { FakeKeyValueStore, fakePrisma, resetFakePrisma, testActor } from './content-test-helpers';

const logAction = vi.mocked(adminService.logAction);
const validateRef = vi.mocked(validateUploadedRef);
const deleteObject = vi.mocked(deleteUploadedObject);
const deleted: string[] = [];
const lastAudit = () => logAction.mock.calls[logAction.mock.calls.length - 1][0];

beforeEach(() => {
  resetFakePrisma();
  logAction.mockClear();
  deleted.length = 0;
  validateRef.mockReset();
  validateRef.mockImplementation((ref) => ({ url: ref.url ?? null, key: ref.key ?? 'derived-key' }));
  deleteObject.mockReset();
  deleteObject.mockImplementation(async (key) => {
    deleted.push(String(key));
    return true;
  });
});

// ---------------------------------------------------------------------------
// Contact inquiries
// ---------------------------------------------------------------------------

describe('ContactsService', () => {
  let now: number;
  let service: ContactsService;
  let notices: ContactInquiryNotice[];

  const form = (overrides: Record<string, unknown> = {}) =>
    submitContactSchema.parse({ name: 'Asha Rao', email: 'Asha@Example.com', phone: '+919876543210', subject: 'Booking', message: 'Please call me back.', ...overrides });

  beforeEach(() => {
    now = Date.UTC(2026, 10, 24, 6, 0, 0);
    service = new ContactsService(new ContentCache(new FakeKeyValueStore(() => now), () => now));
    notices = [];
    setContactInquiryNotifier({
      notifyInquiryReceived: async (notice) => {
        notices.push(notice);
      },
    });
  });

  afterEach(() => {
    resetContactInquiryNotifier();
  });

  it('validates the form as the website does', () => {
    expect(submitContactSchema.safeParse({ name: 'A', message: 'Hello there' }).success).toBe(false);
    expect(submitContactSchema.safeParse({ name: 'Asha', message: 'Hey' }).success).toBe(false);
    expect(submitContactSchema.safeParse({ name: 'Asha', message: 'x'.repeat(2001) }).success).toBe(false);
    expect(submitContactSchema.safeParse({ name: 'Asha', message: 'Hello there', email: 'not-an-email' }).success).toBe(false);
    expect(submitContactSchema.safeParse({ name: 'Asha', message: 'Hello there', phone: '12ab' }).success).toBe(false);
    expect(submitContactSchema.safeParse({ name: 'Asha', message: 'Hello there', phone: '0123456789' }).success).toBe(false);
    expect(submitContactSchema.safeParse({ name: 'Asha', message: 'Hello there', subject: 'x'.repeat(151) }).success).toBe(false);
    expect(submitContactSchema.safeParse({ name: 'Asha', message: 'Hello there', remarks: 'injected' }).success).toBe(false);

    expect(submitContactSchema.parse({ name: ' Asha ', message: ' Hello there ' })).toEqual({ name: 'Asha', email: '', message: 'Hello there' });
    expect(form().email).toBe('asha@example.com');
  });

  it('saves the inquiry and returns it without the admin remarks', async () => {
    const result = await service.submit(form(), '198.51.100.7');
    expect(result).toMatchObject({ name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210', subject: 'Booking', message: 'Please call me back.' });
    expect(result).not.toHaveProperty('remarks');
    expect(fakePrisma.contactInquiry.rows).toHaveLength(1);
  });

  it('notifies once per inquiry, also when the customer left no email', async () => {
    await service.submit(form(), '198.51.100.7');
    await vi.waitFor(() => expect(notices).toHaveLength(1));
    expect(notices[0]).toMatchObject({ name: 'Asha Rao', email: 'asha@example.com', message: 'Please call me back.' });

    // The website skipped BOTH emails (the admin's too) when no email address was given.
    await service.submit(form({ email: '' }), '198.51.100.7');
    await vi.waitFor(() => expect(notices).toHaveLength(2));
    expect(notices[1]).toMatchObject({ email: '', phone: '+919876543210' });
  });

  it('does not fail the submission when the notification fails', async () => {
    setContactInquiryNotifier({
      notifyInquiryReceived: async () => {
        throw new Error('SMTP down');
      },
    });
    await expect(service.submit(form(), '198.51.100.7')).resolves.toMatchObject({ name: 'Asha Rao' });
    expect(fakePrisma.contactInquiry.rows).toHaveLength(1);
  });

  it('sends nothing with the default notifier', async () => {
    resetContactInquiryNotifier();
    await expect(service.submit(form(), '198.51.100.7')).resolves.toBeDefined();
    expect(notices).toHaveLength(0);
  });

  it('limits submissions per IP: nothing is saved or sent past the limit', async () => {
    for (let i = 0; i < CONTACT_SUBMIT_MAX; i++) await service.submit(form(), '198.51.100.7');
    await vi.waitFor(() => expect(notices).toHaveLength(CONTACT_SUBMIT_MAX));

    await expect(service.submit(form(), '198.51.100.7')).rejects.toBeInstanceOf(RateLimitError);
    await expect(service.submit(form(), '198.51.100.7')).rejects.toMatchObject({ statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' });
    expect(fakePrisma.contactInquiry.rows).toHaveLength(CONTACT_SUBMIT_MAX);
    expect(notices).toHaveLength(CONTACT_SUBMIT_MAX);

    // Another client is not affected, and the first one may write again after the window.
    await expect(service.submit(form(), '198.51.100.8')).resolves.toBeDefined();
    now += CONTACT_SUBMIT_WINDOW_MS + 1;
    await expect(service.submit(form(), '198.51.100.7')).resolves.toBeDefined();
  });

  it('counts rejected validation-free attempts too (the limit is on requests, not on saved rows)', async () => {
    for (let i = 0; i < CONTACT_SUBMIT_MAX + 3; i++) {
      await service.submit(form(), '198.51.100.9').catch(() => undefined);
    }
    now += CONTACT_SUBMIT_WINDOW_MS - 1000;
    await expect(service.submit(form(), '198.51.100.9')).rejects.toBeInstanceOf(RateLimitError);
  });

  describe('admin', () => {
    const query = (overrides: Record<string, unknown> = {}) => adminContactQuerySchema.parse(overrides);

    beforeEach(async () => {
      await service.submit(form({ name: 'Asha Rao', message: 'About my kundli report' }), '198.51.100.1');
      await service.submit(form({ name: 'Vikram', email: 'vikram@sample.org', message: 'Consultation timing?' }), '198.51.100.2');
      await service.submit(form({ name: 'Meera', email: '', message: 'Call me please' }), '198.51.100.3');
      // The fake stamps rows one second apart from 2026-01-01T00:00:01Z.
      fakePrisma.contactInquiry.rows[0].createdAt = new Date('2026-11-20T18:29:59.000Z'); // 20 Nov 23:59:59 IST
      fakePrisma.contactInquiry.rows[1].createdAt = new Date('2026-11-20T18:30:00.000Z'); // 21 Nov 00:00:00 IST
      fakePrisma.contactInquiry.rows[2].createdAt = new Date('2026-11-22T10:00:00.000Z');
      logAction.mockClear();
    });

    it('lists newest first with the website paging shape', async () => {
      const result = await service.list(query({ limit: '2' }));
      expect(result).toMatchObject({ total: 3, page: 1, pages: 2 });
      expect(result.contacts.map((c) => c.name)).toEqual(['Meera', 'Vikram']);
      expect((await service.list(query({ limit: '2', page: '2' }))).contacts.map((c) => c.name)).toEqual(['Asha Rao']);
      expect(result.contacts[0]).toHaveProperty('remarks', '');
    });

    it('searches name, email and message, case-insensitively', async () => {
      expect((await service.list(query({ search: 'ASHA' }))).total).toBe(1);
      expect((await service.list(query({ search: 'sample.org' }))).total).toBe(1);
      expect((await service.list(query({ search: 'kundli' }))).total).toBe(1);
      expect((await service.list(query({ search: 'zzz' }))).total).toBe(0);
    });

    it('filters by IST calendar dates, both inclusive', async () => {
      expect((await service.list(query({ fromDate: '2026-11-21' }))).contacts.map((c) => c.name)).toEqual(['Meera', 'Vikram']);
      expect((await service.list(query({ toDate: '2026-11-20' }))).contacts.map((c) => c.name)).toEqual(['Asha Rao']);
      expect((await service.list(query({ fromDate: '2026-11-21', toDate: '2026-11-21' }))).contacts.map((c) => c.name)).toEqual(['Vikram']);
      expect((await service.list(query({ fromDate: '', toDate: '' }))).total).toBe(3);
      expect(adminContactQuerySchema.safeParse({ fromDate: '21/11/2026' }).success).toBe(false);
    });

    it('updates remarks and audits without personal data', async () => {
      const id = String(fakePrisma.contactInquiry.rows[0].id);
      const body = contactRemarksSchema.parse({ remarks: '  Called back, booked for Friday  ' });
      const updated = await service.updateRemarks(id, body.remarks, testActor);
      expect(updated.remarks).toBe('Called back, booked for Friday');
      expect((await service.getById(id)).remarks).toBe('Called back, booked for Friday');
      expect(contactRemarksSchema.parse({}).remarks).toBe('');
      expect(contactRemarksSchema.safeParse({ remarks: 'x'.repeat(2001) }).success).toBe(false);

      expect(lastAudit()).toMatchObject({ action: 'CONTACT_INQUIRY_REMARKS_UPDATE', resource: `ContactInquiry:${id}`, adminId: 'admin-1' });
      const logged = JSON.stringify(logAction.mock.calls);
      expect(logged).not.toContain('Asha');
      expect(logged).not.toContain('asha@example.com');
      expect(logged).not.toContain('Called back');
    });

    it('hard-deletes and audits without personal data', async () => {
      const id = String(fakePrisma.contactInquiry.rows[0].id);
      await service.remove(id, testActor);
      expect(fakePrisma.contactInquiry.rows).toHaveLength(2);
      expect(lastAudit()).toMatchObject({ action: 'CONTACT_INQUIRY_DELETE', resource: `ContactInquiry:${id}` });
      expect(JSON.stringify(logAction.mock.calls)).not.toMatch(/Asha|9876543210|kundli/);

      await expect(service.getById(id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.updateRemarks(id, 'x', testActor)).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.remove(id, testActor)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

describe('Site settings', () => {
  const service = new SettingsService();
  const patch = (value: unknown) => updateSettingsSchema.parse(value);

  /** The website's stored document, including the fields that must never come back out. */
  const WEBSITE_DOCUMENT = {
    branding: { siteName: 'Astro Sushil', logoUrl: 'https://cdn.example.test/logo.png', faviconUrl: '' },
    contact: { email: 'care@example.test', phone: '+91 90000 00000', whatsapp: '919000000000', address: 'Pune' },
    business: { companyName: 'Astro Sushil LLP', gstNumber: '27ABCDE1234F1Z5', panNumber: 'ABCDE1234F' },
    payment: {
      currency: 'INR', taxPercent: 18, codEnabled: false,
      razorpayKey: 'rzp_live_PUBLICKEY', razorpaySecret: 'RAZORPAY-SECRET-VALUE',
      stripeKey: 'pk_live_x', stripeSecret: 'STRIPE-SECRET-VALUE',
    },
    smtp: { host: 'smtp.example.test', port: 587, secure: false, username: 'mailer', password: 'SMTP-PASSWORD-VALUE', fromEmail: 'no-reply@example.test' },
    sms: { provider: 'smslane', apiKey: 'SMS-API-KEY-VALUE', senderId: 'ASTROS' },
    topBar: { enabled: true, text: 'Astro Sushil in Mumbai', bgColor: '#ffffff', textColor: '#ef4444', linkEnabled: true, linkUrl: '/consultation' },
    legal: { privacyPolicy: '<p>We respect your privacy.</p>' },
    updatedBy: 'admin-object-id',
    __v: 3,
  };
  const SECRETS = /RAZORPAY-SECRET-VALUE|STRIPE-SECRET-VALUE|SMTP-PASSWORD-VALUE|SMS-API-KEY-VALUE|rzp_live_PUBLICKEY|pk_live_x|smtp\.example\.test|mailer/;

  describe('normalizeSettings', () => {
    it('returns the defaults for an empty or broken document', () => {
      expect(normalizeSettings(undefined)).toEqual(SETTINGS_DEFAULTS);
      expect(normalizeSettings(null)).toEqual(SETTINGS_DEFAULTS);
      expect(normalizeSettings('nonsense')).toEqual(SETTINGS_DEFAULTS);
      expect(normalizeSettings({ branding: 'x', shipping: { supportedAreas: 'Pune' } })).toEqual(SETTINGS_DEFAULTS);
    });

    it('keeps known fields, replaces invalid ones with the default, and drops everything unknown', () => {
      const settings = normalizeSettings({ ...WEBSITE_DOCUMENT, socialLinks: { facebook: 'javascript:alert(1)', instagram: 'https://instagram.com/x' } });
      expect(settings.business.gstNumber).toBe('27ABCDE1234F1Z5');
      expect(settings.payment).toEqual({ currency: 'INR', taxPercent: 18, codEnabled: false });
      expect(settings.socialLinks.facebook).toBe('');
      expect(settings.socialLinks.instagram).toBe('https://instagram.com/x');
      expect(settings).not.toHaveProperty('smtp');
      expect(settings).not.toHaveProperty('sms');
      expect(settings).not.toHaveProperty('updatedBy');
      expect(JSON.stringify(settings)).not.toMatch(SECRETS);
    });
  });

  describe('secrets', () => {
    it('never returns a credential, to the public or to the admin, even when one sits in the stored row', async () => {
      await fakePrisma.siteSetting.create({ data: { id: 'site', data: WEBSITE_DOCUMENT } });

      const publicView = await service.getPublicSettings();
      const adminView = await service.getSettings();
      expect(JSON.stringify(publicView)).not.toMatch(SECRETS);
      expect(JSON.stringify(adminView)).not.toMatch(SECRETS);
      expect(adminView.payment).toEqual({ currency: 'INR', taxPercent: 18, codEnabled: false });
    });

    it('rejects an update that carries credentials or unknown sections', () => {
      expect(updateSettingsSchema.safeParse({ payment: { razorpaySecret: 'x' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ payment: { razorpayKey: 'x' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ payment: { stripeSecret: 'x' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ smtp: { password: 'x' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ sms: { apiKey: 'x' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ updatedBy: 'x' }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ payment: { codEnabled: true } }).success).toBe(true);
    });

    it('removes stored credentials from the row on the next save', async () => {
      await fakePrisma.siteSetting.create({ data: { id: 'site', data: WEBSITE_DOCUMENT } });
      await service.update(patch({ contact: { phone: '+91 91111 11111' } }), testActor);
      expect(JSON.stringify(fakePrisma.siteSetting.rows[0].data)).not.toMatch(SECRETS);
      expect((await service.getSettings()).contact).toMatchObject({ phone: '+91 91111 11111', email: 'care@example.test' });
    });
  });

  describe('public allow-list', () => {
    it('exposes exactly the allow-listed fields', () => {
      const view = toPublicSettings(normalizeSettings(WEBSITE_DOCUMENT));
      expect(Object.keys(view).sort()).toEqual(
        ['branding', 'business', 'contact', 'highlightsBar', 'legal', 'order', 'payment', 'shipping', 'socialLinks', 'system', 'topBar'].sort()
      );
      expect(view.branding).toEqual({ siteName: 'Astro Sushil', logoUrl: 'https://cdn.example.test/logo.png', faviconUrl: '' });
      expect(view.business).toEqual({ companyName: 'Astro Sushil LLP' });
      expect(view.payment).toEqual({ currency: 'INR', codEnabled: false });
      expect(Object.keys(view.shipping).sort()).toEqual(['baseDeliveryChargePaise', 'freeShippingThresholdPaise', 'supportedAreas']);
      expect(view.order).toEqual({ returnPolicyDays: 7 });
      expect(view.system).toEqual({ maintenanceMode: false });
      expect(view.topBar).toMatchObject({ enabled: true, linkUrl: '/consultation' });
      expect(view.legal.privacyPolicy).toBe('<p>We respect your privacy.</p>');
    });

    it('keeps tax ids, storage keys and internal switches behind the admin endpoint', () => {
      const text = JSON.stringify(toPublicSettings(normalizeSettings({
        ...WEBSITE_DOCUMENT,
        branding: { siteName: 'A', logoUrl: 'https://cdn.example.test/logo.png', logoKey: 'assets/page/logo.png' },
      })));
      expect(text).not.toContain('27ABCDE1234F1Z5');
      expect(text).not.toContain('ABCDE1234F');
      expect(text).not.toContain('assets/page/logo.png');
      for (const hidden of ['taxPercent', 'maxCodLimitPaise', 'deliveryChargePerKmPaise', 'offers', 'communication', 'otp', 'product', 'autoCancelUnpaidMinutes', 'maxOrderValuePaise', 'updatedById']) {
        expect(text).not.toContain(hidden);
      }
    });

    it('serves defaults before anything is saved, without creating a row', async () => {
      expect(await service.getPublicSettings()).toEqual(toPublicSettings(SETTINGS_DEFAULTS));
      expect(await service.getSettings()).toMatchObject({ updatedAt: null, updatedById: null });
      expect(fakePrisma.siteSetting.rows).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('validates links, colours, emails and money', () => {
      expect(updateSettingsSchema.safeParse({ topBar: { linkUrl: 'javascript:alert(1)' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ topBar: { linkUrl: '//evil.example' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ topBar: { linkUrl: '/free-online-kundli' } }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ topBar: { linkUrl: '' } }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ topBar: { bgColor: 'red' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ topBar: { bgColor: '#fff' } }).success).toBe(true);
      expect(updateSettingsSchema.safeParse({ socialLinks: { youtube: 'youtube.com/x' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ contact: { email: 'nope' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ shipping: { baseDeliveryChargePaise: 49.5 } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ shipping: { baseDeliveryChargePaise: -1 } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({ branding: { siteName: '' } }).success).toBe(false);
      expect(updateSettingsSchema.safeParse({}).success).toBe(true);
    });

    it('merges section by section and field by field; arrays are replaced', () => {
      const current = normalizeSettings({ shipping: { supportedAreas: ['Pune', 'Mumbai', 'Nashik'] }, contact: { email: 'a@b.co', phone: '1' } });
      const next = mergeSettings(current, patch({ shipping: { supportedAreas: ['Delhi'] }, contact: { phone: '2' } }));
      expect(next.shipping.supportedAreas).toEqual(['Delhi']);
      expect(next.contact).toMatchObject({ email: 'a@b.co', phone: '2' });
      expect(next.shipping.baseDeliveryChargePaise).toBe(SETTINGS_DEFAULTS.shipping.baseDeliveryChargePaise);
      expect(current.shipping.supportedAreas).toEqual(['Pune', 'Mumbai', 'Nashik']);
    });

    it('creates the single row on first save and updates it afterwards', async () => {
      const first = await service.update(patch({ branding: { siteName: 'Astro Sushil Official' } }), testActor);
      expect(first).toMatchObject({ updatedById: 'admin-1', branding: { siteName: 'Astro Sushil Official' } });
      expect(first.updatedAt).toBeInstanceOf(Date);

      await service.update(patch({ system: { maintenanceMode: true } }), { ...testActor, id: 'admin-2' });
      expect(fakePrisma.siteSetting.rows).toHaveLength(1);
      expect(fakePrisma.siteSetting.rows[0]).toMatchObject({ id: 'site', updatedById: 'admin-2' });
      expect(await service.getSettings()).toMatchObject({ branding: { siteName: 'Astro Sushil Official' }, system: { maintenanceMode: true } });
      expect((await service.getPublicSettings()).system.maintenanceMode).toBe(true);
    });

    it('sanitises the legal pages on write', async () => {
      const saved = await service.update(
        patch({
          legal: {
            privacyPolicy: '<h2>Privacy</h2><p onclick="x()">We keep <a href="javascript:x()">data</a> safe.</p><script>steal()</script>',
            termsConditions: '<p style="text-align:center">Terms</p>',
          },
        }),
        testActor
      );
      expect(saved.legal.privacyPolicy).toBe('<h2>Privacy</h2><p>We keep <a>data</a> safe.</p>');
      expect(saved.legal.termsConditions).toBe('<p style="text-align:center">Terms</p>');
      expect(JSON.stringify(fakePrisma.siteSetting.rows[0].data)).not.toMatch(/script|onclick|javascript:/);
      expect((await service.getPublicSettings()).legal.privacyPolicy).toBe('<h2>Privacy</h2><p>We keep <a>data</a> safe.</p>');
    });

    it('refuses a save based on a stale copy', async () => {
      await service.update(patch({ contact: { phone: '1' } }), testActor);
      const original = fakePrisma.siteSetting.findUnique;
      const stale = await original({ where: { id: 'site' } });
      await service.update(patch({ contact: { phone: '2' } }), testActor);

      const spy = vi.spyOn(fakePrisma.siteSetting, 'findUnique').mockResolvedValueOnce(stale);
      await expect(service.update(patch({ contact: { phone: '3' } }), testActor)).rejects.toBeInstanceOf(ConflictError);
      spy.mockRestore();
      expect((await service.getSettings()).contact.phone).toBe('2');
    });

    it('checks an uploaded logo and deletes the one it replaces', async () => {
      await service.update(patch({ branding: { logoUrl: 'https://cdn.example.test/assets/page/logo1.png', logoKey: 'assets/page/logo1.png' } }), testActor);
      expect(validateRef).toHaveBeenCalledWith(
        { url: 'https://cdn.example.test/assets/page/logo1.png', key: 'assets/page/logo1.png' },
        { visibility: 'public', purposes: ['page'], field: 'branding.logoUrl' }
      );

      await service.update(patch({ branding: { siteName: 'Unrelated change' } }), testActor);
      expect(deleted).toEqual([]);

      await service.update(patch({ branding: { logoUrl: 'https://cdn.example.test/assets/page/logo2.png', logoKey: 'assets/page/logo2.png' } }), testActor);
      expect(deleted).toEqual(['assets/page/logo1.png']);

      // A URL typed without a key is an external image: the managed file is released.
      const external = await service.update(patch({ branding: { logoUrl: 'https://elsewhere.example/logo.png' } }), testActor);
      expect(external.branding).toMatchObject({ logoUrl: 'https://elsewhere.example/logo.png', logoKey: '' });
      expect(deleted).toEqual(['assets/page/logo1.png', 'assets/page/logo2.png']);
    });

    it('audits the sections that changed, never their values', async () => {
      await service.update(patch({ business: { gstNumber: '27ABCDE1234F1Z5' }, legal: { privacyPolicy: '<p>Policy text</p>' } }), testActor);
      expect(lastAudit()).toMatchObject({
        action: 'SITE_SETTINGS_UPDATE',
        resource: 'SiteSetting:site',
        details: 'Sections updated: business, legal',
        adminId: 'admin-1',
      });
      expect(JSON.stringify(logAction.mock.calls)).not.toMatch(/27ABCDE1234F1Z5|Policy text/);
    });
  });
});
