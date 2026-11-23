import { Prisma, LedgerTransactionType, OrderItemType, SalePaymentMethod } from '@prisma/client';

/** The parts of an order the ledger is written from. */
export interface LedgerOrder {
  id: string;
  userId: string;
  razorpayOrderId: string | null;
  /** INR base amount in paise. */
  amount: number;
  discountAmount: number | null;
  shippingAmount: number | null;
  taxAmount: number | null;
  paidCurrency: string;
  paidAmountMinor: number | null;
  exchangeRate: Prisma.Decimal | string | number | null;
  paymentMethod: SalePaymentMethod;
  items: LedgerOrderItem[];
  shippingAddress?: { state: string | null } | null;
}

export interface LedgerOrderItem {
  itemType: OrderItemType;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  taxInclusive: boolean;
}

/**
 * Website `transactionType` for one of our orders: report purchases and consultation bookings are
 * their own types; everything else sold through an order (products, courses, mixed baskets) is "order".
 */
export function deriveSaleType(items: Array<{ itemType: OrderItemType }>): LedgerTransactionType {
  if (items.length > 0 && items.every((item) => item.itemType === OrderItemType.REPORT)) return LedgerTransactionType.REPORT;
  if (items.length > 0 && items.every((item) => item.itemType === OrderItemType.CONSULTATION)) return LedgerTransactionType.CONSULTATION;
  return LedgerTransactionType.ORDER;
}

/** Fields of a Razorpay payment entity that may be stored. Everything else is dropped. */
const GATEWAY_ALLOWED_KEYS = [
  'id',
  'entity',
  'order_id',
  'amount',
  'currency',
  'base_amount',
  'base_currency',
  'status',
  'method',
  'captured',
  'international',
  'amount_refunded',
  'refund_status',
  'fee',
  'tax',
  'error_code',
  'error_description',
  'error_source',
  'error_step',
  'error_reason',
  'created_at',
] as const;

/**
 * What is kept of a gateway payment entity. An allow-list: card, bank, VPA, wallet, e-mail,
 * contact, notes and acquirer data never reach the database (the website stores nothing in
 * `rawResponse`, but the column is `Mixed`, so anything could be put there).
 */
export function sanitizeGatewayPayload(entity: unknown): Prisma.InputJsonObject | null {
  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) return null;
  const source = entity as Record<string, unknown>;
  const kept: Record<string, string | number | boolean | null> = {};
  for (const key of GATEWAY_ALLOWED_KEYS) {
    const value = source[key];
    if (value === null || typeof value === 'number' || typeof value === 'boolean') kept[key] = value;
    else if (typeof value === 'string') kept[key] = value.slice(0, 300);
  }
  return Object.keys(kept).length ? kept : null;
}

export interface AttemptOptions {
  /** Delivery state when the sale ships (shop orders keep their address snapshot outside `Order`). */
  placeOfSupplyState?: string | null;
  /** Name to show in the GST report when it is not the account holder's (website: report recipient). */
  customerName?: string | null;
}

/** Ledger row values for one payment attempt on `order`. All component amounts are INR paise. */
export function buildAttemptData(order: LedgerOrder, options: AttemptOptions = {}) {
  const subtotalPaise = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxPaise = order.items.length ? order.items.reduce((sum, item) => sum + item.taxAmount, 0) : order.taxAmount ?? 0;

  const taxed = order.items.filter((item) => item.taxRate > 0 && item.taxAmount > 0);
  const rates = [...new Set(taxed.map((item) => item.taxRate))];

  return {
    userId: order.userId,
    orderId: order.id,
    type: deriveSaleType(order.items),
    amountMinor: order.paidAmountMinor ?? order.amount,
    currency: order.paidCurrency || 'INR',
    baseCurrency: 'INR',
    baseAmountPaise: order.amount,
    subtotalPaise,
    shippingPaise: order.shippingAmount ?? 0,
    taxPaise,
    taxRateBp: rates.length === 1 ? rates[0] : 0,
    taxInclusive: taxed.length > 0 && taxed.every((item) => item.taxInclusive),
    discountPaise: order.discountAmount ?? 0,
    exchangeRate: new Prisma.Decimal(order.exchangeRate === null || order.exchangeRate === undefined ? 1 : order.exchangeRate.toString()),
    method: order.paymentMethod,
    gatewayOrderId: order.razorpayOrderId,
    placeOfSupply: options.placeOfSupplyState?.trim() || order.shippingAddress?.state?.trim() || null,
    customerName: options.customerName?.trim() || null,
  };
}
