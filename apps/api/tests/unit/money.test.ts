/**
 * Money core: currencies, server-side exchange rates, the GST engine and checkout conversion.
 *
 * The GST expectations are the website's results, worked out by reading
 * `src/common/taxEngine.js` and `src/common/priceengine.js` (not by running them). Website amounts
 * are rupees with two decimals; here they are paise.
 */
import { describe, it, expect } from 'vitest';
import {
  CURRENCY_EXPONENT,
  RATE_SCALE,
  SUPPORTED_CURRENCIES,
  convertInrPaiseToMinor,
  decimalStringToScaledRate,
  divRoundHalfUp,
  formatMinor,
  parseCurrency,
  rateToScaled,
  scaledRateToDecimalString,
} from '../../src/modules/commerce/money/currency';
import {
  ExchangeRateApiProvider,
  ExchangeRateService,
  FakeExchangeRateProvider,
  InMemoryExchangeRateCache,
} from '../../src/modules/commerce/money/rates';
import { basisPointsToPercentLabel, calculateSale, computeGst, percentToBasisPoints } from '../../src/modules/commerce/money/tax';
import { quoteCheckout } from '../../src/modules/commerce/money/checkout';
import { COMMERCE_CATALOG, commerceCatalog } from '../../src/modules/commerce/commerce.catalog';

const inclusive = (rateBp: number) => ({ enabled: true, rateBp, type: 'inclusive' as const });
const exclusive = (rateBp: number) => ({ enabled: true, rateBp, type: 'exclusive' as const });

