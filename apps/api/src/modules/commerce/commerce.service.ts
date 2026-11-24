import { prisma } from '../../services/prisma.service';
import { paymentService } from '../../services/payment.service';
import { commerceCatalog, CalculatedOrder } from './commerce.catalog';
import { notificationService } from '../notifications/notification.service';
import { AppError, NotFoundError, ValidationError, ForbiddenError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { Prisma, OrderStatus, PaymentStatus, RefundStatus, ReportType, OrderItemType, FulfillmentType, EntitlementStatus, FulfillmentUnitStatus } from '@prisma/client';
import { customerReportRow, reportReleaseDelayMs } from '../reports/report-release';
import { fulfillmentService } from '../fulfillment/fulfillment.service';
import { normalizeReportLanguage, platformReportLanguages, REPORT_LANGUAGES } from '../../services/platform-report.runner';
import { calculateSale } from './money/tax';
import { quoteCheckout } from './money/checkout';
import { settleOrderPaid } from './money/settlement';
import { transactionsService } from '../transactions/transactions.service';
import { shopOrdersService } from '../shop-orders/shop-orders.service';
import { couponsService } from '../coupons/coupons.service';
import { CouponSaleType } from '../coupons/coupon-rules';

export interface CreateOrderParams {
  items?: Array<{ catalogId: string; quantity?: number; metadata?: Record<string, any> }>;
  reportType?: ReportType; // Legacy support
  /** Report language for the legacy single-report input (unified input: `items[].metadata.language`). */
  language?: string;
  idempotencyKey?: string;
  notes?: string;
  /**
   * Currency to charge at the gateway (INR when omitted). Prices stay INR; the amount is converted
   * with the server-side exchange rate. See ./money/currency.ts for the accepted list.
   */
  currency?: string;
  /**
   * Hook for coupons (another module): order-level discount in INR paise, already validated and
   * capped by that module. It is spread over the items pro rata before each item's GST is worked
   * out (./money/tax.ts). Never taken from the request body.
   */
  discountPaise?: number;
  couponCode?: string;
}

export interface VerifyPaymentParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface ItemAllocationInput {
  orderItemId: string;
  amountPaise: number;
  restockQuantity?: number;
  reason?: string;
}

export interface RequestRefundParams {
  orderId: string;
  amountPaise?: number; // Optional; if omitted, full refundable balance is refunded
  reason?: string;
  idempotencyKey?: string;
  itemAllocations?: ItemAllocationInput[];
}

/** Set only by the staff refund route, after its permission check (`payments:refund`). */
export interface RefundAuthorisation {
  staffAuthorised?: boolean;
}

export class CommerceService {
  /**
   * Create an authoritative unified commerce order from server catalog items.
   * Never trusts client-supplied prices, taxes, or totals.
   */
  public async createOrder(
    input: CreateOrderParams,
    user: { id: string }
  ) {
    // 1. Idempotency check: if key is provided and order exists, return cleanly
    if (input.idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { items: true },
      });
      if (existing) {
        if (existing.userId !== user.id) {
          throw new ForbiddenError('Idempotency key belongs to another user');
        }
        logger.info({ orderId: existing.id, idempotencyKey: input.idempotencyKey }, 'Returning existing idempotent order');
        return {
          orderId: existing.id,
          razorpayOrderId: existing.razorpayOrderId,
          amount: existing.amount,
          subtotal: existing.subtotal,
          taxAmount: existing.taxAmount,
          discountAmount: existing.discountAmount,
          currency: existing.currency,
          paidCurrency: existing.paidCurrency,
          paidAmountMinor: existing.paidAmountMinor ?? existing.amount,
          exchangeRate: existing.exchangeRate ? existing.exchangeRate.toString() : '1',
          status: existing.status,
          paymentStatus: existing.paymentStatus,
          items: existing.items,
          razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
        };
      }
    }

    // 2. Resolve items: support both unified multi-item array and legacy reportType
    let requestedItems = input.items;
    let legacyReportType: ReportType | undefined = undefined;

    if ((!requestedItems || requestedItems.length === 0) && input.reportType) {
      legacyReportType = input.reportType;
      const catalogItem = commerceCatalog.getItemByLegacyReportType(input.reportType);
      if (!catalogItem) {
        throw new ValidationError(`Unsupported report type for pricing: ${input.reportType}`);
      }
      requestedItems = [{ catalogId: catalogItem.id, quantity: 1, ...(input.language ? { metadata: { language: input.language } } : {}) }];
    }

    if (!requestedItems || requestedItems.length === 0) {
      throw new ValidationError('At least one item or valid reportType must be provided');
    }

    // 2b. Consultation types are database rows edited in the admin; the catalogue reads them from
    // an in-memory snapshot. Money is about to be charged, so the snapshot is re-read now (and the
    // request fails if the database cannot be read) whenever an item is not a code constant: a
    // type created or re-priced a moment ago, or the first request after start-up, is priced right.
    if (requestedItems.some((item) => commerceCatalog.isDatabaseItem(item.catalogId))) {
      await commerceCatalog.refresh({ force: true });
    }

    // 3. Authoritative server calculation
    const calculated: CalculatedOrder = commerceCatalog.calculateOrder(requestedItems);

    // The language of a report is chosen before payment and fixed for that purchase (as on the website).
    // It is stored on the order item; a language the report has no edition for is refused before any charge.
    for (const ci of calculated.items) {
      const reportType = ci.catalogItem.legacyReportType;
      if (ci.catalogItem.itemType !== OrderItemType.REPORT || !reportType) continue;
      const requested = ci.metadata?.language;
      if (requested !== undefined && !REPORT_LANGUAGES.includes(requested)) {
        throw new ValidationError(`Unsupported report language "${String(requested)}". Use one of: ${REPORT_LANGUAGES.join(', ')}.`);
      }
      const language = normalizeReportLanguage(requested);
      const available = platformReportLanguages(reportType);
      if (!available.includes(language)) {
        throw new AppError(
          `The ${reportType} report is not available in language "${language}". Available: ${available.join(', ') || 'none'}.`,
          400,
          'REPORT_LANGUAGE_NOT_AVAILABLE'
        );
      }
      ci.metadata = { ...(ci.metadata ?? {}), language };
    }

    // If all items belong to a single report type, preserve legacy reportType on order for backward compatibility
    if (!legacyReportType && calculated.items.length === 1 && calculated.items[0].catalogItem.legacyReportType) {
      legacyReportType = calculated.items[0].catalogItem.legacyReportType;
    }

    // Determine sale type for coupon validation (owner decision 2026-11-24: products, reports, consultations)
    let saleType: CouponSaleType = 'products';
    if (calculated.items.every((ci) => ci.catalogItem.itemType === OrderItemType.REPORT) || legacyReportType) {
      saleType = 'reports';
    } else if (calculated.items.every((ci) => ci.catalogItem.itemType === OrderItemType.CONSULTATION)) {
      saleType = 'consultations';
    }

    let couponDiscountPaise = input.discountPaise ?? 0;
    if (input.couponCode) {
      const { coupon, result: evalResult } = await couponsService.evaluate(prisma, {
        code: input.couponCode,
        userId: user.id,
        itemsTotalPaise: calculated.subtotal,
        saleType,
      });
      if (!coupon || !evalResult.ok) {
        const reason = !evalResult.ok ? evalResult.reason : 'COUPON_INACTIVE';
        const message = !evalResult.ok ? evalResult.message : 'This coupon is no longer valid';
        throw new AppError(message, 400, reason);
      }
      couponDiscountPaise = evalResult.discountPaise;
    }

    // 3b. GST and totals from the money engine (./money/tax.ts): each item's own GST config
    // (inclusive backs the tax out of the price, exclusive adds it on top), with any order-level
    // discount spread over the items first. For the tax-inclusive catalogue without a discount this
    // gives the same figures as commerceCatalog.calculateOrder.
    const sale = calculateSale({
      lines: calculated.items.map((ci, index) => ({
        key: String(index),
        unitPricePaise: ci.unitPrice,
        quantity: ci.quantity,
        gst: {
          enabled: ci.taxRate > 0,
          rateBp: ci.taxRate,
          type: ci.catalogItem.taxIncluded ? 'inclusive' : 'exclusive',
        },
      })),
      discountPaise: couponDiscountPaise,
    });
    const netSubtotal = sale.lines.reduce((sum, line) => sum + line.basePaise, 0);

    // 3c. What the gateway charges: the INR total converted at the server-side rate when the
    // customer pays in another currency. An unsupported currency is refused here.
    const quote = await quoteCheckout(sale.totalPaise, input.currency);

    // 4. Create Gateway Order with trusted server amount
    const rzOrder = await paymentService.createRazorpayOrder(
      quote.amountMinor,
      quote.currency,
      `rcpt_${Date.now()}`
    );

    // 5. Persist Order and OrderItems in single transaction
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: user.id,
          razorpayOrderId: rzOrder.id,
          amount: sale.totalPaise, // INR base amount
          subtotal: netSubtotal,
          taxAmount: sale.totalTaxPaise,
          discountAmount: sale.discountPaise,
          currency: calculated.currency,
          paidCurrency: quote.currency,
          paidAmountMinor: quote.amountMinor,
          exchangeRate: quote.exchangeRate,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          idempotencyKey: input.idempotencyKey || null,
          reportType: legacyReportType || null,
          notes: input.notes || null,
          items: {
            create: calculated.items.map((ci, index) => ({
              itemType: ci.catalogItem.itemType,
              catalogId: ci.catalogItem.id,
              title: ci.catalogItem.title,
              description: ci.catalogItem.description,
              quantity: ci.quantity,
              unitPrice: ci.unitPrice,
              taxRate: ci.taxRate,
              taxAmount: sale.lines[index].taxPaise,
              taxInclusive: sale.lines[index].type === 'inclusive',
              totalAmount: sale.lines[index].totalPaise,
              currency: calculated.currency,
              fulfillmentType: ci.catalogItem.fulfillmentType,
              metadata: ci.metadata ? (ci.metadata as any) : undefined,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Ledger: one PENDING transaction per payment attempt, written with the order.
      await transactionsService.recordAttempt(tx, createdOrder);

      if (input.couponCode && couponDiscountPaise > 0) {
        await couponsService.reserveForOrder(tx, {
          code: input.couponCode,
          userId: user.id,
          itemsTotalPaise: calculated.subtotal,
          orderId: createdOrder.id,
          expectedDiscountPaise: couponDiscountPaise,
          saleType,
        });
      }

      return createdOrder;
    });

    logger.info(
      { userId: user.id, orderId: order.id, razorpayOrderId: order.razorpayOrderId, amount: order.amount },
      'Unified commerce order created successfully'
    );

    return {
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.amount,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      currency: order.currency,
      paidCurrency: order.paidCurrency,
      paidAmountMinor: order.paidAmountMinor ?? order.amount,
      exchangeRate: order.exchangeRate ? order.exchangeRate.toString() : '1',
      status: order.status,
      paymentStatus: order.paymentStatus,
      reportType: order.reportType,
      items: order.items,
      razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
    };
  }

  /**
   * Verify checkout signature and transition order to PAID atomically.
   */
  public async verifyPayment(
    input: VerifyPaymentParams,
    user: { id: string; role?: string }
  ) {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Enforce ownership: only order owner or admin can verify payment
    if (order.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new NotFoundError('Order not found'); // 404 prevents ID enumeration
    }

    // Idempotent replay: if already PAID, return cleanly
    if (order.status === OrderStatus.PAID) {
      logger.info({ orderId: order.id, userId: user.id }, 'Payment already verified (Idempotent replay)');
      return {
        message: 'Payment verified successfully',
        order,
      };
    }

    // Prevent transitions from terminal states
    if (order.status === OrderStatus.CANCELLED) {
      throw new ValidationError('Cannot verify payment for a cancelled order');
    }

    // A shop order normally comes through the shop's own verification; if it is verified here
    // instead, it must get exactly the same paid effects (stock, downloads, coupon, cart, status).
    const hasProductItems = order.items.some((item) => item.itemType === OrderItemType.PRODUCT);
    const onlyProductItems = hasProductItems && order.items.every((item) => item.itemType === OrderItemType.PRODUCT);

    // Verify signature
    const isValid = paymentService.verifyCheckoutSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature
    );

    if (!isValid) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.FAILED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });
      // Product order: the website status follows and the coupon hold is freed (as the shop's own verification does).
      if (hasProductItems) {
        await shopOrdersService.markPaymentFailed(order.id);
      }
      await transactionsService.markOrderFailed(order.id);
      logger.warn(
        { orderId: order.id, userId: user.id, razorpayOrderId: input.razorpayOrderId },
        'Payment signature verification failed'
      );
      throw new ValidationError('Invalid payment signature');
    }

    // The signature only proves that the gateway issued this payment id for this gateway order id.
    // Read the payment back and compare what was actually paid with the stored order: gateway
    // order id, amount and currency. Nothing is marked paid (or failed) on a mismatch.
    const expectedAmount = order.paidAmountMinor ?? order.amount;
    const expectedCurrency = order.paidCurrency || order.currency;
    const gatewayPayment = await paymentService.fetchRazorpayPayment(input.razorpayPaymentId);
    if (gatewayPayment) {
      const settled = gatewayPayment.status === 'captured' || gatewayPayment.status === 'authorized';
      if (
        gatewayPayment.id !== input.razorpayPaymentId ||
        gatewayPayment.orderId !== order.razorpayOrderId ||
        gatewayPayment.amount !== expectedAmount ||
        gatewayPayment.currency.toUpperCase() !== expectedCurrency.toUpperCase() ||
        !settled
      ) {
        logger.error(
          {
            orderId: order.id,
            razorpayPaymentId: input.razorpayPaymentId,
            expectedAmount,
            expectedCurrency,
            actualAmount: gatewayPayment.amount,
            actualCurrency: gatewayPayment.currency,
            orderIdMatches: gatewayPayment.orderId === order.razorpayOrderId,
            paymentStatus: gatewayPayment.status,
          },
          'Payment does not match the order; verification refused'
        );
        throw new AppError('Payment does not match this order', 400, 'PAYMENT_MISMATCH');
      }
    }

    // Set inside the transaction when this call (not the webhook, not a parallel verify) is the one
    // that applied the shop's paid effects; only then is the customer told about the order.
    let shopEffectsApplied = false;

    // Atomic transaction for Order state transition, fulfillment units creation, and audit trail
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Lock Order FIRST (Global Lock Hierarchy)
      const lockedOrders = await tx.$queryRaw<Array<{
        id: string;
        status: OrderStatus;
        paymentStatus: PaymentStatus;
        paidAt: Date | null;
        version: number;
        amount: number;
        currency: string;
      }>>`
        SELECT id, status, "paymentStatus", "paidAt", version, amount, currency
        FROM "orders"
        WHERE id = ${order.id}
        FOR UPDATE;
      `;
      if (!lockedOrders.length) {
        throw new NotFoundError('Order not found');
      }
      const lockedOrder = lockedOrders[0];

      // Concurrent idempotency check under lock
      if (lockedOrder.status === OrderStatus.PAID) {
        const currentPaid = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        return currentPaid!;
      }
      // Cancelled while this request was checking the payment (for a shop order: superseded by a
      // new checkout, its coupon hold already freed). Never marked paid from here.
      if (lockedOrder.status === OrderStatus.CANCELLED) {
        throw new ValidationError('Cannot verify payment for a cancelled order');
      }

      // 2. Lock OrderItems SECOND in ASC Order
      await tx.$queryRaw`
        SELECT id
        FROM "order_items"
        WHERE "orderId" = ${order.id}
        ORDER BY id ASC
        FOR UPDATE;
      `;

      // 3. Atomically transition order to PAID, CAPTURED, paidAt = clock_timestamp(), version = version + 1
      await tx.$executeRaw`
        UPDATE "orders"
        SET
          status = 'PAID'::"OrderStatus",
          "paymentStatus" = 'CAPTURED'::"PaymentStatus",
          "paidAt" = COALESCE("paidAt", clock_timestamp()),
          "version" = version + 1,
          "razorpayPaymentId" = ${input.razorpayPaymentId},
          "updatedAt" = clock_timestamp()
        WHERE id = ${order.id};
      `;

      // 4. Create fulfillment units atomically for all purchased items
      await fulfillmentService.createFulfillmentUnitsForOrder(order.id, tx);

      // 4b. Product lines: stock, download entitlements, coupon use, saved cart and website status,
      // through the one function every paying path uses. It runs once per order: this transaction
      // holds the order row lock and returned above if the order was already paid, and the function
      // itself records that it ran (`ShopOrder.paidEffectsApplied`), so the shop verification, this
      // verification and the webhook can never apply the effects twice between them.
      if (hasProductItems) {
        const effects = await shopOrdersService.applyPaidEffects(tx, order.id);
        shopEffectsApplied = effects.applied;
      }

      // 5. Reconcile order fulfillment status (keeps commercial status = PAID)
      await fulfillmentService.reconcileOrderFulfillment(order.id, tx);

      // 6. Money: ledger transaction -> SUCCESS and the invoice number, in this same transaction
      // (the order row is locked above, so verify and the webhook cannot both claim the payment).
      await settleOrderPaid(tx, order.id, {
        gatewayPaymentId: input.razorpayPaymentId,
        gatewayOrderId: input.razorpayOrderId,
        raw: gatewayPayment?.raw,
      });

      const paidOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if ((tx as any).auditLog) {
        await (tx as any).auditLog.create({
          data: {
            adminId: user.id,
            adminEmail: 'SYSTEM_PAYMENT_GATEWAY',
            action: 'PAYMENT_VERIFIED',
            resource: `Order:${order.id}`,
            details: `Payment of ${order.amount} paise verified for order ${order.id}`,
            ipAddress: '127.0.0.1',
          },
        });
      }

      return paidOrder!;
    });

    logger.info(
      { userId: user.id, orderId: updatedOrder.id, razorpayPaymentId: input.razorpayPaymentId },
      'Payment verified and order status transitioned to PAID atomically'
    );

    // Shop order: the website channels' "order confirmed" (never throws). The app's push and in-app
    // notice below then go out with websiteChannels off, so the customer is not messaged twice.
    if (shopEffectsApplied) {
      await shopOrdersService.notifyOrderStatus(updatedOrder.id);
    }

    // Non-blocking notification dispatch
    try {
      await notificationService.sendNotification({
        userId: user.id,
        type: 'PAYMENT_SUCCESS',
        entityId: updatedOrder.id,
        idempotencyKey: `payment_success:${updatedOrder.id}`,
        route: 'OPEN_PAYMENTS',
        ...(onlyProductItems ? { websiteChannels: false } : {}),
        templateData: {
          amountRupees: (updatedOrder.amount / 100).toFixed(2),
          orderId: updatedOrder.id,
          reportName: updatedOrder.items[0]?.title || updatedOrder.reportType || 'Astrology Offering',
        },
      });
    } catch (notifErr) {
      logger.error({ orderId: updatedOrder.id, notifErr }, 'Failed to dispatch payment success notification');
    }

    return {
      message: 'Payment verified successfully',
      order: updatedOrder,
    };
  }

  /**
   * Item-level refund allocation obeying lock hierarchy:
   * orders -> order_items -> refunds -> refund_item_allocations.
   */
  public async allocateRefundToItem(
    params: {
      orderId: string;
      refundId: string;
      orderItemId: string;
      amountPaise: number;
      restockQuantity?: number;
      reason?: string;
    },
    txClient?: Prisma.TransactionClient
  ) {
    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Validate positive allocation amount
      if (!params.amountPaise || params.amountPaise <= 0) {
        throw new ValidationError('Refund allocation amount must be greater than zero');
      }

      // 2. Lock Order FIRST
      const orders = await tx.$queryRaw<Array<{ id: string; status: OrderStatus; amount: number }>>`
        SELECT id, status, amount
        FROM "orders"
        WHERE id = ${params.orderId}
        FOR UPDATE;
      `;
      if (!orders.length) {
        throw new NotFoundError(`Order ${params.orderId} not found`);
      }

      // 3. Lock OrderItems SECOND in ASC Order
      const items = await tx.$queryRaw<Array<{
        id: string;
        orderId: string;
        totalAmount: number;
        quantity: number;
        itemType: OrderItemType;
        fulfillmentType: FulfillmentType;
      }>>`
        SELECT id, "orderId", "totalAmount", quantity, "itemType", "fulfillmentType"
        FROM "order_items"
        WHERE "orderId" = ${params.orderId}
        ORDER BY id ASC
        FOR UPDATE;
      `;

      const targetItem = items.find((it) => it.id === params.orderItemId);
      if (!targetItem) {
        throw new AppError(
          `OrderItem ${params.orderItemId} does not belong to order ${params.orderId}`,
          400,
          'ORDER_MISMATCH'
        );
      }

      // 4. Lock Refund THIRD
      const refunds = await tx.$queryRaw<Array<{
        id: string;
        orderId: string;
        amount: number;
        status: RefundStatus;
      }>>`
        SELECT id, "orderId", amount, status
        FROM "refunds"
        WHERE id = ${params.refundId} AND "orderId" = ${params.orderId}
        FOR UPDATE;
      `;
      if (!refunds.length) {
        throw new AppError(
          `Refund ${params.refundId} does not belong to order ${params.orderId}`,
          400,
          'ORDER_MISMATCH'
        );
      }
      const refund = refunds[0];

      // 5. Check if allocation already exists (Idempotency)
      const existing = await tx.refundItemAllocation.findUnique({
        where: {
          refundId_orderItemId: {
            refundId: params.refundId,
            orderItemId: params.orderItemId,
          },
        },
      });

      if (existing) {
        if (existing.amount === params.amountPaise) {
          return existing; // Idempotent replay
        }
      }

      // 6. Cumulative check: sum of allocations for this refund must not exceed refund.amount
      const refundAllocRows = await tx.$queryRaw<Array<{ total: bigint | number | null }>>`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM "refund_item_allocations"
        WHERE "refundId" = ${params.refundId}
          AND "orderItemId" != ${params.orderItemId};
      `;
      const currentRefundAllocated = Number(refundAllocRows[0]?.total || 0);
      if (currentRefundAllocated + params.amountPaise > refund.amount) {
        throw new AppError(
          `Refund allocation (${params.amountPaise} paise) exceeds remaining unallocated refund balance (${refund.amount - currentRefundAllocated} paise)`,
          400,
          'ALLOCATION_EXCEEDS_REFUND'
        );
      }

      // 7. Cumulative check: sum of allocations for this orderItem across all non-failed refunds must not exceed orderItem.amount
      const itemAllocRows = await tx.$queryRaw<Array<{ total: bigint | number | null }>>`
        SELECT COALESCE(SUM(ria.amount), 0) as total
        FROM "refund_item_allocations" ria
        JOIN "refunds" r ON r.id = ria."refundId"
        WHERE ria."orderItemId" = ${params.orderItemId}
          AND r.status != 'FAILED'
          AND ria."refundId" != ${params.refundId};
      `;
      const currentItemAllocated = Number(itemAllocRows[0]?.total || 0);
      const remainingItemBalance = targetItem.totalAmount - currentItemAllocated;
      if (params.amountPaise > remainingItemBalance) {
        throw new AppError(
          `Refund allocation (${params.amountPaise} paise) exceeds item refundable balance (${remainingItemBalance} paise)`,
          400,
          'ALLOCATION_EXCEEDS_ITEM_BALANCE'
        );
      }

      // 8. Persist allocation
      const allocation = await tx.refundItemAllocation.upsert({
        where: {
          refundId_orderItemId: {
            refundId: params.refundId,
            orderItemId: params.orderItemId,
          },
        },
        update: {
          amount: params.amountPaise,
          restockQuantity: params.restockQuantity || 0,
          reason: params.reason || null,
        },
        create: {
          orderId: params.orderId,
          refundId: params.refundId,
          orderItemId: params.orderItemId,
          amount: params.amountPaise,
          restockQuantity: params.restockQuantity || 0,
          reason: params.reason || null,
        },
      });

      // If this item is now fully refunded, cancel its unfulfilled fulfillment units & in-flight reports
      if (currentItemAllocated + params.amountPaise >= targetItem.totalAmount) {
        await tx.fulfillmentUnit.updateMany({
          where: {
            orderItemId: targetItem.id,
            status: { in: [FulfillmentUnitStatus.UNFULFILLED, FulfillmentUnitStatus.PROCESSING] },
          },
          data: {
            status: FulfillmentUnitStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

        const unitsWithReport = await tx.fulfillmentUnit.findMany({
          where: {
            orderItemId: targetItem.id,
          },
          select: { id: true },
        });

        const unitIds = unitsWithReport.map((u) => u.id);
        if (unitIds.length > 0) {
          await tx.report.updateMany({
            where: {
              fulfillmentUnitId: { in: unitIds },
              status: { notIn: ['COMPLETED'] },
            },
            data: {
              status: 'FAILED',
              stage: 'FAILED',
              errorCode: 'ORDER_REFUNDED',
              errorMessage: 'Line item was refunded; report generation cancelled.',
              claimToken: null,
              claimExpiresAt: null,
              claimVersion: { increment: 1 },
              failedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        await fulfillmentService.reconcileOrderFulfillment(params.orderId, tx);
      }

      return allocation;
    };

    if (txClient) {
      return execute(txClient);
    }
    return prisma.$transaction(execute, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /**
   * Process refund with strict balance validation preventing over-refunds.
   */
  public async requestRefund(
    input: RequestRefundParams,
    requester: { id: string; role?: string; email?: string | null },
    authorisation: RefundAuthorisation = {}
  ) {
    // Owner decision 2026-11-24 (open-questions M4): refunds are issued by staff only. The caller
    // (the admin route, after `checkPermission('payments:refund')`) states that the permission
    // check has passed; the order's owner can no longer refund their own order.
    if (authorisation.staffAuthorised !== true) {
      throw new AppError('Refunds are issued by our staff. Please contact support.', 403, 'REFUND_STAFF_ONLY');
    }

    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { refunds: true, items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Must be in refundable state
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PARTIALLY_REFUNDED && order.status !== OrderStatus.FULFILLED) {
      throw new ValidationError(`Order in status ${order.status} cannot be refunded`);
    }

    if (!order.razorpayPaymentId) {
      throw new ValidationError('Cannot refund an order without a captured payment ID');
    }

    // Refund amounts here are INR paise. An order charged in another currency cannot be refunded
    // through this path: the gateway would read the figure in the paid currency's units.
    if ((order.paidCurrency || 'INR') !== 'INR') {
      throw new AppError('Refunds are not available for orders paid in a foreign currency', 400, 'REFUND_UNSUPPORTED_CURRENCY');
    }

    // Calculate existing processed/pending refunds (excluding FAILED)
    const existingRefundTotal = order.refunds
      .filter((r) => r.status !== RefundStatus.FAILED)
      .reduce((sum, r) => sum + r.amount, 0);

    const maxRefundable = order.amount - existingRefundTotal;
    if (maxRefundable <= 0) {
      throw new ValidationError('Order has already been fully refunded');
    }

    const refundAmount = input.amountPaise ?? maxRefundable;
    if (refundAmount <= 0) {
      throw new ValidationError('Refund amount must be greater than zero');
    }

    if (refundAmount > maxRefundable) {
      throw new ValidationError(
        `Refund amount (${refundAmount} paise) exceeds maximum refundable balance (${maxRefundable} paise)`
      );
    }

    // Idempotency check for refund
    if (input.idempotencyKey) {
      const existingRefund = await prisma.refund.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existingRefund) {
        logger.info({ refundId: existingRefund.id }, 'Returning existing refund for idempotencyKey');
        return { refund: existingRefund, order };
      }
    }

    // Call payment gateway to issue refund
    let rzRefund: any;
    try {
      rzRefund = await paymentService.createRazorpayRefund(
        order.razorpayPaymentId,
        refundAmount,
        { reason: input.reason || 'Refund issued by staff' }
      );
    } catch (gatewayErr: any) {
      // Record failed refund attempt without altering order payment status
      await prisma.refund.create({
        data: {
          orderId: order.id,
          razorpayPaymentId: order.razorpayPaymentId,
          amount: refundAmount,
          currency: order.currency,
          status: RefundStatus.FAILED,
          reason: `Gateway error: ${gatewayErr?.message || 'Refund failed'}`,
          idempotencyKey: input.idempotencyKey || null,
        },
      });
      throw gatewayErr;
    }

    if (rzRefund.status === 'failed') {
      const failedRefund = await prisma.refund.create({
        data: {
          orderId: order.id,
          razorpayRefundId: rzRefund.id,
          razorpayPaymentId: order.razorpayPaymentId,
          amount: refundAmount,
          currency: order.currency,
          status: RefundStatus.FAILED,
          reason: input.reason || 'Payment provider rejected refund',
          idempotencyKey: input.idempotencyKey || null,
        },
      });
      return { refund: failedRefund, order };
    }

    const isFullRefund = (existingRefundTotal + refundAmount) >= order.amount;

    // Atomically persist refund record and update order status
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock Order FIRST
      await tx.$queryRaw`
        SELECT id FROM "orders" WHERE id = ${order.id} FOR UPDATE;
      `;

      // 2. Lock OrderItems SECOND in ASC Order
      await tx.$queryRaw`
        SELECT id FROM "order_items" WHERE "orderId" = ${order.id} ORDER BY id ASC FOR UPDATE;
      `;

      const refundRecord = await tx.refund.create({
        data: {
          orderId: order.id,
          razorpayRefundId: rzRefund.id,
          razorpayPaymentId: order.razorpayPaymentId,
          amount: refundAmount,
          currency: order.currency,
          status: RefundStatus.PROCESSED,
          reason: input.reason || null,
          idempotencyKey: input.idempotencyKey || null,
        },
      });

      // 3. Process item allocations if specified
      if (input.itemAllocations && input.itemAllocations.length > 0) {
        for (const alloc of input.itemAllocations) {
          await this.allocateRefundToItem(
            {
              orderId: order.id,
              refundId: refundRecord.id,
              orderItemId: alloc.orderItemId,
              amountPaise: alloc.amountPaise,
              restockQuantity: alloc.restockQuantity,
              reason: alloc.reason,
            },
            tx
          );
        }
      }

      // Update commercial order and payment status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: isFullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED,
          paymentStatus: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        },
        include: { refunds: true, items: true },
      });

      // Revoke entitlements and cancel unfulfilled units on full refund
      if (isFullRefund) {
        await tx.digitalProductEntitlement.updateMany({
          where: { orderId: order.id },
          data: { status: EntitlementStatus.REVOKED },
        });
        await tx.fulfillmentUnit.updateMany({
          where: {
            orderId: order.id,
            status: { in: [FulfillmentUnitStatus.UNFULFILLED, FulfillmentUnitStatus.PROCESSING] },
          },
          data: {
            status: FulfillmentUnitStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });
        await tx.report.updateMany({
          where: {
            orderId: order.id,
            status: { notIn: ['COMPLETED'] },
          },
          data: {
            status: 'FAILED',
            stage: 'FAILED',
            errorCode: 'ORDER_REFUNDED',
            errorMessage: 'Order was refunded; report generation cancelled.',
            claimToken: null,
            claimExpiresAt: null,
            claimVersion: { increment: 1 },
            failedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        await fulfillmentService.reconcileOrderFulfillment(order.id, tx);
      }

      if ((tx as any).auditLog) {
        await (tx as any).auditLog.create({
          data: {
            adminId: requester.id,
            adminEmail: requester.email || 'SYSTEM_REFUND_ENGINE',
            action: 'ORDER_REFUNDED',
            resource: `Order:${order.id}`,
            details: `Refund of ${refundAmount} paise processed. Full refund: ${isFullRefund}`,
            ipAddress: '127.0.0.1',
          },
        });
      }

      return { refund: refundRecord, order: updatedOrder };
    });

    logger.info(
      { orderId: order.id, refundId: result.refund.id, amount: refundAmount, isFullRefund },
      'Refund processed successfully'
    );

    return result;
  }

  /**
   * Get single order by ID with ownership enforcement (Prevents IDOR).
   */
  public async getOrderById(orderId: string, user: { id: string; role?: string }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        refunds: true,
        reports: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (order.userId !== user.id && !isAdmin) {
      throw new NotFoundError('Order not found'); // 404 hides resource existence
    }

    // A completed report is shown to the customer only after REPORT_SEND_DELAY_HOURS (report-release.ts).
    if (!isAdmin) {
      const now = new Date();
      const delayMs = reportReleaseDelayMs();
      return { ...order, reports: order.reports.map((report) => customerReportRow(report, now, delayMs)) };
    }

    return order;
  }

  /**
   * Get authenticated user's order history.
   */
  public async getUserOrders(user: { id: string }) {
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: true,
        refunds: true,
        reports: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // A completed report is shown to the customer only after REPORT_SEND_DELAY_HOURS (report-release.ts).
    const now = new Date();
    const delayMs = reportReleaseDelayMs();
    return orders.map((order) => ({ ...order, reports: order.reports.map((report) => customerReportRow(report, now, delayMs)) }));
  }
}

export const commerceService = new CommerceService();
