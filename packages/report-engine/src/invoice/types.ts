/**
 * What an invoice PDF prints. The shape is the invoice data the API already builds
 * (`InvoiceDocumentData` in apps/api/src/modules/invoices/invoice.service.ts) plus three optional
 * additions; that object can be passed as it is. All INR amounts are integer paise.
 */
export interface InvoicePdfSeller {
  legalName: string;
  tagline: string | null;
  address: string;
  gstin: string;
  state: string;
  email: string | null;
  phone: string | null;
  website: string | null;
}

export interface InvoicePdfAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface InvoicePdfLine {
  title: string;
  description: string | null;
  itemType: string;
  quantity: number;
  unitPricePaise: number;
  /** Unit price x quantity, before any discount. */
  lineTotalPaise: number;
  /** Basis points: 1800 = 18%. */
  taxRateBp: number;
  taxInclusive: boolean;
  taxPaise: number;
  /** Value the GST was charged on (after this line's share of the discount). Omitted: the column prints a dash. */
  taxablePaise?: number | null;
  /** HSN or SAC code; omitted or null prints a dash. */
  hsnSac?: string | null;
  /** The line's GST split (sums to `taxPaise`). Omitted: the invoice prints GST unsplit. */
  cgstPaise?: number;
  sgstPaise?: number;
  igstPaise?: number;
}

export interface InvoicePdfData {
  /** The allocated number, or the fallback label the money module defines when there is none. */
  invoiceNumber: string;
  numberAllocated: boolean;
  saleType: 'order' | 'consultation' | 'report';
  orderId: string;
  orderReference: string;
  /** ISO instants; printed as Indian calendar dates. */
  orderDate: string;
  orderStatus: string;
  seller: InvoicePdfSeller;
  placeOfSupply: string;
  /** "27-Maharashtra"; printed instead of `placeOfSupply` when given. */
  placeOfSupplyLabel?: string;
  /** intra: CGST + SGST; inter: IGST. Omitted: GST is printed unsplit (as the website did). */
  taxType?: 'intra' | 'inter';
  /** ISO instant of the invoice (payment date). Omitted: the order date is the invoice date. */
  invoiceDate?: string;
  reverseCharge: boolean;
  customer: { name: string; email: string | null; phone: string | null };
  shippingAddress: InvoicePdfAddress | null;
  payment: {
    status: 'pending' | 'paid' | 'failed';
    method: string;
    gatewayPaymentId: string | null;
    paidAt: string | null;
    /** What was charged at the gateway. */
    currency: string;
    amountMinor: number;
    /** Units of `currency` per 1 INR, as stored on the order. */
    exchangeRate: string;
    /** Decimal places of `currency` (2 for most, 0 for JPY). Defaults to 2. */
    minorUnitExponent?: number;
  };
  lines: InvoicePdfLine[];
  totals: {
    subTotalPaise: number;
    discountPaise: number;
    shippingPaise: number;
    taxByRate: Array<{ rateBp: number; taxPaise: number; inclusive: boolean }>;
    taxPaise: number;
    /** INR. */
    grandTotalPaise: number;
  };
  /** Consultation bookings only: what the website's booking invoice prints about the appointment. */
  consultation?: {
    /** YYYY-MM-DD. */
    date: string;
    /** For example "10:00-10:45". */
    slot: string;
    mode: string;
    durationMinutes: number;
  } | null;
}

export interface RenderInvoiceOptions {
  /** Limit for one XeLaTeX run. Default 20 seconds. */
  timeoutMs?: number;
}

export type InvoicePdfFailure = 'timeout' | 'unavailable' | 'compile';

/**
 * A failed render. `message` and `texError` never contain invoice content: `texError` is only the
 * TeX error line (for example "! Undefined control sequence."), so both are safe to log.
 */
export class InvoicePdfError extends Error {
  constructor(
    public readonly kind: InvoicePdfFailure,
    message: string,
    public readonly texError: string | null = null
  ) {
    super(message);
    this.name = 'InvoicePdfError';
  }
}
