import { AppError } from '../../../errors/app-error';
import { SupportedCurrency, convertInrPaiseToMinor, parseCurrency } from './currency';
import { ExchangeRateService, exchangeRateService } from './rates';

/** What the gateway is asked to charge for an INR-priced sale. */
export interface CheckoutQuote {
  /** Currency charged at the gateway. */
  currency: SupportedCurrency;
  /** Amount in that currency's smallest unit: the `amount` sent to the gateway. */
  amountMinor: number;
  /** Units of `currency` per 1 INR, as decimal text; "1.0000000000" for INR. */
  exchangeRate: string;
  /** INR value of the sale in paise. */
  baseAmountPaise: number;
}

/**
 * Turns an INR total into the amount to charge in the customer's chosen currency.
 * The rate always comes from the server-side rate service: a rate sent by the client is never read
 * (the website's report purchase multiplied the price by a browser-supplied `currencyRate`).
 */
export async function quoteCheckout(
  baseAmountPaise: number,
  requestedCurrency: unknown,
  rates: ExchangeRateService = exchangeRateService
): Promise<CheckoutQuote> {
  const currency = parseCurrency(requestedCurrency);
  const quote = await rates.getQuote(currency);
  const amountMinor = convertInrPaiseToMinor(baseAmountPaise, currency, quote.rateScaled);
  if (amountMinor <= 0) {
    // Website: "Currency amount not found". A sale that rounds to nothing in the paid currency cannot be charged.
    throw new AppError('The order amount is too small to charge in this currency.', 400, 'AMOUNT_TOO_SMALL_FOR_CURRENCY');
  }
  return { currency, amountMinor, exchangeRate: quote.rate, baseAmountPaise };
}
