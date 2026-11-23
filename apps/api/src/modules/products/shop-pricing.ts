/**
 * Shop price engine: the one place that turns catalogue prices into payable amounts.
 *
 * Port of the website's `common/priceengine.js` and `common/taxEngine.js`, in integer paise.
 * Used by the saved cart, the stateless `cart/calculate` endpoint and checkout, so the three can
 * never disagree. Pure functions: no database, no clock, no environment access except
 * `resolveShippingPolicy`, which reads its settings from the object it is given.
 */

import { calculateSale, computeGst as moneyComputeGst, GstConfig as MoneyGstConfig } from '../commerce/money/tax';

export type ShopDiscountKind = 'PERCENTAGE' | 'FIXED';

export interface GstConfig {
  enabled: boolean;
  /** Rate in basis points (1800 = 18%). */
  rateBp: number;
  /** true: the listed price already contains the tax. false: tax is added on top. */
  inclusive: boolean;
}

export interface GstBreakdown {
  rateBp: number;
  inclusive: boolean;
  /** Taxable value in paise. */
  base: number;
  tax: number;
  /** Amount the customer pays for this value, tax included. */
  total: number;
}

/**
 * Selling price from MRP and the product's discount (website `productSchema.pre('save')`).
 * `discountValue` is basis points for PERCENTAGE and paise for FIXED. Never below zero.
 */
export function deriveSellingPrice(
  mrpPaise: number,
  discountType: ShopDiscountKind,
  discountValue: number
): { pricePaise: number; discountPercent: number } {
  const mrp = Math.max(0, Math.trunc(mrpPaise) || 0);
  const value = Math.max(0, Math.trunc(discountValue) || 0);
  if (mrp === 0 || value === 0) {
    return { pricePaise: mrp, discountPercent: 0 };
  }
  if (discountType === 'PERCENTAGE') {
    const price = Math.max(0, Math.round(mrp - (mrp * value) / 10000));
    return { pricePaise: price, discountPercent: Math.round(value / 100) };
  }
  const price = Math.max(0, mrp - value);
  return { pricePaise: price, discountPercent: Math.min(100, Math.round((value / mrp) * 100)) };
}

/** GST on an amount: the money module's engine (one tax calculation for the whole backend). */
export function computeGst(amountPaise: number, gst: GstConfig | null | undefined): GstBreakdown {
  const amount = Math.max(0, Math.trunc(amountPaise) || 0);
  const result = moneyComputeGst(amount, toMoneyGst(gst));
  return {
    rateBp: result.rateBp,
    inclusive: result.type === 'inclusive',
    base: result.basePaise,
    tax: result.taxPaise,
    total: result.totalPaise,
  };
}

function toMoneyGst(gst: GstConfig | null | undefined): MoneyGstConfig {
  return {
    enabled: Boolean(gst?.enabled),
    rateBp: Math.max(0, Math.trunc(gst?.rateBp ?? 0) || 0),
    type: gst?.inclusive ? 'inclusive' : 'exclusive',
  };
}

export interface ShippingPolicy {
  /** Charged once per order when any item ships. */
  flatPaise: number;
  /** Shipping is free when the shipped items' listed total reaches this; null = never free. */
  freeFromPaise: number | null;
}

/** Today's app behaviour: Rs 99, free from Rs 2,000 of physical goods. */
export const DEFAULT_SHIPPING_POLICY: ShippingPolicy = { flatPaise: 9900, freeFromPaise: 200000 };
/** The website's behaviour: a hard-coded Rs 500 whenever any item is physical. */
export const WEBSITE_SHIPPING_POLICY: ShippingPolicy = { flatPaise: 50000, freeFromPaise: null };

