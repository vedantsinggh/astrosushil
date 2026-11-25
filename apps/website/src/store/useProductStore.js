import { create } from "zustand";
import axios from "axios";
import { showError } from "../utils/toast";

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const PRODUCT_URL = `${BASE_URL}/products`;

// getProducts has no request-ordering guard by default — a filter/sort/page
// change fires a new request while the previous one is still in flight, and
// network timing gives no guarantee the older one resolves first. Without
// this, an older response landing after a newer one silently overwrites the
// store with stale results for whatever the user was looking at a moment
// ago. Only the most recently *issued* call is allowed to write state.
let latestProductsRequestId = 0;

export const useProductStore = create((set) => ({
  products: [],
  product: null,
  loading: false,
  error: null,

  // Pagination + facets from meta — previously silently dropped.
  total: 0,
  page: 1,
  limit: 10,
  facets: null,

  getProducts: async (params = {}) => {
    const requestId = ++latestProductsRequestId;

    try {
      set({ loading: true, error: null });

      const token = localStorage.getItem("token");

      const res = await axios.get(PRODUCT_URL, {
        params,

        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      const meta = res.data?.meta || {};

      if (requestId === latestProductsRequestId) {
        set({
          products: res.data?.data || [],
          total: meta.total ?? 0,
          page: meta.page ?? 1,
          limit: meta.limit ?? params.limit ?? 10,
          facets: meta.facets ?? null,
        });
      }

      return {
        success: true,
        data: res.data?.data || [],
        meta,
      };
    } catch (err) {
      if (requestId !== latestProductsRequestId) {
        return { success: false, error: null };
      }

      showError(err);

      const message =
        err.response?.data?.message ||
        "Failed to fetch products";

      set({ error: message, products: [], total: 0, facets: null });

      return {
        success: false,
        error: message,
      };
    } finally {
      if (requestId === latestProductsRequestId) {
        set({ loading: false });
      }
    }
  },

  getProductById: async (id) => {
    try {
      set({ loading: true, error: null });

      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${PRODUCT_URL}/${id}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        },
      );

      set({
        product: res.data?.data || null,
      });

      return {
        success: true,
        data: res.data?.data,
      };
    } catch (err) {
      showError(err);

      const message =
        err.response?.data?.message ||
        "Failed to fetch product";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },

  getProductBySlug: async (slug) => {
    try {
      set({ loading: true, error: null });

      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${PRODUCT_URL}/slug/${slug}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        },
      );

      set({
        product: res.data?.data || null,
      });

      return {
        success: true,
        data: res.data?.data,
      };
    } catch (err) {
      showError(err);

      const message =
        err.response?.data?.message ||
        "Failed to fetch product";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },

  clearProduct: () => {
    set({ product: null });
  },
}));
