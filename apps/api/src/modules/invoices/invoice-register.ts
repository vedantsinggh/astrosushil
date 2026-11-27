/**
 * Invoice register (owner decision 2026-11-26): every GST invoice of a period, in one consistent
 * shape, for the owner's CA (GSTR-1, GSTR-3B and the income-tax return).
 *
 * Every figure comes from `invoiceService.getInvoiceData`, the same data the invoice PDF prints,
 * so the register and the PDFs can never disagree. Only invoices that carry an `INV-AS/<n>`
 * number are listed; the invoice date is the payment date (the number is issued then).
 *
 * Exports:
 *   - register CSV: one row per invoice line (HSN/SAC, taxable value, rate, CGST, SGST, IGST);
 *   - HSN summary CSV: GSTR-1 table 12 shape (per HSN/SAC and rate);
 *   - state-wise summary CSV: GSTR-1 B2C shape (per place of supply and rate);
 *   - ZIP: every invoice PDF of the period plus the three CSVs.
 */
import { zipSync, strToU8 } from 'fflate';
import { prisma } from '../../services/prisma.service';
import { ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { paiseToRupeeText, toCsv, istDayBoundary } from '../transactions/csv';
import { financialYearOf, financialYearRange } from './gst-split';
import { parseInvoiceNumber } from './invoice-number';
import { InvoiceDocumentData, invoiceService } from './invoice.service';

/** At most this many invoices in one ZIP (each PDF takes a few seconds to compile). */
export const REGISTER_ZIP_MAX_INVOICES = 400;

export interface RegisterPeriodInput {
  /** YYYY-MM-DD, Indian time, inclusive. */
  from?: string;
  to?: string;
  /** "2026-27". */
  fy?: string;
  /** "2026-11". */
  month?: string;
}

export interface RegisterPeriod {
  from: Date;
  to: Date;
  label: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "24-Nov-2026" (the date format of the GST offline tools), Indian calendar day. */
export function gstDate(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const ist = new Date(date.getTime() + 330 * 60_000);
  return `${String(ist.getUTCDate()).padStart(2, '0')}-${MONTHS[ist.getUTCMonth()]}-${ist.getUTCFullYear()}`;
}

export function resolvePeriod(input: RegisterPeriodInput): RegisterPeriod {
  if (input.fy) {
    try {
      const { from, to } = financialYearRange(input.fy);
      return { from, to, label: `FY${input.fy}` };
    } catch {
      throw new ValidationError('Financial year must look like 2026-27');
    }
  }
  if (input.month) {
    const match = /^(\d{4})-(\d{2})$/.exec(input.month);
    const month = match ? Number(match[2]) : 0;
    if (!match || month < 1 || month > 12) throw new ValidationError('Month must look like 2026-11');
    const year = Number(match[1]);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      from: istDayBoundary(`${match[1]}-${match[2]}-01`, 'start'),
      to: istDayBoundary(`${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`, 'end'),
      label: `${MONTHS[month - 1]}-${year}`,
    };
  }
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (!input.from || !input.to || !day.test(input.from) || !day.test(input.to)) {
    throw new ValidationError('Choose a financial year, a month, or a from and to date (YYYY-MM-DD)');
  }
  const from = istDayBoundary(input.from, 'start');
  const to = istDayBoundary(input.to, 'end');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new ValidationError('The from date must be on or before the to date');
  return { from, to, label: `${input.from}_to_${input.to}` };
}

export interface RegisterRow {
  invoiceNumber: string;
  sequence: number | null;
  invoiceDate: string;
  financialYear: string;
  saleType: InvoiceDocumentData['saleType'];
  orderId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  placeOfSupply: string;
  taxType: 'intra' | 'inter';
  hsnSac: string[];
  missingHsnSac: boolean;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxPaise: number;
  shippingPaise: number;
  discountPaise: number;
  grandTotalPaise: number;
  currency: string;
  amountMinor: number;
  exchangeRate: string;
  paymentMethod: string;
  gatewayPaymentId: string | null;
}

export interface RateSummary {
  rateBp: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}

export interface HsnSummary extends RateSummary {
  hsnSac: string;
  description: string;
  quantity: number;
  totalPaise: number;
}

export interface StateSummary extends RateSummary {
  placeOfSupply: string;
}

export interface InvoiceRegister {
  period: { from: string; to: string; label: string };
  rows: RegisterRow[];
  totals: { invoices: number; taxablePaise: number; cgstPaise: number; sgstPaise: number; igstPaise: number; taxPaise: number; shippingPaise: number; grandTotalPaise: number };
  byRate: RateSummary[];
  byHsn: HsnSummary[];
  byState: StateSummary[];
  /** Numbers missing between the lowest and highest number of the period (should be none). */
  missingNumbers: string[];
  linesWithoutHsnSac: number;
}

const ITEM_DESCRIPTION: Record<string, string> = {
  REPORT: 'Astrology report',
  CONSULTATION: 'Astrology consultation',
  PRODUCT: 'Goods',
  COURSE: 'Course',
};

function lineTaxable(line: InvoiceDocumentData['lines'][number]): number {
  return typeof line.taxablePaise === 'number' ? line.taxablePaise : line.lineTotalPaise - (line.taxInclusive ? line.taxPaise : 0);
}

function addTo<T extends RateSummary>(target: T, line: InvoiceDocumentData['lines'][number]): void {
  target.taxablePaise += lineTaxable(line);
  target.cgstPaise += line.cgstPaise;
  target.sgstPaise += line.sgstPaise;
  target.igstPaise += line.igstPaise;
}

/** Pure: the register of already loaded invoices (sorted by number). */
export function buildRegister(invoices: InvoiceDocumentData[], period: RegisterPeriod): InvoiceRegister {
  const sorted = [...invoices].sort((a, b) => {
    const x = parseInvoiceNumber(a.invoiceNumber);
    const y = parseInvoiceNumber(b.invoiceNumber);
    if (x !== null && y !== null) return x < y ? -1 : x > y ? 1 : 0;
    return a.invoiceNumber.localeCompare(b.invoiceNumber);
  });

  const byRate = new Map<number, RateSummary>();
  const byHsn = new Map<string, HsnSummary>();
  const byState = new Map<string, StateSummary>();
  let linesWithoutHsnSac = 0;

  const rows = sorted.map((invoice): RegisterRow => {
    for (const line of invoice.lines) {
      if (!line.hsnSac) linesWithoutHsnSac += 1;
      const rate = byRate.get(line.taxRateBp) ?? { rateBp: line.taxRateBp, taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 };
      addTo(rate, line);
      byRate.set(line.taxRateBp, rate);

      const hsn = line.hsnSac ?? '';
      // Lines without a code are kept apart per type, so the summary never mixes goods and services.
      const hsnKey = `${hsn || `none:${line.itemType}`}|${line.taxRateBp}`;
      const hsnRow = byHsn.get(hsnKey) ?? { hsnSac: hsn, description: ITEM_DESCRIPTION[line.itemType] ?? line.itemType, rateBp: line.taxRateBp, quantity: 0, totalPaise: 0, taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 };
      addTo(hsnRow, line);
      hsnRow.quantity += line.quantity;
      hsnRow.totalPaise += lineTaxable(line) + line.taxPaise;
      byHsn.set(hsnKey, hsnRow);

      const stateKey = `${invoice.placeOfSupplyLabel}|${line.taxRateBp}`;
      const stateRow = byState.get(stateKey) ?? { placeOfSupply: invoice.placeOfSupplyLabel, rateBp: line.taxRateBp, taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 };
      addTo(stateRow, line);
      byState.set(stateKey, stateRow);
    }
    const codes = [...new Set(invoice.lines.map((line) => line.hsnSac).filter((code): code is string => !!code))];
    const sequence = parseInvoiceNumber(invoice.invoiceNumber);
    return {
      invoiceNumber: invoice.invoiceNumber,
      sequence: sequence === null ? null : Number(sequence),
      invoiceDate: invoice.invoiceDate,
      financialYear: financialYearOf(new Date(invoice.invoiceDate)),
      saleType: invoice.saleType,
      orderId: invoice.orderId,
      customerName: invoice.customer.name,
      customerEmail: invoice.customer.email,
      customerPhone: invoice.customer.phone,
      placeOfSupply: invoice.placeOfSupplyLabel,
      taxType: invoice.taxType,
      hsnSac: codes,
      missingHsnSac: invoice.lines.some((line) => !line.hsnSac),
      taxablePaise: invoice.lines.reduce((sum, line) => sum + lineTaxable(line), 0),
      cgstPaise: invoice.totals.cgstPaise,
      sgstPaise: invoice.totals.sgstPaise,
      igstPaise: invoice.totals.igstPaise,
      taxPaise: invoice.totals.taxPaise,
      shippingPaise: invoice.totals.shippingPaise,
      discountPaise: invoice.totals.discountPaise,
      grandTotalPaise: invoice.totals.grandTotalPaise,
      currency: invoice.payment.currency,
      amountMinor: invoice.payment.amountMinor,
      exchangeRate: invoice.payment.exchangeRate,
      paymentMethod: invoice.payment.method,
      gatewayPaymentId: invoice.payment.gatewayPaymentId,
    };
  });

  const sequences = rows.map((row) => row.sequence).filter((n): n is number => n !== null).sort((a, b) => a - b);
  const present = new Set(sequences);
  const missingNumbers: string[] = [];
  if (sequences.length) {
    for (let n = sequences[0]; n <= sequences[sequences.length - 1] && missingNumbers.length < 500; n++) {
      if (!present.has(n)) missingNumbers.push(`INV-AS/${n}`);
    }
  }

  const sum = (key: keyof RegisterRow) => rows.reduce((total, row) => total + (row[key] as number), 0);
  return {
    period: { from: period.from.toISOString(), to: period.to.toISOString(), label: period.label },
    rows,
    totals: {
      invoices: rows.length,
      taxablePaise: sum('taxablePaise'),
      cgstPaise: sum('cgstPaise'),
      sgstPaise: sum('sgstPaise'),
      igstPaise: sum('igstPaise'),
      taxPaise: sum('taxPaise'),
      shippingPaise: sum('shippingPaise'),
      grandTotalPaise: sum('grandTotalPaise'),
    },
    byRate: [...byRate.values()].sort((a, b) => a.rateBp - b.rateBp),
    byHsn: [...byHsn.values()].sort((a, b) => a.hsnSac.localeCompare(b.hsnSac) || a.rateBp - b.rateBp),
    byState: [...byState.values()].sort((a, b) => a.placeOfSupply.localeCompare(b.placeOfSupply) || a.rateBp - b.rateBp),
    missingNumbers,
    linesWithoutHsnSac,
  };
}

const rupees = paiseToRupeeText;
const ratePercent = (bp: number) => (bp / 100).toString();
const SALE_LABEL: Record<InvoiceDocumentData['saleType'], string> = { order: 'Product', consultation: 'Consultation', report: 'Report' };

/** One row per invoice line: the detail a CA needs for GSTR-1 and the books. */
export function registerLinesCsv(invoices: InvoiceDocumentData[]): string {
  const headers = [
    'Invoice Number', 'Invoice Date', 'Financial Year', 'Sale Type', 'Customer Name', 'Customer Email', 'Customer Phone',
    'Place Of Supply', 'Supply Type', 'Item', 'HSN/SAC', 'Quantity', 'Taxable Value', 'GST Rate %', 'CGST', 'SGST', 'IGST',
    'Line Total', 'Invoice Shipping', 'Invoice Discount', 'Invoice Total (INR)', 'Paid Currency', 'Paid Amount', 'Exchange Rate (per INR)',
    'Payment Method', 'Payment ID', 'Order ID',
  ];
  const rows: unknown[][] = [];
  const sorted = buildRegister(invoices, { from: new Date(0), to: new Date(0), label: '' }).rows;
  const byOrder = new Map(invoices.map((invoice) => [invoice.orderId, invoice]));
  for (const row of sorted) {
    const invoice = byOrder.get(row.orderId);
    if (!invoice) continue;
    invoice.lines.forEach((line, index) => {
      const first = index === 0;
      rows.push([
        row.invoiceNumber, gstDate(row.invoiceDate), row.financialYear, SALE_LABEL[row.saleType], row.customerName, row.customerEmail, row.customerPhone,
        row.placeOfSupply, row.taxType === 'intra' ? 'Intra-State' : 'Inter-State', line.title, line.hsnSac ?? '', line.quantity,
        rupees(lineTaxable(line)), ratePercent(line.taxRateBp), rupees(line.cgstPaise), rupees(line.sgstPaise), rupees(line.igstPaise),
        rupees(lineTaxable(line) + line.taxPaise),
        first ? rupees(row.shippingPaise) : '', first ? rupees(row.discountPaise) : '', first ? rupees(row.grandTotalPaise) : '',
        first ? row.currency : '', first && row.currency !== 'INR' ? (row.amountMinor / 100).toFixed(2) : '', first && row.currency !== 'INR' ? row.exchangeRate : '',
        first ? row.paymentMethod : '', first ? row.gatewayPaymentId ?? '' : '', row.orderId,
      ]);
    });
  }
  return toCsv(headers, rows);
}

export function hsnSummaryCsv(register: InvoiceRegister): string {
  return toCsv(
    ['HSN/SAC', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate %', 'Taxable Value', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess'],
    register.byHsn.map((row) => [
      row.hsnSac || '(not set)', row.description, row.description === ITEM_DESCRIPTION.PRODUCT ? 'NOS-NUMBERS' : 'OTH-OTHERS', row.quantity,
      rupees(row.totalPaise), ratePercent(row.rateBp), rupees(row.taxablePaise), rupees(row.igstPaise), rupees(row.cgstPaise), rupees(row.sgstPaise), '0.00',
    ])
  );
}

export function stateSummaryCsv(register: InvoiceRegister): string {
  return toCsv(
    ['Type', 'Place Of Supply', 'Rate %', 'Taxable Value', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess'],
    register.byState.map((row) => [
      'OE', row.placeOfSupply, ratePercent(row.rateBp), rupees(row.taxablePaise), rupees(row.igstPaise), rupees(row.cgstPaise), rupees(row.sgstPaise), '0.00',
    ])
  );
}

/** "INV-AS/118" -> "INV-AS-118.pdf" */
export function invoiceFileName(invoiceNumber: string): string {
  return `${invoiceNumber.replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;
}

type PdfRenderer = (orderId: string) => Promise<Buffer>;

export class InvoiceRegisterService {
  /**
   * The invoices of a period: every invoice that carries a number, dated by its order's payment
   * (else the allocation of the number, else the order date: migrated records may lack one).
   */
  public async loadInvoices(period: RegisterPeriod, staff: { id: string }): Promise<InvoiceDocumentData[]> {
    const numbered = await prisma.invoice.findMany({
      where: { number: { not: null }, orderId: { not: null } },
      select: { orderId: true, allocatedAt: true },
    });
    if (!numbered.length) return [];
    const orders = await prisma.order.findMany({
      where: { id: { in: numbered.map((row) => row.orderId as string) } },
      select: { id: true, paidAt: true, createdAt: true },
    });
    const allocatedAt = new Map(numbered.map((row) => [row.orderId as string, row.allocatedAt]));
    const ids = orders
      .filter((order) => {
        const date = order.paidAt ?? allocatedAt.get(order.id) ?? order.createdAt;
        return date >= period.from && date <= period.to;
      })
      .map((order) => order.id);
    const result: InvoiceDocumentData[] = [];
    const batch = 8;
    for (let i = 0; i < ids.length; i += batch) {
      const loaded = await Promise.all(ids.slice(i, i + batch).map((id) => invoiceService.getInvoiceData(id, staff, true)));
      result.push(...loaded);
    }
    return result;
  }

  public async register(input: RegisterPeriodInput, staff: { id: string }): Promise<InvoiceRegister> {
    const period = resolvePeriod(input);
    return buildRegister(await this.loadInvoices(period, staff), period);
  }

  public async csv(input: RegisterPeriodInput, kind: 'lines' | 'hsn' | 'states', staff: { id: string }): Promise<{ filename: string; csv: string }> {
    const period = resolvePeriod(input);
    const invoices = await this.loadInvoices(period, staff);
    if (kind === 'lines') return { filename: `invoice-register-${period.label}.csv`, csv: registerLinesCsv(invoices) };
    const register = buildRegister(invoices, period);
    if (kind === 'hsn') return { filename: `hsn-summary-${period.label}.csv`, csv: hsnSummaryCsv(register) };
    return { filename: `state-summary-${period.label}.csv`, csv: stateSummaryCsv(register) };
  }

  /** Every invoice PDF of the period plus the three CSVs, as one ZIP. */
  public async zip(input: RegisterPeriodInput, staff: { id: string }, render: PdfRenderer): Promise<{ filename: string; zip: Buffer; failed: string[] }> {
    const period = resolvePeriod(input);
    const invoices = await this.loadInvoices(period, staff);
    if (invoices.length > REGISTER_ZIP_MAX_INVOICES) {
      throw new ValidationError(`This period has ${invoices.length} invoices; download at most ${REGISTER_ZIP_MAX_INVOICES} at a time (choose a month).`);
    }
    const register = buildRegister(invoices, period);
    const files: Record<string, Uint8Array> = {
      [`invoice-register-${period.label}.csv`]: strToU8(registerLinesCsv(invoices)),
      [`hsn-summary-${period.label}.csv`]: strToU8(hsnSummaryCsv(register)),
      [`state-summary-${period.label}.csv`]: strToU8(stateSummaryCsv(register)),
    };
    const failed: string[] = [];
    for (const row of register.rows) {
      try {
        files[`invoices/${invoiceFileName(row.invoiceNumber)}`] = new Uint8Array(await render(row.orderId));
      } catch (err) {
        failed.push(row.invoiceNumber);
        logger.error({ err, orderId: row.orderId }, '[InvoiceRegister] Invoice PDF failed inside a ZIP export');
      }
    }
    if (failed.length) {
      files['FAILED-INVOICES.txt'] = strToU8(`These invoices could not be rendered; download them one by one:\r\n${failed.join('\r\n')}\r\n`);
    }
    return { filename: `invoices-${period.label}.zip`, zip: Buffer.from(zipSync(files, { level: 6 })), failed };
  }
}

export const invoiceRegisterService = new InvoiceRegisterService();
