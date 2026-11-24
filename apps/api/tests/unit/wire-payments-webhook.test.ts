/**
 * Item 1: the Razorpay webhook applies a paid product order's effects through
 * `shopOrdersService.applyPaidEffects` inside the paying transaction (the same function the
 * customer's own verification calls), never marks a cancelled order paid, and reports a failed
 * payment to the shop. prisma, the signature check and the services are substituted.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

const mocks = vi.hoisted(() => {
  const log: string[] = [];
  const tx = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(async () => {
      log.push('tx:order-marked-paid');
      return 1;
    }),
  };
  const state = { inTransaction: false };
  return {
    log,
    tx,
    state,
    prisma: {
      webhookEvent: { findUnique: vi.fn(), create: vi.fn() },
      order: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      consultationBooking: { findFirst: vi.fn(), update: vi.fn() },
      appointmentSlot: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      course: { findFirst: vi.fn() },
      courseEntitlement: { upsert: vi.fn() },
      product: { findFirst: vi.fn(), update: vi.fn() },
      digitalProductEntitlement: { findFirst: vi.fn(), create: vi.fn() },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => {
        state.inTransaction = true;
        try {
          return await fn(tx);
        } finally {
          state.inTransaction = false;
          log.push('commit');
        }
      }),
    },
    shop: {
      applyPaidEffects: vi.fn(async () => {
        log.push(`applyPaidEffects(inTx=${state.inTransaction})`);
        return { applied: true, entitlementIds: [] };
      }),
      notifyOrderStatus: vi.fn(async () => {
        log.push(`notifyOrderStatus(inTx=${state.inTransaction})`);
      }),
      markPaymentFailed: vi.fn(async () => {
        log.push('markPaymentFailed');
      }),
    },
    settleOrderPaid: vi.fn(async () => {
      log.push('settleOrderPaid');
      return { transactionId: 't1', invoice: { number: null, status: 'PENDING' } };
    }),
    recordCaptureForCancelledOrder: vi.fn(async () => {
      log.push(`recordCaptureForCancelledOrder(inTx=${state.inTransaction})`);
      return { transactionId: 't1', recorded: true };
    }),
    markOrderFailed: vi.fn(async () => 1),
    fulfillment: {
      createFulfillmentUnitsForOrder: vi.fn(async () => {
        log.push('createFulfillmentUnits');
      }),
      reconcileOrderFulfillment: vi.fn(async () => {
        log.push('reconcileOrderFulfillment');
      }),
    },
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/services/payment.service', () => ({ paymentService: { verifyWebhookSignature: () => true } }));
vi.mock('../../src/modules/fulfillment/fulfillment.service', () => ({ fulfillmentService: mocks.fulfillment }));
vi.mock('../../src/modules/shop-orders/shop-orders.service', () => ({ shopOrdersService: mocks.shop }));
vi.mock('../../src/modules/commerce/money/settlement', () => ({
  settleOrderPaid: mocks.settleOrderPaid,
  recordCaptureForCancelledOrder: mocks.recordCaptureForCancelledOrder,
}));
vi.mock('../../src/modules/transactions/transactions.service', () => ({
  transactionsService: { markOrderFailed: mocks.markOrderFailed },
}));

import { webhooksRoutes } from '../../src/modules/webhooks/webhooks.routes';

const { prisma, tx, shop, log } = mocks;
let app: FastifyInstance;

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    razorpayOrderId: 'order_rzp_1',
    amount: 129900,
    currency: 'INR',
    paidCurrency: 'INR',
    paidAmountMinor: 129900,
    status: 'PENDING',
    items: [
      { id: 'item-1', itemType: 'PRODUCT', catalogId: 'rudraksha-mala', quantity: 2, fulfillmentType: 'PHYSICAL' },
    ],
    ...overrides,
  };
}

function captured(overrides: Record<string, unknown> = {}) {
  return {
    event: 'payment.captured',
    event_id: `evt_${Math.random().toString(36).slice(2)}`,
    payload: { payment: { entity: { id: 'pay_1', order_id: 'order_rzp_1', amount: 129900, currency: 'INR', ...overrides } } },
  };
}

function failedEvent() {
  return { event: 'payment.failed', event_id: `evt_${Math.random().toString(36).slice(2)}`, payload: { payment: { entity: { id: 'pay_1', order_id: 'order_rzp_1' } } } };
}

async function post(body: unknown) {
  return app.inject({ method: 'POST', url: '/razorpay', headers: { 'x-razorpay-signature': 'sig' }, payload: body as object });
}

/** What the row lock sees: the status of the order at the moment the transaction holds it. */
function lockedStatus(status: string | null) {
  tx.$queryRaw.mockReset();
  tx.$queryRaw.mockResolvedValueOnce(status ? [{ id: 'order-1', status }] : []).mockResolvedValue([]);
}

