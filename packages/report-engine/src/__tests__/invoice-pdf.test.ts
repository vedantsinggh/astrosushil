/**
 * GST invoice PDF: real XeLaTeX compiles of sample invoices, read back with poppler
 * (`pdfinfo`, `pdftotext`). No network, no database. Set INVOICE_PDF_OUT to a directory to keep
 * the rendered samples for a visual check.
 */
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { invoicePdf } from '../index';

type InvoicePdfData = invoicePdf.InvoicePdfData;

const hasTool = (tool: string, flag = '--version') => spawnSync(tool, [flag]).error === undefined;
const toolsPresent = hasTool('xelatex') && hasTool('pdftotext', '-v') && hasTool('pdfinfo', '-v');

const GSTIN = '09ABFCA5917P1Z2';
const seller: InvoicePdfData['seller'] = {
  legalName: 'Astro Sushil Private Limited',
  tagline: 'Gupt Nadi Astrology · Vastu Shastra · Tantra',
  address: 'Flat No-1204, 12th Floor, Tower B-3, Sector 121, Gautam Buddha Nagar - 201316, Uttar Pradesh',
  gstin: GSTIN,
  state: 'Uttar Pradesh',
  email: 'billing@example.test',
  phone: '+91 90000 00000',
  website: 'www.example.test',
};

/** A paid product order in INR: two lines at different GST rates, a discount and shipping. */
function inrOrder(overrides: Partial<InvoicePdfData> = {}): InvoicePdfData {
  return {
    invoiceNumber: 'INV-AS/118',
    numberAllocated: true,
    saleType: 'order',
    orderId: '5f1c2f0e-8d0a-4a51-9b1e-3c2a7d9e4f10',
    orderReference: '3C2A7D9E4F10',
    orderDate: '2026-11-23T20:15:00.000Z', // 24 Nov 2026 in India
    orderStatus: 'PAID',
    seller,
    placeOfSupply: 'Maharashtra',
    reverseCharge: false,
    customer: { name: 'Asha Verma', email: 'asha.verma@example.test', phone: '+919811111111' },
    shippingAddress: {
      fullName: 'Asha Verma',
      phone: '+919811111111',
      addressLine1: '14 Lake View Road',
      addressLine2: 'Near City Park',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      country: 'India',
    },
    payment: {
      status: 'paid',
      method: 'razorpay',
      gatewayPaymentId: 'pay_QwErTy12345678',
      paidAt: '2026-11-23T20:16:30.000Z',
      currency: 'INR',
      amountMinor: 268000,
      exchangeRate: '1',
    },
    lines: [
      { title: 'Rudraksha Mala (108 beads)', description: 'Energised five-mukhi mala', itemType: 'PRODUCT', quantity: 2, unitPricePaise: 118000, lineTotalPaise: 236000, taxRateBp: 1800, taxInclusive: true, taxPaise: 34322, taxablePaise: 190678 },
      { title: 'Brass Yantra', description: null, itemType: 'PRODUCT', quantity: 1, unitPricePaise: 40000, lineTotalPaise: 40000, taxRateBp: 500, taxInclusive: false, taxPaise: 1900, taxablePaise: 38000 },
    ],
    totals: {
      subTotalPaise: 276000,
      discountPaise: 15000,
      shippingPaise: 5100,
      taxByRate: [
        { rateBp: 500, taxPaise: 1900, inclusive: false },
        { rateBp: 1800, taxPaise: 34322, inclusive: true },
      ],
      taxPaise: 36222,
      grandTotalPaise: 268000,
    },
    ...overrides,
  };
}

