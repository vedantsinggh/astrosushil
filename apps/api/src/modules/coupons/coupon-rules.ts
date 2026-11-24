/**
 * Coupon rules of the website (`common/priceengine.js`), as a pure function.
 * Scope: products, reports, consultations (owner decision 2026-11-24, open-questions M8).
 */

export type CouponSaleType = 'products' | 'reports' | 'consultations';

export interface CouponScopeInput {
  products: boolean;
  reports: boolean;
  consultations: boolean;
}

export interface CouponRuleInput {
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  /** Basis points for PERCENTAGE, paise for FLAT. */
  discountValue: number;
  maxDiscountPaise: number | null;
  minOrderPaise: number;
  usageLimit: number | null;
  validFrom: Date;
  validTill: Date;
  audience: 'GLOBAL' | 'INDIVIDUAL';
  oneTimePerUser: boolean;
  isActive: boolean;
  scope?: CouponScopeInput;
}

export interface CouponContext {
  now: Date;
  /** Sum of listed line totals in paise. */
  itemsTotalPaise: number;
  /** True when the customer is one of the coupon's assigned users. */
  isAssigned: boolean;
  /** Uses that count against the limit: redeemed plus live holds of other orders. */
  activeUses: number;
  /** This customer's redeemed uses plus live holds of other orders. */
  userUses: number;
  /** Kind of sale being checked. If omitted, defaults to products. */
  saleType?: CouponSaleType;
}

export type CouponRejection =
  | 'COUPON_INACTIVE'
  | 'COUPON_NOT_STARTED'
  | 'COUPON_EXPIRED'
  | 'COUPON_USAGE_LIMIT_REACHED'
  | 'COUPON_MIN_ORDER_NOT_MET'
  | 'COUPON_NOT_FOR_THIS_CUSTOMER'
  | 'COUPON_ALREADY_USED'
  | 'COUPON_NOT_APPLICABLE';

export type CouponEvaluation =
  | { ok: true; discountPaise: number }
  | { ok: false; reason: CouponRejection; message: string };

const MESSAGES: Record<CouponRejection, string> = {
  COUPON_INACTIVE: 'Invalid coupon',
  COUPON_NOT_STARTED: 'This coupon is not valid yet',
  COUPON_EXPIRED: 'This coupon has expired',
  COUPON_USAGE_LIMIT_REACHED: 'This coupon has reached its usage limit',
  COUPON_MIN_ORDER_NOT_MET: 'The order amount is below the minimum for this coupon',
  COUPON_NOT_FOR_THIS_CUSTOMER: 'This coupon is not available for your account',
  COUPON_ALREADY_USED: 'You have already used this coupon',
  COUPON_NOT_APPLICABLE: 'This coupon cannot be used for this purchase',
};

function reject(reason: CouponRejection): CouponEvaluation {
  return { ok: false, reason, message: MESSAGES[reason] };
}

/** Discount a valid coupon gives on `itemsTotalPaise`: never more than the items total. */
export function couponDiscountPaise(coupon: CouponRuleInput, itemsTotalPaise: number): number {
  const itemsTotal = Math.max(0, Math.trunc(itemsTotalPaise));
  let discount: number;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = Math.round((itemsTotal * coupon.discountValue) / 10000);
    // As on the website, the maximum applies to percentage coupons only.
    if (coupon.maxDiscountPaise && discount > coupon.maxDiscountPaise) {
      discount = coupon.maxDiscountPaise;
    }
  } else {
    discount = coupon.discountValue;
  }
  // The website does not cap a flat coupon, so a Rs 500 coupon on a Rs 300 cart gave a negative total.
  return Math.max(0, Math.min(discount, itemsTotal));
}

export function evaluateCoupon(coupon: CouponRuleInput, ctx: CouponContext): CouponEvaluation {
  if (!coupon.isActive) return reject('COUPON_INACTIVE');
  if (coupon.validFrom.getTime() > ctx.now.getTime()) return reject('COUPON_NOT_STARTED');
  if (coupon.validTill.getTime() < ctx.now.getTime()) return reject('COUPON_EXPIRED');
  if (coupon.usageLimit && ctx.activeUses >= coupon.usageLimit) return reject('COUPON_USAGE_LIMIT_REACHED');
  if (ctx.itemsTotalPaise < coupon.minOrderPaise) return reject('COUPON_MIN_ORDER_NOT_MET');
  if (coupon.audience === 'INDIVIDUAL' && !ctx.isAssigned) return reject('COUPON_NOT_FOR_THIS_CUSTOMER');
  if (coupon.oneTimePerUser && ctx.userUses > 0) return reject('COUPON_ALREADY_USED');
  if (coupon.scope) {
    const sale = ctx.saleType ?? 'products';
    if (!coupon.scope[sale]) return reject('COUPON_NOT_APPLICABLE');
  } else if (ctx.saleType && ctx.saleType !== 'products') {
    // A coupon without a stored scope is legacy: valid on product carts only
    return reject('COUPON_NOT_APPLICABLE');
  }
  return { ok: true, discountPaise: couponDiscountPaise(coupon, ctx.itemsTotalPaise) };
}
