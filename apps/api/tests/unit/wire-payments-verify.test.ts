/**
 * Item 2: `commerceService.verifyPayment` applies a product order's paid effects through the shop's
 * one function, exactly once. Item 6: `coursesService.verifyCoursePayment` never stamps a paid
 * order again. prisma, the gateway and the side services are substituted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const log: string[] = [];
  const state = { inTransaction: false };
  const tx = {
    order: { findUnique: vi.fn() },
    courseEntitlement: { findUnique: vi.fn(), upsert: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(async () => {
      log.push('tx:order-marked-paid');
      return 1;
    }),
  };
  return {
    log,
    state,
    tx,
    prisma: {
      order: { findUnique: vi.fn(), update: vi.fn() },
      course: { findFirst: vi.fn() },
      courseEntitlement: { findUnique: vi.fn() },
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
    paymentService: { verifyCheckoutSignature: vi.fn(), verifySignature: vi.fn(), fetchRazorpayPayment: vi.fn() },
    shop: {
      applyPaidEffects: vi.fn(),
      notifyOrderStatus: vi.fn(async () => {
        log.push(`notifyOrderStatus(inTx=${state.inTransaction})`);
      }),
      markPaymentFailed: vi.fn(),
    },
    settleOrderPaid: vi.fn(async () => {
      log.push('settleOrderPaid');
    }),
    transactionsService: { recordAttempt: vi.fn(), markOrderFailed: vi.fn() },
    fulfillment: {
      createFulfillmentUnitsForOrder: vi.fn(async () => {
        log.push('createFulfillmentUnits');
      }),
      reconcileOrderFulfillment: vi.fn(async () => {
        log.push('reconcileOrderFulfillment');
      }),
      reconcileFulfillmentUnit: vi.fn(),
    },
    sendNotification: vi.fn(),
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/services/payment.service', () => ({ paymentService: mocks.paymentService }));
vi.mock('../../src/modules/commerce/money/settlement', () => ({ settleOrderPaid: mocks.settleOrderPaid }));
vi.mock('../../src/modules/transactions/transactions.service', () => ({ transactionsService: mocks.transactionsService }));
vi.mock('../../src/modules/fulfillment/fulfillment.service', () => ({ fulfillmentService: mocks.fulfillment }));
vi.mock('../../src/modules/shop-orders/shop-orders.service', () => ({ shopOrdersService: mocks.shop }));
vi.mock('../../src/modules/notifications/notification.service', () => ({ notificationService: { sendNotification: mocks.sendNotification } }));
vi.mock('../../src/services/platform-report.runner', () => ({
  REPORT_LANGUAGES: ['en', 'hi'],
  normalizeReportLanguage: (value: unknown) => (value === 'hi' ? 'hi' : 'en'),
  platformReportLanguages: () => ['en', 'hi'],
}));

import { CommerceService } from '../../src/modules/commerce/commerce.service';
import { CoursesService } from '../../src/modules/courses/courses.service';
import { ValidationError } from '../../src/errors/app-error';

const { prisma, tx, shop, log } = mocks;
const service = new CommerceService();
const USER = { id: 'user-1', role: 'USER' };
const VERIFY = { razorpayOrderId: 'order_rzp_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig' };

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
    paymentStatus: 'PENDING',
    items: [{ id: 'item-1', itemType: 'PRODUCT', title: 'Rudraksha Mala', quantity: 1 }],
    ...overrides,
  };
}

function lockedStatus(status: string) {
  tx.$queryRaw.mockReset();
  tx.$queryRaw.mockResolvedValueOnce([{ id: 'order-1', status }]).mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  log.length = 0;
  prisma.order.findUnique.mockResolvedValue(order());
  tx.order.findUnique.mockResolvedValue(order({ status: 'PAID' }));
  mocks.paymentService.verifyCheckoutSignature.mockReturnValue(true);
  mocks.paymentService.verifySignature.mockReturnValue(true);
  mocks.paymentService.fetchRazorpayPayment.mockResolvedValue({ id: 'pay_1', orderId: 'order_rzp_1', amount: 129900, currency: 'INR', status: 'captured', raw: { id: 'pay_1' } });
  shop.applyPaidEffects.mockImplementation(async () => {
    log.push(`applyPaidEffects(inTx=${mocks.state.inTransaction})`);
    return { applied: true, entitlementIds: [] };
  });
  lockedStatus('PENDING');
});

describe('commerce verifyPayment with product lines', () => {
  it('applies the shop effects once, inside the paying transaction, before settlement; notifies after commit', async () => {
    await service.verifyPayment(VERIFY, USER);

    expect(shop.applyPaidEffects).toHaveBeenCalledTimes(1);
    expect(shop.applyPaidEffects.mock.calls[0]).toEqual([tx, 'order-1']);
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
    // The app's push / in-app notice does not repeat the website channels for a shop order.
    expect(mocks.sendNotification.mock.calls[0][0]).toMatchObject({ type: 'PAYMENT_SUCCESS', websiteChannels: false });
  });

  it('replay of a paid order: no effects, no settlement, no message', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'PAID' }));
    await service.verifyPayment(VERIFY, USER);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
  });

  it('the webhook (or the shop verification) claimed it first: under the lock nothing is applied again', async () => {
    lockedStatus('PAID');
    await service.verifyPayment(VERIFY, USER);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
  });

  it('effects already recorded on the shop order (applied: false): the customer is not messaged again', async () => {
    shop.applyPaidEffects.mockResolvedValue({ applied: false, entitlementIds: [] });
    await service.verifyPayment(VERIFY, USER);
    expect(shop.applyPaidEffects).toHaveBeenCalledTimes(1);
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
  });

  it('cancelled before or during verification: refused, nothing marked paid, no effects', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }));
    await expect(service.verifyPayment(VERIFY, USER)).rejects.toBeInstanceOf(ValidationError);

    prisma.order.findUnique.mockResolvedValue(order());
    lockedStatus('CANCELLED'); // superseded by a new checkout while the payment was being read back
    await expect(service.verifyPayment(VERIFY, USER)).rejects.toThrow(/cancelled order/);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });

  it('a bad signature tells the shop (status and coupon hold) as the shop verification does', async () => {
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(false);
    await expect(service.verifyPayment(VERIFY, USER)).rejects.toThrow(/Invalid payment signature/);
    expect(shop.markPaymentFailed).toHaveBeenCalledWith('order-1');
    expect(mocks.transactionsService.markOrderFailed).toHaveBeenCalledWith('order-1');
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
  });

  it('if the effects fail the payment is not settled (the transaction rolls back)', async () => {
    shop.applyPaidEffects.mockRejectedValue(new Error('boom'));
    await expect(service.verifyPayment(VERIFY, USER)).rejects.toThrow('boom');
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
  });

  it('an order without product lines never reaches the shop and keeps its website channels', async () => {
    const report = order({ items: [{ id: 'i', itemType: 'REPORT', title: 'Career report', quantity: 1 }] });
    prisma.order.findUnique.mockResolvedValue(report);
    tx.order.findUnique.mockResolvedValue({ ...report, status: 'PAID' });
    await service.verifyPayment(VERIFY, USER);
    expect(shop.applyPaidEffects).not.toHaveBeenCalled();
    expect(shop.notifyOrderStatus).not.toHaveBeenCalled();
    expect(mocks.sendNotification.mock.calls[0][0]).not.toHaveProperty('websiteChannels');

    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(false);
    await expect(service.verifyPayment(VERIFY, USER)).rejects.toThrow();
    expect(shop.markPaymentFailed).not.toHaveBeenCalled();
  });
});

describe('course verifyCoursePayment under the row lock', () => {
  const courses = new CoursesService();
  const course = { id: 'course-1', sku: 'course-gupt-nadi', title: 'Gupt Nadi Astrology' };
  const INPUT = { courseId: 'course-1', orderId: 'order-1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig' };
  const courseOrder = (overrides: Record<string, unknown> = {}) =>
    order({ items: [{ id: 'item-1', itemType: 'COURSE', catalogId: 'course-gupt-nadi', quantity: 1 }], ...overrides });
  const active = { id: 'ent-1', userId: 'user-1', courseId: 'course-1', status: 'ACTIVE' };

  beforeEach(() => {
    prisma.course.findFirst.mockResolvedValue(course);
    prisma.order.findUnique.mockResolvedValue(courseOrder());
    prisma.courseEntitlement.findUnique.mockResolvedValue(null);
    tx.courseEntitlement.upsert.mockResolvedValue(active);
    tx.$queryRaw.mockReset();
    tx.$queryRaw.mockResolvedValue([]);
  });

  it('first verification: marks the order paid once, enrols, settles', async () => {
    tx.order.findUnique.mockResolvedValue({ status: 'PENDING' });
    const result = await courses.verifyCoursePayment('user-1', INPUT);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.courseEntitlement.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.settleOrderPaid).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true, isEnrolled: true, entitlement: active });
  });

  it('paid by a parallel request or the webhook, enrolment in place: returned as it is, nothing written', async () => {
    // The first read saw PENDING; by the time the row lock is held the order is paid and enrolled.
    tx.order.findUnique.mockResolvedValue({ status: 'PAID' });
    tx.courseEntitlement.findUnique.mockResolvedValue(active);
    const result = await courses.verifyCoursePayment('user-1', INPUT);

    expect(tx.$executeRaw).not.toHaveBeenCalled(); // paidAt, version and payment id are not stamped again
    expect(tx.courseEntitlement.upsert).not.toHaveBeenCalled();
    expect(mocks.fulfillment.createFulfillmentUnitsForOrder).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, isEnrolled: true, entitlement: active });
  });

  it('paid but not yet enrolled (the webhook grants access just after it commits): enrolment completed, payment untouched', async () => {
    tx.order.findUnique.mockResolvedValue({ status: 'PAID' });
    tx.courseEntitlement.findUnique.mockResolvedValue(null);
    await courses.verifyCoursePayment('user-1', INPUT);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.courseEntitlement.upsert).toHaveBeenCalledTimes(1);
  });

  it('a replay with the order already paid at the first read does not re-stamp it either', async () => {
    prisma.order.findUnique.mockResolvedValue(courseOrder({ status: 'PAID' }));
    prisma.courseEntitlement.findUnique.mockResolvedValue(null); // enrolment missing, so the replay goes on to repair it
    tx.order.findUnique.mockResolvedValue({ status: 'PAID' });
    tx.courseEntitlement.findUnique.mockResolvedValue(null);
    await courses.verifyCoursePayment('user-1', INPUT);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(mocks.paymentService.fetchRazorpayPayment).not.toHaveBeenCalled();
  });

  it('cancelled meanwhile: refused, nothing granted', async () => {
    tx.order.findUnique.mockResolvedValue({ status: 'CANCELLED' });
    await expect(courses.verifyCoursePayment('user-1', INPUT)).rejects.toThrow(/cancelled order/);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.courseEntitlement.upsert).not.toHaveBeenCalled();
  });
});
