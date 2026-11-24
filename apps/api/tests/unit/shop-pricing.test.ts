import { describe, it, expect } from 'vitest';
import {
  allocateProportionally,
  computeGst,
  computeShipping,
  DEFAULT_SHIPPING_POLICY,
  FORMER_APP_SHIPPING_POLICY,
  deriveSellingPrice,
  priceCart,
  resolveShippingPolicy,
  WEBSITE_SHIPPING_POLICY,
} from '../../src/modules/products/shop-pricing';
import { couponDiscountPaise, CouponRuleInput, evaluateCoupon } from '../../src/modules/coupons/coupon-rules';
import {
  canCustomerCancel,
  checkAdminTransition,
  fulfillmentFor,
  parseWebsiteStatus,
  statusAfterPayment,
  toWebsiteStatus,
  websitePaymentStatus,
} from '../../src/modules/shop-orders/order-status';

const GST18_INCLUSIVE = { enabled: true, rateBp: 1800, inclusive: true };
const GST12_EXCLUSIVE = { enabled: true, rateBp: 1200, inclusive: false };
const NO_GST = { enabled: false, rateBp: 1800, inclusive: false };

describe('shop price engine', () => {
  describe('deriveSellingPrice (website product pre-save)', () => {
    it('applies a percentage discount to the MRP', () => {
      expect(deriveSellingPrice(799900, 'PERCENTAGE', 5000)).toEqual({ pricePaise: 399950, discountPercent: 50 });
    });
    it('applies a fixed discount and reports it as a rounded percent', () => {
      expect(deriveSellingPrice(100000, 'FIXED', 25000)).toEqual({ pricePaise: 75000, discountPercent: 25 });
    });
    it('never goes below zero', () => {
      expect(deriveSellingPrice(10000, 'FIXED', 50000).pricePaise).toBe(0);
    });
    it('keeps the MRP when there is no discount', () => {
      expect(deriveSellingPrice(49900, 'PERCENTAGE', 0)).toEqual({ pricePaise: 49900, discountPercent: 0 });
    });
  });

  describe('computeGst', () => {
    it('backs the tax out of an inclusive price', () => {
      const gst = computeGst(118000, GST18_INCLUSIVE);
      expect(gst).toEqual({ rateBp: 1800, inclusive: true, base: 100000, tax: 18000, total: 118000 });
    });
    it('adds exclusive tax on top', () => {
      const gst = computeGst(100000, GST12_EXCLUSIVE);
      expect(gst).toEqual({ rateBp: 1200, inclusive: false, base: 100000, tax: 12000, total: 112000 });
    });
    it('treats a product with GST disabled as untaxed', () => {
      expect(computeGst(50000, NO_GST)).toMatchObject({ rateBp: 0, tax: 0, total: 50000 });
    });
  });

  describe('shipping', () => {
    // Owner decision 2026-11-24 (M6): the website rule is the default for website and app alike.
    it('defaults to the decided rule: a flat Rs 500 when any item ships, with no free-shipping threshold', () => {
      expect(resolveShippingPolicy({})).toEqual({ flatPaise: 50000, freeFromPaise: null });
      expect(DEFAULT_SHIPPING_POLICY).toEqual(WEBSITE_SHIPPING_POLICY);
      expect(computeShipping(true, 100, DEFAULT_SHIPPING_POLICY)).toEqual({ shippingPaise: 50000, freeShipping: false });
      expect(computeShipping(true, 99999900, DEFAULT_SHIPPING_POLICY)).toEqual({ shippingPaise: 50000, freeShipping: false });
    });
    it('still honours a configured threshold (the former app rule: Rs 99, free from Rs 2,000)', () => {
      const policy = resolveShippingPolicy({ SHOP_SHIPPING_FLAT_PAISE: '9900', SHOP_SHIPPING_FREE_FROM_PAISE: '200000' });
      expect(policy).toEqual(FORMER_APP_SHIPPING_POLICY);
      expect(computeShipping(true, 199900, policy)).toEqual({ shippingPaise: 9900, freeShipping: false });
      expect(computeShipping(true, 200000, policy)).toEqual({ shippingPaise: 0, freeShipping: true });
      expect(resolveShippingPolicy({ SHOP_SHIPPING_FREE_FROM_PAISE: 'none' })).toEqual(WEBSITE_SHIPPING_POLICY);
    });
    it('charges nothing when no item ships', () => {
      expect(computeShipping(false, 0, WEBSITE_SHIPPING_POLICY).shippingPaise).toBe(0);
    });
    it('ignores a malformed setting instead of charging a wrong amount', () => {
      expect(resolveShippingPolicy({ SHOP_SHIPPING_FLAT_PAISE: '-5', SHOP_SHIPPING_FREE_FROM_PAISE: 'abc' })).toEqual(DEFAULT_SHIPPING_POLICY);
    });
  });

  describe('allocateProportionally', () => {
    it('always adds up to the total', () => {
      const shares = allocateProportionally(1000, [333, 333, 334]);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
      expect(allocateProportionally(1, [1, 1, 1])).toEqual([1, 0, 0]);
    });
  });

  describe('priceCart', () => {
    it('matches the existing cart/calculate numbers for 18% inclusive products', () => {
      // Legacy formula: net = round(gross * 10000 / 11800); tax = gross - net.
      const cart = priceCart(
        [
          { key: 'a', unitPricePaise: 399900, quantity: 1, gst: GST18_INCLUSIVE, physical: true },
          { key: 'b', unitPricePaise: 49900, quantity: 2, gst: GST18_INCLUSIVE, physical: false },
        ],
        { shipping: FORMER_APP_SHIPPING_POLICY }
      );
      const netA = Math.round((399900 * 10000) / 11800);
      const netB = Math.round((99800 * 10000) / 11800);
      expect(cart.lines[0]).toMatchObject({ taxablePaise: netA, taxPaise: 399900 - netA, payablePaise: 399900 });
      expect(cart.lines[1]).toMatchObject({ taxablePaise: netB, taxPaise: 99800 - netB, payablePaise: 99800 });
      expect(cart.itemsTotalPaise).toBe(499700);
      expect(cart.taxAddedPaise).toBe(0);
      expect(cart.freeShipping).toBe(true); // physical part is Rs 3,999
      expect(cart.totalPaise).toBe(499700);
    });

    it('adds exclusive GST on top and keeps inclusive GST inside the price', () => {
      const cart = priceCart(
        [
          { key: 'incl', unitPricePaise: 118000, quantity: 1, gst: GST18_INCLUSIVE, physical: false },
          { key: 'excl', unitPricePaise: 100000, quantity: 1, gst: GST12_EXCLUSIVE, physical: false },
        ],
        { shipping: DEFAULT_SHIPPING_POLICY }
      );
      expect(cart.taxAddedPaise).toBe(12000);
      expect(cart.taxTotalPaise).toBe(30000);
      expect(cart.totalPaise).toBe(118000 + 100000 + 12000);
    });

    it('spreads the coupon discount over the lines and taxes the discounted value', () => {
      const cart = priceCart(
        [
          { key: 'a', unitPricePaise: 100000, quantity: 1, gst: GST12_EXCLUSIVE, physical: false },
          { key: 'b', unitPricePaise: 300000, quantity: 1, gst: GST12_EXCLUSIVE, physical: false },
        ],
        { discountPaise: 40000, shipping: DEFAULT_SHIPPING_POLICY }
      );
      expect(cart.lines.map((l) => l.discountPaise)).toEqual([10000, 30000]);
      expect(cart.lines.map((l) => l.taxPaise)).toEqual([10800, 32400]);
      expect(cart.totalPaise).toBe(400000 - 40000 + 43200);
    });

    it('caps the discount at the items total (the website let it go negative)', () => {
      const cart = priceCart([{ key: 'a', unitPricePaise: 30000, quantity: 1, gst: NO_GST, physical: false }], {
        discountPaise: 50000,
        shipping: DEFAULT_SHIPPING_POLICY,
      });
      expect(cart.discountPaise).toBe(30000);
      expect(cart.totalPaise).toBe(0);
    });

    it('charges shipping once when any item ships, and never taxes it', () => {
      const cart = priceCart(
        [
          { key: 'herb', unitPricePaise: 50000, quantity: 1, gst: NO_GST, physical: true },
          { key: 'art', unitPricePaise: 20000, quantity: 1, gst: NO_GST, physical: false },
        ],
        { shipping: WEBSITE_SHIPPING_POLICY }
      );
      expect(cart.shippingPaise).toBe(50000);
      expect(cart.taxTotalPaise).toBe(0);
      expect(cart.totalPaise).toBe(120000);
    });

    it('returns zeros for an empty cart', () => {
      expect(priceCart([], { shipping: DEFAULT_SHIPPING_POLICY }).totalPaise).toBe(0);
    });
  });
});

