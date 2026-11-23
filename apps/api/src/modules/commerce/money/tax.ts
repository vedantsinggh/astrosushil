import { ValidationError } from '../../../errors/app-error';
import { divRoundHalfUp } from './currency';

/**
 * GST engine: the website's `src/common/taxEngine.js` and the tax part of `src/common/priceengine.js`,
 * in integer arithmetic.
 *
 * Units: amounts are INR paise (integers); rates are basis points (1800 = 18%).
 *
 * Rounding: the website rounds rupee values to two decimals with
 * `Math.round((x + Number.EPSILON) * 100) / 100`, i.e. to the nearest paisa, halves up. Here every
 * rounded figure is the exact rational value rounded to the nearest paisa, halves up. Each figure
 * (base, tax, total) is rounded on its own, as on the website, so for an inclusive price
 * `base + tax` can differ from the price by one paisa after a discount.
 */

export type GstType = 'inclusive' | 'exclusive';

/** Website per-item `gst` object: `{ enabled, rate, type }`, with `rate` here in basis points. */
export interface GstConfig {
  enabled: boolean;
  rateBp: number;
  type: GstType;
}

export interface GstBreakdown {
  rateBp: number;
  type: GstType;
  /** Taxable value. */
  basePaise: number;
  taxPaise: number;
  /** Amount including tax. */
  totalPaise: number;
}

/** A non-negative rational number of paise. */
interface Rational {
  n: bigint;
  d: bigint;
}

const BP = 10000n;

function assertPaise(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ValidationError(`${name} must be a non-negative whole number of paise`);
  }
}

function resolveGst(gst: GstConfig | null | undefined): { rateBp: bigint; type: GstType } {
  // Website computeGst: rate applies only when gst.enabled; anything that is not "inclusive" is exclusive.
  let rate = 0;
  if (gst?.enabled) {
    if (!Number.isSafeInteger(gst.rateBp) || gst.rateBp < 0) {
      throw new ValidationError('GST rate must be a non-negative whole number of basis points');
    }
    rate = gst.rateBp;
  }
  return { rateBp: BigInt(rate), type: gst?.type === 'inclusive' ? 'inclusive' : 'exclusive' };
}

function computeGstRational(amount: Rational, gst: GstConfig | null | undefined): GstBreakdown {
  const { rateBp, type } = resolveGst(gst);
  const whole = Number(divRoundHalfUp(amount.n, amount.d));

  if (rateBp === 0n) {
    return { rateBp: 0, type, basePaise: whole, taxPaise: 0, totalPaise: whole };
  }

  if (type === 'inclusive') {
    // base = amount / (1 + r), tax = amount - base (website computeInclusiveTax)
    const denominator = amount.d * (BP + rateBp);
    return {
      rateBp: Number(rateBp),
      type,
      basePaise: Number(divRoundHalfUp(amount.n * BP, denominator)),
      taxPaise: Number(divRoundHalfUp(amount.n * rateBp, denominator)),
      totalPaise: whole,
    };
  }

  // tax = amount * r, total = amount + tax (website computeExclusiveTax)
  const denominator = amount.d * BP;
  return {
    rateBp: Number(rateBp),
    type,
    basePaise: whole,
    taxPaise: Number(divRoundHalfUp(amount.n * rateBp, denominator)),
    totalPaise: Number(divRoundHalfUp(amount.n * (BP + rateBp), denominator)),
  };
}

/** Website `computeGst(amount, gst)` for a whole-paise amount. */
export function computeGst(amountPaise: number, gst: GstConfig | null | undefined): GstBreakdown {
  assertPaise(amountPaise, 'amount');
  return computeGstRational({ n: BigInt(amountPaise), d: 1n }, gst);
}

export interface SaleLineInput {
  /** Caller's identifier for the line (catalogue id, cart item id). Returned unchanged. */
  key: string;
  unitPricePaise: number;
  quantity: number;
  gst?: GstConfig | null;
}

/**
 * Input to the sale calculation.
 *
 * `discountPaise` is the hook for coupons (another module): the order-level discount in INR paise,
 * already validated and capped by that module. The website rounds the coupon discount to whole
 * rupees (`Math.round(discount)`) before allocating it; a caller reproducing the website passes a
 * multiple of 100. `shippingPaise` is the hook for the shop's shipping fee (website: Rs 500 when any
 * item is physical). Shipping carries no GST on the website.
 */
export interface SaleInput {
  lines: SaleLineInput[];
  discountPaise?: number;
  shippingPaise?: number;
}

export interface SaleLineResult extends GstBreakdown {
  key: string;
  quantity: number;
  unitPricePaise: number;
  /** unitPrice x quantity, before discount. */
  lineTotalPaise: number;
  /**
   * This line's share of the order discount in whole paise. Shares add up to the order discount
   * exactly (largest-remainder allocation, ties to the earlier line). Informational: tax is computed
   * from the exact pro-rata share, as on the website, not from this rounded figure.
   */
  discountPaise: number;
}

