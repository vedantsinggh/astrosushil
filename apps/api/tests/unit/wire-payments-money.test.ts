/**
 * Money-module pieces of the payment wiring:
 *   item 4  `restateConsultationOrder` (plan change: order, line and ledger row re-stated together,
 *           invoice number kept);
 *   item 1  `recordCaptureForCancelledOrder` (money captured for a cancelled order) and the staff list;
 *   item 5  the automatic invoice recovery sweep.
 * The database is an in-memory stand-in; nothing external is called.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  prisma: {
    invoiceCounter: { findUnique: vi.fn() },
    paymentTransaction: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    order: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    // commerce-decisions: the ledger views also read the refunds of each order (none here).
    refund: { findMany: vi.fn(async () => []) },
    $queryRaw: vi.fn(),
  },
  invoiceService: { isPaused: vi.fn(), allocatePending: vi.fn(), allocateForPaidOrder: vi.fn() },
}));

vi.mock('../../src/services/prisma.service', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/modules/invoices/invoice.service', () => ({ invoiceService: mocks.invoiceService }));

import { restateConsultationOrder, restatePaidAmountMinor } from '../../src/modules/commerce/money/restatement';
import { recordCaptureForCancelledOrder } from '../../src/modules/commerce/money/settlement';
import { transactionsService } from '../../src/modules/transactions/transactions.service';
import { buildAttemptData } from '../../src/modules/transactions/ledger';
import { computeGst } from '../../src/modules/consultations/consultation-gst';
import {
  InvoiceRecoveryScheduler,
  invoiceRecoveryIntervalMs,
  settlePaidOrderForRecovery,
} from '../../src/modules/invoices/invoice-recovery.sweep';
import { AppError, NotFoundError } from '../../src/errors/app-error';

type Row = Record<string, unknown>;

/** A transaction client over one order, its lines, its ledger rows and its invoice. */
function fakeDb(seed: { order: Row | null; items?: Row[]; ledger?: Row[]; invoice?: Row | null }) {
  const db = {
    order: seed.order ? { ...seed.order } : null,
    items: (seed.items ?? []).map((item) => ({ ...item })),
    ledger: (seed.ledger ?? []).map((row) => ({ ...row })),
    invoice: seed.invoice ?? null,
    audit: [] as Row[],
    locks: [] as string[],
  };
  const withItems = () => (db.order ? { ...db.order, items: db.items.map((item) => ({ ...item })), shippingAddress: null } : null);
  const tx = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      db.locks.push(sql.includes('"order_items"') ? 'order_items' : 'orders');
      return sql.includes('"order_items"') ? db.items.map((item) => ({ id: item.id })) : db.order ? [{ id: db.order.id }] : [];
    }),
    order: {
      findUnique: vi.fn(async () => withItems()),
      update: vi.fn(async ({ data }: { data: Row }) => {
        Object.assign(db.order as Row, data);
        return withItems();
      }),
    },
    orderItem: {
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Row }) => {
        const item = db.items.find((candidate) => candidate.id === where.id) as Row;
        Object.assign(item, data);
        return item;
      }),
    },
    paymentTransaction: {
      findFirst: vi.fn(async () => db.ledger[db.ledger.length - 1] ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Row }) => {
        const row = db.ledger.find((candidate) => candidate.id === where.id) as Row;
        Object.assign(row, data);
        return row;
      }),
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { id: `txn-${db.ledger.length + 1}`, ...data };
        db.ledger.push(row);
        return row;
      }),
    },
    invoice: { findUnique: vi.fn(async () => db.invoice), update: vi.fn(), create: vi.fn() },
    invoiceCounter: { update: vi.fn() },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        db.audit.push(data);
        return data;
      }),
    },
  };
  return { db, tx: tx as unknown as Prisma.TransactionClient, raw: tx };
}

