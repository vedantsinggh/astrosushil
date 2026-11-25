import { useCurrencyStore } from "../store/useCurrencyStore";

export const useCurrency = () => {
  const currency = useCurrencyStore(
    (s) => s.currency
  );

  const rates = useCurrencyStore(
    (s) => s.rates
  );

  const convert = (amount) => {
    const value = Number(amount || 0);

    if (!value) return null;

    const safeCurrency =
      typeof currency === "string"
        ? currency
        : "INR";

    const converted =
      value *
      (rates[safeCurrency] || 1);

    return new Intl.NumberFormat(
      "en",
      {
        style: "currency",
        currency: safeCurrency,
        maximumFractionDigits: 2,
      }
    ).format(converted);
  };

  return {
    currency,
    convert,
     rates,
  };
};