/** A report bought from abroad and charged in US dollars. */
function usdReport(): InvoicePdfData {
  return inrOrder({
    invoiceNumber: 'INV-AS/119',
    saleType: 'report',
    orderReference: '2A7D9E4F10',
    placeOfSupply: 'Uttar Pradesh',
    shippingAddress: null,
    customer: { name: 'Daniel Brooks', email: 'daniel@example.test', phone: null },
    payment: { status: 'paid', method: 'razorpay', gatewayPaymentId: 'pay_UsD0000000001', paidAt: '2026-11-24T06:00:00.000Z', currency: 'USD', amountMinor: 1420, exchangeRate: '0.0120338983', minorUnitExponent: 2 },
    lines: [{ title: 'Career Report', description: 'Personalised career report (PDF)', itemType: 'REPORT', quantity: 1, unitPricePaise: 118000, lineTotalPaise: 118000, taxRateBp: 1800, taxInclusive: true, taxPaise: 18000, taxablePaise: 100000 }],
    totals: { subTotalPaise: 118000, discountPaise: 0, shippingPaise: 0, taxByRate: [{ rateBp: 1800, taxPaise: 18000, inclusive: true }], taxPaise: 18000, grandTotalPaise: 118000 },
  });
}

/** A consultation booked by a customer whose name, and the consultation's title, are in Hindi. */
function hindiConsultation(): InvoicePdfData {
  return inrOrder({
    invoiceNumber: 'INV-AS/07',
    saleType: 'consultation',
    orderReference: '2A7D9E4F10',
    placeOfSupply: 'Uttar Pradesh',
    shippingAddress: null,
    customer: { name: 'सुशील कुमार श्रीवास्तव', email: 'sushil@example.test', phone: '+919822222222' },
    payment: { status: 'paid', method: 'manual', gatewayPaymentId: null, paidAt: '2026-11-24T06:00:00.000Z', currency: 'INR', amountMinor: 250000, exchangeRate: '1' },
    lines: [{ title: 'ज्योतिष परामर्श (वीडियो)', description: 'Premium plan', itemType: 'CONSULTATION', quantity: 1, unitPricePaise: 250000, lineTotalPaise: 250000, taxRateBp: 1800, taxInclusive: true, taxPaise: 38136, taxablePaise: 211864 }],
    totals: { subTotalPaise: 250000, discountPaise: 0, shippingPaise: 0, taxByRate: [{ rateBp: 1800, taxPaise: 38136, inclusive: true }], taxPaise: 38136, grandTotalPaise: 250000 },
    consultation: { date: '2026-12-02', slot: '10:00-10:45', mode: 'VIDEO', durationMinutes: 45 },
  });
}

let workDir: string;

function inspect(name: string, pdf: Buffer): { pages: number; text: string; squeezed: string } {
  const file = path.join(workDir, `${name}.pdf`);
  fs.writeFileSync(file, pdf);
  const info = execFileSync('pdfinfo', [file], { encoding: 'utf-8' });
  const text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf-8' });
  const out = process.env.INVOICE_PDF_OUT;
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.copyFileSync(file, path.join(out, `${name}.pdf`));
  }
  // `text` keeps the page layout (a label and its amount on one line). `squeezed` is read block by
  // block, so side-by-side boxes do not interleave, with all white space removed because long
  // values wrap.
  const flow = execFileSync('pdftotext', [file, '-'], { encoding: 'utf-8' });
  return { pages: Number(/Pages:\s+(\d+)/.exec(info)?.[1]), text, squeezed: flow.replace(/\s+/g, '') };
}

