/**
 * The payment flow in commerce.service with the money layer: currency at order creation,
 * verification that ties a payment to its order, and the refund guard.
 * Database, gateway and side services are replaced; nothing leaves the process.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    order: { create: vi.fn(), findUnique: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  };
  return {
    tx,
    prisma: {
      order: { findUnique: vi.fn(), update: vi.fn() },
      refund: { findUnique: vi.fn(), create: vi.fn() },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    },
    paymentService: {
      createRazorpayOrder: vi.fn(),
      verifyCheckoutSignature: vi.fn(),
      fetchRazorpayPayment: vi.fn(),
      createRazorpayRefund: vi.fn(),
    },
    settleOrderPaid: vi.fn(),
    transactionsService: { recordAttempt: vi.fn(), markOrderFailed: vi.fn() },
    fulfillmentService: { createFulfillmentUnitsForOrder: vi.fn(), reconcileOrderFulfillment: vi.fn() },
    notificationService: { sendNotification: vi.fn() },
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/services/payment.service', () => ({ paymentService: mocks.paymentService }));
vi.mock('../../src/modules/commerce/money/settlement', () => ({ settleOrderPaid: mocks.settleOrderPaid }));
vi.mock('../../src/modules/transactions/transactions.service', () => ({ transactionsService: mocks.transactionsService }));
vi.mock('../../src/modules/fulfillment/fulfillment.service', () => ({ fulfillmentService: mocks.fulfillmentService }));
vi.mock('../../src/modules/notifications/notification.service', () => ({ notificationService: mocks.notificationService }));
vi.mock('../../src/services/platform-report.runner', () => ({
  REPORT_LANGUAGES: ['en', 'hi'],
  normalizeReportLanguage: (value: unknown) => (value === 'hi' ? 'hi' : 'en'),
  platformReportLanguages: () => ['en', 'hi'],
}));

import { CommerceService } from '../../src/modules/commerce/commerce.service';
import { exchangeRateService, FakeExchangeRateProvider } from '../../src/modules/commerce/money/rates';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';

const service = new CommerceService();
const USER = { id: 'user-1', role: 'USER' };
const ITEM = COMMERCE_CATALOG['report-career'];

function storedOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    razorpayOrderId: 'order_rzp_1',
    razorpayPaymentId: null,
    amount: 49900,
    currency: 'INR',
    paidCurrency: 'INR',
    paidAmountMinor: 49900,
    exchangeRate: null,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    items: [{ id: 'item-1', title: 'Career report' }],
    refunds: [],
    ...overrides,
  };
}

const VERIFY = { razorpayOrderId: 'order_rzp_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig' };

function gatewayPayment(overrides: Record<string, unknown> = {}) {
  return { id: 'pay_1', orderId: 'order_rzp_1', amount: 49900, currency: 'INR', status: 'captured', captured: true, raw: { id: 'pay_1' }, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.$transaction.mockImplementation(async (fn: (client: typeof mocks.tx) => Promise<unknown>) => fn(mocks.tx));
  exchangeRateService.configure(new FakeExchangeRateProvider({ USD: 0.012, JPY: 1.8 }));
  mocks.paymentService.createRazorpayOrder.mockImplementation(async (amount: number, currency: string) => ({ id: 'order_rzp_new', amount, currency, status: 'created' }));
  mocks.tx.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'order-new',
    ...data,
    items: (data.items as { create: unknown[] }).create,
  }));
});

describe('order creation and currency', () => {
  it('INR: charges the catalogue price and records a pending ledger attempt', async () => {
    const result = await service.createOrder({ items: [{ catalogId: ITEM.id, quantity: 1 }] }, USER);

    expect(mocks.paymentService.createRazorpayOrder).toHaveBeenCalledWith(ITEM.pricePaise, 'INR', expect.any(String));
    const data = mocks.tx.order.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ amount: ITEM.pricePaise, currency: 'INR', paidCurrency: 'INR', paidAmountMinor: ITEM.pricePaise, exchangeRate: '1.0000000000', discountAmount: 0 });
    expect(data.subtotal + data.taxAmount).toBe(ITEM.pricePaise);
    expect(data.items.create[0]).toMatchObject({ unitPrice: ITEM.pricePaise, totalAmount: ITEM.pricePaise, taxInclusive: true, taxRate: ITEM.taxRateBasisPoints });
    expect(mocks.transactionsService.recordAttempt).toHaveBeenCalledTimes(1);
    expect(mocks.transactionsService.recordAttempt.mock.calls[0][0]).toBe(mocks.tx);
    expect(result).toMatchObject({ amount: ITEM.pricePaise, currency: 'INR', paidCurrency: 'INR', paidAmountMinor: ITEM.pricePaise });
  });

  it('USD: converts with the server rate, keeps the INR base amount, and stores the rate used', async () => {
    const result = await service.createOrder({ items: [{ catalogId: ITEM.id, quantity: 1 }], currency: 'usd' }, USER);

    const expectedCents = Math.round((ITEM.pricePaise * 0.012) / 1); // paise x rate = cents for a two-decimal currency
    expect(mocks.paymentService.createRazorpayOrder).toHaveBeenCalledWith(expectedCents, 'USD', expect.any(String));
    expect(mocks.tx.order.create.mock.calls[0][0].data).toMatchObject({
      amount: ITEM.pricePaise,
      currency: 'INR',
      paidCurrency: 'USD',
      paidAmountMinor: expectedCents,
      exchangeRate: '0.0120000000',
    });
    expect(result).toMatchObject({ amount: ITEM.pricePaise, paidCurrency: 'USD', paidAmountMinor: expectedCents, exchangeRate: '0.0120000000' });
  });

  it('JPY: the gateway amount is whole yen', async () => {
    await service.createOrder({ items: [{ catalogId: ITEM.id, quantity: 1 }], currency: 'JPY' }, USER);
    const expectedYen = Math.round((ITEM.pricePaise / 100) * 1.8);
    expect(mocks.paymentService.createRazorpayOrder).toHaveBeenCalledWith(expectedYen, 'JPY', expect.any(String));
  });

  it('an unknown currency is refused before the gateway or the database is touched', async () => {
    await expect(service.createOrder({ items: [{ catalogId: ITEM.id, quantity: 1 }], currency: 'XYZ' }, USER)).rejects.toMatchObject({ code: 'UNSUPPORTED_CURRENCY' });
    expect(mocks.paymentService.createRazorpayOrder).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('a supported currency with no rate is refused, never charged at rate 1', async () => {
    exchangeRateService.configure(new FakeExchangeRateProvider({ USD: 0.012 }));
    await expect(service.createOrder({ items: [{ catalogId: ITEM.id, quantity: 1 }], currency: 'EUR' }, USER)).rejects.toMatchObject({ code: 'EXCHANGE_RATE_UNAVAILABLE' });
    expect(mocks.paymentService.createRazorpayOrder).not.toHaveBeenCalled();
  });

  it('a coupon discount passed by the server is spread before GST and lowers the charge', async () => {
    await service.createOrder({ items: [{ catalogId: ITEM.id, quantity: 1 }], discountPaise: 10000 }, USER);
    const data = mocks.tx.order.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ amount: ITEM.pricePaise - 10000, discountAmount: 10000, paidAmountMinor: ITEM.pricePaise - 10000 });
    expect(mocks.paymentService.createRazorpayOrder).toHaveBeenCalledWith(ITEM.pricePaise - 10000, 'INR', expect.any(String));
  });
});

describe('payment verification ties the payment to the order', () => {
  function arrangePaidTransition() {
    mocks.tx.$queryRaw.mockResolvedValueOnce([{ id: 'order-1', status: 'PENDING' }]).mockResolvedValue([]);
    mocks.tx.order.findUnique.mockResolvedValue(storedOrder({ status: 'PAID' }));
  }

  it('marks the order paid and settles the ledger and invoice in the same transaction', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(storedOrder());
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(true);
    mocks.paymentService.fetchRazorpayPayment.mockResolvedValue(gatewayPayment());
    arrangePaidTransition();

    const result = await service.verifyPayment(VERIFY, USER);

    expect(result.message).toBe('Payment verified successfully');
    expect(mocks.paymentService.fetchRazorpayPayment).toHaveBeenCalledWith('pay_1');
    expect(mocks.settleOrderPaid).toHaveBeenCalledTimes(1);
    expect(mocks.settleOrderPaid).toHaveBeenCalledWith(mocks.tx, 'order-1', { gatewayPaymentId: 'pay_1', gatewayOrderId: 'order_rzp_1', raw: { id: 'pay_1' } });
  });

  it("refuses another customer's order as not found, before any gateway call", async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(storedOrder({ userId: 'someone-else' }));
    await expect(service.verifyPayment(VERIFY, USER)).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.paymentService.verifyCheckoutSignature).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('an order is found only by its stored gateway order id', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.verifyPayment(VERIFY, USER)).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.prisma.order.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { razorpayOrderId: 'order_rzp_1' } }));
  });

  const mismatches: Array<[string, Record<string, unknown>, Record<string, unknown>]> = [
    ['a smaller captured amount', {}, { amount: 100 }],
    ['a different currency', {}, { currency: 'USD' }],
    ['a payment made against another gateway order', {}, { orderId: 'order_rzp_cheap' }],
    ['a payment that is not captured or authorised', {}, { status: 'failed', captured: false }],
    ['a different payment id', {}, { id: 'pay_other' }],
    ['an INR amount paid for an order charged in USD', { paidCurrency: 'USD', paidAmountMinor: 599 }, { amount: 599, currency: 'INR' }],
    ['the INR figure paid in USD minor units', { paidCurrency: 'USD', paidAmountMinor: 599 }, { amount: 49900, currency: 'USD' }],
  ];

  it.each(mismatches)('refuses %s and leaves the order unpaid', async (_name, orderOverrides, paymentOverrides) => {
    mocks.prisma.order.findUnique.mockResolvedValue(storedOrder(orderOverrides));
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(true);
    mocks.paymentService.fetchRazorpayPayment.mockResolvedValue(gatewayPayment(paymentOverrides));

    await expect(service.verifyPayment(VERIFY, USER)).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH', statusCode: 400 });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.prisma.order.update).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });

  it('accepts a foreign-currency payment that matches the stored paid amount and currency', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(storedOrder({ paidCurrency: 'USD', paidAmountMinor: 599 }));
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(true);
    mocks.paymentService.fetchRazorpayPayment.mockResolvedValue(gatewayPayment({ amount: 599, currency: 'USD' }));
    arrangePaidTransition();
    await service.verifyPayment(VERIFY, USER);
    expect(mocks.settleOrderPaid).toHaveBeenCalledTimes(1);
  });

  it('an invalid signature fails the attempt in the ledger and never reaches the gateway lookup', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(storedOrder());
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(false);
    await expect(service.verifyPayment(VERIFY, USER)).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.transactionsService.markOrderFailed).toHaveBeenCalledWith('order-1');
    expect(mocks.paymentService.fetchRazorpayPayment).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });

  it('an order already paid is returned without a second claim', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(storedOrder({ status: 'PAID' }));
    await service.verifyPayment(VERIFY, USER);
    expect(mocks.paymentService.verifyCheckoutSignature).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });

  it('when the webhook won the race, verify does not settle again', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(storedOrder());
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(true);
    mocks.paymentService.fetchRazorpayPayment.mockResolvedValue(gatewayPayment());
    mocks.tx.$queryRaw.mockResolvedValueOnce([{ id: 'order-1', status: 'PAID' }]);
    mocks.tx.order.findUnique.mockResolvedValue(storedOrder({ status: 'PAID' }));

    await service.verifyPayment(VERIFY, USER);
    expect(mocks.tx.$executeRaw).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });
});

describe('refund guard', () => {
  it('never sends a refund to the gateway for an order paid in a foreign currency', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(storedOrder({ status: 'PAID', razorpayPaymentId: 'pay_1', paidCurrency: 'USD', paidAmountMinor: 599 }));
    await expect(service.requestRefund({ orderId: 'order-1' }, { id: 'admin-1', role: 'ADMIN' })).rejects.toMatchObject({ code: 'REFUND_UNSUPPORTED_CURRENCY' });
    expect(mocks.paymentService.createRazorpayRefund).not.toHaveBeenCalled();
  });
});
