import { create } from "zustand";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const useWishlistStore = create((set, get) => ({
  wishlist: [],
  loading: false,

  _headers: () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
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
        { productId: product._id, type },
        { headers: get()._headers() },
      );
      set({ wishlist: res.data.data?.products || [] });
      return res.data.inWishlist; 
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
        ? item.product?._id
        : item.product;

    return id?.toString() === productId?.toString();
  });
},

  removeFromWishlist: async (productId, type = "Product") => {
    set({ loading: true });
    try {
      const res = await axios.delete(
        `${BASE_URL}/wishlist/${productId}?type=${type}`,
        { headers: get()._headers() },
      );
      set({ wishlist: res.data.items || [] });
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

  checkWishlistStatus: async (productId, type = "Product") => {
    try {
      const res = await axios.get(
        `${BASE_URL}/wishlist/check/${productId}?type=${type}`,
        { headers: get()._headers() },
      );
      return res.data.inWishlist;
    } catch (err) {
      console.error("checkWishlistStatus error:", err);
      return false;
    }
  },
}));
