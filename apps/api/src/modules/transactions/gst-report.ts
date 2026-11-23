import { basisPointsToPercentLabel } from '../commerce/money/tax';
import { invoiceLabel, AllocationStatus, SaleType } from '../invoices/invoice-number';
import { formatDateIst, paiseToRupeeText, toCsv } from './csv';

/**
 * GST report rows and totals (website `Transaction.controler.js#getGstReport`). Pure: the service
 * loads the records, this turns them into the report.
 */

/** Sales recorded before GST was configured carry a tax total but no rate: the website reports them as 18% exclusive. */
export const PRE_GST_RATE_LABEL = '18%';
export const PRE_GST_TYPE_LABEL = 'Exclusive';

export interface GstSourceRecord {
  transaction: {
    id: string;
    legacyId: string | null;
    legacySourceId: string | null;
    orderId: string | null;
    type: SaleType;
    amountMinor: number;
    currency: string;
    baseAmountPaise: number;
    taxPaise: number;
    taxRateBp: number;
    taxInclusive: boolean;
    method: string;
    status: string;
    gatewayPaymentId: string | null;
    placeOfSupply: string | null;
    customerName: string | null;
    createdAt: Date;
  };
  user: { fullName: string | null; email: string | null; phoneNumber: string | null } | null;
  invoice: { number: string | null; status: AllocationStatus } | null;
  order: {
    paid: boolean;
    deliveryState: string | null;
    items: Array<{ taxRate: number; taxInclusive: boolean }>;
  } | null;
}

export interface GstReportRow {
  transactionId: string;
  date: Date;
  invoiceNo: string;
  type: 'order' | 'consultation' | 'report';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  placeOfSupply: string;
  /** Paise. */
  taxableAmount: number;
  gstRateLabel: string;
  gstType: string;
  /** Paise. */
  gstAmount: number;
  /** Paise. */
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  razorpayTransactionId: string;
}

export interface GstReportSummary {
  taxableTotal: number;
  gstTotal: number;
  grandTotal: number;
  count: number;
}

function invoiceNoFor(record: GstSourceRecord): string {
  const { transaction: txn, invoice, order } = record;
  return invoiceLabel({
    saleType: txn.type,
    number: invoice?.number ?? null,
    status: invoice?.status ?? null,
    paid: order ? order.paid : txn.status === 'SUCCESS',
    // Website: the linked booking / report order id, else the transaction id.
    fallbackId: txn.legacySourceId ?? txn.orderId ?? txn.legacyId ?? txn.id,
  });
}

function customerNameFor(record: GstSourceRecord): string {
  const name = record.transaction.customerName?.trim() || record.user?.fullName?.trim();
  return name || record.user?.email || '—';
}

function rateLabelFor(record: GstSourceRecord): string {
  const { transaction: txn, order } = record;
  if (txn.type === 'ORDER') {
    const rates = [...new Set((order?.items ?? []).filter((item) => item.taxRate > 0).map((item) => item.taxRate))];
    if (rates.length === 1) return `${basisPointsToPercentLabel(rates[0])}%`;
    if (rates.length > 1) return `Mixed (${rates.map(basisPointsToPercentLabel).join('/')}%)`;
    if (txn.taxRateBp > 0) return `${basisPointsToPercentLabel(txn.taxRateBp)}%`;
    return txn.taxPaise > 0 ? PRE_GST_RATE_LABEL : '0%';
  }
  if (txn.taxRateBp > 0) return `${basisPointsToPercentLabel(txn.taxRateBp)}%`;
  return txn.taxPaise > 0 ? PRE_GST_RATE_LABEL : '0%';
}

