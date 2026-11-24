/** Formatting for invoice figures. Pure and locale-independent (no Intl), so output is identical on every server. */

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${head},${digits.slice(-3)}`;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function safeInteger(value: number, what: string): bigint {
  if (!Number.isSafeInteger(value)) throw new Error(`${what} must be an integer`);
  return BigInt(value);
}

/** 118000050 paise gives "11,80,000.50" (Indian digit grouping, as the website's en-IN formatting). */
export function formatPaise(paise: number): string {
  const value = safeInteger(paise, 'An INR amount in paise');
  const abs = value < 0n ? -value : value;
  const text = `${groupIndian((abs / 100n).toString())}.${(abs % 100n).toString().padStart(2, '0')}`;
  return value < 0n ? `-${text}` : text;
}

/** Minor units of any currency: (1420, 2) gives "14.20"; (1500, 0) gives "1,500". */
export function formatMinor(amountMinor: number, exponent: number): string {
  const value = safeInteger(amountMinor, 'An amount in minor units');
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 4) throw new Error('Unsupported currency exponent');
  const abs = value < 0n ? -value : value;
  const scale = 10n ** BigInt(exponent);
  const whole = groupThousands((abs / scale).toString());
  const text = exponent === 0 ? whole : `${whole}.${(abs % scale).toString().padStart(exponent, '0')}`;
  return value < 0n ? `-${text}` : text;
}

/** 1800 gives "18%", 1250 gives "12.5%", 0 gives "0%". */
export function formatRateBp(rateBp: number): string {
  const value = safeInteger(rateBp, 'A GST rate in basis points');
  const fraction = (value % 100n).toString().padStart(2, '0').replace(/0+$/, '');
  return `${value / 100n}${fraction ? `.${fraction}` : ''}%`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IST_OFFSET_MS = 330 * 60 * 1000;

/** An instant as its Indian calendar date, "24 Nov 2026". An unreadable value gives an empty string. */
export function formatIndianDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return '';
  const ist = new Date(instant.getTime() + IST_OFFSET_MS);
  return `${String(ist.getUTCDate()).padStart(2, '0')} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

/** A calendar date already stored as YYYY-MM-DD ("2026-12-02" gives "02 Dec 2026"); anything else is returned unchanged. */
export function formatCalendarDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${match[3]} ${month} ${match[1]}` : value;
}
