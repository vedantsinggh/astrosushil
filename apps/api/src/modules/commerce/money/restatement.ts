import { OrderItemType, OrderStatus, Prisma } from '@prisma/client';
import { AppError, NotFoundError, ValidationError } from '../../../errors/app-error';
import { logger } from '../../../utils/logger';
import { transactionsService } from '../../transactions/transactions.service';
import { BASE_CURRENCY, RATE_DECIMALS, convertInrPaiseToMinor, decimalStringToScaledRate, isSupportedCurrency } from './currency';

type Tx = Prisma.TransactionClient;

/** The plan a paid consultation order is re-stated to. All amounts are INR paise. */
export interface ConsultationPlanRestatement {
  catalogId: string;
  title: string;
  description: string | null;
  /** Listed price of the plan (GST inside it when `taxInclusive`, on top of it otherwise). */
  unitPricePaise: number;
  /** Basis points; 0 when the plan carries no GST. */
  taxRateBp: number;
  taxInclusive: boolean;
  taxablePaise: number;
  taxPaise: number;
  /** What the plan costs the customer, GST included. */
  totalPaise: number;
}

export interface OrderRestatementResult {
  orderId: string;
  previousAmountPaise: number;
  amountPaise: number;
  /** Amount in the currency the customer paid in, re-stated at the order's stored rate. */
  paidAmountMinor: number | null;
  transactionId: string;
  /** True when the order had no ledger row and one was written (website: legacy bookings). */
  transactionCreated: boolean;
  /** The invoice number already issued for this order, or null. It is never changed here. */
  invoiceNumber: string | null;
}

/**
 * The amount charged in the paid currency for `totalPaise`, at the rate stored when the customer
 * paid (never a fresh rate: nothing is charged, the record is only re-stated). INR, or no stored
 * rate, leaves `current` as it is.
 */
export function restatePaidAmountMinor(
  totalPaise: number,
  paidCurrency: string | null | undefined,
  exchangeRate: Prisma.Decimal | string | number | null | undefined,
  current: number | null
): number | null {
  const currency = (paidCurrency || BASE_CURRENCY).toUpperCase();
  if (currency === BASE_CURRENCY || exchangeRate === null || exchangeRate === undefined) return current;
  if (!isSupportedCurrency(currency)) {
    throw new AppError(`The order was paid in ${currency}, which cannot be re-stated.`, 409, 'ORDER_RESTATEMENT_UNSUPPORTED');
  }
  const rateText = new Prisma.Decimal(exchangeRate.toString()).toFixed(RATE_DECIMALS);
  return convertInrPaiseToMinor(totalPaise, currency, decimalStringToScaledRate(rateText));
}

function assertPaise(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ValidationError(`${name} must be a non-negative whole number of paise`);
  }
}

/**
 * Re-states a paid consultation order at another plan's price: the order, its consultation line
 * and its ledger row, in the caller's transaction. Nothing is charged or refunded (website
 * `updateBookingPlan`: the booking and its linked Transaction are overwritten with the new plan's
 * amounts so the GST report shows what the dashboard shows).
 *
 * What stays consistent, by construction:
 *   - the line: `unitPrice`, GST and total are the plan's;
 *   - the order: `amount` = the plan's total, `subtotal` = taxable value, `taxAmount` = GST,
 *     discount 0 (the new amount is the plan's full price), and the amount in the paid currency
 *     re-stated at the order's own stored exchange rate;
 *   - the ledger row: recomputed from the order just written with the function that first wrote
 *     it, so the two cannot differ. An order without a ledger row gets one (the website creates
 *     the missing transaction at this point too).
 *
 * The invoice. The website keeps `booking.invoiceNumber` untouched on a plan change and renders
 * the invoice from the booking each time it is downloaded, so an invoice already issued shows the
 * new plan and amount under its old number. That is reproduced: the invoice row and the counter
 * are never touched, no number is issued or withdrawn here. Whether an issued tax invoice may be
 * re-stated this way (rather than a credit note plus a new invoice) is an accounting question for
 * the owner; the number is returned so the caller can record it, and the change is logged.
 *
 * Refused (nothing is written): an order that is not paid, one that has a refund against it (its
 * refunds are measured against the amount being replaced), and an order that is not exactly one
 * consultation line of quantity 1 (re-stating the whole order at one plan's price would lose the
 * other lines).
 */
