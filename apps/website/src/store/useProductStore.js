import { create } from "zustand";
import axios from "axios";
import { showError } from "../utils/toast";

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000/api/v1";

const PRODUCT_URL = `${BASE_URL}/products`;

// getProducts has no request-ordering guard by default — a filter/sort/page
// change fires a new request while the previous one is still in flight, and
// network timing gives no guarantee the older one resolves first. Without
// this, an older response landing after a newer one silently overwrites the
// store with stale results for whatever the user was looking at a moment
// ago. Only the most recently *issued* call is allowed to write state.
let latestProductsRequestId = 0;

const normalizeVariant = (v) => {
  if (!v || typeof v !== "object") return v;
  return {
    ...v,
    _id: v._id ?? v.id,
    mrp: v.mrp != null ? v.mrp / 100 : 0,
    price: v.price != null ? v.price / 100 : 0,
    priceWithGst:
      v.priceWithGst != null
        ? v.priceWithGst / 100
        : v.price != null
          ? v.price / 100
          : 0,
  };
};

const normalizeProduct = (p) => {
  if (!p || typeof p !== "object") return p;
  return {
    ...p,
    _id: p._id ?? p.id,
    isPublished: p.isPublished ?? p.isAvailable ?? true,
    mrp: p.mrp != null ? p.mrp / 100 : 0,
    price: p.price != null ? p.price / 100 : 0,
    priceWithGst:
      p.priceWithGst != null
        ? p.priceWithGst / 100
        : p.price != null
          ? p.price / 100
          : 0,
    variants: Array.isArray(p.variants) ? p.variants.map(normalizeVariant) : [],
  };
};

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

      const res = await axios.get(PRODUCT_URL, {
        params,
        withCredentials: true,
      });

      const meta = res.data?.meta || {};
      const raw = res.data?.data;
      const list = (Array.isArray(raw) ? raw : (raw?.products || raw?.items || [])).map(normalizeProduct);

      if (requestId === latestProductsRequestId) {
        set({
          products: list,
          total: raw?.total ?? meta.total ?? list.length,
          page: raw?.page ?? meta.page ?? 1,
          limit: raw?.limit ?? meta.limit ?? params.limit ?? 10,
          facets: meta.facets ?? null,
        });
      }

      return {
        success: true,
        data: list,
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

      const res = await axios.get(
        `${PRODUCT_URL}/${id}`,
        { withCredentials: true },
      );

      const item = normalizeProduct(res.data?.data?.product || res.data?.data || null);
      set({
        product: item,
      });

      return {
        success: true,
        data: item,
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

      const res = await axios.get(
        `${PRODUCT_URL}/slug/${slug}`,
        { withCredentials: true },
      );

      const item = normalizeProduct(res.data?.data?.product || res.data?.data || null);
      set({
        product: item,
      });

      return {
        success: true,
        data: item,
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
