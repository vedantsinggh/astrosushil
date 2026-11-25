// src/store/usePaymentStore.js

import { create } from "zustand";
import axios from "axios";
import toast from "react-hot-toast";
import { useCartStore } from "./useCartStore";
import { trackPurchase } from "../utils/analytics";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const ORDER_URL = `${BASE_URL}/orders`;

export const usePaymentStore = create((set, get) => {
  const handleApiError = (err, defaultMessage = "Something went wrong") => {
    const errorData = err?.response?.data;

    if (
      err.code === "ERR_NETWORK" ||
      err.message?.includes("Network Error") ||
      !err.response
    ) {
      return "Network error";
    }

    if (typeof errorData === "string") return errorData;
    if (errorData?.message) return errorData.message;
    if (errorData?.error) return errorData.error;
    if (err?.message) return err.message;
    return defaultMessage;
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const getToken = () => localStorage.getItem("token");

  return {
    loading: false,
    processingPayment: false,
    order: null,
    orders: [],
    ordersLoading: false,
    ordersError: null,
    error: null,

    getOrders: async (params = {}) => {
      try {
        set({ ordersLoading: true, ordersError: null });

        const token = getToken();
        if (!token) {
          set({ ordersError: "Not authenticated", ordersLoading: false });
          return { success: false, error: "Not authenticated" };
        }

        const res = await axios.get(`${ORDER_URL}/my-orders`, {
          headers: { Authorization: `Bearer ${token}` },
          params, // page, limit, etc. future use
        });

        // Backend response: res.data.data = { orders: [...], total, page, ... }
        // Adjust based on your actual response shape
        const data = res.data?.data;
        const orders = Array.isArray(data) ? data : (data?.orders ?? []);

        set({ orders });
        return { success: true, data: orders };
      } catch (err) {
        const msg = handleApiError(err, "Failed to fetch orders");
        set({ ordersError: msg });
        return { success: false, error: msg };
      } finally {
        set({ ordersLoading: false });
      }
    },

    createOrder: async ({ paymentMethod, addressId, currency = "INR", currencyRate = 1, }) => {
      try {
        set({ loading: true, error: null });

        const res = await axios.post(
          `${ORDER_URL}/create`,
          { paymentMethod, addressId, currency , currencyRate },
          { headers: { Authorization: `Bearer ${getToken()}` } },
        );

        set({ order: res.data?.data?.order });

        return { success: true, data: res.data?.data };
      } catch (err) {
        const msg = handleApiError(err, "Failed to create order");
        set({ error: msg });
        return { success: false, error: msg };
      } finally {
        set({ loading: false });
      }
    },

    verifyPayment: async (payload) => {
      try {
        set({ loading: true, error: null });

        const res = await axios.post(`${ORDER_URL}/verify-payment`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        return { success: true, data: res.data?.data };
      } catch (err) {
        const msg = handleApiError(err, "Payment verification failed");
        set({ error: msg });
        return { success: false, error: msg };
      } finally {
        set({ loading: false });
      }
    },

    processPayment: async ({
      paymentMethod,
      addressId,
      userDetails,
      currency = "INR",
       currencyRate = 1,
    }) => {
      try {
        set({ processingPayment: true, error: null });

      
        if (paymentMethod === "cod") {
          const result = await get().createOrder({ paymentMethod, addressId, currency, currencyRate });
          set({ processingPayment: false });
          if (result.success) {
            useCartStore.getState().clearCart();
            toast.success("Order placed successfully!");
          }
          return result;
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) throw new Error("Failed to load Razorpay SDK");

        const orderResult = await get().createOrder({
          paymentMethod: "razorpay",
          addressId,
          currency,
          currencyRate,
        });

        if (!orderResult.success) throw new Error(orderResult.error);

        const { order, razorpayConfig } = orderResult.data;

        return new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: razorpayConfig.key,
            amount: razorpayConfig.amount,
            currency: razorpayConfig.currency,
            name: "Astro Sushil",
            description: "Order Payment",
            order_id: razorpayConfig.orderId,

            handler: async (response) => {
              const verifyResult = await get().verifyPayment({
                orderId: order._id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });

              set({ processingPayment: false });

              if (verifyResult.success) {
                useCartStore.getState().clearCart();
                toast.success("Payment successful!");
                trackPurchase({
                  orderId: order._id,
                  amount: razorpayConfig.amount / 100,
                  productName: "Astro Sushil Order",
                });
                resolve(verifyResult);
              } else {
                reject(verifyResult);
              }
            },

            prefill: {
              name: userDetails?.name || "",
              email: userDetails?.email || "",
              contact: userDetails?.phone || "",
            },

            theme: { color: "#1A6B52" },

            modal: {
              ondismiss: () => {
                set({ processingPayment: false });
                reject({ success: false, error: "Payment cancelled by user" });
              },
            },
          });

          rzp.open();
        });
      } catch (err) {
        const msg = handleApiError(err, "Failed to process payment");
        set({ error: msg, processingPayment: false });
        return { success: false, error: msg };
      }
    },

    getOrderDetails: async (orderId) => {
      try {
        set({ loading: true, error: null });

        const token = getToken();
        if (!token) {
          set({ error: "Not authenticated", loading: false });
          return { success: false, error: "Not authenticated" };
        }

        const res = await axios.get(`${ORDER_URL}/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        set({ order: res.data?.data });
        return { success: true, data: res.data?.data };
      } catch (err) {
        const msg = handleApiError(err, "Failed to fetch order details");
        set({ error: msg });
        return { success: false, error: msg };
      } finally {
        set({ loading: false });
      }
    },

    downloadInvoice: async (orderId) => {
      try {
        const url = `${ORDER_URL}/${orderId}/invoice`;

        const token = getToken();

        set({ loading: true, error: null });

        const response = await axios.get(url, {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.headers["content-type"]?.includes("application/pdf")) {
          const text = await response.data.text?.();

          throw new Error("Invalid PDF response", text ? `: ${text}` : "");
        }

        if (!response.data || response.data.size < 1000) {
          throw new Error("Corrupted PDF");
        }

        const blob = new Blob([response.data], { type: "application/pdf" });
        const urlBlob = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = urlBlob;
        link.download = `invoice-${orderId}.pdf`;

        document.body.appendChild(link);

        link.click();

        link.remove();
        window.URL.revokeObjectURL(urlBlob);

        return { success: true };
      } catch (err) {
        if (err.response) {
          const errorData = err.response.data;
          const msg =
            typeof errorData === "string"
              ? errorData
              : errorData?.message || "Failed to download invoice";
          set({ error: msg });
          return { success: false, error: msg };
        }

        const msg = handleApiError(err, "Failed to download invoice");
        set({ error: msg });

        return { success: false, error: msg };
      } finally {
        set({ loading: false });
      }
    },

    clearOrder: () => set({ order: null }),
    clearError: () => set({ error: null }),
  };
});