describe('coupon rules (website priceengine)', () => {
  const now = new Date('2026-11-24T10:00:00Z');
  const base: CouponRuleInput = {
    code: 'DIWALI10',
    discountType: 'PERCENTAGE',
    discountValue: 1000,
    maxDiscountPaise: null,
    minOrderPaise: 0,
    usageLimit: null,
    validFrom: new Date('2026-11-01T00:00:00Z'),
    validTill: new Date('2026-12-01T00:00:00Z'),
    audience: 'GLOBAL',
    oneTimePerUser: true,
    isActive: true,
  };
  const ctx = { now, itemsTotalPaise: 200000, isAssigned: false, activeUses: 0, userUses: 0 };

  it('gives a percentage of the items total', () => {
    expect(evaluateCoupon(base, ctx)).toEqual({ ok: true, discountPaise: 20000 });
  });
  it('limits a percentage coupon to its maximum discount', () => {
    expect(evaluateCoupon({ ...base, maxDiscountPaise: 15000 }, ctx)).toEqual({ ok: true, discountPaise: 15000 });
  });
  it('caps a flat coupon at the items total', () => {
    const flat: CouponRuleInput = { ...base, discountType: 'FLAT', discountValue: 50000 };
    expect(couponDiscountPaise(flat, 30000)).toBe(30000);
    expect(couponDiscountPaise(flat, 200000)).toBe(50000);
  });
  it('rejects an inactive, not yet valid or expired coupon', () => {
    expect(evaluateCoupon({ ...base, isActive: false }, ctx)).toMatchObject({ ok: false, reason: 'COUPON_INACTIVE' });
    expect(evaluateCoupon({ ...base, validFrom: new Date('2026-11-25T00:00:00Z') }, ctx)).toMatchObject({ reason: 'COUPON_NOT_STARTED' });
    expect(evaluateCoupon({ ...base, validTill: new Date('2026-11-23T00:00:00Z') }, ctx)).toMatchObject({ reason: 'COUPON_EXPIRED' });
  });
  it('rejects when the usage limit is reached, counting holds', () => {
    expect(evaluateCoupon({ ...base, usageLimit: 5 }, { ...ctx, activeUses: 5 })).toMatchObject({ reason: 'COUPON_USAGE_LIMIT_REACHED' });
    expect(evaluateCoupon({ ...base, usageLimit: 5 }, { ...ctx, activeUses: 4 })).toMatchObject({ ok: true });
  });
  it('rejects below the minimum order amount', () => {
    expect(evaluateCoupon({ ...base, minOrderPaise: 200001 }, ctx)).toMatchObject({ reason: 'COUPON_MIN_ORDER_NOT_MET' });
  });
  it('lets only assigned customers use an individual coupon', () => {
    const individual: CouponRuleInput = { ...base, audience: 'INDIVIDUAL' };
    expect(evaluateCoupon(individual, ctx)).toMatchObject({ reason: 'COUPON_NOT_FOR_THIS_CUSTOMER' });
    expect(evaluateCoupon(individual, { ...ctx, isAssigned: true })).toMatchObject({ ok: true });
  });
  it('allows one use per customer unless the coupon says otherwise', () => {
    expect(evaluateCoupon(base, { ...ctx, userUses: 1 })).toMatchObject({ reason: 'COUPON_ALREADY_USED' });
    expect(evaluateCoupon({ ...base, oneTimePerUser: false }, { ...ctx, userUses: 3 })).toMatchObject({ ok: true });
  });
  it('enforces scope restrictions across products, reports and consultations', () => {
    const reportOnly: CouponRuleInput = {
      ...base,
      scope: { products: false, reports: true, consultations: false },
    };
    expect(evaluateCoupon(reportOnly, { ...ctx, saleType: 'reports' })).toMatchObject({ ok: true, discountPaise: 20000 });
    expect(evaluateCoupon(reportOnly, { ...ctx, saleType: 'products' })).toMatchObject({ ok: false, reason: 'COUPON_NOT_APPLICABLE' });
    expect(evaluateCoupon(reportOnly, { ...ctx, saleType: 'consultations' })).toMatchObject({ ok: false, reason: 'COUPON_NOT_APPLICABLE' });

    const legacyUnscoped: CouponRuleInput = { ...base, scope: undefined };
    expect(evaluateCoupon(legacyUnscoped, { ...ctx, saleType: 'products' })).toMatchObject({ ok: true });
    expect(evaluateCoupon(legacyUnscoped, { ...ctx, saleType: 'reports' })).toMatchObject({ ok: false, reason: 'COUPON_NOT_APPLICABLE' });
    expect(evaluateCoupon(legacyUnscoped, { ...ctx, saleType: 'consultations' })).toMatchObject({ ok: false, reason: 'COUPON_NOT_APPLICABLE' });
  });
});