describe('invoice formatting', () => {
  it('groups rupees the Indian way and keeps paise exact', () => {
    expect(invoicePdf.formatPaise(0)).toBe('0.00');
    expect(invoicePdf.formatPaise(5)).toBe('0.05');
    expect(invoicePdf.formatPaise(118000)).toBe('1,180.00');
    expect(invoicePdf.formatPaise(1234567890)).toBe('1,23,45,678.90');
    expect(() => invoicePdf.formatPaise(10.5)).toThrow();
  });

  it('formats other currencies by their own number of decimals', () => {
    expect(invoicePdf.formatMinor(1420, 2)).toBe('14.20');
    expect(invoicePdf.formatMinor(123456789, 2)).toBe('1,234,567.89');
    expect(invoicePdf.formatMinor(1500, 0)).toBe('1,500');
  });

  it('formats GST rates and Indian dates', () => {
    expect(invoicePdf.formatRateBp(1800)).toBe('18%');
    expect(invoicePdf.formatRateBp(1250)).toBe('12.5%');
    expect(invoicePdf.formatRateBp(25)).toBe('0.25%');
    // 20:15 UTC on the 23rd is already the 24th in India.
    expect(invoicePdf.formatIndianDate('2026-11-23T20:15:00.000Z')).toBe('24 Nov 2026');
    expect(invoicePdf.formatCalendarDate('2026-12-02')).toBe('02 Dec 2026');
  });
});

describe('invoice LaTeX source', () => {
  it('escapes every LaTeX-special character in customer-supplied text', () => {
    const source = invoicePdf.buildInvoiceLatex(
      inrOrder({ customer: { name: 'A & B 100% a_b #1 $5 {x} \\input{/etc/passwd} ^~', email: null, phone: null } })
    );
    expect(source).toContain('A \\& B 100\\% a\\_b \\#1 \\$5 \\{x\\} \\textbackslash{}input\\{/etc/passwd\\} \\textasciicircum{}\\textasciitilde{}');
    expect(source).not.toContain('\\input{/etc/passwd}');
  });

  it('turns line breaks and control characters inside a value into spaces', () => {
    const source = invoicePdf.buildInvoiceLatex(inrOrder({ customer: { name: 'Line One\n\n\\end{document}\u0000\u2028Line Two', email: null, phone: null } }));
    expect(source).toContain('Line One \\textbackslash{}end\\{document\\} Line Two');
    expect(source.match(/\\end\{document\}/g)).toHaveLength(1);
  });

  it('is deterministic', () => {
    expect(invoicePdf.buildInvoiceLatex(inrOrder())).toBe(invoicePdf.buildInvoiceLatex(inrOrder()));
  });
});