export async function restateConsultationOrder(
  tx: Tx,
  orderId: string,
  plan: ConsultationPlanRestatement
): Promise<OrderRestatementResult> {
  assertPaise(plan.unitPricePaise, 'unitPricePaise');
  assertPaise(plan.taxablePaise, 'taxablePaise');
  assertPaise(plan.taxPaise, 'taxPaise');
  assertPaise(plan.totalPaise, 'totalPaise');
  if (!Number.isSafeInteger(plan.taxRateBp) || plan.taxRateBp < 0) {
    throw new ValidationError('taxRateBp must be a non-negative whole number of basis points');
  }
  if (plan.totalPaise < plan.taxPaise || plan.totalPaise < plan.taxablePaise) {
    throw new ValidationError('The plan total cannot be less than its taxable value or its GST');
  }

  // Lock order: orders -> order_items (-> the ledger row, written last).
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "orders" WHERE id = ${orderId} FOR UPDATE;
  `;
  if (!locked.length) throw new NotFoundError('Order not found');
  await tx.$queryRaw`
    SELECT id FROM "order_items" WHERE "orderId" = ${orderId} ORDER BY id ASC FOR UPDATE;
  `;

  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new NotFoundError('Order not found');

  if (order.status === OrderStatus.REFUNDED || order.status === OrderStatus.PARTIALLY_REFUNDED) {
    throw new AppError('This order has a refund against it and cannot be re-stated.', 409, 'ORDER_RESTATEMENT_REFUNDED');
  }
  if (!order.paidAt || (order.status !== OrderStatus.PAID && order.status !== OrderStatus.FULFILLED)) {
    throw new AppError('Only a paid order can be re-stated.', 409, 'ORDER_NOT_PAID');
  }
  const line = order.items[0];
  if (order.items.length !== 1 || line.itemType !== OrderItemType.CONSULTATION || line.quantity !== 1) {
    throw new AppError(
      'Only an order that is a single consultation can be re-stated for a plan change.',
      409,
      'ORDER_RESTATEMENT_UNSUPPORTED'
    );
  }

  const paidAmountMinor =
    (order.paidCurrency || BASE_CURRENCY).toUpperCase() === BASE_CURRENCY
      ? order.paidAmountMinor === null
        ? null
        : plan.totalPaise
      : restatePaidAmountMinor(plan.totalPaise, order.paidCurrency, order.exchangeRate, order.paidAmountMinor);

  await tx.orderItem.update({
    where: { id: line.id },
    data: {
      catalogId: plan.catalogId,
      title: plan.title,
      description: plan.description,
      unitPrice: plan.unitPricePaise,
      taxRate: plan.taxRateBp,
      taxAmount: plan.taxPaise,
      taxInclusive: plan.taxInclusive,
      totalAmount: plan.totalPaise,
    },
  });
  const restated = await tx.order.update({
    where: { id: orderId },
    data: {
      amount: plan.totalPaise,
      subtotal: plan.taxablePaise,
      taxAmount: plan.taxPaise,
      discountAmount: 0,
      paidAmountMinor,
    },
    include: { items: true },
  });

  let transaction = await transactionsService.restateFromOrder(tx, restated);
  const transactionCreated = !transaction;
  if (!transaction) {
    transaction = await transactionsService.markOrderPaid(tx, restated, {
      gatewayPaymentId: restated.razorpayPaymentId,
      gatewayOrderId: restated.razorpayOrderId,
    });
  }

  const invoice = await tx.invoice.findUnique({ where: { orderId } });
  const invoiceNumber = invoice?.number ?? null;
  if (invoiceNumber) {
    logger.warn(
      { orderId, invoiceNumber, previousAmountPaise: order.amount, amountPaise: plan.totalPaise },
      'Plan change re-stated an order whose invoice number was already issued; the number is kept'
    );
  }

  return {
    orderId,
    previousAmountPaise: order.amount,
    amountPaise: plan.totalPaise,
    paidAmountMinor,
    transactionId: transaction.id,
    transactionCreated,
    invoiceNumber,
  };
}
