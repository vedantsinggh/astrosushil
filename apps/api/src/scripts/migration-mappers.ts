import { OrderStatus, PaymentStatus } from '@prisma/client';

function numericValue(value: unknown): number {
  if (value != null && typeof value === 'object') {
    const tagged = value as Record<string, unknown>;
    if ('$numberDecimal' in tagged) return Number(tagged.$numberDecimal);
    if ('$numberInt' in tagged) return Number(tagged.$numberInt);
    if ('$numberLong' in tagged) return Number(tagged.$numberLong);
    if ('$numberDouble' in tagged) return Number(tagged.$numberDouble);
  }
  return Number(value);
}

/** Converts a legacy foreign-currency rupee component to INR paise. */
export function toInrPaise(value: unknown, exchangeRate: number): number {
  const amount = numericValue(value);
  const rate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1;
  return Number.isFinite(amount) ? Math.round((amount / rate) * 100) : 0;
}

export function mapInvoiceStatus(status: unknown, number: unknown): 'PENDING' | 'ALLOCATED' | 'NOT_REQUIRED' {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'allocated') return 'ALLOCATED';
  if (normalized === 'pending') return 'PENDING';
  if (normalized === 'not_required') return 'NOT_REQUIRED';
  return number ? 'ALLOCATED' : 'NOT_REQUIRED';
}

export function mapLegacyPaymentState(status: unknown): { orderStatus: OrderStatus; paymentStatus: PaymentStatus; paid: boolean } {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'paid' || normalized === 'success') {
    return { orderStatus: OrderStatus.PAID, paymentStatus: PaymentStatus.CAPTURED, paid: true };
  }
  if (normalized === 'failed') {
    return { orderStatus: OrderStatus.FAILED, paymentStatus: PaymentStatus.FAILED, paid: false };
  }
  if (normalized === 'refunded') {
    return { orderStatus: OrderStatus.REFUNDED, paymentStatus: PaymentStatus.REFUNDED, paid: true };
  }
  return { orderStatus: OrderStatus.PENDING, paymentStatus: PaymentStatus.PENDING, paid: false };
}