function typeLabelFor(record: GstSourceRecord): string {
  const { transaction: txn, order } = record;
  if (txn.type === 'ORDER') {
    const types = [
      ...new Set((order?.items ?? []).filter((item) => item.taxRate > 0).map((item) => (item.taxInclusive ? 'Inclusive' : 'Exclusive'))),
    ];
    if (types.length === 1) return types[0];
    if (types.length > 1) return 'Mixed';
    if (txn.taxPaise > 0 && txn.taxRateBp > 0) return txn.taxInclusive ? 'Inclusive' : 'Exclusive';
    return txn.taxPaise > 0 ? PRE_GST_TYPE_LABEL : '—';
  }
  if (txn.taxPaise <= 0) return '—';
  if (txn.taxRateBp > 0) return txn.taxInclusive ? 'Inclusive' : 'Exclusive';
  return PRE_GST_TYPE_LABEL;
}

export function buildGstRow(record: GstSourceRecord, sellerState: string): GstReportRow {
  const txn = record.transaction;
  // The INR value of the sale. Older website report transactions have no base amount (0): the
  // website falls back to the paid amount, and so does this, labelled with the paid currency.
  const hasBase = txn.baseAmountPaise > 0;
  const totalAmount = hasBase ? txn.baseAmountPaise : txn.amountMinor;
  const gstAmount = txn.taxPaise;
  // total - GST (not the stored subtotal), so taxable + GST = total on every row, net of discount
  // and including shipping.
  const taxableAmount = Math.max(totalAmount - gstAmount, 0);

  return {
    transactionId: txn.id,
    date: txn.createdAt,
    invoiceNo: invoiceNoFor(record),
    type: txn.type.toLowerCase() as GstReportRow['type'],
    customerName: customerNameFor(record),
    customerEmail: record.user?.email ?? '',
    customerPhone: record.user?.phoneNumber ?? '',
    placeOfSupply: txn.placeOfSupply?.trim() || record.order?.deliveryState?.trim() || sellerState,
    taxableAmount,
    gstRateLabel: rateLabelFor(record),
    gstType: typeLabelFor(record),
    gstAmount,
    totalAmount,
    currency: hasBase ? 'INR' : txn.currency || 'INR',
    paymentMethod: txn.method.toLowerCase(),
    paymentStatus: txn.status.toLowerCase(),
    razorpayTransactionId: txn.gatewayPaymentId ?? '',
  };
}

export function summariseGstRows(rows: GstReportRow[]): GstReportSummary {
  return rows.reduce<GstReportSummary>(
    (acc, row) => {
      acc.taxableTotal += row.taxableAmount;
      acc.gstTotal += row.gstAmount;
      acc.grandTotal += row.totalAmount;
      return acc;
    },
    { taxableTotal: 0, gstTotal: 0, grandTotal: 0, count: rows.length }
  );
}

const TYPE_LABELS: Record<GstReportRow['type'], string> = {
  order: 'Product Order',
  consultation: 'Consultation',
  report: 'Astrology Report',
};

/** Column order and headings of the website admin's "Export CSV". */
export const GST_CSV_HEADERS = [
  'Date',
  'Invoice No',
  'Type',
  'Customer Name',
  'Email',
  'Phone',
  'Place of Supply',
  'Taxable Value',
  'GST Rate',
  'GST Type',
  'GST Amount',
  'Total Value',
  'Currency',
  'Payment Method',
  'Payment Status',
  'Razorpay Txn ID',
];

export function gstRowsToCsv(rows: GstReportRow[]): string {
  return toCsv(
    GST_CSV_HEADERS,
    rows.map((row) => [
      formatDateIst(row.date),
      row.invoiceNo,
      TYPE_LABELS[row.type] ?? row.type,
      row.customerName,
      row.customerEmail,
      row.customerPhone,
      row.placeOfSupply,
      paiseToRupeeText(row.taxableAmount),
      row.gstRateLabel,
      row.gstType,
      paiseToRupeeText(row.gstAmount),
      paiseToRupeeText(row.totalAmount),
      row.currency,
      row.paymentMethod,
      row.paymentStatus,
      row.razorpayTransactionId,
    ])
  );
}
