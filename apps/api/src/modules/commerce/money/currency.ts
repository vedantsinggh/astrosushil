import { AppError } from '../../../errors/app-error';

/**
 * Currencies the website accepts (website `order.controller.js` `supportedCurrencies`).
 * Catalogue prices are always INR; a foreign currency is only what the gateway charges.
 */
export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD', 'JPY'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const BASE_CURRENCY: SupportedCurrency = 'INR';

/**
 * Number of decimal places of each currency's gateway unit (Razorpay "exponent").
 *
 * Razorpay takes `amount` in the currency subunit: value x 10^exponent. Its supported-currencies
 * table (razorpay.com/docs/payments/international-payments, read 2026-11-24) gives exponent 2 for
 * every currency here except JPY, which is 0: 99 yen is sent as `99`.
 *
 * The website multiplies every currency by 100 (`src/utils/razorpay.js`), which for JPY asks the
 * gateway for 100 times the intended amount. That is not reproduced.
 */
export const CURRENCY_EXPONENT: Record<SupportedCurrency, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
  AUD: 2,
  CAD: 2,
  SGD: 2,
  JPY: 0,
};

/** Exchange rates are held as integers scaled by 10^10 (ten decimal places). */
export const RATE_DECIMALS = 10;
export const RATE_SCALE = 10n ** BigInt(RATE_DECIMALS);

/** Largest value a PostgreSQL integer column holds. */
const MAX_INT32 = 2_147_483_647;

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/**
 * Normalises a requested currency. Missing means INR; anything not in the supported list is refused
 * (the website silently charged bookings at rate 1 for an unknown currency).
 */
export function parseCurrency(input: unknown): SupportedCurrency {
  if (input === undefined || input === null || input === '') return BASE_CURRENCY;
  const code = typeof input === 'string' ? input.trim().toUpperCase() : '';
  if (!isSupportedCurrency(code)) {
    throw new AppError(
      `Unsupported currency. Use one of: ${SUPPORTED_CURRENCIES.join(', ')}.`,
      400,
      'UNSUPPORTED_CURRENCY'
    );
  }
  return code;
}

/** Integer division rounding half up, for non-negative operands. */
export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('divRoundHalfUp: denominator must be positive');
  if (numerator < 0n) throw new Error('divRoundHalfUp: numerator must not be negative');
  return (numerator * 2n + denominator) / (denominator * 2n);
}

/**
 * Converts a provider rate (a JSON number: units of the foreign currency per 1 INR) to the scaled integer.
 * Rounded half up at the tenth decimal place. Zero, negative and non-finite rates are refused.
 */
export function rateToScaled(rate: number): bigint {
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new AppError('Exchange rate is not available for this currency.', 503, 'EXCHANGE_RATE_UNAVAILABLE');
  }
  const [intPart, fracPart = ''] = rate.toFixed(RATE_DECIMALS).split('.');
  const scaled = BigInt(intPart) * RATE_SCALE + BigInt(fracPart.padEnd(RATE_DECIMALS, '0'));
  if (scaled <= 0n) {
    throw new AppError('Exchange rate is not available for this currency.', 503, 'EXCHANGE_RATE_UNAVAILABLE');
  }
  return scaled;
}

/** "0.0119843200" style decimal text of a scaled rate (what is stored on the order and the ledger). */
export function scaledRateToDecimalString(scaled: bigint): string {
  const intPart = scaled / RATE_SCALE;
  const fracPart = (scaled % RATE_SCALE).toString().padStart(RATE_DECIMALS, '0');
  return `${intPart}.${fracPart}`;
}

/** Parses decimal text (as stored) back to the scaled integer. */
export function decimalStringToScaledRate(text: string): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!match) throw new Error(`Not a decimal rate: ${text}`);
  const frac = (match[2] ?? '').slice(0, RATE_DECIMALS).padEnd(RATE_DECIMALS, '0');
  return BigInt(match[1]) * RATE_SCALE + BigInt(frac);
}

/**
 * INR paise -> minor units of `currency` at `rateScaled` (foreign units per 1 INR), rounded half up
 * to the currency's own smallest unit.
 *
 *   minor = paise / 100 * rate * 10^exponent
 *
 * The website computes `Number((inr * rate).toFixed(2))` and then multiplies by 100; for the
 * two-decimal currencies that is the same value. For JPY this rounds to whole yen.
 */
export function convertInrPaiseToMinor(paise: number, currency: SupportedCurrency, rateScaled: bigint): number {
  if (!Number.isSafeInteger(paise) || paise < 0) {
    throw new Error('convertInrPaiseToMinor: paise must be a non-negative integer');
  }
  if (currency === BASE_CURRENCY) return paise;
  if (rateScaled <= 0n) {
    throw new AppError('Exchange rate is not available for this currency.', 503, 'EXCHANGE_RATE_UNAVAILABLE');
  }
  const unit = 10n ** BigInt(CURRENCY_EXPONENT[currency]);
  const minor = divRoundHalfUp(BigInt(paise) * rateScaled * unit, 100n * RATE_SCALE);
  if (minor > BigInt(MAX_INT32)) {
    throw new AppError('Order amount is too large for this currency.', 400, 'AMOUNT_OUT_OF_RANGE');
  }
  return Number(minor);
}

/** Decimal text of a minor-unit amount in its currency: 123456 USD minor -> "1234.56", 500 JPY -> "500". */
export function formatMinor(amountMinor: number, currency: string): string {
  const exponent = isSupportedCurrency(currency) ? CURRENCY_EXPONENT[currency] : 2;
  if (exponent === 0) return String(amountMinor);
  const negative = amountMinor < 0;
  const digits = Math.abs(amountMinor).toString().padStart(exponent + 1, '0');
  const text = `${digits.slice(0, -exponent)}.${digits.slice(-exponent)}`;
  return negative ? `-${text}` : text;
}
