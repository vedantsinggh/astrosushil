import { prisma } from '../../services/prisma.service';
import { paymentService } from '../../services/payment.service';
import { commerceCatalog, CalculatedOrder } from './commerce.catalog';
import { notificationService } from '../notifications/notification.service';
import { NotFoundError, ValidationError, ForbiddenError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { OrderStatus, PaymentStatus, RefundStatus, ReportType } from '@prisma/client';

export interface CreateOrderParams {
  items?: Array<{ catalogId: string; quantity?: number; metadata?: Record<string, any> }>;
  reportType?: ReportType; // Legacy support
  idempotencyKey?: string;
  notes?: string;
}

export interface VerifyPaymentParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RequestRefundParams {
  orderId: string;
  amountPaise?: number; // Optional; if omitted, full refundable balance is refunded
  reason?: string;
  idempotencyKey?: string;
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
          currency: existing.currency,
          status: existing.status,
          paymentStatus: existing.paymentStatus,
          items: existing.items,
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
      requestedItems = [{ catalogId: catalogItem.id, quantity: 1 }];
    }

    if (!requestedItems || requestedItems.length === 0) {
      throw new ValidationError('At least one item or valid reportType must be provided');
    }

    // 3. Authoritative server calculation
    const calculated: CalculatedOrder = commerceCatalog.calculateOrder(requestedItems);

    // If all items belong to a single report type, preserve legacy reportType on order for backward compatibility
    if (!legacyReportType && calculated.items.length === 1 && calculated.items[0].catalogItem.legacyReportType) {
      legacyReportType = calculated.items[0].catalogItem.legacyReportType;
    }

    // 4. Create Gateway Order with trusted server amount
    const rzOrder = await paymentService.createRazorpayOrder(
      calculated.totalAmount,
      calculated.currency,
      `rcpt_${Date.now()}`
    );

    // 5. Persist Order and OrderItems in single transaction
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: user.id,
          razorpayOrderId: rzOrder.id,
          amount: calculated.totalAmount,
          subtotal: calculated.subtotal,
          taxAmount: calculated.taxAmount,
          discountAmount: calculated.discountAmount,
          currency: calculated.currency,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          idempotencyKey: input.idempotencyKey || null,
          reportType: legacyReportType || null,
          notes: input.notes || null,
          items: {
            create: calculated.items.map((ci) => ({
              itemType: ci.catalogItem.itemType,
              catalogId: ci.catalogItem.id,
              title: ci.catalogItem.title,
              description: ci.catalogItem.description,
              quantity: ci.quantity,
              unitPrice: ci.unitPrice,
              taxRate: ci.taxRate,
              taxAmount: ci.taxAmount,
              totalAmount: ci.totalAmount,
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
      currency: order.currency,
      status: order.status,
      paymentStatus: order.paymentStatus,
      reportType: order.reportType,
      items: order.items,
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
      logger.warn(
        { orderId: order.id, userId: user.id, razorpayOrderId: input.razorpayOrderId },
        'Payment signature verification failed'
      );
      throw new ValidationError('Invalid payment signature');
    }

    // Atomic transaction for Order state transition and audit trail
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const paidOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.CAPTURED,
          razorpayPaymentId: input.razorpayPaymentId,
        },
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

      return paidOrder;
    });

    logger.info(
      { userId: user.id, orderId: updatedOrder.id, razorpayPaymentId: input.razorpayPaymentId },
      'Payment verified and order status transitioned to PAID atomically'
    );

    // Non-blocking notification dispatch
    try {
      await notificationService.sendNotification({
        userId: user.id,
        type: 'PAYMENT_SUCCESS',
        entityId: updatedOrder.id,
        route: 'OPEN_PAYMENTS',
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
   * Process refund with strict balance validation preventing over-refunds.
   */
  public async requestRefund(
    input: RequestRefundParams,
    requester: { id: string; role?: string }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { refunds: true, items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Enforce ownership or admin privilege
    const isAdmin = requester.role === 'ADMIN' || requester.role === 'SUPER_ADMIN';
    if (order.userId !== requester.id && !isAdmin) {
      throw new NotFoundError('Order not found');
    }

    // Must be in refundable state
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PARTIALLY_REFUNDED && order.status !== OrderStatus.FULFILLED) {
      throw new ValidationError(`Order in status ${order.status} cannot be refunded`);
    }

    if (!order.razorpayPaymentId) {
      throw new ValidationError('Cannot refund an order without a captured payment ID');
    }

    // Calculate existing processed/pending refunds
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
    const rzRefund = await paymentService.createRazorpayRefund(
      order.razorpayPaymentId,
      refundAmount,
      { reason: input.reason || 'Client requested refund' }
    );

    const isFullRefund = (existingRefundTotal + refundAmount) >= order.amount;

    // Atomically persist refund record and update order status
    const result = await prisma.$transaction(async (tx) => {
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

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: isFullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED,
          paymentStatus: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        },
        include: { refunds: true, items: true },
      });

      if ((tx as any).auditLog) {
        await (tx as any).auditLog.create({
          data: {
            adminId: requester.id,
            adminEmail: 'SYSTEM_REFUND_ENGINE',
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
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (order.userId !== user.id && !isAdmin) {
      throw new NotFoundError('Order not found'); // 404 hides resource existence
    }

    return order;
  }

  /**
   * Get authenticated user's order history.
   */
  public async getUserOrders(user: { id: string }) {
    return prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: true,
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const commerceService = new CommerceService();
