/**
 * Tests for the commerce decisions decided on 2026-11-24:
 *   1. Multi-scope coupons (products, reports, consultations)
 *   2. No stacking of coupons with staff discounts in manual booking
 *   3. Refunds are staff-only behind payments:refund (customer route rejected with REFUND_STAFF_ONLY)
 *   4. Full Kundli price is ₹999 + 18% GST (117,882 paise)
 *   5. 24-hour report delay: customer sees "being prepared" until release; staff see the truth;
 *      delay of 0 restores immediate delivery
 *   6. Flat Rs 500 shipping everywhere when any item is physical, no free threshold
 */
import { describe, it, expect, vi } from 'vitest';
import { evaluateCoupon, CouponRuleInput, CouponSaleType } from '../../src/modules/coupons/coupon-rules';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import {
  isReportHeld,
  isReportReleased,
  reportAvailableAt,
  heldProgressDetail,
  customerReportRow,
  HELD_STATUS,
  HELD_STAGE,
  HELD_PROGRESS,
} from '../../src/modules/reports/report-release';
import { computeShipping, DEFAULT_SHIPPING_POLICY, WEBSITE_SHIPPING_POLICY } from '../../src/modules/products/shop-pricing';
import { AppError, ValidationError } from '../../src/errors/app-error';
import { CommerceService } from '../../src/modules/commerce/commerce.service';
import { BookingsService } from '../../src/modules/bookings/bookings.service';

