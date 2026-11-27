/**
 * GST tax invoice (owner decision 2026-11-26): CGST/SGST or IGST split, HSN/SAC resolution,
 * financial years and the invoice register built from invoice data.
 */
import { describe, it, expect } from 'vitest';
import { financialYearOf, financialYearRange, gstState, isIntraState, placeOfSupplyLabel, splitTax } from '../../src/modules/invoices/gst-split';
import { buildRegister, gstDate, hsnSummaryCsv, invoiceFileName, registerLinesCsv, resolvePeriod, stateSummaryCsv } from '../../src/modules/invoices/invoice-register';
import type { InvoiceDocumentData } from '../../src/modules/invoices/invoice.service';
import { hsnSacFor } from '../../src/modules/invoices/invoice.service';

describe('GST split', () => {
  it('splits intra-state tax into equal CGST and SGST, the odd paisa to SGST', () => {
    expect(splitTax(34322, true)).toEqual({ cgstPaise: 17161, sgstPaise: 17161, igstPaise: 0 });
    expect(splitTax(1901, true)).toEqual({ cgstPaise: 950, sgstPaise: 951, igstPaise: 0 });
  });

  it('puts inter-state tax wholly in IGST and ignores zero tax', () => {
    expect(splitTax(18000, false)).toEqual({ cgstPaise: 0, sgstPaise: 0, igstPaise: 18000 });
    expect(splitTax(0, true)).toEqual({ cgstPaise: 0, sgstPaise: 0, igstPaise: 0 });
  });

  it('recognises states by name, abbreviation, code and mixed case', () => {
    expect(gstState('maharashtra')).toEqual({ code: '27', name: 'Maharashtra' });
    expect(gstState('MH')).toEqual({ code: '27', name: 'Maharashtra' });
    expect(gstState('27-Maharashtra')).toEqual({ code: '27', name: 'Maharashtra' });
    expect(gstState('Jammu & Kashmir')?.code).toBe('01');
    expect(gstState('Atlantis')).toBeNull();
    expect(placeOfSupplyLabel('uttar pradesh')).toBe('09-Uttar Pradesh');
    expect(placeOfSupplyLabel('Atlantis')).toBe('Atlantis');
  });

  it('decides intra-state by state code', () => {
    expect(isIntraState('UP', 'Uttar Pradesh')).toBe(true);
    expect(isIntraState('Maharashtra', 'Uttar Pradesh')).toBe(false);
    expect(isIntraState('', 'Uttar Pradesh')).toBe(false);
  });

  it('gives the Indian financial year in Indian time', () => {
    expect(financialYearOf(new Date('2026-03-31T18:29:59.000Z'))).toBe('2025-26'); // 31 Mar 23:59 IST
    expect(financialYearOf(new Date('2026-03-31T18:30:00.000Z'))).toBe('2026-27'); // 1 Apr 00:00 IST
    const { from, to } = financialYearRange('2026-27');
    expect(from.toISOString()).toBe('2026-03-31T18:30:00.000Z');
    expect(to.toISOString()).toBe('2027-03-31T18:29:59.999Z');
    expect(() => financialYearRange('2026-28')).toThrow();
  });
});

describe('HSN/SAC resolution', () => {
  const defaults = { hsnSacReport: '998431', hsnSacConsultation: '', hsnSacProduct: '7117', hsnSacCourse: '' };
  const codes = { products: new Map([['p-1', '71171900'], ['p-2', null]]), reports: (id: string) => (id === 'report-x' ? '999799' : null) };

  it("uses the product's or report's own code first", () => {
    expect(hsnSacFor({ itemType: 'PRODUCT', catalogId: 'p-1' }, codes, defaults)).toBe('71171900');
    expect(hsnSacFor({ itemType: 'REPORT', catalogId: 'report-x' }, codes, defaults)).toBe('999799');
  });

  it('falls back to the default of the line type, and to nothing', () => {
    expect(hsnSacFor({ itemType: 'PRODUCT', catalogId: 'p-2' }, codes, defaults)).toBe('7117');
    expect(hsnSacFor({ itemType: 'REPORT', catalogId: 'report-y' }, codes, defaults)).toBe('998431');
    expect(hsnSacFor({ itemType: 'CONSULTATION', catalogId: 'c' }, codes, defaults)).toBeNull();
  });
});

