/**
 * The website's report purchase on our commerce and report platform: the price is the catalogue's
 * and never the request's, the language chosen before payment reaches the report, bride and groom
 * become two birth profiles, an order is listed only after delivery, and every customer route
 * needs a login.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

const db = vi.hoisted(() => ({
  profiles: [] as Array<Record<string, any>>,
  orders: [] as Array<Record<string, any>>,
  reports: [] as Array<Record<string, any>>,
  blocked: false,
}));

vi.mock('../../src/services/prisma.service', () => ({
  prisma: {
    birthProfile: {
      findMany: vi.fn(async ({ where }: any) => db.profiles.filter((p) => p.userId === where.userId)),
    },
    order: {
      findFirst: vi.fn(async ({ where }: any) => db.orders.find((o) => o.id === where.id && o.userId === where.userId) ?? null),
    },
    report: {
      findMany: vi.fn(async ({ where }: any) =>
        db.reports
          .filter((r) => r.userId === where.userId && r.orderId !== null && r.status === where.status)
          .map((r) => ({ ...r, order: db.orders.find((o) => o.id === r.orderId) ?? null }))
      ),
    },
  },
}));
// The real modules behind the injected fakes are not needed (and would load the whole report platform).
vi.mock('../../src/modules/commerce/commerce.service', () => ({ commerceService: {} }));
vi.mock('../../src/modules/reports/reports.service', () => ({ reportsService: {} }));
vi.mock('../../src/modules/birth-profiles/birth-profiles.service', () => ({ birthProfilesService: {} }));
vi.mock('../../src/services/platform-report.runner', () => ({ platformReportLanguages: () => ['en', 'hi'] }));
vi.mock('../../src/modules/web-astrology/web-astrology.service', () => ({ webAstrologyService: { timezones: null } }));
vi.mock('../../src/modules/auth/account-status', () => ({
  ACCOUNT_BLOCKED_MESSAGE: 'This account is blocked. Please contact support.',
  invalidateAccountStatusCache: vi.fn(),
  isAccountBlocked: vi.fn(async () => db.blocked),
  assertAccountActive: vi.fn(async () => {
    if (db.blocked) {
      const { AuthorizationError } = await import('../../src/errors/app-error');
      throw new AuthorizationError('This account is blocked. Please contact support.');
    }
  }),
}));

import { globalErrorHandler } from '../../src/errors/error-handler';
import { NotFoundError } from '../../src/errors/app-error';
import { registerJwt } from '../../src/plugins/jwt';
import { COMMERCE_CATALOG, commerceCatalog } from '../../src/modules/commerce/commerce.catalog';
import { PlaceTimezoneMemo } from '../../src/modules/web-astrology/web-astrology.timezone';
import { WEBSITE_REPORT_PRODUCTS, WebReportsService, webReportsService } from '../../src/modules/web-astrology/web-reports.service';
import { webBuyReportSchema, webVerifyReportPaymentSchema } from '../../src/modules/web-astrology/web-reports.schemas';
import { webReportsRoutes } from '../../src/modules/web-astrology/web-reports.routes';

const NOW = new Date('2026-11-24T06:00:00.000Z');
const USER = { id: 'cust-1', role: 'USER' };
const OTHER = { id: 'cust-2', role: 'USER' };

const person = (over: Record<string, unknown> = {}) => ({
  fullName: 'Asha Rao',
  email: 'asha@example.test',
  whatsappNumber: '9876543210',
  dateOfBirth: '1990-05-15',
  timeOfBirth: '14:30',
  birthPlace: 'New Delhi, Delhi, India',
  gender: 'female',
  pinCode: '110001',
  latitude: '28.6139',
  longitude: '77.2090',
  timezone: 'Asia/Kolkata',
  ...over,
});

function harness(options: { languages?: string[]; delayHours?: number; reportJobFails?: boolean } = {}) {
  let seq = 0;
  const createProfile = vi.fn(async (userId: string, input: Record<string, any>) => {
    const profile = { id: `profile-${++seq}`, userId, ...input, placeName: input.placeName ?? null };
    db.profiles.push(profile);
    return profile as any;
  });
  // Prices come from the real catalogue calculation, exactly as CommerceService does.
  const createOrder = vi.fn(async (input: any, user: { id: string }) => {
    const calculated = commerceCatalog.calculateOrder(input.items);
    const order = {
      id: `order-${++seq}`,
      userId: user.id,
      razorpayOrderId: `rzp_order_${seq}`,
      amount: calculated.totalAmount,
      currency: 'INR',
      status: 'PENDING',
      createdAt: NOW,
      items: calculated.items.map((ci, i) => ({
        id: `item-${seq}-${i}`,
        itemType: ci.catalogItem.itemType,
        catalogId: ci.catalogItem.id,
        title: ci.catalogItem.title,
        metadata: ci.metadata,
      })),
    };
    db.orders.push(order);
    return {
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.amount,
      currency: 'INR',
      paidCurrency: input.currency ?? 'INR',
      paidAmountMinor: order.amount,
      razorpayKey: 'rzp_test_public_key',
    } as any;
  });
  const verifyPayment = vi.fn(async (input: any, user: { id: string }) => {
    const order = db.orders.find((o) => o.razorpayOrderId === input.razorpayOrderId);
    if (!order || order.userId !== user.id) throw new NotFoundError('Order not found');
    order.status = 'PAID';
    return { message: 'Payment verified successfully', order } as any;
  });
  const createReportJob = vi.fn(async (input: any, user: { id: string }) => {
    if (options.reportJobFails) throw new Error('queue unavailable');
    const existing = db.reports.find((r) => r.orderId === input.orderId && r.birthProfileId === input.birthProfileId);
    if (existing) return { reportId: existing.id, status: existing.status, reused: true };
    const report = {
      id: `report-${++seq}`,
      userId: user.id,
      orderId: input.orderId,
      birthProfileId: input.birthProfileId,
      reportType: input.reportType,
      language: input.language,
      status: 'QUEUED',
      completedAt: null as Date | null,
      metadata: { partnerProfileId: input.partnerProfileId },
    };
    db.reports.push(report);
    return { reportId: report.id, status: 'QUEUED', reused: false };
  });
  const getReportAccessUrl = vi.fn(async (reportId: string) => ({
    reportId,
    accessUrl: `https://files.example.test/signed/${reportId}?expires=900`,
    expiresAt: '',
    fileName: 'report.pdf',
  }));
  const timezones = new PlaceTimezoneMemo({ get: async () => null, set: async () => undefined });
  const service = new WebReportsService({
    commerce: { createOrder, verifyPayment },
    reports: { createReportJob, getReportAccessUrl },
    profiles: { createProfile },
    timezones,
    languagesOf: () => options.languages ?? ['en', 'hi'],
    releaseDelayMs: () => (options.delayHours ?? 24) * 60 * 60 * 1000,
    now: () => NOW,
  });
  return { service, createProfile, createOrder, verifyPayment, createReportJob, getReportAccessUrl, timezones };
}

const verifyBody = (razorpayOrderId: string) => ({
  razorpay_order_id: razorpayOrderId,
  razorpay_payment_id: 'pay_1',
  razorpay_signature: 'sig',
});

beforeEach(() => {
  db.profiles = [];
  db.orders = [];
  db.reports = [];
  db.blocked = false;
});

describe('GET /web/reports: the four website products, priced from our catalogue', () => {
  it('maps each website product to the decided replacement', () => {
    const map = Object.fromEntries(WEBSITE_REPORT_PRODUCTS.map((p) => [p.reportType, [p.catalogId, p.platformType]]));
    expect(map).toEqual({
      mini_horoscope_pdf: ['report-planetary-summary', 'PLANETARY_SUMMARY'],
      basic_horoscope_pdf: ['report-kundli-basic', 'KUNDLI_BASIC'],
      pro_horoscope_pdf: ['report-fortune-plus', 'FORTUNE_PLUS'],
      match_making_pdf: ['report-marriage', 'MARRIAGE_COMPATIBILITY'],
    });
    for (const product of WEBSITE_REPORT_PRODUCTS) {
      expect(COMMERCE_CATALOG[product.catalogId].legacyReportType).toBe(product.platformType);
    }
  });

  it('returns the website fields with the website prices (read 2026-11-24) from the catalogue', () => {
    const reports = harness().service.listReports();
    expect(reports.map((r) => r.name)).toEqual(['Mini Horoscope', 'Basic Horoscope', 'Pro Horoscope', 'Match Making']);
    const by = Object.fromEntries(reports.map((r) => [r.reportType, r]));
    expect(by.mini_horoscope_pdf).toMatchObject({
      _id: 'report-planetary-summary',
      slug: 'mini-horoscope',
      originalPrice: 499,
      salePrice: 199,
      gst: { enabled: true, rate: 18, type: 'exclusive' },
      priceWithGst: 234.82,
      priceWithGstPaise: COMMERCE_CATALOG['report-planetary-summary'].pricePaise,
      priceBreakdown: { rate: 18, base: 199, taxAmount: 35.82, total: 234.82 },
      languages: ['en', 'hi'],
    });
    expect(by.basic_horoscope_pdf).toMatchObject({ originalPrice: 799, salePrice: 299, priceWithGst: 352.82 });
    expect(by.pro_horoscope_pdf).toMatchObject({ originalPrice: 1499, salePrice: 699, priceWithGst: 824.82 });
    expect(by.match_making_pdf).toMatchObject({ originalPrice: 1999, salePrice: 999, priceWithGst: 999, gst: { enabled: false, rate: 0 }, requires: 'matchMakingDetails' });
    for (const report of reports) {
      for (const key of ['name', 'slug', 'description', 'originalPrice', 'salePrice', 'gst', 'priceWithGst', 'languages']) {
        expect(report, `${report.slug}.${key}`).toHaveProperty(key);
      }
      // What is displayed is what is charged.
      expect(report.priceWithGstPaise).toBe(commerceCatalog.calculateOrder([{ catalogId: report._id }]).totalAmount);
    }
  });

  it('follows the catalogue: a changed price or an inactive item changes the list', () => {
    const item = COMMERCE_CATALOG['report-planetary-summary'];
    const original = { pricePaise: item.pricePaise, isActive: item.isActive };
    try {
      item.pricePaise = 11800;
      expect(harness().service.getReport('mini-horoscope')).toMatchObject({ salePrice: 100, priceWithGst: 118 });
      item.isActive = false;
      expect(harness().service.listReports().map((r) => r.slug)).toEqual(['basic-horoscope', 'pro-horoscope', 'match-making']);
      expect(() => harness().service.getReport('mini-horoscope')).toThrow(NotFoundError);
    } finally {
      Object.assign(item, original);
    }
  });

  it('finds a product by slug, catalogue id or website type, and nothing else', () => {
    const { service } = harness();
    expect(service.getReport('pro-horoscope')._id).toBe('report-fortune-plus');
    expect(service.getReport('report-fortune-plus').slug).toBe('pro-horoscope');
    expect(service.getReport('pro_horoscope_pdf').slug).toBe('pro-horoscope');
    // Another catalogue item is not a website report.
    expect(() => service.getReport('report-career')).toThrow(NotFoundError);
    expect(() => service.getReport('__proto__')).toThrow(NotFoundError);
  });
});

describe('POST /web/reports/buy', () => {
  it('never takes the price from the request (finding 3)', async () => {
    const h = harness();
    const input = webBuyReportSchema.parse({
      reportId: 'report-planetary-summary',
      reportType: 'mini_horoscope_pdf',
      currency: 'INR',
      // Everything a buyer could try to lower the charge with:
      currencyRate: 0.0001,
      amount: 1,
      baseAmount: 1,
      salePrice: 1,
      priceWithGst: 1,
      gst: { rate: 0, enabled: false },
      discountPaise: 23000,
      customerDetails: { ...person(), reportLanguage: 'en', price: 1 },
    });
    expect(input).not.toHaveProperty('currencyRate');
    expect(input).not.toHaveProperty('amount');
    expect(input.customerDetails).not.toHaveProperty('price');

    const result = await h.service.buy(input, USER);

    const [orderInput] = h.createOrder.mock.calls[0];
    expect(Object.keys(orderInput).sort()).toEqual(['currency', 'idempotencyKey', 'items']);
    expect(orderInput.items).toHaveLength(1);
    expect(Object.keys(orderInput.items[0]).sort()).toEqual(['catalogId', 'metadata', 'quantity']);
    expect(orderInput.items[0]).toMatchObject({ catalogId: 'report-planetary-summary', quantity: 1 });
    expect(JSON.stringify(orderInput)).not.toMatch(/currencyRate|salePrice|priceWithGst|discount|"amount"|"price"/);
    // The charge is the catalogue price: Rs 199 + 18% GST.
    expect(result.razorpayConfig).toEqual({ key: 'rzp_test_public_key', orderId: 'rzp_order_2', amount: 23482, currency: 'INR' });
    expect(result.order).toMatchObject({ reportType: 'mini_horoscope_pdf', amountPaise: 23482, baseAmount: 234.82, paymentStatus: 'pending' });
  });

  it('takes the report type from the product: a cheaper product cannot be bought as a dearer report', async () => {
    const h = harness();
    const input = webBuyReportSchema.parse({ reportId: 'report-planetary-summary', reportType: 'pro_horoscope_pdf', customerDetails: { ...person(), reportLanguage: 'en' } });
    await expect(h.service.buy(input, USER)).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(h.createOrder).not.toHaveBeenCalled();
    expect(h.createProfile).not.toHaveBeenCalled();
  });

  it('carries the language chosen before payment to the order and from there to the report', async () => {
    const h = harness();
    const bought = await h.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', customerDetails: { ...person(), reportLanguage: 'hi' } }), USER);
    const metadata = h.createOrder.mock.calls[0][0].items[0].metadata;
    expect(metadata).toMatchObject({ language: 'hi', source: 'website', websiteReportType: 'mini_horoscope_pdf', birthProfileId: 'profile-1' });
    expect(bought.order.reportLanguage).toBe('hi');

    const verified = await h.service.verifyPayment(webVerifyReportPaymentSchema.parse(verifyBody(bought.razorpayConfig.orderId)), USER);
    expect(h.verifyPayment).toHaveBeenCalledWith({ razorpayOrderId: bought.razorpayConfig.orderId, razorpayPaymentId: 'pay_1', razorpaySignature: 'sig' }, USER);
    expect(h.createReportJob).toHaveBeenCalledTimes(1);
    expect(h.createReportJob).toHaveBeenCalledWith(
      { birthProfileId: 'profile-1', partnerProfileId: undefined, reportType: 'PLANETARY_SUMMARY', orderId: bought.order._id, language: 'hi' },
      USER
    );
    expect(db.reports[0]).toMatchObject({ language: 'hi', reportType: 'PLANETARY_SUMMARY', orderId: bought.order._id });
    // Delivery keeps the website's behaviour: confirmed now, delivered later.
    expect(verified).toMatchObject({ paymentStatus: 'paid', reportStatus: 'pending', reportGenerationStatus: 'processing', isReportSent: false });
    expect(verified.deliveryMessage).toContain('48 hours');
  });

  it('refuses a language the report has no edition for, before a profile or an order exists', async () => {
    const h = harness({ languages: ['en'] });
    const input = webBuyReportSchema.parse({ reportId: 'basic-horoscope', customerDetails: { ...person(), reportLanguage: 'hi' } });
    await expect(h.service.buy(input, USER)).rejects.toMatchObject({ statusCode: 400, code: 'REPORT_LANGUAGE_NOT_AVAILABLE' });
    expect(h.createProfile).not.toHaveBeenCalled();
    expect(h.createOrder).not.toHaveBeenCalled();
    expect(webBuyReportSchema.safeParse({ reportId: 'basic-horoscope', customerDetails: { ...person(), reportLanguage: 'fr' } }).success).toBe(false);
    expect(webBuyReportSchema.safeParse({ reportId: 'basic-horoscope', customerDetails: person() }).success).toBe(false);
  });

  it('bride and groom become two birth profiles of the buyer: the groom is the primary chart, the bride the partner', async () => {
    const h = harness();
    const bride = person({ fullName: 'Asha Rao', gender: 'female' });
    const groom = person({ fullName: 'Vikram Shah', gender: 'male', dateOfBirth: '1988-02-03', timeOfBirth: '06:05', latitude: 19.076, longitude: 72.8777, birthPlace: 'Mumbai, Maharashtra, India' });
    const bought = await h.service.buy(
      webBuyReportSchema.parse({ reportId: 'match-making', reportType: 'match_making_pdf', matchMakingDetails: { bride, groom, reportLanguage: 'en' } }),
      USER
    );
    expect(h.createProfile).toHaveBeenCalledTimes(2);
    expect(db.profiles.map((p) => [p.userId, p.name, p.dateOfBirth, p.timeOfBirth, p.timezone, p.placeName])).toEqual([
      ['cust-1', 'Vikram Shah', '1988-02-03', '06:05:00', 'Asia/Kolkata', 'Mumbai, Maharashtra, India'],
      ['cust-1', 'Asha Rao', '1990-05-15', '14:30:00', 'Asia/Kolkata', 'New Delhi, Delhi, India'],
    ]);
    const groomId = db.profiles[0].id;
    const brideId = db.profiles[1].id;
    const metadata = h.createOrder.mock.calls[0][0].items[0].metadata;
    expect(metadata).toMatchObject({ birthProfileId: groomId, partnerProfileId: brideId, language: 'en' });
    expect(metadata.contact.fullName).toBe('Vikram Shah');
    expect(metadata.partnerContact.fullName).toBe('Asha Rao');
    expect(h.createOrder.mock.calls[0][0].items[0].catalogId).toBe('report-marriage');
    expect(bought.razorpayConfig.amount).toBe(99900);

    await h.service.verifyPayment(verifyBody(bought.razorpayConfig.orderId), USER);
    expect(h.createReportJob).toHaveBeenCalledWith(
      { birthProfileId: groomId, partnerProfileId: brideId, reportType: 'MARRIAGE_COMPATIBILITY', orderId: bought.order._id, language: 'en' },
      USER
    );
  });

  it('needs the right details for the product and two different people for a match', async () => {
    const h = harness();
    await expect(h.service.buy(webBuyReportSchema.parse({ reportId: 'match-making', customerDetails: { ...person(), reportLanguage: 'en' } }), USER)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(h.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', matchMakingDetails: { bride: person(), groom: person({ fullName: 'B' }), reportLanguage: 'en' } }), USER)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(h.service.buy(webBuyReportSchema.parse({ reportId: 'match-making', matchMakingDetails: { bride: person(), groom: person(), reportLanguage: 'en' } }), USER)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(h.service.buy(webBuyReportSchema.parse({ reportId: 'report-career', customerDetails: { ...person(), reportLanguage: 'en' } }), USER)).rejects.toBeInstanceOf(NotFoundError);
    expect(h.createOrder).not.toHaveBeenCalled();
  });

  it('reuses the buyer\'s matching birth profile and never another customer\'s', async () => {
    const h = harness();
    await h.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', customerDetails: { ...person(), reportLanguage: 'en' } }), USER);
    await h.service.buy(webBuyReportSchema.parse({ reportId: 'pro-horoscope', customerDetails: { ...person({ fullName: '  asha rao ' }), reportLanguage: 'en' } }), USER);
    expect(h.createProfile).toHaveBeenCalledTimes(1);
    expect(h.createOrder.mock.calls[1][0].items[0].metadata.birthProfileId).toBe('profile-1');
    // A different time of birth is a different chart.
    await h.service.buy(webBuyReportSchema.parse({ reportId: 'pro-horoscope', customerDetails: { ...person({ timeOfBirth: '14:31' }), reportLanguage: 'en' } }), USER);
    expect(h.createProfile).toHaveBeenCalledTimes(2);
    // The same details entered by another customer create that customer's own profile.
    await h.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', customerDetails: { ...person(), reportLanguage: 'en' } }), OTHER);
    expect(h.createProfile).toHaveBeenCalledTimes(3);
    expect(db.profiles[2].userId).toBe('cust-2');
  });

  it('never assumes India time for the birth place', async () => {
    const h = harness();
    const abroad = person({ birthPlace: 'New York, United States', latitude: 40.7128, longitude: -74.006, timezone: undefined });
    await expect(h.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', customerDetails: { ...abroad, reportLanguage: 'en' } }), USER)).rejects.toMatchObject({
      statusCode: 422,
      code: 'TIMEZONE_REQUIRED',
      details: [{ field: 'customerDetails.timezone' }],
    });
    expect(h.createOrder).not.toHaveBeenCalled();
    // After the place came from our place search, its zone is known.
    await h.timezones.remember(40.7128, -74.006, 'America/New_York');
    await h.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', customerDetails: { ...abroad, reportLanguage: 'en' } }), USER);
    expect(db.profiles[0]).toMatchObject({ timezone: 'America/New_York', latitude: 40.7128, longitude: -74.006 });
  });

  it('validates what the form sends', () => {
    const ok = (over: Record<string, unknown>) => webBuyReportSchema.safeParse({ reportId: 'mini-horoscope', customerDetails: { ...person(over), reportLanguage: 'en' } }).success;
    expect(ok({})).toBe(true);
    expect(ok({ dateOfBirth: '1990-02-31' })).toBe(false);
    expect(ok({ dateOfBirth: '2999-01-01' })).toBe(false);
    expect(ok({ timeOfBirth: '25:00' })).toBe(false);
    expect(ok({ latitude: 'north' })).toBe(false);
    expect(ok({ latitude: '' })).toBe(false);
    expect(ok({ longitude: 181 })).toBe(false);
    expect(ok({ email: 'not-an-email' })).toBe(false);
    expect(ok({ whatsappNumber: '123' })).toBe(false);
    expect(ok({ gender: 'x' })).toBe(false);
    expect(ok({ timezone: 'India' })).toBe(false);
    expect(webBuyReportSchema.safeParse({ reportId: 'mini-horoscope', reportType: 'career_pdf', customerDetails: { ...person(), reportLanguage: 'en' } }).success).toBe(false);
  });
});

describe('POST /web/reports/verify-payment', () => {
  it('goes through the one payment verification and cannot verify another customer\'s order', async () => {
    const h = harness();
    const bought = await h.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', customerDetails: { ...person(), reportLanguage: 'en' } }), USER);
    await expect(h.service.verifyPayment(verifyBody(bought.razorpayConfig.orderId), OTHER)).rejects.toBeInstanceOf(NotFoundError);
    expect(h.createReportJob).not.toHaveBeenCalled();
    await expect(h.service.ensureReportForOrder(bought.order._id, OTHER)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('is idempotent: a repeated verification creates no second report', async () => {
    const h = harness();
    const bought = await h.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', customerDetails: { ...person(), reportLanguage: 'en' } }), USER);
    await h.service.verifyPayment(verifyBody(bought.razorpayConfig.orderId), USER);
    await h.service.verifyPayment(verifyBody(bought.razorpayConfig.orderId), USER);
    expect(db.reports).toHaveLength(1);
    expect(await h.service.ensureReportForOrder(bought.order._id, USER)).toEqual({ created: [], existing: ['report-3'], completed: false });
  });

  it('a paid order stays paid when the report job cannot be created, and a later call creates it', async () => {
    const failing = harness({ reportJobFails: true });
    const bought = await failing.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', customerDetails: { ...person(), reportLanguage: 'en' } }), USER);
    const verified = await failing.service.verifyPayment(verifyBody(bought.razorpayConfig.orderId), USER);
    expect(verified).toMatchObject({ paymentStatus: 'paid', reportGenerationStatus: 'pending' });
    expect(db.reports).toHaveLength(0);

    const healthy = harness();
    expect((await healthy.service.ensureReportForOrder(bought.order._id, USER)).created).toHaveLength(1);
    expect(db.reports[0]).toMatchObject({ orderId: bought.order._id, language: 'en' });
  });

  it('does not create a report for an unpaid order or for an order that is not a website report order', async () => {
    const h = harness();
    const bought = await h.service.buy(webBuyReportSchema.parse({ reportId: 'mini-horoscope', customerDetails: { ...person(), reportLanguage: 'en' } }), USER);
    await expect(h.service.ensureReportForOrder(bought.order._id, USER)).rejects.toMatchObject({ statusCode: 409, code: 'ORDER_NOT_PAID' });
    db.orders.push({ id: 'app-order', userId: 'cust-1', status: 'PAID', items: [{ itemType: 'REPORT', catalogId: 'report-planetary-summary', metadata: { language: 'en' } }] });
    expect(await h.service.ensureReportForOrder('app-order', USER)).toEqual({ created: [], existing: [], completed: false });
    expect(h.createReportJob).not.toHaveBeenCalled();
  });
});

describe('GET /web/reports/orders: visible only after the report is delivered', () => {
  const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);
  const order = (id: string, userId: string, status = 'PAID', catalogId = 'report-planetary-summary') => ({
    id,
    userId,
    status,
    amount: 23482,
    currency: 'INR',
    createdAt: hoursAgo(72),
    items: [{ itemType: 'REPORT', catalogId, title: 'Planetary Dynamics & Dignity Summary', metadata: {} }],
  });
  const report = (id: string, orderId: string, userId: string, status: string, completedAt: Date | null, language = 'en', reportType = 'PLANETARY_SUMMARY') => ({
    id,
    orderId,
    userId,
    status,
    completedAt,
    language,
    reportType,
  });

  beforeEach(() => {
    db.orders = [
      order('o-delivered', 'cust-1'),
      order('o-waiting', 'cust-1'),
      order('o-generating', 'cust-1'),
      order('o-refunded', 'cust-1', 'REFUNDED'),
      order('o-other', 'cust-2'),
      order('o-match', 'cust-1', 'PAID', 'report-marriage'),
    ];
    db.reports = [
      report('r-delivered', 'o-delivered', 'cust-1', 'COMPLETED', hoursAgo(25), 'hi'),
      report('r-waiting', 'o-waiting', 'cust-1', 'COMPLETED', hoursAgo(23)),
      report('r-generating', 'o-generating', 'cust-1', 'ANALYZING', null),
      report('r-refunded', 'o-refunded', 'cust-1', 'COMPLETED', hoursAgo(100)),
      report('r-other', 'o-other', 'cust-2', 'COMPLETED', hoursAgo(100)),
      report('r-match', 'o-match', 'cust-1', 'COMPLETED', hoursAgo(48), 'en', 'MARRIAGE_COMPATIBILITY'),
    ];
  });

  it('lists only the buyer\'s reports that are completed and past the delivery delay', async () => {
    const h = harness({ delayHours: 24 });
    const rows = await h.service.listDeliveredOrders(USER);
    expect(rows.map((r) => r._id).sort()).toEqual(['o-delivered', 'o-match']);
    const delivered = rows.find((r) => r._id === 'o-delivered')!;
    expect(delivered).toMatchObject({
      reportId: { _id: 'report-planetary-summary', name: 'Mini Horoscope', slug: 'mini-horoscope', reportType: 'mini_horoscope_pdf' },
      reportType: 'mini_horoscope_pdf',
      reportLanguage: 'hi',
      reportStatus: 'completed',
      isReportSent: true,
      paymentStatus: 'paid',
      baseAmount: 234.82,
      reportUrl: 'https://files.example.test/signed/r-delivered?expires=900',
    });
    expect(rows.find((r) => r._id === 'o-match')!.reportId.name).toBe('Match Making');
    // A download link is requested only for what is shown, and only as this user.
    expect(h.getReportAccessUrl.mock.calls.map((c) => c[0]).sort()).toEqual(['r-delivered', 'r-match']);
    expect(h.getReportAccessUrl.mock.calls.every((c) => c[1] === USER)).toBe(true);
  });

  it('uses the configured delay: with no delay a completed report is listed at once', async () => {
    const rows = await harness({ delayHours: 0 }).service.listDeliveredOrders(USER);
    expect(rows.map((r) => r._id).sort()).toEqual(['o-delivered', 'o-match', 'o-waiting']);
    expect(await harness({ delayHours: 48 }).service.listDeliveredOrders(USER)).toHaveLength(1);
  });

  it('shows another customer nothing of this customer\'s', async () => {
    const rows = await harness().service.listDeliveredOrders(OTHER);
    expect(rows.map((r) => r._id)).toEqual(['o-other']);
  });
});

describe('routes', () => {
  let app: FastifyInstance;
  let token: string;
  const spies = {
    buy: vi.spyOn(webReportsService, 'buy'),
    verify: vi.spyOn(webReportsService, 'verifyPayment'),
    orders: vi.spyOn(webReportsService, 'listDeliveredOrders'),
  };

  beforeAll(async () => {
    app = Fastify();
    app.setErrorHandler(globalErrorHandler);
    await app.register(registerJwt);
    await app.register(webReportsRoutes, { prefix: '/web/reports' });
    await app.register(webReportsRoutes, { prefix: '/report' });
    await app.ready();
    token = app.jwt.sign({ sub: 'cust-1', role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    spies.buy.mockReset().mockResolvedValue({ order: {}, razorpayConfig: {} } as never);
    spies.verify.mockReset().mockResolvedValue({ paymentStatus: 'paid' } as never);
    spies.orders.mockReset().mockResolvedValue([]);
  });

  const call = (method: 'GET' | 'POST', url: string, auth?: string, payload?: object) =>
    app.inject({ method, url, headers: auth ? { authorization: `Bearer ${auth}` } : {}, ...(payload ? { payload } : {}) });

  it('the product list is public, in the website envelope, on both path sets', async () => {
    for (const url of ['/web/reports', '/report']) {
      const res = await call('GET', url);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ statusCode: 200, success: true, message: 'Reports fetched successfully' });
      expect(res.json().data).toHaveLength(4);
    }
    expect((await call('GET', '/report/slug/mini-horoscope')).json().data.slug).toBe('mini-horoscope');
    expect((await call('GET', '/report/report-marriage')).json().data.reportType).toBe('match_making_pdf');
    const missing = await call('GET', '/report/slug/nothing');
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it.each([
    ['GET', '/web/reports/orders'],
    ['POST', '/web/reports/buy'],
    ['POST', '/web/reports/verify-payment'],
    ['GET', '/report/orders'],
    ['POST', '/report/buy'],
    ['POST', '/report/verify-payment'],
  ] as const)('%s %s needs a login', async (method, url) => {
    const res = await call(method, url, undefined, method === 'POST' ? {} : undefined);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTHENTICATION_ERROR');
    expect(spies.buy).not.toHaveBeenCalled();
    expect(spies.verify).not.toHaveBeenCalled();
    expect(spies.orders).not.toHaveBeenCalled();
  });

  it('a blocked account cannot buy (finding 12)', async () => {
    db.blocked = true;
    const res = await call('POST', '/report/buy', token, { reportId: 'mini-horoscope', customerDetails: { ...person(), reportLanguage: 'en' } });
    expect(res.statusCode).toBe(403);
    expect(spies.buy).not.toHaveBeenCalled();
  });

  it('passes the validated form and the logged-in user to the service, and ignores what is not part of the form', async () => {
    const res = await call('POST', '/report/buy', token, {
      reportId: 'mini-horoscope',
      currencyRate: 0.0001,
      customerDetails: { ...person(), reportLanguage: 'hi' },
    });
    expect(res.statusCode).toBe(200);
    const [input, user] = spies.buy.mock.calls[0];
    expect(user).toEqual({ id: 'cust-1', role: 'USER' });
    expect(input).not.toHaveProperty('currencyRate');
    expect(input.customerDetails).toMatchObject({ reportLanguage: 'hi', latitude: 28.6139, longitude: 77.209, dateOfBirth: '1990-05-15', timeOfBirth: '14:30:00' });

    // The website also posts its whole form to verify-payment; only the three gateway fields are read.
    const verified = await call('POST', '/report/verify-payment', token, { ...verifyBody('rzp_order_1'), reportId: 'x', formData: { fullName: 'Asha' } });
    expect(verified.statusCode).toBe(200);
    expect(spies.verify.mock.calls[0][0]).toEqual(verifyBody('rzp_order_1'));

    const bad = await call('POST', '/report/buy', token, { reportId: 'mini-horoscope', customerDetails: { ...person({ latitude: 'x' }), reportLanguage: 'hi' } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe('VALIDATION_ERROR');
    expect((await call('POST', '/report/verify-payment', token, { razorpay_order_id: 'only' })).statusCode).toBe(400);
  });

  it('the order list is never cached by a browser or proxy', async () => {
    const res = await call('GET', '/report/orders', token);
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(spies.orders).toHaveBeenCalledWith({ id: 'cust-1', role: 'USER' });
  });
});
