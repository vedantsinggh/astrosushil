/**
 * The shared invoice series. Pure helpers: no database access.
 * Website source: `src/modules/Invoice/invoice.service.js`, `Transaction.controler.js#invoiceNumberFor`
 * and the three invoice templates.
 */

export const INVOICE_COUNTER_KEY = 'INV-AS';
export const INVOICE_NUMBER_PATTERN = /^INV-AS\/(\d+)$/;

export const INVOICE_LABEL_BEING_PREPARED = 'Invoice being prepared';
export const INVOICE_LABEL_NOT_ISSUED = 'No invoice issued';

export type SaleType = 'ORDER' | 'CONSULTATION' | 'REPORT';
export type AllocationStatus = 'PENDING' | 'ALLOCATED' | 'NOT_REQUIRED';

/** `INV-AS/07`, `INV-AS/123`: the number is left-padded to two digits, exactly as the website formats it. */
export function formatInvoiceNumber(value: bigint | number): string {
  const n = BigInt(value);
  if (n <= 0n) throw new Error('Invoice sequence must be positive');
  return `${INVOICE_COUNTER_KEY}/${n.toString().padStart(2, '0')}`;
}

/** The numeric part of a well-formed number, or null. `INV-AS/07` and `INV-AS/7` both give 7n. */
export function parseInvoiceNumber(value: string | null | undefined): bigint | null {
  const match = INVOICE_NUMBER_PATTERN.exec(value ?? '');
  return match ? BigInt(match[1]) : null;
}

export interface InvoiceNumberAnalysis {
  total: number;
  wellFormed: number;
  /** Highest numeric part among well-formed numbers; "0" when there are none. */
  highest: string;
  /** What the next allocation would be if the counter were initialised to `highest`. */
  nextNumber: string;
  /** Numeric values used more than once (`INV-AS/07` and `INV-AS/7` count as the same value). */
  duplicates: Array<{ value: string; numbers: string[]; count: number }>;
  /** Stored values that are not `INV-AS/<digits>`. */
  malformed: string[];
}

/**
 * Report on stored invoice numbers (website `analyzeStagingInvoiceData.js`). Used before the counter
 * is initialised: duplicates and malformed values are reported, never repaired.
 */
export function analyseInvoiceNumbers(values: Array<string | null | undefined>): InvoiceNumberAnalysis {
  const stored = values.filter((value): value is string => typeof value === 'string' && value !== '');
  const groups = new Map<string, string[]>();
  const malformed: string[] = [];
  let highest = 0n;
  let wellFormed = 0;

  for (const value of stored) {
    const n = parseInvoiceNumber(value);
    if (n === null) {
      malformed.push(value);
      continue;
    }
    wellFormed += 1;
    if (n > highest) highest = n;
    const key = n.toString();
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  return {
    total: stored.length,
    wellFormed,
    highest: highest.toString(),
    nextNumber: formatInvoiceNumber(highest + 1n),
    duplicates: [...groups.entries()]
      .filter(([, numbers]) => numbers.length > 1)
      .map(([value, numbers]) => ({ value, numbers, count: numbers.length })),
    malformed,
  };
}

export interface InvoiceLabelInput {
  saleType: SaleType;
  number?: string | null;
  status?: AllocationStatus | null;
  /** Whether the sale is paid (only matters for product orders). */
  paid: boolean;
  /**
   * Id the legacy fallback label is cut from: the website record's MongoDB _id for migrated sales
   * (booking / report order, else the transaction), our own id otherwise.
   */
  fallbackId: string;
}

/**
 * What to show as the invoice number.
 *  - a stored number is shown unchanged;
 *  - consultation / report without a number: "Invoice being prepared" while allocation is pending,
 *    otherwise the website's historical fallback `INV-<last 8 characters of the record id, upper-cased>`;
 *  - product order without a number: "Invoice being prepared" when paid and pending, else "No invoice issued".
 */
export function invoiceLabel(input: InvoiceLabelInput): string {
  if (input.number) return input.number;

  if (input.saleType === 'CONSULTATION' || input.saleType === 'REPORT') {
    if (input.status === 'PENDING') return INVOICE_LABEL_BEING_PREPARED;
    return `INV-${String(input.fallbackId).slice(-8).toUpperCase()}`;
  }

  if (input.paid && input.status === 'PENDING') return INVOICE_LABEL_BEING_PREPARED;
  return INVOICE_LABEL_NOT_ISSUED;
}
