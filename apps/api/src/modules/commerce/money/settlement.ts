import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../../errors/app-error';
import { invoiceService, AllocationResult } from '../../invoices/invoice.service';
import { GatewayPaymentInfo, transactionsService } from '../../transactions/transactions.service';
import { AttemptOptions, deriveSaleType } from '../../transactions/ledger';
import { LedgerTransactionStatus, OrderStatus } from '@prisma/client';
import { logger } from '../../../utils/logger';
import { couponsService } from '../../coupons/coupons.service';

type Tx = Prisma.TransactionClient;

export interface PaidSettlement {
  transactionId: string;
  invoice: AllocationResult;
}

/**
 * The money side of "this order is now paid": the ledger row becomes SUCCESS and the sale gets its
 * invoice number, in the caller's transaction.
 *
 * Contract for every code path that marks an order paid (checkout verify, gateway webhook, admin
 * manual payment):
 *   1. open a database transaction;
 *   2. lock the order row (`SELECT ... FROM "orders" WHERE id = $1 FOR UPDATE`) and return early if
 *      it is already paid;
 *   3. set the order paid (`paidAt` included);
 *   4. call `settleOrderPaid(tx, orderId, payment)`.
 * Step 2 is what makes the claim happen once; this function is also safe to repeat (it returns the
 * existing ledger row and invoice number). It never issues or records a refund.
 */
export async function settleOrderPaid(
  tx: Tx,
  orderId: string,
  payment: GatewayPaymentInfo = {},
  options: AttemptOptions = {}
): Promise<PaidSettlement> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true, shippingAddress: { select: { state: true } } },
  });
  if (!order) throw new NotFoundError('Order not found');

  const transaction = await transactionsService.markOrderPaid(tx, order, payment, options);
  const invoice = await invoiceService.allocateForPaidOrder(tx, { orderId, saleType: deriveSaleType(order.items) });
  await couponsService.redeemForOrder(tx, orderId);
  return { transactionId: transaction.id, invoice };
}

export interface UnappliedCapture {
  transactionId: string;
  /** False when this capture was already in the ledger (the gateway repeated the event). */
  recorded: boolean;
}

/**
 * The gateway captured a payment for an order that was cancelled before the money arrived (for a
 * shop order: superseded by a new checkout, or cancelled by the customer while unpaid). Call it in
 * a transaction that holds the order row lock and has seen the status CANCELLED.
 *
 * The order is NOT marked paid: its stock was never taken (or was put back), its coupon hold was
 * freed and may have gone to someone else, and the customer may already have paid for the order
 * that replaced it. Marking it paid would ship, grant downloads and issue an invoice for a sale the
 * customer withdrew.
 *
 * The money is not dropped either. The ledger row becomes SUCCESS with the gateway payment id,
 * because the payment was received; no invoice number is issued (there is no sale to invoice); an
 * audit entry is written; and the payment is listed for staff under
 * `GET /admin/transactions/unapplied-payments` (ledger SUCCESS, order not paid) until it is
 * refunded at the gateway or the order is honoured. Safe to repeat.
 */
export async function recordCaptureForCancelledOrder(
  tx: Tx,
  orderId: string,
  payment: GatewayPaymentInfo = {}
): Promise<UnappliedCapture> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true, shippingAddress: { select: { state: true } } },
  });
  if (!order) throw new NotFoundError('Order not found');
  if (order.status !== OrderStatus.CANCELLED) {
    throw new Error('recordCaptureForCancelledOrder: the order is not cancelled');
  }

  const existing = await tx.paymentTransaction.findFirst({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  if (existing?.status === LedgerTransactionStatus.SUCCESS) {
    return { transactionId: existing.id, recorded: false };
  }

  const transaction = await transactionsService.markOrderPaid(tx, order, payment);
  await couponsService.releaseForOrder(tx, orderId);
  await tx.auditLog.create({
    data: {
      adminId: 'SYSTEM_PAYMENT_GATEWAY',
      adminEmail: 'SYSTEM_PAYMENT_GATEWAY',
      action: 'PAYMENT_CAPTURED_FOR_CANCELLED_ORDER',
      resource: `Order:${orderId}`,
      details: `Gateway captured ${transaction.amountMinor} ${transaction.currency} minor units (payment ${payment.gatewayPaymentId ?? 'unknown'}) for a cancelled order. Order left cancelled; ledger transaction ${transaction.id} marked SUCCESS; no invoice issued. Refund at the gateway or honour the order.`,
    },
  });
  logger.error(
    { orderId, transactionId: transaction.id, gatewayPaymentId: payment.gatewayPaymentId ?? null },
    'Payment captured for a cancelled order: recorded in the ledger, order left cancelled, staff action needed'
  );
  return { transactionId: transaction.id, recorded: true };
}