/** A paid Rs 10,000 (GST inside) audio consultation, as checkout and settlement leave it. */
function paidConsultation(orderOverrides: Row = {}) {
  const order: Row = {
    id: 'order-1', userId: 'user-1', razorpayOrderId: 'order_rzp_1', razorpayPaymentId: 'pay_1',
    amount: 900000, subtotal: 762712, taxAmount: 137288, discountAmount: 100000, shippingAmount: 0,
    currency: 'INR', paidCurrency: 'INR', paidAmountMinor: 900000, exchangeRate: new Prisma.Decimal(1),
    paymentMethod: 'RAZORPAY', status: 'PAID', paidAt: new Date('2026-11-20T10:00:00.000Z'),
    ...orderOverrides,
  };
  const items: Row[] = [
    { id: 'item-1', orderId: 'order-1', itemType: 'CONSULTATION', catalogId: 'consult-general-audio', title: 'General Consultation (Audio)', description: 'old', quantity: 1, unitPrice: 1000000, taxRate: 1800, taxAmount: 137288, taxInclusive: true, totalAmount: 900000 },
  ];
  const ledger: Row[] = [
    {
      id: 'txn-1', orderId: 'order-1', userId: 'user-1', type: 'CONSULTATION', status: 'SUCCESS', method: 'RAZORPAY',
      amountMinor: order.paidAmountMinor, currency: order.paidCurrency, baseAmountPaise: 900000, subtotalPaise: 1000000, shippingPaise: 0,
      taxPaise: 137288, taxRateBp: 1800, taxInclusive: true, discountPaise: 100000,
      gatewayPaymentId: 'pay_1', gatewayOrderId: 'order_rzp_1', placeOfSupply: 'Delhi', customerName: 'Asha',
      createdAt: new Date('2026-11-20T09:59:00.000Z'),
    },
  ];
  return { order, items, ledger };
}

/** The plan the bookings module passes for a consultation mode (same arithmetic as `changePlan`). */
function planOf(pricePaise: number, gstType: 'INCLUSIVE' | 'EXCLUSIVE', rateBp = 1800) {
  const pricing = computeGst(pricePaise, { enabled: true, rateBasisPoints: rateBp, type: gstType });
  return {
    catalogId: 'consult-general-video', title: 'General Consultation (Video)', description: 'new',
    unitPricePaise: pricePaise, taxRateBp: pricing.rateBasisPoints, taxInclusive: pricing.type === 'INCLUSIVE',
    taxablePaise: pricing.taxablePaise, taxPaise: pricing.gstPaise, totalPaise: pricing.totalPaise,
  };
}

/** The ledger row must say exactly what the order says. */
function expectLedgerMatchesOrder(db: ReturnType<typeof fakeDb>['db']) {
  const order = { ...(db.order as Row), items: db.items } as unknown as Parameters<typeof buildAttemptData>[0];
  const expected = buildAttemptData(order);
  const row = db.ledger[db.ledger.length - 1];
  expect(row).toMatchObject({
    amountMinor: expected.amountMinor,
    baseAmountPaise: expected.baseAmountPaise,
    subtotalPaise: expected.subtotalPaise,
    shippingPaise: expected.shippingPaise,
    taxPaise: expected.taxPaise,
    taxRateBp: expected.taxRateBp,
    taxInclusive: expected.taxInclusive,
    discountPaise: expected.discountPaise,
  });
  expect(row.baseAmountPaise).toBe((db.order as Row).amount);
  expect(row.taxPaise).toBe((db.order as Row).taxAmount);
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.INVOICE_RECOVERY_INTERVAL_MS;
  delete process.env.INVOICE_RECOVERY_BATCH;
  delete process.env.INVOICE_RECOVERY_ENABLED;
});