export interface SaleCalculation {
  lines: SaleLineResult[];
  /** Sum of line totals before discount (website `subTotal`). */
  subTotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  /** GST added on top: exclusive-type lines only (website `cart.tax`). */
  exclusiveTaxPaise: number;
  /** GST already inside listed prices: inclusive-type lines. */
  inclusiveTaxPaise: number;
  /** All GST in the sale. */
  totalTaxPaise: number;
  /** subTotal - discount + shipping + exclusive tax (website `totalAmount`). */
  totalPaise: number;
}

/**
 * Website `calculateCart` without the coupon lookup:
 *   1. line total = price x quantity; subTotal = sum
 *   2. the order discount is spread over lines pro rata by line total
 *   3. each line's GST is computed on (line total - its discount share) with the line's own config
 *   4. only exclusive-type GST is added to the total; inclusive GST is already in the price
 */
export function calculateSale(input: SaleInput): SaleCalculation {
  if (!input.lines.length) throw new ValidationError('A sale needs at least one line');

  const discount = input.discountPaise ?? 0;
  const shipping = input.shippingPaise ?? 0;
  assertPaise(discount, 'discount');
  assertPaise(shipping, 'shipping');

  const lineTotals = input.lines.map((line) => {
    assertPaise(line.unitPricePaise, 'unit price');
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      throw new ValidationError('quantity must be a whole number of at least 1');
    }
    return BigInt(line.unitPricePaise) * BigInt(line.quantity);
  });
  const subTotal = lineTotals.reduce((sum, value) => sum + value, 0n);
  if (subTotal > BigInt(Number.MAX_SAFE_INTEGER)) throw new ValidationError('Order amount is too large');

  // The website lets a discount larger than the subtotal through (tax floors at zero but the total
  // goes negative). A discount can never exceed what is being discounted.
  if (BigInt(discount) > subTotal) {
    throw new ValidationError('Discount cannot exceed the order subtotal');
  }
  const discountBig = BigInt(discount);

  // Whole-paise discount shares by largest remainder.
  const floors: bigint[] = [];
  const remainders: bigint[] = [];
  for (const total of lineTotals) {
    const exact = subTotal > 0n ? discountBig * total : 0n;
    floors.push(subTotal > 0n ? exact / subTotal : 0n);
    remainders.push(subTotal > 0n ? exact % subTotal : 0n);
  }
  let leftover = discountBig - floors.reduce((sum, value) => sum + value, 0n);
  const order = remainders.map((remainder, index) => ({ remainder, index })).sort((a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1));
  for (const { index } of order) {
    if (leftover <= 0n) break;
    floors[index] += 1n;
    leftover -= 1n;
  }

  let exclusiveTax = 0;
  let inclusiveTax = 0;
  const lines: SaleLineResult[] = input.lines.map((line, index) => {
    const total = lineTotals[index];
    // taxable = lineTotal - discount * lineTotal / subTotal = lineTotal * (subTotal - discount) / subTotal
    const taxable: Rational = subTotal > 0n ? { n: total * (subTotal - discountBig), d: subTotal } : { n: 0n, d: 1n };
    const gst = computeGstRational(taxable, line.gst);
    if (gst.type === 'inclusive') inclusiveTax += gst.taxPaise;
    else exclusiveTax += gst.taxPaise;
    return {
      key: line.key,
      quantity: line.quantity,
      unitPricePaise: line.unitPricePaise,
      lineTotalPaise: Number(total),
      discountPaise: Number(floors[index]),
      ...gst,
    };
  });

  const subTotalPaise = Number(subTotal);
  return {
    lines,
    subTotalPaise,
    discountPaise: discount,
    shippingPaise: shipping,
    exclusiveTaxPaise: exclusiveTax,
    inclusiveTaxPaise: inclusiveTax,
    totalTaxPaise: exclusiveTax + inclusiveTax,
    totalPaise: subTotalPaise - discount + shipping + exclusiveTax,
  };
}

/** Website rate is a percentage that may carry decimals (2.5); ours is basis points. */
export function percentToBasisPoints(percent: number): number {
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0) {
    throw new ValidationError('GST rate must be a non-negative number');
  }
  const bp = Math.round(percent * 100);
  if (Math.abs(bp - percent * 100) > 1e-6) {
    throw new ValidationError('GST rate has more than two decimal places');
  }
  return bp;
}

/** "18" for 1800, "2.5" for 250: the label the website shows. */
export function basisPointsToPercentLabel(bp: number): string {
  const whole = Math.trunc(bp / 100);
  const frac = Math.abs(bp % 100);
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(2, '0').replace(/0+$/, '')}`;
}
