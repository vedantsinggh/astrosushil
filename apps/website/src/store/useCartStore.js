import { create } from "zustand";
import axios from "axios";
import { showError, showSuccess } from "../utils/toast";

import { API_BASE_URL as BASE_URL } from "../config/api";
const CART_URL = `${BASE_URL}/cart`;

export const useCartStore = create((set, get) => {
  const getAuthHeaders = () => ({ withCredentials: true });

  return {
    cart: [],
    user: null,
    loading: false,
    error: null,

    appliedCoupon: null,
    couponLoading: false,
    couponError: null,

    getCartItems: async () => {
      try {
        set({
          loading: true,
          error: null,
        });

        const res = await axios.get(CART_URL, getAuthHeaders());

        set({
          cart: res.data?.data || {},
          user: res.data?.data?.user || null,
        });

        return {
          success: true,
          data: res.data,
        };
      } catch (err) {
        const message =
          err?.response?.data?.message || "Failed to fetch cart items";

        set({
          error: message,
          cart: [],
        });

        return {
          success: false,
          error: message,
        };
      } finally {
        set({ loading: false });
      }
    },

    applyCoupon: async (code) => {
      set({ couponLoading: true, couponError: null });
      try {
        const res = await axios.post(
          `${CART_URL}/coupon`,
          { code: code },
          getAuthHeaders(),
        );

        const data = res.data?.data;

        const appliedCoupon = {
          code: data?.couponCode || code,
          discount: data?.discount ?? data?.coupon?.discount ?? 0,
          type: data?.coupon?.type || "FLAT",
          maxDiscount: data?.coupon?.maxDiscount ?? null,
        };

        set({ appliedCoupon, couponError: null });

        // Refresh cart so totals are accurate
        await get().getCartItems();

        return { success: true, data: appliedCoupon };
      } catch (err) {
        const message =
          err?.response?.data?.message || "Invalid or expired coupon";
        set({ couponError: message, appliedCoupon: null });
        return { success: false, error: message };
      } finally {
        set({ couponLoading: false });
      }
    },

    removeCoupon: async () => {
      try {
        await axios.delete(`${CART_URL}/coupon`, getAuthHeaders());
        set({ appliedCoupon: null, couponError: null });
        await get().getCartItems();
      } catch {
        set({ appliedCoupon: null, couponError: null });
      }
    },
    addToCart: async (product) => {
      try {
        if (!product?.productId) {
          throw new Error("Product ID is required");
        }

        const payload = {
          productId: product.productId,
          quantity: product.quantity || 1,
        };

        if (product.variantId) {
          payload.variantId = product.variantId;
        }

        const res = await axios.post(
          `${CART_URL}/add`,
          payload,
          getAuthHeaders(),
        );

        await get().getCartItems();

        showSuccess(res);

        return {
          success: true,
          data: res.data,
        };
      } catch (err) {
        showError(err);

        const message =
          err?.response?.data?.message || "Failed to add item to cart";

        return {
          success: false,
          error: message,
        };
      }
    },

    removeFromCart: async (productId, variantId) => {
      try {
        const res = await axios.delete(`${CART_URL}/remove`, {
          data: {
            productId,
            variantId,
          },
          withCredentials: true,
        });

        await get().getCartItems();

        showSuccess(res);

        return {
          success: true,
          data: res.data,
        };
      } catch (err) {
        showError(err);

        return {
          success: false,
          error: err?.response?.data?.message,
        };
      }
    },

    updateQuantity: async (productId, variantId, quantity) => {
      try {
        const res = await axios.put(
          `${CART_URL}/update`,
          {
            productId,
            variantId,
            quantity,
          },
          getAuthHeaders(),
        );

        await get().getCartItems();

        return {
          success: true,
          data: res.data,
        };
      } catch (err) {
        showError(err);

        return {
          success: false,
          error: err?.response?.data?.message,
        };
      }
    },

    incrementQuantity: async (productId, variantId) => {
      const cartData = get().cart;

      const items = cartData?.items || [];

      const item = items.find(
        (i) =>
          i.product === productId &&
          String(i.variantId || "") === String(variantId || ""),
      );

      if (!item) {
        return;
      }

      return await get().updateQuantity(
        productId,
        variantId,
        item.quantity + 1,
      );
    },

    decrementQuantity: async (productId, variantId) => {
      const cartData = get().cart;

      const items = cartData?.items || [];

      const item = items.find(
        (i) =>
          i.product === productId &&
          String(i.variantId || "") === String(variantId || ""),
      );

      if (!item) {
        return;
      }

      const newQty = item.quantity - 1;

      if (newQty <= 0) {
        return await get().removeFromCart(productId, variantId);
      }

      return await get().updateQuantity(productId, variantId, newQty);
    },

    clearCart: () => {
      set({
        cart: [],
        user: null,
        error: null,
      });
    },

    getCartItemCount: () => {
      const items = get().cart?.items || [];

      return items.reduce((total, item) => total + (item.quantity || 0), 0);
    },

    getCartTotal: () => {
      const items = get().cart?.items || [];

      return items.reduce((total, item) => {
        const price = item.price || 0;

        return total + price * (item.quantity || 0);
      }, 0);
    },

    isInCart: (productId) => {
      const items = get().cart?.items || [];

      return items.some((item) => {
        const itemId = item.product?._id || item.product;

        return itemId === productId;
      });
    },

    getProductQuantity: (productId) => {
      const items = get().cart?.items || [];

      const item = items.find((item) => {
        const itemId = item.product?._id || item.product;

        return itemId === productId;
      });

      return item ? item.quantity : 0;
    },

    clearError: () => {
      set({ error: null });
    },
  };
});
