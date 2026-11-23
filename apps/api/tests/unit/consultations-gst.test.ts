import { describe, expect, it } from 'vitest';
import { computeDiscountPaise, computeGst } from '../../src/modules/consultations/consultation-gst';

describe('consultation GST (integer paise)', () => {
  it('inclusive: the customer pays the price and the tax is backed out of it', () => {
    const r = computeGst(1000000, { enabled: true, rateBasisPoints: 1800, type: 'INCLUSIVE' });
    expect(r.totalPaise).toBe(1000000);
    expect(r.taxablePaise).toBe(847458);
    expect(r.gstPaise).toBe(152542);
    expect(r.taxablePaise + r.gstPaise).toBe(r.totalPaise);
  });

  it('exclusive: the tax is added on top (the website charged only the bare price in INR)', () => {
    const r = computeGst(1000000, { enabled: true, rateBasisPoints: 1800, type: 'EXCLUSIVE' });
    expect(r.taxablePaise).toBe(1000000);
    expect(r.gstPaise).toBe(180000);
    expect(r.totalPaise).toBe(1180000);
  });

  it('disabled GST or a zero rate charges the price with no tax', () => {
    for (const type of ['INCLUSIVE', 'EXCLUSIVE'] as const) {
      expect(computeGst(50000, { enabled: false, rateBasisPoints: 1800, type })).toMatchObject({
        rateBasisPoints: 0,
        taxablePaise: 50000,
        gstPaise: 0,
        totalPaise: 50000,
      });
      expect(computeGst(50000, { enabled: true, rateBasisPoints: 0, type }).totalPaise).toBe(50000);
    }
  });

  it('rejects amounts and rates that are not sane integers', () => {
    expect(() => computeGst(10.5, { enabled: true, rateBasisPoints: 1800, type: 'INCLUSIVE' })).toThrow(RangeError);
    expect(() => computeGst(-1, { enabled: true, rateBasisPoints: 1800, type: 'INCLUSIVE' })).toThrow(RangeError);
    expect(() => computeGst(100, { enabled: true, rateBasisPoints: 10001, type: 'EXCLUSIVE' })).toThrow(RangeError);
  });
});

describe('manual booking discount', () => {
  it('flat discount is paise and never exceeds the price', () => {
    expect(computeDiscountPaise(500000, 'FLAT', 100000)).toBe(100000);
    expect(computeDiscountPaise(500000, 'FLAT', 900000)).toBe(500000);
  });

  it('percentage discount is basis points', () => {
    expect(computeDiscountPaise(500000, 'PERCENTAGE', 1250)).toBe(62500);
    expect(computeDiscountPaise(500000, 'PERCENTAGE', 10000)).toBe(500000);
    expect(() => computeDiscountPaise(500000, 'PERCENTAGE', 10001)).toThrow(RangeError);
  });

  it('no type or no value means no discount', () => {
    expect(computeDiscountPaise(500000, undefined, 100)).toBe(0);
    expect(computeDiscountPaise(500000, 'FLAT', 0)).toBe(0);
    expect(computeDiscountPaise(500000, 'FLAT', undefined)).toBe(0);
  });

  it('discount applies before GST, as on the website', () => {
    const price = 1000000;
    const discount = computeDiscountPaise(price, 'PERCENTAGE', 1000);
    const exclusive = computeGst(price - discount, { enabled: true, rateBasisPoints: 1800, type: 'EXCLUSIVE' });
    expect(exclusive.totalPaise).toBe(900000 + 162000);
    const inclusive = computeGst(price - discount, { enabled: true, rateBasisPoints: 1800, type: 'INCLUSIVE' });
    expect(inclusive.totalPaise).toBe(900000);
  });
});
