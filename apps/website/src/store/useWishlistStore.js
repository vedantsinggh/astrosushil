import { create } from "zustand";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export const useWishlistStore = create((set, get) => ({
  wishlist: [],
  loading: false,

  _headers: () => {
    return {};
  },

  getWishlist: async () => {
  set({ loading: true });
  try {
    const res = await axios.get(`${BASE_URL}/wishlist`, {
      headers: get()._headers(),
    });
    set({ wishlist: res.data.data?.products || [] }); // ✅ fix path
  } catch (err) {
    console.error("getWishlist error:", err);
  } finally {
    set({ loading: false });
  }
},
  toggleWishlist: async (product, type = "Product") => {
    set({ loading: true });
    try {
      const res = await axios.post(
        `${BASE_URL}/wishlist/toggle`,
        { productId: product._id ?? product.id, type },
        { headers: get()._headers() },
      );
      const payload = res.data?.data ?? res.data ?? {};
      set({ wishlist: payload.products || [] });
      return payload.inWishlist ?? res.data?.inWishlist ?? null;
    } catch (err) {
      console.error("toggleWishlist error:", err);
      return null;
    } finally {
      set({ loading: false });
    }
  },

isWishlisted: (productId) => {
  return get().wishlist.some((item) => {
    const id =
      typeof item.product === "object"
        ? item.product?._id ?? item.product?.id
        : item.product;

    return id?.toString() === productId?.toString();
  });
},

  removeFromWishlist: async (productId, type = "Product") => {
    set({ loading: true });
    try {
      const res = await axios.post(
        `${BASE_URL}/wishlist/remove`,
        { productId, type },
        { headers: get()._headers() },
      );
      const payload = res.data?.data ?? res.data ?? {};
      set({ wishlist: payload.products || payload.items || [] });
    } catch (err) {
      console.error("removeFromWishlist error:", err);
    } finally {
      set({ loading: false });
    }
  },

  clearWishlist: async () => {
    set({ loading: true });
    try {
      await axios.delete(`${BASE_URL}/wishlist/clear`, {
        headers: get()._headers(),
      });
      set({ wishlist: [] });
    } catch (err) {
      console.error("clearWishlist error:", err);
    } finally {
      set({ loading: false });
    }
  },

  checkWishlistStatus: async (productId) => {
    return get().isWishlisted(productId);
  },
}));