function parsePaise(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Shipping settings from the environment (names only: SHOP_SHIPPING_FLAT_PAISE,
 * SHOP_SHIPPING_FREE_FROM_PAISE). Unset = the app's current rule. `SHOP_SHIPPING_FREE_FROM_PAISE=none`
 * switches free shipping off (with SHOP_SHIPPING_FLAT_PAISE=50000 that is the website's rule).
 */
export function resolveShippingPolicy(env: Record<string, string | undefined> = process.env): ShippingPolicy {
  const flat = parsePaise(env.SHOP_SHIPPING_FLAT_PAISE);
  const freeRaw = env.SHOP_SHIPPING_FREE_FROM_PAISE;
  const freeOff = typeof freeRaw === 'string' && freeRaw.trim().toLowerCase() === 'none';
  const free = parsePaise(freeRaw);
  return {
    flatPaise: flat ?? DEFAULT_SHIPPING_POLICY.flatPaise,
    freeFromPaise: freeOff ? null : free ?? DEFAULT_SHIPPING_POLICY.freeFromPaise,
  };
}

export function computeShipping(
  hasPhysical: boolean,
  physicalItemsTotalPaise: number,
  policy: ShippingPolicy
): { shippingPaise: number; freeShipping: boolean } {
  if (!hasPhysical) return { shippingPaise: 0, freeShipping: false };
  if (policy.freeFromPaise !== null && physicalItemsTotalPaise >= policy.freeFromPaise) {
    return { shippingPaise: 0, freeShipping: true };
  }
  return { shippingPaise: policy.flatPaise, freeShipping: false };
}

export interface PriceLineInput {
  /** Caller's identifier for the line (e.g. `${productId}:${variantId}`). */
  key: string;
  unitPricePaise: number;
  quantity: number;
  gst: GstConfig;
  /** true when the item ships. */
  physical: boolean;
}

export interface PricedLine {
  key: string;
  unitPricePaise: number;
  quantity: number;
  /** unit price x quantity, as listed. */
  lineTotalPaise: number;
  /** This line's share of the coupon discount. */
  discountPaise: number;
  /** Tax rate, mode, base and tax after the discount share is taken off. */
  taxRateBp: number;
  taxInclusive: boolean;
  taxablePaise: number;
  taxPaise: number;
  /** What the customer pays for the line: discount off, exclusive tax on. */
  payablePaise: number;
}

export interface PricedCart {
  lines: PricedLine[];
  /** Sum of listed line totals (website `subTotal`). */
  itemsTotalPaise: number;
  /** Coupon discount actually applied; never more than `itemsTotalPaise`. */
  discountPaise: number;
  /** Sum of taxable values (what `Order.subtotal` stores). */
  taxablePaise: number;
  /** All GST contained in the order, inclusive and exclusive. */
  taxTotalPaise: number;
  /** GST added on top of listed prices: exclusive items only (website `tax`). */
  taxAddedPaise: number;
  shippingPaise: number;
  freeShipping: boolean;
  hasPhysical: boolean;
  /** itemsTotal - discount + taxAdded + shipping (website `totalAmount`). */
  totalPaise: number;
}

/**
 * Splits `total` across `weights` in proportion, in whole paise, so the shares always add up to
 * `total` (largest remainder; ties go to the earlier line).
 */
export function allocateProportionally(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const shares = exact.map((x) => Math.floor(x));
  let left = total - shares.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    shares[i] += 1;
    left -= 1;
  }
  return shares;
}

/**
 * Prices a cart. The arithmetic is the money module's `calculateSale` (the backend's one sale
 * calculation: discount spread over lines by listed value, each line's GST on its discounted
 * value, inclusive tax inside the price, exclusive tax on top). This function adds what is the
 * shop's own: the shipping rule and the cap of the discount at the items total (the website lets a
 * flat coupon exceed it, giving a negative total).
 */
export function priceCart(
  inputs: PriceLineInput[],
  options: { discountPaise?: number; shipping: ShippingPolicy }
): PricedCart {
  const clean = inputs.map((l) => ({
    ...l,
    unitPricePaise: Math.max(0, Math.trunc(l.unitPricePaise) || 0),
    quantity: Math.max(1, Math.trunc(l.quantity) || 1),
  }));
  const itemsTotalPaise = clean.reduce((sum, l) => sum + l.unitPricePaise * l.quantity, 0);
  const discountPaise = Math.min(Math.max(0, Math.trunc(options.discountPaise ?? 0)), itemsTotalPaise);

  const physicalTotal = clean.filter((l) => l.physical).reduce((sum, l) => sum + l.unitPricePaise * l.quantity, 0);
  const hasPhysical = clean.some((l) => l.physical);
  const { shippingPaise, freeShipping } = computeShipping(hasPhysical, physicalTotal, options.shipping);

  if (clean.length === 0) {
    return {
      lines: [],
      itemsTotalPaise: 0,
      discountPaise: 0,
      taxablePaise: 0,
      taxTotalPaise: 0,
      taxAddedPaise: 0,
      shippingPaise: 0,
      freeShipping: false,
      hasPhysical: false,
      totalPaise: 0,
    };
  }

  const sale = calculateSale({
    lines: clean.map((l, index) => ({
      key: String(index),
      unitPricePaise: l.unitPricePaise,
      quantity: l.quantity,
      gst: toMoneyGst(l.gst),
    })),
    discountPaise,
    shippingPaise,
  });

  const lines: PricedLine[] = sale.lines.map((line, index) => ({
    key: clean[index].key,
    unitPricePaise: line.unitPricePaise,
    quantity: line.quantity,
    lineTotalPaise: line.lineTotalPaise,
    discountPaise: line.discountPaise,
    taxRateBp: line.rateBp,
    taxInclusive: line.type === 'inclusive',
    taxablePaise: line.basePaise,
    taxPaise: line.taxPaise,
    payablePaise: line.totalPaise,
  }));

  return {
    lines,
    itemsTotalPaise: sale.subTotalPaise,
    discountPaise: sale.discountPaise,
    taxablePaise: lines.reduce((sum, l) => sum + l.taxablePaise, 0),
    taxTotalPaise: sale.totalTaxPaise,
    taxAddedPaise: sale.exclusiveTaxPaise,
    shippingPaise: sale.shippingPaise,
    freeShipping,
    hasPhysical,
    totalPaise: sale.totalPaise,
  };
}