function invoice(n: number, overrides: Partial<InvoiceDocumentData> = {}): InvoiceDocumentData {
  const tax = 18000;
  return {
    invoiceNumber: `INV-AS/${n}`,
    numberAllocated: true,
    allocationStatus: 'ALLOCATED',
    saleType: 'report',
    orderId: `order-${n}`,
    orderReference: `REF${n}`,
    orderDate: '2026-11-10T05:00:00.000Z',
    orderStatus: 'PAID',
    seller: { legalName: 'Seller', tagline: null, address: 'A', gstin: '09ABFCA5917P1Z2', state: 'Uttar Pradesh', email: null, phone: null, website: null },
    placeOfSupply: 'Uttar Pradesh',
    placeOfSupplyLabel: '09-Uttar Pradesh',
    taxType: 'intra',
    invoiceDate: '2026-11-10T05:00:00.000Z',
    reverseCharge: false,
    customer: { name: `Customer ${n}`, email: null, phone: '+919800000000' },
    shippingAddress: null,
    payment: { status: 'paid', method: 'razorpay', gatewayPaymentId: `pay_${n}`, paidAt: '2026-11-10T05:00:00.000Z', currency: 'INR', amountMinor: 118000, exchangeRate: '1' },
    lines: [
      { title: 'Report', description: null, itemType: 'REPORT', quantity: 1, unitPricePaise: 118000, lineTotalPaise: 118000, taxRateBp: 1800, taxInclusive: true, taxPaise: tax, taxablePaise: 100000, catalogId: 'report-x', hsnSac: '998431', cgstPaise: 9000, sgstPaise: 9000, igstPaise: 0 },
    ],
    totals: { subTotalPaise: 118000, discountPaise: 0, shippingPaise: 0, taxByRate: [{ rateBp: 1800, taxPaise: tax, inclusive: true }], taxPaise: tax, cgstPaise: 9000, sgstPaise: 9000, igstPaise: 0, grandTotalPaise: 118000 },
    ...overrides,
  } as InvoiceDocumentData;
}

describe('invoice register', () => {
  const period = resolvePeriod({ month: '2026-11' });
  const inter = invoice(12, {
    placeOfSupply: 'Maharashtra',
    placeOfSupplyLabel: '27-Maharashtra',
    taxType: 'inter',
    lines: [{ ...invoice(12).lines[0], hsnSac: null, cgstPaise: 0, sgstPaise: 0, igstPaise: 18000 }],
    totals: { ...invoice(12).totals, cgstPaise: 0, sgstPaise: 0, igstPaise: 18000 },
  });
  const register = buildRegister([invoice(13), inter, invoice(10)], period);

  it('resolves a month in Indian time', () => {
    expect(period.from.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(period.to.toISOString()).toBe('2026-11-30T18:29:59.999Z');
    expect(() => resolvePeriod({ month: '2026-13' })).toThrow();
    expect(() => resolvePeriod({})).toThrow();
  });

  it('sorts by number, reports gaps and missing codes, and totals the tax', () => {
    expect(register.rows.map((r) => r.invoiceNumber)).toEqual(['INV-AS/10', 'INV-AS/12', 'INV-AS/13']);
    expect(register.missingNumbers).toEqual(['INV-AS/11']);
    expect(register.linesWithoutHsnSac).toBe(1);
    expect(register.totals).toMatchObject({ invoices: 3, taxablePaise: 300000, cgstPaise: 18000, sgstPaise: 18000, igstPaise: 18000, taxPaise: 54000 });
    expect(register.rows[0].financialYear).toBe('2026-27');
  });

  it('summarises by HSN/SAC and by place of supply', () => {
    expect(register.byHsn).toEqual([
      expect.objectContaining({ hsnSac: '', rateBp: 1800, taxablePaise: 100000, igstPaise: 18000 }),
      expect.objectContaining({ hsnSac: '998431', rateBp: 1800, taxablePaise: 200000, cgstPaise: 18000, sgstPaise: 18000, quantity: 2, totalPaise: 236000 }),
    ]);
    expect(register.byState.map((s) => s.placeOfSupply)).toEqual(['09-Uttar Pradesh', '27-Maharashtra']);
  });

  it('writes the CSVs with rupee figures and GST-tool dates', () => {
    const lines = registerLinesCsv([invoice(13), inter, invoice(10)]).split('\r\n');
    expect(lines[0]).toContain('Invoice Number,Invoice Date,Financial Year');
    expect(lines[1]).toContain('INV-AS/10,10-Nov-2026,2026-27,Report');
    expect(lines[1]).toContain('1000.00,18,90.00,90.00,0.00');
    expect(lines[2]).toContain('Inter-State');
    expect(hsnSummaryCsv(register)).toContain('(not set),Astrology report,OTH-OTHERS,1,1180.00,18,1000.00,180.00,0.00,0.00,0.00');
    expect(stateSummaryCsv(register)).toContain('OE,27-Maharashtra,18,1000.00,180.00,0.00,0.00,0.00');
  });

  it('names files safely', () => {
    expect(invoiceFileName('INV-AS/118')).toBe('INV-AS-118.pdf');
    expect(gstDate('2026-11-23T20:15:00.000Z')).toBe('24-Nov-2026');
  });
});
