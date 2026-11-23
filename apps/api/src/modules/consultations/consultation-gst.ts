/**
 * GST for consultation prices, in integer paise.
 *
 * The arithmetic is the money module's (`commerce/money/tax.ts`, the port of the website's
 * `common/taxEngine.js`), so a booking, its order and its ledger row always agree:
 *   - inclusive: the price already contains the tax; the customer pays the price unchanged;
 *   - exclusive: the tax is added on top; the customer pays price + tax;
 *   - GST disabled, or rate 0: no tax.
 * This file only adapts it to the names used on consultation types and bookings.
 */
import { computeGst as computeMoneyGst } from '../commerce/money/tax';

export type GstType = 'INCLUSIVE' | 'EXCLUSIVE';

export interface GstConfig {
  enabled: boolean;
  /** 1800 = 18.00% */
  rateBasisPoints: number;
  type: GstType;
}

export interface GstBreakdown {
  /** Effective rate: 0 when GST is disabled. */
  rateBasisPoints: number;
  type: GstType;
  /** Value before tax. */
  taxablePaise: number;
  gstPaise: number;
  /** What the customer pays. */
  totalPaise: number;
}

export type DiscountType = 'FLAT' | 'PERCENTAGE';

export function computeGst(amountPaise: number, gst: GstConfig): GstBreakdown {
  if (!Number.isInteger(amountPaise) || amountPaise < 0) {
    throw new RangeError('amountPaise must be a non-negative integer');
  }
  if (!Number.isInteger(gst.rateBasisPoints) || gst.rateBasisPoints < 0 || gst.rateBasisPoints > 10000) {
    throw new RangeError('GST rate must be between 0 and 10000 basis points');
  }
  const result = computeMoneyGst(amountPaise, {
    enabled: gst.enabled,
    rateBp: gst.rateBasisPoints,
    type: gst.type === 'INCLUSIVE' ? 'inclusive' : 'exclusive',
  });
  return {
    rateBasisPoints: result.rateBp,
    type: gst.type,
    taxablePaise: result.basePaise,
    gstPaise: result.taxPaise,
    totalPaise: result.totalPaise,
  };
}

/**
 * Discount on a manual booking, as the website computes it: taken off the mode price
 * before GST and never more than the price.
 *   FLAT: `value` is paise. PERCENTAGE: `value` is basis points (1250 = 12.5%).
 */
export function computeDiscountPaise(pricePaise: number, type: DiscountType | null | undefined, value: number | null | undefined): number {
  if (!type || !value || value <= 0) return 0;
  if (!Number.isInteger(value)) throw new RangeError('discount value must be an integer');
  if (type === 'PERCENTAGE') {
    if (value > 10000) throw new RangeError('percentage discount cannot exceed 100%');
    return Math.min(pricePaise, Math.round((pricePaise * value) / 10000));
  }
  return Math.min(pricePaise, value);
}