describe.skipIf(!toolsPresent)('invoice PDF (XeLaTeX)', () => {
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'as-invoice-test-'));
  });
  afterAll(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('renders an INR product order on one page with number, seller, GSTIN, lines and totals', async () => {
    const { pages, text, squeezed } = inspect('invoice-inr-order', await invoicePdf.renderInvoicePdf(inrOrder()));
    expect(pages).toBe(1);
    expect(text).toContain('INVOICE');
    expect(text).toContain('INV-AS/118');
    expect(text).toContain(`GSTIN: ${GSTIN}`);
    expect(text).toContain('ASTRO SUSHIL PRIVATE LIMITED');
    expect(text).toContain('24 Nov 2026');
    expect(text).toContain('3C2A7D9E4F10');
    expect(text).toMatch(/Maharashtra/);
    expect(squeezed).toContain('PLACEOFSUPPLY');
    expect(squeezed).toContain('REVERSECHARGE');
    expect(squeezed).toContain('RudrakshaMala(108beads)');
    expect(squeezed).toContain('pay_QwErTy12345678');
    expect(text).toContain('Razorpay');
    // Per line: unit price, taxable value, GST rate and amount, line total.
    for (const figure of ['₹1,180.00', '₹1,906.78', '₹343.22', '₹2,360.00', '₹400.00', '₹380.00', '₹19.00']) expect(text).toContain(figure);
    // Totals: subtotal, discount, shipping, taxable value, one row per GST rate, grand total.
    expect(text).toMatch(/Subtotal\s+₹2,760\.00/);
    expect(text).toMatch(/Discount\s+−\s*₹150\.00/);
    expect(text).toMatch(/Shipping\s+₹51\.00/);
    expect(text).toMatch(/Taxable Value \(Excl\. GST\)\s+₹2,286\.78/);
    expect(text).toMatch(/GST 5% — Added\s+₹19\.00/);
    expect(text).toMatch(/GST 18% — Included\s+₹343\.22/);
    expect(text).toMatch(/Grand Total\s+₹2,680\.00/);
    // The website prints no CGST / SGST / IGST split and no HSN or SAC code; neither does this.
    expect(text).not.toMatch(/CGST|SGST|IGST|HSN|SAC/);
    expect(text).toContain('For Astro Sushil Private Limited');
    expect(text).toContain('This is a system-generated invoice and does not require a physical signature.');
    expect(text).toContain('Page 1 of 1');
  }, 60000);

  it('prints a foreign-currency sale as the charged amount with the INR value and rate beneath', async () => {
    const { pages, text } = inspect('invoice-usd-report', await invoicePdf.renderInvoicePdf(usdReport()));
    expect(pages).toBe(1);
    expect(text).toContain('INV-AS/119');
    expect(text).toContain(`GSTIN: ${GSTIN}`);
    expect(text).toMatch(/Report: Career Report/);
    expect(text).toMatch(/Total in INR\s+₹1,180\.00/);
    expect(text).toMatch(/Grand Total\s+USD 14\.20/);
    expect(text).toMatch(/INR equivalent: ₹1,180\.00/);
    expect(text).toMatch(/Exchange rate: 1 INR = 0\.0120338983 USD/);
    expect(text).toMatch(/GST 18% — Included\s+₹180\.00/);
  }, 60000);

  it('prints whole yen for a zero-decimal currency', async () => {
    const data = usdReport();
    data.payment = { ...data.payment, currency: 'JPY', amountMinor: 2150, exchangeRate: '1.8220338983', minorUnitExponent: 0 };
    const { text } = inspect('invoice-jpy-report', await invoicePdf.renderInvoicePdf(data));
    expect(text).toMatch(/Grand Total\s+JPY 2,150\s*$/m);
  }, 60000);

  it('renders Hindi names and titles in Devanagari, with the booking details', async () => {
    const { pages, text, squeezed } = inspect('invoice-hindi-consultation', await invoicePdf.renderInvoicePdf(hindiConsultation()));
    expect(pages).toBe(1);
    expect(text).toContain('INV-AS/07');
    expect(text).toContain(`GSTIN: ${GSTIN}`);
    // pdftotext returns Devanagari glyphs in drawing order (a short-i sign after its consonant, a
    // conjunct split), so only words that survive extraction unchanged are compared; the rendering
    // itself was checked by eye. No glyph may be missing from the font.
    expect(text).toContain('सुशील');
    expect(text).toContain('श्रीवास्तव');
    expect(text).toContain('परामश');
    expect(text).not.toContain('\uFFFD');
    expect(squeezed).toContain('BOOKINGID');
    expect(text).toContain('Booked On: 24 Nov 2026');
    expect(text).toContain('Scheduled: 02 Dec 2026');
    expect(text).toContain('10:00-10:45');
    expect(text).toContain('Video Call');
    expect(text).toContain('45 mins');
    expect(text).toContain('Manual');
    expect(text).toMatch(/Grand Total\s+₹2,500\.00/);
  }, 60000);

  it('prints the fallback label when no number has been allocated', async () => {
    const pending = inspect(
      'invoice-no-number-order',
      await invoicePdf.renderInvoicePdf(inrOrder({ invoiceNumber: 'Invoice being prepared', numberAllocated: false }))
    );
    expect(pending.pages).toBe(1);
    expect(pending.text).toContain('Invoice being prepared');
    expect(pending.text).not.toContain('INV-AS/');
    expect(pending.text).toContain(`GSTIN: ${GSTIN}`);
    expect(pending.text).toMatch(/Grand Total\s+₹2,680\.00/);

    const unpaid = inrOrder({ invoiceNumber: 'No invoice issued', numberAllocated: false });
    unpaid.payment = { ...unpaid.payment, status: 'pending', gatewayPaymentId: null, paidAt: null };
    const notIssued = inspect('invoice-no-number-unpaid', await invoicePdf.renderInvoicePdf(unpaid));
    expect(notIssued.text).toContain('No invoice issued');
    expect(notIssued.text).toContain('PENDING');

    const legacy = hindiConsultation();
    legacy.invoiceNumber = 'INV-7D9E4F10';
    legacy.numberAllocated = false;
    expect(inspect('invoice-no-number-legacy', await invoicePdf.renderInvoicePdf(legacy)).text).toContain('INV-7D9E4F10');
  }, 90000);

  it('prints LaTeX-special characters literally and never runs them as commands', async () => {
    const hostile = 'A & B 100% a_b #1 $5 {x} \\input{/etc/passwd} \\write18{id} \\end{document} ^ ~';
    const data = inrOrder({
      invoiceNumber: 'INV-AS/120',
      customer: { name: hostile, email: 'a_b%c&d#e@example.test', phone: '\\immediate\\write18{touch pwned}' },
    });
    data.seller = { ...seller, legalName: 'Sushil & Sons {Astro} 100%_#$' };
    data.lines[0] = { ...data.lines[0], title: `Mala ${hostile}`, description: '\\csname input\\endcsname{/etc/hostname} $$x^2_1$$ \\\\ & & &' };
    data.shippingAddress = { ...(data.shippingAddress as NonNullable<InvoicePdfData['shippingAddress']>), fullName: hostile, addressLine1: '#12, {Block} A_1 & B\\\\[5cm]', city: '~Pune~%' };
    data.payment = { ...data.payment, gatewayPaymentId: 'pay_{x}\\def\\a{b}%$#&' };
    data.placeOfSupply = 'Uttar \\textbf{Pradesh} & Co';
    data.orderReference = 'AB_12#%';

    const { pages, text, squeezed } = inspect('invoice-special-characters', await invoicePdf.renderInvoicePdf(data));
    expect(pages).toBe(1);
    // Everything after the hostile text still printed: the document was not cut short or broken.
    expect(text).toContain('INV-AS/120');
    expect(text).toContain(`GSTIN: ${GSTIN}`);
    expect(text).toMatch(/Grand Total\s+₹2,680\.00/);
    expect(text).toContain('This is a system-generated invoice');
    // The characters appear as typed.
    expect(squeezed).toContain(hostile.replace(/\s+/g, ''));
    expect(squeezed).toContain('a_b%c&d#e@example.test');
    expect(squeezed).toContain('\\immediate\\write18{touchpwned}');
    expect(squeezed).toContain('\\csnameinput\\endcsname{/etc/hostname}$$x^2_1$$\\\\&&&');
    expect(squeezed).toContain('#12,{Block}A_1&B\\\\[5cm]');
    expect(squeezed).toContain('~Pune~%');
    expect(squeezed).toContain('pay_{x}\\def\\a{b}%$#&');
    expect(squeezed).toContain('Uttar\\textbf{Pradesh}&Co');
    expect(squeezed).toContain('AB_12#%');
    expect(squeezed).toContain('SUSHIL&SONS{ASTRO}100%_#$');
    expect(squeezed).toContain('ForSushil&Sons{Astro}100%_#$');
    // No file was read into the page and nothing was executed.
    expect(text).not.toMatch(/root:.*:0:0:/);
    expect(text).not.toContain(fs.readFileSync('/etc/hostname', 'utf-8').trim() || '\u0000');
    expect(fs.existsSync(path.join(process.cwd(), 'pwned'))).toBe(false);
  }, 60000);

  it('continues a long invoice on further pages with the header row repeated', async () => {
    const data = inrOrder();
    data.lines = Array.from({ length: 45 }, (_, index) => ({ ...data.lines[0], title: `Item number ${index + 1}`, description: null }));
    const { pages, text } = inspect('invoice-long', await invoicePdf.renderInvoicePdf(data));
    expect(pages).toBeGreaterThan(1);
    expect(text).toContain('Item number 45');
    for (let page = 1; page <= pages; page++) expect(text).toContain(`Page ${page} of ${pages}`);
    expect(text.match(/TAXABLE VALUE/g)).toHaveLength(pages);
    expect(text).toMatch(/Grand Total\s+₹2,680\.00/);
  }, 60000);

  it('stops at the time limit and reports it without invoice content', async () => {
    const failure = await invoicePdf.renderInvoicePdf(inrOrder(), { timeoutMs: 1 }).catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(invoicePdf.InvoicePdfError);
    expect((failure as invoicePdf.InvoicePdfError).kind).toBe('timeout');
    expect((failure as Error).message).not.toContain('Asha');
  }, 30000);

  it('prints a GST tax invoice: HSN/SAC column and CGST + SGST for a sale in the seller state', async () => {
    const split = (tax: number) => ({ cgstPaise: Math.floor(tax / 2), sgstPaise: tax - Math.floor(tax / 2), igstPaise: 0 });
    const base = inrOrder();
    const data: InvoicePdfData = {
      ...base,
      placeOfSupply: 'Uttar Pradesh',
      placeOfSupplyLabel: '09-Uttar Pradesh',
      taxType: 'intra',
      invoiceDate: '2026-11-25T06:00:00.000Z',
      lines: base.lines.map((line, i) => ({ ...line, hsnSac: i === 0 ? '71171900' : null, ...split(line.taxPaise) })),
    };
    const { pages, text } = inspect('invoice-tax-intra', await invoicePdf.renderInvoicePdf(data));
    expect(pages).toBe(1);
    expect(text).toContain('TAX INVOICE');
    expect(text).toContain('HSN/SAC');
    expect(text).toContain('71171900');
    expect(text).toContain('09-Uttar Pradesh');
    expect(text).toMatch(/Invoice Date: 25 Nov 2026/);
    expect(text).toMatch(/CGST @ 9%\s+₹171\.61/);
    expect(text).toMatch(/SGST @ 9%\s+₹171\.61/);
    expect(text).toMatch(/CGST @ 2\.5%\s+₹9\.50/);
    expect(text).toMatch(/Total GST\s+₹362\.22/);
    expect(text).not.toContain('IGST');
  }, 60000);

  it('prints IGST for a sale to another state', async () => {
    const base = inrOrder();
    const data: InvoicePdfData = {
      ...base,
      placeOfSupplyLabel: '27-Maharashtra',
      taxType: 'inter',
      lines: base.lines.map((line) => ({ ...line, hsnSac: '9997', cgstPaise: 0, sgstPaise: 0, igstPaise: line.taxPaise })),
    };
    const { text } = inspect('invoice-tax-inter', await invoicePdf.renderInvoicePdf(data));
    expect(text).toMatch(/IGST @ 18%\s+₹343\.22/);
    expect(text).toMatch(/IGST @ 5%\s+₹19\.00/);
    expect(text).toContain('27-Maharashtra');
    expect(text).not.toMatch(/CGST|SGST/);
  }, 60000);

  it('reports a compile failure with only the TeX error line', async () => {
    const failure = await invoicePdf
      .compileInvoiceLatex('\\documentclass{article}\\begin{document}Secret Name \\undefinedcommand\\end{document}')
      .catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(invoicePdf.InvoicePdfError);
    const error = failure as invoicePdf.InvoicePdfError;
    expect(error.kind).toBe('compile');
    expect(error.texError).toBe('! Undefined control sequence.');
    expect(`${error.message} ${error.texError}`).not.toContain('Secret Name');
  }, 30000);

  it('leaves no work directory behind', async () => {
    const before = fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith('as-invoice-') && !name.startsWith('as-invoice-test-'));
    await invoicePdf.renderInvoicePdf(usdReport());
    const after = fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith('as-invoice-') && !name.startsWith('as-invoice-test-'));
    expect(after.length).toBeLessThanOrEqual(before.length);
  }, 60000);
});
