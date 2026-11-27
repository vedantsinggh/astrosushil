/**
 * Invoice PDF endpoints: who may download, what the renderer is given, and the abuse guards.
 * Prisma and the XeLaTeX renderer are substituted; no database and no compile (the real compile is
 * tested in packages/report-engine/src/__tests__/invoice-pdf.test.ts).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';

const { mockPrisma, renderInvoicePdf, InvoicePdfError } = vi.hoisted(() => {
  class HoistedInvoicePdfError extends Error {
    constructor(
      public readonly kind: 'timeout' | 'unavailable' | 'compile',
      message: string,
      public readonly texError: string | null = null
    ) {
      super(message);
    }
  }
  return {
    mockPrisma: {
      order: { findUnique: vi.fn() },
      invoice: { findUnique: vi.fn() },
      paymentTransaction: { findFirst: vi.fn() },
      consultationBooking: { findFirst: vi.fn() },
      user: { findUnique: vi.fn() },
      siteSetting: { findUnique: vi.fn(async () => null) },
      product: { findMany: vi.fn(async () => []) },
      reportCatalogEntry: { findMany: vi.fn(async () => []) },
    },
    renderInvoicePdf: vi.fn(),
    InvoicePdfError: HoistedInvoicePdfError,
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mockPrisma }));
vi.mock('../../src/modules/admin/admin.service', () => ({ adminService: { logAction: vi.fn(async () => undefined) } }));
vi.mock('../../src/modules/invoices/invoice-recovery.sweep', () => ({ settlePaidOrderForRecovery: vi.fn() }));
vi.mock('@astro/report-engine', () => ({ invoicePdf: { renderInvoicePdf, InvoicePdfError } }));

import { globalErrorHandler } from '../../src/errors/error-handler';
import { AuthorizationError } from '../../src/errors/app-error';
import { invoicesRoutes } from '../../src/modules/invoices/invoices.routes';
import { INVOICE_PDF_LIMITS, InvoicePdfService, invoicePdfService } from '../../src/modules/invoices/invoice-pdf.service';
import { INVOICE_LABEL_BEING_PREPARED, INVOICE_LABEL_NOT_ISSUED } from '../../src/modules/invoices/invoice-number';
import { resetSellerDetailsProvider, setSellerDetailsProvider } from '../../src/modules/invoices/seller';
import { invalidateStaffAccessCache } from '../../src/modules/admin/rbac/rbac.resolver';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const STAFF_ID = '33333333-3333-4333-8333-333333333333';
const ORDER_ID = '5f1c2f0e-8d0a-4a51-9b1e-3c2a7d9e4f10';
const GSTIN = '09ABFCA5917P1Z2';
const PDF = Buffer.from('%PDF-1.5 test invoice');

const seller = {
  legalName: 'Astro Sushil Private Limited',
  tagline: null,
  address: 'Sector 121, Gautam Buddha Nagar',
  gstin: GSTIN,
  state: 'Uttar Pradesh',
  email: null,
  phone: null,
  website: null,
};

type ItemType = 'PRODUCT' | 'CONSULTATION' | 'REPORT';

function orderRow(itemType: ItemType = 'PRODUCT', overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    userId: OWNER_ID,
    amount: 118000,
    discountAmount: 0,
    shippingAmount: 0,
    status: 'PAID',
    paymentStatus: 'PAID',
    paidAt: new Date('2026-11-24T06:00:00.000Z'),
    createdAt: new Date('2026-11-24T05:55:00.000Z'),
    paidCurrency: 'INR',
    paidAmountMinor: null,
    exchangeRate: null,
    paymentMethod: 'RAZORPAY',
    razorpayPaymentId: 'pay_Test0000000001',
    shippingAddress: null,
    user: { fullName: 'Asha & Verma {100%}', email: 'asha@example.test', phoneNumber: '+919811111111' },
    items: [
      { itemType, title: 'Career Report', description: null, quantity: 1, unitPrice: 118000, taxRate: 1800, taxInclusive: true, taxAmount: 18000, totalAmount: 118000 },
    ],
    ...overrides,
  };
}

function staffUser(permissions: string[]) {
  return {
    id: STAFF_ID,
    email: 'staff@example.test',
    role: 'SUPPORT',
    staffProfile: {
      status: 'ACTIVE',
      isDeleted: false,
      role: { id: 'role-1', name: 'Role', slug: 'role', isSuperAdmin: false, status: 'ACTIVE', permissions },
    },
  };
}

let app: FastifyInstance;

const as = (id: string, role: string = 'USER') => ({ 'x-test-user': id, 'x-test-role': role });
const customerPdf = (id: string = OWNER_ID, orderId: string = ORDER_ID) =>
  app.inject({ method: 'GET', url: `/api/v1/invoices/orders/${orderId}/pdf`, headers: as(id) });
const adminPdf = (role: string = 'SUPPORT') =>
  app.inject({ method: 'GET', url: `/api/v1/admin/invoices/orders/${ORDER_ID}/pdf`, headers: as(STAFF_ID, role) });
const rendered = () => renderInvoicePdf.mock.calls[0][0];

beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(globalErrorHandler);
  app.decorateRequest('user', null);
  // Stand-ins for the JWT plugin: the token only yields the user id and the coarse role.
  app.decorate('authenticate', async (request: FastifyRequest) => {
    (request as unknown as { user: { id: string; role: string } }).user = {
      id: String(request.headers['x-test-user']),
      role: String(request.headers['x-test-role']),
    };
  });
  app.decorate('authorize', (roles: string[]) => async (request: FastifyRequest) => {
    if (!roles.includes((request as unknown as { user: { role: string } }).user.role)) throw new AuthorizationError();
  });
  await app.register(invoicesRoutes, { prefix: '/api/v1' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  resetSellerDetailsProvider();
});

beforeEach(() => {
  for (const group of Object.values(mockPrisma)) for (const mock of Object.values(group)) mock.mockReset();
  renderInvoicePdf.mockReset();
  renderInvoicePdf.mockResolvedValue(PDF);
  invoicePdfService.reset();
  invalidateStaffAccessCache();
  setSellerDetailsProvider({ get: () => seller });

  mockPrisma.order.findUnique.mockResolvedValue(orderRow());
  mockPrisma.invoice.findUnique.mockResolvedValue({ number: 'INV-AS/118', status: 'ALLOCATED', saleType: 'ORDER', legacyId: null });
  mockPrisma.paymentTransaction.findFirst.mockResolvedValue(null);
  mockPrisma.consultationBooking.findFirst.mockResolvedValue(null);
  mockPrisma.user.findUnique.mockResolvedValue(staffUser(['transactions:read']));
});

describe('customer invoice PDF', () => {
  it('returns the PDF to the owner of the order', async () => {
    const response = await customerPdf();
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toBe(`attachment; filename="invoice-${ORDER_ID}.pdf"`);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.rawPayload.equals(PDF)).toBe(true);

    expect(renderInvoicePdf).toHaveBeenCalledTimes(1);
    expect(rendered()).toMatchObject({
      invoiceNumber: 'INV-AS/118',
      numberAllocated: true,
      saleType: 'order',
      orderId: ORDER_ID,
      seller: { gstin: GSTIN, legalName: 'Astro Sushil Private Limited' },
      placeOfSupply: 'Uttar Pradesh',
      reverseCharge: false,
      // Passed on untouched: escaping is the renderer's job, not the caller's.
      customer: { name: 'Asha & Verma {100%}' },
      payment: { status: 'paid', method: 'razorpay', gatewayPaymentId: 'pay_Test0000000001', currency: 'INR', amountMinor: 118000, minorUnitExponent: 2 },
      lines: [{ title: 'Career Report', unitPricePaise: 118000, lineTotalPaise: 118000, taxRateBp: 1800, taxInclusive: true, taxPaise: 18000, taxablePaise: 100000 }],
      totals: { subTotalPaise: 118000, taxPaise: 18000, grandTotalPaise: 118000, taxByRate: [{ rateBp: 1800, taxPaise: 18000, inclusive: true }] },
    });
    expect(renderInvoicePdf.mock.calls[0][1]).toEqual({ timeoutMs: INVOICE_PDF_LIMITS.timeoutMs });
  });

  it("answers 'not found' for another customer's order and compiles nothing", async () => {
    const response = await customerPdf(OTHER_ID);
    expect(response.statusCode).toBe(404);
    expect(response.json().error).toMatchObject({ code: 'NOT_FOUND', message: 'Order not found' });
    expect(renderInvoicePdf).not.toHaveBeenCalled();
  });

  it("answers 'not found' for an order that does not exist", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    const response = await customerPdf();
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
    expect(renderInvoicePdf).not.toHaveBeenCalled();
  });

  it('refuses an order id that is not a UUID before touching the database', async () => {
    const response = await customerPdf(OWNER_ID, 'not-a-uuid');
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
  });

  it('answers 503 when the seller details are not configured', async () => {
    resetSellerDetailsProvider();
    const saved = { ...process.env };
    for (const key of Object.keys(process.env)) if (key.startsWith('INVOICE_SELLER_')) delete process.env[key];
    try {
      const response = await customerPdf();
      expect(response.statusCode).toBe(503);
      expect(response.json().error.code).toBe('INVOICE_SELLER_UNCONFIGURED');
      expect(renderInvoicePdf).not.toHaveBeenCalled();
    } finally {
      process.env = saved;
    }
  });
});

describe('admin invoice PDF', () => {
  it('returns the PDF of any order to staff holding transactions:read', async () => {
    const response = await adminPdf();
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.rawPayload.equals(PDF)).toBe(true);
    expect(rendered().orderId).toBe(ORDER_ID);
  });

  it('refuses staff without the permission', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(staffUser(['gst_report:read']));
    const response = await adminPdf();
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('AUTHORIZATION_ERROR');
    expect(renderInvoicePdf).not.toHaveBeenCalled();
    expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a customer account on the admin route, even for their own order', async () => {
    const response = await app.inject({ method: 'GET', url: `/api/v1/admin/invoices/orders/${ORDER_ID}/pdf`, headers: as(OWNER_ID, 'USER') });
    expect(response.statusCode).toBe(403);
    expect(renderInvoicePdf).not.toHaveBeenCalled();
  });

  it("answers 'not found' for an order that does not exist", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    const response = await adminPdf();
    expect(response.statusCode).toBe(404);
    expect(renderInvoicePdf).not.toHaveBeenCalled();
  });
});

describe('sales without an allocated number', () => {
  it("prints 'Invoice being prepared' on a paid product order whose number is pending", async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({ number: null, status: 'PENDING', saleType: 'ORDER', legacyId: null });
    expect((await customerPdf()).statusCode).toBe(200);
    expect(rendered()).toMatchObject({ invoiceNumber: INVOICE_LABEL_BEING_PREPARED, numberAllocated: false });
  });

  it("prints 'No invoice issued' on a product order that has no invoice", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(orderRow('PRODUCT', { paidAt: null, paymentStatus: 'PENDING', status: 'PENDING', razorpayPaymentId: null }));
    mockPrisma.invoice.findUnique.mockResolvedValue(null);
    expect((await customerPdf()).statusCode).toBe(200);
    expect(rendered()).toMatchObject({ invoiceNumber: INVOICE_LABEL_NOT_ISSUED, numberAllocated: false, payment: { status: 'pending' } });
  });

  it('prints the historical INV-<last 8 characters> label on a consultation the website never numbered', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(orderRow('CONSULTATION'));
    mockPrisma.invoice.findUnique.mockResolvedValue({ number: null, status: 'NOT_REQUIRED', saleType: 'CONSULTATION', legacyId: '665f1c2f0e8d0a4a519b1e3c' });
    expect((await customerPdf()).statusCode).toBe(200);
    expect(rendered()).toMatchObject({ invoiceNumber: 'INV-519B1E3C', numberAllocated: false, saleType: 'consultation' });
  });

  it.each(['CONSULTATION', 'REPORT'] as const)('refuses a %s whose number is still being allocated, as the website does', async (saleType) => {
    mockPrisma.order.findUnique.mockResolvedValue(orderRow(saleType));
    mockPrisma.invoice.findUnique.mockResolvedValue({ number: null, status: 'PENDING', saleType, legacyId: null });
    const response = await customerPdf();
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toMatchObject({ code: 'INVOICE_BEING_PREPARED', message: 'Invoice is being prepared. Please try again shortly.' });
    expect(renderInvoicePdf).not.toHaveBeenCalled();
  });
});

describe('what the PDF adds to the invoice data', () => {
  it('gives the appointment of a consultation booking', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(orderRow('CONSULTATION'));
    mockPrisma.invoice.findUnique.mockResolvedValue({ number: 'INV-AS/07', status: 'ALLOCATED', saleType: 'CONSULTATION', legacyId: null });
    mockPrisma.consultationBooking.findFirst.mockResolvedValue({ date: '2026-12-02', startTime: '10:00', endTime: '10:45', mode: 'VIDEO', durationMinutes: 45 });
    expect((await customerPdf()).statusCode).toBe(200);
    expect(mockPrisma.consultationBooking.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { orderId: ORDER_ID } }));
    expect(rendered().consultation).toEqual({ date: '2026-12-02', slot: '10:00-10:45', mode: 'VIDEO', durationMinutes: 45 });
  });

  it('does not look for a booking on other sales', async () => {
    await customerPdf();
    expect(mockPrisma.consultationBooking.findFirst).not.toHaveBeenCalled();
    expect(rendered().consultation).toBeUndefined();
  });

  it('passes the charged currency, amount, rate and the currency decimals of a foreign sale', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(orderRow('REPORT', { paidCurrency: 'JPY', paidAmountMinor: 2150, exchangeRate: { toString: () => '1.8220338983' } }));
    mockPrisma.invoice.findUnique.mockResolvedValue({ number: 'INV-AS/119', status: 'ALLOCATED', saleType: 'REPORT', legacyId: null });
    expect((await customerPdf()).statusCode).toBe(200);
    expect(rendered()).toMatchObject({
      payment: { currency: 'JPY', amountMinor: 2150, exchangeRate: '1.8220338983', minorUnitExponent: 0 },
      totals: { grandTotalPaise: 118000 },
    });
  });
});

describe('abuse guards', () => {
  it('limits downloads per customer per minute', async () => {
    for (let i = 0; i < INVOICE_PDF_LIMITS.customerPerWindow; i++) expect((await customerPdf()).statusCode).toBe(200);
    const refused = await customerPdf();
    expect(refused.statusCode).toBe(429);
    expect(refused.json().error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(renderInvoicePdf).toHaveBeenCalledTimes(INVOICE_PDF_LIMITS.customerPerWindow);
  });

  it('counts refused requests too, so probing other orders is limited', async () => {
    for (let i = 0; i < INVOICE_PDF_LIMITS.customerPerWindow; i++) expect((await customerPdf(OTHER_ID)).statusCode).toBe(404);
    expect((await customerPdf(OTHER_ID)).statusCode).toBe(429);
  });

  it('opens the window again after a minute, per user', async () => {
    let now = 1_000_000;
    const service = new InvoicePdfService({ render: async () => PDF, now: () => now });
    const owner = { id: OWNER_ID };
    for (let i = 0; i < INVOICE_PDF_LIMITS.customerPerWindow; i++) await service.getInvoicePdf(ORDER_ID, owner);
    await expect(service.getInvoicePdf(ORDER_ID, owner)).rejects.toMatchObject({ statusCode: 429 });
    // Another user is not affected (this one is refused for ownership, not for the limit).
    await expect(service.getInvoicePdf(ORDER_ID, { id: OTHER_ID })).rejects.toMatchObject({ statusCode: 404 });
    now += INVOICE_PDF_LIMITS.windowMs + 1;
    await expect(service.getInvoicePdf(ORDER_ID, owner)).resolves.toMatchObject({ filename: `invoice-${ORDER_ID}.pdf` });
  });

  it('compiles an order once while a compile for it is running', async () => {
    let finish: (pdf: Buffer) => void = () => undefined;
    const render = vi.fn(() => new Promise<Buffer>((resolve) => (finish = resolve)));
    const service = new InvoicePdfService({ render });
    const first = service.getInvoicePdf(ORDER_ID, { id: OWNER_ID });
    const second = service.getInvoicePdf(ORDER_ID, { id: STAFF_ID }, true);
    await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(render).toHaveBeenCalledTimes(1);
    finish(PDF);
    expect((await first).pdf.equals(PDF)).toBe(true);
    expect((await second).pdf.equals(PDF)).toBe(true);

    // Once it has finished, the next request compiles again: nothing is kept.
    render.mockResolvedValueOnce(PDF);
    await service.getInvoicePdf(ORDER_ID, { id: OWNER_ID });
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('runs a bounded number of compiles at once, queues a few and turns the rest away', async () => {
    const orders = ['a', 'b', 'c', 'd'].map((letter) => `${letter.repeat(8)}-0000-4000-8000-000000000000`);
    mockPrisma.order.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => orderRow('PRODUCT', { id: where.id }));
    const finishers: Array<(pdf: Buffer) => void> = [];
    const render = vi.fn(() => new Promise<Buffer>((resolve) => finishers.push(resolve)));
    const service = new InvoicePdfService({ render, limits: { maxConcurrent: 2, maxQueued: 1 } });

    const jobs = orders.slice(0, 3).map((orderId) => service.getInvoicePdf(orderId, { id: OWNER_ID }));
    await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(render).toHaveBeenCalledTimes(2); // the third waits

    await expect(service.getInvoicePdf(orders[3], { id: OWNER_ID })).rejects.toMatchObject({ statusCode: 503, code: 'INVOICE_PDF_BUSY' });

    finishers[0](PDF);
    await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(3));
    finishers[1](PDF);
    finishers[2](PDF);
    await expect(Promise.all(jobs)).resolves.toHaveLength(3);

    // All slots are free again.
    render.mockResolvedValue(PDF);
    await expect(service.getInvoicePdf(orders[3], { id: OWNER_ID })).resolves.toBeDefined();
  });

  it.each([
    ['timeout', 503, 'INVOICE_PDF_TIMEOUT'],
    ['unavailable', 503, 'INVOICE_PDF_UNAVAILABLE'],
    ['compile', 500, 'INVOICE_PDF_FAILED'],
  ] as const)('answers a %s of the compile with the standard error shape and no detail', async (kind, status, code) => {
    renderInvoicePdf.mockRejectedValue(new InvoicePdfError(kind, 'internal detail /tmp/as-invoice-x', '! Undefined control sequence.'));
    const response = await customerPdf();
    expect(response.statusCode).toBe(status);
    const body = response.json();
    expect(body.error.code).toBe(code);
    expect(JSON.stringify(body)).not.toMatch(/as-invoice|Undefined control|Asha/);

    // A failed compile does not block the order: the next request compiles again.
    renderInvoicePdf.mockResolvedValue(PDF);
    expect((await customerPdf()).statusCode).toBe(200);
  });
});
