/**
 * CSV writing (RFC 4180): a field containing a comma, a double quote, CR or LF is wrapped in double
 * quotes with inner quotes doubled; records end with CRLF.
 *
 * Text that a spreadsheet would run as a formula (leading = + - @, tab or CR) is prefixed with an
 * apostrophe. Plain numbers and phone numbers ("+91 98..." / "-12.50") are left as they are.
 */

const FORMULA_START = /^[=+\-@\t\r]/;
const NUMERIC_OR_PHONE = /^[+-]?[\d\s().-]+$/;

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_START.test(text) && !NUMERIC_OR_PHONE.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Paise as a rupee figure with two decimals and no grouping: 35282 -> "352.82". */
export function paiseToRupeeText(paise: number): string {
  const negative = paise < 0;
  const digits = Math.abs(paise).toString().padStart(3, '0');
  return `${negative ? '-' : ''}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** "24 Nov 2026": the calendar day in Indian time, as the website admin shows dates. */
export function formatDateIst(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return `${String(ist.getUTCDate()).padStart(2, '0')} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

/** Start (00:00:00.000) or end (23:59:59.999) of a YYYY-MM-DD day in Indian time. */
export function istDayBoundary(day: string, edge: 'start' | 'end'): Date {
  return new Date(`${day}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+05:30`);
}
