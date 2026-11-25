import { describe, expect, it } from 'vitest';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { mapInvoiceStatus, mapLegacyPaymentState, toInrPaise } from '../../src/scripts/migration-mappers';

describe('Mongo migration mappers', () => {
  it('converts supported Mongo numeric wrappers and currency components to INR paise', () => {
    expect(toInrPaise({ $numberDecimal: '120.50' }, 2)).toBe(6025);
    expect(toInrPaise('5.25', 0)).toBe(525);
    expect(toInrPaise('invalid', 1)).toBe(0);
  });

  it('preserves invoice allocation statuses and defaults missing history safely', () => {
    expect(mapInvoiceStatus('allocated', 'INV-AS/01')).toBe('ALLOCATED');
    expect(mapInvoiceStatus('pending', null)).toBe('PENDING');
    expect(mapInvoiceStatus('not_required', null)).toBe('NOT_REQUIRED');
    expect(mapInvoiceStatus(null, null)).toBe('NOT_REQUIRED');
    expect(mapInvoiceStatus(null, 'legacy-number')).toBe('ALLOCATED');
  });

  it('maps legacy payment states to order/payment state pairs', () => {
    expect(mapLegacyPaymentState('paid')).toEqual({ orderStatus: OrderStatus.PAID, paymentStatus: PaymentStatus.CAPTURED, paid: true });
    expect(mapLegacyPaymentState('FAILED')).toEqual({ orderStatus: OrderStatus.FAILED, paymentStatus: PaymentStatus.FAILED, paid: false });
    expect(mapLegacyPaymentState('refunded')).toEqual({ orderStatus: OrderStatus.REFUNDED, paymentStatus: PaymentStatus.REFUNDED, paid: true });
    expect(mapLegacyPaymentState('pending')).toEqual({ orderStatus: OrderStatus.PENDING, paymentStatus: PaymentStatus.PENDING, paid: false });
  });
});
