import { paymentService } from '../../services/payment.service';
import { AppError } from '../../errors/app-error';
import { logger } from '../../utils/logger';

export interface PayableOrder {
  id: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  paidAmountMinor: number | null;
  paidCurrency: string | null;
}

/**
 * A valid signature only proves that the gateway issued this payment id for this gateway order id.
 * Before an order is marked paid, the payment is read back from the gateway and its order id,
 * amount and currency are compared with the stored order (the same check commerce.service
 * `verifyPayment` makes). Nothing is marked paid or failed on a mismatch: 400 PAYMENT_MISMATCH.
 *
 * Returns the gateway's payment entity for the ledger, or null where the gateway cannot be reached
 * outside production (mock payments in development and CI).
 */
export async function assertGatewayPaymentMatches(order: PayableOrder, razorpayPaymentId: string): Promise<unknown | null> {
  const expectedAmount = order.paidAmountMinor ?? order.amount;
  const expectedCurrency = order.paidCurrency || order.currency;
  const payment = await paymentService.fetchRazorpayPayment(razorpayPaymentId);
  if (!payment) return null;

  const settled = payment.status === 'captured' || payment.status === 'authorized';
  if (
    payment.id !== razorpayPaymentId ||
    payment.orderId !== order.razorpayOrderId ||
    payment.amount !== expectedAmount ||
    payment.currency.toUpperCase() !== expectedCurrency.toUpperCase() ||
    !settled
  ) {
    logger.error(
      {
        orderId: order.id,
        expectedAmount,
        expectedCurrency,
        actualAmount: payment.amount,
        actualCurrency: payment.currency,
        orderIdMatches: payment.orderId === order.razorpayOrderId,
        paymentStatus: payment.status,
      },
      'Payment does not match the order; verification refused'
    );
    throw new AppError('Payment does not match this order', 400, 'PAYMENT_MISMATCH');
  }
  return payment.raw;
}