beforeAll(async () => {
  app = Fastify();
  await app.register(webhooksRoutes);
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  log.length = 0;
  prisma.webhookEvent.findUnique.mockResolvedValue(null);
  prisma.webhookEvent.create.mockResolvedValue({});
  prisma.order.findUnique.mockResolvedValue(order());
  prisma.order.updateMany.mockResolvedValue({ count: 1 });
  prisma.consultationBooking.findFirst.mockResolvedValue(null);
  lockedStatus('PENDING');
});

describe('payment.captured for a product order', () => {
  it('applies the shop effects inside the paying transaction, before settlement, and notifies after commit', async () => {
    const res = await post(captured());
    expect(res.statusCode).toBe(200);

    expect(shop.applyPaidEffects).toHaveBeenCalledTimes(1);
    // Same transaction client as the one that marked the order paid; no option that skips stock.
    expect(shop.applyPaidEffects.mock.calls[0]).toEqual([tx, 'order-1']);
    expect(mocks.settleOrderPaid.mock.calls[0][0]).toBe(tx);
    expect(log).toEqual([
      'tx:order-marked-paid',
      'createFulfillmentUnits',
      'applyPaidEffects(inTx=true)',
      'reconcileOrderFulfillment',
      'settleOrderPaid',
      'commit',
      'notifyOrderStatus(inTx=false)',
    ]);
    expect(shop.notifyOrderStatus).toHaveBeenCalledWith('order-1');
    expect(prisma.webhookEvent.create).toHaveBeenCalledTimes(1);
  });

  it('no longer touches stock, entitlements or the fulfilment status itself', async () => {
    await post(captured());
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
    expect(prisma.product.update).not.toHaveBeenCalled();
    expect(prisma.digitalProductEntitlement.create).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('a retried payment on an order whose earlier attempt failed is claimed the same way', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'FAILED' }));
    lockedStatus('FAILED');
    await post(captured());
    expect(shop.applyPaidEffects).toHaveBeenCalledTimes(1);
    expect(shop.notifyOrderStatus).toHaveBeenCalledTimes(1);
  });

  it("when the customer's verification won the race, nothing is applied or announced twice", async () => {
    lockedStatus('PAID'); // marked paid between this handler's read and its row lock
    const res = await post(captured());
    expect(res.statusCode).toBe(200);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
  });

  it('an order already paid before the event arrives is confirmed without a second application', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'PAID' }));
    const res = await post(captured());
    expect(res.json()).toMatchObject({ duplicate: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
  });

  it('a capture never moves a fulfilled or partially refunded order back to PAID', async () => {
    for (const status of ['FULFILLED', 'PARTIALLY_REFUNDED']) {
      prisma.order.findUnique.mockResolvedValue(order({ status }));
      lockedStatus(status);
      await post(captured());
    }
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });

  it('an order without product lines is settled without the shop being called', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ items: [{ id: 'i', itemType: 'REPORT', catalogId: 'report-career', quantity: 1 }] }));
    await post(captured());
    expect(mocks.settleOrderPaid).toHaveBeenCalledTimes(1);
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
  });

  it('a mixed order gets the shop effects for its product lines', async () => {
    prisma.order.findUnique.mockResolvedValue(
      order({ items: [{ id: 'a', itemType: 'REPORT', catalogId: 'report-career', quantity: 1 }, { id: 'b', itemType: 'PRODUCT', catalogId: 'mala', quantity: 1 }] })
    );
    await post(captured());
    expect(shop.applyPaidEffects).toHaveBeenCalledTimes(1);
  });

  it('if applying the effects fails, the order is not left paid and the event is not recorded', async () => {
    shop.applyPaidEffects.mockRejectedValueOnce(new Error('stock table locked'));
    const res = await post(captured());
    expect(res.statusCode).toBe(500);
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled(); // the transaction threw before settlement: it rolls back
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.create).not.toHaveBeenCalled(); // so the gateway's retry is processed
  });
});

