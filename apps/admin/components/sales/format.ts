/**
 * Display formatting and form-input parsing for the sales and booking screens.
 * Nothing here decides an amount: the server sends every figure, these only print it
 * (and turn what staff type, in rupees, into the paise the API takes).
 */

const IST = 'Asia/Kolkata';
const ZERO_DECIMAL = new Set(['JPY']);

export function currencyExponent(currency: string): number {
  return ZERO_DECIMAL.has((currency || 'INR').toUpperCase()) ? 0 : 2;
}

/** Minor units (paise, cents, whole yen) as money text. */
export function formatMinor(amountMinor: number | null | undefined, currency: string = 'INR'): string {
  if (amountMinor === null || amountMinor === undefined) return '—';
  const code = (currency || 'INR').toUpperCase();
  const exponent = currencyExponent(code);
  const value = amountMinor / Math.pow(10, exponent);
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: code, minimumFractionDigits: exponent, maximumFractionDigits: exponent }).format(value);
  } catch {
    return `${code} ${value.toFixed(exponent)}`;
  }
}

export function formatPaise(paise: number | null | undefined): string {
  return formatMinor(paise, 'INR');
}

/** Paise as plain rupee text for a form input ("1499.00" -> "1499", "1499.50" stays). */
export function paiseToRupeeInput(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '';
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

/** Rupees typed by staff to paise; null when the text is not an amount with at most two decimals. */
export function rupeeInputToPaise(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** A percent typed by staff to basis points (12.5 -> 1250); null when not a percent with at most two decimals. */
export function percentInputToBasisPoints(text: string): number | null {
  return rupeeInputToPaise(text);
}

export function basisPointsToPercent(bp: number | null | undefined): string {
  if (bp === null || bp === undefined) return '—';
  const percent = bp / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' });
}

/** A calendar day "YYYY-MM-DD" as "24 Nov 2026 (Tue)" without any timezone shift. */
export function formatDay(day: string | null | undefined): string {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return day || '—';
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

/** Today's date in India, YYYY-MM-DD. */
export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function shortId(id: string | null | undefined, length: number = 8): string {
  if (!id) return '—';
  return `#${id.slice(-length).toUpperCase()}`;
}

export function titleCase(text: string | null | undefined): string {
  if (!text) return '—';
  return text
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/** A CSV built in the browser: RFC 4180 quoting, and text a spreadsheet would run as a formula is prefixed. */
export function buildCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const cell = (value: string | number): string => {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text) && !/^[+-]?\d[\d\s.-]*$/.test(text)) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))].join('\r\n');
}