describe('restateConsultationOrder (booking plan change)', () => {
  it('re-states the order, its line and the ledger row to the new plan; the old discount goes', async () => {
    const { db, tx } = fakeDb(paidConsultation());
    const plan = planOf(1500000, 'EXCLUSIVE');
    const result = await restateConsultationOrder(tx, 'order-1', plan);

    expect(db.order).toMatchObject({ amount: 1770000, subtotal: 1500000, taxAmount: 270000, discountAmount: 0, paidAmountMinor: 1770000, status: 'PAID' });
    expect(db.items[0]).toMatchObject({
      catalogId: 'consult-general-video', title: 'General Consultation (Video)', description: 'new',
      unitPrice: 1500000, taxRate: 1800, taxAmount: 270000, taxInclusive: false, totalAmount: 1770000, quantity: 1,
    });
    expect(db.ledger).toHaveLength(1);
    expect(db.ledger[0]).toMatchObject({
      amountMinor: 1770000, baseAmountPaise: 1770000, subtotalPaise: 1500000, taxPaise: 270000, taxRateBp: 1800, taxInclusive: false, discountPaise: 0,
    });
    expectLedgerMatchesOrder(db);
    expect(result).toMatchObject({ previousAmountPaise: 900000, amountPaise: 1770000, paidAmountMinor: 1770000, transactionId: 'txn-1', transactionCreated: false, invoiceNumber: null });
  });

  it('leaves the payment facts of the ledger row alone (nothing was charged or refunded)', async () => {
    const { db, tx } = fakeDb(paidConsultation());
    await restateConsultationOrder(tx, 'order-1', planOf(3000000, 'INCLUSIVE'));
    expect(db.ledger[0]).toMatchObject({
      status: 'SUCCESS', method: 'RAZORPAY', type: 'CONSULTATION', gatewayPaymentId: 'pay_1', gatewayOrderId: 'order_rzp_1',
      placeOfSupply: 'Delhi', customerName: 'Asha', currency: 'INR',
    });
    expect(db.order).toMatchObject({ razorpayPaymentId: 'pay_1', paidAt: new Date('2026-11-20T10:00:00.000Z') });
  });

  it('ledger equals order for inclusive, exclusive, untaxed and odd-paise plans', async () => {
    const plans = [
      planOf(3000000, 'INCLUSIVE'),
      planOf(1999999, 'EXCLUSIVE'),
      planOf(1234567, 'INCLUSIVE', 500),
      planOf(250000, 'INCLUSIVE', 0),
      planOf(1, 'EXCLUSIVE'),
    ];
    for (const plan of plans) {
      const { db, tx } = fakeDb(paidConsultation());
      await restateConsultationOrder(tx, 'order-1', plan);
      expectLedgerMatchesOrder(db);
      expect((db.order as Row).amount).toBe(plan.totalPaise);
      expect(db.items[0].totalAmount).toBe((db.order as Row).amount);
    }
  });

  it('an untaxed plan clears the GST rate and type on the ledger row', async () => {
    const { db, tx } = fakeDb(paidConsultation());
    await restateConsultationOrder(tx, 'order-1', planOf(250000, 'INCLUSIVE', 0));
    expect(db.ledger[0]).toMatchObject({ taxPaise: 0, taxRateBp: 0, taxInclusive: false, baseAmountPaise: 250000 });
  });

  it('keeps an invoice number that was already issued, touches neither the invoice nor the counter, and reports it', async () => {
    const invoice = { id: 'inv-1', orderId: 'order-1', number: 'INV-AS/118', sequence: 118n, status: 'ALLOCATED' };
    const { db, tx, raw } = fakeDb({ ...paidConsultation(), invoice });
    const result = await restateConsultationOrder(tx, 'order-1', planOf(1500000, 'EXCLUSIVE'));
    expect(result.invoiceNumber).toBe('INV-AS/118');
    expect(db.invoice).toEqual(invoice);
    expect(raw.invoice.update).not.toHaveBeenCalled();
    expect(raw.invoice.create).not.toHaveBeenCalled();
    expect(raw.invoiceCounter.update).not.toHaveBeenCalled();
    expect(mocks.invoiceService.allocateForPaidOrder).not.toHaveBeenCalled();
  });

  it('a pending invoice stays pending: no number is issued by a plan change', async () => {
    const { tx, raw } = fakeDb({ ...paidConsultation(), invoice: { id: 'inv-1', orderId: 'order-1', number: null, status: 'PENDING' } });
    const result = await restateConsultationOrder(tx, 'order-1', planOf(1500000, 'EXCLUSIVE'));
    expect(result.invoiceNumber).toBeNull();
    expect(raw.invoice.update).not.toHaveBeenCalled();
  });

  it('a foreign-currency sale is re-stated at the rate stored when it was paid', async () => {
    const usd = paidConsultation({ paidCurrency: 'USD', paidAmountMinor: 10786, exchangeRate: new Prisma.Decimal('0.0119843200') });
    usd.ledger[0].exchangeRate = new Prisma.Decimal('0.0119843200');
    const { db, tx } = fakeDb(usd);
    const result = await restateConsultationOrder(tx, 'order-1', planOf(1500000, 'EXCLUSIVE'));
    // Rs 17,700.00 x 0.01198432 = USD 212.122464 -> 21212 cents
    expect(result.paidAmountMinor).toBe(21212);
    expect(db.order).toMatchObject({ amount: 1770000, paidAmountMinor: 21212, paidCurrency: 'USD' });
    expect(db.ledger[0]).toMatchObject({ amountMinor: 21212, baseAmountPaise: 1770000, currency: 'USD' });
    expectLedgerMatchesOrder(db);
  });

  it('yen is whole yen, and the booking module gets the same figure from the same helper', () => {
    // Rs 17,700.00 x 1.75 = JPY 30,975 (not 3,097,500)
    expect(restatePaidAmountMinor(1770000, 'JPY', '1.75', 5000)).toBe(30975);
    expect(restatePaidAmountMinor(1770000, 'USD', new Prisma.Decimal('0.0119843200'), 1)).toBe(21212);
    expect(restatePaidAmountMinor(1770000, 'INR', 1, 900000)).toBe(900000);
    expect(restatePaidAmountMinor(1770000, null, null, null)).toBeNull();
    expect(restatePaidAmountMinor(1770000, 'USD', null, 4321)).toBe(4321);
    expect(() => restatePaidAmountMinor(1770000, 'XYZ', '2', 1)).toThrow(AppError);
  });

  it('an order with no ledger row gets one (website: legacy booking without a transaction)', async () => {
    const { db, tx } = fakeDb({ ...paidConsultation(), ledger: [] });
    const result = await restateConsultationOrder(tx, 'order-1', planOf(1500000, 'EXCLUSIVE'));
    expect(result.transactionCreated).toBe(true);
    expect(db.ledger).toHaveLength(1);
    expect(db.ledger[0]).toMatchObject({ status: 'SUCCESS', orderId: 'order-1', gatewayPaymentId: 'pay_1', type: 'CONSULTATION' });
    expectLedgerMatchesOrder(db);
  });

  it('locks the order row, then its lines, before reading', async () => {
    const { db, tx, raw } = fakeDb(paidConsultation());
    await restateConsultationOrder(tx, 'order-1', planOf(1500000, 'EXCLUSIVE'));
    expect(db.locks).toEqual(['orders', 'order_items']);
    expect(raw.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(raw.order.findUnique.mock.invocationCallOrder[0]);
  });

  it('refuses, writing nothing: unpaid, refunded, not a single consultation, unknown order, impossible figures', async () => {
    const cases: Array<[Row, RegExp | typeof NotFoundError]> = [
      [{ ...paidConsultation({ status: 'PENDING', paidAt: null }) }, /Only a paid order/],
      [{ ...paidConsultation({ status: 'CANCELLED', paidAt: null }) }, /Only a paid order/],
      [{ ...paidConsultation({ status: 'PARTIALLY_REFUNDED' }) }, /refund against it/],
      [{ ...paidConsultation({ status: 'REFUNDED' }) }, /refund against it/],
    ];
    for (const [seed, message] of cases) {
      const { db, tx, raw } = fakeDb(seed as Parameters<typeof fakeDb>[0]);
      await expect(restateConsultationOrder(tx, 'order-1', planOf(1500000, 'EXCLUSIVE'))).rejects.toThrow(message as RegExp);
      expect(raw.order.update).not.toHaveBeenCalled();
      expect(raw.orderItem.update).not.toHaveBeenCalled();
      expect(raw.paymentTransaction.update).not.toHaveBeenCalled();
      expect(db.ledger[0].baseAmountPaise).toBe(900000);
    }

    const mixed = paidConsultation();
    mixed.items.push({ id: 'item-2', orderId: 'order-1', itemType: 'REPORT', quantity: 1, unitPrice: 49900, taxRate: 1800, taxAmount: 7612, taxInclusive: true, totalAmount: 49900 });
    const two = fakeDb(mixed);
    await expect(restateConsultationOrder(two.tx, 'order-1', planOf(1500000, 'EXCLUSIVE'))).rejects.toThrow(/single consultation/);
    expect(two.raw.order.update).not.toHaveBeenCalled();

    const product = paidConsultation();
    product.items[0].itemType = 'PRODUCT';
    await expect(restateConsultationOrder(fakeDb(product).tx, 'order-1', planOf(1500000, 'EXCLUSIVE'))).rejects.toThrow(/single consultation/);

    await expect(restateConsultationOrder(fakeDb({ order: null }).tx, 'nope', planOf(1500000, 'EXCLUSIVE'))).rejects.toBeInstanceOf(NotFoundError);

    const bad = fakeDb(paidConsultation());
    await expect(restateConsultationOrder(bad.tx, 'order-1', { ...planOf(1500000, 'EXCLUSIVE'), totalPaise: 100 })).rejects.toThrow(/cannot be less/);
    await expect(restateConsultationOrder(bad.tx, 'order-1', { ...planOf(1500000, 'EXCLUSIVE'), taxPaise: 1.5 })).rejects.toThrow(/whole number of paise/);
    expect(bad.db.locks).toEqual([]);
  });
});

describe('recordCaptureForCancelledOrder (late capture for a cancelled order)', () => {
  function cancelledShopOrder() {
    return {
      order: {
        id: 'order-1', userId: 'user-1', razorpayOrderId: 'order_rzp_1', razorpayPaymentId: null,
        amount: 129900, taxAmount: 19815, discountAmount: 0, shippingAmount: 9900, paidCurrency: 'INR', paidAmountMinor: 129900,
        exchangeRate: new Prisma.Decimal(1), paymentMethod: 'RAZORPAY', status: 'CANCELLED', paymentStatus: 'PENDING', paidAt: null,
      } as Row,
      items: [{ id: 'item-1', itemType: 'PRODUCT', quantity: 1, unitPrice: 120000, taxRate: 1800, taxAmount: 19815, taxInclusive: true }] as Row[],
      ledger: [{ id: 'txn-1', orderId: 'order-1', status: 'PENDING', amountMinor: 129900, currency: 'INR', gatewayPaymentId: null }] as Row[],
    };
  }
  const payment = { gatewayPaymentId: 'pay_9', gatewayOrderId: 'order_rzp_1', raw: { id: 'pay_9', amount: 129900, email: 'customer@example.test', card: { last4: '1111' } } };

  it('records the money in the ledger and leaves the order cancelled, unpaid and without an invoice', async () => {
    const { db, tx, raw } = fakeDb(cancelledShopOrder());
    const result = await recordCaptureForCancelledOrder(tx, 'order-1', payment);

    expect(result).toEqual({ transactionId: 'txn-1', recorded: true });
    expect(db.ledger[0]).toMatchObject({ status: 'SUCCESS', gatewayPaymentId: 'pay_9', gatewayOrderId: 'order_rzp_1' });
    // Only allow-listed gateway fields are kept: no e-mail, no card.
    expect(db.ledger[0].rawResponse).toEqual({ id: 'pay_9', amount: 129900 });
    // The order itself is not written at all.
    expect(raw.order.update).not.toHaveBeenCalled();
    expect(db.order).toMatchObject({ status: 'CANCELLED', paymentStatus: 'PENDING', paidAt: null, razorpayPaymentId: null });
    // No invoice number for a sale that did not happen.
    expect(mocks.invoiceService.allocateForPaidOrder).not.toHaveBeenCalled();
    expect(raw.invoice.create).not.toHaveBeenCalled();
  });

  it('writes an audit entry staff can find, without personal data', async () => {
    const { db, tx } = fakeDb(cancelledShopOrder());
    await recordCaptureForCancelledOrder(tx, 'order-1', payment);
    expect(db.audit).toHaveLength(1);
    expect(db.audit[0]).toMatchObject({ action: 'PAYMENT_CAPTURED_FOR_CANCELLED_ORDER', resource: 'Order:order-1', adminEmail: 'SYSTEM_PAYMENT_GATEWAY' });
    expect(String(db.audit[0].details)).toContain('pay_9');
    expect(String(db.audit[0].details)).toContain('129900 INR');
    expect(String(db.audit[0].details)).not.toContain('customer@example.test');
  });

  it('is safe to repeat: the gateway re-sending the event changes nothing and audits nothing more', async () => {
    const { db, tx, raw } = fakeDb(cancelledShopOrder());
    await recordCaptureForCancelledOrder(tx, 'order-1', payment);
    const again = await recordCaptureForCancelledOrder(tx, 'order-1', { ...payment, gatewayPaymentId: 'pay_other' });
    expect(again).toEqual({ transactionId: 'txn-1', recorded: false });
    expect(db.ledger[0].gatewayPaymentId).toBe('pay_9');
    expect(db.audit).toHaveLength(1);
    expect(raw.paymentTransaction.update).toHaveBeenCalledTimes(1);
  });

  it('an order that reached payment without a ledger row still gets the capture recorded', async () => {
    const { db, tx } = fakeDb({ ...cancelledShopOrder(), ledger: [] });
    const result = await recordCaptureForCancelledOrder(tx, 'order-1', payment);
    expect(result.recorded).toBe(true);
    expect(db.ledger[0]).toMatchObject({ status: 'SUCCESS', orderId: 'order-1', amountMinor: 129900, gatewayPaymentId: 'pay_9', type: 'ORDER' });
  });

  it('refuses to be used for an order that is not cancelled', async () => {
    const seed = cancelledShopOrder();
    seed.order.status = 'PENDING';
    const { db, tx } = fakeDb(seed);
    await expect(recordCaptureForCancelledOrder(tx, 'order-1', payment)).rejects.toThrow(/not cancelled/);
    expect(db.ledger[0].status).toBe('PENDING');
    await expect(recordCaptureForCancelledOrder(fakeDb({ order: null }).tx, 'nope', payment)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('staff list: successful ledger rows whose order is not paid', async () => {
    const { prisma } = mocks;
    prisma.$queryRaw.mockResolvedValue([{ id: 'txn-1' }]);
    prisma.paymentTransaction.findMany.mockResolvedValue([
      {
        id: 'txn-1', userId: 'user-1', orderId: 'order-1', legacySourceId: null, legacyId: null, type: 'ORDER', status: 'SUCCESS', method: 'RAZORPAY',
        amountMinor: 129900, currency: 'INR', baseCurrency: 'INR', baseAmountPaise: 129900, subtotalPaise: 120000, shippingPaise: 9900, taxPaise: 19815,
        taxRateBp: 1800, taxInclusive: true, discountPaise: 0, exchangeRate: new Prisma.Decimal(1), gatewayPaymentId: 'pay_9', gatewayOrderId: 'order_rzp_1',
        rawResponse: null, customerName: null, createdAt: new Date(), updatedAt: new Date(),
      },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1', fullName: 'Asha', email: null, phoneNumber: '+919876543210' }]);
    prisma.order.findMany.mockResolvedValue([
      { id: 'order-1', status: 'CANCELLED', paymentStatus: 'PENDING', fulfillmentStatus: 'CANCELLED', paidAt: null, shippingAddress: null, items: [] },
    ]);
    prisma.invoice.findMany.mockResolvedValue([]);

    const result = await transactionsService.listUnappliedPayments();
    const sql = (prisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toContain(`t.status = 'SUCCESS'`);
    expect(sql).toContain('o."paidAt" IS NULL');
    expect(result.total).toBe(1);
    expect(result.payments[0]).toMatchObject({
      id: 'txn-1', status: 'success', transactionId: 'pay_9', orderId: 'order-1', invoiceNo: 'No invoice issued',
      order: { status: 'CANCELLED', paymentStatus: 'PENDING' },
    });

    prisma.$queryRaw.mockResolvedValue([]);
    expect(await transactionsService.listUnappliedPayments()).toEqual({ payments: [], total: 0 });
  });
});

describe('automatic invoice recovery sweep', () => {
  const { prisma, invoiceService } = mocks;

  it('runs every 5 minutes unless the env says otherwise; nonsense values fall back, tiny ones are clamped', () => {
    expect(invoiceRecoveryIntervalMs({})).toBe(300000);
    expect(invoiceRecoveryIntervalMs({ INVOICE_RECOVERY_INTERVAL_MS: '60000' })).toBe(60000);
    expect(invoiceRecoveryIntervalMs({ INVOICE_RECOVERY_INTERVAL_MS: 'soon' })).toBe(300000);
    expect(invoiceRecoveryIntervalMs({ INVOICE_RECOVERY_INTERVAL_MS: '-5' })).toBe(300000);
    expect(invoiceRecoveryIntervalMs({ INVOICE_RECOVERY_INTERVAL_MS: '0' })).toBe(300000);
    expect(invoiceRecoveryIntervalMs({ INVOICE_RECOVERY_INTERVAL_MS: '50' })).toBe(10000);
  });

  it('does nothing, and does not fail, while the counter is not initialised', async () => {
    invoiceService.isPaused.mockReturnValue(false);
    prisma.invoiceCounter.findUnique.mockResolvedValue(null);
    const sweep = new InvoiceRecoveryScheduler();
    expect(await sweep.tick()).toEqual({ ran: false, reason: 'counter-not-initialised' });
    expect(await sweep.tick()).toEqual({ ran: false, reason: 'counter-not-initialised' });
    expect(invoiceService.allocatePending).not.toHaveBeenCalled();
  });

  it('does nothing while numbering is paused', async () => {
    invoiceService.isPaused.mockReturnValue(true);
    expect(await new InvoiceRecoveryScheduler().tick()).toEqual({ ran: false, reason: 'paused' });
    expect(prisma.invoiceCounter.findUnique).not.toHaveBeenCalled();
    expect(invoiceService.allocatePending).not.toHaveBeenCalled();
  });

  it('numbers pending invoices with the same settlement as the admin action, in batches', async () => {
    invoiceService.isPaused.mockReturnValue(false);
    prisma.invoiceCounter.findUnique.mockResolvedValue({ key: 'INV-AS' });
    invoiceService.allocatePending.mockResolvedValue({ allocated: [{ orderId: 'o1', number: 'INV-AS/119' }], stillPending: ['o2'], failures: [] });
    expect(await new InvoiceRecoveryScheduler().tick()).toEqual({ ran: true, allocated: 1, stillPending: 1, failures: 0 });
    expect(invoiceService.allocatePending).toHaveBeenCalledWith(200, settlePaidOrderForRecovery);

    process.env.INVOICE_RECOVERY_BATCH = '25';
    await new InvoiceRecoveryScheduler().tick();
    expect(invoiceService.allocatePending).toHaveBeenLastCalledWith(25, settlePaidOrderForRecovery);
  });

  it('the settlement it passes settles the ledger with the payment id stored on the order', async () => {
    const seed = paidConsultation();
    seed.ledger[0].status = 'PENDING';
    seed.ledger[0].gatewayPaymentId = null;
    const { db, tx } = fakeDb(seed);
    invoiceService.allocateForPaidOrder.mockResolvedValue({ number: 'INV-AS/119', status: 'ALLOCATED' });
    expect(await settlePaidOrderForRecovery(tx, 'order-1')).toEqual({ number: 'INV-AS/119', status: 'ALLOCATED' });
    expect(db.ledger[0]).toMatchObject({ status: 'SUCCESS', gatewayPaymentId: 'pay_1', gatewayOrderId: 'order_rzp_1' });
    expect(invoiceService.allocateForPaidOrder).toHaveBeenCalledWith(tx, { orderId: 'order-1', saleType: 'CONSULTATION' });
  });

  it('the counter disappearing or numbering being paused mid-run is not an error; anything else is', async () => {
    invoiceService.isPaused.mockReturnValue(false);
    prisma.invoiceCounter.findUnique.mockResolvedValue({ key: 'INV-AS' });
    invoiceService.allocatePending.mockRejectedValueOnce(new AppError('x', 409, 'INVOICE_COUNTER_NOT_INITIALISED'));
    expect(await new InvoiceRecoveryScheduler().tick()).toEqual({ ran: false, reason: 'counter-not-initialised' });
    invoiceService.allocatePending.mockRejectedValueOnce(new AppError('x', 409, 'INVOICE_NUMBERING_PAUSED'));
    expect(await new InvoiceRecoveryScheduler().tick()).toEqual({ ran: false, reason: 'paused' });
    invoiceService.allocatePending.mockRejectedValueOnce(new Error('database is down'));
    await expect(new InvoiceRecoveryScheduler().tick()).rejects.toThrow('database is down');
  });

  it('start runs once at once and then on the interval, never overlapping, and survives a failing run; stop ends it', async () => {
    vi.useFakeTimers();
    try {
      process.env.INVOICE_RECOVERY_INTERVAL_MS = '60000';
      invoiceService.isPaused.mockReturnValue(false);
      prisma.invoiceCounter.findUnique.mockResolvedValue({ key: 'INV-AS' });
      let release: () => void = () => undefined;
      invoiceService.allocatePending.mockImplementationOnce(() => new Promise((resolve) => {
        release = () => resolve({ allocated: [], stillPending: [], failures: [] });
      }));
      const sweep = new InvoiceRecoveryScheduler();
      sweep.start();
      sweep.start(); // a second start is ignored
      await vi.advanceTimersByTimeAsync(0);
      expect(invoiceService.allocatePending).toHaveBeenCalledTimes(1);

      // The first run is still going when the next two intervals fire: no overlap.
      await vi.advanceTimersByTimeAsync(120000);
      expect(invoiceService.allocatePending).toHaveBeenCalledTimes(1);
      release();
      await vi.advanceTimersByTimeAsync(0);

      invoiceService.allocatePending.mockRejectedValueOnce(new Error('database is down'));
      await vi.advanceTimersByTimeAsync(60000);
      expect(invoiceService.allocatePending).toHaveBeenCalledTimes(2);
      invoiceService.allocatePending.mockResolvedValue({ allocated: [], stillPending: [], failures: [] });
      await vi.advanceTimersByTimeAsync(60000);
      expect(invoiceService.allocatePending).toHaveBeenCalledTimes(3);

      sweep.stop();
      await vi.advanceTimersByTimeAsync(600000);
      expect(invoiceService.allocatePending).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('INVOICE_RECOVERY_ENABLED=false keeps it off', async () => {
    vi.useFakeTimers();
    try {
      process.env.INVOICE_RECOVERY_ENABLED = 'false';
      const sweep = new InvoiceRecoveryScheduler();
      sweep.start();
      await vi.advanceTimersByTimeAsync(600000);
      expect(invoiceService.isPaused).not.toHaveBeenCalled();
      sweep.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