describe('payment.captured for a cancelled order', () => {
  it('never marks it paid: the payment goes to the ledger for staff and nothing else happens', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }));
    lockedStatus('CANCELLED');
    const res = await post(captured());

    expect(res.statusCode).toBe(200);
    expect(tx.$executeRaw).not.toHaveBeenCalled(); // no UPDATE ... SET status = 'PAID'
    expect(mocks.recordCaptureForCancelledOrder).toHaveBeenCalledTimes(1);
    expect(mocks.recordCaptureForCancelledOrder.mock.calls[0].slice(0, 2)).toEqual([tx, 'order-1']);
    expect(mocks.recordCaptureForCancelledOrder.mock.calls[0][2]).toMatchObject({ gatewayPaymentId: 'pay_1', gatewayOrderId: 'order_rzp_1' });
    expect(log).toEqual(['recordCaptureForCancelledOrder(inTx=true)', 'commit']);

    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(mocks.fulfillment.createFulfillmentUnitsForOrder).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled(); // so no invoice number either
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
    expect(prisma.consultationBooking.findFirst).not.toHaveBeenCalled();
    // The event is recorded, so the gateway stops re-sending it.
    expect(prisma.webhookEvent.create).toHaveBeenCalledTimes(1);
  });

  it('cancelled between the read and the row lock: still not marked paid', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'PENDING' }));
    lockedStatus('CANCELLED');
    await post(captured());
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(mocks.recordCaptureForCancelledOrder).toHaveBeenCalledTimes(1);
  });

  it('a capture whose amount does not match is refused before anything is recorded', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }));
    const res = await post(captured({ amount: 100 }));
    expect(res.statusCode).toBe(400);
    expect(mocks.recordCaptureForCancelledOrder).not.toHaveBeenCalled();
  });

  it('a refunded order is left alone, as before', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'REFUNDED' }));
    const res = await post(captured());
    expect(res.statusCode).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.recordCaptureForCancelledOrder).not.toHaveBeenCalled();
  });
});

describe('payment.failed', () => {
  it('product order: order FAILED, ledger FAILED, shop told (website status and coupon hold)', async () => {
    const res = await post(failedEvent());
    expect(res.statusCode).toBe(200);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: 'PENDING' },
      data: { status: 'FAILED', paymentStatus: 'FAILED' },
    });
    expect(mocks.markOrderFailed).toHaveBeenCalledTimes(1);
    expect(shop.markPaymentFailed).toHaveBeenCalledWith('order-1');
  });

  it('an order without product lines does not call the shop', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ items: [{ itemType: 'CONSULTATION' }] }));
    await post(failedEvent());
    expect(mocks.markOrderFailed).toHaveBeenCalledTimes(1);
    expect(shop.markPaymentFailed).not.toHaveBeenCalled();
  });

  it('a paid or cancelled order is not touched by a late failure event', async () => {
    for (const status of ['PAID', 'CANCELLED']) {
      prisma.order.findUnique.mockResolvedValue(order({ status }));
      await post(failedEvent());
    }
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(mocks.markOrderFailed).not.toHaveBeenCalled();
    expect(shop.markPaymentFailed).not.toHaveBeenCalled();
  });

  it('paid by the verification while this event was being handled: PAID is not overwritten, the coupon hold is not freed', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 0 }); // status was no longer PENDING
    await post(failedEvent());
    expect(mocks.markOrderFailed).not.toHaveBeenCalled();
    expect(shop.markPaymentFailed).not.toHaveBeenCalled();
  });
});