describe('currencies', () => {
  it('accepts exactly the nine website currencies, case-insensitively, defaulting to INR', () => {
    expect([...SUPPORTED_CURRENCIES]).toEqual(['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD', 'JPY']);
    expect(parseCurrency(undefined)).toBe('INR');
    expect(parseCurrency('')).toBe('INR');
    expect(parseCurrency(' usd ')).toBe('USD');
  });

  it('refuses an unknown currency instead of charging it at rate 1', () => {
    for (const bad of ['XYZ', 'BTC', 'KWD', 'US', 42, {}]) {
      expect(() => parseCurrency(bad)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_CURRENCY', statusCode: 400 }));
    }
  });

  it('treats JPY as a zero-decimal currency and the rest as two-decimal', () => {
    expect(CURRENCY_EXPONENT.JPY).toBe(0);
    for (const code of SUPPORTED_CURRENCIES.filter((c) => c !== 'JPY')) expect(CURRENCY_EXPONENT[code]).toBe(2);
  });

  it('rounds integer division half up', () => {
    expect(divRoundHalfUp(5n, 2n)).toBe(3n);
    expect(divRoundHalfUp(4n, 3n)).toBe(1n);
    expect(divRoundHalfUp(5n, 3n)).toBe(2n);
    expect(divRoundHalfUp(0n, 7n)).toBe(0n);
  });

  it('keeps a rate as a scaled integer and round-trips its decimal text', () => {
    expect(rateToScaled(0.012)).toBe(120000000n);
    expect(rateToScaled(1.8)).toBe(18000000000n);
    expect(scaledRateToDecimalString(120000000n)).toBe('0.0120000000');
    expect(scaledRateToDecimalString(RATE_SCALE)).toBe('1.0000000000');
    expect(decimalStringToScaledRate('0.0120000000')).toBe(120000000n);
    expect(decimalStringToScaledRate('1.8')).toBe(18000000000n);
  });

  it('refuses a zero, negative or non-finite rate', () => {
    for (const bad of [0, -1, NaN, Infinity]) {
      expect(() => rateToScaled(bad)).toThrowError(expect.objectContaining({ code: 'EXCHANGE_RATE_UNAVAILABLE' }));
    }
  });

  it('converts INR paise to the paid currency minor units', () => {
    // INR is never converted.
    expect(convertInrPaiseToMinor(35282, 'INR', RATE_SCALE)).toBe(35282);
    // Rs 352.82 at 0.012 USD per INR = 4.23384 USD -> 4.23 -> 423 cents (website: toFixed(2) then x100).
    expect(convertInrPaiseToMinor(35282, 'USD', rateToScaled(0.012))).toBe(423);
    // Rs 999 at 0.0095 GBP = 9.4905 -> 9.49 -> 949 pence.
    expect(convertInrPaiseToMinor(99900, 'GBP', rateToScaled(0.0095))).toBe(949);
    // Rs 100 at 0.01155 EUR = 1.155 -> half up -> 1.16 -> 116.
    expect(convertInrPaiseToMinor(10000, 'EUR', rateToScaled(0.01155))).toBe(116);
  });

  it('sends whole yen for JPY, not yen x 100', () => {
    // Rs 352.82 at 1.8 JPY per INR = 635.076 yen -> 635. The website would send 63508.
    expect(convertInrPaiseToMinor(35282, 'JPY', rateToScaled(1.8))).toBe(635);
    // Rs 100.25 at 1.8 = 180.45 -> 180; Rs 100.30 at 1.8 = 180.54 -> 181.
    expect(convertInrPaiseToMinor(10025, 'JPY', rateToScaled(1.8))).toBe(180);
    expect(convertInrPaiseToMinor(10030, 'JPY', rateToScaled(1.8))).toBe(181);
  });

  it('formats minor units as decimal text per currency', () => {
    expect(formatMinor(423, 'USD')).toBe('4.23');
    expect(formatMinor(5, 'USD')).toBe('0.05');
    expect(formatMinor(635, 'JPY')).toBe('635');
    expect(formatMinor(35282, 'INR')).toBe('352.82');
  });
});

describe('exchange rate service', () => {
  const rates = { USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044, AUD: 0.018, CAD: 0.016, SGD: 0.016, JPY: 1.8 };

  it('returns exactly 1 for INR without asking the provider', async () => {
    const provider = new FakeExchangeRateProvider(rates);
    const service = new ExchangeRateService(provider, new InMemoryExchangeRateCache());
    const quote = await service.getQuote('INR');
    expect(quote.rateScaled).toBe(RATE_SCALE);
    expect(quote.rate).toBe('1.0000000000');
    expect(provider.calls).toBe(0);
  });

  it('fetches once and serves the cached rates for 24 hours', async () => {
    let now = 1_000_000;
    const provider = new FakeExchangeRateProvider(rates);
    const service = new ExchangeRateService(provider, new InMemoryExchangeRateCache(() => now));

    expect((await service.getQuote('USD')).rate).toBe('0.0120000000');
    expect((await service.getQuote('JPY')).rate).toBe('1.8000000000');
    expect(provider.calls).toBe(1);

    now += 24 * 60 * 60 * 1000 - 1;
    await service.getQuote('EUR');
    expect(provider.calls).toBe(1);

    now += 1;
    provider.setRates({ ...rates, USD: 0.0125 });
    expect((await service.getQuote('USD')).rate).toBe('0.0125000000');
    expect(provider.calls).toBe(2);
  });

  it('shares one provider call between concurrent requests', async () => {
    const provider = new FakeExchangeRateProvider(rates);
    const service = new ExchangeRateService(provider, new InMemoryExchangeRateCache());
    await Promise.all([service.getQuote('USD'), service.getQuote('EUR'), service.getQuote('GBP')]);
    expect(provider.calls).toBe(1);
  });

  it('fails when the provider has no usable rate for a supported currency (never rate 1)', async () => {
    const service = new ExchangeRateService(new FakeExchangeRateProvider({ USD: 0, EUR: 0.011 }), new InMemoryExchangeRateCache());
    await expect(service.getQuote('USD')).rejects.toMatchObject({ code: 'EXCHANGE_RATE_UNAVAILABLE', statusCode: 503 });
    await expect(service.getQuote('JPY')).rejects.toMatchObject({ code: 'EXCHANGE_RATE_UNAVAILABLE' });
  });

  describe('exchangerate-api provider', () => {
    it('reads conversion_rates from a successful response', async () => {
      const urls: string[] = [];
      const provider = new ExchangeRateApiProvider(
        () => 'test-key',
        async (url) => {
          urls.push(url);
          return { ok: true, status: 200, json: async () => ({ result: 'success', conversion_rates: { INR: 1, USD: 0.012, BAD: 'x', NEG: -2 } }) };
        },
        () => new Date('2026-11-24T00:00:00.000Z')
      );
      const snapshot = await provider.fetchInrRates();
      expect(urls).toEqual(['https://v6.exchangerate-api.com/v6/test-key/latest/INR']);
      expect(snapshot).toEqual({ base: 'INR', rates: { INR: 1, USD: 0.012 }, fetchedAt: '2026-11-24T00:00:00.000Z' });
    });

    it('is a configuration error without an API key, and makes no request', async () => {
      let called = false;
      const provider = new ExchangeRateApiProvider(
        () => undefined,
        async () => {
          called = true;
          return { ok: true, status: 200, json: async () => ({}) };
        }
      );
      await expect(provider.fetchInrRates()).rejects.toMatchObject({ code: 'EXCHANGE_RATE_UNCONFIGURED', statusCode: 503 });
      expect(called).toBe(false);
    });

    it('fails on an error response, a non-success result or a network error', async () => {
      const failing = [
        async () => ({ ok: false, status: 403, json: async () => ({ result: 'error' }) }),
        async () => ({ ok: true, status: 200, json: async () => ({ result: 'error', 'error-type': 'invalid-key' }) }),
        async () => {
          throw new Error('network down');
        },
      ];
      for (const fetchImpl of failing) {
        const provider = new ExchangeRateApiProvider(() => 'k', fetchImpl);
        await expect(provider.fetchInrRates()).rejects.toMatchObject({ code: 'EXCHANGE_RATE_UNAVAILABLE' });
      }
    });
  });

  it('quotes a checkout amount from the server rate and refuses unknown currencies', async () => {
    const service = new ExchangeRateService(new FakeExchangeRateProvider(rates), new InMemoryExchangeRateCache());
    expect(await quoteCheckout(35282, 'usd', service)).toEqual({
      currency: 'USD',
      amountMinor: 423,
      exchangeRate: '0.0120000000',
      baseAmountPaise: 35282,
    });
    expect(await quoteCheckout(35282, undefined, service)).toMatchObject({ currency: 'INR', amountMinor: 35282, exchangeRate: '1.0000000000' });
    expect(await quoteCheckout(35282, 'JPY', service)).toMatchObject({ currency: 'JPY', amountMinor: 635 });
    await expect(quoteCheckout(35282, 'XYZ', service)).rejects.toMatchObject({ code: 'UNSUPPORTED_CURRENCY' });
    // 1 paisa in USD rounds to nothing.
    await expect(quoteCheckout(1, 'USD', service)).rejects.toMatchObject({ code: 'AMOUNT_TOO_SMALL_FOR_CURRENCY' });
  });
});

describe('GST engine: computeGst against the website taxEngine', () => {
  // [description, amount paise, gst config, expected { base, tax, total } in paise]
  const cases: Array<[string, number, Parameters<typeof computeGst>[1], { rateBp: number; type: string; basePaise: number; taxPaise: number; totalPaise: number }]> = [
    // computeInclusiveTax(352.82, 18): base 352.82/1.18 = 299.00, tax 53.82, total 352.82
    ['inclusive 18% on 352.82', 35282, inclusive(1800), { rateBp: 1800, type: 'inclusive', basePaise: 29900, taxPaise: 5382, totalPaise: 35282 }],
    // computeInclusiveTax(499, 18): base 422.8813.. -> 422.88, tax 76.1186.. -> 76.12
    ['inclusive 18% on 499.00', 49900, inclusive(1800), { rateBp: 1800, type: 'inclusive', basePaise: 42288, taxPaise: 7612, totalPaise: 49900 }],
    // computeInclusiveTax(100, 18): base 84.7457.. -> 84.75, tax 15.2542.. -> 15.25
    ['inclusive 18% on 100.00', 10000, inclusive(1800), { rateBp: 1800, type: 'inclusive', basePaise: 8475, taxPaise: 1525, totalPaise: 10000 }],
    // computeInclusiveTax(1000, 5): base 952.3809.. -> 952.38, tax 47.6190.. -> 47.62
    ['inclusive 5% on 1000.00', 100000, inclusive(500), { rateBp: 500, type: 'inclusive', basePaise: 95238, taxPaise: 4762, totalPaise: 100000 }],
    // computeExclusiveTax(299, 18): tax 53.82, total 352.82
    ['exclusive 18% on 299.00', 29900, exclusive(1800), { rateBp: 1800, type: 'exclusive', basePaise: 29900, taxPaise: 5382, totalPaise: 35282 }],
    // computeExclusiveTax(199, 18): tax 35.82, total 234.82
    ['exclusive 18% on 199.00', 19900, exclusive(1800), { rateBp: 1800, type: 'exclusive', basePaise: 19900, taxPaise: 3582, totalPaise: 23482 }],
    // computeExclusiveTax(999.99, 5): tax 49.9995 -> 50.00, total 1049.9895 -> 1049.99
    ['exclusive 5% on 999.99', 99999, exclusive(500), { rateBp: 500, type: 'exclusive', basePaise: 99999, taxPaise: 5000, totalPaise: 104999 }],
    // computeExclusiveTax(0.25, 18): tax 0.045 -> 0.05 (half up), total 0.295 -> 0.30
    ['exclusive 18% on 0.25 (half paisa rounds up)', 25, exclusive(1800), { rateBp: 1800, type: 'exclusive', basePaise: 25, taxPaise: 5, totalPaise: 30 }],
    // computeExclusiveTax(1500, 2.5): tax 37.50, total 1537.50
    ['exclusive 2.5% on 1500.00', 150000, exclusive(250), { rateBp: 250, type: 'exclusive', basePaise: 150000, taxPaise: 3750, totalPaise: 153750 }],
    // rate 0: base = total = amount, no tax; the type is kept
    ['inclusive, rate 0', 99900, inclusive(0), { rateBp: 0, type: 'inclusive', basePaise: 99900, taxPaise: 0, totalPaise: 99900 }],
    // gst.enabled false: untaxed whatever the rate says
    ['disabled gst is untaxed', 50000, { enabled: false, rateBp: 1800, type: 'inclusive' }, { rateBp: 0, type: 'inclusive', basePaise: 50000, taxPaise: 0, totalPaise: 50000 }],
    // no gst config: untaxed, reported as exclusive
    ['missing gst config is untaxed and exclusive', 50000, undefined, { rateBp: 0, type: 'exclusive', basePaise: 50000, taxPaise: 0, totalPaise: 50000 }],
    ['null gst config is untaxed and exclusive', 50000, null, { rateBp: 0, type: 'exclusive', basePaise: 50000, taxPaise: 0, totalPaise: 50000 }],
  ];

  it.each(cases)('%s', (_name, amount, gst, expected) => {
    expect(computeGst(amount, gst)).toEqual(expected);
  });

  it('rejects amounts that are not whole non-negative paise', () => {
    expect(() => computeGst(-1, inclusive(1800))).toThrow();
    expect(() => computeGst(10.5, inclusive(1800))).toThrow();
  });

  it('converts website percentage rates to basis points and back to labels', () => {
    expect(percentToBasisPoints(18)).toBe(1800);
    expect(percentToBasisPoints(2.5)).toBe(250);
    expect(percentToBasisPoints(0)).toBe(0);
    expect(() => percentToBasisPoints(-1)).toThrow();
    expect(() => percentToBasisPoints(2.555)).toThrow();
    expect(basisPointsToPercentLabel(1800)).toBe('18');
    expect(basisPointsToPercentLabel(250)).toBe('2.5');
    expect(basisPointsToPercentLabel(1225)).toBe('12.25');
  });
});

describe('GST engine: calculateSale against the website calculateCart', () => {
  it('mixed inclusive and exclusive items with a discount and shipping', () => {
    // A: 1000 x 1, inclusive 18%. B: 500 x 2, exclusive 5%. subTotal 2000, discount 150, shipping 500.
    // Shares 0.5 each -> discount 75 each -> taxable 925 each.
    // A: tax = 925 - 925/1.18 = 141.1016.. -> 141.10 (inside the price), base 783.8983.. -> 783.90
    // B: tax = 925 * 5% = 46.25 (added), total 971.25
    // cart.tax = 46.25; totalAmount = 2000 - 150 + 500 + 46.25 = 2396.25
    const sale = calculateSale({
      lines: [
        { key: 'A', unitPricePaise: 100000, quantity: 1, gst: inclusive(1800) },
        { key: 'B', unitPricePaise: 50000, quantity: 2, gst: exclusive(500) },
      ],
      discountPaise: 15000,
      shippingPaise: 50000,
    });
    expect(sale.subTotalPaise).toBe(200000);
    expect(sale.lines[0]).toMatchObject({ key: 'A', lineTotalPaise: 100000, discountPaise: 7500, rateBp: 1800, type: 'inclusive', basePaise: 78390, taxPaise: 14110, totalPaise: 92500 });
    expect(sale.lines[1]).toMatchObject({ key: 'B', lineTotalPaise: 100000, discountPaise: 7500, rateBp: 500, type: 'exclusive', basePaise: 92500, taxPaise: 4625, totalPaise: 97125 });
    expect(sale.exclusiveTaxPaise).toBe(4625);
    expect(sale.inclusiveTaxPaise).toBe(14110);
    expect(sale.totalTaxPaise).toBe(18735);
    expect(sale.totalPaise).toBe(239625);
  });

  it('uneven shares: tax is worked out on the exact pro-rata share', () => {
    // 333, 333, 334 (subTotal 1000), discount 100, all exclusive 18%.
    // taxable 299.70, 299.70, 300.60 -> tax 53.946 -> 53.95, 53.95, 54.108 -> 54.11; cart.tax 162.01
    // totalAmount = 1000 - 100 + 162.01 = 1062.01
    const sale = calculateSale({
      lines: [
        { key: '1', unitPricePaise: 33300, quantity: 1, gst: exclusive(1800) },
        { key: '2', unitPricePaise: 33300, quantity: 1, gst: exclusive(1800) },
        { key: '3', unitPricePaise: 33400, quantity: 1, gst: exclusive(1800) },
      ],
      discountPaise: 10000,
    });
    expect(sale.lines.map((line) => line.taxPaise)).toEqual([5395, 5395, 5411]);
    expect(sale.lines.map((line) => line.basePaise)).toEqual([29970, 29970, 30060]);
    expect(sale.lines.map((line) => line.discountPaise)).toEqual([3330, 3330, 3340]);
    expect(sale.exclusiveTaxPaise).toBe(16201);
    expect(sale.totalPaise).toBe(106201);
  });

  it('a share that is not a whole paisa still taxes the exact value; whole-paisa shares add up to the discount', () => {
    // 100, 100, 100 (subTotal 300), discount 100 -> each taxable 66.666..; exclusive 18% -> 12.00 each.
    const sale = calculateSale({
      lines: ['a', 'b', 'c'].map((key) => ({ key, unitPricePaise: 10000, quantity: 1, gst: exclusive(1800) })),
      discountPaise: 10000,
    });
    expect(sale.lines.map((line) => line.taxPaise)).toEqual([1200, 1200, 1200]);
    expect(sale.lines.map((line) => line.basePaise)).toEqual([6667, 6667, 6667]);
    expect(sale.lines.map((line) => line.discountPaise)).toEqual([3334, 3333, 3333]);
    expect(sale.lines.reduce((sum, line) => sum + line.discountPaise, 0)).toBe(10000);
    expect(sale.totalPaise).toBe(30000 - 10000 + 3600);
  });

  it('inclusive items add no tax to the total; shipping is not taxed', () => {
    const sale = calculateSale({
      lines: [{ key: 'x', unitPricePaise: 49900, quantity: 2, gst: inclusive(1800) }],
      shippingPaise: 50000,
    });
    // computeInclusiveTax(998, 18): base 845.7627.. -> 845.76, tax 152.2372.. -> 152.24
    expect(sale.lines[0]).toMatchObject({ basePaise: 84576, taxPaise: 15224, totalPaise: 99800 });
    expect(sale.exclusiveTaxPaise).toBe(0);
    expect(sale.totalPaise).toBe(99800 + 50000);
  });

  it('untaxed items (no gst config) pass through', () => {
    const sale = calculateSale({ lines: [{ key: 'x', unitPricePaise: 12345, quantity: 3 }] });
    expect(sale).toMatchObject({ subTotalPaise: 37035, totalTaxPaise: 0, totalPaise: 37035 });
    expect(sale.lines[0]).toMatchObject({ rateBp: 0, type: 'exclusive', basePaise: 37035, taxPaise: 0 });
  });

  it('a full discount leaves nothing to tax', () => {
    const sale = calculateSale({
      lines: [{ key: 'x', unitPricePaise: 10000, quantity: 1, gst: exclusive(1800) }],
      discountPaise: 10000,
    });
    expect(sale.totalTaxPaise).toBe(0);
    expect(sale.totalPaise).toBe(0);
  });

  it('refuses a discount above the subtotal, bad quantities and an empty sale', () => {
    expect(() => calculateSale({ lines: [{ key: 'x', unitPricePaise: 10000, quantity: 1 }], discountPaise: 10001 })).toThrow(/Discount/);
    expect(() => calculateSale({ lines: [{ key: 'x', unitPricePaise: 10000, quantity: 0 }] })).toThrow();
    expect(() => calculateSale({ lines: [{ key: 'x', unitPricePaise: 10000, quantity: 1.5 }] })).toThrow();
    expect(() => calculateSale({ lines: [] })).toThrow();
  });

  it('is deterministic', () => {
    const input = {
      lines: [
        { key: 'A', unitPricePaise: 12999, quantity: 3, gst: inclusive(1200) },
        { key: 'B', unitPricePaise: 4550, quantity: 7, gst: exclusive(500) },
      ],
      discountPaise: 1700,
      shippingPaise: 50000,
    };
    expect(calculateSale(input)).toEqual(calculateSale(input));
  });
});

describe('existing catalogue is unchanged by the GST engine', () => {
  it('gives the same net, tax and total as commerceCatalog.calculateOrder for every active item', () => {
    const active = Object.values(COMMERCE_CATALOG).filter((item) => item.isActive && item.pricePaise > 0);
    expect(active.length).toBeGreaterThan(0);
    for (const item of active) {
      for (const quantity of new Set([item.minQuantity, item.maxQuantity])) {
        const legacy = commerceCatalog.calculateOrder([{ catalogId: item.id, quantity }]);
        const sale = calculateSale({
          lines: [
            {
              key: item.id,
              unitPricePaise: item.pricePaise,
              quantity,
              gst: { enabled: item.taxRateBasisPoints > 0, rateBp: item.taxRateBasisPoints, type: item.taxIncluded ? 'inclusive' : 'exclusive' },
            },
          ],
        });
        if (item.taxIncluded) {
          expect({ id: item.id, total: sale.totalPaise, tax: sale.totalTaxPaise, net: sale.lines[0].basePaise }).toEqual({
            id: item.id,
            total: legacy.totalAmount,
            tax: legacy.taxAmount,
            net: legacy.subtotal,
          });
        } else {
          // An exclusive item: the listed price is the net and GST is added on top.
          expect(sale.lines[0].basePaise).toBe(item.pricePaise * quantity);
          expect(sale.totalPaise).toBe(item.pricePaise * quantity + sale.exclusiveTaxPaise);
        }
      }
    }
  });
});