describe('Commerce Decisions (2026-11-24)', () => {
  describe('1. Multi-scope coupons across products, reports and consultations', () => {
    const now = new Date('2026-11-24T10:00:00Z');
    const baseCoupon: CouponRuleInput = {
      code: 'PROMO20',
      discountType: 'PERCENTAGE',
      discountValue: 2000, // 20%
      maxDiscountPaise: null,
      minOrderPaise: 0,
      usageLimit: null,
      validFrom: new Date('2026-11-01T00:00:00Z'),
      validTill: new Date('2026-12-01T00:00:00Z'),
      audience: 'GLOBAL',
      oneTimePerUser: true,
      isActive: true,
    };
    const ctx = { now, itemsTotalPaise: 100000, isAssigned: false, activeUses: 0, userUses: 0 };

    it('allows a multi-scope coupon on products, reports and consultations when all scopes are enabled', () => {
      const allScopes: CouponRuleInput = {
        ...baseCoupon,
        scope: { products: true, reports: true, consultations: true },
      };
      for (const saleType of ['products', 'reports', 'consultations'] as CouponSaleType[]) {
        const res = evaluateCoupon(allScopes, { ...ctx, saleType });
        expect(res).toEqual({ ok: true, discountPaise: 20000 });
      }
    });

    it('restricts a reports-only coupon from products and consultations', () => {
      const reportsOnly: CouponRuleInput = {
        ...baseCoupon,
        scope: { products: false, reports: true, consultations: false },
      };
      expect(evaluateCoupon(reportsOnly, { ...ctx, saleType: 'reports' })).toEqual({ ok: true, discountPaise: 20000 });
      expect(evaluateCoupon(reportsOnly, { ...ctx, saleType: 'products' })).toMatchObject({
        ok: false,
        reason: 'COUPON_NOT_APPLICABLE',
      });
      expect(evaluateCoupon(reportsOnly, { ...ctx, saleType: 'consultations' })).toMatchObject({
        ok: false,
        reason: 'COUPON_NOT_APPLICABLE',
      });
    });

    it('restricts a consultations-only coupon from products and reports', () => {
      const consultationsOnly: CouponRuleInput = {
        ...baseCoupon,
        scope: { products: false, reports: false, consultations: true },
      };
      expect(evaluateCoupon(consultationsOnly, { ...ctx, saleType: 'consultations' })).toEqual({ ok: true, discountPaise: 20000 });
      expect(evaluateCoupon(consultationsOnly, { ...ctx, saleType: 'products' })).toMatchObject({
        ok: false,
        reason: 'COUPON_NOT_APPLICABLE',
      });
      expect(evaluateCoupon(consultationsOnly, { ...ctx, saleType: 'reports' })).toMatchObject({
        ok: false,
        reason: 'COUPON_NOT_APPLICABLE',
      });
    });

    it('treats legacy unscoped coupons as products-only', () => {
      const legacyCoupon: CouponRuleInput = { ...baseCoupon, scope: undefined };
      expect(evaluateCoupon(legacyCoupon, { ...ctx, saleType: 'products' })).toEqual({ ok: true, discountPaise: 20000 });
      expect(evaluateCoupon(legacyCoupon, { ...ctx, saleType: 'reports' })).toMatchObject({
        ok: false,
        reason: 'COUPON_NOT_APPLICABLE',
      });
      expect(evaluateCoupon(legacyCoupon, { ...ctx, saleType: 'consultations' })).toMatchObject({
        ok: false,
        reason: 'COUPON_NOT_APPLICABLE',
      });
    });
  });

  describe('2. Coupons never stack with a staff discount', () => {
    it('refuses manual booking if both couponCode and staff discount are passed', async () => {
      const bookingsService = new BookingsService();
      await expect(
        bookingsService.createManual(
          {
            consultationId: 'mock-consultation',
            date: '2026-11-25',
            slot: '10:00-10:30',
            userId: 'user-123',
            couponCode: 'OFFER50',
            discountType: 'FLAT',
            discountValue: 5000,
          },
          { id: 'admin-1' }
        )
      ).rejects.toThrow('Coupons cannot be combined with a staff discount');
    });
  });

  describe('3. Refunds are staff-only', () => {
    it('rejects refund request without staffAuthorised flag with REFUND_STAFF_ONLY (403)', async () => {
      const commerceService = new CommerceService();
      await expect(
        commerceService.requestRefund(
          { orderId: '00000000-0000-0000-0000-000000000001' },
          { id: 'customer-1', role: 'USER' },
          { staffAuthorised: false }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'REFUND_STAFF_ONLY',
      });
    });
  });

  describe('4. Full Kundli catalogue pricing', () => {
    it('prices Janma Kundli as ₹999 + 18% GST (117,882 paise)', () => {
      const kundli = COMMERCE_CATALOG['report-kundli'];
      expect(kundli).toBeDefined();
      expect(kundli.pricePaise).toBe(117882);
      expect(kundli.taxRateBasisPoints).toBe(1800);
      expect(kundli.taxIncluded).toBe(true);
    });
  });

  describe('5. 24-hour report delay', () => {
    const completedAt = new Date('2026-11-24T10:00:00Z');
    const delay24hMs = 24 * 60 * 60 * 1000;

    it('holds a completed report for 24 hours after completion', () => {
      const report = { status: 'COMPLETED', completedAt };
      const duringDelay = new Date('2026-11-24T18:00:00Z'); // 8 hours in
      const afterDelay = new Date('2026-11-25T11:00:00Z'); // 25 hours in

      expect(isReportHeld(report, duringDelay, delay24hMs)).toBe(true);
      expect(isReportReleased(report, duringDelay, delay24hMs)).toBe(false);

      expect(isReportHeld(report, afterDelay, delay24hMs)).toBe(false);
      expect(isReportReleased(report, afterDelay, delay24hMs)).toBe(true);
    });

    it('immediately releases when delay is 0', () => {
      const report = { status: 'COMPLETED', completedAt };
      const rightAfter = new Date('2026-11-24T10:00:01Z');
      expect(isReportHeld(report, rightAfter, 0)).toBe(false);
      expect(isReportReleased(report, rightAfter, 0)).toBe(true);
    });

    it('customer view masks held completed report as PROCESSING and hides pdfUrl', () => {
      const report = {
        id: 'report-1',
        status: 'COMPLETED',
        completedAt,
        pdfUrl: 'https://s3.amazonaws.com/astrosushil/reports/kundli-secret.pdf',
        pdfKey: 'reports/kundli-secret.pdf',
      };
      const duringDelay = new Date('2026-11-24T15:00:00Z');
      const view = customerReportRow(report, duringDelay, delay24hMs);

      expect(view.status).toBe(HELD_STATUS); // 'PROCESSING'
      expect((view as any).pdfUrl).toBeNull();
      expect((view as any).pdfKey).toBeNull();
      expect(view.stage).toBe(HELD_STAGE); // 'UPLOADING'
      expect(view.progress).toBe(HELD_PROGRESS); // 99
      expect(view.progressDetail).toContain('Your report will be delivered by');
    });

    it('customer view reveals completed report after release delay has elapsed', () => {
      const report = {
        id: 'report-1',
        status: 'COMPLETED',
        completedAt,
        pdfUrl: 'https://s3.amazonaws.com/astrosushil/reports/kundli-secret.pdf',
      };
      const afterDelay = new Date('2026-11-25T12:00:00Z');
      const view = customerReportRow(report, afterDelay, delay24hMs);

      expect(view.status).toBe('COMPLETED');
      expect((view as any).pdfUrl).toBe('https://s3.amazonaws.com/astrosushil/reports/kundli-secret.pdf');
    });
  });

  describe('6. Flat Rs 500 shipping', () => {
    it('charges flat 50,000 paise (Rs 500) when any item is physical, regardless of order amount', () => {
      expect(DEFAULT_SHIPPING_POLICY).toEqual(WEBSITE_SHIPPING_POLICY);
      expect(computeShipping(true, 100, DEFAULT_SHIPPING_POLICY)).toEqual({
        shippingPaise: 50000,
        freeShipping: false,
      });
      expect(computeShipping(true, 10_000_000, DEFAULT_SHIPPING_POLICY)).toEqual({
        shippingPaise: 50000,
        freeShipping: false,
      });
    });

    it('charges 0 shipping when no item is physical', () => {
      expect(computeShipping(false, 500000, DEFAULT_SHIPPING_POLICY)).toEqual({
        shippingPaise: 0,
        freeShipping: false,
      });
    });
  });
});
