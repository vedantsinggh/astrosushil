/**
 * Coupon rules of the website (`common/priceengine.js`), as a pure function.
 * Scope: product carts only, as on the website. Reports and bookings do not take coupons.
 */

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
}

export type CouponRejection =
  | 'COUPON_INACTIVE'
  | 'COUPON_NOT_STARTED'
  | 'COUPON_EXPIRED'
  | 'COUPON_USAGE_LIMIT_REACHED'
  | 'COUPON_MIN_ORDER_NOT_MET'
  | 'COUPON_NOT_FOR_THIS_CUSTOMER'
  | 'COUPON_ALREADY_USED';

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
  return { ok: true, discountPaise: couponDiscountPaise(coupon, ctx.itemsTotalPaise) };
}
