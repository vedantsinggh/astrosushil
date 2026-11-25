import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export const useCurrencyStore = create((set, get) => ({
  currency: "INR",

  supportedCurrencies: {
    INR: {
      label: "Indian Rupee",
      symbol: "₹",
    },
    USD: {
      label: "US Dollar",
      symbol: "$",
    },
  },

  rates: {
    INR: 1,
  },

  loading: false,

  setCurrency: async (currency) => {
    set({ currency });
    await get().fetchRates();
  },

  fetchRates: async () => {
    // Skip if already fetched (more than the default INR-only state)
    if (Object.keys(get().rates).length > 1) return;
    if (get().loading) return;

    try {
      set({ loading: true });

      const res = await fetch(`${API_URL}/utils/exchange-rates`);
      const data = await res.json();

      if (data?.success) {
        set({
          rates: data.rates || {
            INR: 1,
          },
        });
      }
    } catch (err) {
      console.error("Currency fetch failed", err);
    } finally {
      set({ loading: false });
    }
  },
}));