describe('website order status mapping', () => {
  it('round-trips the eight website statuses', () => {
    for (const s of ['payment_pending', 'placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'payment_failed']) {
      expect(toWebsiteStatus(parseWebsiteStatus(s)!)).toBe(s);
    }
    expect(parseWebsiteStatus('pending')).toBeNull();
  });
  it('maps onto fulfilment statuses', () => {
    expect(fulfillmentFor('PROCESSING')).toBe('PROCESSING');
    expect(fulfillmentFor('SHIPPED')).toBe('DISPATCHED');
    expect(fulfillmentFor('DELIVERED')).toBe('DELIVERED');
    expect(fulfillmentFor('CANCELLED')).toBe('CANCELLED');
    expect(fulfillmentFor('CONFIRMED')).toBeNull();
  });
  it('delivers a digital-only order at payment and places a physical one', () => {
    expect(statusAfterPayment('digital')).toBe('DELIVERED');
    expect(statusAfterPayment('physical')).toBe('PLACED');
  });
  it('lets a customer cancel only before shipping', () => {
    expect(canCustomerCancel('PLACED')).toBe(true);
    expect(canCustomerCancel('PROCESSING')).toBe(true);
    expect(canCustomerCancel('SHIPPED')).toBe(false);
    expect(canCustomerCancel('DELIVERED')).toBe(false);
  });
  it('does not let an admin advance an unpaid order or reopen a cancelled one', () => {
    expect(checkAdminTransition('PAYMENT_PENDING', 'SHIPPED', false).ok).toBe(false);
    expect(checkAdminTransition('PAYMENT_PENDING', 'CANCELLED', false).ok).toBe(true);
    expect(checkAdminTransition('CANCELLED', 'PROCESSING', true).ok).toBe(false);
    expect(checkAdminTransition('PLACED', 'CONFIRMED', true).ok).toBe(true);
    expect(checkAdminTransition('PLACED', 'PAYMENT_PENDING', true).ok).toBe(false);
  });
  it('reports the website payment status', () => {
    expect(websitePaymentStatus({ status: 'PENDING', paymentStatus: 'PENDING' })).toBe('pending');
    expect(websitePaymentStatus({ status: 'PAID', paymentStatus: 'CAPTURED' })).toBe('paid');
    expect(websitePaymentStatus({ status: 'FAILED', paymentStatus: 'FAILED' })).toBe('failed');
  });
});
