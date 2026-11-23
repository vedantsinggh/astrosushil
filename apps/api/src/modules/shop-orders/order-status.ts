import { FulfillmentStatus, OrderStatus, PaymentStatus, ShopOrderStatus } from '@prisma/client';

/**
 * The website's order statuses, and how each one sits on this backend's Order row.
 *
 * | website status   | Order.status          | Order.paymentStatus | Order.fulfillmentStatus      |
 * |------------------|-----------------------|---------------------|------------------------------|
 * | payment_pending  | PENDING               | PENDING             | UNFULFILLED                  |
 * | payment_failed   | FAILED                | FAILED              | UNFULFILLED                  |
 * | placed           | PAID                  | CAPTURED            | as reconciled (UNFULFILLED)  |
 * | confirmed        | PAID                  | CAPTURED            | as reconciled (UNFULFILLED)  |
 * | processing       | PAID                  | CAPTURED            | PROCESSING                   |
 * | shipped          | PAID                  | CAPTURED            | DISPATCHED (+ dispatchedAt)  |
 * | delivered        | PAID                  | CAPTURED            | DELIVERED (+ deliveredAt)    |
 * | cancelled        | CANCELLED if unpaid,  | unchanged           | CANCELLED                    |
 * |                  | PAID if paid          | (no refund)         |                              |
 *
 * "placed" and "confirmed" differ only on the website side, so the website status itself is kept
 * on ShopOrder.status and is the source of truth for the shop screens. A paid order that is
 * cancelled keeps Order.status PAID: the money was taken and, by the owner's decision, is not
 * refunded, so revenue reports must still count it.
 */

export const WEBSITE_ORDER_STATUSES = [
  'payment_pending',
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'payment_failed',
] as const;
export type WebsiteOrderStatus = (typeof WEBSITE_ORDER_STATUSES)[number];

export function toWebsiteStatus(status: ShopOrderStatus): WebsiteOrderStatus {
  return status.toLowerCase() as WebsiteOrderStatus;
}

export function parseWebsiteStatus(value: string | undefined | null): ShopOrderStatus | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return upper in ShopOrderStatus ? (upper as ShopOrderStatus) : null;
}

export function isPaid(order: { status: OrderStatus; paymentStatus: PaymentStatus }): boolean {
  return (
    order.paymentStatus === PaymentStatus.CAPTURED ||
    order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
    order.paymentStatus === PaymentStatus.REFUNDED ||
    order.status === OrderStatus.PAID ||
    order.status === OrderStatus.FULFILLED
  );
}

/** Website `payment.status`: pending | paid | failed. */
export function websitePaymentStatus(order: { status: OrderStatus; paymentStatus: PaymentStatus }): 'pending' | 'paid' | 'failed' {
  if (isPaid(order)) return 'paid';
  if (order.paymentStatus === PaymentStatus.FAILED || order.status === OrderStatus.FAILED) return 'failed';
  return 'pending';
}

/** Status a shop order takes when its payment is captured: digital-only orders are delivered at once. */
export function statusAfterPayment(orderType: string): ShopOrderStatus {
  return orderType === 'digital' ? ShopOrderStatus.DELIVERED : ShopOrderStatus.PLACED;
}

/** Order.fulfillmentStatus that goes with a website status set by an admin; null = leave as it is. */
export function fulfillmentFor(status: ShopOrderStatus): FulfillmentStatus | null {
  switch (status) {
    case ShopOrderStatus.PROCESSING:
      return FulfillmentStatus.PROCESSING;
    case ShopOrderStatus.SHIPPED:
      return FulfillmentStatus.DISPATCHED;
    case ShopOrderStatus.DELIVERED:
      return FulfillmentStatus.DELIVERED;
    case ShopOrderStatus.CANCELLED:
      return FulfillmentStatus.CANCELLED;
    default:
      return null;
  }
}

const CUSTOMER_CANCELLABLE = new Set<ShopOrderStatus>([
  ShopOrderStatus.PAYMENT_PENDING,
  ShopOrderStatus.PAYMENT_FAILED,
  ShopOrderStatus.PLACED,
  ShopOrderStatus.CONFIRMED,
  ShopOrderStatus.PROCESSING,
]);

/** A customer may cancel until the order ships (the website allowed it until delivery). */
export function canCustomerCancel(status: ShopOrderStatus): boolean {
  return CUSTOMER_CANCELLABLE.has(status);
}

/** Statuses an admin may set (the website also listed "pending", which is not an order status). */
export const ADMIN_SETTABLE_STATUSES: ShopOrderStatus[] = [
  ShopOrderStatus.PLACED,
  ShopOrderStatus.CONFIRMED,
  ShopOrderStatus.PROCESSING,
  ShopOrderStatus.SHIPPED,
  ShopOrderStatus.DELIVERED,
  ShopOrderStatus.CANCELLED,
];

export function checkAdminTransition(
  from: ShopOrderStatus,
  to: ShopOrderStatus,
  paid: boolean
): { ok: true } | { ok: false; message: string } {
  if (!ADMIN_SETTABLE_STATUSES.includes(to)) return { ok: false, message: 'Invalid order status' };
  if (from === to) return { ok: false, message: `Order is already ${toWebsiteStatus(to)}` };
  if (from === ShopOrderStatus.CANCELLED) return { ok: false, message: 'A cancelled order cannot be changed' };
  if (!paid && to !== ShopOrderStatus.CANCELLED) {
    return { ok: false, message: 'An order that has not been paid can only be cancelled' };
  }
  return { ok: true };
}
