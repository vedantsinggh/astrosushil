import { prisma } from '../../services/prisma.service';
import { paymentService, REPORT_PRICES_PAISE } from '../../services/payment.service';
import { notificationService } from '../notifications/notification.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { CreateOrderInput, VerifyPaymentInput } from './payments.schemas';
import { logger } from '../../utils/logger';

export class PaymentsService {
  public async createOrder(
    input: CreateOrderInput,
    user: { id: string }
  ) {
    const amount = REPORT_PRICES_PAISE[input.reportType];
    if (!amount) {
      throw new ValidationError('Unsupported report type for pricing');
    }

    const rzOrder = await paymentService.createRazorpayOrder(amount, 'INR');

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        razorpayOrderId: rzOrder.id,
        amount,
        currency: 'INR',
        status: 'PENDING',
        reportType: input.reportType,
      },
    });

    logger.info(
      { userId: user.id, orderId: order.id, razorpayOrderId: order.razorpayOrderId, amount },
      'Payment order created successfully'
    );

    return {
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      reportType: order.reportType,
      status: order.status,
    };
  }

  public async verifyPayment(
    input: VerifyPaymentInput,
    user: { id: string }
  ) {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
    });

    if (!order || order.userId !== user.id) {
      throw new NotFoundError('Order not found');
    }

    // Handle Idempotency: If already verified, return existing order cleanly
    if (order.status === 'PAID') {
      logger.info({ orderId: order.id, userId: user.id }, 'Payment already verified (Idempotent replay)');
      return {
        message: 'Payment verified successfully',
        order,
      };
    }

    const isValid = paymentService.verifySignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature
    );

    if (!isValid) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' },
      });
      logger.warn(
        { orderId: order.id, userId: user.id, razorpayOrderId: input.razorpayOrderId },
        'Payment signature verification failed'
      );
      throw new ValidationError('Invalid payment signature');
    }

    // Execute atomic transaction for Order status, user entitlement, and audit log
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const paidOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          razorpayPaymentId: input.razorpayPaymentId,
        },
      });

      // Write transaction audit log
      if ((tx as any).auditLog) {
        await (tx as any).auditLog.create({
          data: {
            adminId: user.id,
            adminEmail: 'SYSTEM_PAYMENT_GATEWAY',
            action: 'PAYMENT_VERIFIED',
            resource: `Order:${order.id}`,
            details: `Payment of ${order.amount} paise verified for report type ${order.reportType}`,
            ipAddress: '127.0.0.1',
          },
        });
      }

      return paidOrder;
    });

    logger.info(
      { userId: user.id, orderId: updatedOrder.id, razorpayPaymentId: input.razorpayPaymentId },
      'Payment verified and transaction completed atomically'
    );

    // Dispatch PAYMENT_SUCCESS notification (non-blocking)
    try {
      await notificationService.sendNotification({
        userId: user.id,
        type: 'PAYMENT_SUCCESS',
        entityId: updatedOrder.id,
        route: 'OPEN_PAYMENTS',
        templateData: {
          amountRupees: (updatedOrder.amount / 100).toFixed(2),
          orderId: updatedOrder.id,
          reportName: updatedOrder.reportType,
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

  public async getUserOrders(user: { id: string }) {
    return prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const paymentsService = new PaymentsService();
