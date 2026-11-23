import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../../errors/app-error';
import { invoiceService, AllocationResult } from '../../invoices/invoice.service';
import { GatewayPaymentInfo, transactionsService } from '../../transactions/transactions.service';
import { AttemptOptions, deriveSaleType } from '../../transactions/ledger';

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
  return { transactionId: transaction.id, invoice };
}
