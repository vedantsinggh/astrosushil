import { prisma } from '../../services/prisma.service';
import { paymentService, REPORT_PRICES_PAISE } from '../../services/payment.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { CreateOrderInput, VerifyPaymentInput } from './payments.schemas';

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
      throw new ValidationError('Invalid payment signature');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        razorpayPaymentId: input.razorpayPaymentId,
      },
    });

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